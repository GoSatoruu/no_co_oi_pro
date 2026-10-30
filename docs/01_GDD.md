# 01 — Game Design Document: Nợ Có Ơi Pro

> Phiên bản tài liệu: 0.1 (31/10/2026). Chủ dự án duyệt mọi thay đổi ở §2–§5.
> Số liệu cân chỉnh (điểm, thời gian, xác suất) **không** nằm ở đây mà ở `content/modes.json` và `content/levels.json`. Tài liệu này chỉ nói ý đồ.

## 1. Tầm nhìn

Một game ngắn, chơi được trên điện thoại. Người chơi vào vai kế toán mới vào nghề ở một công ty thương mại nhỏ. Mỗi ca chơi khoảng 3–5 phút. Mục tiêu: **luyện phản xạ định khoản đúng và soi chứng từ**, vui như game xếp hàng phục vụ khách, nhưng kiến thức là thật (chế độ kế toán và thuế Việt Nam hiện hành).

Ba trụ cột:
1. **Nhanh mà phải đúng:** áp lực hàng chờ, nhưng sai thì trả giá muộn (sai sót ẩn).
2. **Nghề thật:** tài khoản, chứng từ, thuế đúng luật; luật thay đổi thì sửa dữ liệu chứ không sửa code.
3. **Lớn dần:** từ sổ thu–chi đơn giản lên bút toán kép, lương, kho, thuế, khoá sổ năm.

## 2. Vòng chơi cốt lõi

```
┌─ TUẦN ─────────────────────────────────────────────────────────┐
│ Buổi sáng → Ca làm (bàn) → Kiểm quỹ → [Tuần cuối tháng: Khoá sổ] │
└────────────────────────────────────────────────────────────────┘
```

### 2.1 Buổi sáng (màn `morning`)
Xem việc tuần này, lịch hạn (nộp thuế…), một **thẻ tình huống** (nếu có), mua hoặc nâng cấp công cụ. Bấm *Vào ca*.

### 2.2 Ca làm (màn `desk`) — trái tim của game
- Hàng chờ gồm N người (theo cấp và chế độ), mỗi người cầm **một chứng từ** và có **thanh kiên nhẫn**.
- Chọn một người → chứng từ hiện lên bàn. Xử lý qua 3 bước:

| Bước | Người chơi làm | Kết quả |
|---|---|---|
| **1. Soi** | Chạm vào trường sai (người bán, MST, ngày, số tiền bằng chữ, thuế suất, chữ ký…) hoặc bấm *Hợp lệ*. Có loại lỗi chỉ cần **đóng dấu** (vd: chi phí không được trừ) mà vẫn ghi sổ. | Bắt đúng lỗi: thưởng điểm soi. Trả nhầm chứng từ đúng: phạt. Duyệt chứng từ lỗi: ghi nhận một **sai sót ẩn**. |
| **2. Định khoản** | Đặt tài khoản vào Nợ và Có, nhập hoặc chọn số tiền. Hai bên phải cân mới bấm được *Ghi*. | So với đáp án (`truth`). Đúng: điểm định khoản. Cân mà sai: **sai sót ẩn** (không báo ngay ở Pro; ở Normal báo nhẹ). |
| **3. Ghi sổ** | Bấm *Ghi*. Bút toán vào **nhật ký tạm của ca**. | Hết ca mới chuyển vào sổ chính (an toàn khi tắt app giữa ca). |

- **Bảng pháp luật** luôn sẵn ở cạnh bàn (docs/08 §6): hiện căn cứ pháp luật của bước đang làm (văn bản, điều khoản, tóm tắt, mức đối chiếu). Không bao giờ lộ đáp án. Normal có thêm mục Mẹo.
- Ca kết thúc khi hết hàng chờ hoặc hết giờ. Người bỏ về vì hết kiên nhẫn thì trừ uy tín.
- **Thẻ khẩn** có thể bật giữa ca (sếp hỏi số dư quỹ, cuộc gọi lừa đảo, phần mềm lỗi…), mở từ cấp nhất định.

### 2.3 Kiểm quỹ (màn `cash`)
Đếm tiền trong két theo mệnh giá rồi so với số dư 111 **theo sổ của người chơi**. Két chứa số dư **thật** (theo đáp án), nên định khoản sai tiền mặt sẽ lộ ở đây. Khi lệch, có 3 lựa chọn: *Lập biên bản và rà sổ* (đúng), *Bỏ tiền túi bù* (ví giảm, hậu quả sau), *Ghi khống một khoản chi* (gian lận, hậu quả nặng).

