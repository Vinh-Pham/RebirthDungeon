# Defold skill implementation contract

**Starter Lua port implemented; expanded ranks/acquisition remain planned.** The executable F-rank registry is `game/content/skills.lua`, the rules module is `game/domain/skills.lua`, and the journal uses `game/runtime/skills_presenter.lua` with the message-only `game/ui/skills.lua`. There is no imported TypeScript registry or normalized wiki JSON. Follow [skills.md](skills.md), the [battle contract](../turn-based-plan.md), and the [game plan](../game-plan.md). Old content-version/schema numbers do not version the new Defold format.

## Modules and content

Use proposed `game/content/skills/` for definitions and `game/domain/skills/` for acquisition, rank/training, equipment eligibility and derived sources. `game/domain/battle/` resolves commands through the outer session candidate. Maintain one registry keyed by stable IDs; no GUI-local definitions or alternate battle store.

Each executable definition needs kind/category, F–1 rank records as supported, target rule, race/equipment restrictions, resource cost vector, cooldown boundary, ordered effects, training objectives, AP-to-next-rank, acquisition routes and source/adaptation provenance. Runtime validation rejects missing references, nonfinite costs, unsupported effect kinds and unreachable rank objectives. Reference-only entries cannot be learned or executed.

## Source adaptation

The [reference index](../references/skills/README.md) retains 33 primary skill pages plus Elf Ranged Attack; historical catalog counts do not prove a Defold implementation. Transcribe verified tables into versioned Lua data with fixtures that preserve merged-column/race alignment. Keep unknown source cells unknown.

- Source AP is the cost to **reach** the inspected rank; advancement reads the next rank's cost and correct race row.
- Use cumulative attribute bonuses once. Weapon range additions and attack multipliers use adopted midpoint rules only where explicitly documented per skill.
- Convert six source seconds to one cooldown turn, rounded up; skip the casting owner end. Real-time source behavior must be adapted explicitly.
- Round positive skill SP/MP/HP costs upward to whole numbers; Attack alone uses its fractional Combat Mastery rule.
- Bolt spells use one charge. Area spells select all living enemies. Arrow Revolver resolves five authored arrows within one action and shares each target's critical decision.
- Healing restores `floor(rank.base × 5)` to self. Mana Recovery restores its authored fraction of maximum MP and requires 5 SP up front. Shockwave's maximum-MP percentage cost is calculated at commitment.
- Counterattack includes authored opponent attack power; Defense expires next owner start; Mana Shield pays three subsequent owner-start upkeeps and expires on the third. Final Hit uses rank base, never a removed dice term.

No real-time charge storage, stuns, lingering meteor fire, physical meteor damage or cooldown-reset chance is implied. Outside-battle Healing/Mana Recovery is later work until a finite persisted cooldown boundary is specified; opening windows, movement frames or reloading cannot tick it.

## Training and equipment

Lester fixtures must establish one action credit versus per-distinct-target defeat credit, shared Combat Mastery training for all Attack categories, correct passive equipment eligibility and no credit for previews/rejections. Learned ranks and sources are frozen for a run, while earned training persists in the hero record. Level growth or rank-up UI cannot rewrite a frozen baseline.

Critical chance is an explicit content value, zero when the required passive is absent; no inferred Luck/Will/Protection conversion. One eligible critical result per target is shared by that target's hits. Counter reactions cannot critically hit. Preserve normal/critical previews using the same mitigation functions.

Equipment contributions enter once. A paired off-hand sword adds half its own weapon power; legal distinct pairs activate Dual Wield Mastery. Dual guns block off-hand use. Armor categories and shield requirements gate passives. Broken weapons halve weapon contribution and lose durability once per committed attack action.

## Runtime and GUI

Druid controls show learned actions, exact costs, cooldowns and disabled reasons; selecting a usable action submits the normal guarded command. NPC learning and quest skill rewards enter the same session transaction through Ink/Quest adapters. Event notifications update presentation only after DefSave confirms the full candidate.

All rank-up, book, page, skill-use and reward commands carry operation IDs. Save costs, item consumption, training, RNG, events and next checkpoint together. Quest callbacks and story replay cannot grant skills independently. Lume helpers must not create mutable aliases to committed skill tables.

Milestones 4–5 prove the starter set; milestone 6 expands verified ranks/catalog. Test acquisition, AP/training reachability, duplicate pages/books, all timing exceptions, invalid content, failed saves and restart with Lester plus actual engine integration. No prior browser test results establish completion.
