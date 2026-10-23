use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        ConnectInfo, DefaultBodyLimit, Multipart, Path, State,
    },
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Json, Response},
    routing::{delete, get, post},
    Router,
};
use chrono::{DateTime, Duration, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    net::SocketAddr,
    path::{Path as StdPath, PathBuf},
    sync::Arc,
    time::Duration as StdDuration,
};
use tokio::{
    fs::{self, File},
    io::AsyncWriteExt,
    sync::{broadcast, RwLock},
};
use tokio_util::io::ReaderStream;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::{error, info, warn};

// Maximum single file size: 25 MB
const MAX_FILE_SIZE_BYTES: usize = 25 * 1024 * 1024;
const SWEEP_INTERVAL_SECS: u64 = 30;

// Set of characters allowed in 8-char codes (letters, numbers, safe symbols)
const CODE_CHARS: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@$*+=_";

#[derive(Clone)]
struct AppState {
    lockers: Arc<RwLock<HashMap<String, LockerItem>>>,
    channels: Arc<RwLock<HashMap<String, broadcast::Sender<String>>>>,
    chat_rooms: Arc<RwLock<HashMap<String, Vec<ChatMessageItem>>>>,
    storage_dir: PathBuf,
    metadata_file: PathBuf,
    audit_file: PathBuf,
}

#[derive(Clone, Serialize, Deserialize)]
struct LockerItem {
    code: String,
    pin_hash: Option<String>,
    salt: String,
    filename: String,
    file_path: PathBuf,
    size: usize,
    content_type: String,
    file_sha256: String,
    sender_ip: String,
    receiver_ip: Option<String>,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    available_from: Option<DateTime<Utc>>,
    burn_after_reading: bool,
    failed_attempts: usize,
    #[serde(default)]
    is_note: bool,
}

#[derive(Serialize, Deserialize, Debug)]
struct AuditEntry {
    timestamp: DateTime<Utc>,
    event: String,
    client_ip: String,
    user_agent: String,
    code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    filename: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    file_sha256: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<String>,
}

// Request & Response structs
#[derive(Serialize)]
struct GenerateCodeResponse {
    code: String,
}

#[derive(Deserialize)]
struct LockerCheckRequest {
    code: String,
    pin: Option<String>,
}

#[derive(Serialize)]
struct LockerCheckResponse {
    status: String,
    code: String,
    filename: String,
    size: usize,
    content_type: String,
    expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    available_from: Option<DateTime<Utc>>,
    burn: bool,
    is_note: bool,
}

#[derive(Deserialize)]
struct PickupRequest {
    code: String,
    pin: Option<String>,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    requires_pin: Option<bool>,
}

// Chat Requests & Responses
#[derive(Clone, Serialize, Deserialize)]
struct ChatMessageItem {
    id: String,
    sender_role: String,
    sender_id: String,
    text: String,
    timestamp: DateTime<Utc>,
}

#[derive(Deserialize)]
struct PostChatMessageRequest {
    sender_role: Option<String>,
    sender_id: Option<String>,
    text: String,
}

#[derive(Serialize)]
struct ChatRoomResponse {
    code: String,
    messages: Vec<ChatMessageItem>,
}

// Admin Requests & Responses
#[derive(Deserialize)]
struct AdminLoginRequest {
    password: String,
}

#[derive(Serialize)]
struct AdminLoginResponse {
    success: bool,
    token: String,
}

#[derive(Serialize)]
struct AdminStatsResponse {
    active_lockers: usize,
    total_deposits: usize,
    total_pickups: usize,
    total_expired: usize,
    total_brute_force: usize,
    total_bytes_transferred: usize,
    unique_ips: Vec<String>,
    server_time: DateTime<Utc>,
}

#[derive(Serialize)]
struct AdminLockerView {
    code: String,
    filename: String,
    size: usize,
    content_type: String,
    sender_ip: String,
    receiver_ip: Option<String>,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    available_from: Option<DateTime<Utc>>,
    burn_after_reading: bool,
    failed_attempts: usize,
    has_pin: bool,
    pub is_note: bool,
}

fn hash_pin(pin: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(pin.as_bytes());
    hex::encode(hasher.finalize())
}

fn generate_random_8char() -> String {
    let mut rng = rand::rng();
    let mut p1 = String::with_capacity(4);
    let mut p2 = String::with_capacity(4);
    for _ in 0..4 {
        let idx = rng.random_range(0..CODE_CHARS.len());
        p1.push(CODE_CHARS[idx] as char);
    }
    for _ in 0..4 {
        let idx = rng.random_range(0..CODE_CHARS.len());
        p2.push(CODE_CHARS[idx] as char);
    }
    format!("{p1}-{p2}")
}

fn is_valid_char(c: char) -> bool {
    CODE_CHARS.contains(&(c as u8))
}

fn sanitize_code(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.len() == 9 && trimmed.chars().nth(4) == Some('-') {
        let p1 = &trimmed[0..4];
        let p2 = &trimmed[5..9];
        if p1.chars().all(is_valid_char) && p2.chars().all(is_valid_char) {
            return Some(trimmed.to_string());
        }
    } else if trimmed.len() == 8 && trimmed.chars().all(is_valid_char) {
        return Some(format!("{}-{}", &trimmed[0..4], &trimmed[4..8]));
    }
    None
}

