# TASKS — Bảng việc

> **Cách dùng:** đọc `AGENTS.md` §2. Nhận việc = sửa dòng của việc đó: `Status` → `doing`, điền `Owner` (`model@YYYY-MM-DD`).
> Cột `Files` là **phạm vi được sửa**. Hai việc `doing` không được chồng `Files`.
> Trạng thái: `todo` · `doing` · `review` · `done` · `blocked` (ghi lý do trong HANDOFF).
> Thêm việc mới: dùng `ai/templates/task.md`, đặt ID tiếp theo trong nhóm, thêm vào đúng mốc.

## Làn song song

Bốn làn chạy song song được, vì không chồng file:

```
Làn A  Lõi JS      CORE-001 → 002 → 003 → 004 → 005 → 006 → 007 → 008
Làn B  Python      PY-004 → 005 ──────────────► (đợi CORE) PY-001 → 002 → 003 → 006 → 007 → 008
Làn C  Giao diện   FE-001 → 002 → 003 → 004  ─► (đợi CORE-008) FE-005 → …
Làn D  Kiểm thử    QA-001 (song song với A) → QA-002
```

## Việc của chủ dự án

| ID | Việc | Status | Ghi chú |
|---|---|---|---|
| OWN-001 | Chốt tên game và tông hình ảnh | done (tên) | Tên: "Nợ Có Ơi Pro", dùng riêng (ADR-010). Tông hình ảnh vẫn chờ chốt. |
| OWN-002 | Duyệt GDD §4 (Pro mode) và §9 (phạm vi MVP) | todo | |
| OWN-003 | Chốt cách đọc nhóm "000" ở giữa khi đọc số thành chữ | todo | Xem docs/07 §6, chờ QA-001 đề xuất |
| OWN-004 | Duyệt hướng thiết kế docs/08 (màu bàn xanh, giấy, bút bi, con dấu; Be Vietnam Pro + Source Serif 4) | todo | Đổi sau FE-001 sẽ tốn công hơn |

## M1 — Lõi chạy được

| ID | Việc | Phụ thuộc | Files | Status | Owner | Xong khi |
|---|---|---|---|---|---|---|
| CORE-001 | PRNG có seed theo ADR-005 (`cyrb128` + `sfc32`), API `createRng(seed)` | — | `frontend/js/core/rng.js`, `tests/js/rng.test.js` | todo | | Cùng seed ra cùng dãy; 1.000 số đầu của seed `"nocooi"` khớp `tests/golden/rng.json` |
| CORE-002 | Bộ đọc biểu thức an toàn `evalExpr` theo docs/04 §4 | — | `frontend/js/core/expr.js`, `tests/js/expr.test.js` | todo | | Chạy đúng mọi biểu thức trong `content/`; ném lỗi khi có ký tự lạ hay biến chưa định nghĩa; không dùng `eval`/`Function` |
| CORE-003 | Đọc số tiền thành chữ tiếng Việt | QA-001 (golden) | `frontend/js/core/money-words.js`, `tests/js/money-words.test.js`, `tests/golden/money_words.json`, `tests/js/golden.test.js`, `backend/app/engine/money_words.py`, `backend/tests/test_golden.py` | review | claude-opus-5.5@2026-10-31 | Khớp 100% `tests/golden/money_words.json` |
| CORE-004 | Nạp, lập chỉ mục content; `ruleAt(key, date)` | 002 | `frontend/js/core/content.js`, `frontend/js/core/rules.js`, test tương ứng | todo | | Ném lỗi khi không có mốc luật; trả đúng 8% ngày 2026-11-02, 10% ngày 2027-01-05 |
| CORE-005 | Sổ cái và chấm bút toán: `post`, `balance`, `trialBalance`, `gradeEntry` | 004 | `frontend/js/core/ledger.js`, `frontend/js/core/grader.js`, test, `content/modes.json` (khoá `grading`), `tools/validate_content.py` | todo | | Chuẩn hoá dòng (gộp, bỏ 0, so tập); thêm cờ `mode.grading.acceptParent` vào modes.json **và** validator |
| CORE-006 | 9 hàm làm hỏng chứng từ (`op` trong defects.json) | 001, 003, 004 | `frontend/js/core/defects.js`, test | todo | | Mỗi op có test; chứng từ bị làm hỏng phát hiện được ở đúng `field` |
| CORE-007 | `generateShift(content, {seed, level, mode, date, ledger})` | 001–006 | `frontend/js/core/generator.js`, test | todo | | Cùng seed ra cùng ca; tôn trọng `requires.balanceAtLeast`, `partnerFilter`, `defects.rate/tiers` |
| CORE-008 | Máy trạng thái ca `session.js` + `scoring.js` | 005, 007 | `frontend/js/core/session.js`, `frontend/js/core/scoring.js`, test | todo | | Chơi trọn một ca giả lập trong test, điểm khớp công thức GDD §5 |
| QA-001 | Bộ golden chung JS↔Python + trình chạy | — | `tests/golden/*`, `tests/js/golden.test.js`, `backend/tests/test_golden.py` | todo | | Có golden cho rng, expr, money_words, grader; đề xuất cách đọc nhóm 000 (OWN-003) |
| PY-001 | `engine/rng.py`, `engine/expr.py` song sinh CORE-001/002 | CORE-001, 002 | `backend/app/engine/rng.py`, `backend/app/engine/expr.py` | review | claude-sonnet-5.5@2026-10-31 | Qua golden rng, expr |
| PY-002 | `engine/money_words.py`, `rules.py`, `ledger.py`, `grader.py` | CORE-003, 005 | `backend/app/engine/…` (các file đã nêu) | todo | | Qua golden tương ứng |
| PY-003 | `engine/defects.py`, `generator.py` | CORE-006, 007 | `backend/app/engine/defects.py`, `generator.py` | todo | | 20 seed sinh ra ca **giống hệt** bản JS (so JSON) |

