# Rebirth Dungeon: Turn-Based Battle

Updated **October 1, 2026**. Combat already runs through a deterministic TypeScript engine in the Expo/React Native app. This specification records the current rules and separates planned skill extensions. Read it with [Stats](stats.md), [Skills](skills.md), [Inventory](inventory.md), and the [game plan](../game-plan.md).

## 1. Encounter and turn model

An encounter contains explicit player/enemy participants. Living encounter membership and allegiance determine valid targets; the rendered map, sprite positions and attack animations are presentation. There is no combat range, line-of-sight, movement action, five-dice hand, reroll or pip multiplier.

`TurnQueue` sorts initial living combatants by descending speed, preserving input order on ties. The fixed queue repeats until one side has no living participants. A speed modifier does not reschedule the battle. Defeated/removed actors leave the queue. If both sides disappear, defeat takes priority.

The campaign copies its hero/resources/loadout into `BattleSession` at encounter entry. Exploration and town commands cannot mutate this active encounter. After its result commits, updated hero state supplies the next encounter. Do not freeze progression for an entire dungeon expedition.

## 2. Player action flow

```text
Select action → select target → Confirm action
    → validate → resolve one action → end owner turn
    → tick next actor's turn start → next actor or result
```

| UI action | Existing engine intent | Behavior |
| --- | --- | --- |
| Attack | `ATTACK` | One basic physical strike against one hostile |
| Skill | `USE_SKILL` | One owned, battle-usable skill with its authored target/cost/effect |
| Defend | `DEFEND` | Self; damage reduction and rest-rate stamina recovery |
| Item | `USE_ITEM` | Self; consume one battle-usable consumable and restore resources |
| Rest, engine-supported | `REST` | Self; rest-rate resource tick without Defend mitigation |

`BattleController` receives `SELECT_ACTION`, `SELECT_TARGET`, `CONFIRM_ACTION`, and `CANCEL_ACTION`. It submits combat intents only while the XState machine is executing. Direct combat commands cannot bypass this flow inside a normal BattleSession. The low-level standalone CombatSystem can still be exercised by engine tests.

Selection, switching targets and Back/cancel spend nothing and draw no RNG. Confirmation revalidates current turn, living participants, target allegiance, skill/item availability and resource affordability. Reject invalid requests before simulation mutation/randomness. A miss is an accepted action and consumes its normal turn/cost. There is no turn timer; menus and suspension do not advance combat.

## 3. Targets and costs

Skill targets are `self`, `ally` (including self), `enemy`, and `allEnemies`. The UI may auto-select the sole self target. An area skill still selects a living hostile for confirmation and uses the eligible opposing set in turn-queue order. Allies and defeated actors are excluded.

Current active skills pay integer MP and optionally SP. Use the shared fullness-adjusted `staminaCost` function for SP. Healing another ally currently pays no SP; self-healing uses Healing's base SP cost. Revalidate the target-dependent cost at confirmation. MP/SP are deducted once per skill action, before its results are published; recovery cannot make an unaffordable action valid. HP payments/upkeep/charges require future support before a skill can request them.

A basic attack normally costs 2 base SP. When stamina is insufficient, it remains available as the existing bare-hand fallback: exclude weapon bonuses and weapon wear for that action, then retain the current stamina deduction rule. Do not reject the attack as though it were an unaffordable skill or retain sword-mastery credit for bare hands.

Items are alternative full actions. They cannot be used during another action's resolution. Equipment changes are allowed in exploration, including between encounters, but not inside battle. AP remains a permanent progression currency, never a combat cost.

## 4. Hit, critical and damage resolution

Use [AttackResolver](../../src/engine/battle/AttackResolver.ts), [SkillResolver](../../src/engine/battle/SkillResolver.ts), and their existing validation/rounding. Current heroes/enemies use damage ranges; older fixtures without a range retain the legacy single-attack branch.

```text
hitChance = max(0, source.hitChance - target.evasion)
```

Resolve the hit from battle RNG. On a hit, resolve critical state, sample the damage range using Balance, calculate mitigation, and sample physical injury when applicable. Ordinary single-target misses do not roll critical/damage/injury. Even chances 0 and 1 use the existing RNG helper; do not optimize draws away without an explicit compatibility change.

For range-based attacks, Protection is a rating converted through the existing curve, capped at 90% reduction. Physical Defense is reduced by Armor Pierce with a zero floor; magical damage uses Magic Defense with no physical pierce. Effective critical chance is the appropriate physical/magical rating minus twice protection reduction, clamped to 0–30%.

```text
reduction = protectionReduction(relevantProtection)
criticalMultiplier = critical ? source.criticalMultiplier : 1
mitigated = max(1, sampledAttack × criticalMultiplier - relevantDefense)
damage = max(1, floor(mitigated × (1 - reduction)))
```

This branch multiplies attack before subtracting defense. The legacy branch instead uses `floor(max(1, attack - defense) × criticalMultiplier)` and does not gain the range branch's protection/injury rules. Keep both paths intact; do not combine their formulas in one preview.

Physical skills add their rank-adapted power range to the effective physical range. Magical skills use their skill range plus the authored magic-attack coefficients. Current healing also uses the magical scaling path, then caps actual HP restored at unwounded missing health. A field such as `element: physical` on Healing does not make it a melee attack.

Damage events report actual HP lost, capped at the target's remaining HP. Physical injury can add wounds and further clamp healable HP; wounds are separate from damage. Death handling removes the target from initiative and records death once. There is no shield-absorption pool implemented today.

