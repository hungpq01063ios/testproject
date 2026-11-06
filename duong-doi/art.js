/* Đường Đời — shared low-poly art: textures, detailed people, the four house types and vehicles.
 * window.DDArt. Used by the board (world.js) and the vignettes (cutscene.js). Front faces +z. */
(function () {
  'use strict';
  const T = window.THREE;
  const TAU = Math.PI * 2;
  const cache = {};
  function mat(color, o) { const k = color + JSON.stringify(o || {}); if (!cache[k]) { cache[k] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.7 }, o || {})); cache[k].userData.shared = true; } return cache[k]; }
  function mesh(geo, m, x, y, z) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; return o; }
  function canvasTex(w, h, draw, shared) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; if (shared) t.userData.shared = true; return t; }
  const shade = (hex, k) => new T.Color(hex).multiplyScalar(k).getStyle();

  // ---------- textures ----------
  function roofTex(color) {
    const k = 'roof' + color; if (cache[k]) return cache[k];
    const t = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = shade(color, 0.75); g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < w; x += 16) {
        const gr = g.createLinearGradient(x, y, x + 16, y); gr.addColorStop(0, shade(color, 0.85)); gr.addColorStop(0.5, shade(color, 1.12)); gr.addColorStop(1, shade(color, 0.8));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, y + 16); g.quadraticCurveTo(x + 8, y - 2, x + 16, y + 16); g.fill();
      }
    }, true);
    t.wrapS = t.wrapT = T.RepeatWrapping; return (cache[k] = t);
  }
  // Plaster wall with a grid of windows (shutters optional) and an optional door on the ground row.
  function wallTex(color, o) {
    o = Object.assign({ cols: 3, rows: 1, shutter: null, door: false, glass: '#3b4f63', frame: '#f6f1e6', lit: 0 }, o || {});
    const k = 'wall' + color + JSON.stringify(o); if (cache[k]) return cache[k];
    const t = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.05)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h - 10, w, 10);
      const cw = w / o.cols, rh = h / o.rows;
      for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
        const x = c * cw, y = r * rh, isDoor = o.door && r === o.rows - 1 && c === Math.floor(o.cols / 2);
        const ww = cw * (isDoor ? 0.5 : 0.42), wh = rh * (isDoor ? 0.72 : 0.46), wx = x + (cw - ww) / 2, wy = isDoor ? y + rh - wh - 10 : y + rh * 0.24;
        g.fillStyle = o.frame; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
        g.fillStyle = isDoor ? '#6e4326' : (Math.random() < o.lit ? '#ffe2a0' : o.glass); g.fillRect(wx, wy, ww, wh);
        if (!isDoor) { g.fillStyle = o.frame; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh / 2 - 1.5, ww, 3); }
        if (o.shutter && !isDoor) { g.fillStyle = o.shutter; g.fillRect(wx - ww * 0.42 - 4, wy - 2, ww * 0.38, wh + 4); g.fillRect(wx + ww + 8, wy - 2, ww * 0.38, wh + 4); g.fillStyle = 'rgba(0,0,0,.18)'; for (let s = 0; s < wh; s += 6) { g.fillRect(wx - ww * 0.42 - 4, wy + s, ww * 0.38, 1.5); g.fillRect(wx + ww + 8, wy + s, ww * 0.38, 1.5); } }
        if (isDoor) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx + ww / 2 - 1, wy, 2, wh); }
      }
    }, true);
    return (cache[k] = t);
  }
  function boxWalls(w, h, d, tex, side) { // textured front/back, plain or textured sides
    const plain = mat(side || '#efe4cc'), f = new T.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    return mesh(new T.BoxGeometry(w, h, d), [plain, plain, plain, plain, f, f]);
  }
  // Hip roof with upturned corners and tile texture.
  function roofVN(w, d, h, color, curl) {
    curl = curl == null ? 0.2 : curl;
    const r = Math.max(0.02, (w - d) / 2 * 0.9), W = w / 2 + 0.12, D = d / 2 + 0.12;
    const pts = [[-W, curl, -D], [0, 0, -D], [W, curl, -D], [W, 0, 0], [W, curl, D], [0, 0, D], [-W, curl, D], [-W, 0, 0], [-r, h, 0], [r, h, 0]];
    const idx = [0, 1, 8, 1, 9, 8, 1, 2, 9, 2, 3, 9, 3, 4, 9, 4, 5, 9, 5, 8, 9, 5, 6, 8, 6, 7, 8, 7, 0, 8];
    const pos = [], uv = [];
    idx.forEach((i) => { const p = pts[i]; pos.push(...p); uv.push((p[0] + W) * 1.6, (p[2] + D) * 1.6 + p[1] * 1.6); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const grp = new T.Group(); grp.add(mesh(g, new T.MeshStandardMaterial({ map: roofTex(color), side: T.DoubleSide, roughness: 0.75 })));
    const ridge = mesh(new T.CylinderGeometry(0.04, 0.04, 2 * r + 0.2, 8), mat(shade(color, 0.6)), 0, h + 0.02, 0); ridge.rotation.z = Math.PI / 2; grp.add(ridge);
    for (const [x, z] of [[-W, -D], [W, -D], [W, D], [-W, D]]) { const tip = mesh(new T.ConeGeometry(0.04, 0.24, 6), mat(shade(color, 0.7)), x * 1.03, curl + 0.08, z * 1.03); tip.rotation.z = -Math.sign(x) * 0.6; tip.rotation.x = Math.sign(z) * 0.6; grp.add(tip); }
    return grp;
  }
  function gable(w, h, d, color) {
    const s = new T.Shape(); s.moveTo(-d / 2, 0); s.lineTo(0, h); s.lineTo(d / 2, 0); s.lineTo(-d / 2, 0);
    const g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
    const t = roofTex(color).clone(); t.needsUpdate = true; t.repeat.set(0.9, 0.9); t.userData = { shared: false };
    return mesh(g, new T.MeshStandardMaterial({ map: t, roughness: 0.75 }));
  }
  function railing(w, color, posts) { // balcony rail along x
    const g = new T.Group(); g.add(mesh(new T.BoxGeometry(w, 0.04, 0.04), mat(color || '#2b2b2b'), 0, 0.32, 0));
    const n = posts || Math.max(3, Math.round(w / 0.18)); for (let i = 0; i <= n; i++) g.add(mesh(new T.BoxGeometry(0.02, 0.32, 0.02), mat(color || '#2b2b2b'), -w / 2 + (i / n) * w, 0.16, 0));
    return g;
  }
  function pot(x, y, z, s) { const g = new T.Group(); g.add(mesh(new T.CylinderGeometry(0.1 * s, 0.08 * s, 0.14 * s, 10), mat('#a0522d'), 0, 0.07 * s, 0)); g.add(mesh(new T.IcosahedronGeometry(0.13 * s, 1), mat('#4f9a35', { flatShading: true }), 0, 0.22 * s, 0)); g.position.set(x, y, z); return g; }

  // ---------- trees ----------
  function tree(kind, s) {
    const g = new T.Group(); s = s || 1;
    if (kind === 'palm' || kind === 'areca') {
      const tall = kind === 'areca' ? 2.6 : 2.2, pts = []; for (let i = 0; i <= 6; i++) pts.push(new T.Vector3(kind === 'areca' ? 0 : Math.sin(i / 6 * 1.2) * 0.4, i / 6 * tall, 0));
      g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, kind === 'areca' ? 0.05 : 0.08, 6), mat(kind === 'areca' ? '#9a8f7a' : '#8a6a46')));
      const leaf = new T.PlaneGeometry(1.1, 0.24, 4, 1), lp = leaf.attributes.position;
      for (let i = 0; i < lp.count; i++) { const lx = lp.getX(i) + 0.55; lp.setX(i, lx); lp.setY(i, lp.getY(i) * (1 - lx / 1.2)); lp.setZ(i, -lx * lx * 0.4); } leaf.computeVertexNormals();
      const crown = new T.Group(); crown.position.copy(pts[6]); g.add(crown);
      for (let i = 0; i < 8; i++) { const lf = mesh(leaf, mat('#3f8a3a', { side: T.DoubleSide })); lf.rotation.set(-0.45, (i / 8) * TAU, 0, 'YXZ'); crown.add(lf); }
      if (kind === 'palm') for (let i = 0; i < 3; i++) crown.add(mesh(new T.SphereGeometry(0.09, 8, 6), mat('#6b8a2a'), Math.cos(i * 2.1) * 0.1, -0.1, Math.sin(i * 2.1) * 0.1));
      g.userData.crown = crown;
    } else if (kind === 'pine') {
      g.add(mesh(new T.CylinderGeometry(0.06, 0.09, 0.5, 6), mat('#5a3d27'), 0, 0.25, 0));
      [[0.55, 0.8, 0.65], [0.44, 0.7, 1.05], [0.3, 0.6, 1.42]].forEach(([r, h, y]) => g.add(mesh(new T.ConeGeometry(r, h, 8), mat('#2f6b3a', { flatShading: true }), 0, y, 0)));
    } else if (kind === 'banana') {
      g.add(mesh(new T.CylinderGeometry(0.06, 0.08, 1.0, 6), mat('#8aa04a'), 0, 0.5, 0));
      for (let i = 0; i < 6; i++) { const l = mesh(new T.PlaneGeometry(0.9, 0.3), mat('#5fae3a', { side: T.DoubleSide }), 0, 1.0, 0); l.rotation.set(-0.7, (i / 6) * TAU, 0, 'YXZ'); l.translateX(0.4); g.add(l); }
    } else {
      const col = kind === 'flame' ? '#e0482f' : kind === 'blossom' ? '#f4a6c1' : '#4f9a35';
      g.add(mesh(new T.CylinderGeometry(0.07, 0.1, 0.8, 6), mat('#6b4a2f'), 0, 0.4, 0));
      [[0, 1.1, 0, 0.55], [0.32, 0.95, 0.1, 0.38], [-0.3, 0.98, -0.12, 0.4], [0.05, 1.42, -0.05, 0.36]].forEach(([x, y, z, r]) => g.add(mesh(new T.IcosahedronGeometry(r, 1), mat(col, { flatShading: true }), x, y, z)));
    }
    g.scale.setScalar(s); return g;
  }

  // ---------- people ----------
  const SKIN = ['#f1c9a0', '#e8b98f', '#d9a77a'];
  function figure(o) {
    o = o || {};
    const g = new T.Group(), s = o.scale || 1, shirt = o.color || '#c0392b', skin = mat(o.skin || SKIN[0]);
    const pantsC = o.dress ? '#ffffff' : (o.pants || '#2b2b33');
    const legs = [];
    for (const x of [-0.07, 0.07]) { const leg = new T.Group(); leg.position.set(x * s, 0.42 * s, 0); leg.add(mesh(new T.CapsuleGeometry(0.06 * s, 0.26 * s, 4, 8), mat(pantsC), 0, -0.2 * s, 0)); leg.add(mesh(new T.BoxGeometry(0.1 * s, 0.06 * s, 0.17 * s), mat('#3a2a22'), 0, -0.38 * s, 0.03 * s)); g.add(leg); legs.push(leg); }
    if (o.dress) { // áo dài: fitted top, long front and back panels
      g.add(mesh(new T.CapsuleGeometry(0.13 * s, 0.24 * s, 4, 10), mat(shirt), 0, 0.68 * s, 0));
      for (const z of [0.06, -0.06]) { const pnl = mesh(new T.BoxGeometry(0.24 * s, 0.5 * s, 0.02 * s), mat(shirt), 0, 0.32 * s, z * s); pnl.rotation.x = z > 0 ? 0.08 : -0.08; g.add(pnl); }
    } else {
      g.add(mesh(new T.CapsuleGeometry(0.15 * s, 0.24 * s, 4, 10), mat(shirt), 0, 0.7 * s, 0));
      g.add(mesh(new T.CylinderGeometry(0.155 * s, 0.155 * s, 0.05 * s, 12), mat(pantsC), 0, 0.5 * s, 0)); // belt line
    }
    g.add(mesh(new T.CylinderGeometry(0.05 * s, 0.05 * s, 0.08 * s, 8), skin, 0, 0.92 * s, 0));
    const head = new T.Group(); head.position.y = 1.06 * s; g.add(head);
    head.add(mesh(new T.SphereGeometry(0.16 * s, 18, 14), skin, 0, 0, 0));
    const eyeM = mat('#1a1410', { roughness: 0.3 });
    for (const x of [-0.055, 0.055]) { head.add(mesh(new T.SphereGeometry(0.022 * s, 8, 6), eyeM, x * s, 0.015 * s, 0.145 * s)); head.add(mesh(new T.SphereGeometry(0.028 * s, 8, 6), mat('#f2a39a'), x * 1.5 * s, -0.045 * s, 0.125 * s)); }
    head.add(mesh(new T.BoxGeometry(0.05 * s, 0.012 * s, 0.01 * s), mat('#8a3a2a'), 0, -0.065 * s, 0.155 * s));
    const hairC = o.old ? '#d9d9d9' : (o.hairColor || '#2a1d17'), hm = mat(hairC);
    const style = o.hair || (o.dress ? 'bun' : 'short');
    head.add(mesh(new T.SphereGeometry(0.168 * s, 18, 12, 0, TAU, 0, Math.PI * 0.52), hm, 0, 0.02 * s, -0.012 * s));
    if (style === 'bun') head.add(mesh(new T.SphereGeometry(0.07 * s, 10, 8), hm, 0, 0.06 * s, -0.16 * s));
    if (style === 'long') head.add(mesh(new T.CapsuleGeometry(0.11 * s, 0.22 * s, 4, 8), hm, 0, -0.14 * s, -0.08 * s));
    if (o.hat === 'khan') head.add(mesh(new T.CylinderGeometry(0.175 * s, 0.17 * s, 0.1 * s, 18), mat(o.hatColor || '#d6302a'), 0, 0.13 * s, 0));
    if (o.hat === 'cap') { head.add(mesh(new T.BoxGeometry(0.44 * s, 0.03 * s, 0.44 * s), mat('#1d1d26'), 0, 0.2 * s, 0)); head.add(mesh(new T.CylinderGeometry(0.13 * s, 0.15 * s, 0.1 * s, 12), mat('#1d1d26'), 0, 0.14 * s, 0)); head.add(mesh(new T.SphereGeometry(0.03 * s, 6, 4), mat('#ffd36b'), 0.18 * s, 0.17 * s, 0.18 * s)); }
    if (o.hat === 'nonla') head.add(mesh(new T.ConeGeometry(0.34 * s, 0.2 * s, 22), mat('#e9d08a'), 0, 0.16 * s, 0));
    const arms = [];
    for (const side of [-1, 1]) { const a = new T.Group(); a.position.set(side * 0.2 * s, 0.84 * s, 0); a.add(mesh(new T.CapsuleGeometry(0.045 * s, 0.28 * s, 3, 6), mat(shirt), 0, -0.17 * s, 0)); a.add(mesh(new T.SphereGeometry(0.05 * s, 8, 6), skin, 0, -0.36 * s, 0)); g.add(a); arms.push(a); }
    g.userData = { arms, legs, head };
    return g;
  }
  const pose = {
    wave(f, t, ph) { const [l, r] = f.userData.arms; r.rotation.z = 2.5 + Math.sin(t * 8 + (ph || 0)) * 0.45; l.rotation.z = -0.15; },
    cheer(f, t, ph) { const [l, r] = f.userData.arms; l.rotation.z = -2.6 - Math.sin(t * 9 + (ph || 0)) * 0.3; r.rotation.z = 2.6 + Math.sin(t * 9 + (ph || 0)) * 0.3; },
    hop(f, t, ph, base) { f.position.y = (base || 0) + Math.abs(Math.sin(t * 6 + (ph || 0))) * 0.22; },
    walk(f, t, ph) { const k = Math.sin(t * 7 + (ph || 0)) * 0.5; f.userData.legs[0].rotation.x = k; f.userData.legs[1].rotation.x = -k; f.userData.arms[0].rotation.x = -k * 0.8; f.userData.arms[1].rotation.x = k * 0.8; },
    sit(f) { f.userData.legs.forEach((l) => (l.rotation.x = -1.45)); },
  };

  // ---------- houses ----------
  const HOUSE_KEYS = { 'Nhà vườn ở quê': 'garden', 'Căn hộ chung cư': 'apartment', 'Nhà phố 4 tầng': 'townhouse', 'Biệt thự ven sông': 'villa' };
  function house(key, accent) {
    const g = new T.Group(); accent = accent || '#c0392b';
    if (key === 'garden') { // one storey, tiled hip roof, verandah, brick yard, well, areca and banana
      const body = boxWalls(3.2, 1.2, 1.9, wallTex('#e9c98e', { cols: 4, shutter: '#4f7f5a', door: true }), '#e2c189'); body.position.set(0, 0.7, -0.4); g.add(body);
      g.add(mesh(new T.BoxGeometry(3.6, 0.1, 2.9), mat('#b55a3a'), 0, 0.05, 0));
      for (const x of [-1.5, -0.5, 0.5, 1.5]) g.add(mesh(new T.CylinderGeometry(0.05, 0.06, 1.2, 8), mat('#6e4326'), x, 0.7, 0.75));
      const r = roofVN(3.6, 2.9, 0.95, '#a3432a'); r.position.set(0, 1.3, -0.05); g.add(r);
      const yard = mesh(new T.BoxGeometry(4.6, 0.04, 2.2), mat('#c77a52'), 0, 0.02, 2.4); g.add(yard);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.add(mesh(new T.BoxGeometry(0.5, 0.045, 0.5), mat('#b56a44'), -2 + i * 0.57, 0.03, 1.55 + j * 0.57));
      for (const x of [-2.6, 2.6]) { const f = mesh(new T.BoxGeometry(0.15, 0.5, 5.2), mat('#c9b48e'), x, 0.25, 1.2); g.add(f); }
      for (const x of [-1.7, 1.7]) g.add(mesh(new T.BoxGeometry(1.8, 0.5, 0.15), mat('#c9b48e'), x * 1.25 - Math.sign(x) * 0.3, 0.25, 3.65));
      const well = new T.Group(); well.position.set(2.0, 0, 2.6); g.add(well); well.add(mesh(new T.CylinderGeometry(0.3, 0.3, 0.45, 14, 1, true), mat('#9a8f7a', { side: T.DoubleSide }), 0, 0.22, 0)); const wt = mesh(new T.CircleGeometry(0.28, 14), mat('#2f6f8f'), 0, 0.3, 0); wt.rotation.x = -Math.PI / 2; well.add(wt);
      const ar = tree('areca', 0.85); ar.position.set(-2.1, 0, 2.9); g.add(ar); const ba = tree('banana', 0.9); ba.position.set(2.2, 0, -1.2); g.add(ba);
      const hay = mesh(new T.ConeGeometry(0.45, 0.9, 12), mat('#d9b85a'), -2.0, 0.45, -1.3); g.add(hay);
      for (let i = 0; i < 4; i++) g.add(pot(-1.3 + i * 0.85, 0.1, 1.05, 0.9));
      g.userData.size = 4.2;
    } else if (key === 'apartment') { // mid-rise block with balconies and AC units; your unit glows
      const floors = 8, H = floors * 0.62;
      const body = boxWalls(3.0, H, 1.6, wallTex('#e7e2d6', { cols: 4, rows: floors, glass: '#4b6378', lit: 0.25 }), '#dcd6c8'); body.position.y = H / 2; g.add(body);
      for (let f = 1; f < floors; f++) for (let c = 0; c < 4; c++) {
        const x = -1.125 + c * 0.75, y = f * 0.62;
        g.add(mesh(new T.BoxGeometry(0.62, 0.05, 0.26), mat('#cfc8b8'), x, y, 0.92));
        const rl = railing(0.6, '#4a4a4a', 5); rl.position.set(x, y, 1.04); rl.scale.y = 0.8; g.add(rl);
        if ((f + c) % 3 === 0) g.add(mesh(new T.BoxGeometry(0.2, 0.14, 0.12), mat('#f3f3f0'), x + 0.22, y + 0.1, 0.96));
      }
      const mine = mesh(new T.BoxGeometry(0.66, 0.5, 0.05), new T.MeshStandardMaterial({ color: '#ffe2a0', emissive: accent, emissiveIntensity: 0.5 }), 0.375, 4 * 0.62 + 0.3, 0.81); g.add(mine);
      const flag = mesh(new T.PlaneGeometry(0.3, 0.2), mat(accent, { side: T.DoubleSide }), 0.6, 4 * 0.62 + 0.62, 1.1); g.add(flag);
      g.add(mesh(new T.BoxGeometry(3.1, 0.12, 1.7), mat('#bdb6a6'), 0, H + 0.06, 0));
      g.add(mesh(new T.BoxGeometry(3.3, 0.06, 0.5), mat(accent), 0, 0.62, 1.05)); // shop awning
      for (const x of [-1.8, 1.8]) { const t2 = tree('round', 0.8); t2.position.set(x, 0, 1.4); g.add(t2); }
      g.userData.size = 3.6;
    } else if (key === 'townhouse') { // narrow 4-storey tube house, balconies, plants, steel water tank, antenna
      const W = 1.35, D = 2.6, fh = 0.75, H = 4 * fh;
      const body = boxWalls(W, H, D, wallTex(accent === '#c0392b' ? '#f2c94c' : new T.Color(accent).lerp(new T.Color('#ffffff'), 0.55).getStyle(), { cols: 1, rows: 4, door: true, glass: '#3b4f63' }), '#e9e1cf'); body.position.y = H / 2; g.add(body);
      for (let f = 1; f < 4; f++) { const y = f * fh; g.add(mesh(new T.BoxGeometry(W + 0.05, 0.06, 0.4), mat('#e9e1cf'), 0, y, D / 2 + 0.18)); const rl = railing(W, '#2b2b2b', 8); rl.position.set(0, y, D / 2 + 0.36); g.add(rl); g.add(pot(-0.45, y + 0.03, D / 2 + 0.25, 0.8)); g.add(pot(0.45, y + 0.03, D / 2 + 0.25, 0.8)); }
      g.add(mesh(new T.BoxGeometry(W * 0.8, fh * 0.7, 0.03), mat('#8a9096', { metalness: 0.5 }), 0, fh * 0.36, D / 2 + 0.02)); // roll-up shutter
      g.add(mesh(new T.BoxGeometry(W + 0.1, 0.1, D + 0.1), mat('#cfc8b8'), 0, H + 0.05, 0));
      const rl = railing(W, '#2b2b2b', 8); rl.position.set(0, H + 0.1, D / 2); g.add(rl);
      const tank = mesh(new T.CylinderGeometry(0.22, 0.22, 0.6, 16), mat('#d9dde0', { metalness: 0.9, roughness: 0.2 }), 0.25, H + 0.45, -0.6); tank.rotation.z = Math.PI / 2; g.add(tank);
      g.add(mesh(new T.CylinderGeometry(0.015, 0.015, 0.8, 4), mat('#7a7a7a'), -0.4, H + 0.5, -0.8)); g.add(mesh(new T.BoxGeometry(0.5, 0.02, 0.02), mat('#7a7a7a'), -0.4, H + 0.75, -0.8));
      const r = gable(W + 0.1, 0.35, 1.0, '#9c3f2a'); r.position.set(0, H + 0.1, -0.7); g.add(r);
      g.add(mesh(new T.PlaneGeometry(0.8, 0.22), new T.MeshStandardMaterial({ map: canvasTex(128, 32, (c) => { c.fillStyle = accent; c.fillRect(0, 0, 128, 32); c.fillStyle = '#fff'; c.font = '700 20px sans-serif'; c.textAlign = 'center'; c.fillText('SỐ 18', 64, 23); }) }), 0, fh + 0.05, D / 2 + 0.03));
      g.userData.size = 2.6;
    } else { // villa: two storeys, columns, hipped slate roof, pool, lawn, palms
      const body = boxWalls(4.4, 1.0, 2.4, wallTex('#f6f2ea', { cols: 5, glass: '#5a7e9c', frame: '#ffffff' }), '#efe9df'); body.position.set(0, 0.6, -0.6); g.add(body);
      const up = boxWalls(3.4, 0.9, 2.0, wallTex('#f6f2ea', { cols: 4, glass: '#5a7e9c', frame: '#ffffff', lit: 0.3 }), '#efe9df'); up.position.set(0, 1.55, -0.7); g.add(up);
      g.add(mesh(new T.BoxGeometry(4.8, 0.1, 3.2), mat('#e9e3d6'), 0, 1.1, -0.45));
      const rl = railing(4.6, '#ffffff', 22); rl.position.set(0, 1.15, 1.1); g.add(rl);
      for (let i = 0; i < 6; i++) g.add(mesh(new T.CylinderGeometry(0.08, 0.09, 1.0, 12), mat('#ffffff'), -2.0 + i * 0.8, 0.6, 1.0));
      const r = roofVN(3.8, 2.4, 0.9, '#4a5a6e', 0.08); r.position.set(0, 2.0, -0.7); g.add(r);
      g.add(mesh(new T.BoxGeometry(5.4, 0.12, 2.2), mat('#e9e3d6'), 0, 0.06, 2.0));
      const pool = mesh(new T.BoxGeometry(2.4, 0.06, 1.2), new T.MeshStandardMaterial({ color: '#3fb6d9', roughness: 0.08, metalness: 0.2 }), 0.8, 0.14, 2.0); pool.castShadow = false; g.add(pool);
      const lawn = mesh(new T.BoxGeometry(6.2, 0.04, 6.0), mat('#6fae45'), 0, 0.01, 0.6); lawn.castShadow = false; g.add(lawn);
      for (const [x, z] of [[-2.6, 2.6], [2.7, 2.7], [-2.9, -1.8]]) { const p = tree('palm', 0.9); p.position.set(x, 0, z); g.add(p); }
      for (let i = 0; i < 7; i++) g.add(mesh(new T.IcosahedronGeometry(0.22, 1), mat(i % 2 ? '#4f9a35' : '#ff8fb0', { flatShading: true }), -2.8 + i * 0.4, 0.18, 3.3));
      const umb = new T.Group(); umb.position.set(-1.2, 0, 2.2); g.add(umb); umb.add(mesh(new T.CylinderGeometry(0.02, 0.02, 1.0, 6), mat('#ffffff'), 0, 0.5, 0)); umb.add(mesh(new T.ConeGeometry(0.55, 0.22, 10), mat(accent), 0, 1.0, 0));
      g.userData.size = 6;
    }
    return g;
  }

  // ---------- vehicles (scene props, no riders) ----------
  function vehicle(key, color) {
    const g = new T.Group(), dark = mat('#1f1c1c'), chrome = mat('#dfe3e6', { metalness: 0.9, roughness: 0.2 });
    const wheel = (x, z, r, w) => { const m = mesh(new T.CylinderGeometry(r, r, w, 18), dark, x, r, z); m.rotation.x = Math.PI / 2; g.add(m); const c = mesh(new T.CylinderGeometry(r * 0.5, r * 0.5, w + 0.01, 10), chrome, x, r, z); c.rotation.x = Math.PI / 2; g.add(c); };
    if (key === 'car' || key === 'suv') {
      const lux = key === 'suv', L = lux ? 1.15 : 1.0, sh = new T.Shape(), c = lux ? shade(color, 0.55) : color;
      sh.moveTo(-L, 0.2); sh.lineTo(L, 0.2); sh.quadraticCurveTo(L + 0.15, 0.25, L + 0.08, 0.55); sh.lineTo(L * 0.35, 0.6); sh.lineTo(L * 0.05, lux ? 1.05 : 0.92); sh.lineTo(-L * 0.75, lux ? 1.05 : 0.92); sh.lineTo(-L * 0.95, 0.6); sh.quadraticCurveTo(-L - 0.1, 0.55, -L, 0.2);
      const geo = new T.ExtrudeGeometry(sh, { depth: lux ? 0.95 : 0.85, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 }); geo.translate(0, 0, -(lux ? 0.475 : 0.425));
      g.add(mesh(geo, mat(c, { metalness: 0.55, roughness: 0.25 })));
      for (const z of [-0.5, 0.5]) g.add(mesh(new T.BoxGeometry(L * 0.75, 0.26, 0.02), mat('#1d2a38', { metalness: 0.6, roughness: 0.1 }), -L * 0.3, lux ? 0.86 : 0.77, z * (lux ? 1.04 : 0.95)));
      for (const [x, z] of [[-L * 0.62, -0.46], [L * 0.62, -0.46], [-L * 0.62, 0.46], [L * 0.62, 0.46]]) wheel(x, z * (lux ? 1.05 : 1), lux ? 0.26 : 0.22, 0.16);
      for (const z of [-0.28, 0.28]) g.add(mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshStandardMaterial({ color: '#fff6cf', emissive: '#ffe59a', emissiveIntensity: 1 }), L + 0.1, 0.45, z));
    } else if (key === 'bus') {
      const side = new T.MeshStandardMaterial({ map: canvasTex(256, 64, (x) => { x.fillStyle = '#f2ead6'; x.fillRect(0, 0, 256, 64); x.fillStyle = color; x.fillRect(0, 44, 256, 12); x.fillStyle = '#2d4152'; for (let i = 0; i < 6; i++) x.fillRect(8 + i * 41, 8, 34, 28); }) }), plain = mat('#f2ead6');
      g.add(mesh(new T.BoxGeometry(2.6, 1.0, 1.0), [plain, plain, plain, plain, side, side], 0, 0.75, 0));
      for (const [x, z] of [[-0.85, -0.48], [0.85, -0.48], [-0.85, 0.48], [0.85, 0.48]]) wheel(x, z, 0.22, 0.14);
    } else if (key === 'motorbike' || key === 'bicycle') {
      const bike = key === 'bicycle', body = mat(color, { metalness: 0.3, roughness: 0.3 });
      for (const x of [-0.45, 0.45]) { const w = mesh(new T.TorusGeometry(bike ? 0.26 : 0.2, bike ? 0.025 : 0.06, 8, 20), dark, x, bike ? 0.27 : 0.22, 0); g.add(w); }
      if (bike) { g.add(mesh(new T.BoxGeometry(0.8, 0.03, 0.03), body, 0, 0.5, 0)); g.add(mesh(new T.BoxGeometry(0.03, 0.4, 0.03), body, -0.1, 0.45, 0)); g.add(mesh(new T.BoxGeometry(0.03, 0.5, 0.03), body, 0.4, 0.5, 0)); g.add(mesh(new T.CylinderGeometry(0.13, 0.1, 0.14, 10, 1, true), mat('#c9a865', { side: T.DoubleSide }), 0.52, 0.72, 0)); }
      else { const s = mesh(new T.CapsuleGeometry(0.16, 0.5, 6, 12), body, -0.05, 0.45, 0); s.rotation.z = Math.PI / 2; g.add(s); const f = mesh(new T.CapsuleGeometry(0.12, 0.22, 6, 10), body, 0.38, 0.56, 0); f.rotation.z = -0.35; g.add(f); }
      g.scale.setScalar(1.25);
    }
    return g;
  }

  window.DDArt = { mat, mesh, canvasTex, roofTex, wallTex, boxWalls, roofVN, gable, railing, pot, tree, figure, pose, house, HOUSE_KEYS, vehicle, shade };
})();
