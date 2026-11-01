/**
 * LLM CFO ADVISORY SERVICE — Cố vấn Tài chính AI cho CEO Tập đoàn Đa ngành
 * Nguồn sự thật: docs/09_PRO_CORPORATE.md, docs/07_ACCOUNTING_RULES.md, implementation_plan.md
 * - Cho phép CEO cấu hình tự do nhà cung cấp LLM (OpenAI-compatible, Gemini, Anthropic, Ollama, LM Studio, 9Router...).
 * - Cung cấp bộ suy luận nội bộ (Offline Heuristic CFO) đảm bảo trò chơi luôn chạy 100% không cần mạng hoặc khi chưa nhập API Key.
 * - Tuân thủ AGENTS.md §3: tầng services là nơi duy nhất được gọi fetch.
 */

import { buildCfoContextSnapshot, NPC_DIRECTORY } from '../core/finance.js?v=20261102_v1';

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

/**
 * ============================================================================
 * HỆ THỐNG ROLE-PLAYING ĐA NHÂN VẬT VẬN HÀNH BỞI LLM (MULTI-NPC ROLEPLAY ENGINE)
 * ============================================================================
 * Mỗi nhân viên bên cạnh CEO đều có tính cách, cách xưng hô, góc nhìn chuyên môn
 * và phản ứng nhập vai sống động dựa trên dữ liệu tài chính thực tế của doanh nghiệp.
 */
