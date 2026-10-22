'use strict';
// =====================================================================
//  VẼ: phong cảnh, nhân vật bé gái, thú cưng, chướng ngại vật, lâu đài
//  Tất cả vẽ bằng Canvas – không cần file ảnh.
// =====================================================================

const Draw = {};
const PI2 = Math.PI * 2;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const mod = (a, n) => ((a % n) + n) % n;

Draw.rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fillStyle = fill; ctx.fill(); }
function ellipse(ctx, x, y, rx, ry, rot, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, PI2); ctx.fillStyle = fill; ctx.fill(); }

function star(ctx, x, y, r, fill, spikes = 5) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 ? r * 0.45 : r, a = (i * Math.PI) / spikes - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
Draw.star = star;

function heart(ctx, x, y, s, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
  ctx.fillStyle = fill; ctx.fill();
}
Draw.heart = heart;

const RAINBOW = ['#ff6b8b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];

Draw.cloud = (ctx, x, y, s, fill = 'rgba(255,255,255,0.92)') => {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, PI2); ctx.arc(x + 24 * s, y - 10 * s, 26 * s, 0, PI2);
  ctx.arc(x + 52 * s, y, 22 * s, 0, PI2); ctx.arc(x + 26 * s, y + 8 * s, 22 * s, 0, PI2);
  ctx.fill();
};

Draw.sun = (ctx, x, y, t, night) => {
  ctx.save(); ctx.translate(x, y);
  if (night) {
    circle(ctx, 0, 0, 30, '#fff7c2');
    circle(ctx, 12, -8, 26, 'rgba(183,166,255,1)');
  } else {
    ctx.rotate(t * 0.3);
    ctx.fillStyle = 'rgba(255,214,90,0.55)';
    for (let i = 0; i < 12; i++) { ctx.rotate(PI2 / 12); Draw.rr(ctx, 34, -4, 16, 8, 4); ctx.fill(); }
    ctx.rotate(-t * 0.3 - (PI2 / 12) * 12);
    circle(ctx, 0, 0, 30, '#ffd95a');
    circle(ctx, -10, -4, 3, '#7a4a2a'); circle(ctx, 10, -4, 3, '#7a4a2a');
    circle(ctx, -16, 6, 5, 'rgba(255,130,150,0.5)'); circle(ctx, 16, 6, 5, 'rgba(255,130,150,0.5)');
    ctx.beginPath(); ctx.arc(0, 4, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();
};

function hillPath(ctx, W, base, amp, camX, k, phase) {
  ctx.beginPath(); ctx.moveTo(0, base + 200);
  for (let x = 0; x <= W + 8; x += 8) {
    const u = x + camX * k;
    ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(u / 170 + phase)) - amp * 0.35 * Math.sin(u / 63 + phase * 2));
  }
  ctx.lineTo(W, base + 200); ctx.closePath();
}

