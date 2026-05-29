# Removes the Desktop / Start Menu shortcuts created by Install.ps1.
# Your saved data is kept inside the browser — to wipe it, open the app
# and use the "Reset to example" or "Start new season" buttons.

$Desktop   = Join-Path ([Environment]::GetFolderPath("Desktop"))   "Periodization Planner.lnk"
$StartMenu = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs\Periodization Planner.lnk"

foreach ($p in @($Desktop, $StartMenu)) {
    if (Test-Path $p) { Remove-Item $p -Force; Write-Host "Removed: $p" }
}
Write-Host "Done."
Read-Host "Press Enter to close"
