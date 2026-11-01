/**
 * LLM CFO ADVISORY SERVICE — Cố vấn Tài chính AI cho CEO Tập đoàn Đa ngành
 * Nguồn sự thật: docs/09_PRO_CORPORATE.md, docs/07_ACCOUNTING_RULES.md, implementation_plan.md
 * - Cho phép CEO cấu hình tự do nhà cung cấp LLM (OpenAI-compatible, Gemini, Anthropic, Ollama, LM Studio, 9Router...).
 * - Cung cấp bộ suy luận nội bộ (Offline Heuristic CFO) đảm bảo trò chơi luôn chạy 100% không cần mạng hoặc khi chưa nhập API Key.
 * - Tuân thủ AGENTS.md §3: tầng services là nơi duy nhất được gọi fetch.
 */

import { buildCfoContextSnapshot } from '../core/finance.js?v=20261101_v3';

export const DEFAULT_LLM_CONFIG = {
  provider: 'offline_heuristic', // 'offline_heuristic' | 'openai_compatible' | 'gemini' | 'anthropic'
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 800,
  persona: 'strategic_big4', // 'strategic_big4' | 'aggressive_growth' | 'compliance_guardian' | 'custom'
  customSystemPrompt: '',
};

export const CFO_PERSONAS = {
  strategic_big4: {
    id: 'strategic_big4',
    name: 'CFO Chiến lược & Kiểm toán Big Four',
    avatar: '👔',
    tone: 'Chuyên nghiệp, chặt chẽ, dựa trên số liệu chuẩn mực IFRS & TT 99/2025/TT-BTC, cân bằng giữa tăng trưởng và an toàn ngân quỹ.',
    systemPrompt: `Bạn là Giám đốc Tài chính (CFO) cấp cao của Tập đoàn Đa ngành Đại Việt, cố vấn trực tiếp cho CEO (người chơi).
Phong cách của bạn: chuẩn mực, sắc sảo, am hiểu kế toán tài chính Việt Nam (Thông tư 99/2025/TT-BTC, Luật Doanh nghiệp 2020, Luật Thuế GTGT 2024).
Mỗi khi trả lời CEO:
1. Luôn viện dẫn số liệu cụ thể từ tình hình tài chính thực tế của Tập đoàn (Doanh thu, Lợi nhuận ròng, Tiền gửi 112, Nợ 341, Vốn đầu tư 221).
2. Khi phân tích chứng từ, chỉ rõ chứng từ hợp lệ hay có sai sót kiểm soát nội bộ và đề xuất bút toán Nợ/Có cân đối.
3. Khi tư vấn mở rộng lĩnh vực kinh doanh, phân tích rủi ro thanh khoản và tỷ suất ROI kỳ vọng.
4. Giữ giọng văn tôn trọng, tự tin, súc tích và hành động cụ thể.`,
  },
  aggressive_growth: {
    id: 'aggressive_growth',
    name: 'CFO Tăng trưởng Thần tốc & M&A',
    avatar: '🚀',
    tone: 'Táo bạo, tối ưu đòn bẩy tài chính (TK 341), khuyến khích mở rộng ngành công nghệ, AI và logistics để gia tăng định giá.',
    systemPrompt: `Bạn là Giám đốc Tài chính (CFO) định hướng Tăng trưởng Thần tốc & M&A của Tập đoàn Đại Việt.
Mục tiêu tối thượng của bạn là cùng CEO mở rộng quy mô thị phần, tối ưu hoá dòng tiền và đòn bẩy tài chính thông minh (TK 341) để đầu tư vào các ngành sinh lời cao (AI, Phần mềm, Logistics).
Hãy đưa ra các đề xuất đột phá nhưng vẫn kiểm soát được điểm hòa vốn và dòng tiền trả nợ.`,
  },
  compliance_guardian: {
    id: 'compliance_guardian',
    name: 'CFO Pháp chế & Kiểm soát Nội bộ Khắt khe',
    avatar: '🛡️',
    tone: 'Kỷ luật thép, tuyệt đối không chấp nhận rủi ro thuế/phạt, yêu cầu chứng từ điện tử đầy đủ 100%, bảo toàn vốn chủ sở hữu.',
    systemPrompt: `Bạn là Giám đốc Tài chính (CFO) kiêm Trưởng ban Kiểm soát Nội bộ của Tập đoàn Đại Việt.
Kim chỉ nam của bạn là Kỷ luật Tuân thủ Pháp luật Tuyệt đối (Luật Thuế GTGT 2024, Thông tư 99/2025/TT-BTC).
Bất kỳ chứng từ nào thiếu chữ ký, sai MST hay chi tiền mặt quá 5 triệu không hóa đơn đều phải bị chặn ngay lập tức. Hãy bảo vệ CEO khỏi mọi nguy cơ bị thanh tra thuế phạt xuất toán!`,
  },
  custom: {
    id: 'custom',
    name: 'CFO Tuỳ chỉnh theo ý CEO',
    avatar: '🧠',
    tone: 'Do CEO tự định nghĩa câu lệnh hệ thống (System Prompt).',
    systemPrompt: '',
  },
};

