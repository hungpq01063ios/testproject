// Giao diện người dùng: HUD, hộp thoại, Ngân hàng biết nói
import { SPACES, GROUPS, JAIL_FINE, fmt, say$ } from './data.js';
import { AI } from './ai.js';
import { sceneCanvas } from './art.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const tpl = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

// Câu thoại của Ngân hàng — luôn đưa tên người chơi vào
const LINES = {
  start: ['Xin chào các nhà đầu tư! Tôi là Ngân hàng. Chúc {names} có một hành trình khám phá Việt Nam thật vui vẻ!'],
  turn: ['Đến lượt {n}. Chúc bạn may mắn!', '{n} ơi, mời bạn gieo xúc xắc!', 'Lượt của {n} đây. Hãy xem vận may hôm nay thế nào!', '{n}, cả bàn đang chờ bạn đó!'],
  turnJail: ['{n} đang ở Nhà Tạm Giữ. Bạn muốn nộp phạt, dùng thẻ, hay thử vận may đổ đôi?'],
  dice: ['{n} gieo được {a} và {b}, tổng cộng {t} bước.', 'Ra {a} và {b}! {n} đi {t} bước.'],
  dbl: [' Đổ đôi!'],
  welcome: ['Chào mừng {n} đến với {place}, {prov}!', '{n} ơi, bạn vừa đặt chân tới {place}!', 'Xin chào {n}! Đây là {place} tuyệt đẹp của {prov}.'],
  ask: ['{n} có muốn mua {place} với giá {price} không?', 'Cơ hội đầu tư đây {n}! {place} chỉ {price} thôi.', '{n} ơi, mua {place} giá {price} nhé?'],
  aiThink: ['{n} đang cân nhắc...'],
  bought: ['Chúc mừng {n} đã sở hữu {place}!', 'Tuyệt vời! {place} giờ đã thuộc về {n}.', 'Giao dịch thành công! {n} là chủ mới của {place}.'],
  decline: ['{n} không mua. Ngân hàng sẽ mở phiên đấu giá {place}!'],
  own: ['{n} về thăm {place} của chính mình. Thật bình yên!', 'Đây là đất của {n} mà. Nghỉ ngơi thôi!'],
  rent: ['{n} ơi, {place} thuộc về {o}. Bạn cần trả {rent} tiền thuê.', 'Ôi! {n} dừng chân tại {place} của {o}. Tiền thuê là {rent}.'],
  mortgaged: ['{place} đang được thế chấp, {n} không phải trả tiền thuê. May quá!'],
  tax: ['{n} ơi, đến kỳ nộp {place}: {amt}.'],
  chance: ['{n} rút một thẻ Cơ Hội...'], chest: ['{n} rút một thẻ Khí Vận...'],
  jailed: ['{n} đã bị đưa vào Nhà Tạm Giữ. Lượt sau hãy cố đổ đôi nhé!'],
  auction: ['Phiên đấu giá {place} bắt đầu! Giá khởi điểm 10 triệu.'],
  auctionWin: ['Chốt! {n} thắng đấu giá {place} với giá {price}.'],
  auctionNone: ['Không ai trả giá. {place} vẫn thuộc về Ngân hàng.'],
  raise: ['{n} cần {amt} nhưng không đủ tiền mặt. Hãy bán nhà hoặc thế chấp tài sản!'],
  bankrupt: ['Rất tiếc! {n} đã phá sản và rời cuộc chơi.'],
  quiz: ['Câu hỏi nhanh cho {n}! Trả lời đúng nhận thưởng 20 triệu đồng.'],
  quizOk: ['Chính xác! {n} thật hiểu biết. Thưởng 20 triệu đồng!'],
  quizBad: ['Tiếc quá {n}! Đáp án đúng là: {ans}.'],
  win: ['Xin chúc mừng {n}! Bạn chính là Tỷ Phú Việt Nam!'],
};

export class UI {
  constructor({ board, sound, voice }) {
    this.board = board; this.sound = sound; this.voice = voice; this.g = null;
    this.settings = Object.assign({ speed: 1, readFacts: true, autoInfo: 'first', quality: 'high' }, this._load('ctp-settings') || {});
    this.board.speed = this.settings.speed;
    this.prevMoney = {};
    this._buildHUD();
  }

