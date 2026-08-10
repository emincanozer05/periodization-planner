============================================================
 PERIODIZATION PLANNER — Sport Science Tool
============================================================

PROGRAM INDIVIDUALIZATION (Individualization tab)
-------------------------------------------------
One source session, one editable sheet per athlete, instead of
writing 15 separate programs by hand. Pick a date, pick a source
(a team session planned for that date, or a Template), pick the
athletes, and every selected athlete gets that session copied
onto their own card.

There is NO rule engine and no automatic adjustment of any kind.
Nothing is substituted, scaled, floored or flagged behind your
back — every number on an athlete's sheet is either the one the
template carries or the one you typed on that card. Block count
and block order are never changed.

Every box is yours, empty included: clearing one clears it, it
does not spring back to the template's value. ↺ Reset is the only
thing that restores a slot, and it restores the whole slot.

What you can edit on every slot:
  - the exercise itself (pick from the library or type any name;
    a name that exists nowhere in the library is accepted the
    same way). Clear the box and the exercise is DELETED for this
    athlete: the row stays on the card, dimmed and marked
    "removed", so you can type something else in or Reset it, but
    it is left out of what gets written and exported.
  - the superset group, in front of the exercise, exactly as in
    the template editor: slots sharing a letter read A1, A2, A3…,
    ungrouped slots keep their own 1., 2., 3.
  - sets, reps, time, tempo, RPE, load and rest, side by side in
    one strip
  - a note for this athlete, and — when you change the exercise —
    an optional reason that gets printed on the coach copy
  - ⇄ Alternatives keeps a short list of stand-ins on the slot;
    "Apply" writes the one you pick into the slot
  - ↺ Reset puts the slot back to exactly what the template says

What the card SHOWS you (read-only context for those edits, in
this order across the header):
  - whatever the athlete typed into the check-in's pain box, in
    their own words, plus the regions it matched
  - yesterday's session RPE and the internal load (sRPE ×
    duration) it came to
  - soreness and fatigue from the latest check-in (1-5, 5 = good)
  - today's readiness score, coloured by band. It comes from the
    wellness check-in; with no recent check-in it is estimated
    from the athlete's own sRPE trend and labelled "estimate"
  - coach notes from the athlete profile
None of it moves a number by itself. Reading it is your job;
acting on it is your decision.

Programs export as branded PDF / printable pages in two versions,
for one athlete or for everyone with a program that day, over a
single day or a Mon-Sun week:
  Coach PDF   — includes the reason you recorded against a change
  Athlete PDF — exercise, sets × reps, load / RPE target, nothing else

⭳ JSON exports the same programs machine-readably for one athlete
or the whole selection: the template's own block order, one row
per slot ({block, slot, superset, template_exercise,
prescribed_exercise, changed, reason, sets, reps, time, tempo,
rpe, load, rest, note}).

"Write to athlete calendars" writes the sheets into the athletes'
own calendars (re-running it updates in place instead of
duplicating); the button on each card writes just that athlete.
Coach notes on the athlete profile are shown next to the name
while building; keyword matches in them are offered as tag
suggestions that need your approval.


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
