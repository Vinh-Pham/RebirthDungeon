# Durable checkpoints and interrupted-session recovery

Completion is tracked in [Project phases](project-phases.md#phase-6-durable-saves-and-interrupted-session-recovery). [Verification evidence](evidence/phase6/README.md) records the pinned engine, test matrix and rendered recovery screens.

## Storage and schema

The normal application uses `user://profile/checkpoint_0.json` and `checkpoint_1.json`. Save files are explicit JSON data; loading never instantiates a Resource, scene or arbitrary object from disk.

`scripts/data/save_codec.gd` defines format `rebirth.session.v1`. The envelope contains format, canonical decimal sequence, payload string and SHA-256 of format/newline/sequence/newline/payload. All payload integers use `{"$i64":"decimal"}`; RNG already supplies canonical decimal seed/state strings. Coordinates use finite JSON numbers. Version matching includes engine, schema, content, rules, generator and RNG.

The payload retains the hero, items/modifiers, pools/reservations, skill ranks/training, statuses/source/duration/first tick, cooldowns, gold, accepted operation IDs, independent RNG streams, mode/revision, town position, dungeon layout/discovery/position/disposition/pending rewards, and full active battle. The authored Undercrypt layout is explicitly recorded as `undercrypt.v1` and its three room IDs/positions; this version reconstructs the corresponding authored scene. Procedural layouts remain a later phase.

Validation checks exact fields, typed integers, bounded collections and values, references, ranks, pool lengths, finite positions, supported layouts/versions, legal phase/actor/outcome relationships and locked inputs. The saved locked effect and reservation must match a fresh rules projection from the restored actors. Packed arrays are reconstructed with their required Godot types. Files above 4 MiB, unsupported formats and invalid state are rejected before publication.

`scripts/data/save_repository.gd` writes the inactive slot, flushes and closes it, reads it back, and validates the checksum/schema/sequence before returning success. The previous verified slot remains intact. Save paths must stay under `user://`. This repository assumes one application writer.

## Publication and retry

`scripts/application/durable_checkpoint.gd` replaces the Phase 5 memory boundary in normal Main startup. Existing memory-only fixtures explicitly opt out; they never access the player's profile.

A command resolves once into a candidate. Main publishes it only after repository success. On failure, Main retains that candidate, blocks dependent commands/mode changes/AI, and presents Retry. Retry writes the same candidate, including the same operation IDs and RNG results. A write that reached disk before an interrupted read-back may be selected on the next startup; its action is not replayed.

Town/dungeon/battle entry, battle return and expedition-result transitions also use candidates. Encounter creation, active encounter clearing and committed/pending gold changes occur on the candidate. State Charts transitions and world/camera installation follow successful publication.

Exploration position/discovery is checkpointed every two seconds when changed and on focus loss or application pause. Position-only checkpoints preserve the command revision and advance the disk sequence. Successful periodic saves preserve the current path and held input; failures freeze input. Critical battle/reward state is already checkpointed and does not depend on lifecycle notifications. Abrupt termination can lose movement since the last checkpoint.

## Resume and recovery

Startup validates the catalog and scans both slots. The highest valid compatible sequence is offered through Continue. If either existing slot is damaged or incompatible, the recovery screen explains the problem. A valid fallback requires the player's explicit Use verified checkpoint action; both original files are copied to checksum-named `.recovery` archives and verified before further writes are allowed. With no valid checkpoint, Retry loading is available and gameplay remains blocked. Files are never silently replaced with a fresh hero.

Main rebuilds its State Chart from the loaded mode. Battle presentation reconstructs Selection/Locked/Outcome from the observation, and Phantom Camera binds new scene nodes. The manual enemy scheduler recreates its blackboard from saved actors and legal choices. Its current policy is deterministic and consumes no AI randomness: a saved enemy activation can be proposed again if it was never committed; an accepted enemy result is already present in the checkpoint and cannot run twice. No scene history, camera reference, behavior-tree node or blackboard is serialized.

Dungeon and town positions restore after navigation synchronization. Returning from Results to town clears the finished expedition and chooses the safe town spawn.

## Verification and limits

The persistence fixture injects open, truncated-write and post-write/read-back failures; validates corrupt/incompatible states and recovery; checks exact retries and 64-bit transport; and exercises real Main navigation, rewards, focus gates and reconstruction. Twelve separate Godot process invocations cover write/resume pairs for locked hands, enemy turns/statuses, torn writes, post-write interruption, dungeon continuation and town continuation.

The rendered Beckett harness is `tests/fixtures/save_preview.tscn`, isolated to `user://phase6-rendered`. Test processes use unique `user://phase6-tests-*` directories. These fixtures and evidence are excluded from exports.

This phase verifies host file behavior and process interruption. FileAccess flush/read-back is not a promise about sudden power loss or storage hardware; Android/iOS suspension, signing, installation and device durability remain separate gates. UI preferences still have Main lifetime; a separate durable settings feature is not part of this session format. No art generation was needed, and no addon files were modified.
