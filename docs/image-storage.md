# Quản Lý Ảnh Món Ăn (Dish Images & Local Storage)

Tài liệu thiết kế và vận hành lưu trữ ảnh món ăn cục bộ cho Family Home V1.1 – Phase 3.

---

## 1. Provider Nguồn Ảnh

- **Provider mặc định**: `wikimedia-commons` (Wikimedia Commons chính thức qua API `https://commons.wikimedia.org/w/api.php`).
- **Nguyên tắc**:
  - Không scraping HTML từ Google/Bing hay web bên ngoài.
  - Sử dụng API chính thức MediaWiki với các module: `generator=search`, `prop=imageinfo`, `iiprop=url|size|extmetadata|mime`.
  - Phễu tìm kiếm 2 tầng:
    1. Query 1: `[Tên món]`
    2. Query 2 (khi kết quả ít): `[Tên món] Vietnamese food`
  - Scoring & ranking tự động: ưu tiên raster images (JPEG/PNG/WebP), kích thước hợp lý, có license rõ ràng; loại bỏ SVG, icons, vector và tài liệu không phù hợp.
  - XSS Protection: Mọi chuỗi từ `extmetadata` (Artist, License, Credit) đều được strip/sanitize HTML thành plain text trước khi hiển thị.

---

## 2. Cấu Trúc Lưu Trữ Nhị Phân – IndexedDB

Binary image data (Blob) **không** lưu trong `localStorage` để tránh tràn quota (~5MB). Toàn bộ nhị phân được lưu trữ trong **IndexedDB**:

- **Database Name**: `familyHomeAssets`
- **Version**: `1`
- **Object Store**: `dishImages` (keyPath: `id`)
- **Record Schema**:
  ```js
  {
    id: "dishimg_1727230000000_abc123",
    dishId: "dish_001",
    blob: Blob,            // File nhị phân WebP hoặc JPEG đã nén
    mimeType: "image/webp", // image/jpeg | image/png | image/webp
    width: 800,
    height: 600,
    createdAt: 1727230000000,
    updatedAt: 1727230000000
  }
  ```

---

## 3. Dish Image Metadata Schema (localStorage)

Mỗi món ăn (`dish`) trong `localStorage` chỉ lưu trữ metadata tham chiếu nhẹ:

```js
image: {
  assetId: "dishimg_1727230000000_abc123", // null nếu lưu remote fallback
  provider: "wikimedia-commons",
  sourcePageUrl: "https://commons.wikimedia.org/wiki/File:...",
  originalUrl: "https://upload.wikimedia.org/wikipedia/commons/...",
  thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/...",
  title: "Cá kho tộ",
  author: "Nguyễn Văn A",
  licenseName: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  attributionRequired: true,
  width: 800,
  height: 600,
  savedLocally: true,
  updatedAt: 1727230000000
}
```
*Đối với món ăn cũ chưa thiết lập ảnh: `dish.image = null`.*

---

## 4. Client-side Resize & Compression

- Ảnh tải từ Wikimedia được chuyển thành Blob.
- Giới hạn tải ban đầu: Tối đa 10 MB (từ chối tải file khổng lồ). Ưu tiên tải URL thumbnail chất lượng cao (~640–1000px).
- Nén và thu nhỏ client-side qua HTML5 Canvas:
  - Cạnh dài tối đa: `1200px` (giữ nguyên tỉ lệ aspect ratio, không upscale ảnh nhỏ).
  - Định dạng xuất: `image/webp` với chất lượng `0.85` (fallback `image/jpeg` trên trình duyệt cũ).

---

## 5. Chiến Lược Dự Phòng (Fallback Strategy)

1. **Lỗi lưu cục bộ (IndexedDB lỗi / Quota exceeded)**:
   - Cho phép fallback sang dùng trực tiếp remote URL (`savedLocally = false`).
2. **Missing IndexedDB Asset**:
   - Nếu metadata ghi nhận `savedLocally = true` nhưng không tìm thấy Blob trong IndexedDB, hệ thống tự động fallback hiển thị qua `thumbnailUrl` / `originalUrl` hợp lệ (`https:`).
3. **Món ăn không có ảnh / Ngoại tuyến không có ảnh**:
   - Hiển thị placeholder emoji đồng bộ (`🍲` cho món ăn chung / bữa trưa & tối, `🍳` cho món sáng), không làm hỏng layout hoặc hiển thị icon broken image của trình duyệt.

---

## 6. Chiến Lược Ghi Nhận Nguồn (Attribution Strategy)

- Tuân thủ giấy phép Creative Commons của Wikimedia Commons:
  - Hiển thị thông tin tác giả và giấy phép: `Ảnh: [Tác giả] · [Giấy phép]`.
  - Có liên kết mở trang gốc Wikimedia (`sourcePageUrl`) với `target="_blank" rel="noopener noreferrer"`.
  - Thông tin nguồn luôn được bảo lưu ngay cả khi ảnh đã tải và nén về IndexedDB cục bộ.

---

## 7. Tính Toàn Vẹn & Vòng Đời (Lifecycle & Atomicity)

- **Đổi ảnh**: Tải và lưu ảnh mới vào IndexedDB thành công -> cập nhật tham chiếu `dish.image` -> mới dọn dẹp xóa asset cũ. Nếu lưu mới thất bại, ảnh cũ được giữ nguyên.
- **Xóa ảnh**: Xóa asset nhị phân trong IndexedDB và đặt `dish.image = null`. Món ăn vẫn tồn tại.
- **Xóa món ăn**: Tự động dọn dẹp asset nhị phân liên quan trong IndexedDB, tránh rác lưu trữ (orphan blobs).

---

## 8. Hướng Dẫn Thêm Provider Mới Trong Tương Lai

Kiến trúc `ImageService` được thiết kế dạng mở rộng (Registry pattern):

```js
// 1. Khai báo provider tuân thủ interface:
const CustomProvider = {
  name: 'unsplash',
  async search(query, limit = 8) {
    // Gọi API tìm kiếm...
    // Trả về mảng các đối tượng được chuẩn hóa:
    return results.map(item => ({
      provider: 'unsplash',
      title: item.description,
      thumbnailUrl: item.urls.small,
      originalUrl: item.urls.regular,
      sourcePageUrl: item.links.html,
      author: item.user.name,
      licenseName: 'Unsplash License',
      licenseUrl: 'https://unsplash.com/license',
      attributionRequired: true,
      width: item.width,
      height: item.height
    }));
  }
};

// 2. Đăng ký vào ImageService:
window.ImageService.registerProvider('unsplash', CustomProvider);
```
