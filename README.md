# Nợ Có Ơi Pro

> Bản **dùng riêng**, không phát hành công khai (xem `ai/DECISIONS.md` ADR-010).

Game web mô phỏng nghề kế toán Việt Nam: **soi chứng từ → định khoản Nợ/Có → kiểm quỹ → khoá sổ**.
Có hai chế độ **Thường** và **Pro**, nội dung mở rộng bằng dữ liệu JSON.
Lấy cảm hứng về cơ chế từ "Nợ Có Ơi" (JoyUp); toàn bộ code, hình, chữ và nhân vật là tự làm; chỉ tên game dựa theo bản gốc.

- Frontend: HTML + CSS + JavaScript thuần (ES modules, không build)
- Backend: Python, FastAPI + SQLite (bảng xếp hạng, chấm lại ván Pro)

**Trạng thái:** M0 xong; chơi được một ca ở màn bàn làm việc (soi chứng từ và định khoản). Chưa có kiểm quỹ, khoá sổ, và phần chấm lại ván Pro. Xem `docs/06_ROADMAP.md`.

## Tính năng

> AI sửa bảng này **mỗi khi** một tính năng đổi trạng thái hoặc có tính năng mới (AGENTS.md §2, bước 4).
> Trạng thái: **Chơi được** · **Có dữ liệu, chưa code** · **Mới có thiết kế**.

| Tính năng | Chế độ | Trạng thái | Tài liệu |
|---|---|---|---|
| Ca làm: hàng chờ, soi chứng từ, định khoản Nợ/Có, ghi sổ | Thường, Pro | Chơi được | docs/01 §2.2 |
| Thế giới mở Quản trị Tài chính & Tư vấn Chiến lược CFO (Doanh thu, Lợi nhuận ròng, Thanh khoản, Định giá DN) | Thường, Pro | Chơi được | docs/01 §10, ADR-014 |
| Luồng chứng từ Push Notification thời gian thực & Giao diện ERP / Palantir Foundry Dashboard | Thường, Pro | Chơi được | docs/08 §11, ADR-014 |
| Bàn điều hành chính thức & Tự động lưu/khôi phục đa phiên chơi (`nocooi.save.v1` + `.bak`) | Thường, Pro | Chơi được | docs/02 §6, docs/01 §10 |
| Cân đối Nguồn tiền Doanh nghiệp (`111`, `112`, `131`, `331`, `3331`, `341`, tự động tối ưu ngân quỹ) | Thường, Pro | Chơi được | docs/01 §10 |
| Hệ thống Tài khoản Tổng (Bảng cân đối phát sinh 6 cột, Tài sản = Nguồn vốn, kết chuyển `911 ➔ 421`) | Thường, Pro | Chơi được | docs/01 §10 |
| Sự kiện ngẫu nhiên Lệnh chi / Thông báo thu phong cách Slack Workspace, tương tác NPC đa chiều, phát chuông Web Audio API | Thường, Pro | Chơi được | docs/01 §10, ADR-014 |
| CEO Tập đoàn Đa ngành & Tự do Mở rộng / Sáng lập Lĩnh vực Kinh doanh (Vốn góp 221, Vay 341, Thu hoạch chu kỳ DT 511/515) | Thường, Pro | Chơi được | docs/09, docs/01 §10 |
| Cố vấn AI CFO (LLM tuỳ chỉnh OpenAI/Gemini/Claude/Ollama + Offline Heuristic 100% không cần mạng) & Tối ưu đa thiết bị (Desktop, iPhone 13 Pro, BlackBerry Key2) | Thường, Pro | Chơi được | docs/09, docs/08 §11 |
| Mô phỏng Quản lý Kinh doanh CEO: Đội ngũ 8 Nhân sự bên cạnh CEO, Giao Chỉ đạo Điều hành (Preset & Tự do) & Hệ thống Nhắn tin Role-Playing Đa Nhân vật vận hành bởi LLM | Thường, Pro | Chơi được | docs/09, docs/01 §10 |
| 8 mẫu chứng từ cơ bản (bán hàng, mua hàng, chi phí, ngân hàng, giá vốn) | Thường, Pro | Chơi được | `content/doc_templates/` |
| 11 loại lỗi chứng từ, sai sót ẩn lộ khi kiểm quỹ và khoá sổ | Thường, Pro | Có dữ liệu, chưa code | `content/defects.json` |
| Kiểm quỹ cuối tuần, khoá sổ tháng | Thường, Pro | Mới có thiết kế | docs/01 §2.3–2.4 |
| Bảng pháp luật bên cạnh mỗi nhiệm vụ (22 trích dẫn, có nhãn mức đối chiếu) | Thường, Pro | Có dữ liệu, chưa code | docs/08 §6, `content/legal_refs.json` |
| Pro: gõ số hiệu tài khoản, bút toán nhiều dòng, không gợi ý | Pro | Mới có thiết kế | docs/01 §4.2 |
| Pro: công ty cổ phần (cổ phần, cổ tức, cổ phiếu quỹ, nghị quyết) | Pro | Có dữ liệu, chưa code | docs/09 |
| Pro: tập đoàn, công ty con, hợp nhất báo cáo tài chính | Pro | Mới có thiết kế | docs/09 §4–5 |
| Pro: kiểm toán độc lập do Big Four thực hiện | Pro | Có dữ liệu, chưa code | docs/10, `content/audit.json` |
| Máy chủ API: phục vụ game, `/api/health`, `/api/content` (có ETag), SQLite + migrations | — | Chạy được | docs/05 §1, §6 |
| Bảng xếp hạng và điểm Thường (`/api/leaderboard`, `/api/scores`, giới hạn 30 lần/giờ/IP; chưa có giao diện) | Thường, Pro | Chạy được | docs/05 §3 |
| Ván xếp hạng Pro: xin đề `/api/runs` (chưa có giao diện) | Pro | Chạy được | docs/05 §2 |
| Máy chủ chấm lại ván Pro (`/api/runs/{id}/submit`; hiện trả 501, chờ PY-003) | Pro | Mới có thiết kế | docs/05 §2 |
| Đọc số tiền thành chữ (`moneyToWords`, JS và Python cho cùng chuỗi; cách đọc nhóm 000 chờ OWN-003) | — | Chạy được | docs/07 §6, `tests/golden/money_words.json` |
| Kiểm tra nội dung tự động (`tools/validate_content.py`) | — | Chạy được | docs/04 |

