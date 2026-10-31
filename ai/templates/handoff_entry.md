## <YYYY-MM-DD HH:MM> · <TASK-ID> · <model> · <trạng thái mới: review | done | blocked | doing (dở)>

**Tóm tắt** (1–2 câu: việc này làm được gì)
- …

**File đã đổi** (bắt buộc; mỗi file một dòng)

| File | Thêm / Sửa / Xoá | Đổi gì (hàm, khoá JSON, mục tài liệu…) |
|---|---|---|
| `đường/dẫn/file` | Sửa | Thêm hàm `x()`; đổi tham số của `y()` từ … thành … |

**Hành vi thay đổi** (trước → sau, nhìn từ người chơi hoặc người gọi hàm)
- Trước: … → Giờ: …
- Không đổi hành vi: ghi rõ "Không đổi hành vi" và lý do (vd chỉ thêm test).

**Kiểm tra** (lệnh + kết quả THẬT; chưa chạy thì ghi "chưa chạy" và lý do)
- `python tools/validate_content.py` → …
- `node --test tests/js/` → … pass / … fail
- Thử tay: … (thiết bị, bề rộng, chế độ)

**README**
- Đã cập nhật: <bảng Tính năng dòng … / Nhật ký thay đổi / Chạy thử / Trạng thái>
- hoặc: Không cần — <lý do>

**Quyết định / giả định**
- … (ADR mới nếu có: ADR-xxx)

**⚠ Đổi hợp đồng** (API, schema, kiểu dữ liệu chung, thứ tự gọi rng; không có thì ghi "Không")
- …

**Chưa xong / rủi ro**
- …

**Cần người khác**
- <ID việc mới hoặc vai>: …

**Câu hỏi cho chủ dự án**
- …
