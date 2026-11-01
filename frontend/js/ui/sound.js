/**
 * SLACK WORKSPACE & FINANCIAL OS SOUND SYNTHESIZER — Nợ Có Ơi Pro (FE-024)
 * Tổng hợp âm thanh thông báo kiểu Slack (Knock-Brush / Marimba Ping), âm gửi tin nhắn,
 * âm phản hồi của NPC và âm báo hạch toán bằng Web Audio API thuần (không cần thư viện ngoài hay file mp3).
 */

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (!soundEnabled) return null;
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  return soundEnabled;
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    playSlackKnock();
  }
  return soundEnabled;
}

/**
 * Âm thanh thông báo tin nhắn Slack đến (2-tone Knock-Marimba đặc trưng: G5 ➔ D6 + âm gõ ngắn).
 */
export function playSlackKnock() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Nốt 1: Knock trầm-ấm (784 Hz - G5)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(587.33, now); // D5
  osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.045); // G5
  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.22, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.12);

  // Nốt 2: Ping sáng kiểu Slack (1174.66 Hz - D6)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1174.66, now + 0.085); // D6
  gain2.gain.setValueAtTime(0.001, now + 0.085);
  gain2.gain.linearRampToValueAtTime(0.25, now + 0.098);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.085);
  osc2.stop(now + 0.35);
}

/**
 * Âm thanh khi người chơi bấm gửi câu trả lời cho NPC trong bảng chat.
 */
export function playSlackSend() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.09);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

/**
 * Âm thanh khi NPC trả lời lại trong hộp thoại Slack.
 */
export function playSlackReply() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [659.25, 880]; // E5 -> A5
  notes.forEach((freq, i) => {
    const start = now + i * 0.075;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.17);
  });
}

/**
 * Âm thanh khi hạch toán thành công vào Sổ cái / Tài khoản Tổng.
 */
export function playSuccessLedger() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
  chord.forEach((freq, idx) => {
    const start = now + idx * 0.055;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.26);
  });
}

/**
 * Âm thanh cảnh báo khi chặn lỗi hoặc phát hiện rủi ro sai phạm.
 */
export function playAlertBuzzer() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.setValueAtTime(185, now + 0.09);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.23);
}