## Chạy thử

```bash
# chỉ frontend (chơi offline): chạy ở thư mục gốc rồi mở http://127.0.0.1:5500/frontend/
python -m http.server 5500

# đầy đủ: backend phục vụ cả frontend và content, mở http://127.0.0.1:8000
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Kiểm tra

```bash
python tools/validate_content.py      # nội dung
node --test tests/js/                 # lõi JS
cd backend && python -m pytest -q     # Python
```

## Bản đồ thư mục

| Thư mục | Nội dung |
|---|---|
| `AGENTS.md` | **Luật chung cho mọi AI**: đọc trước tiên |
| `ai/` | Bảng việc, bàn giao, quyết định, vai trò, prompt, mẫu |
| `docs/` | 00 RE notes, 01 GDD, 02 kiến trúc, 03 quy ước, 04 content spec, 05 API, 06 lộ trình, 07 luật kế toán, 08 hệ thống thiết kế, 09 Pro: CTCP và tập đoàn, 10 Pro: kiểm toán Big Four |
| `content/` | Dữ liệu game: tài khoản, luật, chế độ, cấp, lỗi, mẫu chứng từ, trích dẫn pháp luật, kiểm toán |
| `frontend/` | Trò chơi chạy trên trình duyệt |
| `backend/` | API Python |
| `tests/` | Test JS, test chung (golden) JS↔Python |
| `tools/` | Công cụ dòng lệnh (kiểm nội dung…) |

## Làm việc với nhiều AI

1. Mở `ai/TASKS.md`, chọn việc `todo` có đủ phụ thuộc.
2. Lấy `ai/prompts/_START_HERE.md`, điền mã việc và vai, rồi dán vào AI (Claude, ChatGPT/Codex, Gemini, Cursor…).
3. AI tự nhận việc, làm, kiểm, rồi **ghi rõ đã làm gì** vào `ai/HANDOFF.md` và cập nhật README này (bảng Tính năng và Nhật ký thay đổi).
4. Giao việc ở trạng thái `review` cho **một AI khác** duyệt bằng `ai/prompts/qa_review.md`.

## Nhật ký thay đổi

> Mới nhất ở trên. Mỗi mục: ngày, mã việc, người làm (mô hình AI hoặc chủ dự án), rồi các dòng **Thêm / Sửa / Xoá** nói bằng ngôn ngữ người chơi hoặc người phát triển hiểu được.
> Chi tiết kỹ thuật đầy đủ nằm ở `ai/HANDOFF.md`; README chỉ ghi điều người đọc repo cần biết.

<!-- CHANGELOG:START — thêm mục mới ngay dưới dòng này -->

### 2026-11-02 · CORE-018, FE-026 · gemini-4-argon
- **Thêm:** nâng cấp trò chơi thành **Mô phỏng Quản lý Kinh doanh & Role-Playing Điều hành (CEO Business Management & LLM Roleplay)**: người chơi giữ vai trò **CEO (Tổng Giám đốc)** với **8 nhân sự cốt cán bên cạnh** (Chị Mơ CFO, Bé Na Kinh doanh, Chú Bền Kho vận, Anh Tâm Ngân quỹ, Cậu Lẹ Giao nhận COD, Ông Thịnh Phó TGĐ M&A, Chị Ngân Kiểm toán Pháp chế, Bà Diệu Chủ tịch HĐQT) kèm chỉ số Tinh thần (`Morale`), Hiệu suất (`Efficiency`) và Độ tín nhiệm (`Trust`).
- **Thêm:** hệ thống **Giao Chỉ đạo Điều hành cho Nhân viên cấp dưới** (`STAFF_DIRECTIVES_CATALOG`, `issueExecutiveDirective`): CEO có thể bấm giao **24 chỉ đạo chiến thuật có sẵn** (3 chỉ đạo đặc thù/nhân viên) hoặc **gõ mệnh lệnh chỉ đạo tự do bằng lời của CEO**. Mỗi chỉ đạo tự động thực thi nghiệp vụ kinh doanh, hạch toán bút toán kép vào Sổ cái (`111`, `112`, `131`, `156`, `331`, `511`, `515`, `632`, `641`, `642`, `711`, `411`, `421`), cập nhật KPI và lưu vào **Sổ Theo dõi Chỉ đạo của CEO**.
- **Thêm:** **Phòng Nhắn tin Role-Playing Đa Nhân vật vận hành bởi LLM** (`NPC_ROLEPLAY_PROFILES`, `askNpcRoleplay`, `generateOfflineNpcRoleplay`): CEO có thể nhắn tin tự do 1-1 với bất kỳ NPC nào; mỗi NPC nhập vai đúng tính cách, cách xưng hô và báo cáo chính xác số liệu tài chính thời gian thực của Tập đoàn (hỗ trợ cả LLM trực tuyến OpenAI/Gemini/Claude/Ollama lẫn Offline Roleplay Engine nội bộ 100% không cần mạng).

### 2026-11-01 · FE-026 (LOG-SESSION & AUTO-HEAL) · gemini-4-argon
- **Thêm:** dịch vụ **Phiên Ghi Log & Chẩn đoán Hệ thống** (`services/logger.js` — khoá `nocooi.logs.v1`), tự động bắt mọi sự kiện khởi tạo, cảnh báo và lỗi runtime/promise kèm `stack trace` chi tiết; thêm nút **`📋 Nhật ký Log`** trên thanh Topbar (và phím tắt `[L]`) cho phép lọc log (`ALL / ERROR / WARN / INFO`), sao chép toàn bộ log hoặc tải file `.json` về máy.
- **Thêm:** cơ chế **Tự Phục hồi (Auto-Heal)** và **Bảng Chẩn đoán Khẩn cấp**: nếu dữ liệu phiên lưu cũ gặp bất kỳ xung đột nào, hệ thống tự động ghi vết vào Phiên Ghi Log và khởi tạo phiên làm việc mới sạch mà không làm gián đoạn trò chơi; bọc độc lập từng phân hệ giao diện (`safeRenderSection`).
- **Sửa:** khắc phục lỗi đệ quy trong `safeGetSettings(store)` khi đọc cấu hình từ `store.js` mới.

### 2026-11-01 · FIX-DESK-MIGRATION · gemini-3.8-flash
- **Sửa:** khắc phục triệt để lỗi khi mở game tại `http://127.0.0.1:5500/frontend/` do session cũ lưu trong `localStorage` thiếu các thuộc tính mới (`sectors`, `doc.push`, `enactedAdvisories`, `journal`, `amountChoices`), triển khai cơ chế `sanitizeState` tự động chuẩn hoá và migrate mượt mà mọi session cũ sang Bàn Điều hành CEO Tập đoàn Đa ngành.
- **Sửa:** bổ sung hàm xuất `getSettings()` và `updateSettings()` trong `services/store.js` giải quyết lỗi `TypeError: store.getSettings is not a function`.
- **Sửa:** loại bỏ các truy cập `.firstChild.style` gây lỗi `TypeError: Cannot read properties of undefined (reading 'style')` trên các thành phần gợi ý nhập liệu định khoản và điều chuyển ngân quỹ.
- **Sửa:** thêm query version cache-busting `?v=20261101_ceo_v1` cho file `index.html` để đảm bảo trình duyệt người dùng luôn tải phiên bản JavaScript và CSS mới nhất.

