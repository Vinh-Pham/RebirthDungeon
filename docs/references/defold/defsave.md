# DefSave

[Upstream documentation](https://github.com/subsoap/defsave) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

DefSave loads and stores local settings and user data. Its README uses `https://github.com/subsoap/defsave/archive/master.zip`; the inspected repository page lists release `v1.2.6`. Choose a verified revision rather than assuming that example is a project pin.

Import `require("defsave.defsave")` and set a stable `defsave.appname`, such as `RebirthDungeon`, before accessing profiles. Do not change the application name between releases without a migration.

## Documented API

- `defsave.load(name)` loads a named file into library memory.
- `defsave.get(name, key)` reads and `defsave.set(name, key, value)` changes that in-memory data.
- `defsave.save(name)` writes a file; `save_all()` saves changed files, with an optional force flag.
- `defsave.update(dt)` supports autosave when configured. `save_all()` in shutdown is supplemental, not the sole persistence strategy.
- Default data can initialize empty files. Disable or bypass automatic defaults for existing gameplay saves until corruption validation has run.

Names omit extensions and should use valid Lua-style identifiers, for example `profile_001_a`. Desktop locations are based on `sys.get_save_file`; the README documents **localStorage** for its HTML5 backend. Do not assume the former game's IndexedDB behavior applies.

## Project save boundary

Put each character's possessions, run, turn checkpoint, RNG descriptor, quest/story progress, claim ledger, and committed event batch into one versioned envelope. Settings can use another file.

Build project-owned alternating A/B generations with validation, read-back, previous-generation recovery, explicit migrations, and serialized writes. Reconcile the character index after interrupted creation. Never treat multiple `set` calls across files as a database transaction. Disable gameplay autosave of partially staged state; the save service exclusively controls candidate persistence and publication.

The README does not establish crash-atomic writes, transactional rollback, multi-process locking, schema validation, or a complete error-return contract. Inspect the selected source/backend before implementing the adapter. If failures are only logged, expose a reliable result in the adapter/backend before allowing domain publication. Test serializer limits and realistic run sizes rather than assuming arbitrary tables are supported.

## Project checks

Test failed and uncertain writes, corrupt current/previous slots, valid-generation selection, unsupported schemas, full storage, index recovery, duplicate claims, character switching, and restart after every durable action. A second desktop process must not become a competing writer. Native desktop success does not verify the HTML5 backend.

## Consuming project contract

Use the [save architecture](../../architecture.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.

The rules-version-2 native migration fixture also verifies rewriting a corrupt inactive A/B slot. The pinned adapter initializes `defsave.loaded[name]` from the complete candidate before calling `set`/`save`; it intentionally does not call `load` on the damaged inactive file. The outer store must establish a valid active generation (or an unused character slot) before this replacement. See the measured skill-update results in [verification](../../verification.md).
