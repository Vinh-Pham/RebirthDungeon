# Phase 1 host qualification — 2026-09-11

Engine: **4.7.2.stable.official.ed1daf0bf**. Host: Apple M2 Max / arm64, macOS 27.0. Rendering: Compatibility, OpenGL over Metal. Content/rules/save schema versions are not introduced in this phase. The session is explicitly in-memory; these fixtures prove neither gameplay nor disk durability.

## Delivered shell

[Main](../../../scenes/main.tscn) persists while its CanvasLayer UI host replaces a single mode view. [DungeonApplication](../../../scripts/application/main.gd) constructs an actual StateChart → CompoundState with an explicit Menu initial state, six AtomicStates, event transitions and ExpressionGuards. Navigation edges are menu → loading → town, town → dungeon, dungeon ↔ battle, dungeon/battle → results, results → town, and return-to-menu edges. These are development navigation fixtures, not accepted gameplay outcomes.

The application owns a [SessionShell](../../../scripts/domain/state/session_shell.gd); views receive deep-copied observations and emit local intents with session/revision tokens. A pending transition locks input. Chart entry publishes one new revision after an authorized event. Obsolete view callbacks use WeakRef and cannot affect the current mode, even after their source is freed. Closing Main invalidates its shell; changing a mode preserves it. No hero, RNG, reward, economy or save system is implemented.

Required presentation resources load into a candidate collection before town entry. The original 32×32 geometric dungeon mark, explicit Font resource using Godot's built-in fallback, and shared Theme are validated by path/type. Missing content leaves a visible repair-and-retry message. Menu/error UI can use the engine fallback if the custom Theme itself cannot load. Loaded resources remain read-only. Canvas texture filtering is nearest; integer pixel scaling is not claimed.

[Input registration](../../../scripts/application/shell_input_map.gd) is idempotent and application-owned: Escape/controller B for back, controller A for accept, D-pad focus navigation, built-in keyboard UI actions, mouse buttons and emulated mouse from screen touch. Explicit focus neighbors connect every button. Focus loss releases action state and disables controls; focus return restores the first action. There is no world movement in this phase. Fixtures are hidden when `OS.is_debug_build()` is false.

## Addon inventory and lifetime

[addon-inventory.json](addon-inventory.json) records inspected versions, exact native files, binary formats, sizes and SHA-256 values, host memory mappings, template presence and SDK probes. Reproduce on this macOS host with:

```sh
python3 tools/qualify_addons.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

| Addon | Local version | License | Host qualification |
| --- | --- | --- | --- |
| Beckett | 1.15.0 | Root EULA, runtime distribution provision | Connected editor/game MCP, semantic playtest, real input and screenshots |
| Godot State Charts | 0.22.5 + documented local compatibility patch | MIT | Guarded entry/navigation and serialization round trip |
| LimboAI | v1.8.1 | MIT | Actual macOS editor framework mapped into Godot; BTPlayer manual task executes; two agents share a tree with isolated blackboards |
| Phantom Camera | 0.11.0.3 | MIT | Camera2D child host selects priority 20, hands back to priority 10, unregisters on teardown |
| Dialogue Manager | 4.1.0 | MIT | Import `.dialogue`, traverse named `start` cue, validate text and end |
| QuestSystem | 2.0.2 | MIT | Available → active → completed, objective guard and cleanup to prior pool counts |

UID resolutions verified in the test process:

- `DialogueManager`: `uid://c3rodes2l3gxb` → `addons/dialogue_manager/dialogue_manager.gd`.
- `PhantomCameraManager`: `uid://duq6jhf6unyis` → `addons/phantom_camera/scripts/managers/phantom_camera_manager.gd`.
- `QuestSystem`: `uid://b77kvbliweux5` → `addons/quest_system/quest_manager.gd`.

The existing autoload configuration is preserved; no duplicate managers were added. Camera nodes own registration cleanup. The QuestSystem smoke removes only its own quest and verifies prior pool counts. No production dialogue/quest subscriptions or gameplay adapters are installed. `mode_detached` and view `detach()` are the attachment boundaries for later integrations; their consuming phases must implement their own cancellation/reset behavior.

[ShellAddonLifecycle](../../../scripts/application/addon_lifecycle.gd) sets runtime QuestSystem defaults. Its installed manager reads `require_objective_completed` without a fallback; editor initialization marks that value as a default and Godot strips it on save. Therefore a fresh runtime otherwise sees null and permits early completion. The application explicitly supplies true and disables repeating completed quests; it does not modify vendor quest code or implement game rewards.

Dialogue Manager's `get_line()` writes `data.resource = resource` into its line dictionary. The smoke duplicates the authored resource, traverses that copy and removes these self-references afterward. The authored resource and global settings stay unchanged. Future dialogue integration must retain this resource-isolation/lifetime policy.

## Narrow State Charts compatibility patch

The sole new vendored change is in [serialized_state_chart_state.gd](../../../addons/godot_state_charts/serialized_state_chart_state.gd): `children: Array[SerializedStateChartState]` becomes `children: Array[Resource]`. Values are still SerializedStateChartState resources. No addon was upgraded. This is required for host qualification, not an incidental API change.

The pinned engine leaks a GDScript resource for a self-typed exported array even without addons. [recursive-type-repro.log](recursive-type-repro.log) retains the minimal reproduction: a Resource with `@export var children: Array[RecursiveResource] = []`, loaded by a SceneTree script, emits `ERROR: 1 resources still in use at exit`. The same leak in the State Charts serializer made the strict import verifier fail. Its editor-only shutdown location does not justify suppressing the error.

