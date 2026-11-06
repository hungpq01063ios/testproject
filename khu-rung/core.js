/* Khu Rừng Chung Tay — cooperative rules (pure, no DOM). window.ForestCore in the browser, module.exports in Node.
 * Five zones around the Mother Tree. Together the animals plant trees in every zone and rescue each zone's lost
 * little friend, before the storm season arrives. Mini-games are played in the page and report 0–3 stars back. */
(function (root) {
  'use strict';

  const ANIMALS = [
    { key: 'bear', name: 'Gấu', power: 'Dọn 2 đống rác một lúc', color: '#b5763c' },
    { key: 'rabbit', name: 'Thỏ', power: 'Được nhảy thêm 2 ô', color: '#f1e9e4' },
    { key: 'squirrel', name: 'Sóc', power: 'Nhặt thêm 1 hạt giống', color: '#d9773a' },
    { key: 'turtle', name: 'Rùa', power: 'Lấy thêm 1 giọt nước', color: '#6aa84f' },
    { key: 'stork', name: 'Cò', power: 'Xua mây đen bay đi', color: '#f7f7f2' },
    { key: 'elephant', name: 'Voi', power: 'Phun nước cho cả nhóm', color: '#9aa3ad' },
  ];
  const SCARVES = ['#e2483d', '#f2b632', '#3fa7d6', '#8c5ad6', '#3fbf7f', '#ff7aa8'];

  const ZONES = [
    { key: 'bamboo', name: 'Rừng Tre', friend: { key: 'douc', name: 'Voọc con' }, color: '#7fbf3a',
      fact: 'Voọc chà vá chân nâu có bộ lông năm màu, sống ở rừng miền Trung Việt Nam. Bạn ấy ăn lá cây và rất cần rừng xanh.' },
    { key: 'flower', name: 'Đồi Hoa', friend: { key: 'fawn', name: 'Nai con' }, color: '#ff8fb8',
      fact: 'Hoa cần ong và bướm để kết hạt. Có hoa thì mới có quả, có quả thì các bạn thú có cái ăn.' },
    { key: 'falls', name: 'Thác Nước', friend: { key: 'otter', name: 'Rái cá con' }, color: '#3fa7e6',
      fact: 'Rái cá bơi rất giỏi và chỉ sống ở nơi nước sạch. Không xả rác xuống suối là giúp rái cá đó!' },
    { key: 'lotus', name: 'Đầm Sen', friend: { key: 'crane', name: 'Sếu con' }, color: '#ff9fc0',
      fact: 'Sếu đầu đỏ cao gần bằng người lớn, hay về đồng bằng sông Cửu Long kiếm ăn vào mùa khô.' },
    { key: 'rocks', name: 'Núi Đá', friend: { key: 'pangolin', name: 'Tê tê con' }, color: '#b09a7a',
      fact: 'Tê tê có lớp vảy như áo giáp và cuộn tròn lại khi sợ. Tê tê ăn kiến, giúp rừng không bị kiến phá.' },
  ];

  // Each zone is a loop of 9 tiles out from the Mother Tree and back; tile 4 is the tip with a bridge to the next zone.
  const MINI = { catch: 'Hứng hạt dẻ', sprout: 'Tưới cây con', sort: 'Phân loại rác', count: 'Đếm cá', clouds: 'Xua mây', find: 'Tìm bạn trốn',
    runner: 'Chạy về nhà', race: 'Đua xe lá', river: 'Nhảy đá qua suối', flappy: 'Bay cùng Sếu', maze: 'Mê cung hang đá' };
  const GAME_POOL = ['catch', 'sprout', 'sort', 'count', 'clouds', 'find'];
  // Each lost friend comes home through its own challenge; failing it means trying again on a later visit.
  const RESCUE_GAME = { bamboo: 'runner', flower: 'race', falls: 'river', lotus: 'flappy', rocks: 'maze' };
  const PETALS = {
    bamboo: ['seed', 'game:catch', 'water', 'plant', 'story', 'rescue', 'plant', 'help', 'seed'],
    flower: ['water', 'seed', 'game:sprout', 'plant', 'luck', 'rescue', 'cloud', 'plant', 'seed'],
    falls: ['seed', 'water', 'game:count', 'plant', 'story', 'rescue', 'plant', 'water', 'help'],
    lotus: ['water', 'game:sort', 'seed', 'plant', 'luck', 'rescue', 'plant', 'cloud', 'seed'],
    rocks: ['seed', 'water', 'game:clouds', 'plant', 'story', 'rescue', 'plant', 'luck', 'water'],
  };
  const LABEL = { hub: 'Cây Mẹ', seed: 'Hạt giống', water: 'Suối mát', plant: 'Vườn ươm', story: 'Bé có biết?', rescue: 'Bạn nhỏ bị lạc', help: 'Giúp bạn', luck: 'Điều may mắn', cloud: 'Mây đen', game: 'Trò chơi' };
  function buildBoard() {
    const tiles = [{ id: 0, type: 'hub', label: LABEL.hub, zone: -1, idx: -1, next: [] }];
    ZONES.forEach((z, k) => PETALS[z.key].forEach((code, i) => {
      const [type, mini] = code.split(':');
      tiles.push({ id: tiles.length, type, mini: mini || null, label: mini ? MINI[mini] : type === 'rescue' ? z.friend.name + ' bị lạc' : LABEL[type], zone: k, idx: i, next: [] });
    }));
    const at = (k, i) => 1 + k * 9 + i;
    ZONES.forEach((z, k) => {
      tiles[0].next.push(at(k, 0));
      for (let i = 0; i < 8; i++) tiles[at(k, i)].next.push(at(k, i + 1));
      tiles[at(k, 8)].next.push(0);
      tiles[at(k, 4)].next.push(at((k + 1) % ZONES.length, 5)); // bridge to the next zone
    });
    return tiles;
  }
  const TILES = buildBoard();

  const LUCK = [
    { key: 'birds', text: 'Đàn chim sẻ mang hạt tới: mỗi bạn +1 hạt' },
    { key: 'rain', text: 'Mưa rào nhẹ: mỗi bạn +1 giọt nước' },
    { key: 'rainbow', text: 'Cầu vồng xuất hiện: mây bão lùi lại 1 nấc' },
    { key: 'hedgehog', text: 'Bạn Nhím tặng bạn 2 hạt giống' },
    { key: 'firefly', text: 'Đom đóm thắp sáng rừng: mỗi bạn +1 tim' },
    { key: 'bees', text: 'Đàn ong giúp hoa kết hạt: bạn +1 hạt, +1 giọt nước' },
  ];
  const BADGES = [
    { key: 'planted', name: 'Nhà trồng cây', hint: 'trồng nhiều cây nhất' },
    { key: 'rescues', name: 'Người hùng cứu hộ', hint: 'tìm được bạn nhỏ bị lạc' },
    { key: 'stars', name: 'Ngôi sao trò chơi', hint: 'nhiều sao trò chơi nhất' },
    { key: 'gifts', name: 'Người bạn hào phóng', hint: 'tặng bạn nhiều nhất' },
    { key: 'cleaned', name: 'Chiến binh xanh', hint: 'nhặt nhiều rác nhất' },
    { key: 'hearts', name: 'Trái tim ấm áp', hint: 'nhiều tim nhất' },
    { key: 'facts', name: 'Nhà thông thái nhí', hint: 'đọc nhiều điều thú vị' },
    { key: 'seeds', name: 'Thợ nhặt hạt', hint: 'nhặt nhiều hạt nhất' },
  ];
  const TIMES = ['Buổi sáng', 'Buổi trưa', 'Buổi chiều', 'Buổi tối'];

  const TUNE = { need: [1, 2, 2, 3, 3, 4], stormMax: [48, 32, 19, 18, 14, 13], yield: 2, dirtyAt: 4, maxTrash: 5 };

  // ---------- helpers ----------
  function rand(st) { let t = (st.seed = (st.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const cur = (st) => st.players[st.turn];
  const animalOf = (p) => ANIMALS.find((a) => a.key === p.animal);
  function log(st, text, p) { st.log.unshift({ who: p ? p.name : '', color: p ? p.color : '', text }); if (st.log.length > 80) st.log.length = 80; }
  const others = (st, p) => st.players.filter((o) => o !== p);
  const zoneDone = (z, need) => z.trees >= need && z.rescued;

  function newGame(picks, seed) {
    const n = Math.min(6, Math.max(1, picks.length));
    const st = {
      version: 2, seed: (seed == null ? Math.floor(Math.random() * 2 ** 31) : seed) | 0,
      players: picks.map((pk, i) => ({ name: pk.name || ANIMALS.find((a) => a.key === pk.animal).name, animal: pk.animal, color: SCARVES[i % SCARVES.length], pos: 0, seeds: n === 1 ? 2 : 1, water: n === 1 ? 2 : 1, hearts: 0,
        stats: { planted: 0, gifts: 0, cleaned: 0, hearts: 0, seeds: 0, water: 0, clouds: 0, stars: 0, rescues: 0, facts: 0 } })),
      zones: ZONES.map(() => ({ trees: 0, rescued: false, restored: false })), need: TUNE.need[n - 1],
      turn: 0, round: 1, phase: 'roll', lastRoll: null, moveLeft: 0, forkPick: null, choice: null, mini: null, result: '',
      storm: 0, stormMax: TUNE.stormMax[n - 1], trash: [], stars: 0, outcome: null, badges: null, log: [], events: [],
      rolls: 0, playerRolls: 0, minisPlayed: 0,
    };
    log(st, `Cả nhóm cần hồi sinh 5 vùng rừng: mỗi vùng ${st.need} cây và cứu bạn nhỏ bị lạc.`);
    return st;
  }
  const time = (st) => TIMES[(st.round - 1) % 4];
  const restoredCount = (st) => st.zones.filter((z) => z.restored).length;
  function ev(st, e) { st.events.push(e); }

  // ---------- turn ----------
  function roll(st, forced) {
    if (st.phase !== 'roll') return null;
    const v = forced || 1 + Math.floor(rand(st) * 6); st.rolls++; st.playerRolls++;
    st.lastRoll = v; st.result = ''; st.events = [];
    const p = cur(st); log(st, `tung được ${v}`, p);
    if (p.animal === 'rabbit') { ask(st, 'hop', `Thỏ tung được ${v}. Nhảy bao xa?`, [{ label: `Đi ${v} ô`, value: v, icon: 'paw' }, { label: `Nhảy xa ${v + 2} ô`, value: v + 2, icon: 'hop' }]); return v; }
    st.moveLeft = v; st.phase = 'moving'; return v;
  }
  function ask(st, kind, title, options, extra) { st.phase = 'choice'; st.choice = Object.assign({ kind, title, options }, extra || {}); }
  function need(st, k) { const z = st.zones[k]; const a = []; if (z.trees < st.need) a.push(`cần ${st.need - z.trees} cây`); if (!z.rescued) a.push(`cứu ${ZONES[k].friend.name}`); return a.length ? a.join(', ') : 'đã hồi sinh'; }

  function step(st) {
    if (st.phase !== 'moving') return st.phase;
    const p = cur(st), here = TILES[p.pos];
    if (here.next.length > 1 && p.forkPick == null) {
      if (here.type === 'hub') ask(st, 'fork', 'Đi vùng nào?', here.next.map((id) => { const k = TILES[id].zone; return { label: ZONES[k].name, hint: need(st, k), value: id, icon: 'zone' + k, zone: k, done: st.zones[k].restored }; }));
      else { const k = here.zone, k2 = TILES[here.next[1]].zone; ask(st, 'fork', 'Qua cầu hay đi tiếp?', [{ label: `Đi tiếp ${ZONES[k].name}`, hint: need(st, k), value: here.next[0], icon: 'zone' + k, zone: k }, { label: `Qua cầu sang ${ZONES[k2].name}`, hint: need(st, k2), value: here.next[1], icon: 'bridge', zone: k2 }]); }
      return 'choice';
    }
    const nextId = here.next.length > 1 ? p.forkPick : here.next[0];
    p.forkPick = null; p.pos = nextId; st.moveLeft--;
    const t2 = TILES[p.pos];
    if (t2.type === 'hub' && st.moveLeft > 0) { gain(p, 'seeds', 1); log(st, 'đi qua Cây Mẹ, nhận 1 hạt', p); }
    // stop spots: a lost friend waiting, or a nursery that needs trees when you carry seeds and water
    if (st.moveLeft > 0 && t2.type === 'rescue' && !st.zones[t2.zone].rescued) { st.moveLeft = 0; ev(st, { kind: 'stopped', why: 'rescue', who: st.turn }); }
    if (st.moveLeft > 0 && t2.type === 'plant' && st.zones[t2.zone].trees < st.need && p.seeds > 0 && p.water > 0) { st.moveLeft = 0; ev(st, { kind: 'stopped', why: 'plant', who: st.turn }); }
    if (st.moveLeft <= 0) { land(st, p); return ['choice', 'mini'].includes(st.phase) ? 'choice' : 'landed'; }
    return 'step';
  }

  function gain(p, item, n) { p[item] += n; if (item === 'seeds' || item === 'water') p.stats[item] += n; if (item === 'hearts') p.stats.hearts += n; }
  function done(st, text) { st.phase = 'done'; st.choice = null; st.mini = null; st.result = text; checkEnd(st); }

  function cleanHere(st, p) {
    if (!st.trash.includes(p.pos)) return '';
    st.trash = st.trash.filter((t) => t !== p.pos); p.stats.cleaned++; gain(p, 'hearts', 1);
    let extra = ' Bạn nhặt rác giúp rừng sạch đẹp, +1 tim.';
    if (p.animal === 'bear' && st.trash.length) { st.trash.shift(); p.stats.cleaned++; extra += ' Gấu dọn luôn một đống rác nữa!'; }
    ev(st, { kind: 'clean', who: st.turn }); log(st, 'nhặt rác cho rừng sạch', p);
    return extra;
  }

  function land(st, p) {
    const t = TILES[p.pos], me = st.turn, extra = cleanHere(st, p);
    switch (t.type) {
      case 'hub': gain(p, 'seeds', 1); gain(p, 'water', 1); gain(p, 'hearts', 1); log(st, 'về Cây Mẹ nghỉ ngơi', p); ev(st, { kind: 'hub', who: me }); return done(st, 'Cây Mẹ tặng bạn 1 hạt, 1 giọt nước và 1 tim.' + extra);
      case 'seed': { const n = TUNE.yield + (p.animal === 'squirrel' ? 1 : 0); gain(p, 'seeds', n); log(st, `nhặt ${n} hạt`, p); return done(st, `Nhặt được ${n} hạt giống${p.animal === 'squirrel' ? ' (Sóc nhanh tay!)' : ''}.` + extra); }
      case 'water': {
        if (p.animal === 'elephant') { st.players.forEach((o) => gain(o, 'water', 1)); gain(p, 'water', 1); gain(p, 'hearts', 1); ev(st, { kind: 'spray', who: me }); log(st, 'phun nước cho cả nhóm', p); return done(st, 'Voi phun nước: mỗi bạn +1 giọt nước, Voi thêm 1 giọt!' + extra); }
        const n = TUNE.yield + (p.animal === 'turtle' ? 1 : 0); gain(p, 'water', n); log(st, `lấy ${n} giọt nước`, p); return done(st, `Lấy được ${n} giọt nước${p.animal === 'turtle' ? ' (Rùa bơi giỏi!)' : ''}.` + extra);
      }
      case 'plant': return plantSpot(st, p, extra);
      case 'game': { const kind = GAME_POOL[Math.floor(rand(st) * GAME_POOL.length)]; st.phase = 'mini'; st.choice = null; st.mini = { kind, title: MINI[kind], zone: t.zone, extra }; return; }
      case 'rescue': {
        const z = st.zones[t.zone];
        if (z.rescued) { gain(p, 'hearts', 1); log(st, `ghé thăm ${ZONES[t.zone].friend.name}`, p); return done(st, `${ZONES[t.zone].friend.name} vẫy tay chào bạn! +1 tim.` + extra); }
        const kind = RESCUE_GAME[ZONES[t.zone].key];
        st.phase = 'mini'; st.choice = null; st.mini = { kind, rescue: true, title: `${MINI[kind]}: giúp ${ZONES[t.zone].friend.name}`, zone: t.zone, friend: ZONES[t.zone].friend.key, extra }; return;
      }
      case 'story': { p.stats.facts++; gain(p, 'hearts', 1); st.stars++; p.stats.stars++; ev(st, { kind: 'fact', zone: t.zone, who: me }); log(st, `nghe chuyện ${ZONES[t.zone].name}`, p); return done(st, 'Bé có biết? ' + ZONES[t.zone].fact + ' (+1 tim, +1 sao)' + extra); }
      case 'help': {
        const opts = [];
        others(st, p).forEach((o) => { const i = st.players.indexOf(o); if (p.seeds > 0) opts.push({ label: `Tặng ${o.name} 1 hạt`, value: { to: i, item: 'seeds' }, icon: 'seed', color: o.color }); if (p.water > 0) opts.push({ label: `Tặng ${o.name} 1 giọt nước`, value: { to: i, item: 'water' }, icon: 'water', color: o.color }); });
        opts.push({ label: st.players.length > 1 ? 'Ôm cả nhóm (+1 tim mỗi bạn)' : 'Hát một bài (+1 tim)', value: { hug: true }, icon: 'heart' });
        st.pendingExtra = extra; return ask(st, 'help', 'Giúp bạn nào?', opts);
      }
      case 'luck': {
        const c = LUCK[Math.floor(rand(st) * LUCK.length)];
        if (c.key === 'birds') st.players.forEach((o) => gain(o, 'seeds', 1));
        if (c.key === 'rain') st.players.forEach((o) => gain(o, 'water', 1));
        if (c.key === 'rainbow') st.storm = Math.max(0, st.storm - 1);
        if (c.key === 'hedgehog') gain(p, 'seeds', 2);
        if (c.key === 'firefly') st.players.forEach((o) => gain(o, 'hearts', 1));
        if (c.key === 'bees') { gain(p, 'seeds', 1); gain(p, 'water', 1); }
        ev(st, { kind: 'luck', card: c.key, who: me }); log(st, c.text, p); return done(st, c.text + '.' + extra);
      }
      case 'cloud': {
        if (p.animal === 'stork') { p.stats.clouds++; gain(p, 'hearts', 1); st.storm = Math.max(0, st.storm - 1); ev(st, { kind: 'shoo', who: me }); log(st, 'xua mây đen', p); return done(st, 'Cò vỗ cánh xua mây đen bay đi! Bão lùi lại 1 nấc.' + extra); }
        st.storm++; ev(st, { kind: 'cloud', who: me }); log(st, 'gặp mây đen', p); return done(st, 'Mây đen kéo tới, bão gần thêm 1 nấc. Mau lên nào!' + extra);
      }
    }
  }

  function plantSpot(st, p, extra) {
    const k = TILES[p.pos].zone, z = st.zones[k];
    if (z.trees >= st.need) { gain(p, 'hearts', 1); return done(st, `${ZONES[k].name} đã đủ cây rồi! Sang vùng khác trồng nhé. +1 tim.` + extra); }
    let planted = 0;
    while (planted < 2 && z.trees < st.need && p.seeds > 0 && p.water > 0) { p.seeds--; p.water--; z.trees++; p.stats.planted++; gain(p, 'hearts', 1); planted++; }
    if (planted) { ev(st, { kind: 'tree', zone: k, n: planted, who: st.turn }); log(st, `trồng ${planted} cây ở ${ZONES[k].name}`, p); checkZone(st, k); return done(st, `Trồng được ${planted} cây ở ${ZONES[k].name}! (${z.trees}/${st.need})` + extra); }
    const missing = p.seeds === 0 && p.water === 0 ? null : p.seeds === 0 ? 'seeds' : 'water';
    const helpers = missing ? others(st, p).filter((o) => o[missing] > 0) : [];
    if (!helpers.length) return done(st, (missing ? `Còn thiếu ${missing === 'seeds' ? 'hạt giống' : 'nước'} mà chưa bạn nào có.` : 'Chưa có hạt và nước để trồng.') + ' Đi nhặt thêm nhé!' + extra);
    st.pendingExtra = extra;
    ask(st, 'askHelp', `Thiếu ${missing === 'seeds' ? 'hạt giống' : 'nước'}! Nhờ bạn nào?`, helpers.map((o) => ({ label: `Nhờ ${o.name}`, value: { from: st.players.indexOf(o), item: missing }, icon: missing === 'seeds' ? 'seed' : 'water', color: o.color })).concat([{ label: 'Để lần sau', value: null, icon: 'paw' }]));
  }

  function checkZone(st, k) {
    const z = st.zones[k];
    if (!z.restored && zoneDone(z, st.need)) { z.restored = true; st.players.forEach((o) => gain(o, 'hearts', 1)); st.storm = Math.max(0, st.storm - 1); ev(st, { kind: 'restored', zone: k }); log(st, `${ZONES[k].name} đã hồi sinh! Rừng mạnh hơn, bão lùi 1 nấc.`); }
  }

  function choose(st, index) {
    if (st.phase !== 'choice' || !st.choice) return false;
    const opt = st.choice.options[index]; if (!opt) return false;
    const p = cur(st), kind = st.choice.kind, extra = st.pendingExtra || ''; st.choice = null; st.pendingExtra = '';
    if (kind === 'hop') { st.moveLeft = opt.value; st.phase = 'moving'; return true; }
    if (kind === 'fork') { p.forkPick = opt.value; st.phase = 'moving'; if (opt.icon === 'bridge') ev(st, { kind: 'bridge', who: st.turn }); return true; }
    if (kind === 'help') {
      if (opt.value.hug) { st.players.forEach((o) => gain(o, 'hearts', 1)); p.stats.gifts++; ev(st, { kind: 'hug', who: st.turn }); log(st, 'ôm cả nhóm thật chặt', p); done(st, 'Cả nhóm ôm nhau thật chặt: mỗi bạn +1 tim!' + extra); return true; }
      const o = st.players[opt.value.to]; p[opt.value.item]--; o[opt.value.item]++; p.stats.gifts++; gain(p, 'hearts', 1); gain(o, 'hearts', 1);
      ev(st, { kind: 'gift', who: st.turn, to: opt.value.to, item: opt.value.item }); log(st, `tặng ${o.name} 1 ${opt.value.item === 'seeds' ? 'hạt' : 'giọt nước'}`, p);
      done(st, `Bạn tặng ${o.name} 1 ${opt.value.item === 'seeds' ? 'hạt giống' : 'giọt nước'}. Cả hai +1 tim!` + extra); return true;
    }
    if (kind === 'askHelp') {
      if (!opt.value) { done(st, 'Không sao, lần sau mình trồng nhé!' + extra); return true; }
      const o = st.players[opt.value.from]; o[opt.value.item]--; p[opt.value.item]++; o.stats.gifts++; gain(o, 'hearts', 1);
      ev(st, { kind: 'gift', who: opt.value.from, to: st.turn, item: opt.value.item }); log(st, `được ${o.name} giúp`, p);
      plantSpot(st, p, ` ${o.name} đã giúp bạn.` + extra); return true;
    }
    return false;
  }

  // The page plays the mini-game and reports 0–3 stars.
  function miniResult(st, stars) {
    if (st.phase !== 'mini' || !st.mini) return false;
    stars = Math.max(0, Math.min(3, stars | 0));
    const p = cur(st), m = st.mini, extra = m.extra || ''; st.minisPlayed++;
    st.stars += stars; p.stats.stars += stars; if (stars) gain(p, 'hearts', 1);
    let text = '';
    if (m.kind === 'catch') { gain(p, 'seeds', 1 + stars); text = `Hứng được ${1 + stars} hạt dẻ!`; }
    if (m.kind === 'sprout') { gain(p, 'water', 1 + stars); text = `Cây con vui quá, tặng bạn ${1 + stars} giọt nước!`; }
    if (m.kind === 'count') { gain(p, 'seeds', Math.max(1, stars)); gain(p, 'water', Math.max(1, stars)); text = `Đếm giỏi lắm! +${Math.max(1, stars)} hạt và +${Math.max(1, stars)} giọt nước.`; }
    if (m.kind === 'sort') { const n = stars >= 2 ? 2 : stars; for (let i = 0; i < n && st.trash.length; i++) { st.trash.shift(); p.stats.cleaned++; } gain(p, 'seeds', 1); text = `Phân loại rác đúng ${stars === 3 ? 'hết' : 'nhiều'}! ${n ? `Rừng bớt ${n} đống rác.` : ''} +1 hạt.`; }
    if (m.kind === 'clouds') { const n = stars >= 3 ? 2 : stars >= 1 ? 1 : 0; st.storm = Math.max(0, st.storm - n); text = n ? `Xua được mây, bão lùi lại ${n} nấc!` : 'Mây vẫn còn đó, lần sau cố lên nhé!'; }
    if (m.rescue && stars === 0) { gain(p, 'hearts', 1); p.stats.tries = (p.stats.tries || 0) + 1; ev(st, { kind: 'rescueFail', zone: m.zone, who: st.turn }); log(st, `chưa giúp được ${ZONES[m.zone].friend.name}`, p); text = `${ZONES[m.zone].friend.name} sợ quá chạy vào rừng mất rồi. Lần sau quay lại thử nữa nhé! (+1 tim vì đã cố gắng)`; }
    if (m.rescue && stars > 0) { const z = st.zones[m.zone]; z.rescued = true; p.stats.rescues++; gain(p, 'hearts', 2); ev(st, { kind: 'rescue', zone: m.zone, who: st.turn }); log(st, `tìm thấy ${ZONES[m.zone].friend.name}!`, p); text = `Tìm thấy ${ZONES[m.zone].friend.name} rồi! Bạn ấy về với mẹ. +2 tim.`; checkZone(st, m.zone); }
    log(st, `${m.title}: ${stars} sao`, p);
    ev(st, { kind: 'mini', mini: m.kind, stars, who: st.turn });
    done(st, `${text} (${stars} sao)` + extra);
    return true;
  }

  function checkEnd(st) {
    if (st.outcome) return true;
    if (st.zones.every((z) => z.restored)) { st.outcome = 'win'; finish(st); return true; }
    if (st.storm >= st.stormMax) { st.outcome = 'storm'; finish(st); return true; }
    return false;
  }

  function endTurn(st) {
    if (st.phase !== 'done') return false;
    if (checkEnd(st)) return true;
    st.turn = (st.turn + 1) % st.players.length; st.roundEvent = null; st.events = [];
    if (st.turn === 0) {
      st.round++; st.storm++;
      const free = TILES.filter((t) => t.type !== 'hub' && !st.trash.includes(t.id) && !st.players.some((p) => p.pos === t.id)).map((t) => t.id);
      let spawned = null; if (st.trash.length < TUNE.maxTrash && free.length) { spawned = free[Math.floor(rand(st) * free.length)]; st.trash.push(spawned); }
      let dirty = false; if (st.trash.length >= TUNE.dirtyAt) { st.storm++; dirty = true; }
      st.roundEvent = { spawned, dirty, time: time(st) };
      log(st, `${time(st)} vòng ${st.round}: bão gần thêm ${dirty ? '2 nấc (nhiều rác quá!)' : '1 nấc'}.`);
      if (checkEnd(st)) return true;
    }
    st.phase = 'roll'; st.lastRoll = null; st.result = '';
    return true;
  }

  function finish(st) {
    st.phase = 'over';
    const taken = new Set(), order = st.players.map((p, i) => i).sort((a, b) => st.players[b].stats.hearts - st.players[a].stats.hearts);
    st.badges = st.players.map(() => null);
    order.forEach((i) => {
      const p = st.players[i]; let best = null, bestScore = -1;
      BADGES.forEach((b) => { if (taken.has(b.key)) return; const val = (o) => (b.key === 'hearts' ? o.stats.hearts : o.stats[b.key]); const top = Math.max(...st.players.map(val)) || 1; const s = val(p) / top; if (s > bestScore) { bestScore = s; best = b; } });
      taken.add(best.key); st.badges[i] = best.key;
    });
    log(st, st.outcome === 'win' ? 'Cả 5 vùng rừng đã hồi sinh! Cả nhóm chiến thắng!' : `Mùa bão tới khi ${restoredCount(st)}/5 vùng đã hồi sinh. Cùng thử lại nhé!`);
  }

  const api = { GAME_POOL, RESCUE_GAME, TUNE, ANIMALS, SCARVES, ZONES, TILES, LUCK, BADGES, MINI, TIMES, newGame, roll, step, choose, miniResult, endTurn, current: cur, animalOf, time, restoredCount, need };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ForestCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
