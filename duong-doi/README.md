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

- **Điểm dừng bắt buộc** (ô vàng lớn): Tốt nghiệp / Nhận việc, Kết hôn, Mua nhà, Tuổi 40, Nghỉ hưu.
- **Ngã rẽ**: Đại học (−50 tr, mở nghề lương 20–35 tr) hoặc Đi làm ngay (nghề 11–16 tr). Giữa ván có ngã rẽ thứ hai: Đường gia đình hoặc Đường sự nghiệp.
- **Ngày lương**: đi qua thì nhận lương, dừng đúng ô thì được thêm 5 tr.
- **Vay nợ**: hết tiền thì tự vay 50 tr. Mỗi khoản phải trả 60 tr lúc kết thúc, hoặc trả sớm trước khi quay.
- **Nghỉ hưu**: người về thứ 1/2/3/4+ nhận 40/30/20/10 tr. Nhà được bán lại theo vòng quay (×0,8 / ×1,2 / ×1,6).
- **Điểm Đời** = tiền mặt + giá bán nhà − nợ + 2 × ★ hạnh phúc.

## Cấu trúc

| File | Vai trò |
|---|---|
| `core.js` | Logic game thuần (không phụ thuộc DOM): bàn cờ 79 ô, nghề, nhà, sự kiện, lượt chơi, chấm điểm. RNG có seed nên ván chơi tái lập được |
| `index.html` | Giao diện: bàn cờ SVG, vòng quay canvas, bảng người chơi, nhật ký, tổng kết |
| `selftest.cjs` | Self-test theo contract của Craft Anything |
| `MECHANICS.md`, `mechanics.json` | Mọi thông số ảnh hưởng tới lối chơi |
| `CREDITS.md` | Nguồn gốc nội dung |

## Self-test (contract của Craft Anything)

```bash
node selftest.cjs --self-test checks/self-test.json [--screenshot checks/board.png]
```

Script mở game trong Chromium (Playwright), thiết lập 3 người chơi bằng thao tác thật trên giao diện, chơi hết ván bằng input có kịch bản, đo từng bước từ state của game và ghi báo cáo `{"version":1,"steps":[...]}`:

| Step | Đo gì |
|---|---|
| `move` | Quay 6 ở ngã rẽ, quân đi đúng 6 ô và token được vẽ ở ô mới |
| `act` | Học phí đại học bị trừ (tự vay) và hiệu ứng ô dừng được áp dụng |
| `hud` | Tên, tiền, lương, ★ của mọi người chơi và thẻ lượt hiển thị đúng state |
| `hot-seat` | Chuyển lượt sang người 2, người 2 chọn nhánh còn lại |
| `retire` | Chơi hết ván tới khi mọi người nghỉ hưu và màn tổng kết hiện ra |
| `no-errors` | Không có lỗi script trong trang |

## Quy trình làm

Theo quy trình Study → Build → Check → Ready của [Craft Anything](https://github.com/storytold/craft-anything), ở chế độ **Clean room**: không đọc code hay file nào của game gốc. Đây là một game riêng cùng thể loại "board game mô phỏng cuộc đời" (quay số, nghề nghiệp, gia đình, tài sản, nghỉ hưu), với tên, bàn cờ, luật chấm điểm, nội dung và hình ảnh tự làm.
