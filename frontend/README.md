# frontend/

Chưa có code (bắt đầu ở FE-001). Cấu trúc theo `docs/02_ARCHITECTURE.md` §2:

- `index.html`: trang duy nhất, `<script type="module" src="js/main.js">`
- `js/core/`: lõi thuần (CORE-xxx), **không DOM**
- `js/ui/`: thành phần vẽ dùng lại
- `js/screens/`: mỗi màn một file (`mount` / `unmount`)
- `js/services/`: chỗ duy nhất gọi `fetch` và `localStorage`
- `css/tokens.css`: biến thiết kế (nguồn duy nhất của màu, cỡ chữ)
- `assets/`: hình tự vẽ (ưu tiên SVG)
- `dev/`: trang xem thử thành phần với dữ liệu giả (không phát hành)

Nạp content: `services/content.js` thử `/api/content` trước, lỗi thì đọc `../content/*.json`.
Chạy offline: `python -m http.server 5500` **ở thư mục gốc dự án**, mở `/frontend/`, để `../content/` đọc được. Backend (PY-004) phục vụ `content/` ở cùng đường dẫn tương đối, nên một mã nạp chạy được cả hai cách.
