extends RefCounted
## Versioned, non-executable JSON transport. Every integer uses canonical decimal.
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Actor = preload("res://scripts/domain/state/actor_state.gd")
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const Battle = preload("res://scripts/domain/state/battle_state.gd")
const Status = preload("res://scripts/domain/state/status_state.gd")
const Item = preload("res://scripts/domain/state/item_state.gd")
const Exploration = preload("res://scripts/domain/state/exploration_state.gd")
const Dungeon = preload("res://scripts/domain/rules/dungeon_rules.gd")
const Progression = preload("res://scripts/domain/rules/progression_rules.gd")
const FORMAT = "rebirth.session.v3"
const ProgressionCodec = preload("res://scripts/data/progression_codec.gd")
const MAX_BYTES = 4194304
var error: String = ""

func encode(session: RefCounted, sequence: int) -> String:
	var payload := JSON.stringify(wire(Capture.capture(session)), "", true, true)
	return JSON.stringify({"format":FORMAT,"sequence":str(sequence),"payload":payload,
		"checksum":(FORMAT+"\n"+str(sequence)+"\n"+payload).sha256_text()}, "", true, true)

func decode(text: String, catalog: RefCounted) -> Dictionary:
	error = ""
	if text.length() > MAX_BYTES: return _fail("Save exceeds the size limit.")
	var parser := JSON.new()
	if parser.parse(text) != OK: return _fail("Checkpoint JSON is damaged.")
	var envelope: Variant = parser.data
	if not envelope is Dictionary or not keys(envelope,["format","sequence","payload","checksum"]): return _fail("Invalid checkpoint envelope.")
	if envelope.format not in [FORMAT,"rebirth.session.v1","rebirth.session.v2"]: return _fail("Unsupported save format.", "incompatible")
	if not Limits.valid_decimal(envelope.sequence) or envelope.sequence.to_int() < 1: return _fail("Invalid sequence.")
	if not envelope.payload is String or not envelope.checksum is String: return _fail("Invalid payload.")
	if (envelope.format+"\n"+envelope.sequence+"\n"+envelope.payload).sha256_text() != envelope.checksum: return _fail("Checkpoint checksum mismatch.")
	if parser.parse(envelope.payload) != OK: return _fail("Invalid payload JSON.")
	var data: Variant = unwire(parser.data)
	if not error.is_empty() or not data is Dictionary: return _fail("Invalid exact-value encoding.")
	if data.get("content_versions") != catalog.versions(): return _fail("This checkpoint needs another content or engine version.", "incompatible")
	if envelope.format == "rebirth.session.v1":
		if not data.get("hero") is Dictionary or data.hero.has("potions"): return _fail("Invalid legacy hero.")
		data.hero["potions"] = 0 # Phase 6 had no supplies; migrate without granting any.
	if envelope.format != FORMAT:
		if not data.get("hero") is Dictionary or data.hero.has("growth"): return _fail("Invalid legacy progression.")
		data.hero["growth"] = {}
		if not data.hero.get("items") is Array: return _fail("Invalid legacy items.")
		for item: Variant in data.hero.items:
			if not keys(item,["instance_id","definition_id","quantity","rolled_modifiers"]): return _fail("Invalid legacy item.")
			item.merge({"origin_id":"","container":"overflow","column":0,"row":0,"locked":false,"pages":[]})
		if data.get("exploration") is Dictionary and not data.exploration.is_empty(): data.exploration["progression"] = {}
	_migrate_phase9(data)
	_migrate_phase11(data)
	var session := restore(data,catalog)
	if session == null: return _fail("Invalid saved state: "+error)
	return {"status":"ok","session":session,"sequence":envelope.sequence.to_int()}

