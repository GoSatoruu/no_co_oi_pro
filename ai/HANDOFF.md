# HANDOFF — Nhật ký bàn giao

> Chỉ **thêm vào cuối**, theo `ai/templates/handoff_entry.md`. Đầu phiên đọc 3 mục cuối.
> Không sửa mục của người khác. Muốn phản hồi thì viết mục mới và nhắc lại ID.

---

## 2026-10-31 00:30 · M0 (nền móng) · claude-opus-5.5 · done

**Đã làm**
- Khảo sát game gốc (cơ chế, cấu trúc module) → `docs/00_RE_NOTES.md`. Không chép code hay chữ của game gốc.
- Viết `docs/01`–`07`: GDD (Normal + Pro), kiến trúc, quy ước, content spec, hợp đồng API, lộ trình, luật kế toán.
- Bộ điều phối: `AGENTS.md` (luật chung), file trỏ cho Claude, Gemini, Copilot, Cursor; `ai/TASKS.md` (31 việc chia 4 làn + 3 việc của chủ dự án), `ai/DECISIONS.md` (ADR-001…009), `ai/ROLES.md`, `ai/prompts/*`, `ai/templates/*`.
- Content khởi đầu: 34 tài khoản (TT 99/2025), số dư đầu kỳ cân, luật GTGT có ngày hiệu lực, 2 chế độ, 7 mốc cấp, 9 loại lỗi, 8 mẫu chứng từ, kho tên hư cấu với MST hợp lệ dải `99…`.
- `tools/validate_content.py`: kiểm schema, tham chiếu chéo, MST, độ cân của đáp án trên mẫu biên; đã thử làm hỏng nội dung, validator bắt được.

**Kiểm tra**
- `python tools/validate_content.py` → 8 mẫu · 34 TK · 9 lỗi — 0 lỗi, 0 cảnh báo.

**Quyết định / giả định**
- ADR-001…008 `accepted`; ADR-009 (tên "Cân Sổ") `proposed`.
- Backend chọn FastAPI thay vì stdlib hay Flask (ADR-002).

**Cần người khác**
- Làn A bắt đầu từ CORE-001, CORE-002; làn D từ QA-001; làn B từ PY-004; làn C từ FE-001… FE-004 (dùng dữ liệu giả, không đợi lõi).

**Câu hỏi cho chủ dự án**
- OWN-001: tên game và tông hình ảnh.
- OWN-002: duyệt phạm vi Pro mode và MVP.
- Các mục `[cần kiểm]` trong `content/rules.json` và `docs/07` (thuế suất 8% năm 2026, ngưỡng 5 triệu, công thức chữ số kiểm tra MST).

**Người sau nên biết**
- Validator dùng chung ngữ pháp biểu thức với `core/expr.js` (CORE-002): có thể đọc `Parser` trong validator làm tham chiếu, nhưng viết lại bằng JS, đừng sinh code tự động từ Python.
- `requires.balanceAtLeast` so theo **bên số dư thông thường** của TK (331 là bên Có): xem docs/04 §5.

## 2026-10-31 00:20 · OWN-001 (tên game) · claude-opus-5.5 · done

**Đã làm**
- Đổi tên game thành **"Nợ Có Ơi Pro"** theo quyết định của chủ dự án; game **chỉ dùng riêng** → ADR-010 (thay ADR-009).
- Cập nhật: `AGENTS.md`, `README.md`, `.cursor/rules/project.mdc`, `ai/prompts/_START_HERE.md`, `content/i18n/vi.json`, `docs/00`, `docs/01`, `docs/02` (khoá lưu `nocooi.*`), `ai/TASKS.md` (OWN-001, seed golden `"nocooi"`).

**Kiểm tra**
- `python tools/validate_content.py` → 0 lỗi. Không còn chuỗi "Cân Sổ" hay `canso` ngoài lịch sử ADR và HANDOFF.

**Người sau nên biết**
- Tên game là ngoại lệ duy nhất của luật phòng sạch. Code, hình, lời thoại, nhân vật vẫn **không** được lấy từ game gốc.
- Tông hình ảnh (phần còn lại của OWN-001) vẫn chờ chủ dự án.

