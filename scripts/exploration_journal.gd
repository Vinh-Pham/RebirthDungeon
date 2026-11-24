extends Control

signal closed

const Style = preload("res://scripts/menu_style.gd")
const Data = preload("res://scripts/character_data.gd")
const Combat = preload("res://scripts/spider_encounter.gd")
const Stats = preload("res://scripts/character_stats.gd")

var _heading: Label
var _content: VBoxContainer
var _close: Button


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
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(scroll)
	_content = VBoxContainer.new()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_theme_constant_override("separation", 16)
	scroll.add_child(_content)


func open(section: String, profile: Dictionary, stats: Dictionary) -> void:
	for child in _content.get_children():
		_content.remove_child(child)
		child.queue_free()
	match section:
		"skills":
			_heading.text = "Skills"
			_section("Ability Points", "%d AP available from your character's levels." % int(stats.get("ability_points", 0)))
			_section("Normal Attack", "Costs %d stamina. Interrupts Smash. A defending opponent reduces the damage." % Combat.ATTACK_COST)
			_section("Defend", "Restores %d stamina. Halves damage from normal attacks. Smash breaks the guard." % Combat.GUARD_RECOVERY)
			_section("Smash", "Costs %d stamina. Adds 3 damage and bypasses the Defend stance. Normal Attack interrupts it." % Combat.SMASH_COST)
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
				"Get a blade from Venn, stock up with Tamsin, and clear the White Spider from the eastern crossing.",
				"Reach Spindle Hollow through the Threshold and report to Watchkeeper Oren.",
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
