/**
 * BÀN ĐIỀU HÀNH CHÍNH THỨC — Nợ Có Ơi Pro // Enterprise Financial OS & Palantir Foundry Dashboard
 * Nguồn sự thật: ADR-014, CORE-014, CORE-015, CORE-016, FE-002, FE-022, FE-023, FE-024
 * - Mở thẳng Bàn Chính thức, tự động lưu & khôi phục mỗi phiên chơi qua `services/store.js`.
 * - Chứng từ kế toán và sự kiện Lệnh chi / Thông báo thu dạng Tin nhắn Slack thời gian thực từ các NPC.
 * - Có âm thanh thông báo Slack Knock / Ping / Gửi tin / Phản hồi / Hạch toán qua Web Audio API thuần (`ui/sound.js`).
 * - Bảng Tin nhắn Trả lời NPC tương tác đa phương án: quyết định của người chơi tác động trực tiếp lên Sổ cái.
 * - Cân đối Nguồn tiền Doanh nghiệp (Treasury: 111, 112, 131, 331, 3331, 341).
 * - Bảng Cân đối Tài khoản Tổng (Master Trial Balance 6 cột, Tài sản = Nguồn vốn, kết chuyển 911 ➔ 421).
 * - Tư vấn Chiến lược CFO Thế giới mở (Open-World Strategic Advisory).
 */
import { loadBundle } from '../services/content.js?v=20261101_v3';
import { defaultStore } from '../services/store.js?v=20261101_v3';
import { defaultLogger } from '../services/logger.js?v=20261101_v3';
import { buildShift, gradeInspect, gradeEntry } from '../core/shift.js?v=20261101_v3';
import {
  createFinanceState,
  computeMetrics,
  recordLedgerLines,
  executeAdvisory,
  decoratePushVoucher,
  analyzeCashSources,
  executeCashRebalance,
  computeMasterAccountBalance,
  executeClosingEntries,
  spawnRandomSlackEvent,
  replyToNpcEvent,
  replyToVoucherSlack,
  ADVISORY_CATALOG,
  CASH_REBALANCE_ACTIONS,
  NPC_DIRECTORY,
  BUSINESS_SECTORS_CATALOG,
  expandBusinessSector,
  harvestSectorCycle,
  buildCfoContextSnapshot,
} from '../core/finance.js?v=20261101_v3';
import {
  DEFAULT_LLM_CONFIG,
  CFO_PERSONAS,
  askCfoAdvisor,
  testLlmConnection,
} from '../services/llm-cfo.js?v=20261101_v3';
import {
  playSlackKnock,
  playSlackSend,
  playSlackReply,
  playSuccessLedger,
  playAlertBuzzer,
  isSoundEnabled,
  toggleSound,
} from '../ui/sound.js?v=20261101_v3';

let timer = null;
let screenRoot = null;
let keydownHandler = null;

export function mount(root, params, ctx) {
  const logger = ctx?.logger || defaultLogger;
  logger.info('desk.mount', 'Bắt đầu mount Bàn Điều hành Chính thức', { params });
  root.replaceChildren(note('◈ Đang khởi tạo Bàn Điều hành Tài chính Doanh nghiệp Chính thức & Khôi phục Phiên lưu…'));
  loadBundle()
    .then((bundle) => {
      logger.info('desk.mount', `Nạp gói nội dung thành công (${bundle.accounts?.length || 0} tài khoản, ${bundle.templates?.length || 0} mẫu chứng từ)`);
      play(root, bundle, params, ctx);
    })
    .catch((err) => {
      console.error('Lỗi khi mở hệ thống:', err);
      logger.fatal('desk.mount', `Lỗi khi khởi tạo hệ thống: ${err?.message || String(err)}`, err);
      root.replaceChildren(renderCrashDiagnosticScreen(root, err, params, ctx));
    });
}

export function unmount() {
  clearInterval(timer);
  timer = null;
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
}

const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;
const vndShort = (n) => {
  const abs = Math.abs(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)} tỷ`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)} tr`;
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
};

const el = (tag, cls, textOrChildren) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (textOrChildren != null) {
    if (typeof textOrChildren === 'string' || typeof textOrChildren === 'number') {
      n.textContent = String(textOrChildren);
    } else if (textOrChildren instanceof Node) {
      n.append(textOrChildren);
    } else if (Array.isArray(textOrChildren)) {
      n.append(...textOrChildren.filter(Boolean));
    }
  }
  return n;
};

const note = (text) => {
  const d = el('div', 'paper paper--flat', text);
  d.style.cssText =
    'padding: 24px; text-align: center; max-width: 640px; margin: 40px auto; font-family: var(--font-mono);';
  return d;
};

function generateSessionId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = String(Math.floor(Math.random() * 900 + 100));
  return `SES-${ymd}-${rnd}`;
}

function safeGetSettings(store) {
  if (typeof store?.getSettings === 'function') {
    return store.getSettings();
  }
  const data = typeof store?.load === 'function' ? store.load() : null;
  return data?.settings || { theme: 'dark', preferredMode: 'pro' };
}

function safeUpdateSettings(store, patch = {}) {
  if (typeof store?.updateSettings === 'function') {
    return store.updateSettings(patch);
  }
  if (typeof store?.load === 'function' && typeof store?.save === 'function') {
    const data = store.load();
    data.settings = { ...(data.settings || {}), ...patch };
    store.save(data);
    return data.settings;
  }
  return patch;
}

function sanitizeState(s, bundle) {
  if (!s) return;
  if (!s.fin) {
    s.fin = createFinanceState(bundle, { level: s.level || 5, modeId: s.mode?.id || 'pro' });
  }
  const fin = s.fin;
  if (!fin.balances || typeof fin.balances !== 'object') fin.balances = {};
  if (!fin.openingBalances || typeof fin.openingBalances !== 'object') fin.openingBalances = { ...fin.balances };
  if (!fin.turnovers || typeof fin.turnovers !== 'object') fin.turnovers = {};
  if (!Array.isArray(fin.enactedAdvisories)) fin.enactedAdvisories = [];
  if (!Array.isArray(fin.journal)) fin.journal = [];
  if (!Array.isArray(fin.reconciliations)) fin.reconciliations = [];
  if (!Array.isArray(fin.slackEvents)) fin.slackEvents = [];
  if (typeof fin.complianceScore !== 'number') fin.complianceScore = 100;
  if (typeof fin.postedRevenue !== 'number') fin.postedRevenue = 0;
  if (typeof fin.postedCogs !== 'number') fin.postedCogs = 0;
  if (typeof fin.postedOpex !== 'number') fin.postedOpex = 0;
  if (typeof fin.baseRevenue !== 'number') fin.baseRevenue = 120000000;
  if (typeof fin.baseCogs !== 'number') fin.baseCogs = 62000000;
  if (typeof fin.baseOpex !== 'number') fin.baseOpex = 23000000;

  if (!Array.isArray(fin.sectors) || fin.sectors.length === 0) {
    fin.sectors = [
      {
        instanceId: 'sec_retail_01',
        sectorId: 'RETAIL_FMCG',
        name: 'Công ty Cổ phần Bán lẻ Tiêu dùng Đại Việt',
        code: 'RETAIL',
        icon: '🛒',
        channel: '#retail-sieu-thi',
        capexAmount: 500000000,
        expectedRoiPct: 18,
        riskLevel: 'LOW',
        status: 'ACTIVE',
        cycleCount: 1,
        totalRevenueGenerated: fin.baseRevenue,
        totalProfitGenerated: fin.baseRevenue - fin.baseCogs - fin.baseOpex,
        description: 'Mảng kinh doanh tiêu dùng & nội thất cốt lõi, tạo dòng tiền đều đặn.',
      },
    ];
  }

  if (!Array.isArray(fin.telemetry) || fin.telemetry.length === 0) {
    fin.telemetry = [
      { label: 'Kỳ T-3', revenue: 85000000, profit: 18000000, liquidity: 460000000 },
      { label: 'Kỳ T-2', revenue: 98000000, profit: 24000000, liquidity: 495000000 },
      { label: 'Kỳ T-1', revenue: 110000000, profit: 29000000, liquidity: 515000000 },
      {
        label: 'Đầu kỳ',
        revenue: fin.baseRevenue,
        profit: fin.baseRevenue - fin.baseCogs - fin.baseOpex,
        liquidity: (fin.balances['111'] ?? 0) + (fin.balances['112'] ?? 0),
      },
    ];
  }

  if (fin.slackEvents.length === 0) {
    try {
      spawnRandomSlackEvent(fin, `seed-init-${Date.now()}-1`);
      spawnRandomSlackEvent(fin, `seed-init-${Date.now()}-2`);
    } catch {
      // Bỏ qua nếu lỗi sinh sự kiện mẫu
    }
  }

  if (Array.isArray(s.stream)) {
    s.stream.forEach((doc, idx) => {
      if (!doc.push) {
        doc.push = decoratePushVoucher(doc, idx);
      }
      if (!Array.isArray(doc.amountChoices)) {
        doc.amountChoices = [doc.push?.shownTotal || 10000000];
      }
      if (!Array.isArray(doc.truth)) {
        doc.truth = [];
      }
      if (!Array.isArray(doc.fields)) {
        doc.fields = [];
      }
    });
  } else {
    s.stream = [];
  }

  if (!Array.isArray(s.accounts) || s.accounts.length === 0) {
    s.accounts = ['111', '112', '131', '1331', '156', '331', '3331', '511', '632', '642'];
  }

  if (!Array.isArray(s.cfoChatHistory)) {
    s.cfoChatHistory = [];
  }

  if (!s.selectedSlackId && fin.slackEvents && fin.slackEvents[0]) {
    s.selectedSlackId = fin.slackEvents[0].id;
  }
}

function play(root, bundle, params = {}, ctx = {}) {
  screenRoot = root;
  const store = ctx.store || defaultStore;
  const names = Object.fromEntries(bundle.accounts.map((a) => [a.code, a.name]));
  const known = new Set(bundle.accounts.map((a) => a.code));

  let savedSession = null;
  if (!params.newSession) {
    if (params.sessionId) {
      savedSession = store.getSession(params.sessionId);
    }
    if (!savedSession) {
      savedSession = store.getActiveSession();
    }
  }

  let s;
  if (savedSession && savedSession.fin && Array.isArray(savedSession.stream)) {
    const modeId = savedSession.modeId || params.mode || 'pro';
    const mode = bundle.modes.find((m) => m.id === modeId) ?? bundle.modes[0];
    const level = Number(savedSession.level) || 5;

    if (mode.id === 'pro') {
      document.documentElement.setAttribute('data-mode', 'pro');
    } else {
      document.documentElement.removeAttribute('data-mode');
    }

    s = {
      bundle,
      store,
      mode,
      names,
      known,
      ctx,
      sessionId: savedSession.id,
      sessionName: savedSession.name || 'CTCP ĐẠI VIỆT — Phiên Chính thức',
      createdAt: savedSession.createdAt,
      lastSavedTime: savedSession.updatedAt ? new Date(savedSession.updatedAt).toLocaleTimeString('vi-VN') : 'Vừa xong',
      level,
      fin: savedSession.fin,
      accounts: savedSession.accounts || ['111', '112', '131', '1331', '156', '331', '3331', '511', '632', '642'],
      stream: savedSession.stream,
      selectedIdx: Number(savedSession.selectedIdx) || 0,
      activeTab: savedSession.activeTab || 'workstation', // 'workstation' | 'slack_chat' | 'treasury' | 'master_accounts' | 'advisory'
      selectedSlackId: savedSession.selectedSlackId || savedSession.fin?.slackEvents?.[0]?.id || null,
      activeSlackChannel: 'all',
      score: Number(savedSession.score) || 0,
      ok: Number(savedSession.ok) || 0,
      bad: Number(savedSession.bad) || 0,
      lines: [],
      account: null,
      amount: null,
      treasuryAction: 'DEPOSIT_BANK',
      treasuryAmount: 20000000,
      showSessionDrawer: false,
      feedback: null,
      toast: `💾 Đã khôi phục phiên làm việc [${savedSession.id}] (${savedSession.name})`,
      streamWave: Number(savedSession.streamWave) || 1,
      elapsedSec: Number(savedSession.elapsedSec) || 0,
      showCfoModal: false,
      showSettingsModal: false,
      cfoChatHistory: Array.isArray(savedSession.cfoChatHistory) ? savedSession.cfoChatHistory : [],
      isCfoThinking: false,
      selectedSectorCatalogId: 'TECH_CLOUD_AI',
      customSectorForm: {
        name: 'Công nghệ AI & Robot Tự hành',
        code: 'AI_ROBOT',
        icon: '🤖',
        capexAmount: 250000000,
        expectedRoiPct: 35,
        riskLevel: 'HIGH',
        description: 'Phát triển giải pháp tự động hóa và ứng dụng AI cho các doanh nghiệp B2B.',
      },
      sectorFundingMode: 'CASH_112',
      llmConfig: safeGetSettings(store)?.llmConfig || { ...DEFAULT_LLM_CONFIG },
      deviceProfile: safeGetSettings(store)?.uiConfig?.deviceProfile || 'auto',
    };
  } else {
    const modeId = params.mode || 'pro';
    const mode = bundle.modes.find((m) => m.id === modeId) ?? bundle.modes[0];
    const level = Number(params?.level) || (modeId === 'pro' ? 5 : 1);

    if (mode.id === 'pro') {
      document.documentElement.setAttribute('data-mode', 'pro');
    } else {
      document.documentElement.removeAttribute('data-mode');
    }

    const initialShift = buildShift(bundle, { seed: Date.now(), modeId: mode.id, level });
    const pushStream = initialShift.docs.map((doc, idx) => ({
      ...doc,
      push: decoratePushVoucher(doc, idx),
    }));

    const fin = createFinanceState(bundle, { level, modeId: mode.id, seed: `init-${Date.now()}` });
    const existingCount = store.listSessions().length;
    const sessionId = generateSessionId();
    const sessionName = params.sessionName || `CTCP ĐẠI VIỆT · Phiên #${existingCount + 1}`;

    s = {
      bundle,
      store,
      mode,
      names,
      known,
      ctx,
      sessionId,
      sessionName,
      createdAt: new Date().toISOString(),
      lastSavedTime: new Date().toLocaleTimeString('vi-VN'),
      level,
      fin,
      accounts: initialShift.accounts,
      stream: pushStream,
      selectedIdx: 0,
      activeTab: 'workstation',
      selectedSlackId: fin.slackEvents?.[0]?.id || null,
      activeSlackChannel: 'all',
      score: 0,
      ok: 0,
      bad: 0,
      lines: [],
      account: null,
      amount: null,
      treasuryAction: 'DEPOSIT_BANK',
      treasuryAmount: 20000000,
      showSessionDrawer: false,
      feedback: null,
      toast: `🔔 Khởi tạo phiên chính thức [${sessionId}] · Có tin nhắn Slack & chứng từ mới chờ duyệt`,
      streamWave: 1,
      elapsedSec: 0,
      showCfoModal: false,
      showSettingsModal: false,
      cfoChatHistory: [],
      isCfoThinking: false,
      selectedSectorCatalogId: 'TECH_CLOUD_AI',
      customSectorForm: {
        name: 'Công nghệ AI & Robot Tự hành',
        code: 'AI_ROBOT',
        icon: '🤖',
        capexAmount: 250000000,
        expectedRoiPct: 35,
        riskLevel: 'HIGH',
        description: 'Phát triển giải pháp tự động hóa và ứng dụng AI cho các doanh nghiệp B2B.',
      },
      sectorFundingMode: 'CASH_112',
      llmConfig: safeGetSettings(store)?.llmConfig || { ...DEFAULT_LLM_CONFIG },
      deviceProfile: safeGetSettings(store)?.uiConfig?.deviceProfile || 'auto',
    };

    persistCurrentSession(s);
  }

  s.logger = ctx?.logger || defaultLogger;
  s.showLogModal = false;
  s.logFilterLevel = 'ALL';

  // Chuẩn hoá và nâng cấp trạng thái phiên để tương thích ngược 100% với các session cũ
  try {
    sanitizeState(s, bundle);
    persistCurrentSession(s);
    s.logger.info('desk.play', `Đã sẵn sàng phiên làm việc [${s.sessionId}] (${s.sessionName})`, {
      sessionId: s.sessionId,
      mode: s.mode?.id,
      level: s.level,
      streamCount: s.stream?.length || 0,
      sectorsCount: s.fin?.sectors?.length || 0,
    });
  } catch (sanitizeErr) {
    s.logger.error('desk.autoHeal', 'Phát hiện lỗi tương thích ở dữ liệu phiên cũ, tự động phục hồi (Auto-Heal) về trạng thái chuẩn', sanitizeErr);
    s.fin = createFinanceState(bundle, { level: s.level || 5, modeId: s.mode?.id || 'pro', seed: `heal-${Date.now()}` });
    const healShift = buildShift(bundle, { seed: Date.now(), modeId: s.mode?.id || 'pro', level: s.level || 5 });
    s.stream = healShift.docs.map((doc, idx) => ({ ...doc, push: decoratePushVoucher(doc, idx) }));
    sanitizeState(s, bundle);
    persistCurrentSession(s);
  }

  // Áp dụng cấu hình giao diện thiết bị (BlackBerry Key2, iPhone 13 Pro, hoặc Tự động)
  if (s.deviceProfile === 'bbkey2') {
    document.documentElement.setAttribute('data-device', 'bbkey2');
  } else if (s.deviceProfile === 'iphone13pro') {
    document.documentElement.setAttribute('data-device', 'iphone13pro');
  } else {
    document.documentElement.removeAttribute('data-device');
  }

  // Khởi động đồng hồ thời gian thực & sinh sự kiện ngẫu nhiên theo chu kỳ (mỗi 45s)
  clearInterval(timer);
  timer = setInterval(() => {
    s.elapsedSec += 1;
    const clockEl = document.getElementById('erp-live-clock');
    if (clockEl) {
      const hh = String(8 + Math.floor(s.elapsedSec / 3600)).padStart(2, '0');
      const mm = String(15 + Math.floor((s.elapsedSec % 3600) / 60)).padStart(2, '0');
      const ss = String(s.elapsedSec % 60).padStart(2, '0');
      clockEl.textContent = `${hh}:${mm}:${ss} ICT`;
    }

    // Mỗi 45 giây tự động kích hoạt 1 sự kiện ngẫu nhiên mới nếu chưa có quá 5 sự kiện chờ
    if (s.elapsedSec % 45 === 0) {
      const pendingCount = (s.fin.slackEvents || []).filter((e) => e.status === 'PENDING').length;
      if (pendingCount < 5) {
        const ev = spawnRandomSlackEvent(s.fin, `auto-tick-${Date.now()}`);
        playSlackKnock();
        s.toast = `💬 [Slack] Tin nhắn mới từ ${ev.npc.name} (${ev.channel}): ${ev.title}`;
        persistCurrentSession(s);
        render(screenRoot, s);
      }
    }
  }, 1000);

  render(root, s);
}

function persistCurrentSession(s) {
  if (!s || !s.store) return;
  const m = computeMetrics(s.fin);
  const tb = computeMasterAccountBalance(s.fin, s.bundle?.accounts || []);
  const nowTime = new Date().toLocaleTimeString('vi-VN');
  s.lastSavedTime = nowTime;

  s.store.saveSession({
    id: s.sessionId,
    name: s.sessionName,
    createdAt: s.createdAt,
    modeId: s.mode.id,
    level: s.level,
    score: s.score,
    ok: s.ok,
    bad: s.bad,
    elapsedSec: s.elapsedSec,
    streamWave: s.streamWave,
    selectedIdx: s.selectedIdx,
    selectedSlackId: s.selectedSlackId,
    activeTab: s.activeTab,
    accounts: s.accounts,
    stream: s.stream,
    cfoChatHistory: s.cfoChatHistory,
    fin: s.fin,
    summary: {
      revenue: m.revenue,
      netProfit: m.netProfit,
      liquidity: m.liquidity,
      totalAssets: tb.balanceSheet.totalAssets,
      journalCount: s.fin.journal?.length || 0,
    },
  });
}

function pushMoreVouchers(s) {
  s.streamWave += 1;
  const moreShift = buildShift(s.bundle, {
    seed: Date.now() + s.streamWave * 997,
    modeId: s.mode.id,
    level: s.level,
  });

  const mergedAcc = new Set([...s.accounts, ...moreShift.accounts]);
  s.accounts = [...mergedAcc];

  const baseNo = s.stream.length;
  const newItems = moreShift.docs.map((doc, idx) => {
    const numbered = { ...doc, no: baseNo + idx + 1 };
    return {
      ...numbered,
      push: decoratePushVoucher(numbered, baseNo + idx),
    };
  });

  s.stream.unshift(...newItems);
  s.selectedIdx = 0;
  s.lines = [];
  s.account = null;
  s.amount = null;
  playSlackKnock();
  s.toast = `⚡ Đã nhận thêm ${newItems.length} thông báo chứng từ Push mới và lưu vào phiên [${s.sessionId}]!`;
  s.feedback = {
    type: 'info',
    title: 'LUỒNG THÔNG BÁO PUSH ĐÃ CẬP NHẬT',
    message: `${newItems.length} chứng từ phát sinh mới vừa được đẩy về hệ thống ERP từ các bộ phận vận hành.`,
  };
  persistCurrentSession(s);
  render(screenRoot, s);
}

function pushMoreSlackEvent(s) {
  const ev = spawnRandomSlackEvent(s.fin, `manual-${Date.now()}`);
  s.selectedSlackId = ev.id;
  s.activeTab = 'slack_chat';
  playSlackKnock();
  s.toast = `💬 [Slack] Tin nhắn mới từ ${ev.npc.name} (${ev.channel}): ${ev.title}`;
  s.feedback = {
    type: 'info',
    title: `💬 SỰ KIỆN SLACK MỚI: ${ev.orderType}`,
    message: `${ev.npc.name} (${ev.npc.role}) vừa gửi tin nhắn cần bạn cho ý kiến xử lý trên kênh ${ev.channel}.`,
  };
  persistCurrentSession(s);
  render(screenRoot, s);
}

function switchModeLive(s, nextModeId) {
  const nextMode = s.bundle.modes.find((m) => m.id === nextModeId);
  if (!nextMode) return;
  s.mode = nextMode;
  s.fin.modeId = nextModeId;
  if (nextModeId === 'pro') {
    document.documentElement.setAttribute('data-mode', 'pro');
  } else {
    document.documentElement.removeAttribute('data-mode');
  }
  s.toast =
    nextModeId === 'pro'
      ? '◈ Đã kích hoạt giao diện chiến thuật PALANTIR FOUNDRY PRO TELEMETRY'
      : '◈ Đã chuyển sang giao diện ERP Enterprise Standard';
  persistCurrentSession(s);
  render(screenRoot, s);
}

function safeRenderSection(s, sectionName, builderFn) {
  try {
    return builderFn();
  } catch (err) {
    const logger = s?.logger || defaultLogger;
    logger.error(`desk.render.${sectionName}`, `Lỗi khi vẽ phân hệ [${sectionName}]: ${err?.message || String(err)}`, err);
    const errBox = el('div', 'pal-panel');
    errBox.style.cssText = 'margin: 10px; padding: 14px; background: rgba(244,63,94,0.12); border: 1px solid #F43F5E; border-left: 4px solid #F43F5E; border-radius: 4px; color: #F8FAFC; font-family: var(--font-mono); font-size: 11px;';
    const title = el('div', '', `⚠️ LỖI HIỂN THỊ PHÂN HỆ [${sectionName}]: ${err?.message || String(err)}`);
    title.style.cssText = 'font-weight: 800; color: #FDA4AF; margin-bottom: 6px;';
    const pre = el('pre', '', err?.stack || String(err));
    pre.style.cssText = 'margin: 6px 0; padding: 8px; background: #070B11; color: #94A3B8; font-size: 10px; overflow-x: auto; border-radius: 3px; white-space: pre-wrap;';
    const btnRow = el('div', '');
    btnRow.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;';
    const openLogBtn = el('button', 'btn btn--ballpoint', '📋 Mở Phiên Ghi Log');
    openLogBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-size: 11px;';
    openLogBtn.addEventListener('click', () => {
      s.showLogModal = true;
      render(screenRoot, s);
    });
    const resetBtn = el('button', 'btn btn--ghost', '🔄 Tạo Phiên Mới Sạch');
    resetBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-size: 11px; border: 1px solid #38BDF8; color: #38BDF8;';
    resetBtn.addEventListener('click', () => {
      mount(screenRoot, { newSession: true, mode: 'pro', level: 5 }, s.ctx);
    });
    btnRow.append(openLogBtn, resetBtn);
    errBox.append(title, pre, btnRow);
    return errBox;
  }
}

