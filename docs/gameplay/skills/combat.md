# Combat skills

**Reference documentation for the eleven close-combat skills behind [skills](../skills.md) and the [fixed-Speed battle contract](../../turn-based-plan.md).** Each skill records its reference-game behavior, this project's turn-based adaptation, and how the adaptation becomes Defold Lua. Reference facts come from the saved [wiki snapshots](../../references/skills/README.md) (Mabinogi World Wiki, retrieved 2026-09-18 and 2026-09-21 through Firecrawl). Wiki numbers are historical data: nothing is executable until it exists as validated, versioned content per the [implementation contract](../skills-implementation.md) and [architecture](../../architecture.md).

## Catalog at a glance

| Skill              | Kind            | Reference core                                                             | Project scope                                          |
| ------------------ | --------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| Combat Mastery     | Passive         | Melee min/max damage, Balance, HP, STR/DEX per rank; anchors Normal Attack | Granted at creation (F); shares its rank with `normal` |
| Smash              | Active          | Single 150%–500% blow; bypasses Defense; knockdown                         | Close Combat talent starter                            |
| Defense            | Active buff     | Rank Defense/Protection while held; blocks one hit; shields multiply       | Granted at creation (F); Defend command                |
| Counterattack      | Active reaction | Negates one melee hit, returns enemy% + self%                              | Starter timing (milestone 5)                           |
| Windmill           | Active AoE      | 170%–400% to all enemies in radius                                         | Milestone 6; all living hostiles, one cost             |
| Assault Slash      | Active          | 70%–260% strike, downed targets only; bypasses Defense/Counter             | Milestone 6; needs a `downed` boundary first           |
| Critical Hit       | Passive         | +50%–150% critical damage; rank F gates critting                           | Authored chance; one decision per target/action        |
| Dual Wield Mastery | Passive         | Min/max damage, Balance, Crit while dual wielding                          | Paired distinct swords only; half-power off hand       |
| Sword Mastery      | Passive         | Min/max damage, Balance with swords                                        | Counted once across both hands                         |
| Axe Mastery        | Passive         | Min/max damage, Crit, Armor Pierce with axes                               | Passive while an axe is equipped                       |
| Shield Mastery     | Passive         | Def/Prot/MDef/MProt/Auto-Def scaled by shield size                         | Requires matching shield gear                          |

## Shared conversion from real time to fixed-Speed turns

| Reference mechanic                                 | Turn-based rule                                                                                                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load time (0 s for all eleven)                     | No load step; the skill is one main action on the owner's turn                                                                                                                         |
| Cooldown seconds                                   | `ceil(seconds ÷ 6)` turns, starting at the casting owner's end (that owner end is skipped)                                                                                             |
| Stamina cost                                       | SP cost; positive values round up to whole numbers. `normal` alone keeps the fractional Combat Mastery curve: 2 + 0.1 × rank index SP (2.0–3.4, final value rounded up to one decimal) |
| Knockdown / downed                                 | Non-spatial `downed` status on the actor record with an authored expiry boundary; Windmill/Smash apply it, Assault Slash requires it                                                   |
| Radius, range, splash geometry                     | Authored target rules: `single`, `all_living_hostiles`, `single_downed`, `self`; no spatial legality (see [battle](../battle.md))                                                      |
| Real-time interception (loaded skills auto-firing) | Authored resolution precedence inside the main-action boundary; no auto-execution (matrix below)                                                                                       |
| Race rows (Human/Elf/Giant)                        | Transcribed only for supported races; merged or unknown cells stay unknown                                                                                                             |
| Dan 1–3, Combat Power, master titles               | Out of scope; ranks F–1 only                                                                                                                                                           |

## Shared damage pipeline

Offensive power is `(rank base + eligible weapon/stat contribution) × rank attack multiplier`. Weapon contribution enters once per action and is halved while that weapon is broken. Mitigation follows the battle contract exactly, flooring between stages:

1. Flat Defense (Magic Defense for magical damage) → floor, clamped at zero.
2. Critical bonus multiplier → floor.
3. Protection resistance → floor.
4. Shield absorption, then actual HP loss. Zero damage is legal.

One critical decision is made per eligible target per action and is shared by that target's hits. Counter retaliation, buffs and periodic effects never roll criticals. Previews show normal and critical possibilities using the same helpers without consuming battle RNG; the only consumed draws are counted `number()` samples from the battle stream, and the RNG descriptor joins the save.