export const NPC_ROLEPLAY_PROFILES = {
  n_mentor: {
    npcId: 'n_mentor',
    name: 'Chị Mơ',
    role: 'Giám đốc Tài chính & Kế toán Trưởng (CFO)',
    selfPronoun: 'em',
    ceoPronoun: 'CEO',
    quickPrompts: [
      'Chị Mơ báo cáo nhanh tình hình cân đối Tài khoản Tổng và lợi nhuận ròng hiện tại nhé!',
      'Soi giúp tôi chứng từ đang mở trên bàn xem có rủi ro sai sót thuế hay chữ ký không?',
      'Chỉ đạo: Rà soát chi phí quản lý và tối ưu khấu trừ thuế GTGT kỳ này ngay!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Chị Mơ — Giám đốc Tài chính kiêm Kế toán Trưởng (CFO) của Tập đoàn Đa ngành Đại Việt, cấp dưới trực tiếp và cánh tay phải về tài chính của người chơi (CEO).
Xưng hô: xưng "em" hoặc "mình", gọi người chơi là "CEO" hoặc "Sếp".
Tính cách: Điềm đạm, cực kỳ chuẩn mực, thuộc lòng Thông tư 99/2025/TT-BTC và Luật Thuế GTGT 2024, luôn trích dẫn số liệu thực tế từ Sổ cái (Doanh thu 511, Lợi nhuận ròng, Tiền mặt 111, Ngân hàng 112) và tận tâm bảo vệ an toàn pháp lý cho CEO.`,
  },
  n_sale: {
    npcId: 'n_sale',
    name: 'Bé Na',
    role: 'Trưởng phòng Kinh doanh & Phát triển B2B',
    selfPronoun: 'em Na',
    ceoPronoun: 'Sếp CEO',
    quickPrompts: [
      'Bé Na báo cáo tiến độ doanh thu (TK 511) và các khoản nợ khách hàng (TK 131) hôm nay thế nào?',
      'Khách hàng B2B đang phản hồi sao về chính sách chiết khấu thanh toán sớm của mình?',
      'Chỉ đạo: Mở chiến dịch chốt hợp đồng B2B lớn và thu hồi ngay công nợ khách hàng về TK 112!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Bé Na — Trưởng phòng Kinh doanh & Phát triển Thị trường B2B của Tập đoàn Đại Việt, nhân viên dưới quyền trực tiếp của người chơi (CEO).
Xưng hô: xưng "em" hoặc "em Na", gọi người chơi là "Sếp CEO" hoặc "Sếp".
Tính cách: Trẻ trung, nhiệt huyết, lanh lợi, đam mê săn hợp đồng B2B lớn, luôn báo cáo cụ thể số liệu Doanh thu (TK 511) và Phải thu khách hàng (TK 131), sẵn sàng bung sức thực hiện mọi chỉ đạo bán hàng và thu hồi công nợ của CEO.`,
  },
  n_kho: {
    npcId: 'n_kho',
    name: 'Chú Bền',
    role: 'Giám đốc Kho vận & Chuỗi Cung ứng',
    selfPronoun: 'chú Bền',
    ceoPronoun: 'CEO',
    quickPrompts: [
      'Chú Bền báo cáo tình hình hàng tồn kho (TK 156) và công nợ nhà cung cấp (TK 331) hiện tại!',
      'Giá vốn hàng bán (TK 632) kỳ này có tối ưu thêm được không chú?',
      'Chỉ đạo: Đàm phán ép giá nhà cung cấp để lấy chiết khấu thương mại và xả hàng tồn kho chậm luân chuyển!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Chú Bền — Giám đốc Kho vận & Chuỗi Cung ứng lâu năm của Tập đoàn Đại Việt, dưới quyền điều hành của người chơi (CEO).
Xưng hô: xưng "chú" hoặc "chú Bền", gọi người chơi là "CEO" hoặc "Sếp".
Tính cách: Từng trải, chân chất, bộc trực, cực kỳ ghét thất thoát lãng phí, nắm rõ từng kiện hàng tồn kho (TK 156), giá vốn (TK 632) và công nợ nhà cung cấp (TK 331).`,
  },
  n_thuquy: {
    npcId: 'n_thuquy',
    name: 'Anh Tâm',
    role: 'Trưởng phòng Ngân quỹ & Nguồn vốn',
    selfPronoun: 'em Tâm',
    ceoPronoun: 'Sếp CEO',
    quickPrompts: [
      'Anh Tâm báo cáo số dư Quỹ tiền mặt (TK 111) và Tiền gửi Ngân hàng (TK 112) ngay lúc này!',
      'Tỷ lệ thanh khoản và nợ vay ngắn hạn (TK 341) của công ty có an toàn không?',
      'Chỉ đạo: Nộp tiền mặt vượt định mức vào Ngân hàng 112 và tối ưu lãi tiền gửi qua đêm!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Anh Tâm — Trưởng phòng Ngân quỹ & Nguồn vốn của Tập đoàn Đại Việt, dưới quyền trực tiếp của người chơi (CEO).
Xưng hô: xưng "em" hoặc "em Tâm", gọi người chơi là "Sếp CEO" hoặc "CEO".
Tính cách: Cẩn trọng, tỉ mỉ từng đồng, luôn báo cáo chính xác số dư Quỹ tiền mặt (TK 111), Tiền gửi Ngân hàng (TK 112), Nợ vay (TK 341) và tuân thủ nghiêm quy định chi từ 5 triệu đồng phải chuyển khoản.`,
  },
  n_shipper: {
    npcId: 'n_shipper',
    name: 'Cậu Lẹ',
    role: 'Trưởng bộ phận Giao nhận & Đối soát COD',
    selfPronoun: 'em Lẹ',
    ceoPronoun: 'Sếp CEO',
    quickPrompts: [
      'Cậu Lẹ báo cáo tiến độ giao hàng và số tiền thu hộ COD đang chờ đối soát nhé!',
      'Chi phí xăng dầu và vận chuyển ngoài hiện trường tuần này có phát sinh gì bất thường không?',
      'Chỉ đạo: Tổng đối soát thu hồi toàn bộ tiền COD về TK 112 và mở gói giao hàng hỏa tốc 2H!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Cậu Lẹ — Trưởng bộ phận Giao nhận & Đối soát COD của Tập đoàn Đại Việt, nhân viên dưới quyền của người chơi (CEO).
Xưng hô: xưng "em" hoặc "em Lẹ", gọi người chơi là "Sếp CEO" hoặc "Anh/Chị CEO".
Tính cách: Nhanh nhẹn, tháo vát, thực chiến ngoài hiện trường, nắm rõ luồng giao hàng COD, cước phí vận chuyển (TK 641) và luôn hăng hái nhận lệnh từ CEO.`,
  },
  n_sep: {
    npcId: 'n_sep',
    name: 'Ông Thịnh',
    role: 'Phó Tổng Giám đốc Chiến lược & M&A',
    selfPronoun: 'anh Thịnh',
    ceoPronoun: 'CEO',
    quickPrompts: [
      'Anh Thịnh đánh giá hiệu quả hoạt động của các công ty con (TK 221) trong tập đoàn hiện nay thế nào?',
      'Theo anh chúng ta nên mở rộng thêm ngành kinh doanh nào tiếp theo để tối ưu định giá?',
      'Chỉ đạo: Đôn đốc các công ty con nộp lợi nhuận chu kỳ và ký kết hợp đồng liên minh chiến lược!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Ông Thịnh — Phó Tổng Giám đốc phụ trách Chiến lược & M&A của Tập đoàn Đại Việt, cộng sự cấp cao dưới quyền điều hành của người chơi (Tổng Giám đốc / CEO).
Xưng hô: xưng "anh" hoặc "tôi", gọi người chơi là "CEO" hoặc "Tổng Giám đốc".
Tính cách: Tầm nhìn chiến lược, quyết đoán, am hiểu đầu tư công ty con (TK 221), M&A và điều phối liên phòng ban để giúp CEO mở rộng đế chế kinh doanh.`,
  },
  n_ktv1: {
    npcId: 'n_ktv1',
    name: 'Chị Ngân',
    role: 'Trưởng ban Kiểm toán Nội bộ & Pháp chế',
    selfPronoun: 'tôi (Ngân)',
    ceoPronoun: 'CEO',
    quickPrompts: [
      'Chị Ngân rà soát xem hệ thống chứng từ và Điểm tuân thủ nội bộ của tập đoàn có rủi ro gì không?',
      'Các hợp đồng thương mại hiện tại có điều khoản nào phạt nhà cung cấp vi phạm tiến độ không?',
      'Chỉ đạo: Tiến hành thanh tra nội bộ đột xuất và siết chặt lá chắn pháp chế toàn tập đoàn!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Chị Ngân — Trưởng ban Kiểm toán Nội bộ & Pháp chế của Tập đoàn Đại Việt, báo cáo trực tiếp cho người chơi (CEO).
Xưng hô: xưng "tôi" hoặc "em", gọi người chơi là "CEO".
Tính cách: Sắc sảo, khách quan, nguyên tắc thép, chuyên phát hiện sai sót trên chứng từ (chữ ký, MST, hóa đơn điện tử) và bảo vệ Tập đoàn khỏi rủi ro xuất toán thuế.`,
  },
  n_chutich: {
    npcId: 'n_chutich',
    name: 'Bà Diệu',
    role: 'Chủ tịch HĐQT & Quan hệ Cổ đông',
    selfPronoun: 'tôi',
    ceoPronoun: 'CEO',
    quickPrompts: [
      'Thưa Chủ tịch, HĐQT đánh giá thế nào về định giá tập đoàn và biên lợi nhuận ròng kỳ này?',
      'Tôi muốn đề xuất HĐQT rót thêm vốn điều lệ (TK 411) để mở rộng quy mô tập đoàn!',
      'Chỉ đạo / Đề xuất: Trình HĐQT phê duyệt quỹ thưởng nóng khích lệ tinh thần toàn bộ nhân sự!',
    ],
    systemPrompt: `Bạn đang nhập vai (Roleplay) là Bà Diệu — Chủ tịch Hội đồng Quản trị của Tập đoàn Đa ngành Đại Việt, đồng hành chiến lược cùng người chơi (CEO).
Xưng hô: xưng "tôi", gọi người chơi là "CEO".
Tính cách: Uy nghiêm, điềm tĩnh, tầm nhìn vốn hóa dài hạn, luôn ủng hộ các quyết sách minh bạch của CEO về huy động vốn (TK 411), phân phối lợi nhuận (TK 421) và phát triển nhân tài.`,
  },
};

/**
 * Bộ suy luận Role-Playing nội bộ (Offline In-Character Roleplay Engine):
 * Tạo câu trả lời nhập vai chuẩn xác theo tính cách từng nhân viên + số liệu thực tế của doanh nghiệp.
 */
export function generateOfflineNpcRoleplay({
  npcId = 'n_mentor',
  playerMessage = '',
  isDirective = false,
  directiveResult = null,
  snapshot = {},
} = {}) {
  const npc = NPC_DIRECTORY[npcId] || NPC_DIRECTORY.n_mentor;
  const profile = NPC_ROLEPLAY_PROFILES[npcId] || NPC_ROLEPLAY_PROFILES.n_mentor;
  const kpis = snapshot.kpis || {};
  const tr = snapshot.treasury || {};
  const sectors = snapshot.sectors || [];
  const activeDoc = snapshot.activeDocument;
  const staffMember = (snapshot.staff || []).find((s) => s.id === npcId);
  const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;
  const q = String(playerMessage || '').toLowerCase();

  // Nếu đây là phản hồi cho một Chỉ đạo Điều hành vừa được thực thi
  if (isDirective && directiveResult) {
    if (!directiveResult.ethical) {
      return directiveResult.npcReply;
    }
    return `${directiveResult.npcReply}\n\n📊 **[Báo cáo Số liệu Sau Chỉ đạo từ ${npc.name}]:**\n- **Tác động bút toán:** ${directiveResult.impactSummary}\n- **Doanh thu lũy kế mới:** ${vnd(kpis.revenue)} | **Lợi nhuận ròng:** ${vnd(kpis.netProfit)}\n- **Số dư Ngân hàng (TK 112):** ${vnd(tr.bankDeposit_112)} | **Tinh thần nhân sự:** ${staffMember?.morale ?? 92}/100`;
  }

  // Phản hồi Roleplay theo từng nhân vật khi CEO nhắn tin trò chuyện / hỏi báo cáo
  if (npcId === 'n_sale') {
    if (q.includes('nợ') || q.includes('131') || q.includes('thu hồi')) {
      return `Dạ thưa ${profile.ceoPronoun}! Hiện tại khoản Phải thu khách hàng (TK 131) của mình đang ở mức **${vnd(tr.receivables_131)}**. Em Na đã lên danh sách các đại lý B2B sắp đến hạn thanh toán rồi ạ. Sếp chỉ cần bấm nút giao chỉ đạo **"Đôn đốc Thu hồi Công nợ Khách hàng"** hoặc ra lệnh một tiếng là em dí khách chuyển khoản về TK 112 ngay trong ngày! 💪`;
    }
    return `Dạ ${profile.selfPronoun} nghe rõ thưa ${profile.ceoPronoun}! Báo cáo Sếp, tổng Doanh thu thuần (TK 511/515) của Tập đoàn đang đạt **${vnd(kpis.revenue)}** với biên lợi nhuận ròng **${(kpis.netMarginPct || 0).toFixed(1)}%**.\n\nVề nội dung Sếp vừa nhắn (*"${playerMessage}"*), đội Kinh doanh B2B của em đã sẵn sàng 100% tinh thần (${staffMember?.morale ?? 90}/100). Sếp muốn tụi em bung chiến dịch chốt đơn thu tiền tươi ngay hay triển khai gói dịch vụ VIP biên lãi cao ạ?`;
  }

  if (npcId === 'n_kho') {
    const inv156 = snapshot.keyBalances?.['156'] ?? 210000000;
    return `Báo cáo ${profile.ceoPronoun}! Chú Bền vừa đi kiểm tra một vòng kho trung tâm về. Hiện giá trị Hàng tồn kho (TK 156) đang là **${vnd(inv156)}**, Giá vốn hàng bán lũy kế (TK 632) là **${vnd(kpis.cogs)}** và Công nợ phải trả nhà cung cấp (TK 331) là **${vnd(tr.payables_331)}**.\n\nÝ kiến của CEO (*"${playerMessage}"*) rất sát thực tế! CEO cứ phát lệnh chỉ đạo cho chú: chú sẽ làm việc thẳng với nhà cung cấp để ép giảm giá vốn, đòi chiết khấu thương mại hoặc xả nhanh hàng tồn thu tiền mặt về cho Tập đoàn!`;
  }

  if (npcId === 'n_thuquy') {
    return `Dạ báo cáo ${profile.ceoPronoun}, em Tâm xin cập nhật két sắt và ngân hàng tức thời:\n- **Quỹ Tiền mặt tại két (TK 111):** ${vnd(tr.cashOnHand_111)}\n- **Tiền gửi Ngân hàng (TK 112):** ${vnd(tr.bankDeposit_112)}\n- **Vay ngắn hạn (TK 341):** ${vnd(tr.shortTermDebt_341)}\n- **Hệ số thanh toán hiện hành:** ${tr.currentRatio || 1.8}x\n\nVề yêu cầu của Sếp (*"${playerMessage}"*), em luôn giữ kỷ luật thanh toán không dùng tiền mặt đối với mọi hóa đơn từ 5 triệu đồng trở lên. Sếp cần em nộp bớt tiền mặt vào ngân hàng sinh lời hay tất toán công nợ sớm để hưởng chiết khấu ạ?`;
  }

  if (npcId === 'n_shipper') {
    return `Dạ có em Lẹ đây ${profile.ceoPronoun} ơi! 🛵 Tình hình đội xe giao nhận và đối soát COD hôm nay rất sôi động. Chi phí vận hành & bán hàng (OPEX) hiện đang kiểm soát ở mức **${vnd(kpis.opex)}**.\n\nSếp nhắn *"${playerMessage}"* là anh em tài xế ngoài hiện trường phấn khởi lắm! Sếp phát chỉ đạo cho em Lẹ quét sạch tiền thu hộ COD từ cổng vận chuyển về TK 112 hoặc mở gói giao hỏa tốc B2B 2 giờ để kiếm thêm doanh thu dịch vụ ngay nhé Sếp!`;
  }

  if (npcId === 'n_sep') {
    return `Chào ${profile.ceoPronoun}! Với vai trò Phó TGĐ Chiến lược & M&A, anh đã nghiên cứu kỹ định hướng *"${playerMessage}"* của CEO.\n\nHiện Tập đoàn chúng ta đang vận hành **${sectors.length} công ty con** với tổng vốn đầu tư (TK 221) là **${vnd(snapshot.keyBalances?.['221'] || 0)}** và Định giá Tập đoàn đạt **${vnd(kpis.companyValuation)}**. CEO có thể ra chỉ đạo cho anh đôn đốc các công ty con nộp lợi nhuận chu kỳ về công ty mẹ, hoặc ký kết thương vụ liên minh cung ứng chiến lược để bứt phá lợi nhuận ròng (**${vnd(kpis.netProfit)}**)!`;
  }

  if (npcId === 'n_ktv1') {
    const docNote = activeDoc
      ? `Chứng từ đang mở trên bàn (**${activeDoc.title} — ${activeDoc.pushId}**): ${activeDoc.hasDefectDetectedByAudit ? '⚠️ **PHÁT HIỆN CÓ DẤU HIỆU SAI SÓT KIỂM SOÁT**, đề nghị CEO chặn và trả lại ngay!' : '✅ **Các trường thông tin và chữ ký đều hợp lệ**.'}`
      : 'Các chứng từ đã được giám sát chặt chẽ.';
    return `Báo cáo ${profile.ceoPronoun}, Trưởng ban Kiểm toán Nội bộ & Pháp chế xin phản hồi về *"${playerMessage}"*:\n- **Điểm Kỷ luật Tuân thủ hiện tại:** ${kpis.complianceScore ?? 100}/100\n- **Cân đối Tài khoản Tổng:** ${snapshot.masterAccountsBalanced ? '✅ Cân đối tuyệt đối (Tài sản = Nguồn vốn)' : '⚠️ Cần kiểm tra lại'}\n- **Rà soát nhanh:** ${docNote}\n\nCEO hãy giao chỉ đạo Thanh tra nội bộ hoặc Thẩm định hợp đồng để tôi thu hồi các khoản phạt vi phạm tiến độ từ nhà cung cấp về cho Tập đoàn!`;
  }

  if (npcId === 'n_chutich') {
    const eq411 = Math.abs(snapshot.keyBalances?.['411'] || 800000000);
    return `Chào ${profile.ceoPronoun}! Thay mặt Hội đồng Quản trị, tôi rất tâm đắc với trao đổi của bạn: *"${playerMessage}"*.\n\nHiện Vốn đầu tư của chủ sở hữu (TK 411) đang là **${vnd(eq411)}**, Tổng Tài sản đạt **${vnd(snapshot.totalAssets)}** và Lợi nhuận ròng đạt **${vnd(kpis.netProfit)}**. Nếu CEO cần bổ sung thêm 100 triệu đồng vốn điều lệ vào TK 112 hoặc muốn trích quỹ khen thưởng để nâng cao hiệu suất toàn bộ nhân viên, hãy phát đề xuất/chỉ đạo ngay — HĐQT sẽ phê duyệt tức khắc! 🏛️`;
  }

  // Mặc định: Chị Mơ (n_mentor - CFO / Kế toán trưởng)
  return `Dạ thưa ${profile.ceoPronoun}, em Mơ (CFO & Kế toán trưởng) đã ghi nhận ý kiến của Sếp: *"${playerMessage}"*.\n\nBáo cáo nhanh với CEO bức tranh tài chính thời gian thực:\n- **Doanh thu thuần:** ${vnd(kpis.revenue)} | **Lợi nhuận ròng:** ${vnd(kpis.netProfit)}\n- **Thanh khoản sẵn sàng (111 + 112):** ${vnd(kpis.liquidity)}\n- **Cân đối Sổ cái (TT 99/2025/TT-BTC):** ${snapshot.masterAccountsBalanced ? '✅ Cân đối 100%' : '⚠️ Đang lệch'}\n\nSếp có thể giao chỉ đạo trực tiếp cho em để tối ưu chi phí, khấu trừ thuế GTGT hoặc kết chuyển lãi ròng vào TK 421 bất cứ lúc nào ạ!`;
}

/**
 * Gửi tin nhắn Role-Playing hoặc Chỉ đạo của CEO tới một NPC cụ thể (vận hành bởi LLM hoặc Offline Roleplay Engine).
 */
export async function askNpcRoleplay({
  npcId = 'n_mentor',
  playerMessage = '',
  isDirective = false,
  directiveResult = null,
  state = null,
  activeDoc = null,
  llmConfig = DEFAULT_LLM_CONFIG,
} = {}) {
  const snapshot = state ? buildCfoContextSnapshot(state, activeDoc) : {};
  const npc = NPC_DIRECTORY[npcId] || NPC_DIRECTORY.n_mentor;
  const profile = NPC_ROLEPLAY_PROFILES[npcId] || NPC_ROLEPLAY_PROFILES.n_mentor;

  // Nếu chọn chế độ Offline Heuristic hoặc chưa cấu hình API Key
  if (llmConfig.provider === 'offline_heuristic' || !llmConfig.apiKey?.trim()) {
    return {
      success: true,
      provider: 'offline_roleplay_engine',
      model: `Roleplay Engine (${npc.name})`,
      reply: generateOfflineNpcRoleplay({
        npcId,
        playerMessage,
        isDirective,
        directiveResult,
        snapshot,
      }),
      timestamp: new Date().toISOString(),
    };
  }

  // Lấy tối đa 6 tin nhắn gần nhất giữa CEO và NPC này để giữ mạch hội thoại Roleplay
  const recentHistory = (state?.npcChats?.[npcId] || [])
    .slice(-6)
    .map((m) => `${m.sender === 'player' ? 'CEO' : npc.name}: ${m.text}`)
    .join('\n');

  const systemPrompt = `${profile.systemPrompt}
QUY TẮC NHẬP VAI (ROLEPLAY RULES):
1. Giữ đúng 100% giọng điệu, tính cách và cách xưng hô (${profile.selfPronoun} - ${profile.ceoPronoun}) của nhân vật ${npc.name} (${npc.role}).
2. Phản hồi ngắn gọn, sắc sảo (khoảng 3-6 câu), viện dẫn đúng các con số thực tế của Tập đoàn Đại Việt trong dữ liệu JSON đính kèm.
3. Nếu CEO vừa ban hành một Chỉ đạo Điều hành (Directive), hãy báo cáo thái độ chấp hành nhiệt tình, nêu rõ kết quả thực thi bút toán kế toán/kinh doanh và tác động lên doanh nghiệp.
4. Nếu CEO yêu cầu làm điều phạm pháp (trốn thuế, lập 2 sổ, chi tiền mặt lớn không hóa đơn), hãy kiên quyết cảnh báo rủi ro pháp lý theo Luật Thuế Việt Nam.`;

  const directiveContext =
    isDirective && directiveResult
      ? `\nKẾT QUẢ THỰC THI CHỈ ĐẠO TRÊN HỆ THỐNG ERP:\n- Tiêu đề chỉ đạo: ${directiveResult.directiveTitle}\n- Tác động kế toán & kinh doanh: ${directiveResult.impactSummary}\n- Hợp pháp/Đạo đức: ${directiveResult.ethical ? 'Hợp lệ chuẩn mực' : 'Vi phạm bị chế tài'}\n`
      : '';

  const userPrompt = `DỮ LIỆU TÀI CHÍNH & VẬN HÀNH THỜI GIAN THỰC CỦA TẬP ĐOÀN:
\`\`\`json
${JSON.stringify(
  {
    kpis: snapshot.kpis,
    treasury: snapshot.treasury,
    keyBalances: snapshot.keyBalances,
    activeDocument: snapshot.activeDocument,
    sectorsCount: snapshot.sectors?.length || 1,
  },
  null,
  2
)}
\`\`\`

LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY GIỮA CEO VÀ ${npc.name.toUpperCase()}:
${recentHistory || '(Bắt đầu cuộc trò chuyện)'}
${directiveContext}
TIN NHẮN / CHỈ ĐẠO MỚI NHẤT TỪ CEO GỬI CHO BẠN (${npc.name}):
"${playerMessage}"

Hãy nhập vai ${npc.name} (${npc.role}) trả lời trực tiếp cho CEO bằng tiếng Việt:`;

  try {
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
          temperature: Number(llmConfig.temperature) || 0.4,
          max_tokens: Number(llmConfig.maxTokens) || 600,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 120)}`);
      }
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || generateOfflineNpcRoleplay({ npcId, playerMessage, isDirective, directiveResult, snapshot });
      return {
        success: true,
        provider: 'openai_compatible',
        model: llmConfig.model,
        reply,
        timestamp: new Date().toISOString(),
      };
    }

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
            temperature: Number(llmConfig.temperature) || 0.4,
            maxOutputTokens: Number(llmConfig.maxTokens) || 600,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 120)}`);
      }
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || generateOfflineNpcRoleplay({ npcId, playerMessage, isDirective, directiveResult, snapshot });
      return {
        success: true,
        provider: 'gemini',
        model,
        reply,
        timestamp: new Date().toISOString(),
      };
    }

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
          max_tokens: Number(llmConfig.maxTokens) || 600,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 120)}`);
      }
      const data = await res.json();
      const reply = data.content?.[0]?.text || generateOfflineNpcRoleplay({ npcId, playerMessage, isDirective, directiveResult, snapshot });
      return {
        success: true,
        provider: 'anthropic',
        model: llmConfig.model,
        reply,
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(`Provider '${llmConfig.provider}' không hỗ trợ.`);
  } catch (err) {
    console.warn(`[NPC-ROLEPLAY] Gọi LLM cho ${npc.name} thất bại, dùng Roleplay Engine nội bộ:`, err.message);
    return {
      success: true,
      provider: 'offline_roleplay_fallback',
      model: `${llmConfig.model || 'LLM'} (Fallback Roleplay)`,
      warning: err.message,
      reply: generateOfflineNpcRoleplay({
        npcId,
        playerMessage,
        isDirective,
        directiveResult,
        snapshot,
      }),
      timestamp: new Date().toISOString(),
    };
  }
}

