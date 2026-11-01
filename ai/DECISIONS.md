# DECISIONS — Nhật ký quyết định kiến trúc (ADR)

> Chỉ **thêm** vào cuối. Muốn đổi một quyết định: viết ADR mới, `Thay thế: ADR-xxx`, trạng thái `proposed`, chờ chủ dự án đổi sang `accepted`.
> Mẫu: `ai/templates/adr.md`.

---

## ADR-001 — Frontend JavaScript thuần, không build
- **Trạng thái:** accepted · 31/10/2026
- **Bối cảnh:** chủ dự án muốn "nhẹ nhàng với HTML, CSS, JS". Nhiều AI cùng sửa thì càng ít công cụ càng ít lỗi môi trường.
- **Quyết định:** ES modules gốc của trình duyệt, không framework, không bundler, không npm cho frontend. Test lõi bằng `node --test` (có sẵn trong Node ≥ 20).
- **Hệ quả:** phải tự viết router và state đơn giản; đổi lại, mở `index.html` qua server tĩnh là chạy. Thêm thư viện ngoài phải có ADR.

## ADR-002 — Backend FastAPI + sqlite3 thư viện chuẩn
- **Trạng thái:** accepted · 31/10/2026
- **Lựa chọn đã cân nhắc:** `http.server` thuần (quá thô cho validation), Flask (thiếu schema kiểu sẵn), FastAPI.
- **Quyết định:** FastAPI + Pydantic + uvicorn; cơ sở dữ liệu `sqlite3`, không ORM.
- **Hệ quả:** hợp đồng API kiểm bằng Pydantic, có `/docs` tự sinh để AI khác đọc; phụ thuộc chỉ 3 gói.

## ADR-003 — Nội dung là dữ liệu JSON dùng chung
- **Trạng thái:** accepted · 31/10/2026
- **Quyết định:** tài khoản, luật, chế độ, cấp, lỗi, mẫu chứng từ nằm trong `content/`. Frontend và backend đọc cùng file. `tools/validate_content.py` (chỉ thư viện chuẩn) là cổng bắt buộc.
- **Hệ quả:** thêm nghiệp vụ không cần sửa code; luật thuế đổi chỉ sửa `rules.json`.

## ADR-004 — Lõi song sinh JS ↔ Python, server có quyền chấm cuối
- **Trạng thái:** accepted · 31/10/2026
- **Bối cảnh:** chơi offline cần lõi ở client; bảng xếp hạng Pro cần chống gian lận.
- **Quyết định:** cùng thuật toán ở `frontend/js/core/` và `backend/app/engine/`; trọng tài là `tests/golden/`. Ván xếp hạng: server sinh seed, client gửi **hành động**, server tự chấm.
- **Hệ quả:** mỗi thay đổi logic phải làm hai nơi (hoặc mở việc PARITY). Bù lại không cần mã hoá hay ký bản lưu.

## ADR-005 — PRNG: `cyrb128` để băm seed + `sfc32` để sinh số
- **Trạng thái:** accepted · 31/10/2026
- **Quyết định:** chuỗi seed → `cyrb128` → 4 số uint32 → `sfc32`. `next()` trả `[0, 1)` = `uint32 / 2^32`. `int(a, b)` = `a + floor(next() * (b - a + 1))`. `pick(arr)` = `arr[int(0, len-1)]`. `shuffle` = Fisher–Yates từ cuối mảng.
- **Python:** mô phỏng phép toán uint32 bằng `& 0xFFFFFFFF`, `Math.imul` → `(a * b) & 0xFFFFFFFF` (sau khi đưa về uint32).
- **Hệ quả:** thứ tự gọi rng **là một phần của hợp đồng**: generator JS và Python phải gọi rng theo cùng thứ tự. Ghi thứ tự gọi trong comment đầu `generator.js`.

