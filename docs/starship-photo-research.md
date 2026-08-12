# Starship photo research (upper stage / Ship)

**Goal:** photo-backed visual spec so a later mesh pass can look like the real orbital Ship.  
**Not in scope:** Super Heavy, HLS legs, tanker/depot, interiors, Imagine “Starship” stills.

**What “look exactly like it” means here:** match the **photo-visible traits of the current orbital Ship** (Block 2 is the flown visual baseline as of 2026-08; V3 is announced with fewer public stills). It does **not** mean a new vehicle class, photogrammetry, or a purchased CAD/glTF.

Sim claims Block 2 in `src/constants.ts` (`SHIP_HEIGHT = 52.1`, `SHIP_RADIUS = 4.5`, `RING_HEIGHT = 1.83`).

---

## Photo inventory

All image URLs below returned **HTTP 200** and `image/jpeg` on 2026-08-12. File pages also 200. Fetch log: `fetch.log`. Local copies: `refs/` (CC / NASA PD).

Dropped: fan art, AI exploded views, Super-Heavy-only landing shots, distant stack ignition that does not resolve Ship features (e.g. IFT-5 stack ignition on Commons). Official SpaceX Flickr album page is **HTTP 200** but this pass did not isolate a Ship-only still from that album (JS/album UI). `spacex.com/vehicles/starship`, `/updates`, `/launches/starship-flight-13` are **HTTP 200** (JS shells).

### 1. Starship S20, leeward full vehicle

| | |
|---|---|
| **URL** | https://upload.wikimedia.org/wikipedia/commons/3/3a/Starship_S20.jpg |
| **Page** | https://commons.wikimedia.org/wiki/File:Starship_S20.jpg |
| **Source** | Wikimedia, own work, DimaLopatin1999. CC BY-SA 4.0. |
| **Date** | 2021-12-31 |
| **Vehicle / gen** | S20 / SN20. Proto-orbital tiled Ship. **Pre-Block-1 / Block 1 lineage** (first fully tiled orbital prototype). Not Block 2. |
| **Visible** | Full upper stage, nose-on-leeward. Unpainted stainless barrel with **circumferential weld rings**. Ogive nose, windward hex tiles wrapping onto the tip and spilling past the meridian as a **jagged stairstep**. Four flaps extended: **forward pair high on the payload/nose, aft pair low on the engine/LOX barrel**, roughly **180° left/right** on this generation. Aft flaps much larger. Forward flaps smaller, trapezoid, tiled on the windward face. Vertical raceway (orange pipe) on leeward. Circular ports / hardpoints. Tile terminator is **not** a clean half-cylinder. |
| **Local** | `refs/01-starship-s20.jpg` (798086 bytes, 200) |

### 2. SN15 forward flap and nosecone

| | |
|---|---|
| **URL** | https://upload.wikimedia.org/wikipedia/commons/1/11/Starship_SN15_flap_and_nosecone_%2851437260707%29.jpg |
| **Page** | https://commons.wikimedia.org/wiki/File:Starship_SN15_flap_and_nosecone_(51437260707).jpg |
| **Source** | Flickr Lars Plougmann → Commons. CC BY-SA 2.0. https://www.flickr.com/photos/criminalintent/51437260707/ |
| **Date** | 2021-09-05 (SN15 era, suborbital hop ship) |
| **Vehicle / gen** | SN15. **Suborbital prototype**, steel flaps, **no hex tiles** on this flap. Ancestor of Block 1 flap geometry, not Block 2 leeward 140° flaps. |
| **Visible** | One **forward flap**: large stainless plate, **not a box**. Trapezoid / truncated triangle, rounded leading/trailing edges, **panel seams** across the face, **thick root**, dark gap at the **hinge** (aerocover / hinge pocket). Flap sits on the ogive, not on the straight barrel. Body is rolled stainless gores with rivet/spot rows, not a smooth lathe. |
| **Local** | `refs/02-sn15-flap-nose.jpg` (218467 bytes, 200, 960px thumb) |

### 3. SN20 tile inspection, full windward

