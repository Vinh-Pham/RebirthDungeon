class_name CatalogValidator
extends RefCounted

const Manifest = preload("res://scripts/data/definitions/catalog_manifest.gd")
const Definition = preload("res://scripts/data/definitions/content_definition.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
const GROUPS := {"actors": "actor", "skills": "skill", "stats": "stat", "statuses": "status", "items": "item", "encounters": "encounter", "rooms": "room"}

var _errors: PackedStringArray = []
var _index: Dictionary = {}

func validate(manifest: Manifest) -> PackedStringArray:
	_errors.clear()
	_index.clear()
	if manifest == null:
		return PackedStringArray(["catalog [manifest].resource: expected CatalogManifest"])
	for field: String in ["schema_version", "rules_version", "generator_version", "rng_version"]:
		if manifest.get(field) != 1:
			_error(manifest, field, "unsupported version; expected 1")
	_bound(manifest, "content_version", manifest.content_version, 1)
	var engine := Engine.get_version_info()
	var actual_engine := "%d.%d.%d.%s.%s.%s" % [engine.major, engine.minor, engine.patch, engine.status, engine.build, engine.hash.substr(0, 9)]
	if actual_engine != Limits.ENGINE:
		_error(manifest, "engine_build", "running editor/templates do not match the pinned build")
	if manifest.engine_build != Limits.ENGINE:
		_error(manifest, "engine_build", "unsupported engine build")
	if manifest.rank_order != PackedStringArray(Limits.RANKS):
		_error(manifest, "rank_order", "expected complete F through 1 order")
	if manifest.combinations.size() != 8:
		_error(manifest, "combinations", "expected exactly eight combinations")
	for i: int in manifest.combinations.size():
		var combo := manifest.combinations[i]
		if combo == null:
			_error(manifest, "combinations[%d]" % i, "null combination")
			continue
		if i >= 8 or combo.key != Limits.COMBINATIONS[i]:
			_error(manifest, "combinations[%d].key" % i, "wrong or duplicate combination/order")
		_bound(manifest, "combinations[%d].numerator" % i, combo.numerator, 1)
		_bound(manifest, "combinations[%d].denominator" % i, combo.denominator, 1)
	for i: int in range(1, manifest.combinations.size()):
		var left := manifest.combinations[i - 1]
		var right := manifest.combinations[i]
		if left != null and right != null and left.numerator > 0 and left.numerator <= Limits.VALUE_MAX and right.numerator > 0 and right.numerator <= Limits.VALUE_MAX and left.denominator > 0 and left.denominator <= Limits.VALUE_MAX and right.denominator > 0 and right.denominator <= Limits.VALUE_MAX:
			if left.numerator * right.denominator >= right.numerator * left.denominator:
				_error(manifest, "combinations[%d]" % i, "multipliers must increase strictly")
	if manifest.xp_thresholds.size() < 2 or manifest.xp_thresholds[0] != 0:
		_error(manifest, "xp_thresholds", "need at least two thresholds starting at zero")
	var previous: int = -1
	for threshold: int in manifest.xp_thresholds:
		if threshold <= previous or threshold > Limits.VALUE_MAX:
			_error(manifest, "xp_thresholds", "must increase strictly within 0..1000000")
		previous = threshold
	var pattern := RegEx.new()
	pattern.compile("^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)*$")
	for group: String in GROUPS:
		var entries: Array = manifest.get(group)
		if entries.is_empty():
			_error(manifest, group, "required category is empty")
		for entry: Definition in entries:
			if entry == null:
				_error(manifest, group, "null definition")
				continue
			if pattern.search(entry.id) == null or not entry.id.begins_with(GROUPS[group] + "."):
				_error(entry, "id", "expected namespaced " + GROUPS[group] + " ID")
			if _index.has(entry.id):
				_error(entry, "id", "duplicate ID")
			_index[entry.id] = entry
			if entry.display_name.strip_edges().is_empty():
				_error(entry, "display_name", "required")
			if group in ["actors", "skills", "statuses", "items", "rooms"] and entry.icon == null:
				_error(entry, "icon", "required visual binding is missing")
	for stat: Manifest.STATS in manifest.stats:
		if stat == null: continue
		_bound(stat, "minimum", stat.minimum)
		_bound(stat, "maximum", stat.maximum, stat.minimum)
		if stat.unit not in ["integer", "basis_points"]:
			_error(stat, "unit", "unsupported unit")
		if stat.unit == "basis_points" and stat.maximum > Limits.BASIS_POINTS:
			_error(stat, "maximum", "basis points cannot exceed 10000")
	for skill: Manifest.SKILLS in manifest.skills:
		if skill == null: continue
		if skill.effect not in ["physical_damage", "shield"]:
			_error(skill, "effect", "unsupported Phase 2 effect")
		if skill.target != ("self" if skill.effect == "shield" else "hostile"):
			_error(skill, "target", "incompatible effect target")
		if skill.weapon not in ["", "sword"]:
			_error(skill, "weapon", "unsupported weapon")
		if not skill.status_id.is_empty():
			_reference(skill, "status_id", skill.status_id, "status")
		if skill.effect == "shield" and skill.status_id.is_empty():
			_error(skill, "status_id", "shield requires a status definition")
		if skill.ranks.is_empty():
			_error(skill, "ranks", "at least Rank F required")
		for i: int in skill.ranks.size():
			var rank := skill.ranks[i]
			if rank == null:
				_error(skill, "ranks[%d]" % i, "null rank")
				continue
			var prefix := "ranks[%d]." % i
			if i >= Limits.RANKS.size() or rank.rank != Limits.RANKS[i]:
				_error(skill, prefix + "rank", "ranks must be contiguous from F")
			for field: String in ["hp_cost", "mp_cost", "sp_cost", "base_power", "pip_scale", "cooldown", "duration"]:
				_bound(skill, prefix + field, rank.get(field))
			if rank.base_power >= 0 and rank.pip_scale >= 0 and (rank.base_power > Limits.VALUE_MAX or rank.pip_scale > (Limits.VALUE_MAX - mini(rank.base_power, Limits.VALUE_MAX)) / 30):
				_error(skill, prefix + "pip_scale", "base + 30*pip_scale exceeds safe effect bound")
			if skill.effect == "shield" and rank.duration < 1:
				_error(skill, prefix + "duration", "shield duration must be positive")
			_weights(skill, prefix + "weights", rank.weights)
		if not skill.ranks.is_empty() and skill.ranks.back() != null and skill.prototype_cap != skill.ranks.back().rank:
			_error(skill, "prototype_cap", "must match last authored rank")
	for actor: Manifest.ACTORS in manifest.actors:
		if actor == null: continue
		_bound(actor, "max_hp", actor.max_hp, 1)
		_bound(actor, "max_mp", actor.max_mp)
		_bound(actor, "max_sp", actor.max_sp)
		if actor.weapon not in ["", "sword"]:
			_error(actor, "weapon", "unsupported weapon")
		if actor.skill_ids.is_empty():
			_error(actor, "skill_ids", "actor needs an authored skill")
		_references(actor, "skill_ids", actor.skill_ids, "skill")
		for id: String in actor.base_stats:
			_reference(actor, "base_stats." + id, id, "stat")
			var stat := _index.get(id) as Manifest.STATS
			if stat != null and (actor.base_stats[id] < stat.minimum or actor.base_stats[id] > stat.maximum):
				_error(actor, "base_stats." + id, "outside authored stat bounds")
	for status: Manifest.STATUSES in manifest.statuses:
		if status == null: continue
		if status.effect not in ["shield", "stat_modifier"]:
			_error(status, "effect", "unsupported status effect")
		_bound(status, "duration", status.duration, 1)
		if status.magnitude < -Limits.VALUE_MAX or status.magnitude > Limits.VALUE_MAX:
			_error(status, "magnitude", "outside signed effect bounds")
		if status.effect == "stat_modifier" or not status.stat_id.is_empty():
			_reference(status, "stat_id", status.stat_id, "stat")
	for item: Manifest.ITEMS in manifest.items:
		if item == null: continue
		_bound(item, "width", item.width, 1, 6)
		_bound(item, "height", item.height, 1, 10)
		_bound(item, "max_stack", item.max_stack, 1)
		if item.weapon not in ["", "sword"]:
			_error(item, "weapon", "unsupported weapon")
	for encounter: Manifest.ENCOUNTERS in manifest.encounters:
		if encounter == null: continue
		if encounter.actor_ids.size() != 1:
			_error(encounter, "actor_ids", "foundation supports exactly one enemy")
		_references(encounter, "actor_ids", encounter.actor_ids, "actor")
		_bound(encounter, "pending_gold", encounter.pending_gold)
	for room: Manifest.ROOMS in manifest.rooms:
		if room != null:
			_references(room, "encounter_ids", room.encounter_ids, "encounter")
	return _errors.duplicate()

func _error(resource: Resource, property: String, reason: String) -> void:
	var id: String = resource.id if resource is Definition else "manifest"
	var path: String = resource.resource_path if not resource.resource_path.is_empty() else "<memory>"
	_errors.append("%s [%s].%s: %s" % [path, id, property, reason])

func _bound(resource: Resource, field: String, value: int, minimum: int = 0, maximum: int = Limits.VALUE_MAX) -> void:
	if value < minimum or value > maximum:
		_error(resource, field, "expected %d..%d, got %d" % [minimum, maximum, value])

func _reference(resource: Resource, field: String, id: String, category: String) -> void:
	if not id.begins_with(category + ".") or not _index.has(id):
		_error(resource, field, "unresolved " + category + " reference: " + id)

func _references(resource: Resource, field: String, ids: PackedStringArray, category: String) -> void:
	var seen: Dictionary = {}
	for id: String in ids:
		_reference(resource, field, id, category)
		if seen.has(id):
			_error(resource, field, "duplicate reference: " + id)
		seen[id] = true

func _weights(resource: Resource, field: String, weights: PackedInt64Array) -> void:
	if weights.size() != 6:
		_error(resource, field, "expected six integer weights")
		return
	var total: int = 0
	for weight: int in weights:
		if weight < 0 or weight > Limits.WEIGHT_MAX:
			_error(resource, field, "weights must be 0..1000000")
			return
		total += weight
	if total == 0:
		_error(resource, field, "weight sum must be positive")
