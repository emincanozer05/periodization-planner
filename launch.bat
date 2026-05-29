@echo off
REM ============================================================
REM  Periodization Planner — Windows launcher
REM  Opens index.html in Edge (or Chrome) "app mode" — borderless
REM  standalone window that behaves like a real desktop app.
REM ============================================================
setlocal

set "DIR=%~dp0"
set "URL=file:///%DIR:\=/%index.html"

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
