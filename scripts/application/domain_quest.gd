extends Quest
class_name DomainQuest
## Game-owned Quest subclass mirroring committed domain quest state. The addon
## integer id maps to an authored stable quest ID; lifecycle truth stays in the
## authoritative session, never in this Resource.

var domain_id: String = ""
var domain_state: String = "locked"

func configure(quest_id: String, definition: Dictionary, numeric_id: int) -> void:
	domain_id = quest_id
	id = numeric_id
	quest_name = str(definition.get("name",quest_id))
	quest_description = str(definition.get("category","side"))
	quest_objective = _objective_text(definition)
	domain_state = "locked"

## Mirror one committed record. objective_completed is the addon's
## ready-to-complete representation and is only assigned on change.
func mirror(record: Dictionary) -> void:
	domain_state = str(record.get("state","locked"))
	var ready: bool = domain_state == "ready"
	if objective_completed != ready: objective_completed = ready

func _objective_text(definition: Dictionary) -> String:
	var parts := PackedStringArray()
	for stage: Variant in definition.get("stages",[]):
		for objective: Variant in stage:
			match str(objective.get("type","")):
				"encounter": parts.append("Defeat %s ×%d" % [str(objective.get("target","")).trim_prefix("encounter."),int(objective.get("count",1))])
				"exit": parts.append("Leave the dungeon through the exit")
				"skill": parts.append("Activate %s ×%d" % [str(objective.get("target","")).trim_prefix("skill."),int(objective.get("count",1))])
				"item": parts.append("Deliver %s ×%d" % [str(objective.get("target","")).trim_prefix("item."),int(objective.get("count",1))])
	return "; ".join(parts) if not parts.is_empty() else "Explore the Undercrypt."

func _to_string() -> String:
	return "<DomainQuest %s (%d) %s>" % [domain_id,id,domain_state]