// ---- Phong cảnh theo từng thế giới ----
Draw.scene = (ctx, W, H, gy, th, camX, t) => {
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  g.addColorStop(0, th.skyTop); g.addColorStop(1, th.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, gy);

  if (th.extra === 'clouds') {
    for (let i = 0; i < 40; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      star(ctx, mod(hash(i) * 2000 - camX * 0.05, W), hash(i + 40) * gy * 0.7, 2 + tw * 2.5, `rgba(255,255,255,${0.4 + tw * 0.5})`);
    }
  }
  if (th.extra === 'rainbow') {
    const cx = W * 0.62 - mod(camX * 0.03, 400), cy = gy + 30;
    ctx.lineWidth = 16; ctx.globalAlpha = 0.55;
    RAINBOW.forEach((c, i) => { ctx.beginPath(); ctx.arc(cx, cy, 300 - i * 16, Math.PI, PI2); ctx.strokeStyle = c; ctx.stroke(); });
    ctx.globalAlpha = 1;
  }
  Draw.sun(ctx, W - 90, 70, t, th.extra === 'clouds');

  for (let i = 0; i < 6; i++) {
    const x = mod(i * 230 + 80 - camX * 0.12, W + 260) - 130;
    Draw.cloud(ctx, x, 45 + hash(i) * 90, 0.7 + hash(i + 9) * 0.6);
  }

  ctx.fillStyle = th.hillFar; hillPath(ctx, W, gy - 70, 60, camX, 0.25, 1); ctx.fill();

  if (th.extra === 'sea') {
    const sy = gy - 46;
    ctx.fillStyle = th.hillNear; ctx.fillRect(0, sy, W, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let x = -mod(camX * 0.5, 60); x < W; x += 60) {
      ctx.beginPath(); ctx.arc(x + 30, sy + 2 + Math.sin(t * 2 + x) * 2, 10, Math.PI, PI2); ctx.fill();
    }
    // sailboat
    const bx = mod(300 - camX * 0.35, W + 300) - 100;
    ctx.fillStyle = '#ff8fb8'; ctx.beginPath(); ctx.moveTo(bx - 26, sy + 8); ctx.lineTo(bx + 26, sy + 8); ctx.lineTo(bx + 16, sy + 20); ctx.lineTo(bx - 16, sy + 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx, sy - 34); ctx.lineTo(bx, sy + 6); ctx.lineTo(bx + 22, sy + 6); ctx.fill();
  } else {
    ctx.fillStyle = th.hillNear; hillPath(ctx, W, gy - 18, 45, camX, 0.5, 3); ctx.fill();
  }

  // Đồ trang trí tầng giữa
  const k = 0.5, step = 260;
  for (let n = Math.floor((camX * k) / step) - 1; n < (camX * k + W) / step + 1; n++) {
    const x = n * step - camX * k + hash(n) * 120, h = hash(n + 7);
    if (th.extra === 'lollipop') {
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, gy - 90, 6, 80);
      circle(ctx, x, gy - 100, 24, RAINBOW[mod(n, 6)]);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, gy - 100, 14, 0, Math.PI * 1.5); ctx.stroke();
    } else if (th.extra === 'rainbow' || th.extra === 'lavender') {
      const c = th.extra === 'rainbow' ? '#5cc983' : '#c79bf2';
      ctx.fillStyle = '#a97b5a'; ctx.fillRect(x - 5, gy - 60, 10, 50);
      circle(ctx, x, gy - 75, 28 + h * 10, c);
      circle(ctx, x - 18, gy - 62, 20, c); circle(ctx, x + 18, gy - 62, 20, c);
      for (let i = 0; i < 4; i++) circle(ctx, x - 15 + i * 10, gy - 80 + (i % 2) * 14, 4, th.extra === 'rainbow' ? '#ff6b8b' : '#fff');
    } else if (th.extra === 'clouds') {
      Draw.cloud(ctx, x - 40, gy - 30, 1.1, 'rgba(255,255,255,0.75)');
    } else if (th.extra === 'sea' && h < 0.5) {
      ctx.fillStyle = '#8bc34a'; // cây dừa
      ctx.strokeStyle = '#b07a4a'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(x, gy - 10); ctx.quadraticCurveTo(x + 14, gy - 60, x + 6, gy - 110); ctx.stroke();
      for (let i = 0; i < 5; i++) ellipse(ctx, x + 6 + Math.cos(i * 1.3) * 22, gy - 112 + Math.sin(i * 1.3) * 6, 26, 7, i * 1.3, '#59b85a');
    }
  }

  // Mặt đất
  ctx.fillStyle = th.ground; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = th.tile;
  const ts = 48, off = -mod(camX, ts * 2);
  for (let x = off; x < W + ts; x += ts) {
    for (let row = 0; row < 2; row++) {
      if ((Math.round((x - off) / ts) + row) % 2 === 0) { Draw.rr(ctx, x + 3, gy + 18 + row * 26, ts - 6, 20, 8); ctx.fill(); }
    }
  }
  ctx.fillStyle = th.groundTop;
  ctx.fillRect(0, gy, W, 10);
  for (let x = -mod(camX, 24); x < W + 24; x += 24) { ctx.beginPath(); ctx.arc(x + 12, gy + 9, 12, 0, Math.PI); ctx.fill(); }

  // Hoa nhỏ trên mặt đất
  for (let n = Math.floor(camX / 90) - 1; n < (camX + W) / 90 + 1; n++) {
    const h = hash(n * 3.7);
    if (h > 0.5) continue;
    const x = n * 90 + h * 50 - camX;
    if (th.extra === 'sea') { star(ctx, x, gy - 4, 7, '#ff9f80'); continue; }
    if (th.extra === 'clouds') { star(ctx, x, gy - 6, 6, '#ffe066'); continue; }
    ctx.strokeStyle = '#5cae4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, gy + 2); ctx.lineTo(x, gy - 12); ctx.stroke();
    const pc = ['#ff8fc8', '#ffe066', '#c79bf2', '#fff'][n & 3];
    for (let i = 0; i < 5; i++) circle(ctx, x + Math.cos(i * 1.26) * 4, gy - 14 + Math.sin(i * 1.26) * 4, 3.2, pc);
    circle(ctx, x, gy - 14, 2.2, '#ffb84d');
  }
};