// Client IP & User Agent detection helper
fn get_client_ip(headers: &HeaderMap, connect_info: &ConnectInfo<SocketAddr>) -> String {
    if let Some(cf_ip) = headers.get("cf-connecting-ip").and_then(|v| v.to_str().ok()) {
        let ip = cf_ip.trim();
        if !ip.is_empty() {
            return ip.to_string();
        }
    }
    if let Some(real_ip) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        let ip = real_ip.trim();
        if !ip.is_empty() {
            return ip.to_string();
        }
    }
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first) = xff.split(',').next() {
            let ip = first.trim();
            if !ip.is_empty() {
                return ip.to_string();
            }
        }
    }
    connect_info.0.ip().to_string()
}

fn get_user_agent(headers: &HeaderMap) -> String {
    headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string()
}

// Permanent Audit Log
async fn log_audit_event(audit_file: &StdPath, entry: AuditEntry) {
    if let Ok(json_line) = serde_json::to_string(&entry) {
        if let Ok(mut file) = tokio::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(audit_file)
            .await
        {
            let _ = file.write_all(format!("{}\n", json_line).as_bytes()).await;
        }
    }
}

// Atomic persistence of locker metadata
async fn save_lockers_to_disk(state: &AppState) {
    let lockers = state.lockers.read().await;
    let tmp_file = state.metadata_file.with_extension("json.tmp");
    if let Ok(serialized) = serde_json::to_string_pretty(&*lockers) {
        if let Ok(mut f) = File::create(&tmp_file).await {
            if f.write_all(serialized.as_bytes()).await.is_ok() {
                let _ = fs::rename(&tmp_file, &state.metadata_file).await;
            }
        }
    }
}

// Startup recovery and reconciliation (cleaning expired lockers and orphan files)
async fn load_and_reconcile_state(
    metadata_file: &StdPath,
    storage_dir: &StdPath,
) -> HashMap<String, LockerItem> {
    let mut lockers: HashMap<String, LockerItem> = HashMap::new();

    if metadata_file.exists() {
        if let Ok(content) = fs::read_to_string(metadata_file).await {
            if let Ok(deserialized) = serde_json::from_str::<HashMap<String, LockerItem>>(&content) {
                lockers = deserialized;
                info!("📦 Caricati {} locker attivi dalla persistenza", lockers.len());
            }
        }
    }

    let now = Utc::now();
    let mut expired = Vec::new();
    for (code, item) in lockers.iter() {
        if item.expires_at < now {
            expired.push((code.clone(), item.file_path.clone()));
        }
    }

    for (code, path) in expired {
        info!("🧹 Pulizia avvio: rimosso locker scaduto {}", code);
        let _ = fs::remove_file(&path).await;
        lockers.remove(&code);
    }

    // Orphan cleaner: delete any file in uploads directory not linked to an active locker
    if let Ok(mut entries) = fs::read_dir(storage_dir).await {
        let valid_paths: std::collections::HashSet<PathBuf> = lockers
            .values()
            .map(|item| item.file_path.clone())
            .collect();

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.is_file() && !valid_paths.contains(&path) {
                info!("🧹 Rimozione file orfano sul disco: {:?}", path);
                let _ = fs::remove_file(&path).await;
            }
        }
    }

    lockers
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter("razzo_mail=info,tower_http=info")
        .init();

    let data_dir = PathBuf::from("./data");
    let storage_dir = data_dir.join("uploads");
    let metadata_file = data_dir.join("lockers.json");
    let audit_file = data_dir.join("audit_log.jsonl");

    if !storage_dir.exists() {
        fs::create_dir_all(&storage_dir).await?;
    }

    // Recover state from disk & clean orphans
    let initial_lockers = load_and_reconcile_state(&metadata_file, &storage_dir).await;

    let state = AppState {
        lockers: Arc::new(RwLock::new(initial_lockers)),
        channels: Arc::new(RwLock::new(HashMap::new())),
        chat_rooms: Arc::new(RwLock::new(HashMap::new())),
        storage_dir: storage_dir.clone(),
        metadata_file: metadata_file.clone(),
        audit_file: audit_file.clone(),
    };

    // Save initial cleaned state back to disk
    save_lockers_to_disk(&state).await;

    // Background Cleaner Task (TTL sweeper)
    let cleaner_state = state.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(StdDuration::from_secs(SWEEP_INTERVAL_SECS)).await;
            sweep_expired_lockers(&cleaner_state).await;
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // API Routes
        .route("/api/generate-code", get(handle_generate_code))
        .route("/api/lockers/deposit", post(handle_deposit))
        .route("/api/lockers/check", post(handle_check))
        .route("/api/lockers/pickup", post(handle_pickup))
        // Chat Routes (Real-time live conversation)
        .route("/api/chat/{code}", get(handle_get_chat_messages))
        .route("/api/chat/{code}/message", post(handle_post_chat_message))
        .route("/api/chat/{code}/destroy", post(handle_destroy_chat))
        // Admin Routes
        .route("/api/admin/login", post(handle_admin_login))
        .route("/api/admin/stats", get(handle_admin_stats))
        .route("/api/admin/lockers", get(handle_admin_lockers))
        .route("/api/admin/audit", get(handle_admin_audit))
        .route("/api/admin/lockers/{code}", delete(handle_admin_delete_locker))
        // WebSocket Route
        .route("/ws/{code}", get(handle_ws_upgrade))
        // Static Files
        .fallback_service(ServeDir::new("public"))
        .layer(DefaultBodyLimit::max(MAX_FILE_SIZE_BYTES + 1024 * 1024))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    info!("🚀 Razzo Mail avviato con successo su http://localhost:3000");
    info!("📂 Cartella archiviazione: {:?}", storage_dir);
    info!("📋 Registro Audit attivo: {:?}", audit_file);

    // Apertura automatica finestra applicativa dedicata (senza barre del browser)
    #[cfg(target_os = "windows")]
    if std::env::var("RAZZO_NO_GUI").is_err() {
        tokio::spawn(async {
            tokio::time::sleep(StdDuration::from_millis(500)).await;
            let _ = std::process::Command::new("cmd")
                .args(["/C", "start", "msedge", "--app=http://localhost:3000", "--window-size=500,840"])
                .spawn();
        });
    }

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

