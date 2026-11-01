/**
 * CORE FINANCE, TREASURY REBALANCING, MASTER ACCOUNTS & SLACK NPC RANDOM EVENTS — Nợ Có Ơi Pro
 * Nguồn sự thật: ADR-014, CORE-014, CORE-015, CORE-016
 * - Hàm thuần (pure JS), tiền là số nguyên VND (ADR-007).
 * - Mọi sự kiện ngẫu nhiên (Lệnh chi / Thông báo thu / Tin nhắn Slack từ NPC) đều đi qua PRNG có seed (`createRng`).
 * - Tuân thủ Luật số 6 (GDD §7): Không thưởng gian lận — mọi phương án trả lời NPC sai đạo đức/pháp luật đều bị thiệt hại về lâu dài.
 */
import { createRng } from './rng.js';

export const NPC_DIRECTORY = {
  n_sale: { id: 'n_sale', name: 'Bé Na', role: 'Chuyên viên Kinh doanh', avatar: '👩‍💼', channel: '#kinh-doanh-thu-tien', color: '#38BDF8' },
  n_thuquy: { id: 'n_thuquy', name: 'Anh Tâm', role: 'Thủ quỹ Công ty', avatar: '👨‍💼', channel: '#lenh-thu-chi-quy', color: '#10B981' },
  n_kho: { id: 'n_kho', name: 'Chú Bền', role: 'Trưởng Kho vận', avatar: '👷', channel: '#kho-van-mua-hang', color: '#F59E0B' },
  n_sep: { id: 'n_sep', name: 'Ông Thịnh', role: 'Giám đốc Điều hành (CEO)', avatar: '👔', channel: '#ban-giam-doc', color: '#A855F7' },
  n_shipper: { id: 'n_shipper', name: 'Cậu Lẹ', role: 'Điều phối Giao nhận & COD', avatar: '🛵', channel: '#doi-soat-cod-opex', color: '#06B6D4' },
  n_mentor: { id: 'n_mentor', name: 'Chị Mơ', role: 'Kế toán Trưởng', avatar: '👩‍🏫', channel: '#kiem-soat-noi-bo', color: '#34D399' },
  n_chutich: { id: 'n_chutich', name: 'Bà Diệu', role: 'Chủ tịch HĐQT', avatar: '🏛️', channel: '#hdqt-chien-luoc', color: '#F43F5E' },
  n_ktv1: { id: 'n_ktv1', name: 'Chị Ngân', role: 'Trưởng nhóm Kiểm toán', avatar: '🔍', channel: '#kiem-toan-phap-che', color: '#93C5FD' },
};

/**
 * Danh mục Sự kiện Ngẫu nhiên dạng Tin nhắn Slack (Lệnh chi & Thông báo thu) kèm các lựa chọn trả lời NPC.
 */