For area skills, the selected target resolves first for RNG purposes; its successful critical result is shared with other successful targets. If that selected hit misses in a range-based area action, the resolver makes its explicit shared-critical check for the remaining targets. Preserve current per-target evaluation and `TurnQueue.order` iteration; no new independent critical check per target. Reordering sprites must not reorder draws.

## 5. Defense, recovery and weapon wear

Defend uses one turn, spends no MP/SP, draws no combat randomness, and does not wear a weapon. Until the defender's next turn starts, incoming attack/skill direct damage is `max(1, floor(normalDamage / 2))`. It does not reduce periodic status damage. Its end-of-action resource tick uses the rest rate. A future learned Defense skill should extend this shared resolver, not add a second stacking guard mechanic.

Normal completed actions tick HP/MP/SP/fullness under [Stats](stats.md). Rest and Defend use increased stamina recovery. Defeated actors receive no regeneration and healing does not revive them. Selection, tooltips and animation completion never run a resource tick.

A usable weapon loses one durability after an eligible physical action with at least one successful hit. Area hits do not multiply wear by target count. Magic/healing/items/rest/defend, misses and exhausted bare-hand fallback do not wear it. At zero durability its stat contribution is removed for subsequent actions; the item remains owned and can be repaired at the blacksmith.

## 6. Status and outcome order

`CombatSystem` resolves costs/effects, death and weapon wear, then the acting actor's `turnEnd` statuses and resource tick. If battle continues, it advances the queue and resolves `turnStart` statuses, skipping actors defeated there. Emit the completed turn and final outcome only after authoritative state is established. Defeat takes precedence if both sides die at a boundary.

Statuses are keyed by definition ID and specify `turnStart` or `turnEnd`; that matching boundary decrements duration. A newly cast self `turnEnd` buff ticks on its casting turn. Use duration 3 for a buff intended to affect two subsequent owner actions; do not silently defer the first tick. `refresh`, bounded `stack`, and `ignore` are existing behaviors. Combat statuses clear with the encounter; dungeon fountain modifiers are separate run effects that survive between encounters until the dungeon ends.

Commit all effects for an action before selecting another actor. Combat listener exceptions are reported after delivery is attempted, but state already committed; retrying the same attack would be incorrect. Reaction and multi-hit extensions must specify their interruption/death order before implementation.

## 7. Encounter results and save continuation

Victory is an encounter result, not automatically a cleared dungeon. `JourneySession.finishBattle` commits remaining resources, consumable use and weapon durability; on victory it also grants enemy XP/gold/drops and records clearance. XP can cross multiple levels and currently fully restores resources on each gained level. Defeat restores the hero at the refuge, clears the active dungeon, retains inventory/wear, and halves the current gold balance with flooring. It awards no victory XP/loot.

Current saves persist the pending encounter's entry hero and seed. Relaunching restarts that encounter; partially resolved battle state and animations are not restored. Manual save/load is blocked during an encounter. Existing debounced autosave is not a per-turn durable journal.

The [Skills plan](skills.md) adds an attributed, bounded training ledger inside BattleSession and a durable candidate-save result merge. Training from completed victory/defeat joins the same campaign transition once; abandoning/restarting an uncommitted attempt discards it. Future quests/titles follow the same boundary for combat evidence, with their own success requirements. Do not grant permanent progress from audio or animation callbacks.

## 8. UI and future extensions

Battle controls show HP/MP/SP, wounds/fullness, usable skill names/ranks, effective costs, selected targets, statuses, weapon durability, error reasons and a bounded combat log. Named target buttons provide an accessible alternative to sprites. Exact damage previews, explicit cooldown feedback and richer enemy intent are proposed additions; the current menu does not already expose every preview.

The UI may delay new player input while presentation is busy, but simulation and enemy turn execution must not wait for animation completion. Skipping/reducing motion changes only presentation. During battle, feature panels are inspection-only and the battle Item menu owns item actions.

Follow [Skills](skills.md) for the F/E pilot, passive action tags, cooldown owner turns, Final Hit timing, Counterattack reactions and Windmill. Critical rolls and area resolver support already exist; those mechanics are not reasons to defer the entire skill system. Shield/dual-wield equipment, HP costs, charge loading, extra attacks, battle movement, dynamic initiative, revival and exact mid-battle saves require separate extensions.

## 9. Implementation and acceptance

Integration owners are [BattleMachine](../../src/engine/battle/BattleMachine.ts), [BattleController](../../src/engine/battle/BattleController.ts), [CombatSystem](../../src/engine/ecs/systems/CombatSystem.ts), [BattleSession](../../src/game/BattleSession.ts), [JourneySession](../../src/game/JourneySession.ts) and [BattleScreen](../../src/ui/battle/BattleScreen.tsx). Keep formulas in the engine and UI views detached.

Verify fixed queue/ties/removal; selection/cancel without RNG or costs; hit/miss costs; target-dependent Healing; rejected commands leaving state unchanged; both damage branches; protection/critical caps; area draw order; Defend lifetime; status deaths and self-cast ticks; regeneration; wound limits; weapon wear/breakage; encounter result once; restart from entry state; and presentation-independent outcomes. Add attributed training/counter/cooldown fixtures when those features ship. Run the project's lint/typecheck and relevant Vitest suites, then validate touch controls and suspend/relaunch on devices.