// Background cleanup
async fn sweep_expired_lockers(state: &AppState) {
    let now = Utc::now();
    let mut lockers = state.lockers.write().await;
    let mut expired_keys = Vec::new();

    for (code, item) in lockers.iter() {
        if item.expires_at < now {
            expired_keys.push((
                code.clone(),
                item.file_path.clone(),
                item.filename.clone(),
                item.size,
                item.file_sha256.clone(),
            ));
        }
    }

    if expired_keys.is_empty() {
        return;
    }

    for (code, file_path, filename, size, file_sha256) in expired_keys {
        info!("🧹 Pulizia file scaduto per il locker: {}", code);
        if let Err(e) = fs::remove_file(&file_path).await {
            warn!("Impossibile rimuovere il file {:?}: {}", file_path, e);
        }
        lockers.remove(&code);

        log_audit_event(
            &state.audit_file,
            AuditEntry {
                timestamp: now,
                event: "EXPIRED_SWEEP".to_string(),
                client_ip: "SYSTEM".to_string(),
                user_agent: "BACKGROUND_CLEANER".to_string(),
                code,
                filename: Some(filename),
                size: Some(size),
                file_sha256: Some(file_sha256),
                details: Some("Automatic expiration sweep".to_string()),
            },
        )
        .await;
    }

    drop(lockers);
    save_lockers_to_disk(state).await;

    // Pulizia periodica chat rooms inattive da più di 2 ore
    {
        let mut chat_rooms = state.chat_rooms.write().await;
        chat_rooms.retain(|_code, msgs| {
            if let Some(last_msg) = msgs.last() {
                (now - last_msg.timestamp).num_hours() < 2
            } else {
                false
            }
        });
    }
}

// Handler: Generate random 8-character mixed code
async fn handle_generate_code(State(state): State<AppState>) -> Json<GenerateCodeResponse> {
    let lockers = state.lockers.read().await;
    let mut code = generate_random_8char();

    // Ensure no collision with currently active lockers
    while lockers.contains_key(&code) {
        code = generate_random_8char();
    }

    Json(GenerateCodeResponse { code })
}

