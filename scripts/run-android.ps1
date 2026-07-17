# Runs the app on a connected device/emulator without ever hitting the
# "Another process is running on port 8081. Use port 8082 instead?" prompt —
# frees port 8081 first (killing any stale Metro process squatting on it),
# then lets react-native run-android start a fresh one on the default port.
# Usage: npm run android:fresh

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileDir = Split-Path -Parent $scriptDir

$existing = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    $pids = $existing | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        Write-Host "Freeing port 8081 (stopping process $procId)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

Push-Location $mobileDir
try {
    npx react-native run-android
} finally {
    Pop-Location
}
