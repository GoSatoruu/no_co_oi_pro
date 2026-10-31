from __future__ import annotations

import sqlite3
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from ..config import Settings
from ..deps import client_ip, get_bundle, get_conn, get_settings
from ..services import runs as svc

router = APIRouter(prefix="/api/runs", tags=["runs"])

PlayerName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=24)]


class RunIn(BaseModel):
    mode: str
    level: int = Field(ge=1)
    playerName: PlayerName


class Inspect(BaseModel):
    type: Literal["valid", "reject", "stamp"]
    field: str | None = None


class EntryLine(BaseModel):
    side: Literal["N", "C"]
    acc: str = Field(min_length=1, max_length=10)
    amt: int = Field(ge=0)  # tiền là số nguyên VND (ADR-007)


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")
    docIndex: int = Field(ge=0)
    inspect: Inspect
    entry: list[EntryLine] | None = None
    ms: int | None = Field(default=None, ge=0)


class SubmitIn(BaseModel):
    actions: list[Action] = Field(max_length=500)
    clientScore: int | None = None  # chỉ để log lệch JS↔Python, không dùng để chấm


@router.post("", status_code=201)
def create_run(
    body: RunIn,
    request: Request,
    conn: sqlite3.Connection = Depends(get_conn),
    settings: Settings = Depends(get_settings),
    bundle: dict = Depends(get_bundle),
):
    return svc.create_run(
        conn,
        settings,
        bundle,
        mode=body.mode,
        level=body.level,
        player=body.playerName,
        ip=client_ip(request),
    )


@router.post("/{run_id}/submit")
def submit_run(run_id: str, body: SubmitIn, conn: sqlite3.Connection = Depends(get_conn)):
    return svc.submit_run(conn, run_id, [a.model_dump() for a in body.actions])
