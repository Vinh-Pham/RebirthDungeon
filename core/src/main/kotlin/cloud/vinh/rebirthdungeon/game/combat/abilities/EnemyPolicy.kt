package cloud.vinh.rebirthdungeon.game.combat.abilities

import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.projection.CombatObservation

/** Select commands only. Resolution, costs and finite item stock belong to the common engine. */
object EnemyPolicy {
    fun choose(battle: String, view: CombatObservation, content: ContentCatalog): BattleActionCommand {
        val actor = view.actors.single { it.id == view.turn.active }
        val turn = TurnRef(battle, actor.id, view.turn.sequence)
        if (!view.turn.itemUsed && actor.current.hp.toLong() * 100 <= actor.maximum.hp.toLong() * 35) {
            actor.items.entries.sortedBy { it.key.value }.firstOrNull { (id, count) -> count > 0 && content.potions.getValue(id).recovery.hp > 0 && BattleRules.potionUseful(actor, content.potions.getValue(id), content) }
                ?.let { return DrinkPotionCommand(turn, it.key) }
        }
        val legal = actor.learned.keys.sortedBy { it.value }.flatMap { id -> view.actors.filter { BattleRules.failure(actor, it, content.skills[id]) == null }.map { id to it.id } }
        if (actor.current.hp.toLong() * 100 <= actor.maximum.hp.toLong() * 25 && actor.previousAction != BattleRules.defend.value && legal.any { it.first == BattleRules.defend }) return DefendCommand(turn)
        legal.firstOrNull { it.first != BattleRules.normal && it.first != BattleRules.defend }?.let { return UseSkillCommand(turn, it.first, it.second) }
        legal.firstOrNull { it.first == BattleRules.normal }?.let { return AttackCommand(turn, it.second) }
        if (legal.any { it.first == BattleRules.defend }) return DefendCommand(turn)
        return WaitCommand(turn)
    }
}