function render(root, s) {
  root.replaceChildren();
  const isPro = s.mode?.id === 'pro';

  // Lắng nghe phím tắt vật lý cho BlackBerry Key2 và Desktop
  setupKeydownAndHeaderListeners(s);

  const shell = el('div', 'erp-shell');
  shell.style.cssText = `
    width: 100%;
    min-height: calc(100vh - 48px);
    background: ${isPro ? '#070B11' : '#0F172A'};
    color: #E2E8F0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding-bottom: 74px; /* khoảng trống cho bottom nav bar trên mobile */
  `;

  shell.append(safeRenderSection(s, 'CommandSubBar', () => renderCommandSubBar(s, isPro)));

  if (s.showSessionDrawer) {
    shell.append(safeRenderSection(s, 'SessionDrawer', () => renderSessionManagerDrawer(s, isPro)));
  }

  shell.append(safeRenderSection(s, 'KpiRibbon', () => renderKpiRibbon(s, isPro)));

  const workspace = el('div', 'erp-workspace');
  workspace.append(
    safeRenderSection(s, 'LeftPushStream', () => renderLeftPushStream(s, isPro)),
    safeRenderSection(s, 'CenterWorkstation', () => renderCenterWorkstation(s, isPro)),
    safeRenderSection(s, 'RightTelemetryPanel', () => renderRightTelemetryPanel(s, isPro))
  );
  shell.append(workspace);

  // Modal AI CFO nếu đang mở
  if (s.showCfoModal) {
    shell.append(safeRenderSection(s, 'CfoModal', () => renderCfoModal(s, isPro)));
  }

  // Modal Cài đặt LLM & Thiết bị nếu đang mở
  if (s.showSettingsModal) {
    shell.append(safeRenderSection(s, 'SettingsModal', () => renderSettingsModal(s, isPro)));
  }

  // Modal Phiên Ghi Log Hệ thống nếu đang mở
  if (s.showLogModal) {
    shell.append(safeRenderSection(s, 'LogModal', () => renderLogModal(s, isPro)));
  }

  // Mobile Bottom Navigation Bar (iPhone 13 Pro & di động)
  shell.append(safeRenderSection(s, 'MobileBottomNav', () => renderMobileBottomNav(s)));

  root.append(shell);
}

// ============================================================================
// 1. THANH COMMAND SUB-BAR & ÂM THANH SLACK
// ============================================================================
function renderCommandSubBar(s, isPro) {
  const bar = el('div', '');
  bar.style.cssText = `
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
    padding: 8px 16px; background: ${isPro ? '#0B111C' : '#1E293B'};
    border-bottom: 1px solid ${isPro ? '#1E293B' : '#334155'};
    font-size: 12px;
  `;

  const left = el('div', '');
  left.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;';

  const modeBadge = el(
    'span',
    '',
    isPro ? '◈ BÀN CHÍNH THỨC // PALANTIR PRO' : '◈ BÀN CHÍNH THỨC // ERP STANDARD'
  );
  modeBadge.style.cssText = `
    font-family: var(--font-mono); font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 3px;
    background: ${isPro ? 'rgba(56, 189, 248, 0.16)' : 'rgba(96, 165, 250, 0.2)'};
    color: ${isPro ? '#38BDF8' : '#93C5FD'};
    border: 1px solid ${isPro ? '#38BDF8' : '#60A5FA'};
  `;

  const sesBadge = el('span', '', `💾 ${s.sessionId} · ${s.sessionName} (Cấp ${s.level})`);
  sesBadge.style.cssText =
    'font-family: var(--font-mono); font-weight: 800; color: #F8FAFC; font-size: 11px; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 3px;';

  const saveIndicator = el('span', '', `✓ Tự động lưu: ${s.lastSavedTime}`);
  saveIndicator.style.cssText =
    'font-family: var(--font-mono); font-size: 10px; color: #34D399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); padding: 2px 7px; border-radius: 3px;';

  const clock = el('span', '', '08:15:00 ICT');
  clock.id = 'erp-live-clock';
  clock.style.cssText =
    'font-family: var(--font-mono); font-size: 11px; color: #94A3B8; padding: 2px 6px;';

  left.append(modeBadge, sesBadge, saveIndicator, clock);

  const toastEl = el('div', '', s.toast || '');
  toastEl.style.cssText =
    'font-size: 12px; color: #FDE047; font-weight: 600; display: flex; align-items: center; gap: 6px;';

  const right = el('div', '');
  right.style.cssText = 'display: flex; align-items: center; gap: 6px; flex-wrap: wrap;';

  // Nút Mở AI CFO
  const cfoBtn = el('button', 'btn btn--ballpoint', '');
  cfoBtn.innerHTML = '<span class="bb-key-hint">[C]</span> 🧠 AI CFO';
  cfoBtn.style.cssText = `
    min-height: 28px; padding: 2px 10px; font-size: 11px; font-family: var(--font-mono); font-weight: 800;
  `;
  cfoBtn.addEventListener('click', () => {
    s.showCfoModal = true;
    render(screenRoot, s);
  });
  right.append(cfoBtn);

  // Nút Cài đặt LLM & Thiết bị
  const settingsBtn = el('button', 'btn btn--ghost', '');
  settingsBtn.innerHTML = '<span class="bb-key-hint">[S]</span> ⚙️ Cài đặt';
  settingsBtn.style.cssText = `
    min-height: 28px; padding: 2px 8px; font-size: 11px; font-family: var(--font-mono);
  `;
  settingsBtn.addEventListener('click', () => {
    s.showSettingsModal = true;
    render(screenRoot, s);
  });
  right.append(settingsBtn);

  // Nút Thu hoạch Doanh thu Công ty con
  const harvestBtn = el('button', 'btn btn--ghost', '');
  harvestBtn.innerHTML = '<span class="bb-key-hint">[H]</span> 📈 Thu hoạch CP';
  harvestBtn.style.cssText = `
    min-height: 28px; padding: 2px 8px; font-size: 11px; font-family: var(--font-mono); color: #34D399; border-color: rgba(16,185,129,0.3);
  `;
  harvestBtn.addEventListener('click', () => {
    handleHarvestAllSectors(s);
  });
  right.append(harvestBtn);

  // Nút Bật/Tắt Âm thanh Thông báo Slack (Web Audio API)
  const soundBtn = el(
    'button',
    'btn btn--ghost',
    isSoundEnabled() ? '🔔 Âm thanh: BẬT' : '🔕 Âm thanh: TẮT'
  );
  soundBtn.style.cssText = `
    min-height: 28px; padding: 2px 8px; font-size: 11px; font-family: var(--font-mono);
    color: ${isSoundEnabled() ? '#34D399' : '#94A3B8'};
    border: 1px solid ${isSoundEnabled() ? '#10B981' : '#334155'};
  `;
  soundBtn.addEventListener('click', () => {
    const on = toggleSound();
    soundBtn.textContent = on ? '🔔 Âm thanh: BẬT' : '🔕 Âm thanh: TẮT';
    soundBtn.style.color = on ? '#34D399' : '#94A3B8';
    soundBtn.style.borderColor = on ? '#10B981' : '#334155';
    s.toast = on ? '🔔 Đã bật âm thanh chuông Slack Knock!' : '🔕 Đã tắt âm thanh thông báo.';
    render(screenRoot, s);
  });
  right.append(soundBtn);

  const sessionsCount = s.store ? s.store.listSessions().length : 1;
  const sessionDrawerBtn = el(
    'button',
    'btn',
    `🗂️ Phiên chơi (${sessionsCount}) ${s.showSessionDrawer ? '▲' : '▼'}`
  );
  sessionDrawerBtn.style.cssText = `
    min-height: 28px; padding: 4px 10px; font-size: 11px; font-family: var(--font-mono); font-weight: 800;
    background: ${s.showSessionDrawer ? '#0284C7' : '#1E293B'}; color: #38BDF8; border: 1px solid #38BDF8;
  `;
  sessionDrawerBtn.addEventListener('click', () => {
    s.showSessionDrawer = !s.showSessionDrawer;
    render(screenRoot, s);
  });
  right.append(sessionDrawerBtn);

  for (const lvl of [1, 3, 5, 10]) {
    const lvlBtn = el('button', 'btn btn--ghost', `Cấp ${lvl}`);
    lvlBtn.style.cssText = `
      min-height: 28px; padding: 2px 8px; font-size: 11px; font-family: var(--font-mono);
      background: ${s.level === lvl ? 'rgba(56, 189, 248, 0.2)' : 'transparent'};
      color: ${s.level === lvl ? '#38BDF8' : '#94A3B8'};
      border: 1px solid ${s.level === lvl ? '#38BDF8' : '#334155'};
    `;
    lvlBtn.addEventListener('click', () => {
      s.level = lvl;
      pushMoreVouchers(s);
    });
    right.append(lvlBtn);
  }

  const toggleModeBtn = el(
    'button',
    'btn',
    isPro ? '⇄ Giao diện ERP Standard' : '⚡ Giao diện Palantir Pro'
  );
  toggleModeBtn.style.cssText = `
    min-height: 28px; padding: 4px 10px; font-size: 11px; font-family: var(--font-mono); font-weight: 800;
    background: ${isPro ? '#1E293B' : '#0284C7'}; color: #FFFFFF; border: 1px solid #38BDF8;
  `;
  toggleModeBtn.addEventListener('click', () => switchModeLive(s, isPro ? 'normal' : 'pro'));

  const hubBtn = el('button', 'btn btn--ghost', '⌂ Cổng Phiên');
  hubBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-size: 11px;';
  hubBtn.addEventListener('click', () => {
    persistCurrentSession(s);
    s.ctx.go('title');
  });

  right.append(toggleModeBtn, hubBtn);
  bar.append(left, toastEl, right);
  return bar;
}

function renderSessionManagerDrawer(s, isPro) {
  const drawer = el('div', '');
  drawer.style.cssText = `
    padding: 14px 18px; background: ${isPro ? '#0A101D' : '#111827'};
    border-bottom: 2px solid #38BDF8;
    display: flex; flex-direction: column; gap: 12px;
  `;

  const sessions = s.store.listSessions();

  const topRow = el('div', '');
  topRow.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;';
  topRow.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #38BDF8;">
      💾 TRUNG TÂM LƯU TRỮ & CHUYỂN ĐỔI PHIÊN CHƠI (${sessions.length} PHIÊN ĐÃ LƯU TRONG BỘ NHỚ)
    </div>
  `;

  const actionGroup = el('div', '');
  actionGroup.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;';

  const nameInput = el('input', '');
  nameInput.value = s.sessionName;
  nameInput.placeholder = 'Đặt tên phiên hiện tại...';
  nameInput.style.cssText =
    'padding: 5px 10px; background: #070B11; border: 1px solid #334155; color: #F8FAFC; font-family: var(--font-mono); font-size: 11px; border-radius: 3px; width: 220px;';

  const renameBtn = el('button', 'btn', '💾 Lưu tên & Cập nhật Phiên');
  renameBtn.style.cssText =
    'min-height: 28px; padding: 4px 10px; font-size: 11px; font-family: var(--font-mono); background: #1E293B; color: #34D399; border: 1px solid #10B981;';
  renameBtn.addEventListener('click', () => {
    if (nameInput.value.trim()) {
      s.sessionName = nameInput.value.trim();
      persistCurrentSession(s);
      s.toast = `💾 Đã lưu phiên [${s.sessionId}]: "${s.sessionName}"`;
      render(screenRoot, s);
    }
  });

  const cloneBtn = el('button', 'btn', '⎘ Lưu Bản sao (Checkpoint)');
  cloneBtn.style.cssText =
    'min-height: 28px; padding: 4px 10px; font-size: 11px; font-family: var(--font-mono); background: #1E293B; color: #38BDF8; border: 1px solid #38BDF8;';
  cloneBtn.addEventListener('click', () => {
    persistCurrentSession(s);
    const copy = s.store.duplicateSession(s.sessionId, `${s.sessionName} (Mốc sao lưu)`);
    if (copy) {
      s.toast = `⎘ Đã tạo mốc sao lưu phiên mới [${copy.id}]!`;
      render(screenRoot, s);
    }
  });

  const newSesBtn = el('button', 'btn btn--ballpoint', '➕ Tạo Phiên Doanh nghiệp Mới');
  newSesBtn.style.cssText =
    'min-height: 28px; padding: 4px 12px; font-size: 11px; font-family: var(--font-mono);';
  newSesBtn.addEventListener('click', () => {
    persistCurrentSession(s);
    const nextNum = s.store.listSessions().length + 1;
    play(
      screenRoot,
      s.bundle,
      {
        newSession: true,
        sessionName: `CTCP ĐẠI VIỆT · Phiên #${nextNum}`,
        mode: s.mode.id,
        level: s.level,
      },
      s.ctx
    );
  });

  actionGroup.append(nameInput, renameBtn, cloneBtn, newSesBtn);
  topRow.append(actionGroup);
  drawer.append(topRow);

  const grid = el('div', '');
  grid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; max-height: 195px; overflow-y: auto;';

  for (const ses of sessions) {
    const isCurrent = ses.id === s.sessionId;
    const sum = ses.summary || {};
    const card = el('div', '');
    card.style.cssText = `
      padding: 9px 12px; border-radius: 4px;
      background: ${isCurrent ? 'rgba(56, 189, 248, 0.15)' : '#0D141F'};
      border: 1px solid ${isCurrent ? '#38BDF8' : '#1E293B'};
      display: flex; flex-direction: column; justify-content: space-between; gap: 6px;
    `;
    card.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px;">
          <span style="color: #38BDF8; font-weight: 800;">${ses.id} ${isCurrent ? '(ĐANG MỞ)' : ''}</span>
          <span style="color: #94A3B8;">${ses.modeId === 'pro' ? 'PALANTIR' : 'ERP'} · Cấp ${ses.level || 1}</span>
        </div>
        <div style="font-weight: 800; font-size: 12px; color: #FFFFFF; margin-top: 2px;">${ses.name}</div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: #CBD5E1; margin-top: 4px;">
          DT: <strong style="color:#38BDF8;">${vndShort(sum.revenue ?? 120000000)}</strong> ·
          LN: <strong style="color:#34D399;">${vndShort(sum.netProfit ?? 35000000)}</strong> ·
          TS: <strong>${vndShort(sum.totalAssets ?? 1010000000)}</strong>
        </div>
      </div>
    `;

    const btnRow = el('div', '');
    btnRow.style.cssText = 'display: flex; gap: 6px;';
    if (!isCurrent) {
      const switchBtn = el('button', 'btn', '▶ Chuyển sang phiên này');
      switchBtn.style.cssText =
        'flex: 1; min-height: 24px; padding: 2px 8px; font-size: 10px; font-family: var(--font-mono); background: #0284C7; color: #FFFFFF; border: 1px solid #38BDF8;';
      switchBtn.addEventListener('click', () => {
        persistCurrentSession(s);
        s.store.setActiveSession(ses.id);
        play(screenRoot, s.bundle, { sessionId: ses.id }, s.ctx);
      });
      btnRow.append(switchBtn);

      const delBtn = el('button', 'btn btn--ghost', 'Xoá');
      delBtn.style.cssText =
        'min-height: 24px; padding: 2px 8px; font-size: 10px; color: #FB7185;';
      delBtn.addEventListener('click', () => {
        s.store.deleteSession(ses.id);
        render(screenRoot, s);
      });
      btnRow.append(delBtn);
    } else {
      const activeTag = el('span', '', '✓ Đang điều hành trực tiếp & lưu tự động');
      activeTag.style.cssText =
        'font-family: var(--font-mono); font-size: 10px; color: #34D399; font-weight: 700;';
      btnRow.append(activeTag);
    }
    card.append(btnRow);
    grid.append(card);
  }

  drawer.append(grid);
  return drawer;
}

// ============================================================================
// 2. DẢI KPI TÀI CHÍNH DOANH NGHIỆP (TOP RIBBON)
// ============================================================================
function renderKpiRibbon(s, isPro) {
  const m = computeMetrics(s.fin);
  const tb = computeMasterAccountBalance(s.fin, s.bundle.accounts);
  const ribbon = el('div', 'kpi-ribbon');

  const revGrowthPct = Math.round(
    ((m.revenue - s.fin.baseRevenue) / Math.max(1, s.fin.baseRevenue)) * 100
  );
  const baseProfit = s.fin.baseRevenue - s.fin.baseCogs - s.fin.baseOpex;
  const profitGrowthPct = Math.round(
    ((m.netProfit - baseProfit) / Math.max(1, Math.abs(baseProfit))) * 100
  );

  const pendingSlack = (s.fin.slackEvents || []).filter((e) => e.status === 'PENDING').length;

  const cards = [
    {
      code: 'KPI-01 // REVENUE',
      label: 'DOANH THU THUẦN (511/515)',
      value: vnd(m.revenue),
      badge: `${revGrowthPct >= 0 ? '+' : ''}${revGrowthPct}% kỳ này`,
      badgeColor: '#38BDF8',
      sub: `Giá vốn (632): ${vndShort(m.cogs)} · LN gộp: ${vndShort(m.grossProfit)}`,
      borderColor: '#38BDF8',
      targetTab: 'master_accounts',
    },
    {
      code: 'KPI-02 // NET PROFIT',
      label: 'LỢI NHUẬN RÒNG (NET PROFIT)',
      value: vnd(m.netProfit),
      badge: `Margin: ${m.profitMargin}%`,
      badgeColor: m.netProfit >= 0 ? '#10B981' : '#F43F5E',
      sub: `OPEX (641/642): ${vndShort(m.opex)} (${profitGrowthPct >= 0 ? '+' : ''}${profitGrowthPct}%)`,
      borderColor: m.netProfit >= 0 ? '#10B981' : '#F43F5E',
      targetTab: 'master_accounts',
    },
    {
      code: 'KPI-03 // SLACK & LỆNH ĐỘT XUẤT',
      label: 'TIN NHẮN SLACK & LỆNH CHI/THU',
      value: `${pendingSlack} LỆNH CHỜ DUYỆT`,
      badge: pendingSlack > 0 ? '🔔 CẦN PHẢN HỒI' : '✓ ĐÃ PHẢN HỒI HẾT',
      badgeColor: pendingSlack > 0 ? '#F59E0B' : '#10B981',
      sub: `Sự kiện: ${s.fin.slackEvents?.length || 0} tin nhắn · Điểm tuân thủ: ${s.fin.complianceScore || 100}%`,
      borderColor: '#38BDF8',
      targetTab: 'slack_chat',
    },
    {
      code: 'KPI-04 // MASTER BALANCE SHEET',
      label: 'TỔNG TÀI SẢN = NGUỒN VỐN',
      value: vnd(tb.balanceSheet.totalAssets),
      badge: tb.totals.isTrialBalanced ? '✓ CÂN ĐỐI 100%' : '⚠ LỆCH',
      badgeColor: '#F59E0B',
      sub: `Nợ phải trả: ${vndShort(tb.balanceSheet.totalLiabilities)} · Vốn CSH: ${vndShort(tb.balanceSheet.totalEquity)}`,
      borderColor: '#F59E0B',
      targetTab: 'master_accounts',
    },
    {
      code: 'KPI-05 // VALUATION',
      label: 'ĐỊNH GIÁ DOANH NGHIỆP',
      value: vnd(m.valuation),
      badge: `★ Điểm: ${s.score} (Đúng ${s.ok})`,
      badgeColor: '#A855F7',
      sub: `Tư vấn CFO đã duyệt: ${(s.fin.enactedAdvisories || []).length}/${ADVISORY_CATALOG.length} · Bút toán: ${(s.fin.journal || []).length}`,
      borderColor: '#A855F7',
      targetTab: 'advisory',
    },
  ];

  for (const c of cards) {
    const card = el('div', 'kpi-card');
    card.style.cssText = `
      background: ${isPro ? '#0D141F' : '#1E293B'};
      border: 1px solid ${isPro ? '#1E293B' : '#334155'};
      border-left: 3px solid ${c.borderColor};
      border-radius: 4px; padding: 10px 14px;
      display: flex; flex-direction: column; gap: 4px; cursor: pointer;
    `;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 10px; color: #94A3B8; font-weight: 700;">
        <span>${c.label}</span>
        <span style="color: ${c.badgeColor}; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 3px;">${c.badge}</span>
      </div>
      <div style="font-family: var(--font-mono); font-size: 17px; font-weight: 900; color: #F8FAFC; font-variant-numeric: tabular-nums;">
        ${c.value}
      </div>
      <div style="font-size: 11px; color: #94A3B8;">
        ${c.sub}
      </div>
    `;
    card.addEventListener('click', () => {
      s.activeTab = c.targetTab;
      persistCurrentSession(s);
      render(screenRoot, s);
    });
    ribbon.append(card);
  }

  return ribbon;
}