// Handler: Deposit file into Locker
async fn handle_deposit(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Response, (StatusCode, Json<ErrorResponse>)> {
    let client_ip = get_client_ip(&headers, &ConnectInfo(addr));
    let user_agent = get_user_agent(&headers);

    let mut code_opt = None;
    let mut pin_opt = None;
    let mut burn = true;
    let mut ttl_hours = 1u32;
    let mut available_from_opt: Option<DateTime<Utc>> = None;
    let mut file_data = None;
    let mut original_filename = String::from("file.bin");
    let mut content_type = String::from("application/octet-stream");
    let mut is_note = false;

    // Process multipart fields
    while let Ok(Some(mut field)) = multipart.next_field().await {
        let name = field.name().unwrap_or_default().to_string();

        match name.as_str() {
            "code" => {
                if let Ok(text) = field.text().await {
                    code_opt = sanitize_code(&text);
                }
            }
            "pin" => {
                if let Ok(text) = field.text().await {
                    let trimmed = text.trim();
                    if !trimmed.is_empty() {
                        pin_opt = Some(trimmed.to_string());
                    }
                }
            }
            "burn" => {
                if let Ok(text) = field.text().await {
                    burn = text.trim().to_lowercase() == "true";
                }
            }
            "ttl_hours" => {
                if let Ok(text) = field.text().await {
                    if let Ok(parsed) = text.trim().parse::<u32>() {
                        ttl_hours = parsed.clamp(1, 24);
                    }
                }
            }
            "available_from" => {
                if let Ok(text) = field.text().await {
                    let trimmed = text.trim();
                    if !trimmed.is_empty() {
                        if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
                            available_from_opt = Some(dt.with_timezone(&Utc));
                        }
                    }
                }
            }
            "is_note" => {
                if let Ok(text) = field.text().await {
                    is_note = text.trim().to_lowercase() == "true";
                }
            }
            "file" => {
                if let Some(fname) = field.file_name() {
                    let clean_fname = StdPath::new(fname)
                        .file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_else(|| "file.bin".to_string());
                    if !clean_fname.is_empty() {
                        original_filename = clean_fname;
                    }
                }

                if let Some(ct) = field.content_type() {
                    content_type = ct.to_string();
                }

                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.chunk().await {
                    if bytes.len() + chunk.len() > MAX_FILE_SIZE_BYTES {
                        return Err((
                            StatusCode::PAYLOAD_TOO_LARGE,
                            Json(ErrorResponse {
                                error: "Il file supera la dimensione massima consentita di 25 MB"
                                    .to_string(),
                                status: None,
                                requires_pin: None,
                            }),
                        ));
                    }
                    bytes.extend_from_slice(&chunk);
                }
                file_data = Some(bytes);
            }
            _ => {}
        }
    }

    let code = match code_opt {
        Some(c) => c,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Codice Locker non valido. Deve essere di 8 caratteri (es. K8$m-2!pX)"
                        .to_string(),
                    status: None,
                    requires_pin: None,
                }),
            ));
        }
    };

    let data = match file_data {
        Some(d) if !d.is_empty() => d,
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Nessun file o contenuto ricevuto".to_string(),
                    status: None,
                    requires_pin: None,
                }),
            ));
        }
    };

    if !is_note && original_filename.starts_with("messaggio_") && original_filename.ends_with(".txt") {
        is_note = true;
    }

    // Check if locker is already occupied and active
    {
        let lockers = state.lockers.read().await;
        if let Some(existing) = lockers.get(&code) {
            if existing.expires_at > Utc::now() {
                return Err((
                    StatusCode::CONFLICT,
                    Json(ErrorResponse {
                        error: format!(
                            "Il codice Locker {} è già occupato. Generane un altro.",
                            code
                        ),
                        status: None,
                        requires_pin: None,
                    }),
                ));
            }
        }
    }

    // Compute SHA-256 hash for audit integrity
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let file_sha256 = hex::encode(hasher.finalize());

    // Save file to disk
    let file_uuid = uuid::Uuid::new_v4();
    let stored_file_path = state.storage_dir.join(format!("{}.bin", file_uuid));

    let mut out_file = match File::create(&stored_file_path).await {
        Ok(f) => f,
        Err(e) => {
            error!("Errore creazione file di storage: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "Errore interno durante il salvataggio del file".to_string(),
                    status: None,
                    requires_pin: None,
                }),
            ));
        }
    };

    if let Err(e) = out_file.write_all(&data).await {
        error!("Errore scrittura stream su disco: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Errore durante il salvataggio dei dati".to_string(),
                status: None,
                requires_pin: None,
            }),
        ));
    }

    // Password / PIN Hash
    let salt = uuid::Uuid::new_v4().to_string();
    let pin_hash = pin_opt.map(|pin| hash_pin(&pin, &salt));

    let now = Utc::now();
    let expires_at = now + Duration::hours(ttl_hours as i64);

    let locker_item = LockerItem {
        code: code.clone(),
        pin_hash,
        salt,
        filename: original_filename.clone(),
        file_path: stored_file_path,
        size: data.len(),
        content_type: content_type.clone(),
        file_sha256: file_sha256.clone(),
        sender_ip: client_ip.clone(),
        receiver_ip: None,
        created_at: now,
        expires_at,
        available_from: available_from_opt,
        burn_after_reading: burn || is_note,
        failed_attempts: 0,
        is_note,
    };

    // Insert into state and persist
    {
        let mut lockers = state.lockers.write().await;
        lockers.insert(code.clone(), locker_item);
    }
    save_lockers_to_disk(&state).await;

    // Se è una nota/messaggio, inizializza la chat room live con il primo messaggio in RAM
    if is_note {
        let note_text = String::from_utf8_lossy(&data).to_string();
        let mut rooms = state.chat_rooms.write().await;
        let initial_msg = ChatMessageItem {
            id: uuid::Uuid::new_v4().to_string(),
            sender_role: "sender".to_string(),
            sender_id: "sender".to_string(),
            text: note_text,
            timestamp: now,
        };
        rooms.insert(code.clone(), vec![initial_msg]);
    }

    // Record audit event
    log_audit_event(
        &state.audit_file,
        AuditEntry {
            timestamp: now,
            event: "DEPOSIT".to_string(),
            client_ip: client_ip.clone(),
            user_agent,
            code: code.clone(),
            filename: Some(original_filename.clone()),
            size: Some(data.len()),
            file_sha256: Some(file_sha256),
            details: Some(format!("TTL: {}h, Burn: {}", ttl_hours, burn)),
        },
    )
    .await;

    info!(
        "📥 File depositato nel locker {} da IP {} - Nome: {} ({} bytes, scadenza: {})",
        code,
        client_ip,
        original_filename,
        data.len(),
        expires_at
    );

    // Notify WebSocket listeners on this locker
    notify_channel(
        &state,
        &code,
        serde_json::json!({
            "type": "file_deposited",
            "filename": original_filename,
            "size": data.len(),
            "is_note": is_note,
        })
        .to_string(),
    )
    .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "code": code,
        "filename": original_filename,
        "expires_at": expires_at,
        "is_note": is_note,
    }))
    .into_response())
}

