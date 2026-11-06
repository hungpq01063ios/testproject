/* Khu Rừng Chung Tay — game screen: setup, hot-seat turns, dice, animal tokens, mini-games, in-world cinematics,
 * voice, day and night, and the ending. */
(function () {
  'use strict';
  const F = window.ForestCore, T = window.THREE, FW = window.ForestWorld, MINI = window.ForestMini;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  const qs = new URLSearchParams(location.search), FAST = qs.has('fast');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const QUALITY = FAST ? 'low' : qs.get('q') || (Math.min(innerWidth, innerHeight) < 700 ? 'low' : 'high');
  const SAVE = 'khurung.save.v2';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ICONS = {}; ['seed', 'water', 'heart', 'tree', 'cloud', 'trash', 'paw', 'hop', 'plant', 'luck', 'home', 'help', 'book', 'find', 'game', 'bridge', 'zone0', 'zone1', 'zone2', 'zone3', 'zone4'].forEach((k) => (ICONS[k] = FW.iconURL(k, 96)));
  let st = null, busy = false, frames = 0, cineOn = false, cutsSeen = [];

  // ================= Sound and voice =================
  const Sfx = {
    ctx: null, on: true,
    ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    tone(f, d, type, vol, when) { if (!this.on || !this.ctx || FAST) return; const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02); },
    rattle() { for (let i = 0; i < 8; i++) this.tone(300 + Math.random() * 500, 0.04, 'square', 0.03, i * 0.09); },
    hop(i) { this.tone(440 + (i % 4) * 80, 0.09, 'sine', 0.08); this.tone(660 + (i % 4) * 80, 0.06, 'sine', 0.05, 0.05); },
    item() { this.tone(988, 0.08, 'triangle', 0.1); this.tone(1319, 0.2, 'triangle', 0.08, 0.07); },
    good() { this.tone(880, 0.08, 'triangle', 0.09); this.tone(1175, 0.12, 'triangle', 0.08, 0.06); },
    bad() { this.tone(330, 0.15, 'sine', 0.07); this.tone(262, 0.2, 'sine', 0.06, 0.1); },
    tree() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.09, i * 0.08)); },
    magic() { [784, 988, 1175, 1568, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.07, i * 0.09)); },
    thunder() { if (!this.on || !this.ctx || FAST) return; const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0.35; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(); },
    win() { [523, 659, 784, 1047, 880, 1047, 1319].forEach((f, i) => this.tone(f, i > 4 ? 0.6 : 0.2, 'triangle', 0.1, i * 0.14)); },
    intro() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 6 ? 0.9 : 0.28, 'triangle', 0.07, i * 0.22)); [196, 262, 330].forEach((f, i) => this.tone(f, 1.6, 'sine', 0.05, i * 0.6)); },
    gentle() { [392, 330, 294, 330, 392].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.08, i * 0.22)); },
  };
  document.addEventListener('pointerdown', () => Sfx.ensure(), { passive: true });
  // Read-aloud: one sentence at a time (never cut off mid-sentence), and wait for the browser's voices to load —
  // Chrome and Edge fill the voice list a moment after the page opens, which used to swallow the opening narration.
  const Voice = {
    on: store.get('khurung.voice') !== 'off', voice: null, queue: [], speaking: false, cur: null, lastCancel: 0,
    bad: new Set(), lastError: '', log: [], spoken: 0,
    note(m) { this.log.push(new Date().toLocaleTimeString() + ' ' + m); if (this.log.length > 12) this.log.shift(); if (this.onlog) this.onlog(); },
    all() { try { return speechSynthesis.getVoices() || []; } catch (e) { return []; } },
    vi() { return this.all().filter((x) => /^vi(-|_|$)/i.test(x.lang) || /vietnam|tiếng việt|hoaimy|namminh/i.test(x.name)); },
    // Edge lists the device's own voices first and adds its online Vietnamese voices later, so look again every time
    // until a Vietnamese voice turns up instead of deciding once. A voice that failed (an online voice with no
    // connection, for instance) is skipped, and a voice chosen in the sound check wins when it is available.
    pick() {
      const vi = this.vi(), want = store.get('khurung.voiceName'), ok = vi.filter((x) => !this.bad.has(x.name));
      this.voice = ok.find((x) => x.name === want) || ok.find((x) => !x.localService) || ok[0] || null;
      if (!this.voice && vi.length && this.bad.size) { this.bad.clear(); this.voice = vi[0]; } // every voice failed once: try them all again
      return this.voice;
    },
    say(text, opts) {
      if (!this.on || FAST || !window.speechSynthesis || !text) return Promise.resolve();
      if (opts && opts.interrupt) this.stop();
      return new Promise((res) => { this.queue.push({ text, res, born: performance.now(), tries: 0 }); while (this.queue.length > 3) this.queue.shift().res(); this.pump(); });
    },
    stop() { this.queue.splice(0).forEach((q) => q.res()); if (this.speaking) { try { speechSynthesis.cancel(); } catch (e) {} this.lastCancel = performance.now(); } if (this.cur) { const c = this.cur; this.cur = null; c.done(); } this.speaking = false; },
    pump() {
      if (this.speaking || !this.queue.length) return;
      this.pick();
      if (!this.voice) { // wait up to 5 s for the voice list (per sentence, so a late list still gets used)
        const q = this.queue[0]; if (performance.now() - q.born < 5000) { clearTimeout(this.retry); this.retry = setTimeout(() => this.pump(), 250); return; }
        this.lastError = 'không có giọng tiếng Việt'; this.note('Bỏ qua câu: máy chưa có giọng tiếng Việt'); this.queue.shift().res(); return this.pump();
      }
      const wait = 160 - (performance.now() - this.lastCancel); // Chromium drops a speak() that follows cancel() too closely
      if (wait > 0) { clearTimeout(this.retry); this.retry = setTimeout(() => this.pump(), wait); return; }
      const q = this.queue.shift(), v = this.voice, u = new SpeechSynthesisUtterance(q.text); u.voice = v; u.lang = v.lang || 'vi-VN'; u.rate = 0.95; u.pitch = 1.1;
      let done = false, started = false; const fin = () => { if (done) return; done = true; clearTimeout(guard); if (this.cur && this.cur.u === u) this.cur = null; this.speaking = false; q.res(); this.pump(); };
      const guard = setTimeout(() => { if (!started) { this.lastError = 'giọng "' + v.name + '" không phản hồi'; this.note('Không phản hồi: ' + v.name); } fin(); }, 2500 + q.text.length * 120); // some voices never fire onend
      u.onstart = () => { started = true; this.spoken++; this.lastError = ''; };
      u.onend = fin;
      u.onerror = (e) => {
        const why = (e && e.error) || 'error';
        if (why === 'interrupted' || why === 'canceled') return fin();
        this.lastError = why + ' (' + v.name + ')'; this.note('Lỗi "' + why + '" với giọng ' + v.name);
        if (done) return; done = true; clearTimeout(guard); if (this.cur && this.cur.u === u) this.cur = null; this.speaking = false;
        this.bad.add(v.name); // e.g. an online voice with no connection: try the next Vietnamese voice once
        if (q.tries < 2 && this.vi().some((x) => !this.bad.has(x.name))) { q.tries++; this.queue.unshift(q); } else q.res();
        this.pump();
      };
      this.speaking = true; this.cur = { u, done: fin }; // keep a reference so the utterance is not garbage-collected mid-sentence
      try { if (typeof speechSynthesis.resume === 'function') speechSynthesis.resume(); } catch (e) { /* not every browser has it */ }
      try { speechSynthesis.speak(u); } catch (e) { this.lastError = String(e && e.message || e); fin(); }
    },
  };
  try { speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', () => { Voice.pick(); Voice.pump(); }) : (speechSynthesis.onvoiceschanged = () => { Voice.pick(); Voice.pump(); }); Voice.pick(); } catch (e) {}

  // Sound check: shows exactly what the browser offers, so a silent voice can be traced to the tab, the device or the voice.
  function soundCheck() {
    const box = $('soundCheck'); box.hidden = false; Sfx.ensure();
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const render = () => {
      const has = !!window.speechSynthesis, all = Voice.all(), vi = Voice.vi(), cur = Voice.pick(), ctx = Sfx.ctx;
      const row = (ok, t) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✔' : '✖'} ${t}</li>`;
      $('scList').innerHTML = [
        row(Sfx.on && ctx && ctx.state === 'running', `Âm thanh hiệu ứng: ${Sfx.on ? 'bật' : 'đang tắt'} · ${ctx ? ctx.state : 'chưa khởi động'}`),
        row(Voice.on, `Nút “Đọc to”: ${Voice.on ? 'đang bật' : 'đang TẮT — bấm nút Đọc to để bật'}`),
        row(has, has ? 'Trình duyệt có hỗ trợ đọc to' : 'Trình duyệt không hỗ trợ đọc to'),
        row(all.length > 0, `Số giọng đọc trình duyệt cung cấp: ${all.length}`),
        row(vi.length > 0, vi.length ? `Giọng tiếng Việt: ${vi.length}` : 'Không thấy giọng tiếng Việt (Edge cần mạng để có giọng “Online”)'),
        row(!Voice.lastError, Voice.lastError ? 'Lỗi gần nhất: ' + esc(Voice.lastError) : `Đã đọc thành công ${Voice.spoken} câu`),
      ].join('');
      $('scVoices').innerHTML = vi.length ? vi.map((x) => `<label><input type="radio" name="scv" value="${esc(x.name)}" ${cur && cur.name === x.name ? 'checked' : ''}> ${esc(x.name)} <small>${x.localService ? 'trên máy' : 'trực tuyến'}${Voice.bad.has(x.name) ? ' · vừa lỗi' : ''}</small></label>`).join('') : '<p class="sc-hint">Chưa có giọng tiếng Việt nào.</p>';
      $('scVoices').querySelectorAll('input').forEach((r) => { r.onchange = () => { store.set('khurung.voiceName', r.value); Voice.bad.delete(r.value); render(); }; });
      $('scLog').textContent = Voice.log.slice(-6).join('\n');
    };
    Voice.onlog = render; render();
    $('scBeep').onclick = () => { Sfx.ensure(); const was = Sfx.on; Sfx.on = true; Sfx.good(); Sfx.on = was; setTimeout(render, 200); };
    $('scSay').onclick = () => {
      if (!window.speechSynthesis) return; Voice.bad.clear(); const was = Voice.on; Voice.on = true; Voice.note('Đọc thử…');
      Voice.say('Xin chào các bạn nhỏ! Khu rừng đang chờ chúng mình.', { interrupt: true }).then(() => { Voice.on = was; Voice.note(Voice.lastError ? 'Đọc thử không thành công' : 'Đọc thử xong'); });
    };
    $('scClose').onclick = () => { box.hidden = true; Voice.onlog = null; };
    clearInterval(soundCheck.t); soundCheck.t = setInterval(() => { if (box.hidden) clearInterval(soundCheck.t); else render(); }, 1500);
  }
  $('checkBtn').onclick = soundCheck; $('checkBtn2').onclick = soundCheck;
  const toggle = (btn, obj, key) => { btn.setAttribute('aria-pressed', String(obj.on)); btn.onclick = () => { obj.on = !obj.on; btn.setAttribute('aria-pressed', String(obj.on)); if (key) store.set(key, obj.on ? 'on' : 'off'); if (!obj.on && obj.stop) obj.stop(); }; };
  toggle($('soundBtn'), Sfx); toggle($('voiceBtn'), Voice, 'khurung.voice');

  // ================= Renderer and world =================
  const canvas = $('scene');
  const renderer = new T.WebGLRenderer({ canvas, antialias: QUALITY === 'high' });
  renderer.setPixelRatio(FAST ? 0.75 : Math.min(devicePixelRatio || 1, QUALITY === 'high' ? 2 : 1.25));
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = QUALITY !== 'low'; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, 0.1, 400);
  const HOME_T = new T.Vector3(0, 0, 2), HOME_P = new T.Vector3(0, 32, 31);
  camera.position.copy(HOME_P);
  const controls = new T.OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, maxPolarAngle: 1.2, minPolarAngle: 0.3, minDistance: 10, maxDistance: 60, enablePan: false });
  controls.target.copy(HOME_T);
  const W = FW.build(scene, renderer, { quality: QUALITY });

  // thumbnails of the animals and the little friends
  const THUMB = {}, FRIEND_IMG = {};
  (function () {
    const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(192, 192); r.outputEncoding = T.sRGBEncoding;
    const sc = new T.Scene(); sc.add(new T.HemisphereLight('#ffffff', '#88aa77', 1.0)); const l = new T.DirectionalLight('#ffffff', 0.9); l.position.set(2, 4, 4); sc.add(l);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    const shot = (m, tall) => { sc.add(m); m.rotation.y = -0.45; cam.position.set(0, tall * 0.62, tall * 2.6); cam.lookAt(0, tall * 0.5, 0); r.render(sc, cam); const u = r.domElement.toDataURL(); sc.remove(m); return u; };
    F.ANIMALS.forEach((a, i) => (THUMB[a.key] = shot(FW.animal(a.key, F.SCARVES[i]), a.key === 'stork' ? 1.75 : a.key === 'turtle' ? 0.7 : 1.45)));
    F.ZONES.forEach((z) => (FRIEND_IMG[z.friend.key] = shot(FW.friend(z.friend.key, 1), z.friend.key === 'crane' ? 1.6 : z.friend.key === 'otter' || z.friend.key === 'pangolin' ? 0.7 : 1.1)));
    r.dispose();
  })();
  $('stormIcon').src = ICONS.cloud;

  // ================= Tokens =================
  let tokens = [];
  function slot(tileId, k, n) {
    const p = W.tilePos(tileId); p.y = 0.37;
    if (F.TILES[tileId].type === 'hub') { const a = (k / Math.max(1, n)) * Math.PI * 2 + 0.6; p.x += Math.cos(a) * 2.25; p.z += Math.sin(a) * 2.25; return p; }
    if (n > 1) { const a = (k / n) * Math.PI * 2; p.x += Math.cos(a) * 0.5; p.z += Math.sin(a) * 0.5; }
    return p;
  }
  function buildTokens() {
    tokens.forEach((t) => scene.remove(t.g));
    tokens = st.players.map((p) => { const g = FW.animal(p.animal, p.color); scene.add(g); return { g, hop: null, settle: null, blink: Math.random() * 4, party: false }; });
    placeAll(true);
  }
  function placeAll(instant) {
    const groups = {}; st.players.forEach((p, i) => (groups[p.pos] = groups[p.pos] || []).push(i));
    st.players.forEach((p, i) => { const t = tokens[i]; if (!t || t.hop) return; const target = slot(p.pos, groups[p.pos].indexOf(i), groups[p.pos].length); if (instant) t.g.position.copy(target); else t.settle = target; if (instant) t.g.rotation.y = Math.atan2(-target.x, -target.z) + Math.PI; });
  }
  function hopTo(i, tileId) {
    const t = tokens[i], from = t.g.position.clone(), to = slot(tileId, i, F.TILES[tileId].type === 'hub' ? st.players.length : 1);
    t.g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    if (FAST) { t.g.position.copy(to); return Promise.resolve(); }
    const far = from.distanceTo(to) > 5;
    return new Promise((res) => { t.hop = { from, to, t: 0, dur: reduced ? 0.12 : far ? 0.7 : 0.36, high: far ? 2.2 : 0.9, res }; });
  }

  // ================= Dice =================
  const dcan = $('dice'), dr = new T.WebGLRenderer({ canvas: dcan, antialias: true, alpha: true });
  dr.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); dr.setSize(120, 120, false); dr.outputEncoding = T.sRGBEncoding;
  const ds = new T.Scene(), dcam = new T.PerspectiveCamera(32, 1, 0.1, 20); dcam.position.set(0, 3.0, 2.9); dcam.lookAt(0, 0, 0);
  ds.add(new T.HemisphereLight('#ffffff', '#c9d6e6', 1.0)); const dl = new T.DirectionalLight('#ffffff', 0.7); dl.position.set(2, 4, 3); ds.add(dl);
  const PIPS = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]] };
  const faceMat = (n) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#c9d2de'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fffdf6'; g.beginPath(); if (g.roundRect) g.roundRect(6, 6, 116, 116, 22); else g.rect(6, 6, 116, 116); g.fill(); g.fillStyle = n === 1 ? '#e2483d' : '#233049'; PIPS[n].forEach(([x, y]) => { g.beginPath(); g.arc(x * 128, y * 128, n === 1 ? 20 : 13, 0, Math.PI * 2); g.fill(); }); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshStandardMaterial({ map: t, roughness: 0.4 }); };
  const FACE_VALUES = [3, 4, 1, 6, 2, 5], FACE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const die = new T.Mesh(new T.BoxGeometry(1, 1, 1), FACE_VALUES.map(faceMat)); ds.add(die);
  let dieAnim = null, dieDirty = true;
  function rollDie(v) {
    const k = FACE_VALUES.indexOf(v), n = new T.Vector3(...FACE_NORMALS[k]);
    const end = new T.Quaternion().setFromUnitVectors(n, new T.Vector3(0, 1, 0)).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), (Math.floor(Math.random() * 4) * Math.PI) / 2 + 0.6)).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), 0.32));
    if (FAST) { die.quaternion.copy(end); dieDirty = true; return Promise.resolve(); }
    Sfx.rattle();
    return new Promise((res) => { dieAnim = { t: 0, dur: reduced ? 0.25 : 1.1, end, spin: new T.Vector3(Math.random() * 14 + 8, Math.random() * 10 + 6, Math.random() * 12 + 6), res }; });
  }

  // ================= Effects =================
  function screenOf(v) { const p = v.clone().project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height, ok: p.z < 1 }; }
  function popAt(world, icon, text, delay) { setTimeout(() => { const s = screenOf(world); if (!s.ok) return; const el = document.createElement('div'); el.className = 'pop'; el.innerHTML = (icon ? `<img src="${ICONS[icon]}" alt="">` : '') + esc(text); el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; $('fxLayer').appendChild(el); setTimeout(() => el.remove(), 1700); }, FAST ? 0 : delay || 0); }
  const pop = (i, icon, text, delay) => tokens[i] && popAt(tokens[i].g.position.clone().add(new T.Vector3(0, 1.8, 0)), icon, text, delay);
  const bannerQ = []; let bannerBusy = false;
  function banner(text, dark) { if (FAST) return; if (bannerQ.some((b) => b.text === text)) return; bannerQ.push({ text, dark }); pumpBanner(); }
  function pumpBanner() {
    if (bannerBusy || !bannerQ.length) return;
    if (cineOn || document.querySelector('.mini:not([hidden])')) { setTimeout(pumpBanner, 300); return; }
    bannerBusy = true; const { text, dark } = bannerQ.shift();
    const el = document.createElement('div'); el.className = 'banner' + (dark ? ' dark' : ''); el.textContent = text; document.body.appendChild(el);
    setTimeout(() => { el.remove(); bannerBusy = false; pumpBanner(); }, 1700);
  }
  const parts = [], confGeo = new T.PlaneGeometry(0.2, 0.12), leafGeo = new T.CircleGeometry(0.12, 6), heartGeo = new T.SphereGeometry(0.12, 8, 6);
  const confM = ['#e2483d', '#ffcf3f', '#3fbf6f', '#3fa7e6', '#ff6f91', '#8c5ad6'].map((c) => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })), heartM = new T.MeshBasicMaterial({ color: '#ff4f7b' });
  function burst(pos, kind, n) { if (FAST) return; for (let i = 0; i < (reduced ? Math.min(n, 12) : n); i++) { const m = new T.Mesh(kind === 'leaf' ? leafGeo : kind === 'heart' ? heartGeo : confGeo, kind === 'leaf' ? confM[2] : kind === 'heart' ? heartM : confM[i % confM.length]); m.position.copy(pos).add(new T.Vector3(0, 1, 0)); scene.add(m); const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3; parts.push({ m, v: new T.Vector3(Math.cos(a) * sp * 0.5, 3 + Math.random() * 4, Math.sin(a) * sp * 0.5), life: 2 + Math.random(), float: kind === 'heart' }); } }
  const snap = () => st.players.map((p) => ({ seeds: p.seeds, water: p.water, hearts: p.hearts }));
  function showDiff(before) {
    let d = 0;
    st.players.forEach((p, i) => { const b = before[i]; [['seeds', 'seed'], ['water', 'water'], ['hearts', 'heart']].forEach(([k, ic]) => { const v = p[k] - b[k]; if (v) { pop(i, ic, (v > 0 ? '+' : '−') + Math.abs(v), d); d += 180; if (v > 0) Sfx.item(); } }); });
  }

  // ================= Camera and cinematics =================
  let focus = null, fly = null;
  controls.addEventListener('start', () => { if (!cineOn) focus = null; });
  function flyTo(target, pos, dur) { if (FAST) { controls.target.copy(target); camera.position.copy(pos); return Promise.resolve(); } return new Promise((res) => { fly = { t: 0, dur: dur || 1.4, t0: controls.target.clone(), p0: camera.position.clone(), t1: target.clone(), p1: pos.clone(), res }; }); }
  const camFor = (c, dist, h, side) => { const d = c.clone().setY(0); const out = d.length() > 0.1 ? d.normalize() : new T.Vector3(0, 0, 1); const s = new T.Vector3(-out.z, 0, out.x).multiplyScalar(side || 0); return c.clone().add(out.clone().multiplyScalar(-dist * 0.2)).add(new T.Vector3(0, h, 0)).add(new T.Vector3(0, 0, dist)).add(s); };
  let skipCine = false;
  async function cinema(kind, shots) {
    cutsSeen.push(kind);
    if (FAST) { shots.forEach((s) => s.start && s.start()); return; }
    cineOn = true; skipCine = false; busy = true; render();
    const el = $('cine'); el.hidden = false; requestAnimationFrame(() => el.classList.add('on'));
    for (const s of shots) {
      if (skipCine) { s.start && s.start(); continue; }
      $('cineTitle').textContent = s.title || ''; $('cineText').textContent = s.text || ''; $('cineCap').classList.remove('show'); void $('cineCap').offsetWidth; $('cineCap').classList.add('show');
      const spoken = s.text || s.title ? Voice.say([s.title, s.say || s.text].filter(Boolean).join('. '), { interrupt: true }) : Promise.resolve();
      let said = false; spoken.then(() => (said = true));
      const pFly = flyTo(s.target, s.pos, s.fly || 1.6);
      if (s.start) setTimeout(s.start, 300);
      await pFly; await new Promise((r) => { const t0 = performance.now(); (function tick() { const el2 = performance.now() - t0; if (skipCine || (el2 > (s.hold || 1800) && (said || !Voice.on || el2 > 12000))) return r(); requestAnimationFrame(tick); })(); });
    }
    el.classList.remove('on'); setTimeout(() => (el.hidden = true), 400);
    cineOn = false; await flyTo(HOME_T, HOME_P, 1.2); busy = false; render();
  }
  $('cineSkip').onclick = () => { skipCine = true; Voice.stop(); };
  const zonePose = (k, near) => { const c = W.zoneCenter(k), d = W.zoneDir(k); return { target: c.clone().setY(0.8), pos: c.clone().add(d.clone().multiplyScalar(near ? -7 : -11)).add(new T.Vector3(0, near ? 6 : 10, 0)).add(new T.Vector3(-d.z, 0, d.x).multiplyScalar(near ? 3 : 5)) }; };

  function introCinema() {
    const s = [];
    s.push({ title: 'Ngày xửa ngày xưa…', text: 'Có một khu rừng xinh đẹp với năm vùng: Rừng Tre, Đồi Hoa, Thác Nước, Đầm Sen và Núi Đá.', target: HOME_T, pos: new T.Vector3(18, 26, 26), hold: 3200 });
    s.push(Object.assign({ title: 'Nhưng rồi cơn bão năm ngoái…', text: 'Làm cây cối xơ xác, thác cạn nước, và các bạn nhỏ bị lạc mất mẹ.', hold: 3200 }, zonePose(2, true)));
    s.push({ title: 'Cây Mẹ nhờ các bạn', text: 'Hãy trồng cây ở mỗi vùng và tìm các bạn nhỏ, trước khi mùa bão mới tới nhé!', target: new T.Vector3(0, 3.5, 0), pos: new T.Vector3(0, 5, 9), hold: 3400 });
    s.push({ title: 'Cùng nhau, mình làm được!', text: st.players.map((p) => p.name).join(', ') + ' lên đường thôi!', target: new T.Vector3(0, 0.5, 0), pos: new T.Vector3(4, 7, 9), hold: 2400, start: () => tokens.forEach((t) => (t.party = 2)) });
    Sfx.intro();
    return cinema('intro', s);
  }
  function rescueCinema(k) {
    const z = F.ZONES[k], h = W.homePos(k);
    return cinema('rescue', [{ title: `Tìm thấy ${z.friend.name}!`, text: `${z.friend.name} chạy ào về với mẹ. Cảm ơn các bạn!`, target: h.clone().setY(0.6), pos: h.clone().add(new T.Vector3(3, 3.2, 4.5)), hold: 2600, start: () => { burst(h, 'heart', 30); Sfx.magic(); } }]);
  }
  function restoreCinema(k) {
    const z = F.ZONES[k], p1 = zonePose(k, false), c = W.zoneCenter(k);
    const p2 = { target: c.clone().setY(0.6), pos: c.clone().add(new T.Vector3(W.zoneDir(k).z * 6, 4, -W.zoneDir(k).x * 6)).add(W.zoneDir(k).clone().multiplyScalar(-5)) };
    return cinema('restore', [Object.assign({ title: `${z.name} đã hồi sinh!`, text: { bamboo: 'Tre xanh vươn cao, lá rì rào trong gió.', flower: 'Hoa nở rộ khắp đồi, ong bướm bay về.', falls: 'Thác nước chảy róc rách, hồ đầy nước trong.', lotus: 'Nước đầm trong veo, sen nở hồng thơm ngát.', rocks: 'Rêu xanh phủ đá, pha lê lấp lánh trong hang.' }[z.key], hold: 2600, start: () => { burst(c, 'leaf', 60); burst(c, 'confetti', 60); Sfx.magic(); } }, p1), Object.assign({ hold: 1800 }, p2)]);
  }
  function stormCinema(level) {
    return cinema('storm', [{ title: level === 2 ? 'Mây bão sắp tới rồi!' : 'Mây bão đang kéo tới…', text: level === 2 ? 'Chỉ còn ít thời gian, các bạn ơi nhanh lên!' : 'Nhớ nhặt rác và trồng cây thật nhanh nhé!', target: HOME_T, pos: new T.Vector3(-14, 30, 24), hold: 2600, start: () => { W.thunder(); Sfx.thunder(); } }]);
  }
  async function endingCinema() {
    const win = st.outcome === 'win';
    W.ending(st.outcome);
    if (win) { tokens.forEach((t) => (t.party = 6)); Sfx.win(); }
    else Sfx.gentle();
    const s = win ? [
      { title: 'Cả khu rừng đã hồi sinh!', text: 'Cầu vồng hiện ra trên bầu trời, các bạn thú cùng nhau mở hội!', target: HOME_T, pos: new T.Vector3(0, 24, 30), hold: 3200, start: () => { for (let k = 0; k < 5; k++) burst(W.zoneCenter(k), 'confetti', 40); } },
      ...[0, 1, 2, 3, 4].map((k) => Object.assign({ fly: 1.1, hold: 900 }, zonePose(k, true))),
      { title: 'Hoan hô các bé!', text: 'Cây Mẹ cảm ơn tất cả các bạn!', target: new T.Vector3(0, 2, 0), pos: new T.Vector3(3, 6, 10), hold: 2600, start: () => tokens.forEach((t) => burst(t.g.position.clone(), 'confetti', 30)) },
    ] : [
      { title: 'Mùa bão đã tới…', text: 'Các bạn thú cùng trú dưới tán Cây Mẹ. Những cây đã trồng che chở cho mọi người.', target: new T.Vector3(0, 2, 0), pos: new T.Vector3(-3, 7, 11), hold: 3400 },
      { title: 'Bão đi qua rồi', text: 'Mặt trời lại lên. Mình cùng thử lại, trồng nhanh hơn nhé!', target: HOME_T, pos: new T.Vector3(10, 22, 26), hold: 2800, start: () => W.setStorm(0, 1) },
    ];
    await cinema('ending', s);
  }

  // ================= Loop =================
  let last = performance.now();
  function resize() { const r = $('stage').getBoundingClientRect(); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize);
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now; frames++;
    tokens.forEach((tk, i) => {
      const u = tk.g.userData;
      if (tk.hop) { const h = tk.hop; h.t += dt; const k = Math.min(1, h.t / h.dur); tk.g.position.lerpVectors(h.from, h.to, k); tk.g.position.y = h.from.y + Math.sin(k * Math.PI) * h.high; u.body.scale.set(1 - Math.sin(k * Math.PI) * 0.08, 1 + Math.sin(k * Math.PI) * 0.14, 1); if (k >= 1) { tk.hop = null; u.body.scale.set(1.12, 0.86, 1.12); h.res(); } }
      else if (tk.settle) { tk.g.position.lerp(tk.settle, Math.min(1, dt * 8)); if (tk.g.position.distanceTo(tk.settle) < 0.01) tk.settle = null; }
      if (tk.party > 0) { tk.party -= dt; u.body.position.y = Math.abs(Math.sin(t * 7 + i)) * 0.45; u.body.rotation.y = Math.sin(t * 4 + i) * 0.6; } else { u.body.position.y = 0; u.body.rotation.y = 0; }
      u.body.scale.lerp(new T.Vector3(1, 1 + Math.sin(t * 3 + i) * 0.02, 1), Math.min(1, dt * 8));
      tk.blink -= dt; const closed = tk.blink < 0.12; if (tk.blink < 0) tk.blink = 2 + Math.random() * 3; u.eyes.forEach((e) => (e.scale.y = closed ? 0.1 : 1));
      if (u.tail) u.tail.rotation.x = Math.sin(t * 4 + i) * 0.12;
      u.head.rotation.z = st && i === st.turn && !st.outcome ? Math.sin(t * 2.5) * 0.08 : 0;
    });
    if (fly) { fly.t += dt; const k = Math.min(1, fly.t / fly.dur), e = k * k * (3 - 2 * k); controls.target.lerpVectors(fly.t0, fly.t1, e); camera.position.lerpVectors(fly.p0, fly.p1, e); if (k >= 1) { const r = fly.res; fly = null; r(); } }
    else if (!cineOn && focus) { const want = HOME_T.clone().lerp(focus, 0.45); const d = want.sub(controls.target).multiplyScalar(Math.min(1, dt * 2)); controls.target.add(d); camera.position.add(d); }
    controls.update();
    W.update(dt, t);
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.float) { p.v.y = 1.2; p.v.x *= 0.98; } else p.v.y -= 8 * dt; p.v.multiplyScalar(1 - dt); p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 6; p.m.rotation.y += dt * 4; if (p.m.position.y < 0.1) { p.m.position.y = 0.1; p.v.set(0, 0, 0); } if (p.life < 0) { scene.remove(p.m); parts.splice(i, 1); } }
    if (!FAST || frames % 30 === 1) renderer.render(scene, camera);
    if (dieAnim) { const a = dieAnim; a.t += dt; const k = Math.min(1, a.t / a.dur); if (k < 0.7) { die.rotation.x += a.spin.x * dt * (1 - k); die.rotation.y += a.spin.y * dt * (1 - k); die.rotation.z += a.spin.z * dt * (1 - k); die.position.y = Math.abs(Math.sin(k * 9)) * 0.4 * (1 - k); } else { die.quaternion.slerp(a.end, Math.min(1, (k - 0.7) / 0.3 + 0.15)); die.position.y = 0; } if (k >= 1) { die.quaternion.copy(a.end); dieAnim = null; a.res(); } dieDirty = true; }
    if (dieDirty && (!FAST || frames % 30 === 1)) { dr.render(ds, dcam); dieDirty = false; }
    requestAnimationFrame(loop);
  }

  // ================= Setup =================
  let picks = [];
  function renderSetup() {
    $('animalCards').innerHTML = F.ANIMALS.map((a) => {
      const k = picks.findIndex((p) => p.animal === a.key), col = k >= 0 ? F.SCARVES[k] : '#eef3f7';
      return `<button class="acard" type="button" data-animal="${a.key}" aria-pressed="${k >= 0}" style="--pc:${col}">${k >= 0 ? `<span class="order">${k + 1}</span>` : ''}<img src="${THUMB[a.key]}" alt=""><b>${a.name}</b><small>${esc(a.power)}</small>${k >= 0 ? `<input id="nm-${a.key}" maxlength="12" placeholder="Tên bé" value="${esc(picks[k].name || '')}" aria-label="Tên bé chơi ${a.name}">` : ''}</button>`;
    }).join('');
    $('animalCards').querySelectorAll('.acard').forEach((b) => {
      b.onclick = (e) => { if (e.target.tagName === 'INPUT') return; const key = b.dataset.animal, k = picks.findIndex((p) => p.animal === key); if (k >= 0) picks.splice(k, 1); else if (picks.length < 6) picks.push({ animal: key, name: '' }); renderSetup(); };
      const inp = b.querySelector('input'); if (inp) inp.oninput = () => { picks.find((p) => p.animal === b.dataset.animal).name = inp.value; };
    });
    $('startBtn').disabled = !picks.length;
    $('startBtn').textContent = picks.length ? `Vào rừng thôi! (${picks.length} bạn)` : 'Chọn ít nhất 1 bạn thú';
    let saved = null; try { saved = JSON.parse(store.get(SAVE) || 'null'); } catch (e) {}
    $('resumeBtn').hidden = !(saved && saved.version === 2 && !saved.outcome);
    $('friendsRow').innerHTML = F.ZONES.map((z) => `<span><img src="${FRIEND_IMG[z.friend.key]}" alt=""><small>${z.friend.name}</small></span>`).join('');
  }
  $('startBtn').onclick = () => { Sfx.ensure(); start(F.newGame(picks.map((p) => ({ animal: p.animal, name: (p.name || '').trim() })), qs.has('seed') ? +qs.get('seed') : undefined), true); };
  $('resumeBtn').onclick = () => { try { start(JSON.parse(store.get(SAVE)), false); } catch (e) {} };
  $('newBtn').onclick = () => showSetup();
  $('againBtn').onclick = () => start(F.newGame(st.players.map((p) => ({ animal: p.animal, name: p.name }))), false);
  $('pickBtn').onclick = () => showSetup();
  function showSetup() { $('setup').hidden = false; $('endOverlay').hidden = true; ['meters', 'turnPanel', 'friends'].forEach((id) => ($(id).hidden = true)); $('newBtn').hidden = true; document.body.classList.remove('playing'); W.reset(); tokens.forEach((t) => scene.remove(t.g)); tokens = []; renderSetup(); resize(); }
  async function start(state, intro) {
    st = state; busy = false; W.reset(); W.ending(null); stormSeenLevel = Math.floor((st.storm / st.stormMax) / 0.5);
    $('setup').hidden = true; $('endOverlay').hidden = true; ['meters', 'turnPanel', 'friends'].forEach((id) => ($(id).hidden = false)); $('newBtn').hidden = false; document.body.classList.add('playing');
    resize(); buildTokens(); syncWorld(true); render(); save();
    if (intro) await introCinema();
    announceTurn();
  }
  const save = () => store.set(SAVE, JSON.stringify(st));
  function syncWorld(instant) { W.setZones(st.zones, st.need, (k, i) => st.players[(k + i) % st.players.length].color, instant); W.setTrash(st.trash); W.setStorm(st.storm, st.stormMax); W.setTime(st.round - 1); }

  // ================= Turn flow =================
  let stormSeenLevel = 0;
  function announceTurn() { const p = F.current(st); focus = tokens[st.turn] ? tokens[st.turn].g.position.clone() : null; Voice.say(`Đến lượt bạn ${p.name}`, { interrupt: true }); }
  $('rollBtn').onclick = async () => {
    if (busy || st.phase !== 'roll') return; Sfx.ensure(); busy = true; render();
    const forced = window.__forceRoll; window.__forceRoll = null;
    const v = F.roll(st, forced); await rollDie(v); Voice.say(`Được ${v}`);
    if (st.phase === 'choice') { busy = false; render(); save(); return; }
    await runMove();
  };
  async function runMove() {
    busy = true; render(); let n = 0;
    const before = snap(), i = st.turn;
    while (st.phase === 'moving') { const from = st.players[i].pos; const r = F.step(st); if (st.players[i].pos !== from) { await hopTo(i, st.players[i].pos); Sfx.hop(n++); focus = tokens[i].g.position.clone(); } if (r === 'choice' && st.phase === 'choice' && st.choice.kind === 'fork') { busy = false; render(); return; } }
    if (st.events.some((e) => e.kind === 'stopped')) { const e = st.events.find((x) => x.kind === 'stopped'); banner(e.why === 'rescue' ? 'Có bạn nhỏ đang khóc!' : 'Dừng lại trồng cây!'); }
    placeAll(false);
    if (st.phase === 'mini') { await runMini(before, i); return; }
    await afterAction(before, i); busy = false; render(); save();
  }
  async function runMini(before, i) {
    const m = st.mini, p = st.players[i];
    busy = true; render();
    let stars = 2;
    if (FAST && m.rescue) stars = window.__rescueStars != null ? window.__rescueStars : 2;
    if (!FAST) stars = await MINI.play(m.kind, { title: m.title, rescue: !!m.rescue, face: THUMB[p.animal], color: p.color, friendImg: m.friend ? FRIEND_IMG[m.friend] : FRIEND_IMG[F.ZONES[m.zone].friend.key], say: (x) => Voice.say(x), sfx: { good: () => Sfx.good(), bad: () => Sfx.bad(), win: () => Sfx.tree() } });
    F.miniResult(st, stars);
    await afterAction(before, i); busy = false; render(); save();
  }
  async function afterAction(before, i) {
    showDiff(before);
    const pos = tokens[i].g.position.clone();
    syncWorld(false);
    for (const e of st.events) {
      if (e.kind === 'tree') { Sfx.tree(); banner(e.n > 1 ? `+${e.n} cây ở ${F.ZONES[e.zone].name}!` : `Thêm 1 cây ở ${F.ZONES[e.zone].name}!`); burst(W.plotPos(e.zone, st.zones[e.zone].trees - 1), 'leaf', 30); }
      if (e.kind === 'cloud') { W.thunder(); Sfx.thunder(); banner('Mây đen!', true); }
      if (e.kind === 'shoo') { banner('Cò xua mây!'); burst(pos, 'confetti', 30); }
      if (e.kind === 'spray') banner('Voi phun nước!');
      if (e.kind === 'clean' || e.kind === 'gift' || e.kind === 'hug') burst(pos, e.kind === 'clean' ? 'confetti' : 'heart', 20);
      if (e.kind === 'fact') { $('factImg').src = FRIEND_IMG[F.ZONES[e.zone].friend.key]; }
      if (e.kind === 'rescueFail') banner('Lần sau thử lại nhé!', true);
    }
    if (st.result) Voice.say(st.result);
    const rescue = st.events.find((e) => e.kind === 'rescue'), restored = st.events.filter((e) => e.kind === 'restored');
    if (rescue) await rescueCinema(rescue.zone);
    for (const r of restored) await restoreCinema(r.zone);
    if (st.outcome) { await endingCinema(); showEnd(); }
  }
  async function onChoice(k) {
    if (busy || !st.choice) return;
    const kind = st.choice.kind, before = snap(), i = st.turn;
    if (!F.choose(st, k)) return;
    Sfx.item();
    if (kind === 'hop' || kind === 'fork') { if (kind === 'fork' && st.events.some((e) => e.kind === 'bridge')) banner('Qua cầu nào!'); await runMove(); return; }
    busy = true; await afterAction(before, i); busy = false; render(); save();
  }
  $('nextBtn').onclick = async () => {
    if (busy || st.phase !== 'done') return;
    const stormBefore = st.storm;
    F.endTurn(st); save(); syncWorld(false);
    if (st.outcome) { render(); busy = true; await endingCinema(); busy = false; showEnd(); return; }
    if (st.roundEvent) { const re = st.roundEvent; if (re.dirty) { banner('Rừng nhiều rác quá!', true); W.thunder(); Sfx.thunder(); } else { banner(re.time); if (st.storm > stormBefore) Sfx.thunder(); } }
    const level = Math.floor((st.storm / st.stormMax) / 0.5 + 0.0001) + (st.storm / st.stormMax >= 0.75 ? 1 : 0);
    if (level > stormSeenLevel) { stormSeenLevel = level; await stormCinema(level); }
    placeAll(false); render();
    const p = F.current(st), h = $('handover'); h.textContent = `Đến lượt ${p.name}!`; h.style.setProperty('--pc', p.color); h.hidden = false; clearTimeout(h._t); h._t = setTimeout(() => (h.hidden = true), FAST ? 0 : 1800);
    announceTurn();
  };

  // ================= Panels =================
  function render() {
    if (!st) return;
    const p = F.current(st), A = F.animalOf(p);
    $('zoneStrip').innerHTML = F.ZONES.map((z, k) => { const s = st.zones[k]; return `<div class="zchip${s.restored ? ' done' : ''}" title="${esc(z.name)}: ${esc(F.need(st, k))}" style="--zc:${z.color}"><img class="zi" src="${ICONS['zone' + k]}" alt=""><div><b>${esc(z.name)}</b><span class="zt"><img src="${ICONS.tree}" alt="cây">${s.trees}/${st.need}</span></div><img class="zf${s.rescued ? '' : ' lost'}" src="${FRIEND_IMG[z.friend.key]}" alt="${esc(z.friend.name)}"></div>`; }).join('');
    $('restoredTxt').textContent = `${F.restoredCount(st)}/5`;
    $('stormTxt').textContent = `${Math.min(st.storm, st.stormMax)}/${st.stormMax}`; $('stormBar').style.width = Math.min(100, (st.storm / st.stormMax) * 100) + '%';
    $('timeTxt').textContent = `${F.time(st)} · vòng ${st.round}`;
    $('turnPanel').style.setProperty('--pc', p.color);
    $('whoImg').src = THUMB[p.animal]; $('whoName').textContent = `Lượt của ${p.name}`; $('whoPower').textContent = A.power;
    $('rollBtn').hidden = !(st.phase === 'roll' || st.phase === 'moving' || st.phase === 'mini'); $('rollBtn').disabled = busy || st.phase !== 'roll';
    $('rollBtn').textContent = st.phase === 'moving' ? `Nhảy ${st.moveLeft} ô…` : st.phase === 'mini' ? 'Đang chơi…' : busy ? 'Chờ chút…' : 'Tung xúc xắc';
    $('nextBtn').hidden = st.phase !== 'done' || busy || !!st.outcome;
    $('result').textContent = st.phase === 'roll' ? 'Bấm tung xúc xắc nhé!' : st.result || (st.lastRoll ? `Tung được ${st.lastRoll}!` : '');
    const fact = st.events && st.events.find((e) => e.kind === 'fact'); $('factImg').hidden = !(fact && st.phase === 'done');
    const ch = $('choices');
    if (st.phase === 'choice' && st.choice && !busy) {
      ch.innerHTML = `<div class="choice-title">${esc(st.choice.title)}</div>` + st.choice.options.map((o, k) => `<button class="choice-btn${o.done ? ' zdone' : ''}" data-choice="${k}" style="--cc:${o.color || (o.zone != null ? F.ZONES[o.zone].color : '#e5ecf3')}"><img src="${ICONS[o.icon] || ICONS.paw}" alt=""><span>${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span></button>`).join('');
      ch.querySelectorAll('button').forEach((b) => (b.onclick = () => onChoice(+b.dataset.choice)));
    } else ch.innerHTML = '';
    $('friends').innerHTML = st.players.map((q, i) => `<div class="fcard${i === st.turn && !st.outcome ? ' active' : ''}" data-player="${i}" style="--pc:${q.color}"><img class="face" src="${THUMB[q.animal]}" alt=""><div><b style="color:${q.color === '#f2b632' ? '#c98a1a' : q.color}">${esc(q.name)}</b><div class="items"><span title="Hạt giống"><img src="${ICONS.seed}" alt="hạt"><i data-seeds>${q.seeds}</i></span><span title="Nước"><img src="${ICONS.water}" alt="nước"><i data-water>${q.water}</i></span><span title="Tim"><img src="${ICONS.heart}" alt="tim"><i data-hearts>${q.hearts}</i></span></div></div></div>`).join('');
  }
  function showEnd() {
    if (!st || !st.outcome) return;
    const win = st.outcome === 'win';
    $('endTitle').textContent = win ? 'Cả khu rừng đã hồi sinh!' : 'Mùa bão đã tới…';
    $('endLead').textContent = win ? `Cả nhóm đã hồi sinh 5 vùng rừng và đưa 5 bạn nhỏ về với mẹ, giành ${st.stars} ngôi sao trò chơi. Ai cũng có một huy hiệu:` : `Đã hồi sinh ${F.restoredCount(st)}/5 vùng rừng. Mình cùng thử lại nhé! Huy hiệu của các bé:`;
    $('endFriends').innerHTML = F.ZONES.map((z, k) => `<span class="${st.zones[k].rescued ? '' : 'lost'}"><img src="${FRIEND_IMG[z.friend.key]}" alt=""><small>${z.friend.name}</small></span>`).join('');
    $('badges').innerHTML = st.players.map((q, i) => { const b = F.BADGES.find((x) => x.key === st.badges[i]); return `<div class="badge" style="--pc:${q.color};animation-delay:${i * 0.15}s"><img src="${THUMB[q.animal]}" alt=""><b>${esc(q.name)}</b><span class="medal">${esc(b.name)}</span><small>${esc(b.hint)}</small></div>`; }).join('');
    $('endOverlay').hidden = false;
    Voice.say(win ? 'Hoan hô! Cả khu rừng đã hồi sinh!' : 'Mùa bão đã tới. Mình cùng thử lại nhé!');
  }

  // Test hooks (read-only), used by selftest.cjs
  window.__forest = { get state() { return st; }, get busy() { return busy || !!dieAnim || tokens.some((t) => t.hop) || cineOn; }, view() { return { webgl: !!renderer.getContext(), frames, tokens: tokens.map((t) => t.g.userData.kind), tokenTile: st ? st.players.map((p) => p.pos) : [], cuts: cutsSeen.slice(), quality: QUALITY }; } };
  window.__forestMiniBot = (kind) => MINI.play(kind, { bot: true, friendImg: FRIEND_IMG.douc, face: THUMB.bear });
  window.__banner = (t) => banner(t);
  window.__voice = () => ({ on: Voice.on, voice: Voice.voice && Voice.voice.name, waiting: Voice.queue.length, speaking: Voice.speaking, spoken: Voice.spoken, lastError: Voice.lastError, bad: [...Voice.bad], vietnamese: Voice.vi().map((x) => x.name + (x.localService ? ' (máy)' : ' (online)')), allVoices: Voice.all().length, log: Voice.log.slice() });
  window.__bridgeClear = () => W.bridgeClearance();
  window.__bannerQueue = () => ({ waiting: bannerQ.length, shown: document.querySelectorAll('.banner').length });
  window.__forestDbg = { zone(k, trees, rescued, restored) { Object.assign(st.zones[k], { trees, rescued, restored }); syncWorld(false); render(); }, time(i) { st.round = i + 1; W.setTime(i); render(); }, look(k) { focus = null; const z = zonePose(k, true); return flyTo(z.target, z.pos, 0.01); }, home() { focus = null; return flyTo(HOME_T, HOME_P, 0.01); } };
  window.__forestCine = { intro: () => introCinema(), rescue: (k) => rescueCinema(k), restore: (k) => restoreCinema(k), skip: () => { skipCine = true; } };

  resize(); requestAnimationFrame(loop); renderSetup();
})();
