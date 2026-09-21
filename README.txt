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

The copy itself is still verbatim. Nothing on the sheet is
substituted, scaled, floored or flagged behind your back — every
number on it is either the one the template carries or the one you
typed on that card, and block count and block order are never
changed.

The AI session described further down is a separate, opt-in thing:
it is written per athlete, only when you ask for it, and it reaches
nobody until you press Write.

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
Individualization card. The chip names the region and nothing
else: severity is the COLOUR it is drawn in (amber Hafif, orange
Orta, red Fazla), with the word on its tooltip — spelling the
grading out beside every region made the card a wall of text
before the eye could find the body part. A region the grid already
shows in the athlete's own words is not repeated as a second chip
in the tag vocabulary.
See CHECKIN_SETUP.md for the form side.

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


DAILY INDIVIDUALIZATION — THE COACH'S BRIEF
-------------------------------------------
Open an athlete's card on the Individualization tab and the panel
under their name reads in three acts, each with its own heading.

Act 1 is COMPUTED and is there whether or not you have an AI key: a
row of tiles for readiness, the competition day (MD-1, MD+1 …), the
season phase, the 7-day internal load with ACWR, the minutes played
in the last game, and the volume adjustment the readiness table
calls for. A tile carries a meter where its number is a ratio
against a known limit (readiness out of 5, the cut against its
floor) and a coloured edge for its state — always beside the word
for that state, so nothing is left to colour alone.

Act 2 is the brief. Seven fields, each its own small card, laid out
three across — 1-2-3, the constraints row, 5-6-7 — so no row ends
in an empty cell, folding to two columns and then to one on a
narrow screen. The number on each card is a badge in ONE colour:
seven colours read as seven categories, and these are not
categories, they are the order you fill the brief in. None of the
fields is required — an empty field is not a constraint, it is
ignored:

  1. Today's priority — a dropdown of twenty qualities grouped the
     way a coach thinks about them (Strength, Speed & movement,
     Movement quality, Energy systems, Maintenance / rehab). Add a
     second and a third with "+ Add another priority".
  2. Must be in — exercises, content or targets the session has to
     carry. Type and press Enter; each one becomes a chip.
  3. Keep out — the same, for what must not appear today.
  4. Constraints — a multi-select dropdown of twelve limit types
     (load, volume, time, intensity, impact/jumps, speed, range of
     motion, direction, region, no contact, unilateral, other).
     Hover one and a box opens with what it means, how a coach says
     it, and the programming behaviour it asks for. That last line
     is the exact sentence shipped to the model with your request —
     what you read and what it is told are the same sentence. A
     free-text box under the dropdown takes anything finer.
  5. Session length — minutes, with 30 / 45 / 60 / 75 / 90 to hand.
  6. Exercise ceiling — how many exercises at most (4 / 6 / 8 / 10).
     It binds the MAIN phase only. The preparation and complementary
     phases sit outside it and are never skipped: they are where the
     athlete's measured gaps get closed.
  7. Notes — anything else that matters today.

Act 3 is the session that comes back. "Build the session" hands all
of it — the brief, the computed picture, pain, injury and RTP
status, recent exposure, the findings read off the test battery,
the patterns pain has ruled out and the ones still open, the sport
the squad plays and what its game asks for, the team session
planned for the day, your exercise library, the gym's equipment
inventory with its counts and weights, and the club's thirty
knowledge-database rules as they read at that moment — to the
model, and it writes a session in PHASES
(preparation · main work · complementary), with sets, reps, load,
rest and a reason for every exercise.

The exercise does not have to come from your library. Anything the
model writes that is not in there is marked "custom" and carries a
"+ add to library" button on its row: press it and the exercise is
filed exactly as one typed on a programme, with its movement
pattern, so the next session can pick it from the library.

