# Rebirth Dungeon — Documentation Audit

Reviewed September 7, 2026. All **10 Markdown files** under `gameplay` and current folder were reviewed, including the dated completion log and work notes. This is a design/documentation review, **not a code audit or new build verification**. Existing source docs and phase checkboxes were left unchanged.

Companions: [[Game Overview|updated overview]] · [[Reference Research|new primary-source research]].

## Executive assessment

The design is substantially more developed than the original one-paragraph overview suggested. Its strongest idea is **persistent, broadly learnable mastery expressed through a compact five-dice battle system**. The specs are particularly careful about saved transactions, resource costs, item ownership, and separating run rewards from permanent progression.

The main gap is no longer a shortage of systems. It is a shortage of **resolved pacing, loss, recovery, and rebirth decisions**, plus documentation drift between current status and historical implementation evidence. Preserve the clear rule contracts; prove the smallest fun progression loop before expanding the catalog.

## 1. File-by-file findings

| Document             | What it contributes | Assessment and needed follow-up                                                |
|----------------------|---------------------|--------------------------------------------------------------------------------|
| [[game-plan          | game-plan.md]]      | Architecture, commands, RNG, saves, content validation, milestones             | Strong ownership boundaries and an already updated five-dice contract. Java/scaffold/dependency language is stale relative to September 6 work notes. Titles are absent from the specification index and central save/content/progression coverage. |
| [[project-phases     | project-phases.md]] | Seventeen phases, dependencies, acceptance criteria, dated evidence            | Records Phases 0–1 complete, Phase 2 not started. Newer work notes supersede several top-level baseline statements. Keep historical evidence, but separate the current configuration and unverified platform gaps from it. |
| [[gameplay/battle    | battle.md]]         | Skill-before-roll, five d6, keep/reroll, paid commitment, scoring, persistence | Clear foundational contract; sensible qualifications on Dicero evidence. Final rerolls/multipliers remain provisional. Its instruction to update the old allocation model is stale: the plan and tracker already use the replacement. |
| [[gameplay/stats     | stats.md]]          | HP/MP/SP, positive costs, attributes, mitigation, buffs/debuffs                | Good reservation and no-free-refill rules. Recovery defaults to zero without authored data: resource exhaustion must be resolved before a playable loop. Equipped titles need an explicit source entry consistent with titles.md. |
| [[gameplay/skills    | skills.md]]         | Three acquisition routes, 100 training + AP, active/passive catalog            | Strong learning/advancement separation and explicit extension gates. Final costs, rank tables, acquisition pacing, and reachable training remain missing. Some rebirth language predates character.md’s later proposal. |
| [[gameplay/character | character.md]]      | Current/cumulative levels, talents, aging, rebirth reset/preserve matrix       | Provides the game’s core identity and clear source-versus-adaptation distinctions. Rebirth eligibility and aging clock trust are unresolved; neither should be inferred from legacy Mabinogi guides. |
| [[gameplay/inventory | inventory.md]]      | Grid capacity, bags, slots, provenance, overflow, reconciliation               | Detailed and internally disciplined. Run-loss policy and the player’s escape from full overflow still need authored flows. Bags, footprint packing, and atomic swaps are a large first progression slice. |
| [[gameplay/enchants  | enchants.md]]       | Prefix/suffix, conditions, protected application, destructive extraction       | Failure consequences and persistent random values are clear. Needs available materials, town MP recovery, viable training, and capacity tests before enabling the service. Keep application failure distinct from destroying an item through burning. |
| [[gameplay/quests    | quests.md]]         | Chapters/Generations, automatic/NPC delivery, objectives, RP isolation         | Strong exactly-once claims and separation of category from mission mode. Town-bound progression constrains story authoring; avoid chains requiring a newly activated stage to progress in the same unfinished run. |
| [[gameplay/titles    | titles.md]]         | Discovery, First/Second slots, cosmetic talent display, mastery extension      | Coherent loadout system with no bonuses from mere ownership. Already included in tracker phases, but missing from the central architecture document and stats source table. Integrate rather than invent another title subsystem. |

## 2. Documentation drift to correct

### A. Current implementation versus historical evidence — high priority

