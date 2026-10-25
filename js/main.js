// Khởi động trò chơi: màn hình thiết lập → trận đấu
import { Board3D } from './board3d.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { sound } from './audio.js';
import { Voice } from './voice.js';
import { TOKENS, PLAYER_COLORS } from './data.js';

const $ = s => document.querySelector(s);
const AI_NAMES = ['Cô Ba Sài Gòn', 'Chú Tư Cần Thơ', 'Bác Năm Hà Nội', 'Anh Sáu Huế', 'Chị Bảy Đà Nẵng'];

// Chờ font để chữ trên bàn cờ hiển thị đúng dấu tiếng Việt
await Promise.race([document.fonts.load('800 34px "Be Vietnam Pro"').catch(() => {}), new Promise(r => setTimeout(r, 2500))]);

const voice = new Voice();
const board = new Board3D($('#scene'));
board.init();
board.sound = sound;
const ui = new UI({ board, sound, voice });
board.setQuality(ui.settings.quality);
ui.thumbs = {};
const thumb = (t, c) => (ui.thumbs[t + c] ||= board.tokenThumb(t, c));

$('#loading').classList.add('done');
setTimeout(() => $('#loading').remove(), 800);

// Toàn cảnh xoay chậm ở màn hình chờ
board.camMode = 'auto';
board.idle = true;

// ---------- Thiết lập người chơi ----------
const rows = $('#player-rows');
const players = [
  { name: '', token: 'nonla', color: PLAYER_COLORS[0], isAI: false },
  { name: AI_NAMES[0], token: 'trongdong', color: PLAYER_COLORS[1], isAI: true },
];
let audioReady = false;
const unlock = () => { if (!audioReady) { sound.init(); voice.unlock(); audioReady = true; } };

function renderRows() {
  rows.innerHTML = '';
  players.forEach((p, i) => {
    const row = document.createElement('div'); row.className = 'prow'; row.style.setProperty('--pc', p.color);
    row.innerHTML = `
      <img class="thumb" alt="">
      <div class="pfields">
        <input class="pname-in" maxlength="18" placeholder="Nhập tên người chơi ${i + 1}" value="">
        <div class="ptokens"></div>
      </div>
      <div class="pside">
        <div class="pcolors"></div>
        <button class="ptype">${p.isAI ? '🤖 Máy' : '🙂 Người'}</button>
        ${players.length > 2 ? '<button class="premove" title="Xoá">✕</button>' : ''}
      </div>`;
    row.querySelector('.thumb').src = thumb(p.token, p.color);
    const inp = row.querySelector('.pname-in'); inp.value = p.name;
    inp.oninput = () => { p.name = inp.value; };
    inp.onfocus = unlock;
    inp.onchange = () => { if (p.name.trim()) voice.say(`Xin chào ${p.name.trim()}! Chào mừng bạn đến với Cờ Tỷ Phú Việt Nam.`, { interrupt: true }); };
    const tk = row.querySelector('.ptokens');
    for (const t of TOKENS) {
      const b = document.createElement('button'); b.className = 'tok' + (p.token === t.id ? ' on' : ''); b.title = t.name;
      const taken = players.some((q, j) => j !== i && q.token === t.id);
      b.disabled = taken;
      b.innerHTML = `<img src="${thumb(t.id, p.color)}" alt=""><span>${t.name}</span>`;
      b.onclick = () => { unlock(); sound.play('click'); p.token = t.id; renderRows(); };
      tk.append(b);
    }
    const pc = row.querySelector('.pcolors');
    for (const c of PLAYER_COLORS) {
      const b = document.createElement('button'); b.className = 'col' + (p.color === c ? ' on' : ''); b.style.background = c;
      b.disabled = players.some((q, j) => j !== i && q.color === c);
      b.onclick = () => { unlock(); sound.play('click'); p.color = c; renderRows(); };
      pc.append(b);
    }
    row.querySelector('.ptype').onclick = () => {
      unlock(); sound.play('click'); p.isAI = !p.isAI;
      if (p.isAI && !p.name.trim()) p.name = AI_NAMES.find(n => !players.some(q => q.name === n)) || 'Máy';
      renderRows();
    };
    row.querySelector('.premove')?.addEventListener('click', () => { players.splice(i, 1); renderRows(); });
    rows.append(row);
  });
  $('#add-player').disabled = players.length >= 6;
}
renderRows();

$('#add-player').onclick = () => {
  unlock(); sound.play('click');
  const token = TOKENS.find(t => !players.some(p => p.token === t.id)).id;
  const color = PLAYER_COLORS.find(c => !players.some(p => p.color === c));
  players.push({ name: AI_NAMES.find(n => !players.some(q => q.name === n)) || 'Máy', token, color, isAI: true });
  renderRows();
};

const updateVoiceNote = () => {
  $('#voice-note').textContent = !voice.supported ? '⚠️ Trình duyệt không hỗ trợ giọng nói — lời Ngân hàng sẽ hiện dạng chữ.'
    : voice.hasVietnamese ? `🗣️ Giọng Ngân hàng: ${voice.voice?.name}` : '⚠️ Chưa tìm thấy giọng tiếng Việt trên trình duyệt này. Nên dùng Microsoft Edge hoặc Chrome Android để nghe Ngân hàng nói.';
};
voice.onChange = updateVoiceNote; updateVoiceNote();

let saved = null;
try { saved = localStorage.getItem('ctp-save'); } catch { /* bỏ qua */ }
if (saved) $('#btn-resume').hidden = false;

function begin(game) {
  board.idle = false;
  $('#setup').classList.add('out');
  setTimeout(() => $('#setup').remove(), 700);
  board.addPlayers(game.players);
  game.props.forEach((o, i) => { if (o && o.owner !== null) { board.setOwner(i, game.players[o.owner], o.mortgaged); if (o.houses) board.setHouses(i, o.houses, false); } });
  board.overview();
  game.run().catch(err => { console.error(err); ui.toast('Lỗi: ' + err.message, 'bad'); });
  window.__game = game; window.__ui = ui;
}

$('#btn-start').onclick = () => {
  unlock();
  const list = players.map((p, i) => ({ ...p, name: p.name.trim() || `Người chơi ${i + 1}` }));
  const names = new Set();
  for (const p of list) { let n = p.name, k = 2; while (names.has(n)) n = `${p.name} ${k++}`; p.name = n; names.add(n); }
  sound.play('go');
  begin(new Game({ players: list, startMoney: +$('#opt-money').value, roundLimit: +$('#opt-rounds').value, quiz: $('#opt-quiz').value === '1' }, ui, board));
};
$('#btn-resume').onclick = () => {
  unlock();
  try { begin(Game.restore(saved, ui, board)); } catch (e) { console.error(e); ui.toast('Không đọc được ván đã lưu', 'bad'); }
};
