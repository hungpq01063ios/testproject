// Giọng nói tiếng Việt cho Ngân hàng (Web Speech API)
// Tự quản lý hàng đợi: chia câu ngắn (tránh lỗi Chrome cắt câu dài) và bỏ các câu cũ chưa kịp đọc
// để lời Ngân hàng luôn khớp với diễn biến trên bàn cờ.
export class Voice {
  constructor() {
    this.on = true; this.rate = 1.05; this.pitch = 1; this.voice = null; this.voices = [];
    this.supported = 'speechSynthesis' in window;
    this.onChange = null; this.onSpeak = null;
    this.queue = []; this.busy = false;
    if (this.supported) {
      this._load();
      speechSynthesis.onvoiceschanged = () => this._load();
    }
  }
  _load() {
    const all = speechSynthesis.getVoices();
    this.voices = all.filter(v => /^vi/i.test(v.lang) || /vietnam|tiếng việt|hoaimy|namminh/i.test(v.name));
    if (!this.voice || !this.voices.includes(this.voice)) {
      // Ưu tiên giọng tự nhiên (Online/Natural/Google)
      this.voice = this.voices.find(v => /natural|online/i.test(v.name)) || this.voices.find(v => /google/i.test(v.name)) || this.voices[0] || null;
    }
    this.onChange?.();
  }
  get hasVietnamese() { return this.voices.length > 0; }
  setVoice(name) { this.voice = this.voices.find(v => v.name === name) || this.voice; }

  // Gọi trong thao tác người dùng đầu tiên (iOS/Safari yêu cầu)
  unlock() { if (this.supported) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } }

  stop() {
    this._drop();
    if (this.supported) speechSynthesis.cancel();
    this.busy = false;
  }
  _drop() { for (const q of this.queue) q.res?.(); this.queue = []; }

  // Đọc câu; trả về Promise khi đọc xong (hoặc khi bị câu mới thay thế)
  say(text, { interrupt = false } = {}) {
    this.onSpeak?.(text);
    if (!this.on || !this.supported) return Promise.resolve();
    if (interrupt) this.stop(); else this._drop();
    const clean = text.replace(/[–—]/g, ', ').replace(/\bTr\b/g, 'triệu').replace(/TP\./g, 'Thành phố').replace(/🤖/g, '');
    const chunks = [];
    for (const s of clean.match(/[^.!?]+[.!?]*/g) || [clean]) {
      const t = s.trim(); if (!t) continue;
      if (chunks.length && chunks[chunks.length - 1].length + t.length < 160) chunks[chunks.length - 1] += ' ' + t; else chunks.push(t);
    }
    return new Promise(res => {
      chunks.forEach((c, i) => this.queue.push({ text: c, res: i === chunks.length - 1 ? res : null }));
      if (!chunks.length) res();
      this._pump();
    });
  }

  _pump() {
    if (this.busy || !this.queue.length) return;
    const q = this.queue.shift();
    this.busy = true;
    const u = new SpeechSynthesisUtterance(q.text);
    u.lang = 'vi-VN';
    if (this.voice) u.voice = this.voice;
    u.rate = this.rate; u.pitch = this.pitch;
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(guard); this.busy = false; q.res?.(); this._pump(); };
    // Phòng trường hợp trình duyệt không bắn sự kiện onend
    const guard = setTimeout(finish, 2000 + q.text.length * 110 / this.rate);
    u.onend = u.onerror = finish;
    speechSynthesis.speak(u);
  }
}
