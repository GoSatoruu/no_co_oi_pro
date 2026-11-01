import test from 'node:test';
import assert from 'node:assert/strict';
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
  NPC_SLACK_EVENTS,
  expandBusinessSector,
  harvestSectorCycle,
  buildCfoContextSnapshot,
} from '../../frontend/js/core/finance.js';

test('khởi tạo trạng thái tài chính doanh nghiệp với số dư đầu kỳ và KPIs chuẩn', () => {
  const state = createFinanceState({});
  const m = computeMetrics(state);

  assert.equal(m.cash, 80000000);
  assert.equal(m.bank, 450000000);
  assert.equal(m.liquidity, 530000000);
  assert.equal(m.revenue, 120000000);
  assert.equal(m.cogs, 62000000);
  assert.equal(m.opex, 23000000);
  assert.equal(m.netProfit, 35000000);
  assert.ok(m.profitMargin > 29);
  assert.equal(state.slackEvents.length, 3);
});

test('ghi nhận bút toán bán hàng làm tăng Doanh thu, Lợi nhuận ròng và Thanh khoản', () => {
  const state = createFinanceState({});
  const before = computeMetrics(state);

  const { metrics: after } = recordLedgerLines(state, {
    title: 'Bán hàng thu tiền ngay',
    lines: [
      { side: 'N', account: '111', amount: 21600000 },
      { side: 'C', account: '511', amount: 20000000 },
      { side: 'C', account: '3331', amount: 1600000 },
    ],
  });

  assert.equal(after.revenue, before.revenue + 20000000);
  assert.equal(after.netProfit, before.netProfit + 20000000);
  assert.equal(after.cash, before.cash + 21600000);
  assert.equal(after.liquidity, before.liquidity + 21600000);
});

test('ra quyết định tư vấn chiến lược thế giới mở cập nhật trực tiếp Doanh thu và Lợi nhuận', () => {
  const state = createFinanceState({});
  const before = computeMetrics(state);

  const res = executeAdvisory(state, 'adv_marketing_push');
  assert.equal(res.alreadyEnacted, false);
  assert.equal(res.metrics.revenue, before.revenue + 65000000);
  assert.equal(res.metrics.netProfit, before.netProfit + (65000000 - 28000000 - 15000000));

  const dup = executeAdvisory(state, 'adv_marketing_push');
  assert.equal(dup.alreadyEnacted, true);
});

test('mọi đề xuất tư vấn trong ADVISORY_CATALOG và NPC_SLACK_EVENTS đều cân đối Nợ = Có', () => {
  for (const adv of ADVISORY_CATALOG) {
    const nSum = adv.lines.filter((l) => l.side === 'N').reduce((s, l) => s + l.amount, 0);
    const cSum = adv.lines.filter((l) => l.side === 'C').reduce((s, l) => s + l.amount, 0);
    assert.equal(nSum, cSum, `Tư vấn ${adv.id} bị lệch Nợ/Có`);
  }

  for (const ev of NPC_SLACK_EVENTS) {
    for (const ch of ev.choices) {
      const nSum = ch.lines.filter((l) => l.side === 'N').reduce((s, l) => s + l.amount, 0);
      const cSum = ch.lines.filter((l) => l.side === 'C').reduce((s, l) => s + l.amount, 0);
      assert.equal(nSum, cSum, `Sự kiện Slack ${ev.templateId} choice ${ch.id} bị lệch Nợ/Có`);
    }
  }
});

test('decoratePushVoucher gắn metadata tin nhắn Slack và hỗ trợ replyToVoucherSlack', () => {
  const doc = {
    no: 1,
    templateId: 'sale_cash',
    fields: [{ key: 'total', text: '10.800.000 đ' }],
  };
  doc.push = decoratePushVoucher(doc);
  assert.equal(doc.push.pushId, 'SLK-DOC-001');
  assert.equal(doc.push.channel, '#kinh-doanh-thu-tien');
  assert.equal(doc.push.npcName, 'Bé Na');
  assert.equal(doc.push.orderType, 'THÔNG BÁO THU');
  assert.equal(doc.push.status, 'PENDING');

  const rep = replyToVoucherSlack(doc, 'rep_verify');
  assert.equal(rep.alreadyReplied, false);
  assert.equal(doc.push.chatHistory.length, 2);
});

test('sự kiện ngẫu nhiên Slack (spawnRandomSlackEvent & replyToNpcEvent) có seed và tuân thủ luật không thưởng gian lận', () => {
  const state = createFinanceState({}, { seed: 'seed-test-slack' });
  const ev = spawnRandomSlackEvent(state, 'seed-test-slack-4');
  assert.ok(ev.id.startsWith('SLK-'));
  assert.equal(ev.status, 'PENDING');
  assert.equal(ev.messages.length, 1);

  // Chọn phương án chuẩn mực đầu tiên (luôn có ethical = true, scoreDelta > 0)
  const goodChoice = ev.choices.find((c) => c.ethical);
  const resGood = replyToNpcEvent(state, ev.id, goodChoice.id);
  assert.equal(resGood.ok, true);
  assert.equal(resGood.ethical, true);
  assert.ok(resGood.scoreDelta > 0);
  assert.equal(ev.messages.length, 3);

  // Sinh thêm sự kiện và thử chọn phương án gian lận/sai nguyên tắc (ethical = false) -> phải bị phạt âm điểm
  const evBad = spawnRandomSlackEvent(state, 'seed-test-slack-5');
  const badChoice = evBad.choices.find((c) => !c.ethical);
  const resBad = replyToNpcEvent(state, evBad.id, badChoice.id);
  assert.equal(resBad.ok, true);
  assert.equal(resBad.ethical, false);
  assert.ok(resBad.scoreDelta < 0, 'Phương án sai đạo đức không được thưởng điểm');
});

