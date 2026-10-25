// Âm thanh tổng hợp bằng WebAudio — không cần file âm thanh ngoài.
// Nhạc nền ngũ cung (pentatonic) với tiếng gảy kiểu đàn tranh (Karplus-Strong).

const PENTA = [0, 2, 4, 7, 9]; // cung Đô ngũ cung

export class Sound {
  constructor() {
    this.ctx = null; this.sfxOn = true; this.musicOn = true;
    this.musicVol = 0.35; this.sfxVol = 0.8;
    this._amb = null; this._musicTimer = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? this.musicVol : 0; this.musicBus.connect(this.master);
    this.ambBus = this.ctx.createGain(); this.ambBus.gain.value = 0.5; this.ambBus.connect(this.master);
    // Hồi âm giả lập
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.4, 2.2);
    const rv = this.ctx.createGain(); rv.gain.value = 0.35;
    this.reverb.connect(rv).connect(this.master);
    this.noiseBuf = this._noise(2);
    if (this.musicOn) this.startMusic();
  }

  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? this.sfxVol : 0; if (this.ambBus) this.ambBus.gain.value = on ? 0.5 : 0; }
  setMusic(on) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? this.musicVol : 0, this.ctx.currentTime, 0.3);
    if (on) this.startMusic(); else this.stopMusic();
  }
  duck(on) { if (this.ctx && this.musicOn) this.musicBus.gain.setTargetAtTime(on ? this.musicVol * 0.35 : this.musicVol, this.ctx.currentTime, 0.2); }

  get t() { return this.ctx.currentTime; }

  _impulse(sec, decay) {
    const len = this.ctx.sampleRate * sec, b = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay; }
    return b;
  }
  _noise(sec) {
    const len = this.ctx.sampleRate * sec, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // ---------- Khối âm cơ bản ----------
  tone({ f = 440, type = 'sine', at = 0, dur = 0.3, vol = 0.3, attack = 0.005, slide = 0, bus, rev = 0, vib = 0 }) {
    if (!this.ctx) return;
    const t0 = this.t + at, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t0 + dur);
    if (vib) {
      const l = this.ctx.createOscillator(), lg = this.ctx.createGain();
      l.frequency.value = 5.5; lg.gain.value = f * vib; l.connect(lg).connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.1);
    }
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    if (rev) { const r = this.ctx.createGain(); r.gain.value = rev; g.connect(r).connect(this.reverb); }
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  noise({ at = 0, dur = 0.3, vol = 0.3, freq = 1000, q = 1, type = 'bandpass', sweep = 0, bus, attack = 0.01, rev = 0 }) {
    if (!this.ctx) return;
    const t0 = this.t + at, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * sweep), t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(bus || this.sfxBus);
    if (rev) { const r = this.ctx.createGain(); r.gain.value = rev; g.connect(r).connect(this.reverb); }
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  // Gảy dây kiểu đàn tranh (Karplus–Strong)
  pluck(f, at = 0, vol = 0.35, bus, decay = 0.996) {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate, dur = 2.2, len = Math.floor(sr * dur), b = this.ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const N = Math.max(2, Math.floor(sr / f)), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const nx = (idx + 1) % N, v = ring[idx];
      ring[idx] = decay * 0.5 * (v + ring[nx]);
      d[i] = v; idx = nx;
    }
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = b; g.gain.value = vol;
    s.connect(g).connect(bus || this.sfxBus);
    const r = this.ctx.createGain(); r.gain.value = 0.4; g.connect(r).connect(this.reverb);
    s.start(this.t + at);
  }
  // Chuông chùa / cồng chiêng (bội âm không điều hoà)
  bell(f, at = 0, vol = 0.25, dur = 3.5, bus) {
    [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone({ f: f * m, at, dur: dur / (1 + i * 0.6), vol: vol / (1 + i * 1.3), attack: 0.002, rev: 0.6, bus }));
  }
  gong(at = 0, vol = 0.4) {
    [1, 1.48, 2.1, 2.9].forEach((m, i) => this.tone({ f: 98 * m, at, dur: 4 - i * 0.6, vol: vol / (1 + i), attack: 0.01, vib: 0.004, rev: 0.8 }));
  }
  note(semi, oct = 4) { return 261.63 * 2 ** (oct - 4 + semi / 12); }
  penta(k, oct = 4) { const o = Math.floor(k / 5); return this.note(PENTA[((k % 5) + 5) % 5], oct + o); }

  // ---------- Hiệu ứng âm thanh ----------
  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    const fn = this['_' + name];
    if (fn) fn.call(this);
  }
  _click() { this.tone({ f: 900, type: 'triangle', dur: 0.06, vol: 0.15 }); }
  _hover() { this.tone({ f: 1400, type: 'sine', dur: 0.04, vol: 0.05 }); }
  _step() { this.tone({ f: 520 + Math.random() * 60, type: 'triangle', dur: 0.09, vol: 0.18 }); this.noise({ dur: 0.05, vol: 0.08, freq: 3000 }); }
  _dice() { for (let i = 0; i < 9; i++) this.noise({ at: i * 0.06 + Math.random() * 0.03, dur: 0.05, vol: 0.25 * (1 - i / 10), freq: 1800 + Math.random() * 1500, q: 3 }); }
  _diceLand() { this.noise({ dur: 0.08, vol: 0.3, freq: 900, q: 2 }); this.tone({ f: 180, dur: 0.12, vol: 0.2, type: 'triangle' }); }
  _coin() { this.tone({ f: 1318, type: 'square', dur: 0.08, vol: 0.08 }); this.tone({ f: 1975, type: 'square', at: 0.07, dur: 0.25, vol: 0.08 }); }
  _buy() {
    this._coin();
    [0, 4, 7, 12].forEach((s, i) => this.tone({ f: this.note(s, 5), type: 'triangle', at: 0.1 + i * 0.07, dur: 0.4, vol: 0.15, rev: 0.3 }));
    this.noise({ at: 0.05, dur: 0.4, vol: 0.12, freq: 6000, q: 0.7 });
  }
  _pay() { [0, -3, -7].forEach((s, i) => this.tone({ f: this.note(s, 5), type: 'triangle', at: i * 0.09, dur: 0.25, vol: 0.12 })); this._coin(); }
  _cash() { for (let i = 0; i < 6; i++) this.tone({ f: 1500 + Math.random() * 900, type: 'square', at: i * 0.05, dur: 0.1, vol: 0.05 }); this.bell(1760, 0.3, 0.12, 1.2); }
  _go() {
    const seq = [0, 4, 7, 12, 7, 12, 16];
    seq.forEach((s, i) => this.tone({ f: this.note(s, 4), type: 'sawtooth', at: i * 0.09, dur: 0.35, vol: 0.06, rev: 0.4 }));
    seq.forEach((s, i) => this.tone({ f: this.note(s, 5), type: 'triangle', at: i * 0.09, dur: 0.35, vol: 0.1 }));
    this.noise({ at: 0.6, dur: 1.2, vol: 0.15, freq: 5000, sweep: 0.3, rev: 0.5 });
  }
  _card() { this.noise({ dur: 0.25, vol: 0.2, freq: 2500, sweep: 3, q: 0.8 }); this.tone({ f: 660, at: 0.18, dur: 0.6, vol: 0.12, rev: 0.6 }); this.tone({ f: 990, at: 0.26, dur: 0.6, vol: 0.1, rev: 0.6 }); }
  _jail() { this.tone({ f: 70, type: 'square', dur: 0.4, vol: 0.25, slide: 0.6 }); this.noise({ dur: 0.35, vol: 0.4, freq: 400, q: 1 }); this.noise({ at: 0.15, dur: 0.6, vol: 0.2, freq: 2500, q: 8 }); }
  _siren() { for (let i = 0; i < 4; i++) { this.tone({ f: 660, type: 'sawtooth', at: i * 0.5, dur: 0.25, vol: 0.07, slide: 1.3 }); this.tone({ f: 860, type: 'sawtooth', at: i * 0.5 + 0.25, dur: 0.25, vol: 0.07, slide: 0.77 }); } }
  _build() { for (let i = 0; i < 3; i++) { this.noise({ at: i * 0.12, dur: 0.06, vol: 0.35, freq: 1200, q: 2 }); this.tone({ f: 300, at: i * 0.12, dur: 0.08, vol: 0.15, type: 'square' }); } this.tone({ f: this.note(7, 5), at: 0.4, dur: 0.5, vol: 0.12, rev: 0.4 }); }
  _error() { this.tone({ f: 220, type: 'square', dur: 0.15, vol: 0.1 }); this.tone({ f: 180, type: 'square', at: 0.12, dur: 0.2, vol: 0.1 }); }
  _good() { [0, 7, 12].forEach((s, i) => this.tone({ f: this.note(s, 5), at: i * 0.08, dur: 0.4, vol: 0.12, type: 'triangle', rev: 0.4 })); }
  _bad() { [5, 1, -2].forEach((s, i) => this.tone({ f: this.note(s, 4), at: i * 0.15, dur: 0.4, vol: 0.12, type: 'sawtooth' })); }
  _quizOk() { [0, 4, 7, 12, 16].forEach((s, i) => this.pluck(this.note(s, 5), i * 0.07, 0.3)); this._cash(); }
  _quizBad() { this.tone({ f: 300, type: 'triangle', dur: 0.5, vol: 0.15, slide: 0.5 }); }
  _deal() { this.gong(0, 0.25); [0, 2, 4, 7, 9, 12].forEach((s, i) => this.pluck(this.note(s, 4), 0.1 + i * 0.08, 0.3)); }
  _bankrupt() { [7, 6, 5, 4].forEach((s, i) => this.tone({ f: this.note(s, 3), type: 'sawtooth', at: i * 0.35, dur: i === 3 ? 1.4 : 0.35, vol: 0.12, vib: i === 3 ? 0.03 : 0 })); }
  _victory() {
    this.gong(0, 0.35);
    const mel = [0, 2, 4, 7, 9, 12, 9, 12, 14, 16];
    mel.forEach((s, i) => { this.pluck(this.note(s, 5), 0.3 + i * 0.14, 0.35); this.tone({ f: this.note(s, 4), type: 'triangle', at: 0.3 + i * 0.14, dur: 0.5, vol: 0.08 }); });
    for (let i = 0; i < 8; i++) this._firework(1.2 + i * 0.35);
  }
  _whoosh() { this.noise({ dur: 0.6, vol: 0.25, freq: 400, sweep: 8, q: 1.2 }); }
  _firework(at = 0) { this.noise({ at, dur: 0.4, vol: 0.12, freq: 800, sweep: 4, q: 2 }); this.noise({ at: at + 0.4, dur: 1.2, vol: 0.3, freq: 1200, type: 'lowpass', q: 0.5, rev: 0.6 }); for (let i = 0; i < 6; i++) this.noise({ at: at + 0.5 + Math.random() * 0.8, dur: 0.05, vol: 0.12, freq: 5000, q: 4 }); }
  _stamp() { this.noise({ dur: 0.12, vol: 0.4, freq: 300, q: 1, type: 'lowpass' }); this.tone({ f: 110, dur: 0.2, vol: 0.3, type: 'sine' }); }

  // ---------- Âm thanh chủ đề theo địa danh ----------
  theme(name) {
    if (!this.ctx || !this.sfxOn) return;
    const T = {
      fanfare: () => this._go(),
      card: () => this._card(),
      tax: () => { this._pay(); this.noise({ dur: 0.3, vol: 0.2, freq: 1000, q: 3 }); },
      jail: () => this._jail(),
      siren: () => { this._siren(); this._jail(); },
      rest: () => { [0, 2, 4, 2, 0].forEach((k, i) => this.pluck(this.penta(k + 2, 4), i * 0.25, 0.3)); },
      highland: () => { // gió núi + sáo H'Mông
        this.noise({ dur: 3, vol: 0.18, freq: 500, sweep: 2, q: 0.6, attack: 1, bus: this.ambBus });
        [4, 5, 7, 5, 4, 2].forEach((k, i) => this.tone({ f: this.penta(k, 5), type: 'sine', at: 0.2 + i * 0.32, dur: 0.45, vol: 0.12, vib: 0.012, attack: 0.06, rev: 0.6 }));
      },
      waterfall: () => { this.noise({ dur: 3.5, vol: 0.35, freq: 1200, type: 'lowpass', q: 0.3, attack: 0.4, bus: this.ambBus }); this.noise({ dur: 3.5, vol: 0.15, freq: 300, q: 0.5, attack: 0.4, bus: this.ambBus }); [0, 2, 4].forEach((k, i) => this.pluck(this.penta(k, 5), 0.5 + i * 0.3, 0.25)); },
      lake: () => { this.bell(this.penta(2, 5), 0, 0.15); [0, 1, 2, 4, 2].forEach((k, i) => this.pluck(this.penta(k, 4), 0.3 + i * 0.35, 0.28)); this._waves(2.5); },
      river: () => { this._waves(3); [0, 2, 1, 3, 2, 4].forEach((k, i) => this.pluck(this.penta(k, 4), i * 0.28, 0.3)); for (let i = 0; i < 3; i++) this.noise({ at: 0.6 + i * 0.7, dur: 0.25, vol: 0.12, freq: 600, q: 2 }); },
      sea: () => { this._waves(3.5); this.tone({ f: 1800, at: 0.8, dur: 0.15, vol: 0.05, slide: 1.4 }); this.tone({ f: 2000, at: 1.1, dur: 0.12, vol: 0.05, slide: 1.3 }); [0, 2, 4, 5].forEach((k, i) => this.pluck(this.penta(k, 5), 0.4 + i * 0.3, 0.22)); },
      bay: () => { this._waves(3.5); this.gong(0.1, 0.25); [0, 2, 4, 7, 4].forEach((k, i) => this.tone({ f: this.penta(k, 4), at: 0.6 + i * 0.4, dur: 0.6, vol: 0.1, vib: 0.01, attack: 0.08, rev: 0.7 })); },
      cave: () => { for (let i = 0; i < 6; i++) this.tone({ f: 1200 + Math.random() * 1400, at: i * 0.45 + Math.random() * 0.2, dur: 0.6, vol: 0.12, slide: 0.6, rev: 1 }); this.noise({ dur: 3, vol: 0.12, freq: 150, type: 'lowpass', attack: 0.6, bus: this.ambBus }); },
      dragon: () => { // tiếng rồng gầm + lửa + pháo hoa
        this.tone({ f: 90, type: 'sawtooth', dur: 1.4, vol: 0.25, slide: 0.5, vib: 0.06, attack: 0.1 });
        this.noise({ dur: 1.4, vol: 0.35, freq: 500, q: 1.5, sweep: 0.4, attack: 0.1 });
        this.noise({ at: 0.6, dur: 1.6, vol: 0.4, freq: 2000, type: 'lowpass', q: 0.5, sweep: 0.3 });
        this._firework(1.4); this._firework(1.9);
      },
      oldtown: () => { [0, 2, 4, 2, 1, 0, 2].forEach((k, i) => this.pluck(this.penta(k, 4), i * 0.3, 0.32)); this.bell(this.penta(4, 5), 0.1, 0.1, 2); this._waves(2.5, 0.08); },
      royal: () => { this.gong(0, 0.35); [0, 2, 4, 7, 4, 2, 4].forEach((k, i) => this.tone({ f: this.penta(k, 4), type: 'triangle', at: 0.4 + i * 0.28, dur: 0.4, vol: 0.12, vib: 0.008, rev: 0.5 })); for (let i = 0; i < 4; i++) this.noise({ at: 0.4 + i * 0.56, dur: 0.1, vol: 0.2, freq: 200, q: 1, type: 'lowpass' }); },
      temple: () => { this.bell(this.penta(0, 4), 0, 0.28, 4.5); this.bell(this.penta(0, 4), 1.6, 0.18, 3.5); this.noise({ at: 0.4, dur: 0.05, vol: 0.25, freq: 900, q: 6 }); this.noise({ at: 0.9, dur: 0.05, vol: 0.25, freq: 900, q: 6 }); },
      church: () => { [0, 4, 7, 12].forEach((s, i) => this.bell(this.note(s, 4), i * 0.6, 0.2, 3.5)); },
      market: () => { for (let i = 0; i < 14; i++) this.tone({ f: 200 + Math.random() * 300, type: 'triangle', at: Math.random() * 2.5, dur: 0.15, vol: 0.04, slide: 0.8 + Math.random() * 0.5 }); this.noise({ dur: 2.8, vol: 0.12, freq: 1200, q: 0.4, attack: 0.5, bus: this.ambBus }); this._cash(); },
      city: () => { this.noise({ dur: 2.5, vol: 0.12, freq: 700, q: 0.4, attack: 0.5, bus: this.ambBus }); this.tone({ f: 440, type: 'square', at: 0.5, dur: 0.15, vol: 0.05 }); this.tone({ f: 440, type: 'square', at: 0.7, dur: 0.2, vol: 0.05 }); this._firework(0.8); this._firework(1.5); [0, 4, 7, 12].forEach((s, i) => this.tone({ f: this.note(s, 5), at: 0.3 + i * 0.1, dur: 0.6, vol: 0.08, type: 'sawtooth', rev: 0.6 })); },
      train: () => { for (let i = 0; i < 8; i++) this.noise({ at: i * 0.22, dur: 0.15, vol: 0.25 - i * 0.02, freq: 400, q: 1.5 }); this.tone({ f: 587, type: 'sawtooth', at: 0.2, dur: 0.9, vol: 0.06, vib: 0.01, rev: 0.4 }); this.tone({ f: 740, type: 'sawtooth', at: 0.2, dur: 0.9, vol: 0.05, vib: 0.01 }); },
      plane: () => { this.noise({ dur: 3, vol: 0.35, freq: 300, sweep: 6, q: 0.8, attack: 1.2 }); this.tone({ f: 1100, type: 'sine', at: 0.1, dur: 0.6, vol: 0.06 }); this.tone({ f: 880, type: 'sine', at: 0.5, dur: 0.8, vol: 0.06 }); },
      ship: () => { this.tone({ f: 110, type: 'sawtooth', dur: 1.6, vol: 0.12, attack: 0.1, rev: 0.6 }); this.tone({ f: 138.6, type: 'sawtooth', dur: 1.6, vol: 0.1, attack: 0.1 }); this._waves(3); },
      electric: () => { this.tone({ f: 60, type: 'sawtooth', dur: 1.5, vol: 0.12, attack: 0.2 }); for (let i = 0; i < 5; i++) this.noise({ at: 0.2 + i * 0.15 + Math.random() * 0.1, dur: 0.06, vol: 0.25, freq: 4000, q: 2 }); this.tone({ f: 200, at: 0.1, dur: 0.8, vol: 0.1, slide: 6 }); },
    };
    (T[name] || T.card)();
  }
  _waves(dur = 3, vol = 0.22) {
    for (let i = 0; i < Math.ceil(dur / 1.2); i++) this.noise({ at: i * 1.2, dur: 1.6, vol, freq: 600, sweep: 0.4, type: 'lowpass', q: 0.4, attack: 0.6, bus: this.ambBus });
  }

  // ---------- Nhạc nền ngũ cung ----------
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    let bar = 0;
    const motifs = [[0, 2, 4, 7], [4, 2, 0, 2], [7, 9, 7, 4], [2, 4, 2, 0], [5, 4, 2, 4], [0, 2, 0, -1]];
    const tick = () => {
      if (!this.musicOn) return;
      const m = motifs[(bar + Math.floor(Math.random() * 2)) % motifs.length];
      const beat = 0.62;
      m.forEach((k, i) => { if (Math.random() < 0.9) this.pluck(this.penta(k, 4), i * beat, 0.22, this.musicBus, 0.997); });
      if (bar % 2 === 0) this.pluck(this.penta(0, 2), 0, 0.3, this.musicBus, 0.998);
      else this.pluck(this.penta(3, 2), 0, 0.25, this.musicBus, 0.998);
      if (bar % 4 === 0) this.tone({ f: this.penta(0, 3), dur: 4.5, vol: 0.05, attack: 1.2, bus: this.musicBus, vib: 0.003 });
      if (bar % 8 === 7) this.tone({ f: this.penta(4, 5), dur: 1.2, vol: 0.05, attack: 0.1, bus: this.musicBus, vib: 0.015, rev: 0.6 });
      bar++;
    };
    tick();
    this._musicTimer = setInterval(tick, 2480);
  }
  stopMusic() { clearInterval(this._musicTimer); this._musicTimer = null; }
}

export const sound = new Sound();