The game plan’s opening and “What exists today” describe Java and an empty `FirstScreen`. The tracker records replacement screens on September 4 and Kotlin/KTX work on September 6, including a later `KtxGame` adoption. The plan’s Kotlin toolchain row and Kotlin source tree only partially reflect this change.

Additional differences recorded in the supplied docs:

- The old plan table says Gradle **9.7.1** and build JVM **21**. A September 6 work note explicitly corrects the wrapper to **9.5.1**; the tracker’s architecture/current work notes use build JVM **25**.
- The September 2 minimal-dependency plan was intentionally broadened by user-directed September 6 work. Old “remove/defer” entries cannot serve as a current installed-dependency inventory.
- The game plan’s Milestone 0 exit still calls the Android duplicate-class failure an open gate, despite its own repair record and the tracker’s completed phases.
- Current Focus says all three backends launched, but later migration/dependency notes explicitly leave **iOS AOT with the newer set untested**. Compilation and an earlier simulator launch are not equivalent to current runtime validation.
- The tracker’s “Initial layout” says resolution/scaling still needs validation, while its resolved-decision row records `ExtendViewport` 320 × 180 and prototype device checks. Broader physical-device coverage remains open, not the entire original decision.

**Recommended correction:** add a dated current-state summary sourced from the actual repository when available; label September 2 audit tables historical; preserve completion evidence rather than rewriting it as current proof. Update prospective Kotlin commands without rewriting commands that were actually run in older logs. No configuration values were independently verified in this review.

### B. Titles integration — high priority

The tracker explicitly acknowledges this gap. Add titles to the game plan’s specification index, profile ownership, run snapshots, save shape, content catalog, character UI, progression section, and validation matrix. Add equipped titles to stats.md’s modifier-source table, following titles.md’s existing equipment-stage calculation rules. Do not count title effects as permanent skill growth or apply them twice.

### C. Stale cross-document instructions — medium priority

- Battle §8 says to replace per-die allocation in the game plan/Phase 4; both already use whole-hand `REROLL_DICE`/`USE_ABILITY`. Retain the historical explanation, remove the implication that alignment has not happened.
- The game plan’s documentation section says the tracker still needs gameplay alignment; its September 5 update already performed it.
- Skills §7/§10 leaves rebirth unspecified while character §6 proposes the reset/preserve behavior. Link to that proposal while keeping eligibility, costs, and cooldown genuinely open.
- The tracker lists “one initial roll plus two batch rerolls” among settled contracts but still lists reroll allowance as open balance. Use **fixed command semantics; provisional numeric budget** consistently.

### D. Broken relative links — verified, low-risk cleanup

Five gameplay docs—battle, character, enchants, inventory, and skills—link to `(game-plan.md)` and `(project-phases.md)` from inside `docs/gameplay/`. Those file targets do not exist there. They should point to `../game-plan.md` and `../project-phases.md`, or use Vault wikilinks. This is **10 distinct file-target corrections**. New companion notes use clickable Vault links; source files were not changed.

## 3. Design decisions that block a convincing playable loop

These are review recommendations and risks inferred from the specs, not observed implementation bugs.

### 1. Resource exhaustion and recovery — decide before starter combat

Every activated skill must cost a positive resource amount. Regeneration is zero unless authored, and town rest is not yet defined. A hero who exhausts SP/MP may have no usable action beyond passing or consumables.

Define a visible recovery route and test it at low resources. If passing restores SP, test both enemy pressure in combat and unlimited waiting during exploration; otherwise players may refill before every encounter, eliminating intended expedition attrition. Do not solve this by silently adding a free basic attack that violates the cost contract.

### 2. Victory, defeat, and abandonment retention — decide before inventory-backed runs

Create one shared outcome matrix covering brought equipment, remaining supplies, consumed supplies, new loot, gold, XP, training, quest evidence, and title evidence. Also distinguish a suspended run from abandonment. Existing committed mastery is different from pending gains, and retention must never restore already-consumed provisions.

This single decision affects six gameplay systems and the combined save transaction. A high-level “keep progression” rule is not sufficiently precise.

### 3. Rebirth motivation and eligibility — prove the signature mechanic

