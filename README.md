# The Detective: the integrated edition

One package, one menu, three games, one campaign, built to be played by ear and to look as good as it sounds.

**Open `index.html` in Chrome or Edge, press Enter, and choose.** Use headphones.

| Key | Mission |
|---|---|
| 1 | The Balogun Case: walk the market, echo the drums, defend Tunde with the Constitution |
| 2 | Echo Detective: The Missing Ledger: a listening mystery with tells, nerve, a radio, a map and police checkpoints |
| 3 | Both detective cases, back to back |
| 4 | Siege of Ilesanmi: a war strategy game with fog of war, a double agent and timed decisions |
| 5 | **The full campaign**: Balogun, then the Ledger, then the Siege, with story between the missions and a saved record of your results |


## Install it, and what is new (this update)

**Install as an app (phone and computer).** Host the folder on any HTTPS site (GitHub Pages, Netlify, Cloudflare Pages, your own server) and open it. Chrome, Edge and Android show an **Install the app** button on the menu (or the install icon in the address bar). On iPhone and iPad use Share, then Add to Home Screen. Once opened online one time, the whole game (all sounds included) is saved and plays offline. Long-press the app icon for shortcuts straight into each game. A service worker needs HTTPS or localhost, so opening index.html from a file works as before but cannot install. Bump `VERSION` in `sw.js` whenever you change a file.

**Anticipation sounds (`js/suspense.js`, now switched on in every game).** A heartbeat that quickens as danger rises, a ticking clock, a drum-roll before the verdict, a dread drone in the night assault. New cues: a held breath before each drum pattern and a bell when it is your turn, a thin whine when a nervous person slips (press P), footsteps and a creak when the tout or Madam Ify approaches, a sly out-of-tune sound when a swindler is about to bite, and a rising chime when you catch a lie. Phones buzz on big hits. Switch off with `Tense.enable(false)`.

**Animation (`js/polish.js`).** A living night (twinkling stars, drifting haze, fireflies), a lit Lagos skyline that slides as you walk in Balogun, dust at your feet, screens that settle in, buttons that pop in one by one, a ripple under every tap, and a menu with sweeping searchlights and a glinting title. All of it respects the Visual effects switch and reduce-motion.