### 2026-11-01 · CORE-017, FE-025 · gemini-3.8-flash
- **Thêm:** chuyển vai trò người chơi thành **CEO Tập đoàn Đa ngành**, chỉ huy hệ sinh thái các công ty con và đơn vị thành viên; bổ sung **Tab 05 // Mở rộng Tập đoàn & Tư vấn CEO**.
- **Thêm:** cơ chế **Tự do Mở rộng Lĩnh vực Kinh doanh**: CEO có thể chọn mở rộng từ danh mục 8 ngành kinh tế trọng yếu hoặc dùng **Trình Tự Sáng lập Ngành Mới** (tự đặt tên công ty con, icon, quy mô vốn, mức ROI kỳ vọng); tự động giải ngân vốn đầu tư vào `TK 221` (từ Tiền gửi `112` hoặc đòn bẩy Vay tín dụng `341`) và kích hoạt kênh Slack riêng cho công ty con mới.
- **Thêm:** tính năng **Thu hoạch Doanh thu Chu kỳ Toàn Tập đoàn [Phím H]** hoặc từng công ty con, sinh dòng tiền thực tế và doanh thu `511`/`515` vào Sổ cái và Tài khoản Tổng.
- **Thêm:** **Cố vấn Trí tuệ Nhân tạo AI CFO Co-Pilot** (`services/llm-cfo.js`), hỗ trợ kết nối đa nhà cung cấp LLM tuỳ ý (OpenAI-compatible, OpenRouter, Groq, DeepSeek, Google Gemini, Anthropic Claude, Ollama/LM Studio local) với các phong cách Persona (Kiểm toán Big Four, Tăng trưởng M&A, Kiểm soát Pháp chế).
- **Thêm:** bộ suy luận **Offline Heuristic CFO Engine** tích hợp sẵn, tự động phân tích rủi ro chứng từ theo Thông tư 99/2025/TT-BTC, đánh giá tỷ số ngân quỹ và gợi ý M&A thông minh mà **100% không cần kết nối mạng hay API Key**.
- **Thêm:** hộp thoại **Cài đặt Hệ thống (LLM & Thiết bị)** cho phép kiểm tra kết nối API tức thì (`testLlmConnection`) và nút **Ngẫu nhiên hoá tính cách CFO**.
- **Thêm:** tối ưu hiển thị 100% cho **iPhone 13 Pro** (`390×844 px`, hỗ trợ Safe Area, chống tự động zoom font input, thanh Mobile Bottom Navigation Bar chạm ngón cái) và **BlackBerry Key2** (bố cục tỷ lệ 3:2 Compact Telemetry kèm **Hệ thống Phím tắt Vật lý QWERTY Speed Keys** `[1]`, `[2]`, `[3]`, `[4]`, `[5]`, `[C]`, `[S]`, `[H]`, `[A]`, `[J]`, `[K]`).

