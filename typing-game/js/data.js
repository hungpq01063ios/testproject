'use strict';
// =====================================================================
//  DỮ LIỆU GAME: ngón tay, thế giới, màn chơi, kho từ, tủ đồ
// =====================================================================

// ---- Ngón tay phụ trách từng phím (chuẩn gõ 10 ngón) ----
const FINGER_KEYS = {
  L5: 'qaz', L4: 'wsx', L3: 'edc', L2: 'rtfgvb',
  R2: 'yuhjnm', R3: 'ik,', R4: 'ol.', R5: 'p;/',
  TH: ' '
};
const FINGER_OF = {};
for (const f in FINGER_KEYS) for (const k of FINGER_KEYS[f]) FINGER_OF[k] = f;

const FINGERS = {
  L5: { name: 'ngón út trái',     color: '#ffb3d1' },
  L4: { name: 'ngón áp út trái',  color: '#ffd59e' },
  L3: { name: 'ngón giữa trái',   color: '#fff09e' },
  L2: { name: 'ngón trỏ trái',    color: '#b5f0c4' },
  R2: { name: 'ngón trỏ phải',    color: '#a8dcff' },
  R3: { name: 'ngón giữa phải',   color: '#fff09e' },
  R4: { name: 'ngón áp út phải',  color: '#ffd59e' },
  R5: { name: 'ngón út phải',     color: '#ffb3d1' },
  TH: { name: 'ngón cái',         color: '#e6dcff' }
};

// Tên chữ cái đọc theo kiểu tiếng Việt cho giọng nói
const KEY_NAMES = {
  a: 'a', b: 'bê', c: 'xê', d: 'đê', e: 'e', f: 'ép', g: 'giê', h: 'hát', i: 'i',
  j: 'gi', k: 'ca', l: 'e lờ', m: 'em mờ', n: 'en nờ', o: 'o', p: 'pê', q: 'quy',
  r: 'e rờ', s: 'ét xì', t: 'tê', u: 'u', v: 'vê', w: 'vê kép', x: 'ích xì',
  y: 'i dài', z: 'dét', ';': 'chấm phẩy', ',': 'dấu phẩy', '.': 'dấu chấm',
  '/': 'gạch chéo', ' ': 'cách'
};
const keyLabel = k => (k === ' ' ? 'Cách' : k.toUpperCase());
const keySpoken = k => 'phím ' + (KEY_NAMES[k] || k);
const fingerHint = k => `${keySpoken(k)}, dùng ${FINGERS[FINGER_OF[k]].name} nhé`;

// ---- 5 thế giới ----
const WORLDS = [
  { name: 'Vườn Hoa Tím', emoji: '🌷', desc: 'Hàng phím nhà',
    theme: { skyTop: '#ffd9f0', skyBot: '#fff6fb', hillFar: '#ead2ff', hillNear: '#d6aef8',
             ground: '#a8e08a', groundTop: '#7cc95a', tile: '#97d878', extra: 'lavender',
             obstacle: 'flower', accent: '#c45cf2' } },
  { name: 'Lâu Đài Kẹo Ngọt', emoji: '🍭', desc: 'G, H và những từ đầu tiên',
    theme: { skyTop: '#ffd1e8', skyBot: '#fff0dc', hillFar: '#ffd0e6', hillNear: '#ffb1d3',
             ground: '#ffd6a8', groundTop: '#ff9ec9', tile: '#ffc993', extra: 'lollipop',
             obstacle: 'cupcake', accent: '#ff4f9a' } },
  { name: 'Biển Ngọc Trai', emoji: '🐚', desc: 'Hàng phím trên',
    theme: { skyTop: '#aee8ff', skyBot: '#ecfcff', hillFar: '#9fdcf2', hillNear: '#5fc4e6',
             ground: '#ffe8b8', groundTop: '#ffd78a', tile: '#f9dda4', extra: 'sea',
             obstacle: 'shell', accent: '#1f9fd6' } },
  { name: 'Rừng Cầu Vồng', emoji: '🌈', desc: 'Hàng phím dưới',
    theme: { skyTop: '#c9f0ff', skyBot: '#fdfbe6', hillFar: '#b3e8c0', hillNear: '#85d6a0',
             ground: '#aedd86', groundTop: '#6cc35a', tile: '#9fd578', extra: 'rainbow',
             obstacle: 'mushroom', accent: '#2fb879' } },
  { name: 'Vương Quốc Mây', emoji: '☁️', desc: 'Gõ câu & tăng tốc',
    theme: { skyTop: '#b7a6ff', skyBot: '#ffd9f4', hillFar: '#efe6ff', hillNear: '#ffffff',
             ground: '#ffffff', groundTop: '#f3ecff', tile: '#f1eaff', extra: 'clouds',
             obstacle: 'gift', accent: '#7b5cff' } }
];

