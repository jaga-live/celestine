use std::{env, fs, process::Command};

fn main() {
    println!("cargo:rerun-if-changed=native/HandwritingRecognizer.m");
    println!("cargo:rerun-if-changed=native/AudioTranscriber.m");
    println!("cargo:rerun-if-changed=Info.plist");
    println!("cargo:rerun-if-changed=../dist");

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let output_path =
        std::path::PathBuf::from(env::var("OUT_DIR").unwrap()).join("celestine-recognizer");

    if target_os == "macos" {
        let privacy_plist = std::path::PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
            .join("Info.plist");
        println!(
            "cargo:rustc-link-arg=-Wl,-sectcreate,__TEXT,__info_plist,{}",
            privacy_plist.display()
        );

        let manifest_dir = std::path::PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
        let _ = fs::create_dir_all(manifest_dir.join("target/debug"));
        let _ = fs::copy(&privacy_plist, manifest_dir.join("target/debug/Info.plist"));
        let _ = fs::create_dir_all(manifest_dir.join("target/release"));
        let _ = fs::copy(&privacy_plist, manifest_dir.join("target/release/Info.plist"));

        let out_dir = std::path::PathBuf::from(env::var("OUT_DIR").unwrap());
        for ancestor in out_dir.ancestors() {
            if ancestor.ends_with("target/debug") || ancestor.ends_with("target/release") || ancestor.file_name() == Some(std::ffi::OsStr::new("debug")) || ancestor.file_name() == Some(std::ffi::OsStr::new("release")) {
                let _ = fs::copy(&privacy_plist, ancestor.join("Info.plist"));
            }
        }

        let transcriber_object = std::path::PathBuf::from(env::var("OUT_DIR").unwrap()).join("AudioTranscriber.o");
        let transcriber_library = std::path::PathBuf::from(env::var("OUT_DIR").unwrap()).join("libcelestine_audio.a");
        let compile_status = Command::new("clang")
            .args(["-O2", "-fobjc-arc", "-fblocks", "-c", "native/AudioTranscriber.m", "-o"])
            .arg(&transcriber_object)
            .status()
            .expect("clang is required to build the macOS audio transcriber");
        assert!(compile_status.success(), "failed to compile the macOS audio transcriber");
        let archive_status = Command::new("ar")
            .arg("rcs")
            .arg(&transcriber_library)
            .arg(&transcriber_object)
            .status()
            .expect("ar is required to build the macOS audio transcriber");
        assert!(archive_status.success(), "failed to archive the macOS audio transcriber");
        println!("cargo:rustc-link-search=native={}", transcriber_library.parent().unwrap().display());
        println!("cargo:rustc-link-lib=static=celestine_audio");
        println!("cargo:rustc-link-lib=framework=Speech");
        println!("cargo:rustc-link-lib=framework=Foundation");

        let status = Command::new("clang")
            .args([
                "-O2",
                "-fobjc-arc",
                "native/HandwritingRecognizer.m",
                "-framework",
                "Foundation",
                "-framework",
                "CoreGraphics",
                "-framework",
                "ImageIO",
                "-framework",
                "Vision",
                "-o",
            ])
            .arg(&output_path)
            .status()
            .expect("clang is required to build the macOS handwriting provider");

        assert!(
            status.success(),
            "failed to build the macOS handwriting provider"
        );
    } else {
        fs::write(output_path, []).expect("failed to prepare the handwriting provider placeholder");
    }

    tauri_build::build()
}
