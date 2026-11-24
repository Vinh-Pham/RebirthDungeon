# Fixed-Speed turn-based battle contract

**Planned Defold implementation.** This is the detailed combat contract referenced by the [game plan](game-plan.md). All rules use pure Lua domain commands, the shared [transaction boundary](architecture.md), and the [selected Defold libraries](turn-based-rpg-battle-libraries.md). No dice, held faces, rerolls, combination multipliers, paid passes or resource reservations belong to this target. Browser-save conversion is deferred.

## Turn order and saved state

At encounter entry freeze player **Speed = 10 + floor(DEX / 10)** using resolved stats and the run baseline. White Spider Speed is **9**, Red Spider **12**, Giant Spider **8**; a future human test profile defaults to **11**. Sort descending. Shuffle equal-Speed groups once with the battle RNG, starting from stable actor-ID order; never randomize inside a sort comparator. Persist the final order.

Every living actor acts once per round. Skip defeated actors; mid-battle Speed changes do not reorder the queue. Save battle/run IDs, rules/content versions, actor references, captured Speeds, order/cursor/round, unique turn ID, turn-start-complete marker, item allowance, resources, cooldowns/statuses, RNG descriptor and bounded event history. Store actors once and refer to them by ID.

## Actions

| Action | Contract |
| --- | --- |
| Attack | Equipped weapon category, or unarmed melee; cost/rank follows Combat Mastery |
| Skill | Learned active skill; validate rank, equipment/race, targets, resources and cooldown |
| Defend | Defense skill's rank-based SP, Defense and Protection until next owner start |
| Item | One eligible consumable before the main action; save immediately, retain turn ID |
| Wait | Free emergency action only when no legal main action is affordable; no extra recovery or defense |

A main action ends the turn. Selecting a target/menu spends nothing. Select the first living enemy by default. Attack, Defend, and an available selected skill execute directly; no extra confirmation step. Self/area skills use their authored target rule. Failed item use consumes neither item nor allowance; inventory and battle menu share the same persisted allowance. Equipment changes require town with no active run.

All commands carry operation, actor, battle and expected-turn IDs. Validate inside the domain even when controls are disabled. Reject stale/wrong-phase/dead-actor/illegal-target/unaffordable commands without state, RNG or event changes. Wait eligibility considers legal main actions after any optional item use; it is not an ordinary Pass button.

## Combat Mastery and resources

Creation grants Combat Mastery F and Defense F alongside the talent starter skill/weapon. Rebirth preserves learned ranks and adds a new talent's starter skill without another item gift. `normal` identifies Normal Attack; it has no independent rank progression.

For rank index F = 0 through 1 = 14, Attack costs **2 + 0.1 × rank_index SP** (2.0–3.4). Apply modifiers and round the final positive Attack cost upward to one decimal place. Other positive skill costs round upward to whole numbers. Preserve fractional current resources.

| Combat Mastery ranks | Owner-start SP recovery |
| --- | ---: |
| F, E, D | 0.5 |
| C, B, A | 1.0 |
| 9, 8, 7 | 1.5 |
| 6, 5, 4 | 2.0 |
| 3, 2, 1 | 2.5 |

Cap recovery at maximum SP and record completion once per turn. Every damaging Attack trains Combat Mastery regardless of weapon; its attack bonus remains melee-only. Other qualifying melee training must not receive duplicate credit. HP costs bypass mitigation/shield and must leave at least 1 HP; validate all pools and pay before recovery from that action.

## Resolution, criticals and boundaries

Use the same stat/cost/damage helpers for previews and execution. Rank base, allowed weapon/stat contribution and rank attack multiplier supply offensive power. Each skill must specify its exact formula and multi-hit allocation in validated Lua content. No unverified wiki value is made executable. See [skills implementation](gameplay/skills-implementation.md) and [stats](gameplay/stats-implementation.md).

Apply flat Defense (Magic Defense for magical damage), floor the nonnegative result, apply an eligible critical bonus and floor, then Protection resistance and floor, then shields and actual HP loss. Zero damage is legal. Count weapon contribution once; broken weapons halve that contribution. A committed attack action loses one durability, regardless of hit count or animation count.

Use one critical decision per eligible target per action, shared by that target's hits. Resolve targets/effects in stable authored order. Counter-negated hits, retaliation, buffs and periodic effects do not critically hit. Show ordinary/critical possibilities without consuming RNG. Define chance 0/1 draw behavior in adapter fixtures. Arrow Revolver's five-arrow allocation must be explicitly ported from its source adaptation, not inferred from a generic multi-hit loop.

