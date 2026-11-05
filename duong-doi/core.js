/* Đường Đời — game logic (pure, no DOM). Works in the browser (window.LifeCore) and in Node. */
(function (root) {
  'use strict';

  // ---------- Content ----------
  const CAREERS = {
    basic: [
      { name: 'Thợ cơ khí', salary: 14 },
      { name: 'Tài xế công nghệ', salary: 12 },
      { name: 'Đầu bếp', salary: 15 },
      { name: 'Thợ cắt tóc', salary: 11 },
      { name: 'Nhân viên bán hàng', salary: 13 },
      { name: 'Thợ điện', salary: 16 },
    ],
    degree: [
      { name: 'Kỹ sư phần mềm', salary: 30 },
      { name: 'Bác sĩ', salary: 35 },
      { name: 'Kiến trúc sư', salary: 28 },
      { name: 'Giáo viên', salary: 20 },
      { name: 'Kế toán', salary: 22 },
      { name: 'Luật sư', salary: 32 },
      { name: 'Nhà báo', salary: 24 },
    ],
  };

  const HOUSES = [
    { name: 'Nhà vườn ở quê', price: 90, stars: 8 },
    { name: 'Căn hộ chung cư', price: 130, stars: 3 },
    { name: 'Nhà phố 4 tầng', price: 210, stars: 5 },
    { name: 'Biệt thự ven sông', price: 330, stars: 8 },
  ];

  const EVENTS = [
    { text: 'Trúng giải khuyến khích xổ số', cash: 10 },
    { text: 'Xe máy hỏng giữa trời mưa, sửa hết', cash: -5 },
    { text: 'Đi Đà Lạt cuối tuần', cash: -8, stars: 5 },
    { text: 'Tết: lì xì các cháu', cash: -6, stars: 4 },
    { text: 'Nhận thưởng tháng 13', salaryX: 1 },
    { text: 'Ốm nhẹ, viện phí', cash: -7 },
    { text: 'Bán đồ cũ trên chợ online', cash: 4 },
    { text: 'Theo trend đầu tư coin, lỗ nặng', cash: -15 },
    { text: 'Học khoá tiếng Anh buổi tối', cash: -6, stars: 3 },
    { text: 'Viết blog nấu ăn có người tài trợ', cash: 12, stars: 2 },
    { text: 'Gặp lại bạn thân thời cấp 3', stars: 4 },
    { text: 'Bị phạt nguội vượt đèn đỏ', cash: -4 },
    { text: 'Làm dự án ngoài giờ', salaryX: 0.5, stars: -2 },
    { text: 'Hiến máu nhân đạo', stars: 3 },
    { text: 'Điện thoại rơi vỡ màn hình', cash: -5 },
    { text: 'Được sếp khen trước cả phòng', stars: 2, cash: 3 },
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
    const M = (cash, label, stars) => ({ type: 'money', cash, stars: stars || 0, label });
    const H = (stars, cash, label) => ({ type: 'happy', stars, cash, label });
    const B = { type: 'baby', label: 'Thêm thành viên' };
    const S = (stop, label) => ({ type: 'stop', stop, label });
    const T = { type: 'tax', label: 'Quyết toán thuế' };
    const I = { type: 'invest', label: 'Cơ hội đầu tư' };
    const G = (amount, label) => ({ type: 'gift', amount, label });
    const R = (amount, label) => ({ type: 'raise', amount, label });
    const C = { type: 'career', label: 'Đổi nghề' };

    const start = add({ type: 'start', label: 'Xuất phát', x: 0, y: 1.1 });

    const uni = seg([E, H(3, 0, 'CLB sinh viên'), E, M(5, 'Học bổng'), E, H(2, -3, 'Mùa hè xanh'), M(-5, 'Thi lại Giải tích'), S('grad', 'Tốt nghiệp')], 1, 0, 8, 0);
    uni[0].branch = { key: 'uni', name: 'Học đại học', hint: 'Trả 50 tr học phí, mở khoá nghề lương cao' };
    const work = seg([M(3, 'Lương thử việc'), E, H(2, 0, 'Đá bóng cuối tuần'), M(-4, 'Tiền thuê trọ'), S('job', 'Nhận việc')], 1.4, 2.2, 8, 2.2);
    work[0].branch = { key: 'work', name: 'Đi làm ngay', hint: 'Không tốn học phí, nghề phổ thông' };
    link(start, uni[0]); link(start, work[0]); chain(uni); chain(work);

    const m1 = add(Object.assign({}, P, { x: 9.6, y: 1.1 }));
    link(uni[uni.length - 1], m1); link(work[work.length - 1], m1);

    const s1 = seg([E, M(-6, 'Mua xe máy mới'), P, H(3, -4, 'Phượt Hà Giang'), E, S('marry', 'Kết hôn'), M(-10, 'Cỗ cưới'), P, E, H(2, 0, 'Nuôi mèo'), T], 10, 3.3, 0, 3.3);
    link(m1, s1[0]); chain(s1);
    const s2 = seg([P, E, R(5, 'Được tăng lương'), M(-8, 'Sửa nhà'), E, S('house', 'Mua nhà'), G(4, 'Tân gia'), P, E, I, E], 0, 4.4, 10, 4.4);
    link(s1[s1.length - 1], s2[0]); chain(s2);

    const forkB = add({ type: 'fork', label: 'Ngã rẽ', x: 10, y: 5.5 });
    link(s2[s2.length - 1], forkB);
    const fam = seg([B, H(4, -5, 'Họp lớp'), E, B, M(-12, 'Học phí trường quốc tế'), H(5, -6, 'Du lịch Phú Quốc'), B, E, P], 9, 6.5, 1, 6.5);
    fam[0].branch = { key: 'family', name: 'Đường gia đình', hint: 'Nhiều con cháu, nhiều hạnh phúc, tốn kém' };
    const car = seg([R(8, 'Thăng chức'), E, I, M(-6, 'Tăng ca liên tục', -3), R(6, 'Chứng chỉ quốc tế'), E, C, I, P], 9, 7.9, 1, 7.9);
    car[0].branch = { key: 'career', name: 'Đường sự nghiệp', hint: 'Tăng lương, đầu tư, ít thời gian cho bản thân' };
    link(forkB, fam[0]); link(forkB, car[0]); chain(fam); chain(car);

    const m2 = add({ type: 'happy', stars: 2, cash: 0, label: 'Ngày của gia đình', x: 0, y: 7.2 });
    link(fam[fam.length - 1], m2); link(car[car.length - 1], m2);

    const s3 = seg([P, E, B, M(-15, 'Viện phí người thân'), E, S('mid', 'Tuổi 40'), P, H(3, -5, 'Học vẽ'), I, E, T], 0, 9.2, 10, 9.2);
    link(m2, s3[0]); chain(s3);
    const s4 = seg([P, E, M(20, 'Bán đất ở quê'), H(5, -10, 'Làm từ thiện'), E, P, H(3, 0, 'Đón cháu nội'), E, M(-8, 'Sửa xe'), P], 10, 10.4, 1, 10.4);
    link(s3[s3.length - 1], s4[0]); chain(s4);
    const retire = add({ type: 'stop', stop: 'retire', label: 'Nghỉ hưu', x: 0, y: 10.4 });
    link(s4[s4.length - 1], retire);
    return tiles;
  }

  const TILES = buildBoard();
  const START_CASH = 30;
  const LOAN = 50, LOAN_REPAY = 60;
  const RETIRE_BONUS = [40, 30, 20, 10];
  const STAR_VALUE = 2;
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
    const entry = { who: p ? p.name : '', color: p ? p.color : '', text };
    st.log.unshift(entry); if (st.log.length > 80) st.log.length = 80;
    st.events.push(text);
  }
  function addCash(st, p, amount) {
    p.cash += amount;
    while (p.cash < 0) { p.cash += LOAN; p.loans++; log(st, `vay ngân hàng ${LOAN} tr (khoản vay thứ ${p.loans})`, p); }
  }
  function addStars(p, n) { p.stars = Math.max(0, p.stars + n); }
  const money = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + ' tr';
  const starTxt = (n) => (n > 0 ? '+' : '−') + Math.abs(n) + '★';
  function effectText(cash, stars) {
    const parts = [];
    if (cash) parts.push(money(cash));
    if (stars) parts.push(starTxt(stars));
    return parts.join(', ');
  }

  // ---------- Game ----------
  function newGame(names, seed) {
    const st = {
      version: 1,
      seed: (seed == null ? Math.floor(Math.random() * 2 ** 31) : seed) | 0,
      turn: 0, round: 1, phase: 'spin', // spin | moving | choice | done | over
      lastSpin: null, moveLeft: 0, choice: null, result: '', retiredCount: 0,
      players: names.map((name, i) => ({
        name, color: COLORS[i % COLORS.length], pos: 0, cash: START_CASH, loans: 0, stars: 0,
        career: null, salary: 0, degree: false, married: false, kids: 0, house: null,
        retired: false, forkPick: null, branches: [],
      })),
      log: [], events: [], final: null, spinFor: null, rolls: 0, playerRolls: 0,
    };
    log(st, `Ván mới với ${names.length} người chơi. ${names[0]} đi trước.`);
    return st;
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
      st.phase = 'choice';
      st.choice = {
        kind: 'fork', title: 'Chọn hướng đi',
        options: here.next.map((id) => ({ label: TILES[id].branch.name, hint: TILES[id].branch.hint, value: id })),
      };
      return 'choice';
    }
    const nextId = here.next.length > 1 ? p.forkPick : here.next[0];
    p.forkPick = null;
    p.pos = nextId; st.moveLeft--;
    const t = TILES[nextId];
    if (t.type === 'payday' && st.moveLeft > 0) {
      addCash(st, p, p.salary);
      log(st, `đi qua Ngày lương: ${money(p.salary)}`, p);
    }
    if (t.type === 'stop') st.moveLeft = 0;
    if (st.moveLeft <= 0) { land(st, p, t); return st.phase === 'choice' ? 'choice' : 'landed'; }
    return 'step';
  }

  function done(st, text) { st.phase = 'done'; st.choice = null; st.result = text; }
  function ask(st, kind, title, options, extra) { st.phase = 'choice'; st.choice = Object.assign({ kind, title, options }, extra || {}); }

  function land(st, p, t) {
    switch (t.type) {
      case 'payday': {
        const pay = p.salary + 5;
        addCash(st, p, pay);
        log(st, `dừng đúng Ngày lương: lương + thưởng ${money(pay)}`, p);
        return done(st, `Ngày lương! Nhận ${money(pay)} (gồm 5 tr thưởng vì dừng đúng ô).`);
      }
      case 'event': {
        const e = EVENTS[Math.floor(rand(st) * EVENTS.length)];
        const cash = (e.cash || 0) + Math.round((e.salaryX || 0) * p.salary);
        addCash(st, p, cash); addStars(p, e.stars || 0);
        const fx = effectText(cash, e.stars || 0) || 'không đổi';
        log(st, `${e.text} (${fx})`, p);
        return done(st, `${e.text}. ${fx}.`);
      }
      case 'money': case 'happy': {
        const cash = t.cash || 0, stars = t.stars || 0;
        addCash(st, p, cash); addStars(p, stars);
        log(st, `${t.label} (${effectText(cash, stars)})`, p);
        return done(st, `${t.label}: ${effectText(cash, stars)}.`);
      }
      case 'baby': {
        p.kids++; addCash(st, p, -4); addStars(p, 6);
        log(st, `đón thêm một đứa trẻ (có ${p.kids} con, −4 tr, +6★)`, p);
        return done(st, `Gia đình có thêm thành viên! Giờ có ${p.kids} con. −4 tr, +6★.`);
      }
      case 'tax': {
        const tax = Math.round(p.salary * 0.3);
        addCash(st, p, -tax);
        log(st, `nộp thuế ${tax} tr`, p);
        return done(st, `Quyết toán thuế: nộp 30% lương, ${tax} tr.`);
      }
      case 'raise': {
        p.salary += t.amount;
        log(st, `${t.label}: lương +${t.amount} tr/kỳ`, p);
        return done(st, `${t.label}! Lương lên ${p.salary} tr mỗi kỳ.`);
      }
      case 'gift': {
        let total = 0;
        st.players.forEach((o) => { if (o !== p && !o.retired) { addCash(st, o, -t.amount); total += t.amount; } });
        addCash(st, p, total);
        log(st, `${t.label}: mọi người mừng ${t.amount} tr, tổng ${total} tr`, p);
        return done(st, `${t.label}! Mỗi người chơi khác mừng ${t.amount} tr. Nhận ${total} tr.`);
      }
      case 'invest':
        return ask(st, 'invest', 'Cơ hội đầu tư: góp 20 tr?', [
          { label: 'Đầu tư 20 tr', hint: 'Quay 7–10: nhận 60 tr · 4–6: nhận 20 tr · 1–3: mất trắng', value: 1 },
          { label: 'Bỏ qua', hint: 'Giữ tiền an toàn', value: 0 },
        ]);
      case 'career': {
        const pool = p.degree ? CAREERS.degree.concat(CAREERS.basic) : CAREERS.basic;
        const offers = pick(st, pool.filter((c) => c.name !== p.career), 2);
        return ask(st, 'career', 'Đổi nghề?', offers.map((c) => ({ label: c.name, hint: `Lương ${c.salary} tr/kỳ`, value: c }))
          .concat([{ label: 'Giữ nghề hiện tại', hint: `${p.career || 'Chưa có nghề'} · ${p.salary} tr/kỳ`, value: null }]));
      }
      case 'stop': return landStop(st, p, t);
      default: return done(st, t.label);
    }
  }

  function landStop(st, p, t) {
    switch (t.stop) {
      case 'grad': case 'job': {
        const offers = pick(st, t.stop === 'grad' ? CAREERS.degree : CAREERS.basic, 3);
        return ask(st, 'job', t.stop === 'grad' ? 'Tốt nghiệp! Chọn nghề' : 'Chọn công việc đầu tiên',
          offers.map((c) => ({ label: c.name, hint: `Lương ${c.salary} tr/kỳ`, value: c })));
      }
      case 'marry':
        return askSpin(st, 'marry', 'Đám cưới! Quay vòng mừng cưới', 'Mỗi người chơi khác mừng bạn đúng số vừa quay (triệu đồng)');
      case 'house': {
        const offers = pick(st, HOUSES, 3);
        return ask(st, 'house', 'Mua nhà?', offers.map((h) => ({ label: h.name, hint: `Giá ${h.price} tr · +${h.stars}★ · bán lại khi nghỉ hưu`, value: h }))
          .concat([{ label: 'Tiếp tục thuê nhà', hint: 'Không mua lúc này', value: null }]));
      }
      case 'mid':
        return ask(st, 'mid', 'Tuổi 40: con đường tiếp theo?', [
          { label: 'Học thạc sĩ', hint: '−30 tr, lương +8 tr/kỳ, có bằng cấp', value: 'study' },
          { label: 'Khởi nghiệp', hint: '−40 tr, quay 6–10: lương +15 · 1–5: lương −5', value: 'startup' },
          { label: 'Sống chậm lại', hint: '+8★, không đổi gì khác', value: 'slow' },
        ]);
      case 'retire': {
        const bonus = RETIRE_BONUS[Math.min(st.retiredCount, RETIRE_BONUS.length - 1)];
        st.retiredCount++; p.retired = true; p.retireOrder = st.retiredCount; addCash(st, p, bonus);
        log(st, `nghỉ hưu ở vị trí thứ ${p.retireOrder}, thưởng ${bonus} tr`, p);
        return done(st, `Nghỉ hưu! Về đích thứ ${p.retireOrder}, nhận thưởng ${bonus} tr.`);
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
      case 'fork': {
        const b = TILES[opt.value].branch;
        p.forkPick = opt.value; p.branches.push(b.key);
        if (b.key === 'uni') { addCash(st, p, -50); p.degree = true; log(st, 'vào đại học, đóng 50 tr học phí', p); }
        else log(st, `chọn ${b.name}`, p);
        st.phase = 'moving';
        return true;
      }
      case 'job': {
        p.career = opt.value.name; p.salary = opt.value.salary;
        log(st, `trở thành ${p.career} (${p.salary} tr/kỳ)`, p);
        done(st, `Bạn trở thành ${p.career}, lương ${p.salary} tr mỗi kỳ.`); return true;
      }
      case 'career': {
        if (!opt.value) { done(st, 'Bạn giữ nghề hiện tại.'); log(st, 'giữ nghề hiện tại', p); return true; }
        p.career = opt.value.name; p.salary = opt.value.salary;
        log(st, `đổi sang nghề ${p.career} (${p.salary} tr/kỳ)`, p);
        done(st, `Đổi nghề thành công: ${p.career}, ${p.salary} tr mỗi kỳ.`); return true;
      }
      case 'house': {
        if (!opt.value) { done(st, 'Bạn tiếp tục thuê nhà.'); log(st, 'chưa mua nhà', p); return true; }
        const h = opt.value; p.house = { name: h.name, price: h.price };
        addCash(st, p, -h.price); addStars(p, h.stars);
        log(st, `mua ${h.name} giá ${h.price} tr (+${h.stars}★)`, p);
        done(st, `Đã mua ${h.name} giá ${h.price} tr. +${h.stars}★.`); return true;
      }
      case 'invest': {
        if (!opt.value) { done(st, 'Bạn bỏ qua cơ hội đầu tư.'); log(st, 'bỏ qua đầu tư', p); return true; }
        addCash(st, p, -20); log(st, 'góp 20 tr đầu tư', p);
        askSpin(st, 'invest', 'Quay kết quả đầu tư', '7–10: nhận 60 tr · 4–6: nhận 20 tr · 1–3: mất trắng'); return true;
      }
      case 'mid': {
        if (opt.value === 'study') {
          addCash(st, p, -30); p.salary += 8; p.degree = true;
          log(st, 'học thạc sĩ: −30 tr, lương +8', p); done(st, `Học thạc sĩ: lương lên ${p.salary} tr/kỳ.`);
        } else if (opt.value === 'startup') {
          addCash(st, p, -40); log(st, 'bỏ 40 tr khởi nghiệp', p);
          askSpin(st, 'startup', 'Quay vận may khởi nghiệp', '6–10: lương +15 tr/kỳ · 1–5: lương −5 tr/kỳ');
        } else {
          addStars(p, 8); log(st, 'chọn sống chậm, +8★', p); done(st, 'Sống chậm lại: +8★.');
        }
        return true;
      }
    }
    return false;
  }

  function askSpin(st, kind, title, hint) { st.phase = 'spinFor'; st.choice = null; st.spinFor = { kind, title, hint }; }

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
      addCash(st, p, total); addStars(p, 10); p.married = true;
      log(st, `kết hôn! Mỗi người mừng ${v} tr (tổng ${total} tr), +10★`, p);
      done(st, `Đám cưới! Vòng quay mừng cưới ra ${v}: mỗi người chơi khác mừng ${v} tr. Nhận ${total} tr và +10★.`);
    } else if (kind === 'invest') {
      const back = v >= 7 ? 60 : v >= 4 ? 20 : 0;
      addCash(st, p, back);
      log(st, `đầu tư quay ${v}, thu về ${back} tr`, p);
      done(st, `Quay đầu tư ra ${v}: thu về ${back} tr (${money(back - 20)} so với tiền góp).`);
    } else if (kind === 'startup') {
      if (v >= 6) { p.salary += 15; p.career = 'Nhà sáng lập'; } else p.salary = Math.max(8, p.salary - 5);
      log(st, `khởi nghiệp quay ${v}: lương còn ${p.salary}`, p);
      done(st, v >= 6 ? `Khởi nghiệp thành công (quay ${v})! Lương lên ${p.salary} tr/kỳ.` : `Khởi nghiệp chưa thành (quay ${v}). Lương còn ${p.salary} tr/kỳ.`);
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
    return true;
  }

  function finish(st) {
    st.final = st.players.map((p) => {
      let resale = 0, resaleSpin = null;
      if (p.house) { resaleSpin = p.resaleSpin; resale = Math.round(p.house.price * (resaleSpin <= 3 ? 0.8 : resaleSpin <= 7 ? 1.2 : 1.6)); }
      const debt = p.loans * LOAN_REPAY;
      const net = p.cash + resale - debt;
      return { name: p.name, color: p.color, cash: p.cash, resale, resaleSpin, debt, stars: p.stars, net, score: net + p.stars * STAR_VALUE };
    }).sort((a, b) => b.score - a.score);
    st.phase = 'over';
    log(st, `Kết thúc! ${st.final[0].name} thắng với ${st.final[0].score} điểm đời.`);
  }

  const api = { TILES, CAREERS, HOUSES, EVENTS, COLORS, START_CASH, LOAN, LOAN_REPAY, RETIRE_BONUS, STAR_VALUE, newGame, spin, spinFor, step, choose, repay, endTurn, current: cur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LifeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
