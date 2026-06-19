import { invoke } from "@tauri-apps/api/core";

/** Cria a pasta do plano (+ subpastas) no vault via command Rust. Retorna o caminho criado. */
export function createPlanFolders(
  vaultPath: string,
  planName: string,
  subfolders: string[] = [],
): Promise<string> {
  return invoke<string>("create_plan_folders", {
    vaultPath,
    planName,
    subfolders,
  });
}

/** Apaga a pasta do plano no vault (guarda de segurança no Rust). */
export function deletePlanFolder(
  vaultPath: string,
  folderPath: string,
): Promise<void> {
  return invoke("delete_plan_folder", { vaultPath, folderPath });
}

/** Importa (copia) um arquivo p/ uma pasta do vault. Retorna o caminho criado. */
export function importStudy(
  vaultPath: string,
  destFolder: string,
  srcPath: string,
): Promise<string> {
  return invoke<string>("import_study", { vaultPath, destFolder, srcPath });
}

/** Apaga um arquivo do vault (guarda no Rust). Permanente. */
export function deleteFile(vaultPath: string, filePath: string): Promise<void> {
  return invoke("delete_file", { vaultPath, filePath });
}

/** Lê um arquivo de texto do vault (ex.: .md). */
export function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

/** Escreve um arquivo de texto num caminho livre (ex.: export de config). */
export function writeTextFile(path: string, contents: string): Promise<void> {
  return invoke("write_text_file", { path, contents });
}

/** Gera/reusa thumbnail de um estudo. Retorna o caminho do thumb ou null (placeholder). */
export function generateThumbnail(
  studyPath: string,
  format: string,
  hash: string,
): Promise<string | null> {
  return invoke<string | null>("generate_thumbnail", {
    studyPath,
    format,
    hash,
  });
}
