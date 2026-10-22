'use strict';
// =====================================================================
//  BÀN PHÍM ẢO (tô màu theo ngón) + ĐÔI BÀN TAY chỉ ngón cần dùng
// =====================================================================

const KB_ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

class ScreenKeyboard {
  constructor(root) {
    this.root = root;
    this.keys = {};
    root.classList.add('kb');
    root.innerHTML = '';
    KB_ROWS.forEach((row, r) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row kb-row-' + r;
      for (const k of row) rowEl.appendChild(this.makeKey(k));
      root.appendChild(rowEl);
    });
    const sp = document.createElement('div');
    sp.className = 'kb-row kb-row-3';
    this.tipSlot = document.createElement('div');
    this.tipSlot.className = 'tip-slot';
    sp.append(this.tipSlot, this.makeKey(' '), document.createElement('div'));
    root.appendChild(sp);
  }
  makeKey(k) {
    const el = document.createElement('div');
    el.className = 'key' + (k === ' ' ? ' space' : '') + (k === 'f' || k === 'j' ? ' bump' : '');
    el.style.setProperty('--fc', FINGERS[FINGER_OF[k]].color);
    el.innerHTML = `<span>${k === ' ' ? 'phím cách' : k.toUpperCase()}</span>`;
    this.keys[k] = el;
    return el;
  }
  // Làm mờ phím chưa học, đánh dấu phím mới
  setKnown(known, fresh = '') {
    for (const k in this.keys) {
      this.keys[k].classList.toggle('unknown', !known.includes(k));
      this.keys[k].classList.toggle('fresh', fresh.includes(k));
    }
  }
  setNext(k) {
    if (this.next) this.next.classList.remove('next');
    this.next = k != null ? this.keys[k] : null;
    if (this.next) this.next.classList.add('next');
  }
  flash(k, ok) {
    const el = this.keys[k];
    if (!el) return;
    const cls = ok ? 'hit' : 'miss';
    el.classList.remove('hit', 'miss');
    void el.offsetWidth;
    el.classList.add(cls);
  }
  // Bản đồ nhiệt cho góc bố mẹ: xanh = tốt, vàng = tạm, đỏ = cần luyện
  heat(stats) {
    for (const k in this.keys) {
      const s = stats[k], el = this.keys[k];
      el.classList.remove('unknown', 'fresh');
      if (!s || s.hit + s.miss < 3) { el.style.setProperty('--fc', '#f0eaf7'); el.title = 'Chưa đủ dữ liệu'; continue; }
      const acc = s.hit / (s.hit + s.miss);
      const avg = s.timed ? s.time / s.timed : 0;
      el.style.setProperty('--fc', acc >= 0.95 ? '#a8ecc0' : acc >= 0.85 ? '#ffe9a0' : '#ffb3b3');
      el.title = `${keyLabel(k)}: chính xác ${Math.round(acc * 100)}% · ${avg.toFixed(1)} giây/phím · ${s.hit + s.miss} lần`;
    }
  }
}

class Hands {
  // Hai bàn tay đặt hai bên bàn phím; nhãn "phím + ngón" nằm cạnh phím cách
  constructor(leftRoot, rightRoot, tipRoot) {
    leftRoot.innerHTML = this.svg('L');
    rightRoot.innerHTML = this.svg('R');
    this.roots = [leftRoot, rightRoot];
    this.tip = tipRoot;
    tipRoot.classList.add('finger-tip');
  }
  svg(side) {
    const ids = side === 'L' ? ['L5', 'L4', 'L3', 'L2'] : ['R5', 'R4', 'R3', 'R2'];
    const xs = [16, 44, 72, 100], tops = [46, 26, 16, 30];
    let fingers = '';
    ids.forEach((id, i) => {
      fingers += `<g class="finger f-${id}"><rect x="${xs[i]}" y="${tops[i]}" width="25" height="${118 - tops[i]}" rx="12.5" fill="${FINGERS[id].color}"/>` +
                 `<ellipse cx="${xs[i] + 12.5}" cy="${tops[i] + 11}" rx="6" ry="5" fill="rgba(255,255,255,.7)"/></g>`;
    });
    const thumb = `<g class="finger f-TH"><rect x="118" y="96" width="25" height="58" rx="12.5" fill="${FINGERS.TH.color}" transform="rotate(-38 130 150)"/></g>`;
    const flip = side === 'R' ? ' transform="translate(160,0) scale(-1,1)"' : '';
    return `<svg viewBox="0 0 160 175" class="hand hand-${side}" aria-hidden="true"><g${flip}>` +
           `<rect x="14" y="88" width="116" height="82" rx="34" fill="#ffe1cc" stroke="#f0bfa5" stroke-width="2"/>` +
           thumb + fingers + `</g></svg>`;
  }
  setKey(k) {
    for (const r of this.roots) r.querySelectorAll('.finger.active').forEach(el => el.classList.remove('active'));
    if (k == null || !FINGER_OF[k]) { this.tip.innerHTML = ''; return; }
    const f = FINGER_OF[k];
    for (const r of this.roots) r.querySelectorAll('.f-' + f).forEach(el => el.classList.add('active'));
    this.tip.innerHTML = `<b style="background:${FINGERS[f].color}">${keyLabel(k)}</b><span>${FINGERS[f].name}</span>`;
  }
}
