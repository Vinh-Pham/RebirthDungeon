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
const Combat = preload("res://scripts/domain/rules/battle_rules.gd")
const EnemyScheduler = preload("res://scripts/ai/enemy_scheduler.gd")
var progression_enabled: bool = true
var persistence_enabled: bool = true
var save_directory: String = "user://profile"
var repository: RefCounted
var _storage_checked: bool = false
var _resume_candidate: SessionShell
var _recovery: bool = false
var _save_overlay: CanvasLayer
var _navigation_candidate: SessionShell
var _mode_published: bool = false
var _movement_checkpoint: bool = false
var _movement_elapsed: float = 0.0
var _movement_dirty: bool = false
var _pause_requested: bool = false
var checkpoint := preload("res://scripts/application/checkpoint_test_adapter.gd").new()
var _scheduler: Node
var _battle_view: Control
var _battle_text_scale: float = 1.0
var _battle_reduced_motion: bool = false
var _progression_view: CanvasLayer
var _progression_target: String = ""
var _progression_serial: int = 0
var _world: Node2D
var _dialogue: CanvasLayer
var _dialogue_target: String = ""
var _dialogue_serial: int = 0
var _service_authorized: bool = false
var _encounter_authorized: bool = false
var _return_authorized: bool = false
var _catalog := Catalog.new()
## Authored fixture override for validation UI tests; never save data.
var catalog_path: String = "res://content/catalog.tres"

