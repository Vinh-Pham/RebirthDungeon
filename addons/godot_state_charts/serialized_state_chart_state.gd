# This class is used to serialize a state chart state to a resource. It is intended 
# to make it easier to save and load state charts, as well as to transfer them
# over the network if needed. See also SerializedStateChartResource.
class_name SerializedStateChartState
extends Resource

@export var name: StringName = ""
@export var state_type: int = -1
@export var active: bool = false
@export var pending_transition_name: String = ""
@export var pending_transition_remaining_delay: float = 0.0
@export var pending_transition_initial_delay: float = 0.0
# Local compatibility patch: Godot 4.7.2 leaks self-typed exported arrays.
# Elements remain SerializedStateChartState; serializer fixtures verify this.
# See docs/evidence/phase-1/README.md before upgrading/removing this patch.
@export var children: Array[Resource] = []

# Only used for history states
@export var history: SavedState = null


func _to_string() -> String:
	return """SerializedStateChartState(
		name: %s
		state_class: %s
		active: %s
		pending_transition_name: %s
		pending_transition_remaining_delay: %s
		pending_transition_initial_delay: %s
		children: %s
		history: %s
	)""" % [
		name,
		state_type,
		active,
		pending_transition_name,
		pending_transition_remaining_delay,
		pending_transition_initial_delay,
		JSON.stringify(children, "\t"),
		history.debug_string() if history != null else "null"
	]
