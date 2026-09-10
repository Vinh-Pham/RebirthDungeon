package cloud.vinh.rebirthdungeon.application.run

import cloud.vinh.rebirthdungeon.game.combat.dice.DiceRules
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*

data class BattleAction(val enabled: Boolean, val reason: String)
class BattleView(val token: Long, val revision: Long, val hero: CombatActorObservation,
    val roll: BattleAction, val reroll: BattleAction, val use: BattleAction, val pass: BattleAction,
    val message: String, val inBattle: Boolean) {
    val unkept = frozenList((0..4).filter { !hero.kept[it] })
    val score = if (hero.locked != null) DiceRules.score(hero.faces) else null
    companion object {
        fun create(token: Long, revision: Long, hero: CombatActorObservation, blocked: String?, rollFailure: String?, inBattle: Boolean): BattleView {
            fun action(reason: String?) = BattleAction(reason == null, reason ?: "Ready")
            val locked = hero.locked != null
            return BattleView(token, revision, hero,
                action(blocked ?: if (locked) "Already rolled; inputs locked" else if (!hero.open || hero.selection == null) "Select a skill and target" else rollFailure),
                action(blocked ?: if (!locked) "Roll first" else if (hero.rerolls == 0) "No rerolls remaining" else if (hero.kept.all { it }) "Unkeep at least one die" else null),
                action(blocked ?: if (!locked) "Roll first" else null), action(blocked), blocked ?: "Ready", inBattle)
        }
    }
}