## Phase 9 structural migration for existing checkpoints: growth v2 quest and
## aging fields, item enchant records, pending quest facts and the clock.
## Idempotent; never invents progression for heroes without growth.
func _migrate_phase9(data: Dictionary) -> void:
	if not data.has("clock_week"): data["clock_week"] = 0
	if not data.get("hero") is Dictionary: return
	var hero: Dictionary = data.hero
	if hero.get("growth") is Dictionary and not hero.growth.is_empty() and not hero.growth.has("quests"):
		var age: int = int(hero.growth.get("age",17))
		hero.growth.merge({"version":2,"quests":{},"track":"","ledger":{},"birth_week":-1,"birth_age":age,
			"aged_to":age,"rebirth_week":-1,"rebirths":0},true)
	if hero.get("items") is Array:
		for item: Variant in hero.items:
			if item is Dictionary and not item.has("enchants"): item["enchants"] = {}
	if data.get("exploration") is Dictionary and not data.exploration.is_empty():
		var progression: Variant = data.exploration.get("progression",{})
		if progression is Dictionary and not progression.is_empty() and not progression.has("facts"):
			progression["facts"] = {}
	_migrate_phase10(data)

## Phase 10 structural migration: mission context, the borrowed champion and
## per-actor reaction/shield fields default for existing checkpoints without a
## content-version bump, so existing sessions resume without loss.
func _migrate_phase10(data: Dictionary) -> void:
	if not data.has("mission_id"): data["mission_id"] = ""
	if data.get("battle") is Dictionary and not data.battle.is_empty():
		if not data.battle.has("mission_id"): data.battle["mission_id"] = ""
		if not data.battle.has("champion"): data.battle["champion"] = {}
	if data.get("hero") is Dictionary and not data.hero.is_empty():
		if not data.hero.has("shield_equipped"): data.hero["shield_equipped"] = false
		if not data.hero.has("reaction"): data.hero["reaction"] = {}
	if data.get("battle") is Dictionary and data.battle.get("enemies") is Array:
		for enemy: Variant in data.battle.enemies:
			if enemy is Dictionary:
				if not enemy.has("shield_equipped"): enemy["shield_equipped"] = false
				if not enemy.has("reaction"): enemy["reaction"] = {}
		if data.battle.get("champion") is Dictionary and not data.battle.champion.is_empty():
			if not data.battle.champion.has("shield_equipped"): data.battle.champion["shield_equipped"] = false
			if not data.battle.champion.has("reaction"): data.battle.champion["reaction"] = {}
	if data.get("hero") is Dictionary and data.hero.get("growth") is Dictionary and not data.hero.growth.is_empty() and not data.hero.growth.has("missions"):
		data.hero.growth["missions"] = {}

## Phase 11 structural migration: exploration captures written before generated
## layouts gain the authored binding records of their stored layout, the exit
## room and a zero run seed. Idempotent; generated payloads already carry every
## field and are never touched.
func _migrate_phase11(data: Dictionary) -> void:
	var ex: Variant = data.get("exploration")
	# Generated payloads always carry their binding records; captures written
	# before Phase 11 lack the key entirely and gain the authored defaults.
	if not ex is Dictionary or ex.is_empty() or ex.has("bindings"): return
	if ex.get("layout") == Exploration.LAYOUT:
		ex["bindings"] = Exploration.LEGACY_BINDINGS.duplicate(true)
	elif ex.get("layout") == Exploration.LEGACY_LAYOUT:
		ex["bindings"] = Exploration.LEGACY_SMALL_BINDINGS.duplicate(true)
	else:
		return
	if not ex.has("exit_room_id"): ex["exit_room_id"] = Exploration.LEGACY_EXIT
	if not ex.has("run_seed"): ex["run_seed"] = 0

func _fail(message: String, status: String = "corrupt") -> Dictionary:
	error = message
	return {"status":status,"error":message}

static func wire(value: Variant) -> Variant:
	if typeof(value) == TYPE_INT: return {"$i64":str(value)}
	if value is Dictionary:
		var result := {}
		for key: String in value: result[key] = wire(value[key])
		return result
	if value is Array or value is PackedInt32Array or value is PackedInt64Array or value is PackedStringArray:
		var result: Array = []
		for element: Variant in value: result.append(wire(element))
		return result
	return value

