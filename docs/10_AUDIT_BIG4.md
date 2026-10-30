# 10 — Pro: kiểm toán độc lập (Big Four)

> **Chỉ Pro**, mở ở cấp 12 (`features: audit`). Dữ liệu: `content/audit.json`, `content/legal_refs.json` (các bước `audit_*`).
> Người chơi đứng ở **phía đơn vị được kiểm toán** (Giám đốc tài chính hoặc kế toán trưởng), không đóng vai kiểm toán viên.

## 1. Chính sách dùng tên Big Four (ADR-012)
- Hãng kiểm toán **chỉ** gồm Deloitte, PwC, EY, KPMG; validator chặn mọi hãng khác.
- Bản game dùng riêng (ADR-010), nên được hiện **tên chữ** của hãng. **Không** logo, màu thương hiệu hay khẩu hiệu.
- **Bốn hãng có cơ chế giống hệt nhau.** Không có hãng "dễ" hay "khó", không gán tính cách hay điểm yếu. Khác biệt duy nhất là đội kiểm toán NPC hư cấu được bốc ngẫu nhiên.
- Hãng và kiểm toán viên **luôn chuyên nghiệp**. Hành vi sai trái (đề nghị phong bì, ép ký, che giấu) chỉ xuất phát từ nhân vật hư cấu phía khách hàng, và lựa chọn đúng luôn là từ chối.
- Muốn phát hành công khai thì phải thay bằng hãng hư cấu trước (cùng điều kiện với đổi tên game).

## 2. Vòng kiểm toán năm

Kiểm toán chạy song song với tháng 1–3 của năm sau: người chơi vẫn làm ca hằng tuần, và yêu cầu kiểm toán chen vào hộp thư buổi sáng. Các bước có thứ tự thật:

| Bước (`stage`) | Người chơi làm | Bảng pháp luật |
|---|---|---|
| 1. `audit_planning` | Chọn hãng trong Big Four. Nếu cùng một kiểm toán viên ký đã đủ 3 năm thì phải đổi người ký hoặc đổi hãng. Duyệt phí và ký hợp đồng. Nhận **danh mục tài liệu cần chuẩn bị**. | `luat_ktdl`, `tt183_ltcc`, `ktdl_luanchuyen` |
| 2. `audit_fieldwork` | Đáp ứng từng yêu cầu (`requests`) trước hạn: xuất sổ chi tiết, gửi thư xác nhận, giải thích nghiệp vụ được chọn mẫu, kiểm kê quỹ và kho có kiểm toán viên chứng kiến. | `vsa_505_530`, `luat_ktdl` |
| 3. `audit_adjustments` | Nhận **danh sách sai sót**. Với mỗi dòng: *Đồng ý điều chỉnh* (ghi bút toán điều chỉnh) hoặc *Giải trình* (đưa chứng cứ; chỉ đúng khi game sinh "sai sót" do kiểm toán viên hiểu nhầm). | `vsa_320_450`, `tt99_htk` |
| 4. `audit_representation` | Rà thư giải trình và danh sách bên liên quan, rồi trình Ban Giám đốc ký. | `vsa_580`, `vas26_lienquan` |
| 5. `audit_opinion` | Nhận báo cáo kiểm toán; hệ quả lên uy tín và giá cổ phiếu trong game. | `vsa_700_705` |

## 3. Sai sót kiểm toán đến từ đâu
Đây là chỗ cả năm chơi được "chấm": **mọi sai sót ẩn còn sót lại** trong sổ người chơi (bút toán cân mà sai, chứng từ lỗi đã lỡ ghi, giao dịch nội bộ quên gắn cờ) đều có xác suất bị kiểm toán phát hiện.
- Xác suất phát hiện tăng theo quy mô sai sót so với **trọng yếu thực hiện** (`materiality.performancePercent`).
- Sai sót dưới ngưỡng "rõ ràng nhỏ" (`clearlyTrivialPercent`) được ghi nhận nhưng không đề nghị điều chỉnh.
- Ngoài sai sót số liệu còn có **thiếu sót thủ tục** (`findings.procedural`): nộp tài liệu trễ, số dư không xác nhận được, bên liên quan chưa thuyết minh.

