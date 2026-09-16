# Phase 10 implementation

Phase status belongs to [Project phases](project-phases.md). Advanced combat follows the [skill specification](gameplay/skills.md) and RP missions the [quest specification](gameplay/quests.md), narrowed to the authored slice below.

## Closed Phase 10 decisions

- **Charge stays disabled.** [Skills §8.5](gameplay/skills.md) allows deferring Charge pending a non-spatial redesign. No Charge skill is authored, and a fixture asserts an injected `skill.charge` rank cannot select. No spatial mechanic was reintroduced.
- **Master Titles are deferred, not implemented.** The authored prototype skills cap at rank E, so a Rank-1 perfect-training objective is unreachable and no defined economy exists. Per the tracker gate ("only with reachable authored objectives and a defined economy") no Master Title content was authored; further rank tiers stay on the Phase 11+ backlog with the same gate.
- **Reaction/area rules** (decision table row for this phase): Counterattack is a one-charge self stance (sword, dice-locked magnitude) that negates exactly one incoming single-target physical hit and retaliates once inside the attacker's transaction; it never triggers on area attacks, never crits, and expires unused at the start of the owner's next activation. Windmill is the one authored area skill (`hostile_all`), freezing the living member set at selection. Critical Hit is a learned passive: authored chance on the attack rank gates one combat-stream draw per valid target at commit (stable order, after counter interception, never at zero chance), and the learned passive's rank supplies the bonus fraction applied to combo damage before protection and shields.

## Advanced combat

`EncounterDefinition.actor_ids` now authors 1–3 members; `battle_rules.begin` instantiates all of them as `enemy.0..N` and the turn cycle runs hero side → enemies in authored order, skipping the defeated. Victory requires every member down; hero-side defeat keeps precedence. The save schema restores the full member list, validates each member's definition against the encounter, and rejects mismatched counts.

Windmill targets `hostile_all`: `selection()` freezes the living member set (ids plus per-member defense/protection/shield) into `locked_inputs.targets`, the commit resolves one physical hit per member in stable order with one optional critical draw each, and training/facts count the action once (`multi:` fact when two or more valid hits land). Frozen previews show per-member amounts.

Counterattack stores `{skill_id, power}` on the actor (`power` already includes the combination), persists in the battle save, and is consumed inside the attacker's activation: the hit is negated (no damage, no on-hit status, no critical draw), the retaliation uses stored power against the attacker's current defense/protection/shield, and a successful counter trains the stance exactly once (`counter:` fact). An unused stance expires when the turn cycle returns to its owner.

Final Hit stores its resolved magnitude as an `attack_bonus` status (existing activation timing); recasting while active is rejected (`already_active`), melee attacks read the stored bonus through frozen attack inputs, magic ignores it, and the status expires after its authored duration.

Equipment masteries are passive skills: Combat Mastery (`melee_attack`) and Sword Mastery (`sword_attack`, sword-tagged actions only) add frozen attack once per action; Shield Mastery (`shield_defense`, `shield_magic_defense`) contributes only while the fighter's shield tag holds — the hero's is derived from equipped off-hand gear at battle begin, NPC actors author theirs on `ActorDefinition.shield`. Each learned passive trains at most once per committed activation, independent of target count.

## Role-playing missions

Missions are authored in `progression/starter.tres` (`missions` table: `mission.defenders_memory`, champion `actor.warden`, encounter `encounter.warden_trial`). `mission_enter` is a town command routed through the keeper dialogue: one validated transaction builds the borrowed champion (instance id `hero`), starts the isolated battle and switches to BATTLE. `Battle.champion` carries the fighter; `Rules.participant()` resolves it, so every combat rule, status, reaction and AI path works unchanged while `session.hero` never participates — its pools, training, facts and inventory are unreachable inside the mission (exploration progression is null there).

Only a committed scenario outcome advances anything: the return transaction (`complete_mission`, guarded by `_return_authorized` and the new BATTLE→TOWN chart edge) calls `mission_complete` through the save gate. Victory merges the `mission:<id>` fact into the committed ledger, grants authored gold/XP once, records the claim operation id and runs idempotent delivery; defeat and failure change nothing, so the scenario stays retryable. `quest.rp.defender` ("The Warden's Memory") reads that ledger fact as its objective, so only the committed victory makes it ready for the keeper hand-in. Suspension persists the whole mission battle (champion, stance, hand) in the combined save.

## Addon integration

- **LimboAI:** each enemy actor owns a `BTPlayer` with its own blackboard; `content/ai/acolyte.tres` authors the multi-enemy rule (empower a living ally, otherwise act in stable order) alongside the melee sentinel tree. Scheduling stays manual per activation token (now actor-scoped); trees read copied choices only; the domain revalidates every proposal and owns the pass fallback when no legal action exists.
- **State Charts:** the application mode chart gained the guarded BATTLE→TOWN edge for mission returns; guards still authorize every transition and the domain revalidates the underlying commit.
- **Dialogue Manager:** the keeper menu gains a `mission` branch with `#service=mission_enter` confirmation; conditions come from committed mission records, and repeated entries are rejected by the claim record.
- **Phantom Camera:** battle framing is unchanged and cosmetic; multi-enemy stage slots keep group framing deterministic without becoming a target resolver.

## Save compatibility

Envelope v3 checkpoints gain `mission_id` (session and battle), the champion record, and per-actor `shield_equipped`/`reaction` fields. Decode migrates legacy payloads structurally (defaults, no content-version bump), accepts legacy three-room dungeon layouts alongside the current four-room layout, and validates multi-member battles, mission context consistency (champion ⇔ mission id), and member/encounter agreement. Existing sessions resume without loss.

## Deliberately out of scope

Charge (disabled, above), Master Titles and further rank tiers (deferred with the reachable-objective gate), repeatable mission variants, and enemy area skills (no authored enemy uses `hostile_all`; the rule layer supports it if later authored with a reaction-safe design).

See [verification evidence](evidence/phase10/README.md).

