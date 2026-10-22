'use strict';
// =====================================================================
//  ĐIỀU KHIỂN GIAO DIỆN: màn hình, tiến trình, tủ đồ, góc bố mẹ
// =====================================================================

const $ = id => document.getElementById(id);

// ---------------- Lưu tiến trình ----------------
const Store = {
  KEY: 'ky-lan-go-phim-v1',
  data: null,
  defaults() {
    return {
      name: '', gems: 0, stars: {}, best: {},
      owned: { dress: ['pink'], hair: ['brown', 'black'], acc: ['none'], pet: ['none'] },
      look: { dress: 'pink', hair: 'brown', acc: 'none', pet: 'none' },
      keyStats: {}, history: [], totalSeconds: 0,
      settings: { voice: true, rate: 1, music: true, sfx: true, relax: false, breakMin: 15 }
    };
  },
  load() {
    const d = this.defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(this.KEY) || '{}');
      Object.assign(d, saved);
      d.settings = Object.assign(this.defaults().settings, saved.settings || {});
      d.owned = Object.assign(this.defaults().owned, saved.owned || {});
      d.look = Object.assign(this.defaults().look, saved.look || {});
    } catch (e) { /* dữ liệu hỏng → dùng mặc định */ }
    this.data = d;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ } }
};

// ---------------- Trạng thái ứng dụng ----------------
const App = {
  screen: 'home',
  level: null,
  game: null,
  sessionSeconds: 0,
  introTimer: null,
  lastResult: null
};

let gameKb, gameHands, introKb, introHands, heatKb;

function show(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'scr-' + name));
  App.screen = name;
  if (name !== 'intro') clearInterval(App.introTimer);
  if (name !== 'game' && App.game) { App.game.stop(); App.game = null; }
  if (name === 'map') renderMap();
  if (name === 'wardrobe') renderWardrobe();
  if (name === 'parent') renderParent();
  if (name === 'home') updateHomeHello();
  window.scrollTo(0, 0);
}

function toast(msg, ms = 2600) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function modal(html) {
  $('modalBox').innerHTML = html;
  $('modal').classList.remove('hidden');
}
function closeModal() { $('modal').classList.add('hidden'); }

function updateGems() { $('gemCount').textContent = Store.data.gems; }
const playerName = () => Store.data.name || 'bé';

// ---------------- Mở khoá màn ----------------
function isUnlocked(i) { return i === 0 || (Store.data.stars[LEVELS[i - 1].id] || 0) >= 1; }
function currentLevelIndex() {
  for (let i = 0; i < LEVELS.length; i++) if (!(Store.data.stars[LEVELS[i].id] >= 1)) return i;
  return LEVELS.length - 1;
}

// ---------------- Bản đồ ----------------
function renderMap() {
  const box = $('mapWorlds');
  box.innerHTML = '';
  const cur = currentLevelIndex();
  WORLDS.forEach((w, wi) => {
    const lv = LEVELS.map((L, i) => ({ L, i })).filter(o => o.L.world === wi);
    const worldLocked = !isUnlocked(lv[0].i);
    const got = lv.reduce((s, o) => s + (Store.data.stars[o.L.id] || 0), 0);
    const el = document.createElement('div');
    el.className = 'world' + (worldLocked ? ' locked' : '');
    el.style.background = `linear-gradient(120deg, ${w.theme.skyTop}, ${w.theme.skyBot})`;
    el.innerHTML = `<div class="world-head"><h3>${w.emoji} ${w.name}</h3><span>${w.desc} · ⭐ ${got}/${lv.length * 3}</span></div><div class="levels"></div>`;
    const row = el.querySelector('.levels');
    for (const { L, i } of lv) {
      const st = Store.data.stars[L.id] || 0;
      const b = document.createElement('button');
      const unlocked = isUnlocked(i);
      b.className = 'lvl' + (unlocked ? '' : ' locked') + (i === cur && st === 0 ? ' current' : '');
      b.style.setProperty('--wc', w.theme.hillFar);
      b.innerHTML = `<span class="num">${unlocked ? L.id : '🔒'}</span><span class="ttl">${L.title}</span>` +
        `<span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>` +
        (L.speed > 0 ? '<span class="badge">🏃 thử thách</span>' : '');
      b.disabled = !unlocked;
      b.onclick = () => { Sfx.click(); openIntro(L); };
      row.appendChild(b);
    }
    box.appendChild(el);
  });
}

