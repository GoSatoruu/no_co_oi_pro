/**
 * Màn hình Quản lý Phiên & Khởi tạo Doanh nghiệp (Enterprise Session Hub & Launchpad)
 * Nguồn sự thật: ADR-014, FE-002, FE-023
 */

import { defaultStore } from '../services/store.js?v=20261101_v2';

let unmountHandler = null;

const SCENARIOS = [
  { level: 1, code: 'CORP-L1', title: 'Khởi nghiệp Thương mại & Dịch vụ', desc: 'Doanh thu tiền mặt, chi phí vận hành, tối ưu thanh khoản ngắn hạn' },
  { level: 3, code: 'CORP-L3', title: 'Mở rộng Tín dụng B2B & Ngân hàng', desc: 'Quản trị công nợ phải thu (131), uỷ nhiệm chi & báo Có ngân hàng (112)' },
  { level: 5, code: 'CORP-L5', title: 'Chuỗi Cung ứng, Kho vận & Giá vốn', desc: 'Mua hàng công nợ (331), xuất kho giá vốn (632/156), biên lợi nhuận gộp' },
  { level: 10, code: 'CORP-L10', title: 'Công ty Cổ phần & Tập đoàn (Pro)', desc: 'Phát hành cổ phần (4111/4112), chia cổ tức, mua cổ phiếu quỹ, đầu tư công ty con' },
];

const vndShort = (n) => {
  const abs = Math.abs(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)} tỷ`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)} tr`;
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
};

