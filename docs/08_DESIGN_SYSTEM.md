# 08 — Hệ thống thiết kế

> Nguồn sự thật cho mọi việc FE. Giá trị cụ thể nằm ở `frontend/css/tokens.css` (FE-001 tạo theo bảng §2–§3).
> Muốn đổi màu, phông hay nguyên tắc ở đây thì viết ADR. Không tự đổi trong lúc làm việc FE khác.

## 1. Ý tưởng

**Chủ đề:** bàn làm việc của một kế toán Việt Nam. **Người chơi:** sinh viên kế toán, kế toán trẻ, và chủ dự án. **Nhiệm vụ chính của giao diện:** đọc chứng từ và ghi một bút toán **nhanh mà không nhìn nhầm**, trong lúc hàng chờ đang sốt ruột.

Mọi lựa chọn hình ảnh lấy từ đồ vật thật trên bàn kế toán:
- **Tấm lót bàn xanh** làm nền vùng chơi.
- **Tờ giấy in mẫu** (hoá đơn, phiếu thu chi, uỷ nhiệm chi) có đường kẻ và hoa văn nhạt.
- **Mực bút bi xanh** cho những gì người chơi tự ghi.
- **Mực dấu đỏ** cho con dấu.
- **Tập văn bản luật** kẹp bên cạnh.

**Điểm nhớ duy nhất: con dấu.** Hợp lệ, Trả lại, Không được khấu trừ đều là một cú đóng dấu thật: hơi nghiêng, mực loang nhẹ, có tiếng "cộp". Đây là chỗ duy nhất được phép phô trương. Mọi thứ còn lại yên, gọn, kỷ luật.

## 2. Màu

| Tên token | Hex | Dùng cho |
|---|---|---|
| `--desk` (tấm lót bàn) | `#24453A` | Nền vùng chơi |
| `--paper` (giấy in) | `#F7F9F8` | Nền chứng từ, bảng định khoản |
| `--ink` (mực in) | `#1D2B27` | Chữ in sẵn trên giấy, chữ giao diện chính |
| `--ballpoint` (bút bi) | `#1F45B5` | **Mọi thứ người chơi tự nhập**: tài khoản đã chọn, số tiền, chữ ký, ô đang chọn |
| `--seal` (mực dấu) | `#C2272D` | Con dấu, sai sót bị lộ, cảnh báo nghiêm trọng |
| `--ruling` (đường kẻ mẫu) | `#9CC7BE` | Đường kẻ, hoa văn hoá đơn, viền ô trên giấy |
| `--gazette` (giấy văn bản luật) | `#EEF1F6` | Nền bảng pháp luật (§6), khác hẳn giấy chứng từ |
| `--lamp` (đèn bàn, chỉ Pro) | `#E8B04B` | Quầng sáng đèn trên mặt bàn ở Pro; **không** dùng cho chữ hay nút |

Màu phụ (độ đậm nhạt của các màu trên, kiểm tương phản bằng công cụ) do FE-001 định nghĩa: `--ink-2` (chữ phụ), `--ruling-2` (nền ô chọn), `--seal-wash` (nền nhạt khi lộ sai sót).

**Luật màu:**
1. **Nợ và Có không có màu riêng.** Không xanh/đỏ, vì màu ngầm báo đúng/sai và dạy sai khái niệm (Nợ không phải "xấu"). Phân biệt bằng **vị trí**: Nợ trái, Có phải như tài khoản chữ T, kèm nhãn chữ.
2. Đúng và sai không chỉ báo bằng màu: luôn có chữ trên con dấu, có biểu tượng, và có số liệu.
3. Xanh bút bi chỉ dành cho **thứ người chơi tạo ra**. Nhìn màu là biết đâu là của mình, đâu là in sẵn.
4. Tương phản: chữ trên `--paper` và `--gazette` ≥ 4.5:1; chữ trên `--desk` dùng `--paper`.

**Chế độ tối:** `--desk` → `#16251F`; giấy giảm độ sáng còn `#E4E8E6` để không chói; bút bi sáng lên `#3D63D6`; mực dấu giữ nguyên tông. Giấy **vẫn là giấy sáng**: chứng từ đảo màu khó đọc và không còn giống chứng từ.