// ---------------- Giới thiệu màn ----------------
function openIntro(level) {
  App.level = level;
  const w = WORLDS[level.world];
  $('introWorld').textContent = `${w.emoji} ${w.name}`;
  $('introTitle').textContent = (level.practice ? '' : 'Màn ' + level.id + ': ') + level.title;
  $('introText').textContent = level.intro;
  $('posture').classList.toggle('hidden', level.world > 0 && !level.practice);
  const fresh = [...level.newKeys];
  $('introKeys').innerHTML = fresh.map(k => {
    const f = FINGERS[FINGER_OF[k]];
    return `<div class="chip" style="background:${f.color}"><b>${keyLabel(k)}</b><small>${f.name}</small></div>`;
  }).join('') || `<div class="chip" style="background:#ece6ff"><b>${level.type === 'sentences' ? '📝' : level.type === 'words' ? '🔤' : '🏠'}</b><small>${
    level.type === 'sentences' ? 'gõ câu' : level.type === 'words' ? 'gõ từ' : 'ôn tập'}</small></div>`;
  introKb.setKnown(level.known, level.newKeys);
  // Minh hoạ lần lượt từng phím mới (hoặc hàng phím nhà) cùng ngón tay tương ứng
  const demo = fresh.length ? fresh : [...'asdfjkl;'];
  let n = 0;
  const tick = () => { const k = demo[n++ % demo.length]; introKb.setNext(k); introHands.setKey(k); };
  tick();
  clearInterval(App.introTimer);
  App.introTimer = setInterval(tick, 1400);
  show('intro');
  Voice.speak(level.intro);
}

// ---------------- Chơi ----------------
function startLevel() {
  const level = App.level;
  if (!level) return;
  Voice.stop();
  if (App.game) { App.game.stop(); App.game = null; }
  if (document.activeElement) document.activeElement.blur();
  show('game');
  const s = Store.data.settings;
  const speedMode = level.speed > 0 && !s.relax;
  $('gameTitle').textContent = (level.practice ? '' : level.id + ' · ') + level.title;
  $('gameMode').textContent = speedMode ? '🏃 Thử thách – 3 trái tim' : '🐢 Không giới hạn thời gian';
  gameKb.setKnown(level.known, level.newKeys);
  gameKb.setNext(null); gameHands.setKey(null);
  App.game = new TypingRun($('gameCanvas'), level, {
    look: Store.data.look,
    relax: s.relax,
    name: Store.data.name,
    onTarget: k => { gameKb.setNext(k); gameHands.setKey(k); },
    onKey: (k, ok) => gameKb.flash(k, ok),
    onDone: r => finishLevel(level, r)
  });
  App.game.start();
}

function starsFor(r) {
  if (r.failed) return 0;
  if (r.acc >= 0.95) return 3;
  if (r.acc >= 0.85) return 2;
  return 1;
}

function finishLevel(level, r) {
  const d = Store.data;
  const stars = starsFor(r);
  const prev = d.stars[level.id] || 0;
  let bonus = 0;
  if (!level.practice) {
    if (stars > prev) { bonus = (stars - prev) * 5; d.stars[level.id] = stars; }
  }
  const earned = r.failed ? Math.floor(r.gems / 2) : r.gems + bonus;
  d.gems += earned;
  for (const k in r.perKey) {
    const a = d.keyStats[k] || (d.keyStats[k] = { hit: 0, miss: 0, time: 0, timed: 0 });
    const b = r.perKey[k];
    a.hit += b.hit; a.miss += b.miss; a.time += b.time; a.timed += b.timed;
  }
  d.totalSeconds += r.seconds;
  d.history.push({ at: Date.now(), id: level.id, wpm: +r.wpm.toFixed(1), acc: +(r.acc * 100).toFixed(1), stars });
  if (d.history.length > 60) d.history = d.history.slice(-60);
  Store.save();
  updateGems();
  App.sessionSeconds += r.seconds;
  App.lastResult = { level, r, stars };
  showResult(level, r, stars, earned, bonus);
}