## Defold implementation shape

Module ownership follows the [architecture contract](../../architecture.md):

- `game/content/skills.lua` (proposed split: `game/content/skills/`) holds versioned definitions with stable IDs, F–1 rank records, target rule, resource cost vector, cooldown boundary, ordered effects, training objectives and source provenance.
- `game/domain/battle/` validates and resolves commands against a copied candidate; nothing outside the domain computes costs or damage.
- The battle RNG stream supplies only crit draws; previews draw nothing.
- One DefSave envelope per command carries costs, damage, statuses, cooldowns, training, the RNG descriptor, the event batch and the next turn checkpoint. Defold Event and Druid rendering run strictly after a confirmed save.

A content definition for the eleven skills, with rank index F = 0 … 1 = 14 (compare indices, never labels):

```lua
-- game/content/skills/combat.lua (catalog slice; values marked "F reference"
-- come from the saved snapshots and ship only after Lester fixtures approve
-- the transcription per skills-implementation.md)
local M = {}

M.rank_index = { F = 0, E = 1, D = 2, C = 3, B = 4, A = 5,
  ["9"] = 6, ["8"] = 7, ["7"] = 8, ["6"] = 9, ["5"] = 10,
  ["4"] = 11, ["3"] = 12, ["2"] = 13, ["1"] = 14 }

M.definitions = {
  normal = {
    kind = "active", category = "combat", target_rule = "single_living_hostile",
    -- Combat Mastery curve; final cost rounds up to one decimal place.
    sp_cost = function(rank) return 2 + 0.1 * rank end, rounding = "one_decimal",
    effects = { { type = "melee_damage", multiplier = 1.0, hits = 1,
                  trains = "combat_mastery" } },
  },
  smash = {
    kind = "active", category = "combat", target_rule = "single_living_hostile",
    sp_cost = 4, cooldown_turns = 1,                 -- F reference; wiki 3 s
    effects = { { type = "melee_damage", hits = 1,
      multiplier_by_race = { human = 1.5, giant = 2.0 },     -- F reference
      two_handed_bonus = { multiplier = 1.2, critical_add = 5 },
      bypasses_reaction = "defense", knocks_down = true } },
  },
  defense = {
    kind = "active", category = "combat", target_rule = "self",
    sp_cost = 1, cooldown_turns = 2,                 -- F reference; wiki 7 s
    effects = { { type = "guard", until_boundary = "next_owner_start",
      defense_bonus = 20, protection_bonus = 5,              -- F, Human/Elf
      blocks_hits = 1, mitigates = { "normal", "windmill" } } },
  },
  counterattack = {
    kind = "active", category = "combat", target_rule = "self",
    sp_cost = 2, cooldown_turns = 2,                 -- F reference; wiki 7 s
    effects = { { type = "store_reaction", until_boundary = "next_owner_start",
      reactions = 1, eligible_against = { "normal", "smash" },
      ignores = { "windmill", "assault_slash", "ranged", "magic" },
      enemy_damage_pct = 50, self_damage_pct = 100,          -- F reference
      can_critical = false, can_chain = false } },
  },
  windmill = {
    kind = "active", category = "combat", target_rule = "all_living_hostiles",
    sp_cost = 2, cooldown_turns = 1,                 -- F reference; wiki 3.5–4.5 s
    effects = { { type = "melee_damage", hits = 1,
      multiplier_by_race = { human = 1.7 },                  -- F reference
      knocks_down = true, one_cost_for_all_targets = true } },
  },
  assault_slash = {
    kind = "active", category = "combat", target_rule = "single_downed_hostile",
    sp_cost = 5, cooldown_turns = 2,                 -- F reference; wiki 7 s
    effects = { { type = "melee_damage", hits = 1,
      multiplier = 0.7,                              -- F reference
      bypasses_reaction = { "defense", "counterattack" } } },
  },
  combat_mastery = {
    kind = "passive", category = "combat",
    effects = { { type = "stat_bonus", min_damage = 1, max_damage = 2,
        hp = 10, balance = 1, melee_only_damage = true },    -- F, Human
      { type = "sp_recovery_at_owner_start", value = 0.5 } }, -- F/E/D tier
  },
  critical_hit = {
    kind = "passive", category = "combat",
    effects = { { type = "critical_bonus", bonus_damage_pct = 50,   -- F
      chance = "authored_content", no_passive_chance = 0 } },
  },
  dual_wield_mastery = {
    kind = "passive", category = "combat",
    requires_equipment = "two_distinct_swords", race_block = { "elf" },
    effects = { { type = "stat_bonus", counted_once = true,
      rows = "pending_merged_column_review" } },
  },
  sword_mastery = {
    kind = "passive", category = "combat", requires_equipment = "sword",
    effects = { { type = "stat_bonus", counted_once = true,
      min_damage = 1, max_damage = 2, balance = 1 } },       -- F reference
  },
  axe_mastery = {
    kind = "passive", category = "combat", requires_equipment = "axe",
    effects = { { type = "stat_bonus", min_damage = 1, max_damage = 2,
      critical_add = 1, armor_pierce = 1 } },                -- F reference
  },
  shield_mastery = {
    kind = "passive", category = "combat", requires_equipment = "shield",
    effects = { { type = "defense_bonus", by_shield_size = {
      small = { defense = 0, protection = 1 },               -- F reference
      medium = { defense = 3, protection = 1 },
      large = { defense = 5, protection = 1 } } } },
  },
}

return M
```

