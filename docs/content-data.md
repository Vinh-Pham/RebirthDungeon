# First-release content and provenance

The content catalog is `game/content/catalog.lua`; its single skill registry is `game/content/skills.lua`, and progression thresholds are in `game/content/experience.lua`. These files implement the starter slice, not every reference-game skill. Format and content versions remain 1. Rules version 2 adds bounded starter training and frozen skill ranks, with explicit migration from valid rules-version-1 profiles.

| Data | Provenance / adaptation |
| --- | --- |
| Shared base attributes | Existing project character/stat contracts: HP 118, MP 98, SP 113, STR 55, INT 48, DEX 58, WIL 57, LUK 47 |
| Level thresholds | 199 level-to-next-level entries transcribed from the saved [Experience](references/mabinogi-level.md) combat table; cap at level 200 |
| Close Combat | Base STR +20; level STR +0.5; aging STR +2 |
| Magic | Base INT +10, MP +10; level INT +0.5; aging INT +2, MP +1 |
| Archery | Base HP +5, SP +5, DEX +10; level DEX +0.5; aging SP +1, DEX +2 |
| Dual Gun | Base STR +5, INT +5, HP +5, MP +5, SP +10; level STR/INT +0.25; aging STR/INT +1 |
| Combat Mastery | Starter F cumulative stat gains and the project's Attack cost/recovery rule; bounded 5-point Attack objectives train every weapon category, ranking is deferred |
| Defense | Starter F racial passive bonuses; active guard lasts until next owner start; the adopted +20 Defense/+5% Protection (Giant +30/+10%) is explicit project behavior |
| Smash | One committed attack; 5 SP; 2× melee contribution (Giant 3×); source-derived F stat gains |
| Icebolt | One charge, 1 MP, learned F INT +1; the deterministic `15 + magic contribution` damage expression is an **authored starter adaptation**, not a transcription of wiki damage/modifier ranges |
| Power Shot / Double Shot | Authored starter actions, 6 SP; 1.9× ranged / 1.8× paired-gun contribution; Double Shot splits into two mitigated hits |
| Enemy/equipment stats | Original game balance. Giant Spider attack 22; its HP 170, two White Spider adds, and Armor Break create the final encounter |
| Economy, AP, aging, rebirth | [Game-plan contract](game-plan.md); fractional growth retained until deriving displayed stats |

Talent values were verified through Firecrawl against the primary wiki pages [Close Combat](https://wiki.mabinogiworld.com/view/Close_Combat_(Talent)), [Magic](https://wiki.mabinogiworld.com/view/Magic_(Talent)), [Archery](https://wiki.mabinogiworld.com/view/Archery_(Talent)), and [Gunslinger](https://wiki.mabinogiworld.com/view/Gunslinger). Saved skill references remain under `references/skills/`. Do not infer support for an unimplemented rank from its presence in a source page.

Damage previews use the same deterministic mitigation as execution: apply the authored multiplier/base, divide multi-hit damage, subtract flat defense, then apply protection, flooring at each adopted boundary. No starter character has Critical Hit; the first slice does not invent a Luck-derived critical chance. Poison and Armor Break tick at owner boundaries; cooldowns skip the casting owner end. Weapon wear applies once per attack action.

The timezone adapter encodes US Los Angeles DST rules for 2007–2199 and tests Saturday-noon boundaries independently of host timezone. It is a deliberately bounded adapter, not a general IANA timezone database. Future timezone-law changes require a rules update.

Kenney Tiny Dungeon and Tiny Town source PNGs are CC0; licenses are in `assets/`. The generated audio is original placeholder synthesis. No generated or borrowed art is represented as final bespoke artwork.

Starter training is original project content: damaging Attack or the selected damaging skill grants 5 points once per action, capped at 20 completions per objective. Defense grants separate 5-point/20-completion objectives for casting and fully blocking incoming damage. Each skill total caps at 100. Multi-hit attacks do not multiply credit. Cumulative F-rank attributes and racial guard values enter the resolver once through the skill registry. No unsupported rank, AP table, critical chance, lesson or book is fabricated.

Town layout and visual cell classification live in `game/content/town.lua`. Service positions, healing price, repair rate, stock and allowed dialogue actions share the catalog. New per-NPC stories in `assets/dialogue/services/` use continuation version 2; `assets/dialogue/town.json` remains the unchanged version-1 replay source. The profile format is unchanged, and no story choice is remapped implicitly. Run `tools/compile-dialogue.sh` after editing Ink sources and check in the resulting JSON.