// ---- Nhân vật bé gái ----
// st: run | idle | jump | hurt | win
Draw.girl = (ctx, x, y, look, st, t, s = 1) => {
  const dress = shopItem('dress', look.dress).color;
  const hair = shopItem('hair', look.hair).color;
  const acc = look.acc;
  const skin = '#ffe1cc';
  const run = st === 'run', air = st === 'jump', win = st === 'win', hurt = st === 'hurt';
  const ph = t * 14;

  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const bob = run ? Math.abs(Math.sin(ph)) * 3 : st === 'idle' ? Math.sin(t * 3) * 1.2 : 0;
  ctx.translate(0, -bob);
  if (hurt && Math.floor(t * 18) % 2 === 0) ctx.globalAlpha = 0.45;

  if (acc === 'wings') {
    const f = Math.sin(t * 9) * 0.25;
    ctx.globalAlpha *= 0.85;
    ellipse(ctx, -14, -46, 15, 8, -0.7 + f, '#cdeaff');
    ellipse(ctx, -12, -34, 11, 6, 0.5 - f, '#e6d4ff');
    ctx.globalAlpha = hurt && Math.floor(t * 18) % 2 === 0 ? 0.45 : 1;
  }

  // tóc phía sau + đuôi ngựa
  ellipse(ctx, -2, -52, 15, 16, 0, hair);
  ellipse(ctx, -16, -50 + Math.sin(ph) * (run ? 2 : 0.5), 6, 12, 0.5 + (run ? Math.sin(ph) * 0.3 : 0), hair);

  // chân
  let a1 = 0.08, a2 = -0.08;
  if (run) { a1 = Math.sin(ph) * 0.7; a2 = -a1; } else if (air || win) { a1 = 0.7; a2 = -0.4; }
  ctx.lineCap = 'round';
  for (const [hx, a] of [[-4, a1], [4, a2]]) {
    const ex = hx + Math.sin(a) * 18, ey = -20 + Math.cos(a) * 18;
    ctx.strokeStyle = skin; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(hx, -22); ctx.lineTo(ex, ey); ctx.stroke();
    ellipse(ctx, ex + 1.5, ey, 4.5, 3, 0, '#ff5fa2');
  }

  // váy
  let fill = dress;
  if (dress === 'rainbow') {
    fill = ctx.createLinearGradient(0, -44, 0, -16);
    RAINBOW.forEach((c, i) => fill.addColorStop(i / 5, c));
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(-7, -45); ctx.lineTo(7, -45); ctx.lineTo(17, -19);
  for (let k = 0; k < 5; k++) ctx.quadraticCurveTo(17 - k * 6.8 - 3.4, -13, 17 - (k + 1) * 6.8, -19);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-8, -37, 16, 3);
  circle(ctx, 0, -35.5, 2.2, '#fff');

  // tay
  let arm = 0.25;
  if (run) arm = Math.sin(ph) * 0.9; else if (air) arm = -2.4; else if (win) arm = -2.6 + Math.sin(t * 12) * 0.35;
  ctx.strokeStyle = skin; ctx.lineWidth = 4;
  for (const [sx, a] of [[-5, -arm], [5, arm]]) {
    ctx.beginPath(); ctx.moveTo(sx, -42); ctx.lineTo(sx + Math.sin(a) * 15, -42 + Math.cos(a) * 15); ctx.stroke();
  }

  // đầu & mặt
  circle(ctx, 1, -58, 13, skin);
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(1, -59, 14.5, Math.PI, PI2); ctx.closePath(); ctx.fill();
  for (const fx of [-8, -2, 4, 10]) { ctx.beginPath(); ctx.arc(fx, -59, 3.4, 0, Math.PI); ctx.fill(); }
  ellipse(ctx, -11, -52, 4, 9, 0, hair);

  const blink = mod(t, 3.7) < 0.12;
  ctx.strokeStyle = '#4a2a3a'; ctx.lineWidth = 2;
  if (hurt) {
    for (const ex of [-1, 8]) {
      ctx.beginPath(); ctx.moveTo(ex - 2, -55); ctx.lineTo(ex + 2, -53); ctx.lineTo(ex - 2, -51); ctx.stroke();
    }
  } else if (blink) {
    for (const ex of [-1, 8]) { ctx.beginPath(); ctx.moveTo(ex - 2.2, -53); ctx.lineTo(ex + 2.2, -53); ctx.stroke(); }
  } else {
    for (const ex of [-1, 8]) { circle(ctx, ex, -53, 2.4, '#4a2a3a'); circle(ctx, ex + 0.8, -54, 0.9, '#fff'); }
  }
  circle(ctx, -4, -48.5, 2.8, 'rgba(255,120,150,0.5)'); circle(ctx, 11, -48.5, 2.8, 'rgba(255,120,150,0.5)');
  ctx.beginPath();
  if (win || air) { ctx.arc(4, -49, 3.2, 0, Math.PI); ctx.fillStyle = '#e8577f'; ctx.fill(); }
  else { ctx.arc(4, -50, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 1.8; ctx.stroke(); }

  // phụ kiện
  if (acc === 'bow') {
    ctx.fillStyle = '#ff4f9a';
    ctx.beginPath(); ctx.moveTo(-6, -71); ctx.lineTo(-16, -77); ctx.lineTo(-16, -65); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, -71); ctx.lineTo(4, -77); ctx.lineTo(4, -65); ctx.fill();
    circle(ctx, -6, -71, 3, '#ff7eb6');
  } else if (acc === 'flower') {
    for (let i = 0; i < 5; i++) circle(ctx, -8 + Math.cos(i * 1.26) * 4.5, -70 + Math.sin(i * 1.26) * 4.5, 3.6, '#ffb3d1');
    circle(ctx, -8, -70, 2.6, '#ffd84d');
  } else if (acc === 'crown') {
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath(); ctx.moveTo(-9, -70); ctx.lineTo(-9, -80); ctx.lineTo(-4, -74); ctx.lineTo(1, -83);
    ctx.lineTo(6, -74); ctx.lineTo(11, -80); ctx.lineTo(11, -70); ctx.closePath(); ctx.fill();
    circle(ctx, 1, -74, 1.8, '#ff4f9a');
  } else if (acc === 'tiara') {
    ctx.strokeStyle = '#d9e8ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(1, -62, 13, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    star(ctx, 1, -78, 5.5, '#b8f0ff'); circle(ctx, -7, -73, 2, '#ff9ccf'); circle(ctx, 9, -73, 2, '#ff9ccf');
    if (Math.sin(t * 5) > 0.6) star(ctx, 6, -84, 3, '#fff', 4);
  }
  ctx.restore();
};