export const NPC_SLACK_EVENTS = [
  {
    templateId: 'evt_urgent_cash_expense',
    orderType: 'LỆNH CHI ĐỘT XUẤT',
    npcId: 'n_sep',
    channel: '#ban-giam-doc',
    title: 'Lệnh chi tiếp đoàn khách B2B & Tổ chức sự kiện ký kết',
    baseAmount: 16200000,
    messageTemplate: (amtStr) =>
      `@cfo Anh đang tiếp đoàn đối tác B2B chiến lược. Bên trung tâm hội nghị báo tổng chi phí ${amtStr} (đã gồm VAT 8%). Họ gợi ý nếu trả tiền mặt ngay tại quầy không lấy hóa đơn thì giảm 500.000 đ; còn chuyển khoản công ty thì xuất đủ Hóa đơn điện tử GTGT hợp lệ. Em duyệt lệnh chi phương án nào?`,
    choices: [
      {
        id: 'opt_bank_vat',
        label: '✅ Duyệt Ủy nhiệm chi Ngân hàng (112) & yêu cầu xuất đủ Hóa đơn điện tử GTGT',
        playerText:
          'Anh Thịnh ơi, theo Luật Thuế GTGT 2024 mọi khoản chi từ 5 triệu trở lên bắt buộc chuyển khoản và có HĐĐT mới được khấu trừ thuế (TK 1331) và tính chi phí hợp lệ. Em chuyển khoản 16.200.000 đ ngay, anh nhắc họ xuất HĐĐT về MST công ty mình nhé!',
        npcReply:
          'Ok em, làm chuẩn chỉ thế kiểm toán vào khỏi lo bị xuất toán! Bên nhà hàng vừa xuất HĐĐT về email kế toán rồi đó. 👍',
        ethical: true,
        scoreDelta: 150,
        complianceDelta: 5,
        lines: [
          { side: 'N', account: '641', amount: 15000000 },
          { side: 'N', account: '1331', amount: 1200000 },
          { side: 'C', account: '112', amount: 16200000 },
        ],
      },
      {
        id: 'opt_cap_budget',
        label: '⚖️ Duyệt chi theo định mức tối đa 10.800.000 đ qua Ngân hàng (112) có HĐĐT',
        playerText:
          'Định mức tiếp khách B2B quý này tối đa 10.800.000 đ/sự kiện (10tr + VAT 800k). Em duyệt Ủy nhiệm chi 10.800.000 đ qua TK 112 kèm HĐĐT để đảm bảo kỷ luật ngân sách ạ.',
        npcReply:
          'Căng thế hả CFO! Thôi được rồi, anh cắt bớt hạng mục trang trí phụ để gói gọn đúng 10.800.000 đ theo quy chế tài chính công ty.',
        ethical: true,
        scoreDelta: 130,
        complianceDelta: 4,
        lines: [
          { side: 'N', account: '641', amount: 10000000 },
          { side: 'N', account: '1331', amount: 800000 },
          { side: 'C', account: '112', amount: 10800000 },
        ],
      },
      {
        id: 'opt_cash_no_invoice',
        label: '⚠️ Xuất Quỹ tiền mặt (111) trả ngoài không hóa đơn để bớt 500k (Sai luật thuế)',
        playerText:
          'Thôi cứ xuất tiền mặt 15.700.000 đ trả ngoài không cần lấy hóa đơn GTGT cho đỡ tốn 500k anh ạ.',
        npcReply:
          '🚨 CẢNH BÁO KIỂM SOÁT: Khoản chi tiền mặt trên 5 triệu không có HĐĐT bị loại toàn bộ khỏi chi phí hợp lệ khi quyết toán thuế và phát sinh biên bản phạt hành chính 8.000.000 đ (TK 811)!',
        ethical: false,
        scoreDelta: -100,
        complianceDelta: -15,
        lines: [
          { side: 'N', account: '642', amount: 15700000 },
          { side: 'N', account: '811', amount: 8000000 },
          { side: 'C', account: '111', amount: 23700000 },
        ],
      },
    ],
  },
  {
    templateId: 'evt_sale_receipt_notice',
    orderType: 'THÔNG BÁO THU TIỀN',
    npcId: 'n_sale',
    channel: '#kinh-doanh-thu-tien',
    title: 'Thông báo thu tiền đơn hàng mới & Tất toán công nợ từ Nội thất An Phú Giả',
    baseAmount: 74000000,
    messageTemplate: () =>
      `@cfo Tin vui lớn ạ! Khách hàng Công ty CP Nội thất An Phú Giả vừa nhắn muốn thanh toán ngay đơn hàng mới 54.000.000 đ (Doanh thu 50tr + VAT 4tr) VÀ trả luôn 20.000.000 đ nợ cũ (TK 131). Họ đề nghị nếu chuyển khoản trọn gói ngay hôm nay thì xin chiết khấu thanh toán sớm 1.000.000 đ. Mình chốt phương án nào ạ?`,
    choices: [
      {
        id: 'opt_approve_early_discount',
        label: '✅ Chấp thuận chiết khấu thanh toán 1tr (TK 635), thu ngay 73.000.000 đ vào Ngân hàng (112)',
        playerText:
          'Duyệt ngay Bé Na nhé! Chiết khấu thanh toán 1.000.000 đ hạch toán vào Chi phí tài chính (TK 635), đổi lại công ty thu về ngay 73.000.000 đ tiền tươi vào TK 112 và giải phóng 20tr nợ phải thu (TK 131). Xuất HĐĐT gửi khách luôn!',
        npcReply:
          'Tuyệt vời quá ạ! Khách vừa chuyển khoản 73.000.000 đ vào TK 112 công ty mình xong, báo Có ngân hàng đã nổi rồi ạ! 🎉',
        ethical: true,
        scoreDelta: 160,
        complianceDelta: 4,
        lines: [
          { side: 'N', account: '112', amount: 73000000 },
          { side: 'N', account: '635', amount: 1000000 },
          { side: 'C', account: '511', amount: 50000000 },
          { side: 'C', account: '3331', amount: 4000000 },
          { side: 'C', account: '131', amount: 20000000 },
        ],
      },
      {
        id: 'opt_standard_credit_terms',
        label: '📊 Giữ nguyên giá không chiết khấu: Thu 20tr nợ cũ về TK 112, đơn mới 54tr ghi công nợ 131',
        playerText:
          'Biên lợi nhuận đơn này đã sát, không chiết khấu thêm nhé Na. Yêu cầu khách chuyển khoản trả dứt điểm 20.000.000 đ nợ cũ vào TK 112 trước, còn đơn mới 54.000.000 đ cho trả chậm 15 ngày trên TK 131.',
        npcReply:
          'Dạ vâng! Khách đồng ý chuyển ngay 20.000.000 đ nợ cũ vào TK 112 và ký xác nhận công nợ đơn mới 54.000.000 đ rồi ạ.',
        ethical: true,
        scoreDelta: 140,
        complianceDelta: 3,
        lines: [
          { side: 'N', account: '112', amount: 20000000 },
          { side: 'N', account: '131', amount: 34000000 },
          { side: 'C', account: '511', amount: 50000000 },
          { side: 'C', account: '3331', amount: 4000000 },
        ],
      },
      {
        id: 'opt_offbook_collection',
        label: '⚠️ Bảo khách chuyển vào tài khoản cá nhân để trốn thuế GTGT 4.000.000 đ (Vi phạm pháp luật)',
        playerText:
          'Nhắn khách chuyển vào tài khoản cá nhân ngoài sổ sách để khỏi xuất hóa đơn GTGT 4 triệu nhé.',
        npcReply:
          '🚨 CẢNH BÁO PHÁP CHẾ: Khách hàng B2B từ chối giao dịch ngầm, hủy đơn hàng và cơ quan thuế truy thu kèm phạt hành chính hành vi để ngoài sổ sách 12.000.000 đ (TK 811)!',
        ethical: false,
        scoreDelta: -120,
        complianceDelta: -20,
        lines: [
          { side: 'N', account: '811', amount: 12000000 },
          { side: 'C', account: '112', amount: 12000000 },
        ],
      },
    ],
  },
  {
    templateId: 'evt_supplier_payment_order',
    orderType: 'LỆNH CHI MUA HÀNG',
    npcId: 'n_kho',
    channel: '#kho-van-mua-hang',
    title: 'Lệnh chi thanh toán lô hàng nhập kho từ Công ty TNHH Bảo Tín',
    baseAmount: 32400000,
    messageTemplate: () =>
      `@cfo Lô hàng nội thất của Công ty TNHH Bảo Tín vừa nhập kho đủ 32.400.000 đ (Giá mua 30tr + VAT 2,4tr). Bên nhà cung cấp nhắn nếu mình lập Ủy nhiệm chi thanh toán ngay toàn bộ 32.400.000 đ qua Ngân hàng thì họ chiết khấu thương mại / thưởng thanh toán ngay 2.000.000 đ (TK 515). Cháu quyết sao?`,
    choices: [
      {
        id: 'opt_pay_bank_rebate',
        label: '✅ Duyệt Ủy nhiệm chi Ngân hàng (112) thanh toán ngay để hưởng 2.000.000 đ chiết khấu (515)',
        playerText:
          'Chú Bền gửi biên bản kiểm nghiệm nhập kho và HĐĐT lên hệ thống nhé! Cháu duyệt chi Ngân hàng (TK 112) 30.400.000 đ, ghi tăng Hàng hóa (156) 30tr, VAT (1331) 2,4tr và Thu nhập tài chính (515) 2tr.',
        npcReply:
          'Chuẩn bài luôn cháu ơi! Kho vừa nhập xong, nhà cung cấp xác nhận đã nhận tiền và giảm trừ ngay 2.000.000 đ trên phiếu thanh toán!',
        ethical: true,
        scoreDelta: 155,
        complianceDelta: 4,
        lines: [
          { side: 'N', account: '156', amount: 30000000 },
          { side: 'N', account: '1331', amount: 2400000 },
          { side: 'C', account: '112', amount: 30400000 },
          { side: 'C', account: '515', amount: 2000000 },
        ],
      },
      {
        id: 'opt_defer_payable_331',
        label: '🏦 Nhập kho và ghi nhận Công nợ phải trả (TK 331: 32.400.000 đ) để giữ thanh khoản tiền gửi',
        playerText:
          'Mình ưu tiên giữ số dư Ngân hàng (112) cho kỳ lương và thuế sắp tới chú Bền ạ. Cháu hạch toán nhập kho Nợ 156: 30tr, Nợ 1331: 2,4tr / Có 331: 32,4tr theo hạn nợ 30 ngày.',
        npcReply:
          'Ok cháu, chú đã lưu phiếu nhập kho và báo bên Bảo Tín đối chiếu công nợ cuối tháng!',
        ethical: true,
        scoreDelta: 130,
        complianceDelta: 3,
        lines: [
          { side: 'N', account: '156', amount: 30000000 },
          { side: 'N', account: '1331', amount: 2400000 },
          { side: 'C', account: '331', amount: 32400000 },
        ],
      },
      {
        id: 'opt_fake_invoice_diff',
        label: '⚠️ Nhờ nhà cung cấp nâng khống giá trị hóa đơn lên gấp đôi để rút tiền công ty (Gian lận)',
        playerText:
          'Chú bảo họ ghi khống hóa đơn tăng thêm để mình rút tiền chênh lệch nhé.',
        npcReply:
          '🚨 CẢNH BÁO KIỂM TOÁN NỘI BỘ: Hệ thống đối chiếu 3 chiều (PO - Phiếu nhập kho - Hóa đơn) phát hiện chênh lệch bất thường, phong tỏa lệnh chi và phạt vi phạm kiểm soát nội bộ 10.000.000 đ!',
        ethical: false,
        scoreDelta: -140,
        complianceDelta: -20,
        lines: [
          { side: 'N', account: '811', amount: 10000000 },
          { side: 'C', account: '112', amount: 10000000 },
        ],
      },
    ],
  },
  {
    templateId: 'evt_cashier_retail_receipt',
    orderType: 'THÔNG BÁO THU QUỸ',
    npcId: 'n_thuquy',
    channel: '#lenh-thu-chi-quy',
    title: 'Thông báo thu tiền bán lẻ tại Showroom & Cân đối tồn quỹ cuối ngày',
    baseAmount: 27000000,
    messageTemplate: () =>
      `@cfo Hôm nay quầy Showroom thu được 27.000.000 đ tiền mặt từ các đơn khách lẻ (Doanh thu 25tr + VAT 2tr). Hiện két tiền mặt (TK 111) đang khá đầy, em đề xuất lập Phiếu thu ghi nhận doanh thu rồi mang nộp thẳng 27.000.000 đ này vào Ngân hàng (TK 112) ngay trong chiều nay nhé?`,
    choices: [
      {
        id: 'opt_collect_and_deposit_112',
        label: '✅ Xuất HĐĐT tổng hợp, ghi nhận Doanh thu và nộp thẳng 27.000.000 đ vào Ngân hàng (112)',
        playerText:
          'Nhất trí Anh Tâm! Xuất HĐĐT bán lẻ cuối ngày, ghi nhận Doanh thu (511: 25tr), Thuế GTGT (3331: 2tr) và nộp trực tiếp vào TK Ngân hàng (112: 27tr) để tối ưu an toàn quỹ.',
        npcReply:
          'Em đã nộp 27.000.000 đ vào Ngân hàng xong, giấy nộp tiền đã đính kèm vào Sổ cái rồi sếp nhé! 🏦',
        ethical: true,
        scoreDelta: 150,
        complianceDelta: 4,
        lines: [
          { side: 'N', account: '112', amount: 27000000 },
          { side: 'C', account: '511', amount: 25000000 },
          { side: 'C', account: '3331', amount: 2000000 },
        ],
      },
      {
        id: 'opt_keep_cash_111',
        label: '💵 Lập Phiếu thu giữ tại Quỹ Tiền mặt (TK 111: 27.000.000 đ) để dự phòng chi nội bộ',
        playerText:
          'Anh Tâm lập Phiếu thu nhập vào Quỹ Tiền mặt (TK 111: 27.000.000 đ), xuất HĐĐT bán lẻ đầy đủ và niêm phong két sắt cuối ngày nhé.',
        npcReply:
          'Dạ rõ! Em đã nhập quỹ TK 111 đủ 27.000.000 đ và chốt sổ quỹ tiền mặt hôm nay.',
        ethical: true,
        scoreDelta: 135,
        complianceDelta: 3,
        lines: [
          { side: 'N', account: '111', amount: 27000000 },
          { side: 'C', account: '511', amount: 25000000 },
          { side: 'C', account: '3331', amount: 2000000 },
        ],
      },
      {
        id: 'opt_lend_cash_overnight',
        label: '⚠️ Cho người quen mượn tạm 27tr tiền mặt qua đêm không lập chứng từ (Sai nguyên tắc)',
        playerText:
          'Anh cứ đưa khoản tiền mặt đó cho người quen mượn đỡ vài hôm không cần ghi sổ vội.',
        npcReply:
          '🚨 CẢNH BÁO KIỂM QUỸ: Kiểm quỹ đột xuất phát hiện thiếu hụt tồn quỹ tiền mặt 111 và chậm ghi nhận doanh thu, bị phạt chế tài kiểm soát 7.000.000 đ!',
        ethical: false,
        scoreDelta: -110,
        complianceDelta: -15,
        lines: [
          { side: 'N', account: '111', amount: 20000000 },
          { side: 'N', account: '811', amount: 7000000 },
          { side: 'C', account: '511', amount: 25000000 },
          { side: 'C', account: '3331', amount: 2000000 },
        ],
      },
    ],
  },
  {
    templateId: 'evt_cod_reconciliation',
    orderType: 'THÔNG BÁO THU & LỆNH CHI COD',
    npcId: 'n_shipper',
    channel: '#doi-soat-cod-opex',
    title: 'Đối soát thu hộ COD (37.800.000 đ) và cước vận chuyển (2.160.000 đ)',
    baseAmount: 37800000,
    messageTemplate: () =>
      `@cfo Em gửi bảng đối soát tuần từ hãng vận chuyển: Tổng tiền thu hộ COD của khách là 37.800.000 đ (Doanh thu 35tr + VAT 2,8tr), cước phí giao hàng là 2.160.000 đ (Chi phí 2tr + VAT 160k). Hãng hỏi mình hạch toán tách riêng đủ hóa đơn hai đầu hay chỉ ghi tắt số tiền chuyển ròng 35.640.000 đ ạ?`,
    choices: [
      {
        id: 'opt_gross_cod_accounting',
        label: '✅ Hạch toán đầy đủ Doanh thu (35tr + VAT 2,8tr), Chi phí (641: 2tr + VAT 160k), thu ròng 35.640.000 đ vào TK 112',
        playerText:
          'Theo chuẩn mực kế toán TT 99/2025 không được bù trừ ngang doanh thu và chi phí! Em lấy HĐĐT cước vận chuyển về để chị/anh hạch toán đủ cả Doanh thu 511 (35tr) lẫn Chi phí 641 (2tr) và nhận 35.640.000 đ vào TK 112 nhé.',
        npcReply:
          'Dạ quá chuẩn luôn! Em đã tải HĐĐT cước vận chuyển lên và tiền đối soát 35.640.000 đ đã về TK 112 công ty ạ! 📦',
        ethical: true,
        scoreDelta: 165,
        complianceDelta: 5,
        lines: [
          { side: 'N', account: '112', amount: 35640000 },
          { side: 'N', account: '641', amount: 2000000 },
          { side: 'N', account: '1331', amount: 160000 },
          { side: 'C', account: '511', amount: 35000000 },
          { side: 'C', account: '3331', amount: 2800000 },
        ],
      },
      {
        id: 'opt_full_cod_first',
        label: '💳 Yêu cầu chuyển nguyên 37.800.000 đ tiền thu hộ vào TK 112; cước phí 2.160.000 đ treo công nợ 331',
        playerText:
          'Yêu cầu hãng vận chuyển giải ngân nguyên 37.800.000 đ tiền thu hộ về TK 112 trước; phần cước 2.160.000 đ hạch toán vào công nợ phải trả (TK 331) và thanh toán cuối tháng khi đối chiếu xong HĐĐT.',
        npcReply:
          'Dạ hãng đồng ý chuyển đủ 37.800.000 đ về TK 112 và gửi bảng kê công nợ cước cuối tháng ạ!',
        ethical: true,
        scoreDelta: 145,
        complianceDelta: 4,
        lines: [
          { side: 'N', account: '112', amount: 37800000 },
          { side: 'N', account: '641', amount: 2000000 },
          { side: 'N', account: '1331', amount: 160000 },
          { side: 'C', account: '511', amount: 35000000 },
          { side: 'C', account: '3331', amount: 2800000 },
          { side: 'C', account: '331', amount: 2160000 },
        ],
      },
      {
        id: 'opt_illegal_netting',
        label: '⚠️ Tự ý cấn trừ ngầm không xuất đủ doanh thu để khai thiếu thuế GTGT đầu ra',
        playerText:
          'Cứ ghi tắt số thực nhận thôi, khai giảm doanh thu đi cho đỡ tốn thuế đầu ra.',
        npcReply:
          '🚨 CẢNH BÁO THUẾ: Đối chiếu dữ liệu cổng vận chuyển phát hiện khai thiếu doanh thu tính thuế GTGT, bị truy thu và phạt 9.000.000 đ (TK 811)!',
        ethical: false,
        scoreDelta: -115,
        complianceDelta: -15,
        lines: [
          { side: 'N', account: '112', amount: 26640000 },
          { side: 'N', account: '811', amount: 9000000 },
          { side: 'C', account: '511', amount: 33000000 },
          { side: 'C', account: '3331', amount: 2640000 },
        ],
      },
    ],
  },
  {
    templateId: 'evt_board_strategic_contract',
    orderType: 'THÔNG BÁO THU & ĐẦU TƯ',
    npcId: 'n_chutich',
    channel: '#hdqt-chien-luoc',
    title: 'Thông báo thu hợp đồng cung ứng độc quyền (43.200.000 đ) & Lệnh chi bảo mật dữ liệu',
    baseAmount: 43200000,
    messageTemplate: () =>
      `@cfo HĐQT vừa nhận đề nghị từ tập đoàn đối tác: Họ thanh toán ngay hợp đồng dịch vụ tư vấn & cung ứng 43.200.000 đ (Doanh thu 40tr + VAT 3,2tr) qua Ngân hàng, kèm điều kiện công ty mình chi 10.800.000 đ (Chi phí 10tr + VAT 800k) nâng cấp bản quyền bảo mật ERP. CFO cho ý kiến phê duyệt nhé!`,
    choices: [
      {
        id: 'opt_approve_both_contract',
        label: '✅ Phê duyệt cả hai: Thu 43.200.000 đ và Chi 10.800.000 đ qua Ngân hàng (Lãi ròng +30.000.000 đ)',
        playerText:
          'Thưa Chủ tịch, thương vụ này mang lại biên lợi nhuận ròng +30.000.000 đ (75%) và nâng cấp luôn hạ tầng ERP. Em phê duyệt thu 43.200.000 đ và chi 10.800.000 đ qua TK 112 đầy đủ chứng từ ngay ạ!',
        npcReply:
          'Quyết đoán lắm CFO! Đối tác đã giải ngân 43.200.000 đ vào TK 112 và hệ thống bảo mật cũng đã kích hoạt thành công. 🏛️',
        ethical: true,
        scoreDelta: 180,
        complianceDelta: 5,
        lines: [
          { side: 'N', account: '112', amount: 32400000 },
          { side: 'N', account: '642', amount: 10000000 },
          { side: 'N', account: '1331', amount: 800000 },
          { side: 'C', account: '511', amount: 40000000 },
          { side: 'C', account: '3331', amount: 3200000 },
        ],
      },
      {
        id: 'opt_cost_sharing_partner',
        label: '🤝 Đàm phán đối tác đồng tài trợ 50% phí bảo mật (Chỉ chi 5.400.000 đ)',
        playerText:
          'Em đề xuất đàm phán đối tác chia sẻ 50% chi phí tích hợp cổng bảo mật (công ty chỉ chi 5.400.000 đ gồm VAT), giúp Lợi nhuận ròng thương vụ đạt +35.000.000 đ!',
        npcReply:
          'Khéo đàm phán đấy! Đối tác đồng ý hỗ trợ một nửa chi phí tích hợp, lợi nhuận ròng của công ty tăng thêm 35.000.000 đ!',
        ethical: true,
        scoreDelta: 190,
        complianceDelta: 5,
        lines: [
          { side: 'N', account: '112', amount: 37800000 },
          { side: 'N', account: '642', amount: 5000000 },
          { side: 'N', account: '1331', amount: 400000 },
          { side: 'C', account: '511', amount: 40000000 },
          { side: 'C', account: '3331', amount: 3200000 },
        ],
      },
      {
        id: 'opt_pirated_software',
        label: '⚠️ Nhận tiền hợp đồng nhưng dùng phần mềm bẻ khóa không bản quyền (Vi phạm cam kết)',
        playerText:
          'Mình cứ thu 43,2 triệu rồi cài bản bẻ khóa miễn phí, khỏi chi 10,8 triệu mua bản quyền.',
        npcReply:
          '🚨 CẢNH BÁO PHÁP LÝ: Đối tác kiểm tra chứng chỉ bản quyền phát hiện vi phạm cam kết bảo mật, phạt vi phạm hợp đồng 15.000.000 đ (TK 811)!',
        ethical: false,
        scoreDelta: -150,
        complianceDelta: -20,
        lines: [
          { side: 'N', account: '811', amount: 15000000 },
          { side: 'C', account: '112', amount: 15000000 },
        ],
      },
    ],
  },
];

