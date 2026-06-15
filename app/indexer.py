"""Scan do vault: walk recursivo, detecção de mudança, upsert em `study`.

Read-only sobre o vault (RF05/RNF04): só lê. Mudança detectada por mtime+size (rápido);
hash de conteúdo (parcial) recalculado apenas quando muda, p/ não travar com arquivos grandes.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path

from . import config, db, thumbnails

HASH_CHUNK = 256 * 1024  # 256 KB — hash parcial p/ detecção de alteração


def _partial_hash(path: Path, size: int) -> str:
    """sha1 de (tamanho + primeiros 256KB). Barato e suficiente p/ detectar alteração."""
    h = hashlib.sha1(str(size).encode())
    with path.open("rb") as f:
        h.update(f.read(HASH_CHUNK))
    return h.hexdigest()


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def scan() -> dict:
    """Varre o vault configurado e sincroniza a tabela `study`.

    Retorna estatísticas: added, updated, removed, total, errors.
    """
    vault_str = db.get_setting("vault_path")
    if not vault_str:
        return {"error": "Nenhum vault configurado."}
    vault = Path(vault_str)
    if not vault.is_dir():
        return {"error": f"Vault inválido: {vault_str}"}

    added = updated = unchanged = 0
    seen: set[str] = set()
    now = datetime.now(timezone.utc).isoformat()

    with db.get_db() as conn:
        existing = {
            r["path"]: r for r in conn.execute("SELECT * FROM study").fetchall()
        }

        for path in vault.rglob("*"):
            if not path.is_file():
                continue
            ext = path.suffix.lower()
            if ext not in config.SUPPORTED_EXT:
                continue

            sp = str(path)
            seen.add(sp)
            stat = path.stat()
            prev = existing.get(sp)

            # inalterado → pula (rápido, sem rehash)
            if prev and prev["mtime"] == stat.st_mtime and prev["size_bytes"] == stat.st_size:
                unchanged += 1
                continue

            file_hash = _partial_hash(path, stat.st_size)
            thumb = thumbnails.generate(path, file_hash)
            fmt = ext.lstrip(".")

            if prev:
                conn.execute(
                    "UPDATE study SET filename=?, format=?, hash=?, mtime=?, size_bytes=?, "
                    "thumb_path=?, indexed_at=?, created_at=? WHERE id=?",
                    (path.name, fmt, file_hash, stat.st_mtime, stat.st_size,
                     thumb, now, _iso(stat.st_mtime), prev["id"]),
                )
                updated += 1
            else:
                conn.execute(
                    "INSERT INTO study(path, filename, format, hash, mtime, size_bytes, "
                    "title, thumb_path, indexed_at, created_at) "
                    "VALUES(?,?,?,?,?,?,?,?,?,?)",
                    (sp, path.name, fmt, file_hash, stat.st_mtime, stat.st_size,
                     path.stem, thumb, now, _iso(stat.st_mtime)),
                )
                added += 1

        # removidos: estavam no DB mas sumiram do vault
        gone = [r["id"] for p, r in existing.items() if p not in seen]
        for sid in gone:
            conn.execute("DELETE FROM study WHERE id=?", (sid,))

    return {
        "added": added,
        "updated": updated,
        "unchanged": unchanged,
        "removed": len(gone),
        "total": len(seen),
    }