## M2 — Chơi được bản Normal

| ID | Việc | Phụ thuộc | Files | Status | Owner | Xong khi |
|---|---|---|---|---|---|---|
| FE-001 | Khung trang: `index.html`, `main.js`, `router.js`, `css/tokens.css`, `css/base.css`; chọn hướng thiết kế | — | `frontend/index.html`, `frontend/js/main.js`, `frontend/js/router.js`, `frontend/css/tokens.css`, `frontend/css/base.css` | todo | | Chuyển được giữa 2 màn giả; sáng/tối; điện thoại 360px không cuộn ngang |
| FE-002 | `services/store.js` (lưu có phiên bản + migration + bản dự phòng), `services/content.js` (nạp content offline) | — | `frontend/js/services/*` | todo | | Hỏng JSON lưu → khôi phục từ `.bak`; không có backend vẫn nạp được content |
| FE-003 | Vẽ tờ chứng từ theo `kind` (7 loại), chạm từng trường để chọn | — | `frontend/js/ui/paper/*`, `frontend/css/paper.css` | todo | | Mỗi kind có trang xem thử `frontend/dev/paper.html` với dữ liệu giả |
| FE-004 | Bảng định khoản Normal: thẻ tài khoản, cột Nợ/Có, nút số tiền, báo cân/lệch | — | `frontend/js/ui/entry-board.js`, `frontend/js/ui/account-card.js`, `frontend/css/entry.css` | todo | | Dùng được bằng chạm và bằng kéo thả |
| FE-005 | Màn `desk`: hàng chờ, thanh kiên nhẫn, 3 bước, nối `session.js` | CORE-008, FE-003, FE-004 | `frontend/js/screens/desk.js`, `frontend/css/screens/desk.css`, `frontend/js/ui/queue.js` | todo | | Chơi trọn một ca Normal |
| FE-006 | Màn `cash`: đếm tiền theo mệnh giá, đối chiếu 111, 3 lựa chọn khi lệch | CORE-005 | `frontend/js/screens/cash.js`, css | todo | | Lệch lộ ra khi người chơi định khoản sai tiền mặt |
| FE-007 | Màn `close` rút gọn: đối chiếu sao kê 112, kết chuyển 911, bảng cân đối, lộ sai sót ẩn | CORE-005 | `frontend/js/screens/close.js`, css | todo | | Sai sót ẩn hiện kèm giải thích |
| FE-008 | Màn `title`, `morning`, `result` | FE-001 | `frontend/js/screens/{title,morning,result}.js` | todo | | Đi đủ vòng tuần → tháng |
| FE-009 | Người hướng dẫn ở Normal (hiện `mentorTip` 2 cấp đầu của mỗi mẫu) | FE-005 | `frontend/js/ui/mentor.js` | todo | | Tắt hẳn khi `mode.hints.mentor = false` |
| CORE-012 | `core/legal.js`: `panelFor(content, {step, template, kind, mode})` | CORE-004 | `frontend/js/core/legal.js`, `tests/js/legal.test.js` | todo | | Ưu tiên template > kind > `*`; test chứng minh chứng từ sạch và lỗi cùng mẫu ra **cùng** bảng; `tips` rỗng ở Pro |
| FE-020 | Bảng pháp luật bên cạnh nhiệm vụ (`ui/legal-panel.js`) theo docs/08 §6 | CORE-012, FE-001 | `frontend/js/ui/legal-panel.js`, `frontend/css/legal-panel.css` | todo | | Đúng 3 cách hiện theo bề rộng; phím `L`/`Esc` ở Pro; nhãn mức đối chiếu; không dừng đồng hồ |
| FE-010 | Rà di động, `prefers-reduced-motion`, trợ năng | FE-005…008 | chỉ sửa CSS + nhãn aria | todo | | Checklist trong `ai/templates/review.md` mục giao diện đạt |

