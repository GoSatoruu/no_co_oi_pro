from __future__ import annotations

import sqlite3
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, StringConstraints

from ..config import Settings
from ..deps import client_ip, get_bundle, get_conn, get_settings
from ..errors import ApiError
from ..services import scores as svc

router = APIRouter(prefix="/api", tags=["leaderboard"])

PlayerName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=24)]
MAX_SCORE = 1_000_000


class ScoreIn(BaseModel):
    mode: Literal["normal"]  # Pro đi qua /api/runs để được xác minh
    score: int = Field(ge=0, le=MAX_SCORE)
    playerName: PlayerName
    level: int = Field(ge=1)


@router.get("/leaderboard")
def get_leaderboard(
    board: str = "pro",
    period: str = "week",
    limit: int = Query(50, ge=1, le=200),
    conn: sqlite3.Connection = Depends(get_conn),
):
    return svc.leaderboard(conn, board, period, limit)


@router.post("/scores", status_code=201)
def post_score(
    body: ScoreIn,
    request: Request,
    conn: sqlite3.Connection = Depends(get_conn),
    settings: Settings = Depends(get_settings),
    bundle: dict = Depends(get_bundle),
):
    if body.level > len(bundle["levels"]["levels"]):
        raise ApiError(400, "bad_request", f"Cấp {body.level} không tồn tại.")
    score_id = svc.add_normal_score(
        conn,
        settings,
        score=body.score,
        player=body.playerName,
        level=body.level,
        ip=client_ip(request),
    )
    return {"id": score_id}
