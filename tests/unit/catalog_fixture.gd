extends RefCounted
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Manifest = preload("res://scripts/data/definitions/catalog_manifest.gd")
const Validator = preload("res://scripts/data/catalog_validator.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
var _failures: PackedStringArray = []
var _checks: int = 0

func _check(condition: bool, label: String) -> void:
	_checks += 1
	if not condition: _failures.append(label)

func run() -> PackedStringArray:
	var source := load("res://content/catalog.tres") as Manifest
	var catalog := Catalog.new()
	var errors := catalog.publish(source)
	_check(errors.is_empty(), "Valid authored catalog rejected: " + str(errors))
	if not errors.is_empty(): return _failures
	var ids := catalog.ids()
	_check(ids.size() == 26 and ids.has("skill.sword"), "Explicit catalog membership")
	_check(catalog.versions().content == 3, "Catalog content version")
	var mutations: Array[Dictionary] = [
		{"field": "cost", "change": func(m: Manifest): m.skills[0].ranks[0].sp_cost = 0},
		{"field": "regeneration", "change": func(m: Manifest): m.actors[0].regeneration = PackedInt64Array([1])},
		{"field": "regeneration", "change": func(m: Manifest): m.actors[0].regeneration[0] = -1},
		{"field": "first_actor", "change": func(m: Manifest): m.encounters[0].first_actor = "random"},
		{"field": "stack_group", "change": func(m: Manifest): m.statuses[0].stack_group = ""},
		{"field": "magnitude", "change": func(m: Manifest): m.statuses[0].magnitude = -1},
		{"field": "schema_version", "change": func(m: Manifest): m.schema_version = 2},
		{"field": "content_version", "change": func(m: Manifest): m.content_version = 0},
		{"field": "rules_version", "change": func(m: Manifest): m.rules_version = 2},
		{"field": "rng_version", "change": func(m: Manifest): m.rng_version = 2},
		{"field": "generator_version", "change": func(m: Manifest): m.generator_version = 2},
		{"field": "engine_build", "change": func(m: Manifest): m.engine_build = "other"},
		{"field": "rank_order", "change": func(m: Manifest): m.rank_order.reverse()},
		{"field": "combinations", "change": func(m: Manifest): m.combinations.pop_back()},
		{"field": "combinations[1].key", "change": func(m: Manifest): m.combinations[1].key = "none"},
		{"field": "denominator", "change": func(m: Manifest): m.combinations[0].denominator = 0},
		{"field": "numerator", "change": func(m: Manifest): m.combinations[0].numerator = 1000001},
		{"field": "combinations[1]", "change": func(m: Manifest): m.combinations[1].numerator = 1},
		{"field": "xp_thresholds", "change": func(m: Manifest): m.xp_thresholds = PackedInt64Array([1, 100])},
		{"field": "xp_thresholds", "change": func(m: Manifest): m.xp_thresholds = PackedInt64Array([0, 100, 99])},
		{"field": "xp_thresholds", "change": func(m: Manifest): m.xp_thresholds = PackedInt64Array([0, 1000001])},
		{"field": "id", "change": func(m: Manifest): m.actors[1].id = m.actors[0].id},
		{"field": "id", "change": func(m: Manifest): m.actors[0].id = "actor.BAD"},
		{"field": "id", "change": func(m: Manifest): m.actors[0].id = "skill.hero"},
		{"field": "icon", "change": func(m: Manifest): m.skills[0].icon = null},
		{"field": "display_name", "change": func(m: Manifest): m.actors[0].display_name = ""},
		{"field": "skill_ids", "change": func(m: Manifest): m.actors[0].skill_ids = PackedStringArray(["skill.missing"])},
		{"field": "skill_ids", "change": func(m: Manifest): m.actors[0].skill_ids = PackedStringArray(["actor.hero"])},
		{"field": "skill_ids", "change": func(m: Manifest): m.actors[0].skill_ids = PackedStringArray(["skill.sword", "skill.sword"])},
		{"field": "effect", "change": func(m: Manifest): m.skills[0].effect = "teleport"},
		{"field": "target", "change": func(m: Manifest): m.skills[0].target = "self"},
		{"field": "rank", "change": func(m: Manifest): m.skills[0].ranks[1].rank = "F"},
		{"field": "prototype_cap", "change": func(m: Manifest): m.skills[0].prototype_cap = "1"},
		{"field": "sp_cost", "change": func(m: Manifest): m.skills[0].ranks[0].sp_cost = -1},
		{"field": "weights", "change": func(m: Manifest): m.skills[0].ranks[0].weights = PackedInt64Array([1, 1])},
		{"field": "weights", "change": func(m: Manifest): m.skills[0].ranks[0].weights = PackedInt64Array([0, 0, 0, 0, 0, 0])},
		{"field": "weights", "change": func(m: Manifest): m.skills[0].ranks[0].weights[0] = -1},
		{"field": "weights", "change": func(m: Manifest): m.skills[0].ranks[0].weights[0] = 9223372036854775807},
		{"field": "pip_scale", "change": func(m: Manifest): m.skills[0].ranks[0].pip_scale = 1000000},
		{"field": "max_hp", "change": func(m: Manifest): m.actors[0].max_hp = 0},
		{"field": "max_sp", "change": func(m: Manifest): m.actors[0].max_sp = 1000001},
		{"field": "base_stats", "change": func(m: Manifest): m.actors[0].base_stats["stat.strength"] = -1},
		{"field": "base_stats", "change": func(m: Manifest): m.actors[0].base_stats["skill.sword"] = 1},
		{"field": "stat_id", "change": func(m: Manifest): m.statuses[1].stat_id = "stat.missing"},
		{"field": "status_id", "change": func(m: Manifest): m.skills[1].status_id = ""},
		{"field": "duration", "change": func(m: Manifest): m.statuses[0].duration = 0},
		{"field": "width", "change": func(m: Manifest): m.items[0].width = 7},
		{"field": "max_stack", "change": func(m: Manifest): m.items[0].max_stack = 0},
		{"field": "actor_ids", "change": func(m: Manifest): m.encounters[0].actor_ids = PackedStringArray(["actor.missing"])},
		{"field": "encounter_ids", "change": func(m: Manifest): m.rooms[0].encounter_ids = PackedStringArray(["skill.sword"])},
		{"field": "actors", "change": func(m: Manifest): m.actors.clear()},
		{"field": "skills", "change": func(m: Manifest): m.skills.append(null)},
	]
	for mutation: Dictionary in mutations:
		var invalid: Manifest = source.duplicate_deep(Resource.DEEP_DUPLICATE_ALL)
		mutation.change.call(invalid)
		errors = catalog.publish(invalid)
		_check(not errors.is_empty() and str(errors).contains(mutation.field), "Invalid catalog must diagnose " + mutation.field)
		_check(catalog.ids() == ids and catalog.versions().content == 3, "Invalid catalog must preserve previous publication")
	_check(not Catalog.new().publish(null).is_empty(), "Null catalog rejected")
	var invalid_file := load("res://tests/fixtures/invalid_catalog.tres") as Manifest
	errors = Validator.new().validate(invalid_file)
	_check(str(errors).contains("res://tests/fixtures/invalid_catalog.tres [manifest].schema_version"), "Real resource path/property diagnosis")
	var returned := catalog.definition("skill.sword") as Manifest.SKILLS
	returned.ranks[0].sp_cost = 999
	_check(catalog.definition("skill.sword").ranks[0].sp_cost == 5, "Catalog lookups must not expose nested mutable Resources")
	var candidate: Manifest = source.duplicate_deep(Resource.DEEP_DUPLICATE_ALL)
	candidate.content_version = 4
	_check(catalog.publish(candidate).is_empty(), "New valid content publishes")
	candidate.skills[0].ranks[0].sp_cost = 998
	_check(catalog.definition("skill.sword").ranks[0].sp_cost == 5, "Publication must detach authored graph")
	_check(source.skills[0].ranks[0].sp_cost == 5, "Source resource stays unchanged")
	_check(Limits.floor_ratio(43, 5, 2) == 107, "Explicit rational floor")
	_check(Limits.floor_ratio(1000000, 1000000, 1) == 1000000000000, "Safe multiplication bound")
	_check(Limits.floor_ratio(9223372036854775807, 2, 1) == -1, "Overflow rejected before multiplication")
	_check(Limits.floor_ratio(1, 1, 0) == -1, "Zero denominator rejected")
	print("CATALOG_FIXTURE: %s (%d checks)" % ["PASS" if _failures.is_empty() else "FAIL", _checks])
	return _failures
