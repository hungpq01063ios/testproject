# Khu Rừng Chung Tay

Board game 3D **hợp tác** cho bé 4–8 tuổi, 1–6 người chơi luân phiên trên một máy (hợp nhất là tablet). Mỗi bé là một bạn thú. Cả nhóm phiêu lưu qua **5 vùng rừng** quanh **Cây Mẹ**, trồng cây, chơi trò chơi nhỏ và **tìm các bạn nhỏ bị lạc** để khu rừng hồi sinh trước khi mùa bão tới. Cùng thắng hoặc cùng thua; cuối ván bé nào cũng có huy hiệu.

Mở `index.html` bằng trình duyệt để chơi (Three.js kèm sẵn trong `vendor/`, chơi được offline).

## Bản đồ
Cây Mẹ (có mắt, biết cười) ở giữa; 5 vùng xếp như cánh hoa, mỗi vùng là một vòng đường 9 ô đi ra rồi quay về Cây Mẹ. Ở đầu mỗi vùng có **cầu gỗ** sang vùng bên cạnh. Bé chọn hướng ở Cây Mẹ và ở đầu cầu (nút chọn ghi vùng đó còn cần gì).

| Vùng | Bạn nhỏ bị lạc | Khi hồi sinh |
|---|---|---|
| Rừng Tre | Voọc con (voọc chà vá chân nâu) | Tre vàng úa vươn cao xanh mướt |
| Đồi Hoa | Nai con | Hoa nở khắp đồi, bướm bay về |
| Thác Nước | Rái cá con | Thác chảy lại, hồ cạn đầy nước trong |
| Đầm Sen | Sếu con (sếu đầu đỏ) | Nước đầm trong veo, sen nở hồng |
| Núi Đá | Tê tê con | Rêu xanh phủ đá, pha lê sáng trong hang |

Một vùng hồi sinh khi có đủ cây và bạn nhỏ đã về với mẹ. Hồi sinh cả 5 vùng là cả nhóm thắng.

## Ô trên đường
| Ô | Việc xảy ra |
|---|---|
| Cây Mẹ | Nghỉ ngơi: +1 hạt, +1 nước, +1 tim (đi ngang cũng được 1 hạt) |
| Hạt giống / Suối mát | +2 hạt / +2 giọt nước |
| Vườn ươm | 1 hạt + 1 nước = 1 cây (tối đa 2). Đi ngang mà vùng còn thiếu cây và bé có đủ thì dừng lại trồng. Thiếu thì nhờ bạn |
| Bạn nhỏ bị lạc | Đi ngang là dừng lại tìm bạn (trò chơi Tìm bạn trốn) |
| Trò chơi | Một trong 5 trò chơi nhỏ |
| Bé có biết? | Thẻ kể về loài vật, thiên nhiên (có đọc to) |
| Giúp bạn / Điều may mắn / Mây đen | Tặng bạn; quà bất ngờ; bão tới gần |
| Đống rác | Nhặt rác +1 tim (rác ≥ 4 đống làm bão tới nhanh gấp đôi) |

## 6 trò chơi nhỏ (15–20 giây, chạm là chơi, 0–3 sao)
| Trò chơi | Cách chơi | Thưởng |
|---|---|---|
| Hứng hạt dẻ | Kéo giỏ hứng hạt dẻ rơi (hạt vàng được 2) | Hạt giống |
| Tưới cây con | Chạm cây con đang khát | Nước |
| Phân loại rác | Bỏ rác vào thùng Hữu cơ / Tái chế | Dọn rác trên bản đồ |
| Đếm cá | Đếm cá đang bơi, chọn số đúng (3 lượt) | Hạt và nước |
| Xua mây | Chạm mây đen trước khi tới rừng | Bão lùi lại |
| Tìm bạn trốn | Nhớ bụi cây có bạn nhỏ, bụi cây đổi chỗ, chạm đúng bụi | Cứu bạn nhỏ |

## Hoạt cảnh
Mở đầu kể chuyện (4 cảnh), giải cứu bạn nhỏ (về với mẹ), vùng hồi sinh (camera bay quanh vùng đang biến đổi), mây bão kéo tới (nửa và ba phần tư thanh bão), kết thúc (lễ hội cầu vồng hoặc trú bão dưới Cây Mẹ). Có nút "Bỏ qua". Mỗi vòng đổi buổi: sáng, trưa, chiều, tối (tối có trăng, đom đóm, đèn lồng trên Cây Mẹ).

## Tài riêng của các bạn thú
Gấu dọn 2 đống rác · Thỏ được nhảy thêm 2 ô · Sóc nhặt thêm 1 hạt · Rùa lấy thêm 1 giọt nước · Cò xua mây đen · Voi phun nước cho cả nhóm.

## Dành cho người lớn
- Không tiền, không nợ, không loại người chơi. Độ khó tự chỉnh theo số người chơi (xem `MECHANICS.md`).
- **Âm thanh** và **Đọc to** (giọng tiếng Việt của máy, nếu có) bật/tắt ở góc trên. Ván lưu tự động.
- Ván 1 bé khoảng 20 lượt; 3–4 bé khoảng 11–12 vòng (20–30 phút), mỗi ván 7–9 trò chơi nhỏ.

## Cấu trúc
| File | Vai trò |
|---|---|
| `core.js` | Luật chơi thuần, có seed, dùng được trong Node |
| `world.js` | Bản đồ 3D: Cây Mẹ, 5 vùng biến đổi khi hồi sinh, cầu, 6 bạn thú, 5 bạn nhỏ và bố mẹ, ngày đêm, bão, cầu vồng |
| `minigames.js` | 6 trò chơi nhỏ trên canvas, có bot tự chơi cho self-test |
| `app.js` | Giao diện cho bé, xúc xắc 3D, lượt chơi, hoạt cảnh trong thế giới, âm thanh, giọng đọc, màn kết thúc |
| `selftest.cjs` | Self-test theo contract `--self-test` của Craft Anything |

## Self-test
```bash
node selftest.cjs --self-test checks/self-test.json
```
Các bước: mini-games (bot chơi cả 6 trò), setup, fork, move, act, hud, render-3d, zones, storm-clock, cinematics, finish, player-rolls, no-errors.

Ý tưởng game thiếu nhi khác được lưu ở `../docs/y-tuong-game-thieu-nhi.md`.
