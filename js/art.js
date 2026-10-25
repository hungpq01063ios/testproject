// Tranh minh hoạ thủ tục (procedural) cho từng địa danh — vẽ bằng Canvas 2D, không cần ảnh ngoài.
import { SPACES, GROUPS, fmt } from './data.js';

// Toạ độ (kinh độ, vĩ độ) của các địa danh để ghim trên bản đồ trung tâm
export const COORDS = {
  1: [105.32, 23.36], 3: [104.1, 21.8], 5: [105.84, 21.02], 6: [108.44, 11.94], 8: [107.9, 12.53], 9: [108.0, 14.05],
  11: [105.75, 10.0], 12: [105.32, 20.81], 13: [104.73, 8.6], 14: [103.96, 10.23], 15: [108.2, 16.05], 16: [109.2, 12.24],
  18: [108.23, 16.06], 19: [107.99, 15.99], 21: [108.33, 15.88], 23: [107.58, 16.47], 24: [108.12, 15.76], 25: [106.68, 20.86],
  26: [107.1, 20.91], 27: [106.28, 17.59], 28: [105.72, 9.29], 29: [105.9, 20.25], 31: [106.7, 10.78], 32: [106.69, 10.76],
  34: [106.72, 10.8], 35: [106.66, 10.82], 37: [105.836, 21.03], 39: [105.852, 21.03],
};

// Đường viền Việt Nam (đơn giản hoá)
const VN = [[102.14, 22.4], [102.5, 22.75], [103.3, 22.75], [103.95, 22.5], [104.4, 22.75], [104.8, 23.1], [105.35, 23.38], [105.9, 22.95], [106.5, 22.9], [106.75, 22.45], [106.55, 22.05], [107.35, 21.65], [108.05, 21.55],
  [107.6, 21.3], [106.85, 20.85], [106.6, 20.4], [106.2, 20.0], [105.9, 19.6], [105.75, 19.05], [105.65, 18.5], [106.15, 18.0], [106.45, 17.6], [106.9, 17.15], [107.3, 16.75], [107.85, 16.35], [108.25, 16.05],
  [108.65, 15.5], [108.85, 15.15], [109.05, 14.4], [109.25, 13.7], [109.3, 13.0], [109.25, 12.4], [109.2, 11.85], [108.95, 11.4], [108.55, 11.15], [108.0, 10.75], [107.3, 10.45], [106.85, 10.2],
  [106.75, 9.75], [106.3, 9.3], [105.6, 8.85], [105.1, 8.6], [104.85, 8.65], [104.85, 9.2], [104.9, 9.85], [104.65, 10.3], [104.45, 10.42],
  [104.95, 10.9], [105.6, 11.0], [106.15, 11.4], [106.45, 11.9], [107.45, 12.3], [107.55, 13.0], [107.5, 13.9], [107.55, 14.7], [107.2, 15.1], [107.45, 15.5], [107.15, 15.9], [106.75, 16.4], [106.55, 16.85],
  [105.9, 17.5], [105.6, 17.95], [105.1, 18.55], [104.4, 18.9], [103.95, 19.25], [104.55, 19.65], [104.25, 20.0], [103.65, 20.65], [103.15, 20.85], [102.75, 21.2], [102.85, 21.7], [102.45, 22.0], [102.14, 22.4]];

export function project(lon, lat) {
  // Trả về toạ độ chuẩn hoá [0..1] trong ô trung tâm bàn cờ
  const x = 0.36 + (lon - 102) * 0.0485;
  const y = 0.05 + (23.6 - lat) * 0.06;
  return [x, y];
}

// ---------------- Tiện ích vẽ ----------------
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };

function sky(c, w, h, top, bot, horizon = 1) { c.fillStyle = lg(c, 0, 0, 0, h * horizon, [[0, top], [1, bot]]); c.fillRect(0, 0, w, h); }
function sun(c, x, y, r, col = '#FFE08A', glow = 'rgba(255,200,80,0.5)') {
  c.fillStyle = rg(c, x, y, r * 0.2, r * 3.5, [[0, glow], [1, 'rgba(255,200,80,0)']]); c.beginPath(); c.arc(x, y, r * 3.5, 0, 7); c.fill();
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
function moon(c, x, y, r) { sun(c, x, y, r, '#FFF6D8', 'rgba(255,240,200,0.25)'); }
function stars(c, w, h, n, seed = 1) { const R = rng(seed); c.fillStyle = '#fff'; for (let i = 0; i < n; i++) { c.globalAlpha = 0.3 + R() * 0.7; c.fillRect(R() * w, R() * h, 1.5 + R() * 1.5, 1.5 + R() * 1.5); } c.globalAlpha = 1; }
function ridge(c, w, h, baseY, amp, col, seed, rough = 6, sharp = false) {
  const R = rng(seed); c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
  let y = baseY - R() * amp;
  const n = rough * 4;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const t = (Math.sin(i * 0.9 + seed) + Math.sin(i * 0.37 + seed * 2)) * 0.5;
    y = baseY - amp * (0.5 + 0.5 * t) - (sharp && i % 2 ? amp * 0.3 * R() : 0);
    c.lineTo(x, y);
  }
  c.lineTo(w, h); c.closePath(); c.fill();
}
function karst(c, x, base, wd, ht, col, hi) {
  c.fillStyle = col; c.beginPath();
  c.moveTo(x - wd / 2, base);
  c.bezierCurveTo(x - wd * 0.55, base - ht * 0.6, x - wd * 0.35, base - ht * 1.05, x - wd * 0.05, base - ht);
  c.bezierCurveTo(x + wd * 0.3, base - ht * 0.98, x + wd * 0.5, base - ht * 0.55, x + wd / 2, base);
  c.closePath(); c.fill();
  if (hi) { c.fillStyle = hi; c.beginPath(); c.moveTo(x - wd * 0.05, base - ht); c.bezierCurveTo(x + wd * 0.3, base - ht * 0.98, x + wd * 0.45, base - ht * 0.55, x + wd / 2, base); c.lineTo(x + wd * 0.1, base); c.closePath(); c.fill(); }
}
function water(c, w, h, y, top, bot, seed = 3) {
  c.fillStyle = lg(c, 0, y, 0, h, [[0, top], [1, bot]]); c.fillRect(0, y, w, h - y);
  const R = rng(seed); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = Math.max(1, h / 300);
  for (let i = 0; i < 26; i++) { const yy = y + R() * (h - y), xx = R() * w, l = 10 + R() * w * 0.08; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + l, yy); c.stroke(); }
}
function cloud(c, x, y, s, col = 'rgba(255,255,255,0.9)') {
  c.fillStyle = col; c.beginPath();
  [[0, 0, 1], [0.9, 0.15, 0.8], [-0.9, 0.2, 0.7], [0.4, -0.45, 0.75], [-0.4, -0.3, 0.65]].forEach(([dx, dy, r]) => { c.moveTo(x + dx * s + r * s, y + dy * s); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); });
  c.fill();
}
function birds(c, x, y, s, n = 4, col = 'rgba(30,30,30,0.6)') {
  c.strokeStyle = col; c.lineWidth = Math.max(1, s / 6);
  for (let i = 0; i < n; i++) { const bx = x + i * s * 1.8, by = y + Math.sin(i * 2) * s; c.beginPath(); c.moveTo(bx - s, by); c.quadraticCurveTo(bx - s / 2, by - s * 0.6, bx, by); c.quadraticCurveTo(bx + s / 2, by - s * 0.6, bx + s, by); c.stroke(); }
}
// Mái cong kiểu Á Đông
function roof(c, cx, y, w, h, col, edge = '#5a2a10') {
  c.fillStyle = col; c.beginPath();
  c.moveTo(cx - w * 0.58, y - h * 0.15);
  c.quadraticCurveTo(cx - w * 0.45, y, cx - w * 0.35, y - h * 0.05);
  c.lineTo(cx - w * 0.25, y - h); c.lineTo(cx + w * 0.25, y - h);
  c.lineTo(cx + w * 0.35, y - h * 0.05);
  c.quadraticCurveTo(cx + w * 0.45, y, cx + w * 0.58, y - h * 0.15);
  c.lineTo(cx + w * 0.5, y + h * 0.08); c.lineTo(cx - w * 0.5, y + h * 0.08); c.closePath(); c.fill();
  c.strokeStyle = edge; c.lineWidth = Math.max(1, h * 0.08); c.stroke();
}
function palm(c, x, base, ht, lean = 0.2) {
  c.strokeStyle = '#6b4a2b'; c.lineWidth = ht * 0.06; c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + ht * lean * 0.3, base - ht * 0.5, x + ht * lean, base - ht); c.stroke();
  const tx = x + ht * lean, ty = base - ht;
  c.fillStyle = '#1f7a3a';
  for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6 + 0.1; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * ht * 0.35, ty + Math.sin(a) * ht * 0.35 - ht * 0.1, tx + Math.cos(a) * ht * 0.45, ty + Math.sin(a) * ht * 0.2 + ht * 0.12); c.quadraticCurveTo(tx + Math.cos(a) * ht * 0.25, ty + Math.sin(a) * ht * 0.2, tx, ty); c.fill(); }
}
function pine(c, x, base, ht, col = '#1d4d3a') { c.fillStyle = col; for (let i = 0; i < 3; i++) { const y = base - ht * (0.25 + i * 0.25), wd = ht * (0.45 - i * 0.1); c.beginPath(); c.moveTo(x - wd, y + ht * 0.2); c.lineTo(x, y - ht * 0.3); c.lineTo(x + wd, y + ht * 0.2); c.fill(); } c.fillRect(x - ht * 0.03, base - ht * 0.1, ht * 0.06, ht * 0.1); }
function boat(c, x, y, s, col = '#6b3b1f', sail = null) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x - s, y); c.quadraticCurveTo(x, y + s * 0.45, x + s, y - s * 0.05); c.lineTo(x + s * 0.8, y + s * 0.05); c.quadraticCurveTo(x, y + s * 0.25, x - s * 0.85, y + s * 0.02); c.closePath(); c.fill();
  c.fillStyle = '#3a2412'; c.fillRect(x - s * 0.9, y - s * 0.06, s * 1.85, s * 0.1);
  if (sail) {
    c.fillStyle = sail;
    for (let k = -1; k <= 1; k++) { const sx = x + k * s * 0.45; c.beginPath(); c.moveTo(sx, y - s * 0.1); c.lineTo(sx, y - s * 1.1); c.quadraticCurveTo(sx + s * 0.45, y - s * 0.7, sx + s * 0.35, y - s * 0.1); c.closePath(); c.fill(); c.strokeStyle = 'rgba(60,20,0,0.5)'; c.lineWidth = s * 0.03; for (let r = 1; r < 5; r++) { c.beginPath(); c.moveTo(sx, y - s * 0.1 - r * s * 0.2); c.lineTo(sx + s * 0.38, y - s * 0.1 - r * s * 0.16); c.stroke(); } }
  }
}
function lantern(c, x, y, r, col) {
  c.strokeStyle = 'rgba(40,20,0,0.7)'; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(x, y - r * 2.2); c.lineTo(x, y - r); c.stroke();
  c.fillStyle = rg(c, x, y, r * 0.2, r * 3, [[0, 'rgba(255,200,90,0.45)'], [1, 'rgba(255,160,40,0)']]); c.beginPath(); c.arc(x, y, r * 3, 0, 7); c.fill();
  c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r * 0.85, r, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,240,180,0.45)'; c.beginPath(); c.ellipse(x - r * 0.2, y - r * 0.2, r * 0.3, r * 0.5, 0, 0, 7); c.fill();
  c.fillStyle = '#C49A2C'; c.fillRect(x - r * 0.45, y - r * 1.05, r * 0.9, r * 0.18); c.fillRect(x - r * 0.45, y + r * 0.88, r * 0.9, r * 0.18);
  c.strokeStyle = '#C49A2C'; c.lineWidth = r * 0.06; c.beginPath(); c.moveTo(x, y + r * 1.05); c.lineTo(x, y + r * 1.6); c.stroke();
}
function vnflag(c, x, y, w) {
  const h = w * 2 / 3; c.fillStyle = '#DA251D'; c.fillRect(x, y, w, h);
  starShape(c, x + w / 2, y + h / 2, h * 0.3, '#FFDD00');
}
function starShape(c, x, y, r, col) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.38 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
function rays(c, x, y, n, len, col) { c.fillStyle = col; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, a, a + Math.PI / n); c.closePath(); c.fill(); } }
function firework(c, x, y, r, col, seed = 1) {
  const R = rng(seed); c.strokeStyle = col; c.lineWidth = Math.max(1, r / 25);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, l = r * (0.6 + R() * 0.4); c.globalAlpha = 0.9; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(x + Math.cos(a) * l, y + Math.sin(a) * l, r / 18, 0, 7); c.fill(); }
  c.globalAlpha = 1;
}
function hill(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, Math.PI, 0); c.fill(); }