function showResult(level, r, stars, earned, bonus) {
  show('result');
  const name = playerName();
  $('resTitle').textContent = r.failed ? 'Ôi, suýt nữa thôi! 💪' : 'Hoàn thành! 🎉';
  $('resStars').innerHTML = '<span>⭐</span><span>⭐</span><span>⭐</span>';
  [...$('resStars').children].forEach((el, i) => {
    if (i < stars) setTimeout(() => { el.classList.add('on'); Sfx.star(i); }, 400 + i * 450);
  });
  $('resAcc').textContent = Math.round(r.acc * 100) + '%';
  $('resWpm').textContent = r.wpm.toFixed(1);
  $('resCombo').textContent = r.maxCombo;
  $('resGems').textContent = '+' + earned + ' 💎';

  // Phím cần luyện thêm trong màn này
  const weak = Object.entries(r.perKey).filter(([, s]) => s.miss >= 2).sort((a, b) => b[1].miss - a[1].miss).slice(0, 3).map(([k]) => k);
  let msg, say;
  if (r.failed) {
    msg = 'Không sao cả! Gõ chậm lại một chút, chính xác quan trọng hơn nhanh. Thử lại nhé!';
    say = `Không sao đâu ${name}, mình thử lại nhé. Gõ chậm mà chắc là sẽ qua thôi!`;
  } else if (stars === 3) {
    msg = `Xuất sắc! ${name} gõ gần như không sai phím nào.` + (bonus ? ` Thưởng thêm ${bonus} 💎!` : '');
    say = `Hoàn thành! ${name} được ba ngôi sao. Giỏi quá đi!`;
  } else if (stars === 2) {
    msg = 'Rất tốt! Cố gắng chính xác hơn một chút để được 3 sao nhé.' + (bonus ? ` Thưởng ${bonus} 💎!` : '');
    say = `Hoàn thành! ${name} được hai ngôi sao. Rất tốt!`;
  } else {
    msg = 'Đã qua màn! Bé có thể chơi lại để được nhiều sao hơn.';
    say = `Hoàn thành rồi! Chơi lại để được nhiều sao hơn nhé.`;
  }
  if (weak.length) msg += ` Cần luyện thêm phím: ${weak.map(keyLabel).join(', ')}.`;
  $('resMsg').textContent = msg;
  setTimeout(() => Voice.speak(say), 300);

  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  const btn = $('btnNext');
  if (level.practice) { btn.textContent = 'Bản đồ ▶'; btn.disabled = false; btn.onclick = () => show('map'); }
  else if (next && isUnlocked(idx + 1)) { btn.textContent = 'Màn tiếp ▶'; btn.disabled = false; btn.onclick = () => openIntro(next); }
  else if (!next && !r.failed) { btn.textContent = '👑 Về bản đồ'; btn.disabled = false; btn.onclick = () => show('map'); }
  else { btn.textContent = 'Màn tiếp ▶'; btn.disabled = true; }

  if (!next && stars > 0 && !level.practice) {
    setTimeout(() => {
      modal(`<div class="big-emoji">👑</div><h2>Công chúa Gõ Phím!</h2><p>Chúc mừng ${name} đã hoàn thành cả 5 vương quốc! Hãy luyện tiếp để được 3 sao ở mọi màn nhé.</p><button class="btn pink" onclick="closeModal()">Tuyệt vời!</button>`);
      Voice.speak(`Chúc mừng ${name}! Bé đã trở thành Công chúa Gõ Phím!`);
    }, 2200);
  }
  maybeBreak();
}

// Nhắc nghỉ giải lao để bảo vệ mắt và cổ tay
function maybeBreak() {
  const min = Store.data.settings.breakMin;
  if (!min || App.sessionSeconds < min * 60) return;
  App.sessionSeconds = 0;
  setTimeout(() => {
    modal(`<div class="big-emoji">🧘‍♀️</div><h2>Giờ giải lao!</h2>
      <p>Bé đã chơi rất chăm chỉ rồi. Cùng nghỉ một chút nhé:</p>
      <p>👀 Nhìn ra xa 20 giây<br>🙆‍♀️ Vươn vai, xoay cổ tay<br>💧 Uống một ngụm nước</p>
      <button class="btn pink" onclick="closeModal()">Mình nghỉ xong rồi!</button>`);
    Voice.speak('Giờ giải lao rồi! Bé hãy nhìn ra xa hai mươi giây, vươn vai và xoay cổ tay nhé.');
  }, 3500);
}