export const ADVISORY_CATALOG = [
  {
    id: 'adv_marketing_push',
    code: 'STRAT-01',
    category: 'TĂNG TRƯỞNG DOANH THU',
    title: 'Chiến dịch Kích cầu Bán hàng Thanh toán nhanh (QR / Bank)',
    summary: 'Tung gói ưu đãi cho đơn hàng thanh toán ngay qua ngân hàng nhằm thúc đẩy doanh thu và dòng tiền mặt.',
    costText: 'Chi phí bán hàng (641): 15.000.000 đ',
    impactText: 'Doanh thu (511) +65.000.000 đ · Giá vốn (632) 28.000.000 đ · Lợi nhuận ròng +22.000.000 đ',
    riskLevel: 'LOW',
    lines: [
      { side: 'N', account: '641', amount: 15000000 },
      { side: 'C', account: '112', amount: 15000000 },
      { side: 'N', account: '112', amount: 70200000 },
      { side: 'C', account: '511', amount: 65000000 },
      { side: 'C', account: '3331', amount: 5200000 },
      { side: 'N', account: '632', amount: 28000000 },
      { side: 'C', account: '156', amount: 28000000 },
    ],
  },
  {
    id: 'adv_b2b_credit',
    code: 'STRAT-02',
    category: 'CHÍNH SÁCH TÍN DỤNG B2B',
    title: 'Mở rộng Hạn mức Công nợ Đại lý Phân phối (TK 131)',
    summary: 'Cho phép đối tác B2B trả chậm 30 ngày để ký hợp đồng cung ứng lô lớn, tăng trưởng doanh thu vượt trội.',
    costText: 'Tăng khoản phải thu ngắn hạn (131): 51.840.000 đ',
    impactText: 'Doanh thu (511) +48.000.000 đ · Giá vốn (632) 26.000.000 đ · Lợi nhuận ròng +22.000.000 đ',
    riskLevel: 'MEDIUM',
    lines: [
      { side: 'N', account: '131', amount: 51840000 },
      { side: 'C', account: '511', amount: 48000000 },
      { side: 'C', account: '3331', amount: 3840000 },
      { side: 'N', account: '632', amount: 26000000 },
      { side: 'C', account: '156', amount: 26000000 },
    ],
  },
  {
    id: 'adv_supply_chain',
    code: 'STRAT-03',
    category: 'TỐI ƯU CHUỖI CUNG ỨNG',
    title: 'Tất toán Sớm Nhà cung cấp để Hưởng Chiết khấu & Giảm Giá vốn',
    summary: 'Sử dụng tiền gửi ngân hàng (112) thanh toán sớm công nợ (331), nhận khoản chiết khấu và tối ưu giá vốn.',
    costText: 'Chi tiền gửi NH (112): 40.000.000 đ để giảm nợ 331',
    impactText: 'Thu nhập tài chính / Giảm giá vốn +14.000.000 đ · Lợi nhuận ròng +14.000.000 đ',
    riskLevel: 'LOW',
    lines: [
      { side: 'N', account: '331', amount: 54000000 },
      { side: 'C', account: '112', amount: 40000000 },
      { side: 'C', account: '515', amount: 14000000 },
    ],
  },
  {
    id: 'adv_factoring_ar',
    code: 'STRAT-04',
    category: 'QUẢN TRỊ DÒNG TIỀN',
    title: 'Thu hồi Nhanh Công nợ Khách hàng (131 ➔ 112)',
    summary: 'Áp dụng chiết khấu thanh toán 2% để thu hồi ngay các khoản phải thu khách hàng về tài khoản ngân hàng.',
    costText: 'Chi phí tài chính chiết khấu (635): 900.000 đ',
    impactText: 'Tiền gửi NH (112) +44.100.000 đ · Giảm Phải thu (131) -45.000.000 đ',
    riskLevel: 'LOW',
    lines: [
      { side: 'N', account: '112', amount: 44100000 },
      { side: 'N', account: '635', amount: 900000 },
      { side: 'C', account: '131', amount: 45000000 },
    ],
  },
  {
    id: 'adv_cost_restructure',
    code: 'STRAT-05',
    category: 'CHUYỂN ĐỔI SỐ & KIỂM SOÁT',
    title: 'Triển khai Hệ thống Kiểm soát Hóa đơn Tự động & Tinh gọn OPEX',
    summary: 'Tự động hóa đối chiếu MST, chữ ký số và cắt giảm chi phí hành chính thừa, nâng cao hiệu suất toàn công ty.',
    costText: 'Đầu tư hệ thống (642): 12.000.000 đ',
    impactText: 'Doanh thu vận hành +30.000.000 đ · Lợi nhuận ròng +18.000.000 đ · Giảm rủi ro sai sót',
    riskLevel: 'LOW',
    lines: [
      { side: 'N', account: '642', amount: 12000000 },
      { side: 'C', account: '112', amount: 12000000 },
      { side: 'N', account: '112', amount: 30000000 },
      { side: 'C', account: '511', amount: 30000000 },
    ],
  },
  {
    id: 'adv_equity_issue',
    code: 'STRAT-06',
    category: 'CẤU TRÚC VỐN & M&A',
    title: 'Huy động Vốn Cổ phần Chiến lược & Mở rộng Thị phần',
    summary: 'Phát hành cổ phần bổ sung cho đối tác chiến lược để gia tăng năng lực tài chính và mở rộng hợp đồng lớn.',
    costText: 'Pha loãng nhẹ tỷ lệ sở hữu, tăng Vốn chủ sở hữu (411)',
    impactText: 'Tiền gửi NH (112) +185.000.000 đ · Vốn CSH +150.000.000 đ · Lợi nhuận ròng +35.000.000 đ',
    riskLevel: 'MEDIUM',
    lines: [
      { side: 'N', account: '112', amount: 185000000 },
      { side: 'C', account: '411', amount: 150000000 },
      { side: 'C', account: '511', amount: 35000000 },
    ],
  },
];

export const DEFAULT_OPENING = {
  '111': 80000000,
  '112': 450000000,
  '131': 60000000,
  '156': 210000000,
  '211': 300000000,
  '214': -90000000,
  '331': -110000000,
  '411': -800000000,
  '421': -100000000,
};

export const CASH_REBALANCE_ACTIONS = [
  {
    id: 'DEPOSIT_BANK',
    code: 'TREAS-01',
    title: 'Nộp Tiền mặt tồn quỹ vào Tài khoản Ngân hàng',
    summary: 'Giảm rủi ro tồn quỹ tiền mặt (111) vượt định mức, tập trung nguồn tiền về Ngân hàng (112) để sẵn sàng thanh toán điện tử.',
    debitAcc: '112',
    creditAcc: '111',
  },
  {
    id: 'WITHDRAW_CASH',
    code: 'TREAS-02',
    title: 'Rút Tiền gửi Ngân hàng bổ sung Quỹ Tiền mặt',
    summary: 'Đảm bảo quỹ tiền mặt tại két (111) luôn đủ định mức tối thiểu phục vụ chi phí vận hành trực tiếp hàng ngày.',
    debitAcc: '111',
    creditAcc: '112',
  },
  {
    id: 'COLLECT_RECEIVABLES',
    code: 'TREAS-03',
    title: 'Đôn đốc Thu hồi Công nợ Phải thu Khách hàng về Ngân hàng',
    summary: 'Chuyển hoá khoản phải thu ngắn hạn (131) thành nguồn tiền gửi ngân hàng thực tế (112), cải thiện dòng tiền hoạt động.',
    debitAcc: '112',
    creditAcc: '131',
  },
  {
    id: 'SETTLE_PAYABLES',
    code: 'TREAS-04',
    title: 'Chi Tiền gửi Ngân hàng Tất toán Công nợ Nhà cung cấp',
    summary: 'Dùng nguồn tiền gửi ngân hàng (112) trả nợ người bán (331), nâng cao hệ số thanh toán hiện hành và uy tín tín dụng.',
    debitAcc: '331',
    creditAcc: '112',
  },
  {
    id: 'PAY_TAX',
    code: 'TREAS-05',
    title: 'Nộp Thuế GTGT / Nghĩa vụ Ngân sách Nhà nước',
    summary: 'Trích tiền gửi ngân hàng (112) nộp các khoản thuế phải nộp (3331), đảm bảo tuân thủ pháp luật thuế.',
    debitAcc: '3331',
    creditAcc: '112',
  },
  {
    id: 'DRAW_CREDIT_LINE',
    code: 'TREAS-06',
    title: 'Giải ngân Hạn mức Tín dụng Vay Ngắn hạn Ngân hàng',
    summary: 'Huy động thêm nguồn vốn vay ngắn hạn (341) chuyển thẳng vào tiền gửi ngân hàng (112) để tài trợ vốn lưu động.',
    debitAcc: '112',
    creditAcc: '341',
  },
  {
    id: 'REPAY_LOAN',
    code: 'TREAS-07',
    title: 'Tất toán Gốc Vay và Nợ thuê Tài chính Ngắn hạn',
    summary: 'Sử dụng nguồn tiền gửi ngân hàng thặng dư (112) trả bớt nợ vay (341), giảm đòn bẩy nợ và chi phí lãi vay.',
    debitAcc: '341',
    creditAcc: '112',
  },
];