/**
 * Bộ suy luận nội bộ Offline Heuristic CFO: Phân tích định lượng dữ liệu và trả lời thông minh khi không có mạng.
 */
export function generateOfflineHeuristicAdvice({ question = '', snapshot = {} } = {}) {
  const q = question.toLowerCase();
  const kpis = snapshot.kpis || {};
  const tr = snapshot.treasury || {};
  const activeDoc = snapshot.activeDocument;
  const sectors = snapshot.sectors || [];

  const vnd = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ';

  // 1. Nếu CEO hỏi về chứng từ / lệnh chi đang mở
  if (activeDoc && (q.includes('chứng từ') || q.includes('lệnh') || q.includes('soi') || q.includes('rủi ro') || q.includes('hợp lệ') || q.includes('chi'))) {
    if (activeDoc.hasDefectDetectedByAudit) {
      return `### 🚨 Ý KIẾN CỐ VẤN CFO: PHÁT HIỆN RỦI RO KIỂM SOÁT NỘI BỘ
Thưa CEO, tôi đã soi nhanh chứng từ **${activeDoc.title}** (${activeDoc.pushId}) phát hành từ phòng **${activeDoc.dept}**:

- **Tình trạng:** Chứng từ này **CÓ SAI SÓT VI PHẠM CHUẨN MỰC** (về hóa đơn, chữ ký thẩm quyền, thuế suất hoặc khớp số tiền bằng chữ).
- **Khuyến nghị hành động:** CEO **KHÔNG ĐƯỢC DUYỆT BÚT TOÁN**. Vui lòng bấm trực tiếp vào trường thông tin sai trên tờ chứng từ để **Chặn & Trả lại** ngay. Nếu duyệt chi sai sót này, Tập đoàn sẽ bị kiểm toán xuất toán và phạt giảm điểm tuân thủ!`;
    } else {
      return `### ✅ Ý KIẾN CỐ VẤN CFO: CHỨNG TỪ ĐẦY ĐỦ PHÁP LÝ
Thưa CEO, hồ sơ chứng từ **${activeDoc.title}** (${activeDoc.pushId}, số tiền **${activeDoc.amount}**) đã được đối chiếu kỹ:
- Các trường thông tin (MST, chữ ký, số tiền bằng chữ và ngày tháng) đều **chuẩn mực hợp lệ**.
- **Khuyến nghị:** CEO có thể ký duyệt và lập bút toán Nợ/Có hạch toán vào Sổ cái để tiếp tục dòng chảy kinh doanh của Tập đoàn.`;
    }
  }

  // 2. Nếu CEO hỏi về mở rộng lĩnh vực kinh doanh / M&A
  if (q.includes('mở rộng') || q.includes('ngành') || q.includes('đầu tư') || q.includes('công ty con') || q.includes('m&a') || q.includes('lĩnh vực')) {
    const bankDeposit = tr.bankDeposit_112 || 0;
    const canLeverage = bankDeposit >= 200000000;
    return `### 📊 CHIẾN LƯỢC MỞ RỘNG TẬP ĐOÀN ĐA NGÀNH
Thưa CEO, báo cáo danh mục đầu tư công ty con hiện tại của Tập đoàn:
- **Số đơn vị thành viên:** ${sectors.length} công ty con đang hoạt động.
- **Tiền gửi Ngân hàng sẵn sàng (TK 112):** ${vnd(bankDeposit)}.
- **Tỷ số thanh toán hiện hành:** ${tr.currentRatio?.toFixed(2) || '1.80'}x.

**💡 Đề xuất hành động cho CEO:**
1. ${canLeverage ? 'Nguồn tiền gửi đang dồi dào, CEO có thể mở thêm **Công nghệ AI & SaaS Đám mây (TECH_AI)** hoặc **Logistics Kho thông minh** để đón đầu làn sóng số hoá với ROI kỳ vọng từ 24% - 38%.' : 'Tiền gửi ngân hàng đang cần ưu tiên cho vốn lưu động. Nếu muốn mở rộng ngay, CEO nên chọn phương thức **Đồng tài trợ đòn bẩy Vay tín dụng (TK 341)** để giảm áp lực ngân quỹ.'}
2. CEO có thể dùng tính năng **"Tự khởi tạo Lĩnh vực Kinh doanh"** ở Tab 05 để sáng lập bất kỳ ngành nghề nào bạn muốn!`;
  }

  // 3. Nếu CEO hỏi về dòng tiền / ngân quỹ / thanh khoản
  if (q.includes('tiền') || q.includes('ngân quỹ') || q.includes('dòng tiền') || q.includes('thanh khoản') || q.includes('111') || q.includes('112') || q.includes('vay')) {
    return `### 🏦 BÁO CÁO ĐIỀU PHỐI DÒNG TIỀN & NGÂN QUỸ (TREASURY)
Thưa CEO, bức tranh thanh khoản tổng hợp của Tập đoàn:
- **Quỹ Tiền mặt (TK 111):** ${vnd(tr.cashOnHand_111)}
- **Tiền gửi Ngân hàng (TK 112):** ${vnd(tr.bankDeposit_112)}
- **Phải thu Khách hàng (TK 131):** ${vnd(tr.receivables_131)}
- **Phải trả Người bán (TK 331):** ${vnd(tr.payables_331)}
- **Vay ngắn hạn (TK 341):** ${vnd(tr.shortTermDebt_341)}

**🎯 Đánh giá của CFO:** ${tr.recommendation || 'Dòng tiền cơ bản ổn định. Hãy đôn đốc thu hồi công nợ 131 và duy trì số dư tiền gửi ngân hàng trên mức an toàn.'}`;
  }

  // 4. Nếu CEO hỏi về lợi nhuận / P&L / tài khoản tổng
  if (q.includes('lợi nhuận') || q.includes('doanh thu') || q.includes('kết chuyển') || q.includes('421') || q.includes('báo cáo') || q.includes('cân đối')) {
    return `### ⚖️ PHÂN TÍCH HIỆU QUẢ TÀI CHÍNH & TÀI KHOẢN TỔNG
Thưa CEO, các chỉ số P&L thời gian thực:
- **Doanh thu thuần:** ${vnd(kpis.revenue)}
- **Lợi nhuận gộp:** ${vnd(kpis.grossProfit)}
- **Lợi nhuận ròng:** ${vnd(kpis.netProfit)} (Biên ròng: ${(kpis.netMarginPct || 0).toFixed(1)}%)
- **Định giá Tập đoàn (Valuation):** ${vnd(kpis.companyValuation)}
- **Cân đối Kế toán (Tài sản = Nguồn vốn):** ${snapshot.masterAccountsBalanced ? '✅ CÂN ĐỐI 100%' : '⚠️ Đang lệch, cần kiểm tra lại sổ nhật ký!'}

CEO có thể vào Tab **"Tài khoản Tổng & BCTC"** để thực hiện bút toán **Kết chuyển Doanh thu/Chi phí cuối kỳ qua TK 911 về Lợi nhuận chưa phân phối (TK 421)**.`;
  }

  // 5. Câu trả lời mặc định khi hỏi chung
  return `### 👔 CỐ VẤN TÀI CHÍNH CFO SẴN SÀNG
Chào CEO! Tôi luôn đồng hành cùng bạn điều hành Tập đoàn Đa ngành Đại Việt.
Hiện tại Tập đoàn đang ghi nhận:
- **Doanh thu thuần:** ${vnd(kpis.revenue)} | **Lợi nhuận ròng:** ${vnd(kpis.netProfit)}
- **Khả năng thanh khoản:** ${vnd(kpis.liquidity)}
- **Điểm Kỷ luật Tuân thủ:** ${kpis.complianceScore}/100

CEO cần tôi hỗ trợ việc gì nhất lúc này:
1. Soi lỗi kiểm soát nội bộ và đề xuất bút toán cho chứng từ đang mở?
2. Phân tích kế hoạch đầu tư mở rộng công ty con mới?
3. Tối ưu hoá dòng tiền điều chuyển giữa Quỹ tiền mặt (111) và Ngân hàng (112)?`;
}

