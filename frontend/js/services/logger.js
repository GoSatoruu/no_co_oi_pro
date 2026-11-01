/**
 * SYSTEM DIAGNOSTIC & CRASH LOGGER SERVICE — Nợ Có Ơi Pro // Enterprise Financial OS
 * Quản lý Phiên Ghi Log (Log Session) để theo dõi khởi tạo, bắt toàn bộ lỗi runtime/promise,
 * lưu vết vào localStorage (`nocooi.logs.v1`), đồng bộ về dev server (`/__client_log` nếu có)
 * và hiển thị Bảng Chẩn đoán & Khắc phục Lỗi trực tiếp trên giao diện.
 */

export const LOG_STORAGE_KEY = 'nocooi.logs.v1';
const MAX_LOG_ENTRIES = 150;

function generateLogSessionId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const hms = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
  const rnd = String(Math.floor(Math.random() * 900 + 100));
  return `LOGSES-${ymd}-${hms}-${rnd}`;
}

function getStorageSafe() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Bỏ qua nếu bị chặn
  }
  return null;
}

function serializeDetail(errOrDetail) {
  if (!errOrDetail) return null;
  if (errOrDetail instanceof Error) {
    return {
      isError: true,
      name: errOrDetail.name || 'Error',
      message: errOrDetail.message || String(errOrDetail),
      stack: errOrDetail.stack || '',
    };
  }
  if (typeof errOrDetail === 'object') {
    try {
      if (errOrDetail.error instanceof Error) {
        return {
          ...errOrDetail,
          error: {
            name: errOrDetail.error.name,
            message: errOrDetail.error.message,
            stack: errOrDetail.error.stack || '',
          },
        };
      }
      return JSON.parse(JSON.stringify(errOrDetail));
    } catch {
      return { raw: String(errOrDetail) };
    }
  }
  return { value: String(errOrDetail) };
}

export function createLogger(customStorage) {
  const storage = customStorage || getStorageSafe();
  const logSessionId = generateLogSessionId();
  const startedAt = new Date().toISOString();
  let seq = 0;
  let memoryEntries = [];

  // Khôi phục lịch sử log từ localStorage
  if (storage) {
    try {
      const raw = storage.getItem(LOG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.entries)) {
          memoryEntries = parsed.entries.slice(-MAX_LOG_ENTRIES);
          seq = memoryEntries.length;
        }
      }
    } catch {
      memoryEntries = [];
    }
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(
        LOG_STORAGE_KEY,
        JSON.stringify({
          lastSessionId: logSessionId,
          updatedAt: new Date().toISOString(),
          entries: memoryEntries.slice(-MAX_LOG_ENTRIES),
        })
      );
    } catch {
      // Bỏ qua nếu tràn quota
    }
  }

  function sendToDevServer(entry) {
    try {
      if (typeof fetch === 'function' && typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
        fetch('/__client_log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {});
      }
    } catch {
      // Bỏ qua hoàn toàn khi chơi offline
    }
  }

  function record(level, moduleName, message, errOrDetail = null) {
    seq += 1;
    const now = new Date();
    const timeStr = `${now.toLocaleTimeString('vi-VN')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const detail = serializeDetail(errOrDetail);

    const entry = {
      id: `LOG-${String(seq).padStart(4, '0')}`,
      sessionId: logSessionId,
      timestamp: now.toISOString(),
      timeStr,
      level,
      module: moduleName || 'app',
      message: String(message || ''),
      detail,
      url: typeof window !== 'undefined' ? window.location?.href : 'node',
    };

    memoryEntries.push(entry);
    if (memoryEntries.length > MAX_LOG_ENTRIES) {
      memoryEntries = memoryEntries.slice(-MAX_LOG_ENTRIES);
    }

    persist();
    sendToDevServer(entry);
    return entry;
  }

  function info(moduleName, message, detail) {
    return record('INFO', moduleName, message, detail);
  }

  function warn(moduleName, message, detail) {
    return record('WARN', moduleName, message, detail);
  }

  function error(moduleName, message, errOrDetail) {
    return record('ERROR', moduleName, message, errOrDetail);
  }

  function fatal(moduleName, message, errOrDetail) {
    return record('FATAL', moduleName, message, errOrDetail);
  }

  function getEntries(filterLevel = 'ALL') {
    const list = [...memoryEntries].reverse();
    if (!filterLevel || filterLevel === 'ALL') return list;
    if (filterLevel === 'ERROR') {
      return list.filter((e) => e.level === 'ERROR' || e.level === 'FATAL');
    }
    return list.filter((e) => e.level === filterLevel);
  }

  function getSessionInfo() {
    const errorCount = memoryEntries.filter((e) => e.level === 'ERROR' || e.level === 'FATAL').length;
    const warnCount = memoryEntries.filter((e) => e.level === 'WARN').length;
    return {
      logSessionId,
      startedAt,
      totalEntries: memoryEntries.length,
      errorCount,
      warnCount,
    };
  }

  function clearLogs() {
    memoryEntries = [];
    seq = 0;
    persist();
    record('INFO', 'logger', 'Đã xoá lịch sử phiên ghi log và khởi tạo lại bộ đếm.');
  }

  function formatLogText() {
    const infoMeta = getSessionInfo();
    const lines = [
      `=== PHIÊN GHI LOG HỆ THỐNG — NỢ CÓ ƠI PRO ===`,
      `Mã phiên Log : ${infoMeta.logSessionId}`,
      `Khởi tạo lúc : ${infoMeta.startedAt}`,
      `Tổng số bản ghi: ${infoMeta.totalEntries} (Lỗi: ${infoMeta.errorCount}, Cảnh báo: ${infoMeta.warnCount})`,
      `================================================`,
      '',
    ];
    for (const e of memoryEntries) {
      lines.push(`[${e.timeStr}] [${e.level}] [${e.module}] (${e.sessionId}) ${e.message}`);
      if (e.detail) {
        if (e.detail.stack) {
          lines.push(`  ↳ Stack: ${e.detail.stack}`);
        } else {
          lines.push(`  ↳ Detail: ${JSON.stringify(e.detail)}`);
        }
      }
    }
    return lines.join('\n');
  }

  function exportLogJson() {
    return JSON.stringify(
      {
        meta: getSessionInfo(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
        entries: memoryEntries,
      },
      null,
      2
    );
  }

  return {
    logSessionId,
    record,
    info,
    warn,
    error,
    fatal,
    getEntries,
    getSessionInfo,
    clearLogs,
    formatLogText,
    exportLogJson,
  };
}

export const defaultLogger = createLogger();

let globalHooksInstalled = false;
export function installGlobalErrorHandlers(logger = defaultLogger) {
  if (globalHooksInstalled || typeof window === 'undefined') return;
  globalHooksInstalled = true;

  window.addEventListener('error', (event) => {
    logger.fatal('window.onerror', event.message || 'Lỗi Runtime không xác định', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack || '',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logger.error(
      'window.unhandledrejection',
      reason?.message || String(reason || 'Unhandled Promise Rejection'),
      reason instanceof Error ? reason : { reason: String(reason) }
    );
  });
}
