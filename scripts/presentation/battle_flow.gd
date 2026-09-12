extends Node
## State Charts owns presentation phases, never authoritative combat.
signal phase_changed(phase: String)
const PHASES := ["Selection", "Locked", "Resolved", "Enemy", "Outcome", "Saving", "SaveFailed"]
var chart: StateChart
var current: String = "Selection"
var _serial: int = 0
var _initialized: bool = false
var history: Array[String] = []
var _desired: String = "Selection"

func _ready() -> void:
	chart = StateChart.new()
	chart.name = "BattleChart"
	chart.initial_expression_properties = {"accepted_phase": "Selection"}
	var root := CompoundState.new()
	root.name = "Presentation"
	chart.add_child(root)
	for phase: String in PHASES:
		var state := AtomicState.new()
		state.name = phase
		state.state_entered.connect(_entered.bind(phase))
		root.add_child(state)
	root.initial_state = NodePath("Selection")
	for state: Node in root.get_children():
		for target: String in PHASES:
			if target == state.name: continue
			var transition := Transition.new()
			transition.event = StringName("show_" + target)
			transition.to = NodePath("../../" + target)
			var guard := ExpressionGuard.new()
			guard.expression = 'accepted_phase == "%s"' % target
			transition.guard = guard
			state.add_child(transition)
	add_child(chart)

func observe(snapshot: Dictionary, events: Array = [], save_state: String = "idle") -> void:
	_serial += 1
	if save_state in ["pending", "failed"]:
		_desired = "Saving" if save_state == "pending" else "SaveFailed"
	elif not snapshot.battle.outcome.is_empty(): _desired = "Outcome"
	elif snapshot.battle.active_actor_id != "hero": _desired = "Enemy"
	elif snapshot.battle.phase == 1: _desired = "Locked"
	else: _desired = "Selection"
	var completed: bool = false
	for event: Dictionary in events:
		if event.type == "activation_completed": completed = true
	if completed and save_state == "idle":
		_show("Resolved")
		_settle.call_deferred(_serial)
	else:
		_show(_desired)

func _settle(serial: int) -> void:
	if not is_inside_tree() or serial != _serial: return
	_show(_desired)

func _show(phase: String) -> void:
	if not _initialized: return
	chart.set_expression_property(&"accepted_phase", phase)
	if current != phase: chart.send_event(StringName("show_" + phase))

func _entered(phase: String) -> void:
	if not _initialized:
		_initialized = true
		_settle.call_deferred(_serial)
	current = phase
	history.append(phase)
	if history.size() > 64: history.pop_front()
	phase_changed.emit(phase)

func permits(kind: String) -> bool:
	return (current == "Selection" and kind in ["select_skill", "roll", "pass"]) or (current == "Locked" and kind in ["keep", "reroll", "commit", "pass"])
