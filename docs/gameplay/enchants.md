# Rebirth Dungeon: Enchants

Enchanting transfers a named enchant from a consumable scroll onto equipment. Each eligible item supports **one prefix and one suffix**. Enchants add equipment modifiers, including conditional benefits and penalties, so a useful item can become part of a character's build across multiple runs and rebirths.

This is a design specification for planned gameplay, based on **Mabinogi**. It complements [skills.md](skills.md), [stats.md](stats.md), [character.md](character.md), [battle.md](battle.md), the [game plan](../game-plan.md), and the [project phases](../project-phases.md). It does not claim enchanting is implemented. The Rebirth Dungeon rules and sample values below are proposed defaults; the first slice deliberately limits the failure economy.

## 1. Mabinogi reference

The supplied [Enchant page](https://wiki.mabinogiworld.com/view/Enchant) describes the trainable skill. Its linked [Enchant (System) page](https://wiki.mabinogiworld.com/view/Enchant_(System)) describes applying and extracting equipment enchantments.

| Reference mechanic | Mabinogi behavior |
| --- | --- |
| Slots | Most equipment accepts one prefix and one suffix; applying to an occupied slot replaces that enchant. |
| Materials | Application uses a scroll, magic powder, and mana. Success consumes the scroll. |
| Application chance | Depends on scroll rank, INT, powder, and applicable bonuses. Skill rank does not directly improve this chance; the listed cap is 90%, with INT capped at 200 for this calculation. |
| Protection choice | Protect Equipment destroys the scroll on failure. Protect Scroll reduces scroll durability and risks equipment penalties unless protected separately. |
| Skill progression | Higher Enchant skill ranks reduce failed-scroll durability loss and improve extraction; Rank 5 or better is required for Rank 5-or-better scrolls. |
| Burning | Destroys equipment to attempt scroll extraction. Prefix and suffix recovery are independent; skill rank, campfire, and materials affect the odds. |

Sources: [Application, protection, success, and burning](https://wiki.mabinogiworld.com/view/Enchant_(System)), [Enchant skill rank effects](https://wiki.mabinogiworld.com/view/Enchant#Summary).

The wiki identifies sequential rank prerequisites as a **former rule**. Its current failure description includes an inability to enchant again for unprotected high-rank failures. Do not import older guides' chaining or item-destruction rules as current behavior. [Failure rules](https://wiki.mabinogiworld.com/view/Enchant_(System)#Failing_an_Enchantment), [Historical changes](https://wiki.mabinogiworld.com/view/Enchant_(System)#Trivia).

## 2. Player loop and ownership

1. Learn the Enchant skill from a town instructor using the acquisition rules in skills.md.
2. Find scrolls and enchanted equipment through authored dungeon loot, quests, or shops.
3. In town, select equipment, a scroll, and powder; review eligibility, effects, costs, and success chance.
4. Commit one attempt. Resolve and save its result before showing the reveal.
5. Equip the result for a future run, or burn unwanted enchanted equipment to try to recover its enchants.
6. Train Enchant through qualifying outcomes, reach at least 100 training points, and spend AP to advance.

Enchanting and burning are **between-run actions** in the initial design. Only committed inventory can be used; pending dungeon rewards must pass the existing run-outcome transaction first. Neither action is available while a run is active, and neither uses the five combat dice or advances dungeon initiative.

An installed enchant belongs to the equipment instance. Moving that item between inventory and an equipment slot preserves its enchants. Bonuses apply only while the item is equipped and the relevant conditions are met. Inventory ownership, trading, and binding follow future item-system decisions; enchanting does not introduce multiplayer entrusting or account-wide sharing.

## 3. Slots, ranks, and compatibility

| Term | Proposed meaning |
| --- | --- |
| Enchant definition | Stable ID, name, prefix/suffix slot, rank, item restrictions, and effect clauses |
| Enchant scroll | Consumable inventory instance referring to one enchant definition |
| Installed enchant | Enchant ID and resolved effect values stored on one equipment instance |
| Enchant skill rank | The character's learned proficiency, training, and AP progression |
| Enchant rank | The scroll's difficulty tier; independent of the character's skill rank and the item's rarity |

Use the same explicit weakest-to-strongest order for both rank tracks:

```text
F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1
```

Compare ranks by this authored order, never alphabetically or by parsing labels as numbers. A Rank 9 enchant is stronger in rank than Rank A. Rank is a difficulty/content tier, not a guarantee that an enchant is best for every build.

Equipment definitions declare their supported enchant slots and tags. An enchant can require a slot, an allowed equipment category such as weapon or armor, and specific tags such as sword. All restrictions must pass. A scroll for swords cannot target a staff just because both are weapons. Consumables, scrolls, and ordinary crafting materials have no enchant slots.

Applying a prefix can replace only the prefix; the suffix and the item's inherent stats remain. Replacement occurs **only on success**, and the overwritten enchant is lost without producing a scroll. Reapplying the same enchant is allowed as an explicit replacement, including the possibility of a worse variable roll. The preview must identify the enchant being replaced.

No lower-rank enchant is required beforehand. The proposed initial gate follows Mabinogi's high-rank skill restriction: Rank 5 through Rank 1 scrolls require Enchant skill Rank 5 or better. Lower scroll ranks require the learned skill but no matching skill rank. Content availability can restrict which ranks appear in the first slice.

## 4. Effects and activation conditions

Each enchant contains separately evaluated effect clauses. A clause defines a stat, a flat or percentage modifier with explicit units, and optional conditions. An unconditional penalty remains active even when a separate conditional benefit is inactive.

Initially support conditions on learned skill rank, current level, cumulative level, age, and active talent. These read the owning character's progression snapshot. Application compatibility and effect activation are separate: a character may install an eligible enchant whose bonus is currently inactive. Show the unmet condition instead of rejecting that application.

Avoid conditions on final equipment-modified stats in the first slice. For example, an INT-granting enchant must not repeatedly enable and disable itself by testing the INT it grants. Temporary combat buffs do not satisfy progression conditions.

Illustrative Rebirth Dungeon content, not copied Mabinogi enchants or final balance:

| Enchant | Slot / rank | Equipment | Effects |
| --- | --- | --- | --- |
| Keen | Prefix / F | Swords | Physical Attack +2 |
| Studious | Prefix / E | Weapons | Magic Attack +3 when Icebolt is Rank E or better; unconditional Max SP -2 |
| of Vigor | Suffix / F | Armor | Max HP +5 |
| of the Veteran | Suffix / D | Weapons | Physical Attack +2–4 when cumulative level is at least 20 |

For a variable clause, roll a value once on successful installation using its authored inclusive integer range. Roll clauses in stable definition order, even if their conditions are currently inactive. Persist the chosen values: equipping, loading, rebirth, and later meeting a condition never reroll them. Fixed-value clauses consume no random draws.

Enchants feed the existing equipment-modifier stage in stats.md. Preserve source identity as equipment instance + enchant slot + clause ID so replacements and unequipping remove exactly their contributions. Different equipped items' ordinary flat and percentage modifiers combine using that document's calculation order. Do not add a second copy of an enchant through both an item total and a separate status.

Resource-maximum bonuses do not refill HP, MP, or SP; reductions clamp current pools under stats.md. Enchants do not grant skill ranks, AP, extra dice, rerolls, or hidden changes to face probabilities. They affect battle through the existing effective stats and costs. Skill-rank base damage remains owned by the selected skill.

## 5. Applying an enchant

Before accepting an attempt, validate the current inventory revision, unique item references, learned skill and rank gate, target compatibility, scroll and powder quantities, and affordability of the authored MP cost. The target must be available in town and not reserved by another operation. Reject an invalid request without costs, training, or random draws.

The initial recipe consumes **one scroll, one powder, and the Enchant skill rank's MP cost per accepted attempt**. A provisional cost of 6 MP matches the reference's scale; final costs use stats.md's resource-cost resolver. Town resource state and an explicit recovery/rest action must exist before enabling this recipe. Opening the menu or returning from an animation never restores mana.

Use the following deliberately simplified application formula, not Mabinogi's formula:

```text
chanceBp = clamp(baseChanceBp[enchantRank]
                 + min(max(effectiveINT, 0), intCap) × intBonusBpPerPoint
                 + powderBonusBp[powderId], 0, 9000)
success = randomInteger(0, 9999) < chanceBp
```

`Bp` means basis points: 100 basis points = 1 percentage point. INT is the nonnegative integer effective town value after normal stat resolution, frozen before paying costs or changing the item. Enchant skill rank controls access and extraction, without a separate application-chance bonus. No calendar, Luck, or event multiplier is implied.

Illustrative tuning: base chance 6,000, INT 40, cap 200, 10 basis points per INT, and powder bonus 500 produce **69%**. A roll of 6,899 succeeds; 6,900 fails. Author and validate the real rank/powder tables before implementation. The displayed percentage and the committed roll must use the same resolver.

The first slice uses **Protect Equipment** for every attempt:

| Outcome | Materials and MP | Target equipment | Training |
| --- | --- | --- | --- |
| Invalid or cancelled before commit | Nothing spent | Unchanged | None |
| Success | Consume the full recipe once | Install the new enchant in its slot; discard any replaced enchant | Count qualifying success objectives once |
| Failure | Consume the full recipe once | Preserve the item and both existing enchants | Count qualifying failure objectives once, if authored |

This consumes the scroll on failure instead of retaining a partially damaged scroll. Scroll integrity, gear durability damage, and protection potions are deferred together. A future **Protect Scroll** mode must define remaining scroll integrity, rank-based integrity loss, equipment failure penalties, recovery, protection consumption, and UI previews before becoming selectable. It must not quietly add destructive outcomes to Protect Equipment.

## 6. Burning and recovery

Enchant burning is a separate town action that sacrifices unwanted enchanted equipment. Require a learned Enchant skill, an eligible item with at least one enchant, and an authored recipe. The proposed recipe uses one mana herb, one holy water, and a positive MP cost; the material names echo the reference, while the MP requirement is a Rebirth Dungeon choice consistent with active skill costs.

On an accepted burn, consume the item, both installed enchants, recipe materials, and MP **regardless of recovery success**. Its base equipment, inherent bonuses, and invested replacement scrolls are gone. The UI must state this explicitly before commitment. A burning failure is not covered by the application action's Protect Equipment policy.

Resolve one independent recovery check for each occupied slot, always prefix before suffix:

```text
burnChanceBp = burnChanceBySkillRank[currentEnchantSkillRank]
recovered = randomInteger(0, 9999) < burnChanceBp
```

Validate each chance in 0–10,000. Higher skill ranks should improve recovery; exact values are balance data. Start with one fixed town station and no INT, powder, calendar, or firewood modifiers. An empty slot consumes no draw. A two-enchant item can return zero, one, or two scrolls; at an illustrative 50% chance per slot, those outcomes have probabilities 25%, 50%, and 25%.

Each recovered scroll refers to the original enchant definition and rank. It does **not** preserve the destroyed item's rolled effect values; successful reapplication rolls those values anew. Burning does not directly transfer an enchant or guarantee recovery. The initial recipe awards no bonus powder, gold, AP, or character XP. Grant only authored Enchant training once per burn outcome, rather than accidentally counting a two-scroll result as two uses.

Validate output capacity for the maximum possible two scrolls before accepting the action, accounting for the consumed item and materials. A full inventory must not destroy the item and then discard recovered scrolls. If the item was equipped in town, atomically clear its equipment reference and recompute stats as part of the burn.

## 7. Enchant skill progression

Learning from the instructor unlocks Enchant at Rank F with 0 training, following skills.md. This differs from Mabinogi's powder-equipping unlock. Rank advancement requires at least 100 training points at the current rank plus the authored AP cost; neither applying a scroll nor burning gear spends AP directly. [Mabinogi skill acquisition](https://wiki.mabinogiworld.com/view/Enchant#Obtaining_the_Skill).

Candidate training objectives include successful applications, failed applications, and burns recovering at least one scroll. Each objective needs points per completion and a completion limit. Every supported nonterminal rank must offer reachable objectives totaling at least 100 points with content available at that rank. Do not require an unavailable burn recipe or a high-rank scroll locked behind the rank being trained.

Rank benefits initially include better burn recovery and high-rank application access. Scroll-preservation improvements become relevant only if Protect Scroll is implemented. Any permanent INT or DEX gains must be explicitly authored as skill-rank stat contributions; do not automatically copy Mabinogi's rank tables. Advancing resets training under skills.md and cannot re-award permanent stats on load.

## 8. Run boundaries, rebirth, and saving

Installed enchants and their rolled values persist with committed equipment. Under character.md's proposed rebirth rules, retained equipment keeps its enchants while current-level, age, or talent conditions may change. A disabled clause remains installed and can become active again. Cumulative-level and retained-skill conditions use their preserved progression values.

A new run snapshots the loadout, installed enchant values, and relevant progression conditions. Pending XP, elapsed town aging, and profile edits do not change that active run. Effective combat stats still respond to live buffs and debuffs through stats.md. If in-run equipment swaps are added later, use the run's equipment instances and progression snapshot at an explicit legal command boundary; never alter the stats already frozen for a dice activation.

Defeat and abandonment do not independently decide enchant ownership. Newly found scrolls and equipment follow the unresolved Phase 7 carry-over policy; this document does not guarantee their retention. Existing committed items continue to follow the game's eventual item-loss rules.

Content definitions need stable enchant/clause IDs, rank ordering, equipment restrictions, condition types, modifier units and ranges, powder recipes, success tables, training objectives, and costs. Saved state needs equipment instance IDs, both installed slots and resolved values, scroll inventory, learned skill progression, town resources, transaction results, and pinned content/rules versions. Effective stat totals are reconstructed from these sources.

Add a dedicated persisted enchanting RNG stream for application checks, variable values, and burn recovery. Keep it separate from dungeon combat, loot, and cosmetic streams. Record its algorithm/version and all state words using the game plan's RNG contract. UI previews consume no randomness; rejected commands leave the stream unchanged.

One accepted operation atomically records costs, equipment changes, recovered scrolls, training, its unique operation ID, and the resulting RNG state in the versioned profile/run bundle. Retry of the same operation returns its recorded result without charging or rolling again. Use the existing save checkpoint gate before revealing success or allowing another operation; a failed save must not enable a fresh free roll. This supports consistent local recovery, not protection against deliberate save-file editing.

## 9. Enchant screen and initial scope

The screen should show the target's inherent stats and both enchant slots, the scroll's rank and compatibility restrictions, current versus proposed effects, inactive clauses with reasons, possible variable ranges, final success chance, and the complete material/MP cost. A replacement preview identifies the enchant that will be lost on success. Failure text says that the scroll, powder, and MP will be spent while the equipment is preserved.

Burning needs a separate preview showing the entire item being destroyed, both possible recovered scrolls, individual recovery chances, and the possibility of recovering nothing. Item tooltips retain each installed enchant's name, rank, actual rolled values, and active/inactive clauses. All previews use the same eligibility and stat logic as committed operations.

The first slice should demonstrate one instructor unlock, at least two Enchant skill ranks, one ordinary powder, a fixed prefix, a conditional suffix, a variable-value enchant, slot replacement, protected application failure, and burning with zero/partial/full recovery. Include a usable town MP/recovery loop, saved transactions, and a run showing the resulting stat contributions. Prototype rank caps must be visible.

Future implementation acceptance checks should cover:

- One prefix and suffix coexisting; wrong equipment and rank gates rejecting without costs or RNG; replacement success and failure preserving the opposite slot.
- Exact chance boundaries, the 90% application cap, MP affordability, and previews matching committed effects and costs.
- Inactive benefits with active penalties; rank ordering; rebirth condition changes; rolled values surviving reload and re-equipping; maxima changing without free refills.
- One- and two-slot burns, independent recovery, empty-slot draw behavior, output capacity, loss of equipped-item references, and exactly-once training.
- Training/AP advancement gates, retained run snapshots, and interrupted save/retry matching uninterrupted inventory and RNG continuation.

Still open: loot and shop availability, rank/powder chance tables, variable ranges, MP and recovery costs, training/AP pacing, item ownership and carry-over. Protect Scroll, equipment durability and repair, protection consumables, scroll expiration, elemental enchants, binding/personalization, multiplayer entrusting, and calendar/event bonuses remain outside the first slice.

## Research notes

Mabinogi Wiki pages were retrieved with Firecrawl and inspected on **September 5, 2026**. Source behavior is summarized in section 1; the subsequent rules are proposed Rebirth Dungeon adaptations. Raw source caches stay in the gitignored `.firecrawl/` directory.

| Reference | Local cache |
| --- | --- |
| [Enchant skill, ranks, and acquisition](https://wiki.mabinogiworld.com/view/Enchant) | `.firecrawl/mabinogiworld-enchant.md` |
| [Enchant system, application, protection, and burning](https://wiki.mabinogiworld.com/view/Enchant_(System)) | `.firecrawl/mabinogiworld-enchant-system.md` |