Runtime validation rejects unknown effect kinds, nonfinite costs, missing equipment references and ranks without reachable training objectives before any battle loads the catalog. Passive rows are applied once during stat resolution when the learned rank and equipment condition both pass; they never appear as actions.

The resolution core runs once per committed main action, inside the session candidate:

```lua
-- game/domain/battle/combat_resolve.lua (illustrative core; pure Lua)
local M = {}

-- Mitigation order from the battle contract, floored between stages.
function M.apply_damage(target, raw, ctx)
  local d = math.floor(math.max(0, raw - (ctx.flat_defense or 0)))
  if ctx.critical then
    d = math.floor(d * (1 + (ctx.critical_bonus_pct or 0) / 100))
  end
  d = math.floor(d * (1 - (ctx.protection or 0)))          -- Protection as a fraction
  local absorbed = math.min(d, ctx.shield or 0)
  target.hp = target.hp - (d - absorbed)
  return { damage = d - absorbed, absorbed = absorbed, critical = ctx.critical or false }
end

-- One critical decision per eligible target: the action's only battle-RNG draw.
-- Chance is authored content; it is 0 without the Critical Hit passive.
local function roll_critical(rng, chance)
  if chance <= 0 then return false end
  if chance >= 1 then return true end                      -- behavior fixed in fixtures
  return rng:number() < chance
end

function M.resolve(candidate, battle, actor, action, content, rng)
  local def = assert(content.skills.definitions[action.skill_id])

  -- 1. Guarded validation: phase, active owner, expected turn, living targets,
  --    equipment/race eligibility, cooldown, affordable pools. Any failure
  --    rejects with a reason and leaves state, RNG and events untouched.
  -- 2. Pay once. SP rounds per the definition; HP costs leave at least 1 HP.
  local targets = content.targets.expand(def, battle, actor, action)

  for _, target in ipairs(targets) do                      -- stable authored order
    local crit = roll_critical(rng, content.critical_chance(actor, def))
    for _ = 1, def.effects[1].hits or 1 do
      local raw = content.offensive_power(actor, def, target) -- masteries + weapon,
                                                              -- counted once; broken
                                                              -- weapons contribute half
      local reaction = target.statuses.reaction
      if reaction and reaction.kind == "counterattack"
          and content.counter_eligible(reaction, def) then
        reaction.consumed = true                           -- one reaction, no chain
        local power = content.counter_power(target, actor, reaction)
        M.apply_damage(actor, power, content.mitigation(actor, { no_critical = true }))
      else
        local ctx = content.mitigation(target, { critical = crit })
        local result = M.apply_damage(target, raw, ctx)
        if def.effects[1].knocks_down and result.damage > 0 then
          target.statuses.downed = content.downed_boundary(battle, target)
        end
      end
      if content.terminated(battle) then break end         -- check after each effect
    end
    if content.terminated(battle) then break end
  end

  -- 3. Start cooldowns (the casting owner end is skipped), apply statuses and
  --    training credit, collect the event batch and the RNG descriptor.
  -- 4. Return the candidate for validation and one DefSave commit; Event and
  --    presentation run only after the save is confirmed.
end

return M
```

