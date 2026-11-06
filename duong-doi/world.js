/* Đường Đời — the 3D world: an island journey through seven Vietnamese places.
 * Builds terrain, water, sky, a smooth paved road through the board's tiles, region set pieces and
 * ambient life, and blends the atmosphere (time of day, fog, lantern glow) toward the region in focus.
 * Exposes window.DDWorld.build(scene, renderer, opts). Everything is procedural: no external assets. */
(function () {
  'use strict';
  const T = window.THREE, L = window.LifeCore;

  // ---------------- Layout ----------------
  const SX = 2.8, SZ = 3.4, ROAD_Y = 0.8, ROAD_W = 1.7;
  const rowZ = (y) => (y - 5.2) * SZ;
  const tx = (t) => (t.x - 5) * SX;
  const tz = (t) => rowZ(t.y) + Math.sin(t.x * 0.85 + t.y * 1.9) * 0.45;
  const BANA = { x0: 1.2, x1: 10.0, peak: 2.3 };
  function lift(t) {
    if (Math.abs(t.y - 9.2) > 0.01) return 0;
    const x = tx(t); if (x <= BANA.x0 || x >= BANA.x1) return 0;
    return BANA.peak * Math.sin(Math.PI * (x - BANA.x0) / (BANA.x1 - BANA.x0));
  }
  const tilePos = L.TILES.map((t) => new T.Vector3(tx(t), ROAD_Y + lift(t), tz(t)));

  const REGIONS = {
    hanoi: { name: 'Hà Nội', sub: 'Hồ Gươm · Tháp Rùa · Khuê Văn Các', sky: ['#5fa7e3', '#f7dcc0', '#2f7fa6'], sun: ['#fff0d2', 1.25, 38, 135], hemi: ['#dcecff', '#6d6a48', 0.7], fog: ['#e8dcc8', 40, 120], glow: 0.35, win: 0.2, exposure: 1.0 },
    hoian: { name: 'Hội An', sub: 'Phố cổ · Đèn lồng · Chùa Cầu', sky: ['#6f9fd6', '#ffcf8a', '#2b6f96'], sun: ['#ffc785', 1.15, 16, 245], hemi: ['#ffe2bf', '#6a5034', 0.65], fog: ['#f1cf9c', 38, 115], glow: 1.0, win: 0.6, exposure: 1.02 },
    dalat: { name: 'Đà Lạt', sub: 'Rừng thông · Đồi hoa · Biệt thự', sky: ['#8fb3cf', '#e6eef1', '#3d7f9e'], sun: ['#f3f6ff', 0.95, 30, 120], hemi: ['#e4eef6', '#5d6b55', 0.8], fog: ['#dfe8ec', 18, 75], glow: 0.45, win: 0.3, exposure: 1.0 },
    sapa: { name: 'Sapa', sub: 'Ruộng bậc thang · Nhà sàn', sky: ['#3f8fde', '#d4ebf7', '#2d7aa4'], sun: ['#fff6e4', 1.35, 55, 160], hemi: ['#d8ecff', '#5a7040', 0.7], fog: ['#d8e9f2', 45, 130], glow: 0.2, win: 0.1, exposure: 1.0 },
    saigon: { name: 'Sài Gòn', sub: 'Toà tháp · Phố thị sôi động', sky: ['#4c9fe6', '#f3e3c6', '#2a7ba8'], sun: ['#fff1d6', 1.4, 60, 200], hemi: ['#e2efff', '#6d6650', 0.7], fog: ['#efe2cc', 45, 130], glow: 0.3, win: 0.35, exposure: 1.02 },
    bana: { name: 'Bà Nà', sub: 'Cầu Vàng · Lâu đài trên mây', sky: ['#9cb7cf', '#f2f4f5', '#4c86a3'], sun: ['#fff8ec', 1.05, 42, 180], hemi: ['#eef3f8', '#62705a', 0.85], fog: ['#eef1f3', 16, 70], glow: 0.35, win: 0.2, exposure: 1.04 },
    phuquoc: { name: 'Phú Quốc', sub: 'Hoàng hôn · Biển · Chùa tháp', sky: ['#3b5ea6', '#ff9d5c', '#2a5a86'], sun: ['#ff9a55', 1.15, 7, 250], hemi: ['#ffcfa8', '#4b3a4a', 0.6], fog: ['#f0a978', 40, 120], glow: 1.0, win: 0.9, exposure: 1.05 },
  };
  function regionOf(t) {
    if (t.y <= 2.21) return 'hanoi';
    if (t.y <= 3.31) return 'hoian';
    if (t.y <= 5.51) return 'dalat';
    if (Math.abs(t.y - 6.5) < 0.01) return 'sapa';
    if (Math.abs(t.y - 7.9) < 0.01) return 'saigon';
    if (t.y <= 9.21) return 'bana';
    return 'phuquoc';
  }

  // ---------------- Noise ----------------
  function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s / 0.9375; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  let seed = 12345; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---------------- Road curves ----------------
  const prevs = L.TILES.map(() => []);
  L.TILES.forEach((t) => t.next.forEach((n) => prevs[n].push(t.id)));
  const avg = (ids) => ids.reduce((v, i) => v.add(tilePos[i]), new T.Vector3()).multiplyScalar(1 / ids.length);
  const tangents = L.TILES.map((t, i) => {
    const p = tilePos[i], a = prevs[i].length ? avg(prevs[i]) : null, b = t.next.length ? avg(t.next) : null;
    const d = a && b ? b.clone().sub(a) : b ? b.clone().sub(p) : p.clone().sub(a);
    d.y = 0; return d.normalize();
  });
  const curves = {};
  L.TILES.forEach((t) => t.next.forEach((n) => {
    const a = tilePos[t.id], b = tilePos[n], len = a.distanceTo(b);
    curves[t.id + '-' + n] = new T.CubicBezierCurve3(a.clone(), a.clone().addScaledVector(tangents[t.id], len / 3), b.clone().addScaledVector(tangents[n], -len / 3), b.clone());
  }));
  // Dense samples for terrain fitting, with a spatial hash.
  const samples = [], CELL = 2, grid = new Map();
  Object.keys(curves).forEach((k) => {
    const c = curves[k], n = Math.ceil(c.getLength() / 0.22);
    for (let i = 0; i <= n; i++) { const p = c.getPoint(i / n); samples.push({ x: p.x, y: p.y, z: p.z, bridge: p.y > ROAD_Y + 0.25 }); }
  });
  samples.forEach((s, i) => { const key = Math.floor(s.x / CELL) + ',' + Math.floor(s.z / CELL); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i); });
  function roadInfo(x, z) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); let best = null, bd = 1e9;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const arr = grid.get((cx + i) + ',' + (cz + j)); if (!arr) continue;
      for (const k of arr) { const s = samples[k], d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = s; } }
    }
    return best ? { d: Math.sqrt(bd), y: best.y, bridge: best.bridge } : { d: 99, y: ROAD_Y, bridge: false };
  }

  // ---------------- Terrain ----------------
  const ISL = { a: 21.5, b: 29, zc: 1.3 };
  const LAKE = { x: -1.6, z: rowZ(1.1), rx: 6.6, rz: 1.55 };            // Hồ Gươm
  const BAY = { x: 5.6, z: rowZ(5.5), rx: 6.2, rz: 1.75 };              // vịnh
  const CANAL_X = 4.2, CANAL = { z0: BAY.z, z1: rowZ(2.75) };           // sông Hoài to the bay
  const POND = { x: CANAL_X, z: rowZ(2.75), rx: 1.6, rz: 0.75 };
  const SAPA = { x0: -15, x1: -1.6, z0: rowZ(4.4) + 1.35, z1: rowZ(6.5) - 1.35 };
  const CITY = { z0: rowZ(7.9) + 1.3, z1: rowZ(9.2) - 1.3 };
  function island(x, z) {
    const e = Math.pow(Math.abs(x) / ISL.a, 4) + Math.pow(Math.abs(z - ISL.zc) / ISL.b, 4) + (fbm(x * 0.11 + 11, z * 0.11 - 7) - 0.5) * 0.45;
    return smooth(1.1, 0.88, e);
  }
  const ell = (x, z, e) => ((x - e.x) / e.rx) ** 2 + ((z - e.z) / e.rz) ** 2;
  function waterDepth(x, z) { // 0 = dry, 1 = full water
    let w = 0;
    w = Math.max(w, smooth(1.15, 0.8, ell(x, z, LAKE)));
    w = Math.max(w, smooth(1.15, 0.75, ell(x, z, BAY)));
    w = Math.max(w, smooth(1.2, 0.8, ell(x, z, POND)));
    if (z > CANAL.z1 && z < CANAL.z0) w = Math.max(w, smooth(0.62, 0.38, Math.abs(x - CANAL_X)));
    return w;
  }
  function terraceH(x, z) {
    const m = smooth(SAPA.x1, SAPA.x1 - 2.5, x) * smooth(SAPA.z0, SAPA.z0 + 1.2, z) * smooth(SAPA.z1, SAPA.z1 - 1.2, z);
    if (m <= 0) return [0, 0];
    const th = m * (1.1 + 1.9 * fbm(x * 0.18 + 2, z * 0.25)), q = th * 5;
    return [(Math.floor(q) + smooth(0.82, 1, q % 1)) / 5, Math.floor(q)];
  }
  function rawH(x, z) {
    const land = island(x, z);
    let h = 0.78 + (fbm(x * 0.22, z * 0.22) - 0.5) * 0.5;
    h += Math.max(0, fbm(x * 0.08 + 5, z * 0.08 + 9) - 0.52) * 3.2;                                 // rolling hills
    h += smooth(rowZ(3.3) + 0.9, rowZ(3.3) + 1.8, z) * smooth(rowZ(4.4) - 0.9, rowZ(4.4) - 1.8, z) * 0.9 * fbm(x * 0.4, z * 0.4); // Đà Lạt knolls
    h += terraceH(x, z)[0];
    // Fansipan range on the west coast, hills behind Bà Nà
    h += 7.5 * Math.exp(-(((x + 19.5) / 3.2) ** 2 + ((z - 2) / 6) ** 2)) * (0.75 + 0.5 * fbm(x * 0.5, z * 0.5));
    h += 4.5 * Math.exp(-(((x - 19.5) / 3) ** 2 + ((z - 14) / 4) ** 2)) * (0.7 + 0.6 * fbm(x * 0.5 + 3, z * 0.5));
    // valley under the Golden Bridge
    const bx = (BANA.x0 + BANA.x1) / 2;
    h -= 0.55 * Math.exp(-(((x - bx) / 3.8) ** 2 + ((z - rowZ(9.2)) / 1.8) ** 2));
    return lerp(-3.2, h, land);
  }
  function terrainH(x, z) {
    let h = rawH(x, z);
    const r = roadInfo(x, z);
    if (r && !r.bridge && r.d < 2.6) h = lerp(h, r.y - 0.06, smooth(2.6, ROAD_W * 0.62, r.d));
    const w = waterDepth(x, z); if (w > 0) h = lerp(h, -0.75, w);
    return h;
  }

  // ---------------- Shared helpers ----------------
  const matCache = {};
  function mat(color, o) { const k = color + JSON.stringify(o || {}); return matCache[k] || (matCache[k] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0 }, o || {}))); }
  function mesh(geo, m, x, y, z, shadow) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); if (shadow !== false) { o.castShadow = true; o.receiveShadow = true; } return o; }
  function canvasTex(w, h, draw, srgb) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (srgb !== false) t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; }
  const FONT = '"Be Vietnam Pro", system-ui, sans-serif';
  const glowTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const puffTex = canvasTex(128, 128, (g, w) => { for (let i = 0; i < 9; i++) { const x = 30 + Math.random() * 68, y = 40 + Math.random() * 48, r = 20 + Math.random() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); } });

  // Vietnamese hip roof with upturned corners.
  // Tiled roofs and gables come from art.js so the board and the vignettes share one look.
  const roofVN = (w, d, h, color, curl) => window.DDArt.roofVN(w, d, h, color, curl);
  const gable = (w, h, d, color) => window.DDArt.gable(w, h, d, color);
  function sign(text, w) {
    const tex = canvasTex(512, 128, (g, cw, ch) => {
      g.fillStyle = '#7a2418'; roundRect(g, 4, 4, cw - 8, ch - 8, 26); g.fill();
      g.strokeStyle = '#e7bf5a'; g.lineWidth = 7; roundRect(g, 12, 12, cw - 24, ch - 24, 20); g.stroke();
      g.fillStyle = '#fbe3a0'; g.font = '800 58px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 3);
    });
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false })); sp.scale.set(w || 2.6, (w || 2.6) / 4, 1); sp.renderOrder = 5; return sp;
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ======================================================================
  function build(scene, renderer, opts) {
    const quality = opts.quality || 'high';
    const animated = [];           // {update(dt, t)}
    const glows = [];              // lantern/window glow sprites with base opacity
    const lanternMats = [], windowMats = [];
    const occupied = [];           // [x, z, r] areas reserved for set pieces
    const reserve = (x, z, r) => occupied.push([x, z, r]);
    const isFree = (x, z, r) => occupied.every(([ox, oz, or]) => Math.hypot(x - ox, z - oz) > r + or);
    const world = new T.Group(); scene.add(world);
    const plan = { round: [], pine: [], blossom: [], flame: [], bush: [], flower: [] };
    const add = (o) => { world.add(o); return o; };

    // ---------- Sky dome ----------
    const skyU = { top: { value: new T.Color() }, horizon: { value: new T.Color() }, bottom: { value: new T.Color() }, sunColor: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) } };
    const sky = new T.Mesh(new T.SphereGeometry(420, 32, 16), new T.ShaderMaterial({
      uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 top, horizon, bottom, sunColor; uniform vec3 sunDir; varying vec3 vW; void main(){ vec3 d = normalize(vW - cameraPosition); float y = d.y; vec3 c = y > 0. ? mix(horizon, top, pow(clamp(y,0.,1.), .55)) : mix(horizon, bottom, pow(clamp(-y,0.,1.), .35)); float s = max(dot(d, normalize(sunDir)), 0.); c += sunColor * (pow(s, 900.) * 3. + pow(s, 14.) * .35 + pow(s, 3.) * .08); gl_FragColor = vec4(c, 1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}',
    }));
    sky.renderOrder = -10; scene.add(sky);

    // ---------- Lights ----------
    const hemi = new T.HemisphereLight(0xffffff, 0x666644, 0.7); scene.add(hemi);
    const sun = new T.DirectionalLight(0xffffff, 1.2); sun.castShadow = quality !== 'low';
    const sm = quality === 'high' ? 3072 : 1024; sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 120 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);
    scene.fog = new T.Fog(0xffffff, 40, 120);

    // Reflections for water, glass and gold: a PMREM of a neutral sky.
    let envMap = null;
    try {
      const envScene = new T.Scene(); const es = sky.clone(); es.material = sky.material.clone();
      es.material.uniforms.top.value.set('#6fa9d9'); es.material.uniforms.horizon.value.set('#eadfcf'); es.material.uniforms.bottom.value.set('#4a6b78'); es.material.uniforms.sunColor.value.set('#ffffff'); es.material.uniforms.sunDir.value.set(0.4, 0.6, 0.3);
      envScene.add(es); const pm = new T.PMREMGenerator(renderer); envMap = pm.fromScene(envScene, 0.02).texture; pm.dispose();
    } catch (e) { envMap = null; }
    const gold = new T.MeshStandardMaterial({ color: '#f0bf55', metalness: 0.55, roughness: 0.32, envMap, envMapIntensity: 1.3, emissive: '#3a2400', emissiveIntensity: 0.25 });
    const glass = (tex) => new T.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.18, envMap, envMapIntensity: 1.2 });

    // ---------- Terrain ----------
    const TW = 70, TD = 92, SEG = quality === 'low' ? 150 : 230;
    const tg = new T.PlaneGeometry(TW, TD, SEG, Math.round(SEG * TD / TW)); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, ISL.zc);
    const pos = tg.attributes.position, cols = new Float32Array(pos.count * 3), col = new T.Color(), c2 = new T.Color();
    const C = (h) => c2.set(h);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = terrainH(x, z); pos.setY(i, h);
      const n = fbm(x * 0.6, z * 0.6), r = roadInfo(x, z), land = island(x, z);
      if (h < 0.05) col.set('#d9c99b').lerp(C('#5aa79f'), smooth(0.05, -1.4, h));
      else if (land < 0.97 && h < 1.0) col.set('#ead9a8');
      else {
        col.set('#6fae45').lerp(C('#4f8f36'), n);
        const [th, step] = terraceH(x, z);
        if (th > 0.05) col.set(step % 3 === 0 ? '#9fd0b2' : step % 2 ? '#93c454' : '#aed264').lerp(C('#79ad47'), n * 0.35);
        if (z > rowZ(3.3) + 0.9 && z < rowZ(4.4) - 0.9) col.lerp(C('#4f8c45'), 0.45);                       // Đà Lạt pines
        if (z > CITY.z0 - 0.4 && z < CITY.z1 + 0.4 && Math.abs(x) < 16) col.set('#bdb5a6').lerp(C('#a39b8d'), n); // Sài Gòn paving
        if (z > rowZ(2.2) + 0.9 && z < rowZ(3.3) - 0.9 && Math.abs(x) < 16) col.lerp(C('#c8b986'), 0.35);   // Hội An earth
        if (h > 3.2) col.lerp(C('#8a8f7c'), smooth(3.2, 6, h));                                            // rock
        if (h > 6.5) col.lerp(C('#f4f4f0'), smooth(6.5, 7.6, h));                                           // peak
        if (r && r.d < 1.45 && !r.bridge) col.lerp(C('#c7a87a'), smooth(1.45, 1.0, r.d) * 0.8);             // shoulder
      }
      cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
    }
    tg.setAttribute('color', new T.BufferAttribute(cols, 3)); tg.computeVertexNormals();
    const detail = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, w, w); for (let i = 0; i < 5000; i++) { const v = 200 + Math.random() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); } });
    detail.wrapS = detail.wrapT = T.RepeatWrapping; detail.repeat.set(28, 36);
    const terrain = new T.Mesh(tg, new T.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 0.95 }));
    terrain.receiveShadow = true; add(terrain);

    // ---------- Water ----------
    const wn = canvasTex(256, 256, (g, w) => {
      const img = g.createImageData(w, w), H = (x, y) => Math.sin(x * 0.098) * Math.cos(y * 0.073) + 0.6 * Math.sin((x + y) * 0.21) + 0.35 * Math.cos(x * 0.31 - y * 0.27);
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1); const k = (y * w + x) * 4; img.data[k] = 128 + dx * 60; img.data[k + 1] = 128 + dy * 60; img.data[k + 2] = 255; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0);
    }, false);
    wn.wrapS = wn.wrapT = T.RepeatWrapping; wn.repeat.set(60, 60);
    const waterMat = new T.MeshStandardMaterial({ color: '#1f7fa6', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.8, normalMap: wn, normalScale: new T.Vector2(0.45, 0.45), envMap, envMapIntensity: 1.0 });
    const water = new T.Mesh(new T.PlaneGeometry(800, 800), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = 0.02; water.receiveShadow = true; add(water);
    animated.push({ update(dt) { wn.offset.x += dt * 0.006; wn.offset.y += dt * 0.004; } });

    // ---------- Road ----------
    const paver = canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#8c7a62'; g.fillRect(0, 0, w, w);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { const ox = (y % 2) * 21; const v = 190 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v - 18},${v - 45})`; roundRect(g, x * 43 + ox - 20, y * 32 + 2, 40, 28, 6); g.fill(); }
    });
    paver.wrapS = paver.wrapT = T.RepeatWrapping;
    const goldDeck = new T.MeshStandardMaterial({ color: '#d7a640', metalness: 0.75, roughness: 0.3, envMap, envMapIntensity: 1.0 });
    function ribbon(curve, width, y0, material, uvScale) {
      const n = Math.max(8, Math.ceil(curve.getLength() / 0.18)), P = [], UV = [], I = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, p = curve.getPoint(u), tg2 = curve.getTangent(u); const side = new T.Vector3(-tg2.z, 0, tg2.x).normalize().multiplyScalar(width / 2);
        P.push(p.x - side.x, p.y + y0, p.z - side.z, p.x + side.x, p.y + y0, p.z + side.z);
        const v = u * curve.getLength() / (uvScale || 1.6); UV.push(0, v, 1, v);
        if (i < n) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
      const m = new T.Mesh(g, material); m.receiveShadow = true; return m;
    }
    const roadMat = new T.MeshStandardMaterial({ map: paver, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 });
    const curbMat = new T.MeshStandardMaterial({ color: '#efe4cc', roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1 });
    Object.keys(curves).forEach((k) => {
      const c = curves[k], [a, b] = k.split('-').map(Number), onBridge = lift(L.TILES[a]) > 0 || lift(L.TILES[b]) > 0;
      add(ribbon(c, ROAD_W + 0.24, 0.035, onBridge ? goldDeck : curbMat));
      add(ribbon(c, ROAD_W, 0.05, onBridge ? goldDeck : roadMat));
      if (onBridge) { // Golden Bridge rails and deck underside
        for (const s of [-1, 1]) {
          const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, p = c.getPoint(u), t2 = c.getTangent(u); pts.push(p.add(new T.Vector3(-t2.z, 0, t2.x).normalize().multiplyScalar(s * (ROAD_W / 2 + 0.08))).add(new T.Vector3(0, 0.42, 0))); }
          const rail = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.045, 8), gold); add(rail);
          for (let i = 0; i <= 24; i += 2) { const post = mesh(new T.CylinderGeometry(0.03, 0.03, 0.4, 6), gold, pts[i].x, pts[i].y - 0.2, pts[i].z); add(post); }
        }
        const under = ribbon(c, ROAD_W + 0.24, -0.12, new T.MeshStandardMaterial({ color: '#8c6a2a', metalness: 0.4, roughness: 0.5, side: T.DoubleSide })); under.castShadow = true; add(under);
      }
    });

    // ---------- Tiles ----------
    const STYLE = {
      start: ['#3f9b83', '►'], payday: ['#d39f2a', '₫'], event: ['#b23a2e', '?'], happy: ['#cf5f82', '★'], baby: ['#2f9a9a', '✿'], tax: ['#62504a', '%'],
      invest: ['#8b5aa8', '↗'], gift: ['#c88a2c', '✉'], raise: ['#3b8f6c', '▲'], career: ['#5a6fb0', '⇄'], fork: ['#8a5a32', 'Y'], contest: ['#e0861e', 'TROPHY'], duel: ['#5b4bb0', 'VS'],
    };
    const ASP_LOOK = { love: ['#d9577a', '♥'], know: ['#3f7fc4', '◆'], health: ['#3f9a62', '✚'], comm: ['#c9971f', '★'] };
    const mainAspect = (t) => ['love', 'know', 'health', 'comm'].reduce((b, k) => ((t[k] || 0) > (t[b] || 0) ? k : b), 'love');
    const look = (t) => (t.type === 'happy' ? ASP_LOOK[mainAspect(t)] : t.type === 'money' ? [t.cash >= 0 ? '#3b8f6c' : '#bf3b2f', t.cash >= 0 ? '+' : '−'] : STYLE[t.type] || ['#777', '']);
    const faceTex = {};
    function face(color, glyph) {
      const k = color + glyph; if (faceTex[k]) return faceTex[k];
      return (faceTex[k] = canvasTex(256, 256, (g) => {
        const gr = g.createRadialGradient(110, 100, 10, 128, 128, 128); gr.addColorStop(0, new T.Color(color).lerp(new T.Color('#ffffff'), 0.25).getStyle()); gr.addColorStop(1, color);
        g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,236,180,.95)'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke();
        g.fillStyle = '#fff8ea'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
        if (glyph === 'TROPHY') { // cup, handles, stem, base
          g.beginPath(); g.moveTo(84, 70); g.lineTo(172, 70); g.quadraticCurveTo(170, 140, 128, 150); g.quadraticCurveTo(86, 140, 84, 70); g.fill();
          g.lineWidth = 12; g.strokeStyle = '#fff8ea'; g.beginPath(); g.arc(80, 98, 20, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(176, 98, 20, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
          g.fillRect(118, 148, 20, 26); g.fillRect(94, 174, 68, 16);
        } else { g.font = (glyph === 'VS' ? '800 92px ' : '800 118px ') + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 128, 136); }
      }));
    }
    const rimGeo = new T.LatheGeometry([new T.Vector2(0.0, 0), new T.Vector2(0.78, 0), new T.Vector2(0.84, 0.05), new T.Vector2(0.86, 0.14), new T.Vector2(0.82, 0.2), new T.Vector2(0.0, 0.2)], 48);
    const topGeo = new T.CircleGeometry(0.8, 48); topGeo.rotateX(-Math.PI / 2);
    const pickables = [], tileMeshes = [];
    const topOf = (id) => tilePos[id].y + (L.TILES[id].type === 'stop' ? 0.36 : 0.26);
    L.TILES.forEach((t, i) => {
      const p = tilePos[i]; let m;
      if (t.type === 'stop') {
        const shape = new T.Shape(); const w = 1.25, d = 1.0, r = 0.35; shape.moveTo(-w + r, -d); shape.lineTo(w - r, -d); shape.quadraticCurveTo(w, -d, w, -d + r); shape.lineTo(w, d - r); shape.quadraticCurveTo(w, d, w - r, d); shape.lineTo(-w + r, d); shape.quadraticCurveTo(-w, d, -w, d - r); shape.lineTo(-w, -d + r); shape.quadraticCurveTo(-w, -d, -w + r, -d);
        const g = new T.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 }); g.rotateX(-Math.PI / 2);
        m = mesh(g, gold, p.x, p.y + 0.05, p.z);
        const y = tangents[i]; m.rotation.y = -Math.atan2(y.z, y.x);
      } else {
        const [c, gl] = look(t);
        m = new T.Group(); m.position.copy(p).add(new T.Vector3(0, 0.05, 0));
        const rim = mesh(rimGeo, mat(new T.Color(c).multiplyScalar(0.62).getStyle(), { roughness: 0.4, metalness: 0.15 })); m.add(rim);
        const top = mesh(topGeo, new T.MeshStandardMaterial({ map: face(c, gl), roughness: 0.42, metalness: 0.05 }), 0, 0.205, 0); m.add(top);
        m.traverse((o) => { o.userData.tile = i; });
      }
      m.userData.tile = i; add(m); tileMeshes.push(m); pickables.push(m);
    });

    // ---------- Set-piece builders ----------
    const cream = mat('#f1e4c8'), wood = mat('#6e4326'), darkWood = mat('#4a2b19'), tileRoof = '#6b3a2a', red = '#b8322a';
    function lantern(color, x, y, z, parent, s) {
      s = s || 1; const lm = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 }); lanternMats.push(lm);
      const l = mesh(new T.SphereGeometry(0.11 * s, 14, 10), lm, x, y, z, false); l.scale.y = 1.25; parent.add(l);
      const gsp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); gsp.position.set(x, y, z); gsp.scale.setScalar(0.9 * s); parent.add(gsp); glows.push({ sp: gsp, base: 0.85, ph: rnd() * 6 });
      return l;
    }
    function khueVanCac() {
      const g = new T.Group();
      g.add(mesh(new T.BoxGeometry(1.8, 0.12, 1.5), mat('#cdbb96'), 0, 0.06, 0));
      for (const [x, z] of [[-0.62, -0.5], [0.62, -0.5], [-0.62, 0.5], [0.62, 0.5]]) g.add(mesh(new T.BoxGeometry(0.34, 1.0, 0.34), mat('#d9c9a6'), x, 0.6, z));
      g.add(mesh(new T.BoxGeometry(1.55, 0.14, 1.25), mat('#cfbe98'), 0, 1.15, 0));
      const top = new T.Group(); top.position.y = 1.22; g.add(top);
      top.add(mesh(new T.BoxGeometry(1.05, 0.62, 0.9), mat('#7a3b22'), 0, 0.31, 0));
      const win = canvasTex(128, 128, (c) => { c.fillStyle = '#7a3b22'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#f2c94c'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 40, 0, 7); c.stroke(); for (let a = 0; a < 16; a++) { c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a * Math.PI / 8) * 40, 64 + Math.sin(a * Math.PI / 8) * 40); c.stroke(); } });
      for (const z of [0.452, -0.452]) { const w = mesh(new T.PlaneGeometry(0.44, 0.44), new T.MeshStandardMaterial({ map: win, side: T.DoubleSide }), 0, 0.33, z, false); top.add(w); }
      const r1 = roofVN(1.75, 1.5, 0.32, tileRoof); r1.position.y = 1.18; g.add(r1);
      const r2 = roofVN(1.4, 1.15, 0.45, tileRoof); r2.position.y = 1.86; g.add(r2);
      return g;
    }
    function glassTower(h, w, color) {
      const tex = canvasTex(64, 256, (c, cw, ch) => { c.fillStyle = color || '#3d6d8f'; c.fillRect(0, 0, cw, ch); for (let y = 4; y < ch; y += 10) for (let x = 3; x < cw; x += 10) { c.fillStyle = Math.random() < 0.25 ? '#ffe7a8' : '#9cc8e8'; c.fillRect(x, y, 6, 6); } });
      tex.repeat.set(1, h / 3); tex.wrapT = T.RepeatWrapping;
      const m = glass(tex); m.emissive = new T.Color('#ffd78a'); m.emissiveMap = tex; m.emissiveIntensity = 0.15; windowMats.push(m);
      return mesh(new T.BoxGeometry(w, h, w), m, 0, h / 2, 0);
    }
    function officeTower() {
      const g = new T.Group();
      const a = glassTower(2.6, 0.7, '#3c6f93'); a.position.x = -0.35; a.scale.set(1, 1, 0.9); g.add(a);
      const b = glassTower(1.9, 0.65, '#466c86'); b.position.x = 0.45; g.add(b);
      g.add(mesh(new T.CylinderGeometry(0.02, 0.02, 0.6, 6), mat('#cccccc', { metalness: 0.8 }), -0.35, 2.9, 0));
      g.add(mesh(new T.BoxGeometry(1.8, 0.1, 1.0), mat('#cfc7b8'), 0, 0.05, 0));
      return g;
    }
    function weddingHall() {
      const g = new T.Group();
      g.add(mesh(new T.BoxGeometry(1.9, 0.1, 1.3), mat('#9e2a20'), 0, 0.05, 0));
      for (const [x, z] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) g.add(mesh(new T.CylinderGeometry(0.06, 0.06, 1.1, 10), mat('#c0392b', { roughness: 0.4 }), x, 0.6, z));
      const r = roofVN(1.9, 1.3, 0.48, '#a3301f'); r.position.y = 1.15; g.add(r);
      const hy = canvasTex(128, 128, (c) => { c.fillStyle = '#c0392b'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#ffd36b'; c.font = '700 100px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('囍', 64, 70); });
      g.add(mesh(new T.PlaneGeometry(0.45, 0.45), new T.MeshStandardMaterial({ map: hy, side: T.DoubleSide }), 0, 0.75, -0.5, false));
      ['#ff4a3a', '#ffcc33', '#ff4a3a', '#ffcc33', '#ff4a3a'].forEach((c, i) => lantern(c, -0.7 + i * 0.35, 0.95, 0.62, g, 0.9));
      return g;
    }
    function dalatVilla() {
      const g = new T.Group();
      g.add(mesh(new T.BoxGeometry(1.3, 0.85, 0.85), mat('#f3e2bd'), 0, 0.43, 0));
      const r = gable(1.4, 0.55, 1.0, '#9c3f2a'); r.position.y = 0.85; g.add(r);
      g.add(mesh(new T.CylinderGeometry(0.25, 0.25, 1.25, 16), mat('#f6ead0'), 0.62, 0.63, 0.32));
      g.add(mesh(new T.ConeGeometry(0.32, 0.6, 16), mat('#9c3f2a'), 0.62, 1.55, 0.32));
      g.add(mesh(new T.BoxGeometry(0.12, 0.35, 0.12), mat('#a6896b'), -0.4, 1.25, -0.1));
      for (const x of [-0.35, 0.05]) { const wm = new T.MeshStandardMaterial({ color: '#ffe8a8', emissive: '#ffcc66', emissiveIntensity: 0.3 }); windowMats.push(wm); g.add(mesh(new T.BoxGeometry(0.22, 0.26, 0.04), wm, x, 0.5, 0.44, false)); }
      for (let i = 0; i < 9; i++) g.add(mesh(new T.BoxGeometry(0.04, 0.22, 0.04), mat('#ffffff'), -0.8 + i * 0.2, 0.11, 0.72));
      return g;
    }
    function banaCastle() {
      const g = new T.Group();
      g.add(mesh(new T.BoxGeometry(1.5, 0.75, 0.7), mat('#d9cdb4'), 0, 0.38, 0));
      for (const x of [-0.85, 0.85]) { g.add(mesh(new T.CylinderGeometry(0.26, 0.28, 1.3, 16), mat('#e2d6bd'), x, 0.65, 0)); g.add(mesh(new T.ConeGeometry(0.34, 0.75, 16), mat('#3e5a8c'), x, 1.67, 0)); }
      g.add(mesh(new T.CylinderGeometry(0.2, 0.22, 1.6, 16), mat('#e2d6bd'), 0, 0.8, -0.1)); g.add(mesh(new T.ConeGeometry(0.28, 0.8, 16), mat('#3e5a8c'), 0, 2.0, -0.1));
      for (let i = 0; i < 6; i++) g.add(mesh(new T.BoxGeometry(0.12, 0.12, 0.12), mat('#d9cdb4'), -0.6 + i * 0.24, 0.8, 0.3));
      return g;
    }
    function towerPagoda(tiers) {
      const g = new T.Group(); let y = 0, r = 0.62;
      g.add(mesh(new T.CylinderGeometry(0.85, 0.9, 0.18, 8), mat('#cbb994'), 0, 0.09, 0)); y = 0.18;
      for (let i = 0; i < tiers; i++) {
        const h = 0.42 - i * 0.025;
        g.add(mesh(new T.CylinderGeometry(r * 0.78, r * 0.82, h, 8), mat(i % 2 ? '#e9d7ae' : '#f0e0bb'), 0, y + h / 2, 0));
        const roof = mesh(new T.CylinderGeometry(r * 0.55, r * 1.12, 0.14, 8), mat('#8b3a24'), 0, y + h + 0.07, 0); g.add(roof);
        y += h + 0.14; r *= 0.86;
      }
      g.add(mesh(new T.ConeGeometry(0.1, 0.45, 8), gold, 0, y + 0.2, 0));
      return g;
    }
    function workshop() { // vocational workshop with a sawtooth roof and a gear sign
      const g = new T.Group();
      g.add(mesh(new T.BoxGeometry(1.8, 0.8, 1.1), mat('#c9c1b0'), 0, 0.4, 0));
      for (let i = 0; i < 3; i++) { const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(0.6, 0); s.lineTo(0, 0.38); s.lineTo(0, 0); const geo = new T.ExtrudeGeometry(s, { depth: 1.1, bevelEnabled: false }); geo.translate(-0.9 + i * 0.6, 0.8, -0.55); g.add(mesh(geo, mat(i % 2 ? '#5d7f99' : '#6b8fa8', { roughness: 0.5 }))); }
      const door = mesh(new T.BoxGeometry(0.6, 0.55, 0.04), mat('#47566a'), 0, 0.28, 0.56, false); g.add(door);
      const gear = new T.Group(); gear.position.set(0.55, 0.95, 0.6); g.add(gear);
      gear.add(mesh(new T.TorusGeometry(0.16, 0.05, 8, 16), gold));
      for (let k = 0; k < 8; k++) { const tooth = mesh(new T.BoxGeometry(0.08, 0.08, 0.06), gold, Math.cos(k * Math.PI / 4) * 0.23, Math.sin(k * Math.PI / 4) * 0.23, 0); tooth.rotation.z = k * Math.PI / 4; gear.add(tooth); }
      animated.push({ update(dt) { gear.rotation.z -= dt * 0.8; } });
      g.add(mesh(new T.CylinderGeometry(0.08, 0.1, 1.5, 10), mat('#8a7c6a'), -0.65, 1.1, -0.3));
      return g;
    }
    function villageGate() {
      const g = new T.Group();
      for (const x of [-1.15, 1.15]) g.add(mesh(new T.BoxGeometry(0.3, 1.9, 0.3), mat('#d6c6a2'), x, 0.95, 0));
      g.add(mesh(new T.BoxGeometry(2.6, 0.3, 0.4), mat('#d6c6a2'), 0, 1.95, 0));
      const r = roofVN(2.6, 0.55, 0.32, tileRoof); r.position.y = 2.1; g.add(r);
      const s = sign('XUẤT PHÁT', 1.7); s.position.set(0, 1.62, 0.25); g.add(s);
      return g;
    }

    // ---------- Stops: landmark + floating sign ----------
    const STOP_PIECE = { grad: [khueVanCac, 0, 2.3, 'TỐT NGHIỆP'], job: [officeTower, 3.0, 0.6, 'NHẬN VIỆC'], trade: [workshop, 0, -2.2, 'RA NGHỀ'], marry: [weddingHall, 0, -1.95, 'KẾT HÔN'], house: [dalatVilla, 0, -1.9, 'MUA NHÀ'], mid: [banaCastle, 0, 2.1, 'TUỔI 40'], retire: [() => towerPagoda(7), -2.7, 0.3, 'NGHỈ HƯU'] };
    L.TILES.forEach((t, i) => {
      if (t.type === 'stop') {
        const [fn, dx, dz, label] = STOP_PIECE[t.stop], p = tilePos[i];
        const lm = fn(); const x = p.x + dx, z = p.z + dz; lm.position.set(x, Math.max(terrainH(x, z), 0.3), z); if (dz > 0) lm.rotation.y = Math.PI; add(lm); reserve(x, z, 1.4);
        const top = new T.Box3().setFromObject(lm).max.y;
        const s = sign(label, 1.7); s.position.set(x, top + 0.4, z); add(s);
      }
      if (t.type === 'start') { reserve(tilePos[i].x, tilePos[i].z, 2.2); const g = villageGate(); const ahead = tilePos[i].clone().addScaledVector(tangents[i], -1.5); ahead.y = terrainH(ahead.x, ahead.z); g.position.copy(ahead); g.scale.setScalar(0.9); reserve(ahead.x, ahead.z, 1.6); g.rotation.y = Math.atan2(-tangents[i].x, -tangents[i].z); add(g); }
      if (t.type === 'fork') {
        const g = new T.Group(); g.add(mesh(new T.CylinderGeometry(0.05, 0.06, 1.4, 8), wood, 0, 0.7, 0));
        L.TILES[i].next.forEach((n, k) => { const b = sign(L.TILES[n].branch.name, 1.5); b.position.set(0, 1.25 - k * 0.42, 0); g.add(b); });
        const p = tilePos[i]; g.position.set(p.x + 1.3, terrainH(p.x + 1.3, p.z), p.z); add(g); reserve(p.x + 1.3, p.z, 0.6);
      }
    });

    // ---------- Hà Nội: Hồ Gươm, Tháp Rùa, Thê Húc, Chùa Một Cột ----------
    reserve(LAKE.x, LAKE.z, 0); // lake itself is water; trees check height
    (function () {
      const isl = mesh(new T.CylinderGeometry(0.55, 0.75, 0.9, 20), mat('#6f9a4c'), LAKE.x - 2.2, -0.35, LAKE.z); add(isl);
      const tr = new T.Group(); tr.position.set(LAKE.x - 2.2, 0.1, LAKE.z); add(tr);
      [[0.62, 0.42], [0.5, 0.36], [0.36, 0.3]].reduce((y, [w, h]) => { tr.add(mesh(new T.BoxGeometry(w, h, w * 0.7), mat('#e9dcc0'), 0, y + h / 2, 0)); for (const s of [-1, 1]) tr.add(mesh(new T.BoxGeometry(0.1, h * 0.55, 0.02), mat('#3d2b20'), s * w * 0.22, y + h * 0.45, w * 0.351, false)); return y + h; }, 0);
      const trTop = mesh(new T.ConeGeometry(0.2, 0.3, 4), mat('#d8c9a8'), 0, 1.24, 0); trTop.rotation.y = Math.PI / 4; tr.add(trTop);
      const ngoc = new T.Group(); ngoc.position.set(LAKE.x + 3.6, 0, LAKE.z + 0.2); add(ngoc);
      ngoc.add(mesh(new T.CylinderGeometry(0.75, 0.9, 1.2, 20), mat('#6f9a4c'), 0, -0.4, 0));
      ngoc.add(mesh(new T.BoxGeometry(0.9, 0.5, 0.6), mat('#e8cf9a'), 0, 0.45, 0)); const nr = roofVN(1.0, 0.7, 0.3, tileRoof); nr.position.y = 0.7; ngoc.add(nr);
      // Thê Húc: red arched bridge to the south shore
      const a = new T.Vector3(LAKE.x + 3.6, 0.25, LAKE.z + 0.75), b = new T.Vector3(LAKE.x + 3.1, terrainH(LAKE.x + 3.1, LAKE.z + 2.0) + 0.05, LAKE.z + 2.0);
      const arc = new T.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new T.Vector3(0, 0.55, 0)), b);
      for (let i = 0; i <= 14; i++) { const p = arc.getPoint(i / 14), q = arc.getPoint(Math.min(1, i / 14 + 0.07)); const plank = mesh(new T.BoxGeometry(0.5, 0.05, 0.12), mat('#c0322a'), p.x, p.y, p.z); plank.lookAt(q); plank.rotateY(Math.PI / 2); add(plank); }
      for (const s of [-0.25, 0.25]) { const pts = []; for (let i = 0; i <= 14; i++) pts.push(arc.getPoint(i / 14).add(new T.Vector3(s, 0.22, 0))); add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.025, 6), mat('#c0322a'))); }
      // Chùa Một Cột near the start
      const st = tilePos[0]; const cx = st.x - 1.2, cz = st.z + 2.8;
      add(mesh(new T.CylinderGeometry(0.9, 0.9, 0.06, 24), new T.MeshStandardMaterial({ color: '#3b8fb0', roughness: 0.1, metalness: 0.1, envMap }), cx, terrainH(cx, cz) + 0.03, cz, false));
      const hY = terrainH(cx, cz);
      add(mesh(new T.CylinderGeometry(0.1, 0.12, 0.8, 12), mat('#d9cdb4'), cx, hY + 0.4, cz));
      add(mesh(new T.BoxGeometry(0.55, 0.32, 0.55), mat('#8a3b22'), cx, hY + 0.96, cz));
      const mr = roofVN(0.62, 0.62, 0.32, tileRoof, 0.16); mr.position.set(cx, hY + 1.12, cz); add(mr);
      reserve(cx, cz, 1.1);
      // flame trees (phượng) around the lake
      for (let i = 0; i < 22; i++) { const a2 = (i / 22) * Math.PI * 2; const x = LAKE.x + Math.cos(a2) * (LAKE.rx + 0.9), z = LAKE.z + Math.sin(a2) * (LAKE.rz + 0.55); if (roadInfo(x, z).d > 1.2) treeAt('flame', x, z, 0.8 + rnd() * 0.3); }
    })();

    // ---------- Hội An: yellow shophouses, lantern strings, Chùa Cầu, sampans ----------
    const hoianZ = (rowZ(2.2) + rowZ(3.3)) / 2;
    function shophouse(x, z, rot) {
      const g = new T.Group(); const w = 0.75 + rnd() * 0.25, h = 0.65 + rnd() * 0.3;
      const wc = ['#f2c14e', '#f4cf6a', '#eab64a', '#f6d77d'][rnd() * 4 | 0], two = h > 0.82;
      const body = window.DDArt.boxWalls(w, h, 0.7, window.DDArt.wallTex(wc, { cols: 2, rows: two ? 2 : 1, shutter: ['#3f6f5a', '#2f5a7a', '#7a3b26'][rnd() * 3 | 0], door: true }), wc); body.position.y = h / 2; g.add(body);
      if (two) { const rl = window.DDArt.railing(w * 0.9, '#5a3a26', 6); rl.position.set(0, h * 0.5, 0.42); rl.scale.y = 0.6; g.add(rl); }
      const r = gable(w + 0.1, 0.28, 0.86, '#7a3b26'); r.position.y = h; g.add(r);
      g.add(mesh(new T.BoxGeometry(w + 0.05, 0.05, 0.25), mat('#7a3b26'), 0, h * 0.62, 0.45));
      lantern(['#ff4a3a', '#ffcc33', '#ff7a2a', '#d65cff'][rnd() * 4 | 0], 0, h * 0.5, 0.52, g, 0.7);
      g.position.set(x, terrainH(x, z), z); g.rotation.y = rot || 0; add(g); reserve(x, z, 0.5);
    }
    for (let x = -13; x <= 13; x += 0.95) {
      if (Math.abs(x - CANAL_X) < 1.1 || Math.abs(x) < 1.6) continue;
      const z = hoianZ + (rnd() - 0.5) * 0.25; if (roadInfo(x, z).d > 0.95) shophouse(x, z, rnd() < 0.5 ? 0 : Math.PI);
    }
    // lantern strings over the Hội An street (between houses)
    for (let k = 0; k < 7; k++) {
      const x0 = -12 + k * 3.6, x1 = x0 + 2.6; const z = hoianZ + 0.55; const y0 = terrainH(x0, z) + 1.0, y1 = terrainH(x1, z) + 1.0;
      for (let i = 1; i < 9; i++) { const u = i / 9; lantern(['#ff4a3a', '#ffcc33', '#ff7a2a', '#ff4a3a', '#c75cff'][i % 5], lerp(x0, x1, u), lerp(y0, y1, u) - Math.sin(u * Math.PI) * 0.3, z, world, 0.6); }
    }
    function bridgeOver(rowA, rowB, covered) { // a bridge piece where the canal crosses the road between two tiles
      const c = curves[rowA + '-' + rowB]; if (!c) return; let best = 0, bd = 9;
      for (let i = 0; i <= 50; i++) { const p = c.getPoint(i / 50); if (Math.abs(p.x - CANAL_X) < bd) { bd = Math.abs(p.x - CANAL_X); best = i / 50; } }
      const p = c.getPoint(best), tg2 = c.getTangent(best), g = new T.Group(); g.position.copy(p); g.rotation.y = -Math.atan2(tg2.z, tg2.x); add(g);
      g.add(mesh(new T.BoxGeometry(1.5, 0.22, ROAD_W + 0.3), mat('#a47a52'), 0, -0.05, 0));
      for (const s of [-1, 1]) g.add(mesh(new T.BoxGeometry(1.5, 0.22, 0.08), mat(covered ? '#8a4a2a' : '#cfc2a8'), 0, 0.15, s * (ROAD_W / 2 + 0.1)));
      if (covered) { // Chùa Cầu
        for (const [x, s] of [[-0.65, -1], [0.65, -1], [-0.65, 1], [0.65, 1]]) g.add(mesh(new T.CylinderGeometry(0.05, 0.05, 0.9, 8), mat('#7a3b26'), x, 0.5, s * (ROAD_W / 2 + 0.1)));
        const r = roofVN(1.7, ROAD_W + 0.5, 0.45, '#7a3b26', 0.18); r.position.y = 0.95; r.rotation.y = 0; g.add(r);
        lantern('#ff4a3a', -0.4, 0.75, 0, g, 0.7); lantern('#ffcc33', 0.4, 0.75, 0, g, 0.7);
      }
      for (const s of [-0.55, 0.55]) g.add(mesh(new T.CylinderGeometry(0.12, 0.14, 1.4, 10), mat('#8d8070'), s, -0.75, 0));
    }
    const rowTile = (y, x) => L.TILES.findIndex((t) => Math.abs(t.y - y) < 0.01 && Math.abs(t.x - x) < 0.01);
    bridgeOver(rowTile(3.3, 7), rowTile(3.3, 6), true);
    bridgeOver(rowTile(4.4, 6), rowTile(4.4, 7), false);
    function sampan(color) {
      const g = new T.Group(); const hull = mesh(new T.CylinderGeometry(0.18, 0.12, 1.0, 10, 1, false, 0, Math.PI), mat('#5b3a22', { side: T.DoubleSide })); hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2; hull.rotation.order = 'YZX'; g.add(hull);
      const roof = mesh(new T.CylinderGeometry(0.2, 0.2, 0.4, 10, 1, true, 0, Math.PI), mat('#3d3326', { side: T.DoubleSide })); roof.rotation.x = Math.PI / 2; roof.position.y = 0.08; g.add(roof);
      if (color) lantern(color, 0.42, 0.25, 0, g, 0.6); return g;
    }
    [[CANAL_X, rowZ(4.4) + 1.6], [CANAL_X, rowZ(3.3) - 1.2], [POND.x - 0.6, POND.z], [POND.x + 0.5, POND.z + 0.2]].forEach(([x, z], i) => {
      const b = sampan(['#ff4a3a', '#ffcc33', '#ff7a2a', '#d65cff'][i]); b.position.set(x, 0.04, z); b.rotation.y = Math.PI / 2; add(b);
      animated.push({ update(dt, t) { b.position.y = 0.04 + Math.sin(t * 1.6 + i) * 0.025; b.rotation.z = Math.sin(t * 1.2 + i) * 0.04; } });
    });

    // ---------- Vịnh: karst islands and junk boats ----------
    function karst(x, z, h, r) {
      const g = new T.IcosahedronGeometry(1, 2); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i); const k = 0.75 + 0.5 * vnoise(vx * 2 + x, vz * 2 + z + vy); p.setXYZ(i, vx * r * k * (vy > 0 ? 1 - vy * 0.35 : 1), vy > 0 ? vy * h : vy * 0.6, vz * r * k * (vy > 0 ? 1 - vy * 0.35 : 1)); }
      g.computeVertexNormals();
      const m = mesh(g, mat('#7f8a74', { flatShading: true, roughness: 0.9 }), x, 0, z); add(m);
      const cap = mesh(new T.IcosahedronGeometry(r * 0.62, 1), mat('#4f7f3a', { flatShading: true }), x, h * 0.92, z); cap.scale.y = 0.45; add(cap);
    }
    [[BAY.x - 3.6, BAY.z, 1.6, 0.55], [BAY.x - 1.6, BAY.z + 0.5, 2.1, 0.6], [BAY.x + 0.8, BAY.z - 0.3, 1.4, 0.5], [BAY.x + 3.2, BAY.z + 0.4, 1.9, 0.55], [BAY.x + 4.8, BAY.z - 0.2, 1.2, 0.42]].forEach((a) => karst(...a));
    for (let i = 0; i < (quality === 'low' ? 14 : 30); i++) { const a = rnd() * Math.PI * 2, R = 27 + rnd() * 14; const x = Math.cos(a) * R * 1.05, z = Math.sin(a) * R; if (Math.abs(z) > 30 && Math.abs(x) < 12) continue; karst(x, z, 2 + rnd() * 3.5, 0.8 + rnd() * 1.2); }
    function junk() {
      const g = new T.Group();
      const hull = mesh(new T.BoxGeometry(1.4, 0.3, 0.45), mat('#5a3620'), 0, 0.12, 0); g.add(hull);
      g.add(mesh(new T.BoxGeometry(0.5, 0.25, 0.4), mat('#7a4a2a'), -0.35, 0.38, 0));
      const sailTex = canvasTex(64, 128, (c) => { c.fillStyle = '#b5462b'; c.fillRect(0, 0, 64, 128); c.strokeStyle = 'rgba(60,20,10,.6)'; c.lineWidth = 3; for (let y = 12; y < 128; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(64, y); c.stroke(); } });
      [[-0.2, 1.0, 0.85], [0.35, 0.8, 0.65]].forEach(([x, h, w]) => { g.add(mesh(new T.CylinderGeometry(0.02, 0.02, h + 0.3, 6), darkWood, x, 0.3 + h / 2, 0)); const s = mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: sailTex, side: T.DoubleSide, roughness: 0.9 }), x + 0.05, 0.4 + h / 2, 0.02); s.rotation.y = 0.3; g.add(s); });
      return g;
    }
    for (let i = 0; i < 6; i++) {
      const b = junk(), inBay = i < 2, R = 25 + i * 1.8, sp = (0.025 + rnd() * 0.02) * (i % 2 ? 1 : -1), ph = rnd() * 6;
      add(b);
      animated.push({ update(dt, t) {
        if (inBay) { const a = t * 0.08 + i * 3; b.position.set(BAY.x + Math.cos(a) * (BAY.rx - 1.2), 0.03, BAY.z + Math.sin(a) * (BAY.rz - 0.6)); b.rotation.y = -a - Math.PI / 2; b.scale.setScalar(0.55); }
        else { const a = ph + t * sp; b.position.set(Math.cos(a) * R * 1.05, 0.03 + Math.sin(t * 1.3 + i) * 0.04, Math.sin(a) * R); b.rotation.y = -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2); }
        b.rotation.z = Math.sin(t * 1.1 + i) * 0.05;
      } });
    }

    // ---------- Sapa: stilt houses on terraces ----------
    function stiltHouse(x, z) {
      const g = new T.Group(); const y = terrainH(x, z);
      for (const [sx, sz] of [[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]]) g.add(mesh(new T.CylinderGeometry(0.035, 0.035, 0.4, 6), wood, sx, 0.2, sz));
      g.add(mesh(new T.BoxGeometry(0.85, 0.4, 0.62), mat('#8a5a34'), 0, 0.6, 0));
      const r = roofVN(0.9, 0.66, 0.42, '#c9a865', 0.06); r.position.y = 0.8; g.add(r);
      g.position.set(x, y, z); g.rotation.y = rnd() * 6; add(g); reserve(x, z, 0.6);
    }
    for (let i = 0; i < 9; i++) { const x = SAPA.x0 + 2 + rnd() * (SAPA.x1 - SAPA.x0 - 3), z = lerp(SAPA.z0 + 0.6, SAPA.z1 - 0.6, rnd()); if (roadInfo(x, z).d > 1.4 && isFree(x, z, 0.7)) stiltHouse(x, z); }

    // ---------- Sài Gòn skyline ----------
    (function () {
      const cz = (CITY.z0 + CITY.z1) / 2;
      // bundled tower, tallest on the west edge so it does not hide the road
      const lm = new T.Group(); lm.position.set(-11.5, terrainH(-11.5, cz), cz); add(lm); reserve(-11.5, cz, 1.3);
      [[0, 0, 5.2], [0.42, 0, 4.2], [-0.42, 0, 4.4], [0, 0.42, 3.6], [0, -0.42, 3.9], [0.42, 0.42, 2.9], [-0.42, -0.42, 3.1], [0.42, -0.42, 2.5], [-0.42, 0.42, 2.7]].forEach(([x, z, h]) => { const t2 = glassTower(h, 0.42, '#5d7f99'); t2.position.set(x, h / 2, z); lm.add(t2); });
      lm.add(mesh(new T.ConeGeometry(0.2, 0.9, 4), mat('#dfe6ea', { metalness: 0.8 }), 0, 5.6, 0));
      // lens tower with helipad
      const bt = new T.Group(); bt.position.set(11.8, terrainH(11.8, cz), cz); add(bt); reserve(11.8, cz, 1.0);
      const lens = mesh(new T.CylinderGeometry(0.3, 0.55, 4.4, 24), glass(canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#6a8aa0'; c.fillRect(0, 0, w, h); c.fillStyle = '#c9e3f2'; for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2); })), 0, 2.2, 0); lens.scale.z = 0.65; bt.add(lens);
      const pad = mesh(new T.CylinderGeometry(0.55, 0.55, 0.06, 24), mat('#c9c2b4'), 0.25, 3.2, 0); bt.add(pad);
      for (let x = -9.4; x <= 9.6; x += 1.15) {
        const z = cz + (rnd() - 0.5) * 0.5, d = roadInfo(x, z).d; if (d < 1.25 || !isFree(x, z, 0.5)) continue;
        if (x > BANA.x0 - 0.5 && x < BANA.x1 + 0.5 && z > CITY.z1 - 0.2) continue;
        const h = 0.9 + rnd() * 1.6, w = 0.55 + rnd() * 0.3; const t2 = glassTower(h, w, ['#5d7f99', '#7a8f9e', '#486a84', '#8a7f72'][rnd() * 4 | 0]); t2.position.set(x, terrainH(x, z) + h / 2, z); add(t2); reserve(x, z, w * 0.7);
      }
      // street lights
      for (let x = -13; x <= 13; x += 2.2) { const z = rowZ(7.9) + 1.05; if (roadInfo(x, z).d < 0.95) continue; const y = terrainH(x, z); add(mesh(new T.CylinderGeometry(0.025, 0.025, 0.8, 6), mat('#3a3a3a'), x, y + 0.4, z)); const lm2 = new T.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.8 }); windowMats.push(lm2); add(mesh(new T.SphereGeometry(0.06, 8, 6), lm2, x, y + 0.82, z, false)); const gsp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffd27a', blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); gsp.position.set(x, y + 0.82, z); gsp.scale.setScalar(0.8); add(gsp); glows.push({ sp: gsp, base: 0.6, ph: 0, win: true }); }
    })();

    // ---------- Bà Nà: stone hands holding the Golden Bridge, mist ----------
    function stoneHand(x, z, yTop, side) {
      const g = new T.Group(); const base = terrainH(x, z); const h = Math.max(0.8, yTop - base - 0.25);
      const stone = mat('#8f8c7c', { roughness: 0.95, flatShading: true }), moss = mat('#6c8a4f', { roughness: 1, flatShading: true });
      const arm = mesh(new T.CylinderGeometry(0.34, 0.5, h, 10), stone, 0, h / 2, 0); g.add(arm);
      const palm = mesh(new T.SphereGeometry(0.55, 12, 8), stone, 0, h + 0.05, side * -0.1); palm.scale.set(1.1, 0.45, 0.8); g.add(palm);
      for (let i = 0; i < 4; i++) { const f = new T.Group(); f.position.set(-0.36 + i * 0.24, h + 0.12, side * 0.22); const seg1 = mesh(new T.CapsuleGeometry(0.09, 0.4, 4, 8), stone, 0, 0.25, 0); f.add(seg1); f.rotation.x = side * (0.55 + i * 0.04); g.add(f); }
      const th = mesh(new T.CapsuleGeometry(0.1, 0.35, 4, 8), stone, -0.55, h - 0.05, side * -0.15); th.rotation.z = 0.9; g.add(th);
      for (let i = 0; i < 6; i++) { const mm = mesh(new T.IcosahedronGeometry(0.12 + rnd() * 0.1, 0), moss, (rnd() - 0.5) * 0.6, rnd() * h, (rnd() - 0.5) * 0.5); g.add(mm); }
      g.position.set(x, base, z); add(g);
    }
    (function () {
      const rowY = 9.2, a = rowTile(rowY, 6), b = rowTile(rowY, 7), c = rowTile(rowY, 8);
      [[a, b, 0.5], [b, c, 0.5]].forEach(([i, j, u], k) => { const cv = curves[i + '-' + j]; if (!cv) return; const p = cv.getPoint(u), tg2 = cv.getTangent(u); const n = new T.Vector3(-tg2.z, 0, tg2.x).normalize(); const side = k ? 1 : -1; stoneHand(p.x + n.x * side * 1.05, p.z + n.z * side * 1.05, p.y, side); reserve(p.x + n.x * side * 1.05, p.z + n.z * side * 1.05, 1.0); });
      for (let i = 0; i < 16; i++) { const x = lerp(BANA.x0, BANA.x1, rnd()), z = rowZ(rowY) + (rnd() - 0.5) * 3.2; const sp = new T.Sprite(new T.SpriteMaterial({ map: puffTex, color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false })); sp.position.set(x, terrainH(x, z) + 0.5 + rnd() * 0.6, z); sp.scale.set(2.6, 1.3, 1); add(sp); const ph = rnd() * 6; animated.push({ update(dt, t) { sp.position.x += Math.sin(t * 0.2 + ph) * dt * 0.08; sp.material.opacity = 0.3 + Math.sin(t * 0.3 + ph) * 0.12; } }); }
    })();

    // ---------- Phú Quốc: palms, beach huts, pier, basket boats ----------
    function palm(x, z, s) {
      const g = new T.Group(); const y = terrainH(x, z); const lean = (rnd() - 0.5) * 0.5;
      const pts = []; for (let i = 0; i <= 6; i++) pts.push(new T.Vector3(Math.sin(i / 6 * 1.2) * lean * 1.5, i / 6 * 2.0, 0));
      g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, 0.07, 6), mat('#8a6a46')));
      const crown = new T.Group(); crown.position.copy(pts[6]); g.add(crown);
      const leafG = new T.PlaneGeometry(1.1, 0.26, 4, 1); const lp = leafG.attributes.position; for (let i = 0; i < lp.count; i++) { const lx = lp.getX(i) + 0.55; lp.setX(i, lx); lp.setY(i, lp.getY(i) * (1 - lx / 1.2)); lp.setZ(i, -lx * lx * 0.35); } leafG.computeVertexNormals();
      for (let i = 0; i < 7; i++) { const lf = mesh(leafG, mat('#3f8a3a', { side: T.DoubleSide }), 0, 0, 0); lf.rotation.set(-0.5, (i / 7) * Math.PI * 2, 0, 'YXZ'); crown.add(lf); }
      crown.add(mesh(new T.SphereGeometry(0.1, 8, 6), mat('#5a4a2a'), 0, -0.05, 0));
      g.position.set(x, y, z); g.scale.setScalar(s); g.rotation.y = rnd() * 6; add(g); reserve(x, z, 0.35);
      const ph = rnd() * 6; animated.push({ update(dt, t) { crown.rotation.z = Math.sin(t * 0.9 + ph) * 0.06; crown.rotation.x = Math.cos(t * 0.7 + ph) * 0.05; } });
    }
    for (let i = 0; i < (quality === 'low' ? 25 : 55); i++) {
      const x = (rnd() - 0.5) * 38, z = rowZ(10.6) + rnd() * 12;
      const h = terrainH(x, z); if (h > 0.25 && h < 1.6 && roadInfo(x, z).d > 1.3 && isFree(x, z, 0.4)) palm(x, z, 0.7 + rnd() * 0.4);
    }
    for (let i = 0; i < 8; i++) { const a = Math.PI * (0.15 + rnd() * 0.7), x = Math.cos(a) * 21, z = Math.sin(a) * 30 + 1.8; const thung = mesh(new T.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#5b4426', { side: T.DoubleSide }), x, 0.15, z); add(thung); animated.push({ update(dt, t) { thung.position.y = 0.12 + Math.sin(t * 1.4 + i) * 0.03; } }); }
    (function () { const x = -5, z0 = 28.2; for (let i = 0; i < 9; i++) { const z = z0 + i * 0.4; add(mesh(new T.BoxGeometry(0.6, 0.05, 0.36), mat('#8a6a46'), x, 0.42, z)); add(mesh(new T.CylinderGeometry(0.04, 0.04, 0.9, 6), wood, x - 0.27, 0.0, z)); add(mesh(new T.CylinderGeometry(0.04, 0.04, 0.9, 6), wood, x + 0.27, 0.0, z)); } })();

    // ---------- Instanced vegetation everywhere else ----------
    // ---------- Your houses: one lot per player west of Bà Nà ----------
    const lots = [], LOT_Z = (rowZ(9.2) + rowZ(11.0)) / 2 - 0.2;
    [-13.4, -10.6, -7.8, -5.0, -2.2, -16.1].forEach((x, i) => {
      const z = LOT_Z + (i % 2 ? 0.25 : -0.25), y = terrainH(x, z), g = new T.Group(); g.position.set(x, y, z); add(g); reserve(x, z, 1.35);
      const pad = mesh(new T.BoxGeometry(2.3, 0.08, 2.3), mat('#c9b48e'), 0, 0.02, 0); g.add(pad);
      for (const [fx, fz, fw, fd] of [[0, -1.15, 2.3, 0.05], [-1.15, 0, 0.05, 2.3], [1.15, 0, 0.05, 2.3], [-0.75, 1.15, 0.8, 0.05], [0.75, 1.15, 0.8, 0.05]]) g.add(mesh(new T.BoxGeometry(fw, 0.18, fd), mat('#f2ead6'), fx, 0.1, fz));
      const pole = mesh(new T.CylinderGeometry(0.02, 0.02, 1.1, 6), mat('#cccccc', { metalness: 0.7 }), 1.0, 0.55, 1.0); g.add(pole);
      const flag = mesh(new T.PlaneGeometry(0.42, 0.26), new T.MeshStandardMaterial({ color: '#ffffff', side: T.DoubleSide }), 1.21, 0.96, 1.0, false); g.add(flag);
      const lot = { g, flag, pole, key: null, model: null, grow: 1 }; pole.visible = flag.visible = false; lots.push(lot);
      animated.push({ update(dt, t) { flag.rotation.y = Math.sin(t * 3 + i) * 0.3; if (lot.model && lot.grow < 1) { lot.grow = Math.min(1, lot.grow + dt * 1.2); const e = 1 - Math.pow(1 - lot.grow, 3); lot.model.scale.setScalar(lot.fit * (0.05 + 0.95 * e)); } } });
    });
    (function () { const s2 = sign('KHU NHÀ CỦA BẠN', 2.2); s2.position.set(-8.4, terrainH(-8.4, LOT_Z) + 2.6, LOT_Z - 1.4); add(s2); })();
    function setHouses(list) { // list[i] = { key, color } | null
      lots.forEach((lot, i) => {
        const h = list[i]; lot.pole.visible = lot.flag.visible = !!(list.length > i);
        if (list.length > i && list[i] !== undefined) lot.flag.material.color.set((h && h.color) || (list[i] && list[i].color) || '#ffffff');
        const key = h && h.key; if (key === lot.key) return;
        if (lot.model) { lot.g.remove(lot.model); lot.model = null; }
        lot.key = key; if (!key) return;
        const m = window.DDArt.house(key, h.color); lot.fit = Math.min(0.55, 2.1 / m.userData.size); m.scale.setScalar(lot.fit * 0.05); m.position.y = 0.06; lot.g.add(m); lot.model = m; lot.grow = h.instant ? 1 : 0;
        if (h.instant) m.scale.setScalar(lot.fit);
      });
    }

    // ---------- Street lamps along the road ----------
    const lampSpots = [];
    Object.keys(curves).forEach((k, ci) => {
      const c = curves[k], len = c.getLength(); if (len < 2) return;
      const [a, b] = k.split('-').map(Number); if (lift(L.TILES[a]) > 0 || lift(L.TILES[b]) > 0) return;
      const p = c.getPointAt(0.5), t2 = c.getTangentAt(0.5), side = (ci % 2 ? 1 : -1) * (ROAD_W / 2 + 0.35);
      const x = p.x - t2.z * side, z = p.z + t2.x * side; if (waterDepth(x, z) > 0.1 || !isFree(x, z, 0.2)) return;
      lampSpots.push([x, terrainH(x, z), z]); reserve(x, z, 0.25);
    });
    (function () {
      const n = lampSpots.length, poleI = new T.InstancedMesh(new T.CylinderGeometry(0.025, 0.035, 1.1, 6), mat('#3a3a3a', { metalness: 0.6 }), n), armI = new T.InstancedMesh(new T.BoxGeometry(0.28, 0.025, 0.025), mat('#3a3a3a', { metalness: 0.6 }), n);
      const headM = new T.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.5 }); windowMats.push(headM);
      const headI = new T.InstancedMesh(new T.SphereGeometry(0.06, 8, 6), headM, n), d = new T.Object3D();
      lampSpots.forEach(([x, y, z], i) => { d.position.set(x, y + 0.55, z); d.rotation.set(0, 0, 0); d.updateMatrix(); poleI.setMatrixAt(i, d.matrix); d.position.set(x + 0.12, y + 1.1, z); d.updateMatrix(); armI.setMatrixAt(i, d.matrix); d.position.set(x + 0.25, y + 1.06, z); d.updateMatrix(); headI.setMatrixAt(i, d.matrix); });
      [poleI, armI].forEach((m) => { m.castShadow = true; add(m); }); add(headI);
    })();

    // ---------- Villagers going about their day ----------
    const folk = [], FOLK_SPOTS = [[LAKE.x - 4, LAKE.z - LAKE.rz - 0.5, 'nonla'], [LAKE.x + 1, LAKE.z + LAKE.rz + 0.55, null], [LAKE.x - 1, LAKE.z - LAKE.rz - 0.55, null], [-6, hoianZ + 0.6, 'nonla'], [6.5, hoianZ + 0.6, null], [-10, hoianZ + 0.55, null], [2.5, hoianZ + 0.6, 'nonla'], [-9, SAPA.z0 + 1.2, 'nonla'], [-5, SAPA.z0 + 2.0, 'nonla'], [-3, (CITY.z0 + CITY.z1) / 2, null], [6, (CITY.z0 + CITY.z1) / 2 + 0.3, null], [-8, rowZ(12.4) + 2.4, 'nonla'], [2, rowZ(12.4) + 2.6, null], [8, rowZ(11.0) + 1.6, null], [-3, rowZ(4.4) - 1.6, null], [9, rowZ(4.4) - 1.7, 'nonla']];
    FOLK_SPOTS.slice(0, quality === 'low' ? 6 : FOLK_SPOTS.length).forEach(([x, z, hat], i) => {
      if (terrainH(x, z) < 0.25 || roadInfo(x, z).d < 1.05) return;
      const f = window.DDArt.figure({ color: ['#e2483d', '#3fa7a0', '#f2c14e', '#8c7ae6', '#f6ecdb', '#5a9fd4'][i % 6], dress: i % 3 === 1, hat, scale: 0.42 });
      add(f); reserve(x, z, 0.5); const ph = rnd() * 6, dir = rnd() * Math.PI;
      folk.push(f);
      animated.push({ update(dt, t) { const k = Math.sin(t * 0.35 + ph); const px = x + Math.cos(dir) * k * 0.7, pz = z + Math.sin(dir) * k * 0.7; f.position.set(px, terrainH(px, pz), pz); f.rotation.y = -dir + (Math.cos(t * 0.35 + ph) > 0 ? Math.PI / 2 : -Math.PI / 2); window.DDArt.pose.walk(f, t, ph); } });
    });

    const KINDS = {
      round: { trunk: [new T.CylinderGeometry(0.06, 0.09, 0.55, 6), mat('#6b4a2f')], crown: [new T.IcosahedronGeometry(0.42, 1), new T.MeshStandardMaterial({ roughness: 0.8, flatShading: true })], cy: 0.75, colors: ['#3f8a2e', '#4f9a35', '#2f7428', '#5aa23c'], extra: [[0.26, -0.08, 0.1, 0.68], [-0.22, 0.02, -0.14, 0.62], [0.02, 0.3, -0.02, 0.6]] },
      pine: { trunk: [new T.CylinderGeometry(0.05, 0.07, 0.35, 6), mat('#5a3d27')], crown: [new T.ConeGeometry(0.4, 0.8, 8), new T.MeshStandardMaterial({ roughness: 0.85, flatShading: true })], cy: 0.68, colors: ['#2f6b3a', '#336f3c', '#2b5f36'], extra: [[0, 0.34, 0, 0.78], [0, 0.62, 0, 0.55]] },
      blossom: { trunk: [new T.CylinderGeometry(0.05, 0.08, 0.5, 6), mat('#5e3f2c')], crown: [new T.IcosahedronGeometry(0.38, 1), new T.MeshStandardMaterial({ roughness: 0.7, flatShading: true })], cy: 0.7, colors: ['#f4a6c1', '#f7bfd3', '#ee93b3'], extra: [[0.24, -0.06, 0.08, 0.7], [-0.2, 0.04, -0.12, 0.66]] },
      flame: { trunk: [new T.CylinderGeometry(0.06, 0.09, 0.6, 6), mat('#5e3f2c')], crown: [new T.IcosahedronGeometry(0.46, 1), new T.MeshStandardMaterial({ roughness: 0.7, flatShading: true })], cy: 0.78, colors: ['#e0482f', '#ef5a33', '#d63d29'], flat: 0.65, extra: [[0.3, -0.04, 0.1, 0.7], [-0.28, 0.0, -0.08, 0.66]] },
      bush: { trunk: null, crown: [new T.IcosahedronGeometry(0.22, 1), new T.MeshStandardMaterial({ roughness: 0.9, flatShading: true })], cy: 0.14, colors: ['#5c9a45', '#6aaa4f', '#4b8a3d'] },
      flower: { trunk: null, crown: [new T.SphereGeometry(0.07, 6, 4), new T.MeshStandardMaterial({ roughness: 0.6 })], cy: 0.07, colors: ['#ff6fa0', '#ffd34d', '#b77bff', '#ffffff', '#ff8a3d'] },
    };
    function treeAt(kind, x, z, s) { plan[kind].push([x, z, s]); reserve(x, z, 0.3 * s); }
    const N = quality === 'low' ? 600 : 1250; let tries = 0, placed = 0;
    while (placed < N && tries < N * 6) {
      tries++; const x = (rnd() - 0.5) * 46, z = (rnd() - 0.5) * 60 + ISL.zc; const h = terrainH(x, z);
      if (h < 0.3 || island(x, z) < 0.98) continue; const r = roadInfo(x, z); if (!r || r.d < 1.7) continue;
      if (!isFree(x, z, 0.25)) continue;
      if (z > CITY.z0 - 0.3 && z < CITY.z1 + 0.3 && Math.abs(x) < 15) { if (rnd() < 0.85) continue; treeAt('bush', x, z, 1); placed++; continue; }
      if (terraceH(x, z)[0] > 0.05 && rnd() < 0.9) continue;
      let kind = 'round';
      const dalat = z > rowZ(3.3) + 0.9 && z < rowZ(4.4) - 0.9;
      if (dalat) kind = rnd() < 0.55 ? 'pine' : rnd() < 0.5 ? 'flower' : rnd() < 0.5 ? 'blossom' : 'bush';
      else if (h > 2.6) kind = rnd() < 0.7 ? 'pine' : 'bush';
      else if (z < rowZ(2.2) + 0.9) kind = rnd() < 0.15 ? 'flame' : rnd() < 0.55 ? 'round' : rnd() < 0.5 ? 'bush' : 'flower';
      else if (z > rowZ(10.6)) kind = rnd() < 0.6 ? 'bush' : 'round';
      else kind = rnd() < 0.5 ? 'round' : rnd() < 0.4 ? 'pine' : rnd() < 0.5 ? 'bush' : 'flower';
      if (kind === 'flower') { for (let k = 0; k < 6; k++) plan.flower.push([x + (rnd() - 0.5) * 0.8, z + (rnd() - 0.5) * 0.8, 0.8 + rnd() * 0.5]); placed += 2; continue; }
      treeAt(kind, x, z, 0.7 + rnd() * 0.6); placed++;
    }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), cc = new T.Color();
    Object.keys(plan).forEach((k) => {
      const list = plan[k], K = KINDS[k]; if (!list.length) return;
      const crown = new T.InstancedMesh(K.crown[0], K.crown[1], list.length); crown.castShadow = k !== 'flower'; crown.receiveShadow = true;
      const trunk = K.trunk ? new T.InstancedMesh(K.trunk[0], K.trunk[1], list.length) : null; if (trunk) { trunk.castShadow = true; trunk.receiveShadow = true; }
      const extras = (K.extra || []).map(() => { const m = new T.InstancedMesh(K.crown[0], K.crown[1], list.length); m.castShadow = true; m.receiveShadow = true; return m; });
      list.forEach(([x, z, s], i) => {
        const y = terrainH(x, z); q.setFromAxisAngle(new T.Vector3(0, 1, 0), rnd() * 6.28);
        if (trunk) { m4.compose(ps.set(x, y + 0.27 * s, z), q, sc.set(s, s, s)); trunk.setMatrixAt(i, m4); }
        m4.compose(ps.set(x, y + K.cy * s, z), q, sc.set(s, s * (K.flat || 1), s)); crown.setMatrixAt(i, m4);
        cc.set(K.colors[(rnd() * K.colors.length) | 0]).offsetHSL(0, 0, (rnd() - 0.5) * 0.06); crown.setColorAt(i, cc);
        (K.extra || []).forEach(([dx, dy, dz, k], e) => {
          const off = new T.Vector3(dx, dy, dz).multiplyScalar(s).applyQuaternion(q);
          m4.compose(ps.set(x + off.x, y + K.cy * s + off.y, z + off.z), q, sc.set(s * k, s * k * (K.flat || 1), s * k)); extras[e].setMatrixAt(i, m4);
          extras[e].setColorAt(i, cc.clone().offsetHSL(0, 0, (e % 2 ? 0.05 : -0.04)));
        });
      });
      add(crown); if (trunk) add(trunk); extras.forEach(add);
    });

    // ---------- Ground cover: grass tufts and stones ----------
    (function () {
      const NT = quality === 'low' ? 900 : 2600, tuft = new T.InstancedMesh(new T.ConeGeometry(0.045, 0.24, 4), new T.MeshStandardMaterial({ roughness: 1 }), NT), d = new T.Object3D(); let n = 0;
      for (let tries2 = 0; n < NT && tries2 < NT * 5; tries2++) {
        const x = (rnd() - 0.5) * 44, z = (rnd() - 0.5) * 58 + ISL.zc, h = terrainH(x, z);
        if (h < 0.35 || h > 3 || island(x, z) < 0.98 || roadInfo(x, z).d < 1.1 || !isFree(x, z, 0.05)) continue;
        if (z > CITY.z0 - 0.3 && z < CITY.z1 + 0.3) continue;
        for (let k = 0; k < 3 && n < NT; k++, n++) { d.position.set(x + (rnd() - 0.5) * 0.12, h + 0.1, z + (rnd() - 0.5) * 0.12); d.rotation.set((rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5); d.scale.setScalar(0.7 + rnd() * 0.7); d.updateMatrix(); tuft.setMatrixAt(n, d.matrix); tuft.setColorAt(n, cc.set(rnd() < 0.5 ? '#5f9a3a' : '#79b04a').offsetHSL(0, 0, (rnd() - 0.5) * 0.08)); }
      }
      tuft.count = n; tuft.receiveShadow = true; add(tuft);
      const NR = quality === 'low' ? 60 : 180, rock = new T.InstancedMesh(new T.DodecahedronGeometry(0.16, 0), new T.MeshStandardMaterial({ color: '#9a978a', roughness: 0.95, flatShading: true }), NR); let m = 0;
      for (let tries2 = 0; m < NR && tries2 < NR * 8; tries2++) {
        const x = (rnd() - 0.5) * 46, z = (rnd() - 0.5) * 60 + ISL.zc, h = terrainH(x, z);
        if (h < 0.05 || roadInfo(x, z).d < 1.2 || !isFree(x, z, 0.1)) continue;
        d.position.set(x, h + 0.03, z); d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); const k = 0.5 + rnd() * 1.4; d.scale.set(k, k * 0.6, k * (0.7 + rnd() * 0.5)); d.updateMatrix(); rock.setMatrixAt(m++, d.matrix);
      }
      rock.count = m; rock.castShadow = true; rock.receiveShadow = true; add(rock);
    })();

    // ---------- Sky life: clouds, birds, petals, fireflies ----------
    const clouds = [];
    for (let i = 0; i < 16; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
      const a = rnd() * Math.PI * 2, R = 34 + rnd() * 30; sp.position.set(Math.cos(a) * R, 10 + rnd() * 9, Math.sin(a) * R); const s = 9 + rnd() * 10; sp.scale.set(s, s * 0.5, 1);
      scene.add(sp); clouds.push({ sp, v: 0.3 + rnd() * 0.5 });
    }
    const shadowClouds = []; const inv = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    for (let i = 0; i < 5; i++) { const c = new T.Group(); for (let k = 0; k < 5; k++) { const p = new T.Mesh(new T.IcosahedronGeometry(1.2 + rnd(), 1), inv); p.position.set(k * 1.4 - 2.8, rnd() * 0.6, (rnd() - 0.5) * 1.6); p.castShadow = true; c.add(p); } c.position.set((rnd() - 0.5) * 60, 14, (rnd() - 0.5) * 40); scene.add(c); shadowClouds.push(c); }
    const birdGeo = new T.BufferGeometry(); birdGeo.setAttribute('position', new T.Float32BufferAttribute([-0.35, 0.1, 0, 0, 0, 0.08, 0, 0, -0.06, 0.35, 0.1, 0], 3)); birdGeo.setIndex([0, 1, 2, 1, 3, 2]); birdGeo.computeVertexNormals();
    const birds = new T.InstancedMesh(birdGeo, new T.MeshBasicMaterial({ color: '#2b2b33', side: T.DoubleSide }), 28); add(birds);
    const birdData = [...Array(28)].map((_, i) => ({ flock: i % 2, ph: rnd() * 6, r: rnd() * 2, h: rnd() * 1.5 }));
    function particles(n, color, size, area) {
      const g = new T.BufferGeometry(), P = new Float32Array(n * 3), V = [];
      for (let i = 0; i < n; i++) { P[i * 3] = lerp(area[0], area[1], rnd()); P[i * 3 + 1] = lerp(area[2], area[3], rnd()); P[i * 3 + 2] = lerp(area[4], area[5], rnd()); V.push(rnd() * 6); }
      g.setAttribute('position', new T.BufferAttribute(P, 3));
      const pts = new T.Points(g, new T.PointsMaterial({ color, size, map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9 })); add(pts); return { pts, V, area };
    }
    const petals = quality === 'low' ? null : particles(160, '#ffc4d8', 0.18, [-15, 15, 0.6, 4, rowZ(3.3) + 0.6, rowZ(4.4) - 0.6]);
    const flies = quality === 'low' ? null : particles(120, '#fff1a1', 0.16, [-16, 16, 0.6, 2.2, rowZ(10.6), rowZ(12.4) + 3]);

    // ---------- Atmosphere blending ----------
    const cur = { top: new T.Color(), horizon: new T.Color(), bottom: new T.Color(), sunC: new T.Color(), sunI: 1, elev: 40, az: 150, hs: new T.Color(), hg: new T.Color(), hi: 0.7, fog: new T.Color(), fn: 40, ff: 120, glow: 0.4, win: 0.2, exposure: 1 };
    function presetTarget(key) {
      const r = REGIONS[key] || REGIONS.hanoi;
      return { top: new T.Color(r.sky[0]), horizon: new T.Color(r.sky[1]), bottom: new T.Color(r.sky[2]), sunC: new T.Color(r.sun[0]), sunI: r.sun[1], elev: r.sun[2], az: r.sun[3], hs: new T.Color(r.hemi[0]), hg: new T.Color(r.hemi[1]), hi: r.hemi[2], fog: new T.Color(r.fog[0]), fn: r.fog[1], ff: r.fog[2], glow: r.glow, win: r.win, exposure: r.exposure };
    }
    let target = presetTarget('hanoi'); Object.assign(cur, presetTarget('hanoi'));
    function applyAtmos(camDist) {
      skyU.top.value.copy(cur.top); skyU.horizon.value.copy(cur.horizon); skyU.bottom.value.copy(cur.bottom); skyU.sunColor.value.copy(cur.sunC);
      const e = cur.elev * Math.PI / 180, a = cur.az * Math.PI / 180, dir = new T.Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a));
      skyU.sunDir.value.copy(dir);
      sun.position.copy(dir).multiplyScalar(60); sun.target.position.set(0, 0, 0); sun.color.copy(cur.sunC); sun.intensity = cur.sunI;
      hemi.color.copy(cur.hs); hemi.groundColor.copy(cur.hg); hemi.intensity = cur.hi * 0.9;
      scene.fog.color.copy(cur.horizon).lerp(cur.fog, 0.6);
      scene.fog.near = camDist + cur.fn * 0.6; scene.fog.far = camDist + cur.ff;
      renderer.toneMappingExposure = cur.exposure * 1.05;
      lanternMats.forEach((m) => (m.emissiveIntensity = 0.35 + cur.glow * 0.9));
      windowMats.forEach((m) => (m.emissiveIntensity = cur.win * 0.6));
    }

    // ---------- Per-frame update ----------
    function update(dt, t, camera, regionKey) {
      if (regionKey) target = presetTarget(regionKey);
      const k = Math.min(1, dt * 1.6);
      ['top', 'horizon', 'bottom', 'sunC', 'hs', 'hg', 'fog'].forEach((n) => cur[n].lerp(target[n], k));
      ['sunI', 'elev', 'az', 'hi', 'fn', 'ff', 'glow', 'win', 'exposure'].forEach((n) => (cur[n] = lerp(cur[n], target[n], k)));
      applyAtmos(camera.position.distanceTo(new T.Vector3(0, 0, 0)) * 0.55);
      sky.position.copy(camera.position);
      animated.forEach((a) => a.update(dt, t));
      glows.forEach((g) => (g.sp.material.opacity = (g.win ? cur.win * 1.2 : cur.glow) * (g.base + Math.sin(t * 3 + g.ph) * 0.08)));
      clouds.forEach((c) => { c.sp.position.x += c.v * dt; if (c.sp.position.x > 70) c.sp.position.x = -70; });
      shadowClouds.forEach((c, i) => { c.position.x += (0.5 + i * 0.1) * dt; if (c.position.x > 40) c.position.x = -40; });
      const dummy = new T.Object3D();
      birdData.forEach((b, i) => {
        const a = t * 0.18 + b.ph * 0.15 + i * 0.04, R = 9 + b.r + b.flock * 6; const cx = b.flock ? 6 : -8, cz = b.flock ? 6 : -10;
        dummy.position.set(cx + Math.cos(a) * R, 7 + b.h + Math.sin(t + i) * 0.2, cz + Math.sin(a) * R * 0.7); dummy.rotation.set(0, -a, 0); const f = 1 + Math.sin(t * 9 + i) * 0.6; dummy.scale.set(1, f, 1); dummy.updateMatrix(); birds.setMatrixAt(i, dummy.matrix);
      });
      birds.instanceMatrix.needsUpdate = true;
      if (petals) { const p = petals.pts.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * 0.35; let x = p.getX(i) + Math.sin(t + petals.V[i]) * dt * 0.4; if (y < 0.5) y = 4; p.setXY(i, x > 15 ? -15 : x, y); } p.needsUpdate = true; petals.pts.material.opacity = 0.7; }
      if (flies) { const p = flies.pts.geometry.attributes.position; for (let i = 0; i < p.count; i++) { p.setY(i, 1 + Math.sin(t * 0.8 + flies.V[i]) * 0.6); p.setX(i, p.getX(i) + Math.cos(t * 0.5 + flies.V[i]) * dt * 0.2); } p.needsUpdate = true; flies.pts.material.opacity = clamp(cur.glow - 0.3, 0, 1); }
    }

    applyAtmos(40);
    return {
      tilePos: (id) => tilePos[id].clone(), topOf, curve: (a, b) => curves[a + '-' + b], tangent: (id) => tangents[id].clone(),
      regionOf: (id) => regionOf(L.TILES[id]), REGIONS, pickables, tileMeshes, update, heightAt: terrainH,
      setQuality(qv) { sun.castShadow = qv !== 'low'; }, setHouses, lotPos: (i) => (lots[i] ? lots[i].g.position.clone() : null),
    };
  }

  window.DDWorld = { build };
})();
