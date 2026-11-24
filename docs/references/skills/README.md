# Skill sources and Defold adaptation index

These saved wiki snapshots support the planned [Lua skill catalog](../../gameplay/skills-implementation.md). They were retrieved on **2026-09-18 UTC** through Firecrawl; this alignment does not refresh their source data. No Lua skill modules, imported normalized tables or skill icon assets are assumed present in the Defold starter.

The earlier browser catalog reported 42 entries: 33 supplied-icon subjects, seven other actions and two original stats-system skills. That is historical context, not a delivered Defold skill count. The local files below cover 33 primary subjects plus [Elf Ranged Attack](elf-ranged-attack.md). Eight life subjects remain reference-only; Wand Mastery remains unverified. A planned combat adaptation is usable only after its Lua definition and tests exist. Mana Regeneration is the historical filename for the source's Mana Recovery skill.

| Local source reference                        | Wiki                                                              | Status                   |
| --------------------------------------------- | ----------------------------------------------------------------- | ------------------------ |
| [arrow-revolver](arrow-revolver.md)           | [Source](https://wiki.mabinogiworld.com/view/Arrow_Revolver)      | Planned combat adaptation      |
| [blacksmithing](blacksmithing.md)             | [Source](https://wiki.mabinogiworld.com/view/Blacksmithing)       | Life reference only      |
| [bow-mastery](bow-mastery.md)                 | [Source](https://wiki.mabinogiworld.com/view/Bow_Mastery)         | Planned combat adaptation      |
| [campfire](campfire.md)                       | [Source](https://wiki.mabinogiworld.com/view/Campfire)            | Life reference only      |
| [carpentry](carpentry.md)                     | [Source](https://wiki.mabinogiworld.com/view/Carpentry)           | Life reference only      |
| [combat-mastery](combat-mastery.md)           | [Source](https://wiki.mabinogiworld.com/view/Combat_Mastery)      | Planned combat adaptation      |
| [counterattack](counterattack.md)             | [Source](https://wiki.mabinogiworld.com/view/Counterattack)       | Planned combat adaptation      |
| [critical-hit](critical-hit.md)               | [Source](https://wiki.mabinogiworld.com/view/Critical_Hit)        | Planned combat adaptation      |
| [defense](defense.md)                         | [Source](https://wiki.mabinogiworld.com/view/Defense)             | Planned combat adaptation      |
| [firebolt](firebolt.md)                       | [Source](https://wiki.mabinogiworld.com/view/Firebolt)            | Planned combat adaptation      |
| [first-aid](first-aid.md)                     | [Source](https://wiki.mabinogiworld.com/view/First_Aid)           | Life reference only      |
| [fishing](fishing.md)                         | [Source](https://wiki.mabinogiworld.com/view/Fishing)             | Life reference only      |
| [hailstorm](hailstorm.md)                     | [Source](https://wiki.mabinogiworld.com/view/Hailstorm)           | Planned combat adaptation      |
| [handicraft](handicraft.md)                   | [Source](https://wiki.mabinogiworld.com/view/Handicraft)          | Life reference only      |
| [healing](healing.md)                         | [Source](https://wiki.mabinogiworld.com/view/Healing)             | Planned combat adaptation      |
| [heavy-armor-mastery](heavy-armor-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Heavy_Armor_Mastery) | Planned combat adaptation      |
| [herbalism](herbalism.md)                     | [Source](https://wiki.mabinogiworld.com/view/Herbalism)           | Life reference only      |
| [ice-spear](ice-spear.md)                     | [Source](https://wiki.mabinogiworld.com/view/Ice_Spear)           | Planned combat adaptation      |
| [icebolt](icebolt.md)                         | [Source](https://wiki.mabinogiworld.com/view/Icebolt)             | Planned combat adaptation      |
| [light-armor-mastery](light-armor-mastery.md) | [Source](https://wiki.mabinogiworld.com/view/Light_Armor_Mastery) | Planned combat adaptation      |
| [lightning-bolt](lightning-bolt.md)           | [Source](https://wiki.mabinogiworld.com/view/Lightning_Bolt)      | Planned combat adaptation      |
| [magic-mastery](magic-mastery.md)             | [Source](https://wiki.mabinogiworld.com/view/Magic_Mastery)       | Planned combat adaptation      |
| [magnum-shot](magnum-shot.md)                 | [Source](https://wiki.mabinogiworld.com/view/Magnum_Shot)         | Planned combat adaptation      |
| [mana-regeneration](mana-regeneration.md)     | [Source](https://wiki.mabinogiworld.com/view/Mana_Recovery)       | Planned combat adaptation      |
| [mana-shield](mana-shield.md)                 | [Source](https://wiki.mabinogiworld.com/view/Mana_Shield)         | Planned combat adaptation      |
| [meteor-strike](meteor-strike.md)             | [Source](https://wiki.mabinogiworld.com/view/Meteor_Strike)       | Planned combat adaptation      |
| [potion-making](potion-making.md)             | [Source](https://wiki.mabinogiworld.com/view/Potion_Making)       | Life reference only      |
| [range-attack](range-attack.md)               | [Source](https://wiki.mabinogiworld.com/view/Human_Ranged_Attack) | Planned combat adaptation      |
| [shockwave](shockwave.md)                     | [Source](https://wiki.mabinogiworld.com/view/Shockwave)           | Planned combat adaptation      |
| [smash](smash.md)                             | [Source](https://wiki.mabinogiworld.com/view/Smash)               | Planned combat adaptation      |
| [sword-mastery](sword-mastery.md)             | [Source](https://wiki.mabinogiworld.com/view/Sword_Mastery)       | Planned combat adaptation      |
| [thunder](thunder.md)                         | [Source](https://wiki.mabinogiworld.com/view/Thunder)             | Planned combat adaptation      |
| [wand-mastery](wand-mastery.md)               | [Source](https://wiki.mabinogiworld.com/view/Wand_Mastery)        | Unverified; catalog only |

## Source values versus project rules

Keep original source units, race variants, AP-to-reach-rank, cumulative gains and F–1 rows. Prefer verified summary tables over contradictory older prose. Preserve unknown cells (`?`, `-`) as source text rather than fabricating stats. Merged table columns in scraped Markdown require review against source HTML before transcription; normalized browser `.wiki.json` files are not present here.

The [skill implementation contract](../../gameplay/skills-implementation.md) owns conversion into executable Lua: next-rank AP, six seconds per cooldown turn, cost rounding, cumulative bonuses, midpoint rules where documented, one-charge bolts, five-arrow allocation, recovery and owner-boundary effects. The [battle contract](../../turn-based-plan.md) supersedes all dice/pip/combination designs. Life skills/Wand Mastery remain unavailable for learning/ranking/execution until explicitly designed and verified.

Starter skill/rank scope follows [skills.md](../../gameplay/skills.md); original Arcane Focus and Blood Strike proposals live in [stats implementation](../../gameplay/stats-implementation.md). Source facts do not override race/equipment rules or the separately versioned Defold save format.

## Refresh workflow

1. Retrieve the exact linked source and record its date/provenance. Use Human Ranged Attack plus the Elf variant; the generic Ranged Attack page is disambiguation.
2. Keep raw captures in ignored `.firecrawl/`. Preserve curated snapshots and update [manifest.json](../manifest.json). No importer script is currently installed; build/review any future importer before documenting it as a command.
3. Review merged columns, race variants, Thunder charge mana and unknown values manually or with validated extraction fixtures. Transcribe only approved values into versioned Lua definitions with explicit adaptation notes.
4. Run Lua catalog validation and Lester rank/cost/effect fixtures, then affected Defold engine/GUI/save checks. Content changes require migration policy for existing frozen runs and ranks; never silently replace a saved definition.