## Combat Mastery

**Reference** ([snapshot](../../references/skills/combat-mastery.md)). Passive melee foundation: +10 HP and +1% melee Balance per rank (rank 1: +150 HP, +15% Balance), plus min/max melee damage, STR and DEX that differ by race (Human F: +1 min / +2 max; Human rank 1: +22 max). The damage bonus applies to all melee weapons and never to ranged weapons; the Balance bonus applies to all weapons. While dual wielding, its bonuses apply once, not per weapon. Every character receives it at creation.

**Adaptation.** Granted at rank F with Defense F at creation. `normal` (Normal Attack) owns no separate progression: it displays Combat Mastery's rank, pays 2 + 0.1 × rank index SP (2.0–3.4, rounded up to one decimal) and records training through it. Owner-start SP recovery is tiered by rank — F–D 0.5, C–A 1.0, 9–7 1.5, 6–4 2.0, 3–1 2.5 — capped at maximum SP and recorded once per turn. The attack bonus stays melee-only and counts once per action. Every damaging Attack trains Combat Mastery regardless of weapon category; other qualifying melee training must not double-credit.

**Defold.** Passive stat rows resolve with equipment; the cost curve and recovery tier live as content functions, with Lester fixtures for fractional-cost rounding, recovery capping and single training credit per action.

## Smash

**Reference** ([snapshot](../../references/skills/smash.md)). One heavy blow: rank F 150% (Human/Elf) or 200% (Giant) damage; rank 1 500%/600% (Dan 3: 800%/900%). It bypasses the Defense skill, knocks the target down, and with two-handed weapons gains ×1.2 damage and +5% critical (not on knuckles or scythes). Rank 5+ adds splash damage (10–20%) and weapon debuffs (swords/axes: Bleed 5%/s for 5 s; blunts: Daze). In real time, a loaded Counterattack or Windmill intercepts an incoming Smash. Stamina 4 at F (higher rows partial in the snapshot), 3-second cooldown, unusable with bows, crossbows, atlatls and dual guns.

**Adaptation.** The Close Combat talent starter action: single living hostile, one hit, 4 SP at F, cooldown `ceil(3 ÷ 6)` = 1 turn. Authored bypass: an active Defense guard does not mitigate Smash; a stored Counterattack still negates and retaliates because Smash is an eligible single-hit melee attack. Real-time interception is dropped — turn order already decides who acts and nothing auto-fires. The two-handed multiplier and critical addition are authored weapon-class conditions. Splash and debuffs are milestone-6 effects with their own target rows. Knockdown applies the `downed` status with an authored expiry boundary (the victim's next owner start) so Assault Slash later has a legal target.

**Defold.** Definition row `smash` above. Fixtures: Defense bypass versus ordinary guard mitigation, counter negation still applying, one-turn cooldown, race multiplier selection, and no state change on rejection.

## Defense

**Reference** ([snapshot](../../references/skills/defense.md)). While held, raises Defense and Protection (Human/Elf F: +20/+5 → rank 1: +65/+35; Giant F: +30/+10 → +80/+45) and blocks one attack, interrupting the blocked attacker. A shield strengthens a blocked hit further: small −50%, medium −70%, large −100% total damage. It grants no Magic Defense/Protection, so magic is unaffected. Passive growth: +2…+41 HP and base Defense (Human +3…+20, Elf +1…+15, Giant +5…+30). Rank 5+ grants nearby allies a small party Defense bonus. Bypassed by Smash, Assault Slash and most magic; 1 SP at F (5 at rank 1); 7-second cooldown after a successful defend; unusable with lances.

**Adaptation.** Granted at creation (F) and exposed as the Defend command. Self target rule; the guard lasts until the next owner start, where the boundary table expires it. Its flat Defense and Protection feed the shared pipeline; shield size applies an authored multiplier to a guarded hit. One hit blocked per guard (`blocks_hits = 1`). A fully mitigated guarded hit grants Defense's full-block training; counter-negated attacks and partial blocks grant nothing. The enemy profile is authored separately: spiders pay 1 SP for +2 Defense and +5 percentage points of Protection.

**Defold.** The `guard` effect writes a bounded status (`until_boundary = "next_owner_start"`) plus a remaining-blocks counter. Fixtures: expiry at owner start, one-block consumption, full-block versus partial training credit, no mitigation versus magic, and a disabled reason when SP is short.

## Counterattack

**Reference** ([snapshot](../../references/skills/counterattack.md)). Evades/blocks one physical melee attack and immediately strikes back. Damage is `enemy% + self%` of the two fighters' normal damage — skill multipliers do not inflate the enemy share (countering a rank 1 Smash returns the attacker's normal damage, not 500% of it). Human/Giant enemy share: F 50% → rank 1 200%; self share: Human/Elf F 100% → rank 1 175% (Giant 100% → 200%); race rows differ. A counter's critical uses the target's critical rate plus the skill's activation bonus, ignoring the user's base crit. Countered enemies are knocked down; no Wounds. It does not trigger against Windmill, Assault Slash, archery or magic. Stamina 2 at F plus a 1/s drain in real time; 7-second cooldown (4 s with knuckles); +1…+15 DEX.

