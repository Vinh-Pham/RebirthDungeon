extends RefCounted
## Explicit in-memory value DTO for Phase 4. Disk schema/migrations are Phase 6.
const Session = preload("res://scripts/domain/state/session_shell.gd")
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const Actor = preload("res://scripts/domain/state/actor_state.gd")
const Battle = preload("res://scripts/domain/state/battle_state.gd")
const Status = preload("res://scripts/domain/state/status_state.gd")
const Item = preload("res://scripts/domain/state/item_state.gd")
const Exploration = preload("res://scripts/domain/state/exploration_state.gd")
const ACTOR_FIELDS := ["instance_id", "definition_id", "current", "maximum", "reserved", "stats", "skill_ranks", "training", "weapon", "regeneration", "completed_activations", "shield", "cooldowns", "flat_modifiers", "percent_modifiers"]
const STATUS_FIELDS := ["definition_id", "source_id", "remaining_activations", "magnitude", "group", "priority", "effect", "stat_id", "percent", "first_tick"]
const BATTLE_FIELDS := ["encounter_id", "phase", "active_actor_id", "selected_skill", "selected_rank", "target_id", "hand", "kept", "rerolls_remaining", "locked_inputs", "content_versions", "outcome", "activation", "pending_gold"]

static func capture(session: Session) -> Dictionary:
	var result := session.observation()
	result["checkpoint_version"] = 1
	result["town_position"] = {"x":session.town_position_x,"y":session.town_position_y}
	result["rng"] = session.rng.capture()
	result["accepted_operations"] = session.accepted_operations.duplicate()
	result["exploration"] = session.exploration.capture() if session.exploration != null else {}
	return result

static func restore(data: Dictionary, catalog: RefCounted) -> Session:
	if data.get("checkpoint_version") != 1 or data.get("content_versions") != catalog.versions(): return null
	for field: String in ["session_id", "revision", "mode"]:
		if typeof(data.get(field)) != TYPE_INT: return null
	for field: String in ["hero", "battle", "rng", "accepted_operations", "exploration"]:
		if not data.get(field) is Dictionary: return null
	var result := Session.new()
	if not result.rng.restore(data.rng): return null
	result.town_position_x = data.get("town_position",{}).get("x",96.0)
	result.town_position_y = data.get("town_position",{}).get("y",160.0)
	result.session_id = data.session_id
	result.revision = data.revision
	result.mode = data.mode
	result.content_versions = data.content_versions.duplicate(true)
	result.accepted_operations.assign(data.accepted_operations)
	result.hero = Hero.new()
	if not _actor(result.hero, data.hero): return null
	result.hero.committed_gold = data.hero.get("committed_gold", 0)
	for record: Dictionary in data.hero.get("items", []):
		var item := Item.new()
		item.instance_id = record.instance_id
		item.definition_id = record.definition_id
		item.quantity = record.quantity
		item.rolled_modifiers.assign(record.rolled_modifiers)
		result.hero.items.append(item)
	result.battle = Battle.new()
	for field: String in BATTLE_FIELDS:
		if not data.battle.has(field): return null
		result.battle.set(field, _detached(data.battle[field]))
	for record: Dictionary in data.battle.get("enemies", []):
		var enemy := Actor.new()
		if not _actor(enemy, record): return null
		result.battle.enemies.append(enemy)
	if result.battle.enemies.size() != 1: return null
	if not data.exploration.is_empty():
		result.exploration = Exploration.new()
		for field: String in ["world_id", "discovered", "resolved", "active_encounter", "pending_gold"]:
			result.exploration.set(field, _detached(data.exploration[field]))
		result.exploration.position_x = data.exploration.position.x
		result.exploration.position_y = data.exploration.position.y
	return result

static func _actor(actor: Actor, data: Dictionary) -> bool:
	for field: String in ACTOR_FIELDS:
		if not data.has(field): return false
		actor.set(field, _detached(data[field]))
	if actor.current.size() != 3 or actor.maximum.size() != 3 or actor.reserved.size() != 3: return false
	for record: Dictionary in data.get("statuses", []):
		var status := Status.new()
		for field: String in STATUS_FIELDS:
			if not record.has(field): return false
			status.set(field, record[field])
		actor.statuses.append(status)
	return true

static func _detached(value: Variant) -> Variant:
	if value is Dictionary or value is Array: return value.duplicate(true)
	if value is PackedInt64Array or value is PackedInt32Array: return value.duplicate()
	return value
