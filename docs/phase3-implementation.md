# Phase 3 exploration implementation

The application retains one session and uses its existing State Charts mode graph. `scenes/exploration/town.tscn` and `dungeon.tscn` replace the town/dungeon shell presentations. Select **Explore Haven** in a debug build. WASD/arrows move continuously; click or tap revealed floor to navigate. Clicking the keeper approaches before opening an informational panel. Walk into the eastern arch to enter the dungeon.

The Undercrypt contains Threshold → Moss Gallery → Quiet Vault. Each chamber is 480 × 320 world pixels; 80 × 64 corridors join them. The hero has an eight-pixel circular body. Authored navigation uses a ten-pixel wall inset and a 44-pixel corridor center span. Room scenes compose art, collision, NavigationRegion2D, connector markers and Area2D interaction markers. The current NPCs and sentinels are stationary. Geometry is authored, not procedurally generated; tile artwork does not impose grid movement.

## Navigation and input

Each world installation owns a dedicated NavigationServer2D map, freed at teardown. The player and all room regions explicitly bind to it. Only discovered regions are enabled. After an installation or reveal, movement stops until a newer map iteration exists **and each discovered region owns its authored center**. An early empty-map update cannot release this gate. Continuation position is restored only afterward.

Both input routes set CharacterBody2D velocity and call move_and_slide in physics updates. An active route advances NavigationAgent2D once per update, stops on completion, and cancels if collision stalls it. Off-map and disconnected targets reject before starting a route. Click/tap coordinates pass through the inverse world canvas transform, including camera zoom.

UI receives pointer events first. World routing uses unhandled press events, ignores the emulated mouse duplicate of a native touch, and does not carry release gestures into the world. Blocking panels, focus ownership, application focus loss and transitions cancel pending movement and approaches. A neutral-key gate prevents a held physical key resuming movement across those boundaries. Disabled shell buttons explicitly release focus.

## Discovery and encounters

Entering an authored doorway approach reveals the adjacent chamber. Unknown chamber art and all its children remain invisible; its navigation is disabled and a collision gate prevents direct movement across the unopened connector. Observations include only discovered room IDs and visible, unresolved markers. Camera position does not determine discovery.

Interactions revalidate the session/revision, visibility, distance and a wall raycast during physics processing. Encounter requests freeze the world immediately, copy position/discovery into the application-owned continuation and dispatch a deferred guarded transition. Deferred scene replacement avoids removing physics bodies during overlap processing. Obsolete callbacks and duplicate requests cannot initialize another encounter.

The separate battle screen is explicitly an **encounter fixture**. Resolving it removes only the captured stable encounter ID and reinstalls exploration at the captured position after navigation synchronization. Both sentinels must resolve before the exit reaches Results. The fixture grants no combat effects or rewards. An unresolved fixture cannot escape to Menu. Returning from Results to town clears the finished exploration fixture.

`ExplorationState` stores only explicit strings, floats, arrays and scalar position coordinates. Session copies detach its arrays. There are no Nodes, Resources, RIDs, camera targets or serialized scenes in this continuation. This is in-memory reconstruction, not disk persistence.

## Camera, content and art

Camera2D has a PhantomCameraHost child. The exploration PhantomCamera2D uses Simple follow, damping 0.12, explicit priority 20, authored world bounds and a viewport-dependent zoom that caps the visible world width. The host alone applies camera transforms. A game-owned PhantomCamera2D subclass overrides limit clamping to use the actual viewport size; the installed addon uses its manager’s root-window size, which otherwise clips the restored hero in compact SubViewports. Vendor files are unchanged. A recreated world binds the new player; teardown clears the target and priority. HUD and panels remain on a CanvasLayer.

Content revision is **2**; schema/rules/generator/RNG remain **1**. Four room definitions and two encounter definitions were added to the explicit catalog. Existing foundation definitions remain available to combat fixtures. Required exploration textures and packed scenes join the loading gate.

SpriteCook generated the hero, sentinel and stone-floor PNGs (36 credits total). The keeper reuses a tinted hero sprite. Asset IDs and local SHA-256 prefixes are recorded in `assets/art/exploration/spritecook-assets.json`. Images retain nearest filtering. Room borders, lamps and arch markers are simple Godot drawing primitives.

## Verification and limits

See [dated evidence](evidence/phase3/README.md). The integration fixture covers real movement/navigation, collision, disconnected targets, discovery, copied observations, obstruction/proximity, duplicate/stale triggers, input gates, exact encounter removal and camera/continuation rebind. It also runs isolated 960×540 and 1920×720 viewports at 30 and 120 physics ticks per second with positional tolerances and camera-space touch conversion.

No cross-platform bit-exact physics claim is made. Actual combat begins in Phase 4, battle UI in Phase 5, durable checkpoints in Phase 6 and town services in Phase 7. Desktop rendered checks and resource-pack checks do not establish mobile installation, signing or device acceptance.