// Handler: Check Locker status & verify PIN
async fn handle_check(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(payload): Json<LockerCheckRequest>,
) -> Result<Json<LockerCheckResponse>, (StatusCode, Json<ErrorResponse>)> {
    let client_ip = get_client_ip(&headers, &ConnectInfo(addr));
    let user_agent = get_user_agent(&headers);

    let code = match sanitize_code(&payload.code) {
        Some(c) => c,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Codice Locker non valido".to_string(),
                    status: None,
                    requires_pin: None,
                }),
            ));
        }
    };

    let mut lockers = state.lockers.write().await;
    let item = match lockers.get_mut(&code) {
        Some(i) => i,
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: "Locker vuoto o inesistente".to_string(),
                    status: Some("waiting".to_string()),
                    requires_pin: None,
                }),
            ));
        }
    };

    // Check expiration
    if item.expires_at < Utc::now() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Il contenuto di questo Locker è scaduto ed è stato rimosso".to_string(),
                status: None,
                requires_pin: None,
            }),
        ));
    }

    // Check embargo (available_from)
    if let Some(available_from) = item.available_from {
        let now = Utc::now();
        if available_from > now {
            let diff = available_from - now;
            let total_secs = diff.num_seconds();
            let embargo_msg = if total_secs < 60 {
                format!("Questo Locker sarà disponibile tra {} secondi", total_secs)
            } else if total_secs < 3600 {
                format!("Questo Locker sarà disponibile tra {} minuti", diff.num_minutes())
            } else if total_secs < 86400 {
                format!("Questo Locker sarà disponibile tra {} ore", diff.num_hours())
            } else {
                let local_str = available_from.format("%d/%m/%Y alle %H:%M").to_string();
                format!("Questo Locker sarà disponibile dal {}", local_str)
            };
            return Err((
                StatusCode::FORBIDDEN,
                Json(ErrorResponse {
                    error: embargo_msg,
                    status: Some("embargo".to_string()),
                    requires_pin: None,
                }),
            ));
        }
    }

    // Verify PIN if required
    if let Some(expected_hash) = &item.pin_hash {
        let provided_pin = payload.pin.as_deref().unwrap_or("").trim();
        let computed = hash_pin(provided_pin, &item.salt);

        if computed != *expected_hash {
            item.failed_attempts += 1;
            let attempts_left = 5usize.saturating_sub(item.failed_attempts);

            // Audit failed attempt
            log_audit_event(
                &state.audit_file,
                AuditEntry {
                    timestamp: Utc::now(),
                    event: "FAILED_PIN".to_string(),
                    client_ip: client_ip.clone(),
                    user_agent: user_agent.clone(),
                    code: code.clone(),
                    filename: Some(item.filename.clone()),
                    size: Some(item.size),
                    file_sha256: Some(item.file_sha256.clone()),
                    details: Some(format!("Tentativi falliti: {}/5", item.failed_attempts)),
                },
            )
            .await;

            if item.failed_attempts >= 5 {
                warn!(
                    "🚨 Troppi tentativi PIN falliti per il locker {} da IP {}. Autodistruzione!",
                    code, client_ip
                );
                let _ = fs::remove_file(&item.file_path).await;
                let destroyed_file_info = (item.filename.clone(), item.size, item.file_sha256.clone());
                lockers.remove(&code);
                drop(lockers);
                save_lockers_to_disk(&state).await;

                log_audit_event(
                    &state.audit_file,
                    AuditEntry {
                        timestamp: Utc::now(),
                        event: "AUTO_DESTRUCT_BRUTE_FORCE".to_string(),
                        client_ip: client_ip.clone(),
                        user_agent,
                        code: code.clone(),
                        filename: Some(destroyed_file_info.0),
                        size: Some(destroyed_file_info.1),
                        file_sha256: Some(destroyed_file_info.2),
                        details: Some("Autodistrutto per superamento di 5 tentativi PIN".to_string()),
                    },
                )
                .await;

                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ErrorResponse {
                        error: "Locker bloccato e autodistrutto per troppi tentativi errati".to_string(),
                        status: None,
                        requires_pin: Some(true),
                    }),
                ));
            }

            drop(lockers);
            save_lockers_to_disk(&state).await;

            return Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    error: format!("PIN errato. Tentativi rimasti: {}", attempts_left),
                    status: None,
                    requires_pin: Some(true),
                }),
            ));
        }
    }

    Ok(Json(LockerCheckResponse {
        status: "ready".to_string(),
        code: item.code.clone(),
        filename: item.filename.clone(),
        size: item.size,
        content_type: item.content_type.clone(),
        expires_at: item.expires_at,
        available_from: item.available_from,
        burn: item.burn_after_reading || item.is_note,
        is_note: item.is_note || (item.filename.starts_with("messaggio_") && item.filename.ends_with(".txt")),
    }))
}

