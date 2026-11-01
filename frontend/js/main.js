/**
 * MAIN ENTRY POINT — Nợ Có Ơi Pro // Enterprise Financial OS
 * Khởi động ứng dụng, cài đặt Phiên Ghi Log Hệ thống, nạp Store, Router và mở thẳng Bàn điều hành chính thức.
 */

import { Router } from './router.js?v=20261101_v3';
import { defaultStore } from './services/store.js?v=20261101_v3';
import { defaultLogger, installGlobalErrorHandlers } from './services/logger.js?v=20261101_v3';
import * as titleScreen from './screens/title.js?v=20261101_v3';
import * as deskScreen from './screens/desk.js?v=20261101_v3';

// Cài đặt trình bắt lỗi toàn cục cho Phiên Ghi Log
installGlobalErrorHandlers(defaultLogger);

// Ngữ cảnh dùng chung của toàn app
const appCtx = {
  version: '0.3.0',
  mode: 'normal',
  store: defaultStore,
  logger: defaultLogger,
};

function bootApplication() {
  defaultLogger.info('main', 'Khởi động ứng dụng Nợ Có Ơi Pro // CEO Conglomerate & AI CFO', {
    version: appCtx.version,
    readyState: document.readyState,
  });

  const root = document.getElementById('screen-root');
  if (!root) {
    defaultLogger.fatal('main', 'Không tìm thấy phần tử gốc #screen-root trong DOM');
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
      defaultLogger.info('ui.theme', `Chuyển đổi giao diện sang chế độ: ${next}`);
    });
  }

  // Mở thẳng Bàn Điều hành Chính thức (tự động khôi phục phiên chơi gần nhất hoặc khởi tạo phiên #1)
  try {
    const activeSession = defaultStore.getActiveSession();
    if (activeSession) {
      defaultLogger.info('main', `Tìm thấy phiên lưu gần nhất: ${activeSession.id}`, {
        sessionId: activeSession.id,
        modeId: activeSession.modeId,
        level: activeSession.level,
      });
      router.go('desk', {
        sessionId: activeSession.id,
        mode: activeSession.modeId || 'normal',
        level: activeSession.level || 1,
      });
    } else {
      defaultLogger.info('main', 'Chưa có phiên lưu trước đó, mở phiên CEO Pro Cấp 5 mới.');
      router.go('desk', { mode: 'pro', level: 5 });
    }
  } catch (err) {
    defaultLogger.error('main', 'Lỗi khi đọc phiên lưu ban đầu, chuyển sang mở phiên mới sạch', err);
    router.go('desk', { newSession: true, mode: 'pro', level: 5 });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApplication);
} else {
  bootApplication();
}
