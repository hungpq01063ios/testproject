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
    find: { title: 'Tìm bạn trốn', how: 'Bạn nhỏ trốn trong bụi cây. Nhìn kỹ rồi chạm đúng bụi nhé!', icon: 'find', time: 0, goals: [1, 2, 3] },
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
    el.innerHTML = '<div class="mini-card"><div class="mini-head"><img class="mini-face" alt=""><div><div class="mini-title"></div><div class="mini-how"></div></div></div><div class="mini-stage"><canvas width="720" height="480"></canvas><div class="mini-count"></div><div class="mini-end" hidden><div class="mini-stars"></div><div class="mini-cheer"></div><button class="big" type="button">Xong!</button></div></div><div class="mini-bar"><div></div></div></div>';
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
    root.hidden = false; endEl.hidden = true; countEl.textContent = '';
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

    function finish() {
      if (done) return; done = true;
      const stars = kind === 'find' ? score : info.goals.filter((x) => score >= x).length;
      endEl.hidden = false; endEl.querySelector('.mini-stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.2}s">★</span>`).join('');
      endEl.querySelector('.mini-cheer').textContent = stars >= 3 ? 'Tuyệt vời quá!' : stars === 2 ? 'Giỏi lắm!' : stars === 1 ? 'Cố lên nhé!' : 'Lần sau sẽ tốt hơn!';
      say(endEl.querySelector('.mini-cheer').textContent); if (sfx.win) sfx.win();
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
      if (kind === 'find' && S.stage === 'pick') { const b = S.bushes.find((q) => Math.abs(p.x - q.x) < 90 && p.y > 200); if (!b) return; tries++; if (b.slot === S.hide) { score = Math.max(1, 4 - tries); S.reveal = { b, t: 0, ok: true }; S.stage = 'found'; sfx.good && sfx.good(); } else { S.reveal = { b, t: 0, ok: false }; sfx.bad && sfx.bad(); if (tries >= 3) { score = 1; S.stage = 'found'; S.reveal = { b: S.bushes.find((q) => q.slot === S.hide), t: 0, ok: true }; } } }
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
        if (phase === 'count') { countT += dt; const n = 3 - Math.floor(countT / 0.7); countEl.textContent = n > 0 ? String(n) : 'Bắt đầu!'; if (countT > 2.6) { phase = 'play'; countEl.textContent = ''; } }
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
          g.fillText(S.stage === 'peek' ? 'Nhìn kỹ nè: bạn ấy trốn ở đây!' : S.stage === 'shuffle' ? 'Các bụi cây đang đổi chỗ…' : S.stage === 'pick' ? 'Chạm vào bụi cây có bạn ấy!' : 'Tìm thấy rồi!', W / 2, 60);
          if (S.stage === 'found' && S.reveal && S.reveal.t > 1.4) phase = 'end';
        }
        // score chip
        if (kind !== 'find' && kind !== 'count' && kind !== 'sort') { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(W - 60, 52, 38, 0, TAU); g.fill(); g.fillStyle = '#233049'; g.font = '800 34px "Baloo 2", system-ui'; g.textAlign = 'center'; g.fillText(String(score), W - 60, 64); }
        if (phase === 'end' && !(kind === 'sort' && S.wait > 0)) { finish().then(resolve); return; }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  window.ForestMini = { play, INFO };
})();