// ---------------- Các cảnh ----------------
const SCENES = {
  go(c, w, h) {
    c.fillStyle = lg(c, 0, 0, 0, h, [[0, '#ff4d2e'], [1, '#b3121b']]); c.fillRect(0, 0, w, h);
    rays(c, w / 2, h * 0.55, 18, w, 'rgba(255,215,0,0.18)');
    sun(c, w / 2, h * 0.55, w * 0.12, '#FFD54A', 'rgba(255,230,120,0.6)');
    c.fillStyle = '#FFE27A'; c.beginPath(); c.moveTo(w * 0.15, h * 0.8); c.lineTo(w * 0.65, h * 0.8); c.lineTo(w * 0.65, h * 0.72); c.lineTo(w * 0.88, h * 0.86); c.lineTo(w * 0.65, h); c.lineTo(w * 0.65, h * 0.92); c.lineTo(w * 0.15, h * 0.92); c.fill();
    for (let i = 0; i < 6; i++) { const x = w * (0.15 + i * 0.14), y = h * (0.2 + (i % 2) * 0.1); c.fillStyle = '#F2C230'; c.beginPath(); c.ellipse(x, y, w * 0.04, w * 0.04, 0, 0, 7); c.fill(); c.strokeStyle = '#a8790b'; c.lineWidth = 2; c.stroke(); }
  },
  chest(c, w, h) {
    c.fillStyle = lg(c, 0, 0, w, h, [[0, '#0E7C66'], [1, '#064d40']]); c.fillRect(0, 0, w, h);
    rays(c, w / 2, h / 2, 16, w, 'rgba(255,255,255,0.06)');
    // phong bao lì xì
    const ew = w * 0.42, eh = h * 0.62, ex = w / 2 - ew / 2, ey = h * 0.2;
    c.save(); c.translate(w / 2, h / 2); c.rotate(-0.12); c.translate(-w / 2, -h / 2);
    c.fillStyle = lg(c, ex, ey, ex + ew, ey + eh, [[0, '#e8212b'], [1, '#a30f17']]); c.fillRect(ex, ey, ew, eh);
    c.strokeStyle = '#F4C542'; c.lineWidth = w * 0.012; c.strokeRect(ex + ew * 0.07, ey + eh * 0.05, ew * 0.86, eh * 0.9);
    c.fillStyle = '#F4C542'; c.font = `bold ${ew * 0.42}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('福', w / 2, ey + eh * 0.55);
    c.restore();
  },
  chance(c, w, h) {
    c.fillStyle = lg(c, 0, 0, w, h, [[0, '#5b2a86'], [1, '#2a0f45']]); c.fillRect(0, 0, w, h);
    stars(c, w, h, 40, 7);
    lantern(c, w * 0.2, h * 0.35, w * 0.07, '#e53935'); lantern(c, w * 0.8, h * 0.3, w * 0.07, '#ffb300');
    c.fillStyle = '#FFD54A'; c.font = `900 ${h * 0.6}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(255,200,0,0.8)'; c.shadowBlur = w * 0.06; c.fillText('?', w / 2, h * 0.58); c.shadowBlur = 0;
  },
  tax(c, w, h) {
    c.fillStyle = lg(c, 0, 0, 0, h, [[0, '#cfd8dc'], [1, '#90a4ae']]); c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.fillRect(w * 0.25, h * 0.15, w * 0.5, h * 0.7);
    c.fillStyle = '#b0bec5'; for (let i = 0; i < 6; i++) c.fillRect(w * 0.31, h * (0.25 + i * 0.08), w * 0.38 * (i % 3 === 2 ? 0.6 : 1), h * 0.025);
    c.strokeStyle = '#d32f2f'; c.lineWidth = w * 0.025; c.beginPath(); c.arc(w * 0.62, h * 0.7, w * 0.13, 0, 7); c.stroke();
    c.fillStyle = '#d32f2f'; c.font = `bold ${w * 0.07}px sans-serif`; c.textAlign = 'center'; c.fillText('THUẾ', w * 0.62, h * 0.72);
  },
  jail(c, w, h) {
    c.fillStyle = lg(c, 0, 0, 0, h, [[0, '#ff9800'], [1, '#e65100']]); c.fillRect(0, 0, w, h);
    c.fillStyle = '#37474f'; c.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
    c.fillStyle = '#ffcc80'; c.beginPath(); c.arc(w * 0.5, h * 0.5, w * 0.12, 0, 7); c.fill();
    c.fillStyle = '#90a4ae'; for (let i = 0; i < 6; i++) c.fillRect(w * (0.23 + i * 0.1), h * 0.2, w * 0.03, h * 0.6);
    c.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.04); c.fillRect(w * 0.2, h * 0.76, w * 0.6, h * 0.04);
  },
  gotojail(c, w, h) {
    c.fillStyle = lg(c, 0, 0, 0, h, [[0, '#1a237e'], [1, '#0d1033']]); c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,0,0,0.35)'; c.beginPath(); c.arc(w * 0.3, h * 0.25, w * 0.25, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,120,255,0.35)'; c.beginPath(); c.arc(w * 0.7, h * 0.25, w * 0.25, 0, 7); c.fill();
    c.fillStyle = '#e53935'; c.fillRect(w * 0.25, h * 0.18, w * 0.2, h * 0.12); c.fillStyle = '#1e88e5'; c.fillRect(w * 0.55, h * 0.18, w * 0.2, h * 0.12);
    c.fillStyle = '#2e7d32'; c.beginPath(); c.ellipse(w * 0.5, h * 0.62, w * 0.22, h * 0.2, 0, 0, 7); c.fill();
    c.fillStyle = '#fbc02d'; c.beginPath(); c.moveTo(w * 0.5, h * 0.48); c.lineTo(w * 0.62, h * 0.55); c.lineTo(w * 0.5, h * 0.72); c.lineTo(w * 0.38, h * 0.55); c.fill();
    starShape(c, w * 0.5, h * 0.58, w * 0.05, '#d32f2f');
  },
  parking(c, w, h) {
    c.fillStyle = lg(c, 0, 0, 0, h, [[0, '#ffe0b2'], [1, '#ffb74d']]); c.fillRect(0, 0, w, h);
    // ly cà phê phin
    c.fillStyle = '#eceff1'; c.beginPath(); c.moveTo(w * 0.3, h * 0.45); c.lineTo(w * 0.7, h * 0.45); c.lineTo(w * 0.64, h * 0.85); c.lineTo(w * 0.36, h * 0.85); c.fill();
    c.fillStyle = '#6d4c41'; c.beginPath(); c.moveTo(w * 0.33, h * 0.6); c.lineTo(w * 0.67, h * 0.6); c.lineTo(w * 0.64, h * 0.85); c.lineTo(w * 0.36, h * 0.85); c.fill();
    c.fillStyle = '#d7ccc8'; c.fillRect(w * 0.33, h * 0.73, w * 0.33, h * 0.12);
    c.fillStyle = '#b0bec5'; c.fillRect(w * 0.36, h * 0.25, w * 0.28, h * 0.2); c.fillRect(w * 0.28, h * 0.42, w * 0.44, h * 0.04);
    c.strokeStyle = 'rgba(120,80,60,0.6)'; c.lineWidth = w * 0.015; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(w * (0.42 + i * 0.08), h * 0.2); c.bezierCurveTo(w * (0.38 + i * 0.08), h * 0.12, w * (0.48 + i * 0.08), h * 0.08, w * (0.43 + i * 0.08), h * 0.02); c.stroke(); }
  },
  flagtower(c, w, h) {
    sky(c, w, h, '#7ec8f2', '#e6f4ff', 0.7);
    cloud(c, w * 0.2, h * 0.2, w * 0.06); cloud(c, w * 0.8, h * 0.15, w * 0.05);
    ridge(c, w, h, h * 0.62, h * 0.18, '#7a9a8a', 2, 5, true);
    ridge(c, w, h, h * 0.78, h * 0.15, '#4f7a5a', 5, 4, true);
    // núi Rồng có đỉnh
    c.fillStyle = '#2f5b3a'; c.beginPath(); c.moveTo(w * 0.15, h); c.quadraticCurveTo(w * 0.45, h * 0.52, w * 0.5, h * 0.5); c.quadraticCurveTo(w * 0.55, h * 0.52, w * 0.85, h); c.fill();
    // cột cờ bát giác
    c.fillStyle = lg(c, w * 0.47, 0, w * 0.53, 0, [[0, '#d6d0c0'], [0.5, '#f5f1e6'], [1, '#bdb5a0']]);
    c.fillRect(w * 0.47, h * 0.28, w * 0.06, h * 0.24); c.fillRect(w * 0.44, h * 0.47, w * 0.12, h * 0.05);
    c.fillStyle = '#8d8574'; c.fillRect(w * 0.495, h * 0.12, w * 0.01, h * 0.17);
    vnflag(c, w * 0.505, h * 0.12, w * 0.2);
  },
  terraces(c, w, h) {
    sky(c, w, h, '#9fd3f7', '#fdf5d8', 0.45);
    ridge(c, w, h, h * 0.35, h * 0.12, '#6f9a7a', 3, 4);
    for (let i = 0; i < 14; i++) {
      const y = h * 0.38 + i * h * 0.048;
      c.fillStyle = i % 2 ? '#e7b730' : '#f2cf4a'; if (i % 5 === 0) c.fillStyle = '#9cbf3a';
      c.beginPath(); c.moveTo(0, y + h * 0.05);
      for (let x = 0; x <= w; x += w / 16) c.lineTo(x, y + Math.sin(x / w * 6 + i * 0.6) * h * 0.025);
      c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.strokeStyle = 'rgba(90,70,20,0.45)'; c.lineWidth = Math.max(1, h / 250); c.beginPath();
      for (let x = 0; x <= w; x += w / 16) c.lineTo(x, y + Math.sin(x / w * 6 + i * 0.6) * h * 0.025); c.stroke();
    }
  },
  pinelake(c, w, h) {
    sky(c, w, h, '#a8d8f0', '#fbe7f0', 0.55);
    ridge(c, w, h, h * 0.5, h * 0.1, '#6c8f9a', 4, 4);
    for (let i = 0; i < 14; i++) pine(c, w * (0.02 + i * 0.075), h * 0.58, h * (0.22 + (i % 3) * 0.05));
    water(c, w, h, h * 0.58, '#5fa8c8', '#2f6f8f', 8);
    // hoa mai anh đào
    const R = rng(4);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(${240 + R() * 15},${130 + R() * 60},${170 + R() * 40},0.9)`; c.beginPath(); c.arc(R() * w * 0.35, h * 0.05 + R() * h * 0.3, w * 0.015 + R() * w * 0.012, 0, 7); c.fill(); }
    c.strokeStyle = '#5d3a2a'; c.lineWidth = w * 0.015; c.beginPath(); c.moveTo(0, h * 0.4); c.quadraticCurveTo(w * 0.2, h * 0.25, w * 0.33, h * 0.1); c.stroke();
  },
  waterfall(c, w, h) {
    sky(c, w, h, '#8fd0ef', '#e8f7ff', 0.4);
    ridge(c, w, h, h * 0.3, h * 0.08, '#3d7a4a', 6, 6);
    c.fillStyle = '#4a3b2f'; c.fillRect(0, h * 0.3, w, h * 0.32);
    c.fillStyle = '#2f6b3a'; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(w * i / 11, h * 0.3, w * 0.06, Math.PI, 0); c.fill(); }
    const R = rng(11);
    for (let i = 0; i < 60; i++) { const x = w * 0.08 + R() * w * 0.84; c.strokeStyle = `rgba(255,255,255,${0.4 + R() * 0.5})`; c.lineWidth = 1 + R() * w * 0.01; c.beginPath(); c.moveTo(x, h * 0.31); c.lineTo(x + (R() - 0.5) * 4, h * 0.63); c.stroke(); }
    water(c, w, h, h * 0.62, '#7fc6d8', '#2b6f80', 12);
    c.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(R() * w, h * 0.63 + R() * h * 0.04, w * 0.04 + R() * w * 0.04, 0, 7); c.fill(); }
  },
  craterlake(c, w, h) {
    sky(c, w, h, '#89c4f4', '#eaf6ff', 0.45);
    ridge(c, w, h, h * 0.4, h * 0.1, '#3f7f4f', 8, 3);
    c.fillStyle = '#5c9a4a'; c.beginPath(); c.ellipse(w / 2, h * 0.7, w * 0.62, h * 0.32, 0, 0, 7); c.fill();
    c.fillStyle = lg(c, 0, h * 0.5, 0, h * 0.9, [[0, '#4fb3d9'], [1, '#1d6f95']]); c.beginPath(); c.ellipse(w / 2, h * 0.7, w * 0.45, h * 0.19, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(w / 2, h * 0.7, w * (0.1 + i * 0.07), h * (0.04 + i * 0.03), 0, 0.2, 1.4); c.stroke(); }
    for (let i = 0; i < 9; i++) pine(c, w * (0.06 + i * 0.11), h * 0.53, h * 0.12, '#2a5b35');
  },
  floatmarket(c, w, h) {
    sky(c, w, h, '#ffb36b', '#ffe8b8', 0.5); sun(c, w * 0.75, h * 0.3, w * 0.06);
    c.fillStyle = '#4a7a3a'; c.fillRect(0, h * 0.42, w, h * 0.05);
    for (let i = 0; i < 6; i++) palm(c, w * (0.05 + i * 0.18), h * 0.45, h * 0.18, (i % 2 ? 0.2 : -0.15));
    water(c, w, h, h * 0.46, '#c79b5a', '#7b5a2a', 4);
    const fruits = ['#ff7043', '#ffd54f', '#66bb6a', '#ab47bc'];
    for (let i = 0; i < 4; i++) {
      const bx = w * (0.18 + i * 0.22), by = h * (0.66 + (i % 2) * 0.12), s = w * 0.12;
      c.strokeStyle = '#3e2a14'; c.lineWidth = w * 0.008; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - h * 0.28); c.stroke();
      c.fillStyle = fruits[i]; c.beginPath(); c.arc(bx, by - h * 0.27, w * 0.025, 0, 7); c.fill();
      boat(c, bx, by, s, '#5b3a1e');
      for (let k = 0; k < 6; k++) { c.fillStyle = fruits[(i + k) % 4]; c.beginPath(); c.arc(bx - s * 0.5 + k * s * 0.2, by - s * 0.12, s * 0.1, 0, 7); c.fill(); }
      // nón lá
      c.fillStyle = '#f3e1a8'; c.beginPath(); c.moveTo(bx + s * 0.35, by - s * 0.45); c.lineTo(bx + s * 0.6, by - s * 0.2); c.lineTo(bx + s * 0.1, by - s * 0.2); c.fill();
    }
  },
  dam(c, w, h) {
    sky(c, w, h, '#90caf9', '#e3f2fd', 0.5);
    ridge(c, w, h, h * 0.4, h * 0.15, '#4c7d58', 9, 4);
    water(c, w, h, h * 0.4, '#4aa3d1', '#2f7fb0', 2);
    c.fillStyle = lg(c, 0, h * 0.45, 0, h * 0.75, [[0, '#cfd8dc'], [1, '#90a4ae']]);
    c.beginPath(); c.moveTo(0, h * 0.45); c.lineTo(w, h * 0.45); c.lineTo(w, h * 0.78); c.lineTo(0, h * 0.78); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 5; i++) { c.fillRect(w * (0.12 + i * 0.17), h * 0.5, w * 0.06, h * 0.28); }
    water(c, w, h, h * 0.78, '#e3f6ff', '#5aa9d6', 5);
    c.strokeStyle = '#37474f'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.05, h * 0.15); c.lineTo(w * 0.05, h * 0.42); c.moveTo(w * 0.95, h * 0.12); c.lineTo(w * 0.95, h * 0.42); c.moveTo(w * 0.05, h * 0.17); c.quadraticCurveTo(w / 2, h * 0.3, w * 0.95, h * 0.14); c.stroke();
    c.fillStyle = '#ffeb3b'; starShape(c, w * 0.5, h * 0.2, w * 0.05, '#ffeb3b');
  },
  cape(c, w, h) {
    sky(c, w, h, '#ff8a65', '#ffe0b2', 0.55); sun(c, w * 0.7, h * 0.48, w * 0.08, '#ffcc80');
    water(c, w, h, h * 0.52, '#ff9e6e', '#4a6fa5', 6);
    c.fillStyle = '#2e5d34'; c.beginPath(); c.moveTo(0, h * 0.62); c.quadraticCurveTo(w * 0.3, h * 0.55, w * 0.55, h * 0.75); c.lineTo(w * 0.55, h); c.lineTo(0, h); c.fill();
    for (let i = 0; i < 9; i++) { const x = w * i * 0.06; c.fillStyle = '#24502b'; c.beginPath(); c.arc(x, h * 0.6, w * 0.05, 0, 7); c.fill(); c.strokeStyle = '#3b2a1a'; c.lineWidth = 1.5; for (let r = 0; r < 3; r++) { c.beginPath(); c.moveTo(x, h * 0.62); c.lineTo(x - w * 0.02 + r * w * 0.02, h * 0.68); c.stroke(); } }
    // biểu tượng con tàu hướng ra biển
    c.fillStyle = '#eceff1'; c.beginPath(); c.moveTo(w * 0.3, h * 0.72); c.lineTo(w * 0.62, h * 0.66); c.lineTo(w * 0.52, h * 0.75); c.closePath(); c.fill();
    c.fillStyle = '#b0bec5'; c.fillRect(w * 0.4, h * 0.5, w * 0.015, h * 0.2);
    vnflag(c, w * 0.415, h * 0.5, w * 0.08);
  },
  island(c, w, h) {
    sky(c, w, h, '#ff7e5f', '#feb47b', 0.55); sun(c, w * 0.5, h * 0.5, w * 0.09, '#fff1b0');
    cloud(c, w * 0.2, h * 0.25, w * 0.05, 'rgba(255,220,200,0.7)');
    water(c, w, h, h * 0.55, '#ff9a6b', '#145f7a', 9);
    c.fillStyle = 'rgba(255,240,180,0.6)'; c.fillRect(w * 0.44, h * 0.56, w * 0.12, h * 0.1);
    c.fillStyle = '#f5deb3'; c.beginPath(); c.moveTo(0, h * 0.85); c.quadraticCurveTo(w * 0.5, h * 0.74, w, h * 0.88); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    palm(c, w * 0.12, h * 0.9, h * 0.42, 0.25); palm(c, w * 0.85, h * 0.92, h * 0.36, -0.25);
    karst(c, w * 0.85, h * 0.56, w * 0.25, h * 0.08, '#5d3b4a');
  },
  baycity(c, w, h) {
    sky(c, w, h, '#4fc3f7', '#e1f5fe', 0.5);
    karst(c, w * 0.2, h * 0.5, w * 0.35, h * 0.12, '#5b8a73'); karst(c, w * 0.75, h * 0.5, w * 0.4, h * 0.1, '#6c9c84');
    water(c, w, h, h * 0.5, '#26c6da', '#00838f', 3);
    for (let i = 0; i < 9; i++) { const bw = w * 0.07, bh = h * (0.12 + ((i * 37) % 10) / 50); c.fillStyle = i % 2 ? '#eceff1' : '#cfd8dc'; c.fillRect(w * 0.05 + i * w * 0.1, h * 0.72 - bh, bw, bh); c.fillStyle = '#90caf9'; for (let r = 0; r < 4; r++) c.fillRect(w * 0.06 + i * w * 0.1, h * 0.72 - bh + r * bh / 4 + 3, bw * 0.8, 2); }
    c.fillStyle = '#f5deb3'; c.fillRect(0, h * 0.72, w, h * 0.06);
    // tháp Chăm Ponagar
    c.fillStyle = '#a0522d'; c.beginPath(); c.moveTo(w * 0.78, h * 0.72); c.lineTo(w * 0.8, h * 0.52); c.lineTo(w * 0.84, h * 0.45); c.lineTo(w * 0.88, h * 0.52); c.lineTo(w * 0.9, h * 0.72); c.fill();
    water(c, w, h, h * 0.78, '#00acc1', '#006064', 7);
    for (let i = 0; i < 5; i++) palm(c, w * (0.08 + i * 0.12), h * 0.78, h * 0.16, 0.2);
  },
  dragonbridge(c, w, h) {
    sky(c, w, h, '#0b1640', '#3b2a6b', 0.7); stars(c, w, h * 0.5, 60, 3); moon(c, w * 0.85, h * 0.15, w * 0.04);
    for (let i = 0; i < 12; i++) { const bw = w * 0.07, bh = h * (0.08 + ((i * 53) % 13) / 60); c.fillStyle = '#1a1f3d'; c.fillRect(i * w * 0.085, h * 0.6 - bh, bw, bh); c.fillStyle = 'rgba(255,220,120,0.8)'; for (let r = 0; r < 6; r++) c.fillRect(i * w * 0.085 + 3 + (r % 2) * bw * 0.5, h * 0.6 - bh + 4 + Math.floor(r / 2) * 8, 3, 3); }
    water(c, w, h, h * 0.6, '#2b2f6b', '#0a0f2a', 5);
    // thân rồng lượn sóng
    c.strokeStyle = '#ffcc33'; c.lineWidth = h * 0.035; c.lineCap = 'round'; c.shadowColor = '#ffb300'; c.shadowBlur = w * 0.04;
    c.beginPath(); c.moveTo(w * 0.02, h * 0.62);
    for (let x = 0; x <= w * 0.78; x += w / 60) c.lineTo(x, h * 0.55 - Math.abs(Math.sin(x / w * Math.PI * 3)) * h * 0.18);
    c.stroke(); c.shadowBlur = 0;
    // đầu rồng + lửa
    const hx = w * 0.8, hy = h * 0.42;
    c.fillStyle = '#ffcc33'; c.beginPath(); c.ellipse(hx, hy, w * 0.05, h * 0.035, -0.3, 0, 7); c.fill();
    c.fillStyle = rg(c, hx + w * 0.12, hy - h * 0.04, 0, w * 0.15, [[0, '#fff3b0'], [0.4, '#ff9800'], [1, 'rgba(255,60,0,0)']]);
    c.beginPath(); c.ellipse(hx + w * 0.12, hy - h * 0.04, w * 0.15, h * 0.06, -0.3, 0, 7); c.fill();
    c.fillStyle = '#e8eaf6'; c.fillRect(0, h * 0.62, w * 0.8, h * 0.012);
    c.fillStyle = 'rgba(255,200,80,0.25)'; c.fillRect(0, h * 0.64, w * 0.8, h * 0.2);
  },
  goldenbridge(c, w, h) {
    sky(c, w, h, '#b3d7ee', '#f0f6fa', 0.6);
    ridge(c, w, h, h * 0.45, h * 0.15, '#7d9fa8', 12, 4);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(0, h * 0.42, w, h * 0.08);
    ridge(c, w, h, h * 0.62, h * 0.12, '#3d6b4a', 14, 5);
    // hai bàn tay đá
    const hand = (x) => {
      c.fillStyle = lg(c, x - w * 0.08, 0, x + w * 0.08, 0, [[0, '#6d6a62'], [0.5, '#9a958a'], [1, '#5e5b55']]);
      c.beginPath(); c.moveTo(x - w * 0.07, h); c.lineTo(x - w * 0.06, h * 0.68);
      for (let k = 0; k < 4; k++) { const fx = x - w * 0.06 + k * w * 0.04; c.quadraticCurveTo(fx + w * 0.005, h * (0.5 - (k === 1 || k === 2 ? 0.03 : 0)), fx + w * 0.02, h * 0.6); }
      c.lineTo(x + w * 0.08, h); c.fill();
      c.strokeStyle = 'rgba(70,110,60,0.6)'; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x - w * 0.05 + k * w * 0.02, h * 0.75); c.lineTo(x - w * 0.04 + k * w * 0.02, h * 0.9); c.stroke(); }
    };
    hand(w * 0.32); hand(w * 0.62);
    c.strokeStyle = '#f2c230'; c.lineWidth = h * 0.04; c.shadowColor = '#ffd54f'; c.shadowBlur = 12;
    c.beginPath(); c.moveTo(-w * 0.05, h * 0.55); c.quadraticCurveTo(w * 0.45, h * 0.62, w * 1.05, h * 0.5); c.stroke(); c.shadowBlur = 0;
    c.strokeStyle = '#c4921c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-w * 0.05, h * 0.53); c.quadraticCurveTo(w * 0.45, h * 0.6, w * 1.05, h * 0.48); c.stroke();
  },
  lanterns(c, w, h) {
    sky(c, w, h, '#140c2e', '#3a1f55', 0.6); stars(c, w, h * 0.3, 30, 9); moon(c, w * 0.15, h * 0.12, w * 0.04);
    // nhà vàng phố cổ
    for (let i = 0; i < 5; i++) {
      const x = i * w * 0.21, bw = w * 0.2, top = h * (0.38 + (i % 2) * 0.04);
      c.fillStyle = '#e8b33a'; c.fillRect(x, top, bw, h * 0.62 - top + h * 0.05);
      c.fillStyle = '#7a2e1c'; c.beginPath(); c.moveTo(x - 4, top); c.lineTo(x + bw / 2, top - h * 0.08); c.lineTo(x + bw + 4, top); c.fill();
      c.fillStyle = '#5a3a1a'; c.fillRect(x + bw * 0.2, top + h * 0.08, bw * 0.25, h * 0.14); c.fillRect(x + bw * 0.55, top + h * 0.08, bw * 0.25, h * 0.14);
      c.fillStyle = 'rgba(255,200,100,0.6)'; c.fillRect(x + bw * 0.22, top + h * 0.1, bw * 0.21, h * 0.1);
    }
    water(c, w, h, h * 0.67, '#2d1d4d', '#120a24', 2);
    const cols = ['#e53935', '#ffb300', '#8e24aa', '#43a047', '#ff7043', '#1e88e5'];
    const R = rng(21);
    c.strokeStyle = 'rgba(60,30,10,0.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, h * 0.16); c.quadraticCurveTo(w / 2, h * 0.3, w, h * 0.14); c.stroke();
    for (let i = 0; i < 9; i++) { const x = w * (0.06 + i * 0.11); const y = h * 0.16 + Math.sin((i / 8) * Math.PI) * h * 0.12 + h * 0.06; lantern(c, x, y, w * 0.035, cols[i % cols.length]); }
    for (let i = 0; i < 14; i++) { const x = R() * w, y = h * 0.72 + R() * h * 0.25; c.fillStyle = rg(c, x, y, 0, w * 0.03, [[0, 'rgba(255,220,120,0.9)'], [1, 'rgba(255,140,0,0)']]); c.beginPath(); c.arc(x, y, w * 0.03, 0, 7); c.fill(); }
  },
  citadel(c, w, h) {
    sky(c, w, h, '#ffc371', '#ff9a8b', 0.6); sun(c, w * 0.8, h * 0.25, w * 0.06, '#fff1c1');
    // Ngọ Môn: đế đá + lầu Ngũ Phụng
    c.fillStyle = '#8d6e63'; c.fillRect(w * 0.08, h * 0.58, w * 0.84, h * 0.28);
    c.fillStyle = '#3e2723'; for (let i = 0; i < 3; i++) { const ax = w * (0.33 + i * 0.17); c.beginPath(); c.moveTo(ax - w * 0.05, h * 0.86); c.lineTo(ax - w * 0.05, h * 0.72); c.arc(ax, h * 0.72, w * 0.05, Math.PI, 0); c.lineTo(ax + w * 0.05, h * 0.86); c.fill(); }
    c.fillStyle = '#b71c1c'; c.fillRect(w * 0.2, h * 0.44, w * 0.6, h * 0.14);
    c.fillStyle = '#ffd54f'; for (let i = 0; i < 9; i++) c.fillRect(w * (0.22 + i * 0.065), h * 0.46, w * 0.012, h * 0.12);
    roof(c, w / 2, h * 0.45, w * 0.7, h * 0.08, '#e0a020', '#7a4a00');
    c.fillStyle = '#b71c1c'; c.fillRect(w * 0.33, h * 0.32, w * 0.34, h * 0.08);
    roof(c, w / 2, h * 0.33, w * 0.48, h * 0.08, '#e0a020', '#7a4a00');
    c.fillStyle = '#f5f5f5'; c.fillRect(0, h * 0.86, w, h * 0.14);
    c.fillStyle = 'rgba(100,60,40,0.3)'; for (let i = 0; i < 8; i++) c.fillRect(i * w / 8, h * 0.86, 2, h * 0.14);
  },
  myson(c, w, h) {
    sky(c, w, h, '#a5d6a7', '#f1f8e9', 0.5);
    ridge(c, w, h, h * 0.35, h * 0.15, '#5a8a5a', 17, 3);
    ridge(c, w, h, h * 0.55, h * 0.1, '#2f6a3a', 18, 6);
    const tower = (x, base, tw, th) => {
      c.fillStyle = lg(c, x - tw / 2, 0, x + tw / 2, 0, [[0, '#7a3a20'], [0.5, '#b5653a'], [1, '#6a2f18']]);
      c.beginPath(); c.moveTo(x - tw / 2, base); c.lineTo(x - tw / 2, base - th * 0.55);
      for (let k = 0; k < 3; k++) { const yy = base - th * (0.55 + k * 0.13), ww = tw * (0.5 - k * 0.12); c.lineTo(x - ww, yy); c.lineTo(x - ww * 0.85, yy - th * 0.12); }
      c.lineTo(x, base - th); c.lineTo(x + tw * 0.13, base - th * 0.92);
      for (let k = 2; k >= 0; k--) { const yy = base - th * (0.55 + k * 0.13), ww = tw * (0.5 - k * 0.12); c.lineTo(x + ww * 0.85, yy - th * 0.12); c.lineTo(x + ww, yy); }
      c.lineTo(x + tw / 2, base); c.fill();
      c.fillStyle = '#3a1a0c'; c.fillRect(x - tw * 0.12, base - th * 0.3, tw * 0.24, th * 0.3);
      c.strokeStyle = 'rgba(60,20,5,0.4)'; c.lineWidth = 1; for (let r = 1; r < 8; r++) { c.beginPath(); c.moveTo(x - tw / 2, base - r * th * 0.07); c.lineTo(x + tw / 2, base - r * th * 0.07); c.stroke(); }
    };
    tower(w * 0.25, h * 0.85, w * 0.18, h * 0.38); tower(w * 0.52, h * 0.88, w * 0.26, h * 0.55); tower(w * 0.8, h * 0.86, w * 0.16, h * 0.32);
    c.fillStyle = '#3d6b35'; c.fillRect(0, h * 0.86, w, h * 0.14);
    for (let i = 0; i < 12; i++) { c.fillStyle = '#2e5a2a'; c.beginPath(); c.arc(i * w / 11, h * 0.87, w * 0.04, Math.PI, 0); c.fill(); }
  },
  train(c, w, h) {
    sky(c, w, h, '#81d4fa', '#e1f5fe', 0.6); cloud(c, w * 0.75, h * 0.2, w * 0.06);
    ridge(c, w, h, h * 0.55, h * 0.1, '#81a88a', 21, 4);
    c.fillStyle = '#8bc34a'; c.fillRect(0, h * 0.6, w, h * 0.4);
    c.fillStyle = '#795548'; c.fillRect(0, h * 0.74, w, h * 0.04);
    for (let i = 0; i < 14; i++) { c.fillStyle = '#5d4037'; c.fillRect(i * w / 13, h * 0.72, w * 0.02, h * 0.08); }
    // đoàn tàu
    for (let k = 0; k < 3; k++) {
      const x = w * (0.08 + k * 0.3), wd = w * 0.28;
      c.fillStyle = k === 0 ? '#1565c0' : '#1e88e5'; c.fillRect(x, h * 0.52, wd, h * 0.2);
      c.fillStyle = '#ffeb3b'; c.fillRect(x, h * 0.62, wd, h * 0.025);
      c.fillStyle = '#e3f2fd'; for (let r = 0; r < 4; r++) c.fillRect(x + wd * 0.08 + r * wd * 0.22, h * 0.55, wd * 0.16, h * 0.05);
      c.fillStyle = '#263238'; c.beginPath(); c.arc(x + wd * 0.2, h * 0.73, h * 0.025, 0, 7); c.arc(x + wd * 0.8, h * 0.73, h * 0.025, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w * (0.12 - i * 0.03), h * (0.45 - i * 0.07), w * (0.03 + i * 0.012), 0, 7); c.fill(); }
  },
  plane(c, w, h) {
    sky(c, w, h, '#1e88e5', '#bbdefb', 0.8); cloud(c, w * 0.2, h * 0.6, w * 0.08); cloud(c, w * 0.8, h * 0.7, w * 0.07);
    c.save(); c.translate(w * 0.5, h * 0.4); c.rotate(-0.25);
    c.fillStyle = '#fafafa'; c.beginPath(); c.ellipse(0, 0, w * 0.32, h * 0.05, 0, 0, 7); c.fill();
    c.fillStyle = '#e0e0e0'; c.beginPath(); c.moveTo(-w * 0.05, 0); c.lineTo(w * 0.1, h * 0.25); c.lineTo(w * 0.15, h * 0.25); c.lineTo(w * 0.08, 0); c.fill();
    c.beginPath(); c.moveTo(-w * 0.05, 0); c.lineTo(w * 0.05, -h * 0.2); c.lineTo(w * 0.1, -h * 0.2); c.lineTo(w * 0.08, 0); c.fill();
    c.fillStyle = '#d32f2f'; c.beginPath(); c.moveTo(-w * 0.28, -h * 0.02); c.lineTo(-w * 0.34, -h * 0.17); c.lineTo(-w * 0.25, -h * 0.17); c.lineTo(-w * 0.18, -h * 0.03); c.fill();
    starShape(c, -w * 0.28, -h * 0.11, w * 0.02, '#ffeb3b');
    c.fillStyle = '#1565c0'; for (let i = 0; i < 9; i++) c.fillRect(-w * 0.18 + i * w * 0.045, -h * 0.015, w * 0.02, h * 0.015);
    c.restore();
    c.fillStyle = '#546e7a'; c.fillRect(0, h * 0.86, w, h * 0.14); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) c.fillRect(i * w / 5.5, h * 0.92, w * 0.08, h * 0.015);
  },
  ship(c, w, h) {
    sky(c, w, h, '#90caf9', '#fff3e0', 0.55);
    // cần cẩu
    for (let i = 0; i < 3; i++) { const x = w * (0.62 + i * 0.13); c.strokeStyle = '#ef6c00'; c.lineWidth = w * 0.012; c.beginPath(); c.moveTo(x, h * 0.6); c.lineTo(x, h * 0.18); c.lineTo(x - w * 0.15, h * 0.18); c.stroke(); c.beginPath(); c.moveTo(x - w * 0.1, h * 0.18); c.lineTo(x - w * 0.1, h * 0.35); c.stroke(); }
    water(c, w, h, h * 0.6, '#4a90b8', '#1c4f70', 13);
    c.fillStyle = '#263238'; c.beginPath(); c.moveTo(w * 0.05, h * 0.6); c.lineTo(w * 0.7, h * 0.6); c.lineTo(w * 0.64, h * 0.75); c.lineTo(w * 0.1, h * 0.75); c.fill();
    c.fillStyle = '#c62828'; c.fillRect(w * 0.1, h * 0.71, w * 0.55, h * 0.04);
    const cc = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) { c.fillStyle = cc[(i + r * 3) % 5]; c.fillRect(w * (0.12 + i * 0.055), h * (0.52 - r * 0.07), w * 0.05, h * 0.065); }
    c.fillStyle = '#eceff1'; c.fillRect(w * 0.08, h * 0.42, w * 0.06, h * 0.18);
  },
  halong(c, w, h) {
    sky(c, w, h, '#a7d8e8', '#f4fbff', 0.5);
    const R = rng(26);
    for (let i = 0; i < 9; i++) karst(c, R() * w, h * 0.52, w * (0.06 + R() * 0.08), h * (0.08 + R() * 0.12), 'rgba(110,150,140,0.7)');
    water(c, w, h, h * 0.52, '#3fb8a8', '#0b6b6a', 14);
    for (let i = 0; i < 6; i++) karst(c, w * (0.05 + i * 0.19) + R() * w * 0.05, h * (0.62 + (i % 2) * 0.07), w * (0.1 + R() * 0.08), h * (0.22 + R() * 0.15), '#3c6e55', '#2b5442');
    boat(c, w * 0.55, h * 0.84, w * 0.13, '#5a2e12', '#b5541f');
    birds(c, w * 0.15, h * 0.18, w * 0.015, 4);
  },
  cave(c, w, h) {
    c.fillStyle = lg(c, 0, 0, 0, h, [[0, '#1b120b'], [1, '#3a2a1c']]); c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,240,200,0.18)'; c.beginPath(); c.moveTo(w * 0.45, 0); c.lineTo(w * 0.62, 0); c.lineTo(w * 0.85, h); c.lineTo(w * 0.25, h); c.fill();
    c.fillStyle = rg(c, w * 0.53, 0, 0, w * 0.4, [[0, 'rgba(255,255,230,0.9)'], [1, 'rgba(255,255,230,0)']]); c.beginPath(); c.arc(w * 0.53, 0, w * 0.4, 0, 7); c.fill();
    const R = rng(31);
    for (let i = 0; i < 16; i++) { const x = R() * w, l = h * (0.08 + R() * 0.2), wd = w * (0.02 + R() * 0.03); c.fillStyle = '#5a4430'; c.beginPath(); c.moveTo(x - wd, 0); c.lineTo(x, l); c.lineTo(x + wd, 0); c.fill(); }
    for (let i = 0; i < 10; i++) { const x = R() * w, l = h * (0.06 + R() * 0.15), wd = w * (0.025 + R() * 0.03); c.fillStyle = '#6b5238'; c.beginPath(); c.moveTo(x - wd, h * 0.82); c.lineTo(x, h * 0.82 - l); c.lineTo(x + wd, h * 0.82); c.fill(); }
    // rừng trong hang
    for (let i = 0; i < 8; i++) { c.fillStyle = `rgba(60,${120 + i * 8},60,0.9)`; c.beginPath(); c.arc(w * (0.35 + i * 0.05), h * 0.72, w * 0.05, 0, 7); c.fill(); }
    water(c, w, h, h * 0.82, '#2a5d6b', '#0f2a33', 31);
    c.fillStyle = '#ff7043'; c.fillRect(w * 0.48, h * 0.66, w * 0.012, h * 0.04);
  },
  wind(c, w, h) {
    sky(c, w, h, '#4fc3f7', '#e1f5fe', 0.6); cloud(c, w * 0.3, h * 0.2, w * 0.06);
    water(c, w, h, h * 0.6, '#81d4fa', '#4f9fc0', 17);
    c.fillStyle = '#c8b28a'; c.fillRect(0, h * 0.82, w, h * 0.18);
    const turbine = (x, base, ht, a) => {
      c.fillStyle = '#f5f5f5'; c.beginPath(); c.moveTo(x - ht * 0.025, base); c.lineTo(x - ht * 0.012, base - ht); c.lineTo(x + ht * 0.012, base - ht); c.lineTo(x + ht * 0.025, base); c.fill();
      c.save(); c.translate(x, base - ht); for (let k = 0; k < 3; k++) { c.rotate(Math.PI * 2 / 3); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ht * 0.06, -ht * 0.2, 0, -ht * 0.42); c.quadraticCurveTo(-ht * 0.02, -ht * 0.2, 0, 0); c.fill(); }
      c.fillStyle = '#e0e0e0'; c.beginPath(); c.arc(0, 0, ht * 0.03, 0, 7); c.fill(); c.restore(); void a;
    };
    turbine(w * 0.2, h * 0.8, h * 0.5, 0); turbine(w * 0.5, h * 0.75, h * 0.42, 1); turbine(w * 0.78, h * 0.7, h * 0.34, 2); turbine(w * 0.95, h * 0.66, h * 0.25, 2);
  },
  trangan(c, w, h) {
    sky(c, w, h, '#b2dfdb', '#fffde7', 0.45);
    for (let i = 0; i < 7; i++) karst(c, w * (i * 0.17), h * 0.55, w * 0.22, h * (0.25 + (i % 3) * 0.08), i % 2 ? '#5b8c6a' : '#4a7a5a', '#3d6a4c');
    c.fillStyle = '#a5c94a'; c.fillRect(0, h * 0.55, w, h * 0.08);
    water(c, w, h, h * 0.62, '#6fa898', '#2f6b5c', 29);
    // thuyền nan, người chèo bằng chân
    for (let i = 0; i < 3; i++) {
      const x = w * (0.2 + i * 0.3), y = h * (0.75 + (i % 2) * 0.1), s = w * 0.08;
      boat(c, x, y, s, '#4e342e');
      c.fillStyle = '#f3e1a8'; c.beginPath(); c.moveTo(x - s * 0.2, y - s * 0.55); c.lineTo(x + s * 0.05, y - s * 0.3); c.lineTo(x - s * 0.45, y - s * 0.3); c.fill();
      c.fillStyle = '#c62828'; c.fillRect(x - s * 0.3, y - s * 0.3, s * 0.2, s * 0.3);
    }
    birds(c, w * 0.55, h * 0.12, w * 0.015, 3);
  },
  cathedral(c, w, h) {
    sky(c, w, h, '#4a90e2', '#d6ecff', 0.7); cloud(c, w * 0.15, h * 0.18, w * 0.05);
    const red = lg(c, 0, 0, w, 0, [[0, '#a1452f'], [0.5, '#c8634a'], [1, '#93402b']]);
    c.fillStyle = red;
    c.fillRect(w * 0.22, h * 0.42, w * 0.56, h * 0.48);
    c.fillRect(w * 0.18, h * 0.25, w * 0.16, h * 0.65); c.fillRect(w * 0.66, h * 0.25, w * 0.16, h * 0.65);
    c.fillStyle = '#5d6d7e'; [[0.26], [0.74]].forEach(([x]) => { c.beginPath(); c.moveTo(w * (x - 0.09), h * 0.25); c.lineTo(w * x, h * 0.04); c.lineTo(w * (x + 0.09), h * 0.25); c.fill(); });
    c.strokeStyle = '#eee'; c.lineWidth = 2; [[0.26], [0.74]].forEach(([x]) => { c.beginPath(); c.moveTo(w * x, h * 0.04); c.lineTo(w * x, h * -0.02); c.moveTo(w * (x - 0.015), h * 0.0); c.lineTo(w * (x + 0.015), h * 0.0); c.stroke(); });
    c.fillStyle = '#7a2e1c'; c.beginPath(); c.moveTo(w * 0.34, h * 0.42); c.lineTo(w * 0.5, h * 0.3); c.lineTo(w * 0.66, h * 0.42); c.fill();
    c.fillStyle = '#fdf2c5'; c.beginPath(); c.arc(w * 0.5, h * 0.52, w * 0.06, 0, 7); c.fill();
    c.fillStyle = '#3e2723'; for (let i = 0; i < 3; i++) { const ax = w * (0.4 + i * 0.1); c.beginPath(); c.moveTo(ax - w * 0.03, h * 0.9); c.lineTo(ax - w * 0.03, h * 0.72); c.arc(ax, h * 0.72, w * 0.03, Math.PI, 0); c.lineTo(ax + w * 0.03, h * 0.9); c.fill(); }
    c.fillStyle = '#263238'; [[0.26], [0.74]].forEach(([x]) => { for (let r = 0; r < 3; r++) { c.fillRect(w * (x - 0.025), h * (0.3 + r * 0.17), w * 0.05, h * 0.09); } });
    c.fillStyle = '#7cb342'; c.fillRect(0, h * 0.9, w, h * 0.1);
  },
  market(c, w, h) {
    sky(c, w, h, '#ffcc80', '#fff8e1', 0.6);
    c.fillStyle = '#f5e6c8'; c.fillRect(w * 0.08, h * 0.45, w * 0.84, h * 0.4);
    c.fillStyle = '#d7c39c'; c.fillRect(w * 0.08, h * 0.45, w * 0.84, h * 0.04);
    c.fillStyle = '#f0dcb5'; c.fillRect(w * 0.38, h * 0.18, w * 0.24, h * 0.67);
    c.fillStyle = '#c62828'; c.beginPath(); c.moveTo(w * 0.36, h * 0.18); c.lineTo(w * 0.5, h * 0.08); c.lineTo(w * 0.64, h * 0.18); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w * 0.5, h * 0.28, w * 0.065, 0, 7); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.moveTo(w * 0.5, h * 0.28); c.lineTo(w * 0.5, h * 0.24); c.moveTo(w * 0.5, h * 0.28); c.lineTo(w * 0.53, h * 0.29); c.stroke();
    c.fillStyle = '#5d4037'; c.font = `bold ${w * 0.045}px sans-serif`; c.textAlign = 'center'; c.fillText('BẾN THÀNH', w * 0.5, h * 0.43);
    c.fillStyle = '#3e2723'; c.fillRect(w * 0.44, h * 0.62, w * 0.12, h * 0.23);
    for (let i = 0; i < 6; i++) { c.fillStyle = '#4e342e'; c.fillRect(w * (0.12 + i * 0.12 + (i > 2 ? 0.16 : 0)) * (i > 2 ? 0.95 : 1), h * 0.55, w * 0.06, h * 0.1); }
    const cc = ['#e53935', '#43a047', '#fdd835', '#1e88e5'];
    for (let i = 0; i < 10; i++) { c.fillStyle = cc[i % 4]; c.beginPath(); c.moveTo(w * (0.04 + i * 0.1), h * 0.87); c.lineTo(w * (0.09 + i * 0.1), h * 0.82); c.lineTo(w * (0.14 + i * 0.1), h * 0.87); c.fill(); }
    c.fillStyle = '#9e9e9e'; c.fillRect(0, h * 0.87, w, h * 0.13);
  },
  skyscraper(c, w, h) {
    sky(c, w, h, '#0a0f2c', '#2c1b5a', 0.9); stars(c, w, h * 0.6, 70, 34);
    firework(c, w * 0.2, h * 0.22, w * 0.12, '#ff4081', 1); firework(c, w * 0.82, h * 0.18, w * 0.1, '#ffd740', 2); firework(c, w * 0.7, h * 0.4, w * 0.07, '#69f0ae', 3);
    for (let i = 0; i < 14; i++) { const bw = w * 0.06, bh = h * (0.08 + ((i * 41) % 17) / 70); c.fillStyle = '#141a3d'; c.fillRect(i * w * 0.075, h * 0.82 - bh, bw, bh); c.fillStyle = 'rgba(255,230,140,0.7)'; for (let r = 0; r < 8; r++) c.fillRect(i * w * 0.075 + 3 + (r % 2) * bw * 0.5, h * 0.82 - bh + 4 + Math.floor(r / 2) * 7, 2, 3); }
    // Landmark 81 — bó tre
    const segs = [[0.18, 0.84, 0.62], [0.14, 0.62, 0.4], [0.1, 0.4, 0.22], [0.06, 0.22, 0.1]];
    segs.forEach(([wd, b, t], k) => { c.fillStyle = lg(c, w * (0.5 - wd / 2), 0, w * (0.5 + wd / 2), 0, [[0, '#3a5a8a'], [0.5, '#9ec3ff'], [1, '#2a3f6a']]); c.fillRect(w * (0.5 - wd / 2), h * t, w * wd, h * (b - t)); c.fillStyle = 'rgba(255,255,255,0.5)'; for (let s = 1; s < 4; s++) c.fillRect(w * (0.5 - wd / 2 + s * wd / 4), h * t, 1.5, h * (b - t)); void k; });
    c.strokeStyle = '#ff5252'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.5, h * 0.1); c.lineTo(w * 0.5, h * 0.04); c.stroke();
    water(c, w, h, h * 0.84, '#1b2050', '#070a1c', 34);
    c.fillStyle = 'rgba(158,195,255,0.25)'; c.fillRect(w * 0.41, h * 0.84, w * 0.18, h * 0.16);
  },
  vanmieu(c, w, h) {
    sky(c, w, h, '#ffe082', '#fff8e1', 0.5);
    for (let i = 0; i < 6; i++) { c.fillStyle = '#2e6b3a'; c.beginPath(); c.arc(w * (i * 0.2), h * 0.42, w * 0.12, 0, 7); c.fill(); }
    // Khuê Văn Các
    c.fillStyle = '#efe6d2'; c.fillRect(w * 0.3, h * 0.6, w * 0.08, h * 0.25); c.fillRect(w * 0.62, h * 0.6, w * 0.08, h * 0.25); c.fillRect(w * 0.46, h * 0.6, w * 0.08, h * 0.25);
    c.fillStyle = '#8b1e1e'; c.fillRect(w * 0.32, h * 0.38, w * 0.36, h * 0.18);
    c.fillStyle = '#ffd54f'; [0.4, 0.6].forEach(x => { c.beginPath(); c.arc(w * x, h * 0.47, w * 0.045, 0, 7); c.fill(); c.strokeStyle = '#8b1e1e'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(w * x, h * 0.47); c.lineTo(w * x + Math.cos(k * 0.785) * w * 0.045, h * 0.47 + Math.sin(k * 0.785) * w * 0.045); c.stroke(); } });
    roof(c, w / 2, h * 0.39, w * 0.6, h * 0.1, '#6d4c41', '#3e2723');
    roof(c, w / 2, h * 0.6, w * 0.6, h * 0.06, '#6d4c41', '#3e2723');
    // bia tiến sĩ trên lưng rùa
    for (let i = 0; i < 4; i++) { const x = w * (0.08 + i * 0.28 + (i > 1 ? 0.04 : 0)); if (i === 1 || i === 2) continue; c.fillStyle = '#9e9e9e'; c.fillRect(x - w * 0.04, h * 0.72, w * 0.08, h * 0.13); c.fillStyle = '#757575'; c.beginPath(); c.ellipse(x, h * 0.87, w * 0.07, h * 0.03, 0, 0, 7); c.fill(); }
    c.fillStyle = '#cfc6b0'; c.fillRect(0, h * 0.88, w, h * 0.12);
    water(c, w, h, h * 0.92, '#5f9ea0', '#2f6f73', 37);
  },
  turtletower(c, w, h) {
    sky(c, w, h, '#ffb199', '#ffecd2', 0.5); sun(c, w * 0.2, h * 0.28, w * 0.05, '#fff6d5');
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#3f7a45' : '#356b3b'; c.beginPath(); c.arc(w * (i * 0.14), h * 0.46, w * 0.09, 0, 7); c.fill(); }
    c.fillStyle = '#5d4037'; c.fillRect(0, h * 0.48, w, h * 0.02);
    water(c, w, h, h * 0.5, '#7ab8a3', '#2f6f5f', 39);
    // Tháp Rùa
    c.fillStyle = '#4e6b3a'; c.beginPath(); c.ellipse(w * 0.62, h * 0.7, w * 0.12, h * 0.03, 0, 0, 7); c.fill();
    c.fillStyle = '#efe7d6';
    c.fillRect(w * 0.55, h * 0.56, w * 0.14, h * 0.14); c.fillRect(w * 0.57, h * 0.46, w * 0.1, h * 0.1); c.fillRect(w * 0.59, h * 0.38, w * 0.06, h * 0.08);
    c.fillStyle = '#5d4037'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(w * (0.58 + k * 0.04), h * 0.64, w * 0.012, Math.PI, 0); c.fill(); }
    roof(c, w * 0.62, h * 0.385, w * 0.08, h * 0.04, '#795548', '#4e342e');
    c.fillStyle = 'rgba(239,231,214,0.4)'; c.fillRect(w * 0.55, h * 0.72, w * 0.14, h * 0.08);
    // Cầu Thê Húc
    c.strokeStyle = '#d32f2f'; c.lineWidth = h * 0.025; c.beginPath(); c.moveTo(-w * 0.05, h * 0.9); c.quadraticCurveTo(w * 0.2, h * 0.68, w * 0.45, h * 0.86); c.stroke();
    c.lineWidth = 2; for (let i = 0; i < 9; i++) { const t = i / 8, x = -w * 0.05 + t * w * 0.5, y = (1 - t) ** 2 * h * 0.9 + 2 * (1 - t) * t * h * 0.68 + t * t * h * 0.86; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h * 0.05); c.stroke(); }
  },
};

export function drawScene(c, w, h, art) {
  c.save();
  (SCENES[art] || SCENES.go)(c, w, h);
  c.restore();
}

// Tạo ảnh minh hoạ (canvas) cho popup
const cache = new Map();
export function sceneCanvas(art, w = 640, h = 400) {
  const key = art + w + 'x' + h;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  drawScene(cv.getContext('2d'), w, h, art);
  cache.set(key, cv);
  return cv;
}

// ---------------- Mặt ô bàn cờ ----------------
function wrapText(c, text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (c.measureText(t).width > maxW && line) { lines.push(line); line = wd; } else line = t; }
  if (line) lines.push(line);
  return lines;
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

const FONT = '"Be Vietnam Pro", "Segoe UI", Roboto, Arial, sans-serif';

export function tileCanvas(idx) {
  const s = SPACES[idx];
  const corner = idx % 10 === 0;
  const W = corner ? 512 : 320, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // nền giấy
  c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#fbf3df'], [1, '#efe1bf']]); c.fillRect(0, 0, W, H);
  c.strokeStyle = '#3b2a17'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
  c.textAlign = 'center'; c.textBaseline = 'middle';

  if (corner) {
    c.save(); roundRect(c, 26, 26, W - 52, H - 150, 24); c.clip(); drawScene(c, W, H - 100, s.art); c.restore();
    c.strokeStyle = '#3b2a17'; c.lineWidth = 4; roundRect(c, 26, 26, W - 52, H - 150, 24); c.stroke();
    c.fillStyle = '#7a1414'; c.font = `900 44px ${FONT}`;
    const lines = wrapText(c, s.short || s.name, W - 50);
    lines.forEach((l, i) => c.fillText(l, W / 2, H - 92 + i * 46 - (lines.length - 1) * 20));
    return cv;
  }

  let y = 0;
  if (s.type === 'property') {
    const col = GROUPS[s.group].color;
    c.fillStyle = col; c.fillRect(6, 6, W - 12, 92);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(6, 6, W - 12, 30);
    c.strokeStyle = '#3b2a17'; c.lineWidth = 4; c.beginPath(); c.moveTo(6, 98); c.lineTo(W - 6, 98); c.stroke();
    y = 98;
  }
  // tên
  c.fillStyle = '#2b1b0e'; c.font = `800 34px ${FONT}`;
  let lines = wrapText(c, s.name.toUpperCase(), W - 30);
  if (lines.length > 3) { c.font = `800 28px ${FONT}`; lines = wrapText(c, s.name.toUpperCase(), W - 24); }
  const lh = lines.length > 2 ? 32 : 38;
  lines.forEach((l, i) => c.fillText(l, W / 2, y + 34 + i * lh));
  const artTop = y + 30 + lines.length * lh;
  const artH = H - artTop - 78;
  c.save(); roundRect(c, 20, artTop, W - 40, artH, 18); c.clip(); c.translate(20, artTop); drawScene(c, W - 40, artH, s.art); c.restore();
  c.strokeStyle = '#3b2a17'; c.lineWidth = 3; roundRect(c, 20, artTop, W - 40, artH, 18); c.stroke();
  // giá
  c.fillStyle = '#2b1b0e'; c.font = `700 36px ${FONT}`;
  const bottom = s.price ? fmt(s.price) : s.amount ? 'Nộp ' + fmt(s.amount) : '';
  c.fillText(bottom, W / 2, H - 42);
  return cv;
}

// ---------------- Mặt trung tâm bàn cờ ----------------
export function centerCanvas(size = 2048) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'), S = size;
  c.fillStyle = rg(c, S / 2, S / 2, S * 0.1, S * 0.75, [[0, '#f6ead0'], [1, '#d9c193']]); c.fillRect(0, 0, S, S);
  // hoa văn trống đồng Đông Sơn
  c.save(); c.translate(S * 0.3, S * 0.62); c.globalAlpha = 0.18; c.strokeStyle = '#7a4a12'; c.fillStyle = '#7a4a12';
  for (let r = 1; r <= 9; r++) { c.lineWidth = r % 3 === 0 ? 8 : 3; c.beginPath(); c.arc(0, 0, r * S * 0.04, 0, 7); c.stroke(); }
  starShape(c, 0, 0, S * 0.06, '#7a4a12');
  for (let k = 0; k < 14; k++) { const a = k * Math.PI * 2 / 14; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * S * 0.04, Math.sin(a) * S * 0.04); c.stroke(); }
  // chim Lạc bay vòng
  for (let k = 0; k < 10; k++) { const a = k * Math.PI * 2 / 10; c.save(); c.rotate(a); c.translate(S * 0.3, 0); c.rotate(Math.PI / 2);
    c.beginPath(); c.moveTo(-S * 0.03, 0); c.quadraticCurveTo(0, -S * 0.02, S * 0.035, -S * 0.005); c.lineTo(S * 0.05, -S * 0.015); c.lineTo(S * 0.035, S * 0.005); c.quadraticCurveTo(0, S * 0.01, -S * 0.03, 0); c.fill(); c.restore(); }
  c.restore();
  // biển
  c.globalAlpha = 0.55; c.fillStyle = '#9fd3e6';
  c.beginPath(); c.moveTo(S * 0.62, 0); c.lineTo(S, 0); c.lineTo(S, S); c.lineTo(S * 0.5, S); c.bezierCurveTo(S * 0.55, S * 0.7, S * 0.85, S * 0.6, S * 0.72, S * 0.3); c.fill(); c.globalAlpha = 1;
  // bản đồ Việt Nam
  const P = ([lon, lat]) => { const [x, y] = project(lon, lat); return [x * S, y * S]; };
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  c.fillStyle = lg(c, 0, S * 0.05, 0, S * 0.95, [[0, '#d84315'], [0.5, '#e53935'], [1, '#c62828']]);
  c.beginPath(); VN.forEach((pt, i) => { const [x, y] = P(pt); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = '#ffd54f'; c.lineWidth = 6; c.beginPath(); VN.forEach((pt, i) => { const [x, y] = P(pt); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke();
  // Phú Quốc, Côn Đảo
  [[103.95, 10.25, 14], [106.6, 8.7, 7]].forEach(([lo, la, r]) => { const [x, y] = P([lo, la]); c.fillStyle = '#e53935'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#ffd54f'; c.lineWidth = 3; c.stroke(); });
  // Hoàng Sa, Trường Sa
  const archi = (lon, lat, label, seed) => {
    const R = rng(seed); const [x, y] = P([lon, lat]);
    c.fillStyle = '#c62828'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x + (R() - 0.5) * S * 0.06, y + (R() - 0.5) * S * 0.05, 4 + R() * 5, 0, 7); c.fill(); }
    c.fillStyle = '#0d47a1'; c.font = `italic 700 ${S * 0.016}px ${FONT}`; c.textAlign = 'center'; c.fillText(label, x, y + S * 0.045); c.fillText('(Việt Nam)', x, y + S * 0.065);
  };
  archi(112, 16.5, 'Quần đảo Hoàng Sa', 5); archi(114, 9.6, 'Quần đảo Trường Sa', 6);
  c.fillStyle = '#0d47a1'; c.font = `italic 800 ${S * 0.03}px ${FONT}`; c.textAlign = 'center'; c.fillText('BIỂN ĐÔNG', S * 0.86, S * 0.35);
  // tiêu đề
  c.save(); c.translate(S * 0.235, S * 0.27); c.rotate(-0.08);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `900 ${S * 0.085}px ${FONT}`; c.lineWidth = S * 0.014; c.strokeStyle = '#5a1010'; c.strokeText('CỜ TỶ PHÚ', 0, 0);
  c.fillStyle = lg(c, 0, -S * 0.05, 0, S * 0.05, [[0, '#ffe57f'], [0.5, '#ffb300'], [1, '#e65100']]); c.fillText('CỜ TỶ PHÚ', 0, 0);
  c.fillStyle = '#b71c1c'; c.fillRect(-S * 0.2, S * 0.06, S * 0.4, S * 0.075);
  c.fillStyle = '#ffd54f'; c.font = `900 ${S * 0.052}px ${FONT}`; c.fillText('VIỆT NAM', 0, S * 0.1);
  starShape(c, -S * 0.235, S * 0.098, S * 0.025, '#ffd54f'); starShape(c, S * 0.235, S * 0.098, S * 0.025, '#ffd54f');
  c.fillStyle = '#5a3a1a'; c.font = `italic 600 ${S * 0.02}px ${FONT}`; c.fillText('Hành trình khám phá dải đất hình chữ S', 0, S * 0.17);
  c.restore();
  // ô đặt thẻ
  const slot = (x, y, label, col) => { c.save(); c.translate(x, y); c.rotate(-Math.PI / 4); c.setLineDash([18, 12]); c.strokeStyle = col; c.lineWidth = 6; roundRect(c, -S * 0.1, -S * 0.065, S * 0.2, S * 0.13, 20); c.stroke(); c.setLineDash([]); c.fillStyle = col; c.font = `800 ${S * 0.022}px ${FONT}`; c.textAlign = 'center'; c.fillText(label, 0, S * 0.095); c.restore(); };
  slot(S * 0.2, S * 0.78, 'KHÍ VẬN', '#0E7C66'); slot(S * 0.8, S * 0.78, 'CƠ HỘI', '#5b2a86');
  return cv;
}

export function diceFace(n, red) {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
  c.fillStyle = '#fdfaf2'; c.fillRect(0, 0, S, S);
  c.fillStyle = rg(c, S / 2, S / 2, S * 0.2, S * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(120,90,40,0.18)']]); c.fillRect(0, 0, S, S);
  const P = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]] };
  const r = n === 1 ? S * 0.15 : S * 0.085;
  for (const [x, y] of P[n]) { c.fillStyle = red ? '#c62828' : '#1a1a1a'; c.beginPath(); c.arc(x * S, y * S, r, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(x * S - r * 0.3, y * S - r * 0.3, r * 0.35, 0, 7); c.fill(); }
  return cv;
}