### 2.4 Khoá sổ tháng (màn `close`)
MVP: (1) đối chiếu sao kê ngân hàng với sổ 112 (chạm dòng lệch), (2) kết chuyển doanh thu và chi phí sang 911, (3) bảng cân đối số phát sinh: người chơi thấy sổ mình và các sai sót ẩn bị lộ, có giải thích. Bản sau thêm lương, khấu hao, tờ khai GTGT.

## 3. Tiến trình

| Hệ | Mô tả |
|---|---|
| **XP và cấp** | XP từ định khoản đúng, soi đúng, tháng sổ sạch. Cấp mở loại chứng từ, tài khoản, màn mới (`content/levels.json`). |
| **Uy tín** (0–100) | Trừ khi người chờ bỏ về, sai sót bị lộ hoặc trễ hạn thuế; cộng khi sổ sạch. Về 0 thì bị **cho thôi việc**: mất vài tuần lương, giữ cấp, đổi công ty. |
| **Ví** | Lương mỗi tháng và thưởng; dùng mua công cụ (máy tính bỏ túi → gợi ý số tiền, chữ ký số, màn hình thứ hai → kiên nhẫn tụt chậm). **Tách hẳn khỏi sổ công ty.** |
| **Hồ sơ sai phạm** | Gian lận bị lộ cộng dồn; đủ ngưỡng thì *bị khởi tố* (kết thúc lượt chơi, có thể chơi lại). |

## 4. Chế độ chơi

Chế độ là **một bộ tham số** trong `content/modes.json`, không phải nhánh code riêng. Code chỉ đọc cờ (`mode.hints`, `mode.accountInput`…). Thêm chế độ mới = thêm một mục JSON.

### 4.1 Normal (Thường)
- Có **người hướng dẫn** (nhân vật tự tạo) nhắc cách định khoản ở 2 cấp đầu của mỗi loại chứng từ.
- Chỉ hiện **thẻ tài khoản của cấp hiện tại** (khoảng 6–12 thẻ).
- Số tiền chọn từ **nút gợi ý** (tổng tiền, tiền hàng, thuế, và vài số nhiễu).
- Định khoản sai mà cân: báo nhẹ "có thể chưa đúng" ngay sau khi ghi.
- Kiên nhẫn tụt chậm; không có thẻ khẩn ở 3 cấp đầu.

### 4.2 Pro
Dành cho sinh viên kế toán và người đã đi làm. Khác Normal:

| Khía cạnh | Pro |
|---|---|
| Gợi ý | **Tắt hết** (không người hướng dẫn, không báo sai ngay). |
| Chọn tài khoản | **Gõ số hiệu tài khoản** (có tự hoàn thành theo số), toàn bộ hệ thống tài khoản cấp 1–2. |
| Số tiền | **Gõ tay**; máy tính bỏ túi chỉ có khi đã mua. |
| Bút toán | Cho phép **nhiều dòng** (một Nợ nhiều Có…); đáp án so theo tập dòng, không theo thứ tự. |
| Lỗi chứng từ | Thêm loại khó: MST sai checksum, doanh nghiệp bỏ địa chỉ kinh doanh, ngày hoá đơn ngoài kỳ, thuế suất sai theo mặt hàng, hoá đơn trùng số đã ghi. |
| Sai sót ẩn | Chỉ lộ khi kiểm quỹ hoặc khoá sổ; phạt nặng hơn. |
| Thời gian | Hàng chờ dài hơn, kiên nhẫn tụt nhanh hơn. |
| Điểm | Hệ số nhân (vd ×1.5) và **bảng xếp hạng riêng**. Ván Pro xếp hạng được **máy chủ chấm lại** (API §Run). |
| Bảng pháp luật | **Mở sẵn** trên màn hình rộng; chỉ có căn cứ, không có Mẹo. |
| Công ty cổ phần và tập đoàn | Cấp 10–12: phát hành cổ phần, cổ tức, cổ phiếu quỹ, nghị quyết ĐHĐCĐ/HĐQT, công ty con, bên liên quan, **hợp nhất BCTC** (docs/09). |
| Kiểm toán | Cấp 12: kiểm toán độc lập năm do **một trong Big Four** thực hiện; sai sót ẩn cả năm bị soi lại; ý kiến kiểm toán ảnh hưởng uy tín và giá cổ phiếu (docs/10). |
| Bắt đầu | Có thể bắt đầu thẳng từ cấp cao (chọn "hồ sơ nghề": mới tốt nghiệp / 2 năm kinh nghiệm / kế toán trưởng). |

