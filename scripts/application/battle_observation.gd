extends RefCounted
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Math = preload("res://scripts/domain/rules/combat_math.gd")
static func decorate(result: Dictionary, session: RefCounted, catalog: RefCounted) -> void:
	var battle: Dictionary = result.battle
	var options := {}
	for id: String in session.hero.skill_ranks:
		var skill: Resource = catalog.definition(id)
		if skill == null: continue
		for rank: Resource in skill.ranks:
			if rank.rank != session.hero.skill_ranks[id]: continue
			var target: String = "hero" if skill.target == "self" else session.battle.enemies[0].instance_id
			var choice := Rules.selection(session,"hero",id,target,catalog)
			var total: int = 0
			for weight: int in rank.weights: total += weight
			var odds := PackedStringArray()
			for i: int in 6: odds.append("%d: %.1f%%" % [i+1,100.0*rank.weights[i]/total])
			options[id] = {"name":skill.display_name.capitalize(),"rank":rank.rank,"target_id":target,
				"target_name":_target_name(session,skill,target),"costs":Math.costs(session.hero,rank),
				"weights":rank.weights.duplicate(),"odds":" · ".join(odds),"unavailable":_reason(choice.get("error",""))}
	battle.options = options
	battle.preview = Math.preview(battle.locked_inputs,battle.hand,catalog)
	battle.multiplier = ""
	if not battle.preview.is_empty():
		var ratio: Vector2i = catalog.combination(battle.preview.combination)
		battle.multiplier = str(float(ratio.x)/float(ratio.y))
	var availability := {}
	for kind: String in ["select_skill","roll","keep","reroll","commit","pass","use_potion"]:
		var reason: String = ""
		if not battle.outcome.is_empty(): reason = "This encounter has ended."
		elif battle.active_actor_id != "hero": reason = "Wait for the enemy's activation."
		elif kind == "use_potion":
			if battle.phase != 0: reason = "Potions are full actions before rolling."
			elif session.hero.potions <= 0: reason = "Buy potions from the keeper in Haven."
			elif session.hero.current[0] >= session.hero.maximum[0]: reason = "HP is already full."
		elif kind in ["select_skill","roll"] and battle.phase != 0: reason = "The first roll locks skill and target."
		elif kind in ["keep","reroll","commit"] and battle.phase != 1: reason = "Roll five dice first."
		elif kind == "roll" and battle.selected_skill.is_empty(): reason = "Choose a skill and target first."
		elif kind == "roll": reason = options.get(battle.selected_skill,{}).get("unavailable","")
		elif kind == "reroll":
			if battle.rerolls_remaining <= 0: reason = "No rerolls remain. Use Skill or Paid Pass."
			elif not battle.kept.has(false): reason = "Release at least one kept die."
		availability[kind] = reason
	battle.availability = availability

static func _reason(code: String) -> String:
	return {"unaffordable":"Insufficient available HP, MP or SP.","cooldown":"Cooldown: complete your next activation.",
		"weapon_required":"Equip the required sword.","invalid_target":"No living legal target.",
		"unlearned_skill":"Learn this skill first.","unsupported_rank":"Rank is not authored.",
		"already_active":"Final Hit is already active; it cannot be recast."}.get(code,code.replace("_"," "))

## Display name for a skill's target: the champion, one enemy, or the whole set.
static func _target_name(session: RefCounted, skill: Resource, target_id: String) -> String:
	if skill.target == "self":
		return "Hero" if session.battle.champion == null else String(session.battle.champion.definition_id).trim_prefix("actor.").capitalize()
	if skill.target == "hostile_all": return "All enemies"
	for enemy: RefCounted in session.battle.enemies:
		if String(enemy.instance_id) == target_id: return String(enemy.definition_id).trim_prefix("actor.").capitalize()
	return "Enemy"
