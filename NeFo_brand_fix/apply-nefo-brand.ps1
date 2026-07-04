param(
    [string]$ProjectRoot = "C:\Users\Admin\Desktop\App"
)

$ErrorActionPreference = "Stop"

Write-Host "Applying NeFo branding..." -ForegroundColor Cyan

if (-not (Test-Path $ProjectRoot)) {
    throw "Project folder not found: $ProjectRoot"
}

$SourceAssets = Join-Path $PSScriptRoot "assets"
$TargetAssets = Join-Path $ProjectRoot "assets"

New-Item -ItemType Directory -Force -Path $TargetAssets | Out-Null

Copy-Item (Join-Path $SourceAssets "icon-only.png") $TargetAssets -Force
Copy-Item (Join-Path $SourceAssets "icon-foreground.png") $TargetAssets -Force
Copy-Item (Join-Path $SourceAssets "icon-background.png") $TargetAssets -Force

Set-Location $ProjectRoot

Write-Host "Installing Capacitor asset generator..." -ForegroundColor Yellow
npm install @capacitor/assets --save-dev

Write-Host "Generating Android launcher icons..." -ForegroundColor Yellow
npx capacitor-assets generate --android

$StringsFile = Join-Path $ProjectRoot "android\app\src\main\res\values\strings.xml"
if (Test-Path $StringsFile) {
    $strings = Get-Content $StringsFile -Raw
    $strings = $strings -replace '<string name="app_name">.*?</string>', '<string name="app_name">NeFo</string>'
    $strings = $strings -replace '<string name="title_activity_main">.*?</string>', '<string name="title_activity_main">NeFo</string>'
    Set-Content $StringsFile $strings -Encoding utf8
}

$CapConfig = Join-Path $ProjectRoot "capacitor.config.json"
if (Test-Path $CapConfig) {
    $config = Get-Content $CapConfig -Raw | ConvertFrom-Json
    $config.appName = "NeFo"
    $config | ConvertTo-Json -Depth 20 | Set-Content $CapConfig -Encoding utf8
}

$IndexFile = Join-Path $ProjectRoot "index.html"
if (Test-Path $IndexFile) {
    $index = Get-Content $IndexFile -Raw
    if ($index -match '<title>.*?</title>') {
        $index = $index -replace '<title>.*?</title>', '<title>NeFo</title>'
    }
    Set-Content $IndexFile $index -Encoding utf8
}

Write-Host "Building web app..." -ForegroundColor Yellow
npm run build

Write-Host "Syncing Android..." -ForegroundColor Yellow
npx cap sync android

Set-Location (Join-Path $ProjectRoot "android")

Write-Host "Cleaning Android build..." -ForegroundColor Yellow
.\gradlew clean

Write-Host "Building debug APK..." -ForegroundColor Yellow
.\gradlew assembleDebug

Write-Host ""
Write-Host "Branding applied successfully." -ForegroundColor Green
Write-Host "APK:" -ForegroundColor Green
Write-Host (Join-Path $ProjectRoot "android\app\build\outputs\apk\debug\app-debug.apk")
Write-Host ""
Write-Host "Uninstall the old Nefo app before installing this APK so Android clears the cached icon and name." -ForegroundColor Yellow