export function mount(root, params, ctx) {
  const store = ctx?.store || defaultStore;
  let selectedLevel = 5;

  function renderHub() {
    root.innerHTML = '';
    const sessions = store.listSessions();
    const activeId = store.getActiveSession()?.id;

    const container = document.createElement('div');
    container.className = 'screen screen--title';
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: calc(100vh - 52px);
      padding: 20px;
      max-width: 1080px;
      margin: 0 auto;
      box-sizing: border-box;
      gap: 18px;
    `;

    container.innerHTML = `
      <div style="width: 100%; background: #0B111E; border: 1px solid #1E293B; border-top: 3px solid #38BDF8; border-radius: 6px; padding: 24px 28px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color: #E2E8F0;">
        <!-- Header Telemetry -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #1E293B; padding-bottom: 16px; margin-bottom: 18px;">
          <div>
            <div style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; letter-spacing: 1.5px; font-weight: 700;">
              ◈ ENTERPRISE FINANCIAL OS // OFFICIAL SESSION COMMAND HUB
            </div>
            <h1 style="font-size: 26px; font-weight: 900; color: #F8FAFC; margin-top: 4px; letter-spacing: 0.5px;">
              NỢ CÓ ƠI <span style="color: #38BDF8; font-family: var(--font-mono);">// QUẢN LÝ PHIÊN & KHỞI TẠO DOANH NGHIỆP</span>
            </h1>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${activeId ? `
              <button id="btn-resume-active" class="btn btn--ballpoint" style="font-family: var(--font-mono); font-size: 12px; padding: 8px 14px;">
                ▶ Quay lại Bàn Chính thức (${activeId})
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Danh sách Phiên chơi đã lưu -->
        <div style="margin-bottom: 24px;">
          <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #34D399; letter-spacing: 1px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>💾 01 // CÁC PHIÊN ĐIỀU HÀNH DOANH NGHIỆP ĐÃ LƯU (${sessions.length} PHIÊN)</span>
            <span style="color: #94A3B8; font-size: 10px;">Mọi thao tác trên Bàn Chính thức đều được lưu tự động</span>
          </div>

          ${sessions.length === 0 ? `
            <div style="padding: 18px; background: #111927; border: 1px dashed #334155; border-radius: 4px; color: #94A3B8; font-size: 12px; text-align: center;">
              Chưa có phiên lưu nào. Hãy chọn Quy mô Doanh nghiệp và bấm khởi tạo phiên mới bên dưới!
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 10px; max-height: 290px; overflow-y: auto; padding-right: 4px;">
              ${sessions.map((ses) => {
                const isAct = ses.id === activeId;
                const sum = ses.summary || {};
                const timeStr = ses.updatedAt ? new Date(ses.updatedAt).toLocaleString('vi-VN') : '';
                return `
                  <div style="background: ${isAct ? 'rgba(56, 189, 248, 0.1)' : '#111927'}; border: 1px solid ${isAct ? '#38BDF8' : '#1E293B'}; border-left: 4px solid ${ses.modeId === 'pro' ? '#38BDF8' : '#10B981'}; border-radius: 4px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 10px; margin-bottom: 4px;">
                        <span style="color: #38BDF8; font-weight: 800;">${ses.id} · ${ses.modeId === 'pro' ? 'PALANTIR PRO' : 'ERP STANDARD'}</span>
                        <span style="color: #94A3B8;">Cấp ${ses.level || 1}</span>
                      </div>
                      <div style="font-weight: 800; font-size: 14px; color: #FFFFFF; margin-bottom: 4px;">${ses.name || 'Phiên điều hành CTCP Đại Việt'}</div>
                      <div style="font-family: var(--font-mono); font-size: 11px; color: #CBD5E1; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #0B111E; padding: 6px 8px; border-radius: 3px; border: 1px solid #1E293B;">
                        <span>DT: <strong style="color:#38BDF8;">${vndShort(sum.revenue ?? 120000000)}</strong></span>
                        <span>LN: <strong style="color:#34D399;">${vndShort(sum.netProfit ?? 35000000)}</strong></span>
                        <span>Tiền: <strong>${vndShort(sum.liquidity ?? 530000000)}</strong></span>
                        <span>Tổng TS: <strong>${vndShort(sum.totalAssets ?? 1010000000)}</strong></span>
                      </div>
                      <div style="font-size: 10px; color: #64748B; margin-top: 5px;">
                        Cập nhật: ${timeStr} · Điểm: ${ses.score || 0} · Bút toán: ${sum.journalCount ?? 0}
                      </div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="btn-open-ses btn" data-sid="${ses.id}" style="flex: 1; min-height: 30px; padding: 4px 8px; font-size: 11px; font-family: var(--font-mono); background: #0284C7; color: #FFFFFF; border: 1px solid #38BDF8;">
                        ▶ Tiếp tục phiên
                      </button>
                      <button type="button" class="btn-dup-ses btn btn--ghost" data-sid="${ses.id}" style="min-height: 30px; padding: 4px 8px; font-size: 11px;" title="Nhân bản phiên">
                        ⎘ Sao lưu
                      </button>
                      <button type="button" class="btn-del-ses btn btn--ghost" data-sid="${ses.id}" style="min-height: 30px; padding: 4px 8px; font-size: 11px; color: #FB7185;" title="Xoá phiên">
                        ✕
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Khởi tạo Phiên Doanh nghiệp Mới -->
        <div style="margin-bottom: 18px; border-top: 1px solid #1E293B; padding-top: 18px;">
          <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #CBD5E1; letter-spacing: 1px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span>➕ 02 // KHỞI TẠO PHIÊN ĐIỀU HÀNH DOANH NGHIỆP MỚI</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 11px; color: #94A3B8;">Tên phiên / Công ty:</label>
              <input id="new-session-name" type="text" value="CTCP ĐẠI VIỆT — Phiên #${sessions.length + 1}" style="padding: 5px 10px; background: #111927; border: 1px solid #334155; color: #F8FAFC; font-family: var(--font-mono); font-size: 12px; border-radius: 4px; width: 260px;" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; margin-bottom: 16px;">
            ${SCENARIOS.map((s) => `
              <button type="button" class="scenario-card" data-lvl="${s.level}" style="
                text-align: left; padding: 12px 14px; border-radius: 4px; cursor: pointer;
                background: ${s.level === selectedLevel ? 'rgba(56, 189, 248, 0.14)' : '#111927'};
                border: 1px solid ${s.level === selectedLevel ? '#38BDF8' : '#1E293B'};
                color: #F8FAFC; transition: all 0.15s ease;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #38BDF8;">${s.code}</span>
                  <span style="font-size: 10px; padding: 1px 6px; background: rgba(255,255,255,0.08); border-radius: 3px; color: #CBD5E1;">Cấp ${s.level}</span>
                </div>
                <div style="font-weight: 800; font-size: 13px; color: #FFFFFF; margin-bottom: 4px;">${s.title}</div>
                <div style="font-size: 11px; color: #94A3B8; line-height: 1.4;">${s.desc}</div>
              </button>
            `).join('')}
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
            <!-- ERP Standard -->
            <div style="background: #111927; border: 1px solid #334155; border-radius: 5px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-family: var(--font-mono); font-size: 11px; color: #60A5FA; font-weight: 800;">ERP WORKSPACE // NORMAL</span>
                  <span style="font-size: 10px; background: rgba(96, 165, 250, 0.15); color: #93C5FD; padding: 2px 8px; border-radius: 3px; font-weight: 700;">CÓ CỐ VẤN CFO</span>
                </div>
                <h3 style="font-size: 16px; font-weight: 800; color: #F8FAFC; margin-bottom: 4px;">Tạo Phiên Mới — ERP Tiêu chuẩn</h3>
                <p style="font-size: 12px; color: #94A3B8; line-height: 1.45;">
                  Chọn thẻ tài khoản trực quan, có trợ lý gợi ý định khoản, cân đối nguồn tiền và đối chiếu tài khoản tổng.
                </p>
              </div>
              <button id="btn-play-normal" class="btn btn--primary" style="width: 100%; justify-content: center; padding: 11px; font-size: 12px; background: #1E293B; color: #F8FAFC; border: 1px solid #475569;">
                ➕ Tạo Phiên Mới (ERP Standard)
              </button>
            </div>

            <!-- Palantir Foundry Pro -->
            <div style="background: linear-gradient(145deg, #09131F 0%, #0F1E32 100%); border: 1px solid #38BDF8; border-radius: 5px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; box-shadow: 0 0 25px rgba(56, 189, 248, 0.15);">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 800;">◈ PALANTIR FOUNDRY // PRO MODE</span>
                  <span style="font-size: 10px; background: rgba(56, 189, 248, 0.2); color: #38BDF8; padding: 2px 8px; border-radius: 3px; font-weight: 800;">TACTICAL TELEMETRY</span>
                </div>
                <h3 style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">Tạo Phiên Mới — Palantir Command Center</h3>
                <p style="font-size: 12px; color: #94A3B8; line-height: 1.45;">
                  Giao diện điều hành chiến thuật kiểu Palantir Foundry. Gõ trực tiếp mã tài khoản, cân đối ngân quỹ và điều hành tài khoản tổng.
                </p>
              </div>
              <button id="btn-play-pro" class="btn btn--ballpoint" style="width: 100%; justify-content: center; padding: 11px; font-size: 12px; font-family: var(--font-mono); letter-spacing: 0.5px;">
                ⚡ Tạo Phiên Mới (Palantir Pro Dashboard)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const cards = container.querySelectorAll('.scenario-card');
    cards.forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedLevel = Number(btn.getAttribute('data-lvl'));
        renderHub();
      });
    });

    const resumeBtn = container.querySelector('#btn-resume-active');
    if (resumeBtn && activeId) {
      resumeBtn.addEventListener('click', () => {
        ctx.go('desk', { sessionId: activeId });
      });
    }

    container.querySelectorAll('.btn-open-ses').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        store.setActiveSession(sid);
        ctx.go('desk', { sessionId: sid });
      });
    });

    container.querySelectorAll('.btn-dup-ses').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        store.duplicateSession(sid);
        renderHub();
      });
    });

    container.querySelectorAll('.btn-del-ses').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        store.deleteSession(sid);
        renderHub();
      });
    });

    const getCustomName = () => {
      const inp = container.querySelector('#new-session-name');
      return inp && inp.value.trim() ? inp.value.trim() : `CTCP ĐẠI VIỆT — Phiên #${sessions.length + 1}`;
    };

    const btnNormal = container.querySelector('#btn-play-normal');
    const btnPro = container.querySelector('#btn-play-pro');

    btnNormal.addEventListener('click', () => {
      document.documentElement.removeAttribute('data-mode');
      ctx.go('desk', {
        newSession: true,
        sessionName: getCustomName(),
        mode: 'normal',
        level: selectedLevel,
      });
    });

    btnPro.addEventListener('click', () => {
      document.documentElement.setAttribute('data-mode', 'pro');
      ctx.go('desk', {
        newSession: true,
        sessionName: getCustomName(),
        mode: 'pro',
        level: selectedLevel,
      });
    });

    root.appendChild(container);
  }

  renderHub();

  unmountHandler = () => {};
}

export function unmount() {
  if (unmountHandler) {
    unmountHandler();
    unmountHandler = null;
  }
}
