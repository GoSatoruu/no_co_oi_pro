/**
 * Màn hình Desk — Bàn làm việc kế toán (docs/01 §2.2 & docs/08 §4)
 * Trái tim của trò chơi: Soi chứng từ -> Định khoản -> Ghi sổ
 */

let cleanup = null;

export function mount(root, params, ctx) {
  const mode = params.mode || 'normal';
  const container = document.createElement('div');
  container.className = 'screen screen--desk';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-8);
    gap: var(--space-12);
  `;

  container.innerHTML = `
    <!-- Thanh trạng thái ca -->
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: var(--space-8) var(--space-12); border-radius: var(--radius-btn);">
      <div>
        <strong>Ca 1</strong> · Chế độ: <span style="text-transform: uppercase; font-weight: 700; color: ${mode === 'pro' ? 'var(--lamp)' : 'var(--ruling)'}">${mode}</span>
      </div>
      <div style="display: flex; gap: var(--space-8); align-items: center;">
        <span>⏱ 03:00</span>
        <button id="btn-back-title" class="btn btn--ghost" style="min-height: 32px; padding: 4px 10px; font-size: var(--font-xs);">
          ↩ Về trang chủ
        </button>
      </div>
    </div>

    <!-- Hàng chờ người mang chứng từ -->
    <div style="background: rgba(0,0,0,0.2); padding: var(--space-8) var(--space-12); border-radius: var(--radius-card); display: flex; align-items: center; gap: var(--space-12); overflow-x: auto;">
      <span style="font-size: var(--font-xs); color: rgba(255,255,255,0.7); white-space: nowrap;">Hàng chờ:</span>
      <div style="display: flex; gap: var(--space-8);">
        <div style="background: var(--paper); color: var(--ink); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: var(--font-xs); font-weight: 700; border: 2px solid var(--ballpoint);">
          #1
        </div>
        <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: var(--font-xs); opacity: 0.6;">
          #2
        </div>
        <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: var(--font-xs); opacity: 0.4;">
          #3
        </div>
      </div>
      <span style="font-size: var(--font-xs); margin-left: auto; color: var(--lamp);">Kiên nhẫn: 100%</span>
    </div>

    <!-- Vùng làm việc chính: Chứng từ + Bảng định khoản + Bảng pháp luật -->
    <div class="desk-layout" style="display: grid; grid-template-columns: 1fr; gap: var(--space-16);">
      
      <!-- Cột trái / Giữa: Chứng từ & Bảng chữ T -->
      <div style="display: flex; flex-direction: column; gap: var(--space-16);">
        <!-- Tờ chứng từ -->
        <div class="paper" style="padding: var(--space-16);">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--ruling); padding-bottom: var(--space-8); margin-bottom: var(--space-12);">
            <div>
              <div style="font-weight: 800; font-size: var(--font-base);">CÔNG TY CỔ PHẦN CÔNG NGHỆ ÁNH DƯƠNG</div>
              <div style="font-size: var(--font-xs); color: var(--ink-2); font-family: var(--font-serif);">MST: 9901234567 · Mẫu: 01GTKT0/001</div>
            </div>
            <div style="text-align: right;">
              <span class="seal" style="font-size: 11px;">HOÁ ĐƠN GTGT</span>
              <div style="font-size: var(--font-xs); font-family: var(--font-serif); margin-top: 4px;">Số: 0001284</div>
            </div>
          </div>

          <div style="font-family: var(--font-serif); font-size: var(--font-sm); display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-12);">
            <div><strong>Đơn vị mua:</strong> Công ty TNHH Sao Mai (MST: 9909876543)</div>
            <div><strong>Nội dung:</strong> Mua văn phòng phẩm phục vụ quản lý doanh nghiệp</div>
            <div><strong>Hình thức thanh toán:</strong> Tiền mặt (TM)</div>
          </div>

          <!-- Bảng kê tiền -->
          <table style="width: 100%; border-collapse: collapse; font-family: var(--font-serif); font-size: var(--font-sm); margin-bottom: var(--space-12);">
            <thead>
              <tr style="border-bottom: 1px solid var(--ruling); text-align: left;">
                <th style="padding: 4px;">Nội dung</th>
                <th style="padding: 4px; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px;">Tiền hàng chưa thuế</td>
                <td style="padding: 4px; text-align: right;" class="num">1.000.000 đ</td>
              </tr>
              <tr>
                <td style="padding: 4px;">Thuế GTGT (8%)</td>
                <td style="padding: 4px; text-align: right;" class="num">80.000 đ</td>
              </tr>
              <tr style="font-weight: 700; border-top: 1px solid var(--ink);">
                <td style="padding: 4px;">Tổng cộng thanh toán</td>
                <td style="padding: 4px; text-align: right; color: var(--ballpoint);" class="num">1.080.000 đ</td>
              </tr>
            </tbody>
          </table>

          <div style="font-size: var(--font-xs); font-family: var(--font-serif); color: var(--ink-2); font-style: italic;">
            Số tiền viết bằng chữ: Một triệu không trăm tám mươi nghìn đồng chẵn.
          </div>
        </div>

        <!-- Bảng định khoản chữ T -->
        <div class="paper paper--flat" style="padding: var(--space-12);">
          <div style="font-weight: 700; font-size: var(--font-sm); margin-bottom: var(--space-8); display: flex; justify-content: space-between;">
            <span>BẢNG ĐỊNH KHOẢN (BÚT TOÁN)</span>
            <span style="color: var(--ballpoint); font-size: var(--font-xs);">Đã cân: 1.080.000 đ = 1.080.000 đ</span>
          </div>

          <div class="t-account" style="margin-bottom: var(--space-12);">
            <div class="t-account__header" style="border-right: 2px solid var(--ink);">NỢ (Tài sản tăng / Chi phí tăng)</div>
            <div class="t-account__header">CÓ (Nguồn vốn tăng / Tài sản giảm)</div>

            <div class="t-account__side-debit">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: var(--font-sm); color: var(--ballpoint);">
                <span>TK 642 (CPQLDN)</span>
                <span class="num">1.000.000</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: var(--font-sm); color: var(--ballpoint);">
                <span>TK 1331 (Thuế GTGT)</span>
                <span class="num">80.000</span>
              </div>
            </div>

            <div class="t-account__side-credit">
              <div style="display: flex; justify-content: space-between; font-size: var(--font-sm); color: var(--ballpoint);">
                <span>TK 111 (Tiền mặt)</span>
                <span class="num">1.080.000</span>
              </div>
            </div>
          </div>

          <button id="btn-post" class="btn btn--ballpoint" style="width: 100%; justify-content: center;">
            ✓ Ghi sổ bút toán
          </button>
        </div>
      </div>

      <!-- Bảng pháp luật (ADR-011 & docs/08 §6) -->
      <div class="legal-panel" style="height: fit-content;">
        <div style="font-weight: 700; margin-bottom: var(--space-8); display: flex; justify-content: space-between; align-items: center;">
          <span>⚖ CĂN CỨ PHÁP LUẬT</span>
          <span style="font-size: 10px; background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px;">Đối chiếu</span>
        </div>
        <p style="margin-bottom: var(--space-8);">
          <strong>Nghị định 123/2020/NĐ-CP · Điều 10:</strong> Hoá đơn hợp pháp phải có đầy đủ tên, địa chỉ, mã số thuế người bán, người mua và chữ ký số hợp lệ.
        </p>
        <p style="margin-bottom: var(--space-8);">
          <strong>Luật Thuế GTGT 48/2024/QH15:</strong> Hoá đơn trên 5.000.000 đồng bắt buộc phải thanh toán không dùng tiền mặt để được khấu trừ thuế đầu vào.
        </p>
        <div style="border-top: 1px dashed rgba(0,0,0,0.2); padding-top: var(--space-4); font-size: 11px; color: var(--ink-2);">
          💡 Mẹo Normal: Chi phí văn phòng dùng ngay ghi nhận vào TK 642; thuế GTGT đầu vào được khấu trừ ghi nhận TK 1331.
        </div>
      </div>

    </div>
  `;

  // Gắn sự kiện
  const btnBack = container.querySelector('#btn-back-title');
  const btnPost = container.querySelector('#btn-post');

  const onBack = () => ctx.go('title');
  const onPost = () => {
    alert('Bút toán đã được ghi sổ tạm của ca thành công!');
  };

  btnBack.addEventListener('click', onBack);
  btnPost.addEventListener('click', onPost);

  root.appendChild(container);

  cleanup = () => {
    btnBack.removeEventListener('click', onBack);
    btnPost.removeEventListener('click', onPost);
  };
}

export function unmount() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}
