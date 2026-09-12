extends Resource
@export var version: int = 1
@export var xp_to_next: PackedInt64Array = PackedInt64Array([100,150,200,250])
@export var ap_per_level: int = 1
@export var rank_ap_cost: int = 1
@export var training_per_use: int = 50
@export var encounter_xp: int = 75
@export var talents: Dictionary = {
	"talent.combat":{"name":"Close Combat","skills":["skill.sword","skill.fortify","skill.blood"],"growth":{"max_hp":2,"stat.strength":1},"mastery_stat":"stat.defense"},
	"talent.magic":{"name":"Magic","skills":["skill.spark","skill.focus"],"growth":{"max_mp":2,"stat.magic_attack":1},"mastery_stat":"stat.magic_defense"}}
@export var titles: Dictionary = {
	"title.delver":{"name":"the First Delver","slot":"first","hint":"Clear the Undercrypt","effects":{"max_hp":10}},
	"title.breaker":{"name":"the Guardian Breaker","slot":"first","hint":"Clear both sentinels","effects":{"stat.strength":3,"max_mp":-5}},
	"title.lantern":{"name":"Lantern Companion","slot":"second","hint":"Read a Lantern coupon","effects":{"max_hp":5}}}
@export var lesson_skill: String = "skill.blood"
@export var lesson_price: int = 10
