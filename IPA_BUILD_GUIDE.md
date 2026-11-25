# Hướng dẫn Đóng gói "Luyện Cổ Sư" thành file `.ipa` và Cài lên iPhone

Dự án đã được cấu hình sẵn bộ khung Native iOS bằng **Capacitor 6** (`ios/App/App.xcodeproj`), đã nhúng game vào `ios/App/App/public/`, khóa xoay ngang toàn màn hình trong `ios/App/App/Info.plist`, và gắn **App Icon Pixel Art 1024×1024**.

---

## Cách 1: Tự động xuất file `LuyenCoSu.ipa` ngay từ Windows qua GitHub Actions (Không cần máy Mac)

1. Tạo một repository mới trên GitHub và đẩy toàn bộ thư mục `c:\Users\bunbohue\Desktop\game` lên nhánh `main` (hoặc `master`).
2. Trên GitHub, vào tab **Actions** → chọn workflow **Build iOS IPA** (định nghĩa sẵn tại `.github/workflows/build-ios-ipa.yml`).
3. Nhấn **Run workflow** (mặc định `unsigned = true` để build không cần chứng chỉ Apple Developer trả phí 99\$/năm).
4. Sau khoảng 2–3 phút, máy chủ `macos-latest` hoàn tất, tải artifact **`LuyenCoSu-iOS-IPA`** về máy Windows — bên trong là file **`LuyenCoSu.ipa`**.

---

## Cách 2: Build trực tiếp trên máy Mac có Xcode

Nếu bạn có máy Mac (macOS + Xcode + CocoaPods):

```bash
npm install
# Tạo LuyenCoSu.ipa unsigned (cài bằng Sideloadly / AltStore / TrollStore)
UNSIGNED_IPA=1 bash scripts/build-ipa.sh

# Hoặc build bản ký chứng chỉ Apple Developer bằng ios-packaging/ExportOptions.plist
UNSIGNED_IPA=0 bash scripts/build-ipa.sh
```

File thành phẩm nằm tại `build/LuyenCoSu.ipa`.

---

## Cách 3: Cài file `LuyenCoSu.ipa` từ Windows vào iPhone

1. Tải và mở **Sideloadly** (hoặc **AltStore**) trên Windows, cắm iPhone qua cáp USB.
2. Kéo file `LuyenCoSu.ipa` vào Sideloadly, nhập Apple ID cá nhân (miễn phí) rồi bấm **Start**.
3. Sau khi cài xong, trên iPhone mở **Cài đặt → Cài đặt chung → Quản lý VPN & Thiết bị** → chọn Apple ID vừa dùng → nhấn **Tin cậy**.
4. Mở app **Luyện Cổ Sư** ngay trên màn hình chính iPhone.

---

## Lệnh cập nhật khi chỉnh sửa code hoặc asset

Mỗi khi chỉnh sửa code trong `src/` hoặc xuất thêm sprite từ `tools/pixelfx`, chạy:

```powershell
node tools/generate-all-assets.mjs   # nếu có thay đổi sprite/tileset/VFX
npm.cmd run ios:sync                 # đóng gói dist/ -> ios/App/App/public + cập nhật Info.plist & Icon
```