  _load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
  _store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } }
  saveSettings() { this._store('ctp-settings', this.settings); }

  // ---------------- HUD ----------------
  _buildHUD() {
    this.hud = $('#hud');
    this.playersEl = $('#players');
    this.actionsEl = $('#actions');
    this.bankerText = $('#banker-text');
    this.roundEl = $('#round');
    this.modalRoot = $('#modal-root');
    this.toastEl = $('#toasts');
    this.tooltip = $('#tooltip');
    this.board.onTileClick = i => { if (!this.modalRoot.children.length) this.placeInfo(i); };
    this.board.onTileHover = (i, e) => this._hover(i, e);
    $('#btn-sound').onclick = () => { this.sound.setSfx(!this.sound.sfxOn); this._syncToggles(); };
    $('#btn-music').onclick = () => { this.sound.setMusic(!this.sound.musicOn); this._syncToggles(); };
    $('#btn-voice').onclick = () => { this.voice.on = !this.voice.on; if (!this.voice.on) this.voice.stop(); this._syncToggles(); };
    $('#btn-cam').onclick = () => { this.board.camMode = this.board.camMode === 'free' ? 'auto' : 'free'; if (this.board.camMode !== 'free') this.board.overview(); this._syncToggles(); };
    $('#btn-view').onclick = () => { const m = this.board.camMode; this.board.camMode = 'auto'; this.board.overview(); this.board.camMode = m; };
    $('#btn-settings').onclick = () => this.settingsDialog();
    $('#btn-help').onclick = () => this.helpDialog();
    $('#btn-full').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
    this.voice.onSpeak = t => this._bubble(t);
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space' || e.code === 'Enter') { const b = this.actionsEl.querySelector('.primary:not([disabled])'); if (b && !this.modalRoot.children.length) { e.preventDefault(); b.click(); } }
    });
    this._syncToggles();
  }

  _syncToggles() {
    $('#btn-sound').classList.toggle('off', !this.sound.sfxOn);
    $('#btn-music').classList.toggle('off', !this.sound.musicOn);
    $('#btn-voice').classList.toggle('off', !this.voice.on);
    $('#btn-cam').classList.toggle('off', this.board.camMode === 'free');
    $('#btn-cam').title = this.board.camMode === 'free' ? 'Máy quay: tự do' : 'Máy quay: tự động theo quân';
  }

  _bubble(text) {
    const b = $('#banker'); b.classList.remove('talk'); void b.offsetWidth; b.classList.add('talk');
    this.bankerText.textContent = text;
  }

  // Ngân hàng nói: hiện bong bóng + đọc giọng nói. Chờ có giới hạn theo tốc độ game.
  async speak(text, { wait: w = true } = {}) {
    const p = this.voice.say(text);
    if (!w) return;
    const min = (700 + text.length * 28) / this.settings.speed;
    if (this.voice.on && this.voice.supported && this.voice.hasVietnamese) await Promise.race([p, wait(Math.max(min, 1200) * 2.2)]);
    else await wait(min);
  }
  line(key, vars, extra = '') { return tpl(pick(LINES[key]), vars) + extra; }

  toast(text, tone = 'info') {
    const t = h('div', { class: 'toast ' + tone }, text);
    this.toastEl.append(t);
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
  }

  sfx(name) { this.sound.play(name); }
  ambience(s) { this.sound.theme(s.sound); }

  // ---------------- Người chơi ----------------
  refresh() {
    const g = this.g; if (!g) return;
    this.roundEl.textContent = g.roundLimit ? `Vòng ${Math.min(g.round, g.roundLimit)}/${g.roundLimit}` : `Vòng ${g.round}`;
    $('#bank-stock').textContent = `🏠 ${g.bankHouses}  🏨 ${g.bankHotels}`;
    if (!this.playersEl.children.length || this.playersEl.children.length !== g.players.length) {
      this.playersEl.innerHTML = '';
      for (const p of g.players) {
        const card = h('div', { class: 'pcard', 'data-id': p.id, style: `--pc:${p.color}`, onclick: () => this.passport(p) },
          h('img', { class: 'thumb', src: this.thumbs?.[p.token + p.color] || '', alt: '' }),
          h('div', { class: 'pinfo' }, h('div', { class: 'pname' }), h('div', { class: 'pmoney' }), h('div', { class: 'pprops' })),
          h('div', { class: 'pbadges' }));
        this.playersEl.append(card);
      }
    }
    for (const p of g.players) {
      const card = this.playersEl.querySelector(`[data-id="${p.id}"]`);
      card.classList.toggle('active', g.current === p && !g.over);
      card.classList.toggle('bankrupt', p.bankrupt);
      card.querySelector('.pname').textContent = p.name + (p.isAI ? ' 🤖' : '');
      const prev = this.prevMoney[p.id];
      if (prev !== undefined && prev !== p.money) this._moneyFloat(card, p.money - prev);
      this._countMoney(card.querySelector('.pmoney'), prev ?? p.money, p.money);
      this.prevMoney[p.id] = p.money;
      const pr = card.querySelector('.pprops'); pr.innerHTML = '';
      for (const i of g.ownedBy(p.id)) {
        const s = SPACES[i], o = g.props[i];
        pr.append(h('span', { class: 'chip' + (o.mortgaged ? ' mort' : ''), title: s.name + (o.houses ? ` (${o.houses === 5 ? 'khách sạn' : o.houses + ' nhà'})` : ''), style: `background:${s.group ? GROUPS[s.group].color : s.type === 'rail' ? '#455a64' : '#9e9d24'}` }, o.houses === 5 ? '★' : o.houses ? String(o.houses) : ''));
      }
      const b = card.querySelector('.pbadges'); b.innerHTML = '';
      if (p.inJail) b.append(h('span', { class: 'badge jail', title: 'Đang ở Nhà Tạm Giữ' }, '🔒'));
      if (p.jailCards.length) b.append(h('span', { class: 'badge', title: 'Thẻ Ân Xá' }, '🎫×' + p.jailCards.length));
      b.append(h('span', { class: 'badge', title: 'Địa danh đã khám phá' }, '📍' + p.visited.filter(i => SPACES[i].price).length));
    }
  }
  _countMoney(el, from, to) {
    cancelAnimationFrame(el._raf);
    const t0 = performance.now();
    const step = () => { const e = Math.min(1, (performance.now() - t0) / 700); el.textContent = fmt(Math.round(from + (to - from) * (1 - (1 - e) ** 3))); if (e < 1) el._raf = requestAnimationFrame(step); };
    step();
  }
  _moneyFloat(card, d) {
    const f = h('div', { class: 'mfloat ' + (d > 0 ? 'up' : 'down') }, (d > 0 ? '+' : '') + fmt(d));
    card.append(f); setTimeout(() => f.remove(), 1600);
  }

  // ---------------- Vòng đời trận ----------------
  async gameStart(g) {
    this.g = g;
    document.body.classList.add('playing');
    this.refresh();
    this.board.overview();
    await this.speak(tpl(LINES.start[0], { names: g.players.map(p => p.name).join(', ') }));
  }

  async turnStart(p) {
    this.refresh();
    this.board.setActive(p);
    this.board.focusPlayer(p);
    this._banner(p);
    this.sfx('click');
    await this.speak(this.line(p.inJail ? 'turnJail' : 'turn', { n: p.name }), { wait: !p.isAI || this.settings.speed < 2 });
  }
  _banner(p) {
    const b = h('div', { class: 'turn-banner', style: `--pc:${p.color}` }, h('img', { src: this.thumbs?.[p.token + p.color] || '' }), h('span', {}, 'Lượt của ', h('b', {}, p.name)));
    document.body.append(b); setTimeout(() => b.remove(), 2200);
  }

  async diceRolled(p, [a, b]) {
    const el = $('#dice-result');
    el.innerHTML = ''; el.append(h('span', { class: 'die' }, a), h('span', { class: 'plus' }, '+'), h('span', { class: 'die' }, b), h('span', { class: 'eq' }, '= ' + (a + b)));
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    if (a === b) el.append(h('span', { class: 'dbl' }, 'ĐÔI!'));
    await this.speak(this.line('dice', { n: p.name, a, b, t: a + b }, a === b ? LINES.dbl[0] : ''), { wait: false });
  }

  async msg(text, tone = 'info', sfx) {
    if (sfx) this.sfx(sfx); else if (tone === 'good') this.sfx('good'); else if (tone === 'bad') this.sfx('bad');
    this.toast(text, tone);
    await this.speak(text);
  }

  // ---------------- Lựa chọn hành động ----------------
  chooseAction(p, o) {
    this.refresh();
    if (p.isAI) {
      this._renderActions(p, o, true);
      return wait(500 / this.settings.speed).then(() => AI.chooseAction(this.g, p, o));
    }
    return new Promise(res => this._renderActions(p, o, false, res));
  }
  _renderActions(p, o, disabled, res) {
    const A = this.actionsEl; A.innerHTML = '';
    const btn = (label, icon, act, cls = '', title = '') => h('button', { class: 'act ' + cls, disabled: disabled || null, title, onclick: () => { this.sfx('click'); A.innerHTML = ''; res(act); } }, h('span', { class: 'ico' }, icon), label);
    if (disabled) { A.append(h('div', { class: 'ai-wait' }, h('span', { class: 'spinner' }), `${p.name} đang chơi...`)); return; }
    if (o.inJail) {
      if (o.canPayJail) A.append(btn(`Nộp phạt ${fmt(JAIL_FINE)}`, '💸', 'payJail'));
      if (o.canUseCard) A.append(btn('Dùng Thẻ Ân Xá', '🎫', 'useCard'));
      A.append(btn('Thử đổ đôi', '🎲', 'roll', 'primary'));
    } else if (o.canRoll) A.append(btn('Gieo xúc xắc', '🎲', 'roll', 'primary', 'Phím Space'));
    A.append(btn('Tài sản', '🏠', 'manage'));
    if (this.g.active.length > 1) A.append(btn('Giao dịch', '🤝', 'trade'));
    if (o.canEnd) A.append(btn('Kết thúc lượt', '✅', 'end', 'primary', 'Phím Space'));
  }

  // ---------------- Bưu thiếp địa danh ----------------
  _postcard(idx, { mode, p, owner, rent, firstVisit, buttons = [], auto }) {
    const s = SPACES[idx], g = this.g, o = g?.props[idx];
    const col = s.group ? GROUPS[s.group].color : s.type === 'rail' ? '#455a64' : '#9e9d24';
    const art = sceneCanvas(s.art, 960, 560);
    const img = h('canvas', { width: 960, height: 560, class: 'pc-art' }); img.getContext('2d').drawImage(art, 0, 0);
    const fx = h('div', { class: 'pc-fx fx-' + (s.fx || 'sparkle') });
    for (let i = 0; i < 26; i++) fx.append(h('i', { style: `--x:${Math.random() * 100}%;--d:${(2 + Math.random() * 4).toFixed(2)}s;--delay:${(-Math.random() * 5).toFixed(2)}s;--s:${(0.6 + Math.random()).toFixed(2)}` }));
    const facts = (s.facts || []).map((f, k) => h('li', { style: `animation-delay:${0.25 + k * 0.18}s` }, f));
    const deed = this._deed(idx);
    const status = !o ? null : o.owner === null ? h('div', { class: 'pc-status free' }, 'Chưa có chủ') :
      h('div', { class: 'pc-status', style: `--pc:${g.players[o.owner].color}` }, `Chủ sở hữu: ${g.players[o.owner].name}`, o.mortgaged ? ' · đang thế chấp' : '', o.houses ? ` · ${o.houses === 5 ? 'Khách sạn' : o.houses + ' nhà'}` : '');
    const card = h('div', { class: 'postcard', style: `--gc:${col}` },
      h('div', { class: 'pc-hero' }, img, fx,
        h('div', { class: 'pc-title' },
          s.group ? h('div', { class: 'pc-region' }, GROUPS[s.group].name) : null,
          h('h2', {}, s.name), s.province ? h('div', { class: 'pc-prov' }, '📍 ' + s.province) : null),
        firstVisit && p ? h('div', { class: 'stamp', style: `--pc:${p.color}` }, h('b', {}, 'ĐÃ ĐẾN'), h('small', {}, p.name)) : null),
      h('div', { class: 'pc-body' },
        h('div', { class: 'pc-facts' }, h('h3', {}, '💡 Bạn có biết?'), h('ul', {}, facts)),
        h('div', { class: 'pc-side' }, status, deed)),
      mode === 'rent' ? h('div', { class: 'pc-banner bad' }, `${p.name} phải trả ${fmt(rent)} cho ${owner.name}`) : null,
      mode === 'buy' ? h('div', { class: 'pc-banner' }, `Giá mua: ${fmt(s.price)} · ${p.name} đang có ${fmt(p.money)}`) : null,
      h('div', { class: 'pc-actions' }, buttons));
    return this.modal(card, { cls: 'postcard-wrap', auto, closable: mode === 'info' });
  }

  _deed(idx) {
    const s = SPACES[idx];
    if (s.type === 'property') {
      const r = s.rent, gH = GROUPS[s.group].house;
      return h('table', { class: 'deed' },
        h('tr', {}, h('td', {}, 'Đất trống'), h('td', {}, fmt(r[0]))),
        h('tr', {}, h('td', {}, 'Cả nhóm màu'), h('td', {}, fmt(r[0] * 2))),
        ...[1, 2, 3, 4].map(k => h('tr', {}, h('td', {}, `${k} nhà`), h('td', {}, fmt(r[k])))),
        h('tr', { class: 'hl' }, h('td', {}, 'Khách sạn'), h('td', {}, fmt(r[5]))),
        h('tr', { class: 'sm' }, h('td', {}, 'Giá xây mỗi nhà'), h('td', {}, fmt(gH))),
        h('tr', { class: 'sm' }, h('td', {}, 'Thế chấp'), h('td', {}, fmt(s.price / 2))));
    }
    if (s.type === 'rail') return h('table', { class: 'deed' }, ...[1, 2, 3, 4].map(k => h('tr', {}, h('td', {}, `Sở hữu ${k} bến`), h('td', {}, fmt(25 * 2 ** (k - 1))))), h('tr', { class: 'sm' }, h('td', {}, 'Thế chấp'), h('td', {}, fmt(100))));
    if (s.type === 'utility') return h('table', { class: 'deed' }, h('tr', {}, h('td', {}, 'Sở hữu 1 nhà máy'), h('td', {}, '4 × xúc xắc')), h('tr', {}, h('td', {}, 'Sở hữu cả 2'), h('td', {}, '10 × xúc xắc')), h('tr', { class: 'sm' }, h('td', {}, 'Thế chấp'), h('td', {}, fmt(75))));
    return null;
  }

  _readFacts(idx, p) {
    const s = SPACES[idx];
    if (!this.settings.readFacts || !s.facts) return;
    this.voice.say(this.line('welcome', { n: p.name, place: s.name, prov: s.province || '' }) + ' ' + s.facts[0]);
  }

  async offerBuy(p, idx, firstVisit) {
    const s = SPACES[idx];
    const afford = p.money >= s.price;
    const vars = { n: p.name, place: s.name, prov: s.province, price: say$(s.price) };
    if (p.isAI) {
      const yes = AI.wantBuy(this.g, p, idx);
      const m = this._postcard(idx, { mode: 'buy', p, firstVisit, buttons: [h('div', { class: 'ai-wait' }, h('span', { class: 'spinner' }), this.line('aiThink', vars))] });
      this.voice.say(this.line('welcome', vars));
      await wait(2200 / this.settings.speed);
      m.close();
      if (!yes) await this.speak(this.line('decline', vars));
      return yes;
    }
    this.voice.say(this.line('welcome', vars) + ' ' + (this.settings.readFacts ? s.facts[0] + ' ' : '') + this.line('ask', vars));
    return new Promise(res => {
      const m = this._postcard(idx, {
        mode: 'buy', p, firstVisit, buttons: [
          h('button', { class: 'btn gold big', disabled: !afford || null, onclick: () => { m.close(); res(true); } }, `🏷️ Mua ngay ${fmt(s.price)}`),
          h('button', { class: 'btn', onclick: async () => { m.close(); await this.speak(this.line('decline', vars)); res(false); } }, '🔨 Không mua — Đấu giá'),
        ],
      });
      if (!afford) m.el.querySelector('.pc-actions').prepend(h('div', { class: 'warn' }, 'Bạn không đủ tiền mặt để mua.'));
    });
  }

  async bought(p, idx) {
    this.sfx('buy');
    this.refresh();
    this._celebrate(SPACES[idx].group ? GROUPS[SPACES[idx].group].color : '#ffd54f');
    await this.speak(this.line('bought', { n: p.name, place: SPACES[idx].name }));
    if (SPACES[idx].group && this.g.ownsGroup(p.id, SPACES[idx].group)) {
      await this.msg(`${p.name} đã sở hữu trọn bộ ${GROUPS[SPACES[idx].group].name}! Tiền thuê đất trống tăng gấp đôi và có thể xây nhà.`, 'good', 'deal');
    }
  }

  async _infoCard(p, idx, firstVisit, text, tone) {
    const show = this.settings.autoInfo === 'always' || (this.settings.autoInfo === 'first' && firstVisit);
    if (show) {
      this._readFacts(idx, p);
      await new Promise(res => {
        const m = this._postcard(idx, { mode: 'info', p, firstVisit, buttons: [h('button', { class: 'btn gold', onclick: () => { m.close(); res(); } }, 'Tiếp tục ➜')], auto: p.isAI ? 3500 / this.settings.speed : 0 });
        m.onclose = res;
      });
      this.voice.stop();
    }
    if (text) await this.msg(text, tone);
  }
  visitOwn(p, idx, fv) { return this._infoCard(p, idx, fv, this.line('own', { n: p.name, place: SPACES[idx].name }), 'info'); }
  visitMortgaged(p, idx, owner, fv) { return this._infoCard(p, idx, fv, this.line('mortgaged', { n: p.name, place: SPACES[idx].name }), 'good'); }

  async payRent(p, idx, owner, rent, firstVisit) {
    const s = SPACES[idx];
    const text = this.line('rent', { n: p.name, place: s.name, o: owner.name, rent: say$(rent) });
    this.voice.say((firstVisit ? this.line('welcome', { n: p.name, place: s.name, prov: s.province || '' }) + ' ' : '') + text);
    await new Promise(res => {
      const m = this._postcard(idx, { mode: 'rent', p, owner, rent, firstVisit, buttons: [h('button', { class: 'btn red big', onclick: () => { m.close(); res(); } }, `💸 Trả ${fmt(rent)}`)], auto: p.isAI ? 2600 / this.settings.speed : 0 });
      m.onclose = res;
    });
    this.sfx('pay');
  }

  async tax(p, idx) {
    const s = SPACES[idx];
    await this.msg(this.line('tax', { n: p.name, place: s.name, amt: say$(s.amount) }), 'bad', 'pay');
  }

  async jailed(p) {
    this.sfx('siren');
    this.refresh();
    await this.speak(this.line('jailed', { n: p.name }));
  }

  // ---------------- Thẻ ----------------
  async showCard(p, deck, card) {
    this.speak(this.line(deck, { n: p.name }), { wait: false });
    await this.board.drawCardAnim(deck);
    const isChance = deck === 'chance';
    const front = h('div', { class: 'face front ' + deck }, h('canvas', { width: 480, height: 300 }), h('b', {}, isChance ? 'CƠ HỘI' : 'KHÍ VẬN'));
    front.querySelector('canvas').getContext('2d').drawImage(sceneCanvas(isChance ? 'chance' : 'chest', 480, 300), 0, 0);
    const back = h('div', { class: 'face back ' + deck }, h('div', { class: 'ctitle' }, isChance ? '❓ CƠ HỘI' : '🧧 KHÍ VẬN'), h('p', {}, card.text), h('small', {}, p.name));
    const flip = h('div', { class: 'card3d' }, h('div', { class: 'inner' }, front, back));
    await new Promise(res => {
      const ok = h('button', { class: 'btn gold', onclick: () => { m.close(); res(); } }, 'Thực hiện ➜');
      const m = this.modal(h('div', { class: 'card-wrap' }, flip, h('div', { class: 'pc-actions' }, ok)), { auto: p.isAI ? 3800 / this.settings.speed : 0 });
      m.onclose = res;
      setTimeout(() => { flip.classList.add('flipped'); this.sfx('card'); }, 350);
      setTimeout(() => this.speak(card.text, { wait: false }), 700);
    });
  }

  // ---------------- Câu đố địa lý ----------------
  async quiz(p, idx) {
    const s = SPACES[idx], q = s.quiz;
    await this.speak(this.line('quiz', { n: p.name }), { wait: false });
    this.voice.say(q.q);
    const result = await new Promise(res => {
      let done = false;
      const opts = q.a.map((a, k) => h('button', { class: 'qopt', onclick: () => choose(k) }, h('b', {}, 'ABC'[k]), a));
      const bar = h('div', { class: 'qbar' }, h('i'));
      const box = h('div', { class: 'quiz', style: `--gc:${s.group ? GROUPS[s.group].color : '#ffb300'}` },
        h('div', { class: 'qhead' }, h('span', {}, '🎓 Đố vui địa lý'), h('span', { class: 'qplace' }, s.name)),
        h('h3', {}, q.q), h('div', { class: 'qopts' }, opts), bar,
        h('div', { class: 'qfoot' }, `${p.name} · Trả lời đúng nhận +20 Tr`));
      const m = this.modal(box, { closable: false });
      const T = 20000;
      bar.firstChild.style.animationDuration = T + 'ms';
      const timer = setTimeout(() => choose(-1), T);
      const choose = (k) => {
        if (done) return; done = true; clearTimeout(timer);
        opts.forEach((o, i) => { o.disabled = true; if (i === q.c) o.classList.add('ok'); else if (i === k) o.classList.add('bad'); });
        const ok = k === q.c;
        this.sfx(ok ? 'quizOk' : 'quizBad');
        if (ok) this._celebrate('#ffd54f');
        setTimeout(() => { m.close(); res(ok); }, 1600 / Math.min(this.settings.speed, 1.5));
      };
      if (p.isAI) setTimeout(() => choose(AI.quizAnswer(this.g, p, s)), (1500 + Math.random() * 1500) / this.settings.speed);
    });
    await this.speak(result ? this.line('quizOk', { n: p.name }) : this.line('quizBad', { n: p.name, ans: q.a[q.c] }));
    return result;
  }

  // ---------------- Đấu giá ----------------
  async auctionStart(idx) {
    this._auction = { idx, el: null };
    await this.speak(this.line('auction', { place: SPACES[idx].name }));
  }
  auctionTurn(p, idx, cur, leader) {
    const s = SPACES[idx];
    if (this._auctionModal) this._auctionModal.close();
    return new Promise(res => {
      const done = v => { m.close(); this._auctionModal = null; res(v); };
      const bids = [10, 50, 100].map(d => cur + d).filter(v => v <= p.money);
      const box = h('div', { class: 'auction', style: `--gc:${s.group ? GROUPS[s.group].color : '#607d8b'}` },
        h('div', { class: 'au-head' }, '🔨 ĐẤU GIÁ'), h('h2', {}, s.name),
        h('div', { class: 'au-price' }, h('small', {}, 'Giá hiện tại'), h('b', {}, fmt(cur)), h('small', {}, leader ? `Dẫn đầu: ${leader.name}` : 'Chưa có ai trả giá'), h('small', {}, `Giá niêm yết: ${fmt(s.price)}`)),
        h('div', { class: 'au-turn', style: `--pc:${p.color}` }, `Lượt trả giá: ${p.name} (có ${fmt(p.money)})`),
        h('div', { class: 'pc-actions' }, p.isAI ? h('div', { class: 'ai-wait' }, h('span', { class: 'spinner' }), `${p.name} đang tính toán...`) : [
          ...bids.map(v => h('button', { class: 'btn gold', onclick: () => { this.sfx('coin'); done(v); } }, `+${fmt(v - cur)} → ${fmt(v)}`)),
          h('button', { class: 'btn', onclick: () => done(0) }, 'Bỏ qua'),
        ]));
      const m = this.modal(box, { closable: false });
      this._auctionModal = m;
      if (p.isAI) setTimeout(() => { const b = AI.auctionBid(this.g, p, idx, cur); if (b) { this.sfx('coin'); this.toast(`${p.name} trả ${fmt(b)}`); } else this.toast(`${p.name} bỏ qua`); done(b); }, 900 / this.settings.speed);
    });
  }
  async auctionEnd(idx, winner, price) {
    if (this._auctionModal) { this._auctionModal.close(); this._auctionModal = null; }
    if (winner) { this.sfx('cash'); this.refresh(); await this.speak(this.line('auctionWin', { n: winner.name, place: SPACES[idx].name, price: say$(price) })); }
    else await this.speak(this.line('auctionNone', { place: SPACES[idx].name }));
  }

  // ---------------- Quản lý tài sản ----------------
  manage(p, g, need = 0, creditor = null) {
    if (p.isAI) { AI.autoManage(g, p); return Promise.resolve(); }
    return new Promise(res => {
      const box = h('div', { class: 'manage' });
      const render = () => {
        box.innerHTML = '';
        const mine = g.ownedBy(p.id);
        box.append(h('div', { class: 'mg-head' }, h('h2', {}, need ? '⚠️ Huy động vốn' : `🏠 Tài sản của ${p.name}`), h('div', { class: 'mg-money' }, 'Tiền mặt: ', h('b', {}, fmt(p.money)))));
        if (need) box.append(h('div', { class: 'warn' }, `Cần trả ${fmt(need)}${creditor ? ' cho ' + creditor.name : ''}. Còn thiếu ${fmt(Math.max(0, need - p.money))}. Hãy bán nhà hoặc thế chấp.`));
        if (!mine.length) box.append(h('p', { class: 'empty' }, 'Bạn chưa sở hữu tài sản nào. Hãy đi mua đất nhé!'));
        const groups = {};
        for (const i of mine) { const k = SPACES[i].group || SPACES[i].type; (groups[k] ||= []).push(i); }
        const list = h('div', { class: 'mg-list' });
        for (const [k, arr] of Object.entries(groups)) {
          const col = GROUPS[k]?.color || (k === 'rail' ? '#455a64' : '#9e9d24');
          const full = GROUPS[k] && g.ownsGroup(p.id, k);
          list.append(h('div', { class: 'mg-group', style: `--gc:${col}` },
            h('div', { class: 'mg-gname' }, GROUPS[k]?.name || (k === 'rail' ? 'Giao thông' : 'Năng lượng'), full ? h('span', { class: 'full' }, '✔ Trọn bộ') : null),
            ...arr.map(i => {
              const o = g.props[i], s = SPACES[i];
              const b = (label, fn, ok, cls = '') => h('button', { class: 'mini ' + cls, disabled: !ok || null, onclick: () => { fn(); render(); } }, label);
              return h('div', { class: 'mg-row' + (o.mortgaged ? ' mort' : '') },
                h('span', { class: 'mg-name', onclick: () => this.placeInfo(i) }, s.name),
                h('span', { class: 'mg-h' }, o.houses === 5 ? '🏨' : '🏠'.repeat(o.houses)),
                s.type === 'property' ? b(`+ Nhà (${fmt(g.houseCost(i))})`, () => g.build(p, i), g.canBuild(p, i), 'green') : null,
                s.type === 'property' ? b(`− Bán (${fmt(g.houseCost(i) / 2)})`, () => { g.sell(p, i); this.sfx('pay'); }, g.canSell(p, i)) : null,
                o.mortgaged ? b(`Chuộc (${fmt(g.unmortgageCost(i))})`, () => { g.unmortgage(p, i); this.sfx('pay'); }, g.canUnmortgage(p, i), 'gold')
                  : b(`Thế chấp (+${fmt(g.mortgageValue(i))})`, () => { g.mortgage(p, i); this.sfx('coin'); }, g.canMortgage(p, i)));
            })));
        }
        box.append(list);
        box.append(h('p', { class: 'hint' }, 'Luật: phải sở hữu trọn nhóm màu mới được xây; xây đều giữa các ô; 4 nhà nâng thành khách sạn. Bán nhà nhận lại 50%. Chuộc thế chấp mất thêm 10% lãi.'));
        const acts = h('div', { class: 'pc-actions' });
        if (need) {
          acts.append(h('button', { class: 'btn gold', disabled: p.money < need || null, onclick: () => { m.close(); res('done'); } }, `Thanh toán ${fmt(need)}`));
          acts.append(h('button', { class: 'btn red', onclick: () => { m.close(); res('bankrupt'); } }, 'Tuyên bố phá sản'));
        } else acts.append(h('button', { class: 'btn gold', onclick: () => { m.close(); res(); } }, 'Đóng'));
        box.append(acts);
      };
      const m = this.modal(box, { closable: !need, onclose: () => res(need ? 'done' : undefined) });
      render();
    });
  }

  async raiseFunds(p, amount, creditor, g) {
    if (p.isAI) return AI.raiseFunds(g, p, amount);
    await this.speak(this.line('raise', { n: p.name, amt: say$(amount) }), { wait: false });
    return this.manage(p, g, amount, creditor);
  }

  // ---------------- Giao dịch ----------------
  trade(p, g) {
    const others = g.active.filter(o => o !== p);
    if (!others.length) return Promise.resolve(null);
    return new Promise(res => {
      const st = { to: others[0].id, give: new Set(), get: new Set(), giveMoney: 0, getMoney: 0 };
      const box = h('div', { class: 'trade' });
      const tradable = pid => g.ownedBy(pid).filter(i => SPACES[i].type !== 'property' || g.groupIdx(SPACES[i].group).every(k => g.props[k].houses === 0));
      const render = () => {
        box.innerHTML = '';
        const t = g.players[st.to];
        const side = (who, set, moneyKey, max) => h('div', { class: 'tr-side' },
          h('h3', { style: `color:${who.color}` }, who === p ? `${p.name} đưa ra` : `${who.name} đưa ra`),
          h('div', { class: 'tr-props' }, tradable(who.id).length ? tradable(who.id).map(i => h('label', { class: 'tr-prop', style: `--gc:${SPACES[i].group ? GROUPS[SPACES[i].group].color : '#607d8b'}` },
            h('input', { type: 'checkbox', checked: set.has(i) || null, onchange: e => { e.target.checked ? set.add(i) : set.delete(i); } }), SPACES[i].name + (g.props[i].mortgaged ? ' (thế chấp)' : ''))) : h('p', { class: 'empty' }, 'Không có tài sản giao dịch được')),
          h('label', { class: 'tr-money' }, 'Tiền: ', h('input', { type: 'number', min: 0, max, step: 10, value: st[moneyKey], oninput: e => { st[moneyKey] = Math.max(0, Math.min(max, Math.round(+e.target.value || 0))); } }), ` / ${fmt(max)}`));
        box.append(h('h2', {}, '🤝 Đề nghị giao dịch'),
          h('div', { class: 'tr-to' }, 'Giao dịch với: ', ...others.map(o => h('button', { class: 'pill' + (o.id === st.to ? ' on' : ''), style: `--pc:${o.color}`, onclick: () => { st.to = o.id; st.get.clear(); st.getMoney = 0; render(); } }, o.name + (o.isAI ? ' 🤖' : '')))),
          h('div', { class: 'tr-grid' }, side(p, st.give, 'giveMoney', p.money), h('div', { class: 'tr-swap' }, '⇄'), side(t, st.get, 'getMoney', t.money)),
          h('div', { class: 'pc-actions' },
            h('button', { class: 'btn gold', onclick: () => { const offer = { to: st.to, give: [...st.give], get: [...st.get], giveMoney: st.giveMoney, getMoney: st.getMoney }; if (!g.validTrade(p, offer)) { this.sfx('error'); this.toast('Đề nghị chưa hợp lệ', 'bad'); return; } m.close(); res(offer); } }, 'Gửi đề nghị'),
            h('button', { class: 'btn', onclick: () => { m.close(); res(null); } }, 'Huỷ')));
      };
      const m = this.modal(box, { onclose: () => res(null) });
      render();
    });
  }

  async respondTrade(t, from, offer, g) {
    const desc = side => side.map(i => SPACES[i].name).join(', ');
    const summary = `${from.name} đưa: ${[desc(offer.give), offer.giveMoney ? fmt(offer.giveMoney) : ''].filter(Boolean).join(' + ') || 'không có gì'} — đổi lấy: ${[desc(offer.get), offer.getMoney ? fmt(offer.getMoney) : ''].filter(Boolean).join(' + ') || 'không có gì'}.`;
    if (t.isAI) {
      await this.speak(`${t.name} đang xem xét đề nghị của ${from.name}...`);
      return AI.acceptTrade(g, t, from, offer);
    }
    this.voice.say(`${t.name} ơi, ${from.name} gửi cho bạn một đề nghị giao dịch.`);
    return new Promise(res => {
      const m = this.modal(h('div', { class: 'trade respond' }, h('h2', {}, `📨 ${t.name}, bạn có đề nghị mới`), h('p', { class: 'big' }, summary),
        h('div', { class: 'pc-actions' }, h('button', { class: 'btn gold', onclick: () => { m.close(); res(true); } }, '✔ Đồng ý'), h('button', { class: 'btn red', onclick: () => { m.close(); res(false); } }, '✖ Từ chối'))), { closable: false });
    });
  }

  async bankrupted(p, creditor) {
    this.sfx('bankrupt');
    this.refresh();
    await this.speak(this.line('bankrupt', { n: p.name }) + (creditor ? ` Toàn bộ tài sản được chuyển cho ${creditor.name}.` : ''));
  }

  // ---------------- Kết thúc ----------------
  async gameOver(g, winner) {
    this.actionsEl.innerHTML = '';
    this.sound.play('victory');
    this._celebrate('#ffd54f', 160);
    this.board.overview();
    this.board.fx('fireworks', 0, null);
    try { localStorage.removeItem('ctp-save'); } catch { /* bỏ qua */ }
    const rank = [...g.players].sort((a, b) => (a.bankrupt - b.bankrupt) || g.netWorth(b) - g.netWorth(a));
    const box = h('div', { class: 'gameover' },
      h('div', { class: 'crown' }, '👑'),
      h('h1', {}, winner ? `${winner.name}` : 'Kết thúc'), h('p', { class: 'sub' }, 'TỶ PHÚ VIỆT NAM'),
      h('table', { class: 'rank' }, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Người chơi'), h('th', {}, 'Tài sản'), h('th', {}, 'Địa danh'), h('th', {}, 'Đố vui')),
        ...rank.map((p, i) => h('tr', { class: p.bankrupt ? 'out' : '' }, h('td', {}, i + 1), h('td', { style: `color:${p.color}` }, p.name), h('td', {}, p.bankrupt ? 'Phá sản' : fmt(g.netWorth(p))), h('td', {}, p.visited.filter(k => SPACES[k].price).length + '/28'), h('td', {}, p.quizCorrect)))),
      h('div', { class: 'pc-actions' }, h('button', { class: 'btn gold big', onclick: () => location.reload() }, '🎲 Ván mới')));
    this.modal(box, { closable: false });
    if (winner) await this.speak(this.line('win', { n: winner.name }));
  }

  save(g) { if (!g.over) this._store('ctp-save', g.serialize()); }

  // ---------------- Hộp thoại chung ----------------
  modal(content, { closable = true, cls = '', auto = 0, onclose } = {}) {
    const wrap = h('div', { class: 'modal ' + cls }, h('div', { class: 'backdrop' }), h('div', { class: 'mbox' }, content));
    const api = { el: wrap, onclose };
    let closed = false;
    api.close = () => { if (closed) return; closed = true; wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); this.sound.duck(false); };
    if (closable) {
      const x = h('button', { class: 'mclose', title: 'Đóng', onclick: () => { api.close(); api.onclose?.(); } }, '✕');
      wrap.querySelector('.mbox').append(x);
      wrap.querySelector('.backdrop').onclick = () => { api.close(); api.onclose?.(); };
    }
    if (auto) setTimeout(() => { if (!closed) { api.close(); api.onclose?.(); } }, auto);
    this.modalRoot.append(wrap);
    this.sound.duck(true);
    return api;
  }

  placeInfo(idx) {
    const s = SPACES[idx];
    if (!s.facts) return;
    this.sfx('click');
    this.voice.say(s.name + (s.province ? ', ' + s.province : '') + '. ' + s.facts.join(' '), { interrupt: true });
    const m = this._postcard(idx, { mode: 'info', buttons: [h('button', { class: 'btn gold', onclick: () => { m.close(); this.voice.stop(); } }, 'Đóng')] });
    const prev = m.onclose; m.onclose = () => { this.voice.stop(); prev?.(); };
    this.sound.theme(s.sound);
  }

  passport(p) {
    const g = this.g; if (!g) return;
    const places = SPACES.map((s, i) => [s, i]).filter(([s]) => s.price);
    const box = h('div', { class: 'passport', style: `--pc:${p.color}` },
      h('div', { class: 'pp-head' }, h('img', { src: this.thumbs?.[p.token + p.color] || '' }), h('div', {}, h('small', {}, 'HỘ CHIẾU DU LỊCH'), h('h2', {}, p.name), h('div', {}, `Đã khám phá ${p.visited.filter(i => SPACES[i].price).length}/28 địa danh · Đố vui đúng ${p.quizCorrect} câu · Tài sản ${fmt(g.netWorth(p))}`))),
      h('div', { class: 'pp-grid' }, places.map(([s, i]) => {
        const v = p.visited.includes(i);
        const c = h('canvas', { width: 160, height: 100 }); c.getContext('2d').drawImage(sceneCanvas(s.art, 160, 100), 0, 0);
        return h('div', { class: 'pp-stamp' + (v ? ' on' : ''), onclick: () => this.placeInfo(i), title: s.name }, c, h('span', {}, s.name), v ? h('em', {}, '✔') : null);
      })));
    this.modal(box);
  }

  settingsDialog() {
    const S = this.settings, V = this.voice;
    const row = (label, ctrl) => h('label', { class: 'set-row' }, h('span', {}, label), ctrl);
    const sel = (opts, val, on) => { const e = h('select', { onchange: ev => on(ev.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val) || null }, l))); return e; };
    const voices = V.voices.length ? V.voices.map(v => [v.name, v.name]) : [['', 'Không tìm thấy giọng tiếng Việt']];
    const box = h('div', { class: 'settings' }, h('h2', {}, '⚙️ Cài đặt'),
      row('Giọng đọc Ngân hàng', sel(voices, V.voice?.name, v => V.setVoice(v))),
      !V.hasVietnamese ? h('p', { class: 'warn' }, 'Trình duyệt chưa có giọng tiếng Việt. Gợi ý: dùng Microsoft Edge (giọng HoaiMy/NamMinh) hoặc Chrome trên Android. Lời thoại vẫn hiển thị trong bong bóng.') : null,
      row('Tốc độ đọc', h('input', { type: 'range', min: 0.7, max: 1.6, step: 0.05, value: V.rate, oninput: e => { V.rate = +e.target.value; } })),
      row('Thử giọng', h('button', { class: 'mini', onclick: () => V.say(`Xin chào ${this.g?.current?.name || 'bạn'}! Tôi là Ngân hàng của Cờ Tỷ Phú Việt Nam.`, { interrupt: true }) }, '▶ Nghe thử')),
      row('Đọc thông tin địa danh', sel([[1, 'Bật'], [0, 'Tắt']], S.readFacts ? 1 : 0, v => { S.readFacts = v === '1'; this.saveSettings(); })),
      row('Hiện bưu thiếp địa danh', sel([['first', 'Lần đầu ghé thăm'], ['always', 'Mọi lần'], ['never', 'Chỉ khi mua/trả tiền']], S.autoInfo, v => { S.autoInfo = v; this.saveSettings(); })),
      row('Tốc độ trò chơi', sel([[0.75, 'Chậm'], [1, 'Bình thường'], [1.5, 'Nhanh'], [2.5, 'Rất nhanh']], S.speed, v => { S.speed = +v; this.board.speed = +v; this.saveSettings(); })),
      row('Đồ hoạ', sel([['high', 'Cao (bloom, đổ bóng)'], ['low', 'Nhẹ (máy yếu)']], S.quality, v => { S.quality = v; this.board.setQuality(v); this.saveSettings(); })),
      row('Âm lượng nhạc nền', h('input', { type: 'range', min: 0, max: 0.8, step: 0.05, value: this.sound.musicVol, oninput: e => { this.sound.musicVol = +e.target.value; this.sound.setMusic(this.sound.musicOn); } })),
      h('div', { class: 'pc-actions' }, h('button', { class: 'btn gold', onclick: () => m.close() }, 'Xong')));
    const m = this.modal(box);
  }

  helpDialog() {
    const box = h('div', { class: 'help' }, h('h2', {}, '📖 Luật chơi Cờ Tỷ Phú Việt Nam'),
      h('ul', {},
        h('li', {}, 'Mỗi người bắt đầu với 1,5 tỷ đồng (1.500 Tr). Đi qua ô Xuất Phát nhận 200 Tr.'),
        h('li', {}, 'Gieo 2 xúc xắc để di chuyển. Đổ đôi được gieo tiếp; đổ đôi 3 lần liên tiếp phải vào tù.'),
        h('li', {}, 'Dừng ở địa danh chưa có chủ: được mua theo giá niêm yết, nếu không mua sẽ đấu giá cho mọi người.'),
        h('li', {}, 'Dừng ở địa danh của người khác: trả tiền thuê. Sở hữu trọn nhóm màu: tiền thuê đất trống ×2 và được xây nhà.'),
        h('li', {}, 'Xây đều các ô trong nhóm. 4 nhà nâng cấp thành Khách sạn. Ngân hàng chỉ có 32 nhà và 12 khách sạn.'),
        h('li', {}, 'Nhà ga / Sân bay / Cảng: thuê 25 – 50 – 100 – 200 Tr tuỳ số bến sở hữu. Nhà máy năng lượng: 4× hoặc 10× số xúc xắc.'),
        h('li', {}, 'Nhà Tạm Giữ: nộp 50 Tr, dùng Thẻ Ân Xá, hoặc thử đổ đôi (tối đa 3 lượt). Khi ở tù vẫn được thu tiền thuê.'),
        h('li', {}, 'Thiếu tiền: bán nhà (50% giá xây) hoặc thế chấp (50% giá đất). Chuộc lại mất thêm 10%. Không đủ thì phá sản.'),
        h('li', {}, 'Lần đầu ghé mỗi địa danh: đọc thông tin, nhận dấu Hộ chiếu và trả lời câu đố để nhận thưởng 20 Tr!'),
        h('li', {}, 'Người cuối cùng còn trụ lại (hoặc giàu nhất khi hết số vòng giới hạn) là Tỷ Phú Việt Nam.')),
      h('h3', {}, '🎮 Điều khiển'),
      h('ul', {}, h('li', {}, 'Kéo chuột / vuốt để xoay bàn cờ, cuộn / chụm để phóng to.'), h('li', {}, 'Nhấp vào bất kỳ ô nào để xem thông tin địa danh.'), h('li', {}, 'Phím Space / Enter: gieo xúc xắc hoặc kết thúc lượt.'), h('li', {}, 'Nhấp vào thẻ người chơi để xem Hộ chiếu du lịch.')),
      h('div', { class: 'pc-actions' }, h('button', { class: 'btn gold', onclick: () => m.close() }, 'Đã hiểu!')));
    const m = this.modal(box);
  }

  _hover(idx, e) {
    const tt = this.tooltip;
    if (idx == null) { tt.classList.remove('show'); return; }
    const s = SPACES[idx], o = this.g?.props[idx];
    tt.innerHTML = '';
    tt.append(h('b', {}, s.name), s.province ? h('small', {}, s.province) : null,
      s.price ? h('div', {}, `Giá: ${fmt(s.price)}`) : null,
      o && o.owner !== null ? h('div', { style: `color:${this.g.players[o.owner].color}` }, `Chủ: ${this.g.players[o.owner].name}${o.mortgaged ? ' (thế chấp)' : ''}`) : null,
      o && o.owner !== null && !o.mortgaged && s.type === 'property' ? h('div', {}, `Thuê hiện tại: ${fmt(this.g.rentFor(idx, 7))}`) : null);
    tt.style.left = Math.min(window.innerWidth - 220, e.clientX + 16) + 'px'; tt.style.top = (e.clientY + 16) + 'px';
    tt.classList.add('show');
  }

  _celebrate(color = '#ffd54f', n = 80) {
    const layer = h('div', { class: 'confetti' });
    const cols = [color, '#ffffff', '#e53935', '#ffd54f', '#43a047', '#1e88e5'];
    for (let i = 0; i < n; i++) layer.append(h('i', { style: `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-duration:${(1.8 + Math.random() * 1.8).toFixed(2)}s;animation-delay:${(Math.random() * 0.5).toFixed(2)}s;transform:rotate(${Math.random() * 360}deg)` }));
    document.body.append(layer); setTimeout(() => layer.remove(), 4200);
  }
}