// ---------------- Luyện phím yếu ----------------
function weakKeys(limit = 4) {
  const learned = new Set();
  LEVELS.forEach(L => { if (Store.data.stars[L.id] >= 1) for (const c of L.newKeys) if (c !== ' ') learned.add(c); });
  const rows = [];
  for (const k of learned) {
    const s = Store.data.keyStats[k];
    if (!s || s.hit + s.miss < 5) continue;
    const missRate = s.miss / (s.hit + s.miss);
    const avg = s.timed ? s.time / s.timed : 1;
    rows.push({ k, score: missRate * 3 + avg / 1.5, missRate, avg });
  }
  rows.sort((a, b) => b.score - a.score);
  return { keys: rows.slice(0, limit).map(r => r.k), learned: [...learned].join('') };
}

function startPractice() {
  const { keys, learned } = weakKeys();
  if (keys.length < 2) { toast('Bé chơi thêm vài màn để game biết phím nào cần luyện nhé! 💪'); return; }
  openIntro(makePracticeLevel(keys, learned));
}

// ---------------- Tủ đồ ----------------
let shopTab = 'dress', wardrobeRaf = null;
function renderWardrobe() {
  const tabs = $('shopTabs');
  tabs.innerHTML = '';
  for (const cat in SHOP) {
    const b = document.createElement('button');
    b.textContent = SHOP[cat].label; b.className = cat === shopTab ? 'on' : '';
    b.onclick = () => { shopTab = cat; Sfx.click(); renderWardrobe(); };
    tabs.appendChild(b);
  }
  const box = $('shopItems');
  box.innerHTML = '';
  const d = Store.data;
  for (const it of SHOP[shopTab].items) {
    const owned = d.owned[shopTab].includes(it.id) || it.price === 0;
    const eq = d.look[shopTab] === it.id;
    const el = document.createElement('button');
    el.className = 'item' + (eq ? ' equipped' : '') + (!owned && d.gems < it.price ? ' cant' : '');
    const bg = it.color === 'rainbow' ? `linear-gradient(${RAINBOW.join(',')})` : it.color || '#fff0f7';
    el.innerHTML = `<div class="sw" style="background:${bg}">${it.icon || ''}</div><div class="nm">${it.name}</div>` +
      `<div class="pr">${eq ? '✔ Đang dùng' : owned ? 'Đã có' : it.price + ' 💎'}</div>`;
    el.onclick = () => buyOrEquip(shopTab, it);
    box.appendChild(el);
  }
  if (!wardrobeRaf) {
    const cv = $('wardrobeCanvas'), ctx = cv.getContext('2d');
    const loop = ts => {
      if (App.screen !== 'wardrobe') { wardrobeRaf = null; return; }
      const t = ts / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(150, 262, 90, 14, 0, 0, PI2); ctx.fill();
      Draw.pet(ctx, Store.data.look.pet, 70, 262, t, 1.8, false);
      Draw.girl(ctx, 165, 262, Store.data.look, 'idle', t, 2.6);
      wardrobeRaf = requestAnimationFrame(loop);
    };
    wardrobeRaf = requestAnimationFrame(loop);
  }
}

function buyOrEquip(cat, it) {
  const d = Store.data;
  const owned = d.owned[cat].includes(it.id) || it.price === 0;
  if (!owned) {
    if (d.gems < it.price) {
      toast(`Cần thêm ${it.price - d.gems} 💎 nữa. Chơi tiếp để nhận kim cương nhé!`);
      Sfx.oops(); return;
    }
    d.gems -= it.price; d.owned[cat].push(it.id);
    Sfx.win();
    Voice.speak(pick(['Xinh quá đi!', 'Đẹp tuyệt vời!', 'Bé trông như công chúa vậy!']));
  } else Sfx.click();
  d.look[cat] = it.id;
  Store.save(); updateGems(); renderWardrobe();
}