**Giao diện Pro: "ca tối".** Mặt bàn dùng màu tối kể cả ở chế độ sáng. Một quầng `--lamp` toả từ góc trên bên trái vùng giấy (radial-gradient, độ đục ≤ 18%). Bảng pháp luật mở sẵn trên màn hình rộng. Không thêm hiệu ứng nào khác.

## 3. Chữ

| Vai | Phông | Lý do |
|---|---|---|
| Giao diện, số liệu, bảng định khoản | **Be Vietnam Pro** (OFL) | Thiết kế cho tiếng Việt, dấu chồng gọn, có số đều nhau (`font-variant-numeric: tabular-nums`) |
| Nội dung in trên chứng từ, văn bản trong bảng pháp luật | **Source Serif 4** (OFL) | Chứng từ và văn bản pháp luật Việt Nam in chân phương có chân; phông chân tạo khác biệt rõ với lớp giao diện |

- **Tự đóng gói phông** trong `frontend/assets/fonts/` (woff2, kèm file giấy phép OFL), không gọi Google Fonts lúc chạy, để chơi offline được (ADR-013).
- Thang chữ tỉ lệ 1.2, gốc 16px: 13.3 · 16 · 19.2 · 23 · 27.6 · 33.2. Chữ trên chứng từ ở điện thoại không nhỏ hơn 14px.
- Số tiền luôn `tabular-nums`, căn phải, dấu chấm ngăn hàng nghìn (`1.100.000`).
- Số hiệu tài khoản là chữ to nhất trên thẻ tài khoản (người làm nghề nhớ theo số, không theo tên).
- Dòng chữ dài nhất ≤ 70 ký tự; tóm tắt luật trong bảng pháp luật ≤ 60 ký tự mỗi dòng, giãn dòng 1.55 (phông chân).
- **Tránh:** chữ in hoa toàn bộ cho nhãn; nhãn nhỏ phía trên mọi tiêu đề; chuỗi "A · B · C"; tô đậm hay nghiêng một chữ trong tiêu đề để nhấn.

## 4. Bố cục

### 4.1 Điện thoại dọc (≥ 360px), thiết kế chính

```
┌──────────────────────────────┐
│ Tuần 3 · T11  ⏱ 2:41  ★ 72   │ ← thanh trên: thời gian ca, uy tín, ví (chạm để xem)
├──────────────────────────────┤
│ ◔ ◑ ◕ ○ ○   hàng chờ          │ ← người chờ + vòng kiên nhẫn (kèm số giây khi còn < 10s)
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │  HOÁ ĐƠN GTGT (giấy)     │ │ ← chứng từ: chạm từng dòng để bắt lỗi
│ │  …                       │ │
│ └──────────────────────────┘ ▐│ ← mép phải: lẫy "Luật" (§6)
├──────────────────────────────┤
│  Nợ            │  Có          │ ← bảng định khoản dạng chữ T (trượt lên khi tới bước 2)
│  642  540.000  │  111 594.000 │
│  1331  54.000  │              │
│  [ Ghi sổ ]  (khoá khi chưa cân) │
└──────────────────────────────┘
```

### 4.2 Máy tính hoặc máy tính bảng ngang (≥ 1024px)

```
┌────────────────────────────────────────────────────────────────────┐
│ thanh trên                                                          │
├──────────┬──────────────────────────────────────┬───────────────────┤
│ hàng chờ │   CHỨNG TỪ (giấy, rộng tối đa 640px) │  BẢNG PHÁP LUẬT   │
│ (dọc)    │                                      │  (320px, §6)      │
│          ├──────────────────────────────────────┤                   │
│          │   BẢNG ĐỊNH KHOẢN chữ T              │                   │
└──────────┴──────────────────────────────────────┴───────────────────┘
```
- Căn trái mọi chữ; số căn phải. Không căn giữa đoạn văn.
- Giấy luôn hơi nghiêng 0.4° và có bóng đổ thấp, đủ để thấy đó là tờ giấy trên bàn, không phải thẻ giao diện. **Chỉ chứng từ** được bóng đổ; các thành phần khác phẳng.
- Bo góc theo vật liệu: giấy 2px, thẻ tài khoản 6px, nút 8px, con dấu tròn hoặc chữ nhật bo 4px. Không dùng một bán kính bo cho mọi thứ.

