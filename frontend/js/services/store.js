/**
 * STORE SERVICE — Lưu trữ trạng thái & Quản lý Phiên chơi (docs/02 §6, FE-002)
 * - Tiền tố khoá: `nocooi.save.v1` và bản dự phòng `nocooi.save.bak`.
 * - Hỗ trợ nâng cấp phiên bản dữ liệu (migrations).
 * - Không bao giờ xoá mất dữ liệu khi JSON hỏng: lưu bản hỏng sang `nocooi.save.corrupt` và khôi phục từ `nocooi.save.bak`.
 * - Quản lý danh sách toàn bộ các Phiên chơi (Sessions) để người chơi lưu, tiếp tục hoặc chuyển đổi bất kỳ lúc nào.
 */

export const SAVE_KEY = 'nocooi.save.v1';
export const BACKUP_KEY = 'nocooi.save.bak';
export const CORRUPT_KEY = 'nocooi.save.corrupt';
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Bảng hàm nâng cấp cấu trúc bản lưu qua các phiên bản.
 */
export const MIGRATIONS = {
  1: (oldState) => ({
    ...oldState,
    schemaVersion: 2,
    activeSessionId: oldState.activeSessionId ?? (oldState.sessions?.[0]?.id || null),
    sessions: Array.isArray(oldState.sessions) ? oldState.sessions : [],
    settings: {
      theme: 'dark',
      preferredMode: 'normal',
      ...(oldState.settings || {}),
    },
  }),
};

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function getDefaultStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Bị chặn trong môi trường sandbox / private mode
  }
  return createMemoryStorage();
}

export function createDefaultStoreData() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    activeSessionId: null,
    sessions: [],
    settings: {
      theme: 'dark',
      preferredMode: 'normal',
      llmConfig: {
        provider: 'offline_heuristic',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 800,
        persona: 'strategic_big4',
        customSystemPrompt: '',
      },
      uiConfig: {
        deviceProfile: 'auto', // 'auto' | 'desktop' | 'iphone13pro' | 'bbkey2'
        enablePhysicalKeyboard: true,
      },
    },
  };
}

export function migrateStoreData(data) {
  if (!data || typeof data !== 'object') {
    return createDefaultStoreData();
  }
  let current = { ...data };
  let ver = Number(current.schemaVersion) || 1;

  while (ver < CURRENT_SCHEMA_VERSION && typeof MIGRATIONS[ver] === 'function') {
    current = MIGRATIONS[ver](current);
    ver = Number(current.schemaVersion) || ver + 1;
  }

  current.schemaVersion = CURRENT_SCHEMA_VERSION;
  if (!Array.isArray(current.sessions)) current.sessions = [];
  if (!current.settings || typeof current.settings !== 'object') {
    current.settings = { theme: 'dark', preferredMode: 'normal' };
  }
  return current;
}

/**
 * Tạo đối tượng quản lý lưu trữ (Store).
 * @param {Storage} [customStorage] Bộ nhớ tuỳ chọn (dùng cho unit test trên Node)
 */
export function createStore(customStorage) {
  const storage = customStorage || getDefaultStorage();

  function load() {
    const rawMain = storage.getItem(SAVE_KEY);
    if (rawMain) {
      try {
        const parsed = JSON.parse(rawMain);
        if (parsed && typeof parsed === 'object') {
          return migrateStoreData(parsed);
        }
      } catch {
        // Lưu lại chuỗi hỏng để không mất dấu vết, sau đó khôi phục từ .bak
        try {
          storage.setItem(CORRUPT_KEY, rawMain);
        } catch {
          // Bỏ qua nếu đầy bộ nhớ
        }
      }
    }

    // Thử khôi phục từ bản dự phòng `.bak`
    const rawBak = storage.getItem(BACKUP_KEY);
    if (rawBak) {
      try {
        const parsedBak = JSON.parse(rawBak);
        if (parsedBak && typeof parsedBak === 'object') {
          const restored = migrateStoreData(parsedBak);
          try {
            storage.setItem(SAVE_KEY, JSON.stringify(restored));
          } catch {
            // Bỏ qua
          }
          return restored;
        }
      } catch {
        // Cả bản .bak cũng hỏng
      }
    }

    const fresh = createDefaultStoreData();
    return fresh;
  }

  function save(state) {
    const normalized = migrateStoreData(state);
    const prevRaw = storage.getItem(SAVE_KEY);
    if (prevRaw) {
      try {
        // Đảm bảo chỉ sao lưu vào .bak khi bản hiện tại là JSON hợp lệ
        JSON.parse(prevRaw);
        storage.setItem(BACKUP_KEY, prevRaw);
      } catch {
        // Không ghi đè .bak bằng JSON lỗi
      }
    }
    const serialized = JSON.stringify(normalized);
    storage.setItem(SAVE_KEY, serialized);
    return normalized;
  }

  function listSessions() {
    const data = load();
    return [...data.sessions].sort((a, b) => {
      const ta = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
      const tb = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
      return tb - ta;
    });
  }

  function getSession(sessionId) {
    if (!sessionId) return null;
    const data = load();
    return data.sessions.find((s) => s.id === sessionId) || null;
  }

  function getActiveSession() {
    const data = load();
    if (data.activeSessionId) {
      const found = data.sessions.find((s) => s.id === data.activeSessionId);
      if (found) return found;
    }
    const sorted = listSessions();
    return sorted[0] || null;
  }

  function saveSession(sessionRecord) {
    const data = load();
    const now = new Date().toISOString();
    const id = sessionRecord.id || `SES-${Date.now()}`;
    const idx = data.sessions.findIndex((s) => s.id === id);

    const record = {
      ...sessionRecord,
      id,
      createdAt: sessionRecord.createdAt || (idx >= 0 ? data.sessions[idx].createdAt : now),
      updatedAt: now,
    };

    if (idx >= 0) {
      data.sessions[idx] = record;
    } else {
      data.sessions.unshift(record);
    }

    // Giữ tối đa 25 phiên gần nhất để tránh tràn localStorage
    if (data.sessions.length > 25) {
      data.sessions = data.sessions.slice(0, 25);
    }

    data.activeSessionId = id;
    save(data);
    return record;
  }

  function setActiveSession(sessionId) {
    const data = load();
    if (data.sessions.some((s) => s.id === sessionId)) {
      data.activeSessionId = sessionId;
      save(data);
      return true;
    }
    return false;
  }

  function deleteSession(sessionId) {
    const data = load();
    data.sessions = data.sessions.filter((s) => s.id !== sessionId);
    if (data.activeSessionId === sessionId) {
      data.activeSessionId = data.sessions[0]?.id || null;
    }
    save(data);
    return data;
  }

  function duplicateSession(sessionId, customName) {
    const src = getSession(sessionId);
    if (!src) return null;
    const now = new Date().toISOString();
    const clone = JSON.parse(JSON.stringify(src));
    clone.id = `SES-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    clone.name = customName || `${src.name} (Bản sao)`;
    clone.createdAt = now;
    clone.updatedAt = now;
    return saveSession(clone);
  }

  function getSettings() {
    const data = load();
    return data.settings || { theme: 'dark', preferredMode: 'normal' };
  }

  function updateSettings(patch = {}) {
    const data = load();
    data.settings = { ...(data.settings || {}), ...patch };
    save(data);
    return data.settings;
  }

  return {
    load,
    save,
    listSessions,
    getSession,
    getActiveSession,
    saveSession,
    setActiveSession,
    deleteSession,
    duplicateSession,
    getSettings,
    updateSettings,
  };
}

export const defaultStore = createStore();