func unwire(value: Variant, depth: int = 0) -> Variant:
	if depth > 40:
		error = "Excessive nesting"
		return null
	if value is Dictionary:
		if value.has("$i64"):
			if value.size() != 1 or not Limits.valid_decimal(value["$i64"]):
				error = "Invalid integer"
				return null
			return String(value["$i64"]).to_int()
		var result := {}
		for key: String in value: result[key] = unwire(value[key],depth+1)
		return result
	if value is Array:
		if value.size() > 100000:
			error = "Excessive array"
			return null
		var result: Array = []
		for element: Variant in value: result.append(unwire(element,depth+1))
		return result
	if typeof(value) == TYPE_FLOAT and not is_finite(value): error = "Nonfinite number"
	return value

static func keys(data: Dictionary, expected: Array) -> bool:
	if data.size() != expected.size(): return false
	for key: String in expected:
		if not data.has(key): return false
	return true

static func integer(value: Variant, low: int = 0, high: int = 1000000) -> bool:
	return typeof(value) == TYPE_INT and value >= low and value <= high

static func vector(value: Variant, size_value: int, low: int = 0, high: int = 1000000) -> bool:
	if not value is Array or value.size() != size_value: return false
	for element: Variant in value:
		if not integer(element,low,high): return false
	return true

