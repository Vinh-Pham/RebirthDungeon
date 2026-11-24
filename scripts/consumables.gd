extends RefCounted

const TONIC := "tonic"
const TONIC_HEAL := 30


static func use_item(item_id: String, world: Dictionary, health: int, maximum_health: int) -> Dictionary:
	if item_id != TONIC:
		return {"message": "This item cannot be used.", "changes": {}}
	var count := int(world.get("tonics", 0))
	if count <= 0:
		return {"message": "You have no Healing Tonics.", "changes": {}}
	if health < 0 or health >= maximum_health:
		return {"message": "Life is already full.", "changes": {}}
	var restored := mini(TONIC_HEAL, maximum_health - health)
	return {
		"message": "Healing Tonic restored %d Life." % restored,
		"changes": {"health": health + restored, "tonics": count - 1},
	}
