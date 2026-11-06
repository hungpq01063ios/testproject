/* Khu Rừng Chung Tay — the 3D forest: a loop of log tiles around a clearing that turns green as trees are planted,
 * cute low-poly animals, litter piles, and weather that darkens as the storm season nears.
 * window.ForestWorld.build(scene, renderer, { quality }) and window.ForestWorld.animal(key, scarf). */
(function () {
  'use strict';
  const T = window.THREE, F = window.ForestCore, TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
  const cache = {};
  function mat(color, o) { const k = color + JSON.stringify(o || {}); return cache[k] || (cache[k] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.7 }, o || {}))); }
  function mesh(geo, m, x, y, z) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; return o; }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
  let seed = 4242; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---------------- Icons (shared by tiles and the page) ----------------
  const ICON = {
    seed(g, s) { g.fillStyle = '#8a5a2b'; g.beginPath(); g.ellipse(0, s * 0.12, s * 0.28, s * 0.34, 0, 0, TAU); g.fill(); g.fillStyle = '#5a3a1a'; g.beginPath(); g.ellipse(0, -s * 0.16, s * 0.34, s * 0.14, 0, 0, TAU); g.fill(); g.fillRect(-s * 0.03, -s * 0.38, s * 0.06, s * 0.16); },
    water(g, s) { g.fillStyle = '#2f9be0'; g.beginPath(); g.moveTo(0, -s * 0.42); g.bezierCurveTo(s * 0.36, -s * 0.02, s * 0.36, s * 0.38, 0, s * 0.38); g.bezierCurveTo(-s * 0.36, s * 0.38, -s * 0.36, -s * 0.02, 0, -s * 0.42); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-s * 0.1, s * 0.08, s * 0.06, s * 0.12, -0.4, 0, TAU); g.fill(); },
    plant(g, s) { g.fillStyle = '#8a5a2b'; g.fillRect(-s * 0.3, s * 0.18, s * 0.6, s * 0.16); g.strokeStyle = '#3f9a2f'; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(0, s * 0.18); g.lineTo(0, -s * 0.12); g.stroke(); g.fillStyle = '#5cc03a'; g.beginPath(); g.ellipse(-s * 0.16, -s * 0.16, s * 0.18, s * 0.1, -0.6, 0, TAU); g.fill(); g.beginPath(); g.ellipse(s * 0.16, -s * 0.24, s * 0.18, s * 0.1, 0.6, 0, TAU); g.fill(); },
    heart(g, s) { g.fillStyle = '#ff4f7b'; g.beginPath(); g.moveTo(0, s * 0.36); g.bezierCurveTo(-s * 0.5, 0, -s * 0.3, -s * 0.42, 0, -s * 0.16); g.bezierCurveTo(s * 0.3, -s * 0.42, s * 0.5, 0, 0, s * 0.36); g.fill(); },
    help(g, s) { ICON.heart(g, s * 0.8); g.fillStyle = '#ffd9a8'; g.beginPath(); g.ellipse(-s * 0.3, s * 0.26, s * 0.16, s * 0.09, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(s * 0.3, s * 0.26, s * 0.16, s * 0.09, -0.4, 0, TAU); g.fill(); },
    luck(g, s) { g.fillStyle = '#ffd23f'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.18 : s * 0.42, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = '#e09a1a'; g.lineWidth = s * 0.03; g.stroke(); },
    cloud(g, s) { g.fillStyle = '#5b6274'; [[-0.18, 0.04, 0.2], [0.04, -0.06, 0.25], [0.24, 0.06, 0.17], [0, 0.12, 0.2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * s, y * s, r * s, 0, TAU); g.fill(); }); g.strokeStyle = '#ffd23f'; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(0.02 * s, 0.22 * s); g.lineTo(-0.06 * s, 0.38 * s); g.lineTo(0.06 * s, 0.36 * s); g.lineTo(-0.02 * s, 0.5 * s); g.stroke(); },
    home(g, s) { g.fillStyle = '#c98a4a'; g.fillRect(-s * 0.28, -s * 0.04, s * 0.56, s * 0.38); g.fillStyle = '#e2483d'; g.beginPath(); g.moveTo(-s * 0.38, -s * 0.02); g.lineTo(0, -s * 0.38); g.lineTo(s * 0.38, -s * 0.02); g.fill(); g.fillStyle = '#6e4326'; g.fillRect(-s * 0.08, s * 0.12, s * 0.16, s * 0.22); },
    tree(g, s) { g.fillStyle = '#8a5a2b'; g.fillRect(-s * 0.06, s * 0.05, s * 0.12, s * 0.34); g.fillStyle = '#3fbf5f'; g.beginPath(); g.arc(0, -s * 0.1, s * 0.3, 0, TAU); g.fill(); g.fillStyle = '#5fd47a'; g.beginPath(); g.arc(-s * 0.1, -s * 0.18, s * 0.14, 0, TAU); g.fill(); },
    trash(g, s) { g.fillStyle = '#7a8a96'; g.fillRect(-s * 0.24, -s * 0.18, s * 0.48, s * 0.52); g.fillStyle = '#5a6a76'; g.fillRect(-s * 0.3, -s * 0.28, s * 0.6, s * 0.1); g.fillRect(-s * 0.08, -s * 0.36, s * 0.16, s * 0.08); },
    paw(g, s) { g.fillStyle = '#8a5a2b'; g.beginPath(); g.ellipse(0, s * 0.12, s * 0.2, s * 0.17, 0, 0, TAU); g.fill(); [[-0.22, -0.1], [-0.08, -0.24], [0.08, -0.24], [0.22, -0.1]].forEach(([x, y]) => { g.beginPath(); g.arc(x * s, y * s, s * 0.08, 0, TAU); g.fill(); }); },
    book(g, s) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -s * 0.2); g.quadraticCurveTo(-s * 0.2, -s * 0.3, -s * 0.42, -s * 0.22); g.lineTo(-s * 0.42, s * 0.28); g.quadraticCurveTo(-s * 0.2, s * 0.2, 0, s * 0.3); g.quadraticCurveTo(s * 0.2, s * 0.2, s * 0.42, s * 0.28); g.lineTo(s * 0.42, -s * 0.22); g.quadraticCurveTo(s * 0.2, -s * 0.3, 0, -s * 0.2); g.fill(); g.strokeStyle = '#3f7fc4'; g.lineWidth = s * 0.04; g.stroke(); g.beginPath(); g.moveTo(0, -s * 0.2); g.lineTo(0, s * 0.3); g.stroke(); },
    find(g, s) { g.strokeStyle = '#5a3a1a'; g.lineWidth = s * 0.08; g.beginPath(); g.arc(-s * 0.06, -s * 0.06, s * 0.22, 0, TAU); g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 0.1, s * 0.1); g.lineTo(s * 0.3, s * 0.3); g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-s * 0.06, -s * 0.06, s * 0.18, 0, TAU); g.fill(); },
    game(g, s) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.26, 0, 0, TAU); g.fill(); g.fillStyle = '#5a3a1a'; g.fillRect(-s * 0.3, -s * 0.03, s * 0.18, s * 0.06); g.fillRect(-s * 0.24, -s * 0.09, s * 0.06, s * 0.18); g.fillStyle = '#e2483d'; g.beginPath(); g.arc(s * 0.2, -s * 0.05, s * 0.05, 0, TAU); g.fill(); g.fillStyle = '#3fa7d6'; g.beginPath(); g.arc(s * 0.3, s * 0.06, s * 0.05, 0, TAU); g.fill(); },
    bridge(g, s) { g.strokeStyle = '#a8743a'; g.lineWidth = s * 0.08; g.beginPath(); g.arc(0, s * 0.3, s * 0.4, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.fillStyle = '#5ab8ec'; g.fillRect(-s * 0.42, s * 0.22, s * 0.84, s * 0.12); for (let i = -2; i <= 2; i++) { g.fillStyle = '#8a5a2b'; g.fillRect(i * s * 0.14 - s * 0.02, -s * 0.06 + Math.abs(i) * s * 0.06, s * 0.04, s * 0.2); } },
    zone0(g, s) { g.fillStyle = '#7fbf3a'; for (let i = -1; i <= 1; i++) { g.fillRect(i * s * 0.16 - s * 0.04, -s * 0.36, s * 0.08, s * 0.72); g.fillStyle = '#5a9a2a'; for (let y = -0.3; y < 0.36; y += 0.18) g.fillRect(i * s * 0.16 - s * 0.05, y * s, s * 0.1, s * 0.03); g.fillStyle = '#7fbf3a'; } },
    zone1(g, s) { g.fillStyle = '#ff8fb8'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(Math.cos(a) * s * 0.18, Math.sin(a) * s * 0.18, s * 0.15, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, s * 0.12, 0, TAU); g.fill(); },
    zone2(g, s) { g.fillStyle = '#9a948a'; g.fillRect(-s * 0.4, -s * 0.36, s * 0.3, s * 0.72); g.fillRect(s * 0.1, -s * 0.36, s * 0.3, s * 0.72); g.fillStyle = '#5ab8ec'; g.fillRect(-s * 0.1, -s * 0.36, s * 0.2, s * 0.6); g.beginPath(); g.ellipse(0, s * 0.28, s * 0.36, s * 0.1, 0, 0, TAU); g.fill(); },
    zone3(g, s) { g.fillStyle = '#3f9a3a'; g.beginPath(); g.ellipse(0, s * 0.2, s * 0.4, s * 0.14, 0, 0, TAU); g.fill(); g.fillStyle = '#ff9fc0'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(i * s * 0.08, -s * 0.02, s * 0.07, s * 0.2, i * 0.35, 0, TAU); g.fill(); } },
    zone4(g, s) { g.fillStyle = '#8a847a'; g.beginPath(); g.moveTo(-s * 0.42, s * 0.32); g.lineTo(-s * 0.08, -s * 0.34); g.lineTo(s * 0.12, -s * 0.04); g.lineTo(s * 0.24, -s * 0.2); g.lineTo(s * 0.42, s * 0.32); g.fill(); g.fillStyle = '#c9a8ff'; g.beginPath(); g.moveTo(-s * 0.02, s * 0.32); g.lineTo(s * 0.06, s * 0.06); g.lineTo(s * 0.14, s * 0.32); g.fill(); },
    hop(g, s) { g.strokeStyle = '#ff7aa8'; g.lineWidth = s * 0.08; g.lineCap = 'round'; g.beginPath(); g.arc(0, s * 0.2, s * 0.34, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.fillStyle = '#ff7aa8'; g.beginPath(); g.moveTo(s * 0.34, s * 0.02); g.lineTo(s * 0.4, s * 0.26); g.lineTo(s * 0.16, s * 0.16); g.fill(); },
  };
  function iconURL(name, size) { const c = document.createElement('canvas'); c.width = c.height = size || 96; const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); (ICON[name] || ICON.paw)(g, c.width); return c.toDataURL(); }
  const TILE_COLOR = { home: '#e7a35b', seed: '#f0b24a', water: '#5ab8ec', plant: '#7ccf4e', help: '#ff8cb3', luck: '#ffd84f', cloud: '#8b90a3' };

  // ---------------- Animals ----------------
  function eyes(head, r, z, spread, s) {
    const white = mat('#ffffff', { roughness: 0.3 }), black = mat('#1a1410', { roughness: 0.2 }), shine = new T.MeshBasicMaterial({ color: '#ffffff' });
    const grp = [];
    for (const x of [-spread, spread]) {
      const e = new T.Group(); e.position.set(x, r * 0.15, z); head.add(e);
      e.add(mesh(new T.SphereGeometry(r * 0.24, 14, 10), white)); const pu = mesh(new T.SphereGeometry(r * 0.15, 12, 8), black, 0, 0, r * 0.12); e.add(pu); e.add(mesh(new T.SphereGeometry(r * 0.05, 8, 6), shine, r * 0.05, r * 0.06, r * 0.25)); e.scale.z = 0.6; grp.push(e);
    }
    for (const x of [-spread * 1.45, spread * 1.45]) head.add(mesh(new T.SphereGeometry(r * 0.12, 10, 6), mat('#ff9fb0'), x, -r * 0.18, z * 0.8));
    return grp;
  }
  function animal(key, scarf) {
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const A = F.ANIMALS.find((a) => a.key === key) || F.ANIMALS[0], fur = mat(A.color, { roughness: 0.85 }), light = mat(key === 'bear' ? '#e2b98a' : key === 'squirrel' ? '#f6d2a8' : '#ffffff', { roughness: 0.85 });
    let head = new T.Group(), hr = 0.3, eyeL = [], legs = [], tail = null, bodyY = 0.5;
    const leg = (x, z, h, r, m) => { const l = mesh(new T.CapsuleGeometry(r, h, 4, 8), m || fur, x, r + h / 2, z); body.add(l); legs.push(l); return l; };
    if (key === 'turtle') {
      bodyY = 0.32;
      const shellTex = canvasTex(128, 128, (g, w) => { g.fillStyle = '#5a8a3a'; g.fillRect(0, 0, w, w); g.strokeStyle = '#3d6a28'; g.lineWidth = 5; for (let y = -1; y < 5; y++) for (let x = -1; x < 5; x++) { const cx = x * 32 + (y % 2) * 16, cy = y * 28; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15); } g.closePath(); g.stroke(); } });
      const shell = mesh(new T.SphereGeometry(0.46, 20, 12, 0, TAU, 0, Math.PI / 2), new T.MeshStandardMaterial({ map: shellTex, roughness: 0.6 }), 0, 0.2, 0); shell.scale.y = 0.85; body.add(shell);
      body.add(mesh(new T.CylinderGeometry(0.47, 0.44, 0.08, 20), mat('#c9b46a'), 0, 0.2, 0));
      for (const [x, z] of [[-0.3, 0.26], [0.3, 0.26], [-0.3, -0.26], [0.3, -0.26]]) leg(x, z, 0.05, 0.09);
      head.position.set(0, 0.35, 0.5); hr = 0.22; head.add(mesh(new T.SphereGeometry(hr, 16, 12), fur));
      eyeL = eyes(head, hr, hr * 0.82, hr * 0.45);
    } else if (key === 'stork') {
      bodyY = 0.8;
      { const _m = mesh(new T.SphereGeometry(0.3, 16, 12), fur, 0, 0.85, 0); _m.scale.set(1, 0.85, 1.3); body.add(_m); };
      for (const s2 of [-1, 1]) { const w = mesh(new T.SphereGeometry(0.22, 12, 8), fur, s2 * 0.25, 0.88, -0.05); w.scale.set(0.35, 0.8, 1.3); body.add(w); body.add(mesh(new T.SphereGeometry(0.1, 8, 6), mat('#2a2a2a'), s2 * 0.26, 0.8, -0.38)); }
      for (const x of [-0.1, 0.1]) leg(x, 0, 0.55, 0.025, mat('#f08a3a'));
      const neck = mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 1.0, 0.25), new T.Vector3(0, 1.25, 0.32), new T.Vector3(0, 1.4, 0.25)]), 8, 0.07, 8), fur); body.add(neck);
      head.position.set(0, 1.5, 0.28); hr = 0.17; head.add(mesh(new T.SphereGeometry(hr, 16, 12), fur));
      const beak = mesh(new T.ConeGeometry(0.05, 0.4, 10), mat('#f08a3a'), 0, -0.02, 0.32); beak.rotation.x = Math.PI / 2; head.add(beak);
      head.add(mesh(new T.SphereGeometry(0.07, 8, 6), mat('#e2483d'), 0, 0.16, 0));
      eyeL = eyes(head, hr, hr * 0.7, hr * 0.5);
    } else {
      const big = key === 'elephant' || key === 'bear';
      const b = mesh(new T.SphereGeometry(big ? 0.4 : 0.32, 18, 14), fur, 0, big ? 0.55 : 0.48, 0); b.scale.set(1, 1.05, 0.95); body.add(b);
      { const _m = mesh(new T.SphereGeometry(big ? 0.26 : 0.2, 14, 10), light, 0, big ? 0.52 : 0.46, big ? 0.22 : 0.17); _m.scale.set(1, 1.1, 0.6); body.add(_m); };
      for (const [x, z] of [[-0.18, 0.1], [0.18, 0.1], [-0.18, -0.12], [0.18, -0.12]]) leg(x, z, big ? 0.14 : 0.08, big ? 0.11 : 0.08);
      hr = big ? 0.34 : 0.28; head.position.set(0, big ? 1.12 : 0.98, 0.04); head.add(mesh(new T.SphereGeometry(hr, 18, 14), fur));
      eyeL = eyes(head, hr, hr * 0.85, hr * 0.38);
      if (key === 'bear') { for (const s2 of [-1, 1]) { head.add(mesh(new T.SphereGeometry(0.1, 10, 8), fur, s2 * 0.24, 0.24, 0)); head.add(mesh(new T.SphereGeometry(0.055, 8, 6), light, s2 * 0.24, 0.24, 0.05)); } { const _m = mesh(new T.SphereGeometry(0.13, 12, 8), light, 0, -0.08, 0.27); _m.scale.set(1.2, 0.85, 0.8); head.add(_m); } head.add(mesh(new T.SphereGeometry(0.045, 8, 6), mat('#2a1a10'), 0, -0.04, 0.37)); }
      if (key === 'rabbit') { for (const s2 of [-1, 1]) { const e = new T.Group(); e.position.set(s2 * 0.1, 0.22, -0.02); e.rotation.z = -s2 * 0.15; head.add(e); e.add(mesh(new T.CapsuleGeometry(0.06, 0.34, 4, 8), fur, 0, 0.22, 0)); e.add(mesh(new T.CapsuleGeometry(0.03, 0.28, 4, 6), mat('#ffb3c6'), 0, 0.22, 0.035)); } head.add(mesh(new T.SphereGeometry(0.04, 8, 6), mat('#ff8fa8'), 0, -0.05, 0.27)); tail = mesh(new T.SphereGeometry(0.1, 10, 8), mat('#ffffff'), 0, 0.42, -0.32); body.add(tail); }
      if (key === 'squirrel') {
        for (const s2 of [-1, 1]) { const e = mesh(new T.ConeGeometry(0.07, 0.16, 8), fur, s2 * 0.15, 0.25, 0); head.add(e); }
        head.add(mesh(new T.SphereGeometry(0.035, 8, 6), mat('#2a1a10'), 0, -0.04, 0.28));
        tail = mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.3, -0.25), new T.Vector3(0, 0.6, -0.55), new T.Vector3(0, 1.05, -0.45), new T.Vector3(0, 1.2, -0.15)]), 16, 0.16, 10), fur); body.add(tail);
        const acorn = new T.Group(); acorn.position.set(0, 0.62, 0.32); body.add(acorn); acorn.add(mesh(new T.SphereGeometry(0.07, 10, 8), mat('#a0682f'))); acorn.add(mesh(new T.SphereGeometry(0.075, 10, 6, 0, TAU, 0, Math.PI / 2), mat('#5a3a1a'), 0, 0.03, 0));
      }
      if (key === 'elephant') {
        for (const s2 of [-1, 1]) { const ear = mesh(new T.SphereGeometry(0.26, 14, 10), fur, s2 * 0.34, 0.04, -0.04); ear.scale.set(0.25, 1, 0.9); head.add(ear); { const _m = mesh(new T.SphereGeometry(0.2, 12, 8), mat('#f2b8c2'), s2 * 0.37, 0.04, 0.0); _m.scale.set(0.15, 0.8, 0.7); head.add(_m); }; }
        const trunk = mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, -0.05, 0.3), new T.Vector3(0, -0.25, 0.4), new T.Vector3(0, -0.42, 0.38), new T.Vector3(0, -0.5, 0.5)]), 12, 0.07, 10), fur); head.add(trunk);
        for (const s2 of [-1, 1]) { const tusk = mesh(new T.ConeGeometry(0.03, 0.16, 8), mat('#fffbe8'), s2 * 0.1, -0.17, 0.32); tusk.rotation.x = 2.2; head.add(tusk); }
      }
    }
    body.add(head);
    // scarf in the player's colour so each child finds their animal
    const scarfY = key === 'turtle' ? 0.33 : key === 'stork' ? 1.05 : head.position.y - hr * 0.95;
    const sc = mesh(new T.TorusGeometry(key === 'turtle' ? 0.16 : key === 'stork' ? 0.1 : hr * 0.75, 0.05, 8, 20), mat(scarf || '#e2483d'), 0, scarfY, key === 'turtle' ? 0.42 : key === 'stork' ? 0.27 : 0.02); sc.rotation.x = Math.PI / 2 + (key === 'turtle' ? 0.6 : 0); body.add(sc);
    const tailEnd = mesh(new T.BoxGeometry(0.08, 0.22, 0.03), mat(scarf || '#e2483d'), 0.12, scarfY - 0.12, (key === 'turtle' ? 0.42 : 0.02) + (key === 'stork' ? 0.3 : hr * 0.6)); tailEnd.rotation.z = 0.3; body.add(tailEnd);
    root.userData = { body, head, eyes: eyeL, legs, tail, kind: key };
    return root;
  }

  // ---------------- Little friends to rescue (and their parents) ----------------
  function friend(key, s) {
    const g = new T.Group(), b = new T.Group(); g.add(b); s = s || 1;
    let head = new T.Group(), hr = 0.24;
    const M = (c, o) => mat(c, Object.assign({ roughness: 0.85 }, o || {}));
    if (key === 'douc') { // voọc chà vá chân nâu: grey body, maroon legs, orange-gold face, white tail
      b.add(mesh(new T.SphereGeometry(0.26, 14, 10), M('#8d8f94'), 0, 0.5, 0));
      for (const x of [-0.12, 0.12]) b.add(mesh(new T.CapsuleGeometry(0.06, 0.22, 4, 8), M('#8a2f22'), x, 0.2, 0));
      for (const x of [-0.26, 0.26]) b.add(mesh(new T.CapsuleGeometry(0.05, 0.28, 4, 8), M('#2a2a2e'), x, 0.5, 0.04));
      b.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.4, -0.2), new T.Vector3(0, 0.2, -0.5), new T.Vector3(0, 0.55, -0.7)]), 10, 0.04, 6), M('#f2f0ea')));
      head.position.set(0, 0.86, 0); head.add(mesh(new T.SphereGeometry(hr, 14, 10), M('#2a2a2e')));
      head.add(mesh(new T.SphereGeometry(hr * 0.78, 14, 10), M('#f0b04a'), 0, -0.02, hr * 0.38));
      head.add(mesh(new T.SphereGeometry(hr * 0.5, 10, 8), M('#ffffff'), 0, -hr * 0.55, hr * 0.3));
    } else if (key === 'fawn') { // nai con with white spots
      const body = mesh(new T.CapsuleGeometry(0.18, 0.34, 6, 12), M('#b9783e'), 0, 0.58, 0); body.rotation.x = Math.PI / 2; b.add(body);
      for (let i = 0; i < 6; i++) b.add(mesh(new T.SphereGeometry(0.035, 6, 4), M('#ffffff'), (i % 2 ? 0.1 : -0.1), 0.7, -0.15 + i * 0.07));
      for (const [x, z] of [[-0.1, 0.18], [0.1, 0.18], [-0.1, -0.18], [0.1, -0.18]]) b.add(mesh(new T.CapsuleGeometry(0.035, 0.36, 4, 6), M('#8a5a2b'), x, 0.22, z));
      head.position.set(0, 0.95, 0.28); head.add(mesh(new T.SphereGeometry(hr * 0.85, 14, 10), M('#c98a4a')));
      for (const x of [-1, 1]) { const ear = mesh(new T.ConeGeometry(0.06, 0.2, 8), M('#c98a4a'), x * 0.14, 0.14, -0.02); ear.rotation.z = -x * 0.8; head.add(ear); }
      head.add(mesh(new T.SphereGeometry(0.04, 8, 6), M('#2a1a10'), 0, -0.05, hr * 0.85));
    } else if (key === 'otter') { // rái cá: long brown body, pale face, whiskers
      const body = mesh(new T.CapsuleGeometry(0.17, 0.42, 6, 12), M('#7a4a28'), 0, 0.3, 0); body.rotation.x = Math.PI / 2; b.add(body);
      { const ot = mesh(new T.ConeGeometry(0.08, 0.4, 8), M('#6a3e20'), 0, 0.25, -0.45); ot.rotation.x = -Math.PI / 2; b.add(ot); }
      head.position.set(0, 0.5, 0.32); head.add(mesh(new T.SphereGeometry(hr * 0.85, 14, 10), M('#7a4a28')));
      head.add(mesh(new T.SphereGeometry(hr * 0.55, 12, 8), M('#e8d6b8'), 0, -0.05, hr * 0.5));
      head.add(mesh(new T.SphereGeometry(0.035, 8, 6), M('#2a1a10'), 0, -0.02, hr * 0.95));
    } else if (key === 'crane') { // sếu đầu đỏ
      const body = mesh(new T.SphereGeometry(0.24, 14, 10), M('#e9ebee'), 0, 0.78, 0); body.scale.set(1, 0.85, 1.35); b.add(body);
      b.add(mesh(new T.SphereGeometry(0.12, 8, 6), M('#3a3a3a'), 0, 0.74, -0.32));
      for (const x of [-0.07, 0.07]) b.add(mesh(new T.CapsuleGeometry(0.02, 0.5, 4, 6), M('#6a6a6a'), x, 0.3, 0));
      b.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.9, 0.22), new T.Vector3(0, 1.15, 0.28), new T.Vector3(0, 1.3, 0.22)]), 8, 0.05, 8), M('#5a5e66')));
      head.position.set(0, 1.38, 0.24); head.add(mesh(new T.SphereGeometry(hr * 0.6, 12, 8), M('#e9ebee')));
      head.add(mesh(new T.SphereGeometry(hr * 0.35, 10, 6, 0, TAU, 0, Math.PI / 2), M('#e2483d'), 0, hr * 0.32, 0));
      const beak = mesh(new T.ConeGeometry(0.035, 0.28, 8), M('#8a8f5a'), 0, -0.02, 0.2); beak.rotation.x = Math.PI / 2; head.add(beak);
    } else { // pangolin: scales, long tail
      const scaleTex = canvasTex(64, 64, (c2, w) => { c2.fillStyle = '#8a6a48'; c2.fillRect(0, 0, w, w); c2.fillStyle = '#a8865e'; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { c2.beginPath(); c2.arc(x * 14 + (y % 2) * 7, y * 14 + 10, 7, Math.PI, 0); c2.fill(); } });
      const sm2 = new T.MeshStandardMaterial({ map: scaleTex, roughness: 0.7 });
      const body = mesh(new T.CapsuleGeometry(0.2, 0.36, 6, 12), sm2, 0, 0.32, 0); body.rotation.x = Math.PI / 2; b.add(body);
      b.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.3, -0.35), new T.Vector3(0, 0.2, -0.7), new T.Vector3(0.1, 0.12, -0.95)]), 10, 0.1, 8), sm2));
      for (const [x, z] of [[-0.12, 0.15], [0.12, 0.15], [-0.12, -0.15], [0.12, -0.15]]) b.add(mesh(new T.CapsuleGeometry(0.04, 0.12, 4, 6), M('#6a4a30'), x, 0.1, z));
      head.position.set(0, 0.4, 0.38); { const sn = mesh(new T.ConeGeometry(hr * 0.6, 0.35, 12), M('#c9a27a')); sn.rotation.x = Math.PI / 2; head.add(sn); }
      head.add(mesh(new T.SphereGeometry(0.03, 8, 6), M('#2a1a10'), 0, 0, 0.18));
    }
    b.add(head);
    const ey = eyes(head, hr * 0.8, hr * 0.62, hr * 0.32);
    g.userData = { body: b, head, eyes: ey, kind: key };
    g.scale.setScalar(s);
    return g;
  }

  // ---------------- The forest ----------------
  function build(scene, renderer, opts) {
    const quality = (opts && opts.quality) || 'high', world = new T.Group(); scene.add(world);
    const add = (o) => { world.add(o); return o; };
    const NZ = F.ZONES.length;
    // geometry of the five petals
    const dirOf = (k) => { const a = -Math.PI / 2 + (k / NZ) * TAU; return new T.Vector3(Math.cos(a), 0, Math.sin(a)); };
    const nOf = (k) => { const d = dirOf(k); return new T.Vector3(-d.z, 0, d.x); };
    const PC = 11, PA = 6.2, PB = 3.5;
    const zoneCenter = (k) => dirOf(k).multiplyScalar(PC);
    const petalPoint = (k, phi) => zoneCenter(k).add(dirOf(k).multiplyScalar(PA * Math.cos(phi))).add(nOf(k).multiplyScalar(PB * Math.sin(phi)));
    const tilePos = F.TILES.map((t) => (t.type === 'hub' ? new T.Vector3(0, 0.35, 0) : petalPoint(t.zone, Math.PI - (TAU * (t.idx + 0.5)) / 9).setY(0.35)));

    // sky, lights, fog
    const skyU = { top: { value: new T.Color('#6ec3f4') }, bottom: { value: new T.Color('#e8f7ff') } };
    const sky = new T.Mesh(new T.SphereGeometry(300, 24, 12), new T.ShaderMaterial({ uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 top, bottom; varying vec3 vW; void main(){ float y = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(bottom, top, clamp(y * 1.6 + 0.2, 0., 1.)), 1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}' }));
    scene.add(sky);
    const hemi = new T.HemisphereLight('#ffffff', '#7a9a5a', 0.85); scene.add(hemi);
    const sun = new T.DirectionalLight('#fff4dc', 1.25); sun.castShadow = quality !== 'low'; scene.add(sun); scene.add(sun.target);
    sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    scene.fog = new T.Fog('#e8f7ff', 55, 140);
    const moon = new T.Mesh(new T.SphereGeometry(2.2, 20, 14), new T.MeshBasicMaterial({ color: '#fff6d8', fog: false })); moon.position.set(-40, 38, -70); scene.add(moon);

    // island, sea, shore
    const ground = new T.Mesh(new T.CircleGeometry(27, 72), new T.MeshStandardMaterial({ color: '#8ccf5a', roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; add(ground);
    const sea = new T.Mesh(new T.CircleGeometry(220, 48), new T.MeshStandardMaterial({ color: '#5ec2e8', roughness: 0.2, metalness: 0.1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.15; add(sea);
    const shore = new T.Mesh(new T.RingGeometry(26.6, 29, 72), new T.MeshStandardMaterial({ color: '#f2dfa8' })); shore.rotation.x = -Math.PI / 2; shore.position.y = -0.05; add(shore);
    // each petal sits on its own coloured meadow
    const meadows = F.ZONES.map((z, k) => { const m = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshStandardMaterial({ color: '#b9a27a', roughness: 1 })); m.rotation.x = -Math.PI / 2; const c = zoneCenter(k); m.position.set(c.x, 0.015, c.z); m.scale.set(PA + 1.6, PB + 1.6, 1); m.rotation.z = -Math.atan2(dirOf(k).z, dirOf(k).x); m.receiveShadow = true; add(m); return m; });

    // paths: each petal loop from the Mother Tree and back, wooden bridges between tips
    const sand = new T.MeshStandardMaterial({ color: '#e7c88f', roughness: 1 });
    function ribbon(points, width, material, y) {
      const c = new T.CatmullRomCurve3(points), n = Math.max(40, points.length * 16), P = [], I = [];
      for (let i = 0; i <= n; i++) { const u = i / n, p = c.getPoint(u), t = c.getTangent(u), s = new T.Vector3(-t.z, 0, t.x).multiplyScalar(width / 2); P.push(p.x - s.x, y, p.z - s.z, p.x + s.x, y, p.z + s.z); if (i < n) { const k2 = i * 2; I.push(k2, k2 + 1, k2 + 2, k2 + 1, k2 + 3, k2 + 2); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
      const m = new T.Mesh(g, material); m.receiveShadow = true; add(m); return c;
    }
    F.ZONES.forEach((z, k) => { const pts = [new T.Vector3(0, 0, 0).add(dirOf(k).multiplyScalar(2.2)).add(nOf(k).multiplyScalar(0.8))]; for (let i = 0; i < 9; i++) pts.push(tilePos[1 + k * 9 + i].clone().setY(0)); pts.push(new T.Vector3(0, 0, 0).add(dirOf(k).multiplyScalar(2.2)).add(nOf(k).multiplyScalar(-0.8))); ribbon(pts, 2.1, sand, 0.03); });
    const plank = mat('#a8743a', { roughness: 0.9 });
    F.ZONES.forEach((z, k) => {
      const a = tilePos[1 + k * 9 + 4].clone(), b = tilePos[1 + ((k + 1) % NZ) * 9 + 5].clone(), len = a.distanceTo(b);
      const mid = a.clone().lerp(b, 0.5); mid.y = 1.1;
      const c = new T.QuadraticBezierCurve3(a.clone().setY(0.25), mid, b.clone().setY(0.25)), n = Math.ceil(len / 0.32);
      for (let i = 1; i < n; i++) { const p = c.getPoint(i / n), q = c.getPoint(Math.min(1, i / n + 0.02)); const pl = mesh(new T.BoxGeometry(1.2, 0.08, 0.26), plank, p.x, p.y, p.z); pl.lookAt(q); add(pl); }
      for (const s2 of [-0.6, 0.6]) { const side = new T.Vector3().subVectors(b, a).normalize(); const off = new T.Vector3(-side.z, 0, side.x).multiplyScalar(s2); const pts = []; for (let i = 0; i <= 16; i++) pts.push(c.getPoint(i / 16).add(off).add(new T.Vector3(0, 0.45, 0))); add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 30, 0.04, 6), mat('#8a5a2b'))); }
      // a little creek under each bridge
      const cr = []; const mid2 = a.clone().lerp(b, 0.5), rad = mid2.clone().normalize(); for (let i = -1; i <= 1; i += 0.25) cr.push(mid2.clone().add(rad.clone().multiplyScalar(i * 5)).setY(0)); ribbon(cr, 1.3, new T.MeshStandardMaterial({ color: '#5ab8ec', roughness: 0.15 }), 0.025);
    });

    // tiles: log slices with icons
    const ringsTex = canvasTex(128, 128, (g, w) => { g.fillStyle = '#e8c48e'; g.fillRect(0, 0, w, w); g.strokeStyle = 'rgba(140,90,40,.35)'; for (let r = 8; r < 64; r += 8) { g.lineWidth = 2; g.beginPath(); g.arc(64, 64, r, 0, TAU); g.stroke(); } });
    const GLYPH = { hub: 'home', seed: 'seed', water: 'water', plant: 'plant', story: 'book', rescue: 'find', help: 'help', luck: 'luck', cloud: 'cloud', game: 'game' };
    const tileMeshes = [];
    F.TILES.forEach((t, i) => {
      if (t.type === 'hub') return;
      const p = tilePos[i], g = new T.Group(); g.position.copy(p).setY(0); add(g);
      g.add(mesh(new T.CylinderGeometry(0.95, 1.0, 0.36, 28), mat('#8a5a2b', { roughness: 0.95 }), 0, 0.18, 0));
      const col = t.type === 'game' ? '#ffb14a' : t.type === 'rescue' ? F.ZONES[t.zone].color : t.type === 'story' ? '#9bd3ff' : TILE_COLOR[t.type] || '#cccccc';
      const face = canvasTex(256, 256, (c, w) => { c.drawImage(ringsTex.image, 0, 0, w, w); c.fillStyle = col; c.beginPath(); c.arc(128, 128, 96, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 10; c.stroke(); c.save(); c.translate(128, 128); (ICON[GLYPH[t.type]] || ICON.paw)(c, 150); c.restore(); });
      const top = mesh(new T.CircleGeometry(0.93, 36), new T.MeshStandardMaterial({ map: face, roughness: 0.75 }), 0, 0.365, 0); top.rotation.x = -Math.PI / 2; g.add(top);
      if (t.type === 'game' || t.type === 'rescue') { const flagC = t.type === 'game' ? '#ff7a3a' : F.ZONES[t.zone].color; g.add(mesh(new T.CylinderGeometry(0.03, 0.03, 1.2, 6), mat('#ffffff'), 0.75, 0.6, -0.4)); const fl = mesh(new T.PlaneGeometry(0.5, 0.32), mat(flagC, { side: T.DoubleSide }), 1.0, 1.05, -0.4); fl.userData.wave = Math.random() * 6; g.add(fl); }
      g.userData.tile = i; tileMeshes.push(g);
    });

    // Mother Tree in the middle, with a friendly face
    const mother = new T.Group(); add(mother);
    (function () {
      const hubRing = mesh(new T.CylinderGeometry(3.0, 3.2, 0.34, 40), mat('#8a5a2b'), 0, 0.17, 0); mother.add(hubRing);
      const hubTop = mesh(new T.RingGeometry(1.5, 2.95, 48), new T.MeshStandardMaterial({ map: ringsTex, roughness: 0.8 }), 0, 0.345, 0); hubTop.rotation.x = -Math.PI / 2; mother.add(hubTop);
      mother.add(mesh(new T.CylinderGeometry(1.0, 1.5, 4.4, 14), mat('#7a4a26'), 0, 2.4, 0));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const root2 = mesh(new T.ConeGeometry(0.35, 1.6, 6), mat('#6e4326'), Math.cos(a) * 1.3, 0.5, Math.sin(a) * 1.3); root2.rotation.z = Math.cos(a) * 1.0; root2.rotation.x = -Math.sin(a) * 1.0; mother.add(root2); }
      const crowns = [[0, 6.0, 0, 2.6], [-2.0, 5.2, 0.5, 1.8], [2.1, 5.3, -0.3, 1.9], [0.3, 7.4, -0.3, 1.8], [-0.9, 5.4, -1.8, 1.6], [1.0, 5.6, 1.6, 1.5]];
      mother.userData.crowns = crowns.map(([x, y, z, r]) => { const m = mesh(new T.IcosahedronGeometry(r, 1), mat('#3fae4a', { flatShading: true }), x, y, z); mother.add(m); return m; });
      const face = new T.Group(); face.position.set(0, 2.9, 1.26); mother.add(face);
      const ew = mat('#ffffff', { roughness: 0.3 }), eb = mat('#2a1a10');
      mother.userData.eyes = [-0.38, 0.38].map((x) => { const e = new T.Group(); e.position.set(x, 0, 0); e.add(mesh(new T.SphereGeometry(0.22, 14, 10), ew)); e.add(mesh(new T.SphereGeometry(0.12, 10, 8), eb, 0, 0, 0.14)); e.scale.z = 0.5; face.add(e); return e; });
      const smile = mesh(new T.TorusGeometry(0.32, 0.05, 8, 20, Math.PI), mat('#4a2a16'), 0, -0.45, 0.02); smile.rotation.z = Math.PI; face.add(smile);
      for (const x of [-0.65, 0.65]) face.add(mesh(new T.SphereGeometry(0.13, 10, 8), mat('#e9a08a'), x, -0.3, -0.02));
      // lanterns hanging from the branches for the evenings
      mother.userData.lanterns = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const l = mesh(new T.SphereGeometry(0.16, 12, 8), new T.MeshStandardMaterial({ color: '#ffcf5a', emissive: '#ffb02a', emissiveIntensity: 0.2 }), Math.cos(a) * 2.6, 4.0, Math.sin(a) * 2.6); mother.add(l); mother.userData.lanterns.push(l); }
    })();

    // ---------- zone sets: each has a "life" factor 0 (wilted) → 1 (restored) ----------
    const zoneLife = F.ZONES.map(() => ({ v: 0.15, target: 0.15 }));
    const zoneSet = F.ZONES.map(() => ({ updates: [], plots: [], trees: [], friend: null, parent: null }));
    const lerpC = (a, b, k) => new T.Color(a).lerp(new T.Color(b), k);
    const meadowFrom = ['#c2a86a', '#c9ad74', '#bfa56c', '#b9a066', '#b3a07a'], meadowTo = ['#7fcf4a', '#a8e06a', '#7fcf6a', '#86cf6a', '#8fbf6a'];
    const inside = (k, u, v) => zoneCenter(k).add(dirOf(k).multiplyScalar(u)).add(nOf(k).multiplyScalar(v)); // local coords in a petal
    F.ZONES.forEach((z, k) => {
      const Z = zoneSet[k], up = (fn) => Z.updates.push(fn), c = zoneCenter(k);
      up((L) => meadows[k].material.color.copy(lerpC(meadowFrom[k], meadowTo[k], L)));
      if (z.key === 'bamboo') {
        for (let i = 0; i < 26; i++) { const p = inside(k, (rnd() - 0.5) * 7, (rnd() - 0.5) * 3.4); if (i > 14) p.copy(inside(k, (rnd() - 0.5) * 12, (rnd() < 0.5 ? -1 : 1) * (PB + 1.8 + rnd() * 1.5))); const g = new T.Group(); g.position.copy(p); add(g); const h = 1.6 + rnd() * 2.4; for (let s2 = 0; s2 < 4; s2++) { const st = mesh(new T.CylinderGeometry(0.06, 0.07, h, 6), mat('#7fae4a'), (rnd() - 0.5) * 0.5, h / 2, (rnd() - 0.5) * 0.5); st.rotation.z = (rnd() - 0.5) * 0.2; g.add(st); g.add(mesh(new T.IcosahedronGeometry(0.28, 0), mat('#5faa3a', { flatShading: true }), st.position.x, h, st.position.z)); }
          let lush = null; up((L) => { g.scale.set(1, 0.35 + 0.65 * L, 1); const now = L > 0.6; if (now === lush) return; lush = now; g.children.forEach((x, j) => { x.material = j % 2 ? mat(now ? '#5faa3a' : '#c9b46a', { flatShading: true }) : mat(now ? '#7fae4a' : '#bfae6a'); }); }); }
      }
      if (z.key === 'flower') {
        const hill = mesh(new T.SphereGeometry(3.2, 24, 12, 0, TAU, 0, Math.PI / 2), mat('#9ccf5a'), c.x, -1.6, c.z); hill.scale.y = 0.7; add(hill); up((L) => hill.material.color.copy(lerpC('#a99d7a', '#9ccf5a', L)));
        const blooms = [];
        for (let i = 0; i < 70; i++) { const p = i < 45 ? inside(k, (rnd() - 0.5) * 7, (rnd() - 0.5) * 3.6) : inside(k, (rnd() - 0.5) * 12, (rnd() < 0.5 ? -1 : 1) * (PB + 1.3 + rnd() * 1.6)); const d = p.clone().sub(c); const y = i < 45 ? Math.max(0, -1.6 + 0.7 * Math.sqrt(Math.max(0, 3.2 * 3.2 - d.lengthSq()))) : 0; const f = new T.Group(); f.position.set(p.x, y, p.z); add(f); f.add(mesh(new T.CylinderGeometry(0.015, 0.015, 0.35, 4), mat('#3f8a2f'), 0, 0.17, 0)); const head2 = mesh(new T.SphereGeometry(0.11, 8, 6), mat(['#ff6f91', '#ffd23f', '#b77bff', '#ffffff', '#ff8a3d'][i % 5]), 0, 0.38, 0); f.add(head2); blooms.push(head2); }
        up((L) => blooms.forEach((b2, i) => b2.scale.setScalar(Math.max(0.05, Math.min(1, L * 1.6 - (i % 7) * 0.08)))));
      }
      if (z.key === 'falls') {
        const tip = c.clone().add(dirOf(k).multiplyScalar(PA + 2.6));
        const cliff = mesh(new T.CylinderGeometry(2.6, 3.4, 3.4, 9), mat('#9a948a', { flatShading: true }), tip.x, 1.7, tip.z); add(cliff);
        const moss = mesh(new T.CylinderGeometry(2.62, 2.62, 0.3, 9), mat('#6fae45', { flatShading: true }), tip.x, 3.45, tip.z); add(moss);
        const fallTex = canvasTex(32, 128, (g, w, h) => { g.fillStyle = '#7fd0ff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 10); }); fallTex.wrapT = T.RepeatWrapping;
        const fall = mesh(new T.PlaneGeometry(1.4, 3.3), new T.MeshStandardMaterial({ map: fallTex, transparent: true, opacity: 0, roughness: 0.1 }), 0, 0, 0); const fp = tip.clone().sub(dirOf(k).multiplyScalar(2.55)); fall.position.set(fp.x, 1.7, fp.z); fall.lookAt(c.x, 1.7, c.z); add(fall);
        const pool = mesh(new T.CircleGeometry(2.4, 32), new T.MeshStandardMaterial({ color: '#8a7a5a', roughness: 0.3 }), c.x, 0.03, c.z); pool.rotation.x = -Math.PI / 2; pool.scale.set(1.3, 0.9, 1); add(pool);
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; add(mesh(new T.DodecahedronGeometry(0.3, 0), mat('#a8a49a', { flatShading: true }), c.x + Math.cos(a) * 2.9, 0.1, c.z + Math.sin(a) * 2.1)); }
        up((L, t) => { fall.material.opacity = Math.max(0, (L - 0.4) / 0.6) * 0.9; fallTex.offset.y = -t * 1.5; pool.material.color.copy(lerpC('#8a7a5a', '#4fb3e8', L)); });
      }
      if (z.key === 'lotus') {
        const pond = mesh(new T.CircleGeometry(2.8, 36), new T.MeshStandardMaterial({ color: '#7a6a4a', roughness: 0.25 }), c.x, 0.03, c.z); pond.rotation.x = -Math.PI / 2; pond.scale.set(1.5, 0.9, 1); add(pond);
        const pads = [], lotus = [];
        for (let i = 0; i < 16; i++) { const p = c.clone().add(dirOf(k).multiplyScalar((rnd() - 0.5) * 6.5)).add(nOf(k).multiplyScalar((rnd() - 0.5) * 3.6)); const pad = mesh(new T.CircleGeometry(0.42, 14, 0.3, TAU - 0.3), mat('#3f9a3a', { side: T.DoubleSide }), p.x, 0.05, p.z); pad.rotation.x = -Math.PI / 2; add(pad); pads.push(pad);
          if (i % 2 === 0) { const fl = new T.Group(); fl.position.set(p.x + 0.1, 0.08, p.z); add(fl); for (let q = 0; q < 6; q++) { const pt = mesh(new T.SphereGeometry(0.1, 8, 6), mat('#ff9fc0'), Math.cos(q) * 0.08, 0.1, Math.sin(q) * 0.08); pt.scale.set(0.6, 1.4, 0.6); pt.rotation.z = Math.cos(q) * 0.5; pt.rotation.x = Math.sin(q) * 0.5; fl.add(pt); } fl.add(mesh(new T.SphereGeometry(0.06, 8, 6), mat('#ffd23f'), 0, 0.12, 0)); lotus.push(fl); } }
        up((L) => { pond.material.color.copy(lerpC('#7a6a4a', '#4fb3d8', L)); pads.forEach((p2, i) => p2.scale.setScalar(0.4 + 0.6 * Math.min(1, L * 1.4 + i * 0.02))); lotus.forEach((f2, i) => f2.scale.setScalar(Math.max(0.01, Math.min(1, L * 1.8 - 0.5 - i * 0.04)))); });
      }
      if (z.key === 'rocks') {
        const stones = [], crystals = [];
        for (let i = 0; i < 9; i++) { const p = inside(k, (rnd() - 0.5) * 7, (rnd() - 0.5) * 3.4); const r2 = 0.6 + rnd() * 0.9; const s2 = mesh(new T.DodecahedronGeometry(r2, 0), mat('#9a948a', { flatShading: true }), p.x, r2 * 0.4, p.z); s2.scale.y = 0.8; add(s2); stones.push(s2); }
        const cave = c.clone().add(dirOf(k).multiplyScalar(PA + 2.3)); const mt = mesh(new T.ConeGeometry(3.2, 4.8, 8), mat('#8a847a', { flatShading: true }), cave.x, 2.4, cave.z); add(mt);
        const mouth = mesh(new T.CircleGeometry(0.9, 16, 0, Math.PI), mat('#2a2622'), 0, 0, 0); const mp = cave.clone().sub(dirOf(k).multiplyScalar(2.3)); mouth.position.set(mp.x, 0.05, mp.z); mouth.lookAt(c.x, 0.05, c.z); add(mouth);
        for (let i = 0; i < 12; i++) { const p = inside(k, (rnd() - 0.5) * 7, (rnd() - 0.5) * 3.2); const cr = mesh(new T.OctahedronGeometry(0.22, 0), new T.MeshStandardMaterial({ color: ['#8fd6ff', '#c9a8ff', '#9fffc9'][i % 3], emissive: ['#4fb3ff', '#9a6aff', '#4fdf9a'][i % 3], emissiveIntensity: 0, roughness: 0.2 }), p.x, 0.3, p.z); cr.scale.y = 1.8; add(cr); crystals.push(cr); }
        let mossy = null; up((L) => { const now = L > 0.6; if (now !== mossy) { mossy = now; stones.forEach((s2) => (s2.material = mat(now ? '#7f9a6a' : '#9a948a', { flatShading: true }))); mt.material = mat(now ? '#7f9a6a' : '#8a847a', { flatShading: true }); } crystals.forEach((c2, i) => { c2.scale.set(Math.min(1, L * 1.4), Math.min(1.8, L * 2.6), Math.min(1, L * 1.4)); c2.material.emissiveIntensity = L * 0.9; }); });
      }
      // nursery plots for this zone's trees, placed inside the petal
      for (let i = 0; i < 4; i++) { const p = inside(k, -2.4 + i * 1.6, i % 2 ? 0.9 : -0.9); if (z.key === 'lotus' || z.key === 'falls') p.copy(inside(k, -PA + 0.6 + (i % 2) * 1.6 + 6.2 * (i > 1), (i % 2 ? 1 : -1) * (PB + 1.4))); const d = mesh(new T.CircleGeometry(0.5, 18), mat('#7a4a26', { roughness: 1 }), p.x, 0.04, p.z); d.rotation.x = -Math.PI / 2; d.castShadow = false; add(d); Z.plots.push({ p, mark: d }); }
    });

    // ---------- trees planted by the children ----------
    const SPECIES = ['#4fb84a', '#e0482f', '#f6c7d8', '#ffd23f', '#9b6ad6', '#2f8f3a'];
    const growing = [];
    function plantedTree(k, i, colorOf) {
      const slot = zoneSet[k].plots[i % zoneSet[k].plots.length], g = new T.Group(); g.position.copy(slot.p);
      g.add(mesh(new T.CylinderGeometry(0.1, 0.16, 1.1, 8), mat('#8a5a2b'), 0, 0.55, 0));
      const col = SPECIES[(k * 2 + i) % SPECIES.length];
      [[0, 1.5, 0, 0.7], [0.38, 1.28, 0.1, 0.48], [-0.36, 1.32, -0.1, 0.5], [0, 1.95, 0, 0.45]].forEach(([a, b2, c2, r]) => g.add(mesh(new T.IcosahedronGeometry(r, 1), mat(col, { flatShading: true }), a, b2, c2)));
      g.add(mesh(new T.SphereGeometry(0.08, 8, 6), mat(colorOf || '#ffffff'), 0.16, 0.5, 0.12));
      g.scale.setScalar(0.01); add(g); growing.push({ g, t: 0 }); zoneSet[k].trees.push(g); return g;
    }

    // ---------- lost friends ----------
    F.ZONES.forEach((z, k) => {
      const rescueTile = 1 + k * 9 + 5, rp = tilePos[rescueTile], out = rp.clone().sub(zoneCenter(k)).setY(0).normalize();
      const bush = new T.Group(); bush.position.copy(rp.clone().add(out.clone().multiplyScalar(1.7))).setY(0); add(bush);
      for (let i = 0; i < 3; i++) bush.add(mesh(new T.IcosahedronGeometry(0.55 - i * 0.08, 1), mat('#4f9a35', { flatShading: true }), (i - 1) * 0.45, 0.45, 0));
      const baby = friend(z.friend.key, 0.8); baby.position.copy(bush.position).add(new T.Vector3(0, 0.35, 0)); add(baby);
      const parent = friend(z.friend.key, 1.35); const home = inside(k, 1.2, 0); parent.position.copy(home); add(parent); parent.visible = false;
      const tear = mesh(new T.SphereGeometry(0.05, 8, 6), mat('#7fd0ff'), 0, 0, 0); baby.add(tear); tear.position.set(0.12, 0.85, 0.2);
      zoneSet[k].friend = { baby, parent, bush, home, tear, rescued: false };
    });

    // ---------- scenery between zones ----------
    function decoTree(x, z, s, col) { const g = new T.Group(); g.add(mesh(new T.CylinderGeometry(0.12, 0.18, 1.2, 8), mat('#8a5a2b'), 0, 0.6, 0)); [[0, 1.6, 0, 0.75], [0.4, 1.35, 0.1, 0.5], [-0.38, 1.4, -0.12, 0.55], [0, 2.1, 0, 0.5]].forEach(([a, b2, c2, r]) => g.add(mesh(new T.IcosahedronGeometry(r, 1), mat(col, { flatShading: true }), a, b2, c2))); g.position.set(x, 0, z); g.scale.setScalar(s); add(g); return g; }
    const swayers = [];
    const occupied = (x, z) => F.TILES.some((t, i) => tilePos[i].distanceTo(new T.Vector3(x, 0.35, z)) < 2.4) || F.ZONES.some((zz, k) => { const c = zoneCenter(k), d = new T.Vector3(x, 0, z).sub(c), u = d.dot(dirOf(k)), v = d.dot(nOf(k)); return (u / (PA + 1.4)) ** 2 + (v / (PB + 1.4)) ** 2 < 1.15; }) || Math.hypot(x, z) < 4.5;
    for (let i = 0, n = 0; i < 800 && n < (quality === 'low' ? 50 : 110); i++) { const a = rnd() * TAU, r = 5 + rnd() * 21, x = Math.cos(a) * r, z = Math.sin(a) * r; if (occupied(x, z) || (z > 6 && r < 20 && rnd() < 0.7)) continue; swayers.push(decoTree(x, z, 0.7 + rnd() * 0.7, ['#4fb84a', '#3fa042', '#6cc04a', '#2f8f3a', '#f29ac0', '#ffd23f'][rnd() < 0.85 ? (rnd() * 4) | 0 : 4 + ((rnd() * 2) | 0)])); n++; }
    for (let i = 0, n = 0; i < 1500 && n < (quality === 'low' ? 60 : 160); i++) { const a = rnd() * TAU, r = 4 + rnd() * 22, x = Math.cos(a) * r, z = Math.sin(a) * r; if (occupied(x, z)) continue; n++; const k2 = rnd();
      if (k2 < 0.3) { const m = new T.Group(); m.add(mesh(new T.CylinderGeometry(0.05, 0.07, 0.25, 8), mat('#fff6e8'), 0, 0.12, 0)); m.add(mesh(new T.SphereGeometry(0.18, 12, 8, 0, TAU, 0, Math.PI / 2), mat(rnd() < 0.5 ? '#e2483d' : '#f08a3a'), 0, 0.24, 0)); m.position.set(x, 0, z); add(m); }
      else if (k2 < 0.65) for (let f = 0; f < 5; f++) add(mesh(new T.SphereGeometry(0.09, 8, 6), mat(['#ff6f91', '#ffd23f', '#b77bff', '#ffffff', '#ff8a3d'][f]), x + (rnd() - 0.5) * 0.8, 0.12, z + (rnd() - 0.5) * 0.8));
      else if (k2 < 0.85) add(mesh(new T.IcosahedronGeometry(0.35, 1), mat('#5fae45', { flatShading: true }), x, 0.25, z));
      else { const rk = mesh(new T.DodecahedronGeometry(0.3, 0), mat('#a8a49a', { flatShading: true }), x, 0.15, z); rk.scale.y = 0.6; add(rk); } }

    // butterflies (day) and fireflies (night)
    const flyers = [];
    for (let i = 0; i < 14; i++) { const b = new T.Group(), col = ['#ff6f91', '#ffd23f', '#7fc2ff', '#b77bff'][i % 4]; for (const s2 of [-1, 1]) { const w = mesh(new T.CircleGeometry(0.16, 10), mat(col, { side: T.DoubleSide }), s2 * 0.12, 0, 0); w.rotation.x = -Math.PI / 2; const piv = new T.Group(); piv.add(w); b.add(piv); } add(b); flyers.push({ b, ph: rnd() * 6, r: 5 + rnd() * 16, h: 0.8 + rnd() * 1.6, sp: 0.15 + rnd() * 0.25 }); }
    const glow = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const ffN = quality === 'low' ? 60 : 160, ffG = new T.BufferGeometry(), ffP = new Float32Array(ffN * 3), ffPh = [];
    for (let i = 0; i < ffN; i++) { const a = rnd() * TAU, r = 3 + rnd() * 22; ffP.set([Math.cos(a) * r, 0.5 + rnd() * 2, Math.sin(a) * r], i * 3); ffPh.push(rnd() * 6); }
    ffG.setAttribute('position', new T.BufferAttribute(ffP, 3));
    const fireflies = new T.Points(ffG, new T.PointsMaterial({ color: '#fff3a0', size: 0.35, map: glow, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 })); scene.add(fireflies);

    // litter piles
    const trashGroups = {};
    function trashPile() { const g = new T.Group(); const bo = mesh(new T.CylinderGeometry(0.07, 0.07, 0.3, 10), mat('#7fd6a4', { roughness: 0.2, transparent: true, opacity: 0.8 }), 0.15, 0.15, 0); bo.rotation.z = 1.4; g.add(bo); const bag = mesh(new T.SphereGeometry(0.2, 10, 8), mat('#3a3a3a', { roughness: 0.4 }), -0.1, 0.16, 0.05); bag.scale.y = 0.75; g.add(bag); g.add(mesh(new T.CylinderGeometry(0.06, 0.06, 0.14, 10), mat('#e2483d', { metalness: 0.6 }), 0.0, 0.07, -0.18)); return g; }
    function setTrash(list) {
      Object.keys(trashGroups).forEach((k) => { if (!list.includes(+k)) { world.remove(trashGroups[k]); delete trashGroups[k]; } });
      list.forEach((id) => { if (trashGroups[id]) return; const g = trashPile(), p = tilePos[id]; g.position.set(p.x + 0.5, 0.37, p.z + 0.3); add(g); trashGroups[id] = g; });
    }

    // storm clouds, rain, flashes, rainbow
    const puff = canvasTex(128, 128, (g, w) => { for (let i = 0; i < 9; i++) { const x = 30 + rnd() * 68, y = 40 + rnd() * 48, r = 20 + rnd() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); } });
    const clouds = [];
    for (let i = 0; i < 16; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: puff, color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, fog: false })); const a = rnd() * TAU, r = 10 + rnd() * 26; sp.position.set(Math.cos(a) * r, 14 + rnd() * 6, Math.sin(a) * r - 10); const s2 = 7 + rnd() * 7; sp.scale.set(s2, s2 * 0.55, 1); scene.add(sp); clouds.push({ sp, v: 0.3 + rnd() * 0.4, dark: i / 16 }); }
    const rainN = quality === 'low' ? 500 : 1500, rainG = new T.BufferGeometry(), rainP = new Float32Array(rainN * 3);
    for (let i = 0; i < rainN; i++) rainP.set([(rnd() - 0.5) * 52, rnd() * 16, (rnd() - 0.5) * 52], i * 3);
    rainG.setAttribute('position', new T.BufferAttribute(rainP, 3));
    const rain = new T.Points(rainG, new T.PointsMaterial({ color: '#cfe6ff', size: 0.08, transparent: true, opacity: 0 })); scene.add(rain);
    const rainbow = new T.Group(); ['#e2483d', '#f08a3a', '#ffd23f', '#5fbf4a', '#3fa7d6', '#8c5ad6'].forEach((c, i) => rainbow.add(new T.Mesh(new T.TorusGeometry(19 - i * 0.6, 0.32, 8, 64, Math.PI), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0 }))));
    rainbow.position.set(0, 0, -20); rainbow.visible = false; scene.add(rainbow);

    // ---------- time of day + storm blend ----------
    const TIMES = [
      { top: '#7ec8f5', bottom: '#fdebd0', sun: ['#ffe2b0', 1.1], pos: [18, 14, 14], hemi: 0.8 },
      { top: '#5ab8f5', bottom: '#e8f7ff', sun: ['#fff6e0', 1.35], pos: [6, 30, 8], hemi: 0.9 },
      { top: '#6a9fe0', bottom: '#ffc98a', sun: ['#ffb070', 1.1], pos: [-18, 12, 10], hemi: 0.75 },
      { top: '#16224a', bottom: '#3a4a7a', sun: ['#a8b8ff', 0.45], pos: [-10, 24, -14], hemi: 0.45, night: true },
    ];
    const cur = { top: new T.Color('#7ec8f5'), bottom: new T.Color('#fdebd0'), sunC: new T.Color('#ffe2b0'), sunI: 1.1, pos: new T.Vector3(18, 14, 14), hemi: 0.8, night: 0 };
    let timeIdx = 0, stormK = 0, stormTarget = 0, flash = 0, ending = null, focusK = -1;
    const STORMY = { top: new T.Color('#3a4560'), bottom: new T.Color('#8f98a8') };

    function update(dt, t) {
      const T0 = TIMES[timeIdx], k = Math.min(1, dt * 1.2);
      cur.top.lerp(new T.Color(T0.top), k); cur.bottom.lerp(new T.Color(T0.bottom), k); cur.sunC.lerp(new T.Color(T0.sun[0]), k); cur.sunI += (T0.sun[1] - cur.sunI) * k; cur.pos.lerp(new T.Vector3(...T0.pos), k); cur.hemi += (T0.hemi - cur.hemi) * k; cur.night += ((T0.night ? 1 : 0) - cur.night) * k;
      stormK += ((ending === 'win' ? 0 : stormTarget) - stormK) * Math.min(1, dt * 1.5);
      skyU.top.value.copy(cur.top).lerp(STORMY.top, stormK * 0.8); skyU.bottom.value.copy(cur.bottom).lerp(STORMY.bottom, stormK * 0.8); scene.fog.color.copy(skyU.bottom.value);
      sun.color.copy(cur.sunC); sun.position.copy(cur.pos); sun.intensity = cur.sunI * (1 - stormK * 0.6) + flash * 2; hemi.intensity = cur.hemi * (1 - stormK * 0.3) + flash; flash = Math.max(0, flash - dt * 3);
      moon.visible = cur.night > 0.3; fireflies.material.opacity = cur.night * 0.95;
      { const p = ffG.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, 0.6 + Math.abs(Math.sin(t * 0.7 + ffPh[i])) * 1.6); p.needsUpdate = true; }
      mother.userData.lanterns.forEach((l, i) => (l.material.emissiveIntensity = 0.2 + cur.night * (1.2 + Math.sin(t * 3 + i) * 0.2)));
      clouds.forEach((c) => { c.sp.position.x += c.v * dt * (1 + stormK * 3); if (c.sp.position.x > 40) c.sp.position.x = -40; c.sp.material.color.copy(new T.Color('#ffffff').lerp(new T.Color('#5a6070'), stormK)); c.sp.material.opacity = (0.5 + 0.45 * Math.min(1, stormK * 1.5)) * (1 - cur.night * 0.5); });
      const rr = ending === 'storm' ? 1 : Math.max(0, (stormK - 0.72) / 0.28); rain.material.opacity = rr * 0.8;
      if (rr > 0) { const p = rainG.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * 15; if (y < 0) y = 16; p.setY(i, y); } p.needsUpdate = true; }
      zoneLife.forEach((zl, kk) => { zl.v += (zl.target - zl.v) * Math.min(1, dt * 0.8); zoneSet[kk].updates.forEach((fn) => fn(zl.v, t)); });
      swayers.forEach((s2, i) => (s2.rotation.z = Math.sin(t * (1.2 + stormK * 3) + i) * (0.02 + stormK * 0.08)));
      growing.forEach((p, i) => { if (p.t < 1) { p.t = Math.min(1, p.t + dt * 1.1); p.g.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - p.t, 3) + Math.sin(p.t * Math.PI) * 0.18)); } p.g.rotation.z = Math.sin(t * (1.3 + stormK * 3) + i) * (0.015 + stormK * 0.07); });
      flyers.forEach((f, i) => { const a = t * f.sp + f.ph; f.b.position.set(Math.cos(a) * f.r, f.h + Math.sin(t * 2 + i) * 0.3, Math.sin(a) * f.r); f.b.rotation.y = -a; f.b.children.forEach((w, s2) => (w.rotation.z = (s2 ? 1 : -1) * Math.abs(Math.sin(t * 14 + i)) * 0.9)); f.b.visible = cur.night < 0.5 && stormK < 0.75; });
      // Mother Tree breathes and blinks; lost babies sob, rescued families bounce
      const mt = mother.userData; mt.crowns.forEach((m, i) => m.scale.setScalar(1 + Math.sin(t * 1.5 + i) * 0.02)); const blink = (t % 4) < 0.15; mt.eyes.forEach((e) => (e.scale.y = blink ? 0.1 : 1));
      zoneSet.forEach((Z, kk) => { const f = Z.friend; if (!f.rescued) { f.baby.position.y = 0.35 + Math.abs(Math.sin(t * 2 + kk)) * 0.05; f.tear.visible = (t + kk) % 2 < 1.2; f.tear.position.y = 0.85 - ((t + kk) % 1) * 0.4; f.baby.rotation.y = Math.sin(t + kk) * 0.6; } else { f.parent.position.y = Math.abs(Math.sin(t * 3 + kk)) * 0.1; f.baby.position.y = Math.abs(Math.sin(t * 3.4 + kk)) * 0.22; } });
      tileMeshes.forEach((g) => g.children.forEach((c) => { if (c.userData.wave != null) c.rotation.y = Math.sin(t * 3 + c.userData.wave) * 0.35; }));
      if (rainbow.visible) rainbow.children.forEach((m) => (m.material.opacity = Math.min(0.85, m.material.opacity + dt * 0.4)));
    }

    function setZones(zones, needN, colorsOf, instant) {
      zones.forEach((z, k) => {
        while (zoneSet[k].trees.length < Math.min(z.trees, zoneSet[k].plots.length)) { const g = plantedTree(k, zoneSet[k].trees.length, colorsOf && colorsOf(k, zoneSet[k].trees.length)); if (instant) { g.scale.setScalar(1); growing[growing.length - 1].t = 1; } }
        zoneSet[k].plots.forEach((p, i) => (p.mark.visible = i < needN));
        const f = zoneSet[k].friend;
        if (z.rescued && !f.rescued) { f.rescued = true; f.bush.visible = true; f.baby.position.copy(f.home).add(new T.Vector3(0.9, 0, 0.5)); f.baby.lookAt(f.parent.position); f.parent.visible = true; f.tear.visible = false; }
        zoneLife[k].target = z.restored ? 1 : 0.15 + 0.5 * Math.min(1, z.trees / needN) * 0.6 + (z.rescued ? 0.12 : 0);
        if (instant) zoneLife[k].v = zoneLife[k].target;
      });
    }
    function resetAll() {
      growing.splice(0).forEach((p) => world.remove(p.g)); zoneSet.forEach((Z) => { Z.trees = []; const f = Z.friend; f.rescued = false; f.parent.visible = false; f.baby.position.copy(f.bush.position).add(new T.Vector3(0, 0.35, 0)); }); zoneLife.forEach((z) => (z.v = z.target = 0.15)); setTrash([]); ending = null; rainbow.visible = false;
    }

    return {
      tilePos: (i) => tilePos[i].clone(), tileMeshes, update, setTrash, setZones, reset: resetAll,
      zoneCenter: (k) => zoneCenter(k), zoneDir: (k) => dirOf(k), friendPos: (k) => zoneSet[k].friend.bush.position.clone(), homePos: (k) => zoneSet[k].friend.home.clone(),
      setStorm(v, max) { stormTarget = Math.min(1, v / max); }, setTime(i) { timeIdx = ((i % 4) + 4) % 4; }, thunder() { flash = 1; },
      ending(kind) { ending = kind; if (kind === 'win') { rainbow.visible = true; rainbow.children.forEach((m) => (m.material.opacity = 0)); } },
      motherPos: () => new T.Vector3(0, 0, 0), plotPos: (k, i) => zoneSet[k].plots[i % zoneSet[k].plots.length].p.clone(),
    };
  }

  window.ForestWorld = { build, animal, friend, iconURL, ICON, TILE_COLOR };
})();
