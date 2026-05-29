# ============================================================
#  Periodization Planner — One-time installer
#  Creates Desktop + Start Menu shortcuts that launch the app
#  as a borderless standalone window via Edge/Chrome --app mode.
#
#  Run once from PowerShell:
#     powershell -ExecutionPolicy Bypass -File .\Install.ps1
#  ...or right-click → "Run with PowerShell".
# ============================================================

$ErrorActionPreference = "Stop"

$Root   = $PSScriptRoot
$Html   = Join-Path $Root "index.html"

if (-not (Test-Path $Html)) {
    Write-Host "ERROR: index.html not found in $Root" -ForegroundColor Red
    Read-Host "Press Enter to close"; exit 1
}

# Find a Chromium-based browser
$browser = $null
$candidates = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
foreach ($c in $candidates) {
    if (Test-Path $c) { $browser = $c; break }
}
if (-not $browser) {
    try { $browser = (Get-Command msedge.exe -ErrorAction Stop).Source } catch {}
}
if (-not $browser) {
    try { $browser = (Get-Command chrome.exe -ErrorAction Stop).Source } catch {}
}
if (-not $browser) {
    Write-Host "Could not locate Microsoft Edge or Google Chrome." -ForegroundColor Red
    Write-Host "Please install one of them, then re-run this script." -ForegroundColor Yellow
    Read-Host "Press Enter to close"; exit 1
}

Write-Host "Found browser: $browser" -ForegroundColor Green

# Build the file:// URL with forward slashes
$Url = "file:///" + ($Html -replace '\\','/')
$Arguments = "--app=`"$Url`" --window-size=1400,900"

function New-Shortcut($Path, $Description) {
    $WshShell = New-Object -ComObject WScript.Shell
    $sc = $WshShell.CreateShortcut($Path)
    $sc.TargetPath = $browser
    $sc.Arguments = $Arguments
    $sc.WorkingDirectory = $Root
    $sc.IconLocation = "$browser,0"
    $sc.Description = $Description
    $sc.Save()
}

$DesktopLink   = Join-Path ([Environment]::GetFolderPath("Desktop"))   "Periodization Planner.lnk"
$StartMenuDir  = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"
$StartMenuLink = Join-Path $StartMenuDir "Periodization Planner.lnk"

New-Shortcut $DesktopLink   "Periodization Planner — Sport Science Tool"
New-Shortcut $StartMenuLink "Periodization Planner — Sport Science Tool"

Write-Host ""
Write-Host "Installed successfully." -ForegroundColor Green
Write-Host "Desktop shortcut    : $DesktopLink"
Write-Host "Start Menu shortcut : $StartMenuLink"
Write-Host ""
Write-Host "Double-click the desktop icon (or search 'Periodization' in Start) to launch."
Write-Host ""
Read-Host "Press Enter to close"
