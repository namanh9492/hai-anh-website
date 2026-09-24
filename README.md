# Hai Anh Family Website 🍳🏠

Website gia đình nhỏ gọn, hiện đại và tiện lợi cho việc quản lý bữa cơm và nhà cửa:
1. **Thực đơn tuần & hôm nay**: Tự động gợi ý thực đơn tuần cân đối dinh dưỡng (Món chính, Món rau, Món canh, Món phụ), hỗ trợ đổi món, khóa món, đánh dấu đã ăn, bảo toàn lịch sử ngày đã ăn và ưu tiên món lâu chưa ăn.
2. **Quản lý danh sách món ăn**: Thêm, sửa, xóa, tìm kiếm, lọc theo phân loại và bật/tắt món ăn linh hoạt.
3. **Mẹo dọn dẹp & chăm sóc gia đình**: Lưu trữ các mẹo dọn dẹp thông minh, các bước chuẩn bị, hướng dẫn từng bước và liên kết tham khảo ngoài an toàn.

## 🛠 Công nghệ
- **Frontend**: HTML5, Vanilla CSS (Design system, Dark/Light theme, Glassmorphism, Micro-animations), Vanilla JavaScript.
- **Lưu trữ**: Storage Manager trừu tượng hoá trên `localStorage` với cơ chế sao lưu, phục hồi tự động khi dữ liệu hỏng.
- **Kiểm thử**: Automated test suite với 30+ assertions và 8 bộ Regression Tests (A–H).

## 🚀 Chạy trên môi trường cục bộ
Mở trực tiếp các file `.html` hoặc khởi chạy HTTP server:
```bash
# Sử dụng Python HTTP server
python -m http.server 3000

# Hoặc Node.js npx serve
npx serve .
```

## 🧪 Chạy kiểm thử tự động
```bash
node tests/verify.test.js
```