// ============================================================================
// 3. CỘT TRÁI: LUỒNG THÔNG BÁO PUSH & SLACK EVENTS TỪ PHÒNG BAN
// ============================================================================
function renderLeftPushStream(s, isPro) {
  const panel = el('div', 'pal-panel');
  panel.style.cssText = `
    background: ${isPro ? '#0D141F' : '#1E293B'};
    border: 1px solid ${isPro ? '#1E293B' : '#334155'};
    border-radius: 4px; overflow: hidden; display: flex; flex-direction: column;
  `;

  const pendingDocCount = s.stream.filter((d) => (d.push?.status || 'PENDING') === 'PENDING').length;
  const pendingSlackCount = (s.fin.slackEvents || []).filter((e) => e.status === 'PENDING').length;

  const header = el('div', 'pal-panel__header');
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 14px; background: ${isPro ? '#111A29' : '#0F172A'};
    border-bottom: 1px solid ${isPro ? '#1E293B' : '#334155'};
    font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #F8FAFC;
  `;
  header.innerHTML = `
    <span>🔔 SLACK & CHỨNG TỪ ĐẾN</span>
    <span style="background: rgba(56, 189, 248, 0.2); color: #38BDF8; padding: 2px 8px; border-radius: 10px;">
      ${pendingDocCount + pendingSlackCount} CHỜ DUYỆT
    </span>
  `;
  panel.append(header);

  // 2 nút hành động nhận thêm luồng
  const actionBox = el('div', '');
  actionBox.style.cssText = 'padding: 10px 10px 4px 10px; display: flex; flex-direction: column; gap: 6px;';

  const slackBtn = el('button', 'btn btn--ballpoint', '💬 + Nhận Tin nhắn Lệnh chi / Thu ngẫu nhiên');
  slackBtn.style.cssText =
    'width: 100%; justify-content: center; font-family: var(--font-mono); font-size: 11px; padding: 7px; background: #0284C7; border: 1px solid #38BDF8;';
  slackBtn.addEventListener('click', () => pushMoreSlackEvent(s));

  const pushBtn = el('button', 'btn btn--ghost', '⚡ + Nhận thêm Chứng từ Push mới');
  pushBtn.style.cssText =
    'width: 100%; justify-content: center; font-family: var(--font-mono); font-size: 11px; padding: 6px; border: 1px solid #334155;';
  pushBtn.addEventListener('click', () => pushMoreVouchers(s));

  actionBox.append(slackBtn, pushBtn);
  panel.append(actionBox);

  const list = el('div', 'push-stream');
  list.style.cssText =
    'display: flex; flex-direction: column; gap: 8px; padding: 10px; max-height: 70vh; overflow-y: auto;';

  // Thẻ Sự kiện Slack khẩn cấp (nếu có sự kiện chờ)
  if (pendingSlackCount > 0) {
    const slackNotice = el('button', 'push-item');
    slackNotice.setAttribute('type', 'button');
    slackNotice.style.cssText = `
      display: flex; flex-direction: column; gap: 4px; width: 100%;
      padding: 9px 12px; text-align: left; cursor: pointer;
      background: rgba(245, 158, 11, 0.14); border: 1px solid #F59E0B;
      border-left: 4px solid #F59E0B; border-radius: 4px; color: #F8FAFC;
    `;
    slackNotice.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: #FBBF24; font-weight: 800;">
        <span>💬 TIN NHẮN SLACK ĐỘT XUẤT</span>
        <span>${pendingSlackCount} TIN CHỜ TRẢ LỜI</span>
      </div>
      <div style="font-weight: 800; font-size: 12px; color: #FFFFFF;">
        Có ${pendingSlackCount} lệnh chi / thu đột xuất từ NPC cần bạn phê duyệt ý kiến!
      </div>
    `;
    slackNotice.addEventListener('click', () => {
      s.activeTab = 'slack_chat';
      persistCurrentSession(s);
      render(screenRoot, s);
    });
    list.append(slackNotice);
  }

  s.stream.forEach((doc, idx) => {
    const p = doc.push || decoratePushVoucher(doc, idx);
    const isSelected = idx === s.selectedIdx && s.activeTab === 'workstation';
    const statusColor =
      p.status === 'POSTED'
        ? '#10B981'
        : p.status === 'REJECTED'
          ? '#F59E0B'
          : p.status === 'ERROR'
            ? '#F43F5E'
            : '#38BDF8';

    const statusLabel =
      p.status === 'POSTED'
        ? '✓ ĐÃ HẠCH TOÁN'
        : p.status === 'REJECTED'
          ? '🛡️ ĐÃ CHẶN LỖI'
          : p.status === 'ERROR'
            ? '⚠ BÚT TOÁN SAI'
            : '● MỚI (PUSH)';

    const item = el('button', 'push-item');
    item.setAttribute('type', 'button');
    item.style.cssText = `
      display: flex; flex-direction: column; gap: 5px; width: 100%;
      padding: 10px 12px; text-align: left; cursor: pointer;
      background: ${isSelected ? 'rgba(56, 189, 248, 0.14)' : isPro ? '#111927' : '#0F172A'};
      border: 1px solid ${isSelected ? '#38BDF8' : '#1E293B'};
      border-left: 4px solid ${statusColor};
      border-radius: 4px; color: #F8FAFC; transition: all 0.15s ease;
    `;

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 10px;">
        <span style="color: #38BDF8; font-weight: 800;">${p.icon} ${p.npcName} · ${p.channel}</span>
        <span style="color: ${statusColor}; font-weight: 800;">${statusLabel}</span>
      </div>
      <div style="font-weight: 800; font-size: 13px; color: #FFFFFF; line-height: 1.3;">
        ${doc.title}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94A3B8;">
        <span>${p.dept}</span>
        <strong style="font-family: var(--font-mono); color: #E2E8F0; font-size: 12px;">${p.amountText}</strong>
      </div>
      <div style="font-size: 10px; color: #64748B; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 4px;">
        ↪ ${p.impact}
      </div>
    `;

    item.addEventListener('click', () => {
      s.selectedIdx = idx;
      s.activeTab = 'workstation';
      s.lines = [];
      s.account = null;
      s.amount = null;
      s.feedback = null;
      persistCurrentSession(s);
      render(screenRoot, s);
    });

    list.append(item);
  });

  panel.append(list);
  return panel;
}

// ============================================================================
// 4. CỘT GIỮA: 5 PHÂN HỆ ĐIỀU HÀNH CHÍNH THỨC
// ============================================================================
function renderCenterWorkstation(s, isPro) {
  const panel = el('div', 'pal-panel');
  panel.style.cssText = `
    background: ${isPro ? '#0D141F' : '#1E293B'};
    border: 1px solid ${isPro ? '#1E293B' : '#334155'};
    border-radius: 4px; overflow: hidden; display: flex; flex-direction: column;
  `;

  const pendingSlackCount = (s.fin.slackEvents || []).filter((e) => e.status === 'PENDING').length;

  const tabBar = el('div', '');
  tabBar.style.cssText = `
    display: flex; border-bottom: 1px solid #1E293B; background: ${isPro ? '#111A29' : '#0F172A'};
    flex-wrap: wrap;
  `;

  const tabs = [
    { id: 'workstation', label: '📨 01 // CHỨNG TỪ PUSH & HẠCH TOÁN', keyHint: '1' },
    {
      id: 'slack_chat',
      label: `💬 02 // TIN NHẮN SLACK & LỆNH ĐỘT XUẤT ${pendingSlackCount > 0 ? `(${pendingSlackCount})` : ''}`,
      keyHint: '2',
    },
    { id: 'treasury', label: '🏦 03 // CÂN ĐỐI NGUỒN TIỀN (TREASURY)', keyHint: '3' },
    { id: 'master_accounts', label: `⚖️ 04 // TÀI KHOẢN TỔNG & BCTC (${s.fin.journal?.length || 0})`, keyHint: '4' },
    {
      id: 'sectors',
      label: `🌐 05 // MỞ RỘNG TẬP ĐOÀN & TƯ VẤN CEO (${s.fin.sectors?.length || 1} CÔNG TY)`,
      keyHint: '5',
    },
  ];

  for (const t of tabs) {
    const active = s.activeTab === t.id || (t.id === 'sectors' && s.activeTab === 'advisory');
    const btn = el('button', '', '');
    btn.innerHTML = `<span class="bb-key-hint">[${t.keyHint}]</span> ${t.label}`;
    btn.setAttribute('type', 'button');
    btn.style.cssText = `
      flex: 1; min-width: 155px; padding: 12px 10px; cursor: pointer;
      font-family: var(--font-mono); font-size: 11px; font-weight: 800;
      background: ${active ? (isPro ? '#0D141F' : '#1E293B') : 'transparent'};
      color: ${active ? '#38BDF8' : '#94A3B8'};
      border: none; border-bottom: 3px solid ${active ? '#38BDF8' : 'transparent'};
      transition: all 0.15s ease;
    `;
    btn.addEventListener('click', () => {
      s.activeTab = t.id;
      persistCurrentSession(s);
      render(screenRoot, s);
    });
    tabBar.append(btn);
  }
  panel.append(tabBar);

  const body = el('div', '');
  body.style.cssText = 'padding: 16px; display: flex; flex-direction: column; gap: 16px;';

  if (s.feedback) {
    const fbColor =
      s.feedback.type === 'success'
        ? '#10B981'
        : s.feedback.type === 'error'
          ? '#F43F5E'
          : '#38BDF8';
    const fbBg =
      s.feedback.type === 'success'
        ? 'rgba(16,185,129,0.12)'
        : s.feedback.type === 'error'
          ? 'rgba(244,63,94,0.12)'
          : 'rgba(56,189,248,0.12)';
    const fbBox = el('div', '');
    fbBox.style.cssText = `
      padding: 12px 16px; border-radius: 4px;
      background: ${fbBg}; border: 1px solid ${fbColor}; border-left: 4px solid ${fbColor};
      display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
    `;
    fbBox.innerHTML = `
      <div>
        <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: ${fbColor};">${s.feedback.title}</div>
        <div style="font-size: 13px; color: #F8FAFC; margin-top: 2px;">${s.feedback.message}</div>
        ${s.feedback.deltaText ? `<div style="font-family: var(--font-mono); font-size: 11px; color: #34D399; margin-top: 4px;">${s.feedback.deltaText}</div>` : ''}
      </div>
    `;
    const nextPendingIdx = s.stream.findIndex((d) => d.push.status === 'PENDING');
    if (s.activeTab === 'workstation' && nextPendingIdx !== -1 && nextPendingIdx !== s.selectedIdx) {
      const nextBtn = el('button', 'btn btn--ballpoint', 'Chuyển sang Thông báo Push kế tiếp ➔');
      nextBtn.addEventListener('click', () => {
        s.selectedIdx = nextPendingIdx;
        s.lines = [];
        s.account = null;
        s.amount = null;
        s.feedback = null;
        persistCurrentSession(s);
        render(screenRoot, s);
      });
      fbBox.append(nextBtn);
    }
    body.append(fbBox);
  }

  if (s.activeTab === 'workstation') {
    body.append(renderVoucherAndLedgerTab(s, isPro));
  } else if (s.activeTab === 'slack_chat') {
    body.append(renderSlackChatTab(s, isPro));
  } else if (s.activeTab === 'treasury') {
    body.append(renderTreasuryRebalanceTab(s, isPro));
  } else if (s.activeTab === 'master_accounts') {
    body.append(renderMasterAccountsTab(s, isPro));
  } else {
    body.append(renderConglomerateAndAdvisoryTab(s, isPro));
  }

  panel.append(body);
  return panel;
}

// ============================================================================
// TAB 1: XỬ LÝ CHỨNG TỪ PUSH & TIN NHẮN SLACK TỪ NPC GIAO VIỆC
// ============================================================================
function renderVoucherAndLedgerTab(s, isPro) {
  const doc = s.stream[s.selectedIdx];
  if (!doc) {
    return el('div', '', 'Chưa có thông báo chứng từ nào được chọn.');
  }
  if (!doc.push) {
    doc.push = decoratePushVoucher(doc, s.selectedIdx);
  }

  const wrap = el('div', '');
  wrap.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  const isProcessed = doc.push.status !== 'PENDING';

  // Khối 1: Hộp thoại Tin nhắn Slack từ NPC giao việc (Slack Messenger Card)
  const slackDocCard = el('div', '');
  slackDocCard.style.cssText = `
    background: #0E1626; border: 1px solid #1E293B; border-left: 4px solid #38BDF8;
    border-radius: 4px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
  `;
  slackDocCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 11px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${doc.push.icon}</span>
        <strong style="color: #38BDF8;">${doc.push.npcName}</strong>
        <span style="color: #94A3B8;">(${doc.push.npcRole})</span>
        <span style="color: #34D399; background: rgba(16,185,129,0.12); padding: 1px 6px; border-radius: 3px;">${doc.push.channel}</span>
      </div>
      <div style="color: #64748B;">${doc.push.timeStr}</div>
    </div>
    <div style="font-size: 13px; color: #F8FAFC; line-height: 1.5; padding: 8px 12px; background: #070B11; border-radius: 4px; border: 1px solid #1E293B;">
      💬 ${doc.push.slackText}
    </div>
  `;

  // Lịch sử trả lời nhanh giữa người chơi & NPC (nếu có)
  if (Array.isArray(doc.push.chatHistory) && doc.push.chatHistory.length > 0) {
    const historyBox = el('div', '');
    historyBox.style.cssText = 'display: flex; flex-direction: column; gap: 6px; padding-left: 10px;';
    for (const msg of doc.push.chatHistory) {
      const isMe = msg.sender === 'player';
      const row = el('div', '');
      row.style.cssText = `
        padding: 6px 10px; border-radius: 4px; font-size: 12px;
        background: ${isMe ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.1)'};
        border-left: 3px solid ${isMe ? '#38BDF8' : '#10B981'};
        color: #F8FAFC;
      `;
      row.innerHTML = `<strong>${msg.avatar} ${msg.author}:</strong> ${msg.text}`;
      historyBox.append(row);
    }
    slackDocCard.append(historyBox);
  }

  // Bảng 3 lựa chọn trả lời nhanh cho NPC trên kênh Slack
  const quickRepliesBox = el('div', '');
  quickRepliesBox.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
  const qrTitle = el('div', '', '💬 Trả lời nhanh cho đồng nghiệp trên kênh Slack:');
  qrTitle.style.cssText =
    'font-family: var(--font-mono); font-size: 10px; color: #94A3B8; font-weight: 700;';
  quickRepliesBox.append(qrTitle);

  const replyBtnGrid = el('div', '');
  replyBtnGrid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';

  for (const qr of doc.push.quickReplies || []) {
    const already = doc.push.repliedIds?.includes(qr.id);
    const rBtn = el('button', 'btn', qr.label);
    rBtn.style.cssText = `
      min-height: 26px; padding: 4px 10px; font-size: 11px; border-radius: 3px;
      background: ${already ? '#111927' : 'rgba(56,189,248,0.14)'};
      color: ${already ? '#64748B' : '#38BDF8'};
      border: 1px solid ${already ? '#334155' : '#38BDF8'};
      cursor: ${already ? 'default' : 'pointer'};
    `;
    rBtn.disabled = already;
    if (!already) {
      rBtn.addEventListener('click', () => {
        playSlackSend();
        replyToVoucherSlack(doc, qr.id);
        setTimeout(() => {
          playSlackReply();
          persistCurrentSession(s);
          render(screenRoot, s);
        }, 150);
      });
    }
    replyBtnGrid.append(rBtn);
  }
  quickRepliesBox.append(replyBtnGrid);
  slackDocCard.append(quickRepliesBox);

  wrap.append(slackDocCard);

  // Khối 2: Tờ Chứng từ Kế toán Điện tử (Electronic Voucher Inspector)
  const voucherCard = el('div', '');
  voucherCard.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#F8FAFC'};
    color: ${isPro ? '#E2E8F0' : '#0F172A'};
    border: 1px solid ${isPro ? '#1E293B' : '#CBD5E1'};
    border-top: 3px solid #38BDF8;
    border-radius: 4px; padding: 18px; position: relative;
  `;

  const banner = el('div', '');
  banner.style.cssText = `
    display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;
    border-bottom: 1px solid ${isPro ? '#1E293B' : '#CBD5E1'}; padding-bottom: 12px; margin-bottom: 14px;
  `;
  banner.innerHTML = `
    <div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 800;">
        ${doc.push.icon} ${doc.push.orderType} // ${doc.push.pushId} · NGUỒN: ${doc.push.dept.toUpperCase()}
      </div>
      <h2 style="font-size: 18px; font-weight: 900; margin-top: 4px; color: ${isPro ? '#FFFFFF' : '#0F172A'};">
        ${doc.title.toUpperCase()}
      </h2>
    </div>
    <div style="text-align: right; font-family: var(--font-mono); font-size: 11px; color: ${isPro ? '#94A3B8' : '#475569'};">
      <div>THỜI GIAN PUSH: ${doc.push.timeStr}</div>
      <div>TRẠNG THÁI: <strong>${doc.push.status}</strong></div>
    </div>
  `;
  voucherCard.append(banner);

  const tipRow = el('div', '');
  tipRow.style.cssText = `
    font-size: 12px; color: ${isPro ? '#94A3B8' : '#475569'}; margin-bottom: 10px;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  `;
  tipRow.innerHTML = `
    <span>💡 <strong>Kiểm soát nội bộ:</strong> Nếu phát hiện trường thông tin sai lệch (chữ ký, số tiền bằng chữ, tổng tiền…), bấm trực tiếp vào dòng đó để <strong>Chặn & Từ chối Lệnh</strong>. Nếu hợp lệ, lập bút toán Nợ/Có bên dưới để hạch toán vào Tài khoản Tổng.</span>
  `;
  voucherCard.append(tipRow);

  const fieldsGrid = el('div', '');
  fieldsGrid.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

  for (const f of doc.fields) {
    const row = el('button', 'doc-field');
    row.setAttribute('type', 'button');
    row.disabled = isProcessed;
    row.style.cssText = `
      display: flex; justify-content: space-between; align-items: center; width: 100%;
      padding: 9px 14px; border-radius: 4px; text-align: left;
      background: ${isPro ? '#111927' : '#FFFFFF'};
      border: 1px solid ${isPro ? '#1E293B' : '#CBD5E1'};
      color: ${isPro ? '#F8FAFC' : '#0F172A'};
      cursor: ${isProcessed ? 'default' : 'pointer'};
      transition: all 0.14s ease;
    `;

    const isTotal = f.key === 'total' || f.key === 'cost';
    row.innerHTML = `
      <span style="font-size: 12px; color: ${isPro ? '#94A3B8' : '#475569'}; font-weight: 600; display: flex; align-items: center; gap: 8px;">
        <span>${f.label}</span>
        ${!isProcessed ? `<span style="font-size: 10px; color: #F43F5E; opacity: 0.75; font-family: var(--font-mono);">[Chạm nếu sai]</span>` : ''}
      </span>
      <span style="font-family: var(--font-mono); font-weight: 800; font-size: ${isTotal ? '15px' : '13px'}; color: ${isTotal ? '#38BDF8' : isPro ? '#F8FAFC' : '#0F172A'};">
        ${f.text || '—'}
      </span>
    `;

    if (!isProcessed) {
      row.addEventListener('click', () => handleFlagDefectField(s, doc, f.key));
    }
    fieldsGrid.append(row);
  }
  voucherCard.append(fieldsGrid);

  if (s.mode.hints.mentor && doc.mentorTip) {
    const mentorBox = el('div', '');
    mentorBox.style.cssText = `
      margin-top: 12px; padding: 10px 14px; border-radius: 4px;
      background: rgba(245, 158, 11, 0.12); border-left: 3px solid #F59E0B;
      color: ${isPro ? '#FDE68A' : '#92400E'}; font-size: 12px;
    `;
    mentorBox.innerHTML = `<strong>📌 CỐ VẤN TÀI CHÍNH GỢI Ý:</strong> ${doc.mentorTip}`;
    voucherCard.append(mentorBox);
  }

  wrap.append(voucherCard);

  if (!isProcessed) {
    wrap.append(renderLedgerPostingBuilder(s, doc, isPro));
  }

  return wrap;
}

function handleFlagDefectField(s, doc, fieldKey) {
  const g = gradeInspect(doc, fieldKey);
  const p = s.mode.scoring;

  if (g.correct && g.reject) {
    s.score += p.points.inspectCorrect;
    s.ok += 1;
    doc.push.status = 'REJECTED';
    s.fin.complianceScore = Math.min(100, s.fin.complianceScore + 2);
    playAlertBuzzer();
    s.toast = `🛡️ Đã chặn thành công chứng từ lỗi (${doc.push.pushId}) & lưu phiên!`;
    s.feedback = {
      type: 'success',
      title: `🛡️ ĐÃ TỪ CHỐI THÔNG BÁO PUSH LỖI (+${p.points.inspectCorrect} ĐIỂM)`,
      message: `Phát hiện chính xác rủi ro kiểm soát nội bộ: ${doc.defect.explain}`,
      deltaText: 'Bảo vệ an toàn dòng tiền & điểm tuân thủ thuế của doanh nghiệp.',
    };
  } else if (!g.reject) {
    s.score -= p.penalties.wrongReject;
    s.bad += 1;
    s.fin.complianceScore = Math.max(0, s.fin.complianceScore - 5);
    playAlertBuzzer();
    s.feedback = {
      type: 'error',
      title: `⚠️ CẢNH BÁO: CHỨNG TỪ HỢP LỆ (-${p.penalties.wrongReject} ĐIỂM)`,
      message:
        'Thông báo Push này hoàn toàn hợp lệ và đầy đủ chữ ký/mã số thuế. Hãy lập bút toán Nợ/Có bên dưới để ghi nhận vào Tài khoản Tổng!',
    };
  } else {
    s.bad += 1;
    playAlertBuzzer();
    s.feedback = {
      type: 'error',
      title: '⚠️ CHƯA ĐÚNG VỊ TRÍ RỦI RO TRÊN CHỨNG TỪ',
      message: `Trường bạn vừa chọn không phải là điểm sai sót. Gợi ý kiểm tra: ${doc.defect.explain}`,
    };
  }
  persistCurrentSession(s);
  render(screenRoot, s);
}

function renderLedgerPostingBuilder(s, doc, isPro) {
  const box = el('div', '');
  box.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'};
    border: 1px solid #1E293B; border-radius: 4px; padding: 16px;
    display: flex; flex-direction: column; gap: 14px; color: #F8FAFC;
  `;

  const titleRow = el('div', '');
  titleRow.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;';
  titleRow.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #38BDF8;">
      ◈ BÚT TOÁN HẠCH TOÁN TÀI KHOẢN TỔNG (GENERAL LEDGER POSTING)
    </div>
    <div style="font-size: 11px; color: #94A3B8;">
      Tác động dự kiến: <strong style="color: #34D399;">${doc.push.impact}</strong>
    </div>
  `;
  box.append(titleRow);

  if (s.mode.input.account === 'typed') {
    const inputGrid = el('div', '');
    inputGrid.style.cssText =
      'display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; align-items: end;';

    const accWrap = el('div', '');
    accWrap.innerHTML = `<label style="display:block; font-family:var(--font-mono); font-size:10px; color:#94A3B8; margin-bottom:4px;">MÃ TÀI KHOẢN TỔNG (VD: 111, 112, 511, 3331, 632)</label>`;
    const accInput = el('input', '');
    accInput.id = 'acc';
    accInput.placeholder = 'Gõ số hiệu TK...';
    accInput.value = s.account || '';
    accInput.style.cssText =
      'width: 100%; padding: 8px 10px; background: #070B11; border: 1px solid #334155; color: #38BDF8; font-family: var(--font-mono); font-weight: 800; border-radius: 4px;';
    accWrap.append(accInput);

    const amtWrap = el('div', '');
    amtWrap.innerHTML = `<label style="display:block; font-family:var(--font-mono); font-size:10px; color:#94A3B8; margin-bottom:4px;">SỐ TIỀN VND (NGUYÊN ĐỒNG)</label>`;
    const amtInput = el('input', '');
    amtInput.id = 'amt';
    amtInput.type = 'number';
    amtInput.placeholder = 'Gõ số tiền...';
    amtInput.value = s.amount || '';
    amtInput.style.cssText =
      'width: 100%; padding: 8px 10px; background: #070B11; border: 1px solid #334155; color: #34D399; font-family: var(--font-mono); font-weight: 800; border-radius: 4px;';
    amtWrap.append(amtInput);

    const btnDebit = el('button', 'btn btn--primary', '+ GHI NỢ (DEBIT)');
    btnDebit.style.cssText =
      'background: #1E293B; color: #38BDF8; border: 1px solid #38BDF8; font-family: var(--font-mono); height: 36px;';
    btnDebit.addEventListener('click', () => addEntryLine(s, 'N'));

    const btnCredit = el('button', 'btn btn--primary', '+ GHI CÓ (CREDIT)');
    btnCredit.style.cssText =
      'background: #1E293B; color: #34D399; border: 1px solid #10B981; font-family: var(--font-mono); height: 36px;';
    btnCredit.addEventListener('click', () => addEntryLine(s, 'C'));

    inputGrid.append(accWrap, amtWrap, btnDebit, btnCredit);
    box.append(inputGrid);

    const quickBar = el('div', '');
    quickBar.style.cssText =
      'display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-top: 4px;';
    const qbLabel = el('span', '', 'Quick-Select TK:');
    qbLabel.style.cssText =
      'font-family: var(--font-mono); font-size: 10px; color: #64748B;';
    quickBar.append(qbLabel);

    for (const code of s.accounts) {
      const chip = el('button', '', `${code} · ${s.names[code] ?? ''}`);
      chip.setAttribute('type', 'button');
      chip.style.cssText = `
        padding: 3px 8px; font-family: var(--font-mono); font-size: 11px; border-radius: 3px; cursor: pointer;
        background: ${s.account === code ? 'rgba(56, 189, 248, 0.25)' : '#111927'};
        color: ${s.account === code ? '#38BDF8' : '#CBD5E1'};
        border: 1px solid ${s.account === code ? '#38BDF8' : '#1E293B'};
      `;
      chip.addEventListener('click', () => {
        s.account = code;
        const inp = document.getElementById('acc');
        if (inp) inp.value = code;
      });
      quickBar.append(chip);
    }

    const amtQuick = el('div', '');
    amtQuick.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; align-items: center;';
    const aqLabel = el('span', '', 'Số tiền trên chứng từ:');
    aqLabel.style.cssText =
      'font-family: var(--font-mono); font-size: 10px; color: #64748B;';
    amtQuick.append(aqLabel);
    for (const n of doc.amountChoices || []) {
      const aChip = el('button', '', vnd(n));
      aChip.setAttribute('type', 'button');
      aChip.style.cssText =
        'padding: 3px 8px; font-family: var(--font-mono); font-size: 11px; border-radius: 3px; cursor: pointer; background: #111927; color: #34D399; border: 1px solid #1E293B;';
      aChip.addEventListener('click', () => {
        s.amount = n;
        const inp = document.getElementById('amt');
        if (inp) inp.value = String(n);
      });
      amtQuick.append(aChip);
    }

    box.append(quickBar, amtQuick);
  } else {
    const accLabel = el('div', '', '1. CHỌN TÀI KHOẢN KẾ TOÁN:');
    accLabel.style.cssText =
      'font-family: var(--font-mono); font-size: 11px; color: #94A3B8; font-weight: 700;';
    box.append(accLabel);

    const accGrid = el('div', '');
    accGrid.style.cssText =
      'display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 8px;';
    for (const code of s.accounts) {
      const selected = s.account === code;
      const card = el('button', '');
      card.setAttribute('type', 'button');
      card.style.cssText = `
        display: flex; flex-direction: column; padding: 8px 10px; text-align: left; cursor: pointer; border-radius: 4px;
        background: ${selected ? 'rgba(56, 189, 248, 0.2)' : '#1E293B'};
        border: 1px solid ${selected ? '#38BDF8' : '#334155'};
        color: #F8FAFC;
      `;
      card.innerHTML = `
        <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 900; color: #38BDF8;">TK ${code}</span>
        <span style="font-size: 11px; color: #CBD5E1; margin-top: 2px;">${s.names[code] ?? ''}</span>
      `;
      card.addEventListener('click', () => {
        s.account = code;
        render(screenRoot, s);
      });
      accGrid.append(card);
    }
    box.append(accGrid);

    const amtLabel = el('div', '', '2. CHỌN SỐ TIỀN HẠCH TOÁN:');
    amtLabel.style.cssText =
      'font-family: var(--font-mono); font-size: 11px; color: #94A3B8; font-weight: 700;';
    box.append(amtLabel);

    const amtGrid = el('div', '');
    amtGrid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';
    for (const n of doc.amountChoices || []) {
      const selected = s.amount === n;
      const btn = el('button', '', vnd(n));
      btn.setAttribute('type', 'button');
      btn.style.cssText = `
        padding: 8px 14px; font-family: var(--font-mono); font-size: 13px; font-weight: 800; border-radius: 4px; cursor: pointer;
        background: ${selected ? 'rgba(16, 185, 129, 0.22)' : '#1E293B'};
        border: 1px solid ${selected ? '#10B981' : '#334155'};
        color: ${selected ? '#34D399' : '#F8FAFC'};
      `;
      btn.addEventListener('click', () => {
        s.amount = n;
        render(screenRoot, s);
      });
      amtGrid.append(btn);
    }
    box.append(amtGrid);

    const actionRow = el('div', '');
    actionRow.style.cssText =
      'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding-top: 8px; border-top: 1px dashed #334155;';
    actionRow.innerHTML = `
      <div style="font-size: 12px; color: #CBD5E1;">
        Đang chọn: <strong style="color: #38BDF8;">${s.account ? `TK ${s.account} (${s.names[s.account]})` : 'Chưa chọn TK'}</strong>
        · <strong style="color: #34D399;">${s.amount ? vnd(s.amount) : 'Chưa chọn số tiền'}</strong>
      </div>
    `;
    const btnGroup = el('div', '');
    btnGroup.style.cssText = 'display: flex; gap: 8px;';

    const bN = el('button', 'btn', '⬅ Đặt vào BÊN NỢ (DEBIT)');
    bN.style.cssText =
      'background: #1E293B; color: #38BDF8; border: 1px solid #38BDF8; font-family: var(--font-mono);';
    bN.addEventListener('click', () => addEntryLine(s, 'N'));

    const bC = el('button', 'btn', 'Đặt vào BÊN CÓ (CREDIT) ➡');
    bC.style.cssText =
      'background: #1E293B; color: #34D399; border: 1px solid #10B981; font-family: var(--font-mono);';
    bC.addEventListener('click', () => addEntryLine(s, 'C'));

    btnGroup.append(bN, bC);
    actionRow.append(btnGroup);
    box.append(actionRow);
  }

  box.append(renderTBoardLedger(doc, s));

  const g = gradeEntry(doc, s.lines);
  const postBtn = el(
    'button',
    'btn btn--ballpoint',
    '⚡ PHÊ DUYỆT PUSH, GHI SỔ TÀI KHOẢN TỔNG & LƯU PHIÊN'
  );
  postBtn.style.cssText = `
    width: 100%; justify-content: center; padding: 13px; font-family: var(--font-mono); font-size: 13px; font-weight: 900;
    letter-spacing: 0.5px; opacity: ${g.balanced ? '1' : '0.45'};
  `;
  postBtn.disabled = !g.balanced;
  postBtn.addEventListener('click', () => commitVoucherToLedger(s, doc));
  box.append(postBtn);

  return box;
}