// Handler: Pickup file (Download + Auto-destruct)
async fn handle_pickup(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(payload): Json<PickupRequest>,
) -> Result<Response, (StatusCode, Json<ErrorResponse>)> {
    let client_ip = get_client_ip(&headers, &ConnectInfo(addr));
    let user_agent = get_user_agent(&headers);

    let code = match sanitize_code(&payload.code) {
        Some(c) => c,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Codice Locker non valido".to_string(),
                    status: None,
                    requires_pin: None,
                }),
            ));
        }
    };

    // Retrieve and validate locker
    let (item, should_burn) = {
        let mut lockers = state.lockers.write().await;
        let item = match lockers.get_mut(&code) {
            Some(i) => {
                i.receiver_ip = Some(client_ip.clone());
                i.clone()
            }
            None => {
                return Err((
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse {
                        error: "Locker non trovato o file già ritirato".to_string(),
                        status: None,
                        requires_pin: None,
                    }),
                ));
            }
        };

        // Check PIN
        if let Some(expected_hash) = &item.pin_hash {
            let provided_pin = payload.pin.as_deref().unwrap_or("").trim();
            let computed = hash_pin(provided_pin, &item.salt);
            if computed != *expected_hash {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    Json(ErrorResponse {
                        error: "PIN di sblocco non valido".to_string(),
                        status: None,
                        requires_pin: Some(true),
                    }),
                ));
            }
        }

        let burn = item.burn_after_reading || item.is_note;
        if burn {
            lockers.remove(&code);
        }
        (item, burn)
    };

    // Persist updated lockers state
    save_lockers_to_disk(&state).await;

    // Open file from disk for streaming
    let file = match File::open(&item.file_path).await {
        Ok(f) => f,
        Err(e) => {
            error!("File non trovato sul disco: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "File non disponibile sul server".to_string(),
                    status: None,
                    requires_pin: None,
                }),
            ));
        }
    };

    // Record audit event
    log_audit_event(
        &state.audit_file,
        AuditEntry {
            timestamp: Utc::now(),
            event: if should_burn { "PICKUP_BURN".to_string() } else { "PICKUP_RETAIN".to_string() },
            client_ip: client_ip.clone(),
            user_agent,
            code: code.clone(),
            filename: Some(item.filename.clone()),
            size: Some(item.size),
            file_sha256: Some(item.file_sha256.clone()),
            details: Some(format!("Burn: {}", should_burn)),
        },
    )
    .await;

    info!(
        "📤 Ritiro file completato per Locker {} da IP {}: {} (Autodistruzione: {})",
        code, client_ip, item.filename, should_burn
    );

    // Notify WebSocket listeners (e.g. sender's radar screen)
    notify_channel(
        &state,
        &code,
        serde_json::json!({
            "type": "file_downloaded",
            "burn": should_burn
        })
        .to_string(),
    )
    .await;

    // Build streaming response
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let mut headers_resp = HeaderMap::new();
    headers_resp.insert(
        header::CONTENT_TYPE,
        item.content_type.parse().unwrap_or_else(|_| {
            "application/octet-stream".parse().unwrap()
        }),
    );
    headers_resp.insert(
        header::CONTENT_DISPOSITION,
        if item.is_note {
            format!("inline; filename=\"{}\"", item.filename).parse().unwrap()
        } else {
            format!("attachment; filename=\"{}\"", item.filename).parse().unwrap()
        },
    );
    if item.is_note {
        headers_resp.insert("x-is-note", "true".parse().unwrap());
    }

    // If burn after reading: schedule disk file deletion immediately after
    if should_burn {
        let fpath = item.file_path.clone();
        tokio::spawn(async move {
            tokio::time::sleep(StdDuration::from_millis(500)).await;
            if let Err(e) = fs::remove_file(&fpath).await {
                warn!("Errore rimozione file autodistrutto {:?}: {}", fpath, e);
            } else {
                info!("💥 File {:?} cancellato fisicamente dal disco.", fpath);
            }
        });
    }

    Ok((headers_resp, body).into_response())
}

// WebSocket Upgrade & Channel Dispatch
async fn handle_ws_upgrade(
    Path(raw_code): Path<String>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    let client_ip = get_client_ip(&headers, &ConnectInfo(addr));
    let code = sanitize_code(&raw_code).unwrap_or(raw_code);
    ws.on_upgrade(move |socket| handle_ws_socket(socket, state, code, client_ip))
}

