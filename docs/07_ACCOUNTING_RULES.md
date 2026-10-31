# 07 — Luật kế toán và thuế dùng trong game

> Game **đơn giản hoá**, không phải tư vấn kế toán hay thuế.
> Nguyên tắc: số và ngưỡng nằm trong `content/rules.json` có `source`; chỗ chưa chắc ghi `[cần kiểm]`.
> AI **không được bịa** số điều luật. Không chắc thì để `[cần kiểm]` và ghi câu hỏi vào HANDOFF.

## 1. Chế độ kế toán
- Hệ thống tài khoản theo **Thông tư 99/2025/TT-BTC** (thay Thông tư 200/2014/TT-BTC), áp dụng cho năm tài chính bắt đầu từ 01/01/2026 `[cần kiểm ngày hiệu lực]`.
- Game chỉ dùng tài khoản **có ở cả hai thông tư** cho phần lõi, để tránh nhầm khi người chơi học theo giáo trình cũ. Các tài khoản bị bãi bỏ theo TT 99 (vd 1562, 611, 161, 441) **không dùng**.
- Doanh nghiệp nhỏ và vừa có thể theo chế độ riêng; game không mô phỏng phần khác biệt này ở MVP.

## 2. Định khoản: quy ước trong code
- Nợ dương, Có âm khi tính số dư. Số tiền trên dòng bút toán luôn dương, bên thể hiện bằng `side`.
- Một bút toán hợp lệ: ≥ 1 dòng Nợ, ≥ 1 dòng Có, tổng Nợ = tổng Có, không có dòng số tiền ≤ 0.
- So đáp án: gộp các dòng cùng (bên, tài khoản), bỏ dòng 0, so **tập**, không so thứ tự.
- Tài khoản cấp 2 so với cấp 1: xem `04_CONTENT_SPEC.md` §2.

## 3. Tiền và làm tròn
- VND số nguyên. Thuế GTGT = `round(tiền hàng × thuế suất / 100)`, **làm tròn .5 lên** (half-up), áp **trên tổng tiền hàng của hoá đơn**, không làm tròn từng dòng.
- Không dùng `toFixed` hay số thực ở chỗ lưu trữ. Chỉ trung gian trong biểu thức rồi `round()` ngay.

## 4. Thuế GTGT (MVP)
| Mục | Giá trị trong game | Nguồn |
|---|---|---|
| Thuế suất hàng hoá thông thường 2026 | 8% (giảm 2%) | NQ 204/2025/QH15 `[cần kiểm phạm vi hàng hoá và thời hạn]` |
| Từ 2027 | 10% | Luật Thuế GTGT 48/2024/QH15 |
| Dịch vụ viễn thông, quảng cáo… (không thuộc diện giảm) | 10% | Như trên `[cần kiểm danh mục loại trừ]` |
| Ngưỡng thanh toán không dùng tiền mặt để được khấu trừ | từ 5.000.000 đ (gồm thuế) | Luật 48/2024/QH15, NĐ 181/2025/NĐ-CP `[cần kiểm]` |

Lỗi `cash_over_threshold`: hoá đơn từ ngưỡng trở lên mà trả tiền mặt → thuế đầu vào **không được khấu trừ**, ghi gộp vào chi phí (biến thể `vat_not_deductible`). Việc chi phí có được trừ khi tính thuế TNDN hay không là bước sau (gói Thuế), chưa chấm ở MVP `[cần kiểm]`.

## 5. Chứng từ hợp lệ (để thiết kế lỗi)
Trường người chơi có thể chạm để bắt lỗi:
- Người bán và người mua: tên, MST, địa chỉ
- Số và ký hiệu hoá đơn, ngày lập
- Tên hàng, đơn vị, số lượng, đơn giá, thành tiền
- Thuế suất, tiền thuế, tổng thanh toán, **số tiền bằng chữ**
- Hình thức thanh toán
- Chữ ký (phiếu thu/chi: người lập, kế toán trưởng, thủ quỹ, người nhận/nộp tiền; hoá đơn điện tử: chữ ký số người bán)

