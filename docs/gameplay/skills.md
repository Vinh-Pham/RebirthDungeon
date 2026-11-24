# Rebirth Dungeon: Skills

**Starter Defold gameplay implemented; milestone-6 expansion remains planned.** Skills are learned, trained and advanced with AP. The [game plan](../game-plan.md) sets scope, [turn-based-plan.md](../turn-based-plan.md) sets combat, and [skills implementation](skills-implementation.md) defines the Lua port. Saved [skill references](../references/skills/README.md) provide source data, not working code.

## Current delivery

The starter registry is `game/content/skills.lua`, with acquisition, validation and training in `game/domain/skills.lua`. All six learned starter skills currently support **F only**; Attack shares Combat Mastery's record. The journal has All/Life/Combat/Magic tabs, a paged learned list, effects/costs/equipment requirements, source/adaptation notes, bounded objective counts, disabled reasons and guarded battle actions. Life is explicitly reference-only. Details remain in the existing paused HUD panel; separate Monarch detail popups belong to the later journal expansion.

Each damaging Attack grants Combat Mastery 5 training points, up to 20 credits. Each damaging starter skill action grants its own objective 5 points, up to 20 credits, regardless of hit count. Defense has separate 5-point/20-credit objectives for committing Defend and fully mitigating a guarded incoming attack; counter-negated attacks and partial blocks do not grant full-block credit. Total training caps at 100. These are authored starter training rules, not copied real-time wiki objectives. Menus, previews and rejected commands grant nothing.

Rules version 2 saves objective counts and explicit frozen run ranks. Valid version-1 saves migrate their aggregate training into labeled legacy credit and freeze the existing F ranks without changing possessions, AP or run stat baselines. Migration is persisted through the normal next transaction. Higher ranks, source rank tables beyond F, instructor lessons, books/pages and expanded skills remain milestone-6 work; Advance explains that limitation and cannot spend AP early.

## Ownership and starting skills

Each hero owns learned ranks, training, AP and book/page records. Ranks use the explicit order **F, E, D, C, B, A, 9, 8, 7, 6, 5, 4, 3, 2, 1**; compare indices, not labels. Novice/Dan, resets and AP-purchased training are deferred.

Creation grants the talent starter skill/weapon plus Combat Mastery F and Defense F. Normal Attack (`normal`) is always available subject to costs, uses weapon category or unarmed melee, and displays Combat Mastery's rank rather than owning a separate progression track. Rebirth preserves skills and unlocks a new talent starter skill without item duplication.

| Talent | Starter action / equipment |
| --- | --- |
| Close Combat | Smash / sword |
| Archery | Power Shot / bow; unavailable to Giants |
| Dual Gun | Double Shot / dual guns |
| Magic | Icebolt / wand |

Starter names/IDs are project content; source-derived Ranged Attack and other expanded skills do not silently replace those IDs. All starter costs/effects must be validated before milestone-4 combat.

## Learning and advancement

1. Discover a skill and its prerequisites.
2. Learn at F with zero training via the starter grant, instructor, complete book, assembled book or authored quest.
3. Resolve qualifying outcomes to earn current-rank training.
4. Reach **at least 100 training points**, then choose Rank Up in town with no active run and enough AP.
5. Pay the next rank's authored AP cost once, advance one rank and reset training without carrying surplus.

Rank 1 has no next advancement. Learning F is not a level-up or AP refund. Higher-rank quest rewards cannot bypass training/AP. Known skills keep rank/training; duplicate learning never consumes a book or resets progress.

Instructor lessons can be free where authored, require compatible worn equipment and use an Ink/service command. Books consume one item only after successful learning. Incomplete books accept distinct matching pages in any order; wrong/duplicate pages consume nothing. Completing a collection creates its readable book once. Reading, insertion and rank-up require town without a run.

Later acquisition examples preserve Critical Hit's 60-gold manual, Final Hit's 30-gold incomplete manual plus five distinct pages, and 30-gold individual pages as balance proposals. Do not require five guaranteed combat victories: Alby has three required encounters, one optional encounter and a boss. Any guaranteed-page offer uses the lowest missing page absent from inventory/bank/collection, and offers are persisted; the player may use the shop or another run.

## Training

Objectives have stable IDs, points per completion, bounded counts and eligibility rules. Every enabled nonterminal rank must have reachable objectives totaling at least 100. A resolved action may train several distinct eligible objectives once each; multi-target defeat credit counts distinct enemy IDs. Menus, previews, failed commands, reload and effects callbacks earn nothing.

Attack trains Combat Mastery for every damaging weapon category, but mastery attack bonuses remain melee-only. Preserve separate authored credit for selected skills, eligible equipment passives and criticals without double-counting a single objective. Defensive credit distinguishes fully mitigated incoming hits from counter-negated attacks. Save training alongside the action; retained committed training survives defeat/abandonment/rebirth. Run ranks remain frozen until return.

## Active, passive and reference content

Active skills use one main action, pay their authored pools once and follow fixed-Speed turns. Passives have no independent action/payment; apply only when learned and their equipment/condition passes. Counters and buffs are consequences of a paid active action, not extra turns.

| Skill/family | Planned adaptation |
| --- | --- |
| Smash | Single-target melee power |
| Defense | Rank-based guard until next owner start |
| Counterattack | Prepare one eligible melee retaliation; cannot chain counters/criticals |
| Final Hit | Rank-base melee bonus; no stacking/recast while active |
| Windmill | All living hostiles in stable order; one cost |
| Combat/Sword/Dual Wield masteries | Named eligible contributions counted once |
| Shield/armor masteries | Require matching gear; light/heavy mutually exclusive |
| Critical Hit | Authored chance and rank bonus; one decision per target/action |
| Bolt spells | One-charge adaptation |
| Healing / Mana Recovery | Authored recovery; explicit outside-battle cooldown policy needed before enabling that use |
| Charge | Unavailable until redesigned for non-spatial battles |
| Life skills / Wand Mastery | Reference-only; no fabricated executable values |

Off-hand swords contribute half their weapon power, not half all derived attack. Only distinct paired swords enable Dual Wield Mastery. Dual guns occupy both hands without granting dual-wield effects. Equipment/race restrictions are independent of talent. Counter, cooldown, critical and Mana Shield details are owned by the battle contract.

## Defold journal and delivery

Druid renders learned skills in All/Life/Combat/Magic categories, icons, rank/training and an Advance control at 100 training with AP/town guards. A later trainer catalog can show discovered unlearned skills and clearly marked reference-only entries. Details show effects, costs, prerequisites, objectives, AP for the next rank and source rank tables. Preserve parent tab/scroll and focus when closing details; use Monarch sibling popups.

Milestone 4 implements starter actions and mastery/Defense foundations; milestone 5 completes starter timing; milestone 6 ports broad F–1 content, books/lessons, richer journal and training workflows. Do not claim 42 playable or installed skill modules from the historical catalog. Enchant, mastery titles and life skills arrive only with their own supported content.

Lua rules and validators own all acquisition and training. DefSave commits AP/items/progression together; Event only announces success. Use Lester for progression reachability, once-only learning/payment, frozen baselines and costs, plus engine GUI/Ink/save tests. [Character](character.md) owns EXP/aging/rebirth; [stats](stats.md) owns modifiers.
