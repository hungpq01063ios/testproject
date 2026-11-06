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

  // ---------------- The forest ----------------
  function build(scene, renderer, opts) {
    const quality = (opts && opts.quality) || 'high', world = new T.Group(); scene.add(world);
    const animated = [], add = (o) => { world.add(o); return o; };
    const RING = 9.2, tilePos = F.TILES.map((t, i) => { const a = -Math.PI / 2 - (i / F.TILES.length) * TAU, r = RING + Math.sin(a * 3) * 0.6; return new T.Vector3(Math.cos(a) * r, 0.35, Math.sin(a) * r); });

    // sky, light, fog
    const skyU = { top: { value: new T.Color('#6ec3f4') }, bottom: { value: new T.Color('#e8f7ff') } };
    const sky = new T.Mesh(new T.SphereGeometry(300, 24, 12), new T.ShaderMaterial({ uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 top, bottom; varying vec3 vW; void main(){ float y = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(bottom, top, clamp(y * 1.6 + 0.2, 0., 1.)), 1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}' }));
    scene.add(sky);
    const hemi = new T.HemisphereLight('#ffffff', '#7a9a5a', 0.85); scene.add(hemi);
    const sun = new T.DirectionalLight('#fff4dc', 1.25); sun.position.set(10, 22, 12); sun.castShadow = quality !== 'low';
    sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; scene.add(sun);
    scene.fog = new T.Fog('#e8f7ff', 40, 110);

    // ground: island meadow, water around, the clearing in the middle
    const ground = new T.Mesh(new T.CircleGeometry(22, 64), new T.MeshStandardMaterial({ color: '#8ccf5a', roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; add(ground);
    const sea = new T.Mesh(new T.CircleGeometry(200, 48), new T.MeshStandardMaterial({ color: '#5ec2e8', roughness: 0.2, metalness: 0.1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.15; add(sea);
    const shore = new T.Mesh(new T.RingGeometry(21.6, 23.5, 64), new T.MeshStandardMaterial({ color: '#f2dfa8' })); shore.rotation.x = -Math.PI / 2; shore.position.y = -0.05; add(shore);
    const clearing = new T.Mesh(new T.CircleGeometry(6.8, 48), new T.MeshStandardMaterial({ color: '#b98c5a', roughness: 1 })); clearing.rotation.x = -Math.PI / 2; clearing.position.y = 0.02; clearing.receiveShadow = true; add(clearing);
    const DIRT = new T.Color('#b98c5a'), LUSH = new T.Color('#5fbf4a');

    // dirt path around the loop
    const curve = new T.CatmullRomCurve3(tilePos.map((p) => new T.Vector3(p.x, 0.03, p.z)), true);
    (function () { const n = 240, P = [], I = []; for (let i = 0; i <= n; i++) { const u = i / n, p = curve.getPointAt(u % 1), t = curve.getTangentAt(u % 1), s = new T.Vector3(-t.z, 0, t.x).multiplyScalar(1.2); P.push(p.x - s.x, 0.03, p.z - s.z, p.x + s.x, 0.03, p.z + s.z); if (i < n) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } } const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: '#e3c38a', roughness: 1 })); m.receiveShadow = true; add(m); })();

    // log-slice tiles with icons
    const tileMeshes = [];
    const ringsTex = canvasTex(128, 128, (g, w) => { g.fillStyle = '#e8c48e'; g.fillRect(0, 0, w, w); g.strokeStyle = 'rgba(140,90,40,.35)'; for (let r = 8; r < 64; r += 8) { g.lineWidth = 2; g.beginPath(); g.arc(64, 64, r, 0, TAU); g.stroke(); } });
    F.TILES.forEach((t, i) => {
      const p = tilePos[i], g = new T.Group(); g.position.copy(p).setY(0); add(g);
      const bark = mesh(new T.CylinderGeometry(1.0, 1.06, 0.36, 28), mat('#8a5a2b', { roughness: 0.95 }), 0, 0.18, 0); g.add(bark);
      const face = canvasTex(256, 256, (c, w) => {
        c.drawImage(ringsTex.image, 0, 0, w, w);
        c.fillStyle = TILE_COLOR[t.type]; c.beginPath(); c.arc(128, 128, 96, 0, TAU); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.stroke();
        c.save(); c.translate(128, 128); (ICON[t.type === 'help' ? 'help' : t.type] || ICON.paw)(c, 150); c.restore();
      });
      const top = mesh(new T.CircleGeometry(0.98, 36), new T.MeshStandardMaterial({ map: face, roughness: 0.75 }), 0, 0.365, 0); top.rotation.x = -Math.PI / 2; top.rotation.z = Math.atan2(p.x, p.z) + Math.PI; g.add(top);
      g.userData.tile = i; top.userData.tile = i; bark.userData.tile = i; tileMeshes.push(g);
    });

    // Nhà Cây: a treehouse behind the home tile
    (function () {
      const p = tilePos[0], g = new T.Group(); g.position.set(p.x * 1.32, 0, p.z * 1.32); add(g);
      g.add(mesh(new T.CylinderGeometry(0.5, 0.7, 3.2, 12), mat('#8a5a2b'), 0, 1.6, 0));
      for (const [x, y, z, r] of [[0, 4.0, 0, 1.6], [-1.2, 3.4, 0.3, 1.1], [1.2, 3.5, -0.2, 1.2], [0.2, 4.9, -0.2, 1.1]]) g.add(mesh(new T.IcosahedronGeometry(r, 1), mat('#4fb84a', { flatShading: true }), x, y, z));
      g.add(mesh(new T.BoxGeometry(1.6, 1.1, 1.2), mat('#e7a35b'), 0, 2.7, 0.9)); const roof = mesh(new T.ConeGeometry(1.25, 0.8, 4), mat('#e2483d'), 0, 3.65, 0.9); roof.rotation.y = Math.PI / 4; g.add(roof);
      g.add(mesh(new T.BoxGeometry(0.4, 0.6, 0.05), mat('#6e4326'), 0, 2.55, 1.51)); g.add(mesh(new T.BoxGeometry(0.35, 0.35, 0.05), new T.MeshStandardMaterial({ color: '#fff2b0', emissive: '#ffd36b', emissiveIntensity: 0.4 }), 0.5, 2.85, 1.51));
      for (let k = 0; k < 7; k++) g.add(mesh(new T.BoxGeometry(0.5, 0.05, 0.12), mat('#b5763c'), 0, 0.3 + k * 0.32, 1.2));
    })();

    // a stream with a little bridge on the right
    (function () {
      const pts = [new T.Vector3(22, 0, -6), new T.Vector3(15, 0, -3), new T.Vector3(11.5, 0, 1), new T.Vector3(13, 0, 6), new T.Vector3(22, 0, 9)];
      const c = new T.CatmullRomCurve3(pts), n = 80, P = [], I = [];
      for (let i = 0; i <= n; i++) { const u = i / n, p = c.getPoint(u), t = c.getTangent(u), s = new T.Vector3(-t.z, 0, t.x).multiplyScalar(0.9); P.push(p.x - s.x, 0.04, p.z - s.z, p.x + s.x, 0.04, p.z + s.z); if (i < n) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
      add(new T.Mesh(g, new T.MeshStandardMaterial({ color: '#4fb3e8', roughness: 0.15, metalness: 0.1 })));
      const pond = mesh(new T.CircleGeometry(2.2, 32), new T.MeshStandardMaterial({ color: '#4fb3e8', roughness: 0.15 }), 15.5, 0.045, -9); pond.rotation.x = -Math.PI / 2; add(pond);
      for (let i = 0; i < 5; i++) { const pad = mesh(new T.CircleGeometry(0.3, 12), mat('#3f9a3a'), 14.5 + Math.cos(i) * 1.2, 0.06, -9 + Math.sin(i * 2) * 1.2); pad.rotation.x = -Math.PI / 2; add(pad); if (i % 2) add(mesh(new T.SphereGeometry(0.1, 8, 6), mat('#ff9fbf'), pad.position.x, 0.12, pad.position.z)); }
    })();

    // decorations: trees, bushes, mushrooms, flowers, rocks — outside the loop
    function decoTree(x, z, s, col) {
      const g = new T.Group(); g.add(mesh(new T.CylinderGeometry(0.12, 0.18, 1.2, 8), mat('#8a5a2b'), 0, 0.6, 0));
      [[0, 1.6, 0, 0.75], [0.4, 1.35, 0.1, 0.5], [-0.38, 1.4, -0.12, 0.55], [0, 2.1, 0, 0.5]].forEach(([a, b, c2, r]) => g.add(mesh(new T.IcosahedronGeometry(r, 1), mat(col, { flatShading: true }), a, b, c2)));
      g.position.set(x, 0, z); g.scale.setScalar(s); add(g); return g;
    }
    const swayers = [];
    for (let i = 0; i < (quality === 'low' ? 40 : 80); i++) {
      const a = rnd() * TAU, r = 12.5 + rnd() * 8; const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (x > 10 && Math.abs(z - 1) < 9) continue; if (z > 3 && r < 19) continue;
      const t = decoTree(x, z, 0.8 + rnd() * 0.7, ['#4fb84a', '#3fa042', '#6cc04a', '#2f8f3a', '#f29ac0', '#ffd23f'][rnd() < 0.8 ? (rnd() * 4) | 0 : 4 + ((rnd() * 2) | 0)]); swayers.push(t);
    }
    for (let i = 0; i < (quality === 'low' ? 40 : 110); i++) {
      const a = rnd() * TAU, r = 11 + rnd() * 10, x = Math.cos(a) * r, z = Math.sin(a) * r, k = rnd(); if (z > 6 && k < 0.85 && k >= 0.65) continue;
      if (k < 0.3) { const m = new T.Group(); m.add(mesh(new T.CylinderGeometry(0.05, 0.07, 0.25, 8), mat('#fff6e8'), 0, 0.12, 0)); m.add(mesh(new T.SphereGeometry(0.18, 12, 8, 0, TAU, 0, Math.PI / 2), mat(rnd() < 0.5 ? '#e2483d' : '#f08a3a'), 0, 0.24, 0)); m.position.set(x, 0, z); add(m); }
      else if (k < 0.65) for (let f = 0; f < 5; f++) add(mesh(new T.SphereGeometry(0.09, 8, 6), mat(['#ff6f91', '#ffd23f', '#b77bff', '#ffffff', '#ff8a3d'][f]), x + (rnd() - 0.5) * 0.8, 0.12, z + (rnd() - 0.5) * 0.8));
      else if (k < 0.85) add(mesh(new T.IcosahedronGeometry(0.35, 1), mat('#5fae45', { flatShading: true }), x, 0.25, z));
      else { const rk = mesh(new T.DodecahedronGeometry(0.3, 0), mat('#a8a49a', { flatShading: true }), x, 0.15, z); rk.scale.y = 0.6; add(rk); }
    }
    // butterflies and birds
    const flyers = [];
    for (let i = 0; i < 10; i++) {
      const b = new T.Group(), col = ['#ff6f91', '#ffd23f', '#7fc2ff', '#b77bff'][i % 4];
      for (const s2 of [-1, 1]) { const w = mesh(new T.CircleGeometry(0.16, 10), mat(col, { side: T.DoubleSide }), s2 * 0.12, 0, 0); w.rotation.x = -Math.PI / 2; const piv = new T.Group(); piv.add(w); b.add(piv); }
      add(b); flyers.push({ b, ph: rnd() * 6, r: 4 + rnd() * 12, h: 0.8 + rnd() * 1.5, sp: 0.2 + rnd() * 0.3 });
    }

    // plots in the clearing, filled as trees are planted
    const PLOT_RINGS = [[1.4, 3], [3.0, 6], [4.6, 9]], plotPos = [];
    PLOT_RINGS.forEach(([r, n], k) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU + k * 0.5; plotPos.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } });
    const plotMarks = plotPos.map((p) => { const g = new T.Group(); const d = mesh(new T.CircleGeometry(0.55, 20), mat('#8a5a2b', { roughness: 1 }), p.x, 0.03, p.z); d.rotation.x = -Math.PI / 2; d.castShadow = false; g.add(d); for (let k = 0; k < 6; k++) g.add(mesh(new T.DodecahedronGeometry(0.08, 0), mat('#c9c2b4', { flatShading: true }), p.x + Math.cos(k) * 0.62, 0.05, p.z + Math.sin(k) * 0.62)); add(g); return g; });
    const SPECIES = [['#4fb84a', 'round'], ['#e0482f', 'round'], ['#f6c7d8', 'round'], ['#2f8f3a', 'pine'], ['#9b6ad6', 'round'], ['#ffd23f', 'round']];
    const planted = [];
    function plantedTree(i, colorOf) {
      const p = plotPos[i % plotPos.length], [col, kind] = SPECIES[i % SPECIES.length], g = new T.Group(); g.position.copy(p);
      g.add(mesh(new T.CylinderGeometry(0.1, 0.16, 1.1, 8), mat('#8a5a2b'), 0, 0.55, 0));
      if (kind === 'pine') [[0.7, 1.0, 1.2], [0.55, 0.9, 1.7], [0.38, 0.8, 2.15]].forEach(([r, h, y]) => g.add(mesh(new T.ConeGeometry(r, h, 10), mat(col, { flatShading: true }), 0, y, 0)));
      else [[0, 1.5, 0, 0.7], [0.38, 1.28, 0.1, 0.48], [-0.36, 1.32, -0.1, 0.5], [0, 1.95, 0, 0.45]].forEach(([a, b, c2, r]) => g.add(mesh(new T.IcosahedronGeometry(r, 1), mat(col, { flatShading: true }), a, b, c2)));
      const tag = mesh(new T.SphereGeometry(0.08, 8, 6), mat(colorOf || '#ffffff'), 0.16, 0.5, 0.12); g.add(tag);
      g.scale.setScalar(0.01); add(g); planted.push({ g, t: 0 }); return g;
    }
    function setTrees(n, colors, instant) {
      while (planted.length < Math.min(n, plotPos.length)) { const g = plantedTree(planted.length, colors && colors[planted.length]); if (instant) { g.scale.setScalar(1); planted[planted.length - 1].t = 1; } }
    }

    // litter piles on tiles
    const trashGroups = {};
    function trashPile() { const g = new T.Group(); { const _m = mesh(new T.CylinderGeometry(0.07, 0.07, 0.3, 10), mat('#7fd6a4', { roughness: 0.2, transparent: true, opacity: 0.8 }), 0.15, 0.15, 0); _m.rotation.z = 1.4; g.add(_m); }; { const _m = mesh(new T.SphereGeometry(0.2, 10, 8), mat('#3a3a3a', { roughness: 0.4 }), -0.1, 0.16, 0.05); _m.scale.y = 0.75; g.add(_m); }; g.add(mesh(new T.CylinderGeometry(0.06, 0.06, 0.14, 10), mat('#e2483d', { metalness: 0.6 }), 0.0, 0.07, -0.18)); return g; }
    function setTrash(list) {
      Object.keys(trashGroups).forEach((k) => { if (!list.includes(+k)) { world.remove(trashGroups[k]); delete trashGroups[k]; } });
      list.forEach((id) => { if (trashGroups[id]) return; const g = trashPile(), p = tilePos[id]; g.position.set(p.x * 0.88, 0.37, p.z * 0.88); add(g); trashGroups[id] = g; });
    }

    // storm: dark clouds overhead, rain, flashes
    const puff = canvasTex(128, 128, (g, w) => { for (let i = 0; i < 9; i++) { const x = 30 + rnd() * 68, y = 40 + rnd() * 48, r = 20 + rnd() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); } });
    const clouds = [];
    for (let i = 0; i < 14; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: puff, color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, fog: false })); const a = rnd() * TAU, r = 6 + rnd() * 22; sp.position.set(Math.cos(a) * r, 11 + rnd() * 5, Math.sin(a) * r - 6); const s2 = 6 + rnd() * 6; sp.scale.set(s2, s2 * 0.55, 1); scene.add(sp); clouds.push({ sp, v: 0.3 + rnd() * 0.4, dark: i / 14 }); }
    const rainN = quality === 'low' ? 400 : 1200, rainG = new T.BufferGeometry(), rainP = new Float32Array(rainN * 3);
    for (let i = 0; i < rainN; i++) rainP.set([(rnd() - 0.5) * 40, rnd() * 14, (rnd() - 0.5) * 40], i * 3);
    rainG.setAttribute('position', new T.BufferAttribute(rainP, 3));
    const rain = new T.Points(rainG, new T.PointsMaterial({ color: '#cfe6ff', size: 0.08, transparent: true, opacity: 0 })); scene.add(rain);
    let flash = 0;

    // rainbow for the win
    const rainbow = new T.Group(); ['#e2483d', '#f08a3a', '#ffd23f', '#5fbf4a', '#3fa7d6', '#8c5ad6'].forEach((c, i) => { const m = new T.Mesh(new T.TorusGeometry(13 - i * 0.45, 0.24, 8, 64, Math.PI), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 })); rainbow.add(m); });
    rainbow.position.set(0, 0, -12); rainbow.visible = false; scene.add(rainbow);

    const sunny = { top: new T.Color('#6ec3f4'), bottom: new T.Color('#e8f7ff'), sun: 1.25, hemi: 0.85, cloud: new T.Color('#ffffff') };
    const stormy = { top: new T.Color('#3a4560'), bottom: new T.Color('#8f98a8'), sun: 0.35, hemi: 0.55, cloud: new T.Color('#5a6070') };
    let stormK = 0, stormTarget = 0, greenK = 0, greenTarget = 0, ending = null;

    function update(dt, t) {
      stormK += (stormTarget - stormK) * Math.min(1, dt * 1.5); greenK += (greenTarget - greenK) * Math.min(1, dt * 1.5);
      const k = ending === 'win' ? 0 : stormK;
      skyU.top.value.copy(sunny.top).lerp(stormy.top, k); skyU.bottom.value.copy(sunny.bottom).lerp(stormy.bottom, k);
      scene.fog.color.copy(skyU.bottom.value);
      sun.intensity = sunny.sun + (stormy.sun - sunny.sun) * k + flash * 2; hemi.intensity = sunny.hemi + (stormy.hemi - sunny.hemi) * k + flash;
      flash = Math.max(0, flash - dt * 3);
      clouds.forEach((c) => { c.sp.position.x += c.v * dt * (1 + k * 3); if (c.sp.position.x > 30) c.sp.position.x = -30; c.sp.material.color.copy(sunny.cloud).lerp(stormy.cloud, k); c.sp.material.opacity = 0.55 + 0.4 * Math.min(1, k * 1.5 + (c.dark < k ? 0.3 : 0)); });
      const rr = ending === 'storm' ? 1 : Math.max(0, (k - 0.7) / 0.3); rain.material.opacity = rr * 0.8;
      if (rr > 0) { const p = rain.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * 14; if (y < 0) y = 14; p.setY(i, y); } p.needsUpdate = true; }
      clearing.material.color.copy(DIRT).lerp(LUSH, greenK);
      swayers.forEach((s2, i) => { s2.rotation.z = Math.sin(t * (1.2 + k * 3) + i) * (0.02 + k * 0.08); });
      planted.forEach((p, i) => { if (p.t < 1) { p.t = Math.min(1, p.t + dt * 1.1); const e = 1 - Math.pow(1 - p.t, 3), over = Math.sin(p.t * Math.PI) * 0.15; p.g.scale.setScalar(Math.max(0.01, e + over)); } p.g.rotation.z = Math.sin(t * (1.3 + k * 3) + i) * (0.015 + k * 0.07); });
      flyers.forEach((f, i) => { const a = t * f.sp + f.ph; f.b.position.set(Math.cos(a) * f.r, f.h + Math.sin(t * 2 + i) * 0.3, Math.sin(a) * f.r); f.b.rotation.y = -a; f.b.children.forEach((w, s2) => (w.rotation.z = (s2 ? 1 : -1) * Math.abs(Math.sin(t * 14 + i)) * 0.9)); f.b.visible = k < 0.75 || ending === 'win'; });
      if (rainbow.visible) rainbow.children.forEach((m) => (m.material.opacity = Math.min(0.85, m.material.opacity + dt * 0.4)));
    }

    return {
      tilePos: (i) => tilePos[i].clone(), tileCount: F.TILES.length, tileMeshes, update, setTrees, setTrash, plotCount: plotPos.length,
      setPlots(n) { plotMarks.forEach((g, i) => (g.visible = i < n)); }, setStorm(v, max) { stormTarget = Math.min(1, v / max); }, setGreen(trees, goal) { greenTarget = Math.min(1, trees / goal); },
      thunder() { flash = 1; }, ending(kind) { ending = kind; if (kind === 'win') { rainbow.visible = true; rainbow.children.forEach((m) => (m.material.opacity = 0)); } }, reset() { ending = null; rainbow.visible = false; planted.splice(0).forEach((p) => world.remove(p.g)); setTrash([]); },
      plotPos: (i) => plotPos[i % plotPos.length].clone(),
    };
  }

  window.ForestWorld = { build, animal, iconURL, ICON, TILE_COLOR };
})();
