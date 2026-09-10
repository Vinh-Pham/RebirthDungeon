package cloud.vinh.rebirthdungeon.game.projection

import cloud.vinh.rebirthdungeon.game.combat.abilities.EncounterOutcome
import cloud.vinh.rebirthdungeon.game.content.frozenList

/** Full combat state is persistence-only; never expose hidden actors to the HUD. */
class CombatRestore(val defeated: Boolean, val outcome: EncounterOutcome?, participants: List<Long>,
    actors: List<CombatActorObservation>) {
    val participants = frozenList(participants)
    val actors = frozenList(actors)
}

/** Reject incoherent records before a repository considers a slot recoverable. */
internal fun CombatRestore.validate(state: RunRestore, content: cloud.vinh.rebirthdungeon.game.content.ContentCatalog) {
    require(content.version.content >= 2)
    require(actors.map { it.id }.distinct().size == actors.size && actors.map { it.id }.toSet() == state.actors.map { it.id }.toSet())
    require(participants.distinct().size == participants.size && participants.all { it > 0 && it < state.nextEntityId })
    require(defeated == (state.actors.single { it.player }.hp == 0))
    require(!defeated || outcome == EncounterOutcome.DEFEAT)
    require(outcome == null || participants.isEmpty())
    fun rankKey(r: cloud.vinh.rebirthdungeon.game.content.SkillRank) = listOf(r.rank, r.order, r.basePower, r.pipScale, r.cost, r.weights)
    fun definitionKey(d: cloud.vinh.rebirthdungeon.game.content.SkillDefinition) = listOf(d.id, d.name, d.prototypeCap, d.scoring, d.attackStat,
        d.ranks.map(::rankKey), d.effect, d.target, d.requiredEquipment, d.range, d.cooldown, d.status, d.shieldDuration)
    actors.forEach { a ->
        val actor = state.actors.single { it.id == a.id }
        require(a.current.hp == actor.hp && a.maximum.hp == actor.maxHp)
        require(a.current.mp in 0..a.maximum.mp && a.current.sp in 0..a.maximum.sp)
        require(a.faces.size == 5 && a.kept.size == 5 && a.rerolls in 0..2)
        require(a.faces.all { it in if (a.locked == null) 0..0 else 1..6 })
        require(a.locked != null || a.kept.none { it })
        require(!a.open || actor.player && state.scheduler.active == a.id)
        require(listOf(a.costFlat.hp, a.costFlat.mp, a.costFlat.sp, a.costPercent.hp, a.costPercent.mp, a.costPercent.sp).all { it in -1_000_000..1_000_000 })
        require(a.open || a.selection == null && a.locked == null)
        require(a.reserved == (a.locked?.cost ?: cloud.vinh.rebirthdungeon.game.content.ResourceVector(0, 0, 0)))
        require(a.reserved.hp >= 0 && a.reserved.mp >= 0 && a.reserved.sp >= 0)
        require(a.current.mp >= a.reserved.mp && a.current.sp >= a.reserved.sp && (a.locked == null || a.current.hp > a.reserved.hp))
        require(a.shield >= 0 && a.shieldDuration >= 0 && (a.shieldDuration > 0 || a.shield == 0))
        require(a.learned.isNotEmpty() && a.learned.all { (id, rank) -> content.skills[id]?.ranks?.any { it.rank == rank } == true })
        require(a.equipment.distinct().size == a.equipment.size)
        require(a.statuses.all { s -> s.definition in content.statuses && s.remaining in 1..content.statuses.getValue(s.definition).duration && s.source.value < state.nextEntityId })
        require(a.statuses.map { content.statuses.getValue(it.definition).group }.distinct().size == a.statuses.size)
        require(a.cooldowns.all { (id, c) -> content.skills[cloud.vinh.rebirthdungeon.game.identity.ContentId(id)]?.let { c.remaining in 1..it.cooldown } == true })
        val statusMods = a.statuses.map { content.statuses.getValue(it.definition) }.map {
            cloud.vinh.rebirthdungeon.game.combat.stats.StatModifier("status:${it.group.value}", it.stat, it.flat, it.percent)
        }
        require(a.baseline.keys.all { it in content.stats })
        require(a.stats == cloud.vinh.rebirthdungeon.game.combat.stats.StatRules.resolve(content.stats, a.baseline, a.modifiers + statusMods))
        fun stat(name: String) = a.stats.getValue(cloud.vinh.rebirthdungeon.game.identity.ContentId("stat.$name"))
        require(a.maximum == cloud.vinh.rebirthdungeon.game.content.ResourceVector(stat("max_hp"), stat("max_mp"), stat("max_sp")))
        a.selection?.let { s -> require(a.learned[s.skill] == s.rank && actors.any { it.id == s.target }) }
        a.locked?.let { l ->
            require(a.open && l.selection == a.selection)
            val d = content.skills.getValue(l.selection.skill)
            require(definitionKey(l.definition) == definitionKey(d))
            require(rankKey(l.rank) == rankKey(d.ranks.single { it.rank == l.selection.rank }))
            require(a.rerolls <= content.scoring.getValue(d.scoring).rerolls)
            val r = l.rank.cost
            fun cost(base: Int, flat: Int, percent: Int) = cloud.vinh.rebirthdungeon.game.combat.stats.StatRules.cost(base, flat, percent)
            require(l.cost == cloud.vinh.rebirthdungeon.game.content.ResourceVector(cost(r.hp, a.costFlat.hp, a.costPercent.hp),
                cost(r.mp, a.costFlat.mp, a.costPercent.mp), cost(r.sp, a.costFlat.sp, a.costPercent.sp)))
            val target = actors.single { it.id == l.selection.target }
            val magic = d.attackStat.value == "stat.magic_attack"
            require(l.inputs == cloud.vinh.rebirthdungeon.game.combat.stats.DamageInputs(l.rank.basePower, a.stats.getValue(d.attackStat), l.rank.pipScale,
                target.stats.getValue(cloud.vinh.rebirthdungeon.game.identity.ContentId(if (magic) "stat.magic_defense" else "stat.defense")),
                target.stats.getValue(cloud.vinh.rebirthdungeon.game.identity.ContentId(if (magic) "stat.magic_protection" else "stat.protection"))))
        }
    }
}
