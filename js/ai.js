// Trí tuệ nhân tạo đơn giản cho người chơi máy
import { SPACES, JAIL_FINE } from './data.js';

const RESERVE = 150;

export const AI = {
  chooseAction(g, p, opts) {
    if (opts.inJail) {
      const lateGame = g.props.filter(o => o && o.owner !== null).length > 18;
      if (opts.canUseCard) return 'useCard';
      if (opts.canPayJail && !lateGame && p.money > JAIL_FINE + RESERVE) return 'payJail';
      return 'roll';
    }
    if (!p._managed) { p._managed = true; if (this.autoManage(g, p)) return 'noop'; }
    if (opts.canRoll) return 'roll';
    p._managed = false;
    return 'end';
  },

  // Xây nhà / chuộc tài sản khi dư tiền. Trả về true nếu có thay đổi.
  autoManage(g, p) {
    let changed = false;
    for (const i of g.ownedBy(p.id)) {
      if (g.props[i].mortgaged && p.money - g.unmortgageCost(i) > RESERVE * 2) changed = g.unmortgage(p, i) || changed;
    }
    let guard = 0, built = true;
    while (built && guard++ < 40) {
      built = false;
      const cands = g.ownedBy(p.id).filter(i => g.canBuild(p, i) && p.money - g.houseCost(i) > RESERVE)
        .sort((a, b) => g.props[a].houses - g.props[b].houses || SPACES[b].price - SPACES[a].price);
      if (cands.length) { built = g.build(p, cands[0]); changed = changed || built; }
    }
    return changed;
  },

  wantBuy(g, p, idx) {
    const s = SPACES[idx];
    if (p.money < s.price) return false;
    const left = p.money - s.price;
    // Ưu tiên hoàn thành nhóm màu
    if (s.group) {
      const grp = g.groupIdx(s.group);
      const mine = grp.filter(i => g.props[i].owner === p.id).length;
      if (mine === grp.length - 1) return left >= 0;
    }
    return left >= RESERVE * 0.6;
  },

  auctionBid(g, p, idx, current) {
    const s = SPACES[idx];
    const limit = Math.min(p.money - RESERVE * 0.5, s.price * (0.7 + g.rnd() * 0.5));
    const step = current < 100 ? 10 : 20;
    const next = current + step;
    return next <= limit ? next : 0;
  },

  raiseFunds(g, p, amount) {
    let guard = 0;
    while (p.money < amount && guard++ < 200) {
      const mine = g.ownedBy(p.id);
      const sell = mine.find(i => g.canSell(p, i));
      if (sell !== undefined) { g.sell(p, sell); continue; }
      const mort = mine.filter(i => g.canMortgage(p, i)).sort((a, b) => SPACES[a].price - SPACES[b].price)[0];
      if (mort !== undefined) { g.mortgage(p, mort); continue; }
      break;
    }
    return p.money >= amount ? 'done' : 'bankrupt';
  },

  value(g, pid, idx) {
    const s = SPACES[idx];
    let v = s.price;
    if (g.props[idx].mortgaged) v *= 0.6;
    if (s.group) {
      const grp = g.groupIdx(s.group);
      const mine = grp.filter(i => i !== idx && g.props[i].owner === pid).length;
      if (mine === grp.length - 1) v *= 2.2; // hoàn thành nhóm
    }
    return v;
  },

  acceptTrade(g, t, from, offer) {
    // t nhận offer.give + giveMoney, mất offer.get + getMoney
    let gain = offer.giveMoney - offer.getMoney;
    for (const i of offer.give) gain += this.value(g, t.id, i);
    for (const i of offer.get) gain -= this.value(g, t.id, i) * 1.15;
    // Không nhường nhóm màu hoàn chỉnh cho đối thủ dễ dàng
    for (const i of offer.get) {
      const s = SPACES[i];
      if (s.group) {
        const grp = g.groupIdx(s.group);
        if (grp.filter(k => k !== i && g.props[k].owner === from.id).length === grp.length - 1) gain -= s.price * 1.5;
      }
    }
    return gain > 10;
  },

  quizAnswer(g, p, s) {
    return g.rnd() < 0.6 ? s.quiz.c : Math.floor(g.rnd() * s.quiz.a.length);
  },
};
