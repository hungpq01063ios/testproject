# 🦄 Kỳ Lân Gõ Phím – Game luyện gõ 10 ngón cho bé gái 7–10 tuổi

Game chạy trực tiếp trên trình duyệt (HTML5 + JavaScript thuần, không cần cài đặt, không cần server).
Bé điều khiển một **cô bé công chúa** chạy qua 5 vương quốc theo kiểu Mario: **gõ đúng phím → nhân vật nhảy qua chướng ngại vật / đội khối vàng lấy kim cương**.
Có **giọng nói tiếng Việt** hướng dẫn, **bàn phím ảo tô màu theo ngón**, **đôi bàn tay chỉ ngón cần dùng**, **tủ đồ** để đổi kim cương lấy váy, phụ kiện, thú cưng.

## Chạy game

```bash
# Cách 1: mở trực tiếp
open typing-game/index.html          # macOS – hoặc nhấp đúp file trên Windows

# Cách 2: chạy server tĩnh (nên dùng nếu trình duyệt chặn file://)
cd typing-game && python3 -m http.server 8080   # rồi mở http://localhost:8080
```

- Nên dùng **Chrome** hoặc **Microsoft Edge** (Edge có giọng đọc tiếng Việt “HoaiMy” rất tự nhiên).
- **Tắt Unikey/EVKey** (chuyển sang chế độ E) trong lúc chơi – game sẽ nhắc nếu phát hiện bộ gõ tiếng Việt đang bật.
- Tiến trình được lưu trong trình duyệt (localStorage), không gửi dữ liệu ra ngoài.

## Lộ trình học (từ dễ đến khó)

| Thế giới | Chủ đề | Nội dung | Cơ chế |
|---|---|---|---|
| 🌷 1. Vườn Hoa Tím | Hàng phím nhà | F J → D K → S L → A ; → ôn cụm chữ | Nhân vật **đứng chờ** bé gõ |
| 🍭 2. Lâu Đài Kẹo Ngọt | Với tay & từ đầu tiên | G H → từ (dad, salad…) → phím cách → **thử thách đầu tiên** | Chờ → **tự chạy + 3 trái tim** |
| 🐚 3. Biển Ngọc Trai | Hàng phím trên | E I → R U → T Y → W O → Q P → từ → thử thách | Chờ → tự chạy |
| 🌈 4. Rừng Cầu Vồng | Hàng phím dưới | V M → C , → B N → X Z . → từ → câu tiếng Việt không dấu | Chờ |
| ☁️ 5. Vương Quốc Mây | Câu & tốc độ | Câu tiếng Anh → chạy trên mây → **cuộc đua cầu vồng** | Tự chạy |

Tổng cộng **25 màn** + màn **“💪 Luyện phím yếu”** sinh tự động.

## Nguyên tắc sư phạm được cài vào game

1. **Chính xác trước, tốc độ sau** – phần lớn màn ở chế độ chờ (không áp lực thời gian); sao được tính theo độ chính xác (≥95% = 3⭐, ≥85% = 2⭐). Màn thử thách chỉ xuất hiện sau khi bé đã vững.
2. **Mỗi màn chỉ 2 phím mới**, trộn 60% phím mới + 40% phím đã học → ôn tập ngắt quãng (spaced repetition).
3. **Không nhìn bàn phím** – bàn phím ảo + bàn tay trên màn hình cho bé biết phím ở đâu, ngón nào; phím chưa học được làm mờ để giảm nhiễu.
4. **Gợi ý đúng lúc, không làm phiền** – giọng nói chỉ nhắc “phím F, dùng ngón trỏ trái nhé” khi bé sai 2 lần hoặc lưỡng lự > 5 giây.
5. **Khen đúng lúc** – combo 5/10/15… có lời khen, lời khen gọi đúng tên bé.
6. **Cá nhân hoá** – game lưu độ chính xác và thời gian phản hồi từng phím, tự tạo bài luyện cho những phím yếu nhất.
7. **Sức khoẻ** – hướng dẫn tư thế ngồi ở các màn đầu, nhắc nghỉ giải lao sau 10/15/20 phút (bố mẹ chỉnh được).
8. **Động lực dài hạn** – kim cương → tủ đồ (6 váy, 6 màu tóc, 6 phụ kiện, 5 thú cưng); hoàn thành 5 vương quốc nhận danh hiệu **Công chúa Gõ Phím** 👑.

## Góc bố mẹ (có khoá phép nhân để bé không tự vào)

- Thời gian luyện, số màn đã qua, tổng số sao, độ chính xác & tốc độ trung bình.
- Biểu đồ tiến bộ 15 lượt gần nhất.
- **Bản đồ nhiệt bàn phím**: xanh / vàng / đỏ theo độ chính xác từng phím, rê chuột xem chi tiết.
- Lời khuyên tự động + cài đặt: giọng nói (bật/tắt, tốc độ), nhạc, hiệu ứng, **chế độ thư giãn** (tắt chạy tự động & trái tim), thời gian nhắc nghỉ, đổi tên, xoá tiến trình.

**Khuyến nghị:** 15–20 phút/ngày, 5 ngày/tuần. Tuần đầu nên ngồi cạnh bé để chỉnh tư thế & vị trí ngón.
Mục tiêu thực tế cho bé 7–10 tuổi sau 2–3 tháng: **≥95% chính xác, 10–20 từ/phút** mà không nhìn bàn phím.

## Cấu trúc mã nguồn

```
typing-game/
├── index.html        # các màn hình: trang chủ, bản đồ, giới thiệu màn, chơi, kết quả, tủ đồ, góc bố mẹ
├── css/style.css     # giao diện pastel, bàn phím ảo, responsive
└── js/
    ├── data.js       # ngón tay ↔ phím, 5 thế giới, 25 màn, kho từ/câu, tủ đồ, sinh nội dung
    ├── audio.js      # hiệu ứng & nhạc nền tổng hợp bằng WebAudio, giọng nói Web Speech API (vi-VN)
    ├── render.js     # vẽ Canvas: phong cảnh, cô bé, thú cưng, chướng ngại vật, lâu đài
    ├── keyboard.js   # bàn phím ảo tô màu theo ngón + đôi bàn tay SVG
    ├── game.js       # engine chạy-nhảy kiểu Mario, chấm điểm, thống kê từng phím
    └── main.js       # điều hướng màn hình, lưu tiến trình, tủ đồ, góc bố mẹ
```

### Thêm màn chơi mới

Thêm một phần tử vào mảng `LEVELS` trong `js/data.js`:

```js
{ id: '5-4', world: 4, title: 'Tên màn', newKeys: '', type: 'words', count: 15, speed: 120,
  intro: 'Lời giới thiệu sẽ được đọc bằng giọng nói.' }
```

`type`: `letters` | `chunks` | `words` | `sentences` (kèm `phrases: 'vi' | 'en' | 'all'`). `speed: 0` là chế độ chờ.
Từ/câu được tự lọc theo các phím bé đã học, nên chỉ cần bổ sung vào `WORD_BANK` / `PHRASES`.

## Hướng phát triển tiếp theo (gợi ý)

- Gõ **tiếng Việt có dấu** (Telex) sau khi bé đã thạo bảng chữ cái.
- Hàng phím số & chữ hoa (Shift), sticker/huy hiệu theo chuỗi ngày luyện tập.
- Thu âm giọng nói thật (thay TTS) và nhạc nền riêng cho từng vương quốc.
- Đóng gói PWA để chơi offline, đồng bộ tiến trình nhiều thiết bị, chế độ thi đua giữa anh chị em.