function renderTBoardLedger(doc, s) {
  const debitLines = s.lines.filter((l) => l.side === 'N');
  const creditLines = s.lines.filter((l) => l.side === 'C');
  const debitSum = debitLines.reduce((sum, l) => sum + l.amount, 0);
  const creditSum = creditLines.reduce((sum, l) => sum + l.amount, 0);
  const g = gradeEntry(doc, s.lines);

  const board = el('div', '');
  board.style.cssText =
    'border: 1px solid #334155; border-radius: 4px; overflow: hidden; background: #070B11;';

  const head = el('div', '');
  head.style.cssText =
    'display: grid; grid-template-columns: 1fr 1fr; background: #111A29; border-bottom: 1px solid #334155; font-family: var(--font-mono); font-size: 11px; font-weight: 800; text-align: center;';
  head.innerHTML = `
    <div style="padding: 8px; border-right: 1px solid #334155; color: #38BDF8;">BÊN NỢ (DEBIT) · TỔNG: ${vnd(debitSum)}</div>
    <div style="padding: 8px; color: #34D399;">BÊN CÓ (CREDIT) · TỔNG: ${vnd(creditSum)}</div>
  `;
  board.append(head);

  const cols = el('div', '');
  cols.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; min-height: 84px;';

  const leftCol = el('div', '');
  leftCol.style.cssText =
    'padding: 10px; border-right: 1px solid #334155; display: flex; flex-direction: column; gap: 6px;';
  const rightCol = el('div', '');
  rightCol.style.cssText = 'padding: 10px; display: flex; flex-direction: column; gap: 6px;';

  s.lines.forEach((l, idx) => {
    const chip = el('div', '');
    chip.style.cssText =
      'display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #131C2B; border: 1px solid #334155; border-radius: 3px; font-size: 12px;';
    chip.innerHTML = `
      <span><strong style="font-family: var(--font-mono); color: #38BDF8;">TK ${l.account}</strong> · ${s.names[l.account] ?? ''}</span>
      <span style="font-family: var(--font-mono); font-weight: 800; color: #F8FAFC;">${vnd(l.amount)}</span>
    `;
    const delBtn = el('button', '', '×');
    delBtn.style.cssText =
      'background: transparent; border: none; color: #F43F5E; font-weight: 900; font-size: 15px; cursor: pointer; margin-left: 8px;';
    delBtn.addEventListener('click', () => {
      s.lines.splice(idx, 1);
      render(screenRoot, s);
    });
    chip.append(delBtn);

    if (l.side === 'N') leftCol.append(chip);
    else rightCol.append(chip);
  });

  if (debitLines.length === 0) {
    leftCol.innerHTML = `<div style="color: #64748B; font-size: 11px; text-align: center; padding: 18px 0;">Chưa có dòng Nợ</div>`;
  }
  if (creditLines.length === 0) {
    rightCol.innerHTML = `<div style="color: #64748B; font-size: 11px; text-align: center; padding: 18px 0;">Chưa có dòng Có</div>`;
  }

  cols.append(leftCol, rightCol);
  board.append(cols);

  const status = el('div', '');
  status.style.cssText = `
    padding: 7px 12px; font-family: var(--font-mono); font-size: 11px; font-weight: 800; text-align: center;
    border-top: 1px solid #334155;
    background: ${g.balanced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.12)'};
    color: ${g.balanced ? '#34D399' : '#FB7185'};
  `;
  if (g.balanced) {
    status.textContent = `✓ CÂN ĐỐI KẾ TOÁN KÉP (TỔNG NỢ = TỔNG CÓ = ${vnd(debitSum)}) — SẴN SÀNG KẾT CHUYỂN`;
  } else {
    const diff = Math.abs(debitSum - creditSum);
    status.textContent =
      debitSum === 0 && creditSum === 0
        ? '⏳ ĐANG CHỜ LẬP BÚT TOÁN NỢ / CÓ'
        : `⚠ CHƯA CÂN ĐỐI: CHÊNH LỆCH ${vnd(diff)}`;
  }
  board.append(status);

  return board;
}

function addEntryLine(s, side) {
  const typed = s.mode.input.account === 'typed';
  const accEl = document.getElementById('acc');
  const amtEl = document.getElementById('amt');
  const account = typed && accEl ? accEl.value.trim() : s.account;
  const amount = typed && amtEl ? Number(amtEl.value) : s.amount;

  if (!account || !s.known.has(account)) {
    s.feedback = {
      type: 'error',
      title: 'MÃ TÀI KHOẢN KHÔNG HỢP LỆ',
      message:
        'Vui lòng chọn hoặc gõ đúng số hiệu tài khoản theo Thông tư 99/2025/TT-BTC (VD: 111, 112, 131, 1331, 156, 331, 3331, 511, 632, 642).',
    };
    render(screenRoot, s);
    return;
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    s.feedback = {
      type: 'error',
      title: 'SỐ TIỀN KHÔNG HỢP LỆ',
      message: 'Số tiền hạch toán phải là số nguyên VND lớn hơn 0.',
    };
    render(screenRoot, s);
    return;
  }

  s.lines.push({ side, account, amount });
  s.feedback = null;
  render(screenRoot, s);
}

function commitVoucherToLedger(s, doc) {
  if (doc.defect) {
    s.bad += 1;
    doc.push.status = 'ERROR';
    s.fin.complianceScore = Math.max(0, s.fin.complianceScore - 10);
    playAlertBuzzer();
    s.feedback = {
      type: 'error',
      title: '🚨 CẢNH BÁO KIỂM TOÁN: HẠCH TOÁN CHỨNG TỪ LỖI!',
      message: `Chứng từ này có rủi ro sai phạm (${doc.defect.explain}) nhưng bạn đã duyệt đưa vào sổ cái!`,
      deltaText: 'Điểm tuân thủ nội bộ bị trừ -10.',
    };
    persistCurrentSession(s);
    render(screenRoot, s);
    return;
  }

  const g = gradeEntry(doc, s.lines);
  if (!g.balanced) return;

  if (g.correct) {
    const pts = s.mode.scoring.points.inspectCorrect + s.mode.scoring.points.entryCorrect;
    s.score += pts;
    s.ok += 1;
    doc.push.status = 'POSTED';
    playSuccessLedger();

    const { entry, metrics } = recordLedgerLines(s.fin, {
      title: `${doc.push.pushId} · ${doc.title}`,
      source: doc.push.channel,
      lines: s.lines,
    });

    s.toast = `✓ Đã hạch toán ${doc.push.pushId} vào Tài khoản Tổng & lưu phiên [${s.sessionId}]!`;
    s.feedback = {
      type: 'success',
      title: `✓ HẠCH TOÁN TÀI KHOẢN TỔNG THÀNH CÔNG (+${pts} ĐIỂM)`,
      message: `Bút toán ${entry.id} (${doc.title}) đã được cập nhật vào Bảng Cân đối Tài khoản Tổng và lưu phiên tự động.`,
      deltaText: `Doanh thu lũy kế: ${vnd(metrics.revenue)} | Lợi nhuận ròng: ${vnd(metrics.netProfit)} | Nguồn tiền: ${vnd(metrics.liquidity)}`,
    };
  } else {
    s.bad += 1;
    doc.push.status = 'ERROR';
    playAlertBuzzer();
    const truthStr = doc.truth.map((t) => `${t.side} TK ${t.account}: ${vnd(t.amount)}`).join(' | ');
    s.feedback = {
      type: 'error',
      title: '⚠️ BÚT TOÁN CHƯA KHỚP CHUẨN MỰC KẾ TOÁN',
      message: `Bút toán của bạn cân đối nhưng định khoản sai tài khoản đối ứng. Chuẩn mực đúng: ${truthStr}`,
    };
  }

  s.lines = [];
  persistCurrentSession(s);
  render(screenRoot, s);
}

// ============================================================================
// TAB 2: BẢNG TIN NHẮN SLACK & LỆNH ĐỘT XUẤT TỪ CÁC NPC (INTERACTIVE SLACK CHAT)
// ============================================================================
function renderSlackChatTab(s, isPro) {
  const wrap = el('div', '');
  wrap.style.cssText = 'display: flex; flex-direction: column; gap: 14px;';

  const events = s.fin.slackEvents || [];
  const channels = ['all', '#ban-giam-doc', '#kinh-doanh-thu-tien', '#kho-van-mua-hang', '#lenh-thu-chi-quy', '#doi-soat-cod-opex', '#hdqt-chien-luoc'];

  const filteredEvents = s.activeSlackChannel === 'all'
    ? events
    : events.filter((e) => e.channel === s.activeSlackChannel);

  if (!s.selectedSlackId && filteredEvents[0]) {
    s.selectedSlackId = filteredEvents[0].id;
  }
  const currentEvent = events.find((e) => e.id === s.selectedSlackId) || filteredEvents[0];

  // Thanh bộ lọc Kênh Slack Workspace
  const channelBar = el('div', '');
  channelBar.style.cssText = `
    display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;
    border-bottom: 1px solid #1E293B;
  `;
  for (const ch of channels) {
    const isAct = s.activeSlackChannel === ch;
    const countPending = events.filter((e) => (ch === 'all' || e.channel === ch) && e.status === 'PENDING').length;
    const chBtn = el(
      'button',
      'btn',
      `${ch === 'all' ? '🌐 TẤT CẢ KÊNH' : ch} ${countPending > 0 ? `(${countPending})` : ''}`
    );
    chBtn.style.cssText = `
      min-height: 28px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; font-weight: 800; border-radius: 4px;
      background: ${isAct ? '#0284C7' : '#111927'};
      color: ${isAct ? '#FFFFFF' : countPending > 0 ? '#FBBF24' : '#94A3B8'};
      border: 1px solid ${isAct ? '#38BDF8' : '#1E293B'};
    `;
    chBtn.addEventListener('click', () => {
      s.activeSlackChannel = ch;
      if (filteredEvents[0]) s.selectedSlackId = filteredEvents[0].id;
      render(screenRoot, s);
    });
    channelBar.append(chBtn);
  }
  wrap.append(channelBar);

  // Không gian chat 2 cột: Danh sách cuộc trò chuyện bên trái + Khung chat & Trả lời NPC bên phải
  const chatLayout = el('div', '');
  chatLayout.style.cssText = `
    display: grid; grid-template-columns: minmax(240px, 310px) 1fr; gap: 14px;
    min-height: 520px;
  `;

  // Cột trái: Danh sách các tin nhắn / sự kiện ngẫu nhiên từ NPC
  const leftList = el('div', '');
  leftList.style.cssText = `
    display: flex; flex-direction: column; gap: 8px; max-height: 65vh; overflow-y: auto;
    background: #0B111E; padding: 10px; border: 1px solid #1E293B; border-radius: 4px;
  `;

  if (filteredEvents.length === 0) {
    leftList.innerHTML = `<div style="color: #64748B; font-size: 12px; text-align: center; padding: 30px 10px;">Chưa có tin nhắn trong kênh này. Hãy bấm "Nhận Tin nhắn Lệnh chi / Thu ngẫu nhiên" ở cột trái!</div>`;
  } else {
    for (const ev of filteredEvents) {
      const isSelected = currentEvent && ev.id === currentEvent.id;
      const isPending = ev.status === 'PENDING';
      const item = el('button', '');
      item.setAttribute('type', 'button');
      item.style.cssText = `
        text-align: left; padding: 10px 12px; border-radius: 4px; cursor: pointer;
        background: ${isSelected ? 'rgba(56, 189, 248, 0.16)' : '#111927'};
        border: 1px solid ${isSelected ? '#38BDF8' : '#1E293B'};
        border-left: 4px solid ${isPending ? '#F59E0B' : ev.status === 'RESOLVED' ? '#10B981' : '#F43F5E'};
        display: flex; flex-direction: column; gap: 4px; color: #F8FAFC;
      `;
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px;">
          <span style="color: #38BDF8; font-weight: 800;">${ev.npc.avatar} ${ev.npc.name} · ${ev.channel}</span>
          <span style="color: ${isPending ? '#FBBF24' : '#10B981'}; font-weight: 700;">${isPending ? '● CHỜ DUYỆT' : '✓ ĐÃ PHẢN HỒI'}</span>
        </div>
        <div style="font-weight: 800; font-size: 12px; color: #FFFFFF; line-height: 1.35;">${ev.title}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8;">
          <span style="color: #34D399; font-weight: 700;">${ev.orderType}</span>
          <span>${ev.timeStr}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        s.selectedSlackId = ev.id;
        render(screenRoot, s);
      });
      leftList.append(item);
    }
  }
  chatLayout.append(leftList);

  // Cột phải: Khung hội thoại Slack chi tiết & Bảng lựa chọn câu trả lời của người chơi
  const rightChat = el('div', '');
  rightChat.style.cssText = `
    display: flex; flex-direction: column; justify-content: space-between;
    background: #090F1B; border: 1px solid #1E293B; border-radius: 4px; overflow: hidden;
  `;

  if (!currentEvent) {
    rightChat.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748B;">Hãy chọn một tin nhắn từ danh sách bên trái để đọc và trả lời.</div>`;
  } else {
    // Header của phòng chat
    const chatHead = el('div', '');
    chatHead.style.cssText = `
      padding: 12px 16px; background: #111A29; border-bottom: 1px solid #1E293B;
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
    `;
    chatHead.innerHTML = `
      <div>
        <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 900; color: #38BDF8;">
          ${currentEvent.channel} // ${currentEvent.title}
        </div>
        <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">
          Loại sự kiện: <strong style="color: #F8FAFC;">${currentEvent.orderType}</strong> ·
          Người gửi: <strong>${currentEvent.npc.avatar} ${currentEvent.npc.name} (${currentEvent.npc.role})</strong> ·
          Quy mô: <strong style="color: #34D399;">${currentEvent.amountText}</strong>
        </div>
      </div>
      <div>
        <span style="font-family: var(--font-mono); font-size: 10px; padding: 3px 8px; border-radius: 3px; font-weight: 800; background: ${currentEvent.status === 'PENDING' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}; color: ${currentEvent.status === 'PENDING' ? '#FBBF24' : '#34D399'}; border: 1px solid ${currentEvent.status === 'PENDING' ? '#F59E0B' : '#10B981'};">
          ${currentEvent.status === 'PENDING' ? '⏳ ĐANG CHỜ CFO RA QUYẾT ĐỊNH' : '✓ ĐÃ HOÀN TẤT & HẠCH TOÁN SỔ CÁI'}
        </span>
      </div>
    `;
    rightChat.append(chatHead);

    // Vùng hiển thị các tin nhắn trong thread
    const msgStream = el('div', '');
    msgStream.style.cssText = 'padding: 16px; display: flex; flex-direction: column; gap: 14px; max-height: 50vh; overflow-y: auto;';

    for (const msg of currentEvent.messages || []) {
      const isPlayer = msg.sender === 'player';
      const mBox = el('div', '');
      mBox.style.cssText = `
        display: flex; gap: 12px; align-items: flex-start;
        padding: 12px 14px; border-radius: 4px;
        background: ${isPlayer ? 'rgba(56, 189, 248, 0.12)' : msg.isWarning ? 'rgba(244,63,94,0.12)' : '#111927'};
        border: 1px solid ${isPlayer ? '#38BDF8' : msg.isWarning ? '#F43F5E' : '#1E293B'};
        border-left: 4px solid ${isPlayer ? '#38BDF8' : msg.isWarning ? '#F43F5E' : '#10B981'};
      `;
      mBox.innerHTML = `
        <div style="font-size: 22px; line-height: 1;">${msg.avatar || '💬'}</div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="font-size: 12px; font-weight: 800; color: ${isPlayer ? '#38BDF8' : '#FFFFFF'};">
              ${msg.authorName} <span style="font-weight: 400; color: #94A3B8; font-size: 11px;">(${msg.authorRole})</span>
            </div>
            <div style="font-family: var(--font-mono); font-size: 10px; color: #64748B;">${msg.time}</div>
          </div>
          <div style="font-size: 13px; color: #F8FAFC; line-height: 1.55;">
            ${msg.text}
          </div>
        </div>
      `;
      msgStream.append(mBox);
    }
    rightChat.append(msgStream);

    // Khối lựa chọn phương án trả lời NPC dành cho người chơi (CFO)
    const replyCard = el('div', '');
    replyCard.style.cssText = `
      padding: 14px 16px; background: #0E1626; border-top: 1px solid #1E293B;
      display: flex; flex-direction: column; gap: 10px;
    `;

    if (currentEvent.status === 'PENDING') {
      replyCard.innerHTML = `
        <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #FBBF24;">
          ✍️ HÃY CHỌN CÂU TRẢ LỜI CỦA BẠN (CFO) ĐỂ GIẢI QUYẾT SỰ KIỆN NÀY:
        </div>
      `;
      const choicesWrap = el('div', '');
      choicesWrap.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

      for (const ch of currentEvent.choices || []) {
        const cBtn = el('button', 'btn', ch.label);
        cBtn.setAttribute('type', 'button');
        cBtn.style.cssText = `
          text-align: left; padding: 10px 14px; font-size: 12px; line-height: 1.4; border-radius: 4px;
          background: #111C2D; border: 1px solid #334155; color: #F8FAFC; cursor: pointer; transition: all 0.15s ease;
        `;
        cBtn.addEventListener('click', () => {
          playSlackSend();
          const res = replyToNpcEvent(s.fin, currentEvent.id, ch.id);
          if (res.ok) {
            s.score += res.scoreDelta;
            if (res.ethical) {
              s.ok += 1;
              setTimeout(() => playSlackReply(), 120);
              setTimeout(() => playSuccessLedger(), 350);
              s.toast = `✓ Đã phê duyệt phương án chuẩn mực (+${res.scoreDelta} điểm) & hạch toán Sổ cái!`;
              s.feedback = {
                type: 'success',
                title: `✓ ĐÃ PHẢN HỒI TIN NHẮN SLACK: ${currentEvent.title} (+${res.scoreDelta} ĐIỂM)`,
                message: res.npcReply,
              };
            } else {
              s.bad += 1;
              setTimeout(() => playSlackReply(), 120);
              setTimeout(() => playAlertBuzzer(), 350);
              s.toast = `⚠️ Cảnh báo sai phạm! Bị trừ ${Math.abs(res.scoreDelta)} điểm tuân thủ.`;
              s.feedback = {
                type: 'error',
                title: `🚨 CẢNH BÁO SAI PHẠM KIỂM SOÁT (-${Math.abs(res.scoreDelta)} ĐIỂM)`,
                message: res.npcReply,
              };
            }
            persistCurrentSession(s);
            render(screenRoot, s);
          }
        });
        choicesWrap.append(cBtn);
      }
      replyCard.append(choicesWrap);
    } else {
      replyCard.innerHTML = `
        <div style="font-family: var(--font-mono); font-size: 11px; color: #34D399; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          <span>✓ Cuộc trò chuyện này đã được bạn phản hồi và kết chuyển thành bút toán Sổ cái.</span>
        </div>
      `;
    }
    rightChat.append(replyCard);
  }

  chatLayout.append(rightChat);
  wrap.append(chatLayout);

  return wrap;
}

