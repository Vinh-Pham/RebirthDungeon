extends CanvasLayer
## Game-owned Dialogue Manager renderer. Traversal is read-only; only an explicit
## confirmation emits a command. Epoch checks discard awaited obsolete lines.
signal closed
signal confirmed(kind: String)
var can_buy: bool = false
var can_enter: bool = false
var snapshot: Dictionary = {}
var validator: Callable
var _epoch: int = 0
var _busy: bool = false
var _body: VBoxContainer
var _resource: DialogueResource
var _live: bool = true

func start(observation: Dictionary, cue: String, valid: Callable) -> void:
	snapshot = observation.duplicate(true)
	validator = valid
	can_buy = snapshot.hero.committed_gold >= 5 and snapshot.hero.potions < 5
	can_enter = snapshot.hero.current[0] > 0
	layer = 10
	name = "TownDialogue"
	var blocker := ColorRect.new()
	blocker.color = Color(0.02,0.04,0.05,0.94)
	blocker.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(blocker)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for edge: String in ["left","right","top","bottom"]: margin.add_theme_constant_override("margin_"+edge,32)
	blocker.add_child(margin)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	_body = VBoxContainer.new()
	_body.theme = load("res://scenes/battle/battle_theme.tres")
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation",12)
	scroll.add_child(_body)
	_resource = ResourceLoader.load("res://content/dialogue/haven.dialogue","",ResourceLoader.CACHE_MODE_IGNORE)
	advance(cue)

func advance(cue: String) -> void:
	if not _valid() or _busy: return
	_busy = true
	_epoch += 1
	var epoch := _epoch
	var line: DialogueLine = await Engine.get_singleton("DialogueManager").get_next_dialogue_line(_resource,cue,[self])
	_clear_runtime_references()
	if epoch != _epoch or not _valid(): return
	_busy = false
	if line == null:
		dismiss()
		return
	for child: Node in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	var heading := Label.new()
	heading.text = line.character + "  /  %d gold · %d / 5 potions\nHP %d / %d · MP %d / %d · SP %d / %d" % [snapshot.hero.committed_gold,snapshot.hero.potions,snapshot.hero.current[0],snapshot.hero.maximum[0],snapshot.hero.current[1],snapshot.hero.maximum[1],snapshot.hero.current[2],snapshot.hero.maximum[2]]
	heading.add_theme_font_size_override("font_size",24)
	heading.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.add_child(heading)
	var text := Label.new()
	text.text = line.text
	if line.get_tag_value("service") == "abandon":
		text.text += "\nPending gold to lose: %d" % snapshot.exploration.get("pending_gold",0)
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.add_child(text)
	if line.has_tag("service"):
		var kind: String = line.get_tag_value("service")
		_button("Confirm",func() -> void:
			if not _valid() or _busy: return
			_busy = true
			confirmed.emit(kind))
	elif not line.responses.is_empty():
		for response: DialogueResponse in line.responses:
			if response.is_allowed:
				_button(response.text,advance.bind(response.next_id))
	else:
		_button("Continue",advance.bind(line.next_id))
	_button("Cancel conversation",dismiss)
	var buttons: Array[Button] = []
	for child: Node in _body.get_children():
		if child is Button: buttons.append(child)
	for i: int in buttons.size():
		buttons[i].focus_next = buttons[i].get_path_to(buttons[(i+1)%buttons.size()])
		buttons[i].focus_previous = buttons[i].get_path_to(buttons[(i-1+buttons.size())%buttons.size()])
		buttons[i].focus_neighbor_bottom = buttons[i].focus_next
		buttons[i].focus_neighbor_top = buttons[i].focus_previous
	var first := _body.get_child(2) as Button
	if first != null: first.grab_focus()

func _button(text: String, callback: Callable) -> void:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 52
	button.pressed.connect(callback,CONNECT_DEFERRED)
	_body.add_child(button)

func _valid() -> bool:
	return _live and is_inside_tree() and validator.is_valid() and validator.call()

func dismiss() -> void:
	if not _live: return
	_live = false
	_epoch += 1
	var owner := get_viewport().gui_get_focus_owner()
	if owner != null: owner.release_focus()
	closed.emit()

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("shell_back") and not event.is_echo():
		get_viewport().set_input_as_handled()
		dismiss()

func _exit_tree() -> void:
	_live = false
	_epoch += 1
	validator = Callable()
	_clear_runtime_references()
	_resource = null
	snapshot.clear()

func _clear_runtime_references() -> void:
	# DM 4.1 annotates its working line dictionary with the Resource itself.
	# This private load avoids shared-definition mutation; remove the self-cycle.
	if _resource != null:
		for data: Dictionary in _resource.lines.values(): data.erase("resource")
