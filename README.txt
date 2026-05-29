============================================================
 PERIODIZATION PLANNER — Sport Science Tool
============================================================

WHAT CHANGED IN THIS VERSION
----------------------------
1. sRPE fixed
   - Now rated per SESSION (not per day) on the Borg CR-10 scale.
   - You enter it ~30 min after a session ends.
   - Click the 0–10 buttons to record it.

2. Multiple sessions per day
   - Click any Quick-Add button (Strength / Practice / Speed /
     Conditioning / Recovery / Match) to add a session.
   - Each session has its own time, type, purpose, duration,
     exercises and sRPE.
   - "Copy from yesterday" duplicates yesterday's plan.
   - Move ↑/↓, Duplicate, Delete on every session.

3. Better training-plan UI
   - Sessions are collapsible cards.
   - Warm-up / Main / Cool-down are also collapsible.
   - Each exercise row has Move ↑ ↓ / Duplicate / Delete.
   - Daily total load + session count shown at the top.

4. Now installable as a desktop app
   - Run Install.ps1 once to add Desktop and Start Menu shortcuts.
   - Shortcuts open the app in Edge/Chrome "--app mode" — a
     borderless standalone window that feels like a real app.

5. Backup / new season
   - New tab "6. Backup / New Season" lets you export your data
     to a .json file and import it on another computer, or wipe
     the current data and start a fresh season.


INSTALLATION
------------
1. Open this folder in File Explorer:
      C:\Users\nurro\periodization-planner

2. Right-click "Install.ps1"  →  "Run with PowerShell".
   (If Windows blocks it, open PowerShell here and run:
      powershell -ExecutionPolicy Bypass -File .\Install.ps1 )

3. A "Periodization Planner" icon appears on your Desktop and
   in the Start Menu. Double-click it — done.


ALTERNATIVE WAY TO LAUNCH
-------------------------
- Double-click "launch.bat" (no install required).
- Or just double-click "index.html" to open in your normal browser.


WHERE IS MY DATA?
-----------------
All plans, sessions, sRPE entries etc. live in your browser's
localStorage under the origin of this HTML file. They survive
restarts and shutdowns. They will be lost if you:
  - clear browser data for this site,
  - launch from a different browser, or
  - move the index.html to a different folder.

Use "6. Backup / New Season → Download backup (.json)" at the
end of every season — that single JSON file contains everything.


EVERY-SEASON WORKFLOW
---------------------
End of season:
  - Open the app → tab 6 → "Download backup (.json)" → save the
    file somewhere safe (Documents, OneDrive, USB, etc.).

Start of next season:
  - Open the app → tab 6 → "Start new season" (clears data).
  - Tab 1 (Setup): set new dates, competitions, model.
  - Plan away. The basketball example is just a starting point
    — you can keep editing or wipe it any time.


UNINSTALL
---------
Run Uninstall.ps1 to remove the Desktop and Start Menu
shortcuts. Your data stays in the browser; to delete it use
the "Reset to example" / "Start new season" buttons inside
the app.


KEY METRICS (so the math is clear)
----------------------------------
- Session load    = sRPE × duration (min)              [Foster]
- Daily load      = Σ session loads of the day
- Weekly load     = Σ daily loads of the week
- Monotony        = mean(daily load) / SD(daily load)
                    >2 = excessive
- Strain          = weekly load × monotony
- ACWR            = (last-7-day load) / (last-28-day load ÷ 4)
                    Safe zone 0.8–1.3, risk > 1.5
- Tapering        = automatically applied to weeks within 14
                    days of a competition (volume cut, intensity
                    held high)