// ============================================================================
// TAB 3: TRUNG TÂM CÂN ĐỐI NGUỒN TIỀN DOANH NGHIỆP (TREASURY)
// ============================================================================
function renderTreasuryRebalanceTab(s, isPro) {
  const analysis = analyzeCashSources(s.fin);
  const wrap = el('div', '');
  wrap.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  const topBox = el('div', '');
  topBox.style.cssText = `
    padding: 14px 16px; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.4);
    border-left: 4px solid #06B6D4; border-radius: 4px;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
  `;
  topBox.innerHTML = `
    <div style="max-width: 680px;">
      <div style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 800;">
        🏦 CORPORATE TREASURY COMMAND // CÂN ĐỐI NGUỒN TIỀN & VỐN LƯU ĐỘNG DOANH NGHIỆP
      </div>
      <div style="font-size: 12px; color: #E2E8F0; margin-top: 4px; line-height: 1.5;">
        Điều phối tỷ trọng giữa <strong>Quỹ Tiền mặt (TK 111)</strong> và <strong>Tiền gửi Ngân hàng (TK 112)</strong>, đôn đốc thu hồi <strong>Phải thu khách hàng (TK 131)</strong>, tất toán <strong>Công nợ người bán (TK 331)</strong>, nộp <strong>Thuế (TK 3331)</strong> và quản trị <strong>Vốn vay ngắn hạn (TK 341)</strong>.
      </div>
    </div>
  `;

  const autoBtn = el('button', 'btn btn--ballpoint', '⚡ TỰ ĐỘNG CÂN ĐỐI NGUỒN TIỀN TỐI ƯU');
  autoBtn.style.cssText =
    'padding: 10px 14px; font-family: var(--font-mono); font-size: 11px; font-weight: 900;';
  autoBtn.addEventListener('click', () => {
    const res = executeCashRebalance(s.fin, { action: 'AUTO_OPTIMIZE' });
    if (res.ok) {
      s.score += 120;
      s.ok += 1;
      playSuccessLedger();
      s.toast = `🏦 Đã tự động cân đối nguồn tiền tối ưu & lưu phiên [${s.sessionId}]!`;
      s.feedback = {
        type: 'success',
        title: '🏦 ĐÃ TỰ ĐỘNG CÂN ĐỐI NGUỒN TIỀN DOANH NGHIỆP (+120 ĐIỂM)',
        message: res.message,
        deltaText: `Tiền mặt (111): ${vnd(s.fin.balances['111'] || 0)} | Ngân hàng (112): ${vnd(s.fin.balances['112'] || 0)}`,
      };
    } else {
      s.feedback = {
        type: 'info',
        title: 'ℹ️ NGUỒN TIỀN ĐÃ Ở TRẠNG THÁI TỐI ƯU',
        message: res.message,
      };
    }
    persistCurrentSession(s);
    render(screenRoot, s);
  });
  topBox.append(autoBtn);
  wrap.append(topBox);

  const cardsGrid = el('div', '');
  cardsGrid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;';

  const cashCards = [
    {
      title: 'QUỸ TIỀN MẶT TẠI KÉT (TK 111)',
      value: vnd(analysis.cash111),
      sub: `Tỷ trọng: ${analysis.cashRatioPct}% · Định mức chuẩn: ${vndShort(analysis.targetCash111)}`,
      status:
        Math.abs(analysis.cashVariance111) <= 15000000
          ? '✓ Định mức an toàn'
          : analysis.cashVariance111 > 0
            ? `⚠ Dư quỹ +${vndShort(analysis.cashVariance111)}`
            : `⚠ Thiếu quỹ ${vndShort(analysis.cashVariance111)}`,
      color: Math.abs(analysis.cashVariance111) <= 15000000 ? '#10B981' : '#F59E0B',
    },
    {
      title: 'TIỀN GỬI NGÂN HÀNG (TK 112)',
      value: vnd(analysis.bank112),
      sub: `Tỷ trọng: ${analysis.bankRatioPct}% trên tổng thanh khoản (${vndShort(analysis.totalCash)})`,
      status: '✓ Thanh toán B2B & Điện tử',
      color: '#38BDF8',
    },
    {
      title: 'NGUỒN THU NGẮN HẠN (TK 131 & 156)',
      value: `PT: ${vndShort(analysis.receivables131)}`,
      sub: `Hàng tồn kho (156): ${vndShort(analysis.inventory15x)} · VAT khấu trừ: ${vndShort(analysis.vatDeductible133)}`,
      status: `Tổng TS ngắn hạn: ${vndShort(analysis.totalCurrentAssets)}`,
      color: '#A855F7',
    },
    {
      title: 'NGHĨA VỤ NỢ NGẮN HẠN (331/333/341)',
      value: `Nợ: ${vndShort(analysis.totalCurrentLiabilities)}`,
      sub: `Phải trả NCC (331): ${vndShort(analysis.payables331)} · Thuế (3331): ${vndShort(analysis.taxPayable333)} · Vay (341): ${vndShort(analysis.shortTermDebt341)}`,
      status: `Current Ratio: ${analysis.currentRatio}x · Quick Ratio: ${analysis.quickRatio}x`,
      color: analysis.currentRatio >= 1.5 ? '#10B981' : '#F43F5E',
    },
  ];

  for (const c of cashCards) {
    const box = el('div', '');
    box.style.cssText = `
      background: ${isPro ? '#0A0F18' : '#111827'};
      border: 1px solid #334155; border-top: 3px solid ${c.color};
      border-radius: 4px; padding: 12px; display: flex; flex-direction: column; gap: 4px;
    `;
    box.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 10px; color: #94A3B8; font-weight: 800;">${c.title}</div>
      <div style="font-family: var(--font-mono); font-size: 16px; font-weight: 900; color: #F8FAFC;">${c.value}</div>
      <div style="font-size: 11px; color: #CBD5E1;">${c.sub}</div>
      <div style="font-family: var(--font-mono); font-size: 10px; color: ${c.color}; font-weight: 800; margin-top: 2px;">${c.status}</div>
    `;
    cardsGrid.append(box);
  }
  wrap.append(cardsGrid);

  const barBox = el('div', '');
  barBox.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'};
    border: 1px solid #334155; border-radius: 4px; padding: 14px;
  `;
  barBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 11px; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
      <span style="color: #F8FAFC; font-weight: 800;">CẤU TRÚC THANH KHOẢN: TIỀN MẶT 111 (${analysis.cashRatioPct}%) / TIỀN GỬI NGÂN HÀNG 112 (${analysis.bankRatioPct}%)</span>
      <span style="color: #34D399; font-weight: 800;">VỐN LƯU ĐỘNG RÒNG (NWC): ${vnd(analysis.netWorkingCapital)}</span>
    </div>
    <div style="width: 100%; height: 14px; background: #1E293B; border-radius: 7px; overflow: hidden; display: flex;">
      <div style="width: ${Math.min(100, Math.max(0, analysis.cashRatioPct))}%; background: #F59E0B;" title="Tiền mặt 111"></div>
      <div style="flex: 1; background: #0284C7;" title="Tiền gửi Ngân hàng 112"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: #94A3B8; margin-top: 6px;">
      <span>■ Vàng: Quỹ Tiền mặt (111) — Chuẩn tối ưu: 15%</span>
      <span>■ Xanh: Tiền gửi Ngân hàng (112) — Chuẩn tối ưu: 85%</span>
    </div>
  `;
  wrap.append(barBox);

  if (analysis.recommendations.length > 0) {
    const recBox = el('div', '');
    recBox.style.cssText =
      'background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 4px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;';
    recBox.innerHTML = `<div style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #FBBF24;">💡 KHUYẾN NGHỊ CÂN ĐỐI NGUỒN TIỀN TỪ HỆ THỐNG PHÂN TÍCH:</div>`;

    for (const rec of analysis.recommendations) {
      const rRow = el('div', '');
      rRow.style.cssText =
        'display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; background: #0D141F; padding: 8px 12px; border-radius: 4px; border: 1px solid #1E293B;';
      rRow.innerHTML = `<span style="font-size: 12px; color: #E2E8F0;">• ${rec.reason}</span>`;
      const applyBtn = el('button', 'btn', `Thực hiện ngay (${vndShort(rec.amount)})`);
      applyBtn.style.cssText =
        'min-height: 28px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; background: #0284C7; color: #FFFFFF; border: 1px solid #38BDF8;';
      applyBtn.addEventListener('click', () => {
        const res = executeCashRebalance(s.fin, { action: rec.action, amount: rec.amount });
        if (res.ok) {
          s.score += 100;
          s.ok += 1;
          playSuccessLedger();
          s.toast = `🏦 Đã thực hiện lệnh cân đối nguồn tiền (+100 điểm) & lưu phiên!`;
          s.feedback = {
            type: 'success',
            title: '✓ ĐÃ THỰC THI KHUYẾN NGHỊ CÂN ĐỐI NGUỒN TIỀN (+100 ĐIỂM)',
            message: res.message,
          };
          persistCurrentSession(s);
          render(screenRoot, s);
        }
      });
      rRow.append(applyBtn);
      recBox.append(rRow);
    }
    wrap.append(recBox);
  }

  const cmdBox = el('div', '');
  cmdBox.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'};
    border: 1px solid #334155; border-radius: 4px; padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
  `;
  cmdBox.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #38BDF8;">
      ⚡ LỆNH ĐIỀU CHUYỂN & CÂN ĐỐI NGUỒN TIỀN TRỰC TIẾP (TREASURY DISPATCH)
    </div>
  `;

  const actionGrid = el('div', '');
  actionGrid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px;';

  for (const act of CASH_REBALANCE_ACTIONS) {
    const selected = s.treasuryAction === act.id;
    const btn = el('button', '');
    btn.setAttribute('type', 'button');
    btn.style.cssText = `
      text-align: left; padding: 10px 12px; border-radius: 4px; cursor: pointer;
      background: ${selected ? 'rgba(56, 189, 248, 0.18)' : '#131C2B'};
      border: 1px solid ${selected ? '#38BDF8' : '#1E293B'};
      color: #F8FAFC; display: flex; flex-direction: column; gap: 4px;
    `;
    btn.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px;">
        <span style="color: #38BDF8; font-weight: 800;">${act.code}</span>
        <span style="color: #34D399; font-weight: 800;">Nợ TK ${act.debitAcc} / Có TK ${act.creditAcc}</span>
      </div>
      <div style="font-weight: 800; font-size: 12px; color: #FFFFFF;">${act.title}</div>
      <div style="font-size: 11px; color: #94A3B8; line-height: 1.35;">${act.summary}</div>
    `;
    btn.addEventListener('click', () => {
      s.treasuryAction = act.id;
      render(screenRoot, s);
    });
    actionGrid.append(btn);
  }
  cmdBox.append(actionGrid);

  const execRow = el('div', '');
  execRow.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding-top: 10px; border-top: 1px dashed #334155;';

  const presetWrap = el('div', '');
  presetWrap.style.cssText = 'display: flex; align-items: center; gap: 6px; flex-wrap: wrap;';
  const pwLabel = el('span', '', 'Mức tiền điều chuyển:');
  pwLabel.style.cssText =
    'font-family: var(--font-mono); font-size: 11px; color: #94A3B8;';
  presetWrap.append(pwLabel);

  for (const preset of [10000000, 20000000, 50000000, 100000000]) {
    const pBtn = el('button', 'btn btn--ghost', vndShort(preset));
    pBtn.style.cssText = `
      min-height: 28px; padding: 3px 10px; font-family: var(--font-mono); font-size: 11px;
      border: 1px solid ${s.treasuryAmount === preset ? '#38BDF8' : '#334155'};
      color: ${s.treasuryAmount === preset ? '#38BDF8' : '#CBD5E1'};
    `;
    pBtn.addEventListener('click', () => {
      s.treasuryAmount = preset;
      render(screenRoot, s);
    });
    presetWrap.append(pBtn);
  }

  const amtInput = el('input', '');
  amtInput.type = 'number';
  amtInput.value = String(s.treasuryAmount || 20000000);
  amtInput.style.cssText =
    'width: 155px; padding: 6px 10px; background: #070B11; border: 1px solid #38BDF8; color: #34D399; font-family: var(--font-mono); font-weight: 800; border-radius: 4px;';
  amtInput.addEventListener('change', () => {
    s.treasuryAmount = Number(amtInput.value) || 0;
  });
  presetWrap.append(amtInput);

  const runBtn = el('button', 'btn btn--ballpoint', '⚡ THỰC THI ĐIỀU CHUYỂN NGUỒN TIỀN');
  runBtn.style.cssText = 'padding: 9px 16px; font-family: var(--font-mono); font-size: 12px;';
  runBtn.addEventListener('click', () => {
    const val = Number(amtInput.value) || s.treasuryAmount;
    const res = executeCashRebalance(s.fin, { action: s.treasuryAction, amount: val });
    if (res.ok) {
      s.score += 80;
      s.ok += 1;
      playSuccessLedger();
      s.toast = `🏦 Đã thực thi lệnh điều chuyển nguồn tiền (${vndShort(val)}) & lưu phiên!`;
      s.feedback = {
        type: 'success',
        title: `✓ ĐIỀU CHUYỂN NGUỒN TIỀN THÀNH CÔNG (+80 ĐIỂM)`,
        message: res.message,
        deltaText: `Tiền mặt (111): ${vnd(s.fin.balances['111'] || 0)} | Ngân hàng (112): ${vnd(s.fin.balances['112'] || 0)}`,
      };
      persistCurrentSession(s);
    } else {
      playAlertBuzzer();
      s.feedback = {
        type: 'error',
        title: '⚠️ KHÔNG THỂ ĐIỀU CHUYỂN NGUỒN TIỀN',
        message: res.message,
      };
    }
    render(screenRoot, s);
  });

  execRow.append(presetWrap, runBtn);
  cmdBox.append(execRow);
  wrap.append(cmdBox);

  return wrap;
}

// ============================================================================
// TAB 4: TÀI KHOẢN TỔNG & BẢNG CÂN ĐỐI KẾ TOÁN DOANH NGHIỆP
// ============================================================================
function renderMasterAccountsTab(s, isPro) {
  const m = computeMetrics(s.fin);
  const tb = computeMasterAccountBalance(s.fin, s.bundle.accounts);
  const bs = tb.balanceSheet;

  const wrap = el('div', '');
  wrap.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  const eqBox = el('div', '');
  eqBox.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'};
    border: 1px solid ${tb.totals.isTrialBalanced ? '#10B981' : '#F43F5E'};
    border-left: 4px solid ${tb.totals.isTrialBalanced ? '#10B981' : '#F43F5E'};
    border-radius: 4px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
  `;

  const topEqRow = el('div', '');
  topEqRow.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;';
  topEqRow.innerHTML = `
    <div>
      <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #38BDF8;">
        ⚖️ HỆ THỐNG TÀI KHOẢN TỔNG & PHƯƠNG TRÌNH CÂN ĐỐI KẾ TOÁN (TT 99/2025/TT-BTC)
      </div>
      <div style="font-size: 12px; color: #CBD5E1; margin-top: 2px;">
        Mọi tài khoản từ Loại 1 đến Loại 9 được tổng hợp tự động theo nguyên tắc Ghi sổ kép (Tổng Dư Nợ = Tổng Dư Có).
      </div>
    </div>
  `;

  const closeBtn = el(
    'button',
    'btn btn--ballpoint',
    bs.unclosedProfit !== 0
      ? `🔒 Kết chuyển Lãi/Lỗ (${vndShort(bs.unclosedProfit)}) vào TK Tổng 421`
      : '✓ Đã kết chuyển toàn bộ Doanh thu & Chi phí về TK 421'
  );
  closeBtn.style.cssText =
    'padding: 9px 14px; font-family: var(--font-mono); font-size: 11px; font-weight: 800;';
  closeBtn.addEventListener('click', () => {
    const res = executeClosingEntries(s.fin);
    if (res.ok) {
      s.score += 150;
      s.ok += 1;
      playSuccessLedger();
      s.toast = `🔒 Đã kết chuyển Doanh thu & Chi phí qua TK 911 về TK 421 & lưu phiên!`;
      s.feedback = {
        type: 'success',
        title: '🔒 KẾT CHUYỂN TÀI KHOẢN TỔNG CUỐI KỲ THÀNH CÔNG (+150 ĐIỂM)',
        message: res.message,
        deltaText: `Số dư Có TK 421 (LN sau thuế chưa phân phối) sau kết chuyển: ${vnd(-(s.fin.balances['421'] || 0))}`,
      };
      persistCurrentSession(s);
    } else {
      s.feedback = {
        type: 'info',
        title: 'ℹ️ CÁC TÀI KHOẢN ĐÃ ĐƯỢC KẾT CHUYỂN',
        message: res.message,
      };
    }
    render(screenRoot, s);
  });
  topEqRow.append(closeBtn);
  eqBox.append(topEqRow);

  const eqGrid = el('div', '');
  eqGrid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;';
  eqGrid.innerHTML = `
    <div style="background: #131C2B; border: 1px solid #38BDF8; border-radius: 4px; padding: 12px;">
      <div style="font-family: var(--font-mono); font-size: 10px; color: #38BDF8; font-weight: 800;">A. TỔNG TÀI SẢN (LOẠI 1 + LOẠI 2)</div>
      <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 900; color: #FFFFFF; margin-top: 4px;">${vnd(bs.totalAssets)}</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Tiền, Phải thu, Tồn kho, TSCĐ ròng & Đầu tư</div>
    </div>
    <div style="background: #131C2B; border: 1px solid #F59E0B; border-radius: 4px; padding: 12px;">
      <div style="font-family: var(--font-mono); font-size: 10px; color: #F59E0B; font-weight: 800;">B1. NỢ PHẢI TRẢ (LOẠI 3)</div>
      <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 900; color: #FFFFFF; margin-top: 4px;">${vnd(bs.totalLiabilities)}</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Phải trả người bán (331), Thuế (333) & Vay (341)</div>
    </div>
    <div style="background: #131C2B; border: 1px solid #10B981; border-radius: 4px; padding: 12px;">
      <div style="font-family: var(--font-mono); font-size: 10px; color: #34D399; font-weight: 800;">B2. VỐN CHỦ SỞ HỮU (LOẠI 4 + LÃI KỲ NÀY)</div>
      <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 900; color: #FFFFFF; margin-top: 4px;">${vnd(bs.totalEquity)}</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Vốn CSH đã ghi sổ: ${vndShort(bs.totalEquityAccounts)} · Lãi chưa KC: ${vndShort(bs.unclosedProfit)}</div>
    </div>
  `;
  eqBox.append(eqGrid);

  const eqStatus = el('div', '');
  eqStatus.style.cssText = `
    padding: 8px 12px; border-radius: 3px; font-family: var(--font-mono); font-size: 11px; font-weight: 800; text-align: center;
    background: ${bs.fundamentalDiff === 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(244, 63, 94, 0.15)'};
    color: ${bs.fundamentalDiff === 0 ? '#34D399' : '#FB7185'};
  `;
  eqStatus.textContent =
    bs.fundamentalDiff === 0
      ? `✓ CÂN ĐỐI TÀI KHOẢN TỔNG TUYỆT ĐỐI: TỔNG TÀI SẢN (${vnd(bs.totalAssets)}) = TỔNG NGUỒN VỐN (${vnd(bs.totalResources)}) · CHÊNH LỆCH: 0 đ`
      : `⚠ CẢNH BÁO CHÊNH LỆCH BẢNG CÂN ĐỐI: ${vnd(bs.fundamentalDiff)}`;
  eqBox.append(eqStatus);
  wrap.append(eqBox);

  const tbBox = el('div', '');
  tbBox.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'};
    border: 1px solid #334155; border-radius: 4px; padding: 16px; overflow-x: auto;
  `;

  const typeBadge = (type) => {
    const map = {
      asset: { label: 'Tài sản', color: '#38BDF8' },
      liability: { label: 'Nợ phải trả', color: '#F59E0B' },
      equity: { label: 'Vốn CSH', color: '#A855F7' },
      revenue: { label: 'Doanh thu', color: '#10B981' },
      expense: { label: 'Chi phí', color: '#FB7185' },
      closing: { label: 'Kết chuyển', color: '#94A3B8' },
    };
    const info = map[type] || { label: type, color: '#94A3B8' };
    return `<span style="padding: 1px 6px; border-radius: 3px; background: rgba(255,255,255,0.06); color: ${info.color}; font-size: 10px;">${info.label}</span>`;
  };

  tbBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
      <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #38BDF8;">
        📋 BẢNG CÂN ĐỐI PHÁT SINH TÀI KHOẢN TỔNG (MASTER TRIAL BALANCE — ${tb.rows.length} TÀI KHOẢN HOẠT ĐỘNG)
      </div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: #34D399; font-weight: 700;">
        Tổng Phát sinh Nợ = Tổng Phát sinh Có = ${vnd(tb.totals.totalPeriodDebit)}
      </div>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 11px;">
      <thead>
        <tr style="border-bottom: 2px solid #334155; color: #94A3B8; background: #111A29;">
          <th style="padding: 8px; text-align: left;">MÃ TK</th>
          <th style="padding: 8px; text-align: left;">TÊN TÀI KHOẢN TỔNG</th>
          <th style="padding: 8px; text-align: center;">NHÓM</th>
          <th style="padding: 8px; text-align: right; color: #38BDF8;">DƯ NỢ ĐẦU</th>
          <th style="padding: 8px; text-align: right; color: #34D399;">DƯ CÓ ĐẦU</th>
          <th style="padding: 8px; text-align: right; color: #38BDF8;">PS NỢ KỲ NÀY</th>
          <th style="padding: 8px; text-align: right; color: #34D399;">PS CÓ KỲ NÀY</th>
          <th style="padding: 8px; text-align: right; color: #38BDF8;">DƯ NỢ CUỐI</th>
          <th style="padding: 8px; text-align: right; color: #34D399;">DƯ CÓ CUỐI</th>
        </tr>
      </thead>
      <tbody>
        ${tb.rows
          .map(
            (r) => `
          <tr style="border-bottom: 1px dashed #1E293B;">
            <td style="padding: 7px 8px; font-weight: 900; color: #38BDF8;">TK ${r.code}</td>
            <td style="padding: 7px 8px; color: #F8FAFC; font-family: var(--font-sans); font-size: 12px;">${r.name}</td>
            <td style="padding: 7px 8px; text-align: center;">${typeBadge(r.type)}</td>
            <td style="padding: 7px 8px; text-align: right; color: ${r.openingDebit ? '#E2E8F0' : '#475569'};">${r.openingDebit ? vndShort(r.openingDebit) : '—'}</td>
            <td style="padding: 7px 8px; text-align: right; color: ${r.openingCredit ? '#E2E8F0' : '#475569'};">${r.openingCredit ? vndShort(r.openingCredit) : '—'}</td>
            <td style="padding: 7px 8px; text-align: right; color: ${r.periodDebit ? '#38BDF8' : '#475569'}; font-weight: 700;">${r.periodDebit ? vndShort(r.periodDebit) : '—'}</td>
            <td style="padding: 7px 8px; text-align: right; color: ${r.periodCredit ? '#34D399' : '#475569'}; font-weight: 700;">${r.periodCredit ? vndShort(r.periodCredit) : '—'}</td>
            <td style="padding: 7px 8px; text-align: right; color: ${r.closingDebit ? '#FFFFFF' : '#475569'}; font-weight: 800;">${r.closingDebit ? vnd(r.closingDebit) : '—'}</td>
            <td style="padding: 7px 8px; text-align: right; color: ${r.closingCredit ? '#FFFFFF' : '#475569'}; font-weight: 800;">${r.closingCredit ? vnd(r.closingCredit) : '—'}</td>
          </tr>
        `
          )
          .join('')}
        <tr style="background: rgba(16, 185, 129, 0.14); border-top: 2px solid #10B981; font-weight: 900;">
          <td colspan="3" style="padding: 10px 8px; color: #34D399;">TỔNG CỘNG CÂN ĐỐI TÀI KHOẢN TỔNG</td>
          <td style="padding: 10px 8px; text-align: right; color: #38BDF8;">${vndShort(tb.totals.totalOpeningDebit)}</td>
          <td style="padding: 10px 8px; text-align: right; color: #34D399;">${vndShort(tb.totals.totalOpeningCredit)}</td>
          <td style="padding: 10px 8px; text-align: right; color: #38BDF8;">${vndShort(tb.totals.totalPeriodDebit)}</td>
          <td style="padding: 10px 8px; text-align: right; color: #34D399;">${vndShort(tb.totals.totalPeriodCredit)}</td>
          <td style="padding: 10px 8px; text-align: right; color: #38BDF8;">${vnd(tb.totals.totalClosingDebit)}</td>
          <td style="padding: 10px 8px; text-align: right; color: #34D399;">${vnd(tb.totals.totalClosingCredit)}</td>
        </tr>
      </tbody>
    </table>
  `;
  wrap.append(tbBox);

  const pnlBox = el('div', '');
  pnlBox.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'};
    border: 1px solid #334155; border-radius: 4px; padding: 16px;
  `;
  pnlBox.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #38BDF8; margin-bottom: 12px;">
      📊 BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH THỜI GIAN THỰC (LIVE P&L STATEMENT)
    </div>
    <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px;">
      <thead>
        <tr style="border-bottom: 1px solid #334155; color: #94A3B8; text-align: left;">
          <th style="padding: 8px;">CHỈ TIÊU TÀI CHÍNH</th>
          <th style="padding: 8px;">MÃ TK</th>
          <th style="padding: 8px; text-align: right;">SỐ TIỀN (VND)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px dashed #1E293B;">
          <td style="padding: 8px; color: #F8FAFC; font-weight: 700;">1. Doanh thu bán hàng, dịch vụ & tài chính</td>
          <td style="padding: 8px; color: #38BDF8;">511, 515</td>
          <td style="padding: 8px; text-align: right; color: #38BDF8; font-weight: 800;">${vnd(m.revenue)}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #1E293B;">
          <td style="padding: 8px; color: #CBD5E1;">2. Giá vốn hàng bán</td>
          <td style="padding: 8px; color: #94A3B8;">632</td>
          <td style="padding: 8px; text-align: right; color: #F59E0B;">(${vnd(m.cogs)})</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155; background: rgba(255,255,255,0.03);">
          <td style="padding: 8px; color: #FFFFFF; font-weight: 800;">3. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ</td>
          <td style="padding: 8px; color: #94A3B8;">—</td>
          <td style="padding: 8px; text-align: right; color: #F8FAFC; font-weight: 800;">${vnd(m.grossProfit)}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #1E293B;">
          <td style="padding: 8px; color: #CBD5E1;">4. Chi phí bán hàng, quản lý DN & tài chính</td>
          <td style="padding: 8px; color: #94A3B8;">641, 642, 635</td>
          <td style="padding: 8px; text-align: right; color: #F59E0B;">(${vnd(m.opex)})</td>
        </tr>
        <tr style="background: rgba(16, 185, 129, 0.12); border-top: 2px solid #10B981;">
          <td style="padding: 10px 8px; color: #34D399; font-weight: 900;">5. LỢI NHUẬN THUẦN TỪ HOẠT ĐỘNG KINH DOANH (NET PROFIT)</td>
          <td style="padding: 10px 8px; color: #34D399; font-weight: 800;">Margin ${m.profitMargin}%</td>
          <td style="padding: 10px 8px; text-align: right; color: #34D399; font-size: 15px; font-weight: 900;">${vnd(m.netProfit)}</td>
        </tr>
      </tbody>
    </table>
  `;
  wrap.append(pnlBox);

  const jrnBox = el('div', '');
  jrnBox.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'};
    border: 1px solid #334155; border-radius: 4px; padding: 16px;
  `;
  const jrnTitle = el('div', '', `📜 NHẬT KÝ SỔ CÁI ĐÃ KẾT CHUYỂN (${s.fin.journal?.length || 0} BÚT TOÁN)`);
  jrnTitle.style.cssText =
    'font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #38BDF8; margin-bottom: 10px;';
  jrnBox.append(jrnTitle);

  if (s.fin.journal.length === 0) {
    const empty = el(
      'div',
      '',
      'Chưa có bút toán phát sinh nào được kết chuyển trong phiên hiện tại.'
    );
    empty.style.cssText = 'color: #64748B; font-size: 12px; padding: 12px 0;';
    jrnBox.append(empty);
  } else {
    const jList = el('div', '');
    jList.style.cssText =
      'display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto;';
    for (const j of s.fin.journal) {
      const row = el('div', '');
      row.style.cssText =
        'padding: 10px 12px; background: #131C2B; border: 1px solid #1E293B; border-left: 3px solid #10B981; border-radius: 4px; font-size: 12px;';
      const linesTxt = j.lines.map((l) => `${l.side} TK ${l.account}: ${vnd(l.amount)}`).join(' | ');
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 800;">
          <span>${j.id} // ${j.source} · ${j.title}</span>
          <span style="color: ${j.profitDelta >= 0 ? '#34D399' : '#FB7185'};">
            Δ Lợi nhuận: ${j.profitDelta >= 0 ? '+' : ''}${vnd(j.profitDelta)}
          </span>
        </div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: #CBD5E1; margin-top: 4px;">
          ${linesTxt}
        </div>
      `;
      jList.append(row);
    }
    jrnBox.append(jList);
  }
  wrap.append(jrnBox);

  return wrap;
}

