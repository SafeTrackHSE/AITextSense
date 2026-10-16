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

#[derive(serde::Serialize, serde::Deserialize)]
struct NativeHttpResponse {
    status: u16,
    body: String,
    headers: std::collections::HashMap<String, String>,
}

#[tauri::command]
fn native_http_request(
    url: String,
    method: String,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>,
) -> Result<NativeHttpResponse, String> {
    let make_request = |target_url: &str| -> Result<NativeHttpResponse, String> {
        let m = method.to_uppercase();
        let resp = if m == "POST" || m == "PUT" {
            let mut req = if m == "POST" {
                ureq::post(target_url)
            } else {
                ureq::put(target_url)
            };
            let mut has_ua = false;
            if let Some(ref hdrs) = headers {
                for (k, v) in hdrs {
                    if k.to_lowercase() == "user-agent" {
                        has_ua = true;
                    }
                    req = req.header(k.as_str(), v.as_str());
                }
            }
            if !has_ua {
                req = req.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            }
            if let Some(ref b) = body {
                req.send(b.as_bytes())
            } else {
                req.send(&[])
            }
        } else {
            let mut req = if m == "DELETE" {
                ureq::delete(target_url)
            } else {
                ureq::get(target_url)
            };
            let mut has_ua = false;
            if let Some(ref hdrs) = headers {
                for (k, v) in hdrs {
                    if k.to_lowercase() == "user-agent" {
                        has_ua = true;
                    }
                    req = req.header(k.as_str(), v.as_str());
                }
            }
            if !has_ua {
                req = req.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            }
            req.call()
        };

        match resp {
            Ok(mut r) => {
                let status = r.status().as_u16();
                let mut resp_headers = std::collections::HashMap::new();
                for (name, val) in r.headers() {
                    if let Ok(v_str) = val.to_str() {
                        resp_headers.insert(name.as_str().to_string(), v_str.to_string());
                    }
                }
                let body_text = r.body_mut().read_to_string().unwrap_or_default();
                Ok(NativeHttpResponse {
                    status,
                    body: body_text,
                    headers: resp_headers,
                })
            }
            Err(e) => Err(e.to_string()),
        }
    };

    match make_request(&url) {
        Ok(res) => Ok(res),
        Err(err) => {
            if url.contains("localhost") {
                let alt = url.replace("localhost", "127.0.0.1");
                make_request(&alt).map_err(|e| format!("{err}; fallback {alt} also failed: {e}"))
            } else if url.contains("127.0.0.1") {
                let alt = url.replace("127.0.0.1", "localhost");
                make_request(&alt).map_err(|e| format!("{err}; fallback {alt} also failed: {e}"))
            } else {
                Err(err)
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_minimize,
            app_toggle_maximize,
            app_is_maximized,
            app_close,
            native_http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
