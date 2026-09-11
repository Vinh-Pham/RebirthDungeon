class_name DungeonApplication
extends Node
## Persistent composition root. State Charts owns navigation; only validated
## requests authorize chart events. Phase 2 will extend the session contract.

signal observation_changed(observation: Dictionary)
signal mode_detached

const Mode = SessionShell.Mode
const MODE_VIEW = preload("res://scenes/ui/mode_view.tscn")
const REQUIRED := {
	"res://assets/art/dungeon_mark.svg": "Texture2D",
	"res://assets/fonts/shell_font.tres": "Font",
	"res://scenes/ui/shell_theme.tres": "Theme",
}
const EDGES := {
	Mode.MENU: [Mode.LOADING], Mode.LOADING: [Mode.TOWN, Mode.MENU],
	Mode.TOWN: [Mode.DUNGEON, Mode.MENU],
	Mode.DUNGEON: [Mode.BATTLE, Mode.RESULTS, Mode.MENU],
	Mode.BATTLE: [Mode.DUNGEON, Mode.RESULTS, Mode.MENU],
	Mode.RESULTS: [Mode.TOWN, Mode.MENU],
}

var _session := SessionShell.new()
var _chart: StateChart
var _view: ShellModeView
var _pending: int = -1
var _alive: bool = true
var _focused: bool = true
var _resources: Dictionary = {}
var loading_error: String = ""
## Explicit fault injection for fixtures; empty in normal startup.
var required_resource_overrides: Dictionary = {}
var development_enabled: bool = OS.is_debug_build()

@onready var _ui: Control = $UI/UIHost
@onready var _host: CenterContainer = $UI/UIHost/Layout/ModeHost
@onready var _status: Label = $UI/UIHost/Layout/Status

func _ready() -> void:
	preload("res://scripts/application/shell_input_map.gd").configure()
	preload("res://scripts/application/addon_lifecycle.gd").configure_runtime()
	_build_chart()

func observation() -> Dictionary:
	return _session.observation()

func _build_chart() -> void:
	_chart = StateChart.new()
	_chart.name = "ModeChart"
	_chart.initial_expression_properties = {"authorized_target": -1}
	var root := CompoundState.new()
	root.name = "Modes"
	_chart.add_child(root)
	for mode: int in Mode.values():
		var state := AtomicState.new()
		state.name = Mode.keys()[mode].capitalize()
		root.add_child(state)
		state.state_entered.connect(_on_mode_entered.bind(mode))
	root.initial_state = NodePath("Menu")
	for mode: int in EDGES:
		var state := root.get_child(mode) as AtomicState
		for target: int in EDGES[mode]:
			var transition := Transition.new()
			transition.name = "To" + Mode.keys()[target].capitalize()
			transition.event = StringName("to_%d" % target)
			transition.to = NodePath("../../" + Mode.keys()[target].capitalize())
			var guard := ExpressionGuard.new()
			guard.expression = "authorized_target == %d" % target
			transition.guard = guard
			state.add_child(transition)
	add_child(_chart)

func request_mode(target: int, id: int, revision: int) -> bool:
	if not _alive or not _focused or not is_instance_valid(_view) or _pending != -1:
		return false
	if not _session.matches(id, revision) or not EDGES[_session.mode].has(target):
		return false
	if target != Mode.MENU and not development_enabled:
		return false
	if target == Mode.TOWN and _session.mode == Mode.LOADING and (_resources.is_empty() or not loading_error.is_empty()):
		return false
	_pending = target
	_view.set_input_enabled(false)
	_chart.set_expression_property(&"authorized_target", target)
	_chart.send_event(StringName("to_%d" % target))
	return true

func _on_intent(target: int, id: int, revision: int, source_ref: WeakRef) -> void:
	var source := source_ref.get_ref() as ShellModeView
	if is_instance_valid(source) and source == _view and source.is_inside_tree():
		request_mode(target, id, revision)

func _on_mode_entered(mode: int) -> void:
	if not _alive:
		return
	if _pending != -1:
		assert(_pending == mode)
		_session.mode = mode as SessionShell.Mode
		_session.revision += 1
		_pending = -1
	_chart.set_expression_property(&"authorized_target", -1)
	_replace_view()
	observation_changed.emit(observation())
	if mode == Mode.LOADING:
		_load_required.call_deferred(_session.session_id, _session.revision)
	elif mode == Mode.MENU and _resources.is_empty() and loading_error.is_empty():
		_load_required.call_deferred(_session.session_id, _session.revision, false)

