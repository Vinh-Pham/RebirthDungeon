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
	"title.lantern":{"name":"Lantern Companion","slot":"second","hint":"Read a Lantern coupon","effects":{"max_hp":5}},
	"title.scribe":{"name":"Keeper's Scribe","slot":"first","hint":"Complete the keeper's record quest","effects":{"max_mp":8}},
	"title.reborn":{"name":"the Second Life","slot":"second","hint":"Rebirth for the first time","effects":{"max_sp":5}}}
@export var lesson_skill: String = "skill.blood"
@export var lesson_price: int = 10
## Aging clock policy: integer weeks; reconciled only at town/result boundaries.
@export var aging: Dictionary = {"weeks_per_year":52,"ap_per_year":1,"start_age":16,"minimum_age":10,"maximum_age":80}
## Rebirth economy: deliberate town action at the level cap.
@export var rebirth: Dictionary = {"cost":50,"cooldown_weeks":2,"choice_minimum":10,"choice_maximum":17}
## Enchants: one prefix and one suffix per equipment instance. Chances are basis points capped at 9000.
@export var enchants: Dictionary = {
	"enchant.keen":{"name":"Keen","slot":"prefix","rank":1,"targets":["equipment"],"scroll":"item.scroll_keen","chance":8000,"mp_cost":5,
		"effects":{"stat.strength":1},"variable":{"stat.strength":[1,2]},"conditional":{},"condition":{},"burn_chance":5000},
	"enchant.spellweave":{"name":"Spellweave","slot":"suffix","rank":1,"targets":["equipment"],"scroll":"item.scroll_spellweave","chance":7000,"mp_cost":8,
		"effects":{"max_mp":-3},"variable":{},"conditional":{"stat.magic_attack":2},"condition":{"type":"talent","talent":"talent.magic"},"burn_chance":4000},
	"enchant.fortunate":{"name":"Fortunate","slot":"suffix","rank":2,"targets":["equipment"],"scroll":"item.scroll_fortunate","chance":6000,"mp_cost":10,
		"effects":{},"variable":{"max_hp":[2,6]},"conditional":{},"condition":{},"burn_chance":3000}}
## Quest slice: stable IDs, unique numeric Quest.id mapping, ordered stages and objectives.
## Objective types: encounter (defeat), exit (successful expedition), skill (successful activations),
## item (hand-in, consumed on claim), rank (skill reaches rank). Delivery: auto or npc.
@export var quests: Dictionary = {
	"quest.main.seal":{"name":"The Broken Seal","numeric":1,"category":"mainstream","chapter":"chapter.ruins","generation":"generation.seal",
		"delivery":"auto","trigger":{"type":"start"},"tab":"mainstream","successor":"quest.main.expedition",
		"stages":[[{"type":"encounter","target":"encounter.gallery","count":1},{"type":"encounter","target":"encounter.sanctum","count":1},{"type":"exit","count":1}]],
		"rewards":{"gold":25,"xp":50}},
	"quest.main.expedition":{"name":"The Missing Expedition","numeric":2,"category":"mainstream","chapter":"chapter.ruins","generation":"generation.missing",
		"delivery":"npc","npc":"npc.keeper","trigger":{"type":"quest","quest":"quest.main.seal"},"tab":"mainstream","successor":"",
		"stages":[[{"type":"skill","target":"skill.sword","count":2},{"type":"exit","count":1}]],
		"rewards":{"ap":1,"gold":40}},
	"quest.side.record":{"name":"The Keeper's Record","numeric":3,"category":"side","delivery":"npc","npc":"npc.keeper",
		"trigger":{"type":"start"},"tab":"side","successor":"",
		"stages":[[{"type":"item","target":"item.focus_book","count":1}]],
		"rewards":{"gold":15,"title":"title.scribe"}},
	"quest.side.focus_unlock":{"name":"Words of Focus","numeric":4,"category":"side","delivery":"npc","npc":"npc.keeper",
		"trigger":{"type":"start"},"tab":"side","successor":"",
		"stages":[[{"type":"encounter","target":"encounter.gallery","count":1},{"type":"encounter","target":"encounter.sanctum","count":1}]],
		"rewards":{"skill":"skill.focus"}},
	"quest.skill.focus_milestone":{"name":"Focused Practice","numeric":5,"category":"skill","delivery":"auto",
		"trigger":{"type":"rank","skill":"skill.focus","rank":"E"},"tab":"skills","successor":"",
		"stages":[[{"type":"skill","target":"skill.focus","count":2}]],
		"rewards":{"gold":10,"item":{"id":"item.potion","quantity":1}}},
	"quest.skill.greatsword":{"name":"Weight of the Blade","numeric":6,"category":"skill","delivery":"auto",
		"trigger":{"type":"equip","item":"item.great_sword"},"tab":"skills","successor":"",
		"stages":[[{"type":"encounter","target":"encounter.gallery","count":1}]],
		"rewards":{"gold":10}},
	"quest.skill.second_life":{"name":"A Second Beginning","numeric":7,"category":"skill","delivery":"auto",
		"trigger":{"type":"talent_rebirth","talent":"talent.magic"},"tab":"skills","successor":"",
		"stages":[[{"type":"skill","target":"skill.spark","count":2}]],
		"rewards":{"gold":15}}}
