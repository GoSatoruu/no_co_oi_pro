import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, SAVE_KEY, BACKUP_KEY, CORRUPT_KEY } from '../../frontend/js/services/store.js';

function createMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('store: khởi tạo và lưu nhiều phiên chơi (sessions)', () => {
  const mem = createMockStorage();
  const store = createStore(mem);

  const s1 = store.saveSession({
    id: 'SES-001',
    name: 'Phiên #1 - CTCP Đại Việt',
    modeId: 'normal',
    level: 1,
    score: 150,
  });

  assert.equal(s1.id, 'SES-001');
  assert.equal(store.getActiveSession().id, 'SES-001');

  const s2 = store.saveSession({
    id: 'SES-002',
    name: 'Phiên #2 - Palantir Pro',
    modeId: 'pro',
    level: 10,
    score: 450,
  });

  assert.equal(store.getActiveSession().id, 'SES-002');
  assert.equal(store.listSessions().length, 2);

  store.setActiveSession('SES-001');
  assert.equal(store.getActiveSession().id, 'SES-001');

  const copy = store.duplicateSession('SES-001', 'Bản sao Phiên #1');
  assert.ok(copy.id !== 'SES-001');
  assert.equal(copy.name, 'Bản sao Phiên #1');
  assert.equal(store.listSessions().length, 3);
});

test('store: hỏng JSON ở khóa chính tự động khôi phục từ bản dự phòng .bak và lưu vết .corrupt', () => {
  const mem = createMockStorage();
  const store = createStore(mem);

  store.saveSession({
    id: 'SES-SAFE-1',
    name: 'Phiên An Toàn 1',
    score: 100,
  });
  // Lưu lần 2 để bản lần 1 được đẩy vào .bak
  store.saveSession({
    id: 'SES-SAFE-1',
    name: 'Phiên An Toàn 1 (Cập nhật)',
    score: 300,
  });

  assert.ok(mem.getItem(BACKUP_KEY), 'Phải có bản sao lưu .bak');

  // Giả lập hỏng JSON ở khóa chính SAVE_KEY
  mem.setItem(SAVE_KEY, '{corrupted_json_string: 123,,,');

  const recovered = store.load();
  assert.equal(recovered.sessions.length, 1);
  assert.equal(recovered.sessions[0].id, 'SES-SAFE-1');
  assert.equal(mem.getItem(CORRUPT_KEY), '{corrupted_json_string: 123,,,');
});

test('store: nâng cấp schemaVersion từ v1 lên v2 qua bảng MIGRATIONS', () => {
  const mem = createMockStorage();
  mem.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      sessions: [{ id: 'SES-OLD', name: 'Phiên cũ v1', score: 90 }],
    })
  );

  const store = createStore(mem);
  const loaded = store.load();
  assert.equal(loaded.schemaVersion, 2);
  assert.equal(loaded.activeSessionId, 'SES-OLD');
  assert.equal(loaded.sessions[0].score, 90);
});
