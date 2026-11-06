# Mechanics

Mọi giá trị là **ước lượng thiết kế** (clean room: không lấy từ game nào khác). Bản có cấu trúc nằm ở `mechanics.json`; nguồn sự thật là `core.js`.

## Bốn khía cạnh cuộc sống
| | Khía cạnh | Đến từ |
|---|---|---|
| ♥ | Gia đình | kết hôn, con cái, nhà, sum họp |
| ◆ | Tri thức | học hành, đọc sách, thạc sĩ, nghề trí thức |
| ✚ | Sức khoẻ | thể thao, sống chậm, nghỉ hưu ở quê; tăng ca và con nhỏ làm giảm |
| ★ | Cống hiến | thiện nguyện, dạy học, quỹ học bổng, Đường cống hiến |

Khởi đầu: ♥1 ◆1 ✚3 ★0, tiền 30 tr.

## Ước mơ (chọn 1 trong 3 lá đầu ván)
| Ước mơ | Hiệu ứng |
|---|---|
| Đại gia | Điểm tài sản ×1,5 |
| Gia đình hạnh phúc | Mỗi ♥ được 4 điểm thay vì 2 |
| Học giả | Mỗi ◆ được 4 điểm thay vì 2 |
| Sống khoẻ sống lâu | Mỗi ✚ được 4 điểm thay vì 2 |
| Người truyền cảm hứng | Mỗi ★ được 4 điểm thay vì 2 |
| Cuộc đời cân bằng | Thưởng cân bằng 70 điểm thay vì 20 (mọi khía cạnh ≥ 6) |

## Điểm Đời
- Tài sản ròng = tiền + giá bán nhà − 60 × số khoản vay; điểm tài sản = tài sản ròng ÷ 5 (Đại gia ×1,5).
- Mỗi điểm khía cạnh = 2 điểm (khía cạnh của ước mơ: 4).
- Cân bằng: mọi khía cạnh ≥ 6 → +20 (ước mơ Cuộc đời cân bằng: +70).

## Nghề (22 nghề, 3 hệ)
| Nghề | Hệ | Lương/kỳ | Mỗi kỳ lương | Thu phí dịch vụ |
|---|---|---|---|---|
| Tài xế công nghệ | Phổ thông | 16 | — | Du lịch |
| Nhân viên bán hàng | Phổ thông | 15 | — | Mua sắm |
| Nông dân | Phổ thông | 13 | +1✚ | Ăn uống |
| Công nhân nhà máy | Phổ thông | 17 | — | — |
| Shipper | Phổ thông | 14 | +1✚ | Mua sắm |
| YouTuber | Phổ thông | 8 + 2/★ (tối đa 40) | — | Công nghệ |
| Thợ điện | Học nghề | 18 | — | Nhà cửa |
| Đầu bếp | Học nghề | 19 | — | Ăn uống |
| Thợ sửa xe | Học nghề | 17 | — | Xe cộ |
| Điều dưỡng | Học nghề | 18 | +1★ | Y tế |
| Thợ trang điểm cô dâu | Học nghề | 16 | — | Cưới hỏi |
| Hướng dẫn viên du lịch | Học nghề | 17 | +1◆ | Du lịch |
| Kỹ sư phần mềm | Đại học | 32 | +1◆, −1✚ | Công nghệ |
| Bác sĩ | Đại học | 36 | −1✚, +1★ | Y tế |
| Giáo viên | Đại học | 22 | +1◆, +1★ | Học hành |
| Luật sư | Đại học | 34 | — | Pháp lý |
| Kiến trúc sư | Đại học | 28 | — | Nhà cửa |
| Nhà báo | Đại học | 24 | +1◆, +1★ | — |
| Kế toán | Đại học | 24 | — | Thuế |
| Nhà khoa học | Đại học | 26 | +2◆ | — |
| Phi công | Đại học | 38 | −1✚ | Du lịch |
| Ca sĩ | Đại học | 10 + 3/★ (tối đa 48) | — | Cưới hỏi |