**Hidden distractors (decoys).**
- Balogun: two decoy stalls (Mallam's radio, the charm seller) hum with the real ones. A real stall hums a clean round note and a decoy buzzes; fall for one and you lose an hour. Fixer Segun sells you a name (Musa) that fits only two clues. A planted brass ring can be told apart by tapping it and listening. Naming the suspect now has a held-breath drum roll.
- Echo: Sisi, a gossiping water seller, spreads a false story about Pa Musa (break it with the night-passenger clue, or catch her tell), and a dripping umbrella is a clue that proves nothing. Citing either in your final case counts against you.

<<<<<<< HEAD
**Interface and accessibility pass (`js/ui.js`, plus Balogun layout fixes).** Balogun's top bar is now tidy (title, then stats, then the Voice and Language buttons in an even row on phones) and its action buttons share equal-width, centred, equal-height cells, with one column when the labels are long sentences. On Echo and Siege the caption bar no longer hides the buttons beneath it, and a tap folds it away. Every button is at least 44px tall for touch. Headings that take focus show a neat underline instead of a stray box, and the keyboard focus ring is the same everywhere. A round accessibility button (bottom right) gives touch players Where am I, Goal, Recap, Audio compass, Evidence board, Help, High contrast and Text size, which were keyboard-only before. Text size cycles 100, 115, 130 and 150 percent and is remembered.

=======
>>>>>>> 453f0b6e540dea0bc8557363cb63e7f511692591
## How this edition was assembled

Three uploads were merged. `the_Detective_U` was the complete edition and `the_Detective_1` was the same package without the siege game, so nothing needed reconciling. `detective_accessibility_upgrade_pack` was a prototype whose page only showed placeholder alerts and whose own README said a full implementation needed the whole source tree. Its seven ideas are now real features inside all three games.

## Accessibility, the same in every game

| Key | What it does |
|---|---|
| **Q** | Audio compass. Pings play from where things are (left, centre, right), then it says what each one is |
| **W** | Where am I. A one-breath summary of the scene |
| **G** | Goal. What you are trying to do now, without spoilers |
| **Y** | Recap. What just happened, so you can pick up the thread |
| **E** | Evidence board. Everything you know in a dialog you can read line by line (clues with their sources, casebook, or the intelligence board) |
| **K** | High contrast. Black, white and yellow with thick outlines and a bright focus ring |
| **F** | Partner mode. A large-print panel for a sighted partner, timers 60 percent longer, and "talk it over" prompts at big decisions |
| **?** | Help, with switches for contrast, partner mode, idle reminders and visual effects |

Also: if you do nothing for a while, the game quietly restates your goal (switch off in Help). Settings are remembered and carry from the menu into each game. Works with the built-in voices or your own screen reader.

## Atmosphere

Danger shows as a red vignette that pulses faster and harder as it rises: Heat and the clock in Echo, running out of hours in Balogun, night and failing morale in the Siege. Add film grain, a quick dark cut between scenes, and cinematic bars for the accusation and the night assault. All of it switches off with Visual effects, with your system's reduce-motion setting, and in high contrast.

## Details by game


Open **index.html** (double-click it, any modern browser). Press Enter / tap once, and the intro music starts.

## Files
- `index.html`            Menu shell: plays the intro, hosts both cases, "Play both" campaign
- `games/balogun.html`    Case 1, The Balogun Case
- `games/echo.html`       Case 2, Echo Detective: The Missing Ledger
- `js/sfx.js`             NEW shared audio manager + the full-screen SLAP effect
- `js/traffic.js`         NEW traffic chase scene (used by both cases)
- `sounds/`               your 7 sounds (renamed without spaces)

## Where each sound plays
| Sound                    | When |
|--------------------------|------|
| Intro sound              | On the menu (every time you return) and on each case's title screen, until the case starts |
| Slap                     | The Chief (Chief Eze / Chief Bello) is accused |
| Sad tune                 | A wrong person is accused, or the case is lost / the culprit escapes |
| Clap                     | A right decision: correct answers, objections, confrontations, correct accusation, final win |
| Emotional damage         | A trick catches you out (Balogun: the tout's fake envelope; Echo: Madam Ngozi's trunk tip, the Chief mocking a failed confrontation; Traffic: missing the culprit's trick) |
| Cars on the highway      | Loops during the traffic chase |
| Why are you running      | The police catch up with the culprit |

## Controls
Menu: 1 / 2 / 3, M = sound on/off, Alt+M inside a case = back to menu.
Traffic chase: Left/Right (or A/D, or tap) change lane, Space counters the culprit's trick, S skips after one failed try.

## What changed in this update
- `js/people.js` (NEW): animated SVG people. They breathe, blink, walk, talk (mouth and hand gestures), wave, blush, get angry or sad, and slow-dance.
- Balogun: Ada walks with a real walking cycle; every stall keeper, the courtroom (Magistrate, Prosecutor, Inspector, Tunde) and the suspect line-up are animated. Bello runs when you name him.
- Love story, Balogun: Kelechi Nwosu, a radio reporter, meets you in the market (3 choices). The hearts you earn give bonus hours, he cheers you on in court, and the dawn epilogue changes with your hearts (distant nod / date / slow dance).
- Love story, Echo: Tobi, the jetty ticket clerk who hums a highlife tune you can hear by ear. Talk to him (2 romantic questions), he checks on you in Act 2, and the sunset epilogue changes with your hearts.
- Fixes: the text panel no longer hides the answer buttons; the duplicate title bars are gone when played from the menu; every "press Enter" moment now has a Continue button so mouse and touch players are never stuck.

## Accessibility: assisted mode (on by default, T switches it)
- Traffic chase: slower traffic, spoken "Go left / Go right" guidance, spoken progress ("Closing in"), 6 seconds to counter a trick, small penalties. S skips the chase at any time, including before it starts.
- Court objections: no timer in assisted mode. With it off you get ten seconds AFTER the question has been read. O or 1 objects, Space or 2 lets it pass.

## What changed in this version

**Decoys that reward critical thinking**
- Echo Detective, Act 2: Bola, an eager errand boy, claims Sani left his post at midnight. It is a planted lie. Break it by confronting him with the clue that contradicts it (Sani's midnight greeting, not the bell, which anyone could pull), or by catching his nervous tell. Citing his claim as proof costs points.
- The Balogun Case: Madam Ify rushes out with a tip against Chief Eze that fits three of your four clues. Believe it and you waste an hour; test it against your clues and you uncover why she lied.

**Livelier animation**
- People now have real joints (shoulders, elbows, hips, knees), breathe, blink at irregular gaps, glance around and shift their weight. No two people move in step.
- Speech uses uneven syllables, nods and beat gestures. Walks ease in and out instead of snapping on and off, and characters now walk into a scene instead of appearing.
- The slap now has a wind-up, an impact flash and a settling shake.

**Fixes**
- Returning to the menu with Alt+M now puts keyboard focus back on the menu, so 1, 2, 3 work immediately.
- A delayed "time is up" screen can no longer overwrite the accusation, the verdict or the chase.
- Shaking the screen no longer drags fixed elements with it.

## Lagos city layer (new)

**Radio (press B).** Lagos Radio 99.9 plays traffic and weather, news that reacts to what you have done, call-in shows and unconfirmed tips. Press B to tune in or hear the next bulletin; Shift and B turns it off. The traffic report is always true. Tips are labelled unconfirmed, and some are decoys, so check them against your evidence.

**Map and travel (Echo Detective).** The case board now shows a map of the district. Places take time to reach. Walk (slow, safe, cools Heat), danfo (cheap and quick, but police stop buses), okada (fastest, risky in rain) or ferry (the only way to the Far Shore). Roads change every trip: go-slows, rain and roadblocks. Without the radio you only get rough times; with it, exact ones.

**Heat (0 to 5).** Wrong accusations, bluffing and cracking people raise Heat. Time passing, walking, good answers and knowing your rights cool it. At 3 or more, checkpoints become likely. At 4 or more, people stall you and every question costs extra time. At 5, roadblocks are everywhere.

**Checkpoints.** An officer waves you down and makes a demand. Cite the correct Section of the Constitution to pass and cool Heat. A wrong answer costs time and raises Heat. "Settle am" (pay) is quick but costs reputation and gets reported on the radio.

In The Balogun Case, Heat and checkpoints happen on the street as you walk, and the radio works while walking. The map and travel belong to Echo Detective, where you move between districts.

## Game 3: Siege of Ilesanmi, reforged (press 4 in the menu)

A war strategy game you play entirely by ear (headphones: West Gate on your left, North Wall ahead, River Gate on your right). You command a walled citadel against a besieging army. Hold out, break the enemy's will, or gamble on a grand sortie. This game was rebuilt so that every night is a puzzle with real trade-offs, not a guess.

**The day.**
1. **Dawn.** News from the enemy camp (you hear their weapons being built a day before they arrive), sometimes a hard decision (refugees at the gate, a merchant, fever, an envoy), then reports from your three informants.
2. **Orders (4 a day).** Defences (redeploy, fortify, build works, seal a breach), Intelligence (scout, question, bait, arrest the spy), Offence (burn supplies, burn one enemy weapon, burn ladders, parley, the grand sortie), Supplies (forage, rally, rations) and riders to hurry the relief army.
3. **Dusk.** You listen. Every enemy weapon has its own sound, panned to its sector: ladders rattle, rams thud, the siege tower groans, sappers scratch underground, boats splash. The dark lies about one time in four.
4. **Battle orders (2 or 3 command points).** Answer what you heard, sector by sector: boiling oil, fire arrows, a sally, or bracing the wall.
5. **The assault.** When a line is breaking you choose within seconds: commit the reserve, fall back behind the inner wall, or hold.
6. **Dawn after.** You learn who was right, what the dark hid, and what your answers achieved.

**The enemy's weapons and your answers**

| Weapon | Where | Arrives | Answers |
|---|---|---|---|
| Ladders | anywhere | day 1 | oil (partly) |
| Battering ram | West or River gate | about day 3 | oil, or a sally |
| Sappers | West or North | about day 3 | counter-mine (permanent), or a sally |
| River boats | River Gate | about day 4 | river boom (permanent), fire arrows, or a sally |
| Siege tower | North Wall | about day 5 | fire arrows (free with an archer platform), or a sally |

Oil is scarce, timber is scarce, so you cannot answer everything every night. Permanent works (archer platform, counter-mine, river boom) are the long-term answer. A weapon you burn needs three days to rebuild, and raiding the siege park does the same.

**The spy.** One of Adaora, Baba Sule and Kolade is the enemy's spy, chosen at random every game (the deserter is the most likely, but not always). After day 3 the spy feeds you false reports and tells the enemy about your defences. Question your informants (guilty men slip more often), whisper a bait ("this sector is thinly held") and see where the main blow falls, and read the running assessment (press I). When you are sure, arrest him. Arrest an innocent man and morale falls and you lose his reports for good. Once unmasked you can turn him and feed the enemy false plans.

**Breaches.** A breach is no longer instant defeat. It is an open wound: the enemy holds a foothold, morale bleeds, and you must seal it (1 order, 2 timber). A second open breach, or a line that is completely overrun, loses the citadel.

**Ways to win.** Survive until the relief army arrives (day 9 to 11, and each rider who gets through brings it a day closer, up to two). Break the enemy: burn his supplies and hold hard until his morale or army collapses. Or, once he is shaken (morale 4 or less, from day 5), launch the grand sortie: a gamble whose odds are read to you.
**Ways to lose.** Two open breaches or a sector overrun, the garrison mutinies, or the food runs out.

**Renown.** You earn it for holds, correct answers, burned weapons, unmasking the spy and winning. It decides your rank (Survivor, Defender, Legend). Hints cost renown.

**Difficulty.** Recruit (fairer fight), Commander (bigger army, weapons arrive earlier), Warlord (a vast host, scarce supplies, weapons arrive early).

**Keys.** 1 to 9 and 0 choose. Enter continues or skips speech. S status. I intelligence, including who the spy may be. M hear the menu. H hint. R repeat. L listen to the night again. T longer decision time. Esc back. Alt+M main menu.

Played with a built-in voice or your own screen reader (choose on the title screen).
