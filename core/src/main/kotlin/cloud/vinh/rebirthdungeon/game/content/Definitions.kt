package cloud.vinh.rebirthdungeon.game.content

import cloud.vinh.rebirthdungeon.game.identity.ContentId

enum class Combination { FIVE_OF_A_KIND, FOUR_OF_A_KIND, FULL_HOUSE, STRAIGHT, THREE_OF_A_KIND, TWO_PAIRS, ONE_PAIR, NONE }
enum class SkillEffect { DAMAGE, SHIELD, BUFF }
enum class TargetKind { HOSTILE, SELF }
enum class Pool { HP, MP, SP }
enum class ActorKind { HERO, ENEMY }
enum class StatStage { PRIMARY, DERIVED }
enum class StatusTiming { OWNER_ACTIVATION_END }

data class ContentVersion(val schema: Int, val content: Int, val rules: Int) {
    init { require(schema == 1 && content > 0 && rules == 1) }
}
data class TileDefinition(val id: ContentId, val code: Int, val walkable: Boolean)
data class GenerationProfile(val id: ContentId, val generatorVersion: Int, val width: Int, val height: Int, val maxAttempts: Int)
data class ResourceVector(val hp: Int, val mp: Int, val sp: Int)
data class StatTerm(val stat: ContentId, val numerator: Int, val denominator: Int)
class StatDefinition internal constructor(val id: ContentId, val stage: StatStage, val base: Int, val minimum: Int, val maximum: Int, terms: List<StatTerm>) {
    val terms = frozenList(terms)
}
class ActorDefinition internal constructor(val id: ContentId, val kind: ActorKind, val resources: ResourceVector, val skill: ContentId, val rank: String, stats: Map<ContentId, Int>) {
    val stats = frozenMap(stats)
}
class DiceScoring internal constructor(val id: ContentId, val diceCount: Int, val rerolls: Int, multipliers: Map<Combination, StatRatio>) {
    val multipliers = frozenMap(multipliers)
}
data class StatRatio(val numerator: Int, val denominator: Int)
class SkillRank internal constructor(val rank: String, val order: Int, val basePower: Int, val pipScale: Int, val cost: ResourceVector, weights: List<Int>) {
    val weights = frozenList(weights)
}
class SkillDefinition internal constructor(val id: ContentId, val name: String, val prototypeCap: String, val scoring: ContentId, val attackStat: ContentId, ranks: List<SkillRank>,
    val effect: SkillEffect, val target: TargetKind, val requiredEquipment: String, val range: Int,
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
    tiles: List<TileDefinition>, generations: List<GenerationProfile>, actors: List<ActorDefinition>,
    scoring: List<DiceScoring>, skills: List<SkillDefinition>, stats: List<StatDefinition>,
    statuses: List<StatusDefinition>, potions: List<PotionDefinition>, encounters: List<EncounterDefinition>,
    loot: List<LootDefinition>, progression: List<ProgressionCurve>
) {
    val tiles = frozenMap(tiles.associateBy { it.id })
    val generations = frozenMap(generations.associateBy { it.id })
    val actors = frozenMap(actors.associateBy { it.id })
    val scoring = frozenMap(scoring.associateBy { it.id })
    val skills = frozenMap(skills.associateBy { it.id })
    val stats = frozenMap(stats.associateBy { it.id })
    val statuses = frozenMap(statuses.associateBy { it.id })
    val potions = frozenMap(potions.associateBy { it.id })
    val encounters = frozenMap(encounters.associateBy { it.id })
    val loot = frozenMap(loot.associateBy { it.id })
    val progression = frozenMap(progression.associateBy { it.id })
}