| | |
|---|---|
| **URL** | https://upload.wikimedia.org/wikipedia/commons/c/c6/Starship_SN20_getting_a_tile_inspection.jpg |
| **Page** | https://commons.wikimedia.org/wiki/File:Starship_SN20_getting_a_tile_inspection.jpg |
| **Source** | Flickr Lars Plougmann → Commons. CC BY-SA 2.0. |
| **Date** | 2021-09-05 |
| **Vehicle / gen** | SN20 / S20. Same proto-orbital tiled Ship as (1). |
| **Visible** | Windward almost fully black hex tiles from skirt to nose. **Leeward strip of bare stainless** visible as a vertical silver band. Forward flap high, aft flap low, both **tiled on the windward face**. Ogive + cylindrical barrel. Tile work in progress (colored stickers on nose). |
| **Local** | `refs/03-sn20-tile-inspection.jpg` (185031 bytes, 200, 960px) |

### 4. SN20 tile inspection, close-up (hex grid + flap)

| | |
|---|---|
| **URL** | https://upload.wikimedia.org/wikipedia/commons/c/c5/Starship_SN20_getting_a_tile_inspection_%28close-up%29_%2851432107025%29.jpg |
| **Page** | https://commons.wikimedia.org/wiki/File:Starship_SN20_getting_a_tile_inspection_(close-up)_(51432107025).jpg |
| **Source** | Flickr Lars Plougmann → Commons. CC BY-SA 2.0. |
| **Date** | 2021-09-05 |
| **Vehicle / gen** | SN20 / S20. |
| **Visible** | **Hexagonal black tiles** with hairline gaps; individual tiles missing (steel showing through). Tiles cover the **ogive and the forward-flap windward face**. Flap is a **thin swept plate** with a **hinge root / aerocover** at the body. Tile field stops at a **hard meridian** where bare stainless begins. Tip is a small tiled cap. |
| **Local** | `refs/04-sn20-tile-closeup.jpg` (140353 bytes, 200, 1280px) |

### 5. SN20 leeward detail (weld rings + tile wrap)

| | |
|---|---|
| **URL** | https://upload.wikimedia.org/wikipedia/commons/1/12/Starship_SN20%2C_detail_of_the_non-tiled_side_%2851437314772%29.jpg |
| **Page** | https://commons.wikimedia.org/wiki/File:Starship_SN20,_detail_of_the_non-tiled_side_(51437314772).jpg |
| **Source** | Flickr Lars Plougmann → Commons. CC BY-SA 2.0. |
| **Date** | 2021-09-05 |
| **Vehicle / gen** | SN20 / S20. |
| **Visible** | **Weld rings**: wide stainless bands with a dark circumferential weld, **not** thin wire tori. Leeward nose is **bare steel gores**. Windward tiles wrap onto the nose as a **jagged island**, then a full tile field down the barrel edge. Two forward flaps: one tiled (windward), one steel-faced (leeward). |
| **Local** | `refs/05-sn20-leeward-detail.jpg` (204366 bytes, 200, 960px) |

### 6. SN20 static fire (Ship on pad, engines lit)

| | |
|---|---|
| **URL** | https://upload.wikimedia.org/wikipedia/commons/c/ca/SN20_Static_Fire_test_on_10-21-2021_at_19-16-00_From_SPI_by_Mars_Embassy.jpg |
| **Page** | https://commons.wikimedia.org/wiki/File:SN20_Static_Fire_test_on_10-21-2021_at_19-16-00_From_SPI_by_Mars_Embassy.jpg |
| **Source** | Mars Embassy US, own work. CC BY-SA 4.0. |
| **Date** | 2021-10-21 |
| **Vehicle / gen** | SN20 on the suborbital/orbital pad. Distant. |
| **Visible** | Confirms the **ogive-nosed Ship** (not a booster) firing. Plume under the vehicle. **Does not resolve** bell count or flap detail. Boosters and tower in the background (context only). |
| **Local** | `refs/06-sn20-static-fire.jpg` (238545 bytes, 200, 1280px) |

### 7. S20 on suborbital pad (NASA) — aft flap, rings, RVac bell

