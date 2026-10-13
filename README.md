# FY27 Digital Advocacy Journey · Cinematic edition

A 3D, film-style data story of the Alzheimer's Association FY27 digital advocacy results so far, built to present to field staff in trainings.

`index.html` is the whole thing: one self-contained file with fonts, data, map and libraries inlined. Open it in a browser (double-click works) or serve it with GitHub Pages. No internet connection is needed once the file is on the machine.

## What it shows

A 3D world framed by letterbox bars: a geographic map of the 50 states and DC floating over a dark mirror, plus separate stages for the month timeline, the pace rings and each state's diorama. Moving between the map and another stage fades to black and back, so one visual never sits on top of another.

| Chapter | Scene | What you see |
|---|---|---|
| Opening | FY27 so far | A vortex of light collapses into the action count, bursts, and draws the map |
| Opening | The first 100 days | Establishing shot of every state's FY27 light column |
| 01 Recruitment | The people on the list | One light per 100 advocates, placed in their state; advocates with no state on file float offshore |
| | Who joined since | New lights fall from the sky into their states |
| | Who showed up | Everyone who took action ignites gold and sends up a thread of light |
| 02 Action | A year ago, by state | Glass columns: the same days of FY26 |
| | This year rises | FY27 columns grow month by month inside the glass; rings mark last year's level |
| | One month made the year | Its own stage: FY26 months as glass panes, FY27 months as monoliths; September towers over all |
| 03 Growth | Almost every state is ahead | A gold sweep crosses the map lighting every state ahead of last year |
| | Where the volume sits | Spotlights on the top three states |
| 04 Engagement | List size is not engagement | The skyline morphs from volume to share of list that acted |
| 05 Channels | The under-used channel | Height becomes texts delivered; states with no texts pulse gold |
| (optional) State tour | Any states you pick | The camera dives into the state, then cuts to its diorama: the original edition's landmarks, capital pin and scenery, restaged on a dark glass plateau and reflective pedestal, graded into a cinematic palette, lit by one of six themes (forest, farm, desert, mountain, city, coast), with real facades and lit windows on the towers, surface grain on every landmark, a night ground of fields, streets, ridges or dunes with lit towns and highways, rising city blocks, a close glide to the signature landmark, a title card and the monthly numbers as light pillars |
| Pace | Against all of last year | Its own stage: two rings against a gold "today" blade |
| Close | Keep up the momentum | Finale with the three headline numbers |

## Presenting

- **Keys:** → next, ← back, space pause or resume, F full screen. The Full screen button does the same.
- **Pause and look around:** while paused, drag to orbit and scroll to zoom.
- **Explore a state:** pick one from the menu; "Back to story" returns you where you were.
- **Build tour:** tick states in order and press Apply. They are inserted after the Channels chapter. Copy link gives a URL like `index.html#tour=NJ,TX` that opens with that tour.
- **Performance:** the page starts at high quality and steps itself down if the machine cannot keep up. Force a level with `?q=low` or `?q=high`. Projectors and laptops with integrated graphics may want `?q=low`.
- **Reduced motion:** if the operating system asks for reduced motion, scenes appear in their final state and the story does not auto-advance.
- **No WebGL:** the page falls back to cards with the headline numbers.

## Updating the numbers

All figures are computed from `src/data.json` (exported from Quorum). The story text is in `src/app.js`; nothing numeric is hardcoded in captions.

1. Replace `src/data.json` with the new export (same shape as today's file).
2. Run `node tools/build.js` (Node 18 or newer, no packages needed).
3. Commit the regenerated `index.html`.

## Source layout

```
index.html          built, self-contained page (this is what you open or publish)
src/template.html   page skeleton
src/style.css       letterbox HUD, cards, overlays
src/app.js          3D engine and the story
src/states3d.js     state dioramas: the original edition's 51 landmark specs and builders, ported intact, plus a cinematic restyle pass
src/data.json       Quorum export (asOf, national, states)
src/geo.json        simplified Albers USA state shapes (from us-atlas, U.S. Census boundaries)
src/meta.json       state nickname, capital and description copy
src/fonts/          Houschka Alt Pro (brand font)
src/vendor/         three.js r128 and its post-processing examples (MIT)
tools/build.js      assembles src/ into index.html
tools/make-geo.js   rebuilds src/geo.json (only if the map changes)
```