**Adaptation.** Stores one reaction until the next owner start. It negates the first eligible single-hit melee attack and retaliates with skill power plus the authored opponent-attack contribution; it cannot chain a second counter and cannot critically hit (battle contract). The real-time drain collapses into one whole-number SP payment at commit. Eligibility excludes Windmill, Assault Slash, ranged and magic classes; the reaction expires unused at owner start otherwise.

**Defold.** The actor record carries `{ kind = "counterattack", reactions = 1, consumed = false }`; the resolution loop's reaction gate consumes it before mitigation. Fixtures: single consumption, no chain after retaliation, no critical on retaliation, expiry at owner start, rejected command when SP is insufficient.

## Windmill

**Reference** ([snapshot](../../references/skills/windmill.md)). A 360° spin that hits every enemy in radius: Human/Giant 170% at F → 400% at rank 1 (Dan 3: 500%); Elf 170% → 320%. It ignores target Protection when computing its critical rate, knocks enemies down (though enemies holding Defense are not knocked down), and has a radius that grows 360 → 600 with rank. In real time it intercepts an incoming Smash, while Counterattack never triggers against it. Stamina 2 at F (higher rows partial); cooldown ≈3.5–4.5 s by race and rank; +1…+30 STR and +3…+50 Will.

**Adaptation.** Target rule `all_living_hostiles`, resolved in stable authored order with exactly one SP payment regardless of how many enemies it hits. Each target runs the shared pipeline and gets its own critical decision. The wiki's "crit rate ignores Protection" has no direct analogue while critical chance is authored content rather than a derived stat — the provenance note records it, and Windmill's damage still applies Protection normally. Knockdown applies `downed` on any hit that deals damage; a guard that fully mitigates prevents it (authored, mirroring the wiki). Cooldown `ceil(4 ÷ 6)` = 1 turn. Multi-target defeat credit counts distinct enemy IDs once each.

**Defold.** The resolution loop already handles the multi-target case: expand targets in stable order, pay once before the loop, check termination after each target's effect. Fixtures: one cost for N targets, order stability across saves, mid-loop termination, no counter trigger against it.

## Assault Slash

**Reference** ([snapshot](../../references/skills/assault-slash.md)). A leap-slam usable only against knocked-down targets (Play Dead counts). Damage 70% at Novice → 260% at rank 1 (Dan 3: 350%); the mid-rank rows are merged in the snapshot and need HTML review. It bypasses Defense, Counterattack and other counters, and once committed always connects. Swords/blunts/axes add splash (50–70%). Usable even while the user is stunned or knocked down. Stamina 5 at F; 7-second cooldown; range 800–1100; learned via the Fighting Lessons quest or Smash C plus Trefor.

**Adaptation.** Target rule `single_downed_hostile`: legality requires the target to carry `downed` at resolution time, which depends on authoring the downed boundary first — hence milestone 6. One hit, 5 SP at F, cooldown `ceil(7 ÷ 6)` = 2 turns. "Always connects" becomes: once the command validates, reactions cannot intercept it (bypasses both Defense and Counterattack) and nothing cancels it. This is the first skill whose legality reads another actor's status, so its disabled reason must surface in the battle menu.

**Defold.** Validation adds the `downed` check and Druid shows "Target not downed". Fixtures: rejection without state change on a standing target, success on a target downed by a previous action, expiry of `downed` at the victim's owner start closing the window.

## Critical Hit

