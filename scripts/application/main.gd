class_name DungeonApplication
extends Node
## Persistent composition root. State Charts owns navigation; only validated
## requests authorize chart events; the session owns the domain state.

signal observation_changed(observation: Dictionary)
signal mode_detached
signal accepted_result(event: Dictionary)

const Catalog = preload("res://scripts/data/content_catalog.gd")
const Manifest = preload("res://scripts/data/definitions/catalog_manifest.gd")
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const ActorDefinitionType = preload("res://scripts/data/definitions/actor_definition.gd")
const Resolver = preload("res://scripts/domain/commands/command_resolver.gd")
const ExplorationState = preload("res://scripts/domain/state/exploration_state.gd")
var _world: Node2D
var _encounter_authorized: bool = false
var _return_authorized: bool = false
var _catalog := Catalog.new()
## Authored fixture override for validation UI tests; never save data.
var catalog_path: String = "res://content/catalog.tres"

const Mode = SessionShell.Mode
const MODE_VIEW = preload("res://scenes/ui/mode_view.tscn")
const REQUIRED := {
	"res://assets/art/exploration/hero.png": "Texture2D",
	"res://assets/art/exploration/floor.png": "Texture2D",
	"res://assets/art/exploration/sentinel.png": "Texture2D",
	"res://scenes/exploration/town.tscn": "PackedScene",
	"res://scenes/exploration/dungeon.tscn": "PackedScene",
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
var _publishing_result: bool = false
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
	var result := _session.observation()
	if is_instance_valid(_world) and _world.is_inside_tree():
		result["exploration"] = _world.observation()
	elif _session.exploration != null:
		result["exploration"] = _session.exploration.capture()
	return result

func submit_intent(intent: Dictionary) -> Dictionary:
	if not _alive or not _focused or _pending != -1 or _publishing_result or not loading_error.is_empty():
		return {"accepted": false, "code": "application_unavailable", "events": []}
	var command := Resolver.parse_intent(intent)
	var result := Resolver.resolve(_session, command, _catalog)
	if result.accepted:
		# Phase 6 inserts the durable checkpoint before this publication.
		_publishing_result = true
		_session = result.candidate
		_replace_view()
		observation_changed.emit(observation())
		for event: Dictionary in result.events:
			accepted_result.emit(event.duplicate(true))
		_publishing_result = false
	return result.observation()

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
	if not _alive or not _focused or not is_instance_valid(_view) or _pending != -1 or _publishing_result:
		return false
	if not _session.matches(id, revision) or not EDGES[_session.mode].has(target):
		return false
	if target != Mode.MENU and not development_enabled:
		return false
	if target == Mode.TOWN and _session.mode == Mode.LOADING and (_resources.is_empty() or not loading_error.is_empty()):
		return false
	if _session.mode == Mode.BATTLE and target == Mode.MENU:
		return false
	if target == Mode.BATTLE and not _encounter_authorized:
		return false
	if _session.mode == Mode.BATTLE and target == Mode.DUNGEON and not _return_authorized:
		return false
	if is_instance_valid(_world):
		_world.freeze()
	_pending = target
	_view.set_input_enabled(false)
	_chart.set_expression_property(&"authorized_target", target)
	_chart.send_event(StringName("to_%d" % target))
	return true

func _on_intent(target: int, id: int, revision: int, source_ref: WeakRef) -> void:
	var source := source_ref.get_ref() as ShellModeView
	if is_instance_valid(source) and source == _view and source.is_inside_tree():
		if _session.mode == Mode.BATTLE and target == Mode.DUNGEON:
			resolve_encounter_fixture(id, revision)
		else:
			request_mode(target, id, revision)

func _on_mode_entered(mode: int) -> void:
	if not _alive:
		return
	if _pending != -1:
		assert(_pending == mode)
		if _session.mode == Mode.RESULTS and mode == Mode.TOWN:
			_session.exploration = null
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
	if is_instance_valid(_world):
		_world.freeze()
		remove_child(_world)
		_world.queue_free()
		_world = null
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
				choices[Mode.LOADING] = "Explore Haven"
		Mode.LOADING:
			description = "Loading required resources and validating content…"
			if not loading_error.is_empty():
				description = loading_error
			choices[Mode.MENU] = "Back to menu"
		Mode.TOWN:
			choices[Mode.DUNGEON] = "Open dungeon fixture"
		Mode.DUNGEON:
			description = "Explore the Undercrypt."
		Mode.BATTLE:
			choices[Mode.DUNGEON] = "Resolve encounter fixture"
			description = "Encounter trigger verified.\nCombat and saving arrive in later phases.\nResolving this fixture removes only this sentinel."

		Mode.RESULTS:
			choices[Mode.TOWN] = "Return to town fixture"
	if _session.mode not in [Mode.MENU, Mode.LOADING, Mode.BATTLE]:
		choices[Mode.MENU] = "Back to menu"
	_view.configure(observation(), heading, description, choices)
	_view.intent_requested.connect(_on_intent.bind(weakref(_view)))
	_view.set_input_enabled(_focused)
	_status.text = "Phase 3 · session %d · revision %d · %s" % [_session.session_id, _session.revision, heading]

	var exploring := _session.mode in [Mode.TOWN, Mode.DUNGEON]
	$UI/UIHost/Background.visible = not exploring
	$UI/UIHost/Layout.visible = not exploring
	_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE if exploring else Control.MOUSE_FILTER_STOP
	if exploring:
		_view.set_input_enabled(false)
		_install_world()

func _install_world() -> void:
	var town := _session.mode == Mode.TOWN
	if not town and _session.exploration == null:
		_session.exploration = ExplorationState.new()
	var scene: PackedScene = load("res://scenes/exploration/town.tscn" if town else "res://scenes/exploration/dungeon.tscn")
	_world = scene.instantiate()
	var continuation: Dictionary = {} if town else _session.exploration.capture()
	_world.configure(_session.session_id, _session.revision, continuation, _world_session_valid)
	_world.continuation_changed.connect(_capture_continuation.bind(_session.session_id, _session.revision))
	_world.interaction_requested.connect(_world_interaction.bind(_session.session_id, _session.revision), CONNECT_DEFERRED)
	_world.menu_requested.connect(request_mode.bind(Mode.MENU, _session.session_id, _session.revision))
	add_child(_world)
	_world.set_focused(_focused)

func _world_session_valid(id: int, revision: int) -> bool:
	return _alive and _focused and development_enabled and loading_error.is_empty() and _pending == -1 and not _publishing_result and _session.matches(id, revision) and _session.mode in [Mode.TOWN, Mode.DUNGEON]

func _capture_continuation(position: Vector2, discovered: Array[String], id: int, revision: int) -> void:
	if not _world_session_valid(id, revision) or _session.mode != Mode.DUNGEON or not position.is_finite():
		return
	_session.exploration.position_x = position.x
	_session.exploration.position_y = position.y
	_session.exploration.discovered = discovered.duplicate()

func _world_interaction(stable_id: String, kind: String, id: int, revision: int) -> void:
	if not _world_session_valid(id, revision) or not is_instance_valid(_world) or not _world.interaction_is_valid(stable_id, true):
		return
	if kind == "entrance" and _session.mode == Mode.TOWN:
		request_mode(Mode.DUNGEON, id, revision)
	elif kind == "encounter" and _session.mode == Mode.DUNGEON:
		if _catalog.definition(stable_id) == null or _session.exploration.active_encounter != "" or _session.exploration.resolved.has(stable_id):
			return
		_session.exploration.active_encounter = stable_id
		_encounter_authorized = true
		request_mode(Mode.BATTLE, id, revision)
		_encounter_authorized = false
	elif kind == "exit":
		_world.transition_locked = false
		if _session.exploration.resolved.size() < 2:
			_world.show_panel("The arch is sealed", "Resolve both sentinel encounter fixtures before returning.")
		else:
			request_mode(Mode.RESULTS, id, revision)

func resolve_encounter_fixture(id: int, revision: int) -> bool:
	if not _alive or not _focused or _publishing_result or not is_instance_valid(_view) or _pending != -1 or not development_enabled or not _session.matches(id, revision) or _session.mode != Mode.BATTLE or _session.exploration == null or _session.exploration.active_encounter.is_empty():
		return false
	var encounter: String = _session.exploration.active_encounter
	if _session.exploration.resolved.has(encounter):
		return false
	_session.exploration.resolved.append(encounter)
	_session.exploration.active_encounter = ""
	_return_authorized = true
	var accepted := request_mode(Mode.DUNGEON, id, revision)
	_return_authorized = false
	return accepted

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
	var manifest: Manifest
	if ResourceLoader.exists(catalog_path):
		manifest = load(catalog_path) as Manifest
	var next_catalog := Catalog.new()
	var errors := next_catalog.publish(manifest)
	if not errors.is_empty():
		loading_error = "Required content invalid: %s\n%s\nRepair the catalog, then return to menu and retry." % [catalog_path, "\n".join(errors)]
		_replace_view()
		return
	if _session.hero != null and _session.content_versions != next_catalog.versions():
		loading_error = "Content version changed during this session. Restart the application to load the new catalog."
		_replace_view()
		return
	if _session.hero == null:
		var definition := next_catalog.definition("actor.hero") as ActorDefinitionType
		if definition == null:
			loading_error = "Required content missing: actor.hero in %s" % catalog_path
			_replace_view()
			return
		_session.hero = Hero.new()
		_session.hero.configure(definition, "hero")
		_session.content_versions = next_catalog.versions()
	_catalog = next_catalog
	_resources = candidate
	_ui.theme = candidate["res://scenes/ui/shell_theme.tres"]
	$UI/UIHost/Layout/Mark.texture = candidate["res://assets/art/dungeon_mark.svg"]
	observation_changed.emit(observation())
	if advance and _focused:
		request_mode(Mode.TOWN, id, revision)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		set_application_focused(false)
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
		set_application_focused(true)

func set_application_focused(focused: bool) -> void:
	_focused = focused
	if is_instance_valid(_world):
		_world.set_focused(focused)
	for action: StringName in InputMap.get_actions():
		Input.action_release(action)
	if is_instance_valid(_view):
		_view.set_input_enabled(focused and _pending == -1 and not is_instance_valid(_world))
	if focused and _session.mode == Mode.LOADING and not _resources.is_empty() and loading_error.is_empty():
		request_mode(Mode.TOWN, _session.session_id, _session.revision)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"shell_back") and not event.is_echo():
		if is_instance_valid(_world) and _world.panel_open:
			_world.close_panel()
		else:
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
