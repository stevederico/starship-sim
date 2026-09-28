# Summary: Steel Ascent

The Starship orbital viewer is now a launch game. It's committed **locally only** on branch `feature/launch-game`, version `0.2.0`. Nothing has been pushed, because this repo is public. Nothing has been deployed.

## What's playable

**Full mission, start to finish:**

1. Countdown.
2. Ascent with a max-Q air load limit.
3. Staging window.
4. Stage separation.
5. Booster catch in the tower arms.
6. Ship burn to a 150 km orbit, then cutoff.
7. Scored results, then restart.

**Screens:**

- Title
- Flight HUD with prompts
- Pause (P, Esc, or the button)
- Results, with rank S to F and a line-by-line score

**Scoring (10,000 max):**

- Fuel: 3,000
- Accuracy: 3,000
- Catch: 4,000

**Failure paths all play out and still reach results:**

- Airframe breakup
- Tower strike
- Ground impact
- Booster lost (the ship still flies on)
- Ship out of fuel or reentry

**Other features:**

- A demo flight that guidance flies. Open it from the title screen or with `?demo=1`.
- Best score and mute setting are saved in `localStorage`.

**Controls:**

- Desktop: A/D steer, W/S throttle, Z/X full or cut throttle, Space to stage or cut off.
- Phone: arrow buttons, a draggable throttle bar and an action button.

**Visuals:**

- The original ship and Earth are reused.
- Everything new is generated in code:
  - Tower and arms
  - Booster
  - Shader sky, ground and coastline
  - Clouds
  - Exhaust, smoke and explosions
- All audio is synthesized with WebAudio.
- The player-facing name is original. "Starship" and "SpaceX" appear only in internal file names and the repo name.

## How to run

```bash
bun install
bun run dev      # http://127.0.0.1:5173/
bun run test     # 64 unit tests, all passing
bun run build    # static dist/, 1.8 MB, JS 323 kB gzipped
```

## Screenshots

Screenshots are in `docs/screenshots/`:

1. Title
2. Ignition
3. Max-Q
4. Stage separation
5. Catch approach
6. Booster caught
7. Orbit burn
8. Results
9. Phone ascent
10. Phone catch

## How it was tested

**Unit tests (`node --test`)** cover:

- Physics
- Each flight phase
- Scoring
- The full mission state machine
- HUD model
- Controls

**Tuning simulations:**

- Guidance catches the booster from 300 out of 300 random approaches.
- A simulated sloppy pilot finished 40 out of 40 runs. It had up to 0.45 s reaction lag and a 2.5° deadband, and averaged 8,400 points.

**In the browser (agent-browser, Brave):**

- A full demo flight ran with zero console errors.
- A full flight driven by real key presses scored 8,278 (rank A).
- A hands-off failure run ended in a booster crash and ship reentry.
- Pause and resume worked.
- Touch steering and throttle drag worked with emulated pointer input.
- The layout worked at 1280×800 and 390×844.
- The production build loaded all 7 assets with HTTP 200 and no errors.

## Known gaps

- **Audio was never heard.** Browser tests ran in a background tab with no user gesture, so sound code ran without errors but nobody listened to it.
- **No real-device run.** Nothing was tested on a physical phone, in Safari, or in Firefox. Frame rate on low-end phones is unmeasured.
- **Frame timing was stepped for tests.** Background tabs get no animation frames, so browser tests stepped frames by hand through a dev-only hook: `?step=1` and `window.__step`. Production builds don't include it. Real-time pacing was only checked in the unit-tested sim.
- **The catch is a separate scene.** It starts with the booster already 2 km over the tower. The flight back from staging isn't simulated.
- **Flight is 2D with cinematic scale.** The orbit view speeds up Earth's rotation so speed reads well on screen.
- **One large JS chunk.** It's 1.16 MB, and Vite warns about chunks over 500 kB. It loads fine, but three.js could be split out if load time matters.
- **Reused assets.** Textures come from the earlier Grok Imagine work, and Earth is NASA Blue Marble (public domain). See `public/assets/ASSETS.md`.

## What Steve needs to do

1. **Review.** Run `git log --oneline master..feature/launch-game`, then play it with `bun run dev`.
2. **Decide on the public repo.** `stevederico/starship-sim` is public and its name uses a trademark. Rename it, make it private, or push as is. Merge and push only when you're happy.
3. **Local tag.** A `0.2.0` tag exists locally. Push it with `git push origin 0.2.0` if you want it on GitHub.
4. **Build.** Run `bun run build`. `dist/` is static and uses relative paths, so it works at a domain root or under a sub-path.
5. **Analytics (optional).** Set `VITE_ANALYTICS_ID` in `.env` before building to turn on dottie analytics. The game sends `game-start` and `game-over` events and sends nothing on localhost.
6. **Publish.** Publish `dist/` through Grok Build to a subdomain such as `steel-ascent.grok.me`. Avoid "starship" in the subdomain. My notes don't describe the Grok Build publishing steps, so I didn't guess them.

## Browser test helper

`scripts/play-browser.mjs` replays a demo flight through agent-browser and screenshots chosen moments. It needs the dev server running. Usage is in the file header.
