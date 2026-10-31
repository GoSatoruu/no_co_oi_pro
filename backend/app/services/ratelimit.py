"""Giới hạn tần suất theo IP, đếm thẳng từ bảng (docs/05 §5: 30 ván / giờ)."""
from __future__ import annotations

import sqlite3
from datetime import timedelta

from ..errors import ApiError
from ..timeutil import iso, now_vn

_ALLOWED_TABLES = {"runs", "scores"}  # tên bảng chèn thẳng vào SQL nên chỉ nhận từ danh sách này


def check(conn: sqlite3.Connection, table: str, ip: str, limit: int) -> None:
    if table not in _ALLOWED_TABLES:
        raise ValueError(table)
    since = iso(now_vn() - timedelta(hours=1))
    n = conn.execute(
        f"SELECT COUNT(*) FROM {table} WHERE ip = ? AND created_at >= ?", (ip, since)
    ).fetchone()[0]
    if n >= limit:
        raise ApiError(429, "rate_limited", "Gửi quá nhiều lần, thử lại sau.")
