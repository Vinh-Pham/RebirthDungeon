package cloud.vinh.rebirthdungeon.application.run

import cloud.vinh.rebirthdungeon.game.combat.abilities.BattleRules
import cloud.vinh.rebirthdungeon.game.commands.TurnRef
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*

internal fun cloud.vinh.rebirthdungeon.game.commands.CommandResult.Reason.label() = name.lowercase().replace('_', ' ').replaceFirstChar { it.uppercase() }

data class BattleAction(val enabled: Boolean, val reason: String)
class BattleView(val token: Long, val revision: Long, val hero: CombatActorObservation, val turn: TurnRef,
    val attack: BattleAction, val defend: BattleAction, val item: BattleAction, val wait: BattleAction,
    val message: String, val inBattle: Boolean, val ready: Boolean) {
    companion object {
        fun create(token: Long, revision: Long, battle: String, combat: CombatObservation, content: ContentCatalog, blocked: String?): BattleView {
            val hero = combat.actors.single { it.id == EntityId(1) }
            val reason = blocked ?: if (combat.turn.active != hero.id || !combat.turn.started) "Enemy turn" else null
            fun action(failure: String?) = BattleAction(failure == null, failure ?: "Ready")
            fun failure(skill: ContentId, target: CombatActorObservation?) = BattleRules.failure(hero, target, content.skills[skill])?.label()
            val enemy = combat.actors.firstOrNull { it.id != hero.id && it.current.hp > 0 }
            val canAct = hero.learned.keys.any { skill -> combat.actors.any { failure(skill, it) == null } }
            return BattleView(token, revision, hero, TurnRef(battle, hero.id, combat.turn.sequence),
                action(reason ?: failure(BattleRules.normal, enemy)), action(reason ?: failure(BattleRules.defend, hero)),
                action(reason ?: if (combat.turn.itemUsed) "Item used" else null), action(reason ?: if (canAct) "Another action is available" else null),
                reason ?: if (combat.turn.itemUsed) "Item used — choose your main action" else "One optional item, then a main action", combat.inBattle, reason == null)
        }
    }
}
