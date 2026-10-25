# 🎲 Cờ Tỷ Phú Việt Nam (3D)

Cờ Tỷ Phú (Monopoly) phiên bản Việt Nam, chơi trên trình duyệt với đồ hoạ 3D.

- **Ngân hàng là máy và biết nói tiếng Việt.** Lời thoại luôn gọi tên người chơi: "Đến lượt Hưng…", "Hưng ơi, Hội An thuộc về Lan. Bạn cần trả 90 triệu đồng tiền thuê."
- **28 địa danh nổi tiếng** chia theo vùng miền: Tây Bắc, Tây Nguyên, Miền Tây & Đảo, Duyên hải, Di sản Miền Trung, Kỳ quan thiên nhiên, TP.HCM, Hà Nội. Thêm 4 bến giao thông và 2 nhà máy năng lượng.
- **Mỗi địa danh có tranh minh hoạ, âm thanh và hiệu ứng riêng.** Đèn lồng bay ở Hội An, rồng phun lửa và pháo hoa ở Cầu Rồng, sóng nước ở Hạ Long, chuông chùa ở Văn Miếu, cánh hoa ở Đà Lạt…
- **Học địa lý khi chơi:**
  - Mỗi địa danh có bưu thiếp "Bạn có biết?" với 3 thông tin thú vị.
  - Lần đầu ghé thăm sẽ được đóng dấu vào **Hộ chiếu du lịch**.
  - Mỗi địa danh có một **câu đố**, trả lời đúng được thưởng 20 Tr.
  - Giữa bàn cờ là bản đồ Việt Nam, có ghim vị trí từng địa danh, quần đảo Hoàng Sa và Trường Sa.
- **Đồ hoạ 3D** (Three.js):
  - Bàn cờ sơn mài viền vàng, xúc xắc bo tròn kiểu Á Đông (mặt 1 và 4 màu đỏ).
  - 6 quân cờ mang nét Việt: Nón lá, Trống đồng, Hoa sen, Đèn lồng, Thuyền buồm, Cà phê phin.
  - Nhà phố và khách sạn mái vàng, mô hình Landmark 81, Cầu Rồng và Vịnh Hạ Long thu nhỏ.
  - Hiệu ứng bloom và đổ bóng.

## Chạy game

Game là trang web tĩnh, không cần build. Chỉ cần một web server tĩnh, vì ES module không chạy được khi mở file trực tiếp.

```bash
npm start            # = python3 -m http.server 8080
# mở http://localhost:8080
```

Three.js đã được đặt sẵn trong `vendor/three` nên game chạy được không cần mạng. Riêng font Be Vietnam Pro tải từ Google Fonts; không có mạng thì game dùng font hệ thống.

**Giọng nói:** game dùng Web Speech API của trình duyệt.
- Giọng tự nhiên nhất: **Microsoft Edge**, giọng *HoaiMy* hoặc *NamMinh Online (Natural)*.
- **Chrome trên Android** cũng có giọng tiếng Việt.
- Nếu máy không có giọng tiếng Việt, lời Ngân hàng vẫn hiện trong bong bóng thoại.

## Luật chơi

Luật giữ như Monopoly cổ điển:

- **Tiền:** mỗi người khởi đầu 1,5 tỷ. Đi qua Xuất Phát nhận 200 Tr.
- **Mua đất:** đất không mua sẽ được đem ra đấu giá. Sở hữu trọn nhóm màu thì tiền thuê ×2 và được xây nhà.
- **Xây nhà:** phải xây đều giữa các ô. 4 nhà nâng thành khách sạn. Ngân hàng chỉ có 32 nhà và 12 khách sạn.
- **Bến giao thông và nhà máy:** tiền thuê bến là 25/50/100/200 Tr. Nhà máy thu 4× hoặc 10× số xúc xắc.
- **Nhà Tạm Giữ:** nộp phạt 50 Tr, dùng Thẻ Ân Xá, hoặc thử đổ đôi trong 3 lượt.
- **Thiếu tiền:** thế chấp đất (chuộc lại mất thêm 10%), bán nhà (nhận lại 50%), giao dịch với người khác, hoặc phá sản.
- **Thắng cuộc:** người cuối cùng còn trụ lại, hoặc người giàu nhất khi hết số vòng giới hạn.

**Đơn vị tiền:** triệu đồng (Tr). Giá trị lấy theo bản Monopoly chuẩn, ví dụ Hồ Hoàn Kiếm 400 Tr tương ứng Boardwalk $400.

**Thẻ Cơ Hội và Khí Vận** dựa theo bộ thẻ gốc, viết lại theo bối cảnh Việt Nam: lì xì Tết, phạt không đội mũ bảo hiểm, Festival Huế…

## Cấu trúc mã

| File | Vai trò |
|---|---|
| `js/data.js` | 40 ô bàn cờ, thông tin địa danh, câu đố, thẻ Cơ Hội và Khí Vận |
| `js/game.js` | Engine luật chơi, tách khỏi giao diện (chạy được headless) |
| `js/ai.js` | Người chơi máy |
| `js/board3d.js` | Cảnh 3D: bàn cờ, quân cờ, xúc xắc, nhà, hiệu ứng hạt, máy quay |
| `js/art.js` | Tranh minh hoạ vẽ bằng Canvas cho 30 cảnh, mặt ô cờ, bản đồ trung tâm |
| `js/audio.js` | Âm thanh tổng hợp WebAudio: nhạc ngũ cung kiểu đàn tranh, âm thanh theo địa danh |
| `js/voice.js` | Giọng nói tiếng Việt của Ngân hàng, có hàng đợi riêng |
| `js/ui.js` | HUD, bưu thiếp địa danh, thẻ, đấu giá, giao dịch, câu đố, hộ chiếu |

## Kiểm thử

```bash
npm test   # mô phỏng 300 ván toàn máy, kiểm tra bất biến (tiền không âm, số nhà/khách sạn, tài sản người phá sản)
```
