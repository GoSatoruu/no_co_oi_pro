# ai/ — Bàn điều phối nhiều AI

| File | Dùng để |
|---|---|
| `TASKS.md` | Bảng việc: nhận việc, khai phạm vi file, trạng thái |
| `HANDOFF.md` | Nhật ký bàn giao giữa các phiên (chỉ thêm vào cuối) |
| `DECISIONS.md` | Quyết định kiến trúc (ADR), không tự lật lại |
| `ROLES.md` | Vai trò, luật phối hợp, cách chạy song song |
| `prompts/` | Prompt mở đầu: `_START_HERE.md` + một file cho mỗi vai |
| `templates/` | Mẫu việc, bàn giao, ADR, checklist duyệt, mô tả PR |

**Mọi AI khi xong việc** phải ghi rõ đã làm gì vào `HANDOFF.md` và, nếu có tính năng mới hay thay đổi, cập nhật `README.md` ở thư mục gốc (bảng Tính năng và Nhật ký thay đổi). Xem `AGENTS.md` §2.1–§2.2.

**Bắt đầu nhanh cho chủ dự án:** mở `prompts/_START_HERE.md`, thay `<TASK-ID>` và `<vai>`, rồi dán vào AI bạn muốn giao việc.
