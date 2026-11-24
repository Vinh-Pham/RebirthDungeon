# Stats implementation contract for Lua

**Planned port, not a shipped rules version.** Implement [stats.md](stats.md) through pure Lua modules under proposed `game/domain/stats/`; use copied transaction candidates and runtime validation. The [game plan](../game-plan.md) owns delivery, and [turn-based-plan.md](../turn-based-plan.md) owns action boundaries.

## Numeric policy

Retain growth to four decimal places, floor integer stats once per calculation stage, and retain Protection to two decimal places. Represent percent modifiers in integer basis points (100 = 1%). Fixed dependency order is primary attributes → combat stats. Modifier insertion order must not change results.

| Derived stat | Attribute contribution before direct modifiers |
| --- | --- |
| Melee attack | STR × 0.10 |
| Ranged attack | DEX × 0.10 |
| Magic attack | INT × 0.10 |
| Dual gun attack | STR × 0.05 + INT × 0.05 |
| Defense | STR × 0.05 |
| Magic Defense | WIL × 0.05 |
| Magic Protection | INT × 0.05 percentage points |
| Protection / regeneration | Zero unless a source grants it |
| Encounter Speed | 10 + floor(DEX / 10), then frozen |

These conversions are project adaptations retained from the design. Resource maxima come from explicit progression/source values. LUK has no implicit effect. Protection clamps to 0–100%; other resolved stats cap at 1,000,000 and floor at zero except Max HP ≥1. Bound source lists and status durations (at most 1,000 owner turns). Reject nonfinite values and invalid units.

Each learned skill, equipment instance, title slot and live status contributes once. Freeze run sources and preserve fractions; represent breakage as a named live weapon-contribution penalty. Maximum increases do not refill current pools.

## Costs and effects

Attack's Combat Mastery cost rounds upward to tenths, minimum 0.1 after modifiers; other positive costs round upward to whole numbers, minimum 1. Zero authored pools stay zero. Validate combined costs, pay before effects, and require HP after payment ≥1. Mana Recovery requires **5 SP up front** in its planned adaptation.

Defense supplies rank-derived Defense/Protection in the Guard group and expires at **next owner turn start**. Counterattack has the same unused-expiration boundary. Mana Shield pays on each of three subsequent owner starts and expires on the third. Ordinary effects/cooldowns use owner ends, excluding the casting/application turn; optional items never tick them.

## Additional content for later coverage

These are authored balance proposals to port and validate after the starter combat slice, not items currently installed in shops.

| Content | Proposed rule |
| --- | --- |
| Blood Strike | Melee trainer skill; 4 HP + 3 SP; one enemy |
| Arcane Focus | Wand skill; 6 MP; +6 Magic Attack for three subsequent owner turns |
| Strength Draught | 18 gold; +10 STR for three turns |
| Unstable Elixir | 12 gold; immediate 45 MP and −15 WIL for three turns |
| Renewal Tonic | 20 gold; 5 HP at three eligible owner ends |
| Antidote / Cleansing Tonic | 12 / 25 gold; remove eligible poison / harmful statuses; invalid use consumes nothing |
| Vigor Coat | 95 gold; +2 Defense, +10 Max HP, +2 SP regeneration at owner end |
| Focus Wand | 120 gold; weapon power 10, +10 INT, −20% MP cost |
| Poison | 3 damage for three eligible owner ends; applied by Red Spider Poison Bite |
| Armor Break | −4 Defense for two eligible owner ends; applied by Giant Spider Armor Break skill |

Enemy afflictions belong to named skills, not normal attacks; counters that negate the attack also prevent its affliction. Greater Strength (+20 STR at higher priority) and Exhaustion (+50% SP cost) remain future content definitions. Life references/Wand Mastery are not executable skills.

## UI, persistence and acceptance

Druid Character panels show identity, level/AP, current/max resources, Speed, named stat sources, shield and effects. Basic Info and Additional Info can separate totals from explanations; unsupported Part-Time Job/Potential views display unavailable. Use Defold GUI meters and scroll layouts at the desktop acceptance sizes; no browser components or reservation display.

Persist source definitions/versions and timing counters through the common DefSave boundary. Use Lester fixtures for rounding, additive modifiers, no-refill changes, costs, every timing exception and terminal poison. Verify engine save/restart and character switching. Browser schema numbers and migration results do not apply; begin a separately versioned Defold format.
