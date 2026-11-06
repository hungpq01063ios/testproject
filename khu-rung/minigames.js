/* Khu Rừng Chung Tay — six tap-to-play mini-games for small children, drawn on a 2D canvas.
 * ForestMini.play(kind, opts) → Promise<stars 0..3>. opts.bot plays by itself (used by the self-test). */
(function () {
  'use strict';
  const TAU = Math.PI * 2, W = 720, H = 480;
  const I = () => window.ForestWorld.ICON;
  const INFO = {
    catch: { title: 'Hứng hạt dẻ', how: 'Kéo giỏ qua lại để hứng thật nhiều hạt dẻ!', icon: 'seed', time: 16, goals: [4, 8, 12] },
    sprout: { title: 'Tưới cây con', how: 'Chạm vào cây con đang khát nước (có giọt nước) để tưới!', icon: 'water', time: 16, goals: [4, 8, 12] },
    sort: { title: 'Phân loại rác', how: 'Rác hữu cơ bỏ thùng xanh lá, rác tái chế bỏ thùng xanh dương!', icon: 'trash', time: 0, goals: [4, 6, 8] },
    count: { title: 'Đếm cá', how: 'Đếm xem có bao nhiêu chú cá rồi chọn số đúng nhé!', icon: 'water', time: 0, goals: [1, 2, 3] },
    clouds: { title: 'Xua mây', how: 'Chạm vào mây đen để xua chúng đi trước khi tới khu rừng!', icon: 'cloud', time: 16, goals: [5, 10, 15] },
    find: { title: 'Tìm bạn trốn', how: 'Bạn nhỏ trốn trong bụi cây. Nhìn kỹ rồi chạm đúng bụi nhé! Chỉ được đoán 2 lần thôi.', icon: 'find', time: 0, goals: [1, 2, 3] },
    runner: { title: 'Chạy về nhà', how: 'Bấm NHẢY (hoặc phím Space) để nhảy qua đá và khúc gỗ. Va 3 lần là thua!', icon: 'hop', time: 0, ctrl: 'jump', goals: [1, 2, 3] },
    race: { title: 'Đua xe lá', how: 'Bấm ◀ ▶ (hoặc phím mũi tên) để đổi làn, tránh đá và nhặt hoa. Va 3 lần là thua!', icon: 'paw', time: 0, ctrl: 'lr', goals: [1, 2, 3] },
    river: { title: 'Nhảy đá qua suối', how: 'Chỉ nhảy khi hòn đá phía trước nổi lên (viền xanh)! Rơi xuống nước 3 lần là thua.', icon: 'water', time: 0, ctrl: 'jump', goals: [1, 2, 3] },
    flappy: { title: 'Bay cùng Sếu', how: 'Bấm VỖ CÁNH (hoặc Space) để bay lên, luồn qua khe lau sậy. Va 3 lần là thua!', icon: 'cloud', time: 0, ctrl: 'flap', goals: [1, 2, 3] },
    maze: { title: 'Mê cung hang đá', how: 'Bấm các mũi tên để tìm đường tới bạn nhỏ trước khi hết giờ!', icon: 'find', time: 45, ctrl: 'pad', goals: [1, 2, 3] },
  };
  const ITEMS = [
    { name: 'Vỏ chuối', bin: 0, draw: (g, s) => { g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, 0, s * 0.12, s * 0.36, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-s * 0.16, s * 0.12, s * 0.08, s * 0.26, -0.6, 0, TAU); g.fill(); g.fillStyle = '#7a5a2a'; g.fillRect(-s * 0.03, -s * 0.38, s * 0.06, s * 0.1); } },
    { name: 'Lá khô', bin: 0, draw: (g, s) => { g.fillStyle = '#c98a3a'; g.beginPath(); g.ellipse(0, 0, s * 0.2, s * 0.38, 0.6, 0, TAU); g.fill(); g.strokeStyle = '#8a5a2a'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(-s * 0.2, s * 0.3); g.lineTo(s * 0.2, -s * 0.3); g.stroke(); } },
    { name: 'Lõi táo', bin: 0, draw: (g, s) => { g.fillStyle = '#f6efd0'; g.fillRect(-s * 0.1, -s * 0.22, s * 0.2, s * 0.44); g.fillStyle = '#e2483d'; g.beginPath(); g.ellipse(0, -s * 0.26, s * 0.24, s * 0.1, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, s * 0.26, s * 0.24, s * 0.1, 0, 0, TAU); g.fill(); } },
    { name: 'Vỏ trứng', bin: 0, draw: (g, s) => { g.fillStyle = '#fbf3e4'; g.beginPath(); g.ellipse(0, s * 0.05, s * 0.26, s * 0.32, 0, 0, Math.PI); g.fill(); g.strokeStyle = '#c9b48e'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(-s * 0.26, s * 0.05); for (let i = 0; i < 6; i++) g.lineTo(-s * 0.26 + i * s * 0.1, s * 0.05 + (i % 2 ? -s * 0.08 : 0)); g.stroke(); } },
    { name: 'Chai nhựa', bin: 1, draw: (g, s) => { g.fillStyle = 'rgba(127,214,255,.85)'; g.fillRect(-s * 0.14, -s * 0.2, s * 0.28, s * 0.56); g.fillRect(-s * 0.07, -s * 0.36, s * 0.14, s * 0.18); g.fillStyle = '#3fa7d6'; g.fillRect(-s * 0.08, -s * 0.42, s * 0.16, s * 0.08); g.fillStyle = '#ffffff'; g.fillRect(-s * 0.14, 0, s * 0.28, s * 0.1); } },
    { name: 'Lon nước', bin: 1, draw: (g, s) => { g.fillStyle = '#e2483d'; g.fillRect(-s * 0.16, -s * 0.3, s * 0.32, s * 0.6); g.fillStyle = '#c9ced4'; g.fillRect(-s * 0.16, -s * 0.36, s * 0.32, s * 0.08); g.fillRect(-s * 0.16, s * 0.28, s * 0.32, s * 0.08); g.fillStyle = '#ffffff'; g.fillRect(-s * 0.1, -s * 0.06, s * 0.2, s * 0.1); } },
    { name: 'Giấy báo', bin: 1, draw: (g, s) => { g.fillStyle = '#f2f2ea'; g.fillRect(-s * 0.3, -s * 0.22, s * 0.6, s * 0.44); g.fillStyle = '#8a8f96'; for (let y = -0.14; y < 0.2; y += 0.08) g.fillRect(-s * 0.24, y * s, s * 0.48, s * 0.03); } },
    { name: 'Hộp giấy', bin: 1, draw: (g, s) => { g.fillStyle = '#c99a5a'; g.fillRect(-s * 0.28, -s * 0.2, s * 0.56, s * 0.42); g.fillStyle = '#a8783a'; g.fillRect(-s * 0.28, -s * 0.2, s * 0.56, s * 0.08); g.strokeStyle = '#8a5a2a'; g.lineWidth = s * 0.02; g.strokeRect(-s * 0.28, -s * 0.2, s * 0.56, s * 0.42); } },
  ];

  let el = null;
  function ensure() {
    if (el) return el;
    el = document.createElement('div'); el.className = 'mini'; el.hidden = true;
    el.innerHTML = '<div class="mini-card"><div class="mini-head"><img class="mini-face" alt=""><div><div class="mini-title"></div><div class="mini-how"></div></div></div><div class="mini-stage"><canvas width="720" height="480"></canvas><div class="mini-count"></div><div class="mini-end" hidden><div class="mini-stars"></div><div class="mini-cheer"></div><button class="big" type="button">Xong!</button></div></div><div class="mini-bar"><div></div></div><div class="mini-ctrl"></div></div>';
    document.body.appendChild(el); return el;
  }
  const star = (g, x, y, r, fill) => { g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = fill; g.fill(); };

  function play(kind, opts) {
    opts = opts || {};
    const info = INFO[kind]; if (!info) return Promise.resolve(0);
    if (opts.instant) return Promise.resolve(opts.instant);
    const root = ensure(), cv = root.querySelector('canvas'), g = cv.getContext('2d'), bar = root.querySelector('.mini-bar div'), countEl = root.querySelector('.mini-count'), endEl = root.querySelector('.mini-end');
    root.querySelector('.mini-title').textContent = opts.title || info.title; root.querySelector('.mini-how').textContent = info.how;
    root.querySelector('.mini-face').src = opts.face || ''; root.style.setProperty('--pc', opts.color || '#3fbf6f');
    root.hidden = false; endEl.hidden = true; countEl.textContent = ''; countEl.classList.toggle('dim', !opts.bot);
    const ctrl = root.querySelector('.mini-ctrl'), CTRL = { jump: [['act', 'NHẢY']], flap: [['act', 'VỖ CÁNH']], lr: [['left', '◀'], ['right', '▶']], pad: [['left', '◀'], ['up', '▲'], ['down', '▼'], ['right', '▶']] }[info.ctrl] || [];
    ctrl.innerHTML = CTRL.map(([k, l]) => `<button type="button" class="big mc-${k}" data-k="${k}">${l}</button>`).join(''); ctrl.hidden = !CTRL.length;
    ctrl.querySelectorAll('button').forEach((b) => (b.onpointerdown = (e) => { e.preventDefault(); press(b.dataset.k); }));
    const keyMap = { ' ': 'act', Spacebar: 'act', ArrowUp: info.ctrl === 'pad' ? 'up' : 'act', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const onKey = (e) => { const k = keyMap[e.key]; if (!k) return; e.preventDefault(); press(k); };
    window.addEventListener('keydown', onKey);
    const speed = opts.bot ? 4 : 1, sfx = opts.sfx || {}, say = opts.say || (() => {});
    say(info.how);
    let score = 0, t = 0, phase = opts.bot ? 'play' : 'count', countT = 0, done = false, tries = 0;
    const S = { kind, items: [] };
    // ---------- per-game state ----------
    const R = Math.random;
    if (kind === 'catch') { S.basket = W / 2; S.target = W / 2; S.spawn = 0; }
    if (kind === 'sprout') { S.pots = [...Array(6)].map((_, i) => ({ x: 120 + (i % 3) * 240, y: 210 + Math.floor(i / 3) * 170, thirsty: 0, bloom: 0 })); S.next = 0.6; }
    if (kind === 'sort') { S.order = [...ITEMS].sort(() => R() - 0.5); S.i = 0; S.shake = 0; S.flash = null; S.wait = 0; }
    if (kind === 'count') { S.round = 0; S.newRound = () => { S.n = 3 + Math.floor(R() * (opts.age === 'big' ? 7 : 5)); S.fish = [...Array(S.n)].map(() => ({ x: 80 + R() * 560, y: 120 + R() * 220, vx: (R() < 0.5 ? -1 : 1) * (30 + R() * 40), c: ['#ff8a3d', '#ffd23f', '#ff6f91', '#7fc2ff'][Math.floor(R() * 4)] })); const opts3 = new Set([S.n]); while (opts3.size < 3) opts3.add(Math.max(1, S.n + Math.floor(R() * 5) - 2)); S.choices = [...opts3].sort((a, b) => a - b); S.ask = 0; S.answered = null; }; S.newRound(); }
    if (kind === 'clouds') { S.spawn = 0; S.clouds = []; S.puffs = []; }
    if (kind === 'find') { S.bushes = [0, 1, 2].map((i) => ({ x: 160 + i * 200, slot: i })); S.hide = Math.floor(R() * 3); S.stage = 'peek'; S.st = 0; S.swaps = 0; S.swap = null; S.reveal = null; }
    const img = new Image(); if (opts.friendImg) img.src = opts.friendImg;
    let lives = 3, inv = 0, hits = 0, won = false;
    if (kind === 'runner') { S.y = 0; S.vy = 0; S.obs = []; S.spawn = 1.2; S.flagX = null; S.dist = 0; S.len = 20; }
    if (kind === 'race') { S.lane = 1; S.lx = 360; S.obs = []; S.spawn = 1; S.dist = 0; S.len = 20; S.finishY = null; }
    if (kind === 'river') { S.stones = [...Array(6)].map((_, i) => ({ x: 140 + i * 90, ph: R() * 6, per: 2.2 + R() * 0.8 })); S.at = -1; S.jump = null; S.limit = 32; }
    if (kind === 'flappy') { S.y = 240; S.vy = 0; S.reeds = []; S.spawn = 1.2; S.dist = 0; S.len = 20; S.nestX = null; }
    if (kind === 'maze') {
      const C = 9, Rw = 6; S.C = C; S.Rw = Rw; S.walls = [...Array(C * Rw)].map(() => [1, 1, 1, 1]); const seen = new Set([0]), stack = [0], D = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
      while (stack.length) { const c = stack[stack.length - 1], x = c % C, y = (c / C) | 0; const nb = D.map(([dx, dy, w, o]) => [x + dx, y + dy, w, o]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < C && ny < Rw && !seen.has(ny * C + nx)); if (!nb.length) { stack.pop(); continue; } const [nx, ny, w, o] = nb[Math.floor(R() * nb.length)], n = ny * C + nx; S.walls[c][w] = 0; S.walls[n][o] = 0; seen.add(n); stack.push(n); }
      S.px = 0; S.py = 0; S.dx = 0; S.dy = 0; S.goal = [C - 1, Rw - 1]; S.path = null; S.botT = 0;
    }
    function hurt() { if (inv > 0) return; lives--; hits++; inv = 1.3; sfx.bad && sfx.bad(); if (lives <= 0) phase = 'end'; }
    function press(k) {
      if (phase !== 'play') return;
      if ((kind === 'runner') && k === 'act' && S.y <= 0.01) { S.vy = 640; sfx.good && sfx.good(); }
      if (kind === 'flappy' && (k === 'act' || k === 'up')) S.vy = -330;
      if (kind === 'race') { if (k === 'left') S.lane = Math.max(0, S.lane - 1); if (k === 'right') S.lane = Math.min(2, S.lane + 1); }
      if (kind === 'river' && k === 'act' && !S.jump && S.at < 6) S.jump = { from: S.at, t: 0 };
      if (kind === 'maze') { const d = { up: [0, -1, 0], right: [1, 0, 1], down: [0, 1, 2], left: [-1, 0, 3] }[k]; if (!d) return; const c = S.py * S.C + S.px; if (!S.walls[c][d[2]]) { S.px += d[0]; S.py += d[1]; sfx.good && sfx.good(); if (S.px === S.goal[0] && S.py === S.goal[1]) { won = true; phase = 'end'; } } else sfx.bad && sfx.bad(); }
    }
    const stoneUp = (s2, tt) => Math.sin(tt * (TAU / s2.per) + s2.ph) > -0.15;

    function finish() {
      if (done) return; done = true;
      const action = ['runner', 'race', 'river', 'flappy'].includes(kind);
      const stars = kind === 'find' ? score : action ? (won ? Math.max(1, 3 - hits) : 0) : kind === 'maze' ? (won ? (t <= 18 ? 3 : t <= 30 ? 2 : 1) : 0) : info.goals.filter((x) => score >= x).length;
      endEl.hidden = false; endEl.querySelector('.mini-stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.2}s">★</span>`).join('');
      endEl.querySelector('.mini-cheer').textContent = stars >= 3 ? 'Tuyệt vời quá!' : stars === 2 ? 'Giỏi lắm!' : stars === 1 ? (opts.rescue ? 'Về đích rồi!' : 'Cố lên nhé!') : opts.rescue ? 'Chưa được rồi, lần sau thử lại nhé!' : 'Lần sau sẽ tốt hơn!';
      say(endEl.querySelector('.mini-cheer').textContent); if (sfx.win) sfx.win();
      window.removeEventListener('keydown', onKey);
      return new Promise((res) => { const close = () => { root.hidden = true; cv.onpointerdown = cv.onpointermove = null; res(stars); }; endEl.querySelector('button').onclick = close; setTimeout(close, opts.bot ? 300 : 2600); });
    }

    // ---------- input ----------
    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
    function tap(p) {
      if (phase !== 'play') return;
      if (kind === 'catch') S.target = p.x;
      if (kind === 'sprout') S.pots.forEach((q) => { if (q.thirsty > 0 && Math.hypot(p.x - q.x, p.y - q.y) < 80) { q.thirsty = 0; q.bloom = 1; score++; sfx.good && sfx.good(); } });
      if (kind === 'sort' && S.i < S.order.length && S.wait <= 0) { const bin = p.x < W / 2 ? 0 : 1; if (p.y < 300) return; const it = S.order[S.i]; if (bin === it.bin) { score++; S.flash = { ok: true, t: 0.6 }; S.i++; S.wait = 0.5; sfx.good && sfx.good(); if (S.i >= S.order.length) phase = 'end'; } else { S.shake = 0.5; S.flash = { ok: false, t: 0.8 }; sfx.bad && sfx.bad(); S.i++; S.wait = 0.9; if (S.i >= S.order.length) phase = 'end'; } }
      if (kind === 'count' && S.ask > 3.5 && S.answered == null) S.choices.forEach((n, i) => { const x = 180 + i * 180; if (Math.abs(p.x - x) < 70 && Math.abs(p.y - 410) < 50) { S.answered = n; if (n === S.n) { score++; sfx.good && sfx.good(); } else sfx.bad && sfx.bad(); S.after = 1.2; } });
      if (kind === 'clouds') for (let i = S.clouds.length - 1; i >= 0; i--) { const c = S.clouds[i]; if (Math.hypot(p.x - c.x, p.y - c.y) < c.r * 1.3) { S.puffs.push({ x: c.x, y: c.y, t: 0 }); S.clouds.splice(i, 1); score++; sfx.good && sfx.good(); break; } }
      if (kind === 'find' && S.stage === 'pick') { const b = S.bushes.find((q) => Math.abs(p.x - q.x) < 90 && p.y > 200); if (!b) return; tries++; if (b.slot === S.hide) { score = tries === 1 ? 3 : 1; S.reveal = { b, t: 0, ok: true }; S.stage = 'found'; sfx.good && sfx.good(); } else { S.reveal = { b, t: 0, ok: false }; sfx.bad && sfx.bad(); if (tries >= 2) { score = 0; S.stage = 'missed'; S.st = 0; } } }
    }
    cv.onpointerdown = (e) => { e.preventDefault(); tap(pt(e)); };
    cv.onpointermove = (e) => { if (kind === 'catch' && (e.buttons || e.pointerType === 'mouse')) S.target = pt(e).x; };

    // ---------- bot (self-test) ----------
    function bot(dt) {
      if (kind === 'catch') { const a = S.items.filter((x) => x.y < 420).sort((x, y) => y.y - x.y)[0]; if (a) S.target = a.x; }
      if (kind === 'sprout') { const q = S.pots.find((x) => x.thirsty > 0); if (q) tap({ x: q.x, y: q.y }); }
      if (kind === 'sort' && S.i < S.order.length && S.wait <= 0) tap({ x: S.order[S.i].bin ? W * 0.75 : W * 0.25, y: 400 });
      if (kind === 'count' && S.ask > 3.5 && S.answered == null) tap({ x: 180 + S.choices.indexOf(S.n) * 180, y: 410 });
      if (kind === 'clouds' && S.clouds.length) tap({ x: S.clouds[0].x, y: S.clouds[0].y });
      if (kind === 'find' && S.stage === 'pick') { const b = S.bushes.find((q) => q.slot === S.hide); tap({ x: b.x, y: 330 }); }
      if (kind === 'runner') { const o = S.obs.find((q) => q.x + q.w > 120); if (o && o.x - 150 < 105 && o.x - 150 > 40) press('act'); }
      if (kind === 'race') { const blocked = (ln) => S.obs.some((o) => !o.flower && !o.hit && o.lane === ln && o.y > 120 && o.y < 440); if (blocked(S.lane)) { const safe = [0, 1, 2].filter((ln) => !blocked(ln)).sort((a, b) => Math.abs(a - S.lane) - Math.abs(b - S.lane))[0]; if (safe != null) press(safe < S.lane ? 'left' : 'right'); } }
      if (kind === 'river' && !S.jump && S.at < 5) { const nx = S.stones[S.at + 1]; if (Math.sin((t + 0.38) * (TAU / nx.per) + nx.ph) > 0.35 && Math.sin(t * (TAU / nx.per) + nx.ph) > 0.2) press('act'); } else if (kind === 'river' && !S.jump && S.at === 5) press('act');
      if (kind === 'flappy') { const nr = S.reeds.find((q) => q.x + 40 > 150); const want = nr ? nr.gap : 240; if (S.y > want + 18 && S.vy > -60) press('act'); }
      if (kind === 'maze') { if (!S.path) { const C = S.C, start = 0, goal = S.goal[1] * C + S.goal[0], prev = { [start]: -1 }, q = [start], D = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]]; while (q.length) { const c = q.shift(); if (c === goal) break; D.forEach(([dx, dy, w]) => { const n = c + dy * C + dx; if (!S.walls[c][w] && prev[n] === undefined) { prev[n] = c; q.push(n); } }); } const path = []; for (let c = goal; c !== start; c = prev[c]) path.unshift(c); S.path = path; }
        S.botT -= dt; if (S.botT <= 0 && S.path.length) { S.botT = 0.25; const n = S.path.shift(), nx = n % S.C, ny = (n / S.C) | 0; press(nx > S.px ? 'right' : nx < S.px ? 'left' : ny > S.py ? 'down' : 'up'); } }
    }

    // ---------- drawing helpers ----------
    function bg(top, bottom) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    function grass() { g.fillStyle = '#7ccf4e'; g.fillRect(0, H - 70, W, 70); g.fillStyle = '#5fbf3a'; for (let x = 0; x < W; x += 18) { g.beginPath(); g.moveTo(x, H - 70); g.lineTo(x + 9, H - 86); g.lineTo(x + 18, H - 70); g.fill(); } }
    function icon(name, x, y, s) { g.save(); g.translate(x, y); I()[name](g, s); g.restore(); }
    function bush(x, y, s) { g.fillStyle = '#3f9a2f'; [[-0.5, 0.1, 0.5], [0.5, 0.1, 0.5], [0, -0.2, 0.62]].forEach(([a, b, r]) => { g.beginPath(); g.arc(x + a * s, y + b * s, r * s, 0, TAU); g.fill(); }); g.fillStyle = '#5fbf3a'; [[-0.3, -0.25, 0.25], [0.25, -0.35, 0.22]].forEach(([a, b, r]) => { g.beginPath(); g.arc(x + a * s, y + b * s, r * s, 0, TAU); g.fill(); }); }
    function fish(f) { g.save(); g.translate(f.x, f.y); g.scale(f.vx > 0 ? 1 : -1, 1); g.fillStyle = f.c; g.beginPath(); g.ellipse(0, 0, 30, 18, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-26, 0); g.lineTo(-48, -16); g.lineTo(-48, 16); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(14, -4, 6, 0, TAU); g.fill(); g.fillStyle = '#233049'; g.beginPath(); g.arc(16, -4, 3, 0, TAU); g.fill(); g.restore(); }
    function cloud(c) { g.fillStyle = c.dark ? '#5b6274' : '#ffffff'; [[-0.5, 0.1, 0.6], [0.1, -0.2, 0.75], [0.6, 0.1, 0.55], [0, 0.25, 0.6]].forEach(([a, b, r]) => { g.beginPath(); g.arc(c.x + a * c.r, c.y + b * c.r, r * c.r, 0, TAU); g.fill(); }); if (c.dark) { g.fillStyle = '#fff'; g.beginPath(); g.arc(c.x - c.r * 0.25, c.y, c.r * 0.12, 0, TAU); g.arc(c.x + c.r * 0.25, c.y, c.r * 0.12, 0, TAU); g.fill(); g.fillStyle = '#233049'; g.beginPath(); g.arc(c.x - c.r * 0.25, c.y + 2, c.r * 0.06, 0, TAU); g.arc(c.x + c.r * 0.25, c.y + 2, c.r * 0.06, 0, TAU); g.fill(); } }

    // ---------- frame ----------
    let last = performance.now();
    return new Promise((resolve) => {
      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000) * speed; last = now;
        if (phase === 'count') { countT += dt; const n = 3 - Math.floor(countT / 0.7); countEl.textContent = n > 0 ? String(n) : 'Bắt đầu!'; if (countT > 2.6) { phase = 'play'; countEl.textContent = ''; countEl.classList.remove('dim'); } }
        else if (phase === 'play') { t += dt; if (opts.bot) bot(dt); }
        if (info.time) bar.style.width = Math.max(0, 100 - (t / info.time) * 100) + '%'; else bar.style.width = '100%';
        // update + draw
        if (kind === 'catch') {
          bg('#bfe6ff', '#eaf7e6'); grass();
          S.basket += (S.target - S.basket) * Math.min(1, dt * 12);
          if (phase === 'play') { S.spawn -= dt; if (S.spawn < 0) { S.spawn = 0.55 + R() * 0.35; S.items.push({ x: 60 + R() * 600, y: -30, v: 120 + R() * 90, gold: R() < 0.12 }); } }
          S.items.forEach((a) => { a.y += a.v * dt; if (Math.abs(a.x - S.basket) < 70 && a.y > 370 && a.y < 410 && !a.got) { a.got = true; score += a.gold ? 2 : 1; sfx.good && sfx.good(); } });
          S.items = S.items.filter((a) => !a.got && a.y < H + 40);
          S.items.forEach((a) => { if (a.gold) { g.save(); g.shadowColor = '#ffd23f'; g.shadowBlur = 20; } icon('seed', a.x, a.y, a.gold ? 70 : 60); if (a.gold) g.restore(); });
          g.fillStyle = '#c98a4a'; g.beginPath(); g.moveTo(S.basket - 75, 380); g.lineTo(S.basket + 75, 380); g.lineTo(S.basket + 55, 440); g.lineTo(S.basket - 55, 440); g.fill(); g.strokeStyle = '#8a5a2b'; g.lineWidth = 4; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(S.basket + k * 26, 382); g.lineTo(S.basket + k * 20, 438); g.stroke(); }
          if (info.time && t >= info.time) phase = 'end';
        }
        if (kind === 'sprout') {
          bg('#ffe9b8', '#f6f0d8');
          if (phase === 'play') { S.next -= dt; if (S.next < 0) { S.next = 0.7 + R() * 0.6; const free = S.pots.filter((q) => !q.thirsty); if (free.length) free[Math.floor(R() * free.length)].thirsty = 2.6; } }
          S.pots.forEach((q) => { if (q.thirsty > 0) { q.thirsty -= dt; if (q.thirsty <= 0) q.thirsty = 0; } q.bloom = Math.max(0, q.bloom - dt * 0.6);
            g.fillStyle = '#c96a3a'; g.beginPath(); g.moveTo(q.x - 55, q.y + 20); g.lineTo(q.x + 55, q.y + 20); g.lineTo(q.x + 42, q.y + 80); g.lineTo(q.x - 42, q.y + 80); g.fill(); g.fillStyle = '#7a4a26'; g.fillRect(q.x - 52, q.y + 14, 104, 12);
            const droop = q.thirsty > 0 ? 0.7 : 0; g.strokeStyle = droop ? '#9a8a3a' : '#3f9a2f'; g.lineWidth = 7; g.beginPath(); g.moveTo(q.x, q.y + 16); g.quadraticCurveTo(q.x + droop * 30, q.y - 30, q.x + droop * 40, q.y - 40 + droop * 30); g.stroke();
            g.fillStyle = droop ? '#b5a24a' : '#5cc03a'; g.beginPath(); g.ellipse(q.x - 18 + droop * 30, q.y - 24 + droop * 24, 20, 11, -0.6, 0, TAU); g.fill(); g.beginPath(); g.ellipse(q.x + 18 + droop * 34, q.y - 36 + droop * 26, 20, 11, 0.6, 0, TAU); g.fill();
            if (q.bloom > 0) { for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.fillStyle = '#ff8fb8'; g.beginPath(); g.arc(q.x + Math.cos(a) * 14, q.y - 52 + Math.sin(a) * 14, 10, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(q.x, q.y - 52, 9, 0, TAU); g.fill(); }
            if (q.thirsty > 0) icon('water', q.x + 50, q.y - 70 + Math.sin(t * 6) * 6, 50); });
          if (t >= info.time) phase = 'end';
        }
        if (kind === 'sort') {
          bg('#d8f0ff', '#eef7e8');
          S.wait -= dt; S.shake = Math.max(0, S.shake - dt); if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
          g.fillStyle = '#3fbf5f'; g.fillRect(70, 320, 220, 140); g.fillStyle = '#2f9a4a'; g.fillRect(60, 305, 240, 26); icon('plant', 180, 395, 110);
          g.fillStyle = '#3fa7e6'; g.fillRect(430, 320, 220, 140); g.fillStyle = '#2f8ac6'; g.fillRect(420, 305, 240, 26);
          g.save(); g.translate(540, 395); ITEMS[4].draw(g, 90); g.restore();
          g.fillStyle = '#fff'; g.font = '800 26px "Baloo 2", system-ui'; g.textAlign = 'center'; g.fillText('Hữu cơ', 180, 450); g.fillText('Tái chế', 540, 450);
          if (S.i < S.order.length) { const it = S.order[S.i], ox = S.shake ? Math.sin(t * 60) * 12 : 0; g.save(); g.translate(W / 2 + ox, 170 + Math.sin(t * 3) * 6); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(0, 0, 95, 0, TAU); g.fill(); it.draw(g, 170); g.restore(); g.fillStyle = '#233049'; g.font = '800 30px "Baloo 2", system-ui'; g.fillText(it.name, W / 2, 300 - 10); }
          if (S.flash) { g.fillStyle = S.flash.ok ? '#3fbf5f' : '#ff6f61'; g.font = '800 40px "Baloo 2", system-ui'; g.fillText(S.flash.ok ? 'Đúng rồi!' : 'Chưa đúng, thử nhớ nhé!', W / 2, 60); }
          g.fillStyle = '#233049'; g.font = '800 22px "Nunito", system-ui'; g.textAlign = 'right'; g.fillText(`${Math.min(S.i + 1, S.order.length)}/${S.order.length}`, W - 20, 30); g.textAlign = 'center';
          if (phase === 'end' && S.wait > 0) { /* let the last flash show */ }
        }
        if (kind === 'count') {
          bg('#7fd0ff', '#3fa7e6');
          g.fillStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse((k * 140 + t * 20) % (W + 100) - 50, 60 + k * 9, 60, 8, 0, 0, TAU); g.fill(); }
          S.fish.forEach((f) => { f.x += f.vx * dt * (S.ask ? 0.35 : 1); if (f.x < 60 || f.x > W - 60) f.vx *= -1; f.y += Math.sin(t * 2 + f.x) * 0.2; fish(f); });
          g.fillStyle = '#3f9a3a'; for (let x = 20; x < W; x += 60) { g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + 20 + Math.sin(t * 2 + x) * 10, H - 70, x + 10, H - 120); g.lineTo(x + 18, H); g.fill(); }
          if (phase === 'play') { S.ask += dt; }
          if (S.ask > 3.5) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(60, 18, 600, 56); g.fillStyle = '#233049'; g.font = '800 32px "Baloo 2", system-ui'; g.textAlign = 'center'; g.fillText('Có bao nhiêu chú cá?', W / 2, 58);
            S.choices.forEach((n, i) => { const x = 180 + i * 180, ok = S.answered != null && n === S.n, bad = S.answered === n && n !== S.n; g.fillStyle = ok ? '#3fbf5f' : bad ? '#ff6f61' : '#ffffff'; g.beginPath(); g.arc(x, 410, 52, 0, TAU); g.fill(); g.fillStyle = ok || bad ? '#fff' : '#233049'; g.font = '800 56px "Baloo 2", system-ui'; g.fillText(String(n), x, 430); }); }
          else S.ask = phase === 'play' ? S.ask : 0;
          if (S.answered != null) { S.after -= dt; if (S.after <= 0) { S.round++; if (S.round >= 3) phase = 'end'; else S.newRound(); } }
        }
        if (kind === 'clouds') {
          bg('#9fd6ff', '#e8f7ff'); grass();
          for (let k = 0; k < 7; k++) { g.fillStyle = '#3f9a2f'; g.beginPath(); g.arc(60 + k * 100, H - 80, 38, 0, TAU); g.fill(); }
          if (phase === 'play') { S.spawn -= dt; if (S.spawn < 0) { S.spawn = 0.6 + R() * 0.5; S.clouds.push({ x: -60, y: 70 + R() * 220, r: 42 + R() * 18, v: 60 + R() * 60, dark: true }); } }
          S.clouds.forEach((c) => { c.x += c.v * dt; cloud(c); }); S.clouds = S.clouds.filter((c) => c.x < W + 80);
          S.puffs.forEach((p) => { p.t += dt; g.globalAlpha = Math.max(0, 1 - p.t); cloud({ x: p.x, y: p.y - p.t * 40, r: 30 * (1 + p.t), dark: false }); g.globalAlpha = 1; for (let k = 0; k < 6; k++) star(g, p.x + Math.cos(k) * 60 * p.t, p.y + Math.sin(k) * 60 * p.t, 10, '#ffd23f'); }); S.puffs = S.puffs.filter((p) => p.t < 1);
          if (t >= info.time) phase = 'end';
        }
        if (kind === 'find') {
          bg('#cfeec0', '#9fd67a');
          S.st += dt;
          if (S.stage === 'peek' && S.st > 2.2) { S.stage = 'shuffle'; S.st = 0; }
          if (S.stage === 'shuffle') { if (!S.swap) { const a = Math.floor(R() * 3), b = (a + 1 + Math.floor(R() * 2)) % 3; S.swap = { a: S.bushes.find((q) => q.slot === a), b: S.bushes.find((q) => q.slot === b), t: 0, ax: 0, bx: 0 }; S.swap.ax = S.swap.a.x; S.swap.bx = S.swap.b.x; }
            const sw = S.swap; sw.t += dt / 0.9; const k = Math.min(1, sw.t), e = k * k * (3 - 2 * k); sw.a.x = sw.ax + (sw.bx - sw.ax) * e; sw.b.x = sw.bx + (sw.ax - sw.bx) * e; sw.a.lift = Math.sin(k * Math.PI) * 40; sw.b.lift = -Math.sin(k * Math.PI) * 20;
            if (k >= 1) { sw.a.lift = sw.b.lift = 0; S.swap = null; S.swaps++; if (S.swaps >= 3) { S.stage = 'pick'; say('Bạn ấy trốn ở bụi nào?'); } } }
          const hideB = S.bushes.find((q) => q.slot === S.hide);
          S.bushes.forEach((q) => { const y = 340 - (q.lift || 0); const showFriend = (S.stage === 'peek' && q === hideB) || (S.stage === 'found' && S.reveal && S.reveal.b === q); if (showFriend && img.complete && img.naturalWidth) { const pop = S.stage === 'peek' ? Math.min(1, S.st * 2) : Math.min(1, S.reveal.t * 3); g.drawImage(img, q.x - 70, y - 160 * pop - 20, 140, 140); } bush(q.x, y, 90); if (S.reveal && S.reveal.b === q && !S.reveal.ok) { g.fillStyle = '#233049'; g.font = '800 30px "Baloo 2", system-ui'; g.textAlign = 'center'; g.fillText('Không có ở đây!', q.x, y - 120); } });
          if (S.reveal) { S.reveal.t += dt; if (!S.reveal.ok && S.reveal.t > 1) S.reveal = null; }
          g.fillStyle = '#233049'; g.font = '800 32px "Baloo 2", system-ui'; g.textAlign = 'center';
          g.fillText(S.stage === 'peek' ? 'Nhìn kỹ nè: bạn ấy trốn ở đây!' : S.stage === 'shuffle' ? 'Các bụi cây đang đổi chỗ…' : S.stage === 'pick' ? `Chạm vào bụi cây có bạn ấy! (còn ${2 - tries} lần)` : S.stage === 'missed' ? 'Tiếc quá!' : 'Tìm thấy rồi!', W / 2, 60);
          if (S.stage === 'found' && S.reveal && S.reveal.t > 1.4) phase = 'end';
          if (S.stage === 'missed') { const hb = S.bushes.find((q) => q.slot === S.hide); if (img.complete && img.naturalWidth) g.drawImage(img, hb.x - 70, 340 - 170, 140, 140); g.fillStyle = '#233049'; g.font = '800 30px "Baloo 2", system-ui'; g.fillText('Bạn ấy trốn ở đây cơ!', W / 2, 110); if (S.st > 1.8) phase = 'end'; }
        }
        if (kind === 'runner') {
          bg('#bfe6ff', '#f2f8e8'); const GY = 380;
          for (let k = 0; k < 6; k++) { g.fillStyle = '#9fd67a'; g.beginPath(); g.arc(((k * 170 - S.dist * 0.3) % 1020 + 1020) % 1020 - 100, GY + 10, 90, Math.PI, 0); g.fill(); }
          g.fillStyle = '#c9a66a'; g.fillRect(0, GY, W, H - GY); g.fillStyle = '#7ccf4e'; g.fillRect(0, GY - 6, W, 10);
          if (phase === 'play') { const SUB = Math.max(1, Math.ceil(dt / 0.016)), h = dt / SUB; for (let ss = 0; ss < SUB && phase === 'play'; ss++) { if (opts.bot && ss > 0) bot(h); const v = 270 + t * 4; S.dist += v * h; S.spawn -= h; if (S.spawn < 0 && t < S.len - 1.5) { S.spawn = 1.15 + R() * 0.8; const kk = Math.floor(R() * 3); S.obs.push({ x: W + 40, w: [46, 70, 40][kk], h: [44, 34, 52][kk], k: kk }); } S.obs.forEach((o) => (o.x -= v * h)); S.obs = S.obs.filter((o) => o.x > -100); S.vy -= 1500 * h; S.y = Math.max(0, S.y + S.vy * h); if (S.y === 0) S.vy = 0; if (t >= S.len && S.flagX == null) S.flagX = W + 40; if (S.flagX != null) { S.flagX -= v * h; if (S.flagX < 170) { won = true; phase = 'end'; } } inv = Math.max(0, inv - h); S.obs.forEach((o) => { if (o.x < 180 && o.x + o.w > 125 && S.y < o.h - 6) hurt(); }); } }
          S.obs.forEach((o) => { g.fillStyle = ['#9a948a', '#8a5a2b', '#e2483d'][o.k]; if (o.k === 0) { g.beginPath(); g.ellipse(o.x + o.w / 2, GY - o.h / 2 + 4, o.w / 2, o.h / 2, 0, 0, TAU); g.fill(); } else if (o.k === 1) { g.fillRect(o.x, GY - o.h, o.w, o.h); g.fillStyle = '#c99a5a'; g.beginPath(); g.ellipse(o.x + o.w, GY - o.h / 2, 10, o.h / 2, 0, 0, TAU); g.fill(); } else { g.fillStyle = '#fff6e8'; g.fillRect(o.x + o.w / 2 - 8, GY - o.h + 20, 16, o.h - 20); g.fillStyle = '#e2483d'; g.beginPath(); g.arc(o.x + o.w / 2, GY - o.h + 22, o.w / 2 + 6, Math.PI, 0); g.fill(); } });
          if (S.flagX != null) { g.fillStyle = '#8a5a2b'; g.fillRect(S.flagX, GY - 150, 8, 150); g.fillStyle = '#ffd23f'; g.fillRect(S.flagX + 8, GY - 150, 70, 44); g.fillStyle = '#233049'; g.font = '800 22px "Baloo 2", system-ui'; g.textAlign = 'left'; g.fillText('NHÀ', S.flagX + 16, GY - 120); g.textAlign = 'center'; }
          if (!(inv > 0 && Math.floor(t * 12) % 2)) { if (img.complete && img.naturalWidth) g.drawImage(img, 105, GY - 100 - S.y, 100, 100); else icon('paw', 150, GY - 50 - S.y, 80); }
        }
        if (kind === 'race') {
          bg('#7ccf4e', '#5fbf3a'); g.fillStyle = '#d9b97a'; g.fillRect(170, 0, 380, H); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 6; g.setLineDash([30, 30]); g.lineDashOffset = -S.dist; for (const x of [297, 423]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } g.setLineDash([]);
          for (let k = 0; k < 8; k++) { const y = ((k * 120 + S.dist * 0.9) % 960) - 60; g.fillStyle = '#3f9a2f'; g.beginPath(); g.arc(90, y, 40, 0, TAU); g.arc(630, y + 50, 40, 0, TAU); g.fill(); }
          const LX = [233, 360, 487];
          if (phase === 'play') { const SUB = Math.max(1, Math.ceil(dt / 0.016)), h = dt / SUB; for (let ss = 0; ss < SUB && phase === 'play'; ss++) { if (opts.bot && ss > 0) bot(h); S.lx += ([233, 360, 487][S.lane] - S.lx) * Math.min(1, h * 14); const v = 260 + t * 4; S.dist += v * h; S.spawn -= h; if (S.spawn < 0 && t < S.len - 1.5) { S.spawn = 1.0 + R() * 0.5; const free = Math.floor(R() * 3), rocks = [0, 1, 2].filter((ln) => ln !== free); (R() < 0.7 ? [rocks[Math.floor(R() * 2)]] : rocks).forEach((ln) => S.obs.push({ lane: ln, y: -40 })); if (R() < 0.6) S.obs.push({ lane: free, y: -40, flower: true }); } S.obs.forEach((o) => (o.y += v * h)); inv = Math.max(0, inv - h);
            S.obs.forEach((o) => { if (!o.hit && o.y > 360 && o.y < 430 && o.lane === S.lane) { o.hit = true; if (o.flower) { score++; sfx.good && sfx.good(); } else if (o.lane !== undefined && !o.flower && !o.free) hurt(); } }); S.obs = S.obs.filter((o) => o.y < H + 40 && !(o.flower && o.hit)); if (t >= S.len && S.finishY == null) S.finishY = -30; if (S.finishY != null) { S.finishY += v * h; if (S.finishY > 380) { won = true; phase = 'end'; } } } }
          S.lx += (LX[S.lane] - S.lx) * Math.min(1, dt * 14);
          S.obs.forEach((o) => { if (o.flower) { for (let q = 0; q < 5; q++) { const a = q * TAU / 5; g.fillStyle = '#ff8fb8'; g.beginPath(); g.arc(LX[o.lane] + Math.cos(a) * 14, o.y + Math.sin(a) * 14, 11, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(LX[o.lane], o.y, 9, 0, TAU); g.fill(); } else if (!o.flower) { g.fillStyle = '#8a847a'; g.beginPath(); g.ellipse(LX[o.lane], o.y, 38, 28, 0, 0, TAU); g.fill(); g.fillStyle = '#a8a49a'; g.beginPath(); g.ellipse(LX[o.lane] - 8, o.y - 8, 18, 12, 0, 0, TAU); g.fill(); } });
          if (S.finishY != null) { for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? '#233049' : '#ffffff'; g.fillRect(170 + k * 38, S.finishY, 38, 20); } }
          if (!(inv > 0 && Math.floor(t * 12) % 2)) { g.fillStyle = '#3fbf5f'; g.beginPath(); g.ellipse(S.lx, 405, 44, 60, 0, 0, TAU); g.fill(); g.strokeStyle = '#2f8f3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(S.lx, 350); g.lineTo(S.lx, 462); g.stroke(); if (img.complete && img.naturalWidth) g.drawImage(img, S.lx - 40, 340, 80, 80); }
          g.fillStyle = '#233049'; g.font = '800 26px "Baloo 2", system-ui'; g.textAlign = 'right'; g.fillText(`Hoa: ${score}`, W - 20, 36); g.textAlign = 'center';
        }
        if (kind === 'river') {
          bg('#bfe6ff', '#e8f7ff'); g.fillStyle = '#4fb3e8'; g.fillRect(0, 280, W, 200); g.fillStyle = 'rgba(255,255,255,.4)'; for (let k = 0; k < 12; k++) g.fillRect(((k * 80 + t * 60) % (W + 80)) - 40, 300 + (k % 4) * 40, 40, 4);
          g.fillStyle = '#7ccf4e'; g.fillRect(0, 250, 90, 230); g.fillRect(W - 90, 250, 90, 230); icon('home', W - 45, 220, 80);
          if (phase === 'play') { inv = Math.max(0, inv - dt); if (S.jump) { S.jump.t += dt; if (S.jump.t >= 0.38) { const to = S.jump.from + 1; if (to >= 6) { S.at = 6; won = true; phase = 'end'; } else if (stoneUp(S.stones[to], t)) { S.at = to; sfx.good && sfx.good(); } else { S.splash = 0.8; hurt(); } S.jump = null; } } if (t >= S.limit && !won) { lives = 0; phase = 'end'; } }
          S.splash = Math.max(0, (S.splash || 0) - dt);
          S.stones.forEach((s2, i) => { const up = stoneUp(s2, t), k = (Math.sin(t * (TAU / s2.per) + s2.ph) + 1) / 2, y = 300 + (1 - k) * 26; g.fillStyle = up ? '#9a948a' : 'rgba(120,120,110,.45)'; g.beginPath(); g.ellipse(s2.x, y, 36, 16 + k * 6, 0, 0, TAU); g.fill(); if (i === S.at + 1 && !S.jump) { g.strokeStyle = up ? '#3fbf5f' : '#ff6f61'; g.lineWidth = 5; g.beginPath(); g.ellipse(s2.x, y, 44, 24, 0, 0, TAU); g.stroke(); } });
          const sx = S.at < 0 ? 45 : S.at >= 6 ? W - 45 : S.stones[S.at].x, nx = S.jump ? (S.jump.from + 1 >= 6 ? W - 45 : S.stones[S.jump.from + 1].x) : sx, jk = S.jump ? S.jump.t / 0.38 : 0, px = sx + (nx - sx) * jk, py = 250 - Math.sin(jk * Math.PI) * 70 - (S.splash ? -40 : 0);
          if (img.complete && img.naturalWidth) g.drawImage(img, px - 45, py - 80, 90, 90); if (S.splash) { g.fillStyle = 'rgba(255,255,255,.8)'; for (let q = 0; q < 6; q++) { g.beginPath(); g.arc(px + Math.cos(q) * 30, 300 + Math.sin(q) * 10, 8, 0, TAU); g.fill(); } }
          bar.style.width = Math.max(0, 100 - (t / S.limit) * 100) + '%';
        }
        if (kind === 'flappy') {
          bg('#ffd9a8', '#bfe6ff'); g.fillStyle = '#4fb3e8'; g.fillRect(0, 430, W, 50);
          if (phase === 'play') { const SUB = Math.max(1, Math.ceil(dt / 0.016)), h = dt / SUB; for (let ss = 0; ss < SUB && phase === 'play'; ss++) { if (opts.bot && ss > 0) bot(h); const v = 170; S.dist += v * h; S.spawn -= h; if (S.spawn < 0 && t < S.len - 2) { S.spawn = 2.1 + R() * 0.4; S.reeds.push({ x: W + 40, gap: 150 + R() * 170 }); } S.reeds.forEach((q) => (q.x -= v * h)); S.reeds = S.reeds.filter((q) => q.x > -80); S.vy += 900 * h; S.y += S.vy * h; inv = Math.max(0, inv - h);
            if (S.y > 410 || S.y < 30) { hurt(); S.y = Math.min(400, Math.max(40, S.y)); S.vy = -120; } S.reeds.forEach((q) => { if (q.x < 200 && q.x + 40 > 160 && Math.abs(S.y - q.gap) > 100) { hurt(); } }); if (t >= S.len && S.nestX == null) S.nestX = W + 60; if (S.nestX != null) { S.nestX -= v * h; if (S.nestX < 200) { won = true; phase = 'end'; } } } }
          S.reeds.forEach((q) => { g.fillStyle = '#7a9a3a'; g.fillRect(q.x, 0, 40, q.gap - 100); g.fillRect(q.x, q.gap + 100, 40, H - q.gap - 100); g.fillStyle = '#c9a65a'; g.beginPath(); g.ellipse(q.x + 20, q.gap - 100, 26, 14, 0, 0, TAU); g.ellipse(q.x + 20, q.gap + 100, 26, 14, 0, 0, TAU); g.fill(); });
          if (S.nestX != null) { g.fillStyle = '#8a5a2b'; g.beginPath(); g.ellipse(S.nestX, 400, 70, 26, 0, 0, TAU); g.fill(); g.fillStyle = '#e9ebee'; g.beginPath(); g.arc(S.nestX - 20, 380, 16, 0, TAU); g.arc(S.nestX + 14, 384, 14, 0, TAU); g.fill(); }
          if (!(inv > 0 && Math.floor(t * 12) % 2)) { g.save(); g.translate(180, S.y); g.rotate(Math.max(-0.5, Math.min(0.6, S.vy / 600))); if (img.complete && img.naturalWidth) g.drawImage(img, -50, -60, 100, 100); else icon('cloud', 0, 0, 80); g.restore(); }
        }
        if (kind === 'maze') {
          bg('#5a5248', '#3a342e'); const cs = 64, ox = (W - S.C * cs) / 2, oy = (H - S.Rw * cs) / 2 + 10;
          g.fillStyle = '#c9b48e'; g.fillRect(ox, oy, S.C * cs, S.Rw * cs);
          g.strokeStyle = '#4a3a2a'; g.lineWidth = 8; g.lineCap = 'round';
          S.walls.forEach((w2, c) => { const x = ox + (c % S.C) * cs, y = oy + ((c / S.C) | 0) * cs; g.beginPath(); if (w2[0]) { g.moveTo(x, y); g.lineTo(x + cs, y); } if (w2[1]) { g.moveTo(x + cs, y); g.lineTo(x + cs, y + cs); } if (w2[2]) { g.moveTo(x, y + cs); g.lineTo(x + cs, y + cs); } if (w2[3]) { g.moveTo(x, y); g.lineTo(x, y + cs); } g.stroke(); });
          for (let k = 0; k < 5; k++) { g.fillStyle = ['#8fd6ff', '#c9a8ff', '#9fffc9'][k % 3]; g.beginPath(); const x = ox + ((k * 3 + 1) % S.C) * cs + 30, y = oy + ((k * 2) % S.Rw) * cs + 50; g.moveTo(x, y - 14); g.lineTo(x + 7, y); g.lineTo(x, y + 6); g.lineTo(x - 7, y); g.fill(); }
          if (img.complete && img.naturalWidth) g.drawImage(img, ox + S.goal[0] * cs + 4, oy + S.goal[1] * cs + 4, cs - 8, cs - 8);
          S.dx += (S.px - S.dx) * Math.min(1, dt * 14); S.dy += (S.py - S.dy) * Math.min(1, dt * 14);
          if (opts.face) { if (!S.faceImg) { S.faceImg = new Image(); S.faceImg.src = opts.face; } if (S.faceImg.complete && S.faceImg.naturalWidth) g.drawImage(S.faceImg, ox + S.dx * cs + 4, oy + S.dy * cs + 4, cs - 8, cs - 8); else icon('paw', ox + S.dx * cs + cs / 2, oy + S.dy * cs + cs / 2, 50); } else icon('paw', ox + S.dx * cs + cs / 2, oy + S.dy * cs + cs / 2, 50);
          if (phase === 'play' && t >= info.time && !won) phase = 'end';
        }
        if (['runner', 'race', 'river', 'flappy'].includes(kind)) for (let k = 0; k < 3; k++) { g.save(); g.translate(40 + k * 46, 40); I().heart(g, 50); g.restore(); if (k >= lives) { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(40 + k * 46, 40, 22, 0, TAU); g.fill(); } }
        // score chip
        if (['catch', 'sprout', 'clouds'].includes(kind)) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(W - 60, 52, 38, 0, TAU); g.fill(); g.fillStyle = '#233049'; g.font = '800 34px "Baloo 2", system-ui'; g.textAlign = 'center'; g.fillText(String(score), W - 60, 64); }
        if (phase === 'end' && !(kind === 'sort' && S.wait > 0)) { finish().then(resolve); return; }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  window.ForestMini = { play, INFO };
})();