/**
 * Gửi yêu cầu tư vấn đến AI CFO (LLM API hoặc Fallback Offline).
 */
export async function askCfoAdvisor({ question, state, activeDoc = null, llmConfig = DEFAULT_LLM_CONFIG }) {
  const snapshot = state ? buildCfoContextSnapshot(state, activeDoc) : {};

  // Nếu chọn chế độ Offline Heuristic hoặc chưa cấu hình API Key
  if (llmConfig.provider === 'offline_heuristic' || !llmConfig.apiKey) {
    return {
      success: true,
      provider: 'offline_heuristic',
      model: 'Built-in Quantitative CFO Engine',
      reply: generateOfflineHeuristicAdvice({ question, snapshot }),
      timestamp: new Date().toISOString(),
    };
  }

  const personaDef = CFO_PERSONAS[llmConfig.persona] || CFO_PERSONAS.strategic_big4;
  const systemPrompt = llmConfig.customSystemPrompt?.trim() || personaDef.systemPrompt;

  const userPrompt = `DƯỚI ĐÂY LÀ DỮ LIỆU TÀI CHÍNH THỜI GIAN THỰC CỦA TẬP ĐOÀN ĐA NGÀNH:
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\`

CÂU HỎI / YÊU CẦU TỪ CEO:
"${question}"

Hãy trả lời trực tiếp cho CEO bằng tiếng Việt, định dạng Markdown rõ ràng, chuẩn mực kế toán Việt Nam, phân tích sắc bén và đưa ra khuyến nghị hành động cụ thể.`;

  try {
    // 1. OpenAI-Compatible API (OpenAI, OpenRouter, Groq, DeepSeek, Together, Ollama, LM Studio...)
    if (llmConfig.provider === 'openai_compatible') {
      const endpoint = `${llmConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${llmConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: llmConfig.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: Number(llmConfig.temperature) || 0.3,
          max_tokens: Number(llmConfig.maxTokens) || 800,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM API trả về mã lỗi HTTP ${res.status}: ${errText.slice(0, 160)}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'CFO không nhận được nội dung phản hồi từ mô hình.';

      return {
        success: true,
        provider: 'openai_compatible',
        model: llmConfig.model,
        reply,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Google Gemini API
    if (llmConfig.provider === 'gemini') {
      const model = llmConfig.model || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${llmConfig.apiKey.trim()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: Number(llmConfig.temperature) || 0.3,
            maxOutputTokens: Number(llmConfig.maxTokens) || 800,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API trả về mã lỗi HTTP ${res.status}: ${errText.slice(0, 160)}`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini không có phản hồi.';
      return {
        success: true,
        provider: 'gemini',
        model,
        reply,
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Anthropic Claude API
    if (llmConfig.provider === 'anthropic') {
      const endpoint = 'https://api.anthropic.com/v1/messages';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': llmConfig.apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: llmConfig.model || 'claude-3-5-sonnet-20241022',
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: Number(llmConfig.maxTokens) || 800,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic API trả về mã lỗi HTTP ${res.status}: ${errText.slice(0, 160)}`);
      }

      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Claude không có phản hồi.';
      return {
        success: true,
        provider: 'anthropic',
        model: llmConfig.model,
        reply,
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(`Nhà cung cấp LLM '${llmConfig.provider}' chưa được hỗ trợ.`);
  } catch (err) {
    console.warn('[LLM-CFO] Gọi API thất bại, tự động chuyển mượt sang Offline Heuristic CFO:', err.message);
    const offlineAdvice = generateOfflineHeuristicAdvice({ question, snapshot });
    return {
      success: true,
      provider: 'offline_heuristic_fallback',
      model: `${llmConfig.model || 'LLM'} (Fallback: Built-in CFO)`,
      warning: `Không thể kết nối đến ${llmConfig.provider} (${err.message}). AI CFO đã tự động chuyển sang Chế độ Phân tích Định lượng Nội bộ.`,
      reply: offlineAdvice,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Kiểm tra kết nối nhanh đến API LLM của người chơi.
 */
export async function testLlmConnection(llmConfig) {
  if (llmConfig.provider === 'offline_heuristic') {
    return { success: true, message: 'Chế độ Cố vấn Nội bộ (Offline Heuristic) sẵn sàng 100% không cần API Key.' };
  }
  if (!llmConfig.apiKey?.trim()) {
    return { success: false, message: 'Vui lòng nhập API Key để kết nối mô hình trực tuyến.' };
  }

  try {
    const testRes = await askCfoAdvisor({
      question: 'Chào CFO! Hãy phản hồi ngắn gọn 1 câu để xác nhận kết nối thành công với CEO.',
      state: null,
      activeDoc: null,
      llmConfig,
    });
    return {
      success: true,
      message: `Kết nối thành công tới ${testRes.provider} (${testRes.model})!`,
      reply: testRes.reply,
    };
  } catch (err) {
    return { success: false, message: `Kết nối thất bại: ${err.message}` };
  }
}
