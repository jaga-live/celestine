use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::{distributions::Alphanumeric, Rng};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{ErrorKind, Read, Write},
    net::TcpListener,
    path::PathBuf,
    process::Command,
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use url::Url;

const AUTH_FILE: &str = "google-auth.json";
const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT: &str = "https://openidconnect.googleapis.com/v1/userinfo";
const REVOKE_ENDPOINT: &str = "https://oauth2.googleapis.com/revoke";
const CELESTINE_GOOGLE_CLIENT_ID: &str = "367554078890-8l5cq93ersgnd5pahfordfhulsjr8bce.apps.googleusercontent.com";

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleProfile {
    pub id: String,
    pub email: String,
    pub name: String,
    pub given_name: Option<String>,
    pub picture: Option<String>,
    pub email_verified: bool,
}

#[derive(Deserialize)]
struct GoogleUserInfo {
    sub: String,
    email: String,
    name: Option<String>,
    given_name: Option<String>,
    picture: Option<String>,
    email_verified: Option<bool>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
    refresh_token: Option<String>,
}

#[derive(Deserialize, Serialize)]
struct StoredSession {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: u64,
    profile: GoogleProfile,
}

fn now_seconds() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .map_err(|error| error.to_string())
}

fn client_id() -> Result<String, String> {
    Ok(std::env::var("CELESTINE_GOOGLE_CLIENT_ID").unwrap_or_else(|_| CELESTINE_GOOGLE_CLIENT_ID.to_string()))
}

fn http_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .unwrap_or_else(|_| Client::new())
}

fn auth_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|directory| directory.join(AUTH_FILE))
        .map_err(|error| error.to_string())
}

fn save_session(app: &AppHandle, session: &StoredSession) -> Result<(), String> {
    let path = auth_path(app)?;
    let directory = path
        .parent()
        .ok_or_else(|| "Authentication path has no parent directory.".to_string())?;
    fs::create_dir_all(directory).map_err(|error| error.to_string())?;
    let payload = serde_json::to_vec(session).map_err(|error| error.to_string())?;
    fs::write(&path, payload).map_err(|error| error.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn load_session(app: &AppHandle) -> Result<Option<StoredSession>, String> {
    let path = auth_path(app)?;
    if !path.exists() {
        return Ok(None);
    }

    fs::read(path)
        .map_err(|error| error.to_string())
        .and_then(|payload| serde_json::from_slice(&payload).map_err(|error| error.to_string()))
        .map(Some)
}

fn open_system_browser(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = Command::new("open");
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut next = Command::new("rundll32");
        next.arg("url.dll,FileProtocolHandler");
        next
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = Command::new("xdg-open");

    command
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open the system browser: {error}"))
}

fn fetch_profile(client: &Client, access_token: &str) -> Result<GoogleProfile, String> {
    let response = client
        .get(USERINFO_ENDPOINT)
        .bearer_auth(access_token)
        .send()
        .map_err(|error| format!("Could not load the Google profile: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Google rejected the profile request: {error}"))?
        .json::<GoogleUserInfo>()
        .map_err(|error| format!("Google returned an unreadable profile: {error}"))?;

    Ok(GoogleProfile {
        id: response.sub,
        email: response.email.clone(),
        name: response.name.unwrap_or(response.email),
        given_name: response.given_name,
        picture: response.picture,
        email_verified: response.email_verified.unwrap_or(false),
    })
}

fn callback_code(listener: TcpListener, expected_state: &str) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|error| format!("Could not configure the Google callback: {error}"))?;
    let deadline = Instant::now() + Duration::from_secs(300);
    let (mut stream, _) = loop {
        match listener.accept() {
            Ok(connection) => break connection,
            Err(error) if error.kind() == ErrorKind::WouldBlock && Instant::now() < deadline => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                return Err("Google sign-in timed out. Start sign-in again when you’re ready.".to_string());
            }
            Err(error) => return Err(format!("Could not receive the Google callback: {error}")),
        }
    };
    let mut request = [0_u8; 8192];
    let length = stream
        .read(&mut request)
        .map_err(|error| format!("Could not read the Google callback: {error}"))?;
    let request_text = String::from_utf8_lossy(&request[..length]);
    let target = request_text
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .ok_or_else(|| "Google returned an invalid callback.".to_string())?;
    let callback = Url::parse(&format!("http://127.0.0.1{target}"))
        .map_err(|error| format!("Google returned an invalid callback URL: {error}"))?;
    let parameters = callback.query_pairs().collect::<std::collections::HashMap<_, _>>();
    let callback_state = parameters
        .get("state")
        .ok_or_else(|| "The Google callback did not contain a security state.".to_string())?;

    if callback_state.as_ref() != expected_state {
        return Err("The Google callback failed its security check.".to_string());
    }

    let result = if let Some(error) = parameters.get("error") {
        Err(format!("Google sign-in was not completed: {error}"))
    } else {
        parameters
            .get("code")
            .map(|code| code.to_string())
            .ok_or_else(|| "The Google callback did not contain an authorization code.".to_string())
    };
    let successful = result.is_ok();
    let heading = if successful { "You’re signed in to Celestine." } else { "Celestine could not complete sign-in." };
    let response_body = format!("<!doctype html><meta charset=\"utf-8\"><title>Celestine</title><style>body{{font-family:-apple-system,sans-serif;background:#080c13;color:#eef3f8;display:grid;place-items:center;height:100vh;margin:0}}main{{text-align:center}}p{{color:#8d99aa}}</style><main><h1>{heading}</h1><p>You can close this window and return to Celestine.</p></main>");
    let http_response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", response_body.len(), response_body);
    stream
        .write_all(http_response.as_bytes())
        .map_err(|error| format!("Could not finish the Google callback: {error}"))?;

    result
}