Thu phí: khi người chơi khác trả một khoản có nhãn dịch vụ của bạn (viện phí, sửa xe, phạt…), bạn nhận khoản đó; với khoản lớn hơn 20 tr (mua nhà) bạn nhận hoa hồng 10%. Đổi nghề chỉ trong hệ mình đã học (Đại học được mọi nghề; Học nghề được nghề kỹ thuật và phổ thông).

## Ngã rẽ và lựa chọn
| Nơi | Lựa chọn |
|---|---|
| Xuất phát | Học đại học (−50 tr) · Học nghề (−20 tr) · Đi làm ngay |
| Tốt nghiệp / Ra nghề / Nhận việc | Chọn 1 trong 3 nghề của hệ |
| Kết hôn | Kết hôn (tự quay tiền mừng cưới, +5♥) · Sống độc thân (+2✚ +2◆) |
| Mua nhà | 1 trong 3 nhà hoặc tiếp tục thuê |
| Ngã rẽ giữa đời | Đường gia đình · Đường sự nghiệp |
| Tuổi 40 | Học thạc sĩ · Khởi nghiệp (tự quay) · Sống chậm |
| Ngã rẽ cuối đời | Đường cống hiến · Đường làm giàu |
| Nghỉ hưu | Về quê làm vườn · Ở phố gần con cháu · Du lịch vòng quanh thế giới · Lập quỹ học bổng |
| Ô đầu tư / Ô đổi nghề | Góp 20 tr rồi tự quay · Đổi sang 1 trong 3 nghề |

## Cuộc thi và thách đấu
| Ô | Cách chơi | Nghề được cộng |
|---|---|---|
| Cuộc thi (6 ô) | Mọi người còn chơi góp 5 tr vào quỹ, lần lượt tự quay; cao nhất nhận cả quỹ và chỉ số; hoà thì chia | +2 cho nghề hợp (vd. Đầu bếp ở cuộc thi nấu phở) |
| Thách đấu (5 ô) | Người dừng chọn đối thủ hoặc từ chối; hai bên quay, cao hơn lấy tiền cược 10–25 tr | Luật sư +3 ở tranh chấp đất đai |

Lá sự kiện chuyển tiền: mời cả nhóm ăn mừng (trả 4 tr mỗi người), bạn cũ trả nợ (người giàu nhất trả 10 tr), quỹ tương thân (người giàu nhất cho người nghèo nhất 15 tr), hàng xóm đền (người kế tiếp trả 8 tr), cho bạn vay chữa bệnh (trả người nghèo nhất 10 tr).

## Phương tiện
Theo tài sản ròng (tiền + giá nhà − nợ): xe buýt dưới 0 · xe đạp từ 0 · xe máy từ 40 · ô tô từ 130 · xe sang từ 260 tr. Chỉ xuống hạng khi tụt quá ngưỡng 20 tr.

## Nhà
| Nhà | Giá | Khía cạnh |
|---|---|---|
| Nhà vườn ở quê | 90 | +2♥, +3✚ |
| Căn hộ chung cư | 130 | +2♥ |
| Nhà phố 4 tầng | 210 | +2♥, +1★ |
| Biệt thự ven sông | 330 | +3♥, +3★ |

Bán lại khi kết thúc: mỗi chủ nhà tự quay; 1–3 ×0,8 · 4–7 ×1,2 · 8–10 ×1,6.

## Khác
- Bàn cờ 94 ô, 3 ngã rẽ, vòng quay 1–10, điểm dừng bắt buộc.
- Khoản vay tự động 50 tr, trả 60 tr. Thuế 30% lương. Thưởng nghỉ hưu 40 / 30 / 20 / 10 tr.
- 27 lá sự kiện.

## Cân bằng (mô phỏng 800 ván, 4 người, lựa chọn ngẫu nhiên)
Mọi ván đều kết thúc; trung bình ~16 vòng (12–22). Điểm trung bình theo ước mơ nằm trong 122–136; thưởng cân bằng đạt ở ~15% người chơi; 100% lượt quay do người chơi bấm.
