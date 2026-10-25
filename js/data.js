// Dữ liệu bàn cờ, thẻ Cơ Hội / Khí Vận — Cờ Tỷ Phú Việt Nam
// Đơn vị tiền: triệu đồng (Tr). 1.000 Tr = 1 tỷ.

export const START_MONEY = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_INDEX = 10;
export const MAX_HOUSES = 32;
export const MAX_HOTELS = 12;

export const GROUPS = {
  brown:  { name: 'Tây Bắc',          color: '#8B4A2B', house: 50 },
  sky:    { name: 'Tây Nguyên',       color: '#4FC3F7', house: 50 },
  pink:   { name: 'Miền Tây & Đảo',   color: '#E04E9A', house: 100 },
  orange: { name: 'Duyên hải Nam Trung Bộ', color: '#F57C1F', house: 100 },
  red:    { name: 'Di sản Miền Trung', color: '#E53935', house: 150 },
  yellow: { name: 'Kỳ quan thiên nhiên', color: '#FBC02D', house: 150 },
  green:  { name: 'TP. Hồ Chí Minh',  color: '#2E9E4F', house: 200 },
  navy:   { name: 'Thủ đô Hà Nội',    color: '#1E3A8A', house: 200 },
};

// art: mã cảnh minh hoạ (art.js); sound: chủ đề âm thanh (audio.js); fx: hiệu ứng hạt (board3d.js)
export const SPACES = [
  { type: 'go', name: 'Xuất Phát', short: 'XUẤT PHÁT', art: 'go', sound: 'fanfare', fx: 'confetti',
    facts: ['Mỗi lần đi qua ô Xuất Phát, Ngân hàng thưởng cho bạn 200 triệu đồng.'] },

  { type: 'property', group: 'brown', name: 'Cột cờ Lũng Cú', province: 'Hà Giang', price: 60,
    rent: [2, 10, 30, 90, 160, 250], art: 'flagtower', sound: 'highland', fx: 'petals',
    facts: [
      'Cột cờ Lũng Cú nằm trên đỉnh núi Rồng, gần điểm cực Bắc của Tổ quốc.',
      'Lá cờ trên đỉnh rộng 54 mét vuông, tượng trưng cho 54 dân tộc anh em Việt Nam.',
      'Du khách phải leo gần 400 bậc đá để lên tới chân cột cờ.',
    ],
    quiz: { q: 'Lá cờ trên đỉnh Cột cờ Lũng Cú có diện tích bao nhiêu mét vuông?', a: ['54 m²', '63 m²', '100 m²'], c: 0 } },

  { type: 'chest', name: 'Khí Vận', short: 'KHÍ VẬN', art: 'chest', sound: 'card', fx: 'sparkle' },

  { type: 'property', group: 'brown', name: 'Ruộng bậc thang Mù Cang Chải', province: 'Yên Bái', price: 60,
    rent: [4, 20, 60, 180, 320, 450], art: 'terraces', sound: 'highland', fx: 'petals',
    facts: [
      'Ruộng bậc thang Mù Cang Chải do đồng bào H\'Mông khai phá qua hàng trăm năm.',
      'Mùa lúa chín vàng rực rỡ thường rơi vào tháng 9 đến tháng 10 hằng năm.',
      'Năm 2007, khu ruộng bậc thang được xếp hạng Di tích quốc gia.',
    ],
    quiz: { q: 'Mùa lúa chín đẹp nhất ở Mù Cang Chải thường vào thời gian nào?', a: ['Tháng 2 – 3', 'Tháng 9 – 10', 'Tháng 12 – 1'], c: 1 } },

  { type: 'tax', name: 'Thuế Thu Nhập', short: 'THUẾ THU NHẬP', amount: 200, art: 'tax', sound: 'tax', fx: 'smoke',
    facts: ['Nộp thuế là nghĩa vụ của mọi công dân. Bạn đóng 200 triệu đồng.'] },

  { type: 'rail', name: 'Ga Hà Nội', province: 'Hà Nội', price: 200, art: 'train', sound: 'train', fx: 'smoke',
    facts: [
      'Ga Hà Nội được người Pháp xây dựng năm 1902, ngày trước gọi là ga Hàng Cỏ.',
      'Đây là điểm đầu của tuyến đường sắt Thống Nhất dài khoảng 1.726 km vào tới Sài Gòn.',
    ],
    quiz: { q: 'Tuyến đường sắt Bắc – Nam dài khoảng bao nhiêu km?', a: ['Khoảng 900 km', 'Khoảng 1.726 km', 'Khoảng 2.500 km'], c: 1 } },

  { type: 'property', group: 'sky', name: 'Hồ Xuân Hương', province: 'Đà Lạt, Lâm Đồng', price: 100,
    rent: [6, 30, 90, 270, 400, 550], art: 'pinelake', sound: 'highland', fx: 'petals',
    facts: [
      'Hồ Xuân Hương là trái tim của thành phố ngàn hoa Đà Lạt, được hình thành năm 1919.',
      'Đà Lạt nằm ở độ cao khoảng 1.500 mét, khí hậu mát mẻ quanh năm.',
      'Hoa dã quỳ và mai anh đào là biểu tượng mùa đông – xuân của Đà Lạt.',
    ],
    quiz: { q: 'Thành phố Đà Lạt nằm ở độ cao khoảng bao nhiêu?', a: ['500 m', '1.500 m', '3.000 m'], c: 1 } },

  { type: 'chance', name: 'Cơ Hội', short: 'CƠ HỘI', art: 'chance', sound: 'card', fx: 'sparkle' },

  { type: 'property', group: 'sky', name: 'Thác Dray Nur', province: 'Đắk Lắk', price: 100,
    rent: [6, 30, 90, 270, 400, 550], art: 'waterfall', sound: 'waterfall', fx: 'splash',
    facts: [
      'Thác Dray Nur nằm trên dòng sông Sêrêpốk, cao khoảng 30 mét và rộng hơn 250 mét.',
      'Theo truyền thuyết của người Ê Đê, Dray Nur là "thác Vợ", còn Dray Sáp là "thác Chồng".',
      'Tây Nguyên cũng là thủ phủ cà phê của Việt Nam, với Buôn Ma Thuột là trung tâm.',
    ],
    quiz: { q: 'Theo truyền thuyết Ê Đê, thác Dray Nur được gọi là gì?', a: ['Thác Chồng', 'Thác Vợ', 'Thác Con'], c: 1 } },

  { type: 'property', group: 'sky', name: 'Biển Hồ Pleiku', province: 'Gia Lai', price: 120,
    rent: [8, 40, 100, 300, 450, 600], art: 'craterlake', sound: 'lake', fx: 'splash',
    facts: [
      'Biển Hồ (hồ T\'Nưng) là miệng núi lửa đã tắt từ hàng triệu năm trước.',
      'Người dân Pleiku gọi hồ là "đôi mắt Pleiku" vì làn nước xanh trong và tĩnh lặng.',
      'Hồ cung cấp nước sinh hoạt cho cả thành phố Pleiku.',
    ],
    quiz: { q: 'Biển Hồ Pleiku được hình thành từ đâu?', a: ['Miệng núi lửa cổ', 'Sông bị chặn dòng', 'Do con người đào'], c: 0 } },

  { type: 'jail', name: 'Nhà Tạm Giữ', short: 'NHÀ TẠM GIỮ', art: 'jail', sound: 'jail', fx: 'smoke',
    facts: ['Nếu chỉ đi ngang qua, bạn đang thăm nuôi — không sao cả!'] },

  { type: 'property', group: 'pink', name: 'Chợ nổi Cái Răng', province: 'Cần Thơ', price: 140,
    rent: [10, 50, 150, 450, 625, 750], art: 'floatmarket', sound: 'river', fx: 'splash',
    facts: [
      'Chợ nổi Cái Răng họp từ tờ mờ sáng trên sông Cần Thơ, đông nhất vào khoảng 5 – 7 giờ.',
      'Mỗi ghe treo "cây bẹo" — một cây sào treo hàng hoá để khách nhìn từ xa biết ghe bán gì.',
      'Năm 2016, chợ nổi Cái Răng được công nhận là Di sản văn hoá phi vật thể quốc gia.',
    ],
    quiz: { q: 'Ở chợ nổi, "cây bẹo" dùng để làm gì?', a: ['Chèo thuyền', 'Treo hàng để quảng cáo', 'Neo ghe'], c: 1 } },

  { type: 'utility', name: 'Thủy điện Hòa Bình', province: 'Hòa Bình', price: 150, art: 'dam', sound: 'electric', fx: 'sparkle',
    facts: [
      'Nhà máy Thủy điện Hòa Bình trên sông Đà khánh thành năm 1994, từng lớn nhất Đông Nam Á.',
      'Công trình có sự hợp tác của Liên Xô, công suất 1.920 MW.',
    ],
    quiz: { q: 'Thủy điện Hòa Bình được xây dựng trên con sông nào?', a: ['Sông Hồng', 'Sông Đà', 'Sông Mã'], c: 1 } },

  { type: 'property', group: 'pink', name: 'Mũi Cà Mau', province: 'Cà Mau', price: 140,
    rent: [10, 50, 150, 450, 625, 750], art: 'cape', sound: 'sea', fx: 'splash',
    facts: [
      'Mũi Cà Mau là điểm cực Nam trên đất liền của Việt Nam, nơi có cột mốc tọa độ GPS 0001.',
      'Đây là nơi duy nhất trên đất liền nước ta có thể ngắm mặt trời mọc trên biển Đông và lặn trên biển Tây.',
      'Rừng ngập mặn Mũi Cà Mau là khu dự trữ sinh quyển thế giới.',
    ],
    quiz: { q: 'Ở Mũi Cà Mau có thể ngắm mặt trời lặn trên vùng biển nào?', a: ['Biển Đông', 'Biển Tây (vịnh Thái Lan)', 'Biển Hồ'], c: 1 } },

  { type: 'property', group: 'pink', name: 'Đảo Phú Quốc', province: 'Kiên Giang', price: 160,
    rent: [12, 60, 180, 500, 700, 900], art: 'island', sound: 'sea', fx: 'splash',
    facts: [
      'Phú Quốc là hòn đảo lớn nhất Việt Nam, được mệnh danh là "Đảo Ngọc".',
      'Nước mắm Phú Quốc và hồ tiêu là những đặc sản nổi tiếng.',
      'Bãi Sao với cát trắng mịn được bình chọn trong top bãi biển đẹp của châu Á.',
    ],
    quiz: { q: 'Phú Quốc thường được mệnh danh là gì?', a: ['Đảo Ngọc', 'Đảo Vàng', 'Đảo Ngà'], c: 0 } },

  { type: 'rail', name: 'Sân bay Đà Nẵng', province: 'Đà Nẵng', price: 200, art: 'plane', sound: 'plane', fx: 'sparkle',
    facts: [
      'Sân bay quốc tế Đà Nẵng là cửa ngõ hàng không lớn thứ ba của Việt Nam.',
      'Nhà ga quốc tế T2 nổi bật với thiết kế mô phỏng những con sóng biển.',
    ],
    quiz: { q: 'Sân bay Đà Nẵng là cửa ngõ hàng không lớn thứ mấy cả nước?', a: ['Thứ nhất', 'Thứ hai', 'Thứ ba'], c: 2 } },

  { type: 'property', group: 'orange', name: 'Vịnh Nha Trang', province: 'Khánh Hòa', price: 180,
    rent: [14, 70, 200, 550, 750, 950], art: 'baycity', sound: 'sea', fx: 'splash',
    facts: [
      'Vịnh Nha Trang là thành viên của Câu lạc bộ những vịnh đẹp nhất thế giới.',
      'Tháp Bà Ponagar ở Nha Trang là quần thể kiến trúc Chăm Pa được xây từ thế kỷ VIII.',
      'Vịnh có 19 hòn đảo lớn nhỏ như Hòn Mun, Hòn Tằm, Hòn Tre.',
    ],
    quiz: { q: 'Tháp Bà Ponagar ở Nha Trang thuộc nền văn hoá nào?', a: ['Óc Eo', 'Chăm Pa', 'Đông Sơn'], c: 1 } },

  { type: 'chest', name: 'Khí Vận', short: 'KHÍ VẬN', art: 'chest', sound: 'card', fx: 'sparkle' },

  { type: 'property', group: 'orange', name: 'Cầu Rồng', province: 'Đà Nẵng', price: 180,
    rent: [14, 70, 200, 550, 750, 950], art: 'dragonbridge', sound: 'dragon', fx: 'fire',
    facts: [
      'Cầu Rồng bắc qua sông Hàn, dài 666 mét, khánh thành năm 2013.',
      'Vào tối thứ Bảy và Chủ nhật, đầu rồng phun lửa và phun nước lúc 21 giờ.',
      'Rồng được thiết kế theo phong cách rồng thời Lý, vươn mình ra biển Đông.',
    ],
    quiz: { q: 'Cầu Rồng Đà Nẵng phun lửa vào thời điểm nào?', a: ['Mỗi sáng', '21h tối cuối tuần', 'Chỉ dịp Tết'], c: 1 } },

  { type: 'property', group: 'orange', name: 'Cầu Vàng Bà Nà', province: 'Đà Nẵng', price: 200,
    rent: [16, 80, 220, 600, 800, 1000], art: 'goldenbridge', sound: 'highland', fx: 'sparkle',
    facts: [
      'Cầu Vàng nằm ở độ cao khoảng 1.400 mét trên núi Bà Nà, mở cửa năm 2018.',
      'Cây cầu dài 150 mét, được nâng đỡ bởi đôi bàn tay đá khổng lồ.',
      'Cầu Vàng từng được báo chí quốc tế bình chọn là một trong những cây cầu ấn tượng nhất thế giới.',
    ],
    quiz: { q: 'Cầu Vàng được nâng đỡ bởi hình tượng gì?', a: ['Đôi cánh chim', 'Đôi bàn tay khổng lồ', 'Hai con rồng'], c: 1 } },

  { type: 'parking', name: 'Bãi Đỗ Xe', short: 'BÃI ĐỖ XE MIỄN PHÍ', art: 'parking', sound: 'rest', fx: 'petals',
    facts: ['Nghỉ chân một chút, thưởng thức ly cà phê sữa đá nhé!'] },

  { type: 'property', group: 'red', name: 'Phố cổ Hội An', province: 'Quảng Nam', price: 220,
    rent: [18, 90, 250, 700, 875, 1050], art: 'lanterns', sound: 'oldtown', fx: 'lanterns',
    facts: [
      'Phố cổ Hội An được UNESCO công nhận là Di sản văn hoá thế giới năm 1999.',
      'Chùa Cầu (Lai Viễn Kiều) do thương nhân Nhật Bản xây dựng vào thế kỷ XVII, in trên tờ tiền 20.000 đồng.',
      'Đêm rằm hằng tháng, phố cổ tắt đèn điện, chỉ thắp đèn lồng và thả hoa đăng trên sông Hoài.',
    ],
    quiz: { q: 'Chùa Cầu Hội An xuất hiện trên tờ tiền mệnh giá nào?', a: ['10.000 đồng', '20.000 đồng', '50.000 đồng'], c: 1 } },

  { type: 'chance', name: 'Cơ Hội', short: 'CƠ HỘI', art: 'chance', sound: 'card', fx: 'sparkle' },

  { type: 'property', group: 'red', name: 'Kinh thành Huế', province: 'Thừa Thiên Huế', price: 220,
    rent: [18, 90, 250, 700, 875, 1050], art: 'citadel', sound: 'royal', fx: 'lanterns',
    facts: [
      'Kinh thành Huế là kinh đô của triều Nguyễn — triều đại phong kiến cuối cùng của Việt Nam (1802 – 1945).',
      'Quần thể di tích Cố đô Huế là di sản văn hoá thế giới đầu tiên của Việt Nam (1993).',
      'Nhã nhạc cung đình Huế được UNESCO ghi danh là di sản phi vật thể của nhân loại.',
    ],
    quiz: { q: 'Huế là kinh đô của triều đại nào?', a: ['Nhà Lý', 'Nhà Trần', 'Nhà Nguyễn'], c: 2 } },

  { type: 'property', group: 'red', name: 'Thánh địa Mỹ Sơn', province: 'Quảng Nam', price: 240,
    rent: [20, 100, 300, 750, 925, 1100], art: 'myson', sound: 'temple', fx: 'smoke',
    facts: [
      'Mỹ Sơn là quần thể đền tháp Chăm Pa được xây dựng từ thế kỷ IV đến thế kỷ XIII.',
      'Người Chăm xây tháp bằng gạch nung kết dính đến nay các nhà khoa học vẫn chưa giải mã hết.',
      'Thánh địa Mỹ Sơn được UNESCO công nhận là di sản văn hoá thế giới năm 1999.',
    ],
    quiz: { q: 'Thánh địa Mỹ Sơn là di sản của nền văn hoá nào?', a: ['Chăm Pa', 'Phù Nam', 'Khmer'], c: 0 } },

  { type: 'rail', name: 'Cảng Hải Phòng', province: 'Hải Phòng', price: 200, art: 'ship', sound: 'ship', fx: 'splash',
    facts: [
      'Cảng Hải Phòng là cảng biển lớn nhất miền Bắc, hình thành từ năm 1876.',
      'Hải Phòng còn được gọi là "thành phố Hoa Phượng Đỏ".',
    ],
    quiz: { q: 'Hải Phòng được mệnh danh là thành phố hoa gì?', a: ['Hoa Sữa', 'Hoa Phượng Đỏ', 'Hoa Ban'], c: 1 } },

  { type: 'property', group: 'yellow', name: 'Vịnh Hạ Long', province: 'Quảng Ninh', price: 260,
    rent: [22, 110, 330, 800, 975, 1150], art: 'halong', sound: 'bay', fx: 'splash',
    facts: [
      'Vịnh Hạ Long có gần 2.000 hòn đảo đá vôi lớn nhỏ, phần lớn chưa có người ở.',
      'Vịnh Hạ Long hai lần được UNESCO công nhận là Di sản thiên nhiên thế giới (1994 và 2000).',
      'Tên "Hạ Long" có nghĩa là "nơi rồng đáp xuống" theo truyền thuyết rồng mẹ dẫn rồng con xuống giúp dân đánh giặc.',
    ],
    quiz: { q: 'Tên gọi "Hạ Long" có nghĩa là gì?', a: ['Rồng bay lên', 'Nơi rồng đáp xuống', 'Rồng uống nước'], c: 1 } },

  { type: 'property', group: 'yellow', name: 'Phong Nha – Kẻ Bàng', province: 'Quảng Bình', price: 260,
    rent: [22, 110, 330, 800, 975, 1150], art: 'cave', sound: 'cave', fx: 'sparkle',
    facts: [
      'Vườn quốc gia Phong Nha – Kẻ Bàng là di sản thiên nhiên thế giới với hàng trăm hang động.',
      'Hang Sơn Đoòng ở đây là hang động tự nhiên lớn nhất thế giới, được khám phá kỹ năm 2009.',
      'Bên trong Sơn Đoòng có cả rừng nguyên sinh và dòng sông ngầm.',
    ],
    quiz: { q: 'Hang động tự nhiên lớn nhất thế giới ở Quảng Bình tên là gì?', a: ['Hang Én', 'Hang Sơn Đoòng', 'Động Thiên Đường'], c: 1 } },

  { type: 'utility', name: 'Điện gió Bạc Liêu', province: 'Bạc Liêu', price: 150, art: 'wind', sound: 'electric', fx: 'sparkle',
    facts: [
      'Cánh đồng điện gió Bạc Liêu là dự án điện gió ven biển lớn đầu tiên của Việt Nam.',
      'Hàng chục tua-bin khổng lồ đứng giữa vùng bãi bồi, tạo nên khung cảnh như "trời Âu".',
    ],
    quiz: { q: 'Điện gió Bạc Liêu sử dụng nguồn năng lượng nào?', a: ['Mặt trời', 'Gió', 'Thủy triều'], c: 1 } },

  { type: 'property', group: 'yellow', name: 'Tràng An', province: 'Ninh Bình', price: 280,
    rent: [24, 120, 360, 850, 1025, 1200], art: 'trangan', sound: 'river', fx: 'petals',
    facts: [
      'Quần thể danh thắng Tràng An là di sản hỗn hợp (văn hoá và thiên nhiên) đầu tiên của Đông Nam Á.',
      'Du khách ngồi thuyền xuyên qua những hang động đá vôi và cánh đồng lúa.',
      'Ninh Bình từng là kinh đô Hoa Lư của nhà Đinh và nhà Tiền Lê thế kỷ X.',
    ],
    quiz: { q: 'Kinh đô Hoa Lư ở Ninh Bình gắn với triều đại nào?', a: ['Nhà Đinh', 'Nhà Lý', 'Nhà Hồ'], c: 0 } },

  { type: 'gotojail', name: 'Vào Tù', short: 'VÀO TÙ', art: 'gotojail', sound: 'siren', fx: 'smoke',
    facts: ['Vi phạm luật! Bạn bị đưa thẳng vào Nhà Tạm Giữ, không đi qua Xuất Phát.'] },

  { type: 'property', group: 'green', name: 'Nhà thờ Đức Bà', province: 'TP. Hồ Chí Minh', price: 300,
    rent: [26, 130, 390, 900, 1100, 1275], art: 'cathedral', sound: 'church', fx: 'sparkle',
    facts: [
      'Nhà thờ Đức Bà Sài Gòn được xây dựng từ năm 1863 đến 1880.',
      'Toàn bộ gạch đỏ xây nhà thờ được chở từ Marseille (Pháp) sang và không cần tô trát.',
      'Hai tháp chuông cao khoảng 58 mét, có 6 quả chuông đồng.',
    ],
    quiz: { q: 'Gạch xây Nhà thờ Đức Bà được đưa từ đâu sang?', a: ['Marseille, Pháp', 'Bát Tràng, Hà Nội', 'Nhật Bản'], c: 0 } },

  { type: 'property', group: 'green', name: 'Chợ Bến Thành', province: 'TP. Hồ Chí Minh', price: 300,
    rent: [26, 130, 390, 900, 1100, 1275], art: 'market', sound: 'market', fx: 'coins',
    facts: [
      'Chợ Bến Thành ở vị trí hiện nay được khánh thành năm 1914.',
      'Tháp đồng hồ ở cửa Nam là biểu tượng không chính thức của Sài Gòn.',
      'Chợ có hơn 1.500 sạp hàng: từ vải vóc, đồ lưu niệm đến ẩm thực đường phố.',
    ],
    quiz: { q: 'Biểu tượng nổi bật của Chợ Bến Thành là gì?', a: ['Tháp đồng hồ', 'Cổng trời', 'Tượng ngựa'], c: 0 } },

  { type: 'chest', name: 'Khí Vận', short: 'KHÍ VẬN', art: 'chest', sound: 'card', fx: 'sparkle' },

  { type: 'property', group: 'green', name: 'Landmark 81', province: 'TP. Hồ Chí Minh', price: 320,
    rent: [28, 150, 450, 1000, 1200, 1400], art: 'skyscraper', sound: 'city', fx: 'fireworks',
    facts: [
      'Landmark 81 cao 461,2 mét với 81 tầng, là toà nhà cao nhất Việt Nam.',
      'Thiết kế lấy cảm hứng từ hình ảnh bó tre — biểu tượng của sự đoàn kết.',
      'Đài quan sát Skyview ở những tầng trên cùng cho tầm nhìn bao quát cả thành phố.',
    ],
    quiz: { q: 'Thiết kế của Landmark 81 lấy cảm hứng từ hình ảnh nào?', a: ['Bó tre', 'Cây dừa', 'Hoa sen'], c: 0 } },

  { type: 'rail', name: 'Sân bay Tân Sơn Nhất', province: 'TP. Hồ Chí Minh', price: 200, art: 'plane', sound: 'plane', fx: 'sparkle',
    facts: [
      'Tân Sơn Nhất là sân bay có lượng hành khách lớn nhất Việt Nam.',
      'Nhà ga T3 mới giúp nâng công suất phục vụ thêm hàng chục triệu khách mỗi năm.',
    ],
    quiz: { q: 'Sân bay có lượng khách lớn nhất Việt Nam là?', a: ['Nội Bài', 'Tân Sơn Nhất', 'Đà Nẵng'], c: 1 } },

  { type: 'chance', name: 'Cơ Hội', short: 'CƠ HỘI', art: 'chance', sound: 'card', fx: 'sparkle' },

  { type: 'property', group: 'navy', name: 'Văn Miếu – Quốc Tử Giám', province: 'Hà Nội', price: 350,
    rent: [35, 175, 500, 1100, 1300, 1500], art: 'vanmieu', sound: 'temple', fx: 'lanterns',
    facts: [
      'Văn Miếu được xây năm 1070 dưới thời vua Lý Thánh Tông; Quốc Tử Giám năm 1076 là trường đại học đầu tiên của Việt Nam.',
      '82 bia Tiến sĩ đặt trên lưng rùa đá được UNESCO ghi danh là Di sản tư liệu thế giới.',
      'Khuê Văn Các — biểu tượng của Thủ đô Hà Nội — nằm trong khuôn viên Văn Miếu.',
    ],
    quiz: { q: 'Trường đại học đầu tiên của Việt Nam là?', a: ['Quốc Tử Giám', 'Đại học Đông Dương', 'Trường Bưởi'], c: 0 } },

  { type: 'tax', name: 'Thuế Xa Xỉ', short: 'THUẾ XA XỈ', amount: 100, art: 'tax', sound: 'tax', fx: 'smoke',
    facts: ['Sống sang thì đóng thuế! Bạn nộp 100 triệu đồng thuế xa xỉ.'] },

  { type: 'property', group: 'navy', name: 'Hồ Hoàn Kiếm', province: 'Hà Nội', price: 400,
    rent: [50, 200, 600, 1400, 1700, 2000], art: 'turtletower', sound: 'lake', fx: 'fireworks',
    facts: [
      'Hồ Hoàn Kiếm gắn với truyền thuyết vua Lê Lợi trả gươm thần cho Rùa Vàng.',
      'Tháp Rùa giữa hồ được xây dựng vào cuối thế kỷ XIX.',
      'Cầu Thê Húc sơn đỏ dẫn vào đền Ngọc Sơn — hình ảnh biểu tượng của Hà Nội ngàn năm văn hiến.',
    ],
    quiz: { q: 'Theo truyền thuyết, vua Lê Lợi trả gươm cho con vật nào ở Hồ Gươm?', a: ['Rồng Vàng', 'Rùa Vàng', 'Cá Chép'], c: 1 } },
];