/**
 * Khởi tạo trạng thái tài chính doanh nghiệp thế giới mở.
 */
export function createFinanceState(content = {}, { level = 1, modeId = 'normal', seed = 'nocooi-init' } = {}) {
  let rawOpening = content?.opening?.balances ?? DEFAULT_OPENING;
  if (level >= 10 && content?.openingProfiles?.jsc_group?.balances) {
    rawOpening = content.openingProfiles.jsc_group.balances;
  }

  const openingBalances = { ...rawOpening };
  const balances = { ...rawOpening };

  const baseRevenue = 120000000;
  const baseCogs = 62000000;
  const baseOpex = 23000000;

  const state = {
    level,
    modeId,
    openingBalances,
    balances,
    turnovers: {},
    baseRevenue,
    baseCogs,
    baseOpex,
    postedRevenue: 0,
    postedCogs: 0,
    postedOpex: 0,
    complianceScore: 100,
    enactedAdvisories: [],
    journal: [],
    reconciliations: [],
    slackEvents: [],
    eventCounter: 0,
    sectors: [
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
        totalRevenueGenerated: baseRevenue,
        totalProfitGenerated: baseRevenue - baseCogs - baseOpex,
        description: 'Mảng kinh doanh tiêu dùng & nội thất cốt lõi, tạo dòng tiền đều đặn.',
      },
    ],
    telemetry: [
      { label: 'Kỳ T-3', revenue: 85000000, profit: 18000000, liquidity: 460000000 },
      { label: 'Kỳ T-2', revenue: 98000000, profit: 24000000, liquidity: 495000000 },
      { label: 'Kỳ T-1', revenue: 110000000, profit: 29000000, liquidity: 515000000 },
      {
        label: 'Đầu kỳ',
        revenue: baseRevenue,
        profit: baseRevenue - baseCogs - baseOpex,
        liquidity: (balances['111'] ?? 0) + (balances['112'] ?? 0),
      },
    ],
  };

  // Khởi tạo sẵn 3 sự kiện Slack ngẫu nhiên đầu tiên bằng PRNG có seed
  spawnRandomSlackEvent(state, `${seed}-ev1`);
  spawnRandomSlackEvent(state, `${seed}-ev2`);
  spawnRandomSlackEvent(state, `${seed}-ev3`);

  return state;
}

/**
 * Sinh một Sự kiện Ngẫu nhiên (Lệnh chi hoặc Thông báo thu) gửi đến người chơi dạng tin nhắn Slack.
 * Sử dụng PRNG có seed (`createRng`) theo đúng ADR-005.
 */
export function spawnRandomSlackEvent(state, seedStr = 'nocooi-slack') {
  if (!Array.isArray(state.slackEvents)) state.slackEvents = [];
  state.eventCounter = (Number(state.eventCounter) || 0) + 1;

  const rng = createRng(`${seedStr}#${state.eventCounter}`);

  // Ưu tiên chọn mẫu sự kiện chưa đang chờ (PENDING) để đa dạng tình huống
  const pendingTemplates = new Set(
    state.slackEvents.filter((e) => e.status === 'PENDING').map((e) => e.templateId)
  );
  const available = NPC_SLACK_EVENTS.filter((t) => !pendingTemplates.has(t.templateId));
  const pool = available.length > 0 ? available : NPC_SLACK_EVENTS;
  const tpl = rng.pick(pool);

  const npc = NPC_DIRECTORY[tpl.npcId] || NPC_DIRECTORY.n_mentor;
  const hh = String(rng.int(8, 17)).padStart(2, '0');
  const mm = String(rng.int(0, 59)).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;
  const amtStr = `${tpl.baseAmount.toLocaleString('vi-VN')} đ`;

  const eventItem = {
    id: `SLK-${String(state.eventCounter).padStart(3, '0')}`,
    templateId: tpl.templateId,
    orderType: tpl.orderType,
    title: tpl.title,
    channel: tpl.channel || npc.channel,
    npc: { ...npc },
    timeStr,
    amountText: amtStr,
    status: 'PENDING', // PENDING | RESOLVED | FLAGGED
    selectedChoiceId: null,
    messages: [
      {
        sender: 'npc',
        authorName: npc.name,
        authorRole: npc.role,
        avatar: npc.avatar,
        time: timeStr,
        text: tpl.messageTemplate(amtStr),
      },
    ],
    choices: tpl.choices.map((c) => ({
      id: c.id,
      label: c.label,
      ethical: c.ethical,
      scoreDelta: c.scoreDelta,
    })),
  };

  state.slackEvents.unshift(eventItem);
  if (state.slackEvents.length > 20) {
    state.slackEvents = state.slackEvents.slice(0, 20);
  }
  return eventItem;
}

/**
 * Xử lý khi người chơi chọn một cách trả lời NPC trong Bảng Tin nhắn Slack.
 */
export function replyToNpcEvent(state, eventId, choiceId) {
  if (!Array.isArray(state.slackEvents)) state.slackEvents = [];
  const ev = state.slackEvents.find((e) => e.id === eventId);
  if (!ev) {
    return { ok: false, message: `Không tìm thấy tin nhắn sự kiện: ${eventId}` };
  }
  if (ev.status !== 'PENDING') {
    return { ok: false, message: 'Sự kiện tin nhắn này đã được bạn phản hồi và xử lý.' };
  }

  const tpl = NPC_SLACK_EVENTS.find((t) => t.templateId === ev.templateId);
  const choice = tpl?.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return { ok: false, message: `Phương án trả lời không hợp lệ: ${choiceId}` };
  }

  ev.selectedChoiceId = choiceId;
  ev.status = choice.ethical ? 'RESOLVED' : 'FLAGGED';

  // Thêm tin nhắn trả lời của người chơi (CFO)
  ev.messages.push({
    sender: 'player',
    authorName: 'Bạn (CFO / Kế toán trưởng)',
    authorRole: 'Ban Giám đốc Tài chính',
    avatar: '🛡️',
    time: 'Vừa xong',
    text: choice.playerText,
  });

  // Thêm tin nhắn phản hồi lại của NPC
  ev.messages.push({
    sender: 'npc',
    authorName: ev.npc.name,
    authorRole: ev.npc.role,
    avatar: ev.npc.avatar,
    time: 'Vừa xong',
    text: choice.npcReply,
    isWarning: !choice.ethical,
  });

  state.complianceScore = Math.max(
    0,
    Math.min(100, (state.complianceScore ?? 100) + (choice.complianceDelta || 0))
  );

  const ledgerRes = recordLedgerLines(state, {
    title: `[SLACK ${ev.id} · ${ev.npc.name}] ${ev.title}`,
    source: 'SLACK-EVENT',
    lines: choice.lines,
  });

  return {
    ok: true,
    ethical: choice.ethical,
    scoreDelta: choice.scoreDelta,
    npcReply: choice.npcReply,
    event: ev,
    ...ledgerRes,
  };
}

/**
 * Phản hồi nhanh cho NPC gửi chứng từ (Lệnh chi / Thông báo thu) ngay trên luồng Slack của chứng từ.
 */
export function replyToVoucherSlack(doc, replyId) {
  if (!doc || !doc.push) return null;
  if (!Array.isArray(doc.push.chatHistory)) {
    doc.push.chatHistory = [];
  }
  const replySpec = (doc.push.quickReplies || []).find((r) => r.id === replyId);
  if (!replySpec) return null;

  if (doc.push.repliedIds?.includes(replyId)) {
    return { alreadyReplied: true };
  }
  if (!Array.isArray(doc.push.repliedIds)) {
    doc.push.repliedIds = [];
  }
  doc.push.repliedIds.push(replyId);

  doc.push.chatHistory.push({
    sender: 'player',
    author: 'Bạn (CFO)',
    avatar: '🛡️',
    text: replySpec.playerText,
    time: 'Vừa xong',
  });
  doc.push.chatHistory.push({
    sender: 'npc',
    author: doc.push.npcName,
    avatar: doc.push.icon,
    text: replySpec.npcResponse,
    time: 'Vừa xong',
  });

  return {
    alreadyReplied: false,
    replySpec,
  };
}

/**
 * Tính toán các chỉ số tài chính (KPIs) thời gian thực của doanh nghiệp.
 */
export function computeMetrics(state) {
  const b = state.balances;
  const cash = b['111'] ?? 0;
  const bank = b['112'] ?? 0;
  const liquidity = cash + bank;
  const receivables = b['131'] ?? 0;
  const inventory = (b['152'] ?? 0) + (b['153'] ?? 0) + (b['156'] ?? 0) + (b['157'] ?? 0);
  const payables = -(b['331'] ?? 0);

  const revenue = state.baseRevenue + state.postedRevenue;
  const cogs = state.baseCogs + state.postedCogs;
  const opex = state.baseOpex + state.postedOpex;
  const grossProfit = revenue - cogs;
  const netProfit = revenue - cogs - opex;
  const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0;

  const baseEquity =
    -(b['411'] ?? 0) -
    (b['4111'] ?? 0) -
    (b['4112'] ?? 0) -
    (b['414'] ?? 0) -
    (b['419'] ?? 0) -
    (b['421'] ?? 0);

  const unclosedProfit = computeUnclosedPeriodProfit(b);
  const equity = baseEquity + unclosedProfit;
  const valuation = equity + Math.max(0, netProfit * 5);

  return {
    cash,
    bank,
    liquidity,
    receivables,
    inventory,
    payables,
    revenue,
    cogs,
    opex,
    grossProfit,
    netProfit,
    profitMargin,
    equity,
    valuation,
    complianceScore: state.complianceScore,
  };
}

function computeUnclosedPeriodProfit(balances) {
  let sum5to9 = 0;
  for (const [code, val] of Object.entries(balances)) {
    const first = code.charAt(0);
    if (['5', '6', '7', '8', '9'].includes(first)) {
      sum5to9 += Number(val) || 0;
    }
  }
  const res = -sum5to9;
  return res === 0 ? 0 : res;
}

/**
 * Ghi nhận một bút toán vào Sổ cái.
 */
