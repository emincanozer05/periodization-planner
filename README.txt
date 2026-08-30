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

You can also change WHICH exercises are on the sheet, not just
what they say:
  - "+ Add exercise", in each block's header, puts an extra empty
    slot at the end of that block for this athlete only. Fill it
    in like any other slot; it is marked "added", it is numbered
    with the rest of the block, and the source session is never
    touched. An added slot left empty is simply ignored.
  - "✕ Remove", on every slot, takes the exercise off this
    athlete's program. On a slot the template wrote, the row stays
    on the card, dimmed and marked "removed", so you can type
    something else in or ↺ Reset it back — it is just left out of
    what gets written and exported. On a slot you added yourself
    there is no template to go back to, so the row goes away.

What you can edit on every slot:
  - the exercise itself (pick from the library or type any name;
    a name that exists nowhere in the library is accepted the
    same way). Clearing the box does the same thing as ✕ Remove.
  - the superset group, in front of the exercise, exactly as in
    the template editor: slots sharing a letter read A1, A2, A3…,
    ungrouped slots keep their own 1., 2., 3.
  - the movement pattern and how it is executed, under the
    exercise name. Pick the pattern first; the execution list
    follows it:
        Hip Dominant      Push · Pull · ISO · Eccentric
        Knee Dominant     Push · Pull · ISO · Eccentric
        Upper Body Push   Vertical · Horizontal · Rotational
        Upper Body Pull   Vertical · Horizontal · Rotational
        Core              Flexion · Extension · Lateral Flexion ·
                          Rotation · Anti-Flexion · Anti-Extension ·
                          Anti-Lateral Flexion · Anti-Rotation
        Accessory         Push · Pull · ISO · Eccentric
    Changing the pattern clears an execution that does not belong
    to the new one. This pair is what the calendar's Load
    Distribution counts (see below).
  - sets, reps, time, tempo, RPE, load and rest, side by side in
    one strip
  - a reference link (video / cue clip), above the note. It starts
    from whatever the template attached and is yours to change per
    athlete — point one athlete at a different clip without moving
    the template or anyone else's sheet. It stays a small "Add
    link" chip until the row has one; ↗ opens it from the card.
    Both PDFs carry it as a clickable chip next to the exercise
    name (printing to PDF keeps it as a real link, not just text),
    and it rides into the JSON as `link`. Only http/https links
    are exported.
  - ↺ Reset puts the slot back to exactly what the template says

What the card SHOWS you (read-only context for those edits, in
this order across the header):
  - whatever the athlete reported on the check-in's pain grid
    (region + Hafif/Orta/Fazla) and typed into its pain box, in
    their own words, plus the regions either one matched
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
  Coach PDF   — carries the session notes and marks which exercises
                differ from the template
  Athlete PDF — exercise, sets × reps, load / RPE target, nothing else

⭳ JSON exports the same programs machine-readably for one athlete
or the whole selection: the template's own block order, one row
per slot ({block, slot, superset, pattern, execution,
template_exercise, prescribed_exercise, changed, added, sets, reps,
time, tempo, rpe, load, rest, note, link}). "added" marks a row you put
on the sheet yourself, which the source session does not carry.

WELLNESS HEATMAP (Load Monitoring tab)
Athletes × the last 14 days, one box per day, coloured by the
metric picked in the header (Readiness / Sleep / Fatigue /
Soreness / RHR) and sorted by average.

PAIN ON THE GRID
The daily check-in asks "Ağrın hangi bölgede ve şiddette?" as a
matrix: one row per body region, one column per severity (Hafif /
Orta / Fazla). Whatever the athlete ticks shows up INSIDE that
day's own box:
  - a pip in the corner, coloured by the WORST severity reported
    that day — yellow Hafif, orange Orta, red Fazla — carrying the
    number of regions when more than one was ticked
  - the box's ring takes the same colour
  - hovering names every region with its own severity, plus
    anything the athlete typed into the free-text pain box
It is independent of the metric on screen: a marked region flags
the day whether you are looking at Readiness or at RHR. Region
names are kept exactly as the form words them, so a region the app
has no tag for (Boyun, Göğüs, Karın…) is still reported rather
than dropped. A day with pain and no scores behind it still gets
a row, at the bottom — there is no average to rank it by.
Where the app DOES recognise a region (Bel/Sırt → back, Omuz →
shoulder, Kalça/Kasık → hip…) it also becomes a pain chip on the
Individualization card, with the severity carried over.
See TALLY_SETUP.md for the form side.

PROGRAM WRITER (athlete profile → Program tab)
Writes a week of training from scratch for ONE athlete. It reads
five inputs and nothing else:
  1. POSITION → which movement patterns get the emphasis, from the
     position→pattern reference table (guard / wing / post, on the
     same grouping the Individualization screen uses). The regions
     each group is watched for are read straight off the assistant
     coach's own position bias, so the two cannot drift apart.
  2. BODY TYPE (Cheetah / Horse / Rhino / Rabbit) → where on the
     speed-strength spectrum the emphasis sits. The rules are the
     ones printed on the athlete profile's own animal cards.
  3. SCREENING BATTERY + PERFORMANCE TESTS → the STRUCTURAL TIER,
     by weakest link: overhead squat, ASLR, ankle dorsiflexion, the
     Y Balance per-direction reach difference and the largest
     bilateral difference are each scored passes / limited / fails
     on the cut-offs the app already uses elsewhere (35°, ≤1 of 3,
     4 cm, 10%), and the tier is the LOWEST of them — never the
     average. One failed screen holds the whole program at Tier 1.
     The tier is what sets the volume and complexity baseline:
     sessions per week, exercises per session, sets, RPE / %1RM
     range, which variations are allowed and how many plyometric
     contacts the week may carry.
  4. TODAY'S REPORTED PAIN → the patterns that region loads are cut
     or dropped and work is redirected to the ones the pain →
     pattern map prefers. Both the check-in's own report and the
     constraint tags you are managing the athlete for count.
  5. THE 7-14 DAY WELLNESS / RPE TREND → two seven-day windows side
     by side (readiness, fatigue, soreness, sleep, RHR, weekly load,
     ACWR, day-by-day RPE), plus the list of signals that crossed a
     threshold the app already uses. High accumulated fatigue keeps
     the starting volume conservative. It is a trend, never one
     morning.
