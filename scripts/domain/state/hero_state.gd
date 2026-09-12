class_name HeroState
extends "res://scripts/domain/state/actor_state.gd"
const Item = preload("res://scripts/domain/state/item_state.gd")
var items: Array[Item] = []
var committed_gold: int = 0
var potions: int = 0 # Derived from accessible inventory once progression is enabled.
var growth: Dictionary = {}

func copy() -> RefCounted:
	var result: RefCounted = super.copy()
	result.committed_gold = committed_gold
	result.potions = potions
	result.growth = growth.duplicate(true)
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
	result["potions"] = potions
	result["growth"] = growth.duplicate(true)
	return result
