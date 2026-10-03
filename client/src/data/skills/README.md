Authored skill JSON now lives in `packages/game-core/src/data/skills` at the workspace root. Edit that shared catalog so client and server rules remain identical.

# Skill catalog

`basic.json` retains the 33 reference skill identities, source URLs, retrieval dates,
F–1 descriptions, and reference tables. `reference` is historical research, not
executable balance. The original `docs/skills/normalized/` scrape files are not
present in this checkout; the shipped catalog preserves their reference payloads.

`gameRanks` contains authored Rebirth Dungeon numeric rules, separately from those
reference tables. Its rank objects are frozen after validation. Heroes own explicit
`learnedSkills` records with rank and capped objective counts; class skill lists are
used only for starter grants and legacy migration. Enemies keep independent authored
skill defaults. Resolve a hero action through `resolveLearnedSkill`, without changing
the catalog or importing unsupported reference percentages or charges.

The four starter spells preserve their existing F ranges, scaling, targets and costs.
Firebolt, Lightning Bolt and Healing are capped at F. Icebolt has an F/E adapter: 20 casts train 100 points, F → E costs 2 AP, and E uses power 11–21 with +2 INT. Smash, Combat Mastery and Sword
Mastery implement the gameplay document's F/E pilot. Smash now uses physical multipliers (F: 2, E: 2.1) with zero additive power and bypasses Defend, retaining ordinary Defense/Protection and 4 SP/0 MP costs. The fields are authored game rules; the wiki payload remains historical research. Source rechecked with Firecrawl October 2, 2026: [Smash](https://wiki.mabinogiworld.com/view/Smash). Their E cap is explicit; they
cannot spend AP on an unimplemented D rank. `human-ranged-attack.json` adds the human archery identity with source URL, October 2, 2026 retrieval date, F–1 effects and unambiguous reference rows from [Human Ranged Attack](https://wiki.mabinogiworld.com/view/Human_Ranged_Attack). Its `battleUsable: false` keeps ranged attacks on the basic Attack command. Human and Elf F/E adapters provide ranged damage/balance and owned attribute totals; a loaded bow chooses owned Elf Ranged Attack or Human Ranged Attack, defaulting to Human F without granting ownership. Both use 1 base SP and one arrow per shot. Bows without equipped arrows, broken bows and exhausted attacks use fists. Dexterity drives ranged damage; aiming and crossbows remain unimplemented. These adapters have no new acquisition or rank-up route. Elf reference data was rechecked October 2, 2026; its real-time two-arrow volley is outside the requested one-arrow behavior.

Combat always includes Attack (Warrior: Combat Mastery; Archery: Human Ranged Attack; Mage: Magic Mastery) and Defend (Defense). Loaded bows use the ranged skill identity regardless of talent; empty/broken bows show Combat Mastery. These identities do not grant learned skills or permanent stat bonuses. See `engine/battle/BasicAttack.ts` and `engine/rpg/Stats.ts` for executable bow inputs. Saved backing-skill ranks appear only when owned. Items shows saved battle-usable consumable assignments configured in Inventory. Item recovery is engine-owned; item actions do not cast skills or train them.

`enchant.json` adds a separately authored Enchant life skill at F/E; it uses town application/burning objectives and never resolves in combat. All other entries remain unavailable.

The keeper teaches Enchant F for free with zero training and no AP award. The blacksmith sells its scrolls and materials and hosts the enchant/burn service.

The instructor outside the northeast Combat School offers a free Smash F lesson with zero training and the existing one-time 3 AP introductory milestone. The keeper points players there and retains its Enchant lesson and quests. Existing learned ranks, objective counts and milestone claims remain unchanged.
Five guaranteed refuge training coffers provide the Combat manual, unfinished Sword
manual, and Grip/Balance/Finish pages. Insert pages in any order, then read the complete
manual in town. These sources remain available independently of dungeon success.
Repeating generated dungeon encounters provides repeatable combat training. Every
level gained awards 1 AP, with no retroactive AP for migrated levels.

Training uses attributed direct action outcomes, never animation/audio callbacks or
status-damage notifications. Each BattleSession keeps capped pending counts. Finishing
victory or defeat banks that ledger with resources, durability and rewards. Restarting
an unfinished checkpoint discards its ledger. A host-owned candidate is written to
the auto slot before learning, page insertion, rank-up or battle completion becomes
live. Failed writes retain the exact candidate and block dependent mutations until
Retry save succeeds. Saves use wire version 13, preserving migrations from versions
1–12; the existing native/web storage adapters need no database schema changes.

The character-scoped Skills journal is available from the character panel and drawer.
It lists learned/discovered skills, rank effects, training objectives, AP eligibility,
acquisition routes and book slots. Progression is town-only; inspection uses no turn.
Battle rows show saved ranks, effective costs, equipment/cooldown reasons and confirmed
target previews without RNG draws. Existing damage branches and shared area critical
sampling remain intact.

Run `pnpm test`, `pnpm lint`, and `pnpm typecheck`. Focused progression suites cover
acquisition, gates, attribution, checkpoints and failed-save retries. Browser testing
covers compact journal navigation, saved learning and reload. iOS/Android touch,
large-text, suspension and native persistence still require device verification.

Advanced reactions, new defensive/armor passives, Final Hit, Windmill, charge loading,
shield/dual-wield equipment, HP costs and life skills remain future authored extensions.

`rest.json` adds the default Rank F Rest life skill. It keeps the verified [Rest](https://wiki.mabinogiworld.com/view/Rest) reference separate from its single supported F adapter. Use/Stop toggles resting in town and between dungeon encounters. An injected host clock requests one durable, fullness-limited recovery tick per second (up to 10 stamina), without overlapping saves or catching up elapsed/offline time. Movement and interactions are blocked while resting; Stop remains available during saving or failed recovery writes. Background, character exit, load and disposal end resting. There is no higher-rank training. Journey's Life card and journal details expose durable Use outside battle, and Combat exposes the existing Rest self action. Version 13 grants old characters missing Rest ownership/discovery without changing resources or progress. The original transparent 32×32 seated-adventurer icon and editable source are `assets/game/skills/rest.png` and `rest.aseprite`.

## Enemy combat adapters

`poison-attack.json` adds an unranked, enemy-only passive owned by black, red and
giant black spiders. White spiders do not own this skill or roll poison chance. Source verified with
Firecrawl October 2, 2026: [Poison Attack](https://wiki.mabinogiworld.com/view/Poison_Attack).
Its `enemyUse: onMeleeHit` adapter rolls a 5% chance on successful unguarded melee
hits. Authored poison drains 5% of current HP for three owner-end ticks with a
nonlethal floor, refreshes without stacking and clears with the encounter. These
numeric values adapt the wiki's passive identity to turn-based combat.

Defense's `enemyUse: defend` adapter invokes the existing free basic Defend action;
its reference tables and unsupported player rank progression remain separate.
Enemy family engines only score shared legal candidates and use authored defaults
for ordinary active skills. See `docs/gameplay/battle.md` for the plugin contract.
