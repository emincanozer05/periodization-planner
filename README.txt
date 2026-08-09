============================================================
 PERIODIZATION PLANNER — Sport Science Tool
============================================================

PROGRAM INDIVIDUALIZATION (Individualization tab)
-------------------------------------------------
One template + rule layers instead of writing 15 separate
programs. Pick a date, pick a source (a team session planned
for that date, or a Template), and the tab builds one version
per athlete. Four layers stack, in this order:

  1. Tag substitution
     Library exercises carry a movement pattern and
     contraindication tags (knee / back / shoulder / ankle /
     hip / hamstring / wrist) plus a difficulty level.
     Athletes carry their own active restriction tags and a
     tier. When they clash, the slot's own pinned alternatives
     are offered first, then the library, matched on movement
     pattern.
  2. Readiness load adjustment
     Readiness comes from the wellness check-in; with no recent
     check-in it is estimated from that athlete's sRPE trend
     (labelled "tahmin" wherever it shows).
       Model A — scales the written load (e.g. low readiness → 85%)
       Model B — writes an RPE target, kg left to the day
     Either or both; every adjustment is printed on the program.
  3. Tiers (kademe)
     3–4 tiers, each with its own volume multiplier, RPE shift
     and maximum exercise difficulty. Assigned by hand in
     Athletes → Profile; never auto-assigned.
  4. Profile axes
     Position group (guard / wing / post), body type
     (Cheetah / Horse / Rhino / Rabbit) and screening test
     results (ankle dorsiflexion, OHS, ASLR, Y-Balance) feed
     volume emphasis and substitution triggers. Tier +
     position + body type read as one profile key.

  5. Set / rep count (daily volume)
     Volume — not just load — is set from two inputs: today's
     readiness and yesterday's logged load, the latter read
     against that athlete's own 28-day daily mean. The two meet
     in an editable 3×3 rule table (⚙ Kurallar → Set / tekrar)
     rather than a weighted average, so the coach can read what
     each combination does. Reps move a fraction of the way the
     sets do, which turns 4×10 into 3×8 instead of 3×6.
  6. Pain reported on the daily survey
     When an athlete reports a painful region, every slot whose
     movement pattern loads that region is handled. Two
     responses, split by a severity threshold you set:
       at / above → the exercise is substituted, redirected to a
                    pattern that does not load the region (a knee
                    report sends a squat to a hinge, not to
                    another squat)
       below      → the exercise stays, sets and reps come down
     Both the structured picker in the wellness survey and
     Tally's free-text "Area of Pain" field feed this.

Every changed exercise carries a reason. Automatic changes write
their own ("Ankette diz ağrısı 3/3 bildirildi → Back Squat yerine
Trap Bar RDL"); a manual override gets a reason box that is asked
for but never required — the card shows how many changes are
still unexplained.

Programs export as branded PDF / printable pages in two versions,
for one athlete or for everyone with a program that day, over a
single day or a Mon-Sun week:
  Antrenör PDF — includes the reason recorded against every change
  Sporcu PDF   — exercise, sets × reps, load / RPE target, nothing else

Nothing is silent and nothing is forced. Every layer produces a
SUGGESTION with a visible reason chip, each can be switched off
per athlete, and every slot can be replaced either from the
library or with free text — an exercise name that exists
nowhere in the library is accepted exactly the same way.

"Sporcu takvimlerine yaz" writes the built programs into the
athletes' own calendars (re-running it updates in place instead
of duplicating). Coach notes on the athlete profile are shown
next to the name while building, but are never parsed by the
engine; keyword matches in them are offered as tag suggestions
that need your approval.

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