| | |
|---|---|
| **URL** | https://upload.wikimedia.org/wikipedia/commons/b/b6/Ship_20_on_suborbital_pad.jpg |
| **Page** | https://commons.wikimedia.org/wiki/File:Ship_20_on_suborbital_pad.jpg |
| **Source** | **NASA** via @NASAArtemis, 2021-12-21. Public domain (NASA). https://twitter.com/NASAArtemis/status/1473409582341017606 |
| **Date** | 2021-12-21 |
| **Vehicle / gen** | S20. Official NASA still of the Ship. |
| **Visible** | Three-quarter view from below. **Windward tiles / leeward stainless** split. **Weld rings** as wide bands. **Aft flap** as a large hinged plate, tiled on the outer/windward face, steel inner, **hinge along the barrel** (not a floating box). **One large vacuum Raptor bell** hanging under the skirt (wide cone, much larger than a sea-level bell). Forward flap visible high on the nose, raised. People at the stand give scale. |
| **Local** | `refs/07-ship20-pad.jpg` (224992 bytes, 200, 960px) |

---

## Defining visible traits

Each fact is tied to a photo and/or a cited primary/secondary source. Memory-only claims are excluded.

| Trait | Fact | Source |
|---|---|---|
| Diameter | **9 m** (30 ft) barrel | Wikipedia *SpaceX Starship (spacecraft)* infobox and Design section; manufacturing: rings “welded … to create a cylinder of **9 m** diameter” citing Wang 2020. Matches photos 1, 3, 7 (barrel vs people / stand). |
| Ring height | **1.83 m** (6.00 ft) stacked stainless rings, ~**3.97 mm** wall | Same manufacturing paragraph, Wang 2020. Photo 5 and 7 show the **wide** circumferential bands (not hairline). Wikipedia: **twenty-one** such rings on the Ship. |
| Height (Block 2) | **52.1 m** (171 ft). Block 1 was **50.3 m** | Wikipedia spacecraft infobox / Design, citing Berger block article. Photos 1 and 3 are S20 (~Block 1 height class), not a measured Block 2. |
| Skin | Unpainted **stainless steel** on the leeward side | Photos 1, 5, 7. Wikipedia: “stainless steel structure is visible as well as the edges of the dark thermal protection tiles that cover the **windward** side” (caption on File:Starship_S20.jpg used in that article). |
| Heat shield | **Hexagonal black tiles**, windward-only; **~18,000** tiles; silica, pin-mounted, gaps for expansion | Photos 3, 4, 5 (hex grid, missing tiles, meridian cutoff). Count and materials: Wikipedia Design, citing Sheetz 2021 and Reichhardt 2021. **Not** a full wrap. |
| Nose | **Ogive**, not a cone or hemisphere. Windward tiles continue onto the nose; leeward nose is bare steel gores; small tiled tip cap | Photos 1, 4, 5. |
| Flaps | **Four** flaps: **two aft** (large, engine bay / LOX) and **two forward** (smaller, payload bay / nose) | Photos 1, 3, 7. Wikipedia Flaps: “two aft flaps mounted to the sides of the engine bay and LOX tank and two forward flaps on the payload bay.” |
| Flap shape | Thin **swept plates** (trapezoid / truncated triangle), panelized stainless, **hinge aerocover** at the root. Windward face tiled on tiled vehicles. **Not boxes.** | Photos 2 (shape + hinge), 4 (tiled flap + aerocover), 7 (aft hinge). Wikipedia: “The flap's hinges are sealed in **aerocovers**.” |
| Block 1 fwd flap angle | Forward and aft flaps sit roughly **left/right, ~180°** | Photos 1, 3, 5 (S20 / SN15). |
| Block 2 fwd flaps | **Thinner, more leeward, ~140°** (not 180°). Change after Block 1 heating / pitch-up. | Wikipedia Flaps / Block 2, citing NSF / Everyday Astronaut 2024. **No Commons still in this inventory shows a Block 2 140° pair** (coverage is thin; do not invent panel lines). |
| Engines | **3 sea-level Raptors + 3 Raptor Vacuum**. Vac bells are **visibly larger**. | Wikipedia Propulsion. Photo 7 shows at least one **large vac bell** under the skirt. Photo 6 shows a Ship static fire but does not resolve the 3+3 layout. |
| Hinge cameras / static wicks | Present on flight articles | Wikipedia Flaps. Not resolved in these stills. |
| Block 2 vs V3 | Block 2 = flown visual baseline (FT 7–11). V3 announced (Raptor 3, aft-flap actuator change) with **fewer public stills** than Block 1/2. | Wikipedia Block 2 paragraph; plan assumption 2026-08. Record as **unknown in photos**, do not spec V3 panels from memory. |

