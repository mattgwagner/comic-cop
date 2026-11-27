# Comic Cop

A comic-book spelling game in one HTML file. Officer Biscuit, a police dog, works four cases. Pick one on the title screen; closing a case queues the next one.

## Case 1: The Mis-Spell Ray

Baron Von Squeak, a rat inventor, scrambled every word in town. Five chapters:

1. **Downtown:** an auto-runner. Jump the robo-rats (land on one to bonk it) and grab pizza. At each zapped billboard, tap the misspelled word, then pick the right spelling.
2. **Pizza Palace:** each order is a sentence with a missing word. Spell it by tapping the pepperoni letters in order, or by typing. Bonk the rats that run for the pizza boxes.
3. **The Midnight Express:** a homophone shows up at the top (to / too / two, their / there / they're, …). Steer the K-9 Express onto the track with the right word before the signals arrive.
4. **Chef Clanky's Pizza Party:** pick the door with the right spelling. Chef Clanky, a broken animatronic, creeps up the hallway; tap him to flash the flashlight (three flashes per room). The wrong door has a robo-rat behind it.
5. **Squeak-Bot 3000:** a boss fight. Answer before the ray charges; every right answer lands a hit.

## Case 2: The Great Letter Heist

Captain Caw, a pirate crow, steals letters out of words. Four chapters, each with its own move:

1. **Rooftop Snatch** (catch): a word is missing one letter, the one its common misspellings get wrong. Move left and right to catch the right letter as the crow drops them, and dodge rotten eggs.
2. **Pizza Box Tower** (stack): compound words. The top box has the first half; tap the other half to stack it and build up to the crow's nest. The wrong halves never make a real word.
3. **The Ghost Train** (hide): contractions. Punch the ticket with the right short form (do not → don't); the choices are the right one, one without the apostrophe, and one with it in the wrong place. Mr. Clatter, the ghost conductor, sweeps the car with his lantern; hide behind the seat in time. A wrong ticket calls him early.
4. **The Caw-Ship** (pop): plurals boss. Pop the balloon with the right plural (puppies, foxes, mice, knives). A miss shows the rule (change the y to i and add es, …).

## Case 3: The Snipper

The Snipper, a crab barber with scissor claws, snips the fronts and backs off words. Four chapters, each with its own move:

1. **The Glue Factory** (aim and shoot): prefixes and suffixes. A word base rides the conveyor and a meaning clue shows ("not happy"). Fire the glue gun at the right piece (un-, re-, dis-, pre-, -ful, -less, -ly, -er) before the base reaches the Snipper. No wrong piece makes a real word with its base.
2. **The Haunted Library** (search): silent letters. The word shows with its ghost letter missing (_nee, w_ite); sweep the flashlight over the dark shelves and tap the letter that fills the gap. Wrong letters get a shush; three shushes and the librarian ghost throws a book.
3. **Coaster Switchback** (throw the switch): -ed/-ing endings (hopping/hoping, making/makeing, cried/cryed). Pull the lever toward the right spelling before the coaster reaches the split; the wrong track goes through the Spooky Tunnel. The split timer stretches to the player's median answer time.
4. **The Snip-Sub** (patch the panel): mixed review boss. Tap the piece that patches the snipped panel before the scissors close. Three wrong snips cost a heart; six patches sink the sub.

From the second miss on, Case 3 feedback adds a one-line rule ("Short vowel + one consonant? Double it: hop → hopping"). Closing Case 3 unlocks the Barber Pole Hat.

## Case 4: The Grab-Bag Bandit

Rummage, a raccoon cat-burglar with a striped shirt and a swag bag, grabs everything that isn't nailed down: vowel pairs, -er and -est, and the apostrophes that say whose stuff is whose. Four chapters, each with its own move:

1. **The Claw Arcade** (position and drop the claw): vowel teams. The word shows with its vowel pair missing (r__n); move the claw (mouse, or ◀ ▶) over the right capsule and drop it (click, the DROP button, or SPACE). A wrong capsule pops open on a squeaky robo-raccoon and costs a heart. No wrong team makes a real word in the gap (`VOWEL_BLOCK` lists the real words that ruled a team out).
2. **Size-o-Matic Podium** (drag and drop into order): -er/-est. The base word sits on the 3rd-place step; drag the right spellings onto 2nd and 1st (big → bigger → biggest), or click a card and then its step. Wrong cards are the common misspellings (biger, happyer, niceer) and none is a real word.
3. **Rummage's Hideout** (sneak): possessives. Hold the mouse button (or SPACE / →) to tiptoe while Rummage snores, and let go when his eyes open (the light turns red). At each pile, tag the stolen thing: the picture shows one owner or three (dog's / dogs' / dogs; children's, mice's, geese's at Chief). A wrong tag or getting caught costs a heart.
4. **Trash Truck Getaway** (tug): mixed review boss. Biscuit has a rope on the truck's bumper. Each right answer is a big pull; while a question is open the truck drags the rope back (timer stretches to the player's median answer time). Three slips cost a heart. Pull the truck to the flag line to win.