## 5. Thành phần (`frontend/js/ui/`)

| Thành phần | Mô tả ngắn | Ghi chú thiết kế |
|---|---|---|
| `paper/<kind>.js` | Vẽ chứng từ theo `kind` | Bố cục giống mẫu thật về **thứ tự trường**, nhưng không sao chép mẫu in của đơn vị nào. Mỗi trường chạm được có vùng chạm ≥ 44px chiều cao. |
| `queue.js` | Hàng người chờ | Avatar hình học tự vẽ (không mascot); vòng kiên nhẫn bằng SVG `stroke-dashoffset`. |
| `account-card.js` | Thẻ tài khoản (Normal) | Số hiệu to, tên nhỏ hai dòng. Đã chọn thì viền và số chuyển sang bút bi. |
| `account-input.js` | Ô gõ số hiệu (Pro) | Tự hoàn thành theo tiền tố số; Enter chọn; hiện tên TK nhỏ bên dưới. |
| `entry-board.js` | Bảng chữ T | Tổng Nợ và tổng Có luôn hiện; lệch thì hiện số chênh (không chỉ đổi màu). |
| `stamp.js` | Con dấu | Điểm nhấn duy nhất (§7). Chữ trên dấu là tiếng Việt: "HỢP LỆ", "TRẢ LẠI", "KHÔNG ĐƯỢC KHẤU TRỪ". Chữ in hoa ở đây là đúng vật liệu thật, không phải nhãn giao diện. |
| `legal-panel.js` | Bảng pháp luật | §6 |
| `mentor.js` | Lời nhắc Normal | Một mảnh giấy ghi chú viết tay dán mép chứng từ, ký tên người hướng dẫn. |
| `sheet.js`, `dialog.js`, `toast.js` | Khung dùng chung | Hộp thoại khoá nút 400ms sau khi hiện (chống chạm vội). |

## 6. Bảng pháp luật bên cạnh nhiệm vụ

### 6.1 Mục đích
Mỗi khi người chơi làm một bước (soi chứng từ, định khoản, hợp nhất, từng giai đoạn kiểm toán), bên cạnh hiện **căn cứ pháp luật** của loại việc đó, như tập văn bản luật kẹp cạnh bàn. Nó dạy người chơi **tra luật**, không làm hộ.

### 6.2 Luật nội dung: không lộ đáp án (ADR-011)
- Bảng chọn theo **loại việc** (`step` + `template` hoặc `kind`), **không** theo lỗi có trong chứng từ. Chứng từ sạch và chứng từ lỗi cùng loại hiện **đúng cùng một bảng**.
- Bảng không bao giờ ghi "chứng từ này sai ở…", không ghi bút toán đáp án.
- Normal được hiện thêm mục **"Mẹo"** (`mentorTip`), tách bằng nền và tiêu đề riêng. Pro không có mục Mẹo (`hints.legalPanel.showMentorTips = false`).
- Nội dung lấy từ `content/legal_refs.json`. Chọn bảng: khớp `template` trước, rồi `kind`, rồi `"*"`.

### 6.3 Cấu trúc một bảng

```
┌ Căn cứ — Định khoản ─────────────┐   ← tiêu đề: bước đang làm (đổi khi chuyển bước)
│ Thông tư 99/2025/TT-BTC          │   ← tên + số hiệu văn bản (Source Serif 4, đậm)
│ Phụ lục II — Hệ thống tài khoản  │   ← điều, khoản
│ Áp dụng từ 01/01/2026. Quy định… │   ← tóm tắt 1–3 câu, lời của mình
│ ◐ Đối chiếu nguồn thứ cấp        │   ← nhãn mức đối chiếu (verified)
├──────────────────────────────────┤
│ Nghị quyết 204/2025/QH15  …      │
├──────────────────────────────────┤
│ Mẹo (chỉ Normal)  ✎ Chị Mơ       │
└──────────────────────────────────┘
```
- Nhãn đối chiếu: `official` = ● "Đã đối chiếu toàn văn" · `secondary` = ◐ "Đối chiếu nguồn thứ cấp" · `unverified` = ○ "Chưa đối chiếu". Người chơi luôn biết độ tin cậy của dòng luật.
- Mỗi trích dẫn thu gọn được (chạm tiêu đề). Trạng thái thu gọn nhớ theo `ref.id` trong localStorage (tiện ích theo người xem).

