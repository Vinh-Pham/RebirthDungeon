extends RefCounted
## Read-only rank catalog and per-character training rules.

const DIRECTORY := "res://data/skills/"
const IDS := [
	"combat_mastery", "defense", "counterattack", "critical_hit", "dual_wield_mastery",
	"light_armor_mastery", "heavy_armor_mastery", "sword_mastery", "windmill",
	"shield_mastery", "smash",
]
const STARTING := {
	"combat_mastery": {"rank": "novice", "training": {}},
	"defense": {"rank": "novice", "training": {}},
}
const DISPLAY_EFFECTS := {
	"additional_hp_total": "Life", "additional_strength_human_total": "Strength",
	"additional_dexterity_human_total": "Dexterity", "additional_dexterity_total": "Dexterity",
	"additional_dex_total": "Dexterity", "additional_will_total": "Will", "additional_str_total": "Strength",
	"additional_str_and_will_total": "Strength and Will",
	"additional_min_damage_human_total": "Minimum damage", "additional_max_damage_human_total": "Maximum damage",
	"additional_min_damage": "Minimum sword damage", "additional_max_damage": "Maximum sword damage",
	"additional_melee_balance_total": "Melee balance %", "additional_sword_balance": "Sword balance %",
	"additional_damage": "Bonus critical damage %", "additional_base_defense_human_total": "Passive defense",
	"defense_bonus_human_elf": "Guard defense", "protection_bonus_human_elf": "Guard protection %",
	"damage_human_elf": "Damage %", "human_giant_damage": "Damage %",
	"damage_from_self_human_elf": "Own damage %", "damage_from_opponent_human_giant": "Enemy damage %",
	"additional_defense": "Defense", "additional_protection": "Protection %",
	"additional_magic_defense": "Magic defense", "additional_magic_protection": "Magic protection",
	"stamina_use": "Stamina cost",
}
static var _catalog: Dictionary = {}


static func catalog() -> Dictionary:
	if _catalog.is_empty():
		for id: String in IDS:
			var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(DIRECTORY + id + ".json"))
			if data is Dictionary and data.get("id") == id and data.get("ranks") is Array:
				_catalog[id] = data
			else:
				push_error("Could not load skill data for %s." % id)
	return _catalog


static func rank_data(id: String, rank: String) -> Dictionary:
	for entry: Dictionary in catalog().get(id, {}).get("ranks", []):
		if entry["rank"] == rank:
			return entry
	return {}


static func effects(world: Dictionary, id: String) -> Dictionary:
	var state: Dictionary = world.get("skills", STARTING).get(id, {})
	var rank := rank_data(id, state.get("rank", ""))
	return rank.get("game_effects", rank.get("effects", {}))


static func level_for_experience(total_xp: int) -> int:
	return maxi(1, floori((1.0 + sqrt(1.0 + float(maxi(0, total_xp)) * 0.08)) / 2.0))


static func available_ap(profile: Dictionary) -> int:
	var world: Dictionary = profile.get("world", {})
	return maxi(0, level_for_experience(int(profile.get("experience", 0))) - 1 - int(world.get("spent_ap", 0)))


static func normalize(value: Variant) -> Variant:
	if not value is Dictionary:
		return null
	var states := STARTING.duplicate(true)
	for id in value:
		var state: Variant = value[id]
		if not id is String or not state is Dictionary:
			return null
		if not state.get("rank") is String or not state.get("training", {}) is Dictionary:
			return null
		var rank := rank_data(id, state["rank"])
		if rank.is_empty():
			return null
		var counts: Dictionary = state.get("training", {})
		var normalized := {}
		for task: Dictionary in _training(rank):
			var key: String = task["id"]
			if not counts.has(key):
				continue
			var count: Variant = counts[key]
			if not (count is int or count is float) or not is_finite(float(count)) or count != floorf(float(count)) or count < 0:
				return null
			normalized[key] = int(minf(float(count), float(task["limit"])))
		states[id] = {"rank": state["rank"], "training": normalized}
	return states


static func train(world: Dictionary, events: Array) -> Dictionary:
	var states: Dictionary = world.get("skills", STARTING).duplicate(true)
	for id: String in states:
		var state: Dictionary = states[id]
		var rank := rank_data(id, state["rank"])
		var counts: Dictionary = state["training"]
		for task: Dictionary in _training(rank):
			var key: String = task["id"]
			var repetitions := events.count(key)
			if repetitions > 0:
				counts[key] = mini(int(task["limit"]), int(counts.get(key, 0)) + repetitions)
	return states


static func entries(profile: Dictionary, in_school := false) -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	var states: Dictionary = profile.get("world", {}).get("skills", STARTING)
	var ap := available_ap(profile)
	for id: String in IDS:
		var skill: Dictionary = catalog().get(id, {})
		if skill.is_empty():
			continue
		var state: Dictionary = states.get(id, {})
		var rank := rank_data(id, state.get("rank", ""))
		if rank.is_empty() and not in_school:
			continue
		var next := _next_rank(skill, rank)
		var tasks: Array[Dictionary] = []
		var counts: Dictionary = state.get("training", {})
		for task: Dictionary in _training(rank):
			var key: String = task["id"]
			tasks.append({
				"description": task["description"], "target": int(task["limit"]),
				"count": int(counts.get(key, 0)), "points": float(task["points"]),
			})
		var points := _points(rank, counts)
		var threshold := _threshold(rank)
		var cost := _cost(next)
		var learn_cost := _cost(skill["ranks"][0])
		var learn_error := _learn_error(profile, id, learn_cost) if in_school and not states.has(id) else ""
		var note: String = skill.get("game_note", learn_error)
		var display := _display_effects(effects(profile.get("world", {}), id))
		if id == "defense":
			display.erase("Stamina cost")
		rows.append({
			"id": id, "name": skill["name"], "kind": skill["kind"], "description": skill["description"],
			"learned": not rank.is_empty(), "rank": _rank_label(rank.get("rank", "")),
			"training": tasks, "training_points": points, "training_required": threshold,
			"next_rank": _rank_label(next.get("rank", "")), "ap_cost": maxi(0, cost),
			"can_advance": cost >= 0 and ap >= cost and threshold > 0.0 and points + 0.00001 >= threshold,
			"can_learn": in_school and not states.has(id) and learn_error.is_empty(),
			"locked_reason": note,
			"learn_cost": maxi(0, learn_cost),
			"can_study": in_school and _unfinished_study(rank, counts),
			"effects": display,
		})
	return rows