func restore(data: Dictionary, catalog: RefCounted) -> SessionShell:
	error = "session fields"
	if not keys(data,["checkpoint_version","session_id","revision","mode","hero","battle","content_versions","rng","accepted_operations","exploration","town_position","clock_week","mission_id"]): return null
	if not integer(data.checkpoint_version,1,1) or not integer(data.session_id,1,9223372036854775806) or not integer(data.revision,0,9223372036854775806): return null
	if not integer(data.mode,2,5) or data.content_versions != catalog.versions(): return null
	if not integer(data.clock_week,0,10000000): return null
	if not data.mission_id is String: return null
	if not data.rng is Dictionary or not data.accepted_operations is Dictionary or data.accepted_operations.size() > 100000: return null
	var session := SessionShell.new()
	if not session.rng.restore(data.rng): return null
	for id: Variant in data.accepted_operations:
		if not id is String or id.is_empty() or id.length() > 256 or not integer(data.accepted_operations[id],0,data.revision): return null
	if not position(data.town_position): return null
	session.town_position_x = data.town_position.x
	session.town_position_y = data.town_position.y
	session.session_id = data.session_id
	session.revision = data.revision
	session.mode = data.mode
	session.clock_week = data.clock_week
	session.mission_id = data.mission_id
	session.content_versions = data.content_versions.duplicate(true)
	session.accepted_operations.assign(data.accepted_operations)
	error = "hero"
	var hero := Hero.new()
	if not actor(hero,data.hero,catalog,true) or hero.instance_id != "hero" or hero.definition_id != "actor.hero": return null
	session.hero = hero
	error = "exploration"
	if not data.exploration is Dictionary: return null
	if not data.exploration.is_empty():
		var ex: Dictionary = data.exploration
		if not keys(ex,["layout_id","layout","bindings","exit_room_id","run_seed","world_id","position","discovered","resolved","active_encounter","pending_gold","progression"]): return null
		if ex.world_id != "dungeon.undercrypt" or not integer(ex.pending_gold) or not integer(ex.run_seed,0,Limits.VALUE_MAX): return null
		if ex.layout_id == "undercrypt.v1":
			# Authored layouts keep their strict legacy equality records.
			if ex.layout != Exploration.LAYOUT and ex.layout != Exploration.LEGACY_LAYOUT: return null
			var expected: Array = Exploration.LEGACY_BINDINGS if ex.layout == Exploration.LAYOUT else Exploration.LEGACY_SMALL_BINDINGS
			if ex.bindings != expected or ex.exit_room_id != Exploration.LEGACY_EXIT: return null
		elif str(ex.layout_id).begins_with("undercrypt.g"):
			# Generated layouts validate against the authored generator tables;
			# the saved layout restores as-is and is never regenerated.
			var def: Resource = catalog.definition("dungeon.undercrypt")
			if def == null: return null
			var payload := {"layout_id":ex.layout_id,"world_id":ex.world_id,"run_seed":ex.run_seed,
				"rooms":ex.layout,"bindings":ex.bindings,"exit_room_id":ex.exit_room_id}
			if not Dungeon.validate_payload(payload,def,catalog.definition).is_empty(): return null
		else:
			return null
		if not position(ex.position): return null
		if not ids(ex.discovered,catalog,"room.") or not ids(ex.resolved,catalog,"encounter."): return null
		var room_ids := {}
		for room: Variant in ex.layout: room_ids[str(room.room_id)] = true
		for room_id: Variant in ex.discovered:
			if not room_ids.has(str(room_id)): return null
		if not ex.active_encounter is String or (not ex.active_encounter.is_empty() and catalog.definition(ex.active_encounter) == null): return null
		if not ex.active_encounter.is_empty():
			var bound := false
			for record: Variant in ex.bindings:
				if record is Dictionary and str(record.encounter_id) == ex.active_encounter: bound = true
			if not bound: return null
		if not ex.progression is Dictionary: return null
		session.exploration = Exploration.new()
		session.exploration.progression = ex.progression.duplicate(true)
		# Repair a Phase 10 regression: enemy strikes could write run training
		# for skills the hero never learned, which the validator rejects. Drop
		# those meaningless keys so affected sessions resume and re-save.
		var run_training: Dictionary = session.exploration.progression.get("training",{})
		if not run_training.is_empty():
			for skill_id: String in run_training.keys():
				if not session.hero.skill_ranks.has(skill_id): run_training.erase(skill_id)
		session.exploration.world_id = ex.world_id
		session.exploration.layout_id = ex.layout_id
		session.exploration.rooms = ex.layout.duplicate(true)
		session.exploration.bindings = ex.bindings.duplicate(true)
		session.exploration.exit_room_id = ex.exit_room_id
		session.exploration.run_seed = ex.run_seed
		session.exploration.position_x = ex.position.x
		session.exploration.position_y = ex.position.y
		session.exploration.discovered.assign(ex.discovered)
		session.exploration.resolved.assign(ex.resolved)
		session.exploration.active_encounter = ex.active_encounter
		session.exploration.pending_gold = ex.pending_gold
	if session.mode in [3,4] and session.exploration == null and not (session.mode == 4 and not session.mission_id.is_empty()): return null
	error = "battle"
	if not data.battle is Dictionary: return null
	if not data.battle.is_empty():
		var b: Dictionary = data.battle
		if not keys(b,Capture.BATTLE_FIELDS+["enemies","champion"]): return null
		if not b.encounter_id is String or not b.encounter_id.begins_with("encounter.") or catalog.definition(b.encounter_id) == null: return null
		if b.pending_gold != catalog.definition(b.encounter_id).pending_gold: return null
		if not integer(b.phase,0,3) or b.phase == 2 or not integer(b.activation,0,9223372036854775806) or not integer(b.pending_gold): return null
		if b.content_versions != catalog.versions(): return null
		if b.outcome not in ["","victory","defeat"] or not integer(b.rerolls_remaining,0,2): return null
		if not b.mission_id is String: return null
		var encounter: Resource = catalog.definition(b.encounter_id)
		if not b.enemies is Array or b.enemies.is_empty() or b.enemies.size() > Capture.MAX_ENEMIES: return null
		if b.enemies.size() != encounter.actor_ids.size(): return null
		var enemies: Array[Actor] = []
		for i: int in b.enemies.size():
			var enemy := Actor.new()
			if not actor(enemy,b.enemies[i],catalog,false): return null
			if enemy.instance_id != "enemy.%d" % i or enemy.definition_id != encounter.actor_ids[i]: return null
			enemies.append(enemy)
		var active_ok: bool = b.active_actor_id == "hero"
		if not active_ok and str(b.active_actor_id).begins_with("enemy."):
			var active_suffix: String = str(b.active_actor_id).trim_prefix("enemy.")
			active_ok = active_suffix.is_valid_int() and int(active_suffix) >= 0 and int(active_suffix) < b.enemies.size()
		if not active_ok: return null
		if not b.champion is Dictionary: return null
		var mission_id: String = b.mission_id
		if (mission_id.is_empty()) == (not b.champion.is_empty()): return null
		if session.mission_id != mission_id: return null
		if not mission_id.is_empty():
			var mission: Variant = Progression.CONFIG.missions.get(mission_id,{})
			if not mission is Dictionary: return null
			var champion := Actor.new()
			if not actor(champion,b.champion,catalog,false) or champion.instance_id != "hero": return null
			if champion.definition_id != str(mission.npc): return null
			session.battle = _battle(b, enemies, champion)
		else:
			session.battle = _battle(b, enemies, null)
		if session.battle == null: return null
		if b.phase == 1:
			if b.active_actor_id != "hero" or b.hand.size() != 5 or b.selected_skill.is_empty(): return null
			var probe := session.copy()
			probe.hero.reserved.fill(0)
			var expected := Rules.selection(probe,"hero",b.selected_skill,b.target_id,catalog)
			if expected.has("error") or wire(expected) != wire(b.locked_inputs) or b.selected_rank != expected.rank: return null
			var fighter = session.hero if session.battle.champion == null else session.battle.champion
			if wire(fighter.reserved) != wire(expected.costs): return null
			session.battle.locked_inputs.costs = PackedInt64Array(b.locked_inputs.costs)
			session.battle.locked_inputs.weights = PackedInt64Array(b.locked_inputs.weights)
		else:
			if not b.hand.is_empty() or not b.locked_inputs.is_empty() or b.kept.has(true) or b.rerolls_remaining != 2: return null
			var fighter = session.hero if session.battle.champion == null else session.battle.champion
			if fighter.reserved != PackedInt64Array([0,0,0]): return null
			if not b.selected_skill.is_empty():
				var selected := Rules.selection(session,b.active_actor_id,b.selected_skill,b.target_id,catalog)
				if selected.has("error") or b.selected_rank != selected.rank: return null
			elif not b.selected_rank.is_empty() or not b.target_id.is_empty(): return null
		for restored_enemy: Actor in session.battle.enemies:
			if restored_enemy.reserved != PackedInt64Array([0,0,0]): return null
		if b.phase == 3:
			var participant = session.hero if session.battle.champion == null else session.battle.champion
			var expected_outcome := "defeat" if participant.current[0] == 0 else "victory"
			if b.outcome != expected_outcome: return null
			if b.outcome == "victory":
				for restored_enemy: Actor in session.battle.enemies:
					if restored_enemy.current[0] != 0: return null
		elif b.outcome != "":
			return null
		else:
			# Unfinished battles keep every participant alive on disk.
			var participant_actor = session.hero if session.battle.champion == null else session.battle.champion
			if participant_actor.current[0] == 0: return null
			for restored_enemy: Actor in session.battle.enemies:
				if restored_enemy.current[0] == 0: return null
	if session.mode == 2 and (session.exploration != null or session.battle != null): return null
	if session.mode == 5 and (session.exploration == null or session.exploration.pending_gold != 0): return null
	if session.mode == 5 and not session.mission_id.is_empty(): return null
	if session.mode != 4 and not session.mission_id.is_empty(): return null
	if session.mode != 4 and session.battle != null and session.battle.phase != 3: return null
	if session.mode == 4:
		if session.battle == null: return null
		if session.battle.mission_id.is_empty():
			if session.exploration == null or session.exploration.active_encounter != session.battle.encounter_id: return null
			if session.battle.outcome == "victory" and not session.exploration.resolved.has(session.battle.encounter_id): return null
		if session.battle.mission_id.is_empty():
			if session.battle.outcome == "defeat" and session.exploration.pending_gold != 0: return null
			if session.battle.outcome.is_empty() and session.exploration.resolved.has(session.battle.encounter_id): return null
	elif session.exploration != null and not session.exploration.active_encounter.is_empty(): return null
	if session.battle == null and hero.reserved != PackedInt64Array([0,0,0]): return null
	error = "progression or inventory"
	if not ProgressionCodec.validate(session,catalog): return null
	error = ""
	return session