// ---- Màn chơi ----
// type: letters (từng chữ) | chunks (cụm 2-3 chữ) | words (từ) | sentences (câu)
// speed: 0 = chế độ chờ (nhân vật đứng đợi bé gõ), >0 = nhân vật tự chạy (px/giây), có 3 trái tim
const LEVELS = [
  // Thế giới 1 – Hàng phím nhà
  { id: '1-1', world: 0, title: 'Hai bạn F và J', newKeys: 'fj', type: 'letters', count: 20, speed: 0,
    intro: 'Chào mừng đến Vườn Hoa Tím! Trước tiên, bé ngồi thẳng lưng nhé. Đặt ngón trỏ trái lên phím ép, ngón trỏ phải lên phím gi. Hai phím này có một gờ nhỏ, bé sờ thử xem! Thấy chữ nào, gõ đúng phím đó để bạn nhỏ nhảy qua nha.' },
  { id: '1-2', world: 0, title: 'Thêm D và K', newKeys: 'dk', type: 'letters', count: 22, speed: 0,
    intro: 'Hai ngón trỏ vẫn ở nhà ép và gi. Bây giờ ngón giữa trái đặt lên phím đê, ngón giữa phải đặt lên phím ca.' },
  { id: '1-3', world: 0, title: 'Thêm S và L', newKeys: 'sl', type: 'letters', count: 22, speed: 0,
    intro: 'Ngón áp út trái đặt lên phím ét xì, ngón áp út phải đặt lên phím e lờ. Các ngón tay đang xếp hàng ngay ngắn rồi đó!' },
  { id: '1-4', world: 0, title: 'Ngón út A và ;', newKeys: 'a;', type: 'letters', count: 22, speed: 0,
    intro: 'Hai ngón út cũng muốn chơi! Ngón út trái đặt lên phím a, ngón út phải đặt lên phím chấm phẩy. Vậy là đủ tám ngón ở hàng phím nhà rồi!' },
  { id: '1-5', world: 0, title: 'Ôn hàng phím nhà', newKeys: '', type: 'chunks', count: 16, speed: 0,
    intro: 'Hàng phím nhà là ngôi nhà của các ngón tay. Hãy gõ các cụm chữ, nhớ mỗi ngón chỉ gõ phím của mình thôi nhé.' },

  // Thế giới 2 – G, H, từ đầu tiên, phím cách
  { id: '2-1', world: 1, title: 'Với tay tới G và H', newKeys: 'gh', type: 'letters', count: 22, speed: 0,
    intro: 'Chào mừng đến Lâu Đài Kẹo Ngọt! Ngón trỏ trái với sang phải một chút để gõ phím giê, ngón trỏ phải với sang trái để gõ phím hát. Gõ xong nhớ quay về nhà ép và gi nha.' },
  { id: '2-2', world: 1, title: 'Những từ đầu tiên', newKeys: '', type: 'words', count: 12, speed: 0,
    intro: 'Oa, bé đã biết đủ chữ để gõ cả một từ rồi! Gõ lần lượt từng chữ cái trong từ để mở cổng kẹo nhé.' },
  { id: '2-3', world: 1, title: 'Ngón cái & phím cách', newKeys: ' ', type: 'sentences', phrases: 'home', count: 5, speed: 0,
    intro: 'Ngón cái là bạn của phím cách, phím dài nhất bàn phím. Sau mỗi từ, bé gõ phím cách bằng ngón cái nhé.' },
  { id: '2-4', world: 1, title: 'Thử thách kẹo ngọt', newKeys: '', type: 'words', count: 12, speed: 95,
    intro: 'Thử thách đầu tiên! Lần này bạn nhỏ sẽ tự chạy. Bé gõ xong chữ trước khi chạm vào chướng ngại vật nhé. Bé có ba trái tim, cố lên!' },

  // Thế giới 3 – Hàng phím trên
  { id: '3-1', world: 2, title: 'E và I', newKeys: 'ei', type: 'letters', count: 22, speed: 0,
    intro: 'Chào mừng đến Biển Ngọc Trai! Ngón giữa trái đi lên phím e, ngón giữa phải đi lên phím i. Gõ xong nhớ quay về nhà nhé.' },
  { id: '3-2', world: 2, title: 'R và U', newKeys: 'ru', type: 'letters', count: 22, speed: 0,
    intro: 'Ngón trỏ trái đi lên phím e rờ, ngón trỏ phải đi lên phím u.' },
  { id: '3-3', world: 2, title: 'T và Y', newKeys: 'ty', type: 'letters', count: 22, speed: 0,
    intro: 'Ngón trỏ trái với lên phím tê, ngón trỏ phải với lên phím i dài. Hai phím này hơi xa, bé cứ từ từ thôi.' },
  { id: '3-4', world: 2, title: 'W và O', newKeys: 'wo', type: 'letters', count: 22, speed: 0,
    intro: 'Ngón áp út trái đi lên phím vê kép, ngón áp út phải đi lên phím o.' },
  { id: '3-5', world: 2, title: 'Q và P', newKeys: 'qp', type: 'letters', count: 22, speed: 0,
    intro: 'Ngón út trái đi lên phím quy, ngón út phải đi lên phím pê. Ngón út tuy nhỏ nhưng rất giỏi đó!' },
  { id: '3-6', world: 2, title: 'Từ xinh hàng trên', newKeys: '', type: 'words', count: 12, speed: 0,
    intro: 'Bé đã biết cả hàng phím trên rồi! Cùng gõ những từ thật xinh nào.' },
  { id: '3-7', world: 2, title: 'Chạy trên bờ cát', newKeys: '', type: 'words', count: 12, speed: 100,
    intro: 'Thử thách bờ biển! Bạn nhỏ sẽ tự chạy, bé gõ thật chính xác nhé.' },

  // Thế giới 4 – Hàng phím dưới
  { id: '4-1', world: 3, title: 'V và M', newKeys: 'vm', type: 'letters', count: 22, speed: 0,
    intro: 'Chào mừng đến Rừng Cầu Vồng! Ngón trỏ trái đi xuống phím vê, ngón trỏ phải đi xuống phím em mờ.' },
  { id: '4-2', world: 3, title: 'C và dấu phẩy', newKeys: 'c,', type: 'letters', count: 22, speed: 0,
    intro: 'Ngón giữa trái đi xuống phím xê, ngón giữa phải đi xuống phím dấu phẩy.' },
  { id: '4-3', world: 3, title: 'B và N', newKeys: 'bn', type: 'letters', count: 22, speed: 0,
    intro: 'Ngón trỏ trái với xuống phím bê, ngón trỏ phải với xuống phím en nờ.' },
  { id: '4-4', world: 3, title: 'X, Z và dấu chấm', newKeys: 'xz.', type: 'letters', count: 24, speed: 0,
    intro: 'Ngón út trái đi xuống phím dét, ngón áp út trái đi xuống phím ích xì, ngón áp út phải đi xuống phím dấu chấm. Vậy là bé biết hết bảng chữ cái rồi!' },
  { id: '4-5', world: 3, title: 'Những bạn đáng yêu', newKeys: '', type: 'words', count: 14, speed: 0,
    intro: 'Cùng gõ tên những con vật và đồ vật đáng yêu nào!' },
  { id: '4-6', world: 3, title: 'Câu tiếng Việt', newKeys: '', type: 'sentences', phrases: 'vi', count: 5, speed: 0,
    intro: 'Bây giờ bé gõ những câu tiếng Việt không dấu nhé. Nhớ dùng ngón cái để gõ phím cách.' },

  // Thế giới 5 – Câu & tốc độ
  { id: '5-1', world: 4, title: 'Câu tiếng Anh', newKeys: '', type: 'sentences', phrases: 'en', count: 5, speed: 0,
    intro: 'Chào mừng đến Vương Quốc Mây! Mình cùng gõ những câu tiếng Anh ngắn nhé.' },
  { id: '5-2', world: 4, title: 'Chạy trên mây', newKeys: '', type: 'words', count: 16, speed: 110,
    intro: 'Bạn nhỏ sẽ chạy trên những đám mây. Gõ thật đều tay nhé!' },
  { id: '5-3', world: 4, title: 'Cuộc đua cầu vồng', newKeys: '', type: 'sentences', phrases: 'all', count: 6, speed: 115,
    intro: 'Thử thách cuối cùng! Hoàn thành cuộc đua cầu vồng để trở thành Công chúa Gõ phím nhé!' }
];

