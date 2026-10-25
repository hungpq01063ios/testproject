// Engine luật chơi Cờ Tỷ Phú — độc lập với giao diện (chạy được cả headless để kiểm thử)
import {
  SPACES, GROUPS, CHANCE_CARDS, CHEST_CARDS, START_MONEY, GO_SALARY, JAIL_FINE,
  JAIL_INDEX, MAX_HOUSES, MAX_HOTELS, fmt, say$,
} from './data.js';

const BUYABLE = new Set(['property', 'rail', 'utility']);
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class Game {
  /**
   * @param cfg { players:[{name, token, color, isAI}], startMoney, roundLimit, quiz, rnd }
   * @param ui  đối tượng giao diện (quyết định + thông báo), board: hiệu ứng 3D
   */
  constructor(cfg, ui, board) {
    this.ui = ui; this.board = board;
    this.rnd = cfg.rnd || Math.random;
    this.roundLimit = cfg.roundLimit || 0;
    this.quizOn = cfg.quiz !== false;
    this.players = cfg.players.map((p, i) => ({
      id: i, name: p.name, token: p.token, color: p.color, isAI: !!p.isAI,
      money: cfg.startMoney || START_MONEY, pos: 0, inJail: false, jailTurns: 0,
      jailCards: [], bankrupt: false, visited: [], quizCorrect: 0,
    }));
    this.props = SPACES.map(s => BUYABLE.has(s.type) ? { owner: null, houses: 0, mortgaged: false } : null);
    this.bankHouses = MAX_HOUSES; this.bankHotels = MAX_HOTELS;
    this.decks = {
      chance: shuffle(CHANCE_CARDS.map((_, i) => i), this.rnd),
      chest: shuffle(CHEST_CARDS.map((_, i) => i), this.rnd),
    };
    this.turn = 0; this.round = 1; this.over = false; this.winner = null;
    this.lastDice = [1, 1];
  }

  // ---------- Truy vấn ----------
  get active() { return this.players.filter(p => !p.bankrupt); }
  get current() { return this.players[this.turn]; }
  space(i) { return SPACES[i]; }
  groupIdx(g) { return SPACES.map((s, i) => s.group === g ? i : -1).filter(i => i >= 0); }
  ownedBy(pid) { return this.props.map((o, i) => o && o.owner === pid ? i : -1).filter(i => i >= 0); }
  ownsGroup(pid, g) { return this.groupIdx(g).every(i => this.props[i].owner === pid); }
  countType(pid, type) { return SPACES.filter((s, i) => s.type === type && this.props[i].owner === pid).length; }

  rentFor(idx, diceTotal, mult = 1, forceUtil10 = false) {
    const s = SPACES[idx], o = this.props[idx];
    if (!o || o.owner === null || o.mortgaged) return 0;
    if (s.type === 'property') {
      if (o.houses > 0) return s.rent[o.houses];
      return s.rent[0] * (this.ownsGroup(o.owner, s.group) ? 2 : 1);
    }
    if (s.type === 'rail') return 25 * 2 ** (this.countType(o.owner, 'rail') - 1) * mult;
    if (s.type === 'utility') {
      const k = forceUtil10 || this.countType(o.owner, 'utility') === 2 ? 10 : 4;
      return k * diceTotal;
    }
    return 0;
  }

  houseCost(idx) { return GROUPS[SPACES[idx].group].house; }
  mortgageValue(idx) { return SPACES[idx].price / 2; }
  unmortgageCost(idx) { return Math.ceil(SPACES[idx].price / 2 * 1.1); }

  canBuild(p, idx) {
    const s = SPACES[idx], o = this.props[idx];
    if (!o || s.type !== 'property' || o.owner !== p.id || o.houses >= 5) return false;
    if (!this.ownsGroup(p.id, s.group)) return false;
    const grp = this.groupIdx(s.group).map(i => this.props[i]);
    if (grp.some(g => g.mortgaged)) return false;
    if (o.houses > Math.min(...grp.map(g => g.houses))) return false;
    if (p.money < this.houseCost(idx)) return false;
    return o.houses === 4 ? this.bankHotels > 0 : this.bankHouses > 0;
  }
  canSell(p, idx) {
    const s = SPACES[idx], o = this.props[idx];
    if (!o || o.owner !== p.id || o.houses === 0) return false;
    const grp = this.groupIdx(s.group).map(i => this.props[i]);
    if (o.houses < Math.max(...grp.map(g => g.houses))) return false;
    return o.houses === 5 ? this.bankHouses >= 4 : true;
  }
  canMortgage(p, idx) {
    const s = SPACES[idx], o = this.props[idx];
    if (!o || o.owner !== p.id || o.mortgaged) return false;
    if (s.type === 'property' && this.groupIdx(s.group).some(i => this.props[i].houses > 0)) return false;
    return true;
  }
  canUnmortgage(p, idx) {
    const o = this.props[idx];
    return o && o.owner === p.id && o.mortgaged && p.money >= this.unmortgageCost(idx);
  }

  liquidValue(p) {
    let v = p.money;
    for (const i of this.ownedBy(p.id)) {
      const o = this.props[i];
      if (o.houses) v += o.houses * this.houseCost(i) / 2;
      if (!o.mortgaged) v += this.mortgageValue(i);
    }
    return v;
  }
  netWorth(p) {
    let v = p.money;
    for (const i of this.ownedBy(p.id)) {
      const o = this.props[i];
      v += o.mortgaged ? this.mortgageValue(i) : SPACES[i].price;
      if (o.houses) v += o.houses * this.houseCost(i);
    }
    return v;
  }

  // ---------- Hành động quản lý tài sản (gọi từ UI) ----------
  build(p, idx) {
    if (!this.canBuild(p, idx)) return false;
    const o = this.props[idx];
    p.money -= this.houseCost(idx);
    if (o.houses === 4) { this.bankHouses += 4; this.bankHotels--; } else this.bankHouses--;
    o.houses++;
    this.board.setHouses(idx, o.houses, true);
    this.ui.refresh();
    return true;
  }
  sell(p, idx) {
    if (!this.canSell(p, idx)) return false;
    const o = this.props[idx];
    if (o.houses === 5) { this.bankHotels++; this.bankHouses -= 4; } else this.bankHouses++;
    o.houses--;
    p.money += this.houseCost(idx) / 2;
    this.board.setHouses(idx, o.houses, false);
    this.ui.refresh();
    return true;
  }
  mortgage(p, idx) {
    if (!this.canMortgage(p, idx)) return false;
    this.props[idx].mortgaged = true;
    p.money += this.mortgageValue(idx);
    this.board.setOwner(idx, p, true);
    this.ui.refresh();
    return true;
  }
  unmortgage(p, idx) {
    if (!this.canUnmortgage(p, idx)) return false;
    this.props[idx].mortgaged = false;
    p.money -= this.unmortgageCost(idx);
    this.board.setOwner(idx, p, false);
    this.ui.refresh();
    return true;
  }

  // ---------- Vòng chơi ----------
  async run() {
    await this.ui.gameStart(this);
    while (!this.over) {
      const p = this.current;
      if (!p.bankrupt) {
        await this.playTurn(p);
        this.checkEnd();
        if (this.over) break;
      }
      this.nextPlayer();
      this.ui.save?.(this);
    }
    await this.ui.gameOver(this, this.winner);
  }

  nextPlayer() {
    do {
      this.turn = (this.turn + 1) % this.players.length;
      if (this.turn === 0) {
        this.round++;
        if (this.roundLimit && this.round > this.roundLimit) { this.finishByWorth(); return; }
      }
    } while (this.players[this.turn].bankrupt);
  }

  checkEnd() {
    const a = this.active;
    if (a.length <= 1) { this.over = true; this.winner = a[0] || null; }
  }
  finishByWorth() {
    this.over = true;
    this.winner = [...this.active].sort((a, b) => this.netWorth(b) - this.netWorth(a))[0];
  }

  rollDice() {
    const d = [1 + Math.floor(this.rnd() * 6), 1 + Math.floor(this.rnd() * 6)];
    this.lastDice = d;
    return d;
  }

  async playTurn(p) {
    let rolled = false, again = false, doubles = 0;
    await this.ui.turnStart(p);
    while (!p.bankrupt && !this.over) {
      const canRoll = !rolled || again;
      const opts = {
        canRoll, canEnd: !canRoll, inJail: p.inJail && canRoll && !rolled,
        canPayJail: p.inJail && !rolled && p.money >= JAIL_FINE,
        canUseCard: p.inJail && !rolled && p.jailCards.length > 0,
      };
      const act = await this.ui.chooseAction(p, opts);
      if (act === 'roll' && canRoll) {
        rolled = true; again = false;
        const d = this.rollDice();
        await this.board.rollDice(d);
        const total = d[0] + d[1], dbl = d[0] === d[1];
        await this.ui.diceRolled(p, d);
        if (p.inJail) {
          if (dbl) {
            this.releaseJail(p);
            await this.ui.msg(`${p.name} đổ được đôi, được ra tù!`, 'good');
            await this.moveSteps(p, total);
            await this.land(p, total);
          } else {
            p.jailTurns++;
            if (p.jailTurns >= 3) {
              await this.ui.msg(`${p.name} đã ở tù 3 lượt, phải nộp phạt ${say$(JAIL_FINE)} để ra.`, 'bad');
              if (!await this.pay(p, JAIL_FINE, null, 'phạt ra tù')) break;
              this.releaseJail(p);
              await this.moveSteps(p, total);
              await this.land(p, total);
            } else {
              await this.ui.msg(`${p.name} chưa đổ được đôi, tiếp tục ở lại Nhà Tạm Giữ.`, 'info');
            }
          }
        } else {
          if (dbl) doubles++;
          if (doubles === 3) {
            await this.ui.msg(`Ba lần đổ đôi liên tiếp! ${p.name} bị nghi gian lận, vào tù ngay.`, 'bad');
            await this.sendToJail(p);
          } else {
            await this.moveSteps(p, total);
            await this.land(p, total);
            again = dbl && !p.inJail && !p.bankrupt;
            if (again) await this.ui.msg(`${p.name} đổ được đôi, được đổ thêm lượt nữa!`, 'good');
          }
        }
      } else if (act === 'payJail' && opts.canPayJail) {
        p.money -= JAIL_FINE;
        this.releaseJail(p);
        this.ui.sfx('pay');
        await this.ui.msg(`${p.name} nộp ${say$(JAIL_FINE)} và được tự do.`, 'info');
      } else if (act === 'useCard' && opts.canUseCard) {
        const deck = p.jailCards.pop();
        this.returnJailCard(deck);
        this.releaseJail(p);
        await this.ui.msg(`${p.name} dùng Thẻ Ân Xá, được ra tù!`, 'good');
      } else if (act === 'manage') {
        await this.ui.manage(p, this);
      } else if (act === 'trade') {
        await this.tradeFlow(p);
      } else if (act === 'bankrupt') {
        await this.bankrupt(p, null);
      } else if (act === 'end' && !canRoll) {
        break;
      }
    }
    await this.ui.turnEnd?.(p);
  }

  releaseJail(p) { p.inJail = false; p.jailTurns = 0; this.board.setJailed?.(p, false); this.ui.refresh(); }

  async sendToJail(p) {
    p.pos = JAIL_INDEX; p.inJail = true; p.jailTurns = 0;
    await this.board.teleport(p, JAIL_INDEX, true);
    await this.ui.jailed(p);
    this.ui.refresh();
  }

  async moveSteps(p, steps) {
    const from = p.pos;
    const to = ((from + steps) % 40 + 40) % 40;
    const passGo = steps > 0 && from + steps >= 40;
    await this.board.moveToken(p, from, steps, (i) => {
      if (i === 0 && steps > 0) this.ui.sfx('go');
    });
    p.pos = to;
    if (passGo) await this.collectGo(p, to === 0);
  }

  async moveTo(p, target, collect = true) {
    let steps = (target - p.pos + 40) % 40;
    if (steps === 0) steps = 40;
    if (!collect) { p.pos = target; await this.board.teleport(p, target); return; }
    await this.moveSteps(p, steps);
  }

  async collectGo(p, landed) {
    p.money += GO_SALARY;
    this.board.fx('confetti', 0);
    await this.ui.msg(landed
      ? `${p.name} dừng ngay tại Xuất Phát! Ngân hàng trao thưởng ${say$(GO_SALARY)}.`
      : `${p.name} đi qua Xuất Phát, nhận ${say$(GO_SALARY)} từ Ngân hàng.`, 'good', 'go');
    this.ui.refresh();
  }

  async land(p, diceTotal, cardOpts = {}) {
    const idx = p.pos, s = SPACES[idx];
    const firstVisit = !p.visited.includes(idx);
    if (firstVisit) p.visited.push(idx);
    await this.board.arrive(p, idx);
    this.ui.ambience(s);

    if (BUYABLE.has(s.type)) {
      const o = this.props[idx];
      if (o.owner === null) {
        const buy = await this.ui.offerBuy(p, idx, firstVisit);
        if (buy && p.money >= s.price) {
          p.money -= s.price; o.owner = p.id;
          this.board.setOwner(idx, p, false);
          this.board.fx('coins', idx);
          await this.ui.bought(p, idx);
        } else {
          await this.auction(idx);
        }
      } else if (o.owner === p.id) {
        await this.ui.visitOwn(p, idx, firstVisit);
      } else if (o.mortgaged) {
        await this.ui.visitMortgaged(p, idx, this.players[o.owner], firstVisit);
      } else {
        let total = diceTotal;
        if (cardOpts.util10) { const d = this.rollDice(); await this.board.rollDice(d); total = d[0] + d[1]; }
        const rent = this.rentFor(idx, total, cardOpts.railMult || 1, cardOpts.util10);
        const owner = this.players[o.owner];
        await this.ui.payRent(p, idx, owner, rent, firstVisit);
        if (await this.pay(p, rent, owner, `tiền thuê ${s.name}`)) {
          this.board.fx('coins', idx);
          await this.ui.msg(`${p.name} đã trả ${say$(rent)} tiền thuê cho ${owner.name}.`, 'bad', 'pay');
        }
      }
      if (firstVisit && this.quizOn && s.quiz && !p.bankrupt) await this.quiz(p, idx);
      return;
    }

    switch (s.type) {
      case 'tax':
        await this.ui.tax(p, idx);
        await this.pay(p, s.amount, null, s.name);
        break;
      case 'chance': case 'chest':
        await this.drawCard(p, s.type);
        break;
      case 'gotojail':
        await this.ui.msg(`Ôi không! ${p.name} bị đưa vào Nhà Tạm Giữ!`, 'bad');
        await this.sendToJail(p);
        break;
      case 'jail':
        await this.ui.msg(`${p.name} ghé thăm Nhà Tạm Giữ. Chỉ là thăm nuôi thôi, đừng lo!`, 'info');
        break;
      case 'parking':
        await this.ui.msg(`${p.name} dừng chân ở Bãi Đỗ Xe. Nghỉ ngơi, uống ly cà phê sữa đá nào!`, 'info');
        break;
      case 'go': break;
    }
  }

  async quiz(p, idx) {
    const ok = await this.ui.quiz(p, idx);
    if (ok) {
      p.money += 20; p.quizCorrect++;
      this.ui.refresh();
    }
  }

  // ---------- Thanh toán / phá sản ----------
  async pay(p, amount, creditor, reason = '') {
    if (amount <= 0) return true;
    while (p.money < amount) {
      if (this.liquidValue(p) < amount) {
        await this.ui.msg(`${p.name} không đủ khả năng chi trả ${say$(amount)}${reason ? ' ' + reason : ''}.`, 'bad');
        await this.bankrupt(p, creditor);
        return false;
      }
      const r = await this.ui.raiseFunds(p, amount, creditor, this);
      if (r === 'bankrupt') { await this.bankrupt(p, creditor); return false; }
    }
    p.money -= amount;
    if (creditor) creditor.money += amount;
    this.ui.refresh();
    return true;
  }

  async bankrupt(p, creditor) {
    if (p.bankrupt) return;
    p.bankrupt = true;
    // Bán toàn bộ nhà về ngân hàng
    for (const i of this.ownedBy(p.id)) {
      const o = this.props[i];
      if (o.houses) {
        p.money += o.houses * this.houseCost(i) / 2;
        if (o.houses === 5) this.bankHotels++; else this.bankHouses += o.houses;
        o.houses = 0; this.board.setHouses(i, 0, false);
      }
    }
    if (creditor && !creditor.bankrupt) {
      creditor.money += Math.max(0, p.money);
      for (const i of this.ownedBy(p.id)) { this.props[i].owner = creditor.id; this.board.setOwner(i, creditor, this.props[i].mortgaged); }
      creditor.jailCards.push(...p.jailCards);
    } else {
      for (const i of this.ownedBy(p.id)) { Object.assign(this.props[i], { owner: null, mortgaged: false }); this.board.setOwner(i, null); }
      for (const d of p.jailCards) this.returnJailCard(d);
    }
    p.jailCards = []; p.money = 0;
    this.board.removeToken(p);
    await this.ui.bankrupted(p, creditor);
    this.ui.refresh();
    this.checkEnd();
  }

  // ---------- Đấu giá ----------
  async auction(idx) {
    const s = SPACES[idx];
    let bidders = this.active.filter(p => p.money > 0);
    if (!bidders.length) return;
    let price = 0, leader = null;
    await this.ui.auctionStart(idx);
    let i = bidders.indexOf(this.current); if (i < 0) i = 0;
    let passesInRow = 0;
    while (bidders.length > 0) {
      if (leader && bidders.length === 1 && bidders[0] === leader) break;
      const b = bidders[i % bidders.length];
      if (b === leader) { i++; continue; }
      const bid = await this.ui.auctionTurn(b, idx, price, leader);
      if (bid > price && bid <= b.money) {
        price = bid; leader = b; passesInRow = 0; i++;
      } else {
        bidders = bidders.filter(x => x !== b);
        passesInRow++;
        if (i >= bidders.length) i = 0;
      }
      if (!leader && bidders.length === 0) break;
    }
    if (leader) {
      leader.money -= price; this.props[idx].owner = leader.id;
      this.board.setOwner(idx, leader, false);
      this.board.fx('coins', idx);
      await this.ui.auctionEnd(idx, leader, price);
    } else {
      await this.ui.auctionEnd(idx, null, 0);
    }
    this.ui.refresh();
  }

  // ---------- Thẻ ----------
  drawFrom(deck) {
    const arr = this.decks[deck];
    const ci = arr.shift();
    const card = (deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS)[ci];
    if (card.action !== 'jailCard') arr.push(ci);
    return { ci, card };
  }
  returnJailCard(deck) {
    const cards = deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
    const ci = cards.findIndex(c => c.action === 'jailCard');
    if (!this.decks[deck].includes(ci)) this.decks[deck].push(ci);
  }

  async drawCard(p, deck) {
    const { card } = this.drawFrom(deck);
    await this.ui.showCard(p, deck, card);
    switch (card.action) {
      case 'money':
        if (card.amount > 0) { p.money += card.amount; this.ui.sfx('coin'); this.ui.refresh(); }
        else await this.pay(p, -card.amount, null, 'theo thẻ');
        break;
      case 'moveTo':
        await this.moveTo(p, card.to, true);
        await this.land(p, this.lastDice[0] + this.lastDice[1]);
        break;
      case 'back':
        await this.moveSteps(p, -card.steps);
        await this.land(p, this.lastDice[0] + this.lastDice[1]);
        break;
      case 'jail':
        await this.sendToJail(p);
        break;
      case 'jailCard':
        p.jailCards.push(deck); this.ui.refresh();
        break;
      case 'nearestRail': {
        const t = this.nearest(p.pos, 'rail');
        await this.moveTo(p, t, true);
        await this.land(p, this.lastDice[0] + this.lastDice[1], { railMult: 2 });
        break;
      }
      case 'nearestUtility': {
        const t = this.nearest(p.pos, 'utility');
        await this.moveTo(p, t, true);
        await this.land(p, 0, { util10: true });
        break;
      }
      case 'repairs': {
        let total = 0;
        for (const i of this.ownedBy(p.id)) {
          const h = this.props[i].houses;
          total += h === 5 ? card.hotel : h * card.house;
        }
        if (total) await this.pay(p, total, null, 'sửa chữa');
        else await this.ui.msg(`${p.name} chưa có nhà nào, không phải trả đồng nào!`, 'good');
        break;
      }
      case 'payEach':
        for (const o of this.active) if (o !== p && !p.bankrupt) await this.pay(p, card.amount, o, 'cho ' + o.name);
        break;
      case 'collectEach':
        for (const o of this.active) if (o !== p) await this.pay(o, card.amount, p, 'cho ' + p.name);
        break;
    }
  }
  nearest(pos, type) {
    for (let k = 1; k <= 40; k++) { const i = (pos + k) % 40; if (SPACES[i].type === type) return i; }
    return pos;
  }

  // ---------- Giao dịch ----------
  async tradeFlow(p) {
    const offer = await this.ui.trade(p, this);
    if (!offer) return;
    const target = this.players[offer.to];
    if (!this.validTrade(p, offer)) { await this.ui.msg('Đề nghị giao dịch không hợp lệ.', 'bad'); return; }
    const ok = await this.ui.respondTrade(target, p, offer, this);
    if (ok) {
      this.executeTrade(p, target, offer);
      await this.ui.msg(`Giao dịch thành công giữa ${p.name} và ${target.name}!`, 'good', 'deal');
    } else {
      await this.ui.msg(`${target.name} đã từ chối đề nghị của ${p.name}.`, 'info');
    }
  }
  validTrade(p, o) {
    const t = this.players[o.to];
    if (!t || t.bankrupt || t === p) return false;
    if (o.giveMoney > p.money || o.getMoney > t.money) return false;
    const clean = i => this.props[i] && (SPACES[i].type !== 'property' || this.groupIdx(SPACES[i].group).every(g => this.props[g].houses === 0));
    if (!o.give.every(i => this.props[i]?.owner === p.id && clean(i))) return false;
    if (!o.get.every(i => this.props[i]?.owner === t.id && clean(i))) return false;
    return o.give.length + o.get.length + o.giveMoney + o.getMoney > 0;
  }
  executeTrade(p, t, o) {
    p.money += o.getMoney - o.giveMoney; t.money += o.giveMoney - o.getMoney;
    for (const i of o.give) { this.props[i].owner = t.id; this.board.setOwner(i, t, this.props[i].mortgaged); }
    for (const i of o.get) { this.props[i].owner = p.id; this.board.setOwner(i, p, this.props[i].mortgaged); }
    this.ui.refresh();
  }

  // ---------- Lưu / tải ----------
  serialize() {
    return JSON.stringify({
      v: 1, players: this.players, props: this.props, bankHouses: this.bankHouses, bankHotels: this.bankHotels,
      decks: this.decks, turn: this.turn, round: this.round, roundLimit: this.roundLimit, quizOn: this.quizOn,
    });
  }
  static restore(json, ui, board) {
    const d = JSON.parse(json);
    const g = new Game({ players: d.players, roundLimit: d.roundLimit, quiz: d.quizOn }, ui, board);
    Object.assign(g, { players: d.players, props: d.props, bankHouses: d.bankHouses, bankHotels: d.bankHotels, decks: d.decks, turn: d.turn, round: d.round });
    return g;
  }
}
