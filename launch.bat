@echo off
REM ============================================================
REM  Periodization Planner — Windows launcher
REM  Opens the live app in Edge (or Chrome) "app mode" — borderless
REM  standalone window that behaves like a real desktop app.
REM ============================================================
setlocal

REM The app is hosted on Vercel and updates automatically on every
REM release — always open the live site, never a stale local copy.
set "URL=https://periodization-planner-rust.vercel.app/"

REM Prefer Edge (default on Windows 11), fall back to Chrome
where /q msedge.exe
if %errorlevel%==0 (
  start "" msedge --app="%URL%" --window-size=1400,900
  goto :eof
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --window-size=1400,900
  goto :eof
)

where /q chrome.exe
if %errorlevel%==0 (
  start "" chrome --app="%URL%" --window-size=1400,900
  goto :eof
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=1400,900
  goto :eof
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=1400,900
  goto :eof
)

REM Last resort: open in default browser (will have full browser chrome)
start "" "%URL%"