// Mỗi màn biết những phím nào (cộng dồn các phím mới từ đầu)
(function () {
  let known = '';
  for (const L of LEVELS) {
    for (const c of L.newKeys) if (!known.includes(c)) known += c;
    L.known = known;
  }
})();

// ---- Kho từ (tự lọc theo các phím bé đã học) ----
const WORD_BANK = (
  'ga da la ha sa dad lad had add all fall hall glass flash salad ask gas sad lass flask dash gala shall ' +
  'hoa tre que keo ghe ke di ao toi yeu roi the tea sea pet top hop her yes red rose tree free fairy pretty ' +
  'sugar heart pearl kitty dolly party star hello sweet happy puppy lily dress girl doll teddy tulip purple ' +
  'yellow white water sister kite pie tiara ruby jelly quiet ' +
  'meo tho ban be bup me bo con ca nha mua vay hong chim cat moon pink love bunny candy rainbow unicorn ' +
  'princess magic music cake dance blue mom baby cream ice queen crown smile ballet bow panda zebra violin ' +
  'snow cozy bambi lemon mango'
).split(' ');

const PHRASES = {
  home: ['ha ha ha', 'la la la', 'a lad has a glass', 'dad has a salad', 'dad asks a lass',
         'add a flask', 'a sad lad', 'all fall', 'glad dad'],
  vi: ['me yeu con', 'con yeu me', 'hoa hong mau do', 'meo con ngu ngon', 'bup be xinh xan',
       'be di hoc vui ve', 'ky lan cau vong', 'tho con an ca rot', 'chim hot lieu lo',
       'cong chua di dao', 'nha em co meo', 'em yeu ba me'],
  en: ['i love my cat.', 'the sky is blue.', 'pink is pretty.', 'my doll is cute.', 'i can dance.',
       'a magic unicorn.', 'stars shine at night.', 'be kind to friends.', 'i like ice cream.',
       'my bunny can hop.']
};
PHRASES.all = PHRASES.vi.concat(PHRASES.en);

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const onlyKnown = (s, known) => [...s].every(c => known.includes(c));