// ============================================================================
// TAB 5: HỆ SINH THÁI TẬP ĐOÀN ĐA NGÀNH, MỞ RỘNG KINH DOANH & TƯ VẤN CEO
// ============================================================================
function renderConglomerateAndAdvisoryTab(s, isPro) {
  const wrap = el('div', '');
  wrap.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  // 1. BANNER CHỈ HUY TẬP ĐOÀN ĐA NGÀNH
  const banner = el('div', '');
  banner.style.cssText =
    'padding: 16px 20px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.35); border-left: 4px solid #A855F7; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;';

  const totalSubsidiaryInvested = s.fin.balances['221'] || 0;
  const sectorsCount = s.fin.sectors?.length || 1;
  const totalSectorRev = s.fin.sectors?.reduce((acc, sec) => acc + (sec.totalRevenueGenerated || 0), 0) || 0;
  const totalSectorProfit = s.fin.sectors?.reduce((acc, sec) => acc + (sec.totalProfitGenerated || 0), 0) || 0;

  banner.innerHTML = `
    <div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: #A855F7; font-weight: 800; letter-spacing: 1px;">
        👑 CONGLOMERATE ECOSYSTEM // ĐẾ CHẾ TẬP ĐOÀN ĐA NGÀNH ĐẠI VIỆT
      </div>
      <div style="font-size: 16px; font-weight: 900; color: #FFFFFF; margin-top: 4px;">
        Hệ sinh thái ${sectorsCount} Đơn vị Thành viên · Vốn góp TK 221: <span style="color: #38BDF8;">${vndShort(totalSubsidiaryInvested)}</span>
      </div>
      <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">
        Doanh thu tích luỹ từ công ty con: <strong style="color: #34D399;">${vnd(totalSectorRev)}</strong> · Lợi nhuận tích luỹ: <strong style="color: #FBBF24;">${vnd(totalSectorProfit)}</strong>
      </div>
    </div>
  `;

  const harvestAllBtn = el('button', 'btn btn--ballpoint', '');
  harvestAllBtn.innerHTML = '<span class="bb-key-hint">[H]</span> 📈 THU HOẠCH TOÀN BỘ CÔNG TY CON';
  harvestAllBtn.style.cssText =
    'padding: 10px 18px; font-family: var(--font-mono); font-size: 12px; font-weight: 900; background: #0284C7; border: 1px solid #38BDF8;';
  harvestAllBtn.addEventListener('click', () => {
    handleHarvestAllSectors(s);
  });
  banner.append(harvestAllBtn);
  wrap.append(banner);

  // 2. KHỐI DANH SÁCH CÁC CÔNG TY CON ĐANG HOẠT ĐỘNG
  const subsPanel = el('div', 'pal-panel');
  subsPanel.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'}; border: 1px solid #334155; border-radius: 4px; overflow: hidden;
  `;
  const subsHead = el('div', 'pal-panel__header');
  subsHead.style.cssText = `
    padding: 10px 14px; background: ${isPro ? '#111A29' : '#0F172A'};
    border-bottom: 1px solid #1E293B; font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #38BDF8;
    display: flex; justify-content: space-between; align-items: center;
  `;
  subsHead.innerHTML = `
    <span>🏢 DANH MỤC ĐƠN VỊ THÀNH VIÊN ĐANG HOẠT ĐỘNG (${sectorsCount} CÔNG TY)</span>
    <span style="color: #94A3B8; font-size: 10px;">Đóng góp doanh thu định kỳ vào TK 511/515 & Tiền gửi 112</span>
  `;
  subsPanel.append(subsHead);

  const subsList = el('div', '');
  subsList.style.cssText = 'padding: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px;';

  for (const sec of s.fin.sectors || []) {
    const card = el('div', '');
    card.style.cssText = `
      background: #0E1626; border: 1px solid #1E293B; border-left: 4px solid #A855F7;
      border-radius: 4px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;
    `;
    card.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 10px; margin-bottom: 4px;">
          <span style="color: #A855F7; font-weight: 800;">${sec.icon} ${sec.code} // CÔNG TY CON</span>
          <span style="color: #34D399; font-weight: 800; background: rgba(16,185,129,0.12); padding: 1px 6px; border-radius: 3px;">
            ROI KỲ VỌNG: ${sec.expectedRoiPct}%
          </span>
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #FFFFFF; line-height: 1.3; margin-bottom: 4px;">
          ${sec.name}
        </div>
        <div style="font-size: 11px; color: #94A3B8; line-height: 1.4; margin-bottom: 8px;">
          ${sec.description || 'Đơn vị kinh doanh thành viên trong hệ sinh thái tập đoàn.'}
        </div>
        <div style="background: #090E17; border: 1px solid #1E293B; border-radius: 3px; padding: 6px 8px; font-family: var(--font-mono); font-size: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <span>Vốn góp (221): <strong style="color: #38BDF8;">${vndShort(sec.capexAmount)}</strong></span>
          <span>Chu kỳ đã chạy: <strong style="color: #F8FAFC;">${sec.cycleCount || 0} lần</strong></span>
          <span>Tổng Doanh thu: <strong style="color: #34D399;">${vndShort(sec.totalRevenueGenerated || 0)}</strong></span>
          <span>Tổng Lợi nhuận: <strong style="color: #FBBF24;">${vndShort(sec.totalProfitGenerated || 0)}</strong></span>
        </div>
      </div>
    `;

    const singleHarvestBtn = el('button', 'btn', `📈 Thu hoạch Chu kỳ ${sec.code}`);
    singleHarvestBtn.style.cssText =
      'width: 100%; justify-content: center; padding: 6px; font-family: var(--font-mono); font-size: 10px; font-weight: 700; background: #131E31; color: #34D399; border: 1px solid #10B981;';
    singleHarvestBtn.addEventListener('click', () => {
      const res = harvestSectorCycle(s.fin, sec.instanceId);
      if (res.success) {
        playSuccessLedger();
        s.score += 150;
        s.toast = `📈 Đã thu hoạch chu kỳ kinh doanh từ ${sec.name} (+${vndShort(res.totalRevenue)} DT)`;
        s.feedback = {
          type: 'success',
          title: `📈 THU HOẠCH DOANH THU: ${sec.name}`,
          message: `Doanh thu mới: +${vnd(res.totalRevenue)} | Chi phí vận hành: ${vnd(res.totalCost)} | Lợi nhuận ròng: +${vnd(res.totalProfit)}`,
          deltaText: `Đã tự động hạch toán Nợ 112 / Có 511 và Nợ 642 / Có 112 vào Sổ cái Tập đoàn.`,
        };
        persistCurrentSession(s);
        render(screenRoot, s);
      }
    });
    card.append(singleHarvestBtn);
    subsList.append(card);
  }
  subsPanel.append(subsList);
  wrap.append(subsPanel);

  // 3. KHỐI TRÌNH MỞ RỘNG LĨNH VỰC KINH DOANH MỚI & TỰ KHỞI TẠO NGÀNH RIÊNG
  const expansionPanel = el('div', 'pal-panel');
  expansionPanel.style.cssText = `
    background: ${isPro ? '#0A0F18' : '#111827'}; border: 1px solid #334155; border-radius: 4px; overflow: hidden;
  `;
  const expHead = el('div', 'pal-panel__header');
  expHead.style.cssText = `
    padding: 10px 14px; background: ${isPro ? '#111A29' : '#0F172A'};
    border-bottom: 1px solid #1E293B; font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #F59E0B;
    display: flex; justify-content: space-between; align-items: center;
  `;
  expHead.innerHTML = `
    <span>🚀 MỞ RỘNG ĐẾ CHẾ KINH DOANH: CHỌN DANH MỤC HOẶC TỰ SÁNG LẬP NGÀNH MỚI</span>
    <span style="color: #94A3B8; font-size: 10px;">Giải ngân vốn đầu tư vào TK 221 từ Tiền gửi 112 hoặc Vay 341</span>
  `;
  expansionPanel.append(expHead);

  const expBody = el('div', '');
  expBody.style.cssText = 'padding: 16px; display: flex; flex-direction: column; gap: 14px;';

  // Cách thức 1: Chọn từ Danh mục 8 Ngành Mẫu
  const catSection = el('div', '');
  catSection.style.cssText = 'background: #0E1626; border: 1px solid #1E293B; border-radius: 4px; padding: 14px;';
  catSection.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 800; margin-bottom: 8px;">
      1. ĐẦU TƯ MỞ RỘNG TỪ DANH MỤC 8 LĨNH VỰC TRỌNG YẾU QUỐC GIA
    </div>
  `;

  const catSelectRow = el('div', '');
  catSelectRow.style.cssText = 'display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px;';

  const catSelect = el('select', '');
  catSelect.style.cssText =
    'padding: 8px 12px; background: #080D16; border: 1px solid #334155; color: #F8FAFC; font-size: 13px; border-radius: 3px; flex: 1; min-width: 260px;';
  for (const cat of BUSINESS_SECTORS_CATALOG) {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.name} — Vốn Capex: ${vndShort(cat.capexAmount)} (ROI: ${cat.expectedRoiPct}%)`;
    if (cat.id === s.selectedSectorCatalogId) opt.selected = true;
    catSelect.append(opt);
  }
  catSelect.addEventListener('change', () => {
    s.selectedSectorCatalogId = catSelect.value;
  });

  const fundingSelect = el('select', '');
  fundingSelect.style.cssText =
    'padding: 8px 12px; background: #080D16; border: 1px solid #334155; color: #F8FAFC; font-size: 13px; border-radius: 3px; min-width: 220px;';
  fundingSelect.innerHTML = `
    <option value="CASH_112">100% Tiền gửi Ngân hàng (TK 112)</option>
    <option value="LEVERAGE_341">50% Ngân hàng + 50% Vay Tín dụng (TK 341)</option>
  `;
  fundingSelect.value = s.sectorFundingMode || 'CASH_112';
  fundingSelect.addEventListener('change', () => {
    s.sectorFundingMode = fundingSelect.value;
  });

  const confirmExpandBtn = el('button', 'btn btn--ballpoint', '🚀 Phê duyệt Giải ngân & Khởi lập');
  confirmExpandBtn.style.cssText =
    'padding: 8px 16px; font-family: var(--font-mono); font-size: 12px; font-weight: 800;';
  confirmExpandBtn.addEventListener('click', () => {
    const res = expandBusinessSector(s.fin, {
      sectorId: s.selectedSectorCatalogId,
      fundingMode: s.sectorFundingMode,
    });
    if (!res.success) {
      s.toast = `⚠️ Không thể mở rộng ngành: ${res.reason}`;
      playAlertBuzzer();
      s.feedback = {
        type: 'error',
        title: 'LỆNH MỞ RỘNG BỊ TỪ CHỐI',
        message: res.reason,
      };
      render(screenRoot, s);
      return;
    }

    playSuccessLedger();
    s.score += 300;
    s.toast = `🎉 Đã thành lập và giải ngân vốn thành công: ${res.sector.name}!`;
    s.feedback = {
      type: 'success',
      title: `🎉 CHÀO MỪNG ĐƠN VỊ THÀNH VIÊN MỚI: ${res.sector.name} (+300 ĐIỂM)`,
      message: `Đã tự động hạch toán tăng TK 221 (Đầu tư công ty con) và tạo kênh Slack ${res.sector.channel}.`,
      deltaText: `Vốn giải ngân: ${vnd(res.sector.capexAmount)} · Phương thức tài trợ: ${s.sectorFundingMode === 'CASH_112' ? '100% Tiền gửi 112' : 'Đòn bẩy 50% Vay 341'}`,
    };
    persistCurrentSession(s);
    render(screenRoot, s);
  });

  catSelectRow.append(catSelect, fundingSelect, confirmExpandBtn);
  catSection.append(catSelectRow);
  expBody.append(catSection);

  // Cách thức 2: Trình Sáng lập Lĩnh vực Kinh doanh Tự do (Custom Sector Builder)
  const customSection = el('div', '');
  customSection.style.cssText = 'background: #0E1626; border: 1px solid #334155; border-radius: 4px; padding: 14px;';
  customSection.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 11px; color: #F59E0B; font-weight: 800; margin-bottom: 8px;">
      2. TRÌNH TỰ DO SÁNG LẬP LĨNH VỰC KINH DOANH RIÊNG (CUSTOM SECTOR BUILDER)
    </div>
    <div style="font-size: 12px; color: #94A3B8; margin-bottom: 12px;">
      CEO có thể tự do mở rộng sang bất kỳ ngành nghề mới lạ nào: Đặt tên ngành, biểu tượng, quy mô vốn đầu tư và tỷ suất ROI kỳ vọng. Hệ thống sẽ tự động hạch toán sổ cái và đưa vào hệ sinh thái tập đoàn!
    </div>
  `;

  const formGrid = el('div', '');
  formGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 12px;';

  const nameInp = el('input', '');
  nameInp.placeholder = 'Tên lĩnh vực / Công ty con...';
  nameInp.value = s.customSectorForm.name;
  nameInp.style.cssText = 'padding: 8px 10px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px;';

  const iconInp = el('input', '');
  iconInp.placeholder = 'Icon (vd: 🚀, 🤖, 🏥)';
  iconInp.value = s.customSectorForm.icon;
  iconInp.style.cssText = 'padding: 8px 10px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px; width: 80px; text-align: center;';

  const capexInp = el('input', '');
  capexInp.type = 'number';
  capexInp.placeholder = 'Vốn đầu tư (VND)';
  capexInp.value = s.customSectorForm.capexAmount;
  capexInp.style.cssText = 'padding: 8px 10px; background: #080D16; border: 1px solid #334155; color: #38BDF8; font-size: 12px; border-radius: 3px; font-family: var(--font-mono);';

  const roiInp = el('input', '');
  roiInp.type = 'number';
  roiInp.placeholder = 'ROI kỳ vọng % (5 - 100)';
  roiInp.value = s.customSectorForm.expectedRoiPct;
  roiInp.style.cssText = 'padding: 8px 10px; background: #080D16; border: 1px solid #334155; color: #34D399; font-size: 12px; border-radius: 3px; font-family: var(--font-mono); width: 100px;';

  const createCustomBtn = el('button', 'btn btn--ballpoint', '✨ Sáng lập & Khởi nghiệp Ngành này');
  createCustomBtn.style.cssText = 'padding: 8px 16px; font-family: var(--font-mono); font-size: 12px; font-weight: 800;';
  createCustomBtn.addEventListener('click', () => {
    const customDef = {
      name: nameInp.value.trim() || 'Công ty TNHH Sáng tạo Mới',
      code: 'CUSTOM_' + Math.floor(Math.random() * 900 + 100),
      icon: iconInp.value.trim() || '🚀',
      capexAmount: Number(capexInp.value) || 200000000,
      expectedRoiPct: Number(roiInp.value) || 25,
      riskLevel: 'HIGH',
      description: 'Lĩnh vực kinh doanh mới do CEO phê duyệt mở rộng quy mô tập đoàn.',
    };

    const res = expandBusinessSector(s.fin, {
      customSector: customDef,
      fundingMode: s.sectorFundingMode || 'CASH_112',
    });

    if (!res.success) {
      s.toast = `⚠️ Không thể mở rộng ngành: ${res.reason}`;
      playAlertBuzzer();
      s.feedback = {
        type: 'error',
        title: 'LỆNH SÁNG LẬP NGÀNH BỊ TỪ CHỐI',
        message: res.reason,
      };
      render(screenRoot, s);
      return;
    }

    playSuccessLedger();
    s.score += 350;
    s.toast = `✨ Đã chính thức sáng lập: ${res.sector.name}!`;
    s.feedback = {
      type: 'success',
      title: `✨ THÀNH LẬP THÀNH CÔNG: ${res.sector.name} (+350 ĐIỂM)`,
      message: `Đơn vị kinh doanh mới đã được cấp vốn và tích hợp vào hệ sinh thái Tài khoản Tổng.`,
      deltaText: `Vốn giải ngân: ${vnd(res.sector.capexAmount)} · Tỷ suất sinh lời mục tiêu: ${res.sector.expectedRoiPct}%`,
    };
    persistCurrentSession(s);
    render(screenRoot, s);
  });

  formGrid.append(nameInp, iconInp, capexInp, roiInp, createCustomBtn);
  customSection.append(formGrid);
  expBody.append(customSection);

  expansionPanel.append(expBody);
  wrap.append(expansionPanel);

  // 4. QUYẾT ĐỊNH CHIẾN LƯỢC M&A VĨ MÔ TỪ ADVISORY CATALOG
  const advSecTitle = el('div', '');
  advSecTitle.style.cssText =
    'font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #38BDF8; margin-top: 10px;';
  advSecTitle.innerHTML = `🌐 PHÊ DUYỆT CÁC QUYẾT ĐỊNH CHIẾN LƯỢC TÀI CHÍNH VĨ MÔ (${s.fin.enactedAdvisories.length}/${ADVISORY_CATALOG.length} ĐÃ BAN HÀNH)`;
  wrap.append(advSecTitle);

  const grid = el('div', '');
  grid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 12px;';

  for (const adv of ADVISORY_CATALOG) {
    const enacted = s.fin.enactedAdvisories.includes(adv.id);
    const card = el('div', '');
    card.style.cssText = `
      background: ${isPro ? '#0A0F18' : '#111827'};
      border: 1px solid ${enacted ? '#10B981' : '#334155'};
      border-top: 3px solid ${enacted ? '#10B981' : '#38BDF8'};
      border-radius: 4px; padding: 16px;
      display: flex; flex-direction: column; justify-content: space-between; gap: 12px;
    `;

    const linesSummary = adv.lines
      .map((l) => `${l.side === 'N' ? 'Nợ' : 'Có'} TK ${l.account}: ${vndShort(l.amount)}`)
      .join(' · ');

    card.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 10px; margin-bottom: 6px;">
          <span style="color: #38BDF8; font-weight: 800;">${adv.code} // ${adv.category}</span>
          <span style="padding: 2px 6px; border-radius: 3px; background: ${enacted ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)'}; color: ${enacted ? '#34D399' : '#FBBF24'}; font-weight: 800;">
            ${enacted ? '✓ ĐÃ THỰC THI' : `RỦI RO: ${adv.riskLevel}`}
          </span>
        </div>
        <h3 style="font-size: 15px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px; line-height: 1.35;">
          ${adv.title}
        </h3>
        <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; margin-bottom: 10px;">
          ${adv.summary}
        </p>
        <div style="background: #131C2B; border: 1px solid #1E293B; border-radius: 4px; padding: 8px 10px; font-size: 11px; margin-bottom: 8px;">
          <div style="color: #CBD5E1; margin-bottom: 3px;"><strong>Chi phí / Nguồn lực:</strong> ${adv.costText}</div>
          <div style="color: #34D399; font-weight: 700;"><strong>Kết quả dự kiến:</strong> ${adv.impactText}</div>
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: #64748B;">
          Bút toán: ${linesSummary}
        </div>
      </div>
    `;

    const execBtn = el(
      'button',
      'btn',
      enacted ? '✓ Quyết định Tư vấn đã được Ban hành' : '⚡ PHÊ DUYỆT & THỰC THI TƯ VẤN'
    );
    execBtn.disabled = enacted;
    execBtn.style.cssText = `
      width: 100%; justify-content: center; padding: 10px; font-family: var(--font-mono); font-size: 11px; font-weight: 800;
      background: ${enacted ? '#1E293B' : '#0284C7'};
      color: ${enacted ? '#34D399' : '#FFFFFF'};
      border: 1px solid ${enacted ? '#10B981' : '#38BDF8'};
    `;

    if (!enacted) {
      execBtn.addEventListener('click', () => {
        const res = executeAdvisory(s.fin, adv.id);
        s.score += 200;
        s.ok += 1;
        playSuccessLedger();
        s.toast = `🌐 Đã thực thi quyết định CFO [${adv.code}] & lưu phiên [${s.sessionId}]!`;
        s.feedback = {
          type: 'success',
          title: `🌐 ĐÃ BAN HÀNH QUYẾT ĐỊNH TƯ VẤN CFO: ${adv.code} (+200 ĐIỂM)`,
          message: `${adv.title} đã được hạch toán vào Tài khoản Tổng của doanh nghiệp.`,
          deltaText: `Doanh thu mới: ${vnd(res.metrics.revenue)} | Lợi nhuận ròng mới: ${vnd(res.metrics.netProfit)} (Margin: ${res.metrics.profitMargin}%)`,
        };
        persistCurrentSession(s);
        render(screenRoot, s);
      });
    }

    card.append(execBtn);
    grid.append(card);
  }

  wrap.append(grid);
  return wrap;
}

