/* Khu Rừng Chung Tay — cooperative rules (pure, no DOM). window.ForestCore in the browser, module.exports in Node.
 * Everyone wins together if the forest has enough trees before the storm season arrives. */
(function (root) {
  'use strict';

  const ANIMALS = [
    { key: 'bear', name: 'Gấu', power: 'Dọn 2 đống rác một lúc', color: '#b5763c' },
    { key: 'rabbit', name: 'Thỏ', power: 'Được nhảy thêm 2 ô', color: '#f1e9e4' },
    { key: 'squirrel', name: 'Sóc', power: 'Nhặt được 2 hạt giống', color: '#d9773a' },
    { key: 'turtle', name: 'Rùa', power: 'Lấy được 2 giọt nước ở suối', color: '#6aa84f' },
    { key: 'stork', name: 'Cò', power: 'Xua mây đen bay đi', color: '#f7f7f2' },
    { key: 'elephant', name: 'Voi', power: 'Phun nước cho cả nhóm', color: '#9aa3ad' },
  ];
  const SCARVES = ['#e2483d', '#f2b632', '#3fa7d6', '#8c5ad6', '#3fbf7f', '#ff7aa8'];

  // The loop: H home, S seeds, W stream, P planting spot, F help a friend, L lucky card, C dark cloud.
  const PATTERN = 'HSWPLSCWPFSWLPCSFWPLSCWP';
  const TILE_INFO = {
    H: { type: 'home', label: 'Nhà Cây' }, S: { type: 'seed', label: 'Hạt giống' }, W: { type: 'water', label: 'Suối mát' },
    P: { type: 'plant', label: 'Chỗ trồng cây' }, F: { type: 'help', label: 'Giúp bạn' }, L: { type: 'luck', label: 'Điều may mắn' }, C: { type: 'cloud', label: 'Mây đen' },
  };
  const TILES = PATTERN.split('').map((c, i) => Object.assign({ id: i }, TILE_INFO[c]));
  const N = TILES.length;

  const LUCK = [
    { key: 'birds', text: 'Đàn chim sẻ mang hạt tới: mỗi bạn +1 hạt' },
    { key: 'rain', text: 'Mưa rào nhẹ: mỗi bạn +1 giọt nước' },
    { key: 'rainbow', text: 'Cầu vồng xuất hiện: mây bão lùi lại 1 nấc' },
    { key: 'sprout', text: 'Hạt cũ nảy mầm: khu rừng có thêm 1 cây' },
    { key: 'hedgehog', text: 'Bạn Nhím tặng bạn 2 hạt giống' },
    { key: 'firefly', text: 'Đom đóm thắp sáng rừng: mỗi bạn +1 tim' },
  ];

  const BADGES = [
    { key: 'planted', name: 'Nhà trồng cây', hint: 'trồng nhiều cây nhất' },
    { key: 'gifts', name: 'Người bạn hào phóng', hint: 'tặng bạn nhiều nhất' },
    { key: 'cleaned', name: 'Chiến binh xanh', hint: 'nhặt nhiều rác nhất' },
    { key: 'hearts', name: 'Trái tim ấm áp', hint: 'nhiều tim nhất' },
    { key: 'seeds', name: 'Thợ nhặt hạt', hint: 'nhặt nhiều hạt nhất' },
    { key: 'water', name: 'Bạn của dòng suối', hint: 'lấy nhiều nước nhất' },
    { key: 'clouds', name: 'Người xua mây', hint: 'xua mây đen' },
  ];

  // Difficulty: more friends means more turns before each storm step, so they plant more.
  const TUNE = { goals: [3, 5, 7, 10, 12, 14], stormMax: 16, yield: 2, dirtyAt: 4 };
  const goalFor = (n) => (TUNE.goals ? TUNE.goals[Math.min(n, 6) - 1] : TUNE.goalBase + TUNE.goalPer * n);
  let STORM_MAX = 12;
  const MAX_TRASH = 4;

  // ---------- helpers ----------
  function rand(st) { let t = (st.seed = (st.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const cur = (st) => st.players[st.turn];
  const A = (p) => ANIMALS.find((a) => a.key === p.animal);
  function log(st, text, p) { st.log.unshift({ who: p ? p.name : '', color: p ? p.color : '', text }); if (st.log.length > 60) st.log.length = 60; }
  function say(st, text) { st.result = text; }
  const others = (st, p) => st.players.filter((o) => o !== p);

  function newGame(picks, seed) { // picks: [{ name, animal }]
    const st = {
      version: 1, seed: (seed == null ? Math.floor(Math.random() * 2 ** 31) : seed) | 0,
      players: picks.map((pk, i) => ({ name: pk.name || ANIMALS.find((a) => a.key === pk.animal).name, animal: pk.animal, color: SCARVES[i % SCARVES.length], pos: 0, seeds: picks.length === 1 ? 2 : 1, water: picks.length === 1 ? 2 : 1, hearts: 0,
        stats: { planted: 0, gifts: 0, cleaned: 0, hearts: 0, seeds: 0, water: 0, clouds: 0 } })),
      turn: 0, round: 1, phase: 'roll', lastRoll: null, moveLeft: 0, choice: null, result: '',
      trees: 0, goal: goalFor(picks.length), storm: 0, stormMax: TUNE.stormMax, trash: [], plots: [],
      outcome: null, badges: null, log: [], rolls: 0, playerRolls: 0, lastEvent: null,
    };
    log(st, `Cả nhóm cần trồng ${st.goal} cây trước khi mùa bão tới!`);
    return st;
  }

  // ---------- turn ----------
  function roll(st, forced) {
    if (st.phase !== 'roll') return null;
    const v = forced || 1 + Math.floor(rand(st) * 6); st.rolls++; st.playerRolls++;
    st.lastRoll = v; st.result = ''; st.lastEvent = null;
    const p = cur(st);
    log(st, `tung được ${v}`, p);
    if (p.animal === 'rabbit') { ask(st, 'hop', `Thỏ tung được ${v}. Nhảy bao xa?`, [{ label: `Đi ${v} ô`, value: v, icon: 'paw' }, { label: `Nhảy xa ${v + 2} ô`, value: v + 2, icon: 'hop' }]); return v; }
    st.moveLeft = v; st.phase = 'moving'; return v;
  }
  function ask(st, kind, title, options) { st.phase = 'choice'; st.choice = { kind, title, options }; }

  function step(st) {
    if (st.phase !== 'moving') return st.phase;
    const p = cur(st); p.pos = (p.pos + 1) % N; st.moveLeft--;
    if (TILES[p.pos].type === 'home' && st.moveLeft > 0) { gain(st, p, 'seeds', 1); log(st, 'đi qua Nhà Cây, nhận 1 hạt', p); }
    if (st.moveLeft <= 0) { land(st, p); return st.phase === 'choice' ? 'choice' : 'landed'; }
    return 'step';
  }

  function gain(st, p, item, n) { p[item] += n; if (item === 'seeds' || item === 'water') p.stats[item] += n; if (item === 'hearts') p.stats.hearts += n; }
  function plantTree(st, p) {
    st.trees++; p.stats.planted++; st.plots.push(st.players.indexOf(p)); gain(st, p, 'hearts', 1);
    st.lastEvent = { kind: 'tree', who: st.players.indexOf(p) };
  }
  function cleanTrash(st, p, tileId) {
    st.trash = st.trash.filter((t) => t !== tileId); p.stats.cleaned++; gain(st, p, 'hearts', 1);
  }

  function land(st, p) {
    const t = TILES[p.pos], me = st.players.indexOf(p);
    let extra = '';
    if (st.trash.includes(p.pos)) {
      cleanTrash(st, p, p.pos);
      if (p.animal === 'bear' && st.trash.length) { const other = st.trash[0]; cleanTrash(st, p, other); extra = ' Gấu dọn luôn một đống rác nữa!'; }
      log(st, 'nhặt rác cho rừng sạch' + (extra ? ' (Gấu dọn 2 đống)' : ''), p);
      extra = ' Bạn nhặt rác giúp rừng sạch đẹp, +1 tim.' + extra;
      st.lastEvent = { kind: 'clean', who: me };
    }
    switch (t.type) {
      case 'home': gain(st, p, 'seeds', 1); gain(st, p, 'hearts', 1); log(st, 'về Nhà Cây nghỉ ngơi (+1 hạt, +1 tim)', p); return done(st, 'Về Nhà Cây nghỉ ngơi: +1 hạt giống, +1 tim.' + extra);
      case 'seed': { const n = TUNE.yield + (p.animal === 'squirrel' ? 1 : 0); gain(st, p, 'seeds', n); log(st, `nhặt ${n} hạt giống`, p); return done(st, `Nhặt được ${n} hạt giống${p.animal === 'squirrel' ? ' (Sóc nhanh tay!)' : ''}.` + extra); }
      case 'water': {
        if (p.animal === 'elephant') { st.players.forEach((o) => gain(st, o, 'water', 1)); gain(st, p, 'hearts', 1); log(st, 'phun nước cho cả nhóm (+1 nước mỗi bạn)', p); st.lastEvent = { kind: 'spray', who: me }; return done(st, 'Voi phun nước cho cả nhóm: mỗi bạn +1 giọt nước!' + extra); }
        const n = TUNE.yield + (p.animal === 'turtle' ? 1 : 0); gain(st, p, 'water', n); log(st, `lấy ${n} giọt nước`, p); return done(st, `Lấy được ${n} giọt nước${p.animal === 'turtle' ? ' (Rùa bơi giỏi!)' : ''}.` + extra);
      }
      case 'plant': return plantSpot(st, p, extra);
      case 'help': {
        const opts = [];
        others(st, p).forEach((o) => { const i = st.players.indexOf(o); if (p.seeds > 0) opts.push({ label: `Tặng ${o.name} 1 hạt`, value: { to: i, item: 'seeds' }, icon: 'seed', color: o.color }); if (p.water > 0) opts.push({ label: `Tặng ${o.name} 1 giọt nước`, value: { to: i, item: 'water' }, icon: 'water', color: o.color }); });
        opts.push({ label: st.players.length > 1 ? 'Ôm cả nhóm (+1 tim mỗi bạn)' : 'Hát một bài (+1 tim)', value: { hug: true }, icon: 'heart' });
        st.pendingExtra = extra; ask(st, 'help', 'Giúp bạn nào?', opts); return;
      }
      case 'luck': {
        const c = LUCK[Math.floor(rand(st) * LUCK.length)];
        if (c.key === 'birds') st.players.forEach((o) => gain(st, o, 'seeds', 1));
        if (c.key === 'rain') st.players.forEach((o) => gain(st, o, 'water', 1));
        if (c.key === 'rainbow') st.storm = Math.max(0, st.storm - 1);
        if (c.key === 'sprout') plantTree(st, p);
        if (c.key === 'hedgehog') gain(st, p, 'seeds', 2);
        if (c.key === 'firefly') st.players.forEach((o) => gain(st, o, 'hearts', 1));
        st.lastEvent = st.lastEvent && st.lastEvent.kind === 'tree' ? st.lastEvent : { kind: 'luck', card: c.key, who: me };
        log(st, c.text, p); done(st, c.text + '.' + extra); checkEnd(st); return;
      }
      case 'cloud': {
        if (p.animal === 'stork') { p.stats.clouds++; gain(st, p, 'hearts', 1); st.storm = Math.max(0, st.storm - 1); log(st, 'vỗ cánh xua mây đen (bão lùi 1 nấc)', p); st.lastEvent = { kind: 'shoo', who: me }; return done(st, 'Cò vỗ cánh xua mây đen bay đi! Bão lùi lại 1 nấc.' + extra); }
        st.storm++; log(st, 'gặp mây đen (bão tới gần 1 nấc)', p); st.lastEvent = { kind: 'cloud', who: me }; done(st, 'Mây đen kéo tới, bão gần thêm 1 nấc. Mau trồng cây nào!' + extra); checkEnd(st); return;
      }
    }
  }

  // At a planting spot: plant up to 2 trees; if something is missing, ask a friend for it.
  function plantSpot(st, p, extra) {
    let planted = 0;
    while (planted < 2 && p.seeds > 0 && p.water > 0) { p.seeds--; p.water--; plantTree(st, p); planted++; }
    if (planted) { log(st, `trồng ${planted} cây`, p); done(st, `Trồng được ${planted} cây non!` + extra); checkEnd(st); return; }
    const need = p.seeds === 0 && p.water === 0 ? null : p.seeds === 0 ? 'seeds' : 'water';
    const helpers = need ? others(st, p).filter((o) => o[need] > 0) : [];
    if (!helpers.length) { log(st, 'chưa đủ hạt và nước để trồng', p); return done(st, (need ? `Còn thiếu ${need === 'seeds' ? 'hạt giống' : 'nước'} mà chưa bạn nào có.` : 'Chưa có hạt và nước để trồng.') + ' Lần sau nhé!' + extra); }
    st.pendingExtra = extra;
    ask(st, 'askHelp', `Thiếu ${need === 'seeds' ? 'hạt giống' : 'nước'}! Nhờ bạn nào?`, helpers.map((o) => ({ label: `Nhờ ${o.name}`, value: { from: st.players.indexOf(o), item: need }, icon: need === 'seeds' ? 'seed' : 'water', color: o.color }))
      .concat([{ label: 'Để lần sau', value: null, icon: 'paw' }]));
  }

  function choose(st, index) {
    if (st.phase !== 'choice' || !st.choice) return false;
    const opt = st.choice.options[index]; if (!opt) return false;
    const p = cur(st), kind = st.choice.kind, extra = st.pendingExtra || ''; st.choice = null; st.pendingExtra = '';
    if (kind === 'hop') { st.moveLeft = opt.value; st.phase = 'moving'; if (opt.value > st.lastRoll) log(st, `nhảy xa ${opt.value} ô`, p); return true; }
    if (kind === 'help') {
      if (opt.value.hug) { st.players.forEach((o) => gain(st, o, 'hearts', 1)); p.stats.gifts++; log(st, 'ôm cả nhóm thật chặt (+1 tim mỗi bạn)', p); st.lastEvent = { kind: 'hug', who: st.players.indexOf(p) }; done(st, 'Cả nhóm ôm nhau thật chặt: mỗi bạn +1 tim!' + extra); return true; }
      const o = st.players[opt.value.to]; p[opt.value.item]--; o[opt.value.item]++; p.stats.gifts++; gain(st, p, 'hearts', 1); gain(st, o, 'hearts', 1);
      log(st, `tặng ${o.name} 1 ${opt.value.item === 'seeds' ? 'hạt' : 'giọt nước'}`, p); st.lastEvent = { kind: 'gift', who: st.players.indexOf(p), to: opt.value.to, item: opt.value.item };
      done(st, `Bạn tặng ${o.name} 1 ${opt.value.item === 'seeds' ? 'hạt giống' : 'giọt nước'}. Cả hai +1 tim!` + extra); return true;
    }
    if (kind === 'askHelp') {
      if (!opt.value) { log(st, 'để lần sau mới trồng', p); done(st, 'Không sao, lần sau mình trồng nhé!' + extra); return true; }
      const o = st.players[opt.value.from]; o[opt.value.item]--; p[opt.value.item]++; o.stats.gifts++; gain(st, o, 'hearts', 1);
      log(st, `được ${o.name} cho 1 ${opt.value.item === 'seeds' ? 'hạt' : 'giọt nước'}`, p);
      st.lastEvent = { kind: 'gift', who: opt.value.from, to: st.players.indexOf(p), item: opt.value.item };
      plantSpot(st, p, ` ${o.name} đã giúp bạn.` + extra); return true;
    }
    return false;
  }

  function done(st, text) { st.phase = 'done'; st.choice = null; say(st, text); }

  function checkEnd(st) {
    if (st.outcome) return true;
    if (st.trees >= st.goal) { st.outcome = 'win'; finish(st); return true; }
    if (st.storm >= st.stormMax) { st.outcome = 'storm'; finish(st); return true; }
    return false;
  }

  // After every turn; at the end of a round the storm draws nearer and litter appears.
  function endTurn(st) {
    if (st.phase !== 'done') return false;
    if (checkEnd(st)) return true;
    st.turn = (st.turn + 1) % st.players.length;
    st.roundEvent = null;
    if (st.turn === 0) {
      st.round++; st.storm++;
      const free = TILES.filter((t) => t.type !== 'home' && !st.trash.includes(t.id) && !st.players.some((p) => p.pos === t.id)).map((t) => t.id);
      let spawned = null; if (st.trash.length < MAX_TRASH && free.length) { spawned = free[Math.floor(rand(st) * free.length)]; st.trash.push(spawned); }
      let dirty = false; if (st.trash.length >= TUNE.dirtyAt) { st.storm++; dirty = true; }
      st.roundEvent = { spawned, dirty };
      log(st, `Hết vòng ${st.round - 1}: bão tới gần${dirty ? ' 2 nấc (rừng nhiều rác quá!)' : ' 1 nấc'}${spawned != null ? ', có rác mới xuất hiện' : ''}.`);
      if (checkEnd(st)) return true;
    }
    st.phase = 'roll'; st.lastRoll = null; st.result = ''; st.lastEvent = null;
    return true;
  }

  // Everyone gets a badge: each in turn takes the category they lead that is still free.
  function finish(st) {
    st.phase = 'over';
    const taken = new Set(), order = st.players.map((p, i) => i).sort((a, b) => st.players[b].stats.hearts - st.players[a].stats.hearts);
    st.badges = st.players.map(() => null);
    order.forEach((i) => {
      const p = st.players[i];
      let best = null, bestScore = -1;
      BADGES.forEach((b) => {
        if (taken.has(b.key)) return;
        const mine = b.key === 'hearts' ? p.stats.hearts : p.stats[b.key], top = Math.max(...st.players.map((o) => (b.key === 'hearts' ? o.stats.hearts : o.stats[b.key]))) || 1;
        const s = mine / top + (b.key === 'clouds' && p.animal !== 'stork' ? -1 : 0);
        if (s > bestScore) { bestScore = s; best = b; }
      });
      taken.add(best.key); st.badges[i] = best.key;
    });
    log(st, st.outcome === 'win' ? `Khu rừng xanh tươi với ${st.trees} cây! Cả nhóm chiến thắng!` : `Mùa bão tới khi rừng có ${st.trees}/${st.goal} cây. Cùng thử lại nhé!`);
  }

  const api = { TUNE, ANIMALS, SCARVES, TILES, LUCK, BADGES, STORM_MAX, MAX_TRASH, goalFor, newGame, roll, step, choose, endTurn, current: cur, animalOf: A };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ForestCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