fn sign_in_blocking(app: AppHandle) -> Result<GoogleProfile, String> {
    let client_id = client_id()?;
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Could not start the local Google callback: {error}"))?;
    let port = listener.local_addr().map_err(|error| error.to_string())?.port();
    let redirect_uri = format!("http://127.0.0.1:{port}");
    let verifier: String = rand::thread_rng().sample_iter(&Alphanumeric).take(64).map(char::from).collect();
    let state: String = rand::thread_rng().sample_iter(&Alphanumeric).take(40).map(char::from).collect();
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let mut authorization_url = Url::parse(AUTH_ENDPOINT).map_err(|error| error.to_string())?;
    authorization_url.query_pairs_mut()
        .append_pair("client_id", &client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", "openid profile email")
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", &state)
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent");
    open_system_browser(authorization_url.as_str())?;
    let code = callback_code(listener, &state)?;
    let client = http_client();
    let token = client
        .post(TOKEN_ENDPOINT)
        .form(&[
            ("client_id", client_id.as_str()),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .map_err(|error| format!("Could not exchange the Google authorization code: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Google rejected the token request: {error}"))?
        .json::<TokenResponse>()
        .map_err(|error| format!("Google returned an unreadable token response: {error}"))?;
    let profile = fetch_profile(&client, &token.access_token)?;
    let session = StoredSession {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: now_seconds()?.saturating_add(token.expires_in),
        profile: profile.clone(),
    };
    save_session(&app, &session)?;
    Ok(profile)
}

fn status_blocking(app: AppHandle) -> Result<Option<GoogleProfile>, String> {
    let Some(mut session) = load_session(&app)? else {
        return Ok(None);
    };
    if session.expires_at > now_seconds()?.saturating_add(60) {
        return Ok(Some(session.profile));
    }
    let Some(refresh_token) = session.refresh_token.clone() else {
        return Ok(None);
    };
    let client_id = client_id()?;
    let token = http_client()
        .post(TOKEN_ENDPOINT)
        .form(&[("client_id", client_id.as_str()), ("refresh_token", refresh_token.as_str()), ("grant_type", "refresh_token")])
        .send()
        .map_err(|error| format!("Could not refresh the Google session: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Google rejected the session refresh: {error}"))?
        .json::<TokenResponse>()
        .map_err(|error| format!("Google returned an unreadable refresh response: {error}"))?;
    session.access_token = token.access_token;
    session.expires_at = now_seconds()?.saturating_add(token.expires_in);
    save_session(&app, &session)?;
    Ok(Some(session.profile))
}

#[tauri::command]
pub async fn google_sign_in(app: AppHandle) -> Result<GoogleProfile, String> {
    tauri::async_runtime::spawn_blocking(move || sign_in_blocking(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn google_auth_status(app: AppHandle) -> Result<Option<GoogleProfile>, String> {
    tauri::async_runtime::spawn_blocking(move || status_blocking(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn google_sign_out(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(session) = load_session(&app)? {
            let _ = http_client().post(REVOKE_ENDPOINT).form(&[("token", session.access_token)]).send();
        }
        let path = auth_path(&app)?;
        if path.exists() {
            fs::remove_file(path).map_err(|error| error.to_string())?;
        }
        Ok(())
    })
    .await
    .map_err(|error| error.to_string())?
}
