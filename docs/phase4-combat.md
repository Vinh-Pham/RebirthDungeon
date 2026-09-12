# Phase 4: Godot starter combat contract

Implementation and verification: [Phase 4 implementation](phase4-implementation.md), [dated evidence](evidence/phase4/README.md). The [phase tracker](project-phases.md) owns completion status. All numbers below are provisional content fixtures. [Battle](gameplay/battle.md) owns five-dice rules; [Stats](gameplay/stats.md) owns arithmetic and timing.

## Starter actions

| Skill | Rank | HP/MP/SP cost | Effect | Target |
| --- | --- | --- | --- | --- |
| `skill.sword` | F / E | 0/0/5 | Base 2 / 4, physical attack, pip scale 1; weights 1/1/1/1/1/1 at F and 1/1/1/1/2/2 at E | One living hostile; sword required |
| `skill.fortify` | F | 0/0/4 | Replace shield with floor((2 + pips) × combination); lasts through one subsequent owner activation; cooldown one subsequent owner activation | Self |
| `skill.focus` | F | 0/3/0 | STR +3 for three subsequent owner activations; dice do not alter magnitude/duration | Self |
| `skill.spark` | F | 0/5/0 | Base 2, magic attack, pip scale 1, fair dice | One living hostile |
| `skill.blood` | F | 4/2/2 | Base 2, physical attack, pip scale 1, fair dice; HP payment leaves at least 1 | One living hostile |
| `skill.enemy_strike` | F | 0/0/3 | Base 4, physical attack, no pips, multiplier 1; apply STR −3 for three target activations after a surviving hit | Hero; no dice |

Sword and Fortify prove the first encounter; the remaining skills are test/extension fixtures before broad content release. Fortify is a shield here, not the illustrative Defense-buff example in the general stats spec. Author the hero/enemy base pools, attack/defense values, first-actor rule and exact encounter rewards before marking combat complete. Avoid treating unspecified stats as final balance.

## Turns, scoring and recovery

Use five indexed dice, one initial roll and two batch rerolls. Rerolls validate all indices before sampling in increasing index order. Lock selected skill/rank, target, stats, weights and full cost vector on the first roll. Keep toggles consume no turn/RNG. After locking, selection and item use are unavailable. No movement command exists inside battle.

Use the eight multipliers in [Battle](gameplay/battle.md#4-combinations-and-pip-scoring), stored as rational values. One whole hand resolves one skill. Free pre-roll pass spends no skill resources; post-roll pass pays the reserved vector and discards the hand. Enemy activations occur only after a committed player action/pass, never during rerolls.

Starter regeneration is 0 HP, 1 MP and 2 SP per completed living-actor activation, after effects, expiry and resource clamping. Exhausted actors may pass; enemies also validate affordability and regenerate. Recovery cannot pay the upfront cost of its own action. No exploration-time regeneration occurs. Explicit free town recovery and bounded potions arrive with [the first loop](free-exploration.md).

## Resolution and state ownership

Implement typed battle state and rules independently of the battle scene. Costs pay once before effects. Resolve defense, combination, protection and shield using the shared preview/commit resolver and explicit rounding. HP costs bypass mitigation. Status replacement, self-application timing, periodic effects, expiry and regeneration follow Stats. Shield/cooldown durations skip their casting boundary.

One runtime actor record owns each HP/MP/SP pool and reservation. Content Resources never hold live pools. End the actor activation once, resolve periodic defeat, then choose the next actor or outcome. Hero defeat wins simultaneous outcome evaluation. Encounter victory adds pending rewards; only dungeon exit commits them to the profile.

## Acceptance

- [x] Exhaustively classify all 7,776 five-die hands into one correct combination.
- [x] Verify weighted sample boundaries, subset rejection, kept flags and reroll budgets.
- [x] Verify mixed costs, nonlethal HP payment and paid versus free pass.
- [x] Compare previews with committed effects; test defense/protection/shield rounding and bounds.
- [x] Verify status replacement, skipped casting boundary, expiry, regeneration and periodic defeat.
- [x] Reject stale/duplicate commands without additional RNG, effects or resource payment.
- [x] Export/restore the same unfinished activation and RNG continuation in headless tests.
- [x] Run one-hero/one-enemy battle in a Godot scene; movement and animations never advance it.

Durable disk continuation is Phase 6. No historical test counts or mobile outcomes are carried forward.