async fn handle_ws_socket(mut socket: WebSocket, state: AppState, code: String, _client_ip: String) {
    let mut rx = {
        let mut channels = state.channels.write().await;
        channels
            .entry(code.clone())
            .or_insert_with(|| broadcast::channel(32).0)
            .subscribe()
    };

    // Forward broadcast events to WebSocket client AND handle incoming client messages
    loop {
        tokio::select! {
            result = rx.recv() => {
                match result {
                    Ok(msg) => {
                        if socket.send(Message::Text(msg.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            client_msg = socket.recv() => {
                match client_msg {
                    Some(Ok(Message::Text(text))) => {
                        // Supporta invio messaggio di chat via WebSocket
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                            if val.get("type").and_then(|v| v.as_str()) == Some("chat_message") {
                                if let Some(msg_text) = val.get("text").and_then(|v| v.as_str()) {
                                    let trimmed = msg_text.trim();
                                    if !trimmed.is_empty() {
                                        let sender_role = val.get("sender_role").and_then(|v| v.as_str()).unwrap_or("user").to_string();
                                        let sender_id = val.get("sender_id").and_then(|v| v.as_str()).unwrap_or("anon").to_string();
                                        let chat_item = ChatMessageItem {
                                            id: uuid::Uuid::new_v4().to_string(),
                                            sender_role,
                                            sender_id,
                                            text: trimmed.to_string(),
                                            timestamp: Utc::now(),
                                        };
                                        {
                                            let mut rooms = state.chat_rooms.write().await;
                                            rooms.entry(code.clone()).or_default().push(chat_item.clone());
                                        }
                                        let ws_payload = serde_json::json!({
                                            "type": "chat_message",
                                            "code": code,
                                            "message": chat_item,
                                        });
                                        notify_channel(&state, &code, ws_payload.to_string()).await;
                                    }
                                }
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }
}

async fn notify_channel(state: &AppState, code: &str, message: String) {
    let channels = state.channels.read().await;
    if let Some(sender) = channels.get(code) {
        let _ = sender.send(message);
    }
}

// ----------------------------------------------------
// Chat Room API Handlers (Conversazione Effimera Live)
// ----------------------------------------------------

async fn handle_get_chat_messages(
    Path(raw_code): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<ChatRoomResponse>, (StatusCode, Json<ErrorResponse>)> {
    let code = sanitize_code(&raw_code).unwrap_or(raw_code);
    let rooms = state.chat_rooms.read().await;
    let messages = rooms.get(&code).cloned().unwrap_or_default();
    Ok(Json(ChatRoomResponse { code, messages }))
}

async fn handle_post_chat_message(
    Path(raw_code): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<PostChatMessageRequest>,
) -> Result<Json<ChatMessageItem>, (StatusCode, Json<ErrorResponse>)> {
    let code = sanitize_code(&raw_code).unwrap_or(raw_code);
    let trimmed = payload.text.trim();
    if trimmed.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Il messaggio non può essere vuoto".to_string(),
                status: None,
                requires_pin: None,
            }),
        ));
    }

    let msg = ChatMessageItem {
        id: uuid::Uuid::new_v4().to_string(),
        sender_role: payload.sender_role.unwrap_or_else(|| "user".to_string()),
        sender_id: payload.sender_id.unwrap_or_else(|| "anon".to_string()),
        text: trimmed.to_string(),
        timestamp: Utc::now(),
    };

    {
        let mut rooms = state.chat_rooms.write().await;
        rooms.entry(code.clone()).or_default().push(msg.clone());
    }

    // Notifica broadcast a tutti i partecipanti via WebSocket
    let ws_payload = serde_json::json!({
        "type": "chat_message",
        "code": code,
        "message": msg,
    });
    notify_channel(&state, &code, ws_payload.to_string()).await;

    Ok(Json(msg))
}

async fn handle_destroy_chat(
    Path(raw_code): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorResponse>)> {
    let code = sanitize_code(&raw_code).unwrap_or(raw_code);
    {
        let mut rooms = state.chat_rooms.write().await;
        rooms.remove(&code);
    }
    {
        let mut lockers = state.lockers.write().await;
        if let Some(item) = lockers.remove(&code) {
            let fpath = item.file_path.clone();
            tokio::spawn(async move {
                let _ = fs::remove_file(&fpath).await;
            });
        }
    }
    save_lockers_to_disk(&state).await;

    // Broadcast distruzione chat
    let ws_payload = serde_json::json!({
        "type": "chat_destroyed",
        "code": code,
    });
    notify_channel(&state, &code, ws_payload.to_string()).await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Chat autodistrutta con successo per tutti i partecipanti"
    })))
}

// ----------------------------------------------------
// Admin API Helpers & Handlers
// ----------------------------------------------------

fn get_admin_secret() -> String {
    std::env::var("RAZZO_ADMIN_KEY").unwrap_or_else(|_| "razzo-admin-2026".to_string())
}

fn check_admin_auth(headers: &HeaderMap) -> bool {
    let secret = get_admin_secret();
    if let Some(key) = headers.get("x-admin-key").and_then(|v| v.to_str().ok()) {
        if key.trim() == secret {
            return true;
        }
    }
    if let Some(auth) = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()) {
        if let Some(token) = auth.strip_prefix("Bearer ") {
            if token.trim() == secret {
                return true;
            }
        }
    }
    false
}

async fn handle_admin_login(
    Json(payload): Json<AdminLoginRequest>,
) -> Result<Json<AdminLoginResponse>, (StatusCode, Json<ErrorResponse>)> {
    let secret = get_admin_secret();
    if payload.password.trim() == secret {
        Ok(Json(AdminLoginResponse {
            success: true,
            token: secret,
        }))
    } else {
        Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Password di amministrazione non valida".to_string(),
                status: None,
                requires_pin: None,
            }),
        ))
    }
}