export function recordLedgerLines(state, { title, source = 'VOUCHER', lines }) {
  if (!state.turnovers) state.turnovers = {};
  if (!state.openingBalances) state.openingBalances = { ...DEFAULT_OPENING };

  let revDelta = 0;
  let cogsDelta = 0;
  let opexDelta = 0;

  for (const line of lines) {
    const amt = Number(line.amount) || 0;
    if (amt <= 0) continue;
    const sign = line.side === 'N' ? 1 : -1;
    state.balances[line.account] = (state.balances[line.account] ?? 0) + sign * amt;

    if (!state.turnovers[line.account]) {
      state.turnovers[line.account] = { debit: 0, credit: 0 };
    }
    if (line.side === 'N') {
      state.turnovers[line.account].debit += amt;
    } else {
      state.turnovers[line.account].credit += amt;
    }

    if (source !== 'CLOSING') {
      if (line.account === '511' || line.account === '515' || line.account === '711') {
        revDelta += line.side === 'C' ? amt : -amt;
      } else if (line.account === '632') {
        cogsDelta += line.side === 'N' ? amt : -amt;
      } else if (['641', '642', '635', '811', '821'].includes(line.account)) {
        opexDelta += line.side === 'N' ? amt : -amt;
      }
    }
  }

  state.postedRevenue += revDelta;
  state.postedCogs += cogsDelta;
  state.postedOpex += opexDelta;

  const metrics = computeMetrics(state);
  const entryRecord = {
    id: `JRN-${String(state.journal.length + 1).padStart(3, '0')}`,
    source,
    title,
    lines: lines.map((l) => ({ ...l })),
    revDelta,
    profitDelta: revDelta - cogsDelta - opexDelta,
    snapshotRevenue: metrics.revenue,
    snapshotProfit: metrics.netProfit,
  };

  state.journal.unshift(entryRecord);

  state.telemetry.push({
    label: `#${state.journal.length}`,
    revenue: metrics.revenue,
    profit: metrics.netProfit,
    liquidity: metrics.liquidity,
  });
  if (state.telemetry.length > 10) {
    state.telemetry.shift();
  }

  return { entry: entryRecord, metrics };
}

/**
 * Thực thi một quyết định tư vấn chiến lược thế giới mở.
 */
export function executeAdvisory(state, advisoryId) {
  const adv = ADVISORY_CATALOG.find((a) => a.id === advisoryId);
  if (!adv) throw new Error(`Không tìm thấy đề xuất tư vấn: ${advisoryId}`);
  if (state.enactedAdvisories.includes(advisoryId)) {
    return { alreadyEnacted: true, metrics: computeMetrics(state) };
  }

  state.enactedAdvisories.push(advisoryId);
  state.complianceScore = Math.min(100, state.complianceScore + 4);

  const result = recordLedgerLines(state, {
    title: `[TƯ VẤN CFO] ${adv.title}`,
    source: 'ADVISORY',
    lines: adv.lines,
  });

  return {
    alreadyEnacted: false,
    advisory: adv,
    ...result,
  };
}

/**
 * Phân tích Cấu trúc & Cân đối Nguồn tiền của Doanh nghiệp.
 */
export function analyzeCashSources(state) {
  const b = state.balances;
  const cash111 = b['111'] ?? 0;
  const bank112 = b['112'] ?? 0;
  const totalCash = cash111 + bank112;

  const receivables131 = Math.max(0, b['131'] ?? 0);
  const vatDeductible133 = Math.max(0, (b['133'] ?? 0) + (b['1331'] ?? 0));
  const advances141 = Math.max(0, b['141'] ?? 0);
  const inventory15x = Math.max(
    0,
    (b['152'] ?? 0) + (b['153'] ?? 0) + (b['156'] ?? 0) + (b['157'] ?? 0)
  );

  const payables331 = Math.max(0, -(b['331'] ?? 0));
  const taxPayable333 = Math.max(
    0,
    -((b['333'] ?? 0) + (b['3331'] ?? 0) + (b['3334'] ?? 0) + (b['3335'] ?? 0))
  );
  const otherPayables33x = Math.max(
    0,
    -((b['334'] ?? 0) + (b['338'] ?? 0) + (b['3383'] ?? 0) + (b['3388'] ?? 0))
  );
  const shortTermDebt341 = Math.max(0, -((b['341'] ?? 0) + (b['343'] ?? 0)));

  const totalCurrentAssets =
    totalCash + receivables131 + vatDeductible133 + advances141 + inventory15x;
  const totalCurrentLiabilities =
    payables331 + taxPayable333 + otherPayables33x + shortTermDebt341;
  const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;

  const cashRatioPct = totalCash > 0 ? Math.round((cash111 / totalCash) * 1000) / 10 : 0;
  const bankRatioPct = totalCash > 0 ? Math.round((bank112 / totalCash) * 1000) / 10 : 0;

  const currentRatio =
    totalCurrentLiabilities > 0
      ? Math.round((totalCurrentAssets / totalCurrentLiabilities) * 100) / 100
      : 9.99;
  const quickRatio =
    totalCurrentLiabilities > 0
      ? Math.round(((totalCash + receivables131) / totalCurrentLiabilities) * 100) / 100
      : 9.99;
  const cashCoverageRatio =
    totalCurrentLiabilities > 0
      ? Math.round((totalCash / totalCurrentLiabilities) * 100) / 100
      : 9.99;

  const rawTarget111 = Math.max(30000000, Math.round((totalCash * 0.15) / 1000000) * 1000000);
  const targetCash111 = Math.min(totalCash, rawTarget111);
  const cashVariance111 = cash111 - targetCash111;

  const recommendations = [];
  if (cashVariance111 > 10000000) {
    recommendations.push({
      action: 'DEPOSIT_BANK',
      amount: cashVariance111,
      reason: `Tồn quỹ tiền mặt (111) đang dư ${cashVariance111.toLocaleString('vi-VN')} đ so với định mức tối ưu (15%). Nên nộp vào Ngân hàng (112).`,
    });
  } else if (cashVariance111 < -10000000 && bank112 >= Math.abs(cashVariance111)) {
    recommendations.push({
      action: 'WITHDRAW_CASH',
      amount: Math.abs(cashVariance111),
      reason: `Quỹ tiền mặt (111) thấp hơn định mức an toàn. Nên rút ${Math.abs(cashVariance111).toLocaleString('vi-VN')} đ từ Ngân hàng (112) bổ sung quỹ.`,
    });
  }
  if (receivables131 >= 20000000) {
    const collectAmt = Math.round((receivables131 * 0.5) / 1000000) * 1000000 || receivables131;
    recommendations.push({
      action: 'COLLECT_RECEIVABLES',
      amount: collectAmt,
      reason: `Khoản phải thu khách hàng (131) đang ở mức ${receivables131.toLocaleString('vi-VN')} đ. Có thể đôn đốc thu hồi ngay ${collectAmt.toLocaleString('vi-VN')} đ về Ngân hàng.`,
    });
  }
  if (payables331 >= 30000000 && bank112 > payables331 + 100000000) {
    const payAmt = Math.round((payables331 * 0.5) / 1000000) * 1000000 || payables331;
    recommendations.push({
      action: 'SETTLE_PAYABLES',
      amount: payAmt,
      reason: `Số dư Ngân hàng dồi dào, nên tất toán bớt ${payAmt.toLocaleString('vi-VN')} đ công nợ Nhà cung cấp (331) để giảm nợ ngắn hạn.`,
    });
  }

  return {
    cash111,
    bank112,
    totalCash,
    cashRatioPct,
    bankRatioPct,
    receivables131,
    vatDeductible133,
    inventory15x,
    payables331,
    taxPayable333,
    shortTermDebt341,
    totalCurrentAssets,
    totalCurrentLiabilities,
    netWorkingCapital,
    currentRatio,
    quickRatio,
    cashCoverageRatio,
    targetCash111,
    cashVariance111,
    recommendations,
  };
}

/**
 * Thực thi nghiệp vụ Điều chuyển & Cân đối Nguồn tiền.
 */
export function executeCashRebalance(state, { action, amount }) {
  if (action === 'AUTO_OPTIMIZE') {
    const analysis = analyzeCashSources(state);
    const lines = [];
    if (analysis.cashVariance111 > 5000000) {
      lines.push(
        { side: 'N', account: '112', amount: analysis.cashVariance111 },
        { side: 'C', account: '111', amount: analysis.cashVariance111 }
      );
    } else if (
      analysis.cashVariance111 < -5000000 &&
      analysis.bank112 >= Math.abs(analysis.cashVariance111)
    ) {
      const wAmt = Math.abs(analysis.cashVariance111);
      lines.push(
        { side: 'N', account: '111', amount: wAmt },
        { side: 'C', account: '112', amount: wAmt }
      );
    }
    if (analysis.receivables131 >= 20000000) {
      const colAmt = Math.round((analysis.receivables131 * 0.5) / 1000000) * 1000000;
      if (colAmt > 0) {
        lines.push(
          { side: 'N', account: '112', amount: colAmt },
          { side: 'C', account: '131', amount: colAmt }
        );
      }
    }
    if (lines.length === 0) {
      return {
        ok: false,
        message: 'Cấu trúc nguồn tiền mặt (111) và ngân hàng (112) đã ở trạng thái cân đối tối ưu!',
      };
    }
    const res = recordLedgerLines(state, {
      title: '[CÂN ĐỐI NGUỒN TIỀN] Tự động Tối ưu Ngân quỹ & Công nợ',
      source: 'TREASURY',
      lines,
    });
    return {
      ok: true,
      message: 'Đã tự động cân đối tỷ trọng Quỹ tiền mặt (111) / Ngân hàng (112) và thu hồi công nợ!',
      ...res,
    };
  }

  const spec = CASH_REBALANCE_ACTIONS.find((a) => a.id === action);
  if (!spec) {
    return { ok: false, message: `Lệnh cân đối nguồn tiền không hợp lệ: ${action}` };
  }

  const amt = Math.round(Number(amount) || 0);
  if (!Number.isSafeInteger(amt) || amt <= 0) {
    return { ok: false, message: 'Số tiền điều chuyển phải là số nguyên VND lớn hơn 0.' };
  }

  const b = state.balances;
  if (action === 'DEPOSIT_BANK' && amt > (b['111'] ?? 0)) {
    return { ok: false, message: 'Số tiền nộp vượt quá số dư Tiền mặt (TK 111) hiện có!' };
  }
  if (
    ['WITHDRAW_CASH', 'SETTLE_PAYABLES', 'PAY_TAX', 'REPAY_LOAN'].includes(action) &&
    amt > (b['112'] ?? 0)
  ) {
    return { ok: false, message: 'Số tiền chi vượt quá số dư Tiền gửi Ngân hàng (TK 112) hiện có!' };
  }
  if (action === 'COLLECT_RECEIVABLES' && amt > Math.max(0, b['131'] ?? 0)) {
    return { ok: false, message: 'Số tiền thu hồi vượt quá số dư Phải thu khách hàng (TK 131)!' };
  }
  if (action === 'SETTLE_PAYABLES' && amt > Math.max(0, -(b['331'] ?? 0))) {
    return { ok: false, message: 'Số tiền thanh toán vượt quá số dư Nợ phải trả người bán (TK 331)!' };
  }
  if (action === 'PAY_TAX' && amt > Math.max(0, -((b['3331'] ?? 0) + (b['333'] ?? 0)))) {
    return { ok: false, message: 'Số tiền nộp thuế vượt quá nghĩa vụ thuế phải nộp (TK 3331) hiện tại!' };
  }
  if (action === 'REPAY_LOAN' && amt > Math.max(0, -(b['341'] ?? 0))) {
    return { ok: false, message: 'Số tiền trả nợ vay vượt quá dư nợ vay ngắn hạn (TK 341) hiện tại!' };
  }

  const lines = [
    { side: 'N', account: spec.debitAcc, amount: amt },
    { side: 'C', account: spec.creditAcc, amount: amt },
  ];

  const res = recordLedgerLines(state, {
    title: `[NGÂN QUỸ ${spec.code}] ${spec.title}`,
    source: 'TREASURY',
    lines,
  });

  return {
    ok: true,
    actionSpec: spec,
    message: `Đã thực hiện ${spec.title} với số tiền ${amt.toLocaleString('vi-VN')} đ.`,
    ...res,
  };
}

