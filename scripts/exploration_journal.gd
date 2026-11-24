extends Control

signal closed
signal advance_requested(skill_id: String)
signal learn_requested(skill_id: String)
signal study_requested(skill_id: String)

const Style = preload("res://scripts/menu_style.gd")
const Data = preload("res://scripts/character_data.gd")
const Stats = preload("res://scripts/character_stats.gd")

var _heading: Label
var _content: VBoxContainer
var _close: Button
var _skill_status: Label


func _ready() -> void:
	theme = Style.make_theme()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hide()
	var shade := ColorRect.new()
	shade.color = Style.OVERLAY_SHADE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var frame := Style.panel(Style.inset(self, 160, 70, true), Style.BACK)
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 16)
	Style.inset(frame, 24, 20).add_child(layout)
	var header := HBoxContainer.new()
	layout.add_child(header)
	_heading = Style.label("", 32)
	_heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(_heading)
	_close = Style.button("Close")
	_close.pressed.connect(close)
	header.add_child(_close)
	layout.add_child(Style.rule())
	_skill_status = Style.label("", 14, Style.TEXT, true)
	_skill_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_skill_status.hide()
	layout.add_child(_skill_status)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(scroll)
	_content = VBoxContainer.new()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_theme_constant_override("separation", 16)
	scroll.add_child(_content)


func open(section: String, profile: Dictionary, stats: Dictionary, skills: Array = []) -> void:
	set_skill_status("")
	for child in _content.get_children():
		_content.remove_child(child)
		child.queue_free()
	match section:
		"skills", "school":
			_heading.text = "School Lessons" if section == "school" else "Skills"
			_section("Ability Points", "%d AP available from your character's levels." % int(stats.get("ability_points", 0)))
			for skill: Dictionary in skills:
				_skill_card(skill)
		"talent":
			_heading.text = "Talent"
			var current := clampi(int(profile.get("talent", 0)), 0, Data.TALENTS.size() - 1)
			for index in Data.TALENTS.size():
				var caption: String = Data.TALENTS[index]
				if index == current:
					caption += "  ·  Selected"
				var bonuses: Dictionary = Stats.TALENT_BONUSES[index]
				var parts: Array[String] = []
				for key: String in bonuses:
					parts.append("+%s %s" % [str(bonuses[key]), key.capitalize()])
				_section(caption, str(Data.TALENT_DETAILS[index]) + "\n" + ", ".join(parts))
		"quests":
			_heading.text = "Quests"
			var stage := clampi(int(profile.get("world", {}).get("quest", 0)), 0, 3)
			var objectives := [
				"Speak to Warden Nera in Lantern Rest to accept the passage quest.",
				"Get a blade from Venn, stock up with Tamsin, and clear eight dungeon rooms, and defeat the Giant Black Spider.",
				"Open the treasure chamber beyond the boss, then reach Spindle Hollow and report to Watchkeeper Oren.",
				"Completed. You delivered Lantern Rest's signal and received 32 gold."
			]
			_section("Passage to Spindle Hollow", objectives[stage])
			_section("Moon Gates", "Activate each Dungeon Town's Moon Gate in person to register it for travel.")
		_:
			_heading.text = "Journal"
	show()
	_close.grab_focus()


func close() -> void:
	hide()
	closed.emit()


func _section(caption: String, body: String) -> void:
	_content.add_child(Style.label(caption, 19, Style.TEAL))
	var paragraph := Style.label(body, 16, Style.TEXT, true)
	paragraph.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_content.add_child(paragraph)

func _skill_card(skill: Dictionary) -> void:
	var card := Style.panel(_content, Style.SURFACE)
	var id: String = skill["id"]
	card.name = "Skill_" + id
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	Style.inset(card, 14, 12).add_child(column)
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 12)
	column.add_child(header)
	var icon := TextureRect.new()
	icon.custom_minimum_size = Vector2(32, 48)
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var icon_path := "res://assets/art/skills/%s.png" % id
	if ResourceLoader.exists(icon_path):
		icon.texture = load(icon_path)
	header.add_child(icon)
	var learned := bool(skill.get("learned", false))
	var rank := str(skill.get("rank", "Novice")) if learned else "Locked"
	var title := Style.label("%s · %s" % [skill.get("name", ""), rank], 19, Style.TEAL if learned else Style.MUTED)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	header.add_child(Style.label(str(skill.get("kind", "passive")).capitalize(), 13, Style.MUTED))
	var description := Style.label(str(skill.get("description", "")), 15, Style.TEXT, true)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(description)
	if not learned:
		var lock_message: String = skill.get("locked_reason", "")
		if lock_message.is_empty():
			lock_message = "Learn this skill at the School to begin training."
		var locked := Style.label(lock_message, 14, Style.MUTED, true)
		locked.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		column.add_child(locked)
		if bool(skill.get("can_learn", false)):
			var learn := Style.button("Learn · %s AP" % str(skill.get("learn_cost", 0)))
			learn.pressed.connect(learn_requested.emit.bind(id), CONNECT_DEFERRED)
			column.add_child(learn)
		return
	var effects: Dictionary = skill.get("effects", {})
	if not effects.is_empty():
		var parts: Array[String] = []
		for key in effects:
			parts.append("%s %s" % [str(key).replace("_", " ").capitalize(), str(effects[key])])
		var effect_text := Style.label(" · ".join(parts), 14, Style.TEXT, true)
		effect_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		column.add_child(effect_text)
	var threshold := float(skill.get("training_required", 0))
	if threshold > 0:
		var training := ProgressBar.new()
		training.custom_minimum_size.y = 6
		training.show_percentage = false
		training.max_value = threshold
		training.value = float(skill.get("training_points", 0))
		column.add_child(training)
		column.add_child(Style.label("Training %s / %s" % [str(training.value), str(threshold)], 14, Style.TEXT))
	for requirement: Dictionary in skill.get("training", []):
		var row := Style.label("%s · %s / %s" % [requirement.get("description", ""), str(requirement.get("count", 0)), str(requirement.get("target", 0))], 14, Style.TEXT, true)
		row.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		column.add_child(row)
	if bool(skill.get("can_study", false)):
		var study := Style.button("Study Skill")
		study.pressed.connect(study_requested.emit.bind(id), CONNECT_DEFERRED)
		column.add_child(study)
	var next_rank := str(skill.get("next_rank", ""))
	if not next_rank.is_empty():
		var advance := Style.button("Advance to %s · %s AP" % [next_rank, str(skill.get("ap_cost", 0))])
		advance.disabled = not bool(skill.get("can_advance", false))
		advance.tooltip_text = "Complete the required training and earn enough AP to advance."
		advance.pressed.connect(advance_requested.emit.bind(id), CONNECT_DEFERRED)
		column.add_child(advance)


func set_skill_status(message: String) -> void:
	_skill_status.text = message
	_skill_status.visible = not message.is_empty()
