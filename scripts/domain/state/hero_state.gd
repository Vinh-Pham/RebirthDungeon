class_name HeroState
extends "res://scripts/domain/state/actor_state.gd"
const Item = preload("res://scripts/domain/state/item_state.gd")
var items: Array[Item] = []
var committed_gold: int = 0

func copy() -> RefCounted:
	var result: RefCounted = super.copy()
	result.committed_gold = committed_gold
	for item: Item in items:
		result.items.append(item.copy())
	return result

func observation() -> Dictionary:
	var result := super.observation()
	var inventory: Array[Dictionary] = []
	for item: Item in items:
		inventory.append(item.observation())
	result["items"] = inventory
	result["committed_gold"] = committed_gold
	return result
