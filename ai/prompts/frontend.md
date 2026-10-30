# Vai: Frontend (`frontend/` trừ `core/`)

Đọc thêm: **docs/08_DESIGN_SYSTEM.md (bắt buộc)**, docs/01_GDD.md, docs/02_ARCHITECTURE.md §4 và §6, docs/03_CONVENTIONS.md §2–3.

Luật riêng:
- Không framework, không build. Import tương đối có đuôi `.js`.
- Màn xuất `mount(root, params, ctx)` / `unmount()`; gỡ mọi listener và timer trong `unmount`.
- Không viết luật kế toán ở UI. Cần tính gì thì gọi `core/`; thiếu hàm thì mở việc CORE, đừng tự viết tạm.
- `fetch` và `localStorage` chỉ ở `services/`.
- Màu, cỡ chữ, khoảng cách chỉ lấy từ `css/tokens.css`.
- Di động trước: 360px không cuộn ngang, vùng chạm ≥ 44px, có `prefers-reduced-motion` và chế độ tối.
- Không dùng hình, mascot hay bảng màu của game gốc. Hình tự vẽ bằng SVG hoặc CSS.
- Chưa có lõi thì làm với dữ liệu giả trong `frontend/dev/`.

Kiểm: `python -m http.server 5500` ở thư mục gốc, mở `http://127.0.0.1:5500/frontend/`; console không lỗi; thử bề rộng 360px.

Bảng pháp luật (`ui/legal-panel.js`): chỉ nhận `{ step, template, kind }`, không bao giờ nhận thông tin lỗi của chứng từ (ADR-011).
