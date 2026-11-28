#!/usr/bin/env bash
set -euo pipefail

# Build web bundle + sync Capacitor Android + sign & package build/LuyenCoSu.apk
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Building web assets into dist/..."
node scripts/build-web.mjs

if [ ! -d "android" ]; then
  echo "[2/5] Initializing Capacitor Android project..."
  node ./node_modules/@capacitor/cli/bin/capacitor add android
fi

echo "[2/5] Copying web assets into android/app/src/main/assets/public and configuring AndroidManifest + Icons..."
node ./node_modules/@capacitor/cli/bin/capacitor copy android
node scripts/configure-android.mjs

mkdir -p build
KEYSTORE_PATH="$ROOT_DIR/build/luyencosu-release.p12"
if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "[3/5] Generating release PKCS12 signing keystore..."
  keytool -genkeypair -v \
    -keystore "$KEYSTORE_PATH" \
    -storetype PKCS12 \
    -alias luyencosu \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass luyencosu123 \
    -keypass luyencosu123 \
    -dname "CN=CoTienLo, OU=Mobile, O=CoChanNhan, L=Hanoi, S=HN, C=VN"
fi

echo "[4/5] Building signed release APK via Gradle..."
sed -i 's/\r$//' android/gradlew
chmod +x android/gradlew
(cd android && ./gradlew assembleRelease --no-daemon)

RELEASE_APK="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$RELEASE_APK" ]; then
  echo "ERROR: Không tìm thấy $RELEASE_APK"
  exit 1
fi

echo "[5/5] Copying signed APK -> build/LuyenCoSu.apk..."
cp -f "$RELEASE_APK" build/LuyenCoSu.apk
ls -lh build/LuyenCoSu.apk
echo "Done: $ROOT_DIR/build/LuyenCoSu.apk"