### 2026-11-01 · CORE-016, FE-024 · gemini-4-argon
- **Thêm:** tích hợp **hệ thống âm thanh Web Audio API** thuần (`ui/sound.js`), mô phỏng tiếng gõ cửa Slack Knock khi có lệnh chi/thông báo thu mới, tiếng gửi đi Slack Send, tiếng NPC hồi đáp Slack Reply, tiếng ghi sổ thành công và còi cảnh báo vi phạm chuẩn mực. Nút Bật/Tắt âm thanh trên command bar.
- **Thêm:** cơ chế **sự kiện ngẫu nhiên có seed** (`rng.js` & `finance.js`) sinh các lệnh chi đột xuất và thông báo thu tiền từ 8 nhân vật NPC (Bé Na, Anh Tâm, Chú Bền, Ông Thịnh, Cậu Lẹ, Chị Mơ, Bà Diệu, Chị Ngân) định kỳ 45s hoặc theo nút bấm chủ động.
- **Thêm:** **Bảng Tin nhắn Tương tác Slack Workspace** (Tab 02 trên Bàn Điều hành), chia 2 cột gồm danh sách thread/kênh và khung hội thoại tương tác, cho phép người chơi (CFO) lựa chọn phản hồi các NPC, cập nhật trực tiếp vào Sổ cái và Tài khoản Tổng của Doanh nghiệp, tuân thủ Luật không thưởng gian lận.
- **Thêm:** tính năng Quick Reply trực tiếp ngay trên đầu mỗi chứng từ Push ở Tab 01 để phản hồi tức thì cho phòng ban phát hành lệnh.

