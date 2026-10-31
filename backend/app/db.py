"""sqlite3 thư viện chuẩn (ADR-002) + chạy migrations theo thứ tự (docs/05 §6)."""
from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def connect(path: Path) -> sqlite3.Connection:
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    # Route đồng bộ của FastAPI chạy trong thread pool; mỗi request tự mở và đóng kết nối riêng.
    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def migrate(path: Path, migrations_dir: Path = MIGRATIONS_DIR) -> list[str]:
    """Chạy các file NNN_ten.sql chưa chạy. Trả về danh sách vừa áp dụng (rỗng nếu không có gì mới)."""
    applied_now: list[str] = []
    with closing(connect(path)) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations "
            "(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
        )
        done = {r["version"] for r in conn.execute("SELECT version FROM schema_migrations")}
        for f in sorted(migrations_dir.glob("*.sql")):
            if f.stem in done:
                continue
            # executescript tự COMMIT trước khi chạy, nên bọc BEGIN/COMMIT trong chính script
            # để một migration hỏng không để lại nửa vời.
            script = f.read_text(encoding="utf-8")
            conn.executescript(
                "BEGIN;\n" + script + "\nINSERT INTO schema_migrations(version) VALUES ('" + f.stem + "');\nCOMMIT;"
            )
            applied_now.append(f.stem)
    return applied_now
