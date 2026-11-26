# Web dependency research

Research uses Exa Search and Contents against upstream documentation, HeroUI
MCP component and installation guides, and npm peer metadata. The installed compatibility set is recorded in `package.json` and
`pnpm-lock.yaml`. Use `pnpm install --frozen-lockfile` to reproduce it.

## Renderer and application

| Package | Installed line and responsibility | Integration requirement |
| --- | --- | --- |
| `vite`, `@vitejs/plugin-react`, `typescript` | Current compatible stable versions, React TypeScript application | Pin Node to a supported LTS satisfying both Vite and Vitest engines. Run `tsc --noEmit` separately because bundling does not prove type correctness. |
| `react`, `react-dom`, `@types/react`, `@types/react-dom` | React 19, matching runtime versions | Share one React dependency across DOM and Pixi renderers. |
| `pixi.js`, `@pixi/react` | PixiJS 8 and React binding 8 | The upstream binding supports React 19 and PixiJS 8. Its getting-started guide requires PixiJS at least 8.2.6. Use `Application`, `extend` and the binding's ticker hooks. |
| `@pixi/tilemap` | Version 5 for PixiJS 8 | Render terrain with `CompositeTilemap` and update dirty chunks. Version 5.0.2 sets the pair's PixiJS floor at 8.5.0. |
| `pixi-viewport` | A release supporting PixiJS 8 | Supply `app.renderer.events`, clamp world bounds and zoom. Register `Viewport` through `extend` and augment `PixiElements` with `PixiReactElementProps<typeof Viewport>`. |

