# Hướng dẫn Đóng gói "Cổ Tiên Lộ" thành file `.ipa` (iOS) và `.apk` (Android)

Dự án đã được cấu hình sẵn bộ khung Native bằng **Capacitor 6** cho cả **iOS** (`ios/App/App.xcodeproj`) và **Android** (`android/app/`), hỗ trợ xoay **Dọc & Ngang**, full-screen tối `#07090D`, và bộ **Icon Pixel Art Vạc Luyện Cổ & Huyết Nguyệt**.

---

## Cách 1: Tự động xuất cả `LuyenCoSu.ipa` và `LuyenCoSu.apk` từ Windows qua GitHub Actions

Chạy một lệnh duy nhất (đẩy source lên GitHub Actions, build song song `macos-latest` cho `.ipa` và `ubuntu-latest` cho `.apk`, tự động tải về thư mục gốc):

```powershell
npm.cmd run mobile:cloud
```

Thành phẩm sau khi xong:
- **`c:\Users\bunbohue\Desktop\game\LuyenCoSu.apk`** — Bản Android Release đã ký PKCS12, cài trực tiếp lên điện thoại Android.
- **`c:\Users\bunbohue\Desktop\game\LuyenCoSu.ipa`** — Bản iOS ARM64 dùng cài qua **Sideloadly / AltStore / TrollStore**.

---

## Cách 2: Cài đặt lên điện thoại

### Android (`LuyenCoSu.apk`)
1. Chép `LuyenCoSu.apk` vào điện thoại Android (hoặc tải từ máy tính qua cáp / Drive / Zalo).
2. Nhấn vào file `.apk`, bật **Cho phép cài đặt từ nguồn này** nếu được hỏi và bấm **Cài đặt**.

### iPhone / iPad (`LuyenCoSu.ipa`)
1. Mở **Sideloadly** (hoặc **AltStore**) trên Windows, cắm iPhone qua cáp USB.
2. Kéo `LuyenCoSu.ipa` vào Sideloadly, nhập Apple ID cá nhân rồi bấm **Start**.
3. Trên iPhone vào **Cài đặt → Cài đặt chung → Quản lý VPN & Thiết bị** → chọn Apple ID vừa dùng → nhấn **Tin cậy**.

---

## Lệnh đồng bộ khi sửa code

```powershell
npm.cmd run ios:sync
npm.cmd run android:sync
npm.cmd run mobile:cloud
```