function handleHarvestAllSectors(s) {
  const res = harvestSectorCycle(s.fin);
  if (!res.success) {
    s.toast = `⚠️ ${res.reason}`;
    playAlertBuzzer();
    render(screenRoot, s);
    return;
  }

  playSuccessLedger();
  s.score += 250;
  s.toast = `📈 Thu hoạch toàn tập đoàn thành công: +${vndShort(res.totalRevenue)} DT, +${vndShort(res.totalProfit)} LN!`;
  s.feedback = {
    type: 'success',
    title: `📈 THU HOẠCH CHU KỲ KINH DOANH TOÀN TẬP ĐOÀN (+250 ĐIỂM)`,
    message: `${res.sectors.length} đơn vị thành viên đã nộp tổng doanh thu ${vnd(res.totalRevenue)} và lợi nhuận ròng ${vnd(res.totalProfit)} vào Ngân quỹ tập đoàn (TK 112).`,
    deltaText: `Đã tự động cập nhật Bảng Cân đối Tài khoản Tổng và P&L Statement.`,
  };
  persistCurrentSession(s);
  render(screenRoot, s);
}

// ============================================================================
// 5. CỘT PHẢI: AI CFO CO-PILOT, BIỂU ĐỒ TELEMETRY & TÓM TẮT NGUỒN TIỀN
// ============================================================================
function renderRightTelemetryPanel(s, isPro) {
  const col = el('div', 'erp-col-right');
  col.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

  // KHỐI 1: TRỢ LÝ AI CFO CO-PILOT NHANH
  const cfoPersonaDef = CFO_PERSONAS[s.llmConfig?.persona] || CFO_PERSONAS.strategic_big4;
  const cfoWidget = el('div', 'pal-panel');
  cfoWidget.style.cssText = `
    background: ${isPro ? '#0D141F' : '#1E293B'};
    border: 1px solid #38BDF8;
    border-left: 4px solid #38BDF8;
    border-radius: 4px; overflow: hidden;
  `;
  const cfoHead = el('div', 'pal-panel__header');
  cfoHead.style.cssText = `
    padding: 10px 14px; background: ${isPro ? '#111A29' : '#0F172A'};
    border-bottom: 1px solid #1E293B; font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #38BDF8;
    display: flex; justify-content: space-between; align-items: center;
  `;
  cfoHead.innerHTML = `
    <span>🧠 AI CFO // ${cfoPersonaDef.name}</span>
    <span style="color: #34D399; font-size: 10px;">${s.llmConfig.provider === 'offline_heuristic' ? 'OFFLINE CFO' : (s.llmConfig.model || 'ONLINE')}</span>
  `;
  cfoWidget.append(cfoHead);

  const cfoBody = el('div', '');
  cfoBody.style.cssText = 'padding: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 12px;';
  cfoBody.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 8px;">
      <span style="font-size: 24px;">${cfoPersonaDef.avatar}</span>
      <div style="color: #E2E8F0; line-height: 1.4; font-size: 11px;">
        Chào CEO! Tôi luôn túc trực hỗ trợ bạn phân tích chứng từ, kiểm soát dòng tiền, mở rộng công ty con và tối ưu hóa lợi nhuận.
      </div>
    </div>
  `;

  const cfoBtnRow = el('div', '');
  cfoBtnRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px;';

  const askCfoBtn = el('button', 'btn btn--ballpoint', '');
  askCfoBtn.innerHTML = '<span class="bb-key-hint">[C]</span> 💬 Hỏi CFO Tư vấn';
  askCfoBtn.style.cssText = 'min-height: 32px; font-size: 11px; font-family: var(--font-mono); font-weight: 800;';
  askCfoBtn.addEventListener('click', () => {
    s.showCfoModal = true;
    render(screenRoot, s);
  });

  const configLlmBtn = el('button', 'btn btn--ghost', '');
  configLlmBtn.innerHTML = '<span class="bb-key-hint">[S]</span> ⚙️ Cài đặt LLM';
  configLlmBtn.style.cssText = 'min-height: 32px; font-size: 11px; font-family: var(--font-mono);';
  configLlmBtn.addEventListener('click', () => {
    s.showSettingsModal = true;
    render(screenRoot, s);
  });

  cfoBtnRow.append(askCfoBtn, configLlmBtn);
  cfoBody.append(cfoBtnRow);
  cfoWidget.append(cfoBody);
  col.append(cfoWidget);

  // KHỐI 2: BIỂU ĐỒ TELEMETRY DOANH THU & LỢI NHUẬN
  const chartPanel = el('div', 'pal-panel');
  chartPanel.style.cssText = `
    background: ${isPro ? '#0D141F' : '#1E293B'};
    border: 1px solid ${isPro ? '#1E293B' : '#334155'};
    border-radius: 4px; overflow: hidden;
  `;
  const chartHead = el('div', 'pal-panel__header');
  chartHead.style.cssText = `
    padding: 10px 14px; background: ${isPro ? '#111A29' : '#0F172A'};
    border-bottom: 1px solid #1E293B; font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #38BDF8;
    display: flex; justify-content: space-between;
  `;
  chartHead.innerHTML = `
    <span>📈 TELEMETRY // DOANH THU & LỢI NHUẬN</span>
    <span style="color: #34D399;">LIVE</span>
  `;
  chartPanel.append(chartHead);

  const chartBody = el('div', '');
  chartBody.style.cssText = 'padding: 14px;';
  chartBody.innerHTML = buildTelemetrySvgChart(s.fin.telemetry);
  chartPanel.append(chartBody);
  col.append(chartPanel);

  // KHỐI 3: NGUỒN TIỀN & SLACK HUB
  const treasury = analyzeCashSources(s.fin);
  const tb = computeMasterAccountBalance(s.fin, s.bundle.accounts);
  const pendingSlack = (s.fin.slackEvents || []).filter((e) => e.status === 'PENDING').length;

  const monitorPanel = el('div', 'pal-panel');
  monitorPanel.style.cssText = `
    background: ${isPro ? '#0D141F' : '#1E293B'};
    border: 1px solid ${isPro ? '#1E293B' : '#334155'};
    border-radius: 4px; overflow: hidden;
  `;
  const monHead = el('div', 'pal-panel__header');
  monHead.style.cssText = `
    padding: 10px 14px; background: ${isPro ? '#111A29' : '#0F172A'};
    border-bottom: 1px solid #1E293B; font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #34D399;
    display: flex; justify-content: space-between;
  `;
  monHead.innerHTML = `
    <span>🏦 NGUỒN TIỀN & SLACK HUB</span>
    <span>${pendingSlack > 0 ? `💬 ${pendingSlack} LỆNH CHỜ` : '✓ HOÀN TẤT'}</span>
  `;
  monitorPanel.append(monHead);

  const monBody = el('div', '');
  monBody.style.cssText = 'padding: 12px; display: flex; flex-direction: column; gap: 8px; font-size: 11px;';
  monBody.innerHTML = `
    <div style="background: #111927; border: 1px solid #1E293B; border-radius: 4px; padding: 8px 10px; font-family: var(--font-mono);">
      <div style="display: flex; justify-content: space-between; color: #94A3B8; font-size: 10px;">
        <span>QUỸ TIỀN MẶT (111):</span>
        <strong style="color: #F59E0B;">${vndShort(treasury.cash111)} (${treasury.cashRatioPct}%)</strong>
      </div>
      <div style="display: flex; justify-content: space-between; color: #94A3B8; font-size: 10px; margin-top: 4px;">
        <span>NGÂN HÀNG (112):</span>
        <strong style="color: #38BDF8;">${vndShort(treasury.bank112)} (${treasury.bankRatioPct}%)</strong>
      </div>
      <div style="display: flex; justify-content: space-between; color: #94A3B8; font-size: 10px; margin-top: 4px; border-top: 1px dashed #1E293B; padding-top: 4px;">
        <span>TỔNG TÀI SẢN = NGUỒN VỐN:</span>
        <strong style="color: #34D399;">${vndShort(tb.balanceSheet.totalAssets)}</strong>
      </div>
    </div>
  `;

  const btnGroupMon = el('div', '');
  btnGroupMon.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px;';

  const goSlackBtn = el('button', 'btn', `💬 Chat Slack (${pendingSlack})`);
  goSlackBtn.style.cssText =
    'min-height: 30px; padding: 4px 8px; font-size: 10px; font-family: var(--font-mono); background: rgba(56,189,248,0.16); color: #38BDF8; border: 1px solid #38BDF8;';
  goSlackBtn.addEventListener('click', () => {
    s.activeTab = 'slack_chat';
    persistCurrentSession(s);
    render(screenRoot, s);
  });

  const goTreasuryBtn = el('button', 'btn', '🏦 Cân đối Nguồn tiền');
  goTreasuryBtn.style.cssText =
    'min-height: 30px; padding: 4px 8px; font-size: 10px; font-family: var(--font-mono); background: rgba(6,182,212,0.16); color: #06B6D4; border: 1px solid #06B6D4;';
  goTreasuryBtn.addEventListener('click', () => {
    s.activeTab = 'treasury';
    persistCurrentSession(s);
    render(screenRoot, s);
  });

  btnGroupMon.append(goSlackBtn, goTreasuryBtn);
  monBody.append(btnGroupMon);
  monitorPanel.append(monBody);
  col.append(monitorPanel);

  // KHỐI 4: CĂN CỨ PHÁP CHẾ & CHUẨN MỰC
  const legalPanel = el('div', 'pal-panel');
  legalPanel.style.cssText = `
    background: ${isPro ? '#0D141F' : '#1E293B'};
    border: 1px solid ${isPro ? '#1E293B' : '#334155'};
    border-radius: 4px; overflow: hidden;
  `;
  legalPanel.innerHTML = `
    <div style="padding: 10px 14px; background: ${isPro ? '#111A29' : '#0F172A'}; border-bottom: 1px solid #1E293B; font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: #CBD5E1;">
      ⚖️ CĂN CỨ PHÁP CHẾ & CHUẨN MỰC
    </div>
    <div style="padding: 12px 14px; font-size: 11px; color: #94A3B8; line-height: 1.55; display: flex; flex-direction: column; gap: 8px;">
      <div>
        <strong style="color: #F8FAFC;">• Thông tư 99/2025/TT-BTC:</strong> Chế độ kế toán doanh nghiệp áp dụng từ 01/01/2026. Bảng Cân đối Tài khoản Tổng bắt buộc đảm bảo Tổng Dư Nợ = Tổng Dư Có.
      </div>
      <div>
        <strong style="color: #F8FAFC;">• Luật Thuế GTGT 48/2024/QH15:</strong> Mọi khoản chi từ 5 triệu đồng trở lên bắt buộc thanh toán không dùng tiền mặt (TK 112) và có HĐĐT hợp pháp để được tính vào chi phí được trừ.
      </div>
    </div>
  `;
  col.append(legalPanel);

  return col;
}

function buildTelemetrySvgChart(telemetry = []) {
  const pts = telemetry.slice(-7);
  const maxVal = Math.max(150000000, ...pts.map((p) => Math.max(p.revenue, p.profit)));
  const w = 290;
  const h = 145;
  const padBottom = 24;
  const padTop = 14;
  const chartH = h - padBottom - padTop;
  const stepX = pts.length > 1 ? (w - 30) / (pts.length - 1) : w / 2;

  let barsSvg = '';
  let polyPoints = '';
  let dotsSvg = '';
  let labelsSvg = '';

  pts.forEach((p, idx) => {
    const x = 18 + idx * stepX;
    const revH = Math.max(4, Math.round((p.revenue / maxVal) * chartH));
    const revY = padTop + (chartH - revH);

    const profRatio = Math.max(0, p.profit) / maxVal;
    const profY = padTop + Math.round(chartH * (1 - profRatio));

    barsSvg += `<rect x="${x - 8}" y="${revY}" width="16" height="${revH}" rx="2" fill="rgba(56, 189, 248, 0.35)" stroke="#38BDF8" stroke-width="1" />`;
    polyPoints += `${x},${profY} `;
    dotsSvg += `<circle cx="${x}" cy="${profY}" r="3.5" fill="#10B981" stroke="#070B11" stroke-width="1.5" />`;
    labelsSvg += `<text x="${x}" y="${h - 6}" text-anchor="middle" fill="#94A3B8" font-size="9" font-family="monospace">${p.label}</text>`;
  });

  return `
    <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; margin-bottom: 6px;">
      <span style="color: #38BDF8;">■ Doanh thu lũy kế</span>
      <span style="color: #10B981;">● Lợi nhuận ròng</span>
    </div>
    <svg viewBox="0 0 ${w} ${h}" style="width: 100%; height: 145px; background: #070B11; border: 1px solid #1E293B; border-radius: 4px;">
      <line x1="0" y1="${padTop + chartH}" x2="${w}" y2="${padTop + chartH}" stroke="#1E293B" stroke-width="1" />
      <line x1="0" y1="${padTop + chartH / 2}" x2="${w}" y2="${padTop + chartH / 2}" stroke="#1E293B" stroke-dasharray="3,3" stroke-width="1" />
      ${barsSvg}
      <polyline fill="none" stroke="#10B981" stroke-width="2.2" points="${polyPoints.trim()}" />
      ${dotsSvg}
      ${labelsSvg}
    </svg>
  `;
}

// ============================================================================
// 6. MODAL AI CFO CO-PILOT: PHÒNG TƯ VẤN TRỰC TIẾP CHO CEO
// ============================================================================
function renderCfoModal(s, isPro) {
  const overlay = el('div', 'cfo-modal-overlay');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
  `;

  const modal = el('div', 'cfo-modal');
  modal.style.cssText = `
    width: 100%; max-width: 680px; max-height: 85vh; background: #0B111E; border: 1px solid #38BDF8;
    border-top: 4px solid #38BDF8; border-radius: 6px; box-shadow: 0 25px 60px rgba(0,0,0,0.8);
    display: flex; flex-direction: column; overflow: hidden; color: #E2E8F0;
  `;

  const personaDef = CFO_PERSONAS[s.llmConfig?.persona] || CFO_PERSONAS.strategic_big4;

  // Header
  const head = el('div', '');
  head.style.cssText = `
    padding: 12px 18px; background: #111A29; border-bottom: 1px solid #1E293B;
    display: flex; justify-content: space-between; align-items: center;
  `;
  head.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 24px;">${personaDef.avatar}</span>
      <div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 800;">
          AI CFO ADVISOR // ${personaDef.name}
        </div>
        <div style="font-size: 11px; color: #94A3B8;">
          Model: <strong style="color: #34D399;">${s.llmConfig.provider === 'offline_heuristic' ? 'Built-in Quantitative CFO Engine' : (s.llmConfig.model || 'Online LLM')}</strong>
        </div>
      </div>
    </div>
  `;

  const closeBtn = el('button', 'btn btn--ghost', '✕ Đóng [Esc]');
  closeBtn.style.cssText = 'min-height: 28px; padding: 2px 10px; font-size: 11px;';
  closeBtn.addEventListener('click', () => {
    s.showCfoModal = false;
    render(screenRoot, s);
  });
  head.append(closeBtn);
  modal.append(head);

  // Chat message container
  const chatBox = el('div', 'cfo-chat-container');
  chatBox.style.cssText = `
    flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
    background: #080D16; min-height: 260px; max-height: 48vh;
  `;

  // Mở đầu nếu chưa có lịch sử
  if (!s.cfoChatHistory || s.cfoChatHistory.length === 0) {
    s.cfoChatHistory = [
      {
        role: 'cfo',
        text: `Chào CEO! Tôi là Giám đốc Tài chính AI của bạn (${personaDef.name}). Tôi đã nắm toàn bộ số liệu thời gian thực của Tập đoàn Đại Việt (Doanh thu, P&L, Ngân quỹ 111/112, Đầu tư 221). Bạn cần tôi tư vấn chiến lược gì lúc này?`,
      },
    ];
  }

  for (const msg of s.cfoChatHistory) {
    const isUser = msg.role === 'user';
    const row = el('div', '');
    row.style.cssText = `
      display: flex; flex-direction: column; align-items: ${isUser ? 'flex-end' : 'flex-start'};
      width: 100%;
    `;

    const bubble = el('div', '');
    bubble.style.cssText = `
      max-width: 88%; padding: 10px 14px; border-radius: 6px; font-size: 12px; line-height: 1.5;
      background: ${isUser ? '#0284C7' : '#111927'};
      color: ${isUser ? '#FFFFFF' : '#E2E8F0'};
      border: 1px solid ${isUser ? '#38BDF8' : '#1E293B'};
      white-space: pre-wrap; word-break: break-word;
    `;
    bubble.textContent = msg.text;
    row.append(bubble);
    chatBox.append(row);
  }

  if (s.isCfoThinking) {
    const thinkingRow = el('div', '');
    thinkingRow.style.cssText = 'color: #38BDF8; font-size: 11px; font-family: var(--font-mono); font-style: italic;';
    thinkingRow.innerHTML = '🧠 AI CFO đang đối chiếu số liệu Sổ cái và Thông tư 99/2025/TT-BTC...';
    chatBox.append(thinkingRow);
  }

  modal.append(chatBox);

  // Quick Action Chips
  const chipsRow = el('div', '');
  chipsRow.style.cssText = `
    padding: 8px 14px; background: #0E1626; border-top: 1px solid #1E293B;
    display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none;
  `;

  const quickPrompts = [
    { label: '🔍 Soi chứng từ đang mở', q: 'Soi giúp tôi chứng từ và lệnh chi đang mở có rủi ro gì không?' },
    { label: '📊 Đánh giá ngân quỹ', q: 'Đánh giá sức khoẻ dòng tiền và khuyến nghị điều chuyển ngân quỹ?' },
    { label: '🚀 Gợi ý mở rộng ngành', q: 'Tôi muốn mở rộng thêm công ty con thì nên đầu tư vào ngành nào?' },
    { label: '⚖️ Cân đối TK Tổng & P&L', q: 'Kiểm tra giúp tôi cân đối Tài khoản Tổng và hướng dẫn kết chuyển 421?' },
  ];

  for (const qp of quickPrompts) {
    const chip = el('button', 'btn btn--ghost', qp.label);
    chip.style.cssText = 'min-height: 26px; padding: 2px 8px; font-size: 10px; font-family: var(--font-mono); white-space: nowrap;';
    chip.addEventListener('click', () => {
      sendCfoQuestion(s, qp.q);
    });
    chipsRow.append(chip);
  }
  modal.append(chipsRow);

  // Footer: Input box
  const foot = el('div', '');
  foot.style.cssText = 'padding: 12px 14px; background: #111A29; border-top: 1px solid #1E293B; display: flex; gap: 8px;';

  const inp = el('input', '');
  inp.placeholder = 'Hỏi AI CFO bất kỳ điều gì về tài chính, thuế, M&A...';
  inp.style.cssText = `
    flex: 1; padding: 10px 14px; background: #080D16; border: 1px solid #334155;
    color: #FFFFFF; font-size: 13px; border-radius: 4px; outline: none;
  `;
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inp.value.trim()) {
      sendCfoQuestion(s, inp.value.trim());
    }
  });

  const sendBtn = el('button', 'btn btn--ballpoint', 'Gửi [Enter]');
  sendBtn.style.cssText = 'padding: 8px 16px; font-size: 12px; font-weight: 800; font-family: var(--font-mono);';
  sendBtn.addEventListener('click', () => {
    if (inp.value.trim()) {
      sendCfoQuestion(s, inp.value.trim());
    }
  });

  foot.append(inp, sendBtn);
  modal.append(foot);

  overlay.append(modal);

  // Tự động cuộn xuống đáy chat
  setTimeout(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
    inp.focus();
  }, 50);

  return overlay;
}

async function sendCfoQuestion(s, questionText) {
  if (!questionText || s.isCfoThinking) return;

  s.cfoChatHistory.push({ role: 'user', text: questionText });
  s.isCfoThinking = true;
  playSlackSend();
  render(screenRoot, s);

  try {
    const res = await askCfoAdvisor({
      question: questionText,
      state: s.fin,
      activeDoc: s.stream[s.selectedIdx],
      llmConfig: s.llmConfig,
    });

    s.cfoChatHistory.push({
      role: 'cfo',
      text: res.reply,
      model: res.model,
      warning: res.warning,
    });
    playSlackReply();
  } catch (err) {
    s.cfoChatHistory.push({
      role: 'cfo',
      text: `⚠️ Rất tiếc, tôi gặp sự cố khi xử lý phản hồi: ${err.message}`,
    });
    playAlertBuzzer();
  } finally {
    s.isCfoThinking = false;
    persistCurrentSession(s);
    render(screenRoot, s);
  }
}

// ============================================================================
// 7. MODAL CÀI ĐẶT AI CFO (LLM) & THIẾT BỊ HIỂN THỊ
// ============================================================================
function renderSettingsModal(s, isPro) {
  const overlay = el('div', 'settings-modal-overlay');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
  `;

  const modal = el('div', 'settings-modal');
  modal.style.cssText = `
    width: 100%; max-width: 620px; max-height: 85vh; background: #0B111E; border: 1px solid #38BDF8;
    border-top: 4px solid #38BDF8; border-radius: 6px; box-shadow: 0 25px 60px rgba(0,0,0,0.8);
    display: flex; flex-direction: column; overflow: hidden; color: #E2E8F0;
  `;

  // Header
  const head = el('div', '');
  head.style.cssText = `
    padding: 12px 18px; background: #111A29; border-bottom: 1px solid #1E293B;
    display: flex; justify-content: space-between; align-items: center;
  `;
  head.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 13px; color: #38BDF8; font-weight: 800;">
      ⚙️ CÀI ĐẶT HỆ THỐNG: AI CFO (LLM) & THIẾT BỊ ĐIỀU HÀNH
    </div>
  `;

  const closeBtn = el('button', 'btn btn--ghost', '✕ Đóng [Esc]');
  closeBtn.style.cssText = 'min-height: 28px; padding: 2px 10px; font-size: 11px;';
  closeBtn.addEventListener('click', () => {
    s.showSettingsModal = false;
    render(screenRoot, s);
  });
  head.append(closeBtn);
  modal.append(head);

  // Body: Form settings
  const body = el('div', '');
  body.style.cssText = 'padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; font-size: 12px;';

  // 1. Cấu hình LLM Provider
  const secLlm = el('div', '');
  secLlm.style.cssText = 'background: #0E1626; border: 1px solid #1E293B; border-radius: 4px; padding: 12px; display: flex; flex-direction: column; gap: 8px;';
  secLlm.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 800;">
      1. NHÀ CUNG CẤP MÔ HÌNH NGÔN NGỮ LỚN (LLM PROVIDER)
    </div>
    <div style="font-size: 11px; color: #94A3B8;">
      Chọn nhà cung cấp bạn muốn kết nối (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Anthropic, Ollama, LM Studio...). Nếu không có mạng hoặc chưa nhập Key, chế độ <strong>Cố vấn Nội bộ (Offline Heuristic)</strong> sẽ tự động đảm nhiệm 100%.
    </div>
  `;

  const provSelect = el('select', '');
  provSelect.style.cssText = 'padding: 8px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px;';
  provSelect.innerHTML = `
    <option value="offline_heuristic">🛡️ Cố vấn Định lượng Nội bộ (Offline Heuristic - 100% Không cần mạng / Không cần Key)</option>
    <option value="openai_compatible">🌐 OpenAI-Compatible API (OpenAI / OpenRouter / Groq / DeepSeek / Ollama / 9Router)</option>
    <option value="gemini">✨ Google Gemini API (gemini-1.5-flash / gemini-1.5-pro)</option>
    <option value="anthropic">⚡ Anthropic Claude API (claude-3-5-sonnet)</option>
  `;
  provSelect.value = s.llmConfig.provider || 'offline_heuristic';
  secLlm.append(provSelect);

  // Base URL
  const urlLabel = el('label', '', 'Base URL (chỉ áp dụng cho OpenAI-compatible):');
  urlLabel.style.cssText = 'font-size: 11px; color: #94A3B8; margin-top: 4px;';
  const urlInp = el('input', '');
  urlInp.value = s.llmConfig.baseUrl || 'https://api.openai.com/v1';
  urlInp.style.cssText = 'padding: 8px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px; font-family: var(--font-mono);';
  secLlm.append(urlLabel, urlInp);

  // API Key
  const keyLabel = el('label', '', 'API Key (được lưu an toàn trong localStorage trình duyệt của bạn):');
  keyLabel.style.cssText = 'font-size: 11px; color: #94A3B8; margin-top: 4px;';
  const keyInp = el('input', '');
  keyInp.type = 'password';
  keyInp.value = s.llmConfig.apiKey || '';
  keyInp.placeholder = 'sk-... (hoặc để trống nếu dùng Ollama/LM Studio local hoặc Offline)';
  keyInp.style.cssText = 'padding: 8px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px; font-family: var(--font-mono);';
  secLlm.append(keyLabel, keyInp);

  // Model Name
  const modelLabel = el('label', '', 'Tên Model:');
  modelLabel.style.cssText = 'font-size: 11px; color: #94A3B8; margin-top: 4px;';
  const modelInp = el('input', '');
  modelInp.value = s.llmConfig.model || 'gpt-4o-mini';
  modelInp.style.cssText = 'padding: 8px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px; font-family: var(--font-mono);';
  secLlm.append(modelLabel, modelInp);

  // Persona
  const personaLabel = el('label', '', 'Tính cách & Trường phái Cố vấn của AI CFO:');
  personaLabel.style.cssText = 'font-size: 11px; color: #94A3B8; margin-top: 4px;';
  const personaSelect = el('select', '');
  personaSelect.style.cssText = 'padding: 8px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px;';
  for (const [k, p] of Object.entries(CFO_PERSONAS)) {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = `${p.avatar} ${p.name}`;
    if (k === s.llmConfig.persona) opt.selected = true;
    personaSelect.append(opt);
  }
  secLlm.append(personaLabel, personaSelect);

  const testBtnRow = el('div', '');
  testBtnRow.style.cssText = 'display: flex; gap: 8px; margin-top: 6px;';

  const testConnBtn = el('button', 'btn btn--ghost', '🔌 Kiểm tra Kết nối LLM');
  testConnBtn.style.cssText = 'padding: 6px 12px; font-size: 11px; font-family: var(--font-mono);';
  const testResLabel = el('span', '', '');
  testResLabel.style.cssText = 'font-size: 11px; display: flex; align-items: center;';

  testConnBtn.addEventListener('click', async () => {
    testResLabel.textContent = 'Đang kiểm tra...';
    testResLabel.style.color = '#38BDF8';
    const cfg = {
      provider: provSelect.value,
      baseUrl: urlInp.value.trim(),
      apiKey: keyInp.value.trim(),
      model: modelInp.value.trim(),
      persona: personaSelect.value,
    };
    const res = await testLlmConnection(cfg);
    testResLabel.textContent = res.message;
    testResLabel.style.color = res.success ? '#10B981' : '#F43F5E';
  });

  const randomPersonaBtn = el('button', 'btn btn--ghost', '🎲 Ngẫu nhiên hoá Tính cách CFO');
  randomPersonaBtn.style.cssText = 'padding: 6px 12px; font-size: 11px; font-family: var(--font-mono);';
  randomPersonaBtn.addEventListener('click', () => {
    const keys = Object.keys(CFO_PERSONAS).filter((k) => k !== 'custom');
    const pick = keys[Math.floor(Math.random() * keys.length)];
    personaSelect.value = pick;
    s.toast = `🎲 Đã chọn tính cách: ${CFO_PERSONAS[pick].name}!`;
    render(screenRoot, s);
  });

  testBtnRow.append(testConnBtn, randomPersonaBtn, testResLabel);
  secLlm.append(testBtnRow);
  body.append(secLlm);

  // 2. Cấu hình Thiết bị Hiển thị & Bàn phím
  const secDev = el('div', '');
  secDev.style.cssText = 'background: #0E1626; border: 1px solid #1E293B; border-radius: 4px; padding: 12px; display: flex; flex-direction: column; gap: 8px;';
  secDev.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 11px; color: #F59E0B; font-weight: 800;">
      2. THIẾT BỊ HIỂN THỊ & PHÍM TẮT VẬT LÝ (DESKTOP · IPHONE 13 PRO · BLACKBERRY KEY2)
    </div>
    <div style="font-size: 11px; color: #94A3B8;">
      Chọn hồ sơ thiết bị để tối ưu hóa hiển thị. Với <strong>BlackBerry Key2</strong>, hệ thống tự động kích hoạt bố cục 3:2 và gắn nhãn phím cứng QWERTY.
    </div>
  `;

  const devSelect = el('select', '');
  devSelect.style.cssText = 'padding: 8px; background: #080D16; border: 1px solid #334155; color: #FFFFFF; font-size: 12px; border-radius: 3px;';
  devSelect.innerHTML = `
    <option value="auto">📱 Tự động nhận diện theo kích thước màn hình</option>
    <option value="desktop">🖥️ Desktop / Bàn làm việc rộng (Bố cục 3 cột Palantir Foundry)</option>
    <option value="iphone13pro">📱 iPhone 13 Pro (390×844 · Tối ưu Safe Area, Touch 44px & Bottom Nav)</option>
    <option value="bbkey2">⌨️ BlackBerry Key2 (Tỷ lệ 3:2 · Compact Vertical & QWERTY Speed Keys)</option>
  `;
  devSelect.value = s.deviceProfile || 'auto';
  secDev.append(devSelect);
  body.append(secDev);

  modal.append(body);

  // Footer
  const foot = el('div', '');
  foot.style.cssText = 'padding: 12px 18px; background: #111A29; border-top: 1px solid #1E293B; display: flex; justify-content: flex-end; gap: 10px;';

  const saveSettingsBtn = el('button', 'btn btn--ballpoint', '💾 Lưu Cấu hình & Áp dụng ngay');
  saveSettingsBtn.style.cssText = 'padding: 8px 18px; font-size: 12px; font-weight: 800; font-family: var(--font-mono);';
  saveSettingsBtn.addEventListener('click', () => {
    const updatedLlm = {
      provider: provSelect.value,
      baseUrl: urlInp.value.trim(),
      apiKey: keyInp.value.trim(),
      model: modelInp.value.trim(),
      persona: personaSelect.value,
    };
    const updatedDev = devSelect.value;

    s.llmConfig = updatedLlm;
    s.deviceProfile = updatedDev;

    // Lưu vào store
    safeUpdateSettings(s.store, {
      llmConfig: updatedLlm,
      uiConfig: { deviceProfile: updatedDev, enablePhysicalKeyboard: true },
    });

    if (updatedDev === 'bbkey2') {
      document.documentElement.setAttribute('data-device', 'bbkey2');
    } else if (updatedDev === 'iphone13pro') {
      document.documentElement.setAttribute('data-device', 'iphone13pro');
    } else {
      document.documentElement.removeAttribute('data-device');
    }

    s.showSettingsModal = false;
    s.toast = '💾 Đã lưu cấu hình AI CFO và Hồ sơ thiết bị thành công!';
    persistCurrentSession(s);
    render(screenRoot, s);
  });

  foot.append(saveSettingsBtn);
  modal.append(foot);

  overlay.append(modal);
  return overlay;
}

// ============================================================================
// 8. MOBILE BOTTOM NAVIGATION BAR: DÀNH CHO IPHONE 13 PRO & THIẾT BỊ DI ĐỘNG
// ============================================================================
function renderMobileBottomNav(s) {
  const nav = el('nav', 'mobile-bottom-nav');
  const pendingSlack = (s.fin.slackEvents || []).filter((e) => e.status === 'PENDING').length;

  const items = [
    { id: 'workstation', icon: '📄', label: 'Chứng từ' },
    { id: 'slack_chat', icon: '💬', label: `Slack${pendingSlack > 0 ? ` (${pendingSlack})` : ''}` },
    { id: 'treasury', icon: '🏦', label: 'Ngân quỹ' },
    { id: 'master_accounts', icon: '⚖️', label: 'TK Tổng' },
    { id: 'sectors', icon: '🌐', label: 'Tập đoàn' },
  ];

  for (const it of items) {
    const isActive = s.activeTab === it.id || (it.id === 'sectors' && s.activeTab === 'advisory');
    const btn = el('button', `mobile-nav-item ${isActive ? 'mobile-nav-item--active' : ''}`);
    btn.innerHTML = `<span class="nav-icon">${it.icon}</span><span>${it.label}</span>`;
    btn.addEventListener('click', () => {
      s.activeTab = it.id;
      persistCurrentSession(s);
      render(screenRoot, s);
    });
    nav.append(btn);
  }

  // Nút mở nhanh AI CFO trên bottom bar
  const cfoNavBtn = el('button', 'mobile-nav-item');
  cfoNavBtn.innerHTML = '<span class="nav-icon">🧠</span><span>AI CFO</span>';
  cfoNavBtn.addEventListener('click', () => {
    s.showCfoModal = true;
    render(screenRoot, s);
  });
  nav.append(cfoNavBtn);

  return nav;
}

// ============================================================================
// 9. LẮNG NGHE PHÍM TẮT VẬT LÝ CHO BLACKBERRY KEY2 & DESKTOP
// ============================================================================
function setupKeydownAndHeaderListeners(s) {
  // Gắn sự kiện cho các nút trên header nếu có
  const btnCfoHeader = document.getElementById('btn-open-cfo-header');
  if (btnCfoHeader) {
    btnCfoHeader.onclick = () => {
      s.showCfoModal = true;
      render(screenRoot, s);
    };
  }

  const btnSettingsHeader = document.getElementById('btn-open-settings-header');
  if (btnSettingsHeader) {
    btnSettingsHeader.onclick = () => {
      s.showSettingsModal = true;
      render(screenRoot, s);
    };
  }

  const btnLogsHeader = document.getElementById('btn-open-logs-header');
  if (btnLogsHeader) {
    const logInfo = (s.logger || defaultLogger).getSessionInfo();
    btnLogsHeader.textContent =
      logInfo.errorCount > 0
        ? `📋 Log (⚠ ${logInfo.errorCount} lỗi)`
        : `📋 Nhật ký Log (${logInfo.totalEntries})`;
    if (logInfo.errorCount > 0) {
      btnLogsHeader.style.borderColor = '#F43F5E';
      btnLogsHeader.style.color = '#FDA4AF';
    }
    btnLogsHeader.onclick = () => {
      s.showLogModal = !s.showLogModal;
      render(screenRoot, s);
    };
  }

  if (keydownHandler) return;

  keydownHandler = (e) => {
    // Không bắt phím khi đang gõ text
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      if (e.key === 'Escape') {
        if (s.showCfoModal) {
          s.showCfoModal = false;
          render(screenRoot, s);
        } else if (s.showSettingsModal) {
          s.showSettingsModal = false;
          render(screenRoot, s);
        }
      }
      return;
    }

    const key = e.key.toUpperCase();

    if (e.key === 'Escape') {
      if (s.showCfoModal || s.showSettingsModal || s.showLogModal) {
        s.showCfoModal = false;
        s.showSettingsModal = false;
        s.showLogModal = false;
        render(screenRoot, s);
        return;
      }
    }

    if (key === '1') {
      s.activeTab = 'workstation';
      persistCurrentSession(s);
      render(screenRoot, s);
    } else if (key === '2') {
      s.activeTab = 'slack_chat';
      persistCurrentSession(s);
      render(screenRoot, s);
    } else if (key === '3') {
      s.activeTab = 'treasury';
      persistCurrentSession(s);
      render(screenRoot, s);
    } else if (key === '4') {
      s.activeTab = 'master_accounts';
      persistCurrentSession(s);
      render(screenRoot, s);
    } else if (key === '5') {
      s.activeTab = 'sectors';
      persistCurrentSession(s);
      render(screenRoot, s);
    } else if (key === 'C') {
      s.showCfoModal = !s.showCfoModal;
      render(screenRoot, s);
    } else if (key === 'S') {
      s.showSettingsModal = !s.showSettingsModal;
      render(screenRoot, s);
    } else if (key === 'L') {
      s.showLogModal = !s.showLogModal;
      render(screenRoot, s);
    } else if (key === 'H') {
      handleHarvestAllSectors(s);
    } else if (key === 'A') {
      const res = executeCashRebalance(s.fin, { action: 'AUTO_OPTIMIZE' });
      if (res.ok) {
        playSuccessLedger();
        s.toast = '⚡ [Key A] Đã tự động cân đối nguồn tiền tối ưu!';
        persistCurrentSession(s);
        render(screenRoot, s);
      }
    } else if (key === 'J') {
      if (s.selectedIdx > 0) {
        s.selectedIdx -= 1;
        s.lines = [];
        render(screenRoot, s);
      }
    } else if (key === 'K') {
      if (s.selectedIdx < s.stream.length - 1) {
        s.selectedIdx += 1;
        s.lines = [];
        render(screenRoot, s);
      }
    }
  };

  window.addEventListener('keydown', keydownHandler);
}



// ============================================================================
// 10. HỘP THOẠI PHIÊN GHI LOG HỆ THỐNG & CHẨN ĐOÁN LỖI (DIAGNOSTIC LOG CONSOLE)
// ============================================================================
function renderLogModal(s, isPro) {
  const logger = s.logger || defaultLogger;
  const meta = logger.getSessionInfo();
  const filterLevel = s.logFilterLevel || 'ALL';
  const entries = logger.getEntries(filterLevel);

  const overlay = el('div', 'modal-overlay');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 1200;
    background: rgba(4, 7, 13, 0.85); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 14px;
  `;

  const modal = el('div', 'modal-card');
  modal.style.cssText = `
    width: 100%; max-width: 860px; max-height: 88vh;
    background: ${isPro ? '#0A0F18' : '#0F172A'};
    border: 1px solid #38BDF8; border-top: 3px solid #38BDF8;
    border-radius: 6px; display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,0.75);
  `;

  const head = el('div', '');
  head.style.cssText = `
    padding: 12px 16px; background: #111A29; border-bottom: 1px solid #1E293B;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  `;
  head.innerHTML = `
    <div>
      <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 900; color: #38BDF8;">
        📋 PHIÊN GHI LOG & CHẨN ĐOÁN HỆ THỐNG // ${meta.logSessionId}
      </div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: #94A3B8; margin-top: 2px;">
        Tổng bản ghi: <strong style="color:#F8FAFC;">${meta.totalEntries}</strong> ·
        Lỗi (ERROR/FATAL): <strong style="color:${meta.errorCount > 0 ? '#F43F5E' : '#10B981'};">${meta.errorCount}</strong> ·
        Cảnh báo (WARN): <strong style="color:#F59E0B;">${meta.warnCount}</strong>
      </div>
    </div>
  `;

  const closeBtn = el('button', 'btn btn--ghost', '✕ Đóng [ESC]');
  closeBtn.style.cssText = 'min-height: 30px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px;';
  closeBtn.addEventListener('click', () => {
    s.showLogModal = false;
    render(screenRoot, s);
  });
  head.append(closeBtn);
  modal.append(head);

  // Thanh bộ lọc & hành động nhanh
  const toolbar = el('div', '');
  toolbar.style.cssText = `
    padding: 10px 16px; background: #0D1420; border-bottom: 1px solid #1E293B;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  `;

  const filterBox = el('div', '');
  filterBox.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';
  for (const lv of [
    { id: 'ALL', label: `Tất cả (${meta.totalEntries})` },
    { id: 'ERROR', label: `🚨 Lỗi (${meta.errorCount})` },
    { id: 'WARN', label: `⚠️ Cảnh báo (${meta.warnCount})` },
    { id: 'INFO', label: 'ℹ️ Thông tin' },
  ]) {
    const fBtn = el('button', 'btn', lv.label);
    const active = filterLevel === lv.id;
    fBtn.style.cssText = `
      min-height: 28px; padding: 3px 10px; font-family: var(--font-mono); font-size: 11px;
      background: ${active ? 'rgba(56,189,248,0.2)' : '#111927'};
      color: ${active ? '#38BDF8' : '#94A3B8'};
      border: 1px solid ${active ? '#38BDF8' : '#1E293B'};
    `;
    fBtn.addEventListener('click', () => {
      s.logFilterLevel = lv.id;
      render(screenRoot, s);
    });
    filterBox.append(fBtn);
  }

  const actionBox = el('div', '');
  actionBox.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';

  const copyBtn = el('button', 'btn btn--ballpoint', '📋 Sao chép Toàn bộ Log');
  copyBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px;';
  copyBtn.addEventListener('click', () => {
    const text = logger.formatLogText();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓ Đã sao chép vào Clipboard!';
      });
    }
  });

  const downloadBtn = el('button', 'btn btn--ghost', '💾 Tải File .JSON');
  downloadBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; border: 1px solid #334155;';
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([logger.exportLogJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.logSessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const clearBtn = el('button', 'btn btn--ghost', '🗑️ Xoá Log');
  clearBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; border: 1px solid #334155; color: #FDA4AF;';
  clearBtn.addEventListener('click', () => {
    logger.clearLogs();
    render(screenRoot, s);
  });

  actionBox.append(copyBtn, downloadBtn, clearBtn);
  toolbar.append(filterBox, actionBox);
  modal.append(toolbar);

  // Danh sách bản ghi log
  const list = el('div', '');
  list.style.cssText = 'padding: 12px 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; max-height: 55vh;';

  if (entries.length === 0) {
    const empty = el('div', '', 'Chưa có bản ghi log nào khớp với bộ lọc hiện tại.');
    empty.style.cssText = 'padding: 24px; text-align: center; color: #64748B; font-family: var(--font-mono); font-size: 12px;';
    list.append(empty);
  } else {
    for (const item of entries) {
      const isErr = item.level === 'ERROR' || item.level === 'FATAL';
      const isWarn = item.level === 'WARN';
      const borderColor = isErr ? '#F43F5E' : isWarn ? '#F59E0B' : '#38BDF8';
      const row = el('div', '');
      row.style.cssText = `
        padding: 8px 12px; background: #070B11; border: 1px solid #1E293B;
        border-left: 3px solid ${borderColor}; border-radius: 4px;
        font-family: var(--font-mono); font-size: 11px;
      `;
      const headerLine = el('div', '');
      headerLine.style.cssText = 'display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;';
      headerLine.innerHTML = `
        <span>
          <strong style="color:${borderColor};">[${item.level}]</strong>
          <span style="color:#38BDF8; font-weight:700;">[${item.module}]</span>
          <span style="color:#F8FAFC;">${item.message}</span>
        </span>
        <span style="color:#64748B; font-size:10px;">${item.timeStr} · ${item.id}</span>
      `;
      row.append(headerLine);

      if (item.detail) {
        const detailPre = el('pre', '', item.detail.stack ? item.detail.stack : JSON.stringify(item.detail, null, 2));
        detailPre.style.cssText = `
          margin: 4px 0 0 0; padding: 6px 8px; background: #0D1420;
          color: ${isErr ? '#FDA4AF' : '#94A3B8'}; font-size: 10px;
          border-radius: 3px; overflow-x: auto; white-space: pre-wrap;
        `;
        row.append(detailPre);
      }
      list.append(row);
    }
  }
  modal.append(list);

  // Chân hộp thoại: Công cụ tự cứu hộ nhanh
  const foot = el('div', '');
  foot.style.cssText = `
    padding: 10px 16px; background: #111A29; border-top: 1px solid #1E293B;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  `;
  const helpTxt = el('span', '', '🛠️ Công cụ Khắc phục & Phục hồi Nhanh:');
  helpTxt.style.cssText = 'font-family: var(--font-mono); font-size: 11px; color: #94A3B8;';

  const recBtns = el('div', '');
  recBtns.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

  const newSesBtn = el('button', 'btn btn--ghost', '🔄 Tạo Phiên Chơi Mới Sạch');
  newSesBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; border: 1px solid #34D399; color: #34D399;';
  newSesBtn.addEventListener('click', () => {
    logger.info('desk.recovery', 'Người dùng kích hoạt Tạo Phiên Chơi Mới Sạch từ Bảng Ghi Log.');
    s.showLogModal = false;
    mount(screenRoot, { newSession: true, mode: 'pro', level: 5 }, s.ctx);
  });

  const hardResetBtn = el('button', 'btn btn--ghost', '🧹 Xoá Cache Phiên Cũ & Tải lại');
  hardResetBtn.style.cssText = 'min-height: 28px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; border: 1px solid #F59E0B; color: #FBBF24;';
  hardResetBtn.addEventListener('click', () => {
    logger.warn('desk.recovery', 'Người dùng kích hoạt Xoá Cache Phiên Cũ & Khởi tạo lại.');
    try {
      window.localStorage?.removeItem('nocooi.save.v1');
      window.localStorage?.removeItem('nocooi.save.bak');
    } catch {}
    mount(screenRoot, { newSession: true, mode: 'pro', level: 5 }, s.ctx);
  });

  recBtns.append(newSesBtn, hardResetBtn);
  foot.append(helpTxt, recBtns);
  modal.append(foot);

  overlay.append(modal);
  return overlay;
}

function renderCrashDiagnosticScreen(root, err, params, ctx) {
  const logger = ctx?.logger || defaultLogger;
  const meta = logger.getSessionInfo();
  const entries = logger.getEntries('ALL').slice(0, 25);

  const box = el('div', '');
  box.style.cssText = `
    max-width: 840px; margin: 24px auto; padding: 20px;
    background: #0A0F18; border: 1px solid #F43F5E; border-left: 5px solid #F43F5E;
    border-radius: 6px; color: #F8FAFC; font-family: var(--font-mono);
  `;

  const title = el('div', '', `🚨 BẢNG CHẨN ĐOÁN LỖI & PHIÊN GHI LOG KHẨN CẤP (${meta.logSessionId})`);
  title.style.cssText = 'font-size: 15px; font-weight: 900; color: #FDA4AF; margin-bottom: 8px;';

  const msg = el('div', '', `Thông điệp lỗi: ${err?.message || String(err)}`);
  msg.style.cssText = 'font-size: 13px; color: #FFFFFF; margin-bottom: 10px;';

  const stackPre = el('pre', '', err?.stack || String(err));
  stackPre.style.cssText = `
    padding: 12px; background: #05080E; border: 1px solid #1E293B;
    color: #FDA4AF; font-size: 11px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; margin-bottom: 14px;
  `;

  const btnRow = el('div', '');
  btnRow.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;';

  const healBtn = el('button', 'btn btn--ballpoint', '🚀 Khởi tạo Phiên Mới Sạch (Bỏ qua phiên cũ lỗi)');
  healBtn.style.cssText = 'padding: 8px 14px; font-size: 12px; font-weight: 800;';
  healBtn.addEventListener('click', () => {
    logger.info('desk.crashRecovery', 'Khởi tạo phiên mới sạch từ màn hình chẩn đoán.');
    mount(root, { newSession: true, mode: 'pro', level: 5 }, ctx);
  });

  const clearStorageBtn = el('button', 'btn btn--ghost', '🧹 Xoá Dữ liệu Lưu Cũ trong Trình duyệt & Mở lại');
  clearStorageBtn.style.cssText = 'padding: 8px 14px; font-size: 12px; border: 1px solid #F59E0B; color: #FBBF24;';
  clearStorageBtn.addEventListener('click', () => {
    try {
      window.localStorage?.removeItem('nocooi.save.v1');
      window.localStorage?.removeItem('nocooi.save.bak');
    } catch {}
    logger.warn('desk.crashRecovery', 'Đã xoá nocooi.save.v1 và khởi động lại phiên mới.');
    mount(root, { newSession: true, mode: 'pro', level: 5 }, ctx);
  });

  const copyBtn = el('button', 'btn btn--ghost', '📋 Sao chép Toàn bộ Phiên Log');
  copyBtn.style.cssText = 'padding: 8px 14px; font-size: 12px; border: 1px solid #38BDF8; color: #38BDF8;';
  copyBtn.addEventListener('click', () => {
    const text = logger.formatLogText();
    navigator.clipboard?.writeText(text).then(() => {
      copyBtn.textContent = '✓ Đã sao chép Phiên Log!';
    });
  });

  btnRow.append(healBtn, clearStorageBtn, copyBtn);

  const logHeader = el('div', '', `📜 NHẬT KÝ HOẠT ĐỘNG TRƯỚC KHI XẢY RA LỖI (${entries.length} bản ghi gần nhất):`);
  logHeader.style.cssText = 'font-size: 12px; font-weight: 800; color: #38BDF8; margin-bottom: 8px;';

  const logList = el('div', '');
  logList.style.cssText = 'display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto;';
  for (const item of entries) {
    const itemEl = el('div', '', `[${item.timeStr}] [${item.level}] [${item.module}] ${item.message}`);
    itemEl.style.cssText = `padding: 6px 10px; background: #070B11; border-left: 3px solid ${item.level === 'ERROR' || item.level === 'FATAL' ? '#F43F5E' : '#38BDF8'}; font-size: 11px; color: #CBD5E1;`;
    logList.append(itemEl);
  }

  box.append(title, msg, stackPre, btnRow, logHeader, logList);
  return box;
}
