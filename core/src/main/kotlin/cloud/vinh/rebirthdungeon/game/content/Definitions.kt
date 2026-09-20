package cloud.vinh.rebirthdungeon.game.content

import cloud.vinh.rebirthdungeon.game.identity.ContentId

enum class SkillEffect { DAMAGE, SHIELD, BUFF, DEFEND }
enum class TargetKind { HOSTILE, SELF }
enum class Pool { HP, MP, SP }
enum class ActorKind { HERO, ENEMY }
enum class StatStage { PRIMARY, DERIVED }
enum class StatusTiming { OWNER_ACTIVATION_END }

data class ContentVersion(val schema: Int, val content: Int, val rules: Int) {
    init { require(schema == 3 && content == 4 && rules == 3) }
}
/** HP/MP are integral; SP amounts are integer tenths everywhere, including saves. */
data class ResourceVector(val hp: Int, val mp: Int, val spTenths: Int)
data class CostPercent(val hp: Int = 0, val mp: Int = 0, val sp: Int = 0)
data class StatTerm(val stat: ContentId, val numerator: Int, val denominator: Int)
class StatDefinition internal constructor(val id: ContentId, val stage: StatStage, val base: Int, val minimum: Int, val maximum: Int, terms: List<StatTerm>) {
    val terms = frozenList(terms)
}
class ActorDefinition internal constructor(val id: ContentId, val kind: ActorKind, val resources: ResourceVector, val skill: ContentId, val rank: String, stats: Map<ContentId, Int>, val speed: Int, items: Map<ContentId, Int> = emptyMap()) {
    val items = frozenMap(items)
    val stats = frozenMap(stats)
}
data class StatRatio(val numerator: Int, val denominator: Int)
class SkillRank internal constructor(val rank: String, val order: Int, val basePower: Int, val cost: ResourceVector)
class SkillDefinition internal constructor(val id: ContentId, val name: String, val prototypeCap: String, val attackStat: ContentId, ranks: List<SkillRank>,
    val effect: SkillEffect, val target: TargetKind, val requiredEquipment: String,
    val cooldown: Int, val status: ContentId?, val shieldDuration: Int) {
    val ranks = frozenList(ranks)
}
data class StatusDefinition(val id: ContentId, val stat: ContentId, val flat: Int, val duration: Int, val group: ContentId, val priority: Int, val timing: StatusTiming,
    val percent: Int = 0, val periodicDamage: Int = 0, val recovery: ResourceVector = ResourceVector(0, 0, 0))
data class PotionDefinition(val id: ContentId, val name: String, val recovery: ResourceVector, val status: ContentId?)
data class EncounterDefinition(val id: ContentId, val enemy: ContentId, val loot: ContentId)
data class LootEntry(val potion: ContentId, val probability: Int, val quantity: Int)
class LootDefinition internal constructor(val id: ContentId, entries: List<LootEntry>) { val entries = frozenList(entries) }
class ProgressionCurve internal constructor(val id: ContentId, thresholds: List<Int>) { val thresholds = frozenList(thresholds) }

/** Validated, detached catalog pinned for an entire run. No asset names or DTOs. */
class ContentCatalog internal constructor(
    val version: ContentVersion,
    actors: List<ActorDefinition>,
    skills: List<SkillDefinition>, stats: List<StatDefinition>,
    statuses: List<StatusDefinition>, potions: List<PotionDefinition>, encounters: List<EncounterDefinition>,
    loot: List<LootDefinition>, progression: List<ProgressionCurve>
) {
    val actors = frozenMap(actors.associateBy { it.id })
    val skills = frozenMap(skills.associateBy { it.id })
    val stats = frozenMap(stats.associateBy { it.id })
    val statuses = frozenMap(statuses.associateBy { it.id })
    val potions = frozenMap(potions.associateBy { it.id })
    val encounters = frozenMap(encounters.associateBy { it.id })
    val loot = frozenMap(loot.associateBy { it.id })
    val progression = frozenMap(progression.associateBy { it.id })
}