static func advance(profile: Dictionary, id: String) -> Dictionary:
	var skill: Dictionary = catalog().get(id, {})
	var world: Dictionary = profile["world"]
	var states: Dictionary = world["skills"].duplicate(true)
	if not states.has(id):
		return {"message": "Learn this skill before ranking it up."}
	var state: Dictionary = states[id]
	var rank := rank_data(id, state["rank"])
	var next := _next_rank(skill, rank)
	var cost := _cost(next)
	if cost < 0 or _threshold(rank) <= 0.0:
		return {"message": "No further rank is available."}
	if _points(rank, state["training"]) + 0.00001 < _threshold(rank):
		return {"message": "Complete the training for this rank first."}
	if available_ap(profile) < cost:
		return {"message": "You need %d AP to reach %s." % [cost, _rank_label(next["rank"])]}
	states[id] = {"rank": next["rank"], "training": {}}
	return {
		"changes": {"skills": states, "spent_ap": int(world["spent_ap"]) + cost},
		"message": "%s advanced to %s." % [skill["name"], _rank_label(next["rank"])],
	}


static func learn(profile: Dictionary, id: String) -> Dictionary:
	var skill: Dictionary = catalog().get(id, {})
	if skill.is_empty():
		return {"message": "This skill is unavailable."}
	var world: Dictionary = profile["world"]
	var states: Dictionary = world["skills"].duplicate(true)
	if states.has(id):
		return {"message": "You already know this skill."}
	var first: Dictionary = skill["ranks"][0]
	var cost := _cost(first)
	var error := _learn_error(profile, id, cost)
	if not error.is_empty():
		return {"message": error}
	states[id] = {"rank": first["rank"], "training": {}}
	return {
		"changes": {"skills": states, "spent_ap": int(world["spent_ap"]) + cost},
		"message": "Learned %s at %s." % [skill["name"], _rank_label(first["rank"])],
	}


static func study(world: Dictionary, id: String) -> Dictionary:
	var states: Dictionary = world["skills"].duplicate(true)
	var state: Dictionary = states.get(id, {})
	var rank := rank_data(id, state.get("rank", ""))
	var counts: Dictionary = state.get("training", {})
	if not _unfinished_study(rank, counts):
		return {"message": "There is no lesson for this rank."}
	for task: Dictionary in _training(rank):
		if task["id"] == "study_skill":
			counts["study_skill"] = int(task["limit"])
	return {"changes": {"skills": states}, "message": "Lesson complete."}


static func _learn_error(profile: Dictionary, id: String, cost: int) -> String:
	var skill: Dictionary = catalog().get(id, {})
	if not skill.get("game_available", true):
		return skill["game_note"]
	if level_for_experience(int(profile.get("experience", 0))) < 2:
		return "New skills are available at level 2."
	if id == "critical_hit" and profile["world"]["skills"]["combat_mastery"]["rank"] == "novice":
		return "Reach Combat Mastery rank F first."
	if cost < 0 or available_ap(profile) < cost:
		return "You need more AP to learn this skill."
	return ""


static func _unfinished_study(rank: Dictionary, counts: Dictionary) -> bool:
	for task: Dictionary in _training(rank):
		if task["id"] == "study_skill" and int(counts.get("study_skill", 0)) < int(task["limit"]):
			return true
	return false


static func _training(rank: Dictionary) -> Array:
	return rank.get("game_training", rank.get("training", []))


static func _threshold(rank: Dictionary) -> float:
	var value: Variant = rank.get("game_training_required", rank.get("training_required"))
	return float(value) if value != null else 0.0


static func _points(rank: Dictionary, counts: Dictionary) -> float:
	var points := 0.0
	for task: Dictionary in _training(rank):
		points += float(task["points"]) * int(counts.get(task["id"], 0))
	return points


static func _next_rank(skill: Dictionary, current: Dictionary) -> Dictionary:
	var ranks: Array = skill.get("ranks", [])
	for index in range(ranks.size() - 1):
		if ranks[index]["rank"] == current.get("rank"):
			var next: Dictionary = ranks[index + 1]
			return {} if String(next["rank"]).begins_with("dan_") else next
	return {}


static func _cost(rank: Dictionary) -> int:
	var cost: Variant = rank.get("ap_cost")
	return int(cost) if cost != null else -1


static func _display_effects(values: Dictionary) -> Dictionary:
	var visible_effects := {}
	for key in DISPLAY_EFFECTS:
		var value: Variant = values.get(key, 0)
		if (value is int or value is float) and value != 0:
			visible_effects[DISPLAY_EFFECTS[key]] = value
	return visible_effects


static func _rank_label(rank: String) -> String:
	return "Novice" if rank == "novice" else rank
