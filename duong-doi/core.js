/* Đường Đời — game logic (pure, no DOM). Works in the browser (window.LifeCore) and in Node. */
(function (root) {
  'use strict';

  // ---------- Life aspects ----------
  const ASPECTS = [
    { key: 'love', icon: '♥', name: 'Gia đình', color: '#ff7a9a' },
    { key: 'know', icon: '◆', name: 'Tri thức', color: '#6fb8ff' },
    { key: 'health', icon: '✚', name: 'Sức khoẻ', color: '#7fd6a4' },
    { key: 'comm', icon: '★', name: 'Cống hiến', color: '#ffd36b' },
  ];
  const AK = ASPECTS.map((a) => a.key);

  // Service tags: a career with that perk collects what others pay for it.
  const PERKS = { health: 'Y tế', house: 'Nhà cửa', food: 'Ăn uống', travel: 'Du lịch', vehicle: 'Xe cộ', legal: 'Pháp lý', tax: 'Thuế', school: 'Học hành', tech: 'Công nghệ', wedding: 'Cưới hỏi', shop: 'Mua sắm' };

  // ---------- Careers ----------
  // edu: none (đi làm ngay) · trade (học nghề) · uni (đại học). per: aspects gained each payday.
  // fame: extra salary per ★ Cống hiến (capped), for careers that live on their audience.
  const CAREERS = [
    { name: 'Tài xế công nghệ', salary: 16, edu: 'none', perk: 'travel', per: { health: -0 } },
    { name: 'Nhân viên bán hàng', salary: 15, edu: 'none', perk: 'shop', per: { comm: 0 } },
    { name: 'Nông dân', salary: 13, edu: 'none', perk: 'food', per: { health: 1 } },
    { name: 'Công nhân nhà máy', salary: 17, edu: 'none', perk: null, per: {} },
    { name: 'Shipper', salary: 14, edu: 'none', perk: 'shop', per: { health: 1 } },
    { name: 'YouTuber', salary: 8, edu: 'none', perk: 'tech', per: { know: 0 }, fame: 2, cap: 40 },
    { name: 'Thợ điện', salary: 18, edu: 'trade', perk: 'house', per: {} },
    { name: 'Đầu bếp', salary: 19, edu: 'trade', perk: 'food', per: { love: 0 } },
    { name: 'Thợ sửa xe', salary: 17, edu: 'trade', perk: 'vehicle', per: {} },
    { name: 'Điều dưỡng', salary: 18, edu: 'trade', perk: 'health', per: { comm: 1 } },
    { name: 'Thợ trang điểm cô dâu', salary: 16, edu: 'trade', perk: 'wedding', per: { love: 0 } },
    { name: 'Hướng dẫn viên du lịch', salary: 17, edu: 'trade', perk: 'travel', per: { know: 1 } },
    { name: 'Kỹ sư phần mềm', salary: 32, edu: 'uni', perk: 'tech', per: { health: -1, know: 1 } },
    { name: 'Bác sĩ', salary: 36, edu: 'uni', perk: 'health', per: { comm: 1, health: -1 } },
    { name: 'Giáo viên', salary: 22, edu: 'uni', perk: 'school', per: { know: 1, comm: 1 } },
    { name: 'Luật sư', salary: 34, edu: 'uni', perk: 'legal', per: {} },
    { name: 'Kiến trúc sư', salary: 28, edu: 'uni', perk: 'house', per: { know: 0 } },
    { name: 'Nhà báo', salary: 24, edu: 'uni', perk: null, per: { know: 1, comm: 1 } },
    { name: 'Kế toán', salary: 24, edu: 'uni', perk: 'tax', per: {} },
    { name: 'Nhà khoa học', salary: 26, edu: 'uni', perk: null, per: { know: 2 } },
    { name: 'Phi công', salary: 38, edu: 'uni', perk: 'travel', per: { health: -1 } },
    { name: 'Ca sĩ', salary: 10, edu: 'uni', perk: 'wedding', per: {}, fame: 3, cap: 48 },
  ];
  CAREERS.forEach((c) => { Object.keys(c.per).forEach((k) => { if (!c.per[k]) delete c.per[k]; }); });
  const EDU_NAME = { none: 'Phổ thông', trade: 'Học nghề', uni: 'Đại học' };

  const HOUSES = [
    { name: 'Nhà vườn ở quê', price: 90, fx: { health: 3, love: 2 } },
    { name: 'Căn hộ chung cư', price: 130, fx: { love: 2 } },
    { name: 'Nhà phố 4 tầng', price: 210, fx: { love: 2, comm: 1 } },
    { name: 'Biệt thự ven sông', price: 330, fx: { love: 3, comm: 3 } },
  ];

  const GOALS = [
    { key: 'rich', name: 'Đại gia', hint: 'Điểm tài sản ×1,5' },
    { key: 'love', name: 'Gia đình hạnh phúc', hint: 'Mỗi ♥ được 4 điểm thay vì 2' },
    { key: 'know', name: 'Học giả', hint: 'Mỗi ◆ được 4 điểm thay vì 2' },
    { key: 'health', name: 'Sống khoẻ sống lâu', hint: 'Mỗi ✚ được 4 điểm thay vì 2' },
    { key: 'comm', name: 'Người truyền cảm hứng', hint: 'Mỗi ★ được 4 điểm thay vì 2' },
    { key: 'balance', name: 'Cuộc đời cân bằng', hint: 'Thưởng cân bằng 70 điểm thay vì 20 (mọi khía cạnh ≥ 6)' },
  ];

  const EVENTS = [
    { text: 'Trúng giải khuyến khích xổ số', cash: 10 },
    { text: 'Xe máy hỏng giữa trời mưa', cash: -5, tag: 'vehicle' },
    { text: 'Đi Đà Lạt cuối tuần', cash: -8, health: 1, love: 1, tag: 'travel' },
    { text: 'Tết: lì xì các cháu', cash: -6, love: 2 },
    { text: 'Nhận thưởng tháng 13', salaryX: 1 },
    { text: 'Ốm nhẹ, đi viện', cash: -7, health: -1, tag: 'health' },
    { text: 'Bán đồ cũ trên chợ online', cash: 4 },
    { text: 'Theo trend đầu tư coin, lỗ nặng', cash: -15 },
    { text: 'Học tiếng Anh buổi tối', cash: -6, know: 2, tag: 'school' },
    { text: 'Viết blog nấu ăn có người tài trợ', cash: 8, comm: 1 },
    { text: 'Gặp lại bạn thân thời cấp 3', love: 1, comm: 1 },
    { text: 'Bị phạt nguội vượt đèn đỏ', cash: -4, tag: 'legal' },
    { text: 'Làm dự án ngoài giờ', salaryX: 0.5, health: -1 },
    { text: 'Hiến máu nhân đạo', comm: 2 },
    { text: 'Điện thoại rơi vỡ màn hình', cash: -5, tag: 'tech' },
    { text: 'Được sếp khen trước cả phòng', cash: 3, comm: 1 },
    { text: 'Tập chạy bộ mỗi sáng', health: 2 },
    { text: 'Đọc hết 20 cuốn sách trong năm', know: 2 },
    { text: 'Tranh chấp hợp đồng thuê nhà', cash: -8, tag: 'legal' },
    { text: 'Đi ăn cưới đồng nghiệp', cash: -3, love: 1, tag: 'wedding' },
    { text: 'Cả nhà đi ăn lẩu', cash: -4, love: 2, tag: 'food' },
    { text: 'Tham gia CLB thiện nguyện', cash: -2, comm: 2 },
    { text: 'Thức khuya cày phim', health: -1 },
    { text: 'Dự hội thảo công nghệ', cash: -3, know: 2, tag: 'tech' },
    { text: 'Khám sức khoẻ định kỳ', cash: -3, health: 2, tag: 'health' },
    { text: 'Được báo địa phương phỏng vấn', comm: 2 },
    { text: 'Mua sắm dịp Black Friday', cash: -6, tag: 'shop' },
  ];

  // ---------- Board ----------
  function buildBoard() {
    const tiles = [];
    const add = (t) => { t.id = tiles.length; t.next = []; tiles.push(t); return t; };
    const link = (a, b) => a.next.push(b.id);
    const chain = (arr) => { for (let i = 0; i < arr.length - 1; i++) link(arr[i], arr[i + 1]); };
    const seg = (specs, x0, y0, x1, y1) => specs.map((s, i) => {
      const f = specs.length === 1 ? 0 : i / (specs.length - 1);
      return add(Object.assign({}, s, { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f }));
    });
    const P = { type: 'payday', label: 'Ngày lương' };
    const E = { type: 'event', label: 'Sự kiện' };
    const M = (cash, label, fx) => Object.assign({ type: 'money', cash, label }, fx || {});
    const H = (label, fx) => Object.assign({ type: 'happy', label, cash: 0 }, fx);
    const B = { type: 'baby', label: 'Thêm thành viên' };
    const S = (stop, label) => ({ type: 'stop', stop, label });
    const T = { type: 'tax', label: 'Quyết toán thuế' };
    const I = { type: 'invest', label: 'Cơ hội đầu tư' };
    const G = (amount, label) => ({ type: 'gift', amount, label });
    const R = (amount, label, fx) => Object.assign({ type: 'raise', amount, label }, fx || {});
    const C = { type: 'career', label: 'Đổi nghề' };
    const br = (t, key, name, hint) => { t.branch = { key, name, hint }; };

    const start = add({ type: 'start', label: 'Xuất phát', x: 0, y: 1.1 });

    // Fork 1 (three ways): university, work right away, vocational school
    const uni = seg([E, H('CLB sinh viên', { know: 2, comm: 1 }), E, M(5, 'Học bổng', { know: 1 }), E, H('Mùa hè xanh', { comm: 3, cash: -3 }), M(-5, 'Thi lại Giải tích', { tag: 'school' }), S('grad', 'Tốt nghiệp')], 1, 0, 8, 0);
    br(uni[0], 'uni', 'Học đại học', 'Trả 50 tr học phí, mở nghề lương cao');
    const work = seg([M(8, 'Lương thử việc'), E, H('Đá bóng cuối tuần', { health: 2 }), M(-4, 'Tiền thuê trọ', { tag: 'house' }), S('job', 'Nhận việc')], 1.4, 2.2, 8, 2.2);
    br(work[0], 'work', 'Đi làm ngay', 'Không tốn học phí, kiếm tiền sớm nhất');
    const voc = seg([E, H('Thực tập ở xưởng', { know: 2 }), M(-4, 'Mua đồ nghề', { tag: 'shop' }), E, H('Thi tay nghề', { know: 1, comm: 1 }), S('trade', 'Ra nghề')], 1.2, -1.25, 8, -1.25);
    br(voc[0], 'trade', 'Học nghề', 'Trả 20 tr, nghề kỹ thuật lương khá');
    link(start, uni[0]); link(start, work[0]); link(start, voc[0]); chain(uni); chain(work); chain(voc);

    const m1 = add(Object.assign({}, P, { x: 9.6, y: 0.6 }));
    link(uni[uni.length - 1], m1); link(work[work.length - 1], m1); link(voc[voc.length - 1], m1);

    const s1 = seg([E, M(-6, 'Mua xe máy mới', { tag: 'vehicle' }), P, H('Phượt Hà Giang', { health: 2, love: 1, cash: -4, tag: 'travel' }), E, S('marry', 'Kết hôn'), M(-6, 'Đám cưới bạn thân', { love: 1, tag: 'wedding' }), P, E, H('Nuôi mèo', { love: 1, health: 1 }), T], 10, 3.3, 0, 3.3);
    link(m1, s1[0]); chain(s1);
    const s2 = seg([P, H('Tình nguyện mùa lũ', { comm: 2, health: -1 }), R(5, 'Được tăng lương', { know: 1 }), M(-8, 'Sửa nhà', { tag: 'house' }), E, S('house', 'Mua nhà'), G(4, 'Tân gia'), P, E, I, E], 0, 4.4, 10, 4.4);
    link(s1[s1.length - 1], s2[0]); chain(s2);

    // Fork 2: family or career
    const forkB = add({ type: 'fork', label: 'Ngã rẽ', x: 10, y: 5.5 });
    link(s2[s2.length - 1], forkB);
    const fam = seg([B, H('Họp lớp', { love: 1, comm: 1, cash: -5 }), E, B, M(-12, 'Học phí trường quốc tế', { know: 1, tag: 'school' }), H('Du lịch Phú Quốc cả nhà', { love: 3, health: 1, cash: -6, tag: 'travel' }), B, E, P], 9, 6.5, 1, 6.5);
    br(fam[0], 'family', 'Đường gia đình', 'Thêm con cháu, nhiều ♥, tốn kém');
    const car = seg([R(8, 'Thăng chức'), E, I, M(-6, 'Tăng ca liên tục', { health: -2 }), R(6, 'Chứng chỉ quốc tế', { know: 2 }), E, C, I, P], 9, 7.9, 1, 7.9);
    br(car[0], 'career', 'Đường sự nghiệp', 'Tăng lương, đầu tư, đổi nghề, hao sức');
    link(forkB, fam[0]); link(forkB, car[0]); chain(fam); chain(car);

    const m2 = add({ type: 'happy', label: 'Ngày của gia đình', cash: 0, love: 2, x: 0, y: 7.2 });
    link(fam[fam.length - 1], m2); link(car[car.length - 1], m2);

    const s3 = seg([P, E, B, M(-15, 'Viện phí người thân', { love: 1, tag: 'health' }), E, S('mid', 'Tuổi 40'), P, H('Học vẽ', { know: 1, health: 1, cash: -5 }), I, E, T], 0, 9.2, 10, 9.2);
    link(m2, s3[0]); chain(s3);

    // Fork 3: give back or grow wealth, then retire
    const forkD = add({ type: 'fork', label: 'Ngã rẽ', x: 10.5, y: 10.3 });
    link(s3[s3.length - 1], forkD);
    const give = seg([H('Dạy học miễn phí', { comm: 3, know: 1 }), E, H('Hiến máu, hiến tạng', { comm: 2 }), P, H('Xây trường vùng cao', { comm: 4, cash: -15 }), E, H('Trồng rừng ngập mặn', { comm: 3, health: 1, cash: -5 }), H('Đón cháu nội', { love: 3 }), P], 9, 11.0, 1, 11.0);
    br(give[0], 'give', 'Đường cống hiến', 'Nhiều ★ Cống hiến, ít tiền');
    const rich = seg([I, E, M(20, 'Nhận cổ tức'), P, I, M(25, 'Bán đất ở quê'), E, M(-10, 'Chứng khoán lao dốc', { health: -1 }), P], 9, 12.4, 1, 12.4);
    br(rich[0], 'rich', 'Đường làm giàu', 'Đầu tư, cổ tức, rủi ro cao');
    link(forkD, give[0]); link(forkD, rich[0]); chain(give); chain(rich);
    const retire = add({ type: 'stop', stop: 'retire', label: 'Nghỉ hưu', x: 0, y: 11.7 });
    link(give[give.length - 1], retire); link(rich[rich.length - 1], retire);
    return tiles;
  }

  const TILES = buildBoard();
  const START_CASH = 30;
  const LOAN = 50, LOAN_REPAY = 60;
  const RETIRE_BONUS = [40, 30, 20, 10];
  const SCORE = { assetDiv: 5, aspect: 2, goalAspect: 4, balanceMin: 6, balance: 20, balanceGoal: 70, richMult: 1.5 };
  const COLORS = ['#e2483d', '#e7b93c', '#3fa7a0', '#8c7ae6', '#e98a3c', '#6fbf5a'];

  // ---------- Helpers ----------
  function rand(st) { // mulberry32, state kept in st.seed so the game serialises
    let t = (st.seed = (st.seed + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const roll = (st) => { st.rolls = (st.rolls || 0) + 1; return 1 + Math.floor(rand(st) * 10); };
  function pick(st, arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(st) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  const cur = (st) => st.players[st.turn];
  function log(st, text, p) {
    st.log.unshift({ who: p ? p.name : '', color: p ? p.color : '', text }); if (st.log.length > 80) st.log.length = 80;
    st.events.push(text);
  }
  function addCash(st, p, amount) {
    p.cash += amount;
    while (p.cash < 0) { p.cash += LOAN; p.loans++; log(st, `vay ngân hàng ${LOAN} tr (khoản vay thứ ${p.loans})`, p); }
  }
  // p pays a cost; a player whose career collects that service gets it (or 10% commission on big buys).
  function pay(st, p, amount, tag) {
    addCash(st, p, -amount);
    if (!tag || amount <= 0) return null;
    const owner = st.players.find((o) => o !== p && o.perk === tag && !o.retired);
    if (!owner) return null;
    const got = amount <= 20 ? amount : Math.round(amount * 0.1);
    owner.cash += got;
    log(st, `thu phí ${PERKS[tag].toLowerCase()} ${got} tr từ ${p.name}`, owner);
    return { owner, got };
  }
  function addAspects(p, fx) { AK.forEach((k) => { if (fx && fx[k]) p[k] = Math.max(0, p[k] + fx[k]); }); }
  const money = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + ' tr';
  function fxText(fx, cash) {
    const parts = [];
    if (cash) parts.push(money(cash));
    ASPECTS.forEach((a) => { const v = fx && fx[a.key]; if (v) parts.push((v > 0 ? '+' : '−') + Math.abs(v) + a.icon); });
    return parts.join(', ');
  }
  const careerOf = (name) => CAREERS.find((c) => c.name === name);
  function income(p) { const c = careerOf(p.career); return p.salary + (c && c.fame ? Math.min(c.cap, c.fame * p.comm) : 0); }
  function careerHint(c) {
    const bits = [`Lương ${c.salary} tr/kỳ`];
    if (c.fame) bits[0] = `Lương ${c.salary} + ${c.fame} tr mỗi ★ (tối đa ${c.cap})`;
    const per = fxText(c.per, 0); if (per) bits.push(per + ' mỗi kỳ lương');
    if (c.perk) bits.push('Thu phí: ' + PERKS[c.perk]);
    return bits.join(' · ');
  }
  function setCareer(p, c) { p.career = c.name; p.salary = c.salary; p.perk = c.perk; }
  function payday(st, p, bonus) {
    const inc = income(p) + (bonus || 0); addCash(st, p, inc);
    const c = careerOf(p.career); if (c) addAspects(p, c.per);
    return { inc, per: c ? c.per : null };
  }

  // ---------- Game ----------
  function newGame(names, seed) {
    const st = {
      version: 2,
      seed: (seed == null ? Math.floor(Math.random() * 2 ** 31) : seed) | 0,
      turn: 0, round: 1, phase: 'spin', // goal | spin | moving | choice | spinFor | done | over
      lastSpin: null, moveLeft: 0, choice: null, result: '', retiredCount: 0,
      players: names.map((name, i) => ({
        name, color: COLORS[i % COLORS.length], pos: 0, cash: START_CASH, loans: 0,
        love: 1, know: 1, health: 3, comm: 0, goal: null,
        career: null, salary: 0, perk: null, edu: 'none', married: false, single: false, kids: 0, house: null,
        retired: false, forkPick: null, branches: [], retireStyle: null,
      })),
      log: [], events: [], final: null, spinFor: null, rolls: 0, playerRolls: 0,
    };
    log(st, `Ván mới với ${names.length} người chơi. ${names[0]} đi trước.`);
    askGoal(st);
    return st;
  }
  function askGoal(st) {
    const p = cur(st); if (p.goal) return false;
    const offers = pick(st, GOALS, 3);
    ask(st, 'goal', `${p.name}: chọn ước mơ cuộc đời`, offers.map((g) => ({ label: g.name, hint: g.hint, value: g.key })));
    return true;
  }

  function spin(st, forced) {
    if (st.phase !== 'spin') return null;
    const v = forced || roll(st); if (forced) st.rolls++;
    st.playerRolls++;
    st.lastSpin = v; st.moveLeft = v; st.phase = 'moving'; st.events = []; st.result = '';
    log(st, `quay được ${v}`, cur(st));
    return v;
  }

  // Advance one tile. Returns 'step' | 'choice' | 'landed'.
  function step(st) {
    if (st.phase !== 'moving') return st.phase;
    const p = cur(st);
    const here = TILES[p.pos];
    if (here.next.length > 1 && p.forkPick == null) {
      ask(st, 'fork', 'Chọn hướng đi', here.next.map((id) => ({ label: TILES[id].branch.name, hint: TILES[id].branch.hint, value: id })));
      return 'choice';
    }
    const nextId = here.next.length > 1 ? p.forkPick : here.next[0];
    p.forkPick = null;
    p.pos = nextId; st.moveLeft--;
    const t = TILES[nextId];
    if (t.type === 'payday' && st.moveLeft > 0) {
      const r = payday(st, p);
      log(st, `đi qua Ngày lương: ${money(r.inc)}${fxText(r.per, 0) ? ', ' + fxText(r.per, 0) : ''}`, p);
    }
    if (t.type === 'stop') st.moveLeft = 0;
    if (st.moveLeft <= 0) { land(st, p, t); return st.phase === 'choice' || st.phase === 'spinFor' ? 'choice' : 'landed'; }
    return 'step';
  }

  function done(st, text) { st.phase = 'done'; st.choice = null; st.result = text; }
  function ask(st, kind, title, options, extra) { st.phase = 'choice'; st.choice = Object.assign({ kind, title, options }, extra || {}); }
  function askSpin(st, kind, title, hint) { st.phase = 'spinFor'; st.choice = null; st.spinFor = { kind, title, hint }; }
  function feeNote(r) { return r ? ` ${r.owner.name} (${r.owner.career}) thu ${r.got} tr phí dịch vụ.` : ''; }

  function land(st, p, t) {
    switch (t.type) {
      case 'payday': {
        const r = payday(st, p, 5);
        log(st, `dừng đúng Ngày lương: ${money(r.inc)}${fxText(r.per, 0) ? ', ' + fxText(r.per, 0) : ''}`, p);
        return done(st, `Ngày lương! Nhận ${money(r.inc)} (gồm 5 tr thưởng vì dừng đúng ô)${fxText(r.per, 0) ? ' và ' + fxText(r.per, 0) : ''}.`);
      }
      case 'event': {
        const e = EVENTS[Math.floor(rand(st) * EVENTS.length)];
        const cash = (e.cash || 0) + Math.round((e.salaryX || 0) * income(p));
        let fee = null;
        if (cash < 0) fee = pay(st, p, -cash, e.tag); else addCash(st, p, cash);
        addAspects(p, e);
        const fx = fxText(e, cash) || 'không đổi';
        log(st, `${e.text} (${fx})`, p);
        return done(st, `${e.text}. ${fx}.${feeNote(fee)}`);
      }
      case 'money': case 'happy': {
        const cash = t.cash || 0; let fee = null;
        if (cash < 0) fee = pay(st, p, -cash, t.tag); else addCash(st, p, cash);
        addAspects(p, t);
        log(st, `${t.label} (${fxText(t, cash)})`, p);
        return done(st, `${t.label}: ${fxText(t, cash)}.${feeNote(fee)}`);
      }
      case 'baby': {
        p.kids++; const fee = pay(st, p, 4, 'health'); addAspects(p, { love: 3, health: -1 });
        log(st, `đón thêm một đứa trẻ (có ${p.kids} con, −4 tr, +3♥, −1✚)`, p);
        return done(st, `Gia đình có thêm thành viên! Giờ có ${p.kids} con. −4 tr, +3♥, −1✚ (mất ngủ).${feeNote(fee)}`);
      }
      case 'tax': {
        const tax = Math.round(income(p) * 0.3);
        const fee = pay(st, p, tax, 'tax');
        log(st, `nộp thuế ${tax} tr`, p);
        return done(st, `Quyết toán thuế: nộp 30% lương, ${tax} tr.${feeNote(fee)}`);
      }
      case 'raise': {
        p.salary += t.amount; addAspects(p, t);
        log(st, `${t.label}: lương +${t.amount} tr/kỳ${fxText(t, 0) ? ', ' + fxText(t, 0) : ''}`, p);
        return done(st, `${t.label}! Lương cơ bản lên ${p.salary} tr mỗi kỳ${fxText(t, 0) ? ', ' + fxText(t, 0) : ''}.`);
      }
      case 'gift': {
        let total = 0;
        st.players.forEach((o) => { if (o !== p && !o.retired) { addCash(st, o, -t.amount); total += t.amount; } });
        addCash(st, p, total); addAspects(p, { love: 1 });
        log(st, `${t.label}: mọi người mừng ${t.amount} tr, tổng ${total} tr`, p);
        return done(st, `${t.label}! Mỗi người chơi khác mừng ${t.amount} tr. Nhận ${total} tr, +1♥.`);
      }
      case 'invest':
        return ask(st, 'invest', 'Cơ hội đầu tư: góp 20 tr?', [
          { label: 'Đầu tư 20 tr', hint: 'Rồi tự quay: 7–10 nhận 60 tr · 4–6 nhận 20 tr · 1–3 mất trắng', value: 1 },
          { label: 'Bỏ qua', hint: 'Giữ tiền an toàn', value: 0 },
        ]);
      case 'career': {
        const ok = { none: ['none'], trade: ['none', 'trade'], uni: ['none', 'trade', 'uni'] }[p.edu];
        const offers = pick(st, CAREERS.filter((c) => ok.includes(c.edu) && c.name !== p.career), 3);
        return ask(st, 'career', 'Đổi nghề?', offers.map((c) => ({ label: c.name, hint: careerHint(c), value: c.name }))
          .concat([{ label: 'Giữ nghề hiện tại', hint: `${p.career || 'Chưa có nghề'} · ${income(p)} tr/kỳ`, value: null }]));
      }
      case 'stop': return landStop(st, p, t);
      default: return done(st, t.label);
    }
  }

  function landStop(st, p, t) {
    switch (t.stop) {
      case 'grad': case 'job': case 'trade': {
        const edu = { grad: 'uni', job: 'none', trade: 'trade' }[t.stop];
        const offers = pick(st, CAREERS.filter((c) => c.edu === edu), 3);
        const title = { grad: 'Tốt nghiệp! Chọn nghề', job: 'Chọn công việc đầu tiên', trade: 'Ra nghề! Chọn nghề' }[t.stop];
        return ask(st, 'job', title, offers.map((c) => ({ label: c.name, hint: careerHint(c), value: c.name })));
      }
      case 'marry':
        return ask(st, 'marry', 'Kết hôn hay sống độc thân?', [
          { label: 'Kết hôn', hint: 'Tự quay vòng mừng cưới: mỗi người khác mừng đúng số quay, +5♥', value: 'wed' },
          { label: 'Sống độc thân tự do', hint: '+2✚ +2◆, không có tiền mừng cưới; chọn cả đời', value: 'single' },
        ]);
      case 'house': {
        const offers = pick(st, HOUSES, 3);
        return ask(st, 'house', 'Mua nhà?', offers.map((h) => ({ label: h.name, hint: `Giá ${h.price} tr · ${fxText(h.fx, 0)} · bán lại khi nghỉ hưu`, value: h.name }))
          .concat([{ label: 'Tiếp tục thuê nhà', hint: 'Giữ tiền, không mua lúc này', value: null }]));
      }
      case 'mid':
        return ask(st, 'mid', 'Tuổi 40: con đường tiếp theo?', [
          { label: 'Học thạc sĩ', hint: '−30 tr, lương +8 tr/kỳ, +4◆, mở nghề đại học', value: 'study' },
          { label: 'Khởi nghiệp', hint: '−40 tr, tự quay: 6–10 lương +15 và +2★ · 1–5 lương −5', value: 'startup' },
          { label: 'Sống chậm lại', hint: '+4✚ +3♥', value: 'slow' },
        ]);
      case 'retire': {
        const bonus = RETIRE_BONUS[Math.min(st.retiredCount, RETIRE_BONUS.length - 1)];
        st.retiredCount++; p.retired = true; p.retireOrder = st.retiredCount; addCash(st, p, bonus);
        log(st, `nghỉ hưu ở vị trí thứ ${p.retireOrder}, thưởng ${bonus} tr`, p);
        return ask(st, 'retire', `Nghỉ hưu thứ ${p.retireOrder} (+${bonus} tr). Sống tuổi già thế nào?`, [
          { label: 'Về quê làm vườn', hint: '+4✚ +2♥', value: 'farm' },
          { label: 'Ở phố gần con cháu', hint: `+${2 + Math.min(p.kids, 3)}♥ (thêm 1♥ mỗi con)`, value: 'city' },
          { label: 'Du lịch vòng quanh thế giới', hint: '−30 tr, +3✚ +3◆', value: 'travel' },
          { label: 'Lập quỹ học bổng', hint: '−40 tr, +6★', value: 'fund' },
        ]);
      }
    }
    return done(st, t.label);
  }

  function choose(st, index) {
    if (st.phase !== 'choice' || !st.choice) return false;
    const opt = st.choice.options[index]; if (!opt) return false;
    const p = cur(st); const kind = st.choice.kind;
    st.choice = null;
    switch (kind) {
      case 'goal': {
        const g = GOALS.find((x) => x.key === opt.value); p.goal = g.key;
        log(st, `chọn ước mơ: ${g.name}`, p);
        st.phase = 'spin'; return true;
      }
      case 'fork': {
        const b = TILES[opt.value].branch;
        p.forkPick = opt.value; p.branches.push(b.key);
        if (b.key === 'uni') { addCash(st, p, -50); p.edu = 'uni'; log(st, 'vào đại học, đóng 50 tr học phí', p); }
        else if (b.key === 'trade') { addCash(st, p, -20); p.edu = 'trade'; log(st, 'học nghề, đóng 20 tr học phí', p); }
        else log(st, `chọn ${b.name}`, p);
        st.phase = 'moving';
        return true;
      }
      case 'job': case 'career': {
        if (!opt.value) { done(st, 'Bạn giữ nghề hiện tại.'); log(st, 'giữ nghề hiện tại', p); return true; }
        const c = careerOf(opt.value); setCareer(p, c);
        log(st, `${kind === 'job' ? 'trở thành' : 'đổi sang nghề'} ${p.career} (${careerHint(c)})`, p);
        done(st, `${kind === 'job' ? 'Bạn trở thành' : 'Đổi nghề thành công:'} ${p.career}. ${careerHint(c)}.`); return true;
      }
      case 'marry': {
        if (opt.value === 'single') {
          p.single = true; addAspects(p, { health: 2, know: 2 }); log(st, 'chọn sống độc thân tự do (+2✚ +2◆)', p);
          done(st, 'Bạn chọn sống độc thân tự do: +2✚ +2◆.'); return true;
        }
        askSpin(st, 'marry', 'Đám cưới! Quay vòng mừng cưới', 'Mỗi người chơi khác mừng bạn đúng số vừa quay (triệu đồng)'); return true;
      }
      case 'house': {
        if (!opt.value) { done(st, 'Bạn tiếp tục thuê nhà.'); log(st, 'chưa mua nhà', p); return true; }
        const h = HOUSES.find((x) => x.name === opt.value); p.house = { name: h.name, price: h.price };
        const fee = pay(st, p, h.price, 'house'); addAspects(p, h.fx);
        log(st, `mua ${h.name} giá ${h.price} tr (${fxText(h.fx, 0)})`, p);
        done(st, `Đã mua ${h.name} giá ${h.price} tr. ${fxText(h.fx, 0)}.${feeNote(fee)}`); return true;
      }
      case 'invest': {
        if (!opt.value) { done(st, 'Bạn bỏ qua cơ hội đầu tư.'); log(st, 'bỏ qua đầu tư', p); return true; }
        addCash(st, p, -20); log(st, 'góp 20 tr đầu tư', p);
        askSpin(st, 'invest', 'Quay kết quả đầu tư', '7–10: nhận 60 tr · 4–6: nhận 20 tr · 1–3: mất trắng'); return true;
      }
      case 'mid': {
        if (opt.value === 'study') {
          addCash(st, p, -30); p.salary += 8; p.edu = 'uni'; addAspects(p, { know: 4 });
          log(st, 'học thạc sĩ: −30 tr, lương +8, +4◆', p); done(st, `Học thạc sĩ: lương cơ bản lên ${p.salary} tr/kỳ, +4◆.`);
        } else if (opt.value === 'startup') {
          addCash(st, p, -40); log(st, 'bỏ 40 tr khởi nghiệp', p);
          askSpin(st, 'startup', 'Quay vận may khởi nghiệp', '6–10: lương +15 tr/kỳ, +2★ · 1–5: lương −5 tr/kỳ');
        } else {
          addAspects(p, { health: 4, love: 3 }); log(st, 'chọn sống chậm, +4✚ +3♥', p); done(st, 'Sống chậm lại: +4✚ +3♥.');
        }
        return true;
      }
      case 'retire': {
        const fx = { farm: { health: 4, love: 2 }, city: { love: 2 + Math.min(p.kids, 3) }, travel: { health: 3, know: 3 }, fund: { comm: 6 } }[opt.value];
        const cost = { travel: 30, fund: 40 }[opt.value] || 0;
        let fee = null; if (cost) fee = pay(st, p, cost, opt.value === 'travel' ? 'travel' : null);
        addAspects(p, fx); p.retireStyle = opt.label;
        log(st, `${opt.label.toLowerCase()} (${fxText(fx, -cost)})`, p);
        done(st, `${opt.label}: ${fxText(fx, -cost)}.${feeNote(fee)}`); return true;
      }
    }
    return false;
  }

  // The player spins for a pending outcome (wedding gifts, investment, startup, house resale).
  function spinFor(st, forced) {
    if (st.phase !== 'spinFor' || !st.spinFor) return null;
    const v = forced || roll(st); if (forced) st.rolls++;
    st.playerRolls++; st.lastSpin = v;
    const p = cur(st), kind = st.spinFor.kind; st.spinFor = null;
    log(st, `quay được ${v}`, p);
    if (kind === 'marry') {
      let total = 0;
      st.players.forEach((o) => { if (o !== p && !o.retired) { addCash(st, o, -v); total += v; } });
      addCash(st, p, total); addAspects(p, { love: 5 }); p.married = true;
      log(st, `kết hôn! Mỗi người mừng ${v} tr (tổng ${total} tr), +5♥`, p);
      done(st, `Đám cưới! Vòng quay mừng cưới ra ${v}: mỗi người chơi khác mừng ${v} tr. Nhận ${total} tr và +5♥.`);
    } else if (kind === 'invest') {
      const back = v >= 7 ? 60 : v >= 4 ? 20 : 0;
      addCash(st, p, back); if (v >= 7) addAspects(p, { know: 1 });
      log(st, `đầu tư quay ${v}, thu về ${back} tr`, p);
      done(st, `Quay đầu tư ra ${v}: thu về ${back} tr (${money(back - 20)} so với tiền góp).`);
    } else if (kind === 'startup') {
      if (v >= 6) { p.salary += 15; p.career = 'Nhà sáng lập'; p.perk = null; addAspects(p, { comm: 2 }); } else p.salary = Math.max(8, p.salary - 5);
      log(st, `khởi nghiệp quay ${v}: lương còn ${p.salary}`, p);
      done(st, v >= 6 ? `Khởi nghiệp thành công (quay ${v})! Lương lên ${p.salary} tr/kỳ, +2★.` : `Khởi nghiệp chưa thành (quay ${v}). Lương còn ${p.salary} tr/kỳ.`);
    } else if (kind === 'resale') {
      p.resaleSpin = v;
      const k = v <= 3 ? 0.8 : v <= 7 ? 1.2 : 1.6, price = Math.round(p.house.price * k);
      log(st, `bán ${p.house.name}: quay ${v}, giá ×${String(k).replace('.', ',')} = ${price} tr`, p);
      done(st, `Bán ${p.house.name}: quay ${v}, giá ×${String(k).replace('.', ',')} → ${price} tr.`);
    }
    return v;
  }

  // Repay one loan early (before spinning) for LOAN_REPAY.
  function repay(st) {
    const p = cur(st);
    if (st.phase !== 'spin' || p.loans < 1 || p.cash < LOAN_REPAY) return false;
    p.cash -= LOAN_REPAY; p.loans--;
    log(st, `trả một khoản vay (−${LOAN_REPAY} tr), còn ${p.loans} khoản`, p);
    return true;
  }

  function endTurn(st) {
    if (st.phase !== 'done') return false;
    if (st.players.every((p) => p.retired)) {
      const next = st.players.findIndex((p) => p.house && p.resaleSpin == null);
      if (next >= 0) {
        const p = st.players[next];
        st.turn = next; st.lastSpin = null; st.result = ''; st.events = [];
        askSpin(st, 'resale', `Quay giá bán ${p.house.name}`, `1–3: ×0,8 · 4–7: ×1,2 · 8–10: ×1,6 giá mua ${p.house.price} tr`);
        return true;
      }
      finish(st); return true;
    }
    let i = st.turn;
    do { i = (i + 1) % st.players.length; if (i === 0) st.round++; } while (st.players[i].retired);
    st.turn = i; st.phase = 'spin'; st.lastSpin = null; st.result = ''; st.events = [];
    askGoal(st);
    return true;
  }

  function scoreOf(p) {
    let resale = 0;
    if (p.house && p.resaleSpin != null) resale = Math.round(p.house.price * (p.resaleSpin <= 3 ? 0.8 : p.resaleSpin <= 7 ? 1.2 : 1.6));
    const debt = p.loans * LOAN_REPAY, net = p.cash + resale - debt;
    const assetPts = Math.round(Math.max(0, net) / SCORE.assetDiv * (p.goal === 'rich' ? SCORE.richMult : 1));
    const aspects = {}; let aspectPts = 0;
    AK.forEach((k) => { const w = p.goal === k ? SCORE.goalAspect : SCORE.aspect; aspects[k] = p[k] * w; aspectPts += p[k] * w; });
    const balanced = AK.every((k) => p[k] >= SCORE.balanceMin);
    const balance = balanced ? (p.goal === 'balance' ? SCORE.balanceGoal : SCORE.balance) : 0;
    return { resale, debt, net, assetPts, aspects, aspectPts, balance, score: assetPts + aspectPts + balance };
  }

  function finish(st) {
    st.final = st.players.map((p) => {
      const s = scoreOf(p);
      return Object.assign({ name: p.name, color: p.color, cash: p.cash, resaleSpin: p.resaleSpin, goal: p.goal, love: p.love, know: p.know, health: p.health, comm: p.comm }, s);
    }).sort((a, b) => b.score - a.score);
    st.phase = 'over';
    log(st, `Kết thúc! ${st.final[0].name} thắng với ${st.final[0].score} điểm đời.`);
  }

  const api = {
    TILES, CAREERS, HOUSES, EVENTS, GOALS, ASPECTS, PERKS, EDU_NAME, COLORS, START_CASH, LOAN, LOAN_REPAY, RETIRE_BONUS, SCORE,
    newGame, spin, spinFor, step, choose, repay, endTurn, current: cur, income, scoreOf, careerOf, fxText,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LifeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
