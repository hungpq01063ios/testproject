# Đường Đời

Board game mô phỏng cuộc đời cho 2–6 người, chơi **luân phiên trên một máy** (hot-seat). Không cần cài đặt, không cần mạng.

Mỗi người quay số 1–10, chọn học đại học hay đi làm sớm, kết hôn, mua nhà, nuôi con, đầu tư, đổi nghề ở tuổi 40 rồi nghỉ hưu. Người có nhiều **Điểm Đời** nhất sẽ thắng.

## Chạy game

| Cách | Lệnh |
|---|---|
| Mở trực tiếp | Mở `index.html` bằng trình duyệt (Chrome, Edge, Firefox, Safari) |
| Qua server local | `npm run serve` rồi vào `http://localhost:8080` |

Ván đang chơi được tự lưu trong trình duyệt. Mở lại trang và bấm **Tiếp tục ván đang chơi**.

## Luật chính

- **4 khía cạnh cuộc sống**: ♥ Gia đình · ◆ Tri thức · ✚ Sức khoẻ · ★ Cống hiến, cộng với tài sản. Mỗi ô, sự kiện, nghề, nhà và lựa chọn tác động khác nhau.
- **Ước mơ**: đầu ván mỗi người chọn 1 trong 3 lá (Đại gia, Gia đình hạnh phúc, Học giả, Sống khoẻ sống lâu, Người truyền cảm hứng, Cuộc đời cân bằng); khía cạnh của ước mơ được nhân đôi điểm.
- **22 nghề, 3 hệ** (phổ thông / học nghề / đại học): mỗi nghề có lương, chỉ số tăng mỗi kỳ lương và quyền **thu phí dịch vụ** khi người khác trả tiền cho dịch vụ đó. Ca sĩ và YouTuber có lương tăng theo ★.
- **3 ngã rẽ**: Đại học / Học nghề / Đi làm ngay → Gia đình / Sự nghiệp → Cống hiến / Làm giàu. Cùng các lựa chọn: kết hôn hay độc thân, mua nhà, tuổi 40, cách sống khi nghỉ hưu.
- **Cuộc thi** (ô cúp): mọi người góp 5 tr rồi lần lượt tự quay; cao nhất ăn cả quỹ, nghề hợp được +2 (Rung chuông vàng, Đua thuyền, Karaoke, Nấu phở, Khởi nghiệp sáng tạo, Đua xe đạp).
- **Thách đấu** (ô VS): chọn đối thủ, hai bên cùng quay, người thắng lấy tiền cược (cờ tướng, kèo bóng đá, tranh chấp đất đai). Thêm các lá sự kiện chuyển tiền giữa người chơi.
- **Phương tiện theo tài sản ròng**: xe buýt (đang nợ) → xe đạp → xe máy (40 tr) → ô tô (130 tr) → xe sang (260 tr).
- **Hoạt cảnh**: tốt nghiệp, kết hôn, có con, mua nhà, tậu ô tô, khởi nghiệp thành công, nghỉ hưu và trao giải cuộc thi, diễn ở một trong 11 cảnh đẹp ba miền chọn ngẫu nhiên. Bấm "Bỏ qua" hoặc tắt bằng nút **Hoạt cảnh**.
- **Mọi vòng quay do người chơi bấm**: đi đường, mừng cưới, đầu tư, khởi nghiệp, giá bán nhà, cuộc thi, thách đấu.
- **Điểm Đời** = tài sản ròng ÷ 5 + điểm 4 khía cạnh + thưởng cân bằng.

Chi tiết từng con số ở `MECHANICS.md`.

## Cấu trúc

| File | Vai trò |
|---|---|
| `core.js` | Logic game thuần (không phụ thuộc DOM): bàn cờ 79 ô, nghề, nhà, sự kiện, lượt chơi, chấm điểm. RNG có seed nên ván chơi tái lập được |
| `index.html` + `app.js` | **Bản 3D** (Three.js): giao diện, quân xe máy chở cả nhà chạy theo đường cong, vòng quay 3D, camera bám người chơi, pháo giấy, đồng xu, số tiền bay lên, âm thanh tổng hợp |
| `cutscene.js` | Hoạt cảnh: sân khấu 3D riêng, 11 bối cảnh (Hồ Gươm, Hạ Long, Mù Cang Chải, Tràng An, Kinh thành Huế, Hội An, Mũi Né, Đà Lạt, Cái Răng, Phú Quốc, Bến Bạch Đằng) × 8 loại sự kiện |
| `world.js` | Thế giới 3D dựng bằng code: đảo có địa hình, biển và sông hồ, đường lát đá uốn lượn, 7 vùng với công trình và ánh sáng riêng, cây cối, thuyền, chim, mây |
| `2d.html` | Bản 2D nhẹ (bàn cờ SVG) cho máy yếu |
| `vendor/` | Three.js r147 + OrbitControls (MIT), để chơi được khi không có mạng |
| `selftest.cjs` | Self-test theo contract của Craft Anything |
| `MECHANICS.md`, `mechanics.json` | Mọi thông số ảnh hưởng tới lối chơi |
| `CREDITS.md` | Nguồn gốc nội dung |

