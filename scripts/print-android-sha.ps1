$ErrorActionPreference = 'Stop'
$keystore = Join-Path $PSScriptRoot '..\android\app\debug.keystore'
$keytoolCandidates = @(
  "$env:JAVA_HOME\bin\keytool.exe",
  'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe',
  'C:\Program Files\JetBrains\PhpStorm 2024.3.4\jbr\bin\keytool.exe'
)
$keytool = $keytoolCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $keytool) {
  Write-Error 'keytool.exe not found. Install Android Studio or a JDK, then rerun.'
}
& $keytool -list -v -keystore $keystore -alias androiddebugkey -storepass android -keypass android
