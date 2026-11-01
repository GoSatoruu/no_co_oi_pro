import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LLM_CONFIG,
  CFO_PERSONAS,
  generateOfflineHeuristicAdvice,
  askCfoAdvisor,
  testLlmConnection,
} from '../../frontend/js/services/llm-cfo.js';
import { createFinanceState } from '../../frontend/js/core/finance.js';

test('AI CFO: cấu hình mặc định và các danh tính Persona chuẩn', () => {
  assert.equal(DEFAULT_LLM_CONFIG.provider, 'offline_heuristic');
  assert.ok(CFO_PERSONAS.strategic_big4);
  assert.ok(CFO_PERSONAS.aggressive_growth);
  assert.ok(CFO_PERSONAS.compliance_guardian);
  assert.equal(CFO_PERSONAS.strategic_big4.avatar, '👔');
});

test('AI CFO: testLlmConnection ở chế độ Offline Heuristic luôn thành công 100%', async () => {
  const res = await testLlmConnection({ provider: 'offline_heuristic' });
  assert.equal(res.success, true);
  assert.match(res.message, /sẵn sàng 100%/);
});

test('AI CFO: Offline Heuristic phân tích chính xác rủi ro khi chứng từ có lỗi vi phạm', async () => {
  const state = createFinanceState();
  const mockDocWithDefect = {
    no: 1,
    title: 'Hóa đơn dịch vụ ăn uống tiếp khách',
    defect: { code: 'def_missing_signature', field: 'signature' },
    push: { pushId: 'SLK-DOC-001', dept: 'Kinh doanh', amountText: '15.000.000 đ' },
    fields: [{ key: 'signature', label: 'Chữ ký', text: '—' }],
  };

  const advice = await askCfoAdvisor({
    question: 'Soi giúp tôi chứng từ này có rủi ro gì không?',
    state,
    activeDoc: mockDocWithDefect,
    llmConfig: { provider: 'offline_heuristic' },
  });

  assert.equal(advice.success, true);
  assert.equal(advice.provider, 'offline_heuristic');
  assert.match(advice.reply, /PHÁT HIỆN RỦI RO/);
  assert.match(advice.reply, /KHÔNG ĐƯỢC DUYỆT BÚT TOÁN/);
});

test('AI CFO: Offline Heuristic tư vấn mở rộng công ty con dựa trên số dư tiền ngân hàng (112)', async () => {
  const state = createFinanceState();
  state.balances['112'] = 800000000; // Tiền gửi dồi dào

  const advice = await askCfoAdvisor({
    question: 'Tôi muốn mở rộng thêm ngành kinh doanh mới thì nên đầu tư vào đâu?',
    state,
    llmConfig: { provider: 'offline_heuristic' },
  });

  assert.equal(advice.success, true);
  assert.match(advice.reply, /CHIẾN LƯỢC MỞ RỘNG TẬP ĐOÀN ĐA NGÀNH/);
  assert.match(advice.reply, /Công nghệ AI/);
});

test('AI CFO: Tự động chuyển fallback sang Offline Heuristic khi API trực tuyến bị lỗi hoặc không có mạng', async () => {
  const state = createFinanceState();
  const badConfig = {
    provider: 'openai_compatible',
    baseUrl: 'http://127.0.0.1:9999/invalid-endpoint',
    apiKey: 'sk-mock-key-for-test',
    model: 'gpt-4o-mini',
  };

  const res = await askCfoAdvisor({
    question: 'Đánh giá dòng tiền hiện tại của tập đoàn giúp tôi?',
    state,
    llmConfig: badConfig,
  });

  assert.equal(res.success, true);
  assert.equal(res.provider, 'offline_heuristic_fallback');
  assert.ok(res.warning);
  assert.match(res.reply, /BÁO CÁO ĐIỀU PHỐI DÒNG TIỀN/);
});
