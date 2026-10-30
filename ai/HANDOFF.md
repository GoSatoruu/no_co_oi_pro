# HANDOFF — Nhật ký bàn giao

> Chỉ **thêm vào cuối**, theo `ai/templates/handoff_entry.md`. Đầu phiên đọc 3 mục cuối.
> Không sửa mục của người khác. Muốn phản hồi thì viết mục mới và nhắc lại ID.

---

## 2026-10-31 00:30 · M0 (nền móng) · claude-opus-5.5 · done

**Đã làm**
- Khảo sát game gốc (cơ chế, cấu trúc module) → `docs/00_RE_NOTES.md`. Không chép code hay chữ của game gốc.
- Viết `docs/01`–`07`: GDD (Normal + Pro), kiến trúc, quy ước, content spec, hợp đồng API, lộ trình, luật kế toán.
- Bộ điều phối: `AGENTS.md` (luật chung), file trỏ cho Claude, Gemini, Copilot, Cursor; `ai/TASKS.md` (31 việc chia 4 làn + 3 việc của chủ dự án), `ai/DECISIONS.md` (ADR-001…009), `ai/ROLES.md`, `ai/prompts/*`, `ai/templates/*`.
- Content khởi đầu: 34 tài khoản (TT 99/2025), số dư đầu kỳ cân, luật GTGT có ngày hiệu lực, 2 chế độ, 7 mốc cấp, 9 loại lỗi, 8 mẫu chứng từ, kho tên hư cấu với MST hợp lệ dải `99…`.
- `tools/validate_content.py`: kiểm schema, tham chiếu chéo, MST, độ cân của đáp án trên mẫu biên; đã thử làm hỏng nội dung, validator bắt được.

**Kiểm tra**
- `python tools/validate_content.py` → 8 mẫu · 34 TK · 9 lỗi — 0 lỗi, 0 cảnh báo.

**Quyết định / giả định**
- ADR-001…008 `accepted`; ADR-009 (tên "Cân Sổ") `proposed`.
- Backend chọn FastAPI thay vì stdlib hay Flask (ADR-002).

**Cần người khác**
- Làn A bắt đầu từ CORE-001, CORE-002; làn D từ QA-001; làn B từ PY-004; làn C từ FE-001… FE-004 (dùng dữ liệu giả, không đợi lõi).

**Câu hỏi cho chủ dự án**
- OWN-001: tên game và tông hình ảnh.
- OWN-002: duyệt phạm vi Pro mode và MVP.
- Các mục `[cần kiểm]` trong `content/rules.json` và `docs/07` (thuế suất 8% năm 2026, ngưỡng 5 triệu, công thức chữ số kiểm tra MST).

**Người sau nên biết**
- Validator dùng chung ngữ pháp biểu thức với `core/expr.js` (CORE-002): có thể đọc `Parser` trong validator làm tham chiếu, nhưng viết lại bằng JS, đừng sinh code tự động từ Python.
- `requires.balanceAtLeast` so theo **bên số dư thông thường** của TK (331 là bên Có): xem docs/04 §5.

## 2026-10-31 00:20 · OWN-001 (tên game) · claude-opus-5.5 · done

**Đã làm**
- Đổi tên game thành **"Nợ Có Ơi Pro"** theo quyết định của chủ dự án; game **chỉ dùng riêng** → ADR-010 (thay ADR-009).
- Cập nhật: `AGENTS.md`, `README.md`, `.cursor/rules/project.mdc`, `ai/prompts/_START_HERE.md`, `content/i18n/vi.json`, `docs/00`, `docs/01`, `docs/02` (khoá lưu `nocooi.*`), `ai/TASKS.md` (OWN-001, seed golden `"nocooi"`).

**Kiểm tra**
- `python tools/validate_content.py` → 0 lỗi. Không còn chuỗi "Cân Sổ" hay `canso` ngoài lịch sử ADR và HANDOFF.

**Người sau nên biết**
- Tên game là ngoại lệ duy nhất của luật phòng sạch. Code, hình, lời thoại, nhân vật vẫn **không** được lấy từ game gốc.
- Tông hình ảnh (phần còn lại của OWN-001) vẫn chờ chủ dự án.

## 2026-10-31 01:10 · Pro mở rộng + hệ thống thiết kế · claude-opus-5.5 · done

**Đã làm**
- `docs/08_DESIGN_SYSTEM.md`: ý tưởng "bàn kế toán", 8 token màu, 2 phông, bố cục điện thoại và máy tính, thành phần, **bảng pháp luật bên cạnh nhiệm vụ** (§6), chuyển động (con dấu là điểm nhấn duy nhất), chữ trong giao diện.
- `docs/09_PRO_CORPORATE.md`: cấp 10–12 Pro: công ty cổ phần (cổ phần, cổ tức, cổ phiếu quỹ, nghị quyết), tập đoàn (công ty con, liên kết, bên liên quan), hợp nhất BCTC.
- `docs/10_AUDIT_BIG4.md`: mùa kiểm toán 5 bước, trọng yếu, ý kiến, chính sách dùng tên Big Four.
- Content: +9 TK (221, 222, 228, 3388, 343, 4111, 4112, 414, 419), `openingProfiles.jsc_group`, `rules` (mệnh giá, thuế TNCN cổ tức), +2 lỗi, cấp 10–12 chỉ Pro, `modes.hints.legalPanel` + `features`, `doc_templates/corporate.json` (5 mẫu), **`legal_refs.json`** (22 trích dẫn, 18 bảng), **`audit.json`**.
- Validator: kiểm `openingProfiles`, tham số `const/pick/rule`, `modes` và `attachments` trên mẫu, `legalPanel`, phủ bảng pháp luật cho mọi mẫu, Big Four đúng bốn hãng.
- Cập nhật AGENTS (luật 11–13), GDD, kiến trúc (`core/legal.js`, `consolidation.js`, `audit.js`), content spec §10, roadmap M5–M6, luật kế toán §7–8, TASKS (+15 việc), ADR-011…013.

**Kiểm tra**
- `python tools/validate_content.py` → 13 mẫu · 43 TK · 11 lỗi · 22 trích dẫn — 0 lỗi, 0 cảnh báo. Đã thử làm hỏng (thêm hãng ngoài Big Four, ref không tồn tại, verified sai, thiếu legalPanel): validator bắt đủ 4 lỗi.

**Quyết định / giả định**
- ADR-011 (bảng pháp luật không lộ đáp án, có mức đối chiếu), ADR-012 (Big Four), ADR-013 (phông đóng gói).
- Đã đối chiếu nguồn thứ cấp: TT 99/2025 hiệu lực 01/01/2026 thay TT 200; Luật 76/2025/QH15 sửa Luật DN, hiệu lực 01/07/2025 (định nghĩa cổ tức, chủ sở hữu hưởng lợi); TT 183/2013 về đơn vị có lợi ích công chúng. **Mọi số điều khoản khác vẫn `unverified`.**

**Cần người khác**
- CNT-001: đối chiếu toàn văn `legal_refs.json`, nhất là Luật DN Điều 132–135, 138, 167, 195–196; luân chuyển kiểm toán viên trong NĐ 17/2012; thuế TNCN cổ tức theo Luật 109/2025.

**Câu hỏi cho chủ dự án**
- OWN-004: duyệt hướng thiết kế docs/08.

**Người sau nên biết**
- `core/legal.js` cố ý không nhận `doc` hay `defect`; đừng "tối ưu" bằng cách truyền cả chứng từ vào.
- Mẫu `declare_dividend` cần 421 đủ lớn, nên chỉ sinh được với `openingProfiles.jsc_group`.
