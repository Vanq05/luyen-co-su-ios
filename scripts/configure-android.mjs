#!/usr/bin/env node
/**
 * Cấu hình dự án native Android (android/app/) sau `capacitor add android` / `capacitor copy android`:
 * 1. Đặt tên ứng dụng "Cổ Tiên Lộ", cho phép xoay dọc & ngang (`fullUser`), giữ `usesCleartextTraffic`.
 * 2. Đặt màu nền tối `#07090D` cho launch screen & status/nav bars, tránh nháy trắng khi mở app.
 * 3. Sinh bộ Icon Pixel Art nearest-neighbor (Huyết Nguyệt & Vạc Luyện Cổ) cho mọi mật độ `mipmap-*`.
 * 4. Tăng `versionCode` và gắn `signingConfigs.release` đọc `build/luyencosu-release.p12`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePNG } from "../tools/pixelfx/tools/lib/png.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ANDROID_APP_DIR = join(ROOT, "android", "app");
const BUILD_GRADLE_PATH = join(ANDROID_APP_DIR, "build.gradle");
const MANIFEST_PATH = join(ANDROID_APP_DIR, "src", "main", "AndroidManifest.xml");
const RES_DIR = join(ANDROID_APP_DIR, "src", "main", "res");
const STRINGS_PATH = join(RES_DIR, "values", "strings.xml");
const STYLES_PATH = join(RES_DIR, "values", "styles.xml");
const ICON_BG_PATH = join(RES_DIR, "values", "ic_launcher_background.xml");

function hexToRgba(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    255,
  ];
}

function drawCauldronEmblem64(transparentBg = false) {
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

  const clearPx = (x, y) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= size || iy >= size) return;
    buf[(iy * size + ix) * 4 + 3] = 0;
  };

  const rect = (x, y, w, h, hex) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) px(xx, yy, hex);
    }
  };

  const disc = (cx, cy, r, hex, carveTransparent = false) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) {
          if (carveTransparent) clearPx(x, y);
          else px(x, y, hex);
        }
      }
    }
  };

  if (!transparentBg) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dist = Math.hypot(x - 31.5, y - 31.5);
        if (dist < 18) px(x, y, "#1d182b");
        else if (dist < 28) px(x, y, "#161221");
        else px(x, y, "#0d0c12");
      }
    }
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
  }

  // Huyết Nguyệt
  disc(32, 18, 12, "#4a0e1c");
  disc(32, 18, 10, "#9e1c36");
  disc(32, 18, 8, "#ff3855");
  disc(30, 16, 4, "#ff9aa8");
  disc(36, 15, 7, "#161221", transparentBg);

  // Lửa dưới vạc & 3 chân vạc đồng
  disc(32, 53, 6, "#8f2412");
  disc(32, 53, 4, "#ff7b39");
  rect(30, 51, 4, 2, "#ffd178");

  rect(21, 48, 3, 6, "#1f1d29");
  rect(22, 48, 1, 5, "#59546b");
  rect(40, 48, 3, 6, "#1f1d29");
  rect(41, 48, 1, 5, "#59546b");
  rect(31, 49, 2, 5, "#17151f");

  // Thân vạc & đai đồng
  disc(32, 41, 12, "#14121b");
  disc(32, 40, 11, "#252330");
  disc(29, 38, 7, "#3a364a");
  rect(21, 39, 22, 2, "#9c7a44");
  rect(22, 39, 20, 1, "#d6b16a");
  rect(23, 30, 18, 4, "#1a1824");
  rect(20, 29, 24, 3, "#59546b");
  rect(21, 29, 22, 1, "#d6b16a");
  rect(17, 33, 4, 5, "#9c7a44");
  rect(18, 34, 2, 3, "#0d0c12");
  rect(43, 33, 4, 5, "#9c7a44");
  rect(44, 34, 2, 3, "#0d0c12");

  // Linh hỏa ngọc lam bốc lên
  rect(24, 27, 16, 2, "#1b8a6b");
  rect(26, 24, 12, 4, "#24b58b");
  rect(28, 20, 8, 5, "#4de6b0");
  rect(30, 15, 4, 6, "#4de6b0");
  rect(31, 11, 2, 4, "#9ef7d8");
  rect(29, 23, 6, 4, "#d8fff0");
  px(23, 21, "#4de6b0");
  px(40, 22, "#4de6b0");
  px(26, 14, "#9ef7d8");
  px(38, 16, "#9ef7d8");
  px(33, 8, "#d8fff0");

  return buf;
}

function resampleNearest(srcBuf, srcSize, dstSize, insetRatio = 0) {
  const out = new Uint8ClampedArray(dstSize * dstSize * 4);
  const pad = Math.round(dstSize * insetRatio);
  const box = Math.max(1, dstSize - pad * 2);

  for (let y = 0; y < box; y++) {
    const sy = Math.min(srcSize - 1, Math.floor((y * srcSize) / box));
    for (let x = 0; x < box; x++) {
      const sx = Math.min(srcSize - 1, Math.floor((x * srcSize) / box));
      const si = (sy * srcSize + sx) * 4;
      const di = ((y + pad) * dstSize + (x + pad)) * 4;
      out[di] = srcBuf[si];
      out[di + 1] = srcBuf[si + 1];
      out[di + 2] = srcBuf[si + 2];
      out[di + 3] = srcBuf[si + 3];
    }
  }
  return out;
}

function patchStringsXml() {
  if (!existsSync(STRINGS_PATH)) return;
  let xml = readFileSync(STRINGS_PATH, "utf8");
  xml = xml.replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">Cổ Tiên Lộ</string>`);
  xml = xml.replace(/<string name="title_activity_main">.*?<\/string>/, `<string name="title_activity_main">Cổ Tiên Lộ</string>`);
  writeFileSync(STRINGS_PATH, xml, "utf8");
  console.log(`[configure-android] Updated ${STRINGS_PATH}`);
}

function patchAndroidManifest() {
  if (!existsSync(MANIFEST_PATH)) return;
  let xml = readFileSync(MANIFEST_PATH, "utf8");
  if (!xml.includes("android:usesCleartextTraffic")) {
    xml = xml.replace("<application", `<application\n        android:usesCleartextTraffic="true"`);
  }
  if (xml.includes("android:screenOrientation")) {
    xml = xml.replace(/android:screenOrientation="[^"]*"/, `android:screenOrientation="sensorLandscape"`);
  } else {
    xml = xml.replace(/<activity\b/, `<activity\n            android:screenOrientation="sensorLandscape"`);
  }
  if (!xml.includes("android.permission.INTERNET")) {
    xml = xml.replace("</manifest>", `    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>`);
  }
  writeFileSync(MANIFEST_PATH, xml, "utf8");
  console.log(`[configure-android] Updated ${MANIFEST_PATH}`);
}

function patchStylesAndBg() {
  if (existsSync(ICON_BG_PATH)) {
    const bgXml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0D0C12</color>\n</resources>\n`;
    writeFileSync(ICON_BG_PATH, bgXml, "utf8");
  }
  if (existsSync(STYLES_PATH)) {
    let styles = readFileSync(STYLES_PATH, "utf8");
    if (!styles.includes("android:windowBackground")) {
      styles = styles.replace(
        `<item name="android:background">@null</item>`,
        `<item name="android:background">@null</item>\n        <item name="android:windowBackground">#07090D</item>\n        <item name="android:statusBarColor">#07090D</item>\n        <item name="android:navigationBarColor">#07090D</item>`
      );
    }
    writeFileSync(STYLES_PATH, styles, "utf8");
    console.log(`[configure-android] Updated ${STYLES_PATH}`);
  }
}

function generateAndroidIcons() {
  const opaque64 = drawCauldronEmblem64(false);
  const fg64 = drawCauldronEmblem64(true);

  const densities = [
    ["mipmap-mdpi", 48, 108],
    ["mipmap-hdpi", 72, 162],
    ["mipmap-xhdpi", 96, 216],
    ["mipmap-xxhdpi", 144, 324],
    ["mipmap-xxxhdpi", 192, 432],
  ];

  for (const [folder, legacySize, adaptiveSize] of densities) {
    const dir = join(RES_DIR, folder);
    mkdirSync(dir, { recursive: true });
    const legacyPng = encodePNG(legacySize, legacySize, resampleNearest(opaque64, 64, legacySize, 0));
    const fgPng = encodePNG(adaptiveSize, adaptiveSize, resampleNearest(fg64, 64, adaptiveSize, 0.2));
    writeFileSync(join(dir, "ic_launcher.png"), legacyPng);
    writeFileSync(join(dir, "ic_launcher_round.png"), legacyPng);
    writeFileSync(join(dir, "ic_launcher_foreground.png"), fgPng);
  }
  console.log("[configure-android] Generated pixel-art Android launcher & adaptive icons.");
}

function patchBuildGradle() {
  if (!existsSync(BUILD_GRADLE_PATH)) {
    throw new Error(`Không tìm thấy ${BUILD_GRADLE_PATH}`);
  }
  let gradle = readFileSync(BUILD_GRADLE_PATH, "utf8");

  const codeMatch = gradle.match(/versionCode\s+(\d+)/);
  const nextCode = (codeMatch ? Number(codeMatch[1]) : 1) + 1;
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${nextCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "1.2.${nextCode}"`);

  if (!gradle.includes("signingConfigs {")) {
    gradle = gradle.replace(
      "    buildTypes {",
      `    signingConfigs {
        release {
            def ks = file("../../build/luyencosu-release.p12")
            if (ks.exists()) {
                storeFile ks
                storeType "PKCS12"
                storePassword "luyencosu123"
                keyAlias "luyencosu"
                keyPassword "luyencosu123"
            }
        }
    }
    buildTypes {`
    );
  }

  if (!gradle.includes("signingConfig signingConfigs.release")) {
    gradle = gradle.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      `buildTypes {\n        release {\n            signingConfig signingConfigs.release`
    );
  }

  writeFileSync(BUILD_GRADLE_PATH, gradle, "utf8");
  console.log(`[configure-android] Updated ${BUILD_GRADLE_PATH} (versionCode=${nextCode}, release signing configured)`);
}

patchStringsXml();
patchAndroidManifest();
patchStylesAndBg();
generateAndroidIcons();
patchBuildGradle();