## 4. Trọng yếu (đơn giản hoá VSA 320)
```
trọng yếu tổng thể  = min(5% × lợi nhuận trước thuế, 1% × doanh thu thuần)
trọng yếu thực hiện = 75% × trọng yếu tổng thể
ngưỡng bỏ qua       = 5%  × trọng yếu tổng thể
```
Màn bước 3 hiện ba con số này để người chơi tự cân nhắc: đồng ý điều chỉnh mọi khoản (an toàn, nhưng lợi nhuận có thể giảm) hay chỉ những khoản vượt ngưỡng.

## 5. Ý kiến kiểm toán (`opinions`)
Quy tắc trong game:
```
tổng sai sót chưa điều chỉnh   = Σ |chênh lệch| các sai sót người chơi không đồng ý điều chỉnh (và giải trình không được chấp nhận)
bị giới hạn phạm vi            = có yêu cầu quá hạn chưa đáp ứng, hoặc từ chối ký thư giải trình
lan toả                        = sai sót chưa điều chỉnh > 3 × trọng yếu tổng thể, hoặc ảnh hưởng ≥ 3 nhóm khoản mục
```
| Điều kiện | Ý kiến |
|---|---|
| ≤ trọng yếu, không giới hạn phạm vi | Chấp nhận toàn phần (có thể kèm đoạn nhấn mạnh) |
| > trọng yếu, không lan toả; hoặc giới hạn một phần | Ngoại trừ |
| > trọng yếu và lan toả | Trái ngược |
| Giới hạn phạm vi trọng yếu và lan toả | Từ chối đưa ra ý kiến |

Hệ quả (`reputation`, `share`) lấy từ `audit.json`. Ý kiến không chấp nhận toàn phần còn mở thêm thẻ hậu quả ở các tuần sau (cổ đông chất vấn, ngân hàng xem lại hạn mức vay…).

## 6. Thẻ tình huống trong mùa kiểm toán
- Tổng giám đốc muốn giấu một hợp đồng với bên liên quan khỏi danh sách gửi kiểm toán → đúng: đưa đủ. Giấu thì khả năng cao bị phát hiện qua thư xác nhận và nhận ý kiến ngoại trừ, kèm hồ sơ vi phạm.
- Chủ tịch gợi ý "tặng quà cảm ơn" đội kiểm toán để "dễ thở" → đúng: từ chối. Kiểm toán viên NPC **luôn từ chối** quà, và người chơi bị ghi hồ sơ vi phạm nếu đã đồng ý đưa.
- Kiểm toán viên hiểu nhầm một nghiệp vụ (game sinh có chủ ý) → đúng: giải trình kèm chứng từ, không đồng ý điều chỉnh bừa.

## 7. Thành phần giao diện mới
- `screens/audit.js`: dòng thời gian 5 bước ở đầu màn (đây là trình tự thật nên được đánh số), danh sách yêu cầu kèm hạn, danh sách sai sót kèm nút *Đồng ý điều chỉnh* hoặc *Giải trình*.
- `ui/paper/audit-letter.js`: thư xác nhận, thư quản lý, báo cáo kiểm toán, theo phong cách giấy (docs/08). **Không** logo; tiêu đề thư là tên hãng bằng chữ thường.
- Bảng pháp luật dùng chung (docs/08 §6) với `step` = id của bước.

## 8. Việc cần làm (đã thêm vào `ai/TASKS.md` M6)
CORE-011 (trọng yếu, phát hiện sai sót, ý kiến), FE-018 (màn kiểm toán), FE-019 (giấy thư kiểm toán), PY-010 (song sinh), CNT-002 (thẻ tình huống mùa kiểm toán), QA-003 (golden cho bảng quy tắc ý kiến).