The compatibility table explicitly pairs tilemap 5 with PixiJS 8. Validate the combined renderer in a browser spike that loads an actual atlas, pans and zooms, resizes, unmounts and remounts under React Strict Mode. Keep renderer objects outside save snapshots. [Pixi React setup](https://react.pixijs.io/getting-started/), [React bindings source](https://github.com/pixijs/pixi-react/), [custom element typing](https://react.pixijs.io/typescript/), [tilemap compatibility](https://userland.pixijs.io/tilemap/docs/), [viewport API](https://viewport.pixijs.io/api/), [Vite guide](https://vite.dev/guide/).

The implementation uses `@pixi/react` 8.0.5 and PixiJS 8.5.0 or newer within
major 8. The v8 binding supports React 19 and the 2D scene. The v9 package
advertises an additional 3D peer. `pixi-viewport` 6.0.3 and 7.0.3 both
declare a PixiJS 8-compatible peer. Confirm the selected viewport against
the canvas input and cleanup tests. [Binding v8 metadata](https://registry.npmjs.org/@pixi%2Freact/8.0.5),
[binding v9 metadata](https://registry.npmjs.org/@pixi%2Freact/9.0.0),
[tilemap v5 metadata](https://registry.npmjs.org/@pixi%2Ftilemap/5.0.2),
[viewport v7 metadata](https://registry.npmjs.org/pixi-viewport/7.0.3).

## HeroUI

Use `@heroui/react` 3 with `@heroui/styles` and Tailwind CSS 4. The existing package manifest already includes HeroUI 3.2.8 and React 19 groundwork. Add `@tailwindcss/vite` when configuring Tailwind's Vite integration. Resolve exact compatible versions together. Read component APIs with HeroUI MCP before implementing each screen. Apply the requested HeroUI design taste skill to semantic variants, spacing, focus, typography and accessible overlays. [HeroUI quick start](https://heroui.com/docs/react/getting-started/quick-start).

The existing `@heroui-pro/react` package needs its licensed artifacts and required peer set available during installs. Its installation guide requires React 19+, Tailwind 4 and OSS HeroUI. Import CSS in this order, then project theme overrides. Use the existing licensed installation locally and a CI-scoped `HEROUI_AUTH_TOKEN` secret when CI installs need artifacts. The guide identifies `react-resizable-panels` as required through `AppLayout`. Add component-specific optional peers only when the design uses those components. [HeroUI Pro installation](https://heroui.pro/docs/react/getting-started/installation).

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "@heroui-pro/react/css";
```

## Input

| Package | Responsibility |
| --- | --- |
| `react-dnd`, `react-dnd-html5-backend` | Connect inventory cells as native browser drag sources and drop targets. Preview against the same placement rules as the save command. [React DnD hooks](https://react-dnd.github.io/react-dnd/docs/api/hooks-overview/), [HTML5 backend](https://react-dnd.github.io/react-dnd/docs/backends/html5/). |
| `@surdeddd/wmkit` | Attach title-bar drag and viewport bounds to the shared HeroUI game dialog. [Window behavior](wmkit.md), [upstream API](https://github.com/Surdeddd/wmkit/blob/main/docs/api.md). |
| `react-hotkeys-hook` | Register title and world shortcuts in React and dispatch the semantic commands for the player's current bindings. [Upstream](https://github.com/JohannesKlauss/react-hotkeys-hook). |

## Gameplay and persistence

| Package | Migration use | Design decision |
| --- | --- | --- |
| `miniplex` | Entity storage and queries for actors, landmarks, items and effects | Own each character session's world explicitly. Keep systems as deterministic functions, serialize plain components and stable IDs. React bindings are optional. [Upstream](https://github.com/hmans/miniplex). |
| `rot-js` | Map generation, FOV, paths, schedules, lighting and names | Package name is `rot-js`. Import the requested modules through a project adapter. Preserve and restore RNG state around isolated generation work. Map module usage is specified in the migration plan. [Upstream](https://github.com/ondras/rot.js). |
| `zustand` | UI selection, active panels, focus, preferences and projected HUD values | Keep authoritative gameplay state in the session model, expose narrow selectors for React. Verify the selected release's React 19 peers. [Official introduction](https://zustand.docs.pmnd.rs/getting-started/introduction). |
| `dexie` | IndexedDB profiles, checkpoint snapshots and schema upgrades | Use a transaction for checkpoint and profile metadata updates. Store schema/content/generator versions. Handle failures and conflicting tab writers. Consider `dexie-react-hooks` if the character list needs direct cross-tab observation. [React integration](https://dexie.org/docs/Tutorial/React). |
| `simplex-noise`, `alea` | Seeded terrain and biome fields | Construct `createNoise2D(alea(derivedSeed))`. Give each field its own seeded generator and persist generator identity/version. Alea exposes state export/import for ongoing streams. Verify package type declarations and add `@types/alea` only if required. [Noise upstream](https://github.com/jwagner/simplex-noise.js), [Alea upstream](https://github.com/coverslide/node-alea). |
| `inkjs` | Branching dialogue and narrative | Preserve `.ink` sources and compiled story JSON. Verify compiled Ink format compatibility with the selected runtime. Save story state alongside the checkpoint. Compile authored story content as a reproducible build step. [Upstream](https://github.com/y-lohse/inkjs). |
| `gsap` | Movement interpolation, combat hits, effects and UI transitions | Animate presentation from simulation events. Cancel timelines at screen/session teardown, honor reduced motion, and keep action execution tied to simulation time. Core numeric-property tweens suffice for initial Pixi work. Add `@gsap/react` only if DOM animation lifecycle usage warrants it. [GSAP docs](https://gsap.com/docs/v3/). |

## Test dependencies and checks

Use `vitest` for deterministic model tests and `fast-check` for generated seeds, map connectivity, path validity, inventory transactions, RNG resume and save round trips. Record the fast-check seed and shrink path on failure. Add `fake-indexeddb` for Node tests of Dexie transactions and upgrades. Use real-browser checks for actual persistence, rendering and input. [Vitest guide](https://vitest.dev/guide/), [fast-check introduction](https://fast-check.dev/docs/introduction/).

Before committing dependency changes, inspect each candidate's `engines`, `peerDependencies`, exports and license through registry metadata and the fetched package. Install with exact versions, preserve pnpm integrity entries and reproduce with `pnpm install --frozen-lockfile`. Run the renderer spike, typecheck, model tests and production build together before accepting the compatibility set. The installed versions below record the selected compatibility set.


## Installed compatibility set

| Package | Version |
| --- | --- |
| Vite / TypeScript / React plugin | 8.3.8 / 6.0.3 / 6.3.0 |
| React / React DOM | package ranges ^19.3.1, resolved by pnpm lock |
| HeroUI / HeroUI styles / HeroUI Pro | ^3.2.8 / ^3.2.8 / ^1.0.1 |
| PixiJS / @pixi/react / @pixi/tilemap / pixi-viewport | 8.23.0 / 8.0.5 / 5.0.2 / 7.0.3 |
| rot-js / miniplex | 2.2.1 / 2.0.0 |
| Zustand / Dexie | 5.1.0 / 4.4.7 |
| React DnD / HTML5 backend / React Hotkeys Hook | 16.0.1 / 16.0.1 / 5.4.0 |
| wmkit | 0.15.0 |
| simplex-noise / alea | 4.0.3 / 1.0.1 |
| inkjs / GSAP | 2.4.0 / 3.15.1 |
| Vitest / fast-check / fake-indexeddb | 5.1.2 / 4.11.0 / 6.2.8 |
| sharp | 0.35.5 |
| Oxlint / Oxfmt | 1.95.0 / 0.80.0 |

Node must satisfy `^24.0.0 || >=26.0.0`. pnpm is pinned to 12.6.0.
Sharp is a build-time asset packer. fake-indexeddb supplies the Node save-test
adapter. Existing Motion and React Aria dependencies support HeroUI. The
package and lockfile are authoritative when changing any dependency.
