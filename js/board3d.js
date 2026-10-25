// Cảnh 3D: bàn cờ, quân cờ, xúc xắc, nhà, hiệu ứng — Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SPACES, GROUPS, JAIL_INDEX } from './data.js';
import { tileCanvas, centerCanvas, diceFace, sceneCanvas, COORDS, project } from './art.js';

const TW = 1, TD = 1.6, HALF = (9 * TW + 2 * TD) / 2; // 6.1
const wait = ms => new Promise(r => setTimeout(r, ms));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = t => 1 - (1 - t) ** 3;

function canvasTex(cv, aniso = 8) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return t;
}
function spriteTex(kind = 'soft') {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  if (kind === 'square') { c.fillStyle = '#fff'; c.fillRect(8, 16, 48, 32); }
  else if (kind === 'star') {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.2, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff'; c.fillRect(30, 0, 4, 64); c.fillRect(0, 30, 64, 4);
  } else if (kind === 'petal') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(32, 32, 14, 26, 0.5, 0, 7); c.fill(); }
  else { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
  return new THREE.CanvasTexture(cv);
}

export class Board3D {
  constructor(container) {
    this.container = container;
    this.tokens = new Map();
    this.houseMeshes = new Map();
    this.ownerBars = [];
    this.tiles = [];
    this.bursts = [];
    this.anims = [];
    this.camGoal = null;
    this.quality = 'high';
    this.onTileClick = null; this.onTileHover = null;
    this.sound = null;
    this.speed = 1;
  }