/**
 * Lập Bảng Cân đối Tài khoản Tổng (Master Trial Balance) & Bảng Cân đối Kế toán.
 */
export function computeMasterAccountBalance(state, accountDefs = []) {
  const openingMap = state.openingBalances ?? DEFAULT_OPENING;
  const currentMap = state.balances ?? {};
  const turnoverMap = state.turnovers ?? {};

  const defMap = new Map(accountDefs.map((a) => [a.code, a]));
  const allCodes = new Set([
    ...Object.keys(openingMap),
    ...Object.keys(currentMap),
    ...Object.keys(turnoverMap),
    ...accountDefs.map((a) => a.code),
  ]);

  const sortedCodes = [...allCodes].sort((a, b) => a.localeCompare(b, 'en'));

  const rows = [];
  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquityAccounts = 0;

  for (const code of sortedCodes) {
    const openVal = Number(openingMap[code]) || 0;
    const periodDebit = Number(turnoverMap[code]?.debit) || 0;
    const periodCredit = Number(turnoverMap[code]?.credit) || 0;
    const closeVal = Number(currentMap[code]) || 0;

    if (openVal === 0 && periodDebit === 0 && periodCredit === 0 && closeVal === 0) {
      continue;
    }

    const def = defMap.get(code) || {
      code,
      name: `Tài khoản ${code}`,
      type: inferAccountType(code),
    };

    const openingDebit = openVal > 0 ? openVal : 0;
    const openingCredit = openVal < 0 ? -openVal : 0;
    const closingDebit = closeVal > 0 ? closeVal : 0;
    const closingCredit = closeVal < 0 ? -closeVal : 0;

    totalOpeningDebit += openingDebit;
    totalOpeningCredit += openingCredit;
    totalPeriodDebit += periodDebit;
    totalPeriodCredit += periodCredit;
    totalClosingDebit += closingDebit;
    totalClosingCredit += closingCredit;

    const firstChar = code.charAt(0);
    if (firstChar === '1' || firstChar === '2') {
      totalAssets += closeVal;
    } else if (firstChar === '3') {
      totalLiabilities += -closeVal;
    } else if (firstChar === '4') {
      totalEquityAccounts += -closeVal;
    }

    rows.push({
      code,
      name: def.name,
      type: def.type,
      classCode: firstChar,
      openingDebit,
      openingCredit,
      periodDebit,
      periodCredit,
      closingDebit,
      closingCredit,
      netClosing: closeVal,
    });
  }

  const unclosedProfit = computeUnclosedPeriodProfit(currentMap);
  const totalEquity = totalEquityAccounts + unclosedProfit;
  const totalResources = totalLiabilities + totalEquity;
  const fundamentalDiff = totalAssets - totalResources;

  const isTrialBalanced =
    totalOpeningDebit === totalOpeningCredit &&
    totalPeriodDebit === totalPeriodCredit &&
    totalClosingDebit === totalClosingCredit &&
    fundamentalDiff === 0;

  return {
    rows,
    totals: {
      totalOpeningDebit,
      totalOpeningCredit,
      totalPeriodDebit,
      totalPeriodCredit,
      totalClosingDebit,
      totalClosingCredit,
      isTrialBalanced,
    },
    balanceSheet: {
      totalAssets,
      totalLiabilities,
      totalEquityAccounts,
      unclosedProfit,
      totalEquity,
      totalResources,
      fundamentalDiff,
    },
  };
}

function inferAccountType(code) {
  const c = String(code).charAt(0);
  if (c === '1' || c === '2') return 'asset';
  if (c === '3') return 'liability';
  if (c === '4') return 'equity';
  if (c === '5' || c === '7') return 'revenue';
  if (c === '6' || c === '8') return 'expense';
  return 'closing';
}

/**
 * Thực hiện Bút toán Kết chuyển Tài khoản Tổng cuối kỳ (TK Loại 5, 6, 7, 8 ➔ TK 911 ➔ TK 421).
 */
export function executeClosingEntries(state) {
  const b = state.balances;
  const lines = [];

  let totalRevTransfer = 0;
  for (const [code, val] of Object.entries(b)) {
    const first = code.charAt(0);
    if ((first === '5' || first === '7') && val < 0) {
      const amt = -val;
      lines.push({ side: 'N', account: code, amount: amt });
      totalRevTransfer += amt;
    }
  }
  if (totalRevTransfer > 0) {
    lines.push({ side: 'C', account: '911', amount: totalRevTransfer });
  }

  let totalExpTransfer = 0;
  for (const [code, val] of Object.entries(b)) {
    const first = code.charAt(0);
    if ((first === '6' || first === '8') && val > 0) {
      const amt = val;
      lines.push({ side: 'C', account: code, amount: amt });
      totalExpTransfer += amt;
    }
  }
  if (totalExpTransfer > 0) {
    lines.push({ side: 'N', account: '911', amount: totalExpTransfer });
  }

  const netTransfer = totalRevTransfer - totalExpTransfer;
  if (netTransfer > 0) {
    lines.push(
      { side: 'N', account: '911', amount: netTransfer },
      { side: 'C', account: '421', amount: netTransfer }
    );
  } else if (netTransfer < 0) {
    const loss = -netTransfer;
    lines.push(
      { side: 'N', account: '421', amount: loss },
      { side: 'C', account: '911', amount: loss }
    );
  }

  if (lines.length === 0) {
    return {
      ok: false,
      message: 'Tất cả tài khoản Doanh thu (Loại 5, 7) và Chi phí (Loại 6, 8) đã được kết chuyển hết về TK 421!',
    };
  }

  const res = recordLedgerLines(state, {
    title: `[KHOÁ SỔ TÀI KHOẢN TỔNG] Kết chuyển Doanh thu & Chi phí (911 ➔ 421)`,
    source: 'CLOSING',
    lines,
  });

  if (!state.reconciliations) state.reconciliations = [];
  state.reconciliations.unshift({
    id: `CLS-${String(state.reconciliations.length + 1).padStart(2, '0')}`,
    revTransferred: totalRevTransfer,
    expTransferred: totalExpTransfer,
    netTransferredTo421: netTransfer,
  });

  return {
    ok: true,
    revTransferred: totalRevTransfer,
    expTransferred: totalExpTransfer,
    netTransferredTo421: netTransfer,
    message: `Đã kết chuyển Doanh thu (${totalRevTransfer.toLocaleString('vi-VN')} đ) và Chi phí (${totalExpTransfer.toLocaleString('vi-VN')} đ) qua TK 911 vào TK 421!`,
    ...res,
  };
}

/**
 * Chuyển đổi chứng từ kế toán (Lệnh chi / Thông báo thu) thành Tin nhắn Slack từ NPC kèm các lựa chọn phản hồi nhanh.
 */