Choose when rebirth becomes available, its cost/cooldown, and why a player would delay rather than immediately reset. Model AP per unit of play across early levels and repeated lives; otherwise fast early XP may make repeated low-level rebirth the dominant strategy. Conversely, a long real-time gate can make the title mechanic absent from the prototype.

**Recommendation:** use an explicitly provisional, controlled rebirth demonstration once XP/AP/ranks and safe result boundaries exist. It can test the fantasy before broad enchanting/RP content, but changing phase order requires a recorded plan decision. This audit does not move or complete phases.

### 4. Encounter completion versus dungeon completion — clarify before expansion

Battle rules use “no hostiles remain” for victory, while the project also has exploration, stairs, multiple floors, and run-result transactions. Specify the scope of that hostile set and distinguish **encounter won**, **floor objective complete**, and **run completed**. Clearing one room must not accidentally cash out the entire expedition; an empty exploration floor must not cause an unintended terminal result.

### 5. The compound progression curve — measure rather than stack by intuition

Skill base damage, face weights, attributes, weapon contributions, persistent mastery, enchants, and selected titles all affect power. Final Hit adds a hand-scaled buff that later attacks multiply through their own hands. Multiple individually modest systems can create excessive end-to-end scaling.

Keep the proposed ×10 rare-hand outcome provisional. Compare full damage distributions and turns-to-defeat—not only average pips—across early/advanced ranks and low/high defense. Test conservative high-pip keeps against pair/triple/straight-chasing strategies; the decision should not collapse into one universally best reroll policy.

### 6. Training, acquisition, and AP pacing — specify a small real content set

Choose stable starter skill IDs and names: Guard/Ember Bolt/Flame Burst are illustrative, the battle slice names a generic sword skill, and the later catalog uses Smash/masteries. These can coexist, but must not become accidental duplicate definitions.

For each demonstration skill, author two usable ranks, effect values, costs, AP transitions, reachable training objectives, and an acquisition route. Track runs to first rank-up and time spent training versus finding AP. Provide known page sources; random drops should not leave the required learning demonstration inaccessible.

### 7. Aging, inventory, and quest pacing — resolve before expanding content

- Real-time aging needs an explicit forward-clock policy and a test clock. Do not place a weeks-long aging achievement on the critical path of a short prototype.
- Saved overflow is safer than timed loss, but the mandatory-clear gate needs accessible town management so players can always make room. Test full gear, locked items, bags, and rebirth-displaced equipment together.
- Quest stages beginning after town reconciliation require intentional expedition breaks. Label these clearly rather than surprising players with an objective that cannot advance until they leave.

## 4. Recommended implementation focus

Preserve the current **Phase 2** focus and the validated-content/RNG foundation. Then prove:

1. One reachable floor, deterministic movement, and resumable state.
2. One enemy and a sword skill at two ranks; five-dice decisions, readable previews, affordable costs, and a defined recovery rule.
3. Result retention, one AP-fed rank-up, and a next run that demonstrates the change.
4. A clearly labeled rebirth test showing what resets and what remains.
5. Additional learning routes, inventory depth, titles, quests, enchants, and skill extensions as their prerequisites become usable.

This is a proposed **validation emphasis**, not a replacement tracker or permission to skip required phase gates. Avoid inventing full rank tables before the first combat/progression measurements.

Useful acceptance evidence: all 7,776 ordered five-die hands classified; save/load at each roll boundary matches uninterrupted continuation; no extra costs/training from rerolls; inventory quantities conserved across every outcome; and a before/after rebirth record demonstrating reset fields without lost skills or duplicate AP.

## 5. Research conclusions and limits

Primary-source research strengthens the high-level synthesis: Mabinogi supplies retained mastery, flexible talents, and practice/AP progression; Dicero supplies accessible dice-to-skill roguelite inspiration. The existing granular Mabinogi wiki research remains secondary reference material, not a reason to copy every historical mechanic.

The new Dicero store research does **not** independently verify the existing secondary-source multiplier table or reroll count. The existing regional FAQ references also do not establish one universal international-client formula. Keep those details attributed and provisional until version-specific primary or hands-on evidence is available. No current game client was tested. Source links and their supported claims are in [[Reference Research]].