// Thẻ CƠ HỘI
export const CHANCE_CARDS = [
  { text: 'Lễ hội pháo hoa! Tiến thẳng đến ô Xuất Phát và nhận 200 Tr.', action: 'moveTo', to: 0 },
  { text: 'Dạo bước quanh Hồ Gươm cuối tuần. Đi đến Hồ Hoàn Kiếm.', action: 'moveTo', to: 39 },
  { text: 'Tham dự Festival Huế. Đi đến Kinh thành Huế. Nếu qua Xuất Phát, nhận 200 Tr.', action: 'moveTo', to: 23 },
  { text: 'Đi chợ nổi từ sáng sớm. Đi đến Chợ nổi Cái Răng. Nếu qua Xuất Phát, nhận 200 Tr.', action: 'moveTo', to: 11 },
  { text: 'Lên tàu Thống Nhất! Đi đến Ga Hà Nội. Nếu qua Xuất Phát, nhận 200 Tr.', action: 'moveTo', to: 5 },
  { text: 'Đi đến nhà ga / sân bay / cảng gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.', action: 'nearestRail' },
  { text: 'Đi đến nhà ga / sân bay / cảng gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.', action: 'nearestRail' },
  { text: 'Đi đến nhà máy năng lượng gần nhất. Nếu đã có chủ, trả 10 lần số xúc xắc.', action: 'nearestUtility' },
  { text: 'Ngân hàng trả cổ tức cho bạn 50 Tr.', action: 'money', amount: 50 },
  { text: 'THẺ ÂN XÁ — Được ra tù miễn phí. Giữ thẻ này đến khi dùng.', action: 'jailCard' },
  { text: 'Quên ví ở quán phở! Lùi lại 3 bước.', action: 'back', steps: 3 },
  { text: 'Vượt đèn đỏ! Vào thẳng Nhà Tạm Giữ, không đi qua Xuất Phát.', action: 'jail' },
  { text: 'Tu sửa nhà cửa đón Tết: trả 25 Tr mỗi nhà và 100 Tr mỗi khách sạn.', action: 'repairs', house: 25, hotel: 100 },
  { text: 'Không đội mũ bảo hiểm khi đi xe máy. Phạt 15 Tr.', action: 'money', amount: -15 },
  { text: 'Bạn được bầu làm Trưởng đoàn du lịch. Trả mỗi người chơi 50 Tr.', action: 'payEach', amount: 50 },
  { text: 'Khoản đầu tư khởi nghiệp sinh lời! Nhận 150 Tr.', action: 'money', amount: 150 },
];

