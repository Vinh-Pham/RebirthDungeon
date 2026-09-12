extends PanelContainer
## Minimal Phase 4 harness. Presentation never resolves a turn or owns RNG.
signal command_requested(intent: Dictionary)
signal continue_requested(session_id: int, revision: int)
const Math = preload("res://scripts/domain/rules/combat_math.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
var _observation: Dictionary = {}
var _enabled: bool = true
var _buttons: Array[Button] = []
var _serial: int = 0
var _message: Label

func configure(snapshot: Dictionary, catalog: RefCounted) -> void:
	_observation = snapshot.duplicate(true)
	custom_minimum_size = Vector2(680, 440)
	var margin := MarginContainer.new()
	for side: String in ["left", "top", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 16)
	add_child(margin)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	margin.add_child(box)
	_message = Label.new()
	box.add_child(_message)
	var battle: Dictionary = snapshot.battle
	var hero: Dictionary = snapshot.hero
	var enemy: Dictionary = battle.enemies[0]
	_label(box, "UNDERCRYPT  /  " + ("Your activation" if battle.active_actor_id == "hero" else "Sentinel activation"), 24)
	var actors := HBoxContainer.new()
	box.add_child(actors)
	for record: Dictionary in [hero, enemy]:
		var column := VBoxContainer.new()
		column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		actors.add_child(column)
		var portrait := TextureRect.new()
		portrait.texture = load("res://assets/art/exploration/hero.png" if record.instance_id == "hero" else "res://assets/art/exploration/sentinel.png")
		portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		portrait.custom_minimum_size = Vector2(120, 100)
		column.add_child(portrait)
		_label(column, "%s · HP %d/%d · MP %d/%d · SP %d/%d" % ["Hero" if record.instance_id == "hero" else "Sentinel",
			record.current[0],record.maximum[0],record.current[1],record.maximum[1],record.current[2],record.maximum[2]])
		var status_text := "Shield %d" % record.shield
		for status: Dictionary in record.statuses:
			status_text += " · %s (%d)" % [status.definition_id.trim_prefix("status."), status.remaining_activations]
		_label(column, status_text)
	if not battle.outcome.is_empty():
		_label(box, "Victory · %d gold held for dungeon exit" % battle.pending_gold if battle.outcome == "victory" else "Defeat · expedition rewards lost", 22)
		_button(box, "Return to dungeon" if battle.outcome == "victory" else "View results", func(): continue_requested.emit(snapshot.session_id, snapshot.revision))
		return
	if battle.active_actor_id != "hero":
		_label(box, "The sentinel is deciding…")
		return
	if battle.phase == 0:
		var skills := HBoxContainer.new()
		box.add_child(skills)
		var ids: Array = hero.skill_ranks.keys()
		ids.sort()
		for id: String in ids:
			var definition: Resource = catalog.definition(id)
			var option: Dictionary = battle.get("options", {}).get(id, {"costs": [0,0,0], "unavailable": ""})
			var button := _button(skills, "%s · %s · %d/%d/%d HP/MP/SP" % [id.trim_prefix("skill.").capitalize(), hero.skill_ranks[id], option.costs[0], option.costs[1], option.costs[2]],
				func(): _send("select_skill", id, "hero" if definition.target == "self" else enemy.instance_id))
			button.set_meta("unavailable", not String(option.unavailable).is_empty())
			button.tooltip_text = String(option.unavailable).replace("_", " ")
		_label(box, "Selected: " + (battle.selected_skill.trim_prefix("skill.").capitalize() if not battle.selected_skill.is_empty() else "choose a skill"))
		if not battle.selected_skill.is_empty(): _button(box, "Roll five dice", func(): _send("roll"))
		_button(box, "Pass · no cost", func(): _send("pass"))
	else:
		var preview := Math.preview(battle.locked_inputs, battle.hand, catalog)
		_label(box, "%s · %s · %d pips · %d %s" % [battle.selected_skill.trim_prefix("skill.").capitalize(),
			Limits.COMBINATIONS[preview.combination].replace("_"," "),preview.pips,preview.amount,
			"shield" if battle.locked_inputs.effect == "shield" else "damage"], 20)
		var dice := HBoxContainer.new()
		box.add_child(dice)
		for i: int in 5:
			_button(dice, "%d%s" % [battle.hand[i], " · kept" if battle.kept[i] else ""], func(): _send("keep", "", "", [i]))
		var indices: Array = []
		for i: int in 5:
			if not battle.kept[i]: indices.append(i)
		_label(box, "Reserved HP/MP/SP: %d / %d / %d · %d rerolls left" % [hero.reserved[0],hero.reserved[1],hero.reserved[2],battle.rerolls_remaining])
		if battle.rerolls_remaining > 0 and not indices.is_empty(): _button(box, "Reroll unkept dice", func(): _send("reroll", "", "", indices))
		_button(box, "Commit " + battle.selected_skill.trim_prefix("skill.").capitalize(), func(): _send("commit"))
		_button(box, "Pass · pay reserved cost", func(): _send("pass"))

func _label(parent: Node, text: String, size: int = 16) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	parent.add_child(label)

func _button(parent: Node, text: String, callback: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 36
	button.pressed.connect(callback)
	parent.add_child(button)
	_buttons.append(button)
	return button

func _send(kind: String, skill: String = "", target: String = "", indices: Array = []) -> void:
	if not _enabled: return
	_serial += 1
	var intent := {"session_id": _observation.session_id, "expected_revision": _observation.revision,
		"operation_id": "ui:%d:%d:%d" % [_observation.session_id, _observation.revision, _serial],
		"kind": kind, "actor_id": "hero", "skill_id": skill, "target_id": target}
	if kind in ["keep", "reroll"]: intent["indices"] = indices.duplicate()
	command_requested.emit(intent)

func set_input_enabled(enabled: bool) -> void:
	_enabled = enabled
	for button: Button in _buttons: button.disabled = not enabled or button.get_meta("unavailable", false)
	if enabled:
		for button: Button in _buttons:
			if not button.disabled:
				button.grab_focus()
				break

func show_rejection(code: String) -> void:
	_message.text = "Action unavailable: " + code.replace("_", " ")
