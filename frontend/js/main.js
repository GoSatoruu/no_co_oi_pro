/**
 * MAIN ENTRY POINT — Nợ Có Ơi Pro
 * Khởi động ứng dụng, nạp router, màn hình và quản lý theme.
 */

import { Router } from './router.js';
import * as titleScreen from './screens/title.js';
import * as deskScreen from './screens/desk.js';

// Ngữ cảnh dùng chung của toàn app
const appCtx = {
  version: '0.1.0',
  mode: 'normal',
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
      btnTheme.textContent = next === 'dark' ? '☀️ Sáng' : '🌙 Tối';
    });
  }

  // Mở màn hình Title đầu tiên
  router.go('title');
});
