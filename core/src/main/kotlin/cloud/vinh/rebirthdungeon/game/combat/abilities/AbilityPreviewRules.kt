package cloud.vinh.rebirthdungeon.game.combat.abilities

import cloud.vinh.rebirthdungeon.game.combat.dice.DiceRules
import cloud.vinh.rebirthdungeon.game.combat.stats.DamageRules
import cloud.vinh.rebirthdungeon.game.content.DiceScoring

/** The shield preview and committed shield grant use exactly the same calculation. */
object AbilityPreviewRules {
    fun shield(ability: LockedAbility, faces: List<Int>, scoring: DiceScoring): Int {
        val score = DiceRules.score(faces)
        return DamageRules.resolve(ability.inputs.copy(attack = 0, defense = 0, protection = 0), score.pips,
            scoring.multipliers.getValue(score.combination), 0, Int.MAX_VALUE).hpDamage
    }
}
