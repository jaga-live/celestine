use std::{
    fs,
    io::Write,
    process::{Command, Stdio},
};
use tauri::{AppHandle, Manager};
#[cfg(target_os = "macos")]
use base64::Engine;

mod google_auth;

const WORKSPACE_FILE: &str = "workspace.json";

fn workspace_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|directory| directory.join(WORKSPACE_FILE))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn load_workspace(app: AppHandle) -> Result<Option<String>, String> {
    let path = workspace_path(&app)?;

    if !path.exists() {
        return Ok(None);
    }

    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn save_workspace(app: AppHandle, payload: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = workspace_path(&app)?;
        let directory = path
            .parent()
            .ok_or_else(|| "Workspace path has no parent directory".to_string())?;
        let temporary_path = path.with_extension("json.tmp");

        fs::create_dir_all(directory).map_err(|error| error.to_string())?;
        fs::write(&temporary_path, payload).map_err(|error| error.to_string())?;
        fs::rename(temporary_path, path).map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
fn open_microphone_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    return Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string());

    #[cfg(not(target_os = "macos"))]
    Err("Open your system privacy settings and allow microphone access for Celestine.".to_string())
}

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn celestine_transcribe_audio(audio_path: *const std::os::raw::c_char, error_output: *mut *mut std::os::raw::c_char) -> *mut std::os::raw::c_char;
    fn celestine_free_transcription(value: *mut std::os::raw::c_char);
}

struct AutoDeleteFile(std::path::PathBuf);

impl Drop for AutoDeleteFile {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

#[cfg(target_os = "macos")]
fn transcribe_audio_on_device(app: &AppHandle, data_url: &str) -> Result<String, String> {
    use std::ffi::{CStr, CString};

    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    let executable_path = executable.to_string_lossy();
    if !executable_path.contains(".app/Contents/MacOS/") {
        return Err("macOS Speech Recognition requires running inside the bundled Celestine.app. Build with `npm run tauri build` and open the app bundle to use speech-to-text.".to_string());
    }

    let (metadata, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "The audio recording was invalid.".to_string())?;
    let extension = if metadata.contains("mp4") || metadata.contains("m4a") { "m4a" } else if metadata.contains("wav") { "wav" } else { "webm" };
    let audio = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|error| error.to_string())?;
    let directory = app.path().app_cache_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let path = directory.join(format!("audio-transcription-{}.{}", rand::random::<u64>(), extension));
    fs::write(&path, audio).map_err(|error| error.to_string())?;
    let _file_guard = AutoDeleteFile(path.clone());

    let path_string = CString::new(path.to_string_lossy().as_bytes()).map_err(|error| error.to_string())?;
    let mut error_pointer = std::ptr::null_mut();
    let transcript_pointer = unsafe { celestine_transcribe_audio(path_string.as_ptr(), &mut error_pointer) };
    let result = if transcript_pointer.is_null() {
        if error_pointer.is_null() {
            Err("macOS did not produce a transcript.".to_string())
        } else {
            let message = unsafe { CStr::from_ptr(error_pointer) }.to_string_lossy().into_owned();
            unsafe { celestine_free_transcription(error_pointer) };

            Err(message)
        }
    } else {
        let transcript = unsafe { CStr::from_ptr(transcript_pointer) }.to_string_lossy().into_owned();
        unsafe { celestine_free_transcription(transcript_pointer) };
        if !error_pointer.is_null() {
            unsafe { celestine_free_transcription(error_pointer) };
        }

        Ok(transcript)
    };

    result
}

#[cfg(not(target_os = "macos"))]
fn transcribe_audio_on_device(_app: &AppHandle, _data_url: &str) -> Result<String, String> {
    Err("On-device transcription is currently available on macOS.".to_string())
}

#[tauri::command]
async fn transcribe_audio(app: AppHandle, data_url: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || transcribe_audio_on_device(&app, &data_url))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(target_os = "macos")]
fn recognize_on_device(app: &AppHandle, image_base64: &str) -> Result<String, String> {
    use std::os::unix::fs::PermissionsExt;

    const RECOGNIZER: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/celestine-recognizer"));

    let directory = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?;
    let path = directory.join("celestine-recognizer-v1");
    let needs_write = fs::metadata(&path)
        .map(|metadata| metadata.len() != RECOGNIZER.len() as u64)
        .unwrap_or(true);

    if needs_write {
        fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        fs::write(&path, RECOGNIZER).map_err(|error| error.to_string())?;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o700))
            .map_err(|error| error.to_string())?;
    }

    let mut child = Command::new(path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;

    child
        .stdin
        .take()
        .ok_or_else(|| "The handwriting provider did not open its input.".to_string())?
        .write_all(image_base64.as_bytes())
        .map_err(|error| error.to_string())?;

    let output = child
        .wait_with_output()
        .map_err(|error| error.to_string())?;

    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();

        return Err(if message.is_empty() {
            "Handwriting recognition did not return text.".to_string()
        } else {
            message
        });
    }

    String::from_utf8(output.stdout)
        .map(|text| text.trim().to_string())
        .map_err(|error| error.to_string())
}

#[cfg(not(target_os = "macos"))]
fn recognize_on_device(_app: &AppHandle, _image_base64: &str) -> Result<String, String> {
    Err("Handwriting recognition is currently available on macOS.".to_string())
}

#[tauri::command]
async fn recognize_handwriting(app: AppHandle, image_base64: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || recognize_on_device(&app, &image_base64))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            save_workspace,
            open_microphone_settings,
            transcribe_audio,
            recognize_handwriting,
            google_auth::google_sign_in,
            google_auth::google_auth_status,
            google_auth::google_sign_out
        ])
        .run(tauri::generate_context!())
        .expect("error while running Celestine");
}