## 2026-10-31 01:10 · Pro mở rộng + hệ thống thiết kế · claude-opus-5.5 · done

**Đã làm**
- `docs/08_DESIGN_SYSTEM.md`: ý tưởng "bàn kế toán", 8 token màu, 2 phông, bố cục điện thoại và máy tính, thành phần, **bảng pháp luật bên cạnh nhiệm vụ** (§6), chuyển động (con dấu là điểm nhấn duy nhất), chữ trong giao diện.
- `docs/09_PRO_CORPORATE.md`: cấp 10–12 Pro: công ty cổ phần (cổ phần, cổ tức, cổ phiếu quỹ, nghị quyết), tập đoàn (công ty con, liên kết, bên liên quan), hợp nhất BCTC.
- `docs/10_AUDIT_BIG4.md`: mùa kiểm toán 5 bước, trọng yếu, ý kiến, chính sách dùng tên Big Four.
- Content: +9 TK (221, 222, 228, 3388, 343, 4111, 4112, 414, 419), `openingProfiles.jsc_group`, `rules` (mệnh giá, thuế TNCN cổ tức), +2 lỗi, cấp 10–12 chỉ Pro, `modes.hints.legalPanel` + `features`, `doc_templates/corporate.json` (5 mẫu), **`legal_refs.json`** (22 trích dẫn, 18 bảng), **`audit.json`**.
- Validator: kiểm `openingProfiles`, tham số `const/pick/rule`, `modes` và `attachments` trên mẫu, `legalPanel`, phủ bảng pháp luật cho mọi mẫu, Big Four đúng bốn hãng.
- Cập nhật AGENTS (luật 11–13), GDD, kiến trúc (`core/legal.js`, `consolidation.js`, `audit.js`), content spec §10, roadmap M5–M6, luật kế toán §7–8, TASKS (+15 việc), ADR-011…013.

**Kiểm tra**
- `python tools/validate_content.py` → 13 mẫu · 43 TK · 11 lỗi · 22 trích dẫn — 0 lỗi, 0 cảnh báo. Đã thử làm hỏng (thêm hãng ngoài Big Four, ref không tồn tại, verified sai, thiếu legalPanel): validator bắt đủ 4 lỗi.

**Quyết định / giả định**
- ADR-011 (bảng pháp luật không lộ đáp án, có mức đối chiếu), ADR-012 (Big Four), ADR-013 (phông đóng gói).
- Đã đối chiếu nguồn thứ cấp: TT 99/2025 hiệu lực 01/01/2026 thay TT 200; Luật 76/2025/QH15 sửa Luật DN, hiệu lực 01/07/2025 (định nghĩa cổ tức, chủ sở hữu hưởng lợi); TT 183/2013 về đơn vị có lợi ích công chúng. **Mọi số điều khoản khác vẫn `unverified`.**

**Cần người khác**
- CNT-001: đối chiếu toàn văn `legal_refs.json`, nhất là Luật DN Điều 132–135, 138, 167, 195–196; luân chuyển kiểm toán viên trong NĐ 17/2012; thuế TNCN cổ tức theo Luật 109/2025.

**Câu hỏi cho chủ dự án**
- OWN-004: duyệt hướng thiết kế docs/08.

**Người sau nên biết**
- `core/legal.js` cố ý không nhận `doc` hay `defect`; đừng "tối ưu" bằng cách truyền cả chứng từ vào.
- Mẫu `declare_dividend` cần 421 đủ lớn, nên chỉ sinh được với `openingProfiles.jsc_group`.

## 2026-10-31 01:20 · DOC-001 · claude-opus-5.5 · done

**Tóm tắt**
- Mọi AI giờ phải ghi rõ đã làm gì khi bàn giao, và phải cập nhật README (bảng Tính năng, Nhật ký thay đổi) khi có tính năng mới hoặc thay đổi.

**File đã đổi**

