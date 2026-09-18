# Skill catalog and saved wiki references

The catalog contains all 33 icons supplied in `public/assets/game/skills`, plus seven existing actions and two original stats-system skills without supplied icons (42 entries total). Each skill has its own TypeScript module. The 32 verified entries each have a separate `.wiki.json` file with rank F–1 rows; Wand Mastery has no published article or invented stats. Eight life skills are reference-only, as requested.

Sources were retrieved on **2026-09-18 UTC** using **Firecrawl**. The source snapshots below are saved locally and require no network access. Ranged Attack also has an [Elf reference](elf-ranged-attack.md). Mana Regeneration is the icon filename for the wiki’s Mana Recovery skill.

| Icon / local reference | Wiki | Status |
| --- | --- | --- |
| [arrow-revolver](arrow-revolver.md) | [Source](https://wiki.mabinogiworld.com/view/Arrow_Revolver) | Playable adaptation |
| [blacksmithing](blacksmithing.md) | [Source](https://wiki.mabinogiworld.com/view/Blacksmithing) | Life reference only |
| [bow-mastery](bow-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Bow_Mastery) | Playable adaptation |
| [campfire](campfire.md) | [Source](https://wiki.mabinogiworld.com/view/Campfire) | Life reference only |
| [carpentry](carpentry.md) | [Source](https://wiki.mabinogiworld.com/view/Carpentry) | Life reference only |
| [combat-mastery](combat-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Combat_Mastery) | Playable adaptation |
| [counterattack](counterattack.md) | [Source](https://wiki.mabinogiworld.com/view/Counterattack) | Playable adaptation |
| [critical-hit](critical-hit.md) | [Source](https://wiki.mabinogiworld.com/view/Critical_Hit) | Playable adaptation |
| [defense](defense.md) | [Source](https://wiki.mabinogiworld.com/view/Defense) | Playable adaptation |
| [firebolt](firebolt.md) | [Source](https://wiki.mabinogiworld.com/view/Firebolt) | Playable adaptation |
| [first-aid](first-aid.md) | [Source](https://wiki.mabinogiworld.com/view/First_Aid) | Life reference only |
| [fishing](fishing.md) | [Source](https://wiki.mabinogiworld.com/view/Fishing) | Life reference only |
| [hailstorm](hailstorm.md) | [Source](https://wiki.mabinogiworld.com/view/Hailstorm) | Playable adaptation |
| [handicraft](handicraft.md) | [Source](https://wiki.mabinogiworld.com/view/Handicraft) | Life reference only |
| [healing](healing.md) | [Source](https://wiki.mabinogiworld.com/view/Healing) | Playable adaptation |
| [heavy-armor-mastery](heavy-armor-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Heavy_Armor_Mastery) | Playable adaptation |
| [herbalism](herbalism.md) | [Source](https://wiki.mabinogiworld.com/view/Herbalism) | Life reference only |
| [ice-spear](ice-spear.md) | [Source](https://wiki.mabinogiworld.com/view/Ice_Spear) | Playable adaptation |
| [icebolt](icebolt.md) | [Source](https://wiki.mabinogiworld.com/view/Icebolt) | Playable adaptation |
| [light-armor-mastery](light-armor-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Light_Armor_Mastery) | Playable adaptation |
| [lightning-bolt](lightning-bolt.md) | [Source](https://wiki.mabinogiworld.com/view/Lightning_Bolt) | Playable adaptation |
| [magic-mastery](magic-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Magic_Mastery) | Playable adaptation |
| [magnum-shot](magnum-shot.md) | [Source](https://wiki.mabinogiworld.com/view/Magnum_Shot) | Playable adaptation |
| [mana-regeneration](mana-regeneration.md) | [Source](https://wiki.mabinogiworld.com/view/Mana_Recovery) | Playable adaptation |
| [mana-shield](mana-shield.md) | [Source](https://wiki.mabinogiworld.com/view/Mana_Shield) | Playable adaptation |
| [meteor-strike](meteor-strike.md) | [Source](https://wiki.mabinogiworld.com/view/Meteor_Strike) | Playable adaptation |
| [potion-making](potion-making.md) | [Source](https://wiki.mabinogiworld.com/view/Potion_Making) | Life reference only |
| [range-attack](range-attack.md) | [Source](https://wiki.mabinogiworld.com/view/Human_Ranged_Attack) | Playable adaptation |
| [shockwave](shockwave.md) | [Source](https://wiki.mabinogiworld.com/view/Shockwave) | Playable adaptation |
| [smash](smash.md) | [Source](https://wiki.mabinogiworld.com/view/Smash) | Playable adaptation |
| [sword-mastery](sword-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Sword_Mastery) | Playable adaptation |
| [thunder](thunder.md) | [Source](https://wiki.mabinogiworld.com/view/Thunder) | Playable adaptation |
| [wand-mastery](wand-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Wand_Mastery) | Unverified; catalog only |

## Source and game values

The catalog’s wiki table preserves original units, race variants, AP required to **reach** the inspected rank, cumulative gains, and rank effects. It covers F–1; Novice and Dan progression are outside this game. Summary tables take precedence over older prose/rank-effect descriptions where the wiki disagrees with itself. Unknown wiki values (`?`, `-`) remain visible as source text.

Gameplay is a turn-based adaptation. Learning lessons remains free and begins at F. Ranking uses the wiki AP cost for the **next** rank, selected by character race. Costs round fractional mana/stamina up. Six wiki seconds equal one cooldown turn, rounded up; a cooldown skips the casting activation. Attribute bonuses use cumulative wiki gains. Weapon attack bonuses use the midpoint of wiki minimum/maximum additions, and attack multipliers use the midpoint of minimum/maximum percentages where needed. Dice combinations and training objectives remain Rebirth Dungeon rules.

Each module documents special adaptations. Bolt spells cast one charge. Area spells affect every living enemy. Arrow Revolver resolves five arrows together. Counterattack includes the opponent’s attack contribution. Healing consumes one load and applies five minimum-healing charges to the caster, scaled by the dice combination. Defense lasts one enemy response. Mana Shield uses base wiki efficiency, rounds its upkeep up once per response, and lasts three responses. Mana Recovery restores its percentage of maximum mana. Shockwave costs a percentage of maximum mana, frozen when rolling. Real-time charge storage, stuns, lingering meteor fire, physical meteor damage, and cooldown-reset chances are not simulated.

Life skills and Wand Mastery cannot be learned, ranked, or used in combat. Their entries remain searchable with their supplied icons. Existing non-icon skills retain their previous balance, stable save IDs, and acquisition routes.

## Refreshing references

1. Use `firecrawl scrape` for the source URL with `--only-main-content --format markdown,html -o .firecrawl/skills/<icon-stem>.json`. Also fetch `Elf_Ranged_Attack` as `elf-ranged-attack.json`. `range-attack.json` must use `Human_Ranged_Attack`, since the generic Ranged Attack URL is a disambiguation page.
2. Run `python3 scripts/import-skill-wiki.py` (requires `beautifulsoup4`). It expands HTML row/column spans, merges racial Ranged Attack references, handles Thunder’s charge-based mana table, writes each verified `.wiki.json`, and saves the markdown snapshots. It rejects missing summaries rather than fabricating values.
3. Review source changes and the corresponding per-skill adaptation module, then run lint, typecheck, tests, build, and browser checks. Cached Firecrawl responses stay ignored; normalized stats and reference documents are tracked.

Raw source markdown retains the wiki’s original merged-table limitations; the normalized JSON preserves the corrected rank-column alignment.

Arcane Focus and Blood Strike are original Rebirth Dungeon skills with separate modules. Their costs and status adaptations are documented in [stats implementation](../../gameplay/stats-implementation.md). Mana Recovery now requires 5 SP up front so recovery cannot finance its own activation.