// ---------------- Góc bố mẹ ----------------
function parentGate() {
  const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
  modal(`<div class="big-emoji">🔐</div><h2>Dành cho bố mẹ</h2><p>Vui lòng trả lời: <b>${a} × ${b} = ?</b></p>
    <input id="gateAns" inputmode="numeric" autocomplete="off"><br>
    <div class="row-buttons"><button class="btn" onclick="closeModal()">Huỷ</button><button class="btn pink" id="gateOk">Vào</button></div>`);
  const inp = $('gateAns');
  inp.focus();
  const ok = () => { if (+inp.value === a * b) { closeModal(); show('parent'); } else { inp.value = ''; toast('Chưa đúng rồi!'); } };
  $('gateOk').onclick = ok;
  inp.onkeydown = e => { if (e.key === 'Enter') ok(); e.stopPropagation(); };
}

function renderParent() {
  const d = Store.data;
  const passed = LEVELS.filter(L => d.stars[L.id] >= 1).length;
  const totalStars = LEVELS.reduce((s, L) => s + (d.stars[L.id] || 0), 0);
  const recent = d.history.slice(-10);
  const avg = f => recent.length ? (recent.reduce((s, h) => s + h[f], 0) / recent.length).toFixed(1) : '–';
  $('parentCards').innerHTML = [
    ['Thời gian luyện', Math.round(d.totalSeconds / 60) + ' phút'],
    ['Màn đã qua', `${passed}/${LEVELS.length}`],
    ['Tổng số sao', `${totalStars}/${LEVELS.length * 3}`],
    ['Chính xác TB', avg('acc') + (recent.length ? '%' : '')],
    ['Tốc độ TB', avg('wpm') + (recent.length ? ' từ/phút' : '')],
    ['Kim cương', d.gems + ' 💎']
  ].map(([k, v]) => `<div class="card">${k}<b>${v}</b></div>`).join('');

  const hist = d.history.slice(-15);
  const maxW = Math.max(10, ...hist.map(h => h.wpm));
  $('parentChart').innerHTML = hist.length ? hist.map(h =>
    `<div class="col" title="Màn ${h.id}: ${h.wpm} từ/phút, ${h.acc}% chính xác"><small>${Math.round(h.acc)}%</small>` +
    `<div class="barv" style="height:${Math.max(4, (h.wpm / maxW) * 120)}px"></div><small>${h.id === 'practice' ? '💪' : h.id}</small></div>`
  ).join('') : '<div class="empty">Chưa có dữ liệu – hãy để bé chơi vài màn nhé!</div>';

  heatKb.heat(d.keyStats);
  const { keys } = weakKeys(3);
  const accAvg = recent.length ? recent.reduce((s, h) => s + h.acc, 0) / recent.length : null;
  let advice = '💡 ';
  if (accAvg == null) advice += 'Bắt đầu từ Thế giới 1. Hãy ngồi cạnh bé ở vài buổi đầu để chỉnh tư thế ngồi và vị trí ngón tay.';
  else if (accAvg < 85) advice += 'Độ chính xác còn dưới 85%: khuyến khích bé gõ chậm lại, nhìn màn hình thay vì nhìn bàn phím. Có thể bật "Chế độ thư giãn".';
  else if (accAvg < 95) advice += 'Bé đang tiến bộ tốt! Hãy chơi lại các màn chưa đủ 3 sao trước khi sang thế giới mới.';
  else advice += 'Độ chính xác rất tốt! Bé có thể thử các màn 🏃 thử thách để tăng tốc độ.';
  if (keys.length) advice += ` Phím cần luyện thêm: ${keys.map(keyLabel).join(', ')} – dùng nút "💪 Luyện phím yếu" trên bản đồ.`;
  $('parentAdvice').textContent = advice;

  const s = d.settings;
  $('setVoice').checked = s.voice; $('setRate').value = s.rate; $('setMusic').checked = s.music;
  $('setSfx').checked = s.sfx; $('setRelax').checked = s.relax; $('setBreak').value = String(s.breakMin);
  $('setName').value = d.name;
  $('voiceStatus').textContent = !('speechSynthesis' in window)
    ? '⚠️ Trình duyệt này không hỗ trợ giọng nói. Hãy dùng Chrome hoặc Edge.'
    : Voice.hasVietnamese ? '✅ Đã tìm thấy giọng đọc tiếng Việt: ' + Voice.voice.name
    : '⚠️ Chưa thấy giọng tiếng Việt trên máy. Gợi ý: dùng Microsoft Edge (có giọng "HoaiMy" online) hoặc cài gói giọng nói Tiếng Việt trong Cài đặt Windows → Thời gian & Ngôn ngữ → Giọng nói.';
}