func _replace_view() -> void:
	if is_instance_valid(_view):
		_view.detach()
		_host.remove_child(_view)
		_view.queue_free()
		mode_detached.emit()
	_view = MODE_VIEW.instantiate() as ShellModeView
	_host.add_child(_view)
	var heading: String = Mode.keys()[_session.mode].capitalize()
	var description := "Development fixture · navigation only.\nGameplay and saving are not implemented."
	var choices: Dictionary = {}
	match _session.mode:
		Mode.MENU:
			heading = "Rebirth Dungeon"
			description = "Explore. Master. Begin again.\nApplication shell · development preview"
			if not loading_error.is_empty():
				description = loading_error
			if development_enabled:
				choices[Mode.LOADING] = "Open development fixtures"
		Mode.LOADING:
			description = "Loading required presentation resources…"
			if not loading_error.is_empty():
				description = loading_error
			choices[Mode.MENU] = "Back to menu"
		Mode.TOWN:
			choices[Mode.DUNGEON] = "Open dungeon fixture"
		Mode.DUNGEON:
			choices[Mode.BATTLE] = "Open battle fixture"
			choices[Mode.RESULTS] = "Open results fixture"
		Mode.BATTLE:
			choices[Mode.DUNGEON] = "Return to dungeon fixture"
			choices[Mode.RESULTS] = "Open results fixture"
		Mode.RESULTS:
			choices[Mode.TOWN] = "Return to town fixture"
	if _session.mode not in [Mode.MENU, Mode.LOADING]:
		choices[Mode.MENU] = "Back to menu"
	_view.configure(observation(), heading, description, choices)
	_view.intent_requested.connect(_on_intent.bind(weakref(_view)))
	_view.set_input_enabled(_focused)
	_status.text = "Phase 1 · session %d · revision %d · %s" % [_session.session_id, _session.revision, heading]

func _load_required(id: int, revision: int, advance: bool = true) -> void:
	if not _alive or not _session.matches(id, revision):
		return
	if _session.mode != Mode.LOADING and (advance or _session.mode != Mode.MENU):
		return
	_resources.clear()
	loading_error = ""
	var candidate: Dictionary = {}
	for path: String in REQUIRED:
		var actual: String = required_resource_overrides.get(path, path)
		if not ResourceLoader.exists(actual):
			loading_error = "Required resource missing: %s\nRestore this file, then return to menu and retry." % actual
			break
		var resource := load(actual)
		if resource == null or not resource.is_class(REQUIRED[path]):
			loading_error = "Required resource must be %s: %s\nRepair this file, then return to menu and retry." % [REQUIRED[path], actual]
			break
		candidate[path] = resource
	if not loading_error.is_empty():
		_replace_view()
		return
	_resources = candidate
	_ui.theme = candidate["res://scenes/ui/shell_theme.tres"]
	$UI/UIHost/Layout/Mark.texture = candidate["res://assets/art/dungeon_mark.svg"]
	if advance and _focused:
		request_mode(Mode.TOWN, id, revision)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		set_application_focused(false)
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
		set_application_focused(true)

func set_application_focused(focused: bool) -> void:
	_focused = focused
	for action: StringName in InputMap.get_actions():
		Input.action_release(action)
	if is_instance_valid(_view):
		_view.set_input_enabled(focused and _pending == -1)
	if focused and _session.mode == Mode.LOADING and not _resources.is_empty() and loading_error.is_empty():
		request_mode(Mode.TOWN, _session.session_id, _session.revision)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"shell_back") and not event.is_echo():
		request_mode(Mode.MENU, _session.session_id, _session.revision)
		get_viewport().set_input_as_handled()

func _exit_tree() -> void:
	_alive = false
	_session.invalidate()
	_resources.clear()
	if is_instance_valid(_view):
		_view.detach()
	## No production DialogueManager/QuestSystem subscriptions exist in Phase 1.
	## Camera registrations are owned by camera nodes and removed on tree exit.
