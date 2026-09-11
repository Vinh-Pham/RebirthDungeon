class_name SkillRank
extends Resource
@export var rank: String = "F"
@export var hp_cost: int = 0
@export var mp_cost: int = 0
@export var sp_cost: int = 0
@export var base_power: int = 0
@export var pip_scale: int = 0
@export var cooldown: int = 0
@export var duration: int = 0
@export var weights: PackedInt64Array = PackedInt64Array([1, 1, 1, 1, 1, 1])
