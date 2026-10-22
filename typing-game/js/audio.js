'use strict';
// =====================================================================
//  ÂM THANH: hiệu ứng (WebAudio, không cần file), nhạc nền, giọng nói
// =====================================================================

const Sfx = (() => {
  let ctx = null, master = null, musicBus = null;
  const state = { sfx: true, music: true };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.1; musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.3, slide = null, delay = 0, bus = null } = {}) {
    if (!bus && !state.sfx) return;
    if (!ensure()) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

  // ---- Nhạc nền: hợp âm rải nhẹ nhàng C – Am – F – G ----
  const CHORDS = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
  const PATTERN = [0, 1, 2, 1, 0, 1, 2, 1];
  let timer = null, step = 0, nextAt = 0;
  function schedule() {
    while (nextAt < ctx.currentTime + 0.3) {
      const chord = CHORDS[Math.floor(step / 8) % 4];
      const n = PATTERN[step % 8];
      const when = nextAt - ctx.currentTime;
      tone(chord[n] * 2, 0.32, { type: 'triangle', vol: 0.5, delay: when, bus: musicBus });
      if (step % 8 === 0) tone(chord[0] / 2, 1.6, { type: 'sine', vol: 0.6, delay: when, bus: musicBus });
      if (step % 4 === 2 && Math.random() < 0.5) tone(chord[2] * 4, 0.25, { type: 'sine', vol: 0.25, delay: when, bus: musicBus });
      nextAt += 0.27; step++;
    }
  }

  return {
    state,
    unlock: ensure,
    key(combo) { tone(PENTA[combo % PENTA.length], 0.13, { type: 'triangle', vol: 0.22 }); },
    oops() { tone(260, 0.2, { type: 'sine', vol: 0.22, slide: 170 }); },
    jump() { tone(420, 0.2, { type: 'square', vol: 0.05, slide: 900 }); },
    gem() { tone(1318.5, 0.09, { type: 'triangle', vol: 0.18 }); tone(1760, 0.18, { type: 'triangle', vol: 0.18, delay: 0.07 }); },
    bump() { tone(160, 0.3, { type: 'sawtooth', vol: 0.07, slide: 80 }); },
    click() { tone(880, 0.06, { type: 'triangle', vol: 0.14 }); },
    beep(hi) { tone(hi ? 1046.5 : 659.25, 0.16, { type: 'square', vol: 0.06 }); },
    star(i) { tone(880 * Math.pow(1.26, i), 0.35, { type: 'sine', vol: 0.25 }); tone(1760 * Math.pow(1.26, i), 0.2, { type: 'triangle', vol: 0.08 }); },
    win() { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.2, delay: i * 0.1 })); },
    sad() { [523.25, 466.16, 392].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.15, delay: i * 0.18 })); },
    musicOn() {
      if (!state.music || timer || !ensure()) return;
      nextAt = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 100);
    },
    musicOff() { clearInterval(timer); timer = null; }
  };
})();

const Voice = {
  enabled: true,
  rate: 1,
  voice: null,
  hasVietnamese: false,
  init() {
    if (!('speechSynthesis' in window)) return;
    const choose = () => {
      const vs = speechSynthesis.getVoices();
      const vi = vs.filter(v => /^vi/i.test(v.lang));
      // Ưu tiên giọng nữ / giọng online chất lượng cao nếu có
      this.voice = vi.find(v => /female|nữ|linh|hoaimy|an|google/i.test(v.name)) || vi[0] || null;
      this.hasVietnamese = !!this.voice;
    };
    choose();
    speechSynthesis.onvoiceschanged = choose;
  },
  speak(text, { interrupt = true } = {}) {
    if (!this.enabled || !('speechSynthesis' in window) || !text) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    if (this.voice) u.voice = this.voice;
    u.rate = this.rate;
    u.pitch = 1.15;
    speechSynthesis.speak(u);
  },
  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
};
