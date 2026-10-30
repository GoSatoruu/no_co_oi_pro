# ROLES — Vai trò và cách nhiều AI phối hợp

> Vai trò gắn với **việc**, không gắn với hãng mô hình. Một mô hình có thể nhận nhiều vai ở các phiên khác nhau.

## 1. Các vai

| Vai | Phạm vi file | Việc tiêu biểu | Prompt mở đầu |
|---|---|---|---|
| **Lead / Kiến trúc** | `docs/`, `ai/DECISIONS.md`, chia việc trong `ai/TASKS.md` | Viết ADR, chia nhỏ việc, giải quyết xung đột | `ai/prompts/lead.md` |
| **Engine JS** | `frontend/js/core/`, `tests/js/` | CORE-xxx | `ai/prompts/engine.md` |
| **Python** | `backend/` | PY-xxx | `ai/prompts/backend.md` |
| **Frontend** | `frontend/` trừ `core/` | FE-xxx | `ai/prompts/frontend.md` |
| **Nội dung kế toán** | `content/`, `docs/07_ACCOUNTING_RULES.md` | Thêm nghiệp vụ, lỗi, luật | `ai/prompts/content.md` |
| **QA / Review** | `tests/`, nhận xét trong `ai/HANDOFF.md` | Golden, rà việc ở trạng thái `review` | `ai/prompts/qa_review.md` |

## 2. Luật phối hợp

1. **Một việc, một chủ.** Muốn giúp việc người khác đang làm thì ghi đề xuất vào HANDOFF, không sửa thẳng.
2. **Không tự duyệt việc của mình.** Việc ở `review` phải do một phiên khác duyệt: khác mô hình thì tốt nhất, hoặc ít nhất là phiên mới không có ngữ cảnh viết. Người duyệt đổi sang `done` hoặc trả về `doing` kèm nhận xét.
3. **Hợp đồng trước, cài đặt sau.** Đổi API, schema hay kiểu dữ liệu chung thì sửa tài liệu (docs/02, 04, 05) trước, ghi HANDOFF "⚠ đổi hợp đồng", rồi mới code.
4. **Song sinh:** việc CORE xong thì việc PY tương ứng mới được nhận (bảng TASKS có cột Phụ thuộc).
5. **Xung đột file:** người đến sau dừng, ghi HANDOFF, chờ Lead hoặc chủ dự án.
6. **Câu hỏi cho chủ dự án** gom vào HANDOFF mục "Câu hỏi". Không chặn việc: chọn giả định hợp lý, ghi rõ, làm tiếp.

## 3. Gợi ý ghép đôi (tuỳ chọn)

| Ghép | Vì sao |
|---|---|
| Engine JS (mô hình A) ↔ Python (mô hình B) | Hai mô hình đọc cùng spec viết độc lập, sai lệch lộ ra ở golden. Đó là cách bắt lỗi spec rẻ nhất. |
| Content (bất kỳ) → QA review (mô hình khác) | Luật kế toán dễ sai một cách tự tin; người rà nên đối chiếu nguồn. |
| Frontend → Review trên điện thoại thật | AI không thấy cảm giác chạm; chủ dự án hoặc người thật thử ở FE-010. |

## 4. Nhịp làm việc gợi ý

```
Phiên Lead (ngắn): chọn 3–4 việc không chồng file → giao cho 3–4 phiên AI song song
    ↓
Mỗi phiên: nhận → làm → kiểm → bàn giao (AGENTS.md §2)
    ↓
Phiên QA: duyệt các việc ở `review`, chạy toàn bộ lệnh kiểm tra
    ↓
Chủ dự án: đọc HANDOFF, trả lời câu hỏi, duyệt ADR `proposed`
```
