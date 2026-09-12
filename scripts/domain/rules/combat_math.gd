extends RefCounted
const Actor = preload("res://scripts/domain/state/actor_state.gd")
const Status = preload("res://scripts/domain/state/status_state.gd")
const Dice = preload("res://scripts/domain/rules/dice_rules.gd")
const CAP: int = 1000000
## floor/ceil retain integer arithmetic, including negative flat modifiers.
static func floor_div(value: int, divisor: int) -> int:
	@warning_ignore("integer_division")
	var quotient: int = value / divisor
	return quotient - (1 if value < 0 and value % divisor != 0 else 0)

static func effective(actor: Actor, key: String, catalog: RefCounted) -> int:
	var flat: int = actor.flat_modifiers.get(key, 0)
	var percent: int = actor.percent_modifiers.get(key, 0)
	for status: Status in actor.statuses:
		if status.effect == "stat_modifier" and status.stat_id == key:
			if status.percent: percent += status.magnitude
			else: flat += status.magnitude
	var definition: Resource = catalog.definition(key)
	var low: int = definition.minimum if definition != null else 0
	var high: int = definition.maximum if definition != null else CAP
	return clampi(floor_div((int(actor.stats.get(key, 0)) + flat) * maxi(0, 10000 + percent), 10000), low, high)

static func costs(actor: Actor, rank: Resource) -> PackedInt64Array:
	var result := PackedInt64Array([rank.hp_cost, rank.mp_cost, rank.sp_cost])
	for i: int in 3:
		if result[i] == 0: continue
		var key: String = ["cost.hp", "cost.mp", "cost.sp"][i]
		var adjusted: int = (result[i] + int(actor.flat_modifiers.get(key, 0))) * maxi(0, 10000 + int(actor.percent_modifiers.get(key, 0)))
		result[i] = maxi(1, -floor_div(-adjusted, 10000))
	return result

static func affordable(actor: Actor, vector: PackedInt64Array) -> bool:
	for i: int in 3:
		if vector[i] > CAP or actor.current[i] - actor.reserved[i] - vector[i] < (1 if i == 0 else 0):
			return false
	return true

static func inputs(source: Actor, target: Actor, skill: Resource, rank: Resource, catalog: RefCounted) -> Dictionary:
	var magical: bool = skill.effect == "magic_damage"
	return {"skill_id": skill.id, "rank": rank.rank, "target_id": target.instance_id,
		"effect": skill.effect, "uses_dice": skill.uses_dice, "base": rank.base_power, "pip_scale": rank.pip_scale,
		"attack": effective(source, "stat.magic_attack" if magical else "stat.strength", catalog),
		"defense": effective(target, "stat.magic_defense" if magical else "stat.defense", catalog),
		"protection": effective(target, "stat.magic_protection" if magical else "stat.protection", catalog),
		"shield": target.shield, "costs": costs(source, rank), "weights": rank.weights.duplicate(),
		"status_id": skill.status_id, "duration": rank.duration, "cooldown": rank.cooldown}

static func preview(locked: Dictionary, hand: PackedInt32Array, catalog: RefCounted) -> Dictionary:
	if locked.is_empty(): return {}
	var pips: int = 0
	var combo := Vector2i(1, 1)
	var combination: int = 0
	if locked.uses_dice:
		combination = Dice.classify(hand)
		if combination < 0: return {}
		combo = catalog.combination(combination)
		for pip: int in hand: pips += pip
	var power: int = int(locked.base) + int(locked.pip_scale) * pips
	var amount: int = 0
	var absorbed: int = 0
	if locked.effect in ["physical_damage", "magic_damage"]:
		amount = floor_div(maxi(0, power + int(locked.attack) - int(locked.defense)) * combo.x, combo.y)
		amount = floor_div(amount * (10000 - int(locked.protection)), 10000)
		amount = clampi(amount, 0, CAP)
		absorbed = mini(int(locked.shield), amount)
		amount -= absorbed
	elif locked.effect == "shield":
		amount = clampi(floor_div(power * combo.x, combo.y), 0, CAP)
	return {"amount": amount, "absorbed": absorbed, "pips": pips, "combination": combination}

static func apply_status(target: Actor, definition: Resource, source_id: String, magnitude: int, duration: int, active_id: String) -> void:
	var group: String = definition.stack_group if not definition.stack_group.is_empty() else definition.id
	var existing: Status
	for status: Status in target.statuses:
		if status.group == group:
			existing = status
			break
	if existing != null and existing.definition_id != definition.id and existing.priority > definition.priority:
		return
	var entry := Status.new()
	entry.definition_id = definition.id
	entry.group = group
	entry.priority = definition.priority
	entry.effect = definition.effect
	entry.stat_id = definition.stat_id
	entry.percent = definition.percent
	entry.source_id = source_id
	entry.magnitude = magnitude
	entry.remaining_activations = duration
	entry.first_tick = target.completed_activations + (2 if target.instance_id == active_id else 1)
	if existing != null:
		# Same version refreshes duration, without stacking magnitude.
		if existing.definition_id == definition.id: entry.magnitude = existing.magnitude
		target.statuses.erase(existing)
	target.statuses.append(entry)
	if entry.effect == "shield":
		# Shield replacement is explicitly the newly cast amount.
		entry.magnitude = magnitude
		target.shield = magnitude

static func end_activation(actor: Actor) -> void:
	actor.completed_activations += 1
	actor.statuses.sort_custom(func(a: Status, b: Status) -> bool: return a.group < b.group)
	for status: Status in actor.statuses:
		if actor.completed_activations < status.first_tick: continue
		if status.effect == "periodic_damage" and actor.current[0] > 0:
			actor.current[0] = maxi(0, actor.current[0] - maxi(0, status.magnitude))
		status.remaining_activations -= 1
	for i: int in range(actor.statuses.size() - 1, -1, -1):
		if actor.statuses[i].remaining_activations <= 0:
			if actor.statuses[i].effect == "shield": actor.shield = 0
			actor.statuses.remove_at(i)
	for key: String in actor.cooldowns.keys():
		if actor.completed_activations >= int(actor.cooldowns[key]): actor.cooldowns.erase(key)
	for i: int in 3: actor.current[i] = clampi(actor.current[i], 0, actor.maximum[i])
	if actor.current[0] > 0:
		for i: int in 3:
			actor.current[i] = mini(actor.maximum[i], actor.current[i] + actor.regeneration[i])