function applySettings() {
  const s = Store.data.settings;
  Voice.enabled = s.voice; Voice.rate = s.rate;
  Sfx.state.sfx = s.sfx; Sfx.state.music = s.music;
  if (s.music) Sfx.musicOn(); else Sfx.musicOff();
  $('btnVoice').classList.toggle('off', !s.voice);
  $('btnMusic').classList.toggle('off', !s.music);
}

function bindSettings() {
  const s = () => Store.data.settings;
  const upd = fn => e => { fn(e); Store.save(); applySettings(); };
  $('setVoice').onchange = upd(e => { s().voice = e.target.checked; });
  $('setRate').oninput = upd(e => { s().rate = +e.target.value; });
  $('setMusic').onchange = upd(e => { s().music = e.target.checked; });
  $('setSfx').onchange = upd(e => { s().sfx = e.target.checked; });
  $('setRelax').onchange = upd(e => { s().relax = e.target.checked; });
  $('setBreak').onchange = upd(e => { s().breakMin = +e.target.value; });
  $('setName').onchange = e => { Store.data.name = e.target.value.trim(); Store.save(); };
  $('btnTestVoice').onclick = () => Voice.speak(`Xin chào ${playerName()}! Mình là Kỳ Lân Cầu Vồng.`);
  $('btnReset').onclick = () => {
    modal(`<h2>Xoá toàn bộ tiến trình?</h2><p>Sao, kim cương, tủ đồ và thống kê sẽ bị xoá. Không thể hoàn tác.</p>
      <div class="row-buttons"><button class="btn" onclick="closeModal()">Huỷ</button><button class="btn danger" id="resetOk">Xoá</button></div>`);
    $('resetOk').onclick = () => { localStorage.removeItem(Store.KEY); Store.load(); Store.save(); closeModal(); updateGems(); applySettings(); show('name'); };
  };
}