## Hành trình 3D

| Vùng | Trên bàn cờ | Cảnh vật | Không khí |
|---|---|---|---|
| Hà Nội | Xuất phát → Tốt nghiệp / Ra nghề / Nhận việc | Hồ Gươm, Tháp Rùa, cầu Thê Húc, đền Ngọc Sơn, Chùa Một Cột, Khuê Văn Các, xưởng học nghề, hàng phượng đỏ, cổng làng | Buổi sáng |
| Hội An | Kết hôn | Dãy phố vàng, dây đèn lồng, Chùa Cầu, thuyền thắp đèn trên sông | Chiều vàng, đèn lồng sáng |
| Đà Lạt | Mua nhà | Rừng thông, đồi hoa, biệt thự Pháp, cánh hoa bay | Sương mù se lạnh |
| Vịnh | Ngã rẽ | Đảo đá vôi, thuyền buồm nâu | |
| Sapa / Sài Gòn | Đường gia đình / Đường sự nghiệp | Ruộng bậc thang, nhà sàn, núi Fansipan / toà tháp chọc trời, tháp có sân đỗ trực thăng, đèn đường | Trời trong / nắng trưa |
| Bà Nà | Tuổi 40 | Cầu Vàng có đôi bàn tay đá đỡ, lâu đài, mây trong thung lũng | Mây mù |
| Phú Quốc | Đường cống hiến / Đường làm giàu → Nghỉ hưu | Bãi biển, rặng dừa, cầu tàu, thuyền thúng, tháp chùa 7 tầng | Hoàng hôn, đom đóm |

Khi quân xe sang vùng mới, tên vùng hiện lên và bầu trời, nắng, sương chuyển dần sang không khí của vùng đó.

## Điều khiển 3D

- Kéo để xoay, cuộn/chụm hai ngón để zoom, chuột phải để dịch.
- **Toàn cảnh / Theo người chơi**: đổi giữa nhìn cả sa bàn và camera bám người đang đi.
- Rê chuột (hoặc chạm) vào ô để xem ô đó làm gì.
- **Đồ hoạ: cao / nhẹ**: bản nhẹ tắt bóng đổ, giảm cây và hạt hiệu ứng cho máy yếu (mặc định trên điện thoại).
- Mọi vòng quay đều do người chơi bấm: đi đường, mừng cưới, đầu tư, khởi nghiệp, giá bán nhà lúc kết thúc.

## Self-test (contract của Craft Anything)

```bash
node selftest.cjs --self-test checks/self-test.json [--screenshot checks/board.png]
```

Script mở game trong Chromium (Playwright), thiết lập 3 người chơi bằng thao tác thật trên giao diện, chơi hết ván bằng input có kịch bản, đo từng bước từ state của game và ghi báo cáo `{"version":1,"steps":[...]}`:

| Step | Đo gì |
|---|---|
| `goal` | Người chơi chọn ước mơ trước lượt quay đầu tiên |
| `move` | Quay 6 ở ngã rẽ, quân đi đúng 6 ô và token được vẽ ở ô mới |
| `act` | Học phí đại học bị trừ (tự vay) và hiệu ứng ô dừng được áp dụng |
| `hud` | Tên, tiền, lương, ★ của mọi người chơi và thẻ lượt hiển thị đúng state |
| `render-3d` | WebGL chạy, cảnh 3D được vẽ (đếm frame, ảnh chụp không phẳng) |
| `family-on-bike` | Số người ngồi sau mỗi xe máy khớp vợ/chồng + con trong state |
| `player-spins` | Mọi lần quay trong ván đều đến từ người chơi bấm vòng quay, không có lần quay tự động nào |
| `hot-seat` | Chuyển lượt sang người 2, người 2 chọn nhánh còn lại |
| `retire` | Chơi hết ván tới khi mọi người nghỉ hưu và màn tổng kết hiện ra |
| `life-aspects` | Điểm tổng kết đúng bằng tài sản + 4 khía cạnh + cân bằng |
| `choices-and-careers` | Ván thử đi qua ít nhất 6 loại quyết định (ước mơ, ngã rẽ, nghề, kết hôn, nhà, tuổi 40, nghỉ hưu…) |
| `contests` | Mỗi cuộc thi/thách đấu có đủ lượt quay của từng người tham gia và có kết quả |
| `vehicles` | Phương tiện trên bàn cờ luôn khớp tài sản của người chơi; ván thử dùng ít nhất 2 loại |
| `cutscenes` | Ván thử kích hoạt ít nhất 3 loại hoạt cảnh |
| `no-errors` | Không có lỗi script trong trang |

## Quy trình làm

Theo quy trình Study → Build → Check → Ready của [Craft Anything](https://github.com/storytold/craft-anything), ở chế độ **Clean room**: không đọc code hay file nào của game gốc. Đây là một game riêng cùng thể loại "board game mô phỏng cuộc đời" (quay số, nghề nghiệp, gia đình, tài sản, nghỉ hưu), với tên, bàn cờ, luật chấm điểm, nội dung và hình ảnh tự làm.
