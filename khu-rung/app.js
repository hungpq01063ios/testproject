/* Khu Rừng Chung Tay — game screen: setup, hot-seat turns, the dice, animal tokens, effects, voice and the ending. */
(function () {
  'use strict';
  const F = window.ForestCore, T = window.THREE, FW = window.ForestWorld;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  const qs = new URLSearchParams(location.search), FAST = qs.has('fast');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const QUALITY = FAST ? 'low' : qs.get('q') || (Math.min(innerWidth, innerHeight) < 700 ? 'low' : 'high');
  const SAVE = 'khurung.save.v1';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ICONS = {}; ['seed', 'water', 'heart', 'tree', 'cloud', 'trash', 'paw', 'hop', 'plant', 'luck', 'home', 'help'].forEach((k) => (ICONS[k] = FW.iconURL(k, 96)));
  let st = null, busy = false, frames = 0;

  // ================= Sound and voice =================
  const Sfx = {
    ctx: null, on: true,
    ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    tone(f, d, type, vol, when) { if (!this.on || !this.ctx || FAST) return; const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02); },
    rattle() { for (let i = 0; i < 8; i++) this.tone(300 + Math.random() * 500, 0.04, 'square', 0.03, i * 0.09); },
    hop(i) { this.tone(440 + (i % 4) * 80, 0.09, 'sine', 0.08); this.tone(660 + (i % 4) * 80, 0.06, 'sine', 0.05, 0.05); },
    item() { this.tone(988, 0.08, 'triangle', 0.1); this.tone(1319, 0.2, 'triangle', 0.08, 0.07); },
    tree() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.09, i * 0.08)); },
    thunder() { if (!this.on || !this.ctx || FAST) return; const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0.35; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(); },
    win() { [523, 659, 784, 1047, 880, 1047, 1319].forEach((f, i) => this.tone(f, i > 4 ? 0.6 : 0.2, 'triangle', 0.1, i * 0.14)); },
    gentle() { [392, 330, 294, 330, 392].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.08, i * 0.22)); },
  };
  document.addEventListener('pointerdown', () => Sfx.ensure(), { passive: true });
  const Voice = { on: store.get('khurung.voice') !== 'off', voice: null,
    pick() { try { const v = speechSynthesis.getVoices(); this.voice = v.find((x) => /^vi/i.test(x.lang)) || null; } catch (e) {} },
    say(text) { if (!this.on || FAST || !window.speechSynthesis) return; try { if (!this.voice) this.pick(); if (!this.voice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = this.voice; u.lang = this.voice.lang; u.rate = 0.95; u.pitch = 1.15; speechSynthesis.speak(u); } catch (e) {} } };
  try { speechSynthesis.onvoiceschanged = () => Voice.pick(); } catch (e) {}
  const toggle = (btn, obj, key) => { btn.setAttribute('aria-pressed', String(obj.on)); btn.onclick = () => { obj.on = !obj.on; btn.setAttribute('aria-pressed', String(obj.on)); if (key) store.set(key, obj.on ? 'on' : 'off'); }; };
  toggle($('soundBtn'), Sfx); toggle($('voiceBtn'), Voice, 'khurung.voice');

  // ================= Renderer and world =================
  const canvas = $('scene');
  const renderer = new T.WebGLRenderer({ canvas, antialias: QUALITY === 'high' });
  renderer.setPixelRatio(FAST ? 0.75 : Math.min(devicePixelRatio || 1, QUALITY === 'high' ? 2 : 1.25));
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = QUALITY !== 'low'; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, 0.1, 400);
  camera.position.set(0, 19, 21);
  const controls = new T.OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, maxPolarAngle: 1.2, minPolarAngle: 0.35, minDistance: 12, maxDistance: 40, enablePan: false });
  controls.target.set(0, 0, 1);
  const W = FW.build(scene, renderer, { quality: QUALITY });

  // thumbnails of each animal for the cards
  const THUMB = {};
  (function () {
    const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(192, 192); r.outputEncoding = T.sRGBEncoding;
    const sc = new T.Scene(); sc.add(new T.HemisphereLight('#ffffff', '#88aa77', 1.0)); const l = new T.DirectionalLight('#ffffff', 0.9); l.position.set(2, 4, 4); sc.add(l);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    F.ANIMALS.forEach((a, i) => {
      const m = FW.animal(a.key, F.SCARVES[i]); sc.add(m); m.rotation.y = -0.45;
      const tall = a.key === 'stork' ? 1.75 : a.key === 'turtle' ? 0.7 : 1.45; cam.position.set(0, tall * 0.62, tall * 2.6); cam.lookAt(0, tall * 0.5, 0);
      r.render(sc, cam); THUMB[a.key] = r.domElement.toDataURL(); sc.remove(m);
    });
    r.dispose();
  })();
  $('treeIcon').src = ICONS.tree; $('stormIcon').src = ICONS.cloud;

  // ================= Tokens =================
  let tokens = [];
  function slot(tileId, k, n) {
    const p = W.tilePos(tileId); p.y = 0.37;
    if (n > 1) { const a = (k / n) * Math.PI * 2; p.x += Math.cos(a) * 0.5; p.z += Math.sin(a) * 0.5; }
    return p;
  }
  function buildTokens() {
    tokens.forEach((t) => scene.remove(t.g));
    tokens = st.players.map((p) => { const g = FW.animal(p.animal, p.color); scene.add(g); return { g, hop: null, settle: null, blink: Math.random() * 4 }; });
    placeAll(true);
  }
  function placeAll(instant) {
    const groups = {}; st.players.forEach((p, i) => (groups[p.pos] = groups[p.pos] || []).push(i));
    st.players.forEach((p, i) => { const t = tokens[i]; if (!t || t.hop) return; const target = slot(p.pos, groups[p.pos].indexOf(i), groups[p.pos].length); if (instant) t.g.position.copy(target); else t.settle = target; t.g.rotation.y = Math.atan2(-target.x, -target.z); });
  }
  function hopTo(i, tileId) {
    const t = tokens[i], from = t.g.position.clone(), to = slot(tileId, 0, 1);
    t.g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    if (FAST) { t.g.position.copy(to); return Promise.resolve(); }
    return new Promise((res) => { t.hop = { from, to, t: 0, dur: reduced ? 0.12 : 0.34, res }; });
  }

  // ================= Dice =================
  const dcan = $('dice'), dr = new T.WebGLRenderer({ canvas: dcan, antialias: true, alpha: true });
  dr.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); dr.setSize(120, 120, false); dr.outputEncoding = T.sRGBEncoding;
  const ds = new T.Scene(), dcam = new T.PerspectiveCamera(32, 1, 0.1, 20); dcam.position.set(0, 3.0, 2.9); dcam.lookAt(0, 0, 0);
  ds.add(new T.HemisphereLight('#ffffff', '#c9d6e6', 1.0)); const dl = new T.DirectionalLight('#ffffff', 0.7); dl.position.set(2, 4, 3); ds.add(dl);
  const PIPS = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]] };
  const faceMat = (n) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#c9d2de'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fffdf6'; g.beginPath(); g.roundRect ? g.roundRect(6, 6, 116, 116, 22) : g.rect(6, 6, 116, 116); g.fill(); g.fillStyle = n === 1 ? '#e2483d' : '#233049'; PIPS[n].forEach(([x, y]) => { g.beginPath(); g.arc(x * 128, y * 128, n === 1 ? 20 : 13, 0, Math.PI * 2); g.fill(); }); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshStandardMaterial({ map: t, roughness: 0.4 }); };
  // BoxGeometry face order +x −x +y −y +z −z ; opposite faces add up to 7
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
  die.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 1, 0));

  // ================= Effects =================
  function screenOf(v) { const p = v.clone().project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height, ok: p.z < 1 }; }
  function pop(i, icon, text, delay) {
    const t = tokens[i]; if (!t) return;
    setTimeout(() => { const s = screenOf(t.g.position.clone().add(new T.Vector3(0, 1.8, 0))); if (!s.ok) return; const el = document.createElement('div'); el.className = 'pop'; el.innerHTML = (icon ? `<img src="${ICONS[icon]}" alt="">` : '') + esc(text); el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; $('fxLayer').appendChild(el); setTimeout(() => el.remove(), 1700); }, FAST ? 0 : delay || 0);
  }
  function banner(text, dark) { if (FAST) return; const el = document.createElement('div'); el.className = 'banner' + (dark ? ' dark' : ''); el.textContent = text; document.body.appendChild(el); setTimeout(() => el.remove(), 2000); }
  const parts = [], confGeo = new T.PlaneGeometry(0.2, 0.12), leafGeo = new T.CircleGeometry(0.12, 6);
  const confM = ['#e2483d', '#ffcf3f', '#3fbf6f', '#3fa7e6', '#ff6f91', '#8c5ad6'].map((c) => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
  function burst(pos, kind, n) { if (FAST) return; for (let i = 0; i < (reduced ? Math.min(n, 12) : n); i++) { const m = new T.Mesh(kind === 'leaf' ? leafGeo : confGeo, kind === 'leaf' ? confM[2] : confM[i % confM.length]); m.position.copy(pos).add(new T.Vector3(0, 1, 0)); scene.add(m); const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3; parts.push({ m, v: new T.Vector3(Math.cos(a) * sp * 0.5, 3 + Math.random() * 4, Math.sin(a) * sp * 0.5), life: 2 + Math.random() }); } }
  const snap = () => st.players.map((p) => ({ seeds: p.seeds, water: p.water, hearts: p.hearts }));
  function showDiff(before) {
    let d = 0;
    st.players.forEach((p, i) => { const b = before[i]; [['seeds', 'seed'], ['water', 'water'], ['hearts', 'heart']].forEach(([k, ic]) => { const v = p[k] - b[k]; if (v) { pop(i, ic, (v > 0 ? '+' : '−') + Math.abs(v), d); d += 180; if (v > 0) Sfx.item(); } }); });
  }

  // ================= Camera =================
  const HOME_T = new T.Vector3(0, 0, 1), HOME_P = new T.Vector3(0, 19, 21);
  let focus = null;
  controls.addEventListener('start', () => { focus = null; });

  // ================= Loop =================
  let last = performance.now();
  function resize() { const r = $('stage').getBoundingClientRect(); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize);
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now; frames++;
    tokens.forEach((tk, i) => {
      const u = tk.g.userData;
      if (tk.hop) { const h = tk.hop; h.t += dt; const k = Math.min(1, h.t / h.dur); tk.g.position.lerpVectors(h.from, h.to, k); tk.g.position.y = h.from.y + Math.sin(k * Math.PI) * 0.9; u.body.scale.set(1 - Math.sin(k * Math.PI) * 0.08, 1 + Math.sin(k * Math.PI) * 0.14, 1); if (k >= 1) { tk.hop = null; u.body.scale.set(1.12, 0.86, 1.12); h.res(); } }
      else if (tk.settle) { tk.g.position.lerp(tk.settle, Math.min(1, dt * 8)); if (tk.g.position.distanceTo(tk.settle) < 0.01) tk.settle = null; }
      u.body.scale.lerp(new T.Vector3(1, 1 + Math.sin(t * 3 + i) * 0.02, 1), Math.min(1, dt * 8));
      tk.blink -= dt; const closed = tk.blink < 0.12; if (tk.blink < 0) tk.blink = 2 + Math.random() * 3; u.eyes.forEach((e) => (e.scale.y = closed ? 0.1 : 1));
      if (u.tail) u.tail.rotation.x = Math.sin(t * 4 + i) * 0.12;
      if (st && i === st.turn && !st.outcome) u.head.rotation.z = Math.sin(t * 2.5) * 0.08; else u.head.rotation.z = 0;
    });
    const want = focus ? HOME_T.clone().lerp(focus, 0.35) : HOME_T;
    controls.target.lerp(want, Math.min(1, dt * 2));
    controls.update();
    W.update(dt, t);
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.v.y -= 8 * dt; p.v.multiplyScalar(1 - dt); p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 6; p.m.rotation.y += dt * 4; if (p.m.position.y < 0.1) { p.m.position.y = 0.1; p.v.set(0, 0, 0); } if (p.life < 0) { scene.remove(p.m); parts.splice(i, 1); } }
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
    $('resumeBtn').hidden = !(saved && saved.version === 1 && !saved.outcome);
  }
  $('startBtn').onclick = () => { Sfx.ensure(); start(F.newGame(picks.map((p) => ({ animal: p.animal, name: (p.name || '').trim() })), qs.has('seed') ? +qs.get('seed') : undefined)); };
  $('resumeBtn').onclick = () => { try { start(JSON.parse(store.get(SAVE))); } catch (e) {} };
  $('newBtn').onclick = () => showSetup();
  $('againBtn').onclick = () => start(F.newGame(st.players.map((p) => ({ animal: p.animal, name: p.name }))));
  $('pickBtn').onclick = () => showSetup();
  function showSetup() { $('setup').hidden = false; $('endOverlay').hidden = true; ['meters', 'turnPanel', 'friends'].forEach((id) => ($(id).hidden = true)); $('newBtn').hidden = true; W.reset(); tokens.forEach((t) => scene.remove(t.g)); tokens = []; renderSetup(); resize(); }
  function start(state) {
    st = state; busy = false; W.reset(); W.ending(null);
    $('setup').hidden = true; $('endOverlay').hidden = true; ['meters', 'turnPanel', 'friends'].forEach((id) => ($(id).hidden = false)); $('newBtn').hidden = false;
    resize(); buildTokens(); W.setTrees(st.trees, st.plots.map((i) => st.players[i].color), true); W.__shown = st.trees; W.setTrash(st.trash); W.setStorm(st.storm, st.stormMax); W.setGreen(st.trees, st.goal); W.setPlots(st.goal);
    render(); save(); announceTurn();
  }
  const save = () => store.set(SAVE, JSON.stringify(st));

  // ================= Turn flow =================
  const wait = (ms) => new Promise((r) => (FAST || !ms ? r() : setTimeout(r, ms)));
  function announceTurn() { const p = F.current(st); focus = tokens[st.turn] ? tokens[st.turn].g.position.clone() : null; Voice.say(`Đến lượt bạn ${p.name}`); }
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
    while (st.phase === 'moving') { const r = F.step(st); await hopTo(i, st.players[i].pos); Sfx.hop(n++); if (r === 'step') { /* keep hopping */ } }
    placeAll(false); afterAction(before, i); busy = false; render(); save();
  }
  function afterAction(before, i) {
    showDiff(before);
    const ev = st.lastEvent, p = st.players[i], pos = tokens[i].g.position.clone();
    W.setTrash(st.trash); W.setStorm(st.storm, st.stormMax);
    if (st.trees > W.__shown) { W.setTrees(st.trees, st.plots.map((k) => st.players[k].color)); W.setGreen(st.trees, st.goal); Sfx.tree(); banner(st.trees - W.__shown > 1 ? `+${st.trees - W.__shown} cây mới!` : 'Thêm 1 cây mới!'); burst(pos, 'leaf', 30); }
    W.__shown = st.trees;
    if (ev && ev.kind === 'cloud') { W.thunder(); Sfx.thunder(); banner('Mây đen!', true); }
    if (ev && ev.kind === 'shoo') { banner('Cò xua mây!'); burst(pos, 'confetti', 30); }
    if (ev && ev.kind === 'spray') { banner('Voi phun nước!'); }
    if (ev && ev.kind === 'clean') { burst(pos, 'confetti', 24); }
    if (ev && (ev.kind === 'gift' || ev.kind === 'hug')) { burst(pos, 'confetti', 20); }
    if (st.result) Voice.say(st.result);
    if (st.outcome) setTimeout(showEnd, FAST ? 0 : 1600);
  }
  function onChoice(k) {
    if (busy || !st.choice) return;
    const kind = st.choice.kind, before = snap(), i = st.turn;
    if (!F.choose(st, k)) return;
    Sfx.item();
    if (kind === 'hop') { runMove(); return; }
    afterAction(before, i); render(); save();
  }
  $('nextBtn').onclick = () => {
    if (busy || st.phase !== 'done') return;
    const stormBefore = st.storm;
    F.endTurn(st); save();
    W.setTrash(st.trash); W.setStorm(st.storm, st.stormMax);
    if (st.outcome) { render(); showEnd(); return; }
    if (st.roundEvent) { const re = st.roundEvent; if (re.dirty) { banner('Rừng nhiều rác quá!', true); W.thunder(); Sfx.thunder(); } else if (st.storm > stormBefore) Sfx.thunder(); }
    placeAll(false); render();
    const p = F.current(st), h = $('handover'); h.textContent = `Đến lượt ${p.name}!`; h.style.setProperty('--pc', p.color); h.hidden = false; clearTimeout(h._t); h._t = setTimeout(() => (h.hidden = true), FAST ? 0 : 1800);
    announceTurn();
  };

  // ================= Panels =================
  function render() {
    if (!st) return;
    const p = F.current(st), A = F.animalOf(p);
    $('treeTxt').textContent = `${st.trees}/${st.goal}`; $('treeBar').style.width = Math.min(100, (st.trees / st.goal) * 100) + '%';
    $('stormTxt').textContent = `${Math.min(st.storm, st.stormMax)}/${st.stormMax}`; $('stormBar').style.width = Math.min(100, (st.storm / st.stormMax) * 100) + '%';
    $('turnPanel').style.setProperty('--pc', p.color);
    $('whoImg').src = THUMB[p.animal]; $('whoName').textContent = `Lượt của ${p.name}`; $('whoPower').textContent = A.power;
    $('rollBtn').hidden = !(st.phase === 'roll' || st.phase === 'moving'); $('rollBtn').disabled = busy || st.phase !== 'roll';
    $('rollBtn').textContent = st.phase === 'moving' ? `Nhảy ${st.moveLeft} ô…` : busy ? 'Đang tung…' : 'Tung xúc xắc';
    $('nextBtn').hidden = st.phase !== 'done' || busy || !!st.outcome;
    $('result').textContent = st.phase === 'roll' ? 'Bấm tung xúc xắc nhé!' : st.result || (st.lastRoll ? `Tung được ${st.lastRoll}!` : '');
    const ch = $('choices');
    if (st.phase === 'choice' && st.choice && !busy) {
      ch.innerHTML = `<div class="choice-title">${esc(st.choice.title)}</div>` + st.choice.options.map((o, k) => `<button class="choice-btn" data-choice="${k}" style="--cc:${o.color || '#e5ecf3'}"><img src="${ICONS[o.icon] || ICONS.paw}" alt="">${esc(o.label)}</button>`).join('');
      ch.querySelectorAll('button').forEach((b) => (b.onclick = () => onChoice(+b.dataset.choice)));
    } else ch.innerHTML = '';
    $('friends').innerHTML = st.players.map((q, i) => `<div class="fcard${i === st.turn && !st.outcome ? ' active' : ''}" data-player="${i}" style="--pc:${q.color}"><img class="face" src="${THUMB[q.animal]}" alt=""><div><b style="color:${q.color === '#f2b632' ? '#c98a1a' : q.color}">${esc(q.name)}</b><div class="items"><span title="Hạt giống"><img src="${ICONS.seed}" alt="hạt"><i data-seeds>${q.seeds}</i></span><span title="Nước"><img src="${ICONS.water}" alt="nước"><i data-water>${q.water}</i></span><span title="Tim"><img src="${ICONS.heart}" alt="tim"><i data-hearts>${q.hearts}</i></span></div></div></div>`).join('');
  }
  function showEnd() {
    if (!st || !st.outcome) return;
    const win = st.outcome === 'win';
    W.ending(st.outcome); if (win) { Sfx.win(); st.players.forEach((q, i) => burst(tokens[i].g.position.clone(), 'confetti', 50)); } else Sfx.gentle();
    $('endTitle').textContent = win ? 'Khu rừng xanh tươi rồi!' : 'Mùa bão đã tới…';
    $('endLead').textContent = win ? `Cả nhóm đã trồng ${st.trees} cây. Các bạn thú cảm ơn các bé! Ai cũng có một huy hiệu:` : `Rừng có ${st.trees}/${st.goal} cây, các cây đã che chở cho các bạn thú. Mình cùng thử lại, trồng nhanh hơn nhé! Huy hiệu của các bé:`;
    $('badges').innerHTML = st.players.map((q, i) => { const b = F.BADGES.find((x) => x.key === st.badges[i]); return `<div class="badge" style="--pc:${q.color};animation-delay:${i * 0.15}s"><img src="${THUMB[q.animal]}" alt=""><b>${esc(q.name)}</b><span class="medal">${esc(b.name)}</span><small>${esc(b.hint)}</small></div>`; }).join('');
    $('endOverlay').hidden = false;
    Voice.say(win ? 'Hoan hô! Khu rừng xanh tươi rồi!' : 'Mùa bão đã tới. Mình cùng thử lại nhé!');
  }

  // Test hook (read-only), used by selftest.cjs
  window.__forest = { get state() { return st; }, get busy() { return busy || !!dieAnim || tokens.some((t) => t.hop); }, view() { return { webgl: !!renderer.getContext(), frames, tokens: tokens.map((t) => t.g.userData.kind), tokenTile: st ? st.players.map((p) => p.pos) : [], trees: W.__shown || 0, quality: QUALITY }; } };

  W.__shown = 0;
  resize(); requestAnimationFrame(loop); renderSetup();
})();