| File | Thêm / Sửa / Xoá | Đổi gì |
|---|---|---|
| `AGENTS.md` | Sửa | §1 bước 3 thêm đọc README; §2 bước 4 tách thành a/b/c; thêm §2.1 (ghi rõ đã làm gì) và §2.2 (cập nhật README); thêm luật cứng 14 |
| `README.md` | Sửa | Thêm dòng *Trạng thái*, bảng *Tính năng* (11 dòng), mục *Nhật ký thay đổi* có mốc `CHANGELOG:START` và 4 mục lịch sử; bước 3 của *Làm việc với nhiều AI* |
| `CLAUDE.md`, `GEMINI.md` | Sửa | Thêm khối "Bắt buộc khi bàn giao" |
| `.github/copilot-instructions.md` | Sửa | Thêm gạch đầu dòng về HANDOFF và README (file này cần chủ dự án tự chép vì máy chặn `.github`) |
| `.cursor/rules/project.mdc` | Sửa | Câu "Sau khi sửa" nêu rõ HANDOFF và README |
| `ai/prompts/_START_HERE.md` | Sửa | Bàn giao gồm (a) HANDOFF chi tiết, (b) README; câu trả lời cuối phiên liệt kê theo file |
| `ai/prompts/qa_review.md` | Sửa | Bước 3 kiểm cả HANDOFF và README |
| `ai/prompts/lead.md` | Sửa | Lead rà README khớp HANDOFF và TASKS |
| `ai/templates/handoff_entry.md` | Sửa | Viết lại: thêm Tóm tắt, bảng *File đã đổi*, *Hành vi thay đổi*, *README*, *Chưa xong / rủi ro* |
| `ai/templates/review.md` | Sửa | Thêm nhóm "Bàn giao" (5 ô) |
| `ai/templates/pr_checklist.md` | Sửa | Thêm ô README |
| `ai/ROLES.md` | Sửa | Luật phối hợp số 6 "Ghi rõ và công khai" |
| `ai/README.md` | Sửa | Thêm đoạn nhắc luật bàn giao |
| `ai/TASKS.md` | Sửa | Thêm bảng *Việc tài liệu* với DOC-001 |

**Hành vi thay đổi**
- Trước: bàn giao chỉ cần một mục HANDOFF tự do; README không theo dõi tính năng.
- Giờ: mục HANDOFF phải theo mẫu có bảng file và kết quả kiểm tra thật; có tính năng mới hay thay đổi thì README phải cập nhật; thiếu thì bị trả lại (luật 14).

**Kiểm tra**
- `python tools/validate_content.py` → 0 lỗi, 0 cảnh báo (không đổi content).
- Đọc lại AGENTS.md §2 và README sau khi sửa: các mục đã có, mốc `CHANGELOG:START` có đúng một dòng.

**README**
- Đã cập nhật: thêm dòng Trạng thái, bảng Tính năng, Nhật ký thay đổi (kể cả mục DOC-001).

**Quyết định / giả định**
- Nhật ký thay đổi đặt ngay trong README (chủ dự án yêu cầu "ghi vào Readme của GitHub"), không tách `CHANGELOG.md`.
- `README.md` được coi là thuộc phạm vi mọi việc, không cần khai trong cột Files.

**⚠ Đổi hợp đồng**
- Không (chỉ quy trình).

**Chưa xong / rủi ro**
- `.github/copilot-instructions.md` không ghi được thẳng vào máy: chủ dự án tự chép bản mới.

## 2026-10-31 · PY-001, PY-004, PY-005, PY-007, PY-008 (một phần) · claude-sonnet-5.5 · review

**Tóm tắt**
- Backend FastAPI chạy được: phục vụ game, `/api/content`, `/api/health`, SQLite có migrations, bảng xếp hạng, nộp điểm Normal, xin đề ván Pro; kèm bản Python của PRNG và bộ đọc biểu thức khớp golden.

**File đã đổi**

