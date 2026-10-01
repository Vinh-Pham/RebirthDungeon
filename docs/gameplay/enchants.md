# Rebirth Dungeon: Enchanting

Updated **October 1, 2026**. The F/E enchanting pilot is implemented as a town service on the existing TypeScript engine and React Native UI. The refuge keeper teaches Enchant F for free; the town blacksmith sells scrolls and materials and offers applications and burning. Saves use version 8 with unique armor copies, installed values, locks, a dedicated random stream and bounded operation receipts. Read with [Skills](skills.md), [Stats](stats.md), [Inventory](inventory.md), [Towns](towns.md), and [Character](character.md).

Current authored balance: applications consume one scroll, one Enchant Powder and **6 MP**. F/E scroll bases are **60% / 55%**, powder adds **5 percentage points**, each floored INT point adds **0.1 percentage points** up to 100 INT, and the final chance caps at **90%**. Burning consumes the equipment, one Mana Herb, one Holy Water and **8 MP**, with **50% / 65%** recovery per occupied slot at Enchant F/E. Enchant F → E needs 100 training and **2 AP**; E is the pilot cap. Successful applications train 10 points each (limit 10), failures 5 (limit 20), burns 5 (limit 20), and each recovered scroll 5 (limit 20). Permanent Intelligence is +1 at F or +2 at E, reconstructed once.

The catalog includes Keen, Studious and of Vigor below, plus **of Resilience** (suffix E, weapons/armor): Defense +1–3 at current level 2 or higher and unconditional Will +1–2. Both variable clauses resolve on successful installation, including an inactive Defense clause. Icebolt now has an authored F → E path: 20 committed casts for 100 training and 2 AP, allowing Studious’s condition to become active. Veteran and other D–1 scrolls remain unimplemented.

Operation receipts retain the most recent 100 accepted results. A monotonic operation sequence rejects evicted or unknown old IDs. Failed storage writes retain the entire resolved candidate; Retry saves that result without charging or rolling again. Armor migration preserves all copies and the equipped copy, while retaining weapon wear, depleted resources and existing progression.

## 1. Scope and prerequisites