No reference rule is invented: the position mapping, the body-type
rules, the tier cut-offs and the pain → pattern map are all sent
along with the athlete's data, and any input the athlete has no
data for is NOT programmed around — it lands in "manuel inceleme"
with the reason, so you can see exactly which decision was skipped.
Exercises are not limited to your library.

Press "◫ Program yaz" and the result is stored on the athlete: the
tier and its rationale, the days with their exercises (set×rep,
load/intensity, pattern tag, a short note), the patterns that were
excluded, and a summary. "📄 Programda kullanılan veri" opens the
exact JSON the answer was written from. Nothing is written to a
calendar — putting it on a program sheet stays your action. Needs
an API key, the same one the ✨ AI Coach Assistant uses.

LOAD DISTRIBUTION (Calendar tab, team and per athlete)
The "Load Distribution" panel under the calendar reads the week or
the month and draws ONE treemap, not two pies:
  - every movement pattern (Hip Dominant, Knee Dominant, Upper
    Body Push, Upper Body Pull, Core, Accessory) is a box sized by
    its share of the period, labelled with its name and %
  - INSIDE each box sit that pattern's executions — Push, Pull,
    ISO, Eccentric, Vertical, Horizontal, Anti-Rotation and the
    rest — each its own box, in a shade of the pattern's colour.
    So "how much hip work" and "which flavour of it" are read in
    one glance instead of matched up between two rings.
  - work tagged with a pattern but no execution shows up inside
    the pattern as a dark "not set" box, so it is never silently
    folded into the executions that were tagged.
Tap any pattern box and it grows to fill the panel, re-laying its
executions across the whole area with each one's share OF THAT
PATTERN. The ⊖ button in the corner (or another tap on the box)
goes back to all patterns.

Opening a pattern also writes the EXERCISES themselves inside the
boxes: each execution box lists the exercises performed that way,
most prescribed first, with a ×count each — so the names sit in
the coloured box they belong to rather than in a list beside the
figure. A box shows as many as it is tall enough to hold and ends
with "+n more"; hovering it names them all. Work with no execution
is listed the same way inside the "not set" box. The same exercise
typed two ways counts once (case is ignored).

WHERE THE PATTERNS COME FROM
Three sources, in this order of authority:
  1. the pattern/execution tagged on an exercise from the
     Individualization card — always wins
  2. the SHARED LIBRARY. Five of its Exercise Types are movement
     patterns (Upper Body Push, Upper Body Pull, Hip Dominant,
     Knee Dominant, Core), and for those five the sub-type is how
     the pattern is executed — contraction for Hip/Knee, plane for
     Upper Body Push/Pull, the core quality for Core. So an
     exercise written straight into a team session, with no tag on
     it at all, is still counted and still named, as long as it is
     in the library. Types that are not movement patterns
     (Warm-Up, Full Body, Medicine Ball, Plyometric, Multi
     Directional Speed, Mobility) resolve to nothing on purpose —
     filing them under a pattern they do not train would be worse
     than leaving them out.
  3. the pattern/plane picked for a whole SESSION on the muscle
     model. This counts toward the boxes but names no exercise,
     since a session-level pick names none.


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


PHOTOS, VIDEOS AND SYNC SPEED
-----------------------------
Every picture and video belongs in Firebase Storage, NOT in the
synced data. The whole app state is one JSON document split into
Firestore chunks, and that document is rewritten on every edit —
a photo pasted into it as base64 is re-sent in full each time,
which is what makes sync crawl.

The app therefore uploads media to Storage and keeps only the
short download URL in the state.

If the upload fails nothing interrupts you — there is no popup.
The cloud status line in the sidebar carries a quiet note ("Fotoğraflar
bu cihazda tutuluyor"), and it clears itself the moment an upload
gets through.
Nothing is lost and sync speed is NOT affected: the file is put
in the browser's own store (IndexedDB) and the state carries a
short "local:<id>" handle instead. The app retries — right after
each load and every few minutes — and as soon as Storage accepts
the write, the handle is replaced by a real URL and the picture
appears on the coach's other devices too. Old base64 still sitting
in the data from earlier versions is lifted out by the same pass.

Until then the file exists only on the device that uploaded it,
so it is worth fixing the cause. It is almost always the Storage
security rules:

  1. Firebase Console → Storage: make sure the bucket exists
     (periodization-planner.firebasestorage.app).
  2. Publish the rules in storage.rules (repo root):
       firebase deploy --only storage
     or paste that file into Console → Storage → Rules → Publish.
  3. Reload the app. Waiting photos upload on their own.

storage.rules allows a signed-in coach to write only under
users/<their uid>/ and leaves reads public, because download URLs
end up in printed sheets and shared PDFs that are opened without
signing in.

A backup export always contains the pictures themselves, device-
held ones included, so a backup is complete whatever the cloud is
doing.