export function decoratePushVoucher(doc, index = 0) {
  const totalField = doc.fields?.find((f) => f.key === 'total' || f.key === 'cost');
  const amtTxt = totalField?.text ?? '';

  const mapByTemplate = {
    sale_cash: {
      channel: '#kinh-doanh-thu-tien',
      dept: 'Phòng Kinh doanh',
      npcName: 'Bé Na',
      npcRole: 'Chuyên viên Kinh doanh',
      icon: '👩‍💼',
      orderType: 'THÔNG BÁO THU',
      impact: 'Tăng Doanh thu (511) & Tiền mặt (111)',
      slackText: `@cfo Em vừa chốt đơn bán hàng thu tiền mặt ${amtTxt}! Nhờ anh/chị kiểm tra hóa đơn & duyệt thông báo thu vào quỹ giúp em nhé!`,
    },
    sale_credit: {
      channel: '#kinh-doanh-b2b',
      dept: 'Kinh doanh B2B',
      npcName: 'Bé Na',
      npcRole: 'Chuyên viên Kinh doanh',
      icon: '👩‍💼',
      orderType: 'THÔNG BÁO THU CÔNG NỢ',
      impact: 'Tăng Doanh thu (511) & Phải thu (131)',
      slackText: `@cfo Hợp đồng bán buôn B2B trị giá ${amtTxt} đã giao hàng xong. Em đính kèm hóa đơn GTGT để ghi nhận doanh thu và theo dõi phải thu khách hàng (TK 131) ạ!`,
    },
    cogs: {
      channel: '#kho-van-scm',
      dept: 'Kho vận Trung tâm',
      npcName: 'Chú Bền',
      npcRole: 'Trưởng Kho vận',
      icon: '👷',
      orderType: 'LỆNH XUẤT KHO GIÁ VỐN',
      impact: 'Ghi nhận Giá vốn (632) & Giảm kho (156)',
      slackText: `@cfo Kho vừa xuất lô hàng giao cho khách, giá vốn xuất kho là ${amtTxt}. Cháu kiểm tra phiếu xuất kho rồi kết chuyển giá vốn (TK 632 / 156) nhé!`,
    },
    purchase_credit: {
      channel: '#kho-van-mua-hang',
      dept: 'Phòng Mua hàng',
      npcName: 'Chú Bền',
      npcRole: 'Trưởng Kho vận',
      icon: '👷',
      orderType: 'LỆNH NHẬP MUA & CÔNG NỢ',
      impact: 'Tăng Tồn kho (156) & Công nợ (331)',
      slackText: `@cfo Lô hàng mới từ nhà cung cấp trị giá ${amtTxt} vừa về kho. Chú gửi hóa đơn & biên bản giao nhận để cháu kiểm duyệt và vào sổ công nợ TK 331!`,
    },
    expense_cash: {
      channel: '#lenh-chi-opex',
      dept: 'Hành chính - Văn phòng',
      npcName: 'Cậu Lẹ',
      npcRole: 'Điều phối Hành chính',
      icon: '🛵',
      orderType: 'LỆNH CHI TIỀN MẶT',
      impact: 'Ghi nhận Chi phí (642/641) & Giảm tiền (111)',
      slackText: `@cfo Em gửi đề nghị thanh toán chi phí vận hành ${amtTxt}. Anh/chị soi giúp em chứng từ xem hợp lệ chưa để Thủ quỹ giải ngân nhé!`,
    },
    deposit_cash_bank: {
      channel: '#thu-chi-ngan-quy',
      dept: 'Bộ phận Ngân quỹ',
      npcName: 'Anh Tâm',
      npcRole: 'Thủ quỹ Công ty',
      icon: '👨‍💼',
      orderType: 'LỆNH NỘP TIỀN NGÂN HÀNG',
      impact: 'Chuyển Tiền mặt (111) vào Ngân hàng (112)',
      slackText: `@cfo Em vừa mang ${amtTxt} tiền mặt tại quỹ ra nộp vào tài khoản Ngân hàng công ty. Gửi sếp Giấy nộp tiền để hạch toán Nợ 112 / Có 111 ạ!`,
    },
    collect_customer_bank: {
      channel: '#thu-chi-ngan-quy',
      dept: 'Cổng Ngân hàng Điện tử',
      npcName: 'Anh Tâm',
      npcRole: 'Thủ quỹ Công ty',
      icon: '👨‍💼',
      orderType: 'THÔNG BÁO THU NGÂN HÀNG',
      impact: 'Tăng Tiền gửi (112) & Giảm Phải thu (131)',
      slackText: `@cfo Tinh tinh! Ngân hàng vừa báo Có khoản khách hàng thanh toán công nợ ${amtTxt}. Sếp duyệt thông báo thu để gạch nợ TK 131 nhé!`,
    },
    pay_supplier_bank: {
      channel: '#lenh-chi-ngan-hang',
      dept: 'Thanh toán Quốc nội',
      npcName: 'Ông Thịnh',
      npcRole: 'Giám đốc Điều hành',
      icon: '👔',
      orderType: 'LỆNH CHI ỦY NHIỆM CHI',
      impact: 'Giảm Phải trả (331) & Giảm Tiền gửi (112)',
      slackText: `@cfo Anh vừa ký lệnh Ủy nhiệm chi ${amtTxt} trả nợ nhà cung cấp đến hạn. Em đối chiếu chứng từ ngân hàng rồi ghi sổ Nợ 331 / Có 112 nhé!`,
    },
    issue_shares: {
      channel: '#hdqt-chien-luoc',
      dept: 'Hội đồng Quản trị',
      npcName: 'Bà Diệu',
      npcRole: 'Chủ tịch HĐQT',
      icon: '🏛️',
      orderType: 'THÔNG BÁO THU VỐN CỔ PHẦN',
      impact: 'Tăng Tiền gửi (112) & Vốn cổ phần (4111/4112)',
      slackText: `@cfo Đợt phát hành cổ phần mới thu về ${amtTxt} đã vào tài khoản phong tỏa ngân hàng. Hãy kiểm tra Nghị quyết và hạch toán Vốn góp (4111) & Thặng dư (4112)!`,
    },
    declare_dividend: {
      channel: '#hdqt-chien-luoc',
      dept: 'Đại hội đồng Cổ đông',
      npcName: 'Bà Diệu',
      npcRole: 'Chủ tịch HĐQT',
      icon: '🏛️',
      orderType: 'NGHỊ QUYẾT PHÂN PHỐI LÃI',
      impact: 'Phân phối Lợi nhuận (421 ➔ 3388)',
      slackText: `@cfo ĐHĐCĐ đã thông qua nghị quyết chia cổ tức ${amtTxt}. Đề nghị CFO kiểm tra tỷ lệ biểu quyết và kết chuyển từ TK 421 sang TK 3388.`,
    },
    pay_dividend: {
      channel: '#lenh-chi-ngan-hang',
      dept: 'Ban Quan hệ Cổ đông',
      npcName: 'Chị Mơ',
      npcRole: 'Kế toán Trưởng',
      icon: '👩‍🏫',
      orderType: 'LỆNH CHI CỔ TỨC & THUẾ TNCN',
      impact: 'Chi trả Cổ tức & Khấu trừ thuế TNCN (3335)',
      slackText: `@cfo Hôm nay đến ngày thanh toán cổ tức bằng tiền ${amtTxt}. Nhớ khấu trừ 5% thuế TNCN đầu tư vốn (TK 3335) trước khi chi từ TK 112 nhé!`,
    },
    buyback_treasury: {
      channel: '#hdqt-chien-luoc',
      dept: 'Uỷ ban Đầu tư',
      npcName: 'Bà Diệu',
      npcRole: 'Chủ tịch HĐQT',
      icon: '🏛️',
      orderType: 'LỆNH CHI MUA CỔ PHIẾU QUỸ',
      impact: 'Mua lại Cổ phiếu quỹ (419)',
      slackText: `@cfo Lệnh mua lại cổ phiếu quỹ ${amtTxt} đã khớp. Kiểm tra thẩm quyền phê duyệt trên chứng từ và ghi nhận vào TK 419 nhé!`,
    },
    invest_subsidiary: {
      channel: '#hdqt-chien-luoc',
      dept: 'Khối Đầu tư Tập đoàn',
      npcName: 'Ông Thịnh',
      npcRole: 'Giám đốc Điều hành',
      icon: '👔',
      orderType: 'LỆNH CHI ĐẦU TƯ CÔNG TY CON',
      impact: 'Đầu tư vốn vào Công ty con (221)',
      slackText: `@cfo Tập đoàn giải ngân khoản đầu tư vào công ty con ${amtTxt}. Kiểm tra phê duyệt giao dịch và hạch toán vào TK 221 nhé!`,
    },
  };

  const info = mapByTemplate[doc.templateId] ?? {
    channel: '#tai-chinh-ke-toan',
    dept: 'Hệ thống Kế toán',
    npcName: 'Chị Mơ',
    npcRole: 'Kế toán Trưởng',
    icon: '🔔',
    orderType: 'THÔNG BÁO NGHIỆP VỤ',
    impact: 'Cập nhật Sổ cái & Chỉ số Tài chính',
    slackText: `@cfo Có chứng từ nghiệp vụ mới (${amtTxt}) vừa gửi lên kênh Slack. Vui lòng kiểm tra và định khoản vào Tài khoản Tổng!`,
  };

  const minute = (10 + index * 7) % 60;
  const hour = 8 + Math.floor((10 + index * 7) / 60);
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const quickReplies = [
    {
      id: 'rep_verify',
      label: '💬 "Đã nhận chứng từ, đang kiểm tra MST & chữ ký để hạch toán ngay!"',
      playerText: `Đã nhận thông báo từ ${info.npcName}! Mình đang đối chiếu chữ ký, MST và số tiền (${amtTxt}) để lên bút toán vào Sổ cái ngay.`,
      npcResponse: `Cảm ơn CFO nhiều nhé! Khi nào kết chuyển xong báo mình một tiếng trên kênh ${info.channel} nha! 🙌`,
    },
    {
      id: 'rep_ask_confirm',
      label: '🔍 "Xác nhận lại giúp mình hồ sơ gốc đính kèm của lệnh này đã khớp 100% chưa?"',
      playerText: `${info.npcName} ơi, xác nhận lại giúp phòng Tài chính: bộ hồ sơ gốc của khoản ${amtTxt} này đã kiểm tra kỹ các trường bắt buộc chưa?`,
      npcResponse: doc.defect
        ? `Ơ... nãy bên mình làm gấp quá nên chưa kịp rà kỹ từng dòng, CFO soi thật kỹ giúp mình coi chừng có điểm sai sót nhé! 😅`
        : `Mình vừa rà lại một lượt rồi, đầy đủ chữ ký và thông tin khớp chuẩn, CFO yên tâm định khoản nhé! ✅`,
    },
    {
      id: 'rep_cashflow_note',
      label: '🏦 "Đã ghi nhận vào kế hoạch cân đối nguồn tiền (111/112) trong ca!"',
      playerText: `Đã ghi nhận khoản ${amtTxt} vào bảng điều phối Ngân quỹ (TK 111/112) của kỳ này nhé ${info.npcName}.`,
      npcResponse: `Tuyệt vời! Có CFO sát sao dòng tiền thế này anh em các phòng ban yên tâm hẳn! 💹`,
    },
  ];

  return {
    pushId: `SLK-DOC-${String(doc.no).padStart(3, '0')}`,
    channel: info.channel,
    dept: info.dept,
    npcName: info.npcName,
    npcRole: info.npcRole,
    icon: info.icon,
    orderType: info.orderType,
    impact: info.impact,
    slackText: info.slackText,
    timeStr,
    amountText: amtTxt,
    status: 'PENDING', // PENDING | POSTED | REJECTED | ERROR
    chatHistory: [],
    repliedIds: [],
    quickReplies,
  };
}

/**
 * ============================================================================
 * PHÂN HỆ TẬP ĐOÀN ĐA NGÀNH (CONGLOMERATE ECOSYSTEM) & DANH MỤC LĨNH VỰC KINH DOANH
 * ============================================================================
 */

export const BUSINESS_SECTORS_CATALOG = [
  {
    id: 'RETAIL_FMCG',
    name: 'Bán lẻ & Chuỗi Tiêu dùng / Nội thất',
    code: 'RETAIL',
    icon: '🛒',
    capexAmount: 300000000,
    expectedRoiPct: 18,
    riskLevel: 'LOW',
    description: 'Thương mại phân phối hàng hóa tiêu dùng, bán buôn nội thất; dòng tiền tiền mặt dồi dào, ổn định cao.',
  },
  {
    id: 'TECH_CLOUD_AI',
    name: 'Công nghệ Thông tin, AI & SaaS Đám mây',
    code: 'TECH_AI',
    icon: '🤖',
    capexAmount: 550000000,
    expectedRoiPct: 38,
    riskLevel: 'HIGH',
    description: 'Phát triển nền tảng phần mềm quản trị AI và hạ tầng điện toán đám mây; biên lợi nhuận cao vượt trội.',
  },
  {
    id: 'LOGISTICS_PORT',
    name: 'Vận tải Hàng không, Logistics & Kho Thông minh',
    code: 'LOGISTICS',
    icon: '🚢',
    capexAmount: 420000000,
    expectedRoiPct: 24,
    riskLevel: 'MED',
    description: 'Hệ thống kho vận tự động hóa, đội xe trung chuyển và giao nhận đa phương thức; tạo sức mạnh chuỗi cung ứng.',
  },
  {
    id: 'MANUFACTURING_IND',
    name: 'Sản xuất Công nghiệp & Chế tạo Cơ khí Chính xác',
    code: 'MFG_IND',
    icon: '🏭',
    capexAmount: 680000000,
    expectedRoiPct: 26,
    riskLevel: 'MED',
    description: 'Nhà máy gia công tự động CNC, xuất khẩu linh kiện phụ trợ; giá trị gia tăng lớn, tài sản cố định vững chắc.',
  },
  {
    id: 'REAL_ESTATE_IP',
    name: 'Bất động sản Khu Công nghiệp & Cho thuê Văn phòng',
    code: 'RE_PARK',
    icon: '🏢',
    capexAmount: 950000000,
    expectedRoiPct: 20,
    riskLevel: 'LOW',
    description: 'Khu công nghiệp xanh và toà nhà phức hợp cho thuê; mang lại doanh thu tiền thuê định kỳ ổn định.',
  },
  {
    id: 'GREEN_ENERGY',
    name: 'Năng lượng Tái tạo & Điện Mặt trời Áp mái',
    code: 'SOLAR_PWR',
    icon: '⚡',
    capexAmount: 500000000,
    expectedRoiPct: 22,
    riskLevel: 'LOW',
    description: 'Hệ thống điện áp mái các nhà máy trong tập đoàn kết hợp bán điện cho lưới quốc gia; hưởng ưu đãi thuế.',
  },
  {
    id: 'HEALTHCARE_PHARMA',
    name: 'Hệ thống Phòng khám Y tế & Dược phẩm Sinh học',
    code: 'HEALTHCARE',
    icon: '💊',
    capexAmount: 480000000,
    expectedRoiPct: 28,
    riskLevel: 'MED',
    description: 'Dịch vụ chẩn đoán y khoa kỹ thuật số và chuỗi nhà thuốc đạt chuẩn GPP; thị trường phòng thủ bền vững.',
  },
  {
    id: 'FINTECH_VENTURE',
    name: 'Công nghệ Tài chính & Quỹ Đầu tư Mạo hiểm',
    code: 'FINTECH',
    icon: '💳',
    capexAmount: 600000000,
    expectedRoiPct: 35,
    riskLevel: 'HIGH',
    description: 'Cổng thanh toán điện tử B2B và quỹ ươm mầm startup chiến lược; đóng góp dòng doanh thu tài chính (TK 515).',
  },
];

/**
 * Mở rộng lĩnh vực kinh doanh mới (từ danh mục hoặc tự tạo ngành riêng).
 * Hạch toán bút toán đầu tư góp vốn vào công ty con (TK 221).
 */