### 2026-11-01 · FE-002, CORE-015, FE-023 · gemini-4-argon
- **Thêm:** chuyển thành **Bàn Điều hành Chính thức** mở thẳng khi vào ứng dụng; tự động lưu lại mọi thao tác của từng phiên chơi (`services/store.js` với khoá `nocooi.save.v1` và bản sao lưu dự phòng `.bak`), cho phép đặt tên phiên, tạo bản sao mốc lưu (Checkpoint), tạo phiên mới và chuyển đổi giữa nhiều phiên doanh nghiệp đã lưu.
- **Thêm:** phân hệ **Cân đối Nguồn tiền Doanh nghiệp (Corporate Treasury)**: theo dõi tỷ trọng Quỹ Tiền mặt (`111`) / Tiền gửi Ngân hàng (`112`), Vốn lưu động ròng (`NWC`), `Current Ratio`, `Quick Ratio`; thực thi 7 lệnh điều chuyển nguồn tiền (`111`, `112`, `131`, `331`, `3331`, `341`) hoặc bấm **Tự động Cân đối Nguồn tiền Tối ưu**.
- **Thêm:** phân hệ **Tài khoản Tổng & Bảng Cân đối Kế toán (Master Trial Balance)**: hiển thị Bảng cân đối phát sinh 6 cột (`Dư Nợ/Có Đầu kỳ`, `Phát sinh Nợ/Có`, `Dư Nợ/Có Cuối kỳ`) của toàn bộ Tài khoản Tổng (Loại 1 ➔ Loại 9), đối chiếu trực tiếp phương trình `Tổng Tài sản = Nợ phải trả + Vốn chủ sở hữu`, và thực hiện bút toán **Khoá sổ & Kết chuyển Cuối kỳ (`5xx/6xx/7xx/8xx ➔ 911 ➔ 421`)**.

### 2026-11-01 · CORE-014, FE-022 · gemini-4-argon
- **Thêm:** mở rộng thành trình mô phỏng Quản trị Tài chính Doanh nghiệp Thế giới mở (`Financial OS`): người chơi đóng vai Giám đốc Tài chính (CFO) ra quyết định tư vấn chiến lược (chiết khấu thanh toán sớm, tự động hoá kho bãi, chiến dịch B2B, cơ cấu nợ vay, đầu tư R&D, gửi tiết kiệm kỳ hạn) tác động trực tiếp lên Doanh thu, Lợi nhuận ròng, Biên lợi nhuận, Thanh khoản (`111 + 112`) và Định giá Doanh nghiệp.
- **Sửa:** chuyển đổi chứng từ kế toán từ dạng bài kiểm tra sang luồng thông báo Push Notification thời gian thực từ các phòng ban (Kinh doanh, Kho vận, Mua hàng, Ngân quỹ, HĐQT), cho phép nạp thêm luồng chứng từ mới bất cứ lúc nào.
- **Sửa:** thiết kế lại toàn bộ giao diện như phần mềm quản trị doanh nghiệp (ERP Workspace cho chế độ Thường và **Palantir Foundry / Gotham Telemetry Dashboard** cho chế độ Pro) với biểu đồ Telemetry P&L, Báo cáo Kết quả Kinh doanh trực tiếp và Sổ cái thời gian thực.

### 2026-11-01 · FE-021 · gemini-3.8-flash
- **Sửa:** thiết kế lại giao diện bàn làm việc trực quan: chứng từ hiển thị dạng biểu mẫu kế toán thật có bảng biểu và chữ ký; bảng chữ T định khoản hiển thị tổng Nợ/Có và trạng thái cân đối rõ ràng; thanh tiến độ ca làm việc có hàng chờ 5 chứng từ và thước đo thời gian kiên nhẫn.
- **Thêm:** bộ chọn cấp độ nghiệp vụ linh hoạt (Cấp 1–5) trên màn hình Title; con dấu sinh động đập lên chứng từ khi duyệt hoặc trả lại.