// ---- Thú cưng chạy theo ----
Draw.pet = (ctx, type, x, y, t, s = 1, moving = true) => {
  if (!type || type === 'none') return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.translate(0, -(moving ? Math.abs(Math.sin(t * 12)) * 5 : Math.abs(Math.sin(t * 3)) * 2));
  const eye = (ex, ey) => circle(ctx, ex, ey, 1.6, '#3a2a3a');
  if (type === 'cat' || type === 'puppy') {
    const c = type === 'cat' ? '#ffb86b' : '#c8956b';
    ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, -12); ctx.quadraticCurveTo(-22, -16 + Math.sin(t * 8) * 3, -18, -26); ctx.stroke();
    ellipse(ctx, 0, -10, 13, 8, 0, c);
    circle(ctx, 11, -20, 8.5, c);
    if (type === 'cat') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(5, -25); ctx.lineTo(7, -33); ctx.lineTo(11, -27); ctx.fill();
      ctx.beginPath(); ctx.moveTo(12, -27); ctx.lineTo(17, -33); ctx.lineTo(18, -24); ctx.fill();
      ctx.fillStyle = '#e8924a'; ctx.fillRect(-4, -17, 2, 7); ctx.fillRect(1, -17, 2, 7);
    } else {
      ellipse(ctx, 5, -19, 3.5, 7, 0.3, '#8a5a3a');
      circle(ctx, 18, -18, 2, '#3a2a3a');
    }
    eye(14, -21);
    circle(ctx, 16, -16, 2, 'rgba(255,130,150,0.5)');
  } else if (type === 'bunny') {
    ellipse(ctx, -12, -10, 4, 4, 0, '#fff');
    ellipse(ctx, 0, -10, 12, 9, 0, '#fff');
    ellipse(ctx, 6, -36, 3.5, 11, -0.15, '#fff'); ellipse(ctx, 12, -35, 3.5, 11, 0.25, '#fff');
    ellipse(ctx, 6, -36, 1.5, 8, -0.15, '#ffc2dc'); ellipse(ctx, 12, -35, 1.5, 8, 0.25, '#ffc2dc');
    circle(ctx, 10, -20, 8.5, '#fff');
    eye(13, -21); circle(ctx, 17.5, -18, 1.5, '#ff7eb6');
    ctx.strokeStyle = '#e8d8e8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -10, 12, 9, 0, 0, PI2); ctx.stroke();
  } else if (type === 'unicorn') {
    ctx.strokeStyle = '#f3e8ff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const lg = moving ? Math.sin(t * 12) * 4 : 0;
    for (const lx of [-9, -3, 5, 11]) { ctx.beginPath(); ctx.moveTo(lx, -14); ctx.lineTo(lx + (lx % 2 ? lg : -lg), 0); ctx.stroke(); }
    RAINBOW.slice(0, 4).forEach((c, i) => ellipse(ctx, -17, -18 + i * 3, 7, 2.5, 0.6, c));
    ellipse(ctx, 0, -19, 15, 9, 0, '#fff');
    ellipse(ctx, 14, -29, 6, 9, 0.5, '#fff');
    ellipse(ctx, 20, -33, 7, 5, 0.2, '#fff');
    RAINBOW.slice(0, 5).forEach((c, i) => circle(ctx, 9 - i * 1.5, -36 + i * 3, 3, c));
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.moveTo(18, -37); ctx.lineTo(23, -50); ctx.lineTo(22, -36); ctx.fill();
    eye(20, -34); circle(ctx, 24, -31, 1.6, 'rgba(255,130,150,0.6)');
  }
  ctx.restore();
};

