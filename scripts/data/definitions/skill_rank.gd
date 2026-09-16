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
## Critical chance in basis points for eligible direct attacks (0..10000).
## Without the learned Critical Hit passive, chance is zero in this adaptation.
@export var critical_chance: int = 0
## Critical Hit rank bonus in basis points added to combo damage on a critical.
@export var critical_bonus: int = 0
## Passive mastery contributions, e.g. {"melee_attack":1,"sword_attack":1,"defense":1}.
@export var mastery: Dictionary = {}
