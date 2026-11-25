#!/usr/bin/env bash
set -euo pipefail

# Build web bundle + sync Capacitor iOS + install Pods + archive & package LuyenCoSu.ipa (macOS + Xcode)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Building web assets into dist/..."
node scripts/build-web.mjs

if [ ! -d "ios" ]; then
  echo "[2/5] Initializing Capacitor iOS project..."
  node ./node_modules/@capacitor/cli/bin/capacitor add ios
fi

echo "[2/5] Copying web assets into ios/App/App/public and configuring Info.plist + AppIcon..."
node ./node_modules/@capacitor/cli/bin/capacitor copy ios
node scripts/configure-ios.mjs

if [ -f "ios/App/Podfile" ]; then
  echo "[3/5] Installing CocoaPods dependencies..."
  (cd ios/App && (pod install --no-repo-update || pod install))
fi

mkdir -p build

ARCHIVE_PATH="build/LuyenCoSu.xcarchive"
IPA_DIR="build/ipa"
UNSIGNED_MODE="${UNSIGNED_IPA:-1}"

if [ -f "ios/App/App.xcworkspace/contents.xcworkspacedata" ]; then
  TARGET_FLAG=(-workspace ios/App/App.xcworkspace)
else
  TARGET_FLAG=(-project ios/App/App.xcodeproj)
fi

if [ "$UNSIGNED_MODE" = "1" ]; then
  echo "[4/5] Archiving unsigned iOS build (sideload via Sideloadly / AltStore)..."
  xcodebuild clean archive "${TARGET_FLAG[@]}" \
    -scheme App \
    -sdk iphoneos \
    -destination "generic/platform=iOS" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    DEVELOPMENT_TEAM="" \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO

  echo "[5/5] Packaging Payload -> build/LuyenCoSu.ipa..."
  rm -rf build/Payload build/LuyenCoSu.ipa
  mkdir -p build/Payload
  cp -R "$ARCHIVE_PATH/Products/Applications/App.app" build/Payload/
  (cd build && zip -qry LuyenCoSu.ipa Payload)
  echo "Done: $ROOT_DIR/build/LuyenCoSu.ipa"
else
  echo "[4/5] Archiving signed iOS build..."
  xcodebuild clean archive "${TARGET_FLAG[@]}" \
    -scheme App \
    -sdk iphoneos \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH"

  echo "[5/5] Exporting signed IPA via ios-packaging/ExportOptions.plist..."
  rm -rf "$IPA_DIR"
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist ios-packaging/ExportOptions.plist \
    -exportPath "$IPA_DIR"
  echo "Done: $ROOT_DIR/$IPA_DIR"
fi