export function expandBusinessSector(state, { sectorId, customSector, fundingMode = 'CASH_112' } = {}) {
  if (!Array.isArray(state.sectors)) {
    state.sectors = [];
  }

  let sectorDef = null;
  if (customSector && typeof customSector === 'object') {
    sectorDef = {
      id: `CUSTOM_${Date.now()}`,
      name: customSector.name || 'Lĩnh vực Kinh doanh Mới',
      code: (customSector.code || 'CUSTOM').toUpperCase(),
      icon: customSector.icon || '🚀',
      capexAmount: Math.max(50000000, Math.round(Number(customSector.capexAmount) || 200000000)),
      expectedRoiPct: Math.min(100, Math.max(5, Math.round(Number(customSector.expectedRoiPct) || 20))),
      riskLevel: customSector.riskLevel || 'MED',
      description: customSector.description || 'Lĩnh vực kinh doanh mới do CEO phê duyệt mở rộng.',
    };
  } else {
    sectorDef = BUSINESS_SECTORS_CATALOG.find((s) => s.id === sectorId);
  }

  if (!sectorDef) {
    return { success: false, reason: 'Không tìm thấy thông tin lĩnh vực kinh doanh hợp lệ.' };
  }

  const capex = sectorDef.capexAmount;
  const currentBank = state.balances['112'] ?? 0;

  // Xác định phương thức cấp vốn
  let bankNeeded = capex;
  let debtFinanced = 0;

  if (fundingMode === 'LEVERAGE_341') {
    bankNeeded = Math.round(capex / 2);
    debtFinanced = capex - bankNeeded;
  }

  if (currentBank < bankNeeded) {
    return {
      success: false,
      reason: `Số dư Tiền gửi Ngân hàng (TK 112 hiện có: ${(currentBank).toLocaleString('vi-VN')} đ) không đủ giải ngân vốn đầu tư yêu cầu (${(bankNeeded).toLocaleString('vi-VN')} đ). Vui lòng cân đối nguồn tiền trước khi mở rộng.`,
    };
  }

  // Bút toán đầu tư công ty con:
  // Nợ 221: capex
  // Có 112: bankNeeded
  // Có 341: debtFinanced (nếu dùng đòn bẩy)
  const lines = [{ side: 'N', account: '221', amount: capex }];
  if (debtFinanced > 0) {
    lines.push({ side: 'C', account: '112', amount: bankNeeded });
    lines.push({ side: 'C', account: '341', amount: debtFinanced });
  } else {
    lines.push({ side: 'C', account: '112', amount: capex });
  }

  recordLedgerLines(state, {
    title: `[M&A] Thành lập & Góp vốn Công ty con: ${sectorDef.name}`,
    source: 'SECTOR_EXPANSION',
    lines,
  });

  const instanceId = `inst_${sectorDef.code.toLowerCase()}_${Date.now()}`;
  const newInstance = {
    instanceId,
    sectorId: sectorDef.id,
    name: sectorDef.name,
    code: sectorDef.code,
    icon: sectorDef.icon,
    channel: `#cty-${sectorDef.code.toLowerCase()}`,
    capexAmount: capex,
    expectedRoiPct: sectorDef.expectedRoiPct,
    riskLevel: sectorDef.riskLevel,
    fundingMode,
    status: 'ACTIVE',
    cycleCount: 0,
    totalRevenueGenerated: 0,
    totalProfitGenerated: 0,
    description: sectorDef.description,
    createdAt: new Date().toISOString(),
  };

  state.sectors.push(newInstance);

  // Thêm một thông báo Slack chúc mừng và báo cáo từ tân Giám đốc công ty con
  if (Array.isArray(state.slackEvents)) {
    state.slackEvents.unshift({
      id: `EVT_SECTOR_${instanceId}`,
      templateId: `evt_sector_${instanceId}`,
      orderType: 'BÁO CÁO MỞ RỘNG TẬP ĐOÀN',
      npcId: 'n_sep',
      channel: newInstance.channel,
      npcName: `Ban Điều hành ${newInstance.name}`,
      npcRole: 'Tổng Giám đốc Đơn vị Thành viên',
      avatar: newInstance.icon,
      color: '#38BDF8',
      title: `Chính thức ra mắt & đi vào vận hành: ${newInstance.name}`,
      amount: capex,
      timeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      message: `@ceo Ban Điều hành kính báo: Đơn vị thành viên ${newInstance.name} đã hoàn tất thủ tục đăng ký kinh doanh và giải ngân vốn ${(capex).toLocaleString('vi-VN')} đ (TK 221). Chúng tôi cam kết đạt tỷ suất sinh lời mục tiêu ${newInstance.expectedRoiPct}%/năm!`,
      status: 'RESOLVED',
      choices: [],
      resolution: {
        playerText: `Chúc mừng tân đơn vị thành viên ${newInstance.name} gia nhập Tập đoàn! Hãy chú trọng kiểm soát dòng tiền và kỷ luật kế toán.`,
        npcReply: 'Rõ thưa CEO! Bộ phận tài chính công ty con đã kết nối trực tiếp với hệ thống ERP trung tâm.',
        ethical: true,
        scoreDelta: 200,
        complianceDelta: 5,
        resolvedAt: new Date().toISOString(),
      },
    });
  }

  return { success: true, sector: newInstance, lines };
}

/**
 * Thu hoạch chu kỳ kinh doanh của các đơn vị thành viên / công ty con.
 * Tạo dòng doanh thu và chi phí thực tế hạch toán vào Sổ cái Tập đoàn.
 */
export function harvestSectorCycle(state, sectorInstanceId = null) {
  if (!Array.isArray(state.sectors) || state.sectors.length === 0) {
    return { success: false, reason: 'Chưa có đơn vị thành viên nào trong tập đoàn.' };
  }

  const targets = sectorInstanceId
    ? state.sectors.filter((s) => s.instanceId === sectorInstanceId && s.status === 'ACTIVE')
    : state.sectors.filter((s) => s.status === 'ACTIVE');

  if (targets.length === 0) {
    return { success: false, reason: 'Không tìm thấy đơn vị kinh doanh nào đang hoạt động.' };
  }

  let totalRev = 0;
  let totalCost = 0;
  const harvestedSectors = [];

  for (const sec of targets) {
    // Doanh thu chu kỳ dựa trên tỷ suất ROI và quy mô vốn đầu tư
    const revQuarter = Math.max(15000000, Math.round((sec.capexAmount * (sec.expectedRoiPct / 100)) / 2.5));
    // Tỷ lệ giá vốn/chi phí phụ thuộc mức rủi ro ngành
    const costRatio = sec.riskLevel === 'HIGH' ? 0.62 : sec.riskLevel === 'MED' ? 0.52 : 0.42;
    const costQuarter = Math.round(revQuarter * costRatio);
    const netProfitQuarter = revQuarter - costQuarter;

    // Doanh thu: Nợ 112 / Có 511 (hoặc Có 515 nếu fintech)
    const revAccount = sec.sectorId === 'FINTECH_VENTURE' ? '515' : '511';
    // Chi phí: Nợ 642 / Có 112
    const lines = [
      { side: 'N', account: '112', amount: revQuarter },
      { side: 'C', account: revAccount, amount: revQuarter },
      { side: 'N', account: '642', amount: costQuarter },
      { side: 'C', account: '112', amount: costQuarter },
    ];

    recordLedgerLines(state, {
      title: `[Doanh thu Chu kỳ] ${sec.name} nộp lợi nhuận & doanh thu vận hành`,
      source: 'SECTOR_HARVEST',
      lines,
    });

    sec.cycleCount = (sec.cycleCount || 0) + 1;
    sec.totalRevenueGenerated = (sec.totalRevenueGenerated || 0) + revQuarter;
    sec.totalProfitGenerated = (sec.totalProfitGenerated || 0) + netProfitQuarter;

    totalRev += revQuarter;
    totalCost += costQuarter;
    harvestedSectors.push({
      instanceId: sec.instanceId,
      name: sec.name,
      revenue: revQuarter,
      cost: costQuarter,
      profit: netProfitQuarter,
    });
  }

  return {
    success: true,
    totalRevenue: totalRev,
    totalCost,
    totalProfit: totalRev - totalCost,
    sectors: harvestedSectors,
  };
}

/**
 * Trích xuất bức tranh dữ liệu tài chính tức thời (Snapshot) để nạp vào prompt cho AI CFO.
 */
export function buildCfoContextSnapshot(state, activeDoc = null) {
  const metrics = computeMetrics(state);
  const masterAcc = computeMasterAccountBalance(state);
  const cashAnalysis = analyzeCashSources(state);

  const keyAccounts = ['111', '112', '131', '156', '221', '331', '341', '411', '421'];
  const balancesTable = {};
  for (const acc of keyAccounts) {
    balancesTable[acc] = state.balances[acc] ?? 0;
  }

  const sectorsSummary = (state.sectors || []).map((s) => ({
    name: s.name,
    code: s.code,
    capex: s.capexAmount,
    roi: `${s.expectedRoiPct}%`,
    risk: s.riskLevel,
    cycles: s.cycleCount,
    totalRev: s.totalRevenueGenerated,
    totalProfit: s.totalProfitGenerated,
  }));

  const activeDocSummary = activeDoc
    ? {
        pushId: activeDoc.push?.pushId || `DOC-${activeDoc.no}`,
        title: activeDoc.title,
        dept: activeDoc.push?.dept || 'Chưa phân loại',
        amount: activeDoc.push?.amountText || '—',
        orderType: activeDoc.push?.orderType || 'Nghiệp vụ Kế toán',
        status: activeDoc.push?.status || 'PENDING',
        fields: (activeDoc.fields || []).map((f) => ({ key: f.key, label: f.label, text: f.text })),
        hasDefectDetectedByAudit: Boolean(activeDoc.defect),
      }
    : null;

  const pendingSlack = (state.slackEvents || [])
    .filter((e) => e.status === 'PENDING')
    .map((e) => ({
      id: e.id,
      title: e.title,
      sender: e.npcName,
      channel: e.channel,
      amount: e.amount,
      message: e.message,
    }));

  return {
    timestamp: new Date().toISOString(),
    conglomerateName: 'Tập đoàn Đa ngành Đại Việt',
    ceoRole: 'Người chơi (CEO)',
    kpis: {
      revenue: metrics.revenue,
      cogs: metrics.cogs,
      grossProfit: metrics.grossProfit,
      opex: metrics.opex,
      netProfit: metrics.netProfit,
      netMarginPct: metrics.netMarginPct,
      liquidity: metrics.liquidity,
      workingCapital: metrics.workingCapital,
      companyValuation: metrics.companyValuation,
      complianceScore: state.complianceScore ?? 100,
    },
    treasury: {
      cashOnHand_111: cashAnalysis.cash111 ?? 0,
      bankDeposit_112: cashAnalysis.bank112 ?? 0,
      receivables_131: cashAnalysis.receivables131 ?? 0,
      payables_331: cashAnalysis.payables331 ?? 0,
      shortTermDebt_341: cashAnalysis.shortTermDebt341 ?? 0,
      currentRatio: cashAnalysis.currentRatio,
      quickRatio: cashAnalysis.quickRatio,
      cashSufficiency: cashAnalysis.cashCoverageRatio,
      recommendation: cashAnalysis.recommendations?.[0]?.reason || 'Dòng tiền cơ bản ổn định.',
    },
    masterAccountsBalanced: masterAcc.isOverallBalanced,
    totalAssets: masterAcc.totalAssets,
    totalLiabilitiesAndEquity: masterAcc.totalLiabilitiesAndEquity,
    keyBalances: balancesTable,
    sectors: sectorsSummary,
    activeDocument: activeDocSummary,
    pendingSlackAlerts: pendingSlack,
  };
}

