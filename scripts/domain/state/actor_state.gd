class_name ActorState
extends RefCounted
const Definition = preload("res://scripts/data/definitions/actor_definition.gd")
const Status = preload("res://scripts/domain/state/status_state.gd")
var instance_id: String = ""
var definition_id: String = ""
## HP, MP, SP; each actor owns its pools and reservations.
var current: PackedInt64Array = PackedInt64Array([0, 0, 0])
var maximum: PackedInt64Array = PackedInt64Array([0, 0, 0])
var reserved: PackedInt64Array = PackedInt64Array([0, 0, 0])
var stats: Dictionary[String, int] = {}
var skill_ranks: Dictionary[String, String] = {}
var training: Dictionary[String, int] = {}
var statuses: Array[Status] = []
var regeneration: PackedInt64Array = PackedInt64Array([0, 0, 0])
var weapon: String = ""
var completed_activations: int = 0
var shield: int = 0
var cooldowns: Dictionary = {}
## Owned additive modifiers; equipment/progression sources arrive in later phases.
var flat_modifiers: Dictionary = {}
var percent_modifiers: Dictionary = {}

func configure(definition: Definition, id: String) -> void:
	instance_id = id
	definition_id = definition.id
	maximum = PackedInt64Array([definition.max_hp, definition.max_mp, definition.max_sp])
	current = maximum.duplicate()
	reserved = PackedInt64Array([0, 0, 0])
	stats = definition.base_stats.duplicate()
	weapon = definition.weapon
	regeneration = definition.regeneration.duplicate()
	completed_activations = 0
	shield = 0
	cooldowns.clear()
	flat_modifiers.clear()
	percent_modifiers.clear()
	skill_ranks.clear()
	training.clear()
	statuses.clear()
	for skill_id: String in definition.skill_ids:
		skill_ranks[skill_id] = "F"
		training[skill_id] = 0

func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.instance_id = instance_id
	result.definition_id = definition_id
	result.current = current.duplicate()
	result.maximum = maximum.duplicate()
	result.reserved = reserved.duplicate()
	result.stats = stats.duplicate()
	result.skill_ranks = skill_ranks.duplicate()
	result.training = training.duplicate()
	result.regeneration = regeneration.duplicate()
	result.weapon = weapon
	result.completed_activations = completed_activations
	result.shield = shield
	result.cooldowns = cooldowns.duplicate(true)
	result.flat_modifiers = flat_modifiers.duplicate(true)
	result.percent_modifiers = percent_modifiers.duplicate(true)
	for status: Status in statuses:
		result.statuses.append(status.copy())
	return result

func observation() -> Dictionary:
	var active: Array[Dictionary] = []
	for status: Status in statuses:
		active.append(status.observation())
	return {"instance_id": instance_id, "definition_id": definition_id, "current": current.duplicate(),
		"maximum": maximum.duplicate(), "reserved": reserved.duplicate(), "stats": stats.duplicate(),
		"skill_ranks": skill_ranks.duplicate(), "training": training.duplicate(), "statuses": active, "weapon": weapon, "regeneration": regeneration.duplicate(), "completed_activations": completed_activations, "shield": shield,
		"cooldowns": cooldowns.duplicate(true), "flat_modifiers": flat_modifiers.duplicate(true),
		"percent_modifiers": percent_modifiers.duplicate(true)}
