# SYSTEM: NGŨ HÀNH LEVELING — v4.0 ULTIMATE

Ứng dụng Progressive Web App (PWA) **100% Offline Static Web** kết hợp giữa **Công cụ Phân tích Dữ liệu Nỗ lực (Effort Analytics Tracker)** và **Hệ thống Gamification Nhập vai (Solo Leveling HUD × Ngũ Hành Tương Sinh)**.

---

## 1. Cách Chạy Thử Cục Bộ (Local)

Dự án đã đóng gói sẵn toàn bộ thư viện (`vendor/`), bộ font tiếng Việt (`fonts/`), biểu tượng (`icons/`) và CSS đã biên dịch (`css/tailwind.build.css`), nên **không cần kết nối Internet** và không phụ thuộc `node_modules` khi chạy:

```bash
# Cách 1: Dùng Python HTTP Server
python -m http.server 8080

# Mở trình duyệt tại:
# http://localhost:8080
```

Nếu muốn chạy bộ kiểm thử đơn vị (Unit Tests) cho lõi công thức:

```bash
node tests/engine.test.js
```

Nếu bạn chỉnh sửa giao diện và muốn biên dịch lại Tailwind CSS:

```bash
npm run build:css
```

---

## 2. Cách Deploy Lên GitHub Pages

Ứng dụng sử dụng toàn bộ đường dẫn tương đối (`./`), tương thích hoàn toàn khi đặt ở cả domain gốc lẫn subpath `/ten-repo/`:

1. Đẩy toàn bộ mã nguồn lên nhánh `main` của repository trên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Release SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE"
   git branch -M main
   git remote add origin https://github.com/<username>/<ten-repo>.git
   git push -u origin main
   ```
2. Vào repository trên GitHub ➔ **Settings** ➔ **Pages**.
3. Tại mục **Build and deployment**:
   - **Source**: Chọn `Deploy from a branch`.
   - **Branch**: Chọn `main` và thư mục `/ (root)`, sau đó bấm **Save**.
4. Sau 1–2 phút, ứng dụng sẽ hoạt động tại `https://<username>.github.io/<ten-repo>/` và có thể bấm nút **Cài App** để cài đặt thành ứng dụng độc lập trên Desktop/Mobile.

---

## 3. Cách Cập Nhật Phiên Bản Mới (Service Worker Cache)

Khi bạn thay đổi code và muốn người dùng đã cài PWA nhận bản cập nhật mới ngay:

1. Mở file `sw.js`.
2. Đổi giá trị hằng số `CACHE_VERSION` ở dòng đầu tiên (ví dụ từ `'nhl-v4.0.0'` sang `'nhl-v4.0.1'`).
3. Commit và push lên GitHub. Khi người dùng mở ứng dụng, Service Worker sẽ tự động tải bản mới, xóa cache cũ và hiện thông báo cập nhật.

---

## 4. Cách Sao Lưu (Backup) & Khôi Phục (Restore) Dữ Liệu

Toàn bộ dữ liệu được lưu trữ an toàn trên trình duyệt tại khóa `localStorage['nhl_v4']`:

- **Sao lưu (Backup JSON)**: Bấm nút **`Backup JSON`** trên thanh Header HUD để tải về file `.json` chứa toàn bộ thói quen, lịch sử check-in, nhật ký, danh hiệu và kho vật phẩm.
- **Khôi phục (Restore JSON)**: Bấm nút **`Restore JSON`** và chọn file `.json` đã sao lưu. Hệ thống sẽ kiểm tra tính hợp lệ của cấu trúc dữ liệu (Schema Validation) và hỏi xác nhận trước khi khôi phục.
- **Bắt đầu Hành trình Ngày 1**: Trong lần mở đầu tiên, ứng dụng tạo sẵn 14 ngày dữ liệu mẫu để hiển thị đầy đủ đồ thị 3 lớp và Radar Ngũ Hành. Khi muốn bắt đầu ghi nhận thực tế, hãy bấm nút **`Xóa lịch sử mẫu (Bắt đầu Ngày 1)`** trên thanh thông báo hoặc trong **Cài Đặt** (hệ thống sẽ tự động tải về 1 bản Backup JSON trước khi xóa lịch sử mẫu và giữ nguyên danh sách thói quen cho bạn).