// ---------------- Trang chủ (nhân vật nhún nhảy) ----------------
function updateHomeHello() {
  $('homeHello').textContent = Store.data.name
    ? `Chào ${Store.data.name}! Cùng phiêu lưu qua 5 vương quốc và học gõ 10 ngón nhé!`
    : 'Cùng bạn nhỏ phiêu lưu qua 5 vương quốc và học gõ 10 ngón!';
}
function homeLoop() {
  const cv = $('homeCanvas'), ctx = cv.getContext('2d');
  const th = WORLDS[0].theme;
  const loop = ts => {
    if (App.screen === 'home') {
      const t = ts / 1000;
      Draw.scene(ctx, cv.width, cv.height, cv.height - 50, th, t * 60, t);
      Draw.pet(ctx, Store.data.look.pet === 'none' ? 'unicorn' : Store.data.look.pet, 150, cv.height - 50, t, 1.3, true);
      Draw.girl(ctx, 230, cv.height - 50, Store.data.look, 'run', t, 1.5);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------------- Bàn phím thật ----------------
const TYPABLE = new Set([...'abcdefghijklmnopqrstuvwxyz;,./ ']);
let imeWarned = false;
function onKeyDown(e) {
  if (!$('modal').classList.contains('hidden')) {
    if (e.key === 'Escape' || (e.key === 'Enter' && e.target.tagName !== 'INPUT')) closeModal();
    return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  Sfx.unlock();

  if (App.screen === 'game' && App.game) {
    if (e.key === 'Escape') { togglePause(); return; }
    if (e.key === 'Process' || e.isComposing || e.keyCode === 229) {
      if (!imeWarned) { imeWarned = true; toast('⚠️ Hãy tắt bộ gõ tiếng Việt (Unikey/EVKey) hoặc chuyển sang chế độ E nhé!', 5000); }
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : null;
    if (k && TYPABLE.has(k)) {
      e.preventDefault();
      if (e.getModifierState && e.getModifierState('CapsLock') && /[a-z]/.test(k) && !onKeyDown.capsWarned) {
        onKeyDown.capsWarned = true; toast('Phím Caps Lock đang bật – bé tắt đi nhé!');
      }
      App.game.handleKey(k);
    }
    return;
  }
  if (App.screen === 'intro' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startLevel(); }
  else if (App.screen === 'result' && e.key === 'Enter' && !$('btnNext').disabled) { e.preventDefault(); $('btnNext').click(); }
  else if (App.screen === 'name' && e.key === 'Enter') $('btnNameOk').click();
}

function togglePause() {
  const g = App.game;
  if (!g) return;
  g.setPaused(true);
  Voice.stop();
  modal(`<div class="big-emoji">⏸</div><h2>Tạm dừng</h2>
    <div class="row-buttons"><button class="btn" id="pMap">🗺 Bản đồ</button><button class="btn purple" id="pRetry">↻ Chơi lại</button><button class="btn pink" id="pGo">▶ Chơi tiếp</button></div>`);
  const resume = () => { closeModal(); if (App.game) App.game.setPaused(false); };
  $('pGo').onclick = resume;
  $('pRetry').onclick = () => { closeModal(); startLevel(); };
  $('pMap').onclick = () => { closeModal(); show('map'); };
  // Đóng bằng Esc/Enter cũng tiếp tục chơi
  const obs = new MutationObserver(() => {
    if ($('modal').classList.contains('hidden')) { obs.disconnect(); if (App.game && App.game.paused && App.screen === 'game') App.game.setPaused(false); }
  });
  obs.observe($('modal'), { attributes: true, attributeFilter: ['class'] });
}

// ---------------- Khởi động ----------------
function init() {
  Store.load();
  Voice.init();
  gameKb = new ScreenKeyboard($('gameKb'));
  gameHands = new Hands($('gameHandL'), $('gameHandR'), gameKb.tipSlot);
  introKb = new ScreenKeyboard($('introKb'));
  introHands = new Hands($('introHandL'), $('introHandR'), introKb.tipSlot);
  heatKb = new ScreenKeyboard($('heatKb'));

  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { Sfx.click(); Voice.stop(); show(b.dataset.go); }));
  $('btnPlay').onclick = () => {
    Sfx.unlock(); applySettings(); Sfx.click();
    show('map');
    Voice.speak(`Chọn một màn chơi nhé ${playerName()}!`);
  };
  $('btnWardrobe').onclick = () => { Sfx.click(); show('wardrobe'); };
  $('btnParent').onclick = () => { Sfx.click(); parentGate(); };
  $('btnPractice').onclick = () => { Sfx.click(); startPractice(); };
  $('btnStart').onclick = startLevel;
  $('btnReplayIntro').onclick = () => App.level && Voice.speak(App.level.intro);
  $('btnRetry').onclick = () => App.level && startLevel();
  $('btnPause').onclick = togglePause;
  $('btnNameOk').onclick = () => {
    const n = $('nameInput').value.trim();
    if (!n) { toast('Bé nhập tên vào nhé 💕'); return; }
    Store.data.name = n; Store.save();
    Sfx.unlock(); applySettings();
    show('home');
    Voice.speak(`Xin chào ${n}! Mình là Kỳ Lân Cầu Vồng. Cùng mình học gõ phím mười ngón nhé!`);
  };
  $('btnVoice').onclick = () => { const s = Store.data.settings; s.voice = !s.voice; Store.save(); applySettings(); if (!s.voice) Voice.stop(); };
  $('btnMusic').onclick = () => { Sfx.unlock(); const s = Store.data.settings; s.music = !s.music; Store.save(); applySettings(); };
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal' && !App.game) closeModal(); });
  bindSettings();
  document.addEventListener('keydown', onKeyDown);
  // Âm thanh chỉ được bật sau lần chạm đầu tiên (quy định của trình duyệt)
  document.addEventListener('pointerdown', () => { Sfx.unlock(); applySettings(); }, { once: true });

  updateGems();
  applySettings();
  homeLoop();
  show(Store.data.name ? 'home' : 'name');
  if (!Store.data.name) setTimeout(() => $('nameInput').focus(), 100);
}

document.addEventListener('DOMContentLoaded', init);
