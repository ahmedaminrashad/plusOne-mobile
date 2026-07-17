# Builds a standalone, installable release APK with a given backend API URL baked in.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -ApiUrl https://f625-41-43-7-53.ngrok-free.app
#
# Unlike `npx react-native run-android`, the release APK embeds the JS bundle,
# so the resulting file can be copied/installed on any device without Metro running.

param(
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileDir = Split-Path -Parent $scriptDir
$configPath = Join-Path $mobileDir "src\config.ts"

$normalizedUrl = $ApiUrl.TrimEnd('/')
if ($normalizedUrl -notmatch '/api/v1$') {
    $normalizedUrl = "$normalizedUrl/api/v1"
}

Write-Host "Setting API_BASE_URL = $normalizedUrl"
$configContent = @"
// Managed by the run-android skill / scripts/build-apk.ps1 — do not hardcode URLs here manually.
export const API_BASE_URL = '$normalizedUrl';
export const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
"@
Set-Content -Path $configPath -Value $configContent -Encoding utf8

Write-Host "Building release APK..."
Push-Location (Join-Path $mobileDir "android")
try {
    & .\gradlew.bat assembleRelease
} finally {
    Pop-Location
}

$apkPath = Join-Path $mobileDir "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    Write-Host "APK built: $apkPath"
} else {
    Write-Host "Build finished but APK was not found at the expected path: $apkPath"
    exit 1
}
