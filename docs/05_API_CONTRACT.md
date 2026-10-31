# 05 — Hợp đồng API (backend Python)

> Gốc: `/api`. JSON UTF-8. Thời gian: ISO 8601, múi giờ Asia/Ho_Chi_Minh cho "ngày" của thi đấu.
> FastAPI sinh tài liệu tự động ở `/docs` khi chạy. **File này là hợp đồng**: đổi route hay trường thì sửa ở đây trước, rồi mới sửa code.
> Frontend phải chạy được khi **mọi** endpoint lỗi (chế độ offline).

## Phiên bản
Mỗi response có header `X-Api-Version: 1`. Phá vỡ tương thích thì sang `/api/v2`.

## 1. Hệ thống

### `GET /api/health`
`200 { "ok": true, "version": "0.1.0", "contentHash": "sha1…" }`

### `GET /api/content`
Trả bản gộp mọi file trong `content/` (đã qua validator):
`200 { "hash": "sha1…", "accounts": {...}, "rules": {...}, "modes": {...}, "levels": {...}, "defects": {...}, "pools": {...}, "legalRefs": {...}, "audit": {...}, "i18n": {...}, "templates": [ ... ] }`
(`legalRefs`, `audit`, `i18n` là bản gộp của `legal_refs.json`, `audit.json`, `i18n/vi.json`; `templates` gộp mọi file trong `doc_templates/`.)
- Có `ETag` = hash. Client gửi `If-None-Match` thì nhận `304`.
- Backend cũng phục vụ tĩnh `/frontend/` và `/content/` (cùng đường dẫn tương đối với `python -m http.server`), và `/` chuyển hướng về `/frontend/`.
- Không có backend thì frontend đọc thẳng các file `content/*.json` (đường dẫn tương đối) qua `services/content.js`.

## 2. Ván chơi xếp hạng (Pro, thi đấu)

Luồng: **xin đề → chơi → nộp hành động → server chấm lại**.

### `POST /api/runs`
Body: `{ "mode": "pro", "level": 5, "playerName": "string ≤ 24 ký tự" }`
`201 { "runId": "uuid", "seed": "string", "date": "2026-11-02", "level": 5, "mode": "pro", "expiresAt": "…" }`
- `mode` hiện chỉ nhận `pro`; `level` phải nằm trong `modes[].startLevels` của chế độ đó (`400 bad_request` nếu không).
- Client dùng `seed` + `generateShift` để **tự sinh cùng đề** (không gửi đáp án xuống client).

### `POST /api/runs/{runId}/submit`
Body:
```jsonc
{ "actions": [
    { "docIndex": 0, "inspect": { "type": "valid" } },
    { "docIndex": 1, "inspect": { "type": "reject", "field": "signature" } },
    { "docIndex": 2, "inspect": { "type": "stamp", "field": "paymentMethod" },
      "entry": [ { "side": "N", "acc": "642", "amt": 5940000 }, { "side": "C", "acc": "111", "amt": 5940000 } ],
      "ms": 18450 }
  ],
  "clientScore": 1234 }
```
`200 { "score": 1210, "matchesClient": false, "details": [ { "docIndex": 0, "inspectOk": true, "entryOk": true, "points": 140 } ], "rank": 17 }`
- Server sinh lại đề từ `seed`, chấm bằng `engine/`, **bỏ qua** `clientScore` (chỉ để log lệch JS↔Python).
- Thứ tự kiểm khi nộp: `400` (body sai; lỗi ở `actions` mang code `invalid_action`) → `404` → `409` → `410` → chấm.
- **Hiện trạng:** chấm lại cần `engine/generator` (PY-003) nên bước chấm trả `501 not_implemented` và **không** đánh dấu ván đã nộp. Bỏ ghi chú này khi PY-006 xong.
- Một `runId` nộp một lần. Quá `expiresAt` (15 phút) thì `410`.

## 3. Bảng xếp hạng

### `GET /api/leaderboard?board=pro&period=week&limit=50`
`200 { "board": "pro", "period": "week", "from": "…", "entries": [ { "rank": 1, "name": "…", "score": 2380, "at": "…" } ] }`
- `board`: `normal | pro | daily`. `period`: `day | week | all`. `day` = từ 00:00 hôm nay, `week` = từ 00:00 thứ Hai của tuần này (giờ Việt Nam, UTC+7); `from` là mốc đó (`null` khi `all`). Cùng điểm thì ai đạt trước xếp trên. `limit` 1–200, ngoài khoảng thì `400`.

### `POST /api/scores` (Normal, không xác minh)
Body: `{ "mode": "normal", "score": 900, "playerName": "…", "level": 3 }` → `201`.
Trả `{ "id": 123 }`. `mode` chỉ nhận `normal` (Pro phải đi qua `/api/runs`); `score` 0–1.000.000; `level` ≤ số cấp trong `levels.json`.
Bảng Normal được ghi rõ "không xác minh" trên giao diện.

## 4. Đồng bộ bản lưu (tuỳ chọn, ROADMAP M3)
`PUT /api/saves/{deviceId}` · `GET /api/saves/{deviceId}`. Body là bản lưu nguyên khối có `schemaVersion`. Chưa có tài khoản người dùng ở MVP.

## 5. Lỗi
```json
{ "error": { "code": "run_expired", "message": "Ván đã hết hạn nộp." } }
```
| HTTP | code |
|---|---|
| 400 | `bad_request`, `invalid_action` |
| 404 | `not_found` |
| 409 | `already_submitted` |
| 410 | `run_expired` |
| 429 | `rate_limited` (mỗi IP 30 ván / giờ; áp cho cả `/api/runs` và `/api/scores`) |
| 501 | `not_implemented` (chấm lại ván, tạm thời, xem §2) |

## 6. Cơ sở dữ liệu (sqlite3)
```sql
CREATE TABLE runs   (id TEXT PRIMARY KEY, mode TEXT, level INT, seed TEXT, date TEXT,
                     player TEXT, ip TEXT, created_at TEXT, expires_at TEXT, submitted_at TEXT, score INT);
CREATE TABLE scores (id INTEGER PRIMARY KEY, board TEXT, player TEXT, score INT, level INT,
                     verified INT, ip TEXT, created_at TEXT);
CREATE INDEX idx_scores_board_time ON scores(board, created_at);
```
Cột `ip` (thêm so với bản đầu) phục vụ giới hạn tần suất. Mốc thời gian lưu dạng ISO với múi `+07:00`.
Migration: file `backend/app/migrations/NNN_ten.sql`, chạy theo thứ tự lúc khởi động, ghi vào bảng `schema_migrations`.