### 6.4 Vị trí theo màn hình

| Bề rộng | Cách hiện | Mặc định |
|---|---|---|
| ≥ 1024px | Cột phải cố định 320px | Pro: mở · Normal: thu thành dải 44px có chữ "Luật" dọc |
| 600–1023px | Ngăn trượt từ phải, phủ 360px, không che bảng định khoản khi đang ở bước 2 | Đóng |
| < 600px | Lẫy "Luật" ở mép phải vùng giấy → tấm trượt từ phải phủ 86% bề ngang; vuốt phải hoặc chạm nền để đóng | Đóng |

- Mở bảng **không dừng đồng hồ**: tra luật là một phần của nghề, và tốn thời gian như ngoài đời.
- Khi đổi bước, nếu bảng đang mở thì nội dung đổi tại chỗ, **không** nháy hay chạy hiệu ứng.
- Bàn phím (Pro): phím `L` bật hoặc tắt bảng; `Esc` đóng.

## 7. Chuyển động

| Khoảnh khắc | Chuyển động | `prefers-reduced-motion` |
|---|---|---|
| Đóng dấu (điểm nhấn duy nhất) | Dấu hạ xuống 140ms, ép 60ms, mực hiện với độ nghiêng ngẫu nhiên −6°…+6°, kèm tiếng "cộp" | Hiện dấu ngay, không xoay, không tiếng |
| Chứng từ lên bàn | Trượt từ phía hàng chờ 200ms (đáp lại thao tác chọn người) | Hiện ngay |
| Bảng chữ T lệch hoặc cân | Không chuyển động; đổi chữ "Lệch 54.000" ↔ "Đã cân" | Như vậy |
| Vòng kiên nhẫn | Chạy liên tục (thông tin, không trang trí) | Giữ, vì đây là thông tin |
| Sai sót bị lộ ở khoá sổ | Dòng sổ được gạch bằng mực đỏ, 300ms | Gạch ngay |

Không có hiệu ứng xuất hiện cho từng khối, không đổi màu khi rê chuột trên mọi thẻ, không nền gradient trang trí.

## 8. Chữ trong giao diện
- Nút gọi đúng việc nó làm và giữ tên đó suốt luồng: "Ghi sổ" → thông báo "Đã ghi sổ". "Trả lại" → "Đã trả lại chứng từ".
- Lỗi nói rõ chuyện gì và cách sửa: "Chưa cân: Nợ nhiều hơn Có 54.000 đ." Không xin lỗi, không mơ hồ.
- Màn trống là lời mời hành động: "Chưa có ai xếp hàng. Bấm Vào ca để bắt đầu tuần."
- Xưng hô trong game: nhân vật gọi người chơi bằng tên người chơi tự đặt, giọng đồng nghiệp, không trịnh trọng.

## 9. Hình ảnh và tài sản
- Hình người, đồ vật: SVG tự vẽ, nét hình học đơn giản. **Không** dùng hình, mascot hay bảng màu của game gốc.
- Biểu tượng: bộ nét 1.75px tự vẽ, 24px lưới.
- Logo Big Four, logo cơ quan nhà nước, quốc huy: **không dùng** (ADR-012). Tên hãng kiểm toán hiện bằng chữ thường của phông giao diện.
- Âm thanh: tự thu hoặc giấy phép CC0, ghi nguồn vào `frontend/assets/CREDITS.md`.

## 10. Tự rà trước khi bàn giao FE
- Bỏ bớt một thứ trang trí trước khi bàn giao.
- Có điểm nào trông giống "trang mẫu" không: thẻ bo đều nhau, bóng mờ xám dưới mọi khối, nhãn in hoa nhỏ phía trên tiêu đề, mũi tên → cuối nút? Có thì bỏ.
- Chụp màn hình ở 360px, 768px, 1280px, sáng và tối, đính vào mục HANDOFF.
