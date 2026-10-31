"""Bảng xếp hạng và điểm Normal (docs/05 §3)."""
from __future__ import annotations

import sqlite3

from ..config import Settings
from ..errors import ApiError
from ..timeutil import iso, now_vn, start_of_day, start_of_week
from . import ratelimit

BOARDS = ("normal", "pro", "daily")
PERIODS = ("day", "week", "all")


def add_normal_score(
    conn: sqlite3.Connection,
    settings: Settings,
    *,
    score: int,
    player: str,
    level: int,
    ip: str,
) -> int:
    ratelimit.check(conn, "scores", ip, settings.rate_limit_per_hour)
    cur = conn.execute(
        "INSERT INTO scores (board, player, score, level, verified, ip, created_at)"
        " VALUES ('normal', ?, ?, ?, 0, ?, ?)",
        (player, score, level, ip, iso(now_vn())),
    )
    return cur.lastrowid


def leaderboard(conn: sqlite3.Connection, board: str, period: str, limit: int) -> dict:
    if board not in BOARDS:
        raise ApiError(400, "bad_request", f"board phải là một trong {', '.join(BOARDS)}.")
    if period not in PERIODS:
        raise ApiError(400, "bad_request", f"period phải là một trong {', '.join(PERIODS)}.")
    now = now_vn()
    since = {"day": start_of_day(now), "week": start_of_week(now), "all": None}[period]
    sql = "SELECT player, score, created_at FROM scores WHERE board = ?"
    args: list = [board]
    if since is not None:
        sql += " AND created_at >= ?"
        args.append(iso(since))
    # Cùng điểm thì ai đạt trước xếp trên.
    sql += " ORDER BY score DESC, created_at ASC, id ASC LIMIT ?"
    args.append(limit)
    rows = conn.execute(sql, args).fetchall()
    return {
        "board": board,
        "period": period,
        "from": iso(since) if since is not None else None,
        "entries": [
            {"rank": i, "name": r["player"], "score": r["score"], "at": r["created_at"]}
            for i, r in enumerate(rows, start=1)
        ],
    }
