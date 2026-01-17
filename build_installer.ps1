$ErrorActionPreference = "Stop"

# 设置 npmmirror 镜像以加速下载
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"


Write-Host "1. Cleaning previous release..."
if (Test-Path "release") { Remove-Item -Recurse -Force "release" }

Write-Host "2. Building frontend (Vite)..."
cmd /c "npm run build"

Write-Host "3. Building Windows Installer (Electron Builder)..."
# 使用本地安装的 electron-builder
node node_modules/electron-builder/out/cli/cli.js --win --config electron-builder.json

Write-Host "Build process completed."