const Mode = SessionShell.Mode
const MODE_VIEW = preload("res://scenes/ui/mode_view.tscn")
const REQUIRED := {
	"res://content/progression/starter.tres": "Resource",
	"res://content/dialogue/haven.dialogue": "Resource",
	"res://scenes/battle/battle.tscn": "PackedScene",
	"res://scenes/battle/stage.tscn": "PackedScene",
	"res://scenes/battle/battle_theme.tres": "Theme",
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
	_scheduler = EnemyScheduler.new()
	add_child(_scheduler)
	_build_chart()

func observation() -> Dictionary:
	var result := _session.observation()
	if _session.battle != null and _catalog.is_ready():
		preload("res://scripts/application/battle_observation.gd").decorate(result, _session, _catalog)
	if is_instance_valid(_world) and _world.is_inside_tree():
		result["exploration"] = _world.observation()
		if _session.exploration != null: result["exploration"]["pending_gold"] = _session.exploration.pending_gold
	elif _session.exploration != null:
		result["exploration"] = _session.exploration.capture()
	if _session.hero != null and not _session.hero.growth.is_empty():
		result["stat_sources"] = preload("res://scripts/domain/rules/progression_rules.gd").sources(_session.hero,_catalog)
		result["mastery"] = preload("res://scripts/domain/rules/progression_rules.gd").mastery(_session.hero)
	return result

func submit_intent(intent: Dictionary) -> Dictionary:
	if not _alive or not _focused or _pending != -1 or _publishing_result or checkpoint.busy() or _save_overlay != null or not loading_error.is_empty():
		return {"accepted": false, "code": "application_unavailable", "events": []}
	if intent.get("kind") in ["buy_potion","recover","enter_dungeon","abandon","buy_item","sell_item","bank_deposit","bank_withdraw","learn_lesson"] and not _service_authorized:
		return {"accepted":false,"code":"conversation_required","events":[]}
	var command := Resolver.parse_intent(intent)
	var result := Resolver.resolve(_session, command, _catalog)
	if result.accepted:
		if checkpoint.stage(result):
			_publish_checkpoint()
		else:
			_refresh_battle([], checkpoint.state)
			return {"accepted": true, "code": ("save_" if persistence_enabled else "simulated_save_") + checkpoint.state, "operation_id": result.operation_id, "events": []}
	elif is_instance_valid(_battle_view):
		_battle_view.show_rejection(result.code)
	return result.observation()

func _publish_checkpoint() -> void:
	var result: RefCounted = checkpoint.take()
	if result == null or not _alive: return
	if result.candidate.session_id != _session.session_id or result.candidate.revision != _session.revision + (0 if _movement_checkpoint else 1): return
	var changing_mode: bool = result.candidate.mode != _session.mode
	var movement_only := _movement_checkpoint
	_movement_checkpoint = false
	_publishing_result = true
	_session = result.candidate
	_hide_save_panel()
	if changing_mode:
		_pending = _session.mode
		_mode_published = true
		_chart.set_expression_property(&"authorized_target", _session.mode)
		_chart.send_event(StringName("to_%d" % _session.mode))
	elif is_instance_valid(_battle_view) and _session.mode == Mode.BATTLE:
		_refresh_battle(result.events)
	elif movement_only and is_instance_valid(_world):
		if _world.transition_locked:
			_world.transition_locked = false
			_world.set_focused(_focused)
	else:
		_replace_view()
	observation_changed.emit(observation())
	for event: Dictionary in result.events:
		accepted_result.emit(event.duplicate(true))
	_publishing_result = false
	if _pause_requested:
		_pause_requested = false
		_show_save_panel("Session saved","Your progress is saved. Continue when ready.","Continue",_resume_current)
	else:
		_schedule_enemy.call_deferred()

func _refresh_battle(events: Array = [], save_state: String = "idle") -> void:
	if not is_instance_valid(_battle_view):
		if persistence_enabled and save_state == "failed": _show_write_failure()
		return
	_battle_view.present(observation(), events, save_state)
	_battle_view.set_input_enabled(_focused and _pending == -1)

func set_next_checkpoint_test(behavior: String) -> bool:
	if persistence_enabled or not development_enabled or checkpoint.busy() or behavior not in ["immediate", "pending", "failure"]: return false
	checkpoint.next_behavior = behavior
	return true

func complete_checkpoint_test(id: int, revision: int, success: bool) -> bool:
	if not _alive or not _session.matches(id, revision) or not checkpoint.complete(success): return false
	if success: _publish_checkpoint()
	else: _refresh_battle([], checkpoint.state)
	return true

func retry_checkpoint() -> void:
	if not _alive or not _focused: return
	if checkpoint.retry(): _publish_checkpoint()
	elif persistence_enabled and checkpoint.busy(): _refresh_battle([],checkpoint.state)

func _battle_intent(intent: Dictionary, source_ref: WeakRef) -> void:
	var source: Variant = source_ref.get_ref()
	if is_instance_valid(source) and source == _battle_view and source.is_inside_tree():
		var result := submit_intent(intent)
		if not result.accepted and is_instance_valid(source): source.show_rejection(result.code)

func _battle_continue(id: int, revision: int, source_ref: WeakRef) -> void:
	var source: Variant = source_ref.get_ref()
	if is_instance_valid(source) and source == _battle_view and source.is_inside_tree():
		if not complete_battle(id, revision): source.show_rejection("application_unavailable")

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
	root.initial_state = NodePath(Mode.keys()[_session.mode].capitalize())
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
	if not _alive or not _focused or not is_instance_valid(_view) or _pending != -1 or _publishing_result or checkpoint.busy():
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
	if _session.mode == Mode.BATTLE and target in [Mode.DUNGEON, Mode.RESULTS] and not _return_authorized:
		return false
	if persistence_enabled and repository != null:
		if _save_overlay != null or _recovery: return false
		if target == Mode.MENU and _session.mode >= Mode.TOWN:
			_pause_requested = true
			checkpoint_now()
			return true
		if target >= Mode.TOWN:
			var candidate: SessionShell = _navigation_candidate if _navigation_candidate != null else _session.copy()
			_navigation_candidate = null
			if _session.mode == Mode.RESULTS and target == Mode.TOWN:
				candidate.exploration = null
				candidate.battle = null
				candidate.town_position_x = 96.0
				candidate.town_position_y = 160.0
			if target == Mode.DUNGEON and candidate.exploration == null: candidate.exploration = ExplorationState.new()
			if target == Mode.TOWN and progression_enabled: preload("res://scripts/domain/rules/progression_rules.gd").initialize(candidate.hero,_catalog)
			candidate.mode = target as SessionShell.Mode
			candidate.revision += 1
			return _stage_transition(candidate)
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
			complete_battle(id, revision)
		else:
			request_mode(target, id, revision)

func _on_mode_entered(mode: int) -> void:
	if not _alive:
		return
	if _pending != -1:
		assert(_pending == mode)
		if not _mode_published:
			if _session.mode == Mode.RESULTS and mode == Mode.TOWN:
				_session.exploration = null
			_session.mode = mode as SessionShell.Mode
			_session.revision += 1
		_mode_published = false
		_pending = -1
	_chart.set_expression_property(&"authorized_target", -1)
	_replace_view()
	observation_changed.emit(observation())
	if mode == Mode.LOADING:
		_load_required.call_deferred(_session.session_id, _session.revision)
	elif mode == Mode.TOWN and progression_enabled and _session.hero.growth.is_empty():
		_upgrade_legacy_town.call_deferred()
	elif mode == Mode.MENU and _resources.is_empty() and loading_error.is_empty():
		_load_required.call_deferred(_session.session_id, _session.revision, false)

func _replace_view() -> void:
	_close_progression()
	_close_dialogue()
	if is_instance_valid(_battle_view):
		_battle_text_scale = _battle_view.text_scale
		_battle_reduced_motion = _battle_view.reduced_motion
		_battle_view.set_input_enabled(false)
		_battle_view.get_parent().remove_child(_battle_view)
		_battle_view.queue_free()
		_battle_view = null
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
			description = "Combat"

		Mode.RESULTS:
			description = "Expedition complete · %d committed gold" % _session.hero.committed_gold
			if _session.battle != null and _session.battle.outcome == "defeat":
				description = "Defeated · pending expedition rewards lost.\nReturn to Haven and ask the keeper for free recovery."
			if _session.battle == null:
				description = "Expedition abandoned · pending gold lost.\nCommitted gold and unused potions retained."
			if not _session.hero.growth.is_empty():
				if _session.battle == null or _session.battle.outcome == "defeat":
					description = "Expedition ended · pending rewards discarded.\n30% of carried gold lost; bank and unspent items retained."
				description += "\nLevel %d · XP %d · AP %d\nCarried gold %d · Bank %d" % [_session.hero.growth.level,_session.hero.growth.xp,_session.hero.growth.ap,_session.hero.committed_gold,_session.hero.growth.banked]
			choices[Mode.TOWN] = "Return to Haven"
	if _session.mode not in [Mode.MENU, Mode.LOADING, Mode.BATTLE]:
		choices[Mode.MENU] = "Back to menu"
	_view.configure(observation(), heading, description, choices)
	_view.intent_requested.connect(_on_intent.bind(weakref(_view)))
	_view.set_input_enabled(_focused)
	_status.text = "Phase 8 · session %d · revision %d · %s" % [_session.session_id, _session.revision, heading]

	if _session.mode == Mode.BATTLE and _session.battle != null:
		_view.hide()
		_battle_view = load("res://scenes/battle/battle.tscn").instantiate()
		add_child(_battle_view)
		_battle_view.durable_saves = persistence_enabled
		_battle_view.present(observation(), [], checkpoint.state)
		_battle_view.set_text_scale(_battle_text_scale)
		_battle_view.set_reduced_motion(_battle_reduced_motion)
		_battle_view.command_requested.connect(_battle_intent.bind(weakref(_battle_view)), CONNECT_DEFERRED)
		_battle_view.continue_requested.connect(_battle_continue.bind(weakref(_battle_view)), CONNECT_DEFERRED)
		_battle_view.retry_requested.connect(retry_checkpoint, CONNECT_DEFERRED)
		_battle_view.set_input_enabled(_focused)
		_schedule_enemy.call_deferred()
	var exploring := _session.mode in [Mode.TOWN, Mode.DUNGEON]
	var battle_visible := _session.mode == Mode.BATTLE
	$UI/UIHost/Background.visible = not exploring and not battle_visible
	$UI/UIHost/Layout.visible = not exploring and not battle_visible
	_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE if exploring or battle_visible else Control.MOUSE_FILTER_STOP
	if exploring:
		_view.set_input_enabled(false)
		_install_world()

func _install_world() -> void:
	var town := _session.mode == Mode.TOWN
	if not town and _session.exploration == null:
		_session.exploration = ExplorationState.new()
	var scene: PackedScene = load("res://scenes/exploration/town.tscn" if town else "res://scenes/exploration/dungeon.tscn")
	_world = scene.instantiate()
	var continuation: Dictionary = ({"position":{"x":_session.town_position_x,"y":_session.town_position_y}} if persistence_enabled else {}) if town else _session.exploration.capture()
	_world.configure(_session.session_id, _session.revision, continuation, _world_session_valid)
	_world.continuation_changed.connect(_capture_continuation.bind(_session.session_id, _session.revision))
	_world.interaction_requested.connect(_world_interaction.bind(_session.session_id, _session.revision), CONNECT_DEFERRED)
	_world.progression_requested.connect(_open_progression)
	_world.abandon_requested.connect(_open_abandon)
	_world.menu_requested.connect(request_mode.bind(Mode.MENU, _session.session_id, _session.revision))
	add_child(_world)
	_world.set_focused(_focused)

func _world_session_valid(id: int, revision: int) -> bool:
	return _alive and _focused and development_enabled and loading_error.is_empty() and _pending == -1 and not _publishing_result and not checkpoint.busy() and _save_overlay == null and _session.matches(id, revision) and _session.mode in [Mode.TOWN, Mode.DUNGEON]

func _capture_continuation(position: Vector2, discovered: Array[String], id: int, revision: int) -> void:
	if not _world_session_valid(id, revision) or not position.is_finite():
		return
	if _session.mode == Mode.TOWN:
		_movement_dirty = _movement_dirty or _session.town_position_x != position.x or _session.town_position_y != position.y
		_session.town_position_x = position.x
		_session.town_position_y = position.y
		return
	_movement_dirty = _movement_dirty or _session.exploration.position_x != position.x or _session.exploration.position_y != position.y or _session.exploration.discovered != discovered
	_session.exploration.position_x = position.x
	_session.exploration.position_y = position.y
	_session.exploration.discovered = discovered.duplicate()

func _world_interaction(stable_id: String, kind: String, id: int, revision: int) -> void:
	if not _world_session_valid(id, revision) or not is_instance_valid(_world) or not _world.interaction_is_valid(stable_id, true):
		return
	if kind in ["entrance","npc"] and _session.mode == Mode.TOWN:
		_open_dialogue(stable_id, "entrance" if kind == "entrance" else "keeper")
	elif kind == "encounter" and _session.mode == Mode.DUNGEON:
		if _catalog.definition(stable_id) == null or _session.exploration.active_encounter != "" or _session.exploration.resolved.has(stable_id):
			return
		var encounter_session: SessionShell = _session.copy() if persistence_enabled else _session
		if not Combat.begin(encounter_session, stable_id, _catalog):
			return
		encounter_session.exploration.active_encounter = stable_id
		if persistence_enabled: _navigation_candidate = encounter_session
		_encounter_authorized = true
		request_mode(Mode.BATTLE, id, revision)
		_encounter_authorized = false
	elif kind == "exit":
		_world.transition_locked = false
		if _session.exploration.resolved.size() < 2:
			_world.show_panel("The arch is sealed", "Defeat both sentinels before returning.")
		else:
			var exit_session: SessionShell = _session.copy() if persistence_enabled else _session
			var progression_error := preload("res://scripts/domain/rules/progression_rules.gd").finish(exit_session,true,_catalog)
			if not progression_error.is_empty():
				_world.show_panel("Cannot finish yet",progression_error)
				return
			exit_session.hero.committed_gold = mini(1000000, exit_session.hero.committed_gold + exit_session.exploration.pending_gold)
			exit_session.exploration.pending_gold = 0
			exit_session.hero.statuses.clear()
			exit_session.hero.cooldowns.clear()
			exit_session.hero.shield = 0
			if persistence_enabled: _navigation_candidate = exit_session
			request_mode(Mode.RESULTS, id, revision)

func complete_battle(id: int, revision: int) -> bool:
	if not _alive or not _focused or _publishing_result or checkpoint.busy() or not is_instance_valid(_view) or _pending != -1 or not development_enabled or not _session.matches(id, revision) or _session.mode != Mode.BATTLE or _session.exploration == null or _session.exploration.active_encounter.is_empty():
		return false
	if _session.battle == null or _session.battle.phase != _session.battle.Phase.FINISHED:
		return false
	var returned: SessionShell = _session.copy() if persistence_enabled else _session
	returned.exploration.active_encounter = ""
	if returned.battle.outcome == "defeat":
		preload("res://scripts/domain/rules/progression_rules.gd").finish(returned,false,_catalog)
		returned.hero.statuses.clear()
		returned.hero.cooldowns.clear()
		returned.hero.shield = 0
	if persistence_enabled: _navigation_candidate = returned
	_return_authorized = true
	var accepted := request_mode(Mode.DUNGEON if _session.battle.outcome == "victory" else Mode.RESULTS, id, revision)
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
		if progression_enabled: preload("res://scripts/domain/rules/progression_rules.gd").initialize(_session.hero,next_catalog)
		_session.content_versions = next_catalog.versions()
	_catalog = next_catalog
	_resources = candidate
	_ui.theme = candidate["res://scenes/ui/shell_theme.tres"]
	$UI/UIHost/Layout/Mark.texture = candidate["res://assets/art/dungeon_mark.svg"]
	observation_changed.emit(observation())
	if persistence_enabled and not _storage_checked:
		_open_storage()
		if _save_overlay != null: return
	if advance and _focused:
		request_mode(Mode.TOWN, id, revision)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		set_application_focused(false)
	elif what == NOTIFICATION_APPLICATION_PAUSED:
		set_application_focused(false)
	elif what == NOTIFICATION_APPLICATION_RESUMED:
		set_application_focused(true)
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
		set_application_focused(true)

func set_application_focused(focused: bool) -> void:
	if not focused:
		_close_progression()
		_close_dialogue()
	if not focused and _focused and persistence_enabled: checkpoint_now()
	_focused = focused
	if is_instance_valid(_battle_view): _battle_view.set_input_enabled(focused and _pending == -1)
	if focused: _schedule_enemy.call_deferred()
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
	_close_progression()
	_close_dialogue()
	_alive = false
	_session.invalidate()
	_resources.clear()
	if is_instance_valid(_view):
		_view.detach()
	## No production DialogueManager/QuestSystem subscriptions exist in Phase 1.
	## Camera registrations are owned by camera nodes and removed on tree exit.

func _schedule_enemy() -> void:
	if not _alive or not _focused or _pending != -1 or _publishing_result or checkpoint.busy() or _save_overlay != null or _session.mode != Mode.BATTLE:
		return
	var intent: Dictionary = _scheduler.propose(_session, _catalog)
	if not intent.is_empty(): submit_intent(intent)

func _open_storage() -> void:
	_storage_checked = true
	repository = preload("res://scripts/data/save_repository.gd").new()
	repository.configure(save_directory,_catalog)
	var disk := preload("res://scripts/application/durable_checkpoint.gd").new()
	disk.repository = repository
	checkpoint = disk
	reload_checkpoint()

func reload_checkpoint() -> void:
	var loaded: Dictionary = repository.load_checkpoint()
	_recovery = loaded.status in ["corrupt","recovery"]
	_resume_candidate = loaded.get("session")
	if loaded.status == "empty":
		_hide_save_panel()
		return
	if loaded.status == "ok":
		_show_save_panel("Continue your journey","A verified session is ready to resume.","Continue",resume_checkpoint)
	elif loaded.status == "recovery":
		_show_save_panel("Checkpoint recovery",loaded.error+"\nA previous verified checkpoint is available. Original files will be preserved.","Use verified checkpoint",resume_checkpoint)
	else:
		_show_save_panel("Cannot load this session",loaded.error+"\nYour files are unchanged. Restore a compatible checkpoint in "+save_directory+" and retry.","Retry loading",reload_checkpoint)

func resume_checkpoint() -> void:
	if _resume_candidate == null: return
	if _recovery and not repository.allow_recovery():
		_show_save_panel("Recovery could not finish","Cannot preserve the original files. Free storage or restore file access and retry.","Retry recovery",resume_checkpoint)
		return
	_recovery = false
	_session = _resume_candidate
	_resume_candidate = null
	_scheduler._last_token = ""
	_hide_save_panel()
	remove_child(_chart)
	_chart.queue_free()
	_pending = -1
	_mode_published = false
	_build_chart()

func _stage_transition(candidate: SessionShell) -> bool:
	if is_instance_valid(_world) and not _movement_checkpoint: _world.freeze()
	var result := preload("res://scripts/domain/commands/command_result.gd").new()
	result.accepted = true
	result.candidate = candidate
	if checkpoint.stage(result): _publish_checkpoint()
	else: _refresh_battle([],checkpoint.state)
	return true

func checkpoint_now() -> void:
	if is_instance_valid(_dialogue) or is_instance_valid(_progression_view): return
	if not persistence_enabled or repository == null or _recovery or _save_overlay != null or checkpoint.busy() or _publishing_result or _pending != -1 or _session.mode < Mode.TOWN: return
	_movement_checkpoint = true
	_movement_dirty = false
	_stage_transition(_session.copy())

func _process(delta: float) -> void:
	if not persistence_enabled: return
	_movement_elapsed += delta
	if _movement_elapsed >= 2.0:
		_movement_elapsed = 0.0
		if _movement_dirty and _focused: checkpoint_now()

func _show_write_failure() -> void:
	_show_save_panel("Progress could not be saved",repository.last_error+"\nThe action is waiting. Retry writes the same result.","Retry same action",retry_checkpoint)

func _resume_current() -> void:
	_hide_save_panel()
	if is_instance_valid(_world):
		_world.transition_locked = false
		_world.set_focused(_focused)
	_schedule_enemy.call_deferred()

func _hide_save_panel() -> void:
	if is_instance_valid(_save_overlay):
		remove_child(_save_overlay)
		_save_overlay.queue_free()
	_save_overlay = null

func _show_save_panel(title: String, message: String, action: String, callback: Callable) -> void:
	_hide_save_panel()
	if is_instance_valid(_world): _world.freeze()
	if is_instance_valid(_battle_view): _battle_view.set_input_enabled(false)
	_save_overlay = CanvasLayer.new()
	_save_overlay.name = "SaveRecovery"
	_save_overlay.layer = 20
	add_child(_save_overlay)
	var background := ColorRect.new()
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.color = Color("#101b20")
	_save_overlay.add_child(background)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side: String in ["left","right","top","bottom"]: margin.add_theme_constant_override("margin_"+side,32)
	background.add_child(margin)
	var body := VBoxContainer.new()
	body.alignment = BoxContainer.ALIGNMENT_CENTER
	body.theme = load("res://scenes/battle/battle_theme.tres")
	margin.add_child(body)
	var heading := Label.new()
	heading.text = title
	heading.add_theme_font_size_override("font_size",28)
	body.add_child(heading)
	var description := Label.new()
	description.text = message
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_child(description)
	var button := Button.new()
	button.name = "RecoveryAction"
	button.text = action
	button.custom_minimum_size.y = 56
	button.pressed.connect(callback,CONNECT_DEFERRED)
	body.add_child(button)
	button.grab_focus()

func _open_abandon() -> void:
	if _session.mode == Mode.DUNGEON and _world_session_valid(_session.session_id,_session.revision):
		_open_dialogue("dungeon.undercrypt","abandon")

func _open_dialogue(target: String, cue: String) -> void:
	if is_instance_valid(_dialogue) or not is_instance_valid(_world): return
	_dialogue_target = target
	_dialogue_serial += 1
	var serial := _dialogue_serial
	var id := _session.session_id
	var revision := _session.revision
	_world.begin_conversation(target)
	_dialogue = preload("res://scripts/presentation/town_dialogue.gd").new()
	add_child(_dialogue)
	Engine.get_singleton("DialogueManager").get_current_scene = func() -> Node: return _dialogue if is_instance_valid(_dialogue) else _world
	_dialogue.closed.connect(_close_dialogue)
	_dialogue.confirmed.connect(_confirm_service.bind(id,revision,serial))
	_dialogue.start(observation(),cue,func() -> bool:
		return _dialogue_serial == serial and _world_session_valid(id,revision))

func _confirm_service(kind: String, id: int, revision: int, serial: int) -> Dictionary:
	if not is_instance_valid(_dialogue) or serial != _dialogue_serial or not _world_session_valid(id,revision):
		return {"accepted":false,"code":"stale_conversation"}
	var target := _dialogue_target
	if (kind == "abandon" and (target != "dungeon.undercrypt" or _session.mode != Mode.DUNGEON)) or (kind != "abandon" and not _world.interaction_is_valid(target,true)):
		_close_dialogue()
		return {"accepted":false,"code":"out_of_reach"}
	if kind == "open_services":
		_close_dialogue()
		_open_progression("Shop","npc.keeper")
		return {"accepted":true,"code":"opened"}
	var intent := {"session_id":id,"expected_revision":revision,"operation_id":"service:%d:%d:%d" % [id,revision,serial],
		"kind":kind,"actor_id":"hero","skill_id":"","target_id":target}
	_close_dialogue()
	_service_authorized = true
	var result := submit_intent(intent)
	_service_authorized = false
	if not result.accepted and is_instance_valid(_world):
		_world.show_panel("Service unavailable",String(result.code).replace("_"," "))
	return result

func _close_dialogue() -> void:
	_dialogue_serial += 1
	if is_instance_valid(_dialogue):
		var owner := get_viewport().gui_get_focus_owner()
		if owner != null: owner.release_focus()
		var old := _dialogue
		_dialogue = null
		remove_child(old)
		old.queue_free()
		Engine.get_singleton("DialogueManager").get_current_scene = _default_dialogue_scene
		if is_instance_valid(_world): _world.end_conversation(_dialogue_target)
	_dialogue_target = ""

static func _default_dialogue_scene() -> Node:
	return (Engine.get_main_loop() as SceneTree).current_scene

func _open_progression(tab: String, target: String = "") -> void:
	if not _world_session_valid(_session.session_id,_session.revision) or not is_instance_valid(_world) or is_instance_valid(_progression_view) or is_instance_valid(_dialogue): return
	if _session.hero.growth.is_empty():
		_world.show_panel("Legacy expedition","Finish this expedition and return to town to enable inventory and progression.")
		return
	_progression_serial += 1
	var serial := _progression_serial
	var id := _session.session_id
	var revision := _session.revision
	_progression_target = target
	_world.freeze()
	_progression_view = preload("res://scripts/presentation/progression_panel.gd").new()
	add_child(_progression_view)
	_progression_view.closed.connect(_close_progression)
	_progression_view.command_requested.connect(_progression_intent.bind(id,revision,serial))
	_progression_view.start(observation(),_catalog,tab,not target.is_empty(),_preview_progression)

func _preview_progression(kind: String, data: Dictionary) -> Dictionary:
	var candidate: RefCounted = _session.copy()
	var error := preload("res://scripts/domain/rules/progression_rules.gd").action(candidate,kind,data,"preview:"+str(_session.revision),_catalog)
	if not error.is_empty(): return {"accepted":false,"code":error}
	return {"accepted":true,"code":"preview","stats_before":_session.hero.stats.duplicate(),"stats_after":candidate.hero.stats.duplicate(),"summary":"Carried gold %d → %d; bank %d → %d; AP %d → %d.\nHP/MP/SP %s → %s; maxima %s → %s." % [
		_session.hero.committed_gold,candidate.hero.committed_gold,_session.hero.growth.banked,candidate.hero.growth.banked,_session.hero.growth.ap,candidate.hero.growth.ap,
		str(_session.hero.current),str(candidate.hero.current),str(_session.hero.maximum),str(candidate.hero.maximum)]}

func _progression_intent(kind: String, data: Dictionary, id: int, revision: int, serial: int) -> Dictionary:
	if not is_instance_valid(_progression_view) or serial != _progression_serial or not _world_session_valid(id,revision): return {"accepted":false,"code":"stale_panel"}
	var service := kind in ["buy_item","sell_item","bank_deposit","bank_withdraw","learn_lesson"]
	if service and (_progression_target != "npc.keeper" or not _world.interaction_is_valid("npc.keeper",true)):
		_close_progression()
		return {"accepted":false,"code":"out_of_reach"}
	var intent := {"session_id":id,"expected_revision":revision,"operation_id":"progress:%d:%d:%d" % [id,revision,serial],
		"kind":kind,"actor_id":"hero","skill_id":"","target_id":_progression_target,"data":data}
	_close_progression()
	_service_authorized = service
	var result := submit_intent(intent)
	_service_authorized = false
	if not result.accepted and is_instance_valid(_world): _world.show_panel("Action unavailable",result.code)
	return result

func _close_progression() -> void:
	_progression_serial += 1
	if not is_instance_valid(_progression_view): return
	var focus := get_viewport().gui_get_focus_owner()
	if focus != null: focus.release_focus()
	var old := _progression_view
	_progression_view = null
	remove_child(old)
	old.queue_free()
	if is_instance_valid(_world): _world.end_conversation("")
	_progression_target = ""

func _upgrade_legacy_town() -> void:
	if not _alive or _session.mode != Mode.TOWN or not _session.hero.growth.is_empty() or checkpoint.busy(): return
	var candidate: SessionShell = _session.copy()
	preload("res://scripts/domain/rules/progression_rules.gd").initialize(candidate.hero,_catalog)
	candidate.revision += 1
	_stage_transition(candidate)