## M3 — Pro mode + backend

| ID | Việc | Phụ thuộc | Files | Status | Owner | Xong khi |
|---|---|---|---|---|---|---|
| PY-004 | Khung FastAPI: `main.py`, `config.py`, phục vụ `frontend/` tĩnh, `/api/health`, `/api/content` + ETag | — | `backend/app/main.py`, `config.py`, `content.py`, `routes/system.py`, `backend/requirements.txt` | review | claude-sonnet-5.5@2026-10-31 | `uvicorn app.main:app` mở được game và `/api/content` |
| PY-005 | `db.py` + migrations sqlite | PY-004 | `backend/app/db.py`, `backend/app/migrations/*` | review | claude-sonnet-5.5@2026-10-31 | Khởi động lần 2 không chạy lại migration |
| PY-006 | `/api/runs` + `/submit`, chấm lại phía server | PY-003, PY-005 | `backend/app/routes/runs.py`, `backend/app/services/runs.py` | todo | | Ván giả lập nộp lên: điểm server = điểm JS |
| PY-007 | Bảng xếp hạng, `/api/scores`, giới hạn tần suất | PY-005 | `backend/app/routes/leaderboard.py` | review | claude-sonnet-5.5@2026-10-31 | Đúng hợp đồng docs/05 §3 |
| PY-008 | Test backend (pytest + TestClient) | PY-004…007 | `backend/tests/*` | doing | claude-sonnet-5.5@2026-10-31 | Phủ mọi route ở docs/05 (còn thiếu: test chấm lại ván, chờ PY-006; `/api/saves` chưa làm) |
| FE-011 | Nhập Pro: gõ số hiệu tài khoản (tự hoàn thành), gõ số tiền, bút toán nhiều dòng, phím tắt | FE-004 | `frontend/js/ui/entry-board-pro.js`, css | todo | | Làm được cả ca chỉ bằng bàn phím |
| FE-012 | Chọn chế độ và hồ sơ nghề Pro (cấp bắt đầu) | FE-008 | `frontend/js/screens/title.js` | todo | | Đọc `modes[].startLevels` |
| FE-013 | `services/api.js` + màn bảng xếp hạng | PY-007 | `frontend/js/services/api.js`, `frontend/js/screens/leaderboard.js` | todo | | Offline thì ẩn nút, không vỡ |
| FE-014 | Luồng ván xếp hạng: xin seed → chơi → nộp hành động | PY-006, FE-011 | `frontend/js/screens/desk.js` (phần ranked), `services/api.js` | todo | | Server nhận và chấm khớp |

## M5 — Pro: công ty cổ phần và tập đoàn (docs/09)