From the second miss on, feedback adds a rule tip ("ai in the middle, ay at the end: rain, day.", "Ends in y? Change it to i: happy → happier.", "One owner: dog's. More than one: dogs'."). Closing Case 4 unlocks the Bandit Mask.

## All cases

- **Levels:** Rookie (grade 2 words and homophones), Detective (adds grade 3, the default), Chief (adds grade 4). Set on the Grown-ups screen.
- **Learning model:** each word or homophone sentence has a Leitner box (0–4). A first-try answer in under 15 s moves it up a box. A miss drops it to 0, and it comes back three questions later. Picks favour low boxes and the current level's tier. Train and boss timers stretch to the player's median answer time. Case 3 and 4 items have their own key prefixes (`a:`/`s:`/`e:`, `v:`/`c:`/`p:`) on the same path, and the Grown-ups screen counts them.
- **Feedback:** after a miss the right spelling is shown with the letters that were wrong highlighted. Homophones also get a one-line meaning ("their means belongs to them").
- **Badges:** 31 badges on the 🏅 Badges screen (title). One per case, one per chapter (a clean run: no misses, or no lost hearts on the chapters where you get hurt), Full Squad Car (three villains), Need a Bigger Car (all four), streaks, Zoomies (fast answers), mastery counts off the Leitner boxes, Chief-level wins, and a couple of silly ones. Stored as `badges` in the save; on load, badges for cases already in `solved` and words already learned are awarded quietly. The mid-play toast is a `pointer-events:none` div, so it never takes a tap or focus. `?debug&test=badges` opens the screen.
- **Read aloud:** the 🔊 button reads the sentence when the browser has a speech voice installed.
- **Hat Locker:** pizza earned in play buys hats for Biscuit.

Progress lives in localStorage (`comiccop.v1`). Art and sound are drawn and synthesized in code (Canvas 2D + Web Audio); the only network fetch is two Google Fonts (Bangers and Andika).

## Run locally

```sh
bun server.ts                # http://127.0.0.1:4850
HOST=0.0.0.0 bun server.ts   # reachable from other devices on your network
```

Or open `public/index.html` in a browser.

## Test

```sh
npm run check   # content check, save-migration check, badge check, then plays all four cases headless (Playwright + /usr/bin/chromium)
CASE=4 node e2e/play.mjs /tmp/shots              # only Case 4 (ONE=1 = only Case 1)
CASE=4 VW=1180 VH=820 node e2e/play.mjs /tmp/ipad # iPad-sized screenshots
```

`e2e/content.mjs` (node, no deps) checks every row of the Case 3 and Case 4 banks (field counts, the right answer shown once, no wrong option equal to it or in the block lists, tiers, `*` in sentences, picture for every owner and thing). `e2e/migrate.mjs` seeds old saves and checks which case the title opens on (a v3 save that closed Case 3 opens on Case 4 once). `e2e/badges.mjs` checks retro awards for old saves, the `{}` default, chapter-badge rules, and the badge screen at 1920px and 400px (pass a dir to save screenshots). `play.mjs` fails if a closed case did not award its case badge.

`?debug` exposes `window.__cc`. `?test=street|pizza|train|clanky|boss|rooftop|tower|ghost|blimp|glue|library|coaster|snipsub|claw|podium|hideout|truck` jumps straight to a chapter, `?test=win` shows the end card, `?test=badges` opens the badge screen, and `&speed=3` runs game time faster.

## Deploy

Static assets on Cloudflare Workers. Pushing does not deploy:

```sh
npm run deploy
```
