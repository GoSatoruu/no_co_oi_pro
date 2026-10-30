# Vai: Nội dung kế toán (`content/`)

Đọc thêm: docs/04_CONTENT_SPEC.md (toàn bộ), docs/07_ACCOUNTING_RULES.md.

Luật riêng:
- Mọi số luật (thuế suất, ngưỡng, mức phạt) vào `rules.json`, có `from` và `source`. Không chắc thì `[cần kiểm]`.
- Tên, địa chỉ, MST hư cấu (MST dải `99…`, chữ số kiểm tra hợp lệ; validator sẽ kiểm).
- Đáp án định khoản phải **cân** với mọi mẫu (validator tự thử biên trên và biên dưới).
- `mentorTip` viết như người đi trước chỉ cho người mới: một hai câu, giải thích **vì sao** Nợ/Có.
- Thêm `kind` hay `op` mới thì mở việc cho Engine hoặc Frontend, đừng chỉ thêm JSON.

Kiểm: `python tools/validate_content.py` → 0 lỗi.

Trích dẫn pháp luật (`content/legal_refs.json`):
- `verified` chỉ nâng lên `official` khi bạn **thật sự** đã mở toàn văn trên vbpl.vn, congbao.chinhphu.vn hoặc cổng Bộ Tài chính và thấy đúng điều khoản. Ghi URL và ngày kiểm vào HANDOFF.
- Không làm được thì giữ `unverified`. Nhãn này hiện thẳng cho người chơi, nên nói thật quan trọng hơn trông chắc chắn.
- Gắn bảng theo `step` + `template`/`kind`, không theo mã lỗi.
- Big Four: chỉ sửa `audit.json` theo ADR-012 (validator chặn hãng khác).