## 6. Đọc số thành chữ
`core/money-words.js` và `engine/money_words.py` phải ra **cùng chuỗi**. Ví dụ chuẩn (ca golden):
- 1.100.000 → "Một triệu một trăm nghìn đồng"
- 15.008.000 → "Mười lăm triệu không trăm linh tám nghìn đồng"
- 21.000.000 → "Hai mươi mốt triệu đồng"
- 105.000 → "Một trăm linh năm nghìn đồng"
- Số có cả một nhóm 000 ở giữa (vd 1.000.250.000): **chưa chốt** bỏ nhóm hay đọc "không trăm". Đề xuất (CORE-003) đang dùng trong `tests/golden/money_words.json`: **bỏ nhóm** → "Một tỷ hai trăm năm mươi nghìn đồng"; nhóm sau một nhóm khác 0 vẫn đọc đủ "không trăm"/"linh" (1.000.000.001 → "Một tỷ không trăm linh một đồng"). Trên nghìn tỷ đọc lồng: "Một nghìn tỷ đồng". Chờ chủ dự án duyệt (OWN-003).

> Chú thích: cách đọc "linh"/"lẻ", "mốt", "lăm", "tư" có biến thể vùng miền. Game dùng **"linh", "mốt", "lăm", "tư" (sau hai mươi trở đi)** và ghi rõ trong golden.

## 7. Công ty cổ phần và tập đoàn (Pro, docs/09)
| Nghiệp vụ | Bút toán trong game | Căn cứ (xem `legal_refs.json`) |
|---|---|---|
| Phát hành cổ phần, thu tiền | Nợ 112 / Có 4111 (mệnh giá × số CP) / Có 4112 (phần cao hơn mệnh giá) | `luatck_menhgia`, `tt99_htk` |
| Nghị quyết chia cổ tức tiền | Nợ 421 / Có 3388 | `luatdn_2025`, `luatdn_cotuc` |
| Trả cổ tức cho cá nhân | Nợ 3388 / Có 112 (thực trả) / Có 3335 (thuế TNCN khấu trừ, `rules.pit.dividendRate`) | `tncn_cotuc` |
| Mua cổ phiếu quỹ | Nợ 419 / Có 112 (giá mua thực tế) | `luatdn_mualai` |
| Huỷ cổ phiếu quỹ (mở rộng) | Nợ 4111 (mệnh giá), Nợ/Có 4112 (chênh lệch) / Có 419 | `tt99_htk` `[cần kiểm]` |
| Góp vốn công ty con | Nợ 221 / Có 112 | `luatdn_congtyme`, `vas25_hopnhat` |

- Mệnh giá 10.000 đ đọc từ `rules.jsc.parValue`.
- Thuế suất TNCN trên cổ tức để `[cần kiểm]` vì Luật Thuế TNCN mới áp dụng từ kỳ tính thuế 2026.
- Tên tài khoản 4111 và 4112 theo TT 99 `[cần kiểm toàn văn]`.
- Thông tư hướng dẫn lập BCTC hợp nhất (TT 202/2014) cần kiểm còn hiệu lực hay đã được thay sau TT 99.

## 8. Kiểm toán (Pro, docs/10)
Quy tắc trọng yếu và ý kiến trong game là **đơn giản hoá** VSA 320/450/700/705, ghi rõ ở docs/10 §4–§5. Không trình bày như hướng dẫn nghề nghiệp thật.

## 9. Mở rộng sau (chưa dùng ở MVP)
Lương (BHXH, BHYT, BHTN, KPCĐ, TNCN biểu luỹ tiến mới), khấu hao, tờ khai GTGT quý, thuế TNDN, hộ kinh doanh. Mỗi gói khi làm phải bổ sung mục vào file này kèm nguồn.