| File | Thêm / Sửa / Xoá | Đổi gì |
|---|---|---|
| `backend/app/main.py` | Thêm | `create_app(settings)`; header `X-Api-Version`; mount `/frontend`, `/content`; `/` chuyển về `/frontend/` |
| `backend/app/config.py` | Thêm | `Settings`, `load_settings()` đọc env và `backend/.env` |
| `backend/app/content.py` | Thêm | `load_bundle()` gộp content + sha1; `run_validator()` chạy `tools/validate_content.py` lúc khởi động |
| `backend/app/db.py`, `migrations/001_init.sql` | Thêm | `connect`, `migrate` (mỗi migration trong một giao dịch, ghi `schema_migrations`); bảng `runs`, `scores` |
| `backend/app/errors.py`, `deps.py`, `timeutil.py` | Thêm | Lỗi dạng `{error:{code,message}}`; phụ thuộc route; giờ UTC+7 |
| `backend/app/routes/{system,runs,leaderboard}.py` | Thêm | `/api/health`, `/api/content` (ETag, 304), `/api/runs`, `/api/runs/{id}/submit`, `/api/leaderboard`, `/api/scores` |
| `backend/app/services/{runs,scores,ratelimit}.py` | Thêm | Tạo ván, kiểm 404/409/410, bảng xếp hạng, giới hạn 30 lần/giờ/IP |
| `backend/app/engine/{rng,expr}.py` | Thêm | Bản Python của `core/rng.js`, `core/expr.js` |
| `backend/tests/*` (5 file) | Thêm | 41 test: golden rng/expr, health/content/ETag/tĩnh/migration, runs, leaderboard |
| `backend/app/**/__init__.py`; xoá `.gitkeep` ×2 | Thêm / Xoá | Biến thư mục thành package |
| `backend/README.md`, `docs/05_API_CONTRACT.md` | Sửa | Xem "Đổi hợp đồng" |
| `ai/TASKS.md` | Sửa | PY-001/004/005/007 → review; PY-008 ghi phần còn thiếu |

**Hành vi thay đổi**
- Trước: không có backend, chỉ chạy offline bằng `http.server`. Giờ: `uvicorn app.main:app` mở game ở `/` và các API ở trên; frontend cũ vẫn chạy offline.
- `POST /api/runs/{id}/submit` đi qua 400→404→409→410 đúng hợp đồng, rồi trả **501 `not_implemented`** vì chưa có generator để chấm lại. Không đánh dấu đã nộp, không tin `clientScore`.

**Kiểm tra**
- `cd backend && python -m pytest -q` → 41 passed.
- `python tools/validate_content.py` → 0 lỗi, 0 cảnh báo.
- `node --test tests/js/` → 16 pass, 0 fail.
- Khởi động app với validator bật qua TestClient: `/api/health`, `/frontend/`, `/content/modes.json` đều 200. **Chưa chạy** `uvicorn` thật bằng tay trong trình duyệt.

**README**
- Đã cập nhật: bảng Tính năng (thay 1 dòng bằng 4), Trạng thái, Chạy thử, Nhật ký thay đổi.

**Quyết định / giả định**
- `period=week` = từ thứ Hai 00:00 giờ VN (không phải 7 ngày trượt). Cùng điểm thì ai đạt trước xếp trên. Không gộp theo người chơi.
- `/api/runs` chỉ nhận `mode=pro` và `level` ∈ `startLevels`.
- Dùng múi cố định UTC+7 thay `zoneinfo` (Windows thiếu tzdata). Rate limit đếm thẳng từ bảng, không dùng bộ nhớ.
- Import `app.main` tạo luôn `backend/data/nocooi.db` (do `app = create_app()` ở cấp module); đã nằm trong `.gitignore`.

**⚠ Đổi hợp đồng**
- `docs/05` sửa: thêm cột `ip` ở `runs` và `scores`; `/api/content` có thêm `legalRefs`, `audit`, `i18n`; `POST /api/scores` trả `{id}`; mã `501 not_implemented`; định nghĩa `day`/`week`; ràng buộc `mode`, `level`, `limit`; backend phục vụ `/frontend/` và `/content/`.

**Chưa xong / rủi ro**
- PY-006: chấm lại ván Pro cần PY-003 (generator) ← PY-002 (money_words, rules, ledger, grader) ← CORE-003/005/006/007, hiện chưa có bên JS.
- PY-008: thiếu test chấm lại ván; `GET/PUT /api/saves` (docs/05 §4, "tuỳ chọn") chưa làm.
- Board `daily` chưa có đường ghi điểm nào.
- Không có CORS vì frontend cùng nguồn; nếu mở frontend từ nơi khác sẽ cần thêm.
- `X-Forwarded-For` không được tin; sau proxy thì mọi người cùng một IP.

**Cần người khác**
- Làn A: CORE-003…007 để mở khoá PY-002/003/006.