## ADR-006 — Chế độ chơi là dữ liệu
- **Trạng thái:** accepted · 31/10/2026
- **Quyết định:** code không rẽ nhánh theo `mode.id`. Mọi khác biệt đi qua cờ trong `modes.json` (`input.account`, `hints.mentor`…).
- **Hệ quả:** thêm chế độ (Luyện tập, Thi đấu ngày) chủ yếu là thêm JSON và có thể thêm màn.

## ADR-007 — Tiền là số nguyên VND, làm tròn half-up
- **Trạng thái:** accepted · 31/10/2026
- **Quyết định:** mọi số tiền lưu và so sánh là số nguyên. Chỉ biểu thức trung gian mới là số thực, rồi `round()` (half-up) ngay. Python **không** dùng `round()` có sẵn (banker's rounding) mà dùng hàm half-up riêng.

## ADR-008 — Phòng sạch với game gốc
- **Trạng thái:** accepted · 31/10/2026
- **Quyết định:** chỉ học cơ chế (docs/00 §1). Không chép code, chữ, hình, âm thanh, tên. Nhân vật, công ty, MST trong game đều hư cấu.

## ADR-009 — Tên làm việc "Cân Sổ"
- **Trạng thái:** superseded bởi ADR-010 · 31/10/2026
- **Quyết định đề xuất:** tên hiển thị "Cân Sổ", codename `can-so`, khoá lưu `canso.*`. Thư mục gốc giữ `no_co_oi`.
- **Hệ quả:** đổi tên sau này chỉ cần sửa `content/i18n/vi.json` (`app.title`) và tiền tố khoá lưu (kèm migration).

## ADR-010 — Tên game "Nợ Có Ơi Pro", bản dùng riêng
- **Trạng thái:** accepted · 31/10/2026 (chủ dự án quyết trong chat)
- **Thay thế:** ADR-009. Điều chỉnh ADR-008 riêng phần tên game.
- **Bối cảnh:** chủ dự án muốn đặt tên theo game gốc, và xác nhận game **chỉ để chơi riêng**, không phát hành công khai.
- **Quyết định:** tên hiển thị "Nợ Có Ơi Pro", codename `no-co-oi-pro`, tiền tố khoá lưu `nocooi.*`. Mọi phần còn lại của ADR-008 (không chép code, hình, lời thoại, nhân vật) **giữ nguyên**.
- **Hệ quả:** không đưa bản này lên kho công khai, cửa hàng ứng dụng hay hosting mở cho người ngoài. Nếu sau này muốn phát hành thì phải viết ADR mới đổi tên trước: sửa `content/i18n/vi.json` (`app.title`) và tiền tố khoá lưu (kèm migration).

## ADR-011 — Bảng pháp luật bên cạnh nhiệm vụ: dữ liệu, không lộ đáp án, có mức đối chiếu
- **Trạng thái:** accepted · 31/10/2026 (chủ dự án yêu cầu tính năng)
- **Bối cảnh:** mỗi nhiệm vụ cần có căn cứ pháp luật hiện bên cạnh. Rủi ro: (1) bảng vô tình lộ chứng từ nào lỗi; (2) AI bịa điều khoản.
- **Quyết định:** nội dung ở `content/legal_refs.json`; chọn bảng bằng `core/legal.js` theo `step` + `template`/`kind`, **hàm không nhận thông tin lỗi**. Mỗi trích dẫn có `verified` (official / secondary / unverified), hiện thẳng cho người chơi. Normal có thêm Mẹo, Pro không.
- **Hệ quả:** đổi luật chỉ cần sửa JSON; người chơi biết dòng nào chưa đối chiếu; việc CNT-001 nâng độ tin cậy dần.

## ADR-012 — Kiểm toán chỉ dùng Big Four, tên thật, trình bày trung lập
- **Trạng thái:** accepted · 31/10/2026 (chủ dự án yêu cầu; bản dùng riêng theo ADR-010)
- **Quyết định:** `audit.json.firms` đúng bốn hãng Deloitte, PwC, EY, KPMG (validator chặn hãng khác). Chỉ dùng tên chữ, không logo hay màu thương hiệu. Bốn hãng cơ chế như nhau. Hãng và kiểm toán viên NPC luôn chuyên nghiệp; mọi tình huống sai trái chỉ đến từ nhân vật hư cấu phía khách hàng.
- **Hệ quả:** không phát hành công khai khi còn tên thật; muốn phát hành thì thay bằng hãng hư cấu cùng lúc với đổi tên game.

## ADR-013 — Phông chữ đóng gói sẵn
- **Trạng thái:** accepted · 31/10/2026
- **Quyết định:** Be Vietnam Pro (giao diện) và Source Serif 4 (giấy tờ, văn bản luật), giấy phép OFL, đặt woff2 trong `frontend/assets/fonts/` kèm file giấy phép. Không gọi Google Fonts lúc chạy.
- **Hệ quả:** chơi offline được; thêm khoảng 150–250 KB lần tải đầu (nạp `font-display: swap`, chỉ các độ đậm dùng tới).


## ADR-014 — Định hướng Thế giới mở Quản trị Tài chính Doanh nghiệp, Chứng từ dạng Push Stream và Giao diện ERP / Palantir Foundry (Pro)
- **Trạng thái:** accepted · 01/11/2026 (chủ dự án quyết định trực tiếp trong chat)
- **Điều chỉnh:** Mở rộng `docs/01_GDD.md` và cập nhật `docs/08_DESIGN_SYSTEM.md`.
- **Bối cảnh:** Chủ dự án muốn nâng tầm trò chơi từ hoạt động kế toán định khoản đơn thuần sang toàn bộ hoạt động tài chính của một doanh nghiệp theo định dạng thế giới mở (open-world business simulation), nơi người chơi có thể ra các quyết định tư vấn chiến lược và nhìn thấy ngay kết quả trên các chỉ số Doanh thu, Lợi nhuận, Thanh khoản. Đồng thời, chứng từ không xuất hiện như các bài test rời rạc mà đẩy về như thông báo Push (Push Notifications) trong một phần mềm quản lý doanh nghiệp; bản Pro mang phong cách Dashboard phân tích dữ liệu của Palantir Foundry / Gotham.
- **Quyết định:**
  1. **Lối chơi Thế giới mở & Tư vấn Tài chính (`core/finance.js`):** Kết hợp hạch toán kế toán chuẩn Thông tư 99/2025 với mô phỏng tài chính doanh nghiệp liên tục. Mọi bút toán ghi sổ và quyết định tư vấn chiến lược của người chơi đều tác động thời gian thực lên Doanh thu thuần, Giá vốn, Chi phí vận hành, Lợi nhuận ròng, Dòng tiền (111+112), Công nợ (131/331) và Định giá doanh nghiệp.
  2. **Chứng từ dạng Thông báo Push (Push Notification Stream):** Chứng từ từ các phòng ban (Kinh doanh, Mua hàng, Kho vận, Ngân hàng, HĐQT) chảy về liên tục trong Inbox/Feed kèm SLA thời gian phản hồi và Toast thông báo, thay vì giao diện làm bài kiểm tra từng câu.
  3. **Giao diện Phần mềm Quản lý Doanh nghiệp & Palantir Dashboard (Pro):** Toàn bộ trò chơi vận hành như một Hệ điều hành Tài chính Doanh nghiệp (Enterprise Financial OS). Bản Pro sử dụng giao diện chiến thuật tối kiểu Palantir Foundry (`#0A0E14`, lưới dữ liệu sắc nét, telemetry KPI, biểu đồ đa trục thời gian thực).
- **Hệ quả:** Giữ nguyên toàn bộ lõi chấm điểm (`core/shift.js`, `core/expr.js`, `core/rng.js`, `core/money-words.js`) để đảm bảo tương thích ngược với 100% bài kiểm thử hiện có, đồng thời bổ sung lớp mô phỏng tài chính `core/finance.js` và giao diện Dashboard mới.
