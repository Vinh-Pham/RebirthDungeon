# Reference Research — Mabinogi and Dicero

Research date: 2026-09-07 (America/Los_Angeles). Companion to [[Game Overview]].

## Scope and evidence

Primary sources were prioritized: Nexon’s official Mabinogi guides/update notes and Habby’s developer-supplied Dicero store listing. Official-site forum posts and store user reviews are not treated as authoritative mechanical specifications. This is an inspiration study, not a complete reverse-engineering of either game. Older official Mabinogi guides can contain legacy onboarding/rebirth restrictions; do not import their timers, prices, or level thresholds without separate current verification.

## Mabinogi: confirmed mechanics

- **Rebirth preserves mastery rather than wiping the character.** Nexon describes resetting level and age while keeping skills, talent ranks, accumulated AP, and stats earned through skill training. Leveling again earns AP; level-derived and food-derived stats are distinct from retained skill stats. This makes repeated lives contribute to long-term growth. [Nexon Beginner’s Guide](https://www.nexon.com/mabinogi/guide/beginnersGuide)
- **Talents are a training focus, not an exclusive class.** The official talent guide describes stat bonuses and doubled training experience for covered skills, explicitly allows learning outside the chosen talent, and allows talent changes through rebirth. [Nexon Talents](https://www.nexon.com/mabinogi/guide/talents)
- **Skill growth combines training and AP investment.** NEXT update notes document training experience requirements and consuming AP to rank skills up. They also document reductions in training workload, removal of obligatory production failures and combat-power-specific monster requirements, and optional automatic rank-up. Practice-based growth need not mean repetitive grind. [Nexon NEXT update](https://www.nexon.com/mabinogi/news/20062/next-new-beast-update)
- **Life activities belong beside combat.** The talent roster includes cooking, smithing, tailoring, medicine, music, and pet training alongside weapon and magic disciplines. Music explicitly supports allies with buffs. [Nexon Talents](https://www.nexon.com/mabinogi/guide/talents)
- **Dungeons are structured expeditions.** The beginner guide describes altar offerings/passes for entry, floor exploration, resurrection statues, a keyed boss room, and reward chests after victory. It also presents crafting, shops, homesteads, and cooperative adventures as activities beyond dungeon fighting. [Nexon Beginner’s Guide](https://www.nexon.com/mabinogi/guide/beginnersGuide)

### Design implications for Rebirth Dungeon — proposals, not Mabinogi facts

1. Separate **run state**, **current-life growth**, and **permanent mastery**. Document exactly which values reset at dungeon completion, defeat, and rebirth.
2. Let players learn broadly while keeping combat choices readable. A limited equipped skill set is a possible later design choice, not an approved cap in the current specs; equipment and skill prerequisites already constrain usable actions.
3. Use meaningful skill-training milestones and AP purchases; avoid requiring intentional failures or farming trivial actions.
4. Make crafting and other life skills produce dungeon preparation options, rather than importing an MMO-sized life simulation into the MVP.
5. Keep rebirth a deliberate progression choice, not a synonym for death or restarting a dungeon. Mabinogi’s retained mastery is a useful structural reference; its historical rebirth restrictions are not a ready-made balance model.

## Dicero: identity and confirmed battle principles

The researched title is **Dicero by Habby**, Android package `com.bailing.lark.roll.dev`. The developer listing identifies a casual roguelite with dice-triggered skills, unlockable skills and gear, different skill combinations across runs, upgrades, and short-session play. The listing categorizes it as a turn-based RPG. These support a broad battle identity of **roll → skill activation → build synergy → progression**, but not a complete formal ruleset. [Habby’s Dicero listing on Google Play](https://play.google.com/store/apps/details?id=com.bailing.lark.roll.dev&hl=en_US)

### Not established by the inspected primary sources

The public description does **not** specify the exact dice-pool size, number of rerolls, keep/lock rules, whether pips are allocated or matched to slots, skill-slot count, action economy, enemy initiative, mana costs, pip costs, face probabilities, combo priority, targeting, or status-effect timing. Do not label any exact implementation of these as “Dicero’s rules.” Existing project battle documentation may contain more specific historical or regional evidence; preserve its attribution and version/date boundaries rather than promoting those details into universal current-client rules. Store reviews and search snippets are insufficient to settle them. A version-specific hands-on capture or official detailed tutorial is needed to verify them.

### Design implications for Rebirth Dungeon — proposals, not Dicero facts

- Borrow the accessible dice-to-skills interaction and run-specific synergies, not unverified numerical rules.
- Preserve the existing skill-before-roll contract: choose an eligible skill and target, then use keep/reroll decisions to improve the hand powering that locked skill. Do not switch effects after seeing the roll.
- Let permanent skill mastery shape the available kit. Temporary build drafts or dice-attached effects are possible future experiments, but the current battle spec defers them.
- Define the local battle contract explicitly: dice generated, permitted manipulation, costs, player commitment, effect order, enemy response, cleanup, and victory/defeat checks.
- Mark all prototype numbers as provisional and evaluate agency, unlucky-turn recovery, battle length, and dominant combinations in playtests.

## Recommended synthesis

**Mabinogi supplies the long-term progression philosophy; Dicero supplies the lightweight dice-battle inspiration.** Rebirth Dungeon should remain its own game: persistent, broadly learnable mastery feeds usable skills and equipment choices, expressed through five-dice dungeon encounters. The current Rebirth Dungeon design consumes the whole hand for one selected skill rather than allocating individual dice across abilities. Neither reference independently establishes the project’s exact resource costs, AP economy, cooldowns, or rebirth restrictions.