**Reference** ([snapshot](../../references/skills/critical-hit.md)). Passive critical damage: +50% at F → +150% at rank 1, with +3…+45 Will. Rank F is required to score any critical outside counters, and the practice rank arrives by advancing Combat Mastery or Ranged Attack to F. AP cost 3 at F through 20 at rank 1 (132 total).

**Adaptation.** The rank supplies the bonus-damage percent applied between the two pipeline floors. Critical _chance_ is authored content, not a Luck/Will/Protection conversion, and is zero without this passive. One critical decision per eligible target per action is shared by that target's hits; counter retaliation, buffs and periodic effects never roll. Previews display both normal and critical possibilities without consuming RNG.

**Defold.** `roll_critical` above: one counted battle-RNG `number()` draw per eligible target, with chance 0 and chance 1 behavior pinned in adapter fixtures. Fixtures also cover the shared decision across multi-hit actions (Arrow Revolver later), no draws on previews, and no crit rolls from retaliation.

## Dual Wield Mastery

**Reference** ([snapshot](../../references/skills/dual-wield-mastery.md)). While dual wielding, raises min/max melee damage, Balance, Critical, Armor Pierce and Auto Defense (rank 1 endpoints: +10 min/max damage, +15% Balance, +14% Critical; several mid-rank cells merged in the snapshot and pending review). Elves cannot learn it; "pseudo-dual-wield" weapons gain nothing; the master title's critical applies to magic too (out of scope).

**Adaptation.** Activates only with two distinct paired swords; dual guns occupy both hands without granting dual-wield effects, and paired-set weapons don't count. The off-hand sword contributes half its own weapon power — not half of all derived attack. Every contribution counts once per action. Elf rejection is an authored race gate independent of talent.

**Defold.** Equipment-eligibility gate at stat resolution re-evaluates on equipment change (town-only, so within battle it is frozen with the run baseline). Snapshot cells flagged unknown stay non-executable until reviewed against source HTML. Fixtures: no bonus with one sword or dual guns, single counting across both hands, elf rejection.

## Sword Mastery

**Reference** ([snapshot](../../references/skills/sword-mastery.md)). With swords: min damage +1…+10 and max damage +2…+20 (endpoint rows; mid-rank cells merged), sword Balance +1…+15%, plus DEX. The bonus applies once when a Human dual wields two swords, and never displays on the weapon.

**Adaptation.** Passive keyed to sword-category equipment in either hand, counted once per action even while dual wielding. Damage rows are melee-only; the Balance row applies to sword attacks. Values transcribe only after merged-column review.

**Defold.** Same passive-resolution path as the other masteries. Fixtures: one-sword versus paired-sword contribution identical (counted once), no effect without a sword, broken main hand halves only that weapon's contribution.

## Axe Mastery

**Reference** ([snapshot](../../references/skills/axe-mastery.md)). With axes: min damage +1…+10 and max damage +2 (F) → +20 (rank 1), critical +1…+15%, Armor Pierce +1…+22, plus Will. Changes never show on the weapon.

**Adaptation.** Passive while an axe is equipped. The critical addition feeds authored critical chance content. Armor Pierce has no pipeline analogue yet — the closest hook is reducing flat Defense before the first floor — so it stays reference-only until an authored rule exists.

**Defold.** Passive row with `armor_pierce` marked reference-only; validation forbids executing unknown effect kinds, so the row cannot silently half-work. Fixtures: crit-add contribution, no pierce effect until authored, single counting.

## Shield Mastery

**Reference** ([snapshot](../../references/skills/shield-mastery.md)). With a shield: Defense, Protection, Magic Defense, Magic Protection and Auto Defense bonuses scaled by shield size. Large-shield endpoints: +30 Defense, +15 Protection, +15 Magic Defense, +5 Magic Protection at rank 1; medium and small scale down; Auto Defense +2…+8%. Bigger shields gain more.

**Adaptation.** Passive requiring matching shield gear; light/heavy armor masteries are separate and mutually exclusive. Defense/Protection rows feed the guard pipeline and baseline mitigation; Magic Defense/Protection rows activate only when magical damage content exists; Auto Defense has no analogue and stays reference-only.

**Defold.** The equipment catalog tags each shield small/medium/large; the passive selects its row by that tag and recomputes derived stats at run entry. Fixtures: no bonus without a shield, size-scaled values, no magic contribution before magical content exists.