// ---- Chướng ngại vật (dễ thương, không đáng sợ) ----
Draw.obstacle = (ctx, kind, x, gy, variant) => {
  ctx.save(); ctx.translate(x, gy);
  if (kind === 'flower') {
    circle(ctx, -14, -12, 14, '#6cc35a'); circle(ctx, 14, -12, 14, '#6cc35a'); circle(ctx, 0, -22, 17, '#7fd36b');
    const pc = variant ? '#ff8fc8' : '#c79bf2';
    for (const [fx, fy] of [[-12, -22], [8, -30], [14, -12], [-2, -8]]) {
      for (let i = 0; i < 5; i++) circle(ctx, fx + Math.cos(i * 1.26) * 4, fy + Math.sin(i * 1.26) * 4, 3.4, pc);
      circle(ctx, fx, fy, 2.4, '#ffd84d');
    }
  } else if (kind === 'cupcake') {
    ctx.fillStyle = variant ? '#ffcf8a' : '#b6e3ff';
    ctx.beginPath(); ctx.moveTo(-18, -24); ctx.lineTo(18, -24); ctx.lineTo(13, 0); ctx.lineTo(-13, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    for (let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(i, -22); ctx.lineTo(i * 0.75, -2); ctx.stroke(); }
    const fc = variant ? '#ff9ccf' : '#f6c1ff';
    circle(ctx, -11, -28, 10, fc); circle(ctx, 11, -28, 10, fc); circle(ctx, 0, -36, 12, fc);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = RAINBOW[i]; ctx.fillRect(-10 + i * 4, -38 + (i % 2) * 8, 3, 1.6); }
    circle(ctx, 2, -50, 5, '#ff3b6b');
  } else if (kind === 'shell') {
    if (variant) {
      star(ctx, 0, -18, 20, '#ff9f80'); circle(ctx, -4, -21, 2, '#ffd2c2'); circle(ctx, 4, -21, 2, '#ffd2c2');
    } else {
      ctx.fillStyle = '#ffc2d6';
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI; ctx.quadraticCurveTo(Math.cos(a - 0.26) * 30, -8 + Math.sin(a - 0.26) * 30, Math.cos(a) * 24, -4 + Math.sin(a) * 24); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff94b8'; ctx.lineWidth = 2;
      for (let i = 1; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(Math.cos(a) * 22, -4 + Math.sin(a) * 22); ctx.stroke(); }
      circle(ctx, 0, -8, 5, '#fffaf0');
    }
  } else if (kind === 'mushroom') {
    ctx.fillStyle = '#fff4e6'; Draw.rr(ctx, -8, -22, 16, 22, 6); ctx.fill();
    ctx.fillStyle = variant ? '#ff6b8b' : '#b88cff';
    ctx.beginPath(); ctx.arc(0, -20, 22, Math.PI, PI2); ctx.closePath(); ctx.fill();
    circle(ctx, -10, -28, 4, '#fff'); circle(ctx, 6, -34, 5, '#fff'); circle(ctx, 13, -24, 3, '#fff');
    circle(ctx, -3, -12, 1.5, '#4a2a3a'); circle(ctx, 3, -12, 1.5, '#4a2a3a');
  } else if (kind === 'gift') {
    ctx.fillStyle = variant ? '#9fd8ff' : '#ffb3d1'; Draw.rr(ctx, -18, -34, 36, 34, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-4, -34, 8, 34); ctx.fillRect(-18, -22, 36, 7);
    ctx.fillStyle = variant ? '#ff7eb6' : '#a88bff';
    ellipse(ctx, -8, -38, 8, 5, -0.4, ctx.fillStyle); ellipse(ctx, 8, -38, 8, 5, 0.4, ctx.fillStyle);
    circle(ctx, 0, -37, 4, '#fff');
  }
  ctx.restore();
};

