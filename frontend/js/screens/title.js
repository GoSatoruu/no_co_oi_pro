/**
 * Màn hình Title — Nợ Có Ơi Pro
 * Khởi đầu game, chọn chế độ chơi (Normal / Pro)
 */

let unmountHandler = null;

export function mount(root, params, ctx) {
  const container = document.createElement('div');
  container.className = 'screen screen--title';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 50px);
    padding: var(--space-16);
    text-align: center;
    max-width: 540px;
    margin: 0 auto;
  `;

  container.innerHTML = `
    <div class="paper" style="width: 100%; padding: var(--space-24); margin-bottom: var(--space-24);">
      <div style="font-size: var(--font-xs); text-transform: uppercase; letter-spacing: 2px; color: var(--ink-2); margin-bottom: var(--space-8);">
        Mô phỏng kế toán Việt Nam
      </div>
      <h1 style="font-size: var(--font-2xl); font-weight: 800; color: var(--ink); margin-bottom: var(--space-8);">
        NỢ CÓ ƠI <span style="color: var(--seal);">PRO</span>
      </h1>
      <p style="font-size: var(--font-sm); color: var(--ink-2); margin-bottom: var(--space-16); font-family: var(--font-serif);">
        Kiểm chứng từ — Định khoản Nợ/Có — Kiểm quỹ — Khoá sổ
      </p>
      
      <div style="display: inline-block; margin-bottom: var(--space-16);">
        <span class="seal">BẢN CHƠI THỬ</span>
      </div>

      <div style="border-top: 1px dashed var(--ruling); padding-top: var(--space-16); display: flex; flex-direction: column; gap: var(--space-12);">
        <button id="btn-play-normal" class="btn btn--primary" style="width: 100%; justify-content: center; font-size: var(--font-base);">
          ▶ Bắt đầu Ca làm (Normal)
        </button>
        <button id="btn-play-pro" class="btn btn--ballpoint" style="width: 100%; justify-content: center; font-size: var(--font-base);">
          ⚡ Chế độ Chuyên gia (Pro)
        </button>
      </div>
    </div>

    <div style="font-size: var(--font-xs); color: rgba(255, 255, 255, 0.75);">
      Tuân thủ Thông tư 99/2025/TT-BTC & Luật Thuế GTGT 48/2024
    </div>
  `;

  const onNormal = () => {
    document.documentElement.removeAttribute('data-mode');
    ctx.go('desk', { mode: 'normal' });
  };

  const onPro = () => {
    document.documentElement.setAttribute('data-mode', 'pro');
    ctx.go('desk', { mode: 'pro' });
  };

  const btnNormal = container.querySelector('#btn-play-normal');
  const btnPro = container.querySelector('#btn-play-pro');

  btnNormal.addEventListener('click', onNormal);
  btnPro.addEventListener('click', onPro);

  root.appendChild(container);

  unmountHandler = () => {
    btnNormal.removeEventListener('click', onNormal);
    btnPro.removeEventListener('click', onPro);
  };
}

export function unmount() {
  if (unmountHandler) {
    unmountHandler();
    unmountHandler = null;
  }
}
