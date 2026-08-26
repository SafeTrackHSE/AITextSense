// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Window;

#[tauri::command]
fn app_minimize(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn app_toggle_maximize(window: Window) -> bool {
    if let Ok(is_max) = window.is_maximized() {
        if is_max {
            let _ = window.unmaximize();
            false
        } else {
            let _ = window.maximize();
            true
        }
    } else {
        false
    }
}

#[tauri::command]
fn app_is_maximized(window: Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
fn app_close(window: Window) {
    let _ = window.close();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_minimize,
            app_toggle_maximize,
            app_is_maximized,
            app_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
