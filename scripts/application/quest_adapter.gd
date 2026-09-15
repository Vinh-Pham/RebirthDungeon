extends RefCounted
class_name QuestAdapter
## Application-owned QuestSystem mirror. Every transition here follows an
## already-committed session change; pools and signals never grant rewards,
## advance turns or mutate domain state. Pools are rebuilt per session so
## switching heroes cannot leak quest instances.

const QuestType = preload("res://scripts/application/domain_quest.gd")
const Rules = preload("res://scripts/domain/rules/progression_rules.gd")
var _quests: Dictionary = {}
var _session_id: int = 0

func _manager() -> Node:
	var loop := Engine.get_main_loop()
	return loop.root.get_node_or_null("QuestSystem") if loop is SceneTree else null

func reset() -> void:
	_quests.clear()
	_session_id = 0
	var manager := _manager()
	if manager == null: return
	for pool_name: String in ["available","active","completed"]:
		var pool: Node = manager.get(pool_name)
		if pool != null: pool.quests.clear()

## Rebuild the three pools to mirror committed growth exactly, in stable
## authored quest order. Idempotent for repeated syncs of the same session.
func sync(session: RefCounted) -> void:
	var manager := _manager()
	if manager == null: return
	var growth: Dictionary = session.hero.growth if session != null and session.hero != null else {}
	if growth.is_empty():
		if not _quests.is_empty(): reset()
		return
	if _session_id != int(session.session_id):
		reset()
		_session_id = int(session.session_id)
	for quest_id: String in Rules.CONFIG.quests:
		var record: Dictionary = growth.quests.get(quest_id,{})
		var desired: String = str(record.get("state","locked"))
		var quest: QuestType = _quests.get(quest_id)
		if quest == null:
			if desired == "locked": continue
			quest = QuestType.new()
			quest.configure(quest_id,Rules.CONFIG.quests[quest_id],int(Rules.CONFIG.quests[quest_id].numeric))
			_quests[quest_id] = quest
		quest.mirror(record)
		_place(manager,quest,desired)

func _pool_of(manager: Node, quest: QuestType) -> String:
	if manager.completed.is_quest_inside(quest): return "claimed"
	if manager.active.is_quest_inside(quest): return "active"
	if manager.available.is_quest_inside(quest): return "available"
	return "locked"

func _place(manager: Node, quest: QuestType, desired: String) -> void:
	var current := _pool_of(manager,quest)
	if current == desired:
		if desired == "claimed" and not quest.objective_completed: quest.objective_completed = true
		return
	_strip(manager,quest)
	match desired:
		"available":
			manager.mark_quest_as_available(quest)
		"active","ready":
			manager.start_quest(quest)
			if desired == "ready" and not quest.objective_completed: quest.objective_completed = true
		"claimed":
			manager.start_quest(quest)
			if not quest.objective_completed: quest.objective_completed = true
			manager.complete_quest(quest)
		"locked":
			pass

func _strip(manager: Node, quest: QuestType) -> void:
	manager.available.remove_quest(quest)
	manager.active.remove_quest(quest)
	manager.completed.remove_quest(quest)

## Read-only journal summary built from committed state (not pool order).
func observation() -> Dictionary:
	var result := {}
	for quest_id: String in _quests:
		var quest: QuestType = _quests[quest_id]
		result[quest_id] = {"state":quest.domain_state,"pool":_pool_of(_manager(),quest) if _manager() != null else "locked",
			"numeric":quest.id,"ready":quest.objective_completed}
	return result