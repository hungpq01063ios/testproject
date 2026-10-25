// Mô phỏng headless nhiều ván toàn máy để kiểm thử engine: node tests/simulate.mjs [số ván]
import { Game } from '../js/game.js';
import { AI } from '../js/ai.js';
import { SPACES, MAX_HOUSES, MAX_HOTELS } from '../js/data.js';

let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const noop = async () => {};

function makeUI() {
  let g;
  return {
    bind(x) { g = x; },
    gameStart: noop, gameOver: noop, turnStart: noop, turnEnd: noop, diceRolled: noop, msg: noop,
    jailed: noop, bought: noop, visitOwn: noop, visitMortgaged: noop, payRent: noop, tax: noop,
    showCard: noop, bankrupted: noop, auctionStart: noop, auctionEnd: noop,
    refresh() {}, sfx() {}, ambience() {},
    async chooseAction(p, o) { return AI.chooseAction(g, p, o); },
    async offerBuy(p, i) { return AI.wantBuy(g, p, i); },
    async auctionTurn(p, i, cur) { return AI.auctionBid(g, p, i, cur); },
    async raiseFunds(p, amt) { return AI.raiseFunds(g, p, amt); },
    async manage(p) { AI.autoManage(g, p); },
    async trade() { return null; },
    async respondTrade(t, f, o) { return AI.acceptTrade(g, t, f, o); },
    async quiz(p, i) { return AI.quizAnswer(g, p, SPACES[i]) === SPACES[i].quiz.c; },
  };
}
const board = new Proxy({}, { get: () => async () => {} });

const N = +process.argv[2] || 200;
const stats = { rounds: [], winners: {}, limitHits: 0 };
for (let k = 0; k < N; k++) {
  const ui = makeUI();
  const n = 2 + (k % 5);
  const g = new Game({ rnd, roundLimit: 300, players: Array.from({ length: n }, (_, i) => ({ name: 'Máy ' + i, token: 'nonla', color: '#fff', isAI: true })) }, ui, board);
  ui.bind(g);
  await g.run();
  // Kiểm tra bất biến
  const houses = g.props.filter(Boolean).reduce((s, o) => s + (o.houses < 5 ? o.houses : 0), 0);
  const hotels = g.props.filter(Boolean).filter(o => o.houses === 5).length;
  if (houses + g.bankHouses !== MAX_HOUSES || hotels + g.bankHotels !== MAX_HOTELS) throw new Error(`Sai số nhà: ${houses}+${g.bankHouses}, ${hotels}+${g.bankHotels}`);
  for (const p of g.players) if (p.money < 0) throw new Error('Tiền âm: ' + p.name + ' ' + p.money);
  for (const o of g.props.filter(Boolean)) if (o.owner !== null && g.players[o.owner].bankrupt) throw new Error('Người phá sản còn tài sản');
  stats.rounds.push(g.round);
  if (g.round > 300) stats.limitHits++;
  stats.winners[g.winner?.id] = (stats.winners[g.winner?.id] || 0) + 1;
}
const avg = stats.rounds.reduce((a, b) => a + b, 0) / N;
console.log(`OK ${N} ván. Số vòng TB: ${avg.toFixed(1)}; chạm giới hạn: ${stats.limitHits}; thắng theo vị trí:`, stats.winners);