### 4.3 Chế độ dự kiến về sau (chỉ cần thêm JSON và màn)
- **Thi đấu ngày:** đề theo seed ngày, 3 lượt, bảng xếp hạng ngày và tuần.
- **Luyện tập:** chọn một loại nghiệp vụ, không giờ, không phạt.
- **Hành trình:** chuỗi màn đề cố định có sao.
- **Hộ kinh doanh:** sổ thu–chi một cột (mở rộng nội dung có sẵn của chủ dự án về HKD).

## 5. Chấm điểm (ý đồ; số cụ thể trong `modes.json`)

```
điểm_chứng_từ = soi_đúng × P_soi + định_khoản_đúng × P_bút_toán + thưởng_tốc_độ
điểm_ca       = Σ điểm_chứng_từ − phạt_bỏ_về − phạt_trả_nhầm
điểm_Pro      = điểm_ca × hệ_số_Pro
```
- "Đúng" = tập dòng (bên, tài khoản, số tiền) **trùng khớp** đáp án; thứ tự không quan trọng; gộp dòng cùng tài khoản cùng bên trước khi so.
- Sai sót ẩn trừ điểm ở thời điểm bị lộ, không trừ lúc ghi.

## 6. Chứng từ và nghiệp vụ (MVP)

| Mã mẫu | Nghiệp vụ | Bút toán đáp án |
|---|---|---|
| `sale_cash` | Bán hàng thu tiền mặt | Nợ 111 / Có 511, Có 3331 |
| `sale_credit` | Bán hàng chưa thu tiền | Nợ 131 / Có 511, Có 3331 |
| `purchase_credit` | Mua hàng nhập kho, chưa trả | Nợ 156, Nợ 1331 / Có 331 |
| `expense_cash` | Chi phí văn phòng trả tiền mặt | Nợ 642, Nợ 1331 / Có 111 |
| `pay_supplier_bank` | Trả nợ nhà cung cấp bằng chuyển khoản | Nợ 331 / Có 112 |
| `collect_customer_bank` | Khách trả nợ qua ngân hàng (giấy báo Có) | Nợ 112 / Có 131 |
| `deposit_cash_bank` | Nộp tiền mặt vào ngân hàng | Nợ 112 / Có 111 |
| `cogs` | Giá vốn hàng bán (phiếu xuất kho) | Nợ 632 / Có 156 |

Chi tiết dữ liệu: `docs/04_CONTENT_SPEC.md`, `content/doc_templates/`.

## 7. Nguyên tắc đạo đức trong thiết kế
1. **Không bao giờ thưởng gian lận.** Lợi trước mắt (giữ uy tín với sếp, tránh mất lương) luôn nhỏ hơn hậu quả hẹn sau đó (truy thu, phạt, khởi tố).
2. Làm đúng có thể thiệt chút trước mắt nhưng phải **được ghi nhận** (danh hiệu, XP, uy tín về lâu dài).
3. Thẻ lừa đảo dạy cách nhận biết thật (gọi lại số chính thức, không chuyển tiền theo tin nhắn…).

## 8. Giao diện và cảm giác

> Chi tiết đầy đủ: **`docs/08_DESIGN_SYSTEM.md`**. Phần dưới chỉ là tóm tắt ý đồ.

- Ưu tiên **dọc, một tay** trên điện thoại. Mọi thao tác chính làm được bằng chạm; kéo thả là tuỳ chọn (Pro dùng bàn phím).
- Chứng từ vẽ bằng HTML/CSS như **tờ giấy thật**: hoá đơn GTGT, phiếu thu/chi, uỷ nhiệm chi, giấy báo Có, phiếu xuất kho.
- Nhân vật, mascot, bảng màu: **tự thiết kế**, không lấy cảm hứng hình ảnh từ bản gốc.
- Có chế độ giảm hiệu ứng (người nhạy chuyển động) và chế độ tối.

## 9. Phạm vi MVP (v0.1)
- Màn: `title`, `morning` (bản rút gọn), `desk`, `cash`, `close` (rút gọn), `result`.
- Chế độ: Normal và Pro.
- 8 mẫu chứng từ ở §6, 6 loại lỗi cơ bản, cấp 1–5.
- Bảng pháp luật bên cạnh nhiệm vụ (cả hai chế độ).
- Lưu localStorage có phiên bản. Backend: health, content, nộp điểm, bảng xếp hạng.
- **Ngoài phạm vi MVP:** công ty cổ phần và tập đoàn (M5), kiểm toán (M6), lương, kho nhiều nơi, khấu hao, tờ khai thuế, Hành trình, Thi đấu ngày, khoá học, tài khoản người dùng.