func ids(value: Variant, catalog: RefCounted, prefix: String) -> bool:
	if not value is Array or value.size() > 1000: return false
	var seen := {}
	for id: Variant in value:
		if not id is String or not id.begins_with(prefix) or catalog.definition(id) == null or seen.has(id): return false
		seen[id] = true
	return true

func actor(target: Actor, value: Variant, catalog: RefCounted, is_hero: bool) -> bool:
	if not value is Dictionary: return false
	var data: Dictionary = value
	if not keys(data,Capture.ACTOR_FIELDS+["statuses","shield_equipped","reaction"]+(["items","committed_gold","potions","growth"] if is_hero else [])): return false
	if not data.instance_id is String or not data.definition_id is String or not data.definition_id.begins_with("actor.") or catalog.definition(data.definition_id) == null: return false
	for field: String in ["current","maximum","reserved","regeneration"]:
		if not vector(data[field],3): return false
	for i: int in 3:
		if data.current[i] > data.maximum[i] or data.reserved[i] > data.current[i]: return false
	if data.maximum[0] < 1 or (data.reserved[0] > 0 and data.current[0]-data.reserved[0] < 1): return false
	if not integer(data.completed_activations,0,9223372036854775806) or not integer(data.shield) or not data.weapon is String: return false
	for field: String in ["stats","training","cooldowns","flat_modifiers","percent_modifiers","skill_ranks"]:
		if not data[field] is Dictionary or data[field].size() > 1000: return false
		for key: Variant in data[field]:
			if not key is String: return false
			var amount: Variant = data[field][key]
			if field == "skill_ranks":
				if not amount is String or catalog.definition(key) == null or not key.begins_with("skill."): return false
				var found := false
				for rank: Resource in catalog.definition(key).ranks:
					if rank.rank == amount: found = true
				if not found: return false
			else:
				if not integer(amount,-1000000 if field in ["stats","flat_modifiers","percent_modifiers"] else 0,9223372036854775806 if field == "cooldowns" else 1000000): return false
				if field in ["training","cooldowns"] and not data.skill_ranks.has(key): return false
				if field == "stats" and (not key.begins_with("stat.") or catalog.definition(key) == null): return false
				if field in ["flat_modifiers","percent_modifiers"] and key not in ["cost.hp","cost.mp","cost.sp"] and catalog.definition(key) == null: return false
	if not data.statuses is Array or data.statuses.size() > 1000: return false
	var groups := {}
	for record: Variant in data.statuses:
		if not record is Dictionary or not keys(record,Capture.STATUS_FIELDS): return false
		for field: String in ["definition_id","source_id","group","effect","stat_id"]:
			if not record[field] is String: return false
		if not record.definition_id.begins_with("status.") or catalog.definition(record.definition_id) == null: return false
		var definition: Resource = catalog.definition(record.definition_id)
		if record.effect != definition.effect or record.stat_id != definition.stat_id or record.percent != definition.percent or typeof(record.percent) != TYPE_BOOL: return false
		if record.group != (definition.stack_group if not definition.stack_group.is_empty() else definition.id) or record.priority != definition.priority: return false
		if record.source_id != "hero" and not str(record.source_id).begins_with("enemy."): return false
		if str(record.source_id).begins_with("enemy."):
			var suffix: String = str(record.source_id).trim_prefix("enemy.")
			if not suffix.is_valid_int() or int(suffix) < 0 or int(suffix) >= Capture.MAX_ENEMIES: return false
		if not integer(record.remaining_activations,1) or not integer(record.magnitude,-1000000) or not integer(record.priority,-1000000) or not integer(record.first_tick,0,9223372036854775806): return false
		if groups.has(record.group): return false
		groups[record.group] = true
		var status := Status.new()
		for field: String in Capture.STATUS_FIELDS: status.set(field,record[field])
		target.statuses.append(status)
	for field: String in Capture.ACTOR_FIELDS:
		if field in ["current","maximum","reserved","regeneration"]: target.set(field,PackedInt64Array(data[field]))
		elif field in ["stats","training"]: target.get(field).assign(data[field])
		elif field == "skill_ranks": target.skill_ranks.assign(data[field])
		else: target.set(field,data[field])
	# Phase 10 fields: shield tag and the prepared reaction stance.
	if data.has("shield_equipped") and typeof(data.shield_equipped) != TYPE_BOOL: return false
	if data.has("shield_equipped"): target.shield_equipped = data.shield_equipped
	if data.has("reaction"):
		if not data.reaction is Dictionary: return false
		if not data.reaction.is_empty():
			if data.reaction.size() != 2 or not data.reaction.get("skill_id") is String or not integer(data.reaction.get("power"),0): return false
			if catalog.definition(str(data.reaction.skill_id)) == null: return false
		target.reaction = data.reaction.duplicate(true)
	if is_hero:
		if not integer(data.committed_gold) or not data.items is Array or data.items.size() > 1000: return false
		if not integer(data.potions,0,1000000) or not data.growth is Dictionary: return false
		target.set("growth",data.growth.duplicate(true))
		target.set("potions",data.potions)
		target.set("committed_gold",data.committed_gold)
		var instance_ids := {}
		for record: Variant in data.items:
			if not record is Dictionary or not keys(record,ProgressionCodec.ITEM_FIELDS): return false
			if not record.instance_id is String or record.instance_id.is_empty() or instance_ids.has(record.instance_id): return false
			if not record.definition_id is String or not record.definition_id.begins_with("item.") or catalog.definition(record.definition_id) == null or not integer(record.quantity,1): return false
			if not record.rolled_modifiers is Dictionary: return false
			for key: Variant in record.rolled_modifiers:
				if not key is String or not key.begins_with("stat.") or catalog.definition(key) == null or not integer(record.rolled_modifiers[key],-1000000): return false
			instance_ids[record.instance_id] = true
			var item := Item.new()
			item.instance_id = record.instance_id
			item.definition_id = record.definition_id
			item.quantity = record.quantity
			item.rolled_modifiers.assign(record.rolled_modifiers)
			if not ProgressionCodec.item_fields(record): return false
			for field: String in ["origin_id","container","column","row","locked"]: item.set(field,record[field])
			item.pages.assign(record.pages)
			item.enchants = record.get("enchants",{}).duplicate(true)
			target.get("items").append(item)
	return true

static func position(value: Variant) -> bool:
	if not value is Dictionary or not keys(value,["x","y"]): return false
	for axis: String in ["x","y"]:
		if typeof(value[axis]) not in [TYPE_FLOAT,TYPE_INT] or not is_finite(value[axis]) or absf(value[axis]) > 100000: return false
	return true

## Rebuild one validated battle from decoded wire data.
static func _battle(b: Dictionary, enemies: Array[Actor], champion: Actor) -> Battle:
	if not b.kept is Array or b.kept.size() != 5: return null
	for kept: Variant in b.kept:
		if typeof(kept) != TYPE_BOOL: return null
	if not b.hand is Array or b.hand.size() not in [0,5]: return null
	for face: Variant in b.hand:
		if not integer(face,1,6): return null
	for field: String in ["selected_skill","selected_rank","target_id"]:
		if not b[field] is String: return null
	if not b.locked_inputs is Dictionary: return null
	var battle := Battle.new()
	for field: String in Capture.BATTLE_FIELDS:
		if field not in ["hand","kept"]: battle.set(field,b[field])
	battle.hand = PackedInt32Array(b.hand)
	battle.kept.assign(b.kept)
	battle.enemies.assign(enemies)
	battle.champion = champion
	return battle