Healing restores `floor(rank.base × 5)` HP. Final Hit grants its rank base as a melee attack bonus; it does not stack or recast while active. Counterattack stores one reaction, negates the first eligible single-hit melee attack and uses skill power plus authored opponent-attack contribution; it cannot chain another counter or critical.

| Boundary | Effects |
| --- | --- |
| Owner start | Expire Defense/unused Counterattack; pay due Mana Shield upkeep; recover SP once; check termination; save initialized marker |
| Item | Apply recovery/status effects and mark allowance; no cooldown, duration or regeneration tick |
| Main action | Pay once; resolve authored effects/reactions; check termination after each applicable effect |
| Eligible owner end | Periodic effects, duration/cooldown updates, expiration, stat clamping, living-actor regeneration; advance cursor only if battle continues |

Self-applied ordinary statuses and cooldowns skip their casting/application turn end. Other statuses first tick at the affected actor's next eligible end. Defense/counters use their explicit start-boundary exceptions. Mana Shield pays once at each of the next three owner starts and expires on the third, not per attacking enemy. Combat Mastery recovery is separate from end-turn regeneration.

Stop when the hero is defeated or no living hostile remains; if both conditions occur at the same resolution boundary, defeat takes precedence. Do not run later effects or turns after termination. Periodic recovery cannot revive a defeated actor. Effects/cooldowns freeze during exploration and clear at run exit unless an explicit persistent effect is later designed.

## Session routing and retries

`enter → begin_turn → player_input / enemy_decision → commit → present → next_turn / victory / defeat`

A guarded begin-turn command performs due start effects and saves its marker. An item transaction returns to the same initialized turn. A main action saves costs, results, quest/training evidence, RNG, event batch and next uninitialized turn together. Save before publishing through Event or playing animations. A save error retains committed state; an uncertain result requires recovery inspection before retry.

On restart route from the saved cursor/marker. Do not replay recovery, upkeep or enemy actions because a screen initialized again. Reduced motion/headless execution can release presentation pacing without a renderer callback. Monarch navigation is derived from saved workflow checkpoints, not a serialized screen stack.

## Enemy content and policy

Spiders have **20 SP**, recover **0.5 SP** at owner start, pay **2 SP** for Attack and **1 SP** for Defend. Enemy Defend gives **+2 Defense and +5 percentage points Protection** until next owner start. Author HP/attack/defense/reward values in the enemy catalog before enabling encounters; there is no existing Defold catalog to preserve.

| Enemy skill | Effect | Cost / cooldown |
| --- | --- | --- |
| White Spider: Pounce | 1.25× attack | 4 SP / two subsequent owner turns |
| Red Spider: Poison Bite | Normal attack power plus Poison | 4 SP / two subsequent owner turns |
| Giant Spider: Armor Break | Normal attack power plus Armor Break | 4 SP / two subsequent owner turns |

Poison and Armor Break belong to these named skills, not every normal hit. A counter-negated skill applies no affliction. AI chooses an allowed potion at ≤35% HP; then Defend at ≤25% HP if it did not defend last turn; otherwise a ready affordable skill, Attack, affordable Defend, or legal Wait. Persist an optional item before choosing the main action. Only explicitly permitted profiles have finite items; a human-with-one-potion fixture verifies this without adding human encounters to Alby.

AI only selects ordinary commands. It cannot spend resources or resolve damage outside the shared engine.

## Presentation and delivery

Druid provides Attack / Skills / Items / Defend, target selection, turn strip, precise costs, cooldowns, disabled reasons and Item available/used. Defold world objects show combatants and highlights. Event notifications drive the compact log, hit feedback and audio after commit. Tweener/native animations remain cosmetic and cancel on unload. See [battle presentation](gameplay/battle.md) and [combat log](combat-log.md).

Implement starter skills and spiders during milestone 4; expand ranked/status content in milestones 5–6. Lester must cover fixed order/ties, every mastery rank, fractional costs, item allowance, timing, counters/criticals, stale/duplicate commands, termination and deterministic retry. The engine harness must prove actual RNG continuation, DefSave recovery, GUI input and restart between enemy turns. [Verification](verification.md) contains release gates; no completed browser checks count as Defold evidence.