PAIN CLOSES A PATTERN, IT DOES NOT JUST TRIM IT
A region reported at moderate severity or worse (2 or 3 on the
check-in's grid) takes the movement patterns that load it OUT of
the session — not reduced, gone. Knee pain at that level means no
knee-dominant work: no squat pattern, no lunge, no jumping, with
the stimulus kept through the patterns the pain table redirects to.
The rule is computed from the check-in and shipped as a ban list;
an exercise that breaks it is reported under Checks before you
write anything.

THE SESSION IS WRITTEN FOR THE GAME, THE ROLE AND THE ATHLETE
A session that would suit anybody suits nobody. The sport set on
the Settings tab now goes to the model with what its game actually
does to the people who play it — how long the efforts last and how
much recovery sits between them, how far the sprints really are,
how take-offs and landings happen, which planes the work lives in
— and the qualities that decide it. Basketball is written out in
full: 10-25 second possessions with partial recovery, sprints
mostly under 10 m so the first step outweighs top speed, jumps off
one leg from a single step, landings that are contested and
unplanned, hard stops in every position, and a defensive stance
that lives in the frontal plane. The other sports carry the two or
three lines that change an exercise choice; a sport with no entry
passes its name through and nothing else.

Beside it sits what the POSITION does inside that game, which the
app already kept, and the athlete's own numbers. The prompt is
explicit about the order: the three are meant to point the same
way, the athlete's own data wins when they do not, and position
decides only between two options that are otherwise equally good.
An exercise with no transfer is not allowed to be written — every
movement has to answer either a demand of the game or a measured
gap, and "general strength" is not an answer.

ONE MOVEMENT FAMILY, ONE SLOT IN THE MAIN PHASE
Squat and Lunge are two movement patterns and one FAMILY: both are
knee-dominant, both spend the same tissue on the same quality. A
main phase carrying a Goblet Squat and a Goblet Split Squat has
used two of its slots once — and a check written pattern by
pattern waves that straight through, because the two patterns
really are different. So the rule is written against families:

  knee-dominant      Squat · Lunge / Unilateral
  hip-dominant       Hinge
  upper-body push    Push
  upper-body pull    Pull
  loaded carry       Carry
  trunk / rotation   Rotation · Core / Brace
  jump / plyometric  Jump / Plyo
  sprint             Sprint / Locomotion
  mobility           Mobility

AT MOST ONE EXERCISE PER FAMILY IN THE MAIN PHASE. A four-exercise
main phase comes from four different families — a lower-body
loading (knee OR hip), a push, a pull, and whatever the day's
priority calls for. Where pain has closed a family, the freed slot
goes to another family that is still open rather than to a second
exercise from the same one; the patterns left on the table are
shipped with the request so the model can see what it has to work
with. If the open families genuinely run out before the exercises
do, the answer has to say in one line which family repeats and
why. Preparation and complementary work sit outside the rule:
repeating there is fine when it closes a measured gap.

A main phase that carries two of one family anyway is listed under
Checks by family and by exercise name, before you write anything.

THE COACH'S NOTES ON THE TEST SHEET ARE READ TOO
The battery is not only numbers. What you wrote in the posture box,
the overhead-squat box, the five compensation slots beside it, the
FMS box and the test note goes to the model VERBATIM — a note reads
better whole than as a list of matched words. On top of that, the
compensations coaches write most often are matched here and become
findings with the work they call for, the same as a measured one:

  "dizler içe geliyor" / knee cave -> hip abductor and external-
      rotator strength, landing mechanics, single-leg control
  "topuklar kalkıyor" / heels lift -> ankle dorsiflexion mobility
  "kollar öne düşüyor" / arms fall  -> lat and thoracic mobility
  "ağırlık sağa kayıyor" / shift    -> unilateral work, weaker side first
  "bel çukuru / lordoz"             -> anterior core, hip-flexor length
  "butt wink / bel yuvarlanıyor"    -> hip flexion mobility, neutral control
  "skapula kanatlanması / winging"  -> scapular control, serratus & lower traps
  "sağ omuz düşük"                  -> unilateral work aimed at the asymmetry
  "pronasyon / düz taban"           -> intrinsic foot control, ankle stability
  "torakal kifoz / yuvarlak omuz"   -> thoracic extension and rotation
  "öne eğilme"                      -> hip & ankle mobility, upright-torso control
  "baş öne"                         -> deep neck-flexor control, thoracic extension

Matching survives Turkish inflection ("topuk kalk" finds "topuklar
kalkıyor"), and where a note says what a measurement already said,
the finding is listed once. What the table misses still reaches the
model in the note itself, and the prompt asks for every observation
that names a problem to be either answered by an exercise or
explained in the coach warning.

The card shows what was read: a "Read off the battery" row of chips
under the tiles, one per body area, the high-priority ones
highlighted, each chip's tooltip carrying the finding and the work
it asks for, and the ones that came from your notes marked "note".

THE TEST BATTERY IS READ BY CODE
"Look at the test results" is not left to the model. The latest
test is read here against the thresholds the app already uses —
ankle dorsiflexion under 35°, ASLR or overhead squat at 1/3, FMS
shoulder mobility at 1/3 or a posture note naming the thoracic
spine, a Y-Balance reach difference of 4 cm, a 10% bilateral
difference, a drop-jump RSI under 1.5 — and each finding goes to
the model with the KIND of work it calls for. Every high-priority
finding has to be answered somewhere in the session, and one that
is not is listed under Checks by name. Exercise choice is asked to
be the one the literature supports for that quality, with the dose
that matches it, and to say which finding or stimulus it serves.

WHAT STAYS IN CODE
The model does not touch the arithmetic. Readiness, the volume
adjustment, the days to the next game, the exposure counts and the
baseline deviations are all computed here and handed over finished,
and the readiness cut is applied BY CODE after the answer arrives:
the model writes the session a normal day would carry, and the app
takes the percentage off it. Where that moves a row, the card shows
"4×6 → 3×6" and the bold number is the one that gets written.

The app also checks the answer against things it can count: the
main-phase exercise ceiling, a movement family used twice in the
main phase, the gym's inventory, the patterns pain has closed, the
pain-to-movement-pattern table, your own "keep out" list and the
high-priority findings from the battery. Anything that
does not line up is listed under Checks, on screen, before you
write anything.

NOTHING IS WRITTEN UNTIL YOU WRITE IT
While a session is sitting there unapproved, that athlete's
calendar is HELD: neither the AI session nor the plain copy of the
team session is written for them. "Write to the calendar" approves
it and puts it on their own calendar in one press, replacing their
copy of that day's session rather than adding a second one. A day
you have since edited by hand is never overwritten without asking.
"Rewrite" asks for another session against the same brief;
"Discard" throws the session away and keeps the brief.

EQUIPMENT INVENTORY (Settings tab)
----------------------------------
The gym, written down once, with a WEIGHT and a COUNT beside each
item.

The count is what makes the list useful for a squad rather than
one athlete: six barbells and one trap bar is a different session
from one barbell and six trap bars, and a programme written for a
squad has to know which it is.

The weight is what makes it useful for a PRESCRIPTION. A rack
whose heaviest dumbbell is 12 kg cannot hold a senior's heavy day,
and "3 x 6 @ 40 kg" written into it is not a session. So a line is
an item AT a weight, and a gym holds as many lines of one item as
it has weights worth naming: 6 x 10 kg dumbbells and 4 x 22.5 kg
dumbbells are two lines of the same kit.

Type a number to put something in the inventory; 0 means you do
not have it; leave the weight blank and no weight limit is applied
to that line. "+ Add equipment" opens a small form — pick the item
type (or "Other" and type a name), give it a weight and a count,
and it is added as its own line underneath the standard ten, with
an x to remove it again.

Sessions written on the Individualization tab use only what is in
here. An exercise needing a trap bar is not offered to a gym with
none; the count tells the model how many athletes can be on one
piece at the same time; and the weight tells it how far a line can
be loaded, so it does not prescribe past what the gym owns. Where
the load IS the implement — a dumbbell, a medicine ball — a
prescription heavier than the heaviest one in the inventory is
also reported under Checks before you write anything. A barbell or
a machine is not checked that way: its plates and its stack are
not on this list, so its own weight says nothing about the ceiling.

An empty inventory applies no equipment constraint at all, which
is what it has always meant.


COACHOS AI ASSISTANT KNOWLEDGE DATABASE (Settings tab)
------------------------------------------------------
The thirty rules the AI-assisted programme writer works to, on a
screen where they can be read, edited and argued with. They cover
the club's whole programming logic: the decision order, the inputs
read before anything is written, movement-pattern taxonomy, speed
and deceleration, plyometric dosing, strength by age group,
biological maturation, position, sex, the menstrual cycle, season
phases, the match week, load monitoring, ACWR, readiness
thresholds, pain, sequencing, equipment, time, constraints,
team-to-individual work, the decision tree, the mistakes to avoid
and the underlying philosophy.

They open as titles only, two to a row — thirty opened rules is
not a page anyone reads. Click a title and the rule opens full
width: title, rule text, and a REFERENCES box underneath for the
studies it rests on. Everything saves as you type. A rule you have
changed is marked, and "Reset to default" puts the seeded text
back. "+ Add rule" adds one of your own, and only your own can be
deleted.

THE RULES ARE LIVE. They are not compiled into the assistant; they
are read at the moment a session is generated. Correct a rule this
afternoon and the programme written a minute later follows the new
wording — nothing to reload, redeploy or re-install. Every
generated session is written against them, the references go over
with them, and the model is asked to cite the rules that decided
the session by number in its rationale.


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
  - Settings tab: set new dates, competitions, model.
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

If the upload fails nothing is said on screen — no popup, no notice.
The failure is logged to the browser console and that is all.

The picture then stays in the synced data itself, as it always did
before Storage existed: it reaches the coach's other devices, just
slowly, because the whole state is re-sent on every edit. The app
keeps retrying — right after each load, and every few minutes (a
failed round stands down for half an hour; reloading clears that) —
and the moment Storage accepts the write the picture becomes a short
URL and sync is fast again.

A photo is never left living in one browser's storage alone. Only a
video is kept device-side under a "local:<id>" handle, because tens
of megabytes in the state would make it undeliverable.

So it is worth fixing the cause. It is almost always the Storage
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
