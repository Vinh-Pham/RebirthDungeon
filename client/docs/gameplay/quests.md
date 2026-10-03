# Rebirth Dungeon: Quests and Story Progression

Updated **October 1, 2026**. The first quest slice is **implemented**: a short Chapter 1 / Generation 1 chain, an NPC delivery request, a skill-rank milestone, a journal/tracker and durable manual claims. Broader objectives and RP missions remain planned. Build these on the existing TypeScript campaign and turn-based battle, with React Native views. Read with [Skills](skills.md), [Character](character.md), [Battle](battle.md), [Inventory](inventory.md), and [Titles](titles.md).

## 1. Categories and story structure

Preserve the Mabinogi-inspired Chapter/Generation structure and several acquisition routes without importing its MMO delivery systems. These are Rebirth Dungeon content contracts. [Historical inspiration](https://wiki.mabinogiworld.com/view/Category:Quests).

| Category             | Role                                   | Proposed journal organization                                             |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Mainstream           | Ordered story arcs                     | Chapter → Generation → quests                                             |
| NPC sidequest        | Optional local stories and requests    | Town/NPC grouping                                                         |
| Skill quest          | Learning, practice and rank milestones | Skills grouping linked to the skill journal                               |
| Role-playing mission | Control an authored NPC in a scenario  | Mission mode attached to a story/side quest, not a second reward category |

Use stable IDs for chapters, generations, quests, stages and objectives. Display labels may change without resetting progress. A quest belongs to one category; a role-playing scenario is its execution mode. Initial content contains Chapter 1 / Generation 1, “The Broken Seal.” “A provision for the road” starts at the keeper, followed by Smash practice, successful moss-depths completion and a keeper report. The healer offers “A little kindness” (two apples); committed Sword Mastery Rank E reveals “A steady sword.”

## 2. Prerequisites, discovery and offers

Prerequisites support explicit AND/OR groups over saved facts: completed quests, current level, growth talent, learned skill/rank, owned/equipped gear and authored flags. Validate references and reject prerequisite cycles. Rank comparisons use the Skills order F → E → D → C → B → A → 9 … 1, not alphabetical comparison. Reaching 100 training does not satisfy a higher-rank condition until the AP rank-up commits.

Each quest specifies one delivery mode:

- **Automatic:** becoming eligible records availability and notifies the journal once.
- **NPC offer:** eligibility exposes an offer at a named NPC; accepting requires the valid town interaction.

Availability persists after discovery unless an explicit temporary-offer policy exists. Equipping a sword can reveal a lesson quest, but it does not silently learn Sword Mastery. Reject stale offers whose acceptance restrictions no longer hold. Do not invent an inbox/owl delivery animation as a gameplay owner.

State prerequisites may be reconciled from current saved facts on load/content migration. Event prerequisites need saved evidence. Current gear does not prove a past boss victory, and a chosen talent does not prove a rebirth event. Objective events before activation do not count unless the definition explicitly uses a persistent state condition or named historical completion record.

## 3. Skill-quest integration

Skill quests use the unchanged Skills learning/training/AP model. They may offer NPC lessons, a book, a page source, AP, or practice objectives. Rewards can learn an eligible skill at F, but do not bypass training/AP to grant arbitrary higher ranks.

Illustrative content, to be authored and validated:

| Quest hook                                | Delivery                       | Result and limitation                                                                    |
| ----------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| Equip a sword                             | Instructor offer               | Explain Sword Mastery and its page/book route; reveal availability without auto-learning |
| Commit Sword Mastery Rank E               | Automatic                      | A practice quest with an authored AP reward                                              |
| Commit Smash Rank E                       | NPC offer                      | Later Counterattack lesson only after its reaction adapter exists                        |
| Complete an introductory book/page lesson | Automatic or instructor report | One-time progression reward; no duplicate AP on reload                                   |

Keep acquisition routes consistent with Skills: one quest hint must not accidentally add a fourth automatic learning path or replace the F/E pilot's required pages. A quest referencing an unsupported combat adapter stays unavailable. The introductory 3 AP grant and per-level AP are progression rewards, not repeatable quest claims.

## 4. Objectives and attribution

The first engine supports named interaction/visit, direct skill-use practice, authored encounter wins, final dungeon exit, current skill rank, owned items and item delivery. Damage/kill attribution, pickup-history objectives and RP adapters remain future work. Initial story practice counts completed victories and defeats; restart discards unfinished evidence.

Stages execute in authored order; objectives within a stage can progress in parallel. A stage advances only when all required objectives meet their semantics. Display integer progress and a concrete location/target where available.

| Objective type               | Evidence                                                   | Completion boundary                                  |
| ---------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Talk/interact                | Accepted interaction with a named object/NPC               | Same world-command candidate                         |
| Visit                        | Accepted entry to a named map/tile region                  | Same world-command candidate                         |
| Use skill / deal damage      | Attributed resolved action with action, source and targets | Completed encounter result                           |
| Defeat enemy / win encounter | Death/result with eligible enemy and encounter IDs         | Completed encounter result; victory when required    |
| Clear dungeon                | Named successful run completion after final treasure       | Completed-run exit; early return/defeat do not count |
| Learn/rank skill             | Committed learned-rank transition                          | Same progression candidate                           |
| Collect/own items            | Current owned quantities or explicit accepted-pickup facts | Definition chooses state or event semantics          |
| Deliver items                | Actual owned inputs consumed at a valid NPC claim          | Same claim as rewards and completion                 |

One area skill counts as one use; distinct eligible kills can count separately per target. Periodic damage, reactions, healing and exhausted attacks need explicit objective tags before they count. The renderer, battle log and audio callbacks never grant quest progress. Name the damage basis, eligible actor, enemy type and success requirements rather than accepting every event containing a matching word.

Held-item objectives read usable owned inventory, excluding future reward overflow until withdrawn. Readiness may regress when those items are spent; delivery consumes them only at claim. A gather-event objective may preserve recorded pickups after those items are used if authored that way. A collection preview or repeated interaction cannot fabricate an item acquisition.

## 5. Lifecycle, claims and rewards

```text
Locked → Available → Active → Ready to claim → Completed
                            ↖ held-item readiness can regress
```

Acceptance and claim are distinct. A ready quest never grants rewards merely because its journal row opens. Claims are town-only, and delivery quests require their named NPC. Revalidate prerequisite context, consumable inputs, reward bounds/capacity and ready state before accepting.

Initial quests are one-time and have no timers. Mainstream quests can be untracked but not abandoned. Optional sidequests may support abandonment only when an authored reset policy exists; already spent materials are not automatically refunded and prior rewards are not repeated. Repeatable quests need a separate saved cycle identity and availability rule before introduction.

Rewards can include authored XP, gold, AP, items/books/pages, a learned F skill, titles and story flags. Stage all changes together, including delivery-item removal and XP level-ups. Preserve existing level-up resource restoration and future per-level AP without applying either twice. For item rewards, either reject the complete claim when bounded capacity cannot fit or implement saved overflow first; do not silently truncate a manual quest reward.

A claim ID/result record prevents duplicates. Save completion, rewards, title awards and inventory changes in one durable candidate before showing success. On write failure retain the identical candidate and block dependent changes; retry its write rather than recomputing rewards. JourneyHost owns this claim boundary; ordinary exploration autosave remains asynchronous.

## 6. Encounter and dungeon boundaries

BattleSession holds attempt-local quest evidence alongside the planned skill training ledger. On a **completed** victory or defeat, merge eligible evidence once with the hero result; a kill/clear objective can impose its own victory condition. A “win encounter” objective never advances from defeat. Skill-use practice can count on defeat if its definition allows it.

Restarting an unfinished encounter discards that attempt's evidence, partial consumptions and statuses, matching current checkpoint behavior. Do not persist a separate permanent counter immediately on every hit. Navigation, app backgrounding and process termination are not completed outcomes.

Already committed quest progress survives later dungeon defeat or early return. World interactions commit at their own accepted boundary. There is no whole-run pending reward pool and no exit-time replay of encounter evidence. Dungeon-wide challenges may keep saved run-local evidence such as “no qualifying damage”; finalize them only on the specified successful exit, and discard the challenge on failure without erasing unrelated committed progress.

Rebirth preserves completed quests and ordinary progress under Character's future rules. Recheck current-level/talent eligibility where needed without erasing historical achievements. Quest records belong to the campaign hero, not account-wide UI preferences or a second mutable profile balance.

## 7. Later role-playing missions

RP is a later feature. It uses an authored NPC template in an isolated mission session, the same turn-based combat rules and tile movement, and an explicit mission checkpoint. Never replace the saved hero with the borrowed actor. Player gear, skills, titles and enchant values do not transfer unless the scenario definition deliberately supplies them.

Scenario definitions specify NPC stats/loadout/skills, allowed maps/encounters, objective sequence, success/failure, retry checkpoint and the hero-facing completion reward. Borrowed equipment, loot and AP cannot leak back to the hero. Ordinary skill/quest/title progress excludes RP events unless a named scenario-completion rule awards it.

Persistence for RP must be added deliberately: the current campaign schema cannot serialize a new scenario merely by changing a route. Initially use mission/encounter-entry checkpoints and restart an unfinished encounter. Failure returns to an authored retry boundary or restarts the mission; closing the app restores the last checkpoint and does not count as failure. Exact mid-turn RP continuation is outside the initial feature.

## 8. React Native journal and implementation

Add thin Expo Router quest routes backed by components under src/ui/quests, reusing CharacterGameContext and its existing host. Compact portrait layouts use category list → quest detail → stage/objectives. Larger layouts may show detail alongside the list. Keep Back/claim controls within safe insets and reachable with large text.

The tracker lives in the Journey screen's Quests detail tab, immediately after Inventory. It shows up to three chosen objectives plus More; this is a display limit, not an active-quest cap. Distinguish Available, Active, Ready and Completed through text/icons. Details show prerequisite hints, stage progress, exact rewards and “Return to [NPC]” versus “Claim in town.” Read-only inspection is available during encounters; claims/acceptance services remain context-gated. Notifications follow saved success and do not drive progression.

New TypeScript quest definitions and predicates belong in the content/RPG layer, with Zod validation and source-attributed evidence. JourneySession owns campaign integration; BattleSession owns unresolved evidence; JourneyHost owns the durable merge. Version 7 hero saves include stable objective counters, active stage IDs, one-time claim receipts, tracking, earned titles and story flags. Version 6 imports preserve resources, learned ranks and AP without replaying rewards; state eligibility is reconciled on JourneySession load. UI selection/scroll can stay transient.

## 9. First slice and verification

The implemented slice contains one short Generation chain, two NPC sidequests and one skill-milestone quest. Its final story claim records “the Seal’s Witness” as earned; First/Second selection and title stat effects are available in the Character title collection. The follow-up lantern-watch sidequest grants a Lantern Companion title coupon, including for older heroes who already claimed provisions; see [Titles](titles.md). Prove automatic availability, NPC acceptance, ordered stages, a practice objective, item delivery, manual claim and one title award before adding RP. Quest definitions must have reachable objectives and available rewards; validate dangling IDs, cycles, unsupported skills, negative counts and overflow-prone claims.

Acceptance covers action-versus-target counting; no progress from previews; completed victory/defeat evidence; unfinished-attempt discard; successful dungeon clear versus early return; readiness regressing after item use; delivery/rewards saved together; duplicate claim/retry; rank labels; retained progress after defeat/rebirth; and touch/large-text journal navigation. For RP later, test isolated borrowed state, explicit retry checkpoints and one hero completion award.