// Sinh nội dung cần gõ cho một màn: trả về mảng chuỗi, mỗi chuỗi là một chướng ngại vật
function buildTexts(level) {
  const known = level.known;
  const letters = [...known].filter(c => c !== ' ');
  const fresh = [...level.newKeys].filter(c => c !== ' ');
  const out = [];
  if (level.type === 'letters') {
    let prev = '';
    for (let i = 0; i < level.count; i++) {
      let c, tries = 0;
      do {
        c = fresh.length && Math.random() < 0.6 ? pick(fresh) : pick(letters);
      } while (c === prev && tries++ < 3);
      out.push(c); prev = c;
    }
  } else if (level.type === 'chunks') {
    for (let i = 0; i < level.count; i++) {
      const n = 2 + Math.floor(Math.random() * 2);
      let s = '';
      for (let j = 0; j < n; j++) s += fresh.length && Math.random() < 0.5 ? pick(fresh) : pick(letters);
      out.push(s);
    }
  } else if (level.type === 'words') {
    const bank = WORD_BANK.filter(w => onlyKnown(w, known));
    // Ưu tiên từ có chứa các phím vừa học gần đây
    let recent = '';
    for (let i = LEVELS.indexOf(level) - 1; i >= 0 && recent.length < 6; i--) recent += LEVELS[i].newKeys.trim();
    const pref = bank.filter(w => [...w].some(c => recent.includes(c)));
    let prev = '';
    for (let i = 0; i < level.count; i++) {
      let w, tries = 0;
      do { w = pref.length >= 4 && Math.random() < 0.6 ? pick(pref) : pick(bank); } while (w === prev && tries++ < 5);
      out.push(w); prev = w;
    }
  } else if (level.type === 'sentences') {
    const bank = shuffle(PHRASES[level.phrases].filter(p => onlyKnown(p, known)));
    for (const p of bank.slice(0, level.count)) {
      const words = p.split(' ');
      words.forEach((w, i) => out.push(i < words.length - 1 ? w + ' ' : w));
    }
  }
  return out;
}

