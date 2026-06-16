use std::fs;
use std::path::Path;

/// Sanitiza um nome p/ uso como pasta: remove separadores e caracteres inválidos
/// (impede path traversal e nomes ilegais no Windows).
fn sanitize(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| if "/\\:*?\"<>|".contains(c) { '_' } else { c })
        .collect();
    cleaned.trim().trim_matches('.').trim().to_string()
}

/// Cria `vault/<plan_name>/` + subpastas no vault. Idempotente (create_dir_all).
/// Retorna o caminho absoluto da pasta do plano.
#[tauri::command]
pub fn create_plan_folders(
    vault_path: String,
    plan_name: String,
    subfolders: Vec<String>,
) -> Result<String, String> {
    let vault = Path::new(&vault_path);
    if !vault.is_dir() {
        return Err(format!("vault inválido ou inexistente: {}", vault_path));
    }

    let safe = sanitize(&plan_name);
    if safe.is_empty() {
        return Err("nome de plano inválido".into());
    }

    let root = vault.join(&safe);
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;

    for sub in subfolders {
        let s = sanitize(&sub);
        if !s.is_empty() {
            fs::create_dir_all(root.join(s)).map_err(|e| e.to_string())?;
        }
    }

    Ok(root.to_string_lossy().to_string())
}

/// Gera um caminho que não sobrescreve nada: se `target` existe, tenta `nome (1).ext`, `(2)`…
fn unique_path(target: std::path::PathBuf) -> std::path::PathBuf {
    if !target.exists() {
        return target;
    }
    let parent = target.parent().map(|p| p.to_path_buf()).unwrap_or_default();
    let stem = target
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("arquivo")
        .to_string();
    let ext = target.extension().and_then(|e| e.to_str()).unwrap_or("");
    for i in 1..10000 {
        let name = if ext.is_empty() {
            format!("{} ({})", stem, i)
        } else {
            format!("{} ({}).{}", stem, i, ext)
        };
        let cand = parent.join(name);
        if !cand.exists() {
            return cand;
        }
    }
    target
}

/// Importa (COPIA) um arquivo p/ uma pasta do vault. Nunca sobrescreve o original nem o destino
/// (sufixa se colidir). Guarda: destino precisa estar dentro do vault. Retorna o caminho criado.
#[tauri::command]
pub fn import_study(
    vault_path: String,
    dest_folder: String,
    src_path: String,
) -> Result<String, String> {
    let vault = Path::new(&vault_path)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let dest = Path::new(&dest_folder);
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    // guarda de segurança via caminho canônico…
    let dest_canon = dest.canonicalize().map_err(|e| e.to_string())?;
    if !dest_canon.starts_with(&vault) {
        return Err("recusado: destino fora do vault".into());
    }

    let src = Path::new(&src_path);
    let filename = src
        .file_name()
        .ok_or_else(|| "origem inválida".to_string())?;
    // …mas o caminho de retorno é o "normal" (sem prefixo \\?\), p/ casar com o scan.
    let target = unique_path(dest.join(filename));

    fs::copy(src, &target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

/// Apaga um arquivo do vault (guarda: precisa estar DENTRO do vault). Permanente.
#[tauri::command]
pub fn delete_file(vault_path: String, file_path: String) -> Result<(), String> {
    let f = Path::new(&file_path);
    if !f.exists() {
        return Ok(());
    }
    let vault = Path::new(&vault_path)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let f = f.canonicalize().map_err(|e| e.to_string())?;
    if !f.starts_with(&vault) {
        return Err("recusado: arquivo fora do vault".into());
    }
    fs::remove_file(&f).map_err(|e| e.to_string())?;
    Ok(())
}

/// Lê um arquivo de texto (ex.: .md do vault) e devolve o conteúdo.
#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Apaga a pasta de um plano (recursivo). Guarda de segurança: só apaga se a pasta
/// estiver DENTRO do vault e não for o próprio vault. Não erra se já não existe.
#[tauri::command]
pub fn delete_plan_folder(vault_path: String, folder_path: String) -> Result<(), String> {
    let folder = Path::new(&folder_path);
    if !folder.exists() {
        return Ok(());
    }
    let vault = Path::new(&vault_path)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let folder = folder.canonicalize().map_err(|e| e.to_string())?;

    if folder == vault || !folder.starts_with(&vault) {
        return Err("recusado: pasta fora do vault ou é o próprio vault".into());
    }

    fs::remove_dir_all(&folder).map_err(|e| e.to_string())?;
    Ok(())
}
