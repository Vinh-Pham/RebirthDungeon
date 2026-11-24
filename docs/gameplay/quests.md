# Rebirth Dungeon: Quests and dialogue

**Planned Defold system.** Milestone 4 introduces Alby onboarding; milestone 6 ports the broader journal/catalog and RP. [Defold Quest](../references/defold/defold-quest.md) evaluates objectives, [defold-ink](../references/defold/defold-ink.md) runs authored dialogue, Druid renders the journal/choices and Monarch manages panels. The [game plan](../game-plan.md) and [architecture](../architecture.md) govern scope and persistence.

## First-loop onboarding

Implement **enter Alby → win a battle → defeat the boss → claim treasure and return** with stable quest/stage/task IDs and evidence from domain actions. Progress each checkpoint within the initiating candidate; final clear requires successful treasure Continue to town. Defeat/abandonment never satisfies clear. The journal displays committed state; rewards require an explicit Complete command and durable claim ID.

Define onboarding rewards in validated content before enabling claims; this document does not invent amounts. This chain can advance inside its active run. The later catalog's run-banked evidence policy below applies to its authored stages, not to every onboarding checkpoint.

## State and transaction contract

Use proposed `game/content/quests/` catalogs and a `game/services/` Quest adapter. Saved facts include quest/version, available/active/completed state, stage/tasks, stable evidence IDs, eligibility milestones, explicit reward claims, later tracked IDs/overflow, and any run-local evidence. Story continuation has its own tagged representation/content version in the same character envelope.

Bind copied candidate state with Quest before initialization and evaluation. Feed evidence with stable operation/outcome identity; deduplicate per objective. Collect notifications without outward side effects until the candidate, rewards and checkpoint are saved. Restore the prior binding and clear/rebuild queued notifications on failure. Test whether initialization activates/completes quests. Shared Lua module state requires explicit character/RP isolation.

Quest's queued notifications can repeat. Acknowledge handled messages, but never use a queue callback to pay gold/items/AP. Completion and reward-claimed are separate facts. Disable automatic finishing for reward-bearing quests requiring manual claims. Required consequences occur in the initiating transaction, not a second post-commit Event subscriber write.

Ink choices stage permitted service/quest commands in a candidate story. Save dialogue continuation and effects together; suppress external callbacks/observers during restore. Compile compatible JSON as custom resources and choose one documented save mode. Story variables are narrative state, not another authoritative quest/inventory ledger.

## Broader quest lifecycle — milestone 6

Locked → Available (NPC offer) or Active (automatic delivery) → Ready → Completed after claim. Readiness based on current backpack items can fall back to Active if those items are sold/banked/used. Ordered stages can have parallel objectives; evidence before a stage activates cannot retroactively satisfy its event tasks.

Automatic eligibility reconciles in town after creation, rank/equipment changes, rebirth, claims and load, in stable quest-ID order. Save reconciliation before publication. State prerequisites can inspect current ranks/equipment; event prerequisites need persisted proof. Selecting Magic at creation does not prove rebirth into Magic. Unlocks persist after later equipment/talent changes.

Use explicit rank order F through 1; 100 training without advancement does not meet a higher-rank condition. Claim revalidates hand-in quantities/context, consumes costs, grants EXP/gold/AP/items or Rank F skills, records permanent claim identity and unlocks successors together. Already-known skills retain rank/training without implicit refund. Durable claim IDs remain effective after operation-ledger eviction.

Run entry snapshots eligible catalog stages. Bank qualifying distinct-enemy defeat evidence on success, defeat or abandonment; clear evidence requires successful treasure return. RP evidence never counts as ordinary hero kills/training. Item hand-in uses current backpack quantities, excluding bank stock; previously owned items can qualify. A staged delivery consumes once. Do not split progression and claim markers across files.

If a quest reward cannot fit, the later overflow feature stores unplaced items as a durable identified grant. Withdrawal adds no new EXP/AP/gold and is town-only. Other invalid reward/balance conditions reject the full claim. Ordinary encounter offers remain a separate system.

## Retained broader catalog proposals

These are project balance proposals, not installed content or Mabinogi reward values. Resolve NPC IDs through the town catalog. Every quest is one-time; no expiration or abandonment in this initial expanded catalog.

| Quest | Delivery / objective | Reward |
| --- | --- | --- |
| Aren's Warning | Automatic; speak with Aren | 50 gold, 100 EXP |
| Clear Alby Dungeon | After Aren's Warning claim; boss and treasure return | 500 gold, 900 EXP |
| Aren's First Expedition | After Clear Alby claim; memory, then report | 200 gold, 400 EXP, 2 AP |
| Kill 5 Spiders | Automatic; five distinct Alby spiders | 100 gold, 200 EXP |
| Silk for Nell | Nell offer; deliver three Spider Silk | 120 gold, 150 EXP |
| Supplies for the Forge | Bram offer; deliver two Fresh Bread | 80 gold, 100 EXP |
| A Healer's Welcome | Elara offer; speak with Nell, return | 50 gold, 100 EXP, two HP potions |
| A Steady Blade | Automatic at Sword Mastery E+; speak with Aren | 2 AP, 150 EXP |
| Patience Before Power | Aren offer at Smash E+; three sword-equipped spider defeats, report | Counterattack F, 200 EXP |
| A Swordsman's First Lesson | Automatic with legal sword; speak with Aren | Sword Mastery F |
| The Path of Magic | Recorded Magic rebirth; speak with Aren | Two mana potions, 1 AP |

Group the mainstream chain as Chapter 1: Beneath the Ruins / G1: The Broken Seal. Define how onboarding completion maps into this later catalog when introduced; do not award retroactive rewards merely because a similar label exists. Claiming Aren's First Expedition completes the authored Chapter/Generation.

## Aren's memory — later isolated actor

Enter only in town at the eligible stage, without a normal run or another RP attempt. Use a versioned Human Close Combat age-17 NPC template with sword, Normal Attack, Smash F, Counterattack F, Combat Mastery F, Defense F and two HP potions. The retained scenario is a corridor, one White Spider, then two White Spiders, then explicit exit.

Persist an isolated controlled actor, stats, inventory, skills, quest/story state, run/battle, RNG streams and attempt ID. Keep the hero profile intact. Use normal fixed-Speed combat and validated commands; block hero trading, progression, rebirth and equipment export during RP. No NPC loot, EXP or training leaks into the hero. Success records the RP outcome and report stage; final hero rewards require the normal claim. Death/Exit discards that attempt and permits retry; application restart resumes it rather than resetting it.

Quest/Ink/Event singletons must be rebound/reset correctly; isolated Lua tables alone do not prove no cross-character callbacks. Later display-only battle archives may copy records without progression leakage.

## Journal and checks

First show the onboarding chain. Later Druid tabs include Mainstream, Collecting, Hunting, Part-Time Job, Sidequests and Skills, with clear unavailable/empty states. Show Current/Completed, Chapter/Generation, stage objectives, exact reward, NPC destination and explicit claim. Retain three tracked IDs per hero; tab/filter/scroll/popup geometry is transient. Distinguish banked and this-run evidence. Selecting/tracking never advances tasks or turns.

Lester plus engine fixtures cover rank ordering, automatic/NPC delivery, prerequisite cycles, stage order, duplicate evidence/claims, changing readiness, overflow, saved choices, queued callback rollback and character/RP isolation. Test restart after enter/win/boss/chest/return and prove only successful return grants clear. Repeatable jobs, daily timers, branching exclusions, editable notes and rewarded replay remain deferred.
