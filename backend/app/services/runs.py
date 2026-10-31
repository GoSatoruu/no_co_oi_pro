"""Ván xếp hạng (docs/05 §2). Phần chấm lại bằng engine chờ PY-003 (generator)."""
from __future__ import annotations

import secrets
import sqlite3
import uuid
from datetime import timedelta

from ..config import Settings
from ..errors import ApiError
from ..timeutil import iso, now_vn
from . import ratelimit

RANKED_MODES = {"pro"}


def create_run(
    conn: sqlite3.Connection,
    settings: Settings,
    bundle: dict,
    *,
    mode: str,
    level: int,
    player: str,
    ip: str,
) -> dict:
    if mode not in RANKED_MODES:
        raise ApiError(400, "bad_request", f"Chế độ '{mode}' không có ván xếp hạng.")
    mode_def = next((m for m in bundle["modes"]["modes"] if m["id"] == mode), None)
    if mode_def is None:
        raise ApiError(400, "bad_request", f"Không có chế độ '{mode}'.")
    if level not in mode_def.get("startLevels", []):
        raise ApiError(
            400, "bad_request", f"Cấp bắt đầu {level} không hợp lệ cho chế độ '{mode}'."
        )

    ratelimit.check(conn, "runs", ip, settings.rate_limit_per_hour)

    now = now_vn()
    run_id = str(uuid.uuid4())
    day = now.date().isoformat()
    # Seed gồm ngày + chuỗi ngẫu nhiên thật: mỗi ván một đề, nhưng server nhớ để sinh lại khi chấm.
    seed = f"{day}:{mode}:{level}:{secrets.token_hex(6)}"
    expires = now + timedelta(minutes=settings.run_ttl_minutes)
    conn.execute(
        "INSERT INTO runs (id, mode, level, seed, date, player, ip, created_at, expires_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (run_id, mode, level, seed, day, player, ip, iso(now), iso(expires)),
    )
    return {
        "runId": run_id,
        "seed": seed,
        "date": day,
        "level": level,
        "mode": mode,
        "expiresAt": iso(expires),
    }


def submit_run(conn: sqlite3.Connection, run_id: str, actions: list[dict]) -> dict:
    row = conn.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "Không tìm thấy ván.")
    if row["submitted_at"] is not None:
        raise ApiError(409, "already_submitted", "Ván này đã nộp rồi.")
    if iso(now_vn()) > row["expires_at"]:
        raise ApiError(410, "run_expired", "Ván đã hết hạn nộp.")
    # Chưa có engine/generator (PY-003) để sinh lại đề từ seed, nên chưa thể chấm.
    # Cố ý KHÔNG đánh dấu đã nộp và KHÔNG tin clientScore, để chấm được sau khi PY-003 xong.
    raise ApiError(
        501, "not_implemented", "Chấm lại phía server chưa sẵn sàng (chờ PY-003)."
    )
