package cloud.vinh.rebirthdungeon.data.content.dto

import cloud.vinh.rebirthdungeon.game.content.*

/** Nullable fields distinguish missing input from legitimate zero/false values. */
class ManifestDto {
    var schemaVersion: Int? = null
    var contentVersion: Int? = null
    var rulesVersion: Int? = null
    var rules: String? = null
    var visuals: String? = null
}

class CatalogDto {
    var schemaVersion: Int? = null
    var actors: List<ActorDto>? = null
    var skills: List<SkillDto>? = null
    var stats: List<StatDto>? = null
    var statuses: List<StatusDto>? = null
    var potions: List<PotionDto>? = null
    var encounters: List<EncounterDto>? = null
    var loot: List<LootDto>? = null
    var progression: List<ProgressionDto>? = null
}

class ResourcesDto {
    var hp: Int? = null
    var mp: Int? = null
    var spTenths: Int? = null
}

class ActorDto {
    var items: Map<String, Int>? = null
    var speed: Int? = null
    var id: String? = null
    var kind: ActorKind? = null
    var resources: ResourcesDto? = null
    var skill: String? = null
    var rank: String? = null
    var stats: Map<String, Int>? = null
}

class SkillDto {
    var effect: SkillEffect? = null
    var target: TargetKind? = null
    var requiredEquipment: String? = null
    var cooldown: Int? = null
    var status: String? = null
    var shieldDuration: Int? = null
    var id: String? = null
    var name: String? = null
    var prototypeCap: String? = null
    var attackStat: String? = null
    var ranks: List<RankDto>? = null
}

class RankDto {
    var rank: String? = null
    var order: Int? = null
    var basePower: Int? = null
    var cost: ResourcesDto? = null
}

class StatDto {
    var id: String? = null
    var stage: StatStage? = null
    var base: Int? = null
    var minimum: Int? = null
    var maximum: Int? = null
    var terms: List<TermDto>? = null
}

class TermDto {
    var stat: String? = null
    var numerator: Int? = null
    var denominator: Int? = null
}

class StatusDto {
    var percent: Int? = null
    var periodicDamage: Int? = null
    var recovery: ResourcesDto? = null
    var id: String? = null
    var stat: String? = null
    var flat: Int? = null
    var duration: Int? = null
    var group: String? = null
    var priority: Int? = null
    var timing: StatusTiming? = null
}

class PotionDto {
    var id: String? = null
    var name: String? = null
    var recovery: ResourcesDto? = null
    var status: String? = null
}

class EncounterDto {
    var id: String? = null
    var enemy: String? = null
    var loot: String? = null
}

class LootDto {
    var id: String? = null
    var entries: List<LootEntryDto>? = null
}

class LootEntryDto {
    var potion: String? = null
    var probability: Int? = null
    var quantity: Int? = null
}

class ProgressionDto {
    var id: String? = null
    var thresholds: List<Int>? = null
}

class VisualsDto {
    var schemaVersion: Int? = null
    var bindings: List<VisualDto>? = null
}

class VisualDto {
    var id: String? = null
    var atlas: String? = null
    var animation: String? = null
    var frames: List<String>? = null
}
