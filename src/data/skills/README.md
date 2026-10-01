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
the catalog or importing reference percentages, charges, or racial variants.

The four starter spells preserve their existing F ranges, scaling, targets and costs.
Firebolt, Lightning Bolt and Healing are capped at F. Icebolt has an F/E adapter: 20 casts train 100 points, F → E costs 2 AP, and E uses power 11–21 with +2 INT. Smash, Combat Mastery and Sword
Mastery implement the gameplay document's F/E pilot. Their E cap is explicit; they
cannot spend AP on an unimplemented D rank. `enchant.json` adds a separately authored Enchant life skill at F/E; it uses town application/burning objectives and never resolves in combat. All other entries remain unavailable.

The keeper teaches Enchant F for free with zero training and no AP award. The blacksmith sells its scrolls and materials and hosts the enchant/burn service.

The keeper offers a free Smash lesson and a one-time 3 AP introductory milestone.
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
Retry save succeeds. Saves use wire version 8, preserving migrations from versions
1–7; the existing native/web storage adapters need no database schema changes.

The character-scoped Skills journal is available from the character panel and drawer.
It lists learned/discovered skills, rank effects, training objectives, AP eligibility,
acquisition routes and book slots. Progression is town-only; inspection uses no turn.
Battle rows show saved ranks, effective costs, equipment/cooldown reasons and confirmed
target previews without RNG draws. Existing damage branches and shared area critical
sampling remain intact.

Run `npm test`, `npx expo lint`, and `npx tsc --noEmit`. Focused progression suites cover
acquisition, gates, attribution, checkpoints and failed-save retries. Browser testing
covers compact journal navigation, saved learning and reload. iOS/Android touch,
large-text, suspension and native persistence still require device verification.

Advanced reactions, new defensive/armor passives, Final Hit, Windmill, charge loading,
shield/dual-wield equipment, HP costs and life skills remain future authored extensions.
