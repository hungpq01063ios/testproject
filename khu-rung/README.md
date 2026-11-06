# Khu Rừng Chung Tay

Board game 3D **hợp tác** cho bé 4–8 tuổi, 1–6 người chơi luân phiên trên một máy (tablet là hợp nhất). Mỗi bé là một bạn thú. Cả nhóm cùng gieo hạt, lấy nước, trồng cây và nhặt rác để khu rừng xanh lại **trước khi mùa bão tới**. Cùng thắng hoặc cùng thua, cuối ván bé nào cũng nhận một huy hiệu.

Mở `index.html` bằng trình duyệt để chơi (Three.js kèm sẵn trong `vendor/`, chơi được offline).

## Cách chơi
1. Chọn các bạn thú (1–6), gõ tên bé nếu muốn, bấm **Vào rừng thôi!**
2. Đến lượt, bấm **Tung xúc xắc** (1–6 chấm), bạn thú nhảy từng ô quanh khu rừng.
3. Ô dừng chân:

| Ô | Việc xảy ra |
|---|---|
| Nhà Cây | Nghỉ ngơi: +1 hạt, +1 tim (đi ngang qua cũng được 1 hạt) |
| Hạt giống | +2 hạt |
| Suối mát | +2 giọt nước |
| Chỗ trồng cây | Mỗi cặp 1 hạt + 1 nước trồng được 1 cây (tối đa 2). Thiếu thì **nhờ bạn** đưa |
| Giúp bạn | Tặng bạn 1 hạt hoặc 1 giọt nước, hoặc ôm cả nhóm (+1 tim mỗi bạn) |
| Điều may mắn | Chim mang hạt, mưa rào, cầu vồng đẩy lùi bão, hạt cũ nảy mầm… |
| Mây đen | Bão tới gần thêm 1 nấc |
| Đống rác | Nhặt rác: +1 tim |

4. Hết mỗi vòng: bão tới gần 1 nấc và có thể xuất hiện rác mới. **Có từ 4 đống rác trở lên thì bão tới nhanh gấp đôi.**
5. Trồng đủ cây trước khi thanh bão đầy là cả nhóm thắng: cầu vồng hiện ra và mỗi bạn nhận một huy hiệu.

## Tài riêng của các bạn thú
| Bạn thú | Tài riêng |
|---|---|
| Gấu | Dọn 2 đống rác một lúc |
| Thỏ | Được chọn nhảy thêm 2 ô |
| Sóc | Nhặt được 3 hạt |
| Rùa | Lấy được 3 giọt nước |
| Cò | Gặp mây đen thì xua đi (bão lùi 1 nấc) |
| Voi | Ở suối thì phun nước cho cả nhóm |

## Dành cho người lớn
- Không có tiền, nợ hay loại người chơi. Thua chỉ là "mùa bão đã tới, cùng thử lại nhé".
- **Âm thanh** và **Đọc to** (giọng tiếng Việt của máy, nếu có) bật/tắt ở góc trên.
- Ván lưu tự động; mở lại trang để chơi tiếp.
- Độ khó tự chỉnh theo số người chơi (xem `MECHANICS.md`).

## Cấu trúc
| File | Vai trò |
|---|---|
| `core.js` | Luật chơi thuần, có seed, dùng được trong Node |
| `world.js` | Khu rừng 3D, 6 bạn thú, thời tiết đổi theo mùa bão, cây mọc dần, cầu vồng |
| `app.js` | Giao diện cho bé, xúc xắc 3D, lượt chơi, âm thanh, giọng đọc, màn kết thúc |
| `selftest.cjs` | Self-test theo contract `--self-test` của Craft Anything |

## Self-test
```bash
node selftest.cjs --self-test checks/self-test.json
```
Các bước: setup, move, act, hud, render-3d, rabbit-hop, rabbit-moved, storm-clock, teamwork, finish, forest-grows, player-rolls, no-errors.

Ý tưởng game thiếu nhi khác được lưu ở `../docs/y-tuong-game-thieu-nhi.md`.