**Hard numbers for the sim (photo + cited text):**

- `diameter_m: 9`
- `ring_height_m: 1.83`
- `block2_height_m: 52.1`
- `sea_level_raptors: 3`
- `vacuum_raptors: 3`
- `flap_count: 4`
- `block2_forward_flap_included_angle_deg: 140`
- `tile_count_approx: 18000`

---

## Current sim vs photos

Code checked: `src/constants.ts`, `src/scene/Starship.tsx`, `hullProfile.ts`, `Flaps.tsx`, `EngineCluster.tsx`.

| Gap | What the sim does | What the photos / cited text require | Fails photo / trait |
|---|---|---|---|
| **Box flaps** | `boxGeometry` plates (`Flaps.tsx` sizes `[0.28, 8.4, 3.1]` aft, `[0.2, 4.2, 2.1]` fwd) | Swept trapezoid plates with panel seams, rounded edges, thick root | Photos 2, 4, 7 |
| **Fwd flap azimuth** | Fwd flaps at `±X` with `Math.PI/2 ± 0.4` — **~180° left/right** | Block 2: **~140° leeward**. Sim **claims Block 2** (`SHIP_HEIGHT = 52.1`) but draws Block 1 angles | Wikipedia Block 2 flaps; contrast photos 1/3 (Block 1 180°) |
| **No hinge aerocovers** | Flap mesh sits on the barrel with no sealed hinge fairing | Dark hinge pocket / aerocover at the root | Photos 2, 4, 7; Wikipedia “hinges are sealed in aerocovers” |
| **Tiles as a half-lathe** | `LatheGeometry(..., phiStart=0.42π, phiLength=1.16π)` — smooth ~209° wrap of the **same** hull profile, including a tiny steel sphere tip | Windward-only hex field with a **jagged meridian**; tiles on **nose windward + flap faces**; leeward nose **bare steel**; tip is a **tiled cap** | Photos 1, 3, 4, 5 |
| **Generic bells** | Six similar open cylinders, SL r=0.68 / Vac r=1.12, no skirt, no vents, no soot | 3 small SL + 3 **much larger** vac bells; photo 7’s vac bell dominates the underside | Photo 7; Wikipedia 3+3 |
| **Weld rings as wire tori** | `torusGeometry(radius+0.012, 0.02)` plus a repeating steel **texture grid** | **1.83 m tall** stacked cylinders with a real weld bead; 21 rings | Photos 5, 7; Wang 2020 via Wikipedia |
| **Missing leeward clutter** | Smooth lathe | Raceway, ports, COPV bumps, lifting hardpoints | Photos 1, 5, 7 |
| **Nose profile** | `cos(t * π/2)` to r=0.12 + 0.14 m steel ball | Blunter ogive, tiled windward cap, steel leeward gores | Photos 1, 4, 5 |
| **Generation mix** | Labeled Block 2, looks like a generic Block 1 silhouette | To “look exactly like it” for the **current orbital Ship**, adopt **Block 2** height **and** Block 2 fwd-flap leeward 140° (even though Block 2 close-ups are scarce). Do not draw HLS or Super Heavy. | Infobox vs `Flaps.tsx` |

Constants that **already match** the cited spec: 9 m diameter, 1.83 m rings, 52.1 m Block 2 height. The miss is **shape**, not the three numbers.

---

## Unknowns (do not invent)

- V3 Raptor 3 bells and aft-flap actuator fairings: announced, not inventoried here as stills.
- Exact Block 2 forward-flap planform (diamond trailing edge is reported on forums; **no Commons photo in this set**).
- Precise tile count on a given Block 2 ship after crunch-wrap / ablative changes (FT4+).
- Official SpaceX Flickr Ship-only stills: album page live, individual Ship files not extracted this pass.

---

## Official pages checked (200, not used as stills)

- https://www.spacex.com/vehicles/starship
- https://www.spacex.com/updates
- https://www.spacex.com/launches/starship-flight-13
- https://www.flickr.com/photos/spacex/
- https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)