// Thẻ KHÍ VẬN
export const CHEST_CARDS = [
  { text: 'Tiến thẳng đến ô Xuất Phát và nhận 200 Tr.', action: 'moveTo', to: 0 },
  { text: 'Ngân hàng nhầm lẫn có lợi cho bạn. Nhận 200 Tr.', action: 'money', amount: 200 },
  { text: 'Khám sức khoẻ định kỳ. Trả 50 Tr.', action: 'money', amount: -50 },
  { text: 'Bán cổ phiếu được giá. Nhận 50 Tr.', action: 'money', amount: 50 },
  { text: 'THẺ ÂN XÁ — Được ra tù miễn phí. Giữ thẻ này đến khi dùng.', action: 'jailCard' },
  { text: 'Bị phát hiện trốn thuế! Vào thẳng Nhà Tạm Giữ.', action: 'jail' },
  { text: 'Chúc mừng năm mới! Mỗi người chơi lì xì Tết cho bạn 50 Tr.', action: 'collectEach', amount: 50 },
  { text: 'Quỹ du lịch đáo hạn. Nhận 100 Tr.', action: 'money', amount: 100 },
  { text: 'Hoàn thuế thu nhập cá nhân. Nhận 20 Tr.', action: 'money', amount: 20 },
  { text: 'Hôm nay là sinh nhật bạn! Mỗi người chơi tặng bạn 10 Tr.', action: 'collectEach', amount: 10 },
  { text: 'Bảo hiểm nhân thọ đáo hạn. Nhận 100 Tr.', action: 'money', amount: 100 },
  { text: 'Đóng học phí khoá học tiếng Anh. Trả 50 Tr.', action: 'money', amount: -50 },
  { text: 'Viện phí sau chuyến leo Fansipan. Trả 100 Tr.', action: 'money', amount: -100 },
  { text: 'Nhận phí tư vấn du lịch. Nhận 25 Tr.', action: 'money', amount: 25 },
  { text: 'Đóng góp sửa đường làng: 40 Tr mỗi nhà, 115 Tr mỗi khách sạn.', action: 'repairs', house: 40, hotel: 115 },
  { text: 'Giải nhì cuộc thi Ảnh đẹp Du lịch Việt Nam. Nhận 10 Tr.', action: 'money', amount: 10 },
  { text: 'Được thừa kế mảnh vườn ở quê. Nhận 100 Tr.', action: 'money', amount: 100 },
];

export const TOKENS = [
  { id: 'nonla',   name: 'Nón lá' },
  { id: 'trongdong', name: 'Trống đồng' },
  { id: 'hoasen',  name: 'Hoa sen' },
  { id: 'denlong', name: 'Đèn lồng' },
  { id: 'thuyen',  name: 'Thuyền buồm' },
  { id: 'caphe',   name: 'Cà phê phin' },
];

export const PLAYER_COLORS = ['#E53935', '#1E88E5', '#43A047', '#FDD835', '#8E24AA', '#FB8C00'];

export function fmt(n) {
  const neg = n < 0; n = Math.abs(n);
  let s;
  if (n >= 1000) s = (n / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) + ' tỷ';
  else s = n + ' Tr';
  return (neg ? '-' : '') + s;
}

// Cách đọc cho giọng nói
export function say$(n) {
  n = Math.abs(n);
  if (n >= 1000) return (n / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) + ' tỷ đồng';
  return n + ' triệu đồng';
}