async fn handle_admin_stats(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<AdminStatsResponse>, (StatusCode, Json<ErrorResponse>)> {
    if !check_admin_auth(&headers) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Accesso non autorizzato. Chiave amministratore richiesta.".to_string(),
                status: None,
                requires_pin: None,
            }),
        ));
    }

    let active_lockers = {
        let lockers = state.lockers.read().await;
        lockers.len()
    };

    let mut total_deposits = 0;
    let mut total_pickups = 0;
    let mut total_expired = 0;
    let mut total_brute_force = 0;
    let mut total_bytes_transferred = 0;
    let mut unique_ips_set = std::collections::HashSet::new();

    if let Ok(content) = fs::read_to_string(&state.audit_file).await {
        for line in content.lines() {
            if let Ok(entry) = serde_json::from_str::<AuditEntry>(line) {
                if !entry.client_ip.is_empty() && entry.client_ip != "SYSTEM" && entry.client_ip != "ADMIN" {
                    unique_ips_set.insert(entry.client_ip);
                }
                match entry.event.as_str() {
                    "DEPOSIT" => {
                        total_deposits += 1;
                        if let Some(sz) = entry.size {
                            total_bytes_transferred += sz;
                        }
                    }
                    "PICKUP_BURN" | "PICKUP_RETAIN" => {
                        total_pickups += 1;
                    }
                    "EXPIRED_SWEEP" => {
                        total_expired += 1;
                    }
                    "AUTO_DESTRUCT_BRUTE_FORCE" => {
                        total_brute_force += 1;
                    }
                    _ => {}
                }
            }
        }
    }

    let mut unique_ips: Vec<String> = unique_ips_set.into_iter().collect();
    unique_ips.sort();

    Ok(Json(AdminStatsResponse {
        active_lockers,
        total_deposits,
        total_pickups,
        total_expired,
        total_brute_force,
        total_bytes_transferred,
        unique_ips,
        server_time: Utc::now(),
    }))
}

async fn handle_admin_lockers(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<AdminLockerView>>, (StatusCode, Json<ErrorResponse>)> {
    if !check_admin_auth(&headers) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Accesso non autorizzato".to_string(),
                status: None,
                requires_pin: None,
            }),
        ));
    }

    let lockers = state.lockers.read().await;
    let mut list: Vec<AdminLockerView> = lockers
        .values()
        .map(|item| AdminLockerView {
            code: item.code.clone(),
            filename: item.filename.clone(),
            size: item.size,
            content_type: item.content_type.clone(),
            sender_ip: item.sender_ip.clone(),
            receiver_ip: item.receiver_ip.clone(),
            created_at: item.created_at,
            expires_at: item.expires_at,
            available_from: item.available_from,
            burn_after_reading: item.burn_after_reading,
            failed_attempts: item.failed_attempts,
            has_pin: item.pin_hash.is_some(),
            is_note: item.is_note,
        })
        .collect();

    list.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(Json(list))
}

async fn handle_admin_audit(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<AuditEntry>>, (StatusCode, Json<ErrorResponse>)> {
    if !check_admin_auth(&headers) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Accesso non autorizzato".to_string(),
                status: None,
                requires_pin: None,
            }),
        ));
    }

    let mut entries = Vec::new();
    if let Ok(content) = fs::read_to_string(&state.audit_file).await {
        for line in content.lines() {
            if let Ok(entry) = serde_json::from_str::<AuditEntry>(line) {
                entries.push(entry);
            }
        }
    }

    entries.reverse();
    entries.truncate(200);

    Ok(Json(entries))
}

async fn handle_admin_delete_locker(
    Path(raw_code): Path<String>,
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorResponse>)> {
    if !check_admin_auth(&headers) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Accesso non autorizzato".to_string(),
                status: None,
                requires_pin: None,
            }),
        ));
    }

    let code = sanitize_code(&raw_code).unwrap_or(raw_code);
    let mut lockers = state.lockers.write().await;
    let item = match lockers.remove(&code) {
        Some(i) => i,
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: format!("Locker {} non trovato", code),
                    status: None,
                    requires_pin: None,
                }),
            ));
        }
    };

    drop(lockers);
    save_lockers_to_disk(&state).await;

    let file_path = item.file_path.clone();
    tokio::spawn(async move {
        let _ = fs::remove_file(&file_path).await;
    });

    log_audit_event(
        &state.audit_file,
        AuditEntry {
            timestamp: Utc::now(),
            event: "ADMIN_FORCED_DELETE".to_string(),
            client_ip: "ADMIN".to_string(),
            user_agent: "ADMIN_CONSOLE".to_string(),
            code: code.clone(),
            filename: Some(item.filename),
            size: Some(item.size),
            file_sha256: Some(item.file_sha256),
            details: Some("Eliminato manualmente dall'amministratore".to_string()),
        },
    )
    .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("Locker {} eliminato con successo", code)
    })))
}

