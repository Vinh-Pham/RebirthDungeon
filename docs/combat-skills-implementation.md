# Executable combat skills

`game/content/skills/combat.lua` owns all eleven close-combat skills from
[the combat design](gameplay/skills/combat.md), Normal Attack's shared progression,
and the existing Power Shot and Double Shot combat-group actions.
`game/content/skills.lua` remains the shared registry for existing consumers; it
adds Magic and enemy actions without copying combat definitions.

All eleven skills are playable at **rank F**. Higher rank records and advancement
remain unavailable until source rows, AP costs and training have been verified.
Existing characters retain their learned skills and training. Combat Mastery,
Defense and talent starter grants are unchanged. The eight new skills have free,
explicit introductory lessons in the town skill journal; these are project
acquisition routes, not claims about reference-game quests or AP costs.

## Runtime rules

- Smash now costs 4 SP, has a one-turn cooldown, uses 1.5× damage (2× for Giants),
  bypasses Defense, and knocks down on damage. Greatswords add ×1.2 power and five
  percentage points of critical chance only when Critical Hit is learned.
- Defense costs 1 SP and has a two-turn cooldown. It consumes one non-magic hit,
  expires at the next owner start, and trains a full block per action. Shields
  absorb 50/70/100% of guarded damage by size, after Protection.
- Counterattack costs 2 SP, has a two-turn cooldown, and stores one reaction until
  the next owner start. It negates a single-hit melee attack and retaliates with
  50% of the incoming actor's normal melee power plus 100% of its own normal
  melee power. The F coefficients are an explicit common-race adaptation.
  Windmill, Assault Slash, ranged attacks and magic do not trigger it. Retaliation
  cannot chain or critically hit.
- Windmill costs 2 SP once, has a one-turn cooldown and deals 1.7× damage to each
  living enemy in saved encounter order. Training credits the action once and
  each distinct defeat once; each target has its own critical decision.
- Assault Slash costs 5 SP, has a two-turn cooldown, requires a living downed
  target, and bypasses both guard and counter. It retains the design's authored
  0.7× multiplier. The live reference F value is 0.8×; 0.7× is Novice.
- Knockdown persists **through the attacker's next owner-end**, skipping its
  application turn. This deliberately corrects the design's victim-start expiry:
  with one player character and fixed turn order, victim-start expiry would make
  every player follow-up impossible. The saved source actor and application turn
  preserve the window through reload. Downed targets still take turns normally.
- Critical Hit enables an authored 10% chance and +50% damage. Each eligible
  target consumes exactly one battle-stream `number()` sample, including
  chance-zero/one fixtures; all hits share it. Previews, rejections, buffs and
  retaliation consume none. The generic RNG adapter's existing chance method is
  unchanged. Damage floors after flat Defense, critical amplification and
  Protection, then applies shield absorption. Multi-hit previews account for
  guard being consumed on the first hit.
- Sword and Axe Mastery adopt +1.5 melee power (the F +1/+2 midpoint); Sword
  Mastery counts once across two swords. Axe Mastery adds one percentage point
  of chance only with Critical Hit. Dual Wield Mastery adds +2 power only with
  distinct one-handed sword instances, and excludes Elves. The off-hand weapon
  contributes half its power. Breaking either weapon halves only its own
  contribution. Both participating weapons lose one durability per action,
  including an area attack.
- Shield Mastery adds 0/3/5 Defense and +1 Protection for small/medium/large shields.
  Equipment eligibility is recomputed in town and frozen on run entry. Bows,
  paired guns and greatswords require a free left hand. The blacksmith sells the
  additional equipment, and Inventory provides **Equip left hand** for swords.

Balance, Auto Defense, Armor Pierce, unknown magic-defense rows, later-rank
splash/debuffs and higher-rank attributes remain reference-only; no unverified
numbers or unsupported effects enter the runtime.

## Source checks

The provided combat design supplies the F adaptations. Firecrawl HTML retrieval
on 2026-09-21 checked two ambiguous tables:

- [Dual Wield Mastery](https://wiki.mabinogiworld.com/view/Dual_Wield_Mastery): the
  table starts Novice, F, E…; F has +2 minimum/maximum damage and zero STR,
  Balance and Critical. HTML column spans establish that alignment.
- [Assault Slash](https://wiki.mabinogiworld.com/view/Assault_Slash): Novice 70%,
  F 80%, F cost 5, cooldown 7 seconds. The project deliberately retains its
  authored 70% single-target conversion.

Transient source captures are `.firecrawl/dual-wield-mastery.html` and
`.firecrawl/assault-slash.html` (ignored). These are historical transcriptions;
updates to the external pages do not change installed content.

## Verification

`luajit tests/run.lua` covers learning, race restrictions, equipment conditions,
mitigation/critical ordering, counter consumption/expiry, downed target rejection,
follow-up expiry, stable AoE targets, per-action/per-defeat training, cooldowns,
broken weapon contributions, frozen stats, failed saves and duplicate retries.

With the project running in Defold:

```sh
PYTHONPATH=automation-bridge-python python3 tools/check_combat.py
```

The smoke test creates a disposable `Combat QA ...` character, learns through the
actual journal UI, and drives normal validated commands through the Automation
Bridge. It verifies real saved reactions and follow-ups, multi-target damage and
RNG counts, and checks the editor console. It leaves the test hero in town for inspection.
`combat` bridge state is published by the session only from committed data; the
GUI remains message-driven and never imports gameplay modules.