// Khối vàng lơ lửng – bạn nhỏ nhảy lên đội đầu để lấy kim cương
Draw.block = (ctx, x, y, bump, used) => {
  ctx.save(); ctx.translate(x, y - bump);
  const g = ctx.createLinearGradient(0, -25, 0, 25);
  g.addColorStop(0, used ? '#e3d6f0' : '#ffe680'); g.addColorStop(1, used ? '#cdb9e0' : '#ffb84d');
  ctx.fillStyle = g; Draw.rr(ctx, -25, -25, 50, 50, 10); ctx.fill();
  ctx.strokeStyle = used ? '#b9a3cf' : '#e8953a'; ctx.lineWidth = 3; ctx.stroke();
  for (const [cx, cy] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) circle(ctx, cx, cy, 2.2, 'rgba(255,255,255,0.7)');
  ctx.restore();
};

// Bong bóng chữ cần gõ
Draw.bubble = (ctx, x, y, text, idx, active, shake, t, accent, fontSize) => {
  ctx.save();
  ctx.font = `700 ${fontSize}px "Baloo 2", "Comic Sans MS", sans-serif`;
  ctx.textBaseline = 'middle';
  const chars = [...text].map(c => (c === ' ' ? '␣' : c));
  const widths = chars.map(c => ctx.measureText(c).width + 2);
  const tw = widths.reduce((a, b) => a + b, 0);
  const w = Math.max(54, tw + 28), h = fontSize + 22;
  const sx = shake > 0 ? Math.sin(shake * 60) * 6 : 0;
  const bob = active ? Math.sin(t * 5) * 3 : 0;
  ctx.translate(x + sx, y + bob);
  if (active) { ctx.shadowColor = accent; ctx.shadowBlur = 16; }
  ctx.fillStyle = '#fff';
  Draw.rr(ctx, -w / 2, -h / 2, w, h, 16); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(-8, h / 2 - 1); ctx.lineTo(0, h / 2 + 10); ctx.lineTo(8, h / 2 - 1); ctx.fill();
  ctx.lineWidth = active ? 4 : 2; ctx.strokeStyle = active ? accent : '#e3d4f5';
  Draw.rr(ctx, -w / 2, -h / 2, w, h, 16); ctx.stroke();
  let cx = -tw / 2;
  chars.forEach((c, i) => {
    const done = i < idx, cur = i === idx && active;
    ctx.fillStyle = done ? '#ff4f9a' : cur ? '#3b1f5c' : '#7d6a96';
    if (cur) {
      ctx.fillStyle = FINGERS[FINGER_OF[text[i]]] ? FINGERS[FINGER_OF[text[i]]].color : '#ffe066';
      Draw.rr(ctx, cx - 2, -h / 2 + 6, widths[i] + 2, h - 12, 8); ctx.fill();
      ctx.fillStyle = '#3b1f5c';
    }
    ctx.globalAlpha = done ? 0.75 : 1;
    ctx.fillText(c, cx, 2);
    ctx.globalAlpha = 1;
    cx += widths[i];
  });
  ctx.restore();
};

