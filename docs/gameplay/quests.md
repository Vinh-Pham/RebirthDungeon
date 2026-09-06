# Rebirth Dungeon: Quests

Quests give the player authored goals, story context, and rewards alongside dungeon exploration. **Mainstream Quests** follow the story through **Chapters and Generations**. **Sidequests** develop NPC stories, introduce activities, reward skill training, and let the player experience events as another character.

This is a design specification for planned gameplay, modeled after **Mabinogi**. It complements [skills.md](skills.md), [character.md](character.md), [inventory.md](inventory.md), [battle.md](battle.md), the [game plan](../game-plan.md), and the [project phases](../project-phases.md). The quest categories and acquisition patterns below are requirements; lifecycle, examples, and implementation boundaries are proposed Rebirth Dungeon defaults. This document does not claim quests are implemented.

## 1. Mabinogi reference

Mabinogi organizes story quests into Generations grouped within Chapters representing story arcs. Specific tabs in the quest menu identify the storyline. [Mainstream Quests](https://wiki.mabinogiworld.com/view/Category:Mainstream_Quests#Basic_Information).

Sidequests include NPC stories, talent-related content, and skill acquisition. Skill Quests commonly become available at a learned skill's rank milestone, then arrive automatically or through an NPC. Equipping a weapon or rebirthing into a particular talent can also deliver a quest, shown in the Skills tab. These quests recognize investment in training. [Sidequests](https://wiki.mabinogiworld.com/view/Category:Sidequests), [Skill Quests](https://wiki.mabinogiworld.com/view/Category:Skill_Quests).

Role-playing quests let players control an NPC; they can also occur within the mainstream story. Mabinogi's quest journal groups quests into tabs and supports a tracker for selected objectives. [Role-Playing Quests](https://wiki.mabinogiworld.com/view/Role-Playing_Quests#Basic_Information), [Quest journal](https://wiki.mabinogiworld.com/view/Category:Quests).

Rebirth Dungeon adopts these concepts with explicit turn-based objectives, hub progression boundaries, and saved reward transactions. Mabinogi's delivery delays, multiplayer assistance, individual quest prerequisites, and exact reward tables are not automatically adopted.

## 2. Quest categories and story structure

| Category or subtype | Purpose | Quest-menu location |
| --- | --- | --- |
| Mainstream | Advance the central storyline through authored quest chains | Dedicated storyline tabs, labeled by Chapter and grouped by Generation |
| Sidequest: NPC | Help an NPC, discover local lore, or unlock a service | Sidequests tab |
| Sidequest: Skill | Reward training milestones or introduce a skill/talent | Skills tab |
| Sidequest: Role-playing | Experience an NPC's memories or actions by controlling that NPC | Sidequests tab, marked RP |

A Chapter is a story arc containing one or more Generations. A Generation is a named installment containing individual quests and their ordered objectives. Store Chapter, Generation, and quest IDs separately: completing one quest does not necessarily finish its Generation or Chapter.

Illustrative structure, with original placeholder names:

| Chapter | Generation | Quest sequence |
| --- | --- | --- |
| Chapter 1: Beneath the Ruins | G1: The Broken Seal | Meet the watch captain → investigate the sealed floor → report the discovery |
| Chapter 1: Beneath the Ruins | G2: The Missing Expedition | Trace the expedition → complete an NPC memory mission → confront the guardian |
| Chapter 2: Echoes of Rebirth | G3: A Second Beginning | Opens after the authored Chapter 1 completion requirement |

Mainstream progression uses explicit prerequisite links. The initial default is sequential progression within each Generation; the next Generation unlocks after the previous Generation's required final quest is claimed. Optional sidequests do not block the story unless named as prerequisites. Do not assume numeric Generation order alone determines every unlock.

Role-playing is also a **mission mode** that a mainstream quest can use. Such a mission stays in its storyline tab instead of becoming a duplicate sidequest. Similarly, a mainstream quest may reward a skill without being reclassified as a Skill Quest. Category describes the quest's purpose; reward type and controlled character are separate properties.

## 3. Discovery, prerequisites, and delivery

Every quest defines eligibility separately from how it is received. Eligibility may require completed quests, a learned skill at or above a rank, a committed equipment event, a rebirth into a named talent, or an authored character milestone. Require all mandatory conditions; represent alternatives explicitly instead of treating a list of prerequisites as ambiguous AND/OR logic.

| Delivery mode | Proposed behavior |
| --- | --- |
| Automatic | When eligibility is satisfied, create the active quest once and notify the player; no separate acceptance click is required |
| NPC offer | Eligibility makes the quest available from a named NPC; the player receives it by accepting the appropriate dialogue offer |

Evaluate new eligibility after committed rank-ups, equipment changes, rebirths, and quest completions. Process it after the initiating transaction has resolved, in stable quest-ID order. Receiving a quest creates its record; it does not grant its completion reward or complete its objectives merely because the notification appears.

For rank prerequisites, use the skill order `F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1`. **Rank E or better** includes Rank 9; compare order indices, not text or numeric labels. Reaching 100 training points without spending AP is not a rank-up and cannot satisfy a higher-rank prerequisite.

On load or content migration, reconcile state-based prerequisites such as current learned ranks and currently equipped weapon categories. This allows an already-qualified character to receive a newly available quest without retraining. Event-based prerequisites require their persisted evidence: a current Magic talent alone does not prove that the character **rebirthed into Magic**. Character creation and a committed rebirth are distinct events.

Once a quest becomes available or active, preserve that unlock. Unequipping a weapon, changing talent, or rebirthing does not revoke the quest. Objectives that require current equipment or a current talent still validate that condition when performed. A one-time quest cannot be redelivered after each equip, load, or rebirth.

## 4. Skill Quests

Skill Quests primarily recognize progress in already learned skills. Most should unlock from rank milestones, rewarding diligence through follow-up instruction, AP, supplies, lore, or access to a new technique. Some instead introduce a skill when a weapon is equipped or a talent is chosen through rebirth. Both automatic and NPC-delivered Skill Quests appear in the **Skills** tab after receipt.

Illustrative quests and prerequisites, not Mabinogi quest data or final balance:

| Quest | Eligibility and delivery | Objective and reward concept |
| --- | --- | --- |
| A Steady Blade | Sword Mastery Rank E or better; automatic | Report to the sword instructor; receive an authored AP/supply reward for training |
| Patience Before Power | Smash Rank E or better; NPC offer | Complete a defensive lesson; learn Counterattack at Rank F |
| Holding the Line | Shield Mastery Rank D or better; automatic | Finish an eligible shield combat trial; receive equipment or supplies |
| A Swordsman's First Lesson | Equip a legal sword; automatic | Visit the instructor; learn Sword Mastery at Rank F if unknown |
| The Path of Magic | Complete a rebirth into the Magic talent; automatic | Speak to the magic instructor; receive an introductory spell book |

The equipment-triggered lesson does not grant Sword Mastery at the moment of equipping. It delivers a quest whose reward uses the instructor acquisition route in skills.md. Likewise, receiving a spell book does not learn its skill until the player reads it through the normal learning action.

A quest may teach a previously unknown skill at **Rank F with 0 training**. It may not award a higher rank, buy training points, or bypass the requirement to train to at least 100 points and spend AP for advancement. A quest that grants AP adds to the shared hero AP balance; it does not automatically spend it on the skill that unlocked the quest.

If the player learns the reward skill through another route before claiming the quest, preserve the existing rank and training. Mark the skill-grant part as already known and allow the quest to complete with its other authored rewards. There is no automatic duplicate-skill AP refund or replacement item unless the quest explicitly defines one and previews it. Reject circular prerequisites, such as requiring an unknown skill to complete its only acquisition quest.

## 5. Objectives and progress

Each quest has stable objective IDs and one or more ordered stages. The initial default requires all objectives in the current stage; they can progress in parallel. The next stage activates only after the current stage is committed complete. Events from earlier stages do not retroactively satisfy later event objectives.

| Objective kind | Authoritative evidence |
| --- | --- |
| Talk | Complete a named dialogue step with the specified NPC |
| Visit/interact | Reach or interact with an authored location/object in an eligible mission |
| Defeat | Resolve a qualifying enemy's defeat, with any required skill or equipment context |
| Use a skill | Resolve the authored skill outcome; selecting it or rerolling dice is insufficient |
| Obtain an item | Record a qualifying acquisition after the objective activates |
| Deliver items | Validate and consume the specified committed quantities at the named hand-in |
| Clear a mission | Commit the required victory/outcome for the specified dungeon or scenario |
| Complete an RP mission | Commit success from the specified scenario while controlling its assigned NPC |

Event objectives begin counting when their stage becomes active. Rank/state objectives may evaluate existing state only when the definition explicitly permits it. Objectives involving owning or delivering items check current eligible inventory, rather than trusting an old pickup count after those items have been sold or consumed.

Apply each outcome to a particular objective at most once. One enemy defeat can satisfy distinct objectives in multiple active quests, but one enemy does not count twice for the same objective. Multi-target skills may count distinct defeated targets; a skill-use objective counts one committed action unless explicitly authored otherwise. RP events are excluded from the hero's ordinary skill/kill objectives unless the objective explicitly names that RP context.

For item hand-ins, consume exactly the selected legal quantities and advance the objective together. Respect inventory locks, run reservations, item variants, and stack provenance. Two quests cannot consume the same delivered herbs. A completed intermediate delivery remains a saved checkpoint; it cannot consume the same payment again on reload.

Dialogue, map markers, animations, and quest-tracker updates display progress; they do not award it. Skipping a cutscene resolves its authored narrative completion once, without skipping unfulfilled gameplay objectives.

## 6. Quest lifecycle and rewards

| State | Meaning |
| --- | --- |
| Locked | Eligibility has not been met; show only discovered prerequisite information |
| Available | Eligibility is satisfied and an NPC offer can be accepted |
| Active | Quest has been received and its current stage can progress |
| Ready to complete | Final objectives are satisfied; claim or final NPC hand-in remains |
| Completed | Rewards and completion flags have been committed |

Automatic delivery moves an eligible quest directly into Active. A current-inventory requirement can move Ready back to Active if its required items are no longer available before hand-in. A mission failure normally leaves the quest Active at its last committed checkpoint, with its failed attempt reset as authored.

The proposed default is **one completion per hero per quest**, without expiration. Mainstream quests can be untracked but not abandoned. Sidequests may be abandonable when explicitly authored; abandonment resets uncommitted progress and returns the quest to its available delivery point, with an explicit reaccept action even if its first delivery was automatic. It does not refund previously consumed items or erase committed delivery checkpoints. Do not enable abandonment for a quest whose required unique item or checkpoint cannot be recovered consistently.

Rewards may include character XP, gold, AP, items, a Rank F skill unlock, access to an NPC service, a story flag, or access to another quest/dungeon. Show the exact bundle before claiming. XP uses character.md's leveling rules; AP uses skills.md's balance; item grants use inventory.md's placement and saved overflow rules. Physical books and pages remain inventory items until their normal consumption actions occur.

Claiming is one atomic transition: revalidate final objectives and hand-in costs, consume required items, grant rewards, record the completion ID, and unlock eligible successors. A full backpack puts granted items into saved reward overflow; withdrawing them later does not regrant quest XP or AP. If a balance bound or invalid reward prevents a legal claim, change nothing and keep the claim available for resolution.

The initial default requires an explicit **Complete** action or final NPC dialogue, even when objective progress was automatic. Merely opening the quest menu cannot claim a reward. Repeatable quests, daily resets, randomized reward rerolls, and story replay rewards need separate rules and are deferred.

## 7. Role-playing missions

A role-playing quest temporarily lets the player control an **authored NPC instead of their hero**. This can show a past event, explain an NPC's motivation, or demonstrate a different combat style. An escort mission in which the player still controls their hero is a different objective type.

Start an RP mission from the hub when its quest stage permits it and no ordinary run or other RP mission is active. Create an isolated mission session with a scenario ID, NPC identity, fixed stats, skill ranks, equipment, supplies, map, objectives, and success/failure conditions. The player uses the normal movement and five-dice combat rules through that NPC's authored abilities.

The hero's learned skills, AP, talents, enchants, equipment, and consumables do not replace the NPC template. Conversely, borrowed NPC skills and gear never become permanent hero possessions. Keep the hero profile intact rather than overwriting its fields and trying to reconstruct them later. Disable hub progression, rebirth, trading, and equipment export during the mission.

RP combat does not award the hero normal skill training, loot, or combat XP by default. Only the scenario's committed outcome progresses its eligible quest; the quest later grants its declared hero rewards. NPC supplies and temporary pickups remain in the scenario and disappear when that attempt ends. Any exception must be an explicit quest reward.

On success, save the scenario outcome once, return to the hero in the hub, and advance the relevant quest stage. On failure or voluntary exit, preserve the hero's pre-mission possessions and leave the quest retryable at its authored checkpoint. Retry creates a fresh NPC attempt; loading a suspended attempt restores its current HP, supplies, dice, and objectives. App closure is not a mission failure or a free reset.

## 8. Dungeon boundaries, persistence, and rebirth

Accept and claim quests in the hub in the initial design. A normal run snapshots the active quest stages eligible for that mission. Progress produced inside the dungeon is pending run progress, shown separately from committed quest progress. It cannot grant a permanent skill, AP, story completion, or a next-generation unlock during an unfinished run.

At the result boundary, apply the authored victory/defeat/abandonment retention policy to quest evidence along with other run rewards. A clear-dungeon objective always requires the specified successful outcome. Whether other evidence, such as enemy defeats, survives a failed run remains a Phase 7 decision. Do not silently preserve all quest progress while discarding the loot that proves a delivery objective.

An in-run chain that advances between dungeon objectives needs staged mission-local progress and a defined rollback/checkpoint policy. Until that extension exists, new quest stages requiring fresh gameplay begin after the result is committed at the hub; accepted quests must be authored so this boundary is playable. Quest rank rewards and auto-delivery never replace the active run's skill snapshot.

Committed quests, completed stages, availability milestones, and claimed reward IDs belong to the hero profile and survive rebirth under character.md. Rebirth may trigger a new talent quest after the rebirth transaction commits; it does not reset already-completed quests or reissue their rewards. Record the qualifying rebirth event's life ID and chosen talent for reliable delivery after interruption.

Save quest/Chapter/Generation IDs, state, active stage, objective counts/evidence, committed checkpoints, eligibility milestones, tracked quests, and claimed reward IDs. Run state additionally holds its quest snapshot and pending evidence. An RP session stores its NPC template/version, current simulation state, attempt ID, and outcome status. Use the existing combined profile/run save bundle and pinned content/rules versions.

Rank-up, equip, rebirth, and quest-completion triggers need persisted event IDs or equivalent committed evidence. On recovery, reprocess undelivered eligibility events idempotently so a crash cannot lose an automatic quest or create a second copy. Apply costs, rewards, progression, and successor delivery before their notifications, using the existing save checkpoint gate. Retrying a claim returns its recorded result without spending items or granting rewards again.

## 9. Quest menu and tracker

Give each discovered storyline a specific tab labeled with its Chapter name, with Generations grouped inside it. Keep completed storylines accessible through a completed filter rather than hiding the history. Provide separate **Sidequests** and **Skills** tabs. An RP badge identifies missions using another character wherever their parent quest belongs.

Show a quest's title, story/NPC context, category, current stage, objective counts, destination, delivery/turn-in NPC, rewards, and completion state. Before an NPC offer is received, show a discovered availability hint and unmet requirements where appropriate; do not reveal later story spoilers through locked objective text.

Allow the player to track a small selected set of quests, with the current actionable objective visible beside the dungeon interface. Selecting a tracker entry opens its journal details. Tracking, untracking, filtering, and reading never advance turns, objectives, or rewards. Distinguish **Quest received**, **Objective complete**, **Return to NPC**, and **Reward claimed** notifications.

Skill Quest entries should name the triggering milestone and the reward type: **Sword Mastery E reached**, **Sword equipped**, or **Rebirthed into Magic**; **learn a new skill** is distinct from **receive a skill book**. Show when a reward skill is already known. The hero's skill journal can link to the quest required to unlock a discovered skill.

## 10. Initial scope and validation

The first quest slice should prove one Chapter/Generation containing a short sequential story chain, one NPC sidequest, one automatically delivered rank-milestone Skill Quest, and one NPC-offered skill-unlock quest. Add equipment- and talent-rebirth delivery as those systems become available, then one single-player NPC role-playing scenario. Include the journal tabs, tracker, saved objectives, and exactly-once claim flow.

Content definitions need stable IDs, category/subtype, Chapter/Generation membership, prerequisite expressions, delivery mode/NPC, stage/objective definitions, eligible mission contexts, reward bundles, and abandonment/retry behavior. Validate missing references, prerequisite cycles, inaccessible NPCs, unattainable objectives, duplicate reward IDs, and skills whose sole acquisition quest requires the same unknown skill. Do not expose a talent-rebirth trigger before rebirth exists or an RP quest before its NPC abilities and scenario are usable.

Future implementation acceptance checks should cover:

- Story tabs and Chapter/Generation completion, optional sidequests not blocking progression, and successor unlock only after the required completion claim.
- Automatic versus NPC delivery, exact rank thresholds and rank ordering, equipment/talent triggers, catch-up eligibility, and no repeated quest on load or rebirth.
- Ordered stages, one event per objective, multi-target counting, item hand-in validation/consumption, and readiness changing when required items are spent elsewhere.
- Rank F skill acquisition, already-known reward skills, no training/AP advancement shortcut, and reward overflow without duplicate grants.
- RP control using NPC stats/gear, no borrowed progression leaking to the hero, retry after failure, and suspended-mission recovery.
- Pending run evidence under each outcome policy, rebirth preservation, abandonment checkpoints, and interrupted delivery/claim/retry without lost quests or duplicate rewards.

Still open: actual story content, quest/reward pacing, prerequisite ranks, available NPCs, loss/carry-over rules, and RP checkpoints. Repeatable/daily quests, timers, multiplayer quest sharing, escort AI, branching story exclusions, and rewarded Generation replay remain outside the first slice.

## Research notes

Mabinogi Wiki pages were retrieved with Firecrawl and inspected on **September 5, 2026**. Source concepts are identified in section 1; examples and proposed dungeon rules are Rebirth Dungeon design choices. Raw pages remain in the gitignored `.firecrawl/` directory.

| Reference | Local cache |
| --- | --- |
| [Quest overview](https://wiki.mabinogiworld.com/view/Category:Quests) (`Quests` redirects here) | `.firecrawl/mabinogi-quests.md` |
| [Mainstream Quests](https://wiki.mabinogiworld.com/view/Category:Mainstream_Quests) | `.firecrawl/mabinogi-mainstream-quests.md` |
| [Sidequests](https://wiki.mabinogiworld.com/view/Category:Sidequests) | `.firecrawl/mabinogi-sidequests.md` |
| [Skill Quests](https://wiki.mabinogiworld.com/view/Category:Skill_Quests) | `.firecrawl/mabinogi-skill-quests.md` |
| [Role-Playing Quests](https://wiki.mabinogiworld.com/view/Role-Playing_Quests) | `.firecrawl/mabinogi-role-playing-quests.md` |