  init() {
    const R = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    R.setSize(this.container.clientWidth, this.container.clientHeight);
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(R.domElement);

    const S = this.scene = new THREE.Scene();
    S.background = this._bgTexture();
    S.fog = new THREE.Fog(0x1a0f2e, 30, 70);
    const pm = new THREE.PMREMGenerator(R);
    S.environment = pm.fromScene(new RoomEnvironment(R), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(42, this.container.clientWidth / this.container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 15, 13.5);
    this.controls = new OrbitControls(this.camera, R.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.46; this.controls.minDistance = 4; this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0.5);
    this.controls.addEventListener('start', () => { this.camGoal = null; });

    // Ánh sáng
    S.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2a4a, 0.45));
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 1.9);
    sun.position.set(8, 16, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
    S.add(sun);
    const rim = new THREE.DirectionalLight(0x8fb8ff, 0.6); rim.position.set(-10, 6, -8); S.add(rim);

    this.composer = new EffectComposer(R);
    this.composer.addPass(new RenderPass(S, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.container.clientWidth, this.container.clientHeight), 0.45, 0.4, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.tex = { soft: spriteTex('soft'), star: spriteTex('star'), square: spriteTex('square'), petal: spriteTex('petal') };
    this._buildTable();
    this._buildBoard();
    this._buildCenter();
    this._buildDice();

    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    R.domElement.addEventListener('pointerdown', e => { this._down = [e.clientX, e.clientY]; this._dragged = false; });
    R.domElement.addEventListener('pointerup', e => { if (this._down) this._dragged = Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]) > 6; });
    R.domElement.addEventListener('pointermove', e => this._pointer(e, false));
    R.domElement.addEventListener('click', e => this._pointer(e, true));
    window.addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    R.setAnimationLoop(() => this._frame());
  }

  setQuality(q) {
    this.quality = q;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.renderer.setPixelRatio(q === 'low' ? 1 : Math.min(window.devicePixelRatio, 2));
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 60 : 42;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
  }

  _bgTexture() {
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512; const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#0b0820'); g.addColorStop(0.5, '#2a1240'); g.addColorStop(1, '#4a1e2c');
    c.fillStyle = g; c.fillRect(0, 0, 16, 512);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  _buildTable() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const c = cv.getContext('2d');
    c.fillStyle = '#3a2216'; c.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 400; i++) { c.strokeStyle = `rgba(${20 + Math.random() * 40},${10 + Math.random() * 20},5,${0.15 + Math.random() * 0.2})`; c.lineWidth = 1 + Math.random() * 3; c.beginPath(); const y = Math.random() * 1024; c.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) c.lineTo(x, y + Math.sin(x / 120 + i) * 6); c.stroke(); }
    const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
    const table = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.05 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.62; table.receiveShadow = true;
    this.scene.add(table);
  }

  tileInfo(i) {
    const side = Math.floor(i / 10), k = i % 10;
    const rots = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
    if (k === 0) {
      const p = [[HALF - TD / 2, HALF - TD / 2], [-HALF + TD / 2, HALF - TD / 2], [-HALF + TD / 2, -HALF + TD / 2], [HALF - TD / 2, -HALF + TD / 2]][side];
      return { x: p[0], z: p[1], rot: 0, corner: true };
    }
    const a = HALF - TD - (k - 0.5) * TW, c = HALF - TD / 2;
    const p = [[a, c], [-c, a], [-a, -c], [c, -a]][side];
    return { x: p[0], z: p[1], rot: rots[side], corner: false };
  }
  // chuyển toạ độ cục bộ (trong ô) sang thế giới
  local(i, lx, lz, y = 0) {
    const t = this.tileInfo(i), c = Math.cos(t.rot), s = Math.sin(t.rot);
    return new THREE.Vector3(t.x + lx * c + lz * s, y, t.z - lx * s + lz * c);
  }

  _buildBoard() {
    const B = new THREE.Group(); this.boardGroup = B; this.scene.add(B);
    // đế sơn mài đỏ + viền vàng
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x7a1010, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.3, metalness: 1 });
    const base = new THREE.Mesh(new RoundedBoxGeometry(HALF * 2 + 0.7, 0.5, HALF * 2 + 0.7, 4, 0.12), lacquer);
    base.position.y = -0.3; base.receiveShadow = base.castShadow = true; B.add(base);
    const trim = new THREE.Mesh(new RoundedBoxGeometry(HALF * 2 + 0.9, 0.12, HALF * 2 + 0.9, 3, 0.05), gold);
    trim.position.y = -0.5; B.add(trim);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 0.12, 0.06, HALF * 2 + 0.12), gold);
    inner.position.y = -0.04; B.add(inner);

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x3b2a17, roughness: 0.7 });
    for (let i = 0; i < 40; i++) {
      const info = this.tileInfo(i);
      const w = info.corner ? TD : TW, d = TD;
      const tex = canvasTex(tileCanvas(i));
      const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.35 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.985, 0.08, d * 0.985), [sideMat, sideMat, top, sideMat, sideMat, sideMat]);
      const g = new THREE.Group(); g.position.set(info.x, 0, info.z); g.rotation.y = info.rot;
      mesh.position.y = 0.04; mesh.receiveShadow = true; mesh.userData.tile = i;
      g.add(mesh); B.add(g);
      // dải sở hữu ngoài mép
      let bar = null;
      if (SPACES[i].price) {
        bar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.05, 0.13), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, roughness: 0.4 }));
        bar.position.set(0, 0.0, d / 2 + 0.1); bar.visible = false; g.add(bar);
      }
      this.tiles.push({ group: g, mesh, top, bar });
    }
  }

  _buildCenter() {
    const C = HALF * 2 - TD * 2; // 9
    const tex = canvasTex(centerCanvas(2048), 16);
    const center = new THREE.Mesh(new THREE.PlaneGeometry(C, C), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.35 }));
    center.rotation.x = -Math.PI / 2; center.position.y = 0.005; center.receiveShadow = true;
    this.scene.add(center);
    this.c2w = (u, v) => new THREE.Vector3(-C / 2 + u * C, 0, -C / 2 + v * C);

    // Ghim địa danh trên bản đồ
    this.pins = {};
    const pinGeo = new THREE.SphereGeometry(0.075, 16, 12), stickGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6);
    for (const [idx, [lon, lat]] of Object.entries(COORDS)) {
      const [u, v] = project(lon, lat); const p = this.c2w(u, v);
      const s = SPACES[idx], col = new THREE.Color(s.group ? GROUPS[s.group].color : '#cccccc');
      const g = new THREE.Group(); g.position.copy(p);
      const stick = new THREE.Mesh(stickGeo, new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.3 })); stick.position.y = 0.14;
      const head = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.3 })); head.position.y = 0.3;
      head.castShadow = true;
      g.add(stick, head); this.scene.add(g);
      this.pins[idx] = { g, head, phase: Math.random() * 6 };
    }

    // Mô hình địa danh thu nhỏ
    this._landmarks();

    // Chồng thẻ
    this.decks = {};
    const mk = (key, u, v, art, color) => {
      const p = this.c2w(u, v);
      const g = new THREE.Group(); g.position.copy(p); g.rotation.y = Math.PI / 4;
      const side = new THREE.MeshStandardMaterial({ color: 0xf5ecd5, roughness: 0.8 });
      const topMat = new THREE.MeshStandardMaterial({ map: canvasTex(this._cardBack(art, color)), roughness: 0.5 });
      const stack = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.22, 1.05, 2, 0.03), [side, side, topMat, side, side, side]);
      stack.position.y = 0.11; stack.castShadow = stack.receiveShadow = true;
      g.add(stack); this.scene.add(g);
      this.decks[key] = { g, topMat };
    };
    mk('chest', 0.2, 0.78, 'chest', '#0E7C66');
    mk('chance', 0.8, 0.78, 'chance', '#5b2a86');
  }

  _cardBack(art, color) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 336; const c = cv.getContext('2d');
    c.fillStyle = color; c.fillRect(0, 0, 512, 336);
    c.drawImage(sceneCanvas(art, 512, 336), 0, 0);
    c.strokeStyle = '#f4c542'; c.lineWidth = 12; c.strokeRect(14, 14, 484, 308);
    return cv;
  }

  _landmarks() {
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 1, roughness: 0.25, emissive: 0x553300, emissiveIntensity: 0.4 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9ec3ff, metalness: 0.6, roughness: 0.1, emissive: 0x2244aa, emissiveIntensity: 0.25, clearcoat: 1 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x5b8c6a, roughness: 0.85, flatShading: true });
    const cream = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.7 });
    const roofM = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.6 });
    const at = (lon, lat) => { const [u, v] = project(lon, lat); return this.c2w(u, v); };
    this.landmarkAnim = [];

    // Landmark 81 (TP.HCM)
    const l81 = new THREE.Group();
    [[0.32, 0.55], [0.26, 0.4], [0.2, 0.3], [0.12, 0.2]].reduce((y, [w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), glass); m.position.y = y + h / 2; m.castShadow = true; l81.add(m); return y + h; }, 0);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.02, 0.25), new THREE.MeshStandardMaterial({ color: 0xff3d3d, emissive: 0xff2020, emissiveIntensity: 3 }));
    spire.position.y = 1.57; l81.add(spire);
    l81.position.copy(at(107.6, 10.2)); this.scene.add(l81);

    // Khuê Văn Các / Tháp Rùa (Hà Nội)
    const hn = new THREE.Group();
    [[0.36, 0.14], [0.28, 0.14], [0.2, 0.12]].reduce((y, [w, h]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), cream); m.position.y = y + h / 2; m.castShadow = true; hn.add(m);
      const r = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 0.08, 4), roofM); r.rotation.y = Math.PI / 4; r.position.y = y + h + 0.03; hn.add(r);
      return y + h + 0.05;
    }, 0);
    hn.position.copy(at(104.2, 21.6)); this.scene.add(hn);

    // Vịnh Hạ Long — đảo đá vôi
    const hl = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.CylinderGeometry(0.06 + Math.random() * 0.05, 0.14 + Math.random() * 0.06, 0.3 + Math.random() * 0.35, 7, 3);
      const pos = geo.attributes.position; for (let k = 0; k < pos.count; k++) pos.setX(k, pos.getX(k) * (0.8 + Math.random() * 0.4));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, stone); m.position.set((i - 2) * 0.22 + Math.random() * 0.05, geo.parameters.height / 2, (i % 2) * 0.18); m.castShadow = true; hl.add(m);
    }
    hl.position.copy(at(108.7, 20.3)); this.scene.add(hl);

    // Cầu Rồng (Đà Nẵng) — thân rồng uốn lượn vàng
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector3(t * 1.4 - 0.7, 0.05 + Math.abs(Math.sin(t * Math.PI * 3)) * 0.25, 0)); }
    const dragon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.035, 8), gold);
    dragon.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), gold); head.scale.set(1.5, 1, 1); head.position.set(0.75, 0.12, 0);
    const dg = new THREE.Group(); dg.add(dragon, head); dg.rotation.y = -0.6;
    dg.position.copy(at(109.9, 17.6)); this.scene.add(dg);
    this.dragonHead = head;

    // Thuyền buồm nhỏ trôi trên Biển Đông
    const boat = this._boat(0xb5541f); boat.scale.setScalar(1.6); boat.position.copy(at(111, 13.5)); this.scene.add(boat);
    this.landmarkAnim.push(t => { boat.position.y = Math.sin(t * 1.6) * 0.02; boat.rotation.z = Math.sin(t * 1.2) * 0.08; boat.rotation.y = 0.6 + Math.sin(t * 0.3) * 0.2; });
  }

  _boat(sailColor) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a2e12, roughness: 0.6 }));
    hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2; hull.scale.set(1, 1, 0.5); hull.position.y = 0.1; hull.rotation.x = Math.PI;
    const sailShape = new THREE.Shape(); sailShape.moveTo(0, 0); sailShape.lineTo(0, 0.32); sailShape.quadraticCurveTo(0.16, 0.2, 0.15, 0); sailShape.lineTo(0, 0);
    const sm = new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.8 });
    for (let k = -1; k <= 1; k++) { const s = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), sm); s.position.set(k * 0.1 - 0.05, 0.13, 0); s.castShadow = true; g.add(s); }
    g.add(hull);
    return g;
  }

  // ---------------- Xúc xắc ----------------
  _buildDice() {
    const mats = [2, 5, 1, 6, 3, 4].map(n => new THREE.MeshPhysicalMaterial({ map: canvasTex(diceFace(n, n === 1 || n === 4)), roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.4 }));
    const geo = new RoundedBoxGeometry(0.55, 0.55, 0.55, 4, 0.09);
    this.dice = [0, 1].map(k => { const m = new THREE.Mesh(geo, mats); m.castShadow = true; m.position.set(-1.6 + k * 0.8, 0.28, 1.0); this.scene.add(m); return m; });
    this.diceSpot = this.c2w(0.3, 0.6);
    this.dice.forEach((d, k) => d.position.set(this.diceSpot.x - 0.4 + k * 0.8, 0.275, this.diceSpot.z));
  }
  _faceQuat(v) {
    const e = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [0, 0, Math.PI / 2], 5: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] }[v];
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(...e));
  }

  rollDice(vals) {
    this.sound?.play('dice');
    this.goCam(new THREE.Vector3(this.diceSpot.x + 1.5, 6.5, this.diceSpot.z + 6), this.diceSpot.clone());
    const dur = 1500 / this.speed;
    const starts = this.dice.map((d, k) => new THREE.Vector3(this.diceSpot.x - 3 + k * 0.5, 2.6, this.diceSpot.z + 3.5));
    const ends = this.dice.map((d, k) => new THREE.Vector3(this.diceSpot.x - 0.45 + k * 0.9 + (Math.random() - 0.5) * 0.25, 0.275, this.diceSpot.z + (Math.random() - 0.5) * 0.4));
    const finals = vals.map(v => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2).multiply(this._faceQuat(v)));
    const axes = vals.map(() => new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize());
    const spins = vals.map(() => Math.PI * (6 + Math.random() * 4));
    let bounced = 0;
    return this.animate(dur, t => {
      this.dice.forEach((d, k) => {
        const e = easeOut(t);
        d.position.lerpVectors(starts[k], ends[k], e);
        d.position.y = 0.275 + 2.4 * (1 - t) ** 2 * Math.abs(Math.cos(t * Math.PI * 2.6));
        const spin = new THREE.Quaternion().setFromAxisAngle(axes[k], spins[k] * (1 - e));
        d.quaternion.copy(spin.multiply(finals[k]));
      });
      const b = Math.floor(t * 2.6 + 0.5);
      if (b > bounced && t < 0.95) { bounced = b; this.sound?.play('diceLand'); }
    }).then(() => { this.sound?.play('diceLand'); this.fx('sparkle', null, this.diceSpot.clone().setY(0.4), 0.5); return wait(350 / this.speed); });
  }

  // ---------------- Quân cờ ----------------
  makeToken(kind, color) {
    const g = new THREE.Group();
    const pc = new THREE.Color(color);
    const baseM = new THREE.MeshPhysicalMaterial({ color: pc, metalness: 0.3, roughness: 0.25, clearcoat: 1 });
    const goldM = new THREE.MeshStandardMaterial({ color: 0xe8b923, metalness: 1, roughness: 0.25 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.06, 32), baseM); base.position.y = 0.03; g.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.012, 8, 40), goldM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    const add = (m, y) => { m.position.y = y; m.castShadow = true; g.add(m); return m; };
    switch (kind) {
      case 'nonla': {
        const straw = new THREE.MeshStandardMaterial({ color: 0xf0d9a0, roughness: 0.7 });
        add(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 40, 4), straw), 0.2);
        for (let i = 1; i <= 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.24 * (1 - i * 0.24), 0.006, 6, 40), new THREE.MeshStandardMaterial({ color: 0xc9a86a })); r.rotation.x = Math.PI / 2; add(r, 0.1 + i * 0.048); }
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 40), baseM); rib.rotation.x = Math.PI / 2; add(rib, 0.13);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.04, 12), straw), 0.08);
        break;
      }
      case 'trongdong': {
        const bronze = new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.9, roughness: 0.35 });
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.08, 32), bronze), 0.12);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.1, 32), bronze), 0.21);
        const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
        c.fillStyle = '#b08d57'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#5a4020'; c.lineWidth = 3; for (let r = 10; r < 64; r += 9) { c.beginPath(); c.arc(64, 64, r, 0, 7); c.stroke(); }
        c.fillStyle = '#ffd36b'; c.beginPath(); for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, rr = i % 2 ? 6 : 20; c.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } c.fill();
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.02, 40), [bronze, new THREE.MeshStandardMaterial({ map: canvasTex(cv), metalness: 0.8, roughness: 0.3 }), bronze]);
        add(top, 0.27);
        break;
      }
      case 'hoasen': {
        const pink = new THREE.MeshPhysicalMaterial({ color: 0xff8fb8, roughness: 0.4, sheen: 1, emissive: 0x401020, emissiveIntensity: 0.3 });
        const pg = new THREE.SphereGeometry(0.09, 16, 12);
        for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 8; i++) {
          const p = new THREE.Mesh(pg, pink); const a = i / 8 * Math.PI * 2 + layer * 0.4;
          p.scale.set(0.55, 1.2, 0.35); p.position.set(Math.cos(a) * (0.1 - layer * 0.04), 0.16 + layer * 0.03, Math.sin(a) * (0.1 - layer * 0.04));
          p.rotation.set(0, -a + Math.PI / 2, 0); p.rotateX(0.6 - layer * 0.35); p.castShadow = true; g.add(p);
        }
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0x806000, emissiveIntensity: 0.5 })), 0.2);
        const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 24, 1, false, 0.3, Math.PI * 1.8), new THREE.MeshStandardMaterial({ color: 0x2e8b3a, roughness: 0.5, side: THREE.DoubleSide }));
        add(leaf, 0.075);
        break;
      }
      case 'denlong': {
        const silk = new THREE.MeshStandardMaterial({ color: pc, emissive: pc, emissiveIntensity: 1.2, roughness: 0.6 });
        const l = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), silk), 0.24); l.scale.set(1, 1.15, 1);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), goldM), 0.405);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), goldM), 0.08);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const rib = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.004, 4, 24, Math.PI), goldM); rib.position.y = 0.24; rib.rotation.set(0, a, Math.PI / 2); rib.scale.set(1.15, 1, 1); g.add(rib); }
        const tassel = add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 8), new THREE.MeshStandardMaterial({ color: 0xffd54f })), 0.05); tassel.rotation.x = Math.PI;
        break;
      }
      case 'thuyen': {
        const b = this._boat(color); b.scale.setScalar(1.2); b.position.y = 0.0; b.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(b);
        break;
      }
      case 'caphe': {
        const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, thickness: 0.05, transparent: true, opacity: 0.6 });
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.18, 24, 1, true), glassM), 0.15);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.07, 24), new THREE.MeshStandardMaterial({ color: 0x3b1f0f, roughness: 0.3 })), 0.1);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.1, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: 0.6 })), 0.16);
        const steel = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 1, roughness: 0.2 });
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 24), steel), 0.245);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.11, 24), steel), 0.305);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.015, 24), steel), 0.37);
        break;
      }
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  addPlayers(players) {
    for (const t of this.tokens.values()) this.scene.remove(t.g);
    this.tokens.clear();
    for (const p of players) {
      const g = this.makeToken(p.token, p.color);
      g.scale.setScalar(1.25);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(3), transparent: true, opacity: 0.9 }));
      halo.rotation.x = Math.PI / 2; halo.position.y = 0.02; halo.visible = false; g.add(halo);
      this.scene.add(g);
      this.tokens.set(p.id, { g, halo, p, pos: p.pos, jailed: p.inJail });
      if (p.bankrupt) g.visible = false;
    }
    this.layoutAll(false);
  }

  setActive(p) { for (const t of this.tokens.values()) t.halo.visible = t.p === p; }

  slot(idx, k, n, jailed) {
    const info = this.tileInfo(idx);
    if (idx === JAIL_INDEX) {
      if (jailed) { const o = [[0.25, -0.25], [0.5, -0.25], [0.25, -0.5], [0.5, -0.5], [0.38, -0.38], [0.15, -0.6]][k % 6]; return this.local(idx, o[0], o[1], 0.04 + 0.04); }
      const o = [[-0.55, 0.55], [-0.55, 0.15], [-0.55, -0.25], [-0.15, 0.55], [0.25, 0.55], [-0.55, -0.6]][k % 6]; return this.local(idx, o[0], o[1], 0.08);
    }
    if (info.corner) { const o = [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35], [0, 0], [0, -0.5]][k % 6]; return this.local(idx, o[0], o[1], 0.08); }
    const cols = n > 3 ? 2 : 1, row = Math.floor(k / cols), col = k % cols;
    const lx = cols === 1 ? 0 : (col - 0.5) * 0.42;
    const lz = 0.05 + row * 0.33 - (Math.ceil(n / cols) - 1) * 0.16;
    return this.local(idx, lx, lz, 0.08);
  }

  layoutAll(animate = true) {
    const groups = {};
    for (const t of this.tokens.values()) { if (!t.g.visible) continue; const key = t.pos + (t.pos === JAIL_INDEX && t.jailed ? 'j' : ''); (groups[key] ||= []).push(t); }
    for (const list of Object.values(groups)) list.forEach((t, k) => {
      const target = this.slot(t.pos, k, list.length, t.jailed);
      const r = this.tileInfo(t.pos).rot;
      if (!animate) { t.g.position.copy(target); t.g.rotation.y = r; }
      else { const from = t.g.position.clone(); this.animate(250, e => t.g.position.lerpVectors(from, target, ease(e))); }
    });
  }

  async moveToken(p, from, steps, onStep) {
    const t = this.tokens.get(p.id); if (!t) return;
    this.setActive(p);
    const dir = Math.sign(steps), n = Math.abs(steps);
    t.jailed = false;
    let cur = from;
    for (let s = 0; s < n; s++) {
      const next = (cur + dir + 40) % 40;
      const a = t.g.position.clone(), b = this.slot(next, 0, 1, false);
      const ra = t.g.rotation.y, rb = this.tileInfo(next).rot;
      let dr = rb - ra; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
      this.followCam(b);
      const dur = Math.max(110, 230 - n * 6) / this.speed;
      await this.animate(dur, e => {
        t.g.position.lerpVectors(a, b, e);
        t.g.position.y = b.y + Math.sin(e * Math.PI) * 0.45;
        t.g.rotation.y = ra + dr * e;
        const sq = 1 + Math.sin(e * Math.PI) * 0.12; t.g.scale.set(1.25 / Math.sqrt(sq), 1.25 * sq, 1.25 / Math.sqrt(sq));
      });
      t.g.scale.setScalar(1.25);
      this.sound?.play('step');
      this._tilePulse(next);
      cur = next; t.pos = cur;
      onStep?.(cur);
    }
    this.layoutAll(true);
    await wait(150);
  }

  async teleport(p, idx, jail = false) {
    const t = this.tokens.get(p.id); if (!t) return;
    this.sound?.play('whoosh');
    const a = t.g.position.clone();
    this.fx('smoke', null, a.clone(), 0.6);
    await this.animate(350 / this.speed, e => { t.g.position.y = a.y + e * 3; t.g.scale.setScalar(1.25 * (1 - e * 0.7)); });
    t.pos = idx; t.jailed = jail;
    const b = this.slot(idx, 0, 1, jail);
    this.followCam(b);
    t.g.position.set(b.x, b.y + 3, b.z); t.g.rotation.y = this.tileInfo(idx).rot;
    await this.animate(450 / this.speed, e => { t.g.position.y = b.y + 3 * (1 - easeOut(e)); t.g.scale.setScalar(1.25 * (0.3 + 0.7 * e)); });
    t.g.scale.setScalar(1.25);
    if (jail) { this.sound?.play('jail'); this.fx('smoke', idx); }
    this.layoutAll(true);
  }
  setJailed(p, v) { const t = this.tokens.get(p.id); if (t) { t.jailed = v; this.layoutAll(true); } }
  removeToken(p) {
    const t = this.tokens.get(p.id); if (!t) return;
    this.fx('smoke', t.pos);
    this.animate(800, e => { t.g.scale.setScalar(1.25 * (1 - e)); t.g.position.y += 0.02; }).then(() => { t.g.visible = false; this.layoutAll(true); });
  }

  // Đến ô: máy quay cận cảnh + cột sáng + hiệu ứng
  async arrive(p, idx) {
    const s = SPACES[idx];
    const pos = this.local(idx, 0, 0, 0);
    this.followCam(pos, true);
    this.beam(idx, s.group ? GROUPS[s.group].color : '#ffd54f');
    this.fx(s.fx || 'sparkle', idx);
    const pin = this.pins[idx]; if (pin) this._pinPulse(pin);
    await wait(500 / this.speed);
  }

  focusPlayer(p) { const t = this.tokens.get(p.id); if (t) this.followCam(t.g.position.clone(), false); }

  followCam(target, close = false) {
    const out = new THREE.Vector3(target.x, 0, target.z); const len = out.length() || 1; out.divideScalar(len);
    const dist = close ? 4.2 : 6.5, h = close ? 4.2 : 6.5;
    const cam = new THREE.Vector3(target.x + out.x * dist, h, target.z + out.z * dist);
    this.goCam(cam, new THREE.Vector3(target.x * 0.8, 0, target.z * 0.8));
  }
  overview() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.goCam(w < h ? new THREE.Vector3(0, 24, 14) : new THREE.Vector3(0, 15.5, 13), new THREE.Vector3(0, 0, 0.4));
  }
  goCam(pos, target) { if (this.camMode === 'free') return; this.camGoal = { pos, target }; }

  // ---------------- Sở hữu & nhà ----------------
  setOwner(idx, p, mortgaged = false) {
    const t = this.tiles[idx]; if (!t.bar) return;
    const pin = this.pins[idx];
    if (!p) { t.bar.visible = false; t.top.color.set(0xffffff); if (pin) { const c = new THREE.Color(SPACES[idx].group ? GROUPS[SPACES[idx].group].color : '#ccc'); pin.head.material.color.copy(c); pin.head.material.emissive.copy(c); pin.head.material.emissiveIntensity = 0.4; } return; }
    const col = new THREE.Color(p.color);
    t.bar.visible = true; t.bar.material.color.copy(col); t.bar.material.emissive.copy(col); t.bar.material.emissiveIntensity = mortgaged ? 0.1 : 1.6;
    t.top.color.set(mortgaged ? 0x777777 : 0xffffff);
    if (pin) { pin.head.material.color.copy(col); pin.head.material.emissive.copy(col); pin.head.material.emissiveIntensity = mortgaged ? 0.2 : 2.2; }
  }

  setHouses(idx, n, animate) {
    const old = this.houseMeshes.get(idx) || [];
    old.forEach(m => this.scene.remove(m));
    const list = [];
    const bandZ = -TD / 2 + 0.29;
    if (n === 5) {
      const h = this._hotel(); h.position.copy(this.local(idx, 0, bandZ, 0.08)); h.rotation.y = this.tileInfo(idx).rot;
      this.scene.add(h); list.push(h);
    } else {
      for (let k = 0; k < n; k++) {
        const h = this._house(); h.position.copy(this.local(idx, -0.33 + k * 0.22, bandZ, 0.08)); h.rotation.y = this.tileInfo(idx).rot;
        this.scene.add(h); list.push(h);
      }
    }
    this.houseMeshes.set(idx, list);
    if (animate && list.length) {
      const m = list[list.length - 1], y = m.position.y;
      this.animate(500, e => { m.position.y = y + (1 - easeOut(e)) * 1.5; m.scale.setScalar(0.5 + 0.5 * easeOut(e)); });
      this.fx('smoke', idx); this.fx('sparkle', idx);
      this.sound?.play('build');
    }
  }
  _house() {
    if (!this._houseProto) {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.16), new THREE.MeshStandardMaterial({ color: 0x2e9e4f, roughness: 0.5 }));
      wall.position.y = 0.065; const roofM = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 }));
      roofM.position.y = 0.18; roofM.rotation.y = Math.PI / 4;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.005), new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0xffc107, emissiveIntensity: 1.5 }));
      win.position.set(0, 0.07, 0.082);
      g.add(wall, roofM, win); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this._houseProto = g;
    }
    return this._houseProto.clone();
  }
  _hotel() {
    if (!this._hotelProto) {
      const g = new THREE.Group();
      const red = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.4 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 1, roughness: 0.3, emissive: 0x553300, emissiveIntensity: 0.5 });
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.2), red); b1.position.y = 0.09;
      const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.5, 0.1, 4, 1), gold); r1.scale.set(1, 1, 0.38); r1.rotation.y = Math.PI / 4; r1.position.y = 0.23;
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.14), red); b2.position.y = 0.32;
      const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.28, 0.08, 4, 1), gold); r2.scale.set(1, 1, 0.45); r2.rotation.y = Math.PI / 4; r2.position.y = 0.42;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffd000, emissiveIntensity: 3 })); star.position.y = 0.5;
      const winM = new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0xffc107, emissiveIntensity: 1.6 });
      for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.005), winM); w.position.set(-0.24 + i * 0.12, 0.1, 0.102); g.add(w); }
      g.add(b1, r1, b2, r2, star); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this._hotelProto = g;
    }
    return this._hotelProto.clone();
  }

  // ---------------- Hiệu ứng ----------------
  _tilePulse(idx) {
    const m = this.tiles[idx].mesh;
    this.animate(300, e => { m.position.y = 0.04 - Math.sin(e * Math.PI) * 0.03; });
  }
  _pinPulse(pin) { this.animate(1600, e => { const s = 1 + Math.sin(e * Math.PI * 4) * 0.6 * (1 - e); pin.head.scale.setScalar(s); }); }

  beam(idx, color) {
    const p = this.local(idx, 0, 0, 0);
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g; c.fillRect(0, 0, 4, 128);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(color).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 5, 32, 1, true), mat);
    m.position.set(p.x, 2.5, p.z); this.scene.add(m);
    const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 48), ringM); ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.1, p.z); this.scene.add(ring);
    this.animate(1800, e => {
      m.scale.set(1, Math.min(1, e * 4), 1); m.position.y = 2.5 * Math.min(1, e * 4);
      mat.opacity = e < 0.6 ? 1 : 1 - (e - 0.6) / 0.4;
      ring.scale.setScalar(1 + e * 3); ringM.opacity = 1 - e;
    }).then(() => { this.scene.remove(m, ring); mat.dispose(); ringM.dispose(); });
  }

  fx(type, idx, at = null, scale = 1) {
    const p = at || (idx === null || idx === undefined ? new THREE.Vector3() : this.local(idx, 0, 0, 0.2));
    const presets = {
      confetti: { n: 160, tex: 'square', colors: ['#e53935', '#ffd54f', '#43a047', '#1e88e5', '#ff4081', '#ffffff'], speed: [2, 5], up: 5, g: -6, life: 2.6, size: 0.12, add: false, spread: 1 },
      sparkle: { n: 60, tex: 'star', colors: ['#fff6c0', '#ffd54f', '#ffffff'], speed: [0.5, 2], up: 2.5, g: -0.5, life: 1.6, size: 0.18, add: true, spread: 0.6 },
      lanterns: { n: 36, tex: 'soft', colors: ['#ff6d00', '#ffab00', '#ff3d00', '#ffd740'], speed: [0.2, 0.6], up: 1.4, g: 0.25, life: 4, size: 0.35, add: true, spread: 1.5, sway: 1 },
      petals: { n: 70, tex: 'petal', colors: ['#ff8fb8', '#ffc1d6', '#fff0f5', '#ffb3c6'], speed: [0.3, 0.8], up: -0.4, g: -0.4, life: 3.5, size: 0.14, add: false, spread: 2.2, from: 3.5, sway: 1.5 },
      splash: { n: 110, tex: 'soft', colors: ['#80deea', '#e0f7fa', '#4fc3f7', '#ffffff'], speed: [1.5, 3.5], up: 4.5, g: -9, life: 1.6, size: 0.14, add: true, spread: 0.4, ring: '#4fc3f7' },
      fire: { n: 140, tex: 'soft', colors: ['#ffeb3b', '#ff9800', '#ff5722', '#ff1744'], speed: [1.5, 3], up: 4, g: 1, life: 1.5, size: 0.32, add: true, spread: 0.3, then: 'fireworks' },
      smoke: { n: 30, tex: 'soft', colors: ['#bdbdbd', '#9e9e9e', '#e0e0e0'], speed: [0.2, 0.8], up: 0.8, g: 0.4, life: 2, size: 0.5, add: false, spread: 0.4, grow: 2 },
      coins: { coins: 22 },
      fireworks: { fireworks: 4 },
    };
    const P = presets[type] || presets.sparkle;
    if (P.coins) return this._coins(p, P.coins);
    if (P.fireworks) { for (let i = 0; i < P.fireworks; i++) setTimeout(() => this._firework(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 2.5 + Math.random() * 1.5, (Math.random() - 0.5) * 3))), i * 350); this.sound?.play('firework'); return; }
    const n = Math.round(P.n * scale);
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * P.spread;
      pos[i * 3] = p.x + Math.cos(a) * r; pos[i * 3 + 1] = p.y + (P.from ? Math.random() * P.from + 0.5 : Math.random() * 0.2); pos[i * 3 + 2] = p.z + Math.sin(a) * r;
      const sp = P.speed[0] + Math.random() * (P.speed[1] - P.speed[0]);
      vel.push(new THREE.Vector3(Math.cos(a) * sp, P.up * (0.5 + Math.random() * 0.7), Math.sin(a) * sp));
      c.set(P.colors[i % P.colors.length]); if (P.add) c.multiplyScalar(2);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: P.size, map: this.tex[P.tex], vertexColors: true, transparent: true, depthWrite: false, blending: P.add ? THREE.AdditiveBlending : THREE.NormalBlending, alphaTest: P.add ? 0 : 0.1 });
    const pts = new THREE.Points(geo, mat); this.scene.add(pts);
    this.bursts.push({ pts, vel, P, t: 0, phase: Math.random() * 10 });
    if (P.ring) this._ripple(p, P.ring);
    if (P.then) setTimeout(() => this.fx(P.then, idx, at), 400);
  }
  _ripple(p, color) {
    for (let k = 0; k < 3; k++) {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 48), m); r.rotation.x = -Math.PI / 2; r.position.set(p.x, 0.12, p.z); this.scene.add(r);
      setTimeout(() => this.animate(1200, e => { r.scale.setScalar(1 + e * 4); m.opacity = 1 - e; }).then(() => { this.scene.remove(r); m.dispose(); }), k * 250);
    }
  }
  _firework(at) {
    const cols = ['#ff1744', '#ffea00', '#00e676', '#2979ff', '#d500f9', '#ff9100'];
    const col = cols[Math.floor(Math.random() * cols.length)];
    const n = 120, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y, at.z], i * 3);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2.5 + Math.random() * 0.6);
      vel.push(v);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.16, map: this.tex.star, color: new THREE.Color(col).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat); this.scene.add(pts);
    this.bursts.push({ pts, vel, P: { g: -1.5, life: 1.8, drag: 1.6 }, t: 0 });
    const flash = new THREE.PointLight(new THREE.Color(col), 30, 8); flash.position.copy(at); this.scene.add(flash);
    this.animate(600, e => { flash.intensity = 30 * (1 - e); }).then(() => this.scene.remove(flash));
  }
  _coins(p, n) {
    if (!this._coinGeo) { this._coinGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 20); this._coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 1, roughness: 0.2, emissive: 0x664400, emissiveIntensity: 0.6 }); }
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this._coinGeo, this._coinMat); m.castShadow = true;
      const sx = p.x + (Math.random() - 0.5) * 0.9, sz = p.z + (Math.random() - 0.5) * 0.9, sy = 2.5 + Math.random() * 2.5;
      m.position.set(sx, sy, sz); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); this.scene.add(m);
      const rs = (Math.random() - 0.5) * 20;
      setTimeout(() => {
        this.animate(900, e => {
          const b = e < 0.75 ? e / 0.75 : 1; m.position.y = sy + (0.2 - sy) * (b * b) + (e > 0.75 ? Math.sin((e - 0.75) / 0.25 * Math.PI) * 0.15 : 0);
          m.rotation.x += rs * 0.016 * (1 - e);
        }).then(() => this.animate(500, e => m.scale.setScalar(1 - e)).then(() => this.scene.remove(m)));
        if (i % 4 === 0) this.sound?.play('coin');
      }, i * 40);
    }
  }

  // Lật thẻ từ chồng bài
  async drawCardAnim(deck) {
    const d = this.decks[deck]; if (!d) return;
    const card = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 1.05), [d.topMat, d.topMat, d.topMat, new THREE.MeshStandardMaterial({ color: 0xfff8e1 }), d.topMat, d.topMat]);
    card.position.copy(d.g.position).setY(0.24); card.rotation.y = d.g.rotation.y; this.scene.add(card);
    this.goCam(new THREE.Vector3(d.g.position.x * 0.6, 6, d.g.position.z + 5), d.g.position.clone());
    this.sound?.play('card');
    const from = card.position.clone(), to = new THREE.Vector3(d.g.position.x * 0.5, 2.6, d.g.position.z * 0.5 + 1);
    await this.animate(700, e => { card.position.lerpVectors(from, to, ease(e)); card.rotation.x = -e * Math.PI * 1.35; card.rotation.z = Math.sin(e * Math.PI) * 0.3; });
    this.fx('sparkle', null, to, 0.7);
    this.animate(400, e => card.scale.setScalar(1 - e)).then(() => this.scene.remove(card));
    await wait(200);
  }

  // ---------------- Tương tác chuột ----------------
  _pointer(e, click) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.tiles.map(t => t.mesh), false)[0];
    const idx = hit ? hit.object.userData.tile : null;
    if (click) { if (idx !== null && !this._dragged) this.onTileClick?.(idx); }
    else {
      if (idx !== this._hover) {
        if (this._hover != null) this.tiles[this._hover].mesh.material[2].emissive?.set(0x000000);
        if (idx != null) this.tiles[idx].mesh.material[2].emissive?.set(0x332200);
        this._hover = idx; this.onTileHover?.(idx, e);
        this.renderer.domElement.style.cursor = idx != null ? 'pointer' : 'grab';
      } else if (idx != null) this.onTileHover?.(idx, e);
    }
  }

  // Ảnh thu nhỏ quân cờ cho giao diện
  tokenThumb(kind, color) {
    if (!this._thumbR) {
      this._thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this._thumbR.setSize(160, 160); this._thumbR.outputColorSpace = THREE.SRGBColorSpace; this._thumbR.toneMapping = THREE.ACESFilmicToneMapping;
      this._thumbS = new THREE.Scene(); this._thumbS.environment = this.scene.environment;
      this._thumbS.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.4));
      const d = new THREE.DirectionalLight(0xffffff, 2.5); d.position.set(2, 4, 3); this._thumbS.add(d);
      this._thumbC = new THREE.PerspectiveCamera(30, 1, 0.1, 20); this._thumbC.position.set(0, 0.75, 1.45); this._thumbC.lookAt(0, 0.2, 0);
    }
    const t = this.makeToken(kind, color); t.rotation.y = -0.5; this._thumbS.add(t);
    this._thumbR.render(this._thumbS, this._thumbC);
    const url = this._thumbR.domElement.toDataURL();
    this._thumbS.remove(t);
    return url;
  }

  // ---------------- Hoạt ảnh ----------------
  animate(ms, fn) {
    return new Promise(res => this.anims.push({ ms, fn, t0: performance.now(), res }));
  }

  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta()), now = performance.now(), T = this.clock.elapsedTime;
    // tween
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]; const e = Math.min(1, (now - a.t0) / a.ms);
      a.fn(e);
      if (e >= 1) { this.anims.splice(i, 1); a.res(); }
    }
    // hạt
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]; b.t += dt;
      const pos = b.pts.geometry.attributes.position, P = b.P;
      for (let k = 0; k < b.vel.length; k++) {
        const v = b.vel[k];
        v.y += (P.g || 0) * dt;
        if (P.drag) v.multiplyScalar(1 - P.drag * dt);
        if (P.sway) { v.x += Math.sin(T * 2 + k) * P.sway * dt; v.z += Math.cos(T * 1.7 + k) * P.sway * dt; v.multiplyScalar(1 - 0.8 * dt); }
        pos.setXYZ(k, pos.getX(k) + v.x * dt, Math.max(0.05, pos.getY(k) + v.y * dt), pos.getZ(k) + v.z * dt);
      }
      pos.needsUpdate = true;
      const life = b.t / P.life;
      b.pts.material.opacity = life < 0.7 ? 1 : Math.max(0, 1 - (life - 0.7) / 0.3);
      if (P.grow) b.pts.material.size = P.size * (1 + life * P.grow);
      if (life >= 1) { this.scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); this.bursts.splice(i, 1); }
    }
    // máy quay
    if (this.idle) {
      this._idleA = (this._idleA || 0) + dt * 0.1;
      this.camera.position.set(Math.sin(this._idleA) * 15, 9 + Math.sin(this._idleA * 0.7) * 2, Math.cos(this._idleA) * 15);
      this.controls.target.set(0, 0, 0);
    } else if (this.camGoal) {
      const k = 1 - Math.exp(-dt * 3.2);
      this.camera.position.lerp(this.camGoal.pos, k);
      this.controls.target.lerp(this.camGoal.target, k);
      if (this.camera.position.distanceTo(this.camGoal.pos) < 0.02) this.camGoal = null;
    }
    // trang trí
    for (const t of this.tokens.values()) if (t.halo.visible) { t.halo.rotation.z = T * 2; t.halo.scale.setScalar(1 + Math.sin(T * 4) * 0.08); }
    for (const pin of Object.values(this.pins)) pin.head.position.y = 0.3 + Math.sin(T * 2 + pin.phase) * 0.02;
    this.landmarkAnim?.forEach(f => f(T));
    this.controls.update();
    if (this.quality === 'low') this.renderer.render(this.scene, this.camera);
    else this.composer.render();
  }
}