Changing the element annotation breaks the script-type retention cycle. The [addon fixture](../../../tests/integration/addon_fixture.gd) now serializes a transitioned two-state chart, deep-copies its snapshot, checks actual child resource types, deserializes it and verifies its active state. Import and runtime exit cleanly. The verifier still rejects every engine/script error. The broader element annotation no longer prevents arbitrary Resource values at authoring time; no game code consumes this serializer or accepts serialized charts as saves. Before any future use with external data, validate every child type. On engine/addon upgrades, rerun the minimal reproduction and remove this patch once an unmodified self-typed export exits cleanly.

## Automated and rendered evidence

```sh
python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

[verification.log](verification.log) is the aggregate result. Logs retain exact commands, engine output and exit codes.

| Scenario | Result | Artifact |
| --- | --- | --- |
| Exact engine pin, enabled-stack import | Pass, no script/engine errors | [version.log](version.log), [import.log](import.log) |
| Addon smoke + shell integration | Pass | [tests-pass.log](tests-pass.log) |
| Deliberately broken layout | Expected exit 1 and failing test marker | [tests-failure.log](tests-failure.log) |
| Main runtime, 60 headless iterations | Pass, clean shutdown | [runtime-smoke.log](runtime-smoke.log) |
| Five resource packs and exclusions | Pass | [assets-0.txt](assets-0.txt), [assets-1.txt](assets-1.txt), [assets-2.txt](assets-2.txt), [assets-3.txt](assets-3.txt), [assets-4.txt](assets-4.txt) |
| Fresh source copy without `.godot` or local credentials | Import/autoload/script fixtures pass; see dated scope below | [clean-verification.log](clean-verification.log) |
| Beckett seven-step keyboard/pointer navigation | 2 assertions pass: same session, Menu revision 8 | [runtime.json](runtime.json), [reusable suite](../../../tests/playtests/phase1-shell-navigation.json) |
| Mouse/touch/controller, D-pad focus, Escape and focus-loss gate | Verified in connected rendered process, final error log empty | [runtime.json](runtime.json) |
| Compact/expanded rendering and focus graph | No clipping, overflow, small-target or unreachable-focus findings | [dungeon-compact.png](dungeon-compact.png), [dungeon-wide.png](dungeon-wide.png) |
| Missing required art | Loading stays blocked with file/retry instructions | [loading-failure.png](loading-failure.png) |

Headless layout checks use exact 1280×720, 960×540 and 1560×720 SubViewports. The Beckett embedded game workspace retains its physical panel size: requested 960×540 produced a 960×540 logical viewport, while the 1560×720 request produced 1560×877 under `expand`. Screenshots show that embedded presentation, not standalone window or mobile acceptance. The fresh-copy record was taken before the final additional Phantom Camera editor/demo exclusions; final source-tree pack manifests certify those exclusions. No final-code changes followed the fresh-copy check except export filtering and verification of those filters.

The shell fixture also proves invalid edges, unauthorized chart events, wrong session IDs, stale revisions, duplicate requests, callbacks before/after source deletion, copied observations, loading failure/retry, repeated mode entry and release-build development gating. The semantic Beckett suite is replayable in the editor and intentionally is not described as frame-exact or a headless test.

Export filters exclude root demos, State Charts examples, Phantom Camera examples/editor panels/themes/fonts, test drivers, docs/tools/build/research files and Dialogue Manager's C# sample scenes/scripts. The GDScript default dialogue balloons remain because the installed manager uses them as runtime defaults. Beckett's export plugin strips its editor tools and keeps its inert runtime autoload. [Third-party notices](../../../assets/licenses/third_party_notices.txt) are explicitly included and checked in each pack. No imported third-party font is needed by the shell itself.

## Per-target prerequisites (not device acceptance)

All actual debug export attempts exited 1 because matching **4.7.2.stable** templates are absent. Pack success does not establish executable packaging, architecture selection, signing, installation or runtime compatibility.

| Target | Present LimboAI debug / release binaries | Outstanding prerequisites / result |
| --- | --- | --- |
| macOS | Universal x86_64 + arm64 frameworks | `macos.zip` missing; framework packaging/signing/notarization and standalone release execution unverified. [Attempt](export-0.log) |
| Windows Desktop | x86_64 DLLs | Both x86_64 templates missing; no Windows runtime test. Manifest's x86_32 DLLs absent (not selected preset). [Attempt](export-1.log) |
| Linux | x86_64 and arm64 ELF libraries | Both x86_64 templates missing; no Linux runtime test. Manifest's rv64 libraries absent (not selected preset). [Attempt](export-2.log) |
| Android | arm64, arm32, x86_64 and x86_32 ELF libraries | Both APK templates missing. SDK directory and Temurin JDK 25.0.4 present; Gradle/SDK compatibility, signing and device install unverified. [Attempt](export-3.log) |
| iOS | arm64 device dylibs | `ios.zip` missing; simulator universal dylibs absent. Xcode-beta and iPhoneOS 27.0 SDK present; framework conversion/embedding, provisioning, signing and device execution unverified. [Attempt](export-4.log) |

No Windows/Linux/mobile runtime or cross-device physics guarantee is inferred from binary presence. Phase 14 owns device/export acceptance; the phase tracker remains the completion authority.