### 2026-10-31 · CORE-013 · gemini-3.8-flash
- **Sửa:** khắc phục lỗi văng khi sinh ca làm ở Cấp 5 trở lên (mẫu xuất kho cogs thiếu trường total) và lỗi crash ở Cấp 10–12 chế độ Pro (thiếu đọc tham số luật kế toán parValue, pitRate).
- **Sửa:** màn bàn làm việc hiển thị lỗi chi tiết khi gặp sự cố thay vì luôn báo "Không đọc được dữ liệu"; hỗ trợ nhận cấp độ chơi qua tham số.

### 2026-10-31 · FE-005 · claude-opus-5.5
- **Sửa:** chứng từ trên bàn làm việc hiện đủ chữ. Trước đó nút trường dùng màu chữ của bàn, trùng nền giấy nên tờ giấy trông trống.

### 2026-10-31 · FE-005 (lát cắt) · claude-opus-5.5
- **Sửa:** màn bàn làm việc giờ chơi được: mỗi ca có 5 chứng từ sinh từ dữ liệu, người chơi soi lỗi rồi định khoản, game chấm và cộng điểm. Kiểm quỹ và khoá sổ vẫn chưa có.

### 2026-10-31 · CORE-003 · claude-opus-5.5
- **Thêm:** đọc số tiền thành chữ tiếng Việt ("Mười lăm triệu không trăm linh tám nghìn đồng"), sẽ dùng cho chứng từ và lỗi "số tiền bằng chữ không khớp"; bản JS và Python khớp nhau trên 21 ca golden.

### 2026-10-31 · PY-001/004/005/007/008 · claude-sonnet-5.5
- **Thêm:** máy chủ Python chạy được (`uvicorn app.main:app`): mở game tại `/`, cấp nội dung ở `/api/content` (có ETag), `/api/health`.
- **Thêm:** bảng xếp hạng và nộp điểm chế độ Thường (`/api/leaderboard`, `/api/scores`), xin đề ván Pro (`/api/runs`), giới hạn 30 lần/giờ/IP.
- **Thêm:** lõi ngẫu nhiên có seed và bộ đọc biểu thức bản Python, cho kết quả giống hệt bản JS trên bộ golden.
- **Chưa có:** chấm lại ván Pro phía server (`/submit` trả 501 cho tới khi xong PY-003).

### 2026-10-31 · DOC-001 · claude-opus-5.5
- **Sửa:** luật cho AI (AGENTS.md và các file trỏ cho Claude, Gemini, Copilot, Cursor) bắt buộc mỗi lần bàn giao phải ghi rõ đã làm gì theo mẫu (file nào, đổi gì, kiểm tra ra sao), và cập nhật README khi có tính năng mới hay thay đổi.
- **Thêm:** mục *Tính năng* và *Nhật ký thay đổi* trong README.

### 2026-10-31 · M0-PRO · claude-opus-5.5
- **Thêm:** hệ thống thiết kế (docs/08): bàn kế toán, giấy, mực bút bi, con dấu; Be Vietnam Pro + Source Serif 4.
- **Thêm:** bảng pháp luật bên cạnh mỗi nhiệm vụ (22 trích dẫn, có nhãn mức đối chiếu, không lộ đáp án).
- **Thêm:** Pro cấp 10–12: công ty cổ phần, tập đoàn, hợp nhất BCTC (docs/09); 5 mẫu chứng từ mới, 9 tài khoản mới.
- **Thêm:** Pro: kiểm toán độc lập, chỉ dùng Big Four (docs/10, `content/audit.json`).

### 2026-10-31 · OWN-001 · chủ dự án + claude-opus-5.5
- **Sửa:** đổi tên game thành **Nợ Có Ơi Pro**, xác định là bản dùng riêng.

### 2026-10-31 · M0 · claude-opus-5.5
- **Thêm:** tài liệu thiết kế (GDD, kiến trúc, quy ước, content spec, API, lộ trình, luật kế toán) và ghi chép reverse engineering cơ chế game gốc.
- **Thêm:** bộ điều phối nhiều AI (`AGENTS.md`, `ai/`).
- **Thêm:** nội dung khởi đầu: 34 tài khoản, 8 mẫu chứng từ, 9 loại lỗi, 2 chế độ, 7 mốc cấp; trình kiểm tra nội dung.