## Interaction and precedence matrix

Real-time Mabinogi lets loaded skills auto-fire to intercept attacks. The turn-based adaptation removes auto-execution: the acting actor resolves its command, and defenders act only through stored reactions. The wiki's bypass relationships are retained as authored rules.

| Attacker's action | Defender's active guard/reaction | Authored result                                                                              |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| Normal Attack     | Defense                          | Pipeline with guard Defense/Protection and shield multiplier; full mitigation trains Defense |
| Normal Attack     | Counterattack                    | Hit negated; one retaliation (enemy% + self%); no crit, no chain                             |
| Smash             | Defense                          | Guard bonuses do not apply (Smash bypasses Defense); base mitigation still runs              |
| Smash             | Counterattack                    | Eligible single-hit melee: negated and retaliated                                            |
| Windmill          | Defense                          | Damage applies through the guard; no knockdown when the guard fully mitigates                |
| Windmill          | Counterattack                    | Not triggered (wiki: counters never work against Windmill)                                   |
| Assault Slash     | Defense or Counterattack         | Bypasses both; legality requires the `downed` status                                         |
| Any melee hit     | `downed` status                  | No defensive effect; opens Assault Slash as the attacker's next action                       |

## Testing checklist

Lester covers rules; engine integration covers Defold specifics (see [verification](../../verification.md)):

- Rank curves and rounding: `normal` 2.0–3.4 SP one-decimal rounding; every other positive cost rounds to a whole number.
- Critical: exactly one draw per eligible target per action, shared across hits; chance 0/1 adapter fixtures; no draws for previews, rejections or retaliation.
- Counterattack: one stored reaction, single consumption, no chaining, no critical, owner-start expiry surviving save/reload.
- Windmill: one payment for N targets, stable authored order across restarts, termination checked after each target.
- Bypass matrix: every row above as a fixture, including Defense training credit only for full mitigation.
- Masteries: single counting per action, off-hand sword at half weapon power, dual-guns and one-sword cases, elf dual-wield rejection, shield-size rows.
- Cooldowns: owner-end skip on the casting turn; 1- and 2-turn values for 3 s and 7 s sources.
- Assault Slash: rejection on standing targets without state change; success only inside the `downed` window.
- Persistence: costs, statuses, cooldowns, training, RNG descriptor, events and the next checkpoint commit together; restart never replays recovery or enemy actions.
- GUI: Druid shows exact costs, cooldowns, disabled reasons ("Target not downed", "Not enough SP") and normal/critical previews; commands stay validated in the domain even when controls are disabled.

## Sources

Snapshots live in the [skill reference index](../../references/skills/README.md); dates are retrieval dates, not freshness claims.

| Skill              | Snapshot                                                            | Retrieved  |
| ------------------ | ------------------------------------------------------------------- | ---------- |
| Combat Mastery     | [combat-mastery](../../references/skills/combat-mastery.md)         | 2026-09-18 |
| Smash              | [smash](../../references/skills/smash.md)                           | 2026-09-18 |
| Defense            | [defense](../../references/skills/defense.md)                       | 2026-09-18 |
| Counterattack      | [counterattack](../../references/skills/counterattack.md)           | 2026-09-18 |
| Critical Hit       | [critical-hit](../../references/skills/critical-hit.md)             | 2026-09-18 |
| Sword Mastery      | [sword-mastery](../../references/skills/sword-mastery.md)           | 2026-09-18 |
| Windmill           | [windmill](../../references/skills/windmill.md)                     | 2026-09-21 |
| Assault Slash      | [assault-slash](../../references/skills/assault-slash.md)           | 2026-09-21 |
| Dual Wield Mastery | [dual-wield-mastery](../../references/skills/dual-wield-mastery.md) | 2026-09-21 |
| Axe Mastery        | [axe-mastery](../../references/skills/axe-mastery.md)               | 2026-09-21 |
| Shield Mastery     | [shield-mastery](../../references/skills/shield-mastery.md)         | 2026-09-21 |

See [skills](../skills.md) for acquisition, advancement and training, [skills implementation](../skills-implementation.md) for the transcription contract, [battle](../battle.md) for the player loop, [stats implementation](../stats-implementation.md) for shared stat helpers, and [combat log](../../combat-log.md) for event presentation.
