/**
 * MAIN ENTRY POINT — Nợ Có Ơi Pro // Enterprise Financial OS
 * Khởi động ứng dụng, nạp Store lưu trữ phiên chơi, Router và mở thẳng Bàn điều hành chính thức.
 */

import { Router } from './router.js';
import { defaultStore } from './services/store.js';
import * as titleScreen from './screens/title.js';
import * as deskScreen from './screens/desk.js';

// Ngữ cảnh dùng chung của toàn app
const appCtx = {
  version: '0.2.0',
  mode: 'normal',
  store: defaultStore,
};

// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('screen-root');
  if (!root) {
    console.error('Không tìm thấy #screen-root');
    return;
  }

  // Khởi tạo Router
  const router = new Router(root, appCtx);
  router.register('title', titleScreen);
  router.register('desk', deskScreen);

  // Gắn sự kiện nút chuyển Theme Sáng / Tối trên thanh topbar
  const btnTheme = document.getElementById('btn-toggle-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      btnTheme.textContent = next === 'dark' ? '☀️ Giao diện Sáng' : '🌙 Giao diện Tối';
    });
  }

  // Mở thẳng Bàn Điều hành Chính thức (tự động khôi phục phiên chơi gần nhất hoặc khởi tạo phiên #1)
  const activeSession = defaultStore.getActiveSession();
  if (activeSession) {
    router.go('desk', {
      sessionId: activeSession.id,
      mode: activeSession.modeId || 'normal',
      level: activeSession.level || 1,
    });
  } else {
    router.go('desk', { mode: 'pro', level: 5 });
  }
});
