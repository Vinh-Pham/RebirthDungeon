package cloud.vinh.rebirthdungeon.game.combat.abilities

import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.*

/** Immutable run input; changing a profile outside the run cannot replace learned ranks or gear. */
class CombatLoadout(learned: Map<ContentId, String>, equipment: Set<String>, modifiers: List<StatModifier> = emptyList(),
    val costFlat: ResourceVector = ResourceVector(0, 0, 0), val costPercent: ResourceVector = ResourceVector(0, 0, 0)) {
    init { require(listOf(costFlat.hp, costFlat.mp, costFlat.sp, costPercent.hp, costPercent.mp, costPercent.sp).all { it in -1_000_000..1_000_000 }) }
    val learned = frozenMap(learned)
    val equipment = frozenList(equipment.sorted())
    val modifiers = frozenList(modifiers)
}
data class Selection(val skill: ContentId, val rank: String, val target: EntityId)
data class LockedAbility(val selection: Selection, val rank: SkillRank, val definition: SkillDefinition,
    val inputs: DamageInputs, val cost: ResourceVector)
enum class EncounterOutcome { VICTORY, DEFEAT }
