/* Đường Đời — game screen: UI panels, the motorbike tokens, camera, effects and the hot-seat turn flow. */
(function () {
  'use strict';
  const L = window.LifeCore, T = window.THREE;
  const qs = new URLSearchParams(location.search);
  const FAST = qs.has('fast');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SAVE_KEY = 'duongdoi.save.v1', Q_KEY = 'duongdoi.quality';
  const DEFAULT_NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Hoa', 'Khoa'];
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  let st = null, busy = false, count = 3, overDismissed = false, frames = 0;
  const names = DEFAULT_NAMES.slice();
  const QUALITY = FAST ? 'low' : qs.get('q') || store.get(Q_KEY) || (Math.min(innerWidth, innerHeight) < 700 ? 'low' : 'high');
  $('qualityBtn').textContent = 'Đồ hoạ: ' + (QUALITY === 'high' ? 'cao' : 'nhẹ');
  $('qualityBtn').onclick = () => { store.set(Q_KEY, QUALITY === 'high' ? 'low' : 'high'); save(); location.reload(); };

  // ================= Sound =================
  const Sfx = {
    ctx: null, on: true,
    ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    tone(f, d, type, vol, when) {
      if (!this.on || !this.ctx || FAST) return;
      const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
    },
    tick() { this.tone(2100, 0.03, 'square', 0.035); },
    step(i) { this.tone(520 + (i % 4) * 60, 0.05, 'triangle', 0.035); },
    coin() { this.tone(988, 0.09, 'sine', 0.14); this.tone(1319, 0.3, 'sine', 0.14, 0.08); },
    bad() { this.tone(260, 0.2, 'sawtooth', 0.05); this.tone(185, 0.3, 'sawtooth', 0.05, 0.12); },
    star() { this.tone(1568, 0.12, 'triangle', 0.08); this.tone(2093, 0.25, 'triangle', 0.07, 0.07); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i > 3 ? 0.5 : 0.18, 'triangle', 0.1, i * 0.12)); },
    chime() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.06, i * 0.09)); },
    choose() { this.tone(660, 0.07, 'sine', 0.08); },
  };
  document.addEventListener('pointerdown', () => Sfx.ensure(), { passive: true });
  $('soundBtn').onclick = () => { Sfx.on = !Sfx.on; $('soundBtn').textContent = 'Âm thanh: ' + (Sfx.on ? 'bật' : 'tắt'); $('soundBtn').setAttribute('aria-pressed', String(Sfx.on)); };

  // Colour management: hex colours are sRGB and get converted to linear, so the scene isn't washed out.
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  // ================= Renderer, world =================
  const canvas = $('scene');
  const renderer = new T.WebGLRenderer({ canvas, antialias: QUALITY === 'high', powerPreference: 'high-performance' });
  renderer.setPixelRatio(FAST ? 0.75 : QUALITY === 'high' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.25));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = QUALITY !== 'low'; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 900);
  camera.position.set(0, 42, 44);
  const controls = new T.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.07; controls.maxPolarAngle = 1.36; controls.minDistance = 5; controls.maxDistance = 90;
  controls.target.set(0, 0, 1); controls.autoRotate = true; controls.autoRotateSpeed = 0.3;
  const W = window.DDWorld.build(scene, renderer, { quality: QUALITY });
  const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o || {}));
  function mesh(geo, m, x, y, z) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; return o; }

  // ================= Motorbike carrying the family =================
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  const skin = mat('#f1c9a0', { roughness: 0.7 });
  const eyeM = mat('#1a1410', { roughness: 0.3 }), hairM = mat('#2a1d17');
  function person(shirt, s, helmetColor) {
    const g = new T.Group();
    g.add(mesh(new T.CapsuleGeometry(0.11 * s, 0.2 * s, 4, 10), mat(shirt), 0, 0.2 * s, 0));
    g.add(mesh(new T.SphereGeometry(0.105 * s, 16, 12), skin, 0.01, 0.47 * s, 0));
    for (const z of [-0.035, 0.035]) g.add(mesh(new T.SphereGeometry(0.016 * s, 6, 4), eyeM, 0.105 * s, 0.48 * s, z * s));
    g.add(mesh(new T.SphereGeometry(0.11 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairM, -0.01 * s, 0.49 * s, 0));
    if (helmetColor) { const h = mesh(new T.SphereGeometry(0.125 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(helmetColor, { roughness: 0.3 }), 0.01, 0.48 * s, 0); g.add(h); }
    else { const hat = mesh(new T.ConeGeometry(0.2 * s, 0.11 * s, 18), mat('#e9d08a', { roughness: 0.8 }), 0.01, 0.6 * s, 0); g.add(hat); } // nón lá
    const arm = mesh(new T.CapsuleGeometry(0.035 * s, 0.22 * s, 3, 6), mat(shirt), 0.12 * s, 0.25 * s, 0.12 * s); arm.rotation.z = -1.0; g.add(arm);
    const arm2 = arm.clone(); arm2.position.z = -0.12 * s; g.add(arm2);
    return g;
  }
  // ---- vehicles: bus → bicycle → motorbike → car → luxury car, chosen by net worth ----
  function wheelGroup(x, y, z, r, tube, dark, chrome) {
    const w = new T.Group(); w.position.set(x, y, z);
    const tyre = mesh(new T.TorusGeometry(r, tube, 10, 26), dark); w.add(tyre);
    const hub = mesh(new T.CylinderGeometry(r * 0.45, r * 0.45, tube * 1.6, 14), chrome); hub.rotation.x = Math.PI / 2; w.add(hub);
    for (let k = 0; k < 3; k++) { const sp = mesh(new T.BoxGeometry(r * 1.8, 0.018, 0.018), chrome); sp.rotation.z = k * Math.PI / 3; w.add(sp); }
    return w;
  }
  // Rider, spouse and up to three kids at slots [x, y, z, scale]; helmets on two wheels only.
  function family(g, color, slots, helmets) {
    const [rp, sp, ...kp] = slots;
    const rider = person(color, rp[3] || 1, helmets ? color : '#2a1d17'); rider.position.set(rp[0], rp[1], rp[2]); g.add(rider);
    const spouse = person('#f3e8d6', sp[3] || 0.95, helmets ? null : '#2a1d17'); spouse.position.set(sp[0], sp[1], sp[2]); g.add(spouse);
    const kids = ['#ffd36b', '#9fd6c3', '#ffb3c8'].map((c, i) => { const k = person(c, (kp[i] && kp[i][3]) || 0.62, helmets ? c : '#2a1d17'); if (kp[i]) k.position.set(kp[i][0], kp[i][1], kp[i][2]); else k.visible = false; k.userData.slot = !!kp[i]; g.add(k); return k; });
    return { rider, spouse, kids };
  }
  function vehicleModels(color) {
    const body = mat(color, { roughness: 0.25, metalness: 0.35 }), dark = mat('#1f1c1c', { roughness: 0.55 }), chrome = mat('#dfe3e6', { metalness: 0.95, roughness: 0.18 });
    const glass = new T.MeshStandardMaterial({ color: '#9fc6e0', metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.38, depthWrite: false });
    const lampM = new T.MeshStandardMaterial({ color: '#fff6cf', emissive: '#ffe59a', emissiveIntensity: 1.4 });
    const lampGlow = (g, x, y, z) => { g.add(mesh(new T.SphereGeometry(0.06, 12, 8), lampM, x, y, z)); const lg = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffe8a8', blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 })); lg.position.set(x + 0.06, y, z); lg.scale.setScalar(0.5); g.add(lg); };
    const V = {};
    // Motorbike
    (function () {
      const g = new T.Group(), wheels = [];
      for (const x of [-0.42, 0.44]) { const w = wheelGroup(x, 0.22, 0, 0.17, 0.06, dark, chrome); wheels.push(w); g.add(w); }
      const shell = mesh(new T.CapsuleGeometry(0.15, 0.48, 6, 14), body, -0.08, 0.44, 0); shell.rotation.z = Math.PI / 2; shell.scale.set(1, 1, 0.95); g.add(shell);
      const front = mesh(new T.CapsuleGeometry(0.12, 0.22, 6, 12), body, 0.36, 0.55, 0); front.rotation.z = -0.35; g.add(front);
      const seat = mesh(new T.CapsuleGeometry(0.11, 0.4, 4, 10), dark, -0.14, 0.62, 0); seat.rotation.z = Math.PI / 2; g.add(seat);
      const bar = mesh(new T.CylinderGeometry(0.022, 0.022, 0.56, 8), chrome, 0.44, 0.83, 0); bar.rotation.x = Math.PI / 2; g.add(bar);
      lampGlow(g, 0.53, 0.7, 0);
      g.add(mesh(new T.BoxGeometry(0.04, 0.06, 0.14), new T.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff2a1a', emissiveIntensity: 1 }), -0.47, 0.55, 0));
      const f = family(g, color, [[0.02, 0.6, 0], [-0.27, 0.6, 0], [0.24, 0.62, 0], [-0.48, 0.62, 0], [-0.12, 0.64, 0]], true);
      g.scale.setScalar(1.35); V.motorbike = Object.assign({ g, wheels }, f);
    })();
    // Bicycle
    (function () {
      const g = new T.Group(), wheels = [], rod = (x1, y1, x2, y2, r) => { const len = Math.hypot(x2 - x1, y2 - y1); const m = mesh(new T.CylinderGeometry(r || 0.018, r || 0.018, len, 6), body, (x1 + x2) / 2, (y1 + y2) / 2, 0); m.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2; g.add(m); };
      for (const x of [-0.42, 0.42]) { const w = wheelGroup(x, 0.26, 0, 0.24, 0.022, dark, chrome); wheels.push(w); g.add(w); }
      rod(-0.42, 0.26, -0.05, 0.28); rod(-0.05, 0.28, 0.32, 0.58); rod(-0.05, 0.28, -0.12, 0.62); rod(-0.42, 0.26, -0.12, 0.62); rod(-0.12, 0.62, 0.32, 0.6); rod(0.42, 0.26, 0.34, 0.74);
      const bar = mesh(new T.CylinderGeometry(0.016, 0.016, 0.42, 6), chrome, 0.34, 0.76, 0); bar.rotation.x = Math.PI / 2; g.add(bar);
      g.add(mesh(new T.BoxGeometry(0.18, 0.04, 0.1), dark, -0.12, 0.64, 0));
      g.add(mesh(new T.BoxGeometry(0.3, 0.03, 0.16), chrome, -0.36, 0.56, 0));
      const basket = mesh(new T.CylinderGeometry(0.13, 0.1, 0.14, 12, 1, true), mat('#c9a865', { side: T.DoubleSide }), 0.5, 0.66, 0); g.add(basket);
      const f = family(g, color, [[-0.1, 0.62, 0], [-0.38, 0.55, 0], [0.5, 0.58, 0, 0.5]], true);
      g.scale.setScalar(1.35); V.bicycle = Object.assign({ g, wheels }, f);
    })();
    // Car and luxury car share a profile; the luxury one is taller, longer and darker.
    function car(lux) {
      const g = new T.Group(), wheels = [], L2 = lux ? 0.95 : 0.82, H = lux ? 0.88 : 0.74, sh = new T.Shape(), c = lux ? new T.Color(color).multiplyScalar(0.55).getStyle() : color;
      sh.moveTo(-L2, 0.16); sh.lineTo(L2, 0.16); sh.quadraticCurveTo(L2 + 0.12, 0.2, L2 + 0.06, 0.46); sh.lineTo(L2 * 0.35, 0.5); sh.lineTo(-L2 * 0.92, 0.5); sh.quadraticCurveTo(-L2 - 0.08, 0.46, -L2, 0.16);
      const geo = new T.ExtrudeGeometry(sh, { depth: lux ? 0.7 : 0.62, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 }); geo.translate(0, 0, -(lux ? 0.35 : 0.31));
      g.add(mesh(geo, mat(c, { metalness: lux ? 0.7 : 0.45, roughness: lux ? 0.2 : 0.3 })));
      const cab = new T.Shape(); cab.moveTo(-L2 * 0.82, 0.5); cab.lineTo(L2 * 0.3, 0.5); cab.lineTo(L2 * 0.02, H); cab.lineTo(-L2 * 0.7, H); cab.lineTo(-L2 * 0.82, 0.5);
      const cg = new T.ExtrudeGeometry(cab, { depth: lux ? 0.64 : 0.56, bevelEnabled: false }); cg.translate(0, 0, -(lux ? 0.32 : 0.28));
      const cabin = new T.Mesh(cg, glass); g.add(cabin);
      g.add(mesh(new T.BoxGeometry(L2 * 0.74, 0.04, lux ? 0.66 : 0.58), mat(c, { metalness: 0.5 }), -L2 * 0.34, H, 0));
      if (lux) { for (const z of [-0.26, 0.26]) g.add(mesh(new T.BoxGeometry(0.6, 0.03, 0.03), chrome, -0.3, H + 0.06, z)); }
      for (const [x, z] of [[-L2 * 0.62, -0.32], [L2 * 0.62, -0.32], [-L2 * 0.62, 0.32], [L2 * 0.62, 0.32]]) { const w = new T.Group(); w.position.set(x, 0.17, z * (lux ? 1.08 : 1)); const t2 = mesh(new T.CylinderGeometry(lux ? 0.19 : 0.16, lux ? 0.19 : 0.16, 0.12, 18), dark); t2.rotation.x = Math.PI / 2; w.add(t2); const cap = mesh(new T.CylinderGeometry(0.08, 0.08, 0.13, 10), chrome); cap.rotation.x = Math.PI / 2; w.add(cap); wheels.push(w); g.add(w); }
      for (const z of [-0.2, 0.2]) lampGlow(g, L2 + 0.08, 0.36, z);
      const f = family(g, color, [[0.0, 0.22, -0.14, 0.78], [0.0, 0.22, 0.14, 0.74], [-L2 * 0.5, 0.24, -0.16, 0.52], [-L2 * 0.5, 0.24, 0.0, 0.52], [-L2 * 0.5, 0.24, 0.16, 0.52]], false);
      g.scale.setScalar(1.15); return Object.assign({ g, wheels }, f);
    }
    V.car = car(false); V.suv = car(true);
    // City bus: the player rides by the window, family behind.
    (function () {
      const g = new T.Group(), wheels = [];
      const win = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#f2ead6'; x.fillRect(0, 0, 256, 64); x.fillStyle = color; x.fillRect(0, 44, 256, 12); x.fillStyle = '#2d4152'; for (let i = 0; i < 6; i++) x.fillRect(8 + i * 41, 8, 34, 28); const t = new T.CanvasTexture(x.canvas); t.encoding = T.sRGBEncoding; return t; })();
      const side = new T.MeshStandardMaterial({ map: win, roughness: 0.5 }), plain = mat('#f2ead6');
      g.add(mesh(new T.BoxGeometry(1.9, 0.72, 0.7), [plain, plain, plain, plain, side, side], 0, 0.56, 0));
      g.add(mesh(new T.BoxGeometry(0.04, 0.4, 0.6), glass, 0.96, 0.68, 0));
      for (const [x, z] of [[-0.6, -0.33], [0.6, -0.33], [-0.6, 0.33], [0.6, 0.33]]) { const w = new T.Group(); w.position.set(x, 0.18, z); const t2 = mesh(new T.CylinderGeometry(0.17, 0.17, 0.12, 16), dark); t2.rotation.x = Math.PI / 2; w.add(t2); wheels.push(w); g.add(w); }
      const sign = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#1d1d26'; x.fillRect(0, 0, 128, 32); x.fillStyle = '#ffcc33'; x.font = '700 22px sans-serif'; x.textAlign = 'center'; x.fillText('BUÝT 01', 64, 24); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })();
      const sg = mesh(new T.PlaneGeometry(0.5, 0.12), new T.MeshBasicMaterial({ map: sign }), 0.965, 0.84, 0); sg.rotation.y = Math.PI / 2; g.add(sg);
      for (const z of [-0.22, 0.22]) lampGlow(g, 0.96, 0.32, z);
      const f = family(g, color, [[0.55, 0.35, 0.18, 0.8], [0.2, 0.35, 0.18, 0.78], [-0.15, 0.35, 0.18, 0.55], [-0.45, 0.35, 0.18, 0.55], [-0.15, 0.35, -0.18, 0.55]], false);
      g.scale.setScalar(0.95); V.bus = Object.assign({ g, wheels }, f);
    })();
    return V;
  }
  function makeBike(color) {
    const V = vehicleModels(color), holder = new T.Group();
    Object.values(V).forEach((v) => { v.g.visible = false; holder.add(v.g); });
    const ring = new T.Mesh(new T.RingGeometry(0.72, 0.86, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; holder.add(ring);
    const tok = { group: holder, V, ring, tile: 0, drive: null, settle: null, vehicle: null };
    setVehicle(tok, 'bicycle');
    return tok;
  }
  function setVehicle(tok, key) {
    if (tok.vehicle === key || !tok.V[key]) return;
    if (tok.vehicle) tok.V[tok.vehicle].g.visible = false;
    const v = tok.V[key]; v.g.visible = true; tok.vehicle = key;
    tok.body = v.g; tok.wheels = v.wheels; tok.spouse = v.spouse; tok.kids = v.kids;
  }
  let bikes = [];
  function buildBikes() {
    bikes.forEach((b) => scene.remove(b.group));
    bikes = st.players.map((p) => { const b = makeBike(p.color); scene.add(b.group); b.tile = p.pos; return b; });
    placeAll(true);
  }
  function slotPos(tileId, k, n) {
    const v = W.tilePos(tileId); v.y = W.topOf(tileId);
    if (n > 1) { const t = W.tangent(tileId), side = new T.Vector3(-t.z, 0, t.x); const off = (k - (n - 1) / 2) * 0.55; v.addScaledVector(side, off).addScaledVector(t, (k % 2 ? -0.25 : 0.25)); }
    return v;
  }
  function faceAlong(b, tileId) { const t = W.tangent(tileId); b.group.rotation.y = -Math.atan2(t.z, t.x); }
  function placeAll(instant) {
    const groups = {}; st.players.forEach((p, i) => (groups[p.pos] = groups[p.pos] || []).push(i));
    st.players.forEach((p, i) => {
      const b = bikes[i]; if (!b || b.drive) return; const grp = groups[p.pos];
      const target = slotPos(p.pos, grp.indexOf(i), grp.length);
      if (instant) { b.group.position.copy(target); faceAlong(b, p.pos); } else b.settle = target;
      b.tile = p.pos;
      setVehicle(b, p.vehicle || 'bicycle');
      b.spouse.visible = p.married; b.kids.forEach((k, j) => (k.visible = k.userData.slot && j < p.kids));
      b.ring.visible = i === st.turn && st.phase !== 'over';
    });
  }
  const smooth01 = (k) => k * k * (3 - 2 * k);
  function drive(i, fromId, toId, first, last) {
    const b = bikes[i], c = W.curve(fromId, toId); b.tile = toId;
    if (!c || FAST) { b.group.position.copy(W.tilePos(toId)).setY(W.topOf(toId)); faceAlong(b, toId); return Promise.resolve(); }
    const len = c.getLength(), speed = reduced ? 14 : 6.2;
    const dur = len / speed * (first && last ? 1.5 : first || last ? 1.25 : 1);
    return new Promise((res) => { b.drive = { c, t: 0, dur, first, last, from: b.group.position.clone(), res, fromTop: W.topOf(fromId) - W.tilePos(fromId).y, toTop: W.topOf(toId) - W.tilePos(toId).y }; });
  }
  function updateBike(b, dt, now) {
    if (b.drive) {
      const d = b.drive; d.t += dt; let k = Math.min(1, d.t / d.dur);
      const easeIn = (x) => x * x * (2 - x), easeOut = (x) => 1 - easeIn(1 - x);
      const u = Math.min(1, Math.max(0, d.first && d.last ? smooth01(k) : d.first ? easeIn(k) : d.last ? easeOut(k) : k));
      const p = d.c.getPointAt(u), tg = d.c.getTangentAt(u);
      const lift = 0.05 + d.fromTop * Math.max(0, 1 - u * 6) + d.toTop * Math.max(0, u * 6 - 5);
      p.y += lift;
      if (u < 0.12) p.lerp(d.from, (1 - u / 0.12) * 0.6);
      b.group.position.copy(p);
      const yaw = -Math.atan2(tg.z, tg.x), tg2 = d.c.getTangentAt(Math.min(1, u + 0.04));
      const turn = tg.x * tg2.z - tg.z * tg2.x;
      b.group.rotation.set(0, yaw, 0); b.body.rotation.set(-turn * 6, 0, Math.asin(Math.max(-0.6, Math.min(0.6, tg.y))));
      b.wheels.forEach((w) => (w.rotation.z -= dt * 22));
      if (k >= 1) { b.drive = null; b.body.rotation.set(0, 0, 0); d.res(); }
      if (b.vehicle === 'car' || b.vehicle === 'suv' || b.vehicle === 'bus') b.body.rotation.x *= 0.3;
    } else if (b.settle) {
      b.group.position.lerp(b.settle, Math.min(1, dt * 8)); if (b.group.position.distanceTo(b.settle) < 0.01) b.settle = null;
    }
    if (b.ring.visible) b.ring.material.opacity = 0.55 + Math.sin(now / 250) * 0.3;
    b.body.position.y = b.drive ? Math.abs(Math.sin(now / 60)) * 0.012 : 0;
  }

  // ================= Effects =================
  const fx = [];
  const confGeo = new T.PlaneGeometry(0.17, 0.1), coinGeo = new T.CylinderGeometry(0.13, 0.13, 0.035, 16);
  const confMats = ['#e2483d', '#e7b93c', '#3fa7a0', '#8c7ae6', '#f6ecdb', '#ff8fb0'].map((c) => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
  const coinMat = new T.MeshStandardMaterial({ color: '#f2c443', metalness: 0.9, roughness: 0.2, emissive: '#6a4800', emissiveIntensity: 0.4 });
  function burst(pos, kind, n) {
    if (FAST) return; n = reduced ? Math.min(n, 12) : n;
    for (let i = 0; i < n; i++) {
      const m = kind === 'coin' ? new T.Mesh(coinGeo, coinMat) : new T.Mesh(confGeo, confMats[i % confMats.length]);
      m.position.copy(pos).add(new T.Vector3(0, 1.2, 0));
      const a = Math.random() * Math.PI * 2, sp = kind === 'coin' ? 1.5 + Math.random() * 2 : 2 + Math.random() * 3.2;
      fx.push({ m, v: new T.Vector3(Math.cos(a) * sp * 0.5, 4 + Math.random() * 4.5, Math.sin(a) * sp * 0.5), r: new T.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9), life: 2.4 + Math.random(), kind, floor: pos.y });
      scene.add(m);
    }
  }
  const pulses = [];
  function pulse(tileId, color) {
    const m = new T.Mesh(new T.RingGeometry(0.85, 1.05, 48), new T.MeshBasicMaterial({ color: color || '#f3d98f', transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; const p = W.tilePos(tileId); m.position.set(p.x, W.topOf(tileId) + 0.02, p.z); scene.add(m); pulses.push({ m, t: 0 });
  }
  function screenOf(v) { const p = v.clone().project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height, ok: p.z < 1 }; }
  function popup(i, text, kind, delay) {
    const b = bikes[i]; if (!b) return;
    setTimeout(() => {
      const s = screenOf(b.group.position.clone().add(new T.Vector3(0, 2, 0))); if (!s.ok) return;
      const el = document.createElement('div'); el.className = 'fx ' + kind; el.textContent = text; el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      $('fxLayer').appendChild(el); setTimeout(() => el.remove(), 1800);
    }, FAST ? 0 : delay || 0);
  }
  function banner(text, sub) {
    if (FAST) return; const el = document.createElement('div'); el.className = 'banner'; el.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : ''); document.body.appendChild(el); setTimeout(() => el.remove(), 1900);
  }
  const snapshot = () => st.players.map((p) => ({ net: p.cash - p.loans * L.LOAN, loans: p.loans, salary: p.salary, love: p.love, know: p.know, health: p.health, comm: p.comm, vehicle: p.vehicle }));
  function showDiff(before) {
    let good = false, bad = false;
    st.players.forEach((p, i) => {
      const a = before[i], dn = p.cash - p.loans * L.LOAN - a.net, dl = p.loans - a.loans, dsal = p.salary - a.salary;
      let d = 0;
      if (dn) { popup(i, (dn > 0 ? '+' : '−') + Math.abs(dn) + ' tr', dn > 0 ? 'good' : 'bad', d); d += 260; dn > 0 ? (good = true) : (bad = true); }
      L.ASPECTS.forEach((A) => { const v = p[A.key] - a[A.key]; if (v) { popup(i, (v > 0 ? '+' : '−') + Math.abs(v) + A.icon + ' ' + A.name, 'a-' + A.key, d); d += 260; if (v > 0) Sfx.star(); } });
      if (dsal) { popup(i, 'Lương ' + (dsal > 0 ? '+' : '−') + Math.abs(dsal), dsal > 0 ? 'good' : 'bad', d); d += 260; }
      if (dl > 0) { popup(i, 'Vay ' + dl * L.LOAN + ' tr', 'info', d); d += 260; }
      if (p.vehicle !== a.vehicle) {
        const order = L.VEHICLES.map((v) => v.key), up = order.indexOf(p.vehicle) > order.indexOf(a.vehicle), name = L.VEHICLES.find((v) => v.key === p.vehicle).name;
        popup(i, (up ? 'Lên đời: ' : 'Đổi sang ') + name, 'info', d);
        if (up && (p.vehicle === 'car' || p.vehicle === 'suv')) queueCut('car', i, { vehicle: p.vehicle });
        else if (up && i === st.turn) banner('Lên đời: ' + name);
        placeAll(false);
      }
    });
    if (good) Sfx.coin(); else if (bad) Sfx.bad();
  }

  function syncHouses(instant) { W.setHouses(st.players.map((p) => ({ key: p.house ? window.DDArt.HOUSE_KEYS[p.house.name] : null, color: p.color, instant }))); }

  // ================= Cutscenes =================
  const CUT_KEY = 'duongdoi.cuts';
  let cutsOn = store.get(CUT_KEY) !== 'off', cutQueue = [], cutsSeen = [];
  const cutBtn = $('cutBtn');
  const showCutBtn = () => { cutBtn.textContent = 'Hoạt cảnh: ' + (cutsOn ? 'bật' : 'tắt'); cutBtn.setAttribute('aria-pressed', String(cutsOn)); };
  showCutBtn(); cutBtn.onclick = () => { cutsOn = !cutsOn; store.set(CUT_KEY, cutsOn ? 'on' : 'off'); showCutBtn(); };
  function queueCut(event, who, data) { cutsSeen.push(event); if (cutsOn && !FAST && window.DDCutscene) cutQueue.push({ event, who, data }); }
  async function flushCuts() {
    while (cutQueue.length) {
      const c = cutQueue.shift();
      busy = true; render();
      try { await window.DDCutscene.play({ event: c.event, who: c.who, data: c.data, reduced, players: st.players.map((p) => ({ name: p.name, color: p.color, married: p.married, kids: p.kids })) }); } catch (e) { /* a vignette failing must not stop the game */ }
    }
  }

  // ================= Camera =================
  let viewMode = 'follow', fly = null, region = null;
  const FOLLOW_OFF = new T.Vector3(0, 9.6, 9.0);
  function flyTo(target, pos, dur) {
    if (FAST) { controls.target.copy(target); camera.position.copy(pos); return; }
    fly = { t: 0, dur: dur || 1.3, t0: controls.target.clone(), p0: camera.position.clone(), t1: target.clone(), p1: pos.clone() };
  }
  function focusPlayer(i) {
    if (viewMode !== 'follow' || !bikes[i]) return;
    const tgt = bikes[i].group.position.clone(); flyTo(tgt, tgt.clone().add(FOLLOW_OFF));
  }
  function overview() { flyTo(new T.Vector3(0, 0, 1.5), new T.Vector3(0, 46, 44), 1.5); }
  $('viewBtn').onclick = () => {
    viewMode = viewMode === 'follow' ? 'overview' : 'follow';
    $('viewBtn').textContent = viewMode === 'follow' ? 'Toàn cảnh' : 'Theo người chơi';
    if (viewMode === 'overview') overview(); else if (st) focusPlayer(st.turn);
  };
  controls.addEventListener('start', () => { fly = null; controls.autoRotate = false; });
  function enterRegion(tileId, announce) {
    const r = W.regionOf(tileId); if (r === region) return;
    region = r; if (announce) { const R = W.REGIONS[r]; banner(R.name, R.sub); Sfx.chime(); }
  }

  // Tile info on hover / tap
  const ray = new T.Raycaster(), ptr = new T.Vector2();
  const DESC = { payday: 'Đi qua: nhận lương. Dừng đúng: thêm 5 tr', event: 'Rút một sự kiện ngẫu nhiên', baby: 'Thêm một đứa trẻ: −4 tr (phí y tế), +3♥, −1✚', tax: 'Nộp 30% lương', invest: 'Góp 20 tr rồi tự quay để thu lời', career: 'Có thể đổi nghề', fork: 'Ngã rẽ: chọn đường', start: 'Điểm xuất phát' };
  const STOPD = { grad: 'Chọn 1 trong 3 nghề cần bằng đại học', job: 'Chọn 1 trong 3 nghề phổ thông', trade: 'Chọn 1 trong 3 nghề kỹ thuật', marry: 'Kết hôn (tự quay tiền mừng cưới, +5♥) hoặc sống độc thân (+2✚ +2◆)', house: 'Chọn mua nhà hoặc tiếp tục thuê', mid: 'Học thạc sĩ, khởi nghiệp (tự quay) hoặc sống chậm', retire: 'Về đích, nhận thưởng và chọn cách sống tuổi già' };
  function describe(t) {
    if (t.type === 'stop') return STOPD[t.stop];
    if (t.type === 'money' || t.type === 'happy') return L.fxText(t, t.cash || 0) + (t.tag ? ` · phí ${L.PERKS[t.tag].toLowerCase()}` : '');
    if (t.type === 'raise') return `Lương +${t.amount} tr/kỳ`;
    if (t.type === 'gift') return `Mỗi người khác mừng ${t.amount} tr`;
    return DESC[t.type] || '';
  }
  function pickTile(e) {
    const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(W.pickables, true)[0];
    const tip = $('tip'); if (!hit) { tip.hidden = true; return; }
    let o = hit.object; while (o && o.userData.tile == null) o = o.parent; if (!o) { tip.hidden = true; return; }
    const t = L.TILES[o.userData.tile], sr = $('stage').getBoundingClientRect();
    tip.innerHTML = `<b>${esc(t.label)}</b> · ${esc(W.REGIONS[W.regionOf(t.id)].name)}${describe(t) ? '<br>' + esc(describe(t)) : ''}`;
    tip.style.left = Math.min(e.clientX - sr.left + 14, sr.width - 230) + 'px'; tip.style.top = (e.clientY - sr.top + 14) + 'px'; tip.hidden = false;
  }
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons) pickTile(e); });
  canvas.addEventListener('pointerleave', () => { $('tip').hidden = true; });
  canvas.addEventListener('click', (e) => { if (e.pointerType !== 'mouse') pickTile(e); });

  // ================= 3D spinner =================
  const wcan = $('wheel');
  const wr = new T.WebGLRenderer({ canvas: wcan, antialias: true, alpha: true });
  wr.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); wr.setSize(170, 150, false); wr.outputEncoding = T.sRGBEncoding;
  const ws = new T.Scene(), wcam = new T.PerspectiveCamera(36, 170 / 150, 0.1, 20);
  wcam.position.set(0, 3.0, 2.25); wcam.lookAt(0, 0, 0.12);
  ws.add(new T.HemisphereLight(0xffffff, 0x553322, 0.9)); const wl = new T.DirectionalLight(0xffffff, 0.9); wl.position.set(2, 4, 3); ws.add(wl);
  const faceC = document.createElement('canvas'); faceC.width = faceC.height = 512;
  (function (g, w) {
    const c = w / 2, R = w / 2 - 4;
    for (let i = 0; i < 10; i++) {
      const a0 = (i * 36) * Math.PI / 180, a1 = ((i + 1) * 36) * Math.PI / 180, ac = (a0 + a1) / 2;
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, R, -a1, -a0); g.closePath();
      g.fillStyle = ['#c8382c', '#2a1a16', '#d9a947', '#8a2a22', '#3fa7a0'][i % 5]; g.fill(); g.strokeStyle = '#f3d98f'; g.lineWidth = 4; g.stroke();
      g.save(); g.translate(c + Math.cos(ac) * R * 0.7, c - Math.sin(ac) * R * 0.7); g.rotate(Math.PI / 2 - ac);
      g.fillStyle = i % 5 === 2 ? '#2a1a0c' : '#fff7e8'; g.font = '800 70px "Be Vietnam Pro", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 0, 4); g.restore();
    }
  })(faceC.getContext('2d'), 512);
  const faceTex = new T.CanvasTexture(faceC); faceTex.encoding = T.sRGBEncoding;
  const wheel = new T.Group(); ws.add(wheel);
  const face = new T.Mesh(new T.CircleGeometry(1, 60), new T.MeshStandardMaterial({ map: faceTex, roughness: 0.45 }));
  face.geometry.rotateX(-Math.PI / 2); face.position.y = 0.081; wheel.add(face);
  wheel.add(new T.Mesh(new T.CylinderGeometry(1.04, 1.08, 0.16, 60), new T.MeshStandardMaterial({ color: '#d9a947', metalness: 0.6, roughness: 0.3 })));
  for (let i = 0; i < 10; i++) { const a = i * 36 * Math.PI / 180; const peg = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.12, 8), new T.MeshStandardMaterial({ color: '#f6ecdb', metalness: 0.5 })); peg.position.set(Math.cos(a) * 0.97, 0.14, -Math.sin(a) * 0.97); wheel.add(peg); }
  const hub = new T.Mesh(new T.SphereGeometry(0.16, 20, 12), new T.MeshStandardMaterial({ color: '#d9a947', metalness: 0.7, roughness: 0.25 })); hub.position.y = 0.09; wheel.add(hub);
  const base = new T.Mesh(new T.CylinderGeometry(1.15, 1.25, 0.14, 48), new T.MeshStandardMaterial({ color: '#3a221d', roughness: 0.5 })); base.position.y = -0.15; ws.add(base);
  const flapper = new T.Group(); flapper.position.set(0, 0.2, -1.12); ws.add(flapper);
  const flap = new T.Mesh(new T.ConeGeometry(0.09, 0.32, 4), new T.MeshStandardMaterial({ color: '#f6ecdb', metalness: 0.3 })); flap.rotation.x = -Math.PI / 2; flap.position.z = 0.12; flapper.add(flap);
  let wPhi = Math.PI / 2 - (18 * Math.PI / 180), wSpin = null, wDirty = true, lastPeg = 0, flapKick = 0;
  wheel.rotation.y = wPhi;
  function spinWheel(v) {
    const target = Math.PI / 2 - ((v - 1) * 36 + 18) * Math.PI / 180;
    let end = target; while (end < wPhi + Math.PI * 2 * (FAST || reduced ? 0 : 4)) end += Math.PI * 2;
    if (FAST) { wPhi = end; wheel.rotation.y = wPhi; wDirty = true; return Promise.resolve(); }
    return new Promise((res) => { wSpin = { a: wPhi, b: end, t: 0, dur: reduced ? 0.25 : 2.1 + Math.random() * 0.4, res }; });
  }

  // ================= Main loop =================
  let last = performance.now();
  function resize() { const r = $('stage').getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize);
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; frames++;
    const active = st && bikes[st.turn];
    bikes.forEach((b) => updateBike(b, dt, now));
    if (fly) {
      fly.t += dt; const k = ease(Math.min(1, fly.t / fly.dur));
      controls.target.lerpVectors(fly.t0, fly.t1, k); camera.position.lerpVectors(fly.p0, fly.p1, k); if (k >= 1) fly = null;
    } else if (viewMode === 'follow' && active && (busy || active.settle)) {
      const want = active.group.position, delta = want.clone().sub(controls.target); delta.y *= 0.5; delta.multiplyScalar(Math.min(1, dt * 3.2));
      controls.target.add(delta); camera.position.add(delta);
    }
    controls.update();
    W.update(dt, now / 1000, camera, region);
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i]; p.life -= dt; p.v.y -= 9 * dt; if (p.kind !== 'coin') p.v.multiplyScalar(1 - dt * 1.6);
      p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += p.r.x * dt; p.m.rotation.y += p.r.y * dt;
      if (p.m.position.y < p.floor + 0.05) { p.m.position.y = p.floor + 0.05; p.v.set(0, 0, 0); }
      if (p.life <= 0) { scene.remove(p.m); fx.splice(i, 1); }
    }
    for (let i = pulses.length - 1; i >= 0; i--) { const p = pulses[i]; p.t += dt; p.m.scale.setScalar(1 + p.t * 2.2); p.m.material.opacity = Math.max(0, 0.9 - p.t * 1.2); if (p.t > 0.8) { scene.remove(p.m); pulses.splice(i, 1); } }
    const cutPlaying = window.DDCutscene && window.DDCutscene.playing;
    if (!cutPlaying && (!FAST || frames % 30 === 1)) renderer.render(scene, camera);
    if (wSpin) {
      wSpin.t += dt; const k = Math.min(1, wSpin.t / wSpin.dur); const e = 1 - Math.pow(1 - k, 4);
      wPhi = wSpin.a + (wSpin.b - wSpin.a) * e; wheel.rotation.y = wPhi;
      const peg = Math.floor((wPhi - Math.PI / 2) / (Math.PI / 5)); if (peg !== lastPeg) { lastPeg = peg; Sfx.tick(); flapKick = 0.5; }
      if (k >= 1) { const r = wSpin.res; wSpin = null; r(); }
      wDirty = true;
    }
    if (flapKick > 0) { flapKick = Math.max(0, flapKick - dt * 4); flapper.rotation.y = flapKick; wDirty = true; }
    if (wDirty && (!FAST || frames % 30 === 1)) { wr.render(ws, wcam); wDirty = false; }
    requestAnimationFrame(loop);
  }

  // ================= Storage =================
  function save() { if (st) store.set(SAVE_KEY, JSON.stringify(st)); }
  function loadSaved() { try { const s = JSON.parse(store.get(SAVE_KEY) || 'null'); return s && s.version === 2 && s.players ? s : null; } catch (e) { return null; } }

  // ================= Setup =================
  function renderSetup() {
    const cb = $('countBtns'); cb.innerHTML = '';
    for (let n = 2; n <= 6; n++) {
      const b = document.createElement('button'); b.textContent = n; b.id = 'count' + n;
      b.setAttribute('aria-pressed', String(n === count)); b.setAttribute('aria-label', n + ' người chơi');
      b.onclick = () => { count = n; renderSetup(); }; cb.appendChild(b);
    }
    const box = $('names'); box.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const lab = document.createElement('label');
      lab.innerHTML = `<span class="dot" style="background:${L.COLORS[i]}"></span><input id="pname${i}" maxlength="14" aria-label="Tên người chơi ${i + 1}">`;
      const inp = lab.querySelector('input'); inp.value = names[i]; inp.oninput = () => { names[i] = inp.value; };
      box.appendChild(lab);
    }
    const saved = loadSaved(); $('resumeBtn').hidden = !(saved && saved.phase !== 'over');
  }
  $('startBtn').onclick = () => {
    const list = names.slice(0, count).map((n, i) => (n || '').trim() || DEFAULT_NAMES[i]);
    startGame(L.newGame(list, qs.has('seed') ? parseInt(qs.get('seed'), 10) : undefined));
  };
  $('resumeBtn').onclick = () => { const s = loadSaved(); if (s) startGame(s); };
  $('newGameBtn').onclick = () => showSetup();
  $('againBtn').onclick = () => startGame(L.newGame(st.players.map((p) => p.name)));
  $('closeOverBtn').onclick = () => { overDismissed = true; $('overOverlay').hidden = true; viewMode = 'overview'; overview(); };
  const panels = ['turnPanel', 'playersPanel', 'logPanel'];
  function showSetup() {
    $('setup').hidden = false; $('overOverlay').hidden = true; $('newGameBtn').hidden = true; panels.forEach((p) => ($(p).hidden = true));
    controls.autoRotate = !FAST; overview(); renderSetup(); resize();
  }
  function startGame(state) {
    st = state; busy = false; overDismissed = false; overShown = false;
    $('setup').hidden = true; $('newGameBtn').hidden = false; panels.forEach((p) => ($(p).hidden = false));
    controls.autoRotate = false; resize(); buildBikes(); syncHouses(true); region = null; enterRegion(st.players[st.turn].pos, false); render(); save();
    viewMode = 'follow'; $('viewBtn').textContent = 'Toàn cảnh'; focusPlayer(st.turn);
  }

  // ================= Turn flow =================
  const wait = (ms) => new Promise((r) => (ms && !FAST ? setTimeout(r, ms) : r()));
  async function runMove() {
    busy = true; render(); let n = 0;
    while (st.phase === 'moving') {
      const i = st.turn, from = st.players[i].pos, before = snapshot(), first = n === 0;
      const r = L.step(st);
      if (st.players[i].pos !== from) {
        const last = r !== 'step';
        await drive(i, from, st.players[i].pos, first, last); Sfx.step(n++);
        enterRegion(st.players[i].pos, true);
      }
      renderHud();
      if (r === 'step') showDiff(before);
      else if (r === 'landed' || r === 'choice') { if (!(st.choice && st.choice.kind === 'fork')) land(i, before); else showDiff(before); }
    }
    placeAll(false); await flushCuts(); busy = false; render(); save();
  }
  function land(i, before) {
    const p = st.players[i], t = L.TILES[p.pos], pos = bikes[i].group.position.clone();
    pulse(p.pos, p.color); showDiff(before);
    if (t.type === 'payday') burst(pos, 'coin', 24);
    if (t.type === 'baby') { burst(pos, 'confetti', 40); banner('Thêm thành viên!'); queueCut('baby', i); }
    if (st.phase === 'contest' && st.contest) { banner(st.contest.title, st.contest.kind === 'duel' ? '' : 'Mọi người cùng quay!'); Sfx.chime(); }
    if (t.type === 'stop') {
      if (t.stop === 'retire') { burst(pos, 'confetti', 110); banner('Nghỉ hưu!', 'Về đích thứ ' + p.retireOrder); Sfx.fanfare(); }
      if (t.stop === 'grad') { burst(pos, 'confetti', 50); queueCut('grad', i); }
    }
  }
  function afterSpinFor(kind, before, who) {
    showDiff(before);
    const pos = bikes[who].group.position.clone(), p = st.players[who];
    if (kind === 'marry') { burst(pos, 'confetti', 100); Sfx.fanfare(); placeAll(false); queueCut('marry', who); }
    if (kind === 'invest' && st.lastSpin >= 7) { burst(pos, 'coin', 30); banner('Trúng đậm!'); }
    if (kind === 'startup' && st.lastSpin >= 6) { burst(pos, 'confetti', 60); Sfx.fanfare(); queueCut('startup', who); }
    if (kind === 'resale') { popup(who, `Bán nhà ${Math.round(p.house.price * (st.lastSpin <= 3 ? 0.8 : st.lastSpin <= 7 ? 1.2 : 1.6))} tr`, 'good'); Sfx.coin(); }
  }
  $('spinBtn').onclick = async () => {
    if (busy || !['spin', 'spinFor', 'contest'].includes(st.phase)) return;
    Sfx.ensure(); busy = true; render(); focusPlayer(st.turn);
    const forced = window.__forceSpin; window.__forceSpin = null;
    if (st.phase === 'spinFor') {
      const before = snapshot(), kind = st.spinFor.kind, who = st.turn;
      const v = L.spinFor(st, forced); await spinWheel(v);
      afterSpinFor(kind, before, who); await flushCuts(); busy = false; render(); save(); return;
    }
    if (st.phase === 'contest') {
      const before = snapshot(), spinnerIdx = st.contest.order[st.contest.idx];
      const v = L.spinContest(st, forced); await spinWheel(v);
      popup(spinnerIdx, 'Quay ' + v, 'info');
      if (st.phase !== 'contest') { // resolved
        showDiff(before);
        const c = st.lastContest; (c.result.winners || []).forEach((w) => { if (bikes[w]) burst(bikes[w].group.position.clone(), 'confetti', 40); });
        Sfx.fanfare(); queueCut('contest', st.turn, { title: c.title, spins: c.spins, result: c.result, kind: c.kind });
        await flushCuts();
      } else handover(L.spinner(st), `${L.spinner(st).name} quay cho ${st.contest.title}`);
      busy = false; render(); save(); return;
    }
    const v = L.spin(st, forced); render(); await spinWheel(v); await wait(250);
    await runMove();
  };
  $('repayBtn').onclick = () => { if (L.repay(st)) { popup(st.turn, 'Trả nợ', 'info'); render(); save(); } };
  function handover(p, text) {
    const h = $('handover'); h.textContent = text; h.style.borderColor = p.color; h.hidden = false;
    clearTimeout(h._t); h._t = setTimeout(() => (h.hidden = true), FAST ? 0 : 1800);
  }
  $('endTurnBtn').onclick = () => {
    if (busy || !L.endTurn(st)) return;
    placeAll(false); render(); save();
    if (st.phase === 'spin' || st.phase === 'spinFor' || st.phase === 'choice') {
      const p = L.current(st), h = $('handover');
      h.textContent = st.phase === 'spinFor' ? `${p.name} quay giá bán nhà` : st.phase === 'choice' ? `${p.name}: chọn ước mơ` : `Chuyền máy cho ${p.name}`; h.style.borderColor = p.color; h.hidden = false;
      clearTimeout(h._t); h._t = setTimeout(() => (h.hidden = true), FAST ? 0 : 1800);
      enterRegion(p.pos, false); focusPlayer(st.turn);
    }
  };
  function onChoice(i) {
    if (busy || !st.choice) return;
    const kind = st.choice.kind, before = snapshot(), who = st.turn;
    if (!L.choose(st, i)) return;
    Sfx.choose();
    if (kind === 'fork') { runMove(); return; }
    showDiff(before);
    const pos = bikes[who].group.position.clone();
    if (kind === 'goal') { const g = L.GOALS.find((x) => x.key === st.players[who].goal); banner('Ước mơ: ' + g.name, g.hint); Sfx.chime(); }
    if (kind === 'job' || (kind === 'career' && st.players[who].salary !== before[who].salary)) { const c = L.careerOf(st.players[who].career); burst(pos, 'confetti', 40); banner(st.players[who].career, c && c.perk ? 'Thu phí dịch vụ: ' + L.PERKS[c.perk] : ''); }
    if (kind === 'retire') { burst(pos, 'confetti', 50); }
    if (kind === 'house' && st.players[who].house && before[who].net !== st.players[who].cash - st.players[who].loans * L.LOAN) { burst(pos, 'confetti', 60); Sfx.fanfare(); queueCut('house', who, { house: st.players[who].house.name }); syncHouses(false); }
    if (kind === 'retire') queueCut('retire', who, { style: st.players[who].retireStyle });
    if (kind === 'duel' && st.phase === 'contest') { banner(st.contest.title, 'Hai bên cùng quay'); Sfx.chime(); }
    placeAll(false);
    if (cutQueue.length) { busy = true; flushCuts().then(() => { busy = false; render(); save(); }); return; }
    render(); save();
  }

  // ================= Panels =================
  function renderHud() {
    $('playersPanel').innerHTML = st.players.map((p, i) => {
      const tags = [];
      const g = L.GOALS.find((x) => x.key === p.goal), c = L.careerOf(p.career);
      if (g) tags.push(`<span class="tag goal" title="${esc(g.hint)}">Ước mơ: ${esc(g.name)}</span>`);
      tags.push(`<span class="tag">${L.EDU_NAME[p.edu]}</span>`);
      if (c && c.perk) tags.push(`<span class="tag">Thu phí ${esc(L.PERKS[c.perk].toLowerCase())}</span>`);
      if (p.married) tags.push('<span class="tag">Đã cưới</span>');
      if (p.single) tags.push('<span class="tag">Độc thân</span>');
      if (p.kids) tags.push(`<span class="tag">${p.kids} con</span>`);
      if (p.house) tags.push(`<span class="tag">${esc(p.house.name)}</span>`);
      if (p.retired) tags.push(`<span class="tag done">Nghỉ hưu #${p.retireOrder}</span>`);
      return `<div class="pcard ${i === st.turn && st.phase !== 'over' ? 'active' : ''}" data-player-row="${i}" style="--pc:${p.color}">
        <div class="pname"><i style="background:${p.color}"></i>${esc(p.name)}</div>
        <div class="job">${esc(p.career || 'Chưa có việc')} · ${esc(W.REGIONS[W.regionOf(p.pos)].name)}</div>
        <div class="stats"><span><small>Tiền</small><b data-cash>${p.cash} tr</b>${p.loans ? `<em class="debt">nợ ${p.loans}×${L.LOAN}</em>` : ''}</span><span><small>Lương/kỳ</small><b data-salary>${L.income(p)}</b></span><span><small>Điểm</small><b data-score>${L.scoreOf(p).score}</b></span></div>
        <div class="asp" data-aspects>${L.ASPECTS.map((A) => `<span class="a-${A.key}${p.goal === A.key ? ' is-goal' : ''}" title="${A.name}">${A.icon}<b>${p[A.key]}</b></span>`).join('')}</div>
        ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}</div>`;
    }).join('');
  }
  function nextName() { let i = st.turn; for (let k = 0; k < st.players.length; k++) { i = (i + 1) % st.players.length; if (!st.players[i].retired) return st.players[i].name; } return ''; }
  function render() {
    if (!st) return;
    const sp = st.phase === 'contest' && st.contest ? L.spinner(st) : null;
    const p = sp || L.current(st), sf = st.phase === 'spinFor' && st.spinFor;
    $('turnPanel').style.setProperty('--pc', p.color);
    $('roundLbl').textContent = `Vòng ${st.round} · ${W.REGIONS[W.regionOf(p.pos)].name}`;
    $('turnName').textContent = p.name;
    const goal = L.GOALS.find((x) => x.key === p.goal);
    $('turnMeta').textContent = `${p.career ? p.career + ' · ' + L.income(p) + ' tr/kỳ' : 'Chưa có việc'}${goal ? ' · Ước mơ: ' + goal.name : ''} · ô “${L.TILES[p.pos].label}”`;
    const spinBtn = $('spinBtn');
    spinBtn.hidden = !['spin', 'moving', 'spinFor', 'contest'].includes(st.phase);
    spinBtn.disabled = busy || !['spin', 'spinFor', 'contest'].includes(st.phase);
    spinBtn.classList.toggle('spin-for', !!(sf || sp) && !busy);
    spinBtn.textContent = st.phase === 'moving' ? `Đi ${st.lastSpin} bước…` : busy ? 'Đang quay…' : sp ? `${sp.name} quay!` : sf ? 'Quay!' : 'Quay số';
    $('repayBtn').hidden = !(st.phase === 'spin' && !busy && p.loans > 0 && p.cash >= L.LOAN_REPAY);
    $('endTurnBtn').hidden = st.phase !== 'done' || busy;
    const allRetired = st.players.every((q) => q.retired);
    $('endTurnBtn').textContent = allRetired ? (st.players.some((q) => q.house && q.resaleSpin == null) ? 'Tiếp tục: bán nhà' : 'Xem tổng kết') : `Chuyển lượt cho ${nextName()}`;
    const cst = st.contest;
    $('result').innerHTML = sp ? `<strong>${esc(cst.title)}</strong><br>${esc(cst.hint)}<br>${cst.order.map((i, k) => { const done = cst.spins[k]; const q = st.players[i]; return `<span class="cspin${k === cst.idx ? ' now' : ''}" style="--pc:${q.color}">${esc(q.name)}: ${done ? done.total + (done.bonus ? ` (${done.v}+${done.bonus})` : '') : k === cst.idx ? 'đang quay' : '…'}</span>`; }).join(' ')}`
      : sf ? `<strong>${esc(sf.title)}</strong><br>${esc(sf.hint)}`
      : st.phase === 'spin' ? (busy ? 'Vòng quay đang chạy…' : `Đến lượt <strong>${esc(p.name)}</strong>. Bấm <strong>Quay số</strong>.`)
      : st.result ? `<strong>Quay ${st.lastSpin} · ${esc(L.TILES[p.pos].label)}</strong><br>${esc(st.result)}` : st.lastSpin ? `Quay được <strong>${st.lastSpin}</strong>.` : '';
    const ch = $('choices');
    if (st.phase === 'choice' && st.choice && !busy) {
      ch.innerHTML = `<div class="choice-title">${esc(st.choice.title)}</div>` + st.choice.options.map((o, i) =>
        `<button class="choice-btn" data-choice="${i}"><b>${esc(o.label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`).join('');
      ch.querySelectorAll('button').forEach((b) => (b.onclick = () => onChoice(+b.dataset.choice)));
    } else ch.innerHTML = '';
    renderHud();
    bikes.forEach((b, i) => { b.ring.visible = i === st.turn && st.phase !== 'over'; });
    $('log').innerHTML = st.log.slice(0, 40).map((e) => `<li>${e.who ? `<b style="color:${e.color}">${esc(e.who)}</b> ` : ''}${esc(e.text)}</li>`).join('');
    if (st.phase === 'over') renderOver();
  }
  let overShown = false, finalePlaying = false;
  const GOAL_PLACE = { rich: 'bachdang', love: 'hoian', know: 'hue', health: 'dalat', comm: 'halong', balance: 'phuquoc' };
  async function playFinale() {
    if (!window.DDCutscene || FAST) return;
    finalePlaying = true; busy = true; $('overOverlay').hidden = true; render();
    const f = st.final, idxOf = (row) => st.players.findIndex((q) => q.color === row.color);
    const players = st.players.map((p) => ({ name: p.name, color: p.color, married: p.married, kids: p.kids }));
    let all = false;
    try {
      for (let r = f.length - 1; r >= 0 && !all; r--) {
        const row = f[r], i = idxOf(row), p = st.players[i], g = L.GOALS.find((x) => x.key === p.goal);
        const data = { rank: r + 1, total: f.length, name: p.name, color: p.color, career: p.career, goalKey: p.goal, goalName: g ? g.name : '', married: p.married, kids: p.kids,
          houseKey: p.house ? window.DDArt.HOUSE_KEYS[p.house.name] : null, vehicle: p.vehicle, net: Math.max(0, row.net), aspects: { love: p.love, know: p.know, health: p.health, comm: p.comm }, balance: row.balance, score: row.score, retireStyle: p.retireStyle };
        if (r === 0) Sfx.fanfare(); else Sfx.chime();
        const res = await window.DDCutscene.play({ event: 'recap', place: GOAL_PLACE[p.goal], who: i, players, data, sequence: true, reduced });
        if (res && res.skippedAll) all = true;
      }
      if (!all) { Sfx.fanfare(); await window.DDCutscene.play({ event: 'finale', place: 'finale', who: idxOf(f[0]), players, sequence: true, reduced, data: { ranking: f.map((row) => { const g = L.GOALS.find((x) => x.key === row.goal); return { name: row.name, color: row.color, score: row.score, goalName: g ? g.name : '' }; }) } }); }
    } catch (e) { /* the summary table still shows */ }
    finalePlaying = false; busy = false; overDismissed = false; render();
  }
  $('replayBtn').onclick = () => playFinale();
  function renderOver() {
    const f = st.final;
    $('winnerTitle').textContent = `${f[0].name} có cuộc đời viên mãn nhất!`;
    $('finalTable').querySelector('tbody').innerHTML = f.map((r, i) => { const g = L.GOALS.find((x) => x.key === r.goal); return `<tr><td class="num">${i + 1}</td><td><div class="pname"><i style="background:${r.color}"></i>${esc(r.name)}</div><div class="job">${esc(g ? g.name : '')}</div></td>
      <td class="r num" title="Tiền ${r.cash} + bán nhà ${r.resale} − nợ ${r.debt}">${r.assetPts}<div class="job">${r.net} tr</div></td>${L.ASPECTS.map((A) => `<td class="r num a-${A.key}${r.goal === A.key ? ' is-goal' : ''}">${r.aspects[A.key]}<div class="job">${r[A.key]}${A.icon}</div></td>`).join('')}<td class="r num">${r.balance || '–'}</td><td class="r num"><b>${r.score}</b></td></tr>`; }).join('');
    $('overOverlay').hidden = overDismissed || finalePlaying;
    $('spinBtn').hidden = true; $('endTurnBtn').hidden = true;
    $('result').innerHTML = `Ván đã kết thúc. <strong>${esc(f[0].name)}</strong> thắng với ${f[0].score} Điểm Đời.`;
    if (!overShown) { overShown = true; const w = st.players.findIndex((p) => p.color === f[0].color); if (bikes[w]) burst(bikes[w].group.position.clone(), 'confetti', 120); if (cutsOn && !FAST) setTimeout(playFinale, 50); else Sfx.fanfare(); }
  }

  // Test hook: read-only view of the game's own state and the 3D scene, used by selftest.cjs.
  window.__duongdoi = {
    get state() { return st; }, get busy() { return busy || !!wSpin || bikes.some((b) => b.drive); }, tiles: L.TILES,
    view() { return { webgl: !!renderer.getContext(), frames, tiles: W.tileMeshes.length, tokens: bikes.length, tokenTile: bikes.map((b) => b.tile), passengers: bikes.map((b) => (b.spouse.visible ? 1 : 0) + b.kids.filter((k) => k.visible).length), vehicles: bikes.map((b) => b.vehicle), cuts: cutsSeen.slice(), region, quality: QUALITY }; },
  };

  // Debug/preview helper: look at a tile with that tile's atmosphere.
  window.__dbgCut = (event, place, data) => window.DDCutscene.play({ event, place, data, who: 0, players: st ? st.players.map((p) => ({ name: p.name, color: p.color, married: true, kids: 2 })) : [{ name: 'An', color: '#e2483d', married: true, kids: 2 }, { name: 'Bình', color: '#e7b93c' }, { name: 'Chi', color: '#3fa7a0' }], duration: 60 });
  window.__dbgVehicles = (keys) => { keys.forEach((k, i) => { if (st.players[i]) st.players[i].vehicle = k; }); st.players.forEach((p) => { p.married = true; p.kids = 2; p.pos = 2; }); placeAll(true); focusPlayer(0); };
  window.__dbgHouses = (names) => { names.forEach((n, i) => { if (st.players[i]) st.players[i].house = n ? { name: n, price: 100 } : null; }); syncHouses(true); };
  window.__dbgLook = (i, dist) => { const p = W.lotPos(i); viewMode = 'follow'; region = 'bana'; flyTo(p, p.clone().add(new T.Vector3(0, dist || 6, dist || 6)), 0.01); };
  window.__dbgFocus = (tileId) => { viewMode = 'follow'; region = W.regionOf(tileId); const tgt = W.tilePos(tileId); flyTo(tgt, tgt.clone().add(FOLLOW_OFF), 0.01); };

  function boot(data) {
    resize(); requestAnimationFrame(loop);
    if (data && data.state) startGame(data.state); else showSetup();
  }
  if (window.claude && window.claude.hot) {
    window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ state: st }));
    window.claude.hot.ready ? window.claude.hot.ready(boot) : boot(window.claude.hot.data || {});
  } else boot({});
})();
