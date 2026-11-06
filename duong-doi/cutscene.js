/* Đường Đời — short animated vignettes for life's big moments, staged in a random Vietnamese place.
 * window.DDCutscene.play({ event, players, who, data }) → Promise (resolves on end or skip).
 * Own overlay, own renderer, procedural low-poly sets in the same style as the board. */
(function () {
  'use strict';
  const T = window.THREE;
  const FONT = '"Be Vietnam Pro", system-ui, sans-serif';
  const TAU = Math.PI * 2;
  let rnd = Math.random;
  const pickOne = (a) => a[(rnd() * a.length) | 0];

  // ---------- small builders ----------
  function mat(color, o) { return new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.7 }, o || {})); }
  function mesh(geo, m, x, y, z) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; return o; }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  const glow = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  function lantern(parent, color, x, y, z, s) {
    s = s || 1; parent.add(mesh(new T.SphereGeometry(0.16 * s, 14, 10), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }), x, y, z));
    const sp = new T.Sprite(new T.SpriteMaterial({ map: glow, color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 })); sp.position.set(x, y, z); sp.scale.setScalar(1.1 * s); parent.add(sp);
  }
  function roof(w, d, h, color) { // hip roof with upturned corners
    const W = w / 2 + 0.12, D = d / 2 + 0.12, r = Math.max(0.02, (w - d) / 2 * 0.9), c = 0.2;
    const pts = [[-W, c, -D], [0, 0, -D], [W, c, -D], [W, 0, 0], [W, c, D], [0, 0, D], [-W, c, D], [-W, 0, 0], [-r, h, 0], [r, h, 0]];
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts.flat(), 3));
    g.setIndex([0, 1, 8, 1, 9, 8, 1, 2, 9, 2, 3, 9, 3, 4, 9, 4, 5, 9, 5, 8, 9, 5, 6, 8, 6, 7, 8, 7, 0, 8]); g.computeVertexNormals();
    return mesh(g, mat(color, { side: T.DoubleSide }));
  }
  function tree(kind, x, z, s) {
    const g = new T.Group(); s = s || 1;
    if (kind === 'palm') {
      const pts = []; for (let i = 0; i <= 6; i++) pts.push(new T.Vector3(Math.sin(i / 6 * 1.2) * 0.5, i / 6 * 2.4, 0));
      g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, 0.08, 6), mat('#8a6a46')));
      for (let i = 0; i < 7; i++) { const lf = mesh(new T.ConeGeometry(0.14, 1.3, 4), mat('#3f8a3a')); lf.position.copy(pts[6]); lf.rotation.set(1.9, (i / 7) * TAU, 0, 'YXZ'); lf.translateY(0.6); g.add(lf); }
    } else if (kind === 'pine') {
      g.add(mesh(new T.CylinderGeometry(0.06, 0.08, 0.4, 6), mat('#5a3d27'), 0, 0.2, 0));
      g.add(mesh(new T.ConeGeometry(0.45, 1.4, 8), mat('#2f6b3a', { flatShading: true }), 0, 1.0, 0));
    } else if (kind === 'flame' || kind === 'round') {
      g.add(mesh(new T.CylinderGeometry(0.07, 0.1, 0.7, 6), mat('#6b4a2f'), 0, 0.35, 0));
      g.add(mesh(new T.IcosahedronGeometry(0.6, 1), mat(kind === 'flame' ? '#e0482f' : '#4f9a35', { flatShading: true }), 0, 1.05, 0));
    }
    g.position.set(x, 0, z); g.scale.setScalar(s); return g;
  }
  function karst(x, z, h, r, color) {
    const g = new T.IcosahedronGeometry(1, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 0.8 + 0.4 * Math.sin(vx * 5 + vz * 3 + x); p.setXYZ(i, vx * r * k * (vy > 0 ? 1 - vy * 0.3 : 1), vy > 0 ? vy * h : vy * 0.4, vz * r * k * (vy > 0 ? 1 - vy * 0.3 : 1)); }
    g.computeVertexNormals();
    const grp = new T.Group(); grp.add(mesh(g, mat(color || '#7f8a74', { flatShading: true }), 0, 0, 0));
    const cap = mesh(new T.IcosahedronGeometry(r * 0.65, 1), mat('#4f7f3a', { flatShading: true }), 0, h * 0.92, 0); cap.scale.y = 0.4; grp.add(cap);
    grp.position.set(x, 0, z); return grp;
  }
  function boat(sail) {
    const g = new T.Group(); g.add(mesh(new T.BoxGeometry(1.8, 0.35, 0.6), mat('#5a3620'), 0, 0.15, 0));
    if (sail) for (const [x, h] of [[-0.3, 1.4], [0.45, 1.0]]) { g.add(mesh(new T.CylinderGeometry(0.03, 0.03, h + 0.3, 6), mat('#3d2617'), x, 0.3 + h / 2, 0)); const s = mesh(new T.PlaneGeometry(0.9, h), mat('#b5462b', { side: T.DoubleSide }), x + 0.05, 0.45 + h / 2, 0.02); s.rotation.y = 0.3; g.add(s); }
    return g;
  }
  function water(color, size) { const m = mesh(new T.CircleGeometry(size || 40, 48), new T.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1 }), 0, 0.01, 0); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; }
  function ground(color, r) { const m = mesh(new T.CircleGeometry(r || 40, 48), mat(color, { roughness: 0.95 }), 0, 0, 0); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; }
  function disc(color, r, y) { const m = mesh(new T.CylinderGeometry(r, r + 0.1, 0.2, 40), mat(color), 0, (y || 0) - 0.1, 0); return m; }

  // ---------- places (stage at the origin, radius ~3 kept free) ----------
  const PLACES = [
    { key: 'hoguom', name: 'Hồ Gươm', area: 'Hà Nội · Miền Bắc', sky: ['#7fb6e6', '#f6dcc0'], sun: ['#fff0d2', 1.2, 0.7], build(s) {
      s.add(water('#3b8fb0')); s.add(disc('#7fb257', 4.2));
      const tr = new T.Group(); tr.position.set(-5, 0, -7); s.add(tr); tr.add(mesh(new T.CylinderGeometry(0.9, 1.1, 0.4, 16), mat('#6f9a4c'), 0, 0.1, 0));
      [[1, 0.7], [0.8, 0.6], [0.6, 0.5]].reduce((y, [w, h]) => { tr.add(mesh(new T.BoxGeometry(w, h, w * 0.7), mat('#e9dcc0'), 0, y + h / 2, 0)); return y + h; }, 0.3);
      const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new T.Vector3(3 + u * 4, 0.3 + Math.sin(u * Math.PI) * 1.2, -4 - u * 2)); }
      s.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 30, 0.25, 6), mat('#c0322a')));
      for (let i = 0; i < 9; i++) s.add(tree(i % 3 ? 'flame' : 'round', Math.cos(i / 9 * TAU + 1) * 6, Math.sin(i / 9 * TAU + 1) * 6 - 1, 1));
    } },
    { key: 'halong', name: 'Vịnh Hạ Long', area: 'Quảng Ninh · Miền Bắc', sky: ['#6aa9de', '#e7eef0'], sun: ['#fff6e4', 1.2, 0.6], build(s) {
      s.add(water('#2f8fb3')); s.add(disc('#9a7b55', 3.6, 0.25));
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.3, R = 13 + (i % 3) * 3; s.add(karst(Math.cos(a) * R, Math.sin(a) * R - 3, 3 + (i % 4), 1.1 + (i % 2) * 0.5)); }
      const b = boat(true); b.position.set(5, 0, -3); b.rotation.y = 0.6; s.add(b); s.userData.boat = b;
    } },
    { key: 'sapa', name: 'Ruộng bậc thang Mù Cang Chải', area: 'Yên Bái · Tây Bắc', sky: ['#4f9be0', '#dcefd8'], sun: ['#fff6e4', 1.3, 0.9], build(s) {
      s.add(ground('#8cc25a')); s.add(disc('#9ccf64', 4));
      for (let k = 0; k < 8; k++) { // stepped terraces as open rings behind the stage
        const r0 = 12 + k * 1.7, y = (k + 1) * 0.6, a0 = Math.PI * 0.55, len = Math.PI * 1.9;
        const top = mesh(new T.RingGeometry(r0, r0 + 1.7, 64, 1, a0, len), mat(k % 3 === 0 ? '#9fd0b2' : k % 2 ? '#a9d15f' : '#93c454', { side: T.DoubleSide }), 0, y, 0); top.rotation.x = -Math.PI / 2; s.add(top);
        const riser = mesh(new T.CylinderGeometry(r0, r0, 0.6, 64, 1, true, a0 - Math.PI / 2, len), mat('#7a6a44', { side: T.DoubleSide }), 0, y - 0.3, 0); riser.rotation.y = 0; s.add(riser);
      }
      for (let i = 0; i < 4; i++) s.add(karst(-14 + i * 9, -24, 8 + i, 4, '#6f8f6a'));
      const h = new T.Group(); h.position.set(5, 0, -5); s.add(h); for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) h.add(mesh(new T.CylinderGeometry(0.04, 0.04, 0.5, 6), mat('#6e4326'), x, 0.25, z));
      h.add(mesh(new T.BoxGeometry(1.1, 0.5, 0.8), mat('#8a5a34'), 0, 0.75, 0)); const r = roof(1.2, 0.9, 0.55, '#c9a865'); r.position.y = 1.0; h.add(r);
    } },
    { key: 'trangan', name: 'Tràng An', area: 'Ninh Bình · Miền Bắc', sky: ['#8cb8dc', '#eaf0e4'], sun: ['#fff3dc', 1.1, 0.7], build(s) {
      s.add(water('#3f8f88')); s.add(disc('#7fb257', 3.8, 0.2));
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, R = 13 + (i % 2) * 4; s.add(karst(Math.cos(a) * R, Math.sin(a) * R - 2, 4 + (i % 3) * 1.5, 1.8)); }
      for (let i = 0; i < 3; i++) { const b = boat(false); b.scale.setScalar(0.6); b.position.set(4 + i * 1.4, 0, -2 - i); b.rotation.y = 0.8; s.add(b); }
      const t = new T.Group(); t.position.set(-6, 0, -6); s.add(t); t.add(mesh(new T.BoxGeometry(1.6, 0.8, 1), mat('#d8c7a5'), 0, 0.4, 0)); const r = roof(1.8, 1.2, 0.6, '#7a3b26'); r.position.y = 0.8; t.add(r);
    } },
    { key: 'hue', name: 'Kinh thành Huế', area: 'Thừa Thiên Huế · Miền Trung', sky: ['#7fb2e0', '#f5e1bf'], sun: ['#ffe6bf', 1.2, 0.6], build(s) {
      s.add(ground('#b9b08f')); s.add(disc('#cfc2a0', 4));
      const g = new T.Group(); g.position.set(0, 0, -7); s.add(g);
      g.add(mesh(new T.BoxGeometry(12, 2, 2.2), mat('#a8533a'), 0, 1, 0));
      for (let i = -2; i <= 2; i++) g.add(mesh(new T.BoxGeometry(0.9, 1.3, 0.1), mat('#3a2418'), i * 2, 0.65, 1.11));
      g.add(mesh(new T.BoxGeometry(8, 1.1, 1.8), mat('#e2b84a'), 0, 2.6, 0));
      const r1 = roof(8.6, 2.2, 0.8, '#d8a83a'); r1.position.y = 3.15; g.add(r1);
      const r2 = roof(4, 1.6, 0.8, '#d8a83a'); r2.position.y = 3.9; g.add(r2);
      for (let i = -3; i <= 3; i++) lantern(g, '#ffcc33', i * 1.6, 2.2, 1.0, 0.7);
      for (let i = 0; i < 8; i++) { const x = -10 + i * 2.8; const lp = mesh(new T.CylinderGeometry(0.5, 0.5, 0.05, 12), mat('#4f9a62'), x, 0.03, 3.8); s.add(lp); s.add(mesh(new T.SphereGeometry(0.15, 8, 6), mat('#ff9fbf'), x + 0.2, 0.15, 3.7)); }
    } },
    { key: 'hoian', name: 'Phố cổ Hội An', area: 'Quảng Nam · Miền Trung', sky: ['#4a5fa8', '#ffb877'], sun: ['#ffb070', 1.0, 0.25], lanterns: true, build(s) {
      s.add(ground('#c8b986')); const river = water('#2f6f8f', 30); river.position.set(0, 0.02, 34); s.add(river); s.add(disc('#d8c49a', 4, 0.05));
      for (let i = -5; i <= 5; i++) { const h = 1.4 + (i % 2) * 0.4, x = i * 1.7; s.add(mesh(new T.BoxGeometry(1.6, h, 1.4), mat(['#f2c14e', '#f4cf6a', '#eab64a'][(i + 6) % 3]), x, h / 2, -6)); const rf = roof(1.7, 1.5, 0.45, '#7a3b26'); rf.position.set(x, h, -6); s.add(rf); lantern(s, ['#ff4a3a', '#ffcc33', '#d65cff'][(i + 6) % 3], x, h * 0.6, -5.2, 0.9); }
      for (let i = 0; i < 14; i++) lantern(s, ['#ff4a3a', '#ffcc33', '#ff7a2a'][i % 3], -9 + i * 1.4, 2.8 - Math.sin(i / 13 * Math.PI) * 0.6, -3.5, 0.7);
      for (let i = 0; i < 4; i++) { const b = boat(false); b.scale.setScalar(0.55); b.position.set(-6 + i * 4, 0, 8); s.add(b); lantern(s, '#ffcc33', -6 + i * 4, 0.5, 8, 0.6); }
    } },
    { key: 'muine', name: 'Đồi cát Mũi Né', area: 'Bình Thuận · Nam Trung Bộ', sky: ['#5b7fc0', '#ffb36a'], sun: ['#ffae66', 1.2, 0.2], build(s) {
      s.add(ground('#e8c48a'));
      for (let i = 0; i < 9; i++) { const d = mesh(new T.SphereGeometry(4 + (i % 3) * 2, 24, 12), mat(i % 2 ? '#e7b979' : '#f0cf96', { roughness: 1 }), -18 + i * 4.5, -2.5, -10 - (i % 3) * 4); d.scale.y = 0.55; s.add(d); }
      for (let i = 0; i < 4; i++) s.add(tree('palm', 6 + i * 1.5, 3 - i * 2.5, 0.9));
    } },
    { key: 'dalat', name: 'Hồ Xuân Hương', area: 'Đà Lạt · Tây Nguyên', sky: ['#8fb3cf', '#eef2f3'], sun: ['#f3f6ff', 1.0, 0.6], fog: true, build(s) {
      s.add(ground('#5e9a4e')); const w = water('#4f8fa8', 6); w.position.set(-3, 0.02, -8); s.add(w); s.add(disc('#79ad47', 4));
      for (let i = 0; i < 26; i++) { const a = rnd() * TAU, R = 6 + rnd() * 12; s.add(tree('pine', Math.cos(a) * R, Math.sin(a) * R - 4, 0.9 + rnd() * 0.7)); }
      for (let i = 0; i < 60; i++) s.add(mesh(new T.SphereGeometry(0.1, 6, 4), mat(['#ff6fa0', '#ffd34d', '#b77bff', '#ffffff'][i % 4]), 3 + rnd() * 3, 0.1, 2 + rnd() * 3));
      const v = new T.Group(); v.position.set(6, 0, -6); s.add(v); v.add(mesh(new T.BoxGeometry(1.8, 1.2, 1.2), mat('#f3e2bd'), 0, 0.6, 0)); const vr = mesh(new T.ConeGeometry(1.4, 1.0, 4), mat('#9c3f2a'), 0, 1.7, 0); vr.rotation.y = Math.PI / 4; v.add(vr);
    } },
    { key: 'cairang', name: 'Chợ nổi Cái Răng', area: 'Cần Thơ · Miền Tây', sky: ['#5fa7e3', '#fbe7c4'], sun: ['#fff0d2', 1.3, 0.5], build(s) {
      s.add(water('#8a7a4a')); s.add(disc('#7a5a36', 3.8, 0.25));
      for (let i = 0; i < 7; i++) { const b = boat(false); b.position.set(-9 + i * 3, 0, -4 - (i % 2) * 2.5); b.rotation.y = (i % 2) * 0.4; s.add(b); for (let k = 0; k < 6; k++) b.add(mesh(new T.SphereGeometry(0.17, 8, 6), mat(['#7fbf3a', '#ffb33a', '#e64a3a', '#ffd84a'][(i + k) % 4]), -0.6 + k * 0.24, 0.45, (k % 2) * 0.15)); const pole = mesh(new T.CylinderGeometry(0.03, 0.03, 2.4, 6), mat('#3d2617'), 0.7, 1.4, 0); b.add(pole); b.add(mesh(new T.SphereGeometry(0.22, 8, 6), mat('#ffb33a'), 0.7, 2.6, 0)); }
      for (let i = 0; i < 8; i++) s.add(tree('palm', -12 + i * 3.4, -12, 1.2));
    } },
    { key: 'phuquoc', name: 'Bãi Sao', area: 'Phú Quốc · Kiên Giang', sky: ['#3b5ea6', '#ff9d5c'], sun: ['#ff9a55', 1.1, 0.15], build(s) {
      s.add(water('#2a8db4')); const sand = mesh(new T.CircleGeometry(16, 40, 0, Math.PI), mat('#f0dcaa'), 0, 0.03, 2); sand.rotation.x = -Math.PI / 2; s.add(sand); s.add(disc('#ead39c', 4, 0.06));
      for (let i = 0; i < 9; i++) s.add(tree('palm', -10 + i * 2.5, -3 - (i % 3), 1 + (i % 2) * 0.3));
      const b = boat(false); b.position.set(4, 0, 6); s.add(b);
    } },
    { key: 'bachdang', name: 'Bến Bạch Đằng', area: 'TP. Hồ Chí Minh · Miền Nam', sky: ['#1d2a55', '#e2785a'], sun: ['#ffb08a', 0.7, 0.2], night: true, build(s) {
      s.add(water('#1f4f6f')); s.add(disc('#9a948a', 4, 0.15));
      const win = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#2d3b52'; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 10) for (let x = 3; x < w; x += 10) { g.fillStyle = Math.random() < 0.6 ? '#ffe7a8' : '#5b7894'; g.fillRect(x, y, 6, 6); } });
      for (let i = 0; i < 11; i++) { const h = 3 + (i * 7 % 5) + (i === 5 ? 6 : 0), w = 1.2 + (i % 3) * 0.3; const m = new T.MeshStandardMaterial({ map: win, emissive: '#ffffff', emissiveMap: win, emissiveIntensity: 0.6 }); s.add(mesh(new T.BoxGeometry(w, h, w), m, -12 + i * 2.4, h / 2, -12)); }
      for (let i = 0; i < 12; i++) lantern(s, '#ffd27a', -11 + i * 2, 1.2, 3.5, 0.5);
    } },
  ];

  // ---------- people ----------
  const skin = () => mat('#f1c9a0');
  function figure(o) {
    o = o || {}; const g = new T.Group(), s = o.scale || 1, shirt = o.color || '#c0392b';
    if (o.dress) { const sk = mesh(new T.ConeGeometry(0.28 * s, 0.62 * s, 16, 1, true), mat(shirt, { side: T.DoubleSide }), 0, 0.31 * s, 0); g.add(sk); g.add(mesh(new T.CapsuleGeometry(0.11 * s, 0.22 * s, 4, 8), mat(shirt), 0, 0.72 * s, 0)); }
    else { g.add(mesh(new T.CapsuleGeometry(0.07 * s, 0.28 * s, 4, 8), mat(o.pants || '#2b2b33'), -0.07 * s, 0.22 * s, 0)); g.add(mesh(new T.CapsuleGeometry(0.07 * s, 0.28 * s, 4, 8), mat(o.pants || '#2b2b33'), 0.07 * s, 0.22 * s, 0)); g.add(mesh(new T.CapsuleGeometry(0.15 * s, 0.26 * s, 4, 10), mat(shirt), 0, 0.68 * s, 0)); }
    const head = mesh(new T.SphereGeometry(0.15 * s, 16, 12), skin(), 0, 1.05 * s, 0); g.add(head);
    const hair = mesh(new T.SphereGeometry(0.16 * s, 16, 10, 0, TAU, 0, Math.PI * 0.55), mat(o.old ? '#d9d9d9' : '#2a1d17'), 0, 1.08 * s, -0.01); g.add(hair);
    if (o.hat === 'khan') g.add(mesh(new T.CylinderGeometry(0.17 * s, 0.17 * s, 0.09 * s, 16), mat('#d6302a'), 0, 1.2 * s, 0));
    if (o.hat === 'cap') { g.add(mesh(new T.BoxGeometry(0.42 * s, 0.03 * s, 0.42 * s), mat('#1d1d26'), 0, 1.25 * s, 0)); g.add(mesh(new T.CylinderGeometry(0.12 * s, 0.14 * s, 0.1 * s, 12), mat('#1d1d26'), 0, 1.2 * s, 0)); }
    if (o.hat === 'nonla') g.add(mesh(new T.ConeGeometry(0.32 * s, 0.18 * s, 20), mat('#e9d08a'), 0, 1.25 * s, 0));
    const armL = new T.Group(), armR = new T.Group(); armL.position.set(-0.19 * s, 0.86 * s, 0); armR.position.set(0.19 * s, 0.86 * s, 0);
    armL.add(mesh(new T.CapsuleGeometry(0.045 * s, 0.3 * s, 3, 6), mat(shirt), 0, -0.18 * s, 0)); armR.add(mesh(new T.CapsuleGeometry(0.045 * s, 0.3 * s, 3, 6), mat(shirt), 0, -0.18 * s, 0));
    g.add(armL, armR); g.userData.arms = [armL, armR];
    return g;
  }
  const wave = (f, t, ph) => { const [l, r] = f.userData.arms; r.rotation.z = 2.4 + Math.sin(t * 8 + (ph || 0)) * 0.5; l.rotation.z = -0.2; };
  const cheer = (f, t, ph) => { const [l, r] = f.userData.arms; l.rotation.z = -2.6 - Math.sin(t * 9 + (ph || 0)) * 0.3; r.rotation.z = 2.6 + Math.sin(t * 9 + (ph || 0)) * 0.3; };
  const hop = (f, t, ph, base) => { f.position.y = (base || 0) + Math.abs(Math.sin(t * 6 + (ph || 0))) * 0.25; };

  function carModel(color) {
    const g = new T.Group(), sh = new T.Shape();
    sh.moveTo(-1.1, 0.25); sh.lineTo(1.1, 0.25); sh.quadraticCurveTo(1.25, 0.3, 1.2, 0.6); sh.lineTo(0.55, 0.68); sh.lineTo(0.25, 1.05); sh.lineTo(-0.7, 1.05); sh.lineTo(-1.05, 0.68); sh.quadraticCurveTo(-1.2, 0.6, -1.1, 0.25);
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3 }); geo.translate(0, 0, -0.45);
    g.add(mesh(geo, mat(color, { metalness: 0.5, roughness: 0.25 })));
    for (const z of [-0.5, 0.5]) { const w = mesh(new T.BoxGeometry(1.0, 0.3, 0.02), mat('#1d2a38', { metalness: 0.6, roughness: 0.1 }), -0.2, 0.82, z); g.add(w); }
    for (const [x, z] of [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]]) { const w = mesh(new T.CylinderGeometry(0.24, 0.24, 0.18, 18), mat('#1f1c1c'), x, 0.24, z); w.rotation.x = Math.PI / 2; g.add(w); }
    return g;
  }
  function house(color) {
    const g = new T.Group(); g.add(mesh(new T.BoxGeometry(2.4, 1.6, 1.8), mat('#f4e2bd'), 0, 0.8, 0));
    const r = roof(2.6, 2.0, 0.9, color || '#9c3f2a'); r.position.y = 1.6; g.add(r);
    g.add(mesh(new T.BoxGeometry(0.55, 0.9, 0.05), mat('#6e4326'), 0, 0.45, 0.91));
    for (const x of [-0.75, 0.75]) g.add(mesh(new T.BoxGeometry(0.45, 0.4, 0.05), new T.MeshStandardMaterial({ color: '#ffe8a8', emissive: '#ffcc66', emissiveIntensity: 0.4 }), x, 0.95, 0.91));
    const bow = new T.Group(); bow.position.set(0, 1.35, 0.95); g.add(bow);
    bow.add(mesh(new T.BoxGeometry(2.5, 0.12, 0.04), mat('#d6302a'), 0, 0, 0)); bow.add(mesh(new T.TorusGeometry(0.18, 0.06, 8, 16), mat('#d6302a'), -0.18, 0.05, 0.02)); bow.add(mesh(new T.TorusGeometry(0.18, 0.06, 8, 16), mat('#d6302a'), 0.18, 0.05, 0.02));
    return g;
  }

  // ---------- events ----------
  // Each returns { actors: Group, title, sub, update(t), burst: [delay, kind] }
  const EVENTS = {
    marry(ctx) {
      const g = new T.Group(), groom = figure({ color: ctx.color, hat: 'khan' }), bride = figure({ color: '#d6302a', dress: true, hat: 'khan' });
      groom.position.set(-0.35, 0, 0); bride.position.set(0.35, 0, 0); g.add(groom, bride);
      const arch = mesh(new T.TorusGeometry(1.4, 0.08, 8, 30, Math.PI), mat('#e7bf5a', { metalness: 0.5 }), 0, 0, -0.5); g.add(arch);
      for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; g.add(mesh(new T.SphereGeometry(0.14, 8, 6), mat(i % 2 ? '#ff8fb0' : '#ffffff'), Math.cos(a) * 1.4, Math.sin(a) * 1.4, -0.5)); }
      const carpet = mesh(new T.BoxGeometry(1.2, 0.02, 4), mat('#b8322a'), 0, 0.01, 1.5); g.add(carpet);
      const hy = canvasTex(128, 128, (c) => { c.fillStyle = '#c0392b'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#ffd36b'; c.font = '700 100px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('囍', 64, 70); });
      g.add(mesh(new T.PlaneGeometry(0.7, 0.7), new T.MeshStandardMaterial({ map: hy, side: T.DoubleSide }), 0, 1.9, -0.55));
      const guests = ctx.others.slice(0, 4).map((o, i) => { const f = figure({ color: o.color }); f.position.set(i % 2 ? 1.6 : -1.6, 0, 1 + (i >> 1) * 0.9); g.add(f); return f; });
      return { actors: g, title: 'Trăm năm hạnh phúc', sub: ctx.name + ' kết hôn', petals: true, update(t) { groom.rotation.y = 0.3; bride.rotation.y = -0.3; const k = Math.min(1, t / 2); groom.position.x = -0.35 - (1 - k) * 0.0; groom.userData.arms[1].rotation.z = 0.6 * k; bride.userData.arms[0].rotation.z = -0.6 * k; guests.forEach((f, i) => cheer(f, t, i)); }, bursts: [[2.2, 'confetti', 120]] };
    },
    baby(ctx) {
      const g = new T.Group(), a = figure({ color: ctx.color }), b = figure({ color: '#f3e8d6', dress: true });
      a.position.set(-0.8, 0, 0); b.position.set(0.8, 0, 0); g.add(a, b);
      const crib = new T.Group(); g.add(crib); crib.add(mesh(new T.BoxGeometry(0.9, 0.35, 0.55), mat('#f6ead0'), 0, 0.45, 0));
      for (const x of [-0.4, 0.4]) crib.add(mesh(new T.CylinderGeometry(0.03, 0.03, 0.5, 6), mat('#c9a865'), x, 0.25, 0));
      const baby = new T.Group(); crib.add(baby); baby.add(mesh(new T.SphereGeometry(0.15, 14, 10), skin(), 0, 0.75, 0)); const swaddle = mesh(new T.CapsuleGeometry(0.11, 0.18, 4, 8), mat('#ffd36b'), 0, 0.62, 0.05); swaddle.rotation.x = 1.3; baby.add(swaddle);
      const balloons = []; ['#ff6fa0', '#7fc2ff', '#ffd36b', ctx.color, '#8fe0b2'].forEach((c, i) => { const bl = new T.Group(); bl.add(mesh(new T.SphereGeometry(0.25, 16, 12), mat(c, { roughness: 0.3 }), 0, 0, 0)); bl.add(mesh(new T.CylinderGeometry(0.005, 0.005, 1.2, 4), mat('#ffffff'), 0, -0.7, 0)); bl.position.set(-1 + i * 0.5, 1.3, -0.6); g.add(bl); balloons.push(bl); });
      return { actors: g, title: 'Chào thành viên mới', sub: ctx.name + ' có thêm một em bé', update(t) { a.rotation.y = 0.6; b.rotation.y = -0.6; baby.position.y = Math.sin(t * 3) * 0.03; balloons.forEach((bl, i) => { bl.position.y = 1.3 + Math.max(0, t - 1.2) * (0.6 + i * 0.1); bl.position.x += Math.sin(t * 2 + i) * 0.002; }); wave(a, t, 0); wave(b, t, 1); }, bursts: [[1.5, 'confetti', 50]] };
    },
    house(ctx) {
      const g = new T.Group(), h = house(); h.position.z = -1.2; g.add(h);
      const fam = [figure({ color: ctx.color })]; if (ctx.married) fam.push(figure({ color: '#f3e8d6', dress: true })); for (let i = 0; i < Math.min(ctx.kids, 3); i++) fam.push(figure({ color: ['#ffd36b', '#9fd6c3', '#ffb3c8'][i], scale: 0.62 }));
      fam.forEach((f, i) => { f.position.set(-0.9 + i * 0.6, 0, 0.9); g.add(f); });
      return { actors: g, title: 'Tân gia', sub: ctx.name + ' mua ' + (ctx.data && ctx.data.house ? ctx.data.house : 'nhà mới'), update(t) { fam.forEach((f, i) => { hop(f, t, i); cheer(f, t, i); }); }, bursts: [[1.6, 'confetti', 80]] };
    },
    car(ctx) {
      const g = new T.Group(), c = carModel(ctx.color); c.position.z = -0.2; g.add(c);
      const bow = new T.Group(); bow.position.set(-0.2, 1.15, -0.2); g.add(bow); bow.add(mesh(new T.TorusGeometry(0.22, 0.07, 8, 16), mat('#d6302a'), -0.2, 0.1, 0)); bow.add(mesh(new T.TorusGeometry(0.22, 0.07, 8, 16), mat('#d6302a'), 0.2, 0.1, 0));
      const me = figure({ color: ctx.color }); me.position.set(1.6, 0, 0.8); g.add(me);
      return { actors: g, title: ctx.data && ctx.data.vehicle === 'suv' ? 'Tậu xe sang' : 'Tậu ô tô mới', sub: ctx.name + ' lên đời', update(t) { c.position.x = Math.max(0, 3 - t * 2.2); me.rotation.y = -0.8; hop(me, t, 0); cheer(me, t); bow.position.x = c.position.x - 0.2; }, bursts: [[1.5, 'coin', 40]] };
    },
    grad(ctx) {
      const g = new T.Group(), people = [figure({ color: '#1d1d26', hat: 'cap' }), figure({ color: '#1d1d26', hat: 'cap', dress: true }), figure({ color: '#1d1d26', hat: 'cap' })];
      people.forEach((f, i) => { f.position.set(-0.9 + i * 0.9, 0, 0); g.add(f); });
      people[1].children[0].material = mat(ctx.color);
      const caps = people.map((f) => { const c = new T.Group(); c.add(mesh(new T.BoxGeometry(0.42, 0.03, 0.42), mat('#1d1d26'), 0, 0, 0)); c.position.set(f.position.x, 1.25, 0); g.add(c); return c; });
      return { actors: g, title: 'Lễ tốt nghiệp', sub: ctx.name + ' nhận bằng', update(t) { people.forEach((f, i) => cheer(f, t, i)); caps.forEach((c, i) => { const k = Math.max(0, t - 1.2 - i * 0.1); c.position.y = 1.25 + k * 5 - k * k * 2.2; c.rotation.y = k * 6; c.rotation.x = k * 2; }); }, bursts: [[1.3, 'confetti', 60]] };
    },
    startup(ctx) {
      const g = new T.Group(), me = figure({ color: ctx.color }); me.position.y = 0.6; g.add(me);
      g.add(mesh(new T.CylinderGeometry(0.7, 0.8, 0.6, 24), mat('#e7bf5a', { metalness: 0.6, roughness: 0.3 }), 0, 0.3, 0));
      const sign = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#1f2a44'; c.fillRect(0, 0, w, h); c.fillStyle = '#7fd6a4'; c.font = '800 56px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('▲ +300%', w / 2, h / 2); });
      g.add(mesh(new T.PlaneGeometry(2.2, 0.8), new T.MeshStandardMaterial({ map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.5 }), 0, 2.2, -1.2));
      return { actors: g, title: 'Khởi nghiệp thành công', sub: ctx.name + ' gọi vốn thành công', update(t) { cheer(me, t); hop(me, t, 0, 0.6); }, bursts: [[0.8, 'coin', 50], [2.0, 'coin', 50]] };
    },
    retire(ctx) {
      const g = new T.Group(), a = figure({ color: ctx.color, old: true }), b = figure({ color: '#f3e8d6', old: true, dress: !!ctx.married });
      const bench = mesh(new T.BoxGeometry(1.6, 0.08, 0.5), mat('#8a6a46'), 0, 0.45, 0); g.add(bench);
      for (const x of [-0.7, 0.7]) g.add(mesh(new T.BoxGeometry(0.08, 0.45, 0.45), mat('#6e4326'), x, 0.22, 0));
      a.position.set(-0.35, 0.05, 0); g.add(a); if (ctx.married) { b.position.set(0.35, 0.05, 0); g.add(b); }
      const tea = new T.Group(); tea.position.set(1.3, 0, 0.3); g.add(tea); tea.add(mesh(new T.CylinderGeometry(0.3, 0.3, 0.05, 16), mat('#6e4326'), 0, 0.5, 0)); tea.add(mesh(new T.SphereGeometry(0.1, 10, 8), mat('#f6ecdb'), 0, 0.6, 0));
      const kids = []; for (let i = 0; i < Math.min(ctx.kids, 3); i++) { const k = figure({ color: ['#ffd36b', '#9fd6c3', '#ffb3c8'][i], scale: 0.85 }); k.position.set(-1.8 + i * 0.6, 0, 1.2); g.add(k); kids.push(k); }
      return { actors: g, title: 'An hưởng tuổi già', sub: ctx.name + (ctx.data && ctx.data.style ? ' · ' + ctx.data.style : ' nghỉ hưu'), update(t) { a.rotation.y = 0.15; b.rotation.y = -0.15; wave(a, t, 0); kids.forEach((k, i) => { hop(k, t, i); wave(k, t, i); }); }, bursts: [[2.4, 'confetti', 40]] };
    },
    contest(ctx) {
      const g = new T.Group(), c = ctx.data, max = Math.max(...c.spins.map((s) => s.total)), cols = [];
      const n = c.spins.length;
      c.spins.forEach((s, k) => {
        const P = ctx.all[s.i], x = (k - (n - 1) / 2) * 1.2, win = c.result.winners.includes(s.i), hgt = 0.25 + (s.total / 12) * 1.8;
        const col = mesh(new T.BoxGeometry(0.9, 1, 0.9), mat(win ? '#e7bf5a' : '#cfc2a8', win ? { metalness: 0.5, roughness: 0.3 } : {}), x, 0, 0); col.scale.y = 0.01; g.add(col);
        const f = figure({ color: P.color }); f.position.set(x, 0, 0); g.add(f);
        const lbl = canvasTex(128, 64, (cx, w, h) => { cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#ffffff'; cx.font = '800 40px ' + FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(String(s.total), w / 2, h / 2 + 2); });
        const sp = new T.Sprite(new T.SpriteMaterial({ map: lbl, depthWrite: false })); sp.scale.set(0.8, 0.4, 1); g.add(sp);
        let crown = null; if (win) { crown = mesh(new T.CylinderGeometry(0.16, 0.12, 0.14, 5, 1, true), mat('#ffd36b', { metalness: 0.8, roughness: 0.2, side: T.DoubleSide }), 0, 0, 0); g.add(crown); }
        cols.push({ col, f, sp, hgt, win, crown });
      });
      return { actors: g, title: c.title, sub: c.result.winners.length ? c.result.winners.map((i) => ctx.all[i].name).join(' & ') + ' chiến thắng' : 'Hai bên hoà nhau', update(t) {
        cols.forEach((o, k) => { const e = Math.min(1, Math.max(0, (t - 0.3 - k * 0.15) / 1.2)), h = o.hgt * (1 - Math.pow(1 - e, 3)); o.col.scale.y = Math.max(0.01, h); o.col.position.y = h / 2; o.f.position.y = h; o.sp.position.set(o.col.position.x, h + 1.55, 0); if (o.crown) o.crown.position.set(o.col.position.x, h + 1.35, 0); if (o.win && e >= 1) { cheer(o.f, t, k); hop(o.f, t, k, h); } });
      }, bursts: [[1.9, 'confetti', 90]] };
    },
  };

  // ---------- player ----------
  let renderer = null, overlay = null, cv = null, titleEl = null, subEl = null, placeEl = null, playing = null, lastPlace = null;
  function ensure() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.className = 'cut'; overlay.hidden = true;
    overlay.innerHTML = '<canvas></canvas><div class="cut-cap"><div class="cut-place"></div><div class="cut-title"></div><div class="cut-sub"></div></div><button class="cut-skip" type="button">Bỏ qua ›</button>';
    document.body.appendChild(overlay);
    cv = overlay.querySelector('canvas'); titleEl = overlay.querySelector('.cut-title'); subEl = overlay.querySelector('.cut-sub'); placeEl = overlay.querySelector('.cut-place');
    overlay.querySelector('.cut-skip').onclick = (e) => { e.stopPropagation(); if (playing) playing.stop(); };
    overlay.addEventListener('click', () => { if (playing && playing.t > 1.2) playing.stop(); });
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  }
  function skyTex(top, bottom) { return canvasTex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }); }
  function dispose(o) { o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) [].concat(m.material).forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); }); }); }

  function play(opts) {
    if (!EVENTS[opts.event]) return Promise.resolve();
    if (opts.skip) return Promise.resolve({ event: opts.event, place: null, skipped: true });
    ensure();
    rnd = opts.random || Math.random;
    const places = PLACES.filter((p) => p.key !== lastPlace), place = opts.place ? PLACES.find((p) => p.key === opts.place) : pickOne(places);
    lastPlace = place.key;
    const scene = new T.Scene(); scene.background = skyTex(place.sky[0], place.sky[1]);
    scene.fog = new T.Fog(new T.Color(place.sky[1]), place.fog ? 14 : 30, place.fog ? 45 : 90);
    scene.add(new T.HemisphereLight(new T.Color(place.sky[0]).lerp(new T.Color('#ffffff'), 0.6), new T.Color('#6b5a3a'), place.night ? 0.55 : 0.8));
    const sun = new T.DirectionalLight(place.sun[0], place.sun[1]); const el = place.sun[2];
    sun.position.set(10, 4 + el * 24, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); sun.shadow.bias = -0.0005; scene.add(sun);
    const set = new T.Group(); scene.add(set); place.build(set);
    const me = opts.players[opts.who];
    const ctx = { name: me.name, color: me.color, married: me.married, kids: me.kids || 0, others: opts.players.filter((p, i) => i !== opts.who), all: opts.players, data: opts.data || {} };
    const ev = EVENTS[opts.event](ctx); scene.add(ev.actors);
    // petals / confetti pool
    const parts = [], confGeo = new T.PlaneGeometry(0.14, 0.09), coinGeo = new T.CylinderGeometry(0.12, 0.12, 0.03, 14);
    const cm = ['#e2483d', '#e7b93c', '#3fa7a0', '#8c7ae6', '#f6ecdb', '#ff8fb0'].map((c) => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })), coinM = mat('#f2c443', { metalness: 0.9, roughness: 0.2 });
    function burst(kind, n) { for (let i = 0; i < n; i++) { const m = new T.Mesh(kind === 'coin' ? coinGeo : confGeo, kind === 'coin' ? coinM : cm[i % cm.length]); m.position.set((Math.random() - 0.5) * 1.5, 1.8, (Math.random() - 0.5) * 1.5); scene.add(m); const a = Math.random() * TAU, sp = 1 + Math.random() * 3; parts.push({ m, v: new T.Vector3(Math.cos(a) * sp, 3 + Math.random() * 4, Math.sin(a) * sp), r: Math.random() * 8 }); } }
    if (ev.petals) for (let i = 0; i < 70; i++) { const m = new T.Mesh(confGeo, cm[5]); m.position.set((Math.random() - 0.5) * 8, 2 + Math.random() * 4, (Math.random() - 0.5) * 6); scene.add(m); parts.push({ m, v: new T.Vector3(0, -0.6, 0), r: 2, petal: true }); }

    titleEl.textContent = ev.title; subEl.textContent = ev.sub; placeEl.textContent = place.name + ' · ' + place.area;
    overlay.hidden = false; overlay.classList.remove('out'); void overlay.offsetWidth; overlay.classList.add('in');
    const camera = new T.PerspectiveCamera(42, 1, 0.1, 200);
    const resize = () => { const w = overlay.clientWidth, h = overlay.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    resize(); window.addEventListener('resize', resize);
    const dur = opts.reduced ? 2.2 : opts.duration || 5.2, a0 = -0.5 + Math.random() * 0.3;
    const pendingBursts = (ev.bursts || []).slice();
    return new Promise((res) => {
      let last = performance.now();
      const state = { t: 0, stop: () => { state.done = true; } };
      playing = state;
      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now; state.t += dt; const t = state.t;
        const k = Math.min(1, t / dur), e = k * k * (3 - 2 * k);
        const ang = a0 + e * 0.9, R = 9.5 - e * 3.2, H = 3.6 - e * 1.2;
        camera.position.set(Math.sin(ang) * R, H, Math.cos(ang) * R); camera.lookAt(0, 1.0, 0);
        ev.update(t);
        if (set.userData.boat) set.userData.boat.position.x = 5 - t * 0.4;
        while (pendingBursts.length && t >= pendingBursts[0][0]) { const [, kind, n] = pendingBursts.shift(); burst(kind, opts.reduced ? Math.min(n, 15) : n); }
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; if (p.petal) { p.m.position.y -= dt * 0.6; p.m.position.x += Math.sin(t * 2 + i) * dt * 0.3; if (p.m.position.y < 0) p.m.position.y = 5; } else { p.v.y -= 7 * dt; p.v.multiplyScalar(1 - dt * 0.8); p.m.position.addScaledVector(p.v, dt); if (p.m.position.y < 0.02) { p.m.position.y = 0.02; p.v.set(0, 0, 0); } } p.m.rotation.x += p.r * dt; p.m.rotation.y += p.r * dt * 0.7; }
        renderer.render(scene, camera);
        if (t >= dur || state.done) {
          overlay.classList.remove('in'); overlay.classList.add('out');
          setTimeout(() => { overlay.hidden = true; window.removeEventListener('resize', resize); dispose(scene); playing = null; res({ event: opts.event, place: place.key, skipped: !!state.done }); }, 350);
          return;
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  window.DDCutscene = { play, PLACES: PLACES.map((p) => ({ key: p.key, name: p.name, area: p.area })), EVENTS: Object.keys(EVENTS), get playing() { return !!playing; } };
})();
