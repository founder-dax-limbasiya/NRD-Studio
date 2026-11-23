#!/usr/bin/env bash
set -Eeuo pipefail

DIAGNOSTIC_FILE="nrd-emulator-logcat.txt"
APP_ID="com.nrd.studio"
ACTIVITY="$APP_ID/.MainActivity"

capture_logs() {
  local exit_code=$?
  adb logcat -d -v time > "$DIAGNOSTIC_FILE" 2>/dev/null || true
  exit "$exit_code"
}
trap capture_logs ERR

echo "Installing NRD Studio debug APK"
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

echo "Clearing old Android logs"
adb logcat -c
adb shell am force-stop "$APP_ID"

echo "Launching main activity"
adb shell am start -W -n "$ACTIVITY"

echo "Waiting for the app process"
for attempt in $(seq 1 20); do
  if adb shell pidof "$APP_ID" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
adb shell pidof "$APP_ID"

echo "Checking the visible home screen"
timeout 30s adb shell uiautomator dump /sdcard/nrd-window.xml
adb shell cat /sdcard/nrd-window.xml > nrd-window.xml
grep -F "Images in. Videos out." nrd-window.xml

echo "NRD Studio launcher screen opened successfully on the Android emulator"