| ID | Việc | Phụ thuộc | Files | Status | Owner | Xong khi |
|---|---|---|---|---|---|---|
| CNT-001 | Đối chiếu toàn văn các trích dẫn trong `legal_refs.json`, sửa điều khoản sai, nâng `verified` khi đã kiểm | — | `content/legal_refs.json`, `content/rules.json`, `docs/07_ACCOUNTING_RULES.md` | todo | | Mỗi ref có URL nguồn chính thức + ngày kiểm trong HANDOFF; không còn ref `unverified` ở các mẫu cấp 10–11 |
| CORE-009 | Kind `resolution`, `attachments`, op `swap_approving_body`, `strip_related_party_approval`; param `const/pick/rule` trong generator | CORE-006, 007 | `frontend/js/core/defects.js`, `frontend/js/core/generator.js`, test | todo | | Sinh được 5 mẫu `corporate.json` với seed cố định; `openingProfiles.jsc_group` nạp đúng |
| CORE-010 | `core/consolidation.js`: cộng ngang, loại trừ đầu tư, lợi ích CĐ không kiểm soát, loại trừ nội bộ, lãi chưa thực hiện, vốn chủ sở hữu cho liên kết | CORE-005 | `frontend/js/core/consolidation.js`, test | todo | | Bộ số mẫu docs/09 §4.1 ra bảng hợp nhất cân; thiếu cờ nội bộ thì báo thiếu loại trừ |
| FE-015 | Vẽ giấy `resolution` (nghị quyết, biên bản) | FE-003 | `frontend/js/ui/paper/resolution.js` | todo | | Chạm được `approvedBy`, `votePercent`, `date`, `signature` |
| FE-016 | Màn `consolidation` | CORE-010, FE-020 | `frontend/js/screens/consolidation.js`, css | todo | | Làm trọn 5 bước docs/09 §5 |
| FE-017 | Công tắc "Giao dịch nội bộ tập đoàn" ở bảng định khoản Pro | FE-011 | `frontend/js/ui/entry-board-pro.js` | todo | | Cờ lưu vào `Entry.flags.intragroup` |
| PY-009 | Song sinh CORE-009, CORE-010 | CORE-009, 010 | `backend/app/engine/…` | todo | | Qua golden |

## M6 — Pro: kiểm toán Big Four (docs/10)

| ID | Việc | Phụ thuộc | Files | Status | Owner | Xong khi |
|---|---|---|---|---|---|---|
| CORE-011 | `core/audit.js`: trọng yếu, xác suất phát hiện theo seed, đánh giá sai sót, chọn ý kiến | CORE-005, 001 | `frontend/js/core/audit.js`, test | todo | | Khớp bảng quy tắc docs/10 §5 trên golden QA-003 |
| QA-003 | Golden cho trọng yếu và ý kiến kiểm toán (≥ 15 ca biên) | — | `tests/golden/audit.json` | todo | | Có ca đúng bằng ngưỡng, vượt 1 đồng, lan toả |
| FE-018 | Màn `audit` 5 bước, yêu cầu có hạn, danh sách sai sót với *Đồng ý điều chỉnh* hoặc *Giải trình* | CORE-011, FE-020 | `frontend/js/screens/audit.js`, css | todo | | Đi trọn một mùa kiểm toán |
| FE-019 | Giấy thư kiểm toán: thư xác nhận, thư quản lý, báo cáo kiểm toán (không logo) | FE-003 | `frontend/js/ui/paper/audit-letter.js` | todo | | Đủ 5 loại ý kiến |
| CNT-002 | Thẻ tình huống mùa kiểm toán và tập đoàn (docs/09 §6, docs/10 §6) | — | `content/cards/*.json` (định dạng mới: viết spec trong docs/04 cùng việc) | todo | | Mỗi thẻ có lựa chọn đúng; validator kiểm không thẻ nào thiếu đáp án |
| PY-010 | Song sinh CORE-011 | CORE-011 | `backend/app/engine/audit.py` | todo | | Qua golden QA-003 |

## Việc tài liệu

| ID | Việc | Phụ thuộc | Files | Status | Owner | Xong khi |
|---|---|---|---|---|---|---|
| DOC-001 | Bắt buộc AI ghi rõ đã làm gì và cập nhật README khi có tính năng mới hay thay đổi | — | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc`, `ai/prompts/*`, `ai/templates/*`, `ai/ROLES.md`, `ai/README.md`, `README.md` | done | claude-opus-5.5@2026-10-31 | Luật có trong AGENTS §2.1–2.2 và luật 14; README có bảng Tính năng và Nhật ký thay đổi |