// Màn "Luyện phím yếu" được tạo động từ thống kê của bé
function makePracticeLevel(weakKeys, known) {
  const keys = weakKeys.join('');
  return {
    id: 'practice', world: Math.min(4, Math.floor(known.length / 9)), practice: true,
    title: 'Luyện phím yếu: ' + weakKeys.map(keyLabel).join(' '), newKeys: keys, known,
    type: 'letters', count: 24, speed: 0,
    intro: 'Màn luyện tập đặc biệt! Mình sẽ cùng ôn những phím bé hay gõ nhầm: ' +
           weakKeys.map(k => KEY_NAMES[k] || k).join(', ') + '. Gõ chậm mà chắc nhé.'
  };
}

// ---- Tủ đồ ----
const SHOP = {
  dress: { label: 'Váy', items: [
    { id: 'pink',    name: 'Váy hồng',     color: '#ff7eb6', price: 0 },
    { id: 'lilac',   name: 'Váy tím',      color: '#b48cff', price: 20 },
    { id: 'mint',    name: 'Váy bạc hà',   color: '#4fd1ad', price: 20 },
    { id: 'sky',     name: 'Váy xanh trời', color: '#62bdff', price: 30 },
    { id: 'gold',    name: 'Váy vàng',     color: '#ffc23c', price: 60 },
    { id: 'rainbow', name: 'Váy cầu vồng', color: 'rainbow', price: 120 } ] },
  hair: { label: 'Tóc', items: [
    { id: 'brown',  name: 'Nâu',  color: '#7a4a2a', price: 0 },
    { id: 'black',  name: 'Đen',  color: '#2e2230', price: 0 },
    { id: 'blonde', name: 'Vàng', color: '#f2c35b', price: 15 },
    { id: 'pink',   name: 'Hồng', color: '#ff8fc8', price: 30 },
    { id: 'purple', name: 'Tím',  color: '#9b6bff', price: 30 },
    { id: 'blue',   name: 'Xanh', color: '#4aa3ff', price: 40 } ] },
  acc: { label: 'Phụ kiện', items: [
    { id: 'none',   name: 'Không',    icon: '✖️', price: 0 },
    { id: 'bow',    name: 'Nơ xinh',  icon: '🎀', price: 15 },
    { id: 'flower', name: 'Kẹp hoa',  icon: '🌸', price: 25 },
    { id: 'crown',  name: 'Vương miện', icon: '👑', price: 50 },
    { id: 'tiara',  name: 'Vương miện pha lê', icon: '💎', price: 90 },
    { id: 'wings',  name: 'Cánh tiên', icon: '🧚', price: 150 } ] },
  pet: { label: 'Thú cưng', items: [
    { id: 'none',    name: 'Không',    icon: '✖️', price: 0 },
    { id: 'cat',     name: 'Mèo Mướp', icon: '🐱', price: 40 },
    { id: 'bunny',   name: 'Thỏ Bông', icon: '🐰', price: 60 },
    { id: 'puppy',   name: 'Cún Con',  icon: '🐶', price: 60 },
    { id: 'unicorn', name: 'Kỳ Lân',   icon: '🦄', price: 150 } ] }
};
const shopItem = (cat, id) => SHOP[cat].items.find(i => i.id === id) || SHOP[cat].items[0];

const PRAISE = ['Giỏi quá!', 'Tuyệt vời!', 'Siêu sao!', 'Đỉnh quá!', 'Xuất sắc!', 'Hay lắm!', 'Chuẩn luôn!'];
const VOICE_PRAISE = ['{n} giỏi quá!', 'Tuyệt vời!', '{n} là siêu sao!', 'Cứ thế phát huy nhé!', 'Ngón tay {n} nhanh ghê!'];