// Lâu đài đích
Draw.castle = (ctx, x, gy, t, accent) => {
  ctx.save(); ctx.translate(x, gy);
  const wall = '#ffe3f1', roof = accent;
  ctx.fillStyle = wall; ctx.fillRect(-70, -110, 140, 110);
  for (const tx of [-80, 50]) {
    ctx.fillStyle = wall; ctx.fillRect(tx, -150, 30, 150);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(tx - 6, -150); ctx.lineTo(tx + 15, -195); ctx.lineTo(tx + 36, -150); ctx.fill();
    ctx.strokeStyle = '#a07'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + 15, -195); ctx.lineTo(tx + 15, -215); ctx.stroke();
    ctx.fillStyle = '#ff4f9a';
    ctx.beginPath(); ctx.moveTo(tx + 15, -215); ctx.lineTo(tx + 33 + Math.sin(t * 6) * 3, -209); ctx.lineTo(tx + 15, -203); ctx.fill();
    circle(ctx, tx + 15, -120, 7, '#bfe6ff');
  }
  ctx.fillStyle = wall; ctx.fillRect(-25, -160, 50, 60);
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(-32, -160); ctx.lineTo(0, -215); ctx.lineTo(32, -160); ctx.fill();
  heart(ctx, 0, -130, 12, '#ff7eb6');
  ctx.fillStyle = '#c98bff'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-20, -40); ctx.arc(0, -40, 20, Math.PI, PI2); ctx.lineTo(20, 0); ctx.fill();
  for (let i = -70; i < 70; i += 20) { ctx.fillStyle = wall; ctx.fillRect(i, -122, 12, 12); }
  ctx.restore();
};
