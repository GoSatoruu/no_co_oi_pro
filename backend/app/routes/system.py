from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse

from ..config import APP_VERSION
from ..deps import get_bundle

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health(bundle: dict = Depends(get_bundle)):
    return {"ok": True, "version": APP_VERSION, "contentHash": bundle["hash"]}


@router.get("/content")
def content(request: Request, bundle: dict = Depends(get_bundle)):
    etag = f'"{bundle["hash"]}"'
    sent = request.headers.get("if-none-match", "")
    # Chấp nhận danh sách và tiền tố W/ (proxy có thể đổi ETag mạnh thành yếu).
    if any(t.strip().removeprefix("W/") == etag for t in sent.split(",")):
        return Response(status_code=304, headers={"ETag": etag})
    return JSONResponse(bundle, headers={"ETag": etag})
