import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, LOG_STORAGE_KEY } from '../../frontend/js/services/logger.js';

function createMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('logger: tạo phiên ghi log (Log Session) và lưu trữ đầy đủ INFO, WARN, ERROR, FATAL vào localStorage', () => {
  const storage = createMockStorage();
  const logger = createLogger(storage);

  assert.ok(logger.logSessionId.startsWith('LOGSES-'));

  logger.info('main', 'Khởi động hệ thống', { version: '0.3.0' });
  logger.warn('store', 'Phiên lưu cũ cần chuẩn hoá');
  const sampleErr = new Error('Lỗi mẫu kiểm thử');
  logger.error('desk.render', 'Không thể vẽ thành phần', sampleErr);

  const meta = logger.getSessionInfo();
  assert.equal(meta.totalEntries, 3);
  assert.equal(meta.errorCount, 1);
  assert.equal(meta.warnCount, 1);

  const errorsOnly = logger.getEntries('ERROR');
  assert.equal(errorsOnly.length, 1);
  assert.equal(errorsOnly[0].module, 'desk.render');
  assert.ok(errorsOnly[0].detail.stack.includes('Lỗi mẫu kiểm thử'));

  // Kiểm tra dữ liệu đã lưu xuống storage
  const raw = storage.getItem(LOG_STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.entries.length, 3);
});

test('logger: xuất định dạng văn bản formatLogText và JSON exportLogJson, hỗ trợ xoá log', () => {
  const storage = createMockStorage();
  const logger = createLogger(storage);

  logger.info('test', 'Bản ghi số 1');
  const txt = logger.formatLogText();
  assert.ok(txt.includes('PHIÊN GHI LOG HỆ THỐNG'));
  assert.ok(txt.includes('Bản ghi số 1'));

  const jsonStr = logger.exportLogJson();
  const jsonObj = JSON.parse(jsonStr);
  assert.equal(jsonObj.meta.totalEntries, 1);

  logger.clearLogs();
  // Sau khi clearLogs sẽ có 1 bản ghi INFO thông báo đã xoá
  assert.equal(logger.getSessionInfo().totalEntries, 1);
});