test('cân đối nguồn tiền (analyzeCashSources & executeCashRebalance) điều chuyển chính xác 111, 112, 131, 331', () => {
  const state = createFinanceState({});
  const before = analyzeCashSources(state);
  assert.equal(before.cash111, 80000000);
  assert.equal(before.bank112, 450000000);
  assert.equal(before.totalCash, 530000000);

  const dep = executeCashRebalance(state, { action: 'DEPOSIT_BANK', amount: 20000000 });
  assert.equal(dep.ok, true);
  const afterDep = analyzeCashSources(state);
  assert.equal(afterDep.cash111, 60000000);
  assert.equal(afterDep.bank112, 470000000);
  assert.equal(afterDep.totalCash, 530000000);

  const autoRes = executeCashRebalance(state, { action: 'AUTO_OPTIMIZE' });
  assert.equal(autoRes.ok, true);
});

test('bảng cân đối tài khoản tổng (computeMasterAccountBalance) luôn cân đối Tổng Nợ = Tổng Có và Tài sản = Nguồn vốn, hỗ trợ kết chuyển 911 ➔ 421', () => {
  const state = createFinanceState({});

  recordLedgerLines(state, {
    title: 'Bán hàng thu tiền gửi NH',
    lines: [
      { side: 'N', account: '112', amount: 54000000 },
      { side: 'C', account: '511', amount: 50000000 },
      { side: 'C', account: '3331', amount: 4000000 },
    ],
  });
  recordLedgerLines(state, {
    title: 'Xuất kho giá vốn',
    lines: [
      { side: 'N', account: '632', amount: 30000000 },
      { side: 'C', account: '156', amount: 30000000 },
    ],
  });

  const tbBeforeClose = computeMasterAccountBalance(state);
  assert.equal(tbBeforeClose.totals.isTrialBalanced, true);
  assert.equal(tbBeforeClose.totals.totalOpeningDebit, tbBeforeClose.totals.totalOpeningCredit);
  assert.equal(tbBeforeClose.totals.totalPeriodDebit, tbBeforeClose.totals.totalPeriodCredit);
  assert.equal(tbBeforeClose.totals.totalClosingDebit, tbBeforeClose.totals.totalClosingCredit);
  assert.equal(tbBeforeClose.balanceSheet.fundamentalDiff, 0);
  assert.equal(tbBeforeClose.balanceSheet.unclosedProfit, 20000000);

  const closeRes = executeClosingEntries(state);
  assert.equal(closeRes.ok, true);
  assert.equal(closeRes.revTransferred, 50000000);
  assert.equal(closeRes.expTransferred, 30000000);
  assert.equal(closeRes.netTransferredTo421, 20000000);

  const tbAfterClose = computeMasterAccountBalance(state);
  assert.equal(tbAfterClose.totals.isTrialBalanced, true);
  assert.equal(tbAfterClose.balanceSheet.fundamentalDiff, 0);
  assert.equal(tbAfterClose.balanceSheet.unclosedProfit, 0);
  assert.equal(state.balances['421'], -120000000);
  assert.equal(state.balances['511'], 0);
  assert.equal(state.balances['632'], 0);
  assert.equal(state.balances['911'], 0);
});

test('tập đoàn đa ngành: mở rộng lĩnh vực có sẵn và tự tạo ngành mới, hạch toán vốn 221', () => {
  const state = createFinanceState({});
  state.balances['112'] = 1000000000; // 1 tỷ tiền ngân hàng
  assert.equal(state.sectors.length, 1); // 1 công ty bán lẻ mặc định

  // 1. Mở ngành từ catalog: Công nghệ AI (TECH_CLOUD_AI, capex 550tr)
  const expRes = expandBusinessSector(state, {
    sectorId: 'TECH_CLOUD_AI',
    fundingMode: 'CASH_112',
  });
  assert.equal(expRes.success, true);
  assert.equal(state.sectors.length, 2);
  assert.equal(state.balances['221'], 550000000); // Tăng vốn đầu tư công ty con
  assert.equal(state.balances['112'], 450000000); // 1.000.000.000 - 550.000.000

  // 2. Mở ngành tự tạo: Nông nghiệp Công nghệ cao (capex 200tr, dùng đòn bẩy vay 50%)
  const customRes = expandBusinessSector(state, {
    customSector: {
      name: 'Nông nghiệp Công nghệ cao Đại Việt',
      code: 'AGRI_TECH',
      icon: '🌱',
      capexAmount: 200000000,
      expectedRoiPct: 30,
      riskLevel: 'LOW',
      description: 'Nhà kính thông minh trồng rau sạch xuất khẩu',
    },
    fundingMode: 'LEVERAGE_341',
  });
  assert.equal(customRes.success, true);
  assert.equal(state.sectors.length, 3);
  assert.equal(state.balances['221'], 750000000); // 550tr + 200tr
  assert.equal(state.balances['112'], 350000000); // Trừ 100tr tiền mặt
  assert.equal(state.balances['341'], -100000000); // Tăng nợ vay 100tr

  // 3. Thu hoạch chu kỳ kinh doanh của các công ty con
  const harvest = harvestSectorCycle(state);
  assert.equal(harvest.success, true);
  assert.ok(harvest.totalRevenue > 0);
  assert.ok(harvest.totalCost > 0);
  assert.ok(harvest.totalProfit > 0);

  // 4. Trích xuất snapshot dữ liệu CFO
  const snap = buildCfoContextSnapshot(state);
  assert.equal(snap.conglomerateName, 'Tập đoàn Đa ngành Đại Việt');
  assert.equal(snap.sectors.length, 3);
  assert.ok(snap.kpis.revenue > 0);
  assert.ok(snap.keyBalances['221'] === 750000000);
});

