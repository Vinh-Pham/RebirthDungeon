package cloud.vinh.rebirthdungeon.game.combat.abilities

import cloud.vinh.rebirthdungeon.game.commands.CommandResult.Reason
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import cloud.vinh.rebirthdungeon.game.projection.CombatActorObservation

/** Shared by the HUD, enemy policy, and authoritative command validation. No draws or mutation. */
object BattleRules {
    val normal = ContentId("skill.normal")
    val defend = ContentId("skill.defend")
    fun guardModifiers(defending: Boolean) = if (defending) listOf(
        StatModifier("defend", ContentId("stat.defense"), 2), StatModifier("defend", ContentId("stat.protection"), 5)) else emptyList()
    fun cost(a: CombatActorObservation, skill: SkillDefinition): ResourceVector {
        val rank = skill.ranks.single { it.rank == a.learned.getValue(skill.id) }
        val sp = if (skill.id == normal) StaminaRules.attack(a.masteryRank) else rank.cost.spTenths
        return ResourceVector(StatRules.cost(rank.cost.hp, a.costFlat.hp, a.costPercent.hp),
            StatRules.cost(rank.cost.mp, a.costFlat.mp, a.costPercent.mp),
            StaminaRules.cost(sp, a.costFlat.spTenths, a.costPercent.sp, skill.id == normal))
    }
    fun failure(a: CombatActorObservation, target: CombatActorObservation?, skill: SkillDefinition?): Reason? {
        if (skill == null || skill.ranks.none { it.rank == a.learned[skill.id] }) return Reason.INVALID_SKILL
        if (a.current.hp <= 0 || target == null || target.current.hp <= 0) return Reason.INVALID_TARGET
        if ((skill.target == TargetKind.SELF) != (target.id == a.id)) return Reason.INVALID_TARGET
        // The slice has one controlled hero; every other participant is hostile to it.
        if (skill.target == TargetKind.HOSTILE && (a.id.value == 1L) == (target.id.value == 1L)) return Reason.INVALID_TARGET
        if (skill.requiredEquipment != "none" && skill.requiredEquipment !in a.equipment) return Reason.EQUIPMENT_REQUIRED
        if ((a.cooldowns[skill.id.value]?.remaining ?: 0) > 0) return Reason.COOLDOWN
        val cost = cost(a, skill)
        return when {
            a.current.hp <= cost.hp -> Reason.INSUFFICIENT_HP
            a.current.mp < cost.mp -> Reason.INSUFFICIENT_MP
            a.current.spTenths < cost.spTenths -> Reason.INSUFFICIENT_SP
            else -> null
        }
    }
    fun resolve(a: CombatActorObservation, target: CombatActorObservation, skill: SkillDefinition): ResolvedAbility {
        val rank = skill.ranks.single { it.rank == a.learned.getValue(skill.id) }
        val magic = skill.attackStat == ContentId("stat.magic_attack")
        return ResolvedAbility(Selection(skill.id, rank.rank, target.id), rank, skill,
            DamageInputs(rank.basePower, a.stats.getValue(skill.attackStat), target.stats.getValue(ContentId(if (magic) "stat.magic_defense" else "stat.defense")),
                target.stats.getValue(ContentId(if (magic) "stat.magic_protection" else "stat.protection"))), cost(a, skill))
    }
    fun potionUseful(a: CombatActorObservation, potion: PotionDefinition, content: ContentCatalog): Boolean {
        if (a.current.hp <= 0) return false
        val r = potion.recovery
        return r.hp > 0 && a.current.hp < a.maximum.hp || r.mp > 0 && a.current.mp < a.maximum.mp ||
            r.spTenths > 0 && a.current.spTenths < a.maximum.spTenths || potion.status?.let {
                cloud.vinh.rebirthdungeon.game.combat.statuses.StatusRules.apply(a.statuses, content.statuses, it, a.id, true) != null
            } == true
    }
}
