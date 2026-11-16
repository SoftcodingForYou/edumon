# Edumón

An educational creature-collecting game in Spanish for children aged 4–6, in the spirit of the
classic Game Boy monster-collecting games. All creatures, names, art, sounds and music are
**original**: never add Pokémon/Nintendo names, characters, sprites, music or their specific look
(not even "for testing"). Mechanics of the genre are fine.

## Product requirements (from the client)

- Two modes, chosen when starting a new game:
  - **Normal**: free roaming in an open world with an empty Edudex plus one starter companion
    (choice of three). Wild Edumón are chased and met in the world. To fight, the child picks
    one of their caught creatures from a list (name + picture). Fights are turn-based, each
    creature has one representative attack. After winning, the star ball ("bola estrella",
    unlimited) catches it.
  - **Fácil** (for 4-year-olds): no fights, just throw the star ball (unlimited). The catch chance
    goes down with the Edudex number (92% → 18%); after breaking free it may run away (5% → 35%).
- 151 creatures: #145–150 are legendaries living at fixed spots, #151 is a rare mythical.
- Edudex: names and portraits stay hidden ("???") until met. Star-ball icon = caught,
  eye icon = only seen.
- Save slots ("partidas"): each new game gets a name, which must be unique (case-insensitive).
  Everything is stored in the browser's `localStorage` and the chosen slot is always overwritten.
  The Edudex (seen/caught) is saved on every change. The exact game state (player position and
  direction, wild creatures, legendary cooldowns, random generator, step counter) is saved every
  5th step, after every battle and when the game is left, hidden or closed. Loading a slot resumes
  exactly there; a brand-new game starts on a random road.
- Two worlds; the map is chosen once when creating a game and stored on the slot (`SaveSlot.map`):
  - **Estaciones** (the original world): roads, grass, tall grass (random encounters), mountains
    with stairs and a snowy peak, beaches (water creatures; no swimming), two volcanoes, lake with
    island, river, forest. Its zones are the 7 habitats (creatures live by `habitats`).
  - **Santiago**: an abstract Santiago de Chile with 13 districts (comunas), one per type; only
    creatures of that type live there (`Zone.type`). Santiago Centro = Normal, Cajón del Maipo =
    Fuego (Volcán San José), Vitacura = Agua (Parque Bicentenario lagoon), La Florida = Planta,
    Estación Central = Eléctrico (railway), Lo Barnechea = Hielo (Farellones), Puente Alto = Roca,
    Pudahuel = Aire (airport), La Pintana = Bicho (farmland), Recoleta = Fantasma (Cementerio
    General), Ñuñoa = Lucha (Estadio Nacional), Quinta Normal = Dragón (natural history museum),
    Providencia = Magia (Cerro San Cristóbal). Building roofs take the district's type colour,
    the world map tints the districts, and walking into one shows its name and type.
- In the world, creatures use generic sprites (land, bird, water, bug, ghost, plant) so their
  looks stay secret; battles and the Edudex show full-body portraits.
- Controls are minimal: arrows, A (default Space, shown as "Espacio"), B (default X; hold B to run), Q = menu (its own
  key, never the action button), E = Edudex, T = type chart ("Tipos", who is very effective
  against whom) and M = world map. Every button answers to exactly one key (no extra fallback
  keys); the only exception is typing a name, where Intro confirms, Esc goes back and Retroceso
  erases (letter keys write letters there). All keys can be changed in Ajustes → Teclas. On-screen hints always show
  the key the player chose (or round buttons when playing by touch: ✓ for A, ✗ for B, ☰/E/T/M; a gamepad shows A/B); the HUD
  shows Menú, Edudex, Tipos and Mapa stacked top-right and they can be tapped. The in-game menu only
  manages the game and its settings (Ajustes, Salir, Seguir); the Edudex has its own shortcut. Touch D-pad + ✓ (A, green) / ✗ (B, red)
  buttons on tablets/phones — no letters, they confuse young children; gamepads also work.
- Reading: Ajustes → Letra switches between the clear "Fina" font (Andika, made for beginning
  readers; the default) and the retro "Píxel" font, and Ajustes → Mayúsculas shows every text in
  capitals (default off). The goal is to teach reading, especially the creature names, so names
  are never cut off: they shrink to fit (`FitText` in `ui.tsx`).
