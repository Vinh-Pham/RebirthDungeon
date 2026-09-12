extends Control
## Persistent HUD. Stable dice and focus; all gameplay comes from copied observations.
signal command_requested(intent: Dictionary)
signal continue_requested(session_id: int, revision: int)
signal retry_requested
const Flow = preload("res://scripts/presentation/battle_flow.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
var durable_saves: bool = false
var flow: Node
var stage: Node2D
var snapshot: Dictionary = {}
var dice: Array[Button] = []
var actions: Dictionary = {}
var _buttons: Array[Button] = []
var _enabled: bool = true
var _request_pending: bool = false
var _serial: int = 0
var _save_state: String = "idle"
var _reason: String = ""
var _modal: bool = false
var _opener: WeakRef
var _pointer: int = -1
var _touches: Dictionary = {}
var _touch_button: Button
var _touch_start: Vector2
var _dragged: bool = false
var text_scale: float = 1.0
var reduced_motion: bool = false
var safe_insets := Vector4.ZERO
var compact: bool = false
var _safe: MarginContainer
var _layout: VBoxContainer
var _header: Label
var _selection: Label
var _summary: Label
var _cost: Label
var _notice: Label
var _feedback: HBoxContainer
var _action_row: HBoxContainer
var _resource_text: Dictionary = {}
var _bars: Dictionary = {}
var _enemy_intent: Label
var _stage_box: SubViewportContainer
var _inspector: PanelContainer
var _inline_info: RichTextLabel
var _modal_root: Control
var _sheet_title: Label
var _sheet_info: RichTextLabel
var _skill_list: VBoxContainer
var _sheet_scroll: ScrollContainer
var _sheet_margin: MarginContainer
var _close: Button
var _settings: HBoxContainer
var _body_theme: Theme

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_body_theme = load("res://scenes/battle/battle_theme.tres").duplicate(true)
	$CanvasLayer/HUD.theme = _body_theme
	_build()
	flow = Flow.new()
	flow.phase_changed.connect(_phase_changed)
	add_child(flow)
	get_viewport().size_changed.connect(_reflow)
	_reflow()

func _build() -> void:
	var hud: Control = $CanvasLayer/HUD
	_safe = MarginContainer.new()
	_safe.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.add_child(_safe)
	_layout = VBoxContainer.new()
	_safe.add_child(_layout)
	var header := HBoxContainer.new()
	_layout.add_child(header)
	_header = _label(header,"UNDERCRYPT",22)
	_header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_header.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_button(header,"Inspect / Menu",open_details,"Inspect")
	var resources := HBoxContainer.new()
	_layout.add_child(resources)
	for actor_id: String in ["hero","enemy.0"]:
		var panel := PanelContainer.new()
		panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		resources.add_child(panel)
		var column := VBoxContainer.new()
		panel.add_child(column)
		var row := HBoxContainer.new()
		column.add_child(row)
		for pool: int in (3 if actor_id == "hero" else 1):
			var block := VBoxContainer.new()
			block.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			row.add_child(block)
			var key := actor_id + str(pool)
			_resource_text[key] = _label(block,"",16)
			var bar := ProgressBar.new()
			bar.show_percentage = false
			bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
			bar.custom_minimum_size.y = 5
			block.add_child(bar)
			_bars[key] = bar
		if actor_id == "enemy.0": _enemy_intent = _label(column,"",16)
	_stage_box = SubViewportContainer.new()
	_stage_box.stretch = true
	_stage_box.focus_mode = Control.FOCUS_NONE
	_stage_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_stage_box.custom_minimum_size.y = 48
	_layout.add_child(_stage_box)
	var viewport := SubViewport.new()
	viewport.world_2d = World2D.new()
	viewport.disable_3d = true
	viewport.handle_input_locally = false
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_stage_box.add_child(viewport)
	stage = load("res://scenes/battle/stage.tscn").instantiate()
	viewport.add_child(stage)
	var deck := HBoxContainer.new()
	_layout.add_child(deck)
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	deck.add_child(panel)
	var controls := VBoxContainer.new()
	panel.add_child(controls)
	var choice := HBoxContainer.new()
	controls.add_child(choice)
	_selection = _label(choice,"Choose a skill",18)
	_selection.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_selection.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_selection.max_lines_visible = 2
	_selection.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	actions["select_skill"] = _button(choice,"Choose skill",open_skills,"Skills")
	actions["use_potion"] = _button(choice,"Potion",func(): send_action("use_potion"),"Potion")
	var dice_row := HBoxContainer.new()
	controls.add_child(dice_row)
	for i: int in 5:
		var die := _button(dice_row,"—",func(): send_action("keep",[i]),"Die%d" % i)
		die.custom_minimum_size = Vector2(56,64)
		die.add_theme_font_size_override("font_size",24)
		die.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		dice.append(die)
	_summary = _label(controls,"Five dice · two rerolls",18)
	_summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_cost = _label(controls,"",16)
	_cost.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var action_row := HBoxContainer.new()
	_action_row = action_row
	controls.add_child(action_row)
	for kind: String in ["roll","reroll","commit","pass"]:
		var button := _button(action_row,{"roll":"Roll","reroll":"Reroll","commit":"Use Skill","pass":"Pass"}[kind],
			func(): send_action(kind),"Action_" + kind)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		actions[kind] = button
	var feedback := HBoxContainer.new()
	_feedback = feedback
	controls.add_child(feedback)
	_notice = _label(feedback,"",16)
	_notice.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	actions["retry"] = _button(feedback,"Retry same action",func(): retry_requested.emit(),"Retry")
	actions["continue"] = _button(feedback,"Return",_continue,"Continue")
	_inspector = PanelContainer.new()
	_inspector.custom_minimum_size.x = 300
	deck.add_child(_inspector)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_inspector.add_child(scroll)
	_inline_info = _rich(scroll)
	_modal_root = Control.new()
	_modal_root.name = "InspectionSheet"
	_modal_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.add_child(_modal_root)
	var shade := ColorRect.new()
	shade.color = Color(0.015,0.025,0.03,0.94)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_modal_root.add_child(shade)
	var margin := MarginContainer.new()
	_sheet_margin = margin
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side: String in ["left","right","top","bottom"]: margin.add_theme_constant_override("margin_" + side,24)
	_modal_root.add_child(margin)
	var sheet := PanelContainer.new()
	margin.add_child(sheet)
	var body := VBoxContainer.new()
	sheet.add_child(body)
	var top := HBoxContainer.new()
	body.add_child(top)
	_sheet_title = _label(top,"Battle inspection",22)
	_sheet_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_close = _button(top,"Close / Back",close_sheet,"CloseSheet")
	_sheet_scroll = ScrollContainer.new()
	_sheet_scroll.follow_focus = true
	_sheet_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_sheet_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(_sheet_scroll)
	var contents := VBoxContainer.new()
	contents.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_sheet_scroll.add_child(contents)
	_skill_list = VBoxContainer.new()
	contents.add_child(_skill_list)
	_sheet_info = _rich(contents)
	var pages := HBoxContainer.new()
	body.add_child(pages)
	_button(pages,"Page up",func(): scroll_details(-1),"PageUp")
	_button(pages,"Page down",func(): scroll_details(1),"PageDown")
	_settings = HBoxContainer.new()
	body.add_child(_settings)
	_button(_settings,"Text −",func(): set_text_scale(text_scale - 0.1),"TextSmaller")
	_button(_settings,"Text +",func(): set_text_scale(text_scale + 0.1),"TextLarger")
	_button(_settings,"Reduced motion",func(): set_reduced_motion(not reduced_motion),"ReducedMotion")
	_button(_settings,"Skip motion",func(): stage.skip_motion(),"SkipMotion")
	_modal_root.hide()

func configure(observation: Dictionary, _catalog: RefCounted) -> void:
	present(observation,[])

func present(observation: Dictionary, events: Array = [], save_state: String = "idle") -> void:
	snapshot = observation.duplicate(true)
	_save_state = save_state
	_request_pending = false
	_reason = ""
	flow.observe(snapshot,events,save_state)
	stage.present(snapshot,events)
	_render()

func _phase_changed(_phase: String) -> void:
	if not snapshot.is_empty(): _render()

func _render() -> void:
	var battle: Dictionary = snapshot.battle
	var hero: Dictionary = snapshot.hero
	var enemy: Dictionary = battle.enemies[0]
	_header.text = "%s  /  %s" % [battle.encounter_id.trim_prefix("encounter.").to_upper(), _phase_label()]
	for actor: Dictionary in [hero,enemy]:
		for pool: int in (3 if actor.instance_id == "hero" else 1):
			var key: String = actor.instance_id + str(pool)
			_resource_text[key].text = "%s %d/%d" % [["HP","MP","SP"][pool] if actor.instance_id == "hero" else "Sentinel HP",actor.current[pool],actor.maximum[pool]]
			_bars[key].max_value = maxi(1,actor.maximum[pool])
			_bars[key].value = actor.current[pool]
	_enemy_intent.text = "Next: Strike · 3 SP" if enemy.current[2] >= 3 else "Next: Pass · recover 2 SP"
	if not battle.outcome.is_empty(): _enemy_intent.text = "Encounter ended"
	var skill: String = battle.selected_skill
	var selected: Dictionary = battle.options.get(skill,{})
	_selection.text = "Choose a skill before rolling" if selected.is_empty() else "Target: %s%s\n%s · Rank %s" % [selected.target_name,"  [Locked]" if battle.phase == 1 else "",selected.name,selected.rank]
	for i: int in 5:
		dice[i].text = "%d\n%s" % [battle.hand[i],"Kept · %d" % (i+1) if battle.kept[i] else "Die %d" % (i+1)] if battle.hand.size() == 5 else "—\nDie %d" % (i+1)
		dice[i].tooltip_text = "Keep or release die %d · shortcut %d" % [i+1,i+1]
	if battle.preview.is_empty():
		_summary.text = "Five dice · %d rerolls remaining" % battle.rerolls_remaining
	else:
		var p: Dictionary = battle.preview
		_summary.text = "%d pips · %s ×%s · %d %s · %d rerolls" % [p.pips,Limits.COMBINATIONS[p.combination].replace("_"," "),battle.multiplier,p.amount,
			"shield" if battle.locked_inputs.effect == "shield" else "damage",battle.rerolls_remaining]
	if battle.phase == 1 and battle.locked_inputs.effect == "stat_buff":
		_summary.text = "Apply %s · %d owner activations · %d rerolls" % [String(battle.locked_inputs.status_id).trim_prefix("status."),battle.locked_inputs.duration,battle.rerolls_remaining]
	var costs: Variant = hero.reserved if battle.phase == 1 else selected.get("costs",[0,0,0])
	_cost.text = "%s HP %d / MP %d / SP %d%s" % ["Reserved:" if battle.phase == 1 else "Cost:",costs[0],costs[1],costs[2]," · Pass pays this cost" if battle.phase == 1 else " · Pass has no skill cost"]
	if not battle.outcome.is_empty():
		_selection.text = "Encounter complete"
		_summary.text = "All activations resolved"
		_cost.text = "Rewards remain pending until the dungeon exit." if battle.outcome == "victory" else "Return to review the expedition outcome."
	actions["use_potion"].text = "Potion ×%d" % snapshot.hero.potions
	actions["pass"].text = "Paid Pass" if battle.phase == 1 else "Free Pass"
	actions["retry"].visible = _save_state == "failed"
	actions["continue"].visible = not battle.outcome.is_empty() and _save_state == "idle"
	actions["continue"].text = "Return to dungeon" if battle.outcome == "victory" else "View results"
	_notice.text = _reason
	if _save_state == "pending": _notice.text = ("Saving · actions locked" if durable_saves else "Simulated save pending · actions locked")
	elif _save_state == "failed": _notice.text = ("Save failed · Retry keeps the same result" if durable_saves else "Simulated save failed · Retry keeps the same result")
	elif not battle.outcome.is_empty(): _notice.text = "Victory · %d pending gold" % battle.pending_gold if battle.outcome == "victory" else "Defeat · expedition rewards lost"
	_feedback.visible = _save_state != "idle" or not battle.outcome.is_empty()
	if not _reason.is_empty(): _header.text = _reason
	_action_row.visible = _save_state == "idle" and battle.outcome.is_empty()
	var info: String = _inspection_text()
	_inline_info.text = info
	_sheet_info.text = info
	_refresh_controls()

func _refresh_controls() -> void:
	if snapshot.is_empty(): return
	var battle: Dictionary = snapshot.battle
	var available: Dictionary = battle.availability
	for kind: String in ["select_skill","roll","reroll","commit","pass","use_potion"]:
		actions[kind].disabled = not _can(kind) or not String(available.get(kind,"")).is_empty()
		actions[kind].tooltip_text = available.get(kind,"")
	for die: Button in dice:
		die.disabled = not _can("keep")
	actions["continue"].disabled = not _enabled or _modal or _request_pending or _save_state != "idle" or flow.current != "Outcome"
	actions["retry"].disabled = not _enabled or _request_pending or _modal
	_focus_chain()

func _can(kind: String) -> bool:
	return _enabled and not _modal and not _request_pending and _save_state == "idle" and flow.permits(kind)

func send_action(kind: String, indices: Array = []) -> void:
	if not _can(kind) or not String(snapshot.battle.availability.get(kind,"")).is_empty(): return
	if kind == "reroll":
		indices = []
		for i: int in 5:
			if not snapshot.battle.kept[i]: indices.append(i)
		if indices.is_empty(): return
	_emit(kind,"","",indices)

func choose_skill(id: String) -> void:
	var option: Dictionary = snapshot.battle.options.get(id,{})
	if option.is_empty() or not String(option.unavailable).is_empty() or not _enabled or _request_pending or _save_state != "idle": return
	close_sheet()
	if not _can("select_skill"): return
	_emit("select_skill",id,option.target_id,[])

func _emit(kind: String, skill: String, target: String, indices: Array) -> void:
	_request_pending = true # Immediately latches double clicks before the deferred application callback.
	_serial += 1
	var intent := {"session_id":snapshot.session_id,"expected_revision":snapshot.revision,
		"operation_id":"hud:%d:%d:%d" % [snapshot.session_id,snapshot.revision,_serial],
		"kind":kind,"actor_id":"hero","skill_id":skill,"target_id":target}
	if kind in ["keep","reroll"]: intent.indices = indices.duplicate()
	_refresh_controls()
	command_requested.emit(intent)

func _continue() -> void:
	if actions["continue"].disabled or _request_pending: return
	_request_pending = true
	_refresh_controls()
	continue_requested.emit(snapshot.session_id,snapshot.revision)

func set_input_enabled(enabled: bool) -> void:
	_enabled = enabled
	if not enabled:
		_pointer = -1
		_touch_button = null
	_refresh_controls()

func show_rejection(code: String) -> void:
	_request_pending = false
	_reason = code.replace("_"," ").capitalize()
	_render()

func open_details() -> void:
	_open_sheet("Battle inspection")
	_skill_list.hide()
	_settings.show()

func open_skills() -> void:
	if not _can("select_skill"): return
	_open_sheet("Choose a skill and target")
	_settings.hide()
	_skill_list.show()
	for child: Node in _skill_list.get_children():
		_skill_list.remove_child(child)
		child.queue_free()
	for id: String in snapshot.battle.options:
		var option: Dictionary = snapshot.battle.options[id]
		var button := Button.new()
		button.custom_minimum_size.y = 48
		button.text = "%s · %s → %s · HP/MP/SP %d/%d/%d" % [option.name,option.rank,option.target_name,option.costs[0],option.costs[1],option.costs[2]]
		button.disabled = not String(option.unavailable).is_empty()
		button.pressed.connect(choose_skill.bind(id))
		_skill_list.add_child(button)
		_label(_skill_list,"Unavailable: " + option.unavailable if button.disabled else option.odds,16)
	_focus_chain()

func _open_sheet(title: String) -> void:
	if not _enabled: return
	_opener = weakref(get_viewport().gui_get_focus_owner())
	_modal = true
	_sheet_title.text = title
	_modal_root.show()
	_sheet_scroll.scroll_vertical = 0
	for action: StringName in InputMap.get_actions(): Input.action_release(action)
	_refresh_controls()
	_close.grab_focus()

func scroll_details(direction: int) -> void:
	if _enabled and _modal:
		_sheet_scroll.scroll_vertical += roundi(direction * _sheet_scroll.size.y * 0.8)

func close_sheet() -> void:
	if not _modal: return
	_modal = false
	_modal_root.hide()
	_refresh_controls()
	var opener: Variant = _opener.get_ref() if _opener != null else null
	if is_instance_valid(opener) and opener.is_inside_tree() and opener.is_visible_in_tree() and not opener.disabled:
		opener.grab_focus()

func _inspection_text() -> String:
	if snapshot.is_empty(): return ""
	var battle: Dictionary = snapshot.battle
	var text := "SKILLS & FACE ODDS\n"
	for id: String in battle.options:
		var option: Dictionary = battle.options[id]
		text += "%s · Rank %s → %s\n%s\nHP/MP/SP %d/%d/%d · %s\n\n" % [option.name,option.rank,option.target_name,option.odds,option.costs[0],option.costs[1],option.costs[2],option.unavailable if not option.unavailable.is_empty() else "Available before rolling"]
	if not battle.preview.is_empty():
		var lock: Dictionary = battle.locked_inputs
		text += "LOCKED EFFECT\n"
		if lock.effect == "shield":
			text += "floor((base %d + %d × %d pips) × %s)\nReplace shield with %d · duration %d\n\n" % [lock.base,lock.pip_scale,battle.preview.pips,battle.multiplier,battle.preview.amount,lock.duration]
		elif lock.effect == "stat_buff":
			text += "Apply %s · duration %d owner activations\nFixed status magnitude; dice do not scale it.\n\n" % [String(lock.status_id).trim_prefix("status."),lock.duration]
		else:
			text += "Base %d + attack %d + %d × %d pips\nSubtract defense %d, then ×%s and floor\nProtection %d bp, then floor\nShield absorbs %d · HP damage %d\n\n" % [lock.base,lock.attack,lock.pip_scale,battle.preview.pips,lock.defense,battle.multiplier,lock.protection,battle.preview.absorbed,battle.preview.amount]
	text += "RESOURCES & STATUSES\n"
	for actor: Dictionary in [snapshot.hero,battle.enemies[0]]:
		text += "%s · Shield %d\n" % [actor.instance_id,actor.shield]
		for i: int in 3: text += "%s %d/%d · reserved %d · available %d\n" % [["HP","MP","SP"][i],actor.current[i],actor.maximum[i],actor.reserved[i],actor.current[i]-actor.reserved[i]]
		for status: Dictionary in actor.statuses:
			text += "%s · source %s · %d owner activations\n" % [status.definition_id.trim_prefix("status."),status.source_id,status.remaining_activations]
	text += "\nACTION AVAILABILITY\n"
	for kind: String in battle.availability:
		text += "%s: %s\n" % [kind.capitalize(),battle.availability[kind] if not String(battle.availability[kind]).is_empty() else "Available"]
	text += "\nCOMBINATIONS\nNone ×1 · Pair ×1.5 · Two pairs ×2\nThree of a kind ×2.5 · Straight ×3\nFull house ×3.5 · Four of a kind ×5 · Five of a kind ×10\n\nCONTROLS\nTab / arrows or D-pad: focus · Enter / A: activate\n1–5: keep dice · Escape / B: close this sheet\nTouch: tap a control; dragging cancels it.\n\nMotion: %s · Text: %d%%" % ["reduced" if reduced_motion else "standard",roundi(text_scale*100)]
	return text

func _phase_label() -> String:
	if durable_saves and flow.current in ["Saving","SaveFailed"]: return "Saving" if flow.current == "Saving" else "Save failed"
	return {"Selection":"Choose","Locked":"Locked hand","Resolved":"Action resolved","Enemy":"Sentinel","Outcome":"Outcome","Saving":"Saving test","SaveFailed":"Save failed test"}.get(flow.current,"Battle")

func set_text_scale(value: float) -> void:
	text_scale = clampf(value,1.0,1.4)
	_body_theme.default_font_size = roundi(18 * text_scale)
	for label: Node in find_children("*","Label",true,false):
		label.add_theme_font_size_override("font_size",roundi(16*text_scale))
	_reflow()
	if not snapshot.is_empty(): _render()

func set_reduced_motion(value: bool) -> void:
	reduced_motion = value
	stage.set_reduced_motion(value)
	if not snapshot.is_empty(): _render()

func set_safe_insets(value: Vector4) -> void:
	safe_insets = value
	_reflow()

func _reflow() -> void:
	if not is_instance_valid(_safe): return
	var dimensions := get_viewport_rect().size
	if dimensions.x <= 0 or dimensions.y <= 0: return
	var inset := safe_insets
	if inset == Vector4.ZERO and OS.has_feature("mobile"):
		var physical := DisplayServer.get_display_safe_area()
		var window_size := Vector2(DisplayServer.window_get_size())
		if window_size.x > 0 and window_size.y > 0:
			var ratio := dimensions / window_size
			inset = Vector4(physical.position.x*ratio.x,physical.position.y*ratio.y,(window_size.x-physical.end.x)*ratio.x,(window_size.y-physical.end.y)*ratio.y)
	for i: int in 4:
		_safe.add_theme_constant_override("margin_" + ["left","top","right","bottom"][i],12+roundi(maxf(0,inset[i])))
		_sheet_margin.add_theme_constant_override("margin_" + ["left","top","right","bottom"][i],16+roundi(maxf(0,inset[i])))
	var usable := dimensions - Vector2(inset.x+inset.z,inset.y+inset.w) - Vector2(24,24)
	compact = usable.x < 1150 * text_scale or usable.y < 680 * text_scale
	_inspector.visible = not compact
	_layout.add_theme_constant_override("separation",4 if compact else 8)
	_stage_box.custom_minimum_size.y = 24 if compact and text_scale > 1.15 else 48
	_focus_chain()

func _focus_chain() -> void:
	if not is_inside_tree(): return
	var candidates: Array[Button] = []
	var root: Node = _modal_root if _modal else _safe
	for node: Node in root.find_children("*","Button",true,false):
		if node.is_visible_in_tree() and not node.disabled: candidates.append(node)
	for i: int in candidates.size():
		var previous: Button = candidates[posmod(i-1,candidates.size())]
		var next: Button = candidates[(i+1)%candidates.size()]
		candidates[i].focus_next = candidates[i].get_path_to(next)
		candidates[i].focus_previous = candidates[i].get_path_to(previous)
		candidates[i].focus_neighbor_right = candidates[i].focus_next
		candidates[i].focus_neighbor_bottom = candidates[i].focus_next
		candidates[i].focus_neighbor_left = candidates[i].focus_previous
		candidates[i].focus_neighbor_top = candidates[i].focus_previous
	var focused := get_viewport().gui_get_focus_owner()
	if _enabled and not candidates.is_empty() and (focused == null or not focused.is_visible_in_tree() or focused not in candidates):
		candidates[0].grab_focus()

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			_touches[event.index] = true
			if _touches.size() == 1 and _enabled:
				_pointer = event.index
				_touch_start = event.position
				_dragged = false
				_touch_button = _button_at(event.position)
		else:
			var button := _touch_button
			var activate: bool = event.index == _pointer and not _dragged and _enabled and is_instance_valid(button) and button.get_global_rect().has_point(event.position)
			_touches.erase(event.index)
			if event.index == _pointer:
				_pointer = -1
				_touch_button = null
			if activate and not button.disabled and button.is_visible_in_tree():
				button.grab_focus()
				button.pressed.emit()
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag:
		if event.index == _pointer:
			if event.position.distance_to(_touch_start) > 12: _dragged = true
			if _modal and _dragged: _sheet_scroll.scroll_vertical -= roundi(event.relative.y)
		get_viewport().set_input_as_handled()

func _button_at(point: Vector2) -> Button:
	var root: Node = _modal_root if _modal else _safe
	for node: Node in root.find_children("*","Button",true,false):
		if node.is_visible_in_tree() and node.get_global_rect().has_point(point):
			return node as Button
	return null

func _unhandled_input(event: InputEvent) -> void:
	if _modal and (event.is_action_pressed("ui_page_up") or event.is_action_pressed("ui_page_down")):
		scroll_details(1 if event.is_action_pressed("ui_page_down") else -1)
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("shell_back") and not event.is_echo():
		if _modal: close_sheet()
		else: open_details()
		get_viewport().set_input_as_handled()
		return
	for i: int in 5:
		if event.is_action_pressed("battle_keep_%d" % i) and not event.is_echo():
			send_action("keep",[i])
			get_viewport().set_input_as_handled()

func _label(parent: Node, text: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size",font_size)
	parent.add_child(label)
	return label

func _rich(parent: Node) -> RichTextLabel:
	var rich := RichTextLabel.new()
	rich.focus_mode = Control.FOCUS_NONE # The inspection sheet supplies keyboard/controller paging.
	rich.fit_content = true
	rich.scroll_active = false
	rich.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(rich)
	return rich

func _button(parent: Node, text: String, callback: Callable, id: String) -> Button:
	var button := Button.new()
	button.name = id
	button.text = text
	button.custom_minimum_size.y = 48
	button.pressed.connect(callback)
	parent.add_child(button)
	_buttons.append(button)
	return button