The reference inspiration is [Mabinogi Enchant](https://wiki.mabinogiworld.com/view/Enchant) and its [enchant system](https://wiki.mabinogiworld.com/view/Enchant_(System)). The formulas, costs and protection rules below are proposed Rebirth Dungeon defaults, not imported reference balance.

The player learns Enchant at F from a town instructor, obtains a scroll/powder, chooses an owned equipment instance, previews an attempt and confirms it. Qualifying outcomes train the skill; advancement requires 100 training points plus authored AP, following Skills. Enchant is authored separately from the preserved 33-skill reference catalog, with its own acquisition, definitions and town progression. The Enchant F/E pilot comes after the base Skills pilot, rather than becoming an unexpected prerequisite for starter combat.

Application and burning are town-only, outside any dungeon/pending encounter. Neither action spends a combat turn, invokes BattleController or gains resources through animation time. The current paid healer supplies explicit MP recovery. No free refill occurs when opening the screen.

Unique equipment ownership is required before installation. Weapons and armor have stable instance IDs; older stacked armor migrates losslessly to per-copy ownership. An enchant belongs to its item, never the UI row or shared item definition. Item locks prevent sale, offerings, application and burning; equipped locked items retain their bonuses. Burning reserves every potential scroll under the current 999-per-definition limit before consuming inputs or drawing RNG.

## 2. Slots, ranks and compatibility

| Term | Planned meaning |
| --- | --- |
| Enchant definition | Stable ID, name, prefix/suffix slot, difficulty rank, compatibility and effect clauses |
| Scroll | Consumed owned item referring to an enchant definition |
| Installed enchant | Definition ID plus actual resolved clause values on one equipment instance |
| Enchant skill rank | Learned character proficiency, training/AP and extraction access |
| Scroll rank | Difficulty tier; independent of skill rank and item rarity |

Both rank tracks use **F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1**. Compare ordinal definitions, not strings. Initially publish only supported F/E content. Later Rank 5–1 scrolls require Enchant skill 5 or better; weaker scrolls require the learned skill without matching the scroll rank. No lower enchant must be installed first.

Eligible equipment can hold at most one prefix and one suffix. All category/tag restrictions must pass: a sword scroll cannot target a staff merely because both are weapons. Consumables, bags, scrolls and materials have no equipment enchant slots.

Success replaces only the selected slot; the opposite enchant and inherent item properties remain. Replacement loses the old enchant without yielding a scroll. Failure preserves both old slots. Reapplying the same enchant is an explicit replacement and may roll worse values; its preview identifies what will be overwritten.

## 3. Effects and conditions

Use separately evaluated, typed clauses with explicit stat units. Begin with flat attributes, resource maxima, attack/defense and protection **ratings** supported through the shared stat pipeline. Do not invent a generic percent stage or treat protection as a direct reduction percentage. Skill-specific effects require supported action tags/adapters before being authored.

Initial activation conditions read learned skill/rank, current level and growth talent. Cumulative-level and actual-age conditions wait for Character's later systems and schema. Application compatibility is separate from activation: a valid enchant can install while its benefit is inactive. An unconditional penalty still applies when a different conditional benefit does not.

Avoid final equipment-modified stat conditions, such as an INT bonus checking the INT it grants. Conditions use stable progression facts captured at encounter entry; temporary buffs do not satisfy them. Preserve source identity as equipment instance + slot + clause ID and count each contribution once, including two-handed occupancy markers.

Illustrative content and balance:

| Enchant | Slot/rank | Compatible items | Effects |
| --- | --- | --- | --- |
| Keen | Prefix/F | Swords | Physical Attack +2 |
| Studious | Prefix/E | Weapons | Magic Attack +3 with Icebolt E or better; unconditional Max SP -2 |
| of Vigor | Suffix/F | Armor | Max HP +5 |
| of the Veteran, later | Suffix/D | Weapons | Physical Attack +2–4 with cumulative level at least 20 |

Variable clauses roll one inclusive integer value on successful installation in stable definition order, even when their conditions are inactive. Fixed clauses consume no draw. Save the actual values; re-equipping, load, later eligibility and rebirth never reroll. Effective totals reconstruct from the equipped item and eligible clauses.

Raising a maximum does not refill HP/MP/SP; lowering it clamps pools under Stats, including the wounded HP limit. Physical attack modifiers do not automatically improve magical damage/healing. Enchants do not grant AP, ranks or extra turns through a stat clause.

## 4. Attempt validation and chance

Freeze the effective town inputs before spending costs or changing the item. Validate current campaign revision, owned/unlocked target, supported slot/tags, learned rank, exact scroll/powder references, quantity and MP affordability. Invalid or cancelled requests consume no items, training or RNG.

The proposed accepted recipe costs **one scroll, one powder and 6 MP**, with costs authored per skill rank when the feature is implemented. MP is spent once on success or failure. Recovery remains a separate explicit service/use command. No AP is spent by an application.

Application uses this deliberately simplified integer formula:

```text
intPoints = min(max(floor(effectiveTownINT), 0), intCap)
chanceBp = clamp(baseChanceBp[scrollRank]
                 + intPoints × intBonusBpPerPoint
                 + powderBonusBp[powderId], 0, 9000)
success = enchantingRandom.integer(0, 9999) < chanceBp
```

One basis point is 0.01%; the cap is 90%. The explicit floor preserves compatibility with the current fractional attribute growth. Enchant skill rank controls access and burn recovery; it has no additional application-chance bonus in this proposal. Luck, calendar and event multipliers are absent.

Example: base 6,000 + INT 40 × 10 + powder 500 = **6,900 basis points / 69%**. Roll 6,899 succeeds; 6,900 fails. Author/validate rank and powder tables before release. Preview and confirmation use the same resolver and frozen inputs.

## 5. Application outcomes

The first slice always uses **Protect Equipment**:

| Outcome | Cost | Equipment | Training |
| --- | --- | --- | --- |
| Rejected/cancelled | None | Unchanged | None |
| Success | Full scroll/powder/MP recipe | Install selected slot, preserving opposite slot and existing durability | Qualifying success objectives once |
| Failure | Full scroll/powder/MP recipe | Preserve item, durability and both old enchants | Qualifying failure objectives once, if authored |

Failure consumes the scroll rather than leaving a damaged scroll. Enchant-failure durability damage, scroll integrity, protection potions and Protect Scroll are later systems; ordinary combat durability/repair already exist and continue unchanged. Burning uses a different destructive policy and must never inherit application protection accidentally.

After a successful installation, recompute active gear contributions and clamp pools without a refill. Material removal, installed values, MP, training and resulting RNG state join one candidate. A cosmetic reveal only presents its saved result.

## 6. Burning and recovery

Burning sacrifices an eligible unlocked equipment instance with at least one installed enchant. The proposed recipe consumes that item, one mana herb, one holy water and an authored positive MP cost regardless of recovery. Base gear, durability state, both enchants and invested replacements are lost. If equipped, clear its assignment and recompute/clamp stats in the same candidate.

Preview this destruction and require the player's explicit Burn action. Cancellation preserves everything. Validate town context, skill, inputs and **maximum output space after consuming inputs** before accepting or drawing randomness. Reserve for up to two scrolls; current count bounds apply before grids, and actual 1 × 2 rectangles apply once Inventory's grid milestone ships.

Draw independently for occupied slots in **prefix, then suffix** order:

```text
burnChanceBp = burnChanceBySkillRank[ownedEnchantRank]
recovered = enchantingRandom.integer(0, 9999) < burnChanceBp
```

Validate recovery chances in 0–10,000. Empty slots consume no draw. No INT/powder/time modifier applies to this initial recovery check. At an illustrative 50% per occupied slot, a two-enchant item returns zero/one/two scrolls with probabilities 25%/50%/25%. Higher skill ranks can improve the authored table.

Recovered scrolls reference the original definitions; they do not preserve the destroyed rolled values. Reapplication rolls new values on success. Award only authored training, with one burn action for use-count objectives; output count may satisfy a separately defined recovery objective. No default gold, character XP or AP reward is implied. Invalid capacity must never destroy the item first and discard successful outputs later.

## 7. Training, encounter inputs and rebirth

Instructor acquisition records Enchant F with zero training. Supported nonterminal ranks need reachable objectives totaling at least 100 points, a completion limit per objective and an AP cost. Candidate objectives include successful/failed applications and burns recovering a scroll. Do not require a locked recipe or high-rank scroll to progress through its prerequisite rank.

Rank-up is a town durable operation using Skills' gate and training reset. Permanent attribute gains are authored once per learned rank and reconstructed on load, not re-awarded per visit. Scroll attempts/burns never spend AP directly.

Installed values remain on campaign equipment through dungeon exploration and completed encounters. The next encounter snapshots that hero's equipped contributions and eligible progression conditions. XP/level changes after one encounter may change conditions for the next; there is no frozen whole-run enchant snapshot. Active battle inputs do not change from an exploration UI operation.

Future rebirth preserves items/installed values while changing eligible current-level/age/talent conditions. An inactive clause remains installed and can reactivate. Current defeat/early return retain committed inventory and wear; enchanting does not add a new item-loss policy or a second payout at dungeon exit.

## 8. Dedicated randomness and durable saving

Add an independently persisted enchanting stream using the existing GameRandom/pure-rand contract: algorithm/version, seed and four signed state words. Clone it for a candidate. Application consumes its success draw, then successful variable clauses in definition order; burning consumes occupied-slot checks in prefix/suffix order. Preview/rejected operations consume no draws. Combat, generation, loot and cosmetics do not advance this stream.

Extend definitions/Zod for stable clause/enchant IDs, rank order, compatibility, condition types, modifier units/ranges, powder tables, recipes and training. Extend versioned hero saves for unique armor, installed values, scroll ownership, learned Enchant progression, dedicated RNG and bounded operation receipts. Migrate existing weapon durability and depleted resources without replacement or refill.

Adopt the planned JourneyHost durable candidate boundary: flush prior writes, validate/save costs + equipment + outputs + training + RNG + receipt, then publish success. Retain an identical failed-write candidate and block dependent mutations. Retry the same write; do not resample a fresh attempt or charge twice. Store the accepted ID/result to prevent duplicate requests. This architecture improves local recovery; it is not an existing v5 guarantee or an anti-tampering system.

## 9. React Native service and acceptance

The town service view lives under src/ui. Use it with a thin Expo Router entry only if needed; reuse CharacterGameContext rather than creating another host. Compact portrait list/detail flows select equipment, scroll and powder, then show compatibility, current/opposite slots, conditional effects, variable ranges, chance and total cost. Keep confirm/cancel visible within safe insets and support large text.

Application failure text states that scroll, powder and MP are spent while equipment is preserved. Burning has a separate destructive preview naming the item and possible zero/one/two recoveries. Details show persisted rolled values and inactive conditions. Save failure offers Retry of the same accepted result, not another random attempt. Animations/audio observe success and cannot spend inputs.

The first slice demonstrates F/E learning/training, one powder, fixed/conditional/variable clauses, both slots, replacement, protected failure, existing MP recovery and burning outcomes. Validate exact chance boundaries/flooring/caps, rejected operations without RNG/costs, opposite-slot preservation, stable rolled values, no resource refill, output capacity, one training attribution, migration, save/retry equivalence and native/web large-text service controls. Additional protection modes, binding, multiplayer entrusting, scroll timers and calendar bonuses remain later work.
