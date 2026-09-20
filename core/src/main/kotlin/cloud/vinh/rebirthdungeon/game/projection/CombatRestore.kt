package cloud.vinh.rebirthdungeon.game.projection

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId

class CombatRestore(val defeated: Boolean, val outcome: EncounterOutcome?, participants: List<Long>, actors: List<CombatActorObservation>) {
    val participants = frozenList(participants)
    val actors = frozenList(actors)
}
internal fun CombatRestore.validate(state: BattleRestore, content: ContentCatalog) {
    require(actors.map { it.id }.distinct().size == actors.size && actors.map { it.id }.toSet() == state.actors.map { it.id }.toSet())
    require(participants.distinct().size == participants.size && participants.all { id -> state.actors.any { it.id.value == id && !it.player && it.hp > 0 } })
    require(defeated == (state.actors.single { it.player }.hp == 0))
    require(!defeated || outcome == EncounterOutcome.DEFEAT)
    require(outcome == null || participants.isEmpty())
    if (outcome == EncounterOutcome.VICTORY) require(!defeated && state.actors.any { !it.player } && state.actors.filter { !it.player }.all { it.hp == 0 })
    if (outcome == null && actors.size > 1) require(participants.toSet() == state.actors.filter { !it.player && it.hp > 0 }.map { it.id.value }.toSet())
    actors.forEach { a ->
        val actor = state.actors.single { it.id == a.id }
        require(a.current.hp == actor.hp && a.maximum.hp == actor.maxHp)
        require(a.current.mp in 0..a.maximum.mp && a.current.spTenths in 0..a.maximum.spTenths)
        require(listOf(a.costFlat.hp, a.costFlat.mp, a.costFlat.spTenths, a.costPercent.hp, a.costPercent.mp, a.costPercent.sp).all { it in -1_000_000..1_000_000 })
        require(a.shield >= 0 && a.shieldDuration >= 0 && (a.shieldDuration > 0 || a.shield == 0))
        require(a.learned.isNotEmpty() && a.learned.all { (id, rank) -> content.skills[id]?.ranks?.any { it.rank == rank } == true })
        require(a.equipment.distinct().size == a.equipment.size && a.equipment.all { it == "sword" })
        require(a.statuses.all { s -> s.definition in content.statuses && s.remaining in 1..content.statuses.getValue(s.definition).duration && s.source.value < state.nextEntityId })
        require(a.statuses.map { content.statuses.getValue(it.definition).group }.distinct().size == a.statuses.size)
        require(a.cooldowns.all { (id, c) -> content.skills[ContentId(id)]?.let { c.remaining in 1..it.cooldown } == true })
        require(a.previousAction.isEmpty() || a.previousAction == "wait" || ContentId(a.previousAction) in a.learned)
        StaminaRules.index(a.masteryRank)
        require(a.items.all { it.key in content.potions && it.value in 0..999 })
        require(!actor.player || a.items.isEmpty())
        val permittedItems = content.actors.getValue(actor.definition).items
        require(a.items.keys == permittedItems.keys && a.items.all { it.value <= permittedItems.getValue(it.key) })
        val statusMods = a.statuses.map { content.statuses.getValue(it.definition) }.map { StatModifier("status:${it.group.value}", it.stat, it.flat, it.percent) }
        require(a.baseline.keys.all { it in content.stats })
        require(a.stats == StatRules.resolve(content.stats, a.baseline, a.modifiers + statusMods + BattleRules.guardModifiers(a.defending)))
        fun stat(name: String) = a.stats.getValue(ContentId("stat.$name"))
        require(a.maximum == ResourceVector(stat("max_hp"), stat("max_mp"), Math.multiplyExact(stat("max_sp"), 10)))
    }
}
