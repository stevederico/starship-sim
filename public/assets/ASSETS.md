# Assets

| File | Role | Source |
|---|---|---|
| `space-equirect.webp` | Sky + environment map | Grok Imagine |
| `steel.webp` | Brushed 301 stainless | Grok Imagine (even-light edit) |
| `tiles.webp` | Hex heat-shield tiles | Grok Imagine |
| `plume.webp` | Raptor exhaust still | Grok Imagine (in-engine UV flicker; video API blocked) |
| `earth-day.jpg` | Earth albedo | NASA Blue Marble (`land_shallow_topo_2048.jpg`, public domain) |

Ship mesh is code (lathe + flaps + 3+3 bells). Imagine does not emit glTF.

Tile map is used once across the windward lathe (no wrap) because a 2x2 composite showed hex-grid seams.

## Game additions (code only)

The launch game adds no image or audio files. It's all generated at runtime:

- Booster, tower, tank farm and launch mount: Three.js primitives
- Sky, ground, coastline and haze: GLSL shaders
- Clouds: canvas-drawn sprite
- Exhaust plume, smoke and fire: shaders and a particle pool
- Engine roar, beeps, clang and explosions: WebAudio synthesis