- Battles: every attack type has its own animation and sound (flames, bubbles, leaves, lightning,
  falling rocks, "¡ZAS!"...); very effective hits shake the screen; a knocked-out creature shows
  dizzy stars ("K.O.").
- React + TypeScript + Vite (npm), runs in any modern browser.

## Commands

- `npm install` · `npm run dev` · `npm run build` · `npm run preview` · `npm test` · `npm run typecheck`
- `npm run export-art` regenerates the portrait PNGs in `src/art/` (`001-chispin.png` …, 224×224;
  `npm run export-art -- 1` for the original 56×56). Run it after changing creature art or names.
- Test URLs (throwaway save, nothing stored): `?demo=world|battle|dex|types|map|slots|new` with
  optional `&sp=25&mode=easy&biome=4&caught=12&team=1,4,7&font=pixel&upper=1&map=santiago`
  (`biome=7` is the city battle background). `?debug` exposes the world state as `window.__edu.world`.

## Architecture (src/)

- `game/` – `creatures.ts` (roster as evolution families; numbers are assigned in list order),
  `elements.ts` (types + type chart), `battle.ts` (damage and catch math), `save.ts` (slots and
  settings), `rng.ts`.
- `art/` – `raster.ts` (shape rasterizer with automatic outline/shading), `creatureArt.ts`
  (14 archetypes → 56×56 portraits), `sprites.ts` (hand-drawn 16×16 player, generic creatures,
  star ball), `assets.ts` (browser image caches).
- `world/` – `maps.ts` (`getWorldMap(id)`), `mapgen.ts` (the Estaciones world from `WORLD_SEED`),
  `santiago.ts` (the Santiago world: districts, rivers, landmarks, city blocks), `mapkit.ts` (shared
  generator steps: roads, cliffs/stairs, reachability), `tiles.ts` (terrain, biomes, zones, map ids,
  `canStep` movement rule), `tileArt.ts`, `world.ts` (simulation: movement, zone-based spawning,
  encounters), `renderer.ts` (canvas drawing).
- `system/` – `keys.ts` (buttons, default keys, key → button, labels, rebinding), `input.ts` (layered
  input handlers, key capture, keyboard/touch/gamepad source), `audio.ts` (Web Audio SFX, per-type
  attack sounds, original chiptunes).
- `components/` – React screens: TitleScreen, SlotMenu, NewGame, Play (saving/resuming, HUD),
  WorldView, Battle, AttackFx (attack effects + KO stars), CreaturePicker, Dex, TypeChart,
  WorldMapView, SettingsPanel, KeyBindingsPanel, TouchControls, shared `ui.tsx` (Menu, TextBox,
  KeyCap hints, type badges with icons).

## Conventions

- The game is called **Edumón** (accent on the o; plural stays "los Edumón") in all player-facing
  text and docs. Code identifiers, the npm package name and the `edumon.` storage keys stay ASCII.
- All player-facing text is Spanish, short and encouraging. There is no voice-over (the client
  removed text-to-speech because it didn't sound human); don't add it back.
- Every screen/overlay listens with `useInput(handler, LAYER.x)`; the highest layer wins.
- Never hard-code key names in hints: use `<A />`, `<Bb />`, `<Qq />`, `<Ee />`, `<Tt />`, `<Mm />`, `<DirKeys />`
  (they follow the player's key bindings and input device).
- The stage is 768×576 logical px (world canvas 256×192 drawn at 3×), scaled to fit the window.
- iOS Safari can wipe canvases when memory runs short (this caused a black world after battles).
  Don't keep big long-lived canvases: the world background is copied each frame from plain
  `ImageData` (`getMapPixels`), the world gets a fresh canvas and sprites whenever it shows again
  (`refreshWorldArt`), and temporary canvases are freed with `releaseCanvas`.
- Font sizes in `styles.css` are written as `calc(Npx * var(--fs, 1))`: `--fs` shrinks the wider
  fine font so both letter styles fit the same boxes. Check new screens in both styles and in capitals.
- Edudex numbers come from the order of `FAMILIES`, and saves store those numbers: inserting or
  reordering creatures changes what existing saves point to. Keep the order stable.
- Saved world states only load into the exact same generated map (`WorldMap.id`). A test pins a
  checksum of Estaciones: changing its generator moves every saved player. Santiago's district
  order (`DISTRICTS`) is its zone numbering; keep it stable too.
- `npm test` checks the roster, rules, saves and world (e.g. every portrait fits its frame,
  every legendary home is reachable).
