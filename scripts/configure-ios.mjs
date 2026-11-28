#!/usr/bin/env node
/**
 * Cấu hình dự án native iOS (ios/App/) sau khi chạy `capacitor add ios` / `capacitor copy ios`:
 * 1. Cập nhật Info.plist: tên hiển thị "Luyện Cổ Sư", khóa xoay ngang (Landscape), full-screen.
 * 2. Sinh App Icon Pixel Art 1024x1024 (alpha = 255 chuẩn App Store/Xcode) hình Vạc Luyện Cổ & Huyết Nguyệt.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { upscale } from "../tools/pixelfx/tools/lib/fxlib.mjs";
import { encodePNG } from "../tools/pixelfx/tools/lib/png.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const IOS_APP_DIR = join(ROOT, "ios", "App", "App");
const INFO_PLIST_PATH = join(IOS_APP_DIR, "Info.plist");
const PBXPROJ_PATH = join(ROOT, "ios", "App", "App.xcodeproj", "project.pbxproj");
const ICON_PATH = join(
  IOS_APP_DIR,
  "Assets.xcassets",
  "AppIcon.appiconset",
  "AppIcon-512@2x.png"
);

function setOrReplacePlistKey(plist, key, valueXml) {
  const keyPattern = new RegExp(
    `(<key>${key}<\\/key>\\s*)(<array>[\\s\\S]*?<\\/array>|<string>[\\s\\S]*?<\\/string>|<true\\/>|<false\\/>)`,
    "m"
  );
  if (keyPattern.test(plist)) {
    return plist.replace(keyPattern, `$1${valueXml}`);
  }
  const closingIdx = plist.lastIndexOf("</dict>");
  if (closingIdx === -1) {
    throw new Error("Không tìm thấy thẻ đóng </dict> trong Info.plist");
  }
  const insertion = `\t<key>${key}</key>\n\t${valueXml}\n`;
  return plist.slice(0, closingIdx) + insertion + plist.slice(closingIdx);
}

function patchInfoPlist() {
  if (!existsSync(INFO_PLIST_PATH)) {
    throw new Error(`Không tìm thấy ${INFO_PLIST_PATH}. Hãy chạy capacitor add ios trước.`);
  }

  let plist = readFileSync(INFO_PLIST_PATH, "utf8");

  const orientArray = `<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>`;

  plist = setOrReplacePlistKey(plist, "CFBundleDisplayName", "<string>Cổ Tiên Lộ</string>");
  plist = setOrReplacePlistKey(plist, "UISupportedInterfaceOrientations", orientArray);
  plist = setOrReplacePlistKey(plist, "UISupportedInterfaceOrientations~ipad", orientArray);
  plist = setOrReplacePlistKey(plist, "UIRequiresFullScreen", "<true/>");
  plist = setOrReplacePlistKey(plist, "UIStatusBarHidden", "<true/>");
  plist = setOrReplacePlistKey(plist, "UIViewControllerBasedStatusBarAppearance", "<false/>");
  plist = setOrReplacePlistKey(plist, "ITSAppUsesNonExemptEncryption", "<false/>");

  writeFileSync(INFO_PLIST_PATH, plist, "utf8");
  console.log(`[configure-ios] Updated ${INFO_PLIST_PATH}`);
}

function hexToRgba(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b, 255];
}

function generateAppIcon() {
  if (!existsSync(ICON_PATH)) {
    throw new Error(`Không tìm thấy ${ICON_PATH}.`);
  }

  const size = 64;
  const buf = new Uint8ClampedArray(size * size * 4);

  const px = (x, y, hex) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= size || iy >= size) return;
    const rgba = hexToRgba(hex);
    const idx = (iy * size + ix) * 4;
    buf[idx] = rgba[0];
    buf[idx + 1] = rgba[1];
    buf[idx + 2] = rgba[2];
    buf[idx + 3] = 255;
  };

  const rect = (x, y, w, h, hex) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        px(xx, yy, hex);
      }
    }
  };

  const disc = (cx, cy, r, hex) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) {
          px(x, y, hex);
        }
      }
    }
  };

  // 1. Nền tối cổ phong phân tầng bậc pixel (alpha = 255 mọi pixel)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - 31.5, y - 31.5);
      if (dist < 18) px(x, y, "#1d182b");
      else if (dist < 28) px(x, y, "#161221");
      else px(x, y, "#0d0c12");
    }
  }

  // 2. Viền đồng cổ 2 lớp + 4 góc hoa văn
  rect(2, 2, 60, 1, "#9c7a44");
  rect(2, 61, 60, 1, "#9c7a44");
  rect(2, 2, 1, 60, "#9c7a44");
  rect(61, 2, 1, 60, "#9c7a44");
  rect(4, 4, 56, 1, "#4e3c22");
  rect(4, 59, 56, 1, "#4e3c22");
  rect(4, 4, 1, 56, "#4e3c22");
  rect(59, 4, 1, 56, "#4e3c22");
  for (const [cx, cy] of [
    [3, 3],
    [59, 3],
    [3, 59],
    [59, 59],
  ]) {
    rect(cx, cy, 2, 2, "#d6b16a");
  }

  // 3. Huyết Nguyệt phía trên nền trời đêm
  disc(32, 18, 12, "#4a0e1c");
  disc(32, 18, 10, "#9e1c36");
  disc(32, 18, 8, "#ff3855");
  disc(30, 16, 4, "#ff9aa8");
  // Khoét trăng khuyết nhẹ bằng nền tối
  disc(36, 15, 7, "#161221");

  // 4. Ngọn lửa than đỏ cam dưới đáy vạc
  disc(32, 53, 6, "#8f2412");
  disc(32, 53, 4, "#ff7b39");
  rect(30, 51, 4, 2, "#ffd178");

  // 5. Vạc đồng đen 3 chân (Trạm Luyện Cổ)
  // 3 chân vạc
  rect(21, 48, 3, 6, "#1f1d29");
  rect(22, 48, 1, 5, "#59546b");
  rect(40, 48, 3, 6, "#1f1d29");
  rect(41, 48, 1, 5, "#59546b");
  rect(31, 49, 2, 5, "#17151f");

  // Thân vạc
  disc(32, 41, 12, "#14121b");
  disc(32, 40, 11, "#252330");
  disc(29, 38, 7, "#3a364a");
  // Đai đồng cổ quanh bụng vạc
  rect(21, 39, 22, 2, "#9c7a44");
  rect(22, 39, 20, 1, "#d6b16a");
  // Cổ & miệng vạc
  rect(23, 30, 18, 4, "#1a1824");
  rect(20, 29, 24, 3, "#59546b");
  rect(21, 29, 22, 1, "#d6b16a");
  // Hai tai vạc
  rect(17, 33, 4, 5, "#9c7a44");
  rect(18, 34, 2, 3, "#0d0c12");
  rect(43, 33, 4, 5, "#9c7a44");
  rect(44, 34, 2, 3, "#0d0c12");

  // 6. Ngọn lửa linh cổ xanh ngọc bốc lên từ miệng vạc
  rect(24, 27, 16, 2, "#1b8a6b");
  rect(26, 24, 12, 4, "#24b58b");
  rect(28, 20, 8, 5, "#4de6b0");
  rect(30, 15, 4, 6, "#4de6b0");
  rect(31, 11, 2, 4, "#9ef7d8");
  rect(29, 23, 6, 4, "#d8fff0");
  // Tàn lửa linh cổ bay lên
  px(23, 21, "#4de6b0");
  px(40, 22, "#4de6b0");
  px(26, 14, "#9ef7d8");
  px(38, 16, "#9ef7d8");
  px(33, 8, "#d8fff0");

  // Phóng đại nearest-neighbor 16x -> 1024x1024
  const scaled = upscale(buf, size, size, 16);
  const png = encodePNG(1024, 1024, scaled);
  writeFileSync(ICON_PATH, png);
  console.log(`[configure-ios] Generated 1024x1024 pixel-art AppIcon at ${ICON_PATH}`);
}

function bumpProjectVersion() {
  if (!existsSync(PBXPROJ_PATH)) {
    throw new Error(`Không tìm thấy ${PBXPROJ_PATH}.`);
  }
  const pbx = readFileSync(PBXPROJ_PATH, "utf8");
  const matches = [...pbx.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)];
  const currentMax = matches.reduce((max, m) => Math.max(max, Number(m[1]) || 1), 1);
  const nextVersion = currentMax + 1;
  const updated = pbx.replace(
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${nextVersion};`
  );
  writeFileSync(PBXPROJ_PATH, updated, "utf8");
  console.log(`[configure-ios] Bumped CURRENT_PROJECT_VERSION -> ${nextVersion}`);
}

patchInfoPlist();
bumpProjectVersion();
generateAppIcon();
