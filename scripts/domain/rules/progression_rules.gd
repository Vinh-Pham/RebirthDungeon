extends RefCounted
const Inventory = preload("res://scripts/domain/rules/inventory_rules.gd")
const Limits = preload("res://scripts/domain/rules/rule_limits.gd")
static var CONFIG: Resource = load("res://content/progression/starter.tres")
const Item = preload("res://scripts/domain/state/item_state.gd")
const KINDS := ["buy_item","sell_item","bank_deposit","bank_withdraw","learn_lesson","read_book","insert_page","rank_up","equip_title","read_coupon","choose_talent","move_item","withdraw_item","split_stack","merge_stack","lock_item","equip_item","unequip_item","sort_items","bag_priority","talent_display","quest_accept","quest_claim","quest_track","apply_enchant","burn_item","rebirth","mission_enter"]
const INVENTORY_KINDS := ["move_item","withdraw_item","split_stack","merge_stack","lock_item","equip_item","unequip_item","sort_items"]
const DATA_FIELDS := {"item":TYPE_STRING,"destination":TYPE_STRING,"column":TYPE_INT,"row":TYPE_INT,"quantity":TYPE_INT}
## Outcome text of the last committed action, copied into its event by the resolver.
static var detail: String = ""
static func valid_data(data: Dictionary) -> bool:
	if data.size() != DATA_FIELDS.size(): return false
	for key: String in DATA_FIELDS:
		if typeof(data.get(key)) != DATA_FIELDS[key]: return false
	return data.item.length() <= 256 and data.destination.length() <= 256 and data.quantity >= 0 and data.quantity <= 1000000 and data.column >= 0 and data.column <= 6 and data.row >= 0 and data.row <= 10

static func initialize(hero: RefCounted, catalog: RefCounted) -> void:
	if not hero.growth.is_empty(): return
	hero.growth = {"version":2,"banked":hero.committed_gold,"level":1,"xp":0,"cumulative":1,"ap":0,
		"age":CONFIG.aging.start_age,"talent":"talent.combat","talent_chosen":false,"life_growth":{},"ledger":{},"base_stats":hero.stats.duplicate(),
		"base_maximum":Array(hero.maximum),"titles":[],"known_titles":["title.delver"],"first":"","second":"","talent_display":"",
		"evidence":{},"bag_order":[],"quests":{},"track":"","birth_week":-1,"birth_age":CONFIG.aging.start_age,
		"aged_to":CONFIG.aging.start_age,"rebirth_week":-1,"rebirths":0,"missions":{}}
	hero.committed_gold = 0
	var potions: int = hero.potions
	for item: Item in hero.items:
		item.container = "overflow"
		Inventory.place(hero,item,catalog,false)
	var sword_found := false
	for item: Item in hero.items:
		if catalog.definition(item.definition_id).weapon == "sword":
			item.container = "equip:main_hand"
			item.column = 0
			item.row = 0
			sword_found = true
			break
	if not sword_found and hero.weapon == "sword":
		var sword := Item.new()
		sword.instance_id = unique_prefix(hero,"starter:sword")
		sword.definition_id = "item.training_sword"
		sword.container = "equip:main_hand"
		hero.items.append(sword)
	Inventory.grant(hero,"item.field_bag",1,unique_prefix(hero,"starter:bag"),catalog,true)
	Inventory.grant(hero,"item.gold_bag",1,unique_prefix(hero,"starter:goldbag"),catalog,true)
	if potions > 0: Inventory.grant(hero,"item.potion",potions,unique_prefix(hero,"legacy:potions"),catalog,true)
	recompute(hero,catalog)
	deliver(hero,catalog)

## Quest engine: domain lifecycle is authoritative; QuestSystem pools mirror it.
static func quest_record(hero: RefCounted, id: String) -> Dictionary:
	var record: Variant = hero.growth.quests.get(id,{})
	return record if record is Dictionary else {}

static func fact_key(objective: Dictionary) -> String:
	match objective.get("type",""):
		"encounter": return "encounter:"+str(objective.target)
		"skill": return "skill:"+str(objective.target)
		"exit": return "exit"
		"mission": return "mission:"+str(objective.target)
	return ""

static func objective_ready(hero: RefCounted, quest_id: String, objective: Dictionary) -> bool:
	var needed: int = maxi(1,int(objective.get("count",1)))
	match objective.get("type",""):
		"item":
			return Inventory.count(hero,str(objective.target)) >= needed
		_:
			var key := fact_key(objective)
			return not key.is_empty() and int(hero.growth.get("ledger",{}).get(key,0)) >= needed
	return false

static func quest_complete(hero: RefCounted, id: String) -> bool:
	if not CONFIG.quests.has(id): return false
	var record: Dictionary = quest_record(hero,id)
	for stage: Variant in CONFIG.quests[id].stages:
		for objective: Variant in stage:
			if not objective_ready(hero,id,objective): return false
	return true

## Delivery: locked quests become available/active when their trigger commits.
## Idempotent by construction: only quests absent from growth can deliver once.
static func deliver(hero: RefCounted, catalog: RefCounted) -> void:
	for id: String in CONFIG.quests:
		if hero.growth.quests.has(id): continue
		var definition: Dictionary = CONFIG.quests[id]
		var trigger: Dictionary = definition.get("trigger",{})
		var reached := false
		match trigger.get("type",""):
			"start": reached = true
			"quest": reached = quest_record(hero,str(trigger.get("quest",""))).get("state","") == "claimed"
			"rank": reached = _rank_index(str(hero.skill_ranks.get(str(trigger.get("skill","")),""))) >= _rank_index(str(trigger.get("rank","F")))
			"equip":
				for item: Item in hero.items:
					if item.definition_id == str(trigger.get("item","")) and item.container.begins_with("equip:"):
						reached = true
						break
			"talent_rebirth": reached = int(hero.growth.get("rebirths",0)) > 0 and hero.growth.talent == str(trigger.get("talent",""))
		if not reached: continue
		hero.growth.quests[id] = {"state":"active" if definition.get("delivery","auto") == "auto" else "available",
			"stage":0,"claim":""}

static func _rank_index(rank: String) -> int:
	return Limits.RANKS.find(rank) if Limits.RANKS.has(rank) else -1

## Readiness re-evaluation: inventory changes may complete or unready item hand-ins.
static func refresh(hero: RefCounted, catalog: RefCounted) -> void:
	for id: String in hero.growth.quests:
		var record: Dictionary = quest_record(hero,id)
		if record.get("state","") not in ["active","ready"]: continue
		record.state = "ready" if quest_complete(hero,id) else "active"

## Pending run facts merge into the committed global ledger only on a
## successful exit, so later-delivered quests catch up on completed history.
static func merge_facts(hero: RefCounted, facts: Dictionary) -> void:
	var ledger: Dictionary = hero.growth.ledger
	for key: String in facts:
		ledger[key] = mini(1000000,int(ledger.get(key,0))+int(facts[key]))

## Aging reconciles only at application-driven town/result boundaries with an
## explicit injected clock. Backward clock changes never remove age or re-award.
static func reconcile_age(session: RefCounted, now_week: int) -> void:
	var hero: RefCounted = session.hero
	if hero == null or hero.growth.is_empty(): return
	session.clock_week = clampi(now_week,0,10000000)
	var now: int = session.clock_week
	if int(hero.growth.birth_week) < 0:
		hero.growth.birth_week = now
		return
	var policy: Dictionary = CONFIG.aging
	var elapsed: int = maxi(0,(now-int(hero.growth.birth_week))/maxi(1,int(policy.weeks_per_year)))
	var target: int = mini(int(policy.maximum_age),int(hero.growth.birth_age)+elapsed)
	if target > int(hero.growth.aged_to):
		hero.growth.ap = mini(1000000,int(hero.growth.ap)+(target-int(hero.growth.aged_to))*int(policy.ap_per_year))
		hero.growth.aged_to = target
		hero.growth.age = target

static func rebirth_eligible(hero: RefCounted, session: RefCounted) -> String:
	if hero.growth.is_empty(): return "Progression becomes available in town."
	if hero.growth.level <= CONFIG.xp_to_next.size(): return "Rebirth requires the level cap (%d)." % (CONFIG.xp_to_next.size()+1)
	if hero.committed_gold < int(CONFIG.rebirth.cost): return "Rebirth costs %d carried gold." % int(CONFIG.rebirth.cost)
	var ready_week: int = int(hero.growth.rebirth_week)+int(CONFIG.rebirth.cooldown_weeks)
	if int(hero.growth.rebirth_week) >= 0 and session.clock_week < ready_week:
		return "Rebirth cooldown: %d more weeks." % (ready_week-session.clock_week)
	return ""

## Enchant clauses: fixed effects always apply; conditional benefits apply only
## while their authored condition holds (evaluated live, e.g. across rebirths).
static func clause_active(enchant_id: String, hero: RefCounted) -> bool:
	var condition: Dictionary = CONFIG.enchants[enchant_id].get("condition",{})
	if condition.is_empty(): return true
	match condition.get("type",""):
		"talent": return hero.growth.talent == str(condition.get("talent",""))
	return false

static func enchant_values(enchant_id: String, stream: RefCounted) -> Dictionary:
	var definition: Dictionary = CONFIG.enchants[enchant_id]
	var values: Dictionary = {}
	for key: String in definition.get("effects",{}): values[key] = int(definition.effects[key])
	for key: String in definition.get("variable",{}):
		var range_values: Array = definition.variable[key]
		var span: int = maxi(1,int(range_values[1])-int(range_values[0])+1)
		values[key] = int(range_values[0])+stream.bounded(span)
	return values

static func accessible_stack(hero: RefCounted, definition_id: String, catalog: RefCounted) -> Item:
	for item: Item in hero.items:
		if item.definition_id == definition_id and item.container != "overflow" and not item.locked:
			return item
	return null


static func mastery(hero: RefCounted) -> Dictionary:
	var result := {}
	for id: String in CONFIG.talents:
		var points := 0
		for skill: String in CONFIG.talents[id].skills:
			if hero.skill_ranks.has(skill): points += 20 if hero.skill_ranks[skill] == "F" else 50
		result[id] = {"xp":points,"level":mini(15,points/50)}
	return result

static func sources(hero: RefCounted, catalog: RefCounted) -> Dictionary:
	var result := {"Starting profile":hero.growth.base_stats.duplicate(),"Life growth":hero.growth.life_growth.duplicate(),"Skill ranks":{},"Talent mastery":{},"Equipment":{},"Titles":{}}
	for i: int in 3: result["Starting profile"][["max_hp","max_mp","max_sp"][i]] = hero.growth.base_maximum[i]
	for skill: String in hero.skill_ranks:
		if hero.skill_ranks[skill] != "F":
			var stat := "stat.magic_attack" if skill in CONFIG.talents["talent.magic"].skills else "stat.strength"
			result["Skill ranks"][stat] = result["Skill ranks"].get(stat,0)+1
	for talent: String in mastery(hero):
		var stat: String = CONFIG.talents[talent].mastery_stat
		result["Talent mastery"][stat] = mastery(hero)[talent].level
	for item: Item in hero.items:
		if not item.container.begins_with("equip:"): continue
		var definition: Resource = catalog.definition(item.definition_id)
		for key: String in definition.modifiers: result.Equipment[key] = result.Equipment.get(key,0)+definition.modifiers[key]
		for key: String in item.rolled_modifiers: result.Equipment[key] = result.Equipment.get(key,0)+item.rolled_modifiers[key]
		for slot: String in ["prefix","suffix"]:
			var installed: Dictionary = item.installed_enchant(slot)
			var enchant_id: String = str(installed.get("id",""))
			if enchant_id.is_empty() or not CONFIG.enchants.has(enchant_id): continue
			var values: Dictionary = installed.get("values",{})
			for key: String in values: result.Equipment[key] = result.Equipment.get(key,0)+int(values[key])
			if clause_active(enchant_id,hero):
				for key: String in CONFIG.enchants[enchant_id].get("conditional",{}):
					result.Equipment[key] = result.Equipment.get(key,0)+int(CONFIG.enchants[enchant_id].conditional[key])
	for slot: String in ["first","second"]:
		var id: String = hero.growth[slot]
		if id.is_empty(): continue
		for key: String in CONFIG.titles[id].effects: result.Titles[key] = result.Titles.get(key,0)+CONFIG.titles[id].effects[key]
	return result

static func recompute(hero: RefCounted, catalog: RefCounted) -> void:
	if hero.growth.is_empty(): return
	var totals := {}
	for source: Dictionary in sources(hero,catalog).values():
		for key: String in source: totals[key] = totals.get(key,0)+source[key]
	for key: String in hero.stats: hero.stats[key] = clampi(totals.get(key,0),0,1000000)
	for i: int in 3:
		hero.maximum[i] = clampi(totals.get(["max_hp","max_mp","max_sp"][i],0),1 if i == 0 else 0,1000000)
		hero.current[i] = mini(hero.current[i],hero.maximum[i])
	hero.weapon = ""
	for item: Item in hero.items:
		if item.container == "equip:main_hand": hero.weapon = catalog.definition(item.definition_id).weapon
	Inventory.refresh(hero)

static func begin(session: RefCounted) -> void:
	if session.hero.growth.is_empty(): return
	var hero: RefCounted = session.hero
	for item: Item in hero.items: item.origin_id = item.instance_id
	session.exploration.progression = {"origins":hero.observation().items,"stats":hero.stats.duplicate(),"maximum":Array(hero.maximum),
		"ranks":hero.skill_ranks.duplicate(),"first":hero.growth.first,"second":hero.growth.second,
		"age":hero.growth.age,"talent":hero.growth.talent,"xp":0,"training":{},"items":[],"evidence":[],"facts":{},"closed":false}

static func activation(session: RefCounted, skill_id: String, context: Dictionary = {}, source: RefCounted = null, catalog: RefCounted = null) -> void:
	if session.exploration == null or session.exploration.progression.is_empty() or skill_id.is_empty(): return
	var p: Dictionary = session.exploration.progression
	var total: int = session.hero.training.get(skill_id,0)+p.training.get(skill_id,0)
	p.training[skill_id] = p.training.get(skill_id,0)+mini(CONFIG.training_per_use,maxi(0,100-total))
	var facts: Dictionary = p.get("facts",{})
	facts["skill:"+skill_id] = mini(1000000,int(facts.get("skill:"+skill_id,0))+1)
	# Area outcomes: one multi-target fact per action with two or more valid hits.
	if int(context.get("hits",0)) >= 2:
		facts["multi:"+skill_id] = mini(1000000,int(facts.get("multi:"+skill_id,0))+1)
	if int(context.get("criticals",0)) > 0:
		facts["critical:"+skill_id] = mini(1000000,int(facts.get("critical:"+skill_id,0))+1)
	p["facts"] = facts
	# Passive training: each learned passive gains exactly once per committed
	# activation, independent of target count. Passives never grant turns.
	_train_passives(session, skill_id, context, source, catalog)

static func _train_passives(session: RefCounted, skill_id: String, context: Dictionary, source: RefCounted, catalog: RefCounted) -> void:
	if catalog == null or source == null: return
	var skill: Resource = catalog.definition(skill_id)
	if skill == null: return
	for passive_id: String in source.skill_ranks:
		var passive: Resource = catalog.definition(passive_id)
		if passive == null or passive.effect != "passive": continue
		var qualifies: bool = false
		if passive_id == "skill.combat_mastery":
			qualifies = skill.effect == "physical_damage"
		elif passive_id == "skill.sword_mastery":
			qualifies = skill.effect == "physical_damage" and skill.weapon == "sword"
		elif passive_id == "skill.critical":
			qualifies = int(context.get("criticals",0)) > 0
		if not qualifies: continue
		_train(session, passive_id)

## One training point for one skill, bounded by the 100-point rank gate.
static func _train(session: RefCounted, skill_id: String) -> void:
	var p: Dictionary = session.exploration.progression
	var total: int = session.hero.training.get(skill_id,0)+p.training.get(skill_id,0)
	p.training[skill_id] = p.training.get(skill_id,0)+mini(CONFIG.training_per_use,maxi(0,100-total))

## A successful Counterattack trains the stance once per resolved reaction.
static func reaction(session: RefCounted, skill_id: String) -> void:
	if session.exploration == null or session.exploration.progression.is_empty() or skill_id.is_empty(): return
	var p: Dictionary = session.exploration.progression
	_train(session, skill_id)
	var facts: Dictionary = p.get("facts",{})
	facts["counter:"+skill_id] = mini(1000000,int(facts.get("counter:"+skill_id,0))+1)
	p["facts"] = facts

static func encounter(session: RefCounted, catalog: RefCounted) -> void:
	if session.exploration == null or session.exploration.progression.is_empty(): return
	var p: Dictionary = session.exploration.progression
	var id: String = session.battle.encounter_id
	if p.evidence.has(id): return
	p.evidence.append(id)
	p.xp += CONFIG.encounter_xp
	var facts: Dictionary = p.get("facts",{})
	facts["encounter:"+id] = mini(1000000,int(facts.get("encounter:"+id,0))+1)
	p["facts"] = facts
	# Phase 11 authored drop tables replace the hardcoded sentinel pages. The
	# required table grants one entry per distinct required victory, in order,
	# so the focus-book quest chain stays completable in every generated layout.
	var def: Resource = catalog.definition(session.exploration.world_id) if catalog != null else null
	if def == null: return
	if PackedStringArray(def.required_encounters).has(id):
		var won_required: int = 0
		for required_id: String in session.exploration.required_encounters():
			if p.evidence.has(required_id): won_required += 1
		var drop_index: int = won_required - 1
		if drop_index >= 0 and drop_index < def.required_drops.size() and def.required_drops[drop_index] is Dictionary:
			p.items.append({"id":str(def.required_drops[drop_index].item_id),"quantity":int(def.required_drops[drop_index].quantity)})
	# Bonus drops roll per distinct victory on the independent loot stream, in
	# authored order: one chance draw, then one bounded quantity draw on a hit.
	# A full pending bundle skips further bonus draws without consuming RNG.
	if p.items.size() >= preload("res://scripts/domain/rules/dungeon_rules.gd").MAX_DROPS: return
	var loot: RefCounted = session.rng.stream("loot") if session.rng != null else null
	if loot == null or not loot.has_method("bounded"): return
	for drop: Variant in def.bonus_drops:
		if not drop is Dictionary or str(drop.get("encounter_id","")) != id: continue
		var chance: int = int(drop.get("chance_bp",0))
		var roll: int = loot.bounded(10000)
		if roll < 0 or roll >= chance: continue
		var span: int = int(drop.get("max_quantity",1))-int(drop.get("min_quantity",1))+1
		var quantity: int = int(drop.get("min_quantity",1)) + maxi(0,loot.bounded(maxi(1,span)))
		p.items.append({"id":str(drop.get("item_id","")),"quantity":quantity})
		if p.items.size() >= preload("res://scripts/domain/rules/dungeon_rules.gd").MAX_DROPS: return

static func finish(session: RefCounted, success: bool, catalog: RefCounted) -> String:
	var ex: RefCounted = session.exploration
	if ex == null or ex.progression.is_empty(): return ""
	var p: Dictionary = ex.progression
	if p.closed: return "This outcome is already committed."
	# Phase 11: the exit unlocks when every required encounter of the saved
	# layout is resolved; optional guardians never gate the return arch.
	var outstanding: Array[String] = ex.outstanding_required()
	if success and not outstanding.is_empty(): return "Defeat the remaining guardians before committing rewards."
	var hero: RefCounted = session.hero
	if success and hero.committed_gold+ex.pending_gold > Inventory.capacity(hero,catalog): return "Carried gold is full. Abandon or free gold capacity on a future run."
	if success:
		var facts: Dictionary = p.get("facts",{})
		facts["exit"] = mini(1000000,int(facts.get("exit",0))+1)
		merge_facts(hero,facts)
		grant_xp(hero,p.xp,p.talent)
		for skill: String in p.training: hero.training[skill] = mini(100,hero.training.get(skill,0)+p.training[skill])
		for index: int in p.items.size():
			var reward: Dictionary = p.items[index]
			Inventory.grant(hero,reward.id,reward.quantity,"reward:%d:%d" % [session.revision,index],catalog,true)
		for title: String in ["title.delver","title.breaker"]:
			if not hero.growth.titles.has(title): hero.growth.titles.append(title)
			if not hero.growth.known_titles.has(title): hero.growth.known_titles.append(title)
		hero.growth.evidence["undercrypt_clears"] = mini(1000000,hero.growth.evidence.get("undercrypt_clears",0)+1)
		hero.growth.evidence["reached_level"] = hero.growth.level
	else:
		hero.committed_gold -= hero.committed_gold*30/100
	p.xp = 0
	p.training.clear()
	p.items.clear()
	p.evidence.clear()
	p["facts"] = {}
	for item: Item in hero.items: item.origin_id = ""
	p.closed = true
	hero.growth.talent_chosen = true
	recompute(hero,catalog)
	deliver(hero,catalog)
	refresh(hero,catalog)
	return ""

## Shared level-up loop for committed XP rewards (exits and quest claims).
static func grant_xp(hero: RefCounted, amount: int, talent_id: String) -> void:
	if amount <= 0: return
	hero.growth.xp += amount
	var talent: Dictionary = CONFIG.talents[talent_id if CONFIG.talents.has(talent_id) else hero.growth.talent]
	while hero.growth.level <= CONFIG.xp_to_next.size() and hero.growth.xp >= CONFIG.xp_to_next[hero.growth.level-1]:
		hero.growth.xp -= CONFIG.xp_to_next[hero.growth.level-1]
		hero.growth.level += 1
		hero.growth.cumulative += 1
		hero.growth.ap += CONFIG.ap_per_level
		for key: String in talent.growth:
			hero.growth.life_growth[key] = hero.growth.life_growth.get(key,0)+int(talent.growth[key])
	if hero.growth.level > CONFIG.xp_to_next.size(): hero.growth.xp = 0

static func action(session: RefCounted, kind: String, data: Dictionary, operation: String, catalog: RefCounted) -> String:
	detail = ""
	if session.hero.growth.is_empty(): return "Progression becomes available in town."
	if not valid_data(data): return "Invalid progression inputs."
	var hero: RefCounted = session.hero
	var town: bool = session.mode == SessionShell.Mode.TOWN
	if not town and (kind not in ["move_item","split_stack","merge_stack","sort_items"] or session.mode not in [SessionShell.Mode.DUNGEON,SessionShell.Mode.BATTLE] or (session.battle != null and session.battle.phase == 1)): return "Unavailable during a run."
	if not town and session.battle != null and (session.battle.phase != 0 or session.battle.active_actor_id != "hero"): return "Inventory waits until your next selection."
	var item: Item = Inventory.find(hero,data.item)
	var error := ""
	if kind in INVENTORY_KINDS:
		error = Inventory.action(hero,kind,data,operation,catalog)
	else:
		match kind:
			"buy_item":
				var definition: Resource = catalog.definition(data.item)
				if definition == null or not data.item.begins_with("item.") or data.quantity < 1 or data.quantity > 100: return "Invalid shop quantity."
				var cost: int = definition.price*data.quantity
				if hero.committed_gold < cost: return "Withdraw enough carried gold at the bank."
				if not Inventory.grant(hero,data.item,data.quantity,operation,catalog,false): return "No room for the complete purchase."
				hero.committed_gold -= cost
			"sell_item":
				if item == null or item.locked or item.container == "overflow" or item.container.begins_with("equip:"): return "Cannot sell this item."
				for child: Item in hero.items:
					if child.container == item.instance_id: return "Empty the bag before selling."
				var value: int = catalog.definition(item.definition_id).price*data.quantity/2
				if not Inventory.consume(hero,item,data.quantity): return "Invalid sale quantity."
				hero.committed_gold += value
				if Inventory.find(hero,data.item) == null: hero.growth.bag_order.erase(data.item)
			"bank_deposit","bank_withdraw":
				if data.quantity < 1: return "Choose a positive amount."
				if kind == "bank_deposit":
					if hero.committed_gold < data.quantity: return "Not enough carried gold."
					hero.committed_gold -= data.quantity
					hero.growth.banked += data.quantity
				else:
					if hero.growth.banked < data.quantity: return "Not enough banked gold."
					hero.growth.banked -= data.quantity
					hero.committed_gold += data.quantity
			"learn_lesson":
				var lesson_skill: String = data.item if not data.item.is_empty() else CONFIG.lesson_skill
				var price: int = CONFIG.lesson_price
				if not data.item.is_empty():
					if not CONFIG.lessons.has(data.item): return "The keeper does not teach that lesson."
					price = int(CONFIG.lessons[data.item].price)
				if hero.skill_ranks.has(lesson_skill): return "Already learned; training is unchanged."
				if hero.committed_gold < price: return "Lesson costs %d carried gold." % price
				hero.committed_gold -= price
				hero.skill_ranks[lesson_skill] = "F"
				hero.training[lesson_skill] = 0
				detail = "Learned %s at rank F." % lesson_skill.trim_prefix("skill.")
			"read_book":
				if item == null or item.container == "overflow": return "Choose a carried book."
				var definition: Resource = catalog.definition(item.definition_id)
				if definition.category != "book" or definition.skill_id.is_empty(): return "Complete the book first."
				if hero.skill_ranks.has(definition.skill_id): return "Already learned; book retained."
				if not Inventory.consume(hero,item): return "Unlock the book first."
				hero.skill_ranks[definition.skill_id] = "F"
				hero.training[definition.skill_id] = 0
			"insert_page":
				var page := Inventory.find(hero,data.destination)
				if item == null or page == null or item.locked or item.container == "overflow" or page.container == "overflow": return "Choose an accessible incomplete book and page."
				var book_def: Resource = catalog.definition(item.definition_id)
				var page_def: Resource = catalog.definition(page.definition_id)
				if page_def.book_id != item.definition_id or not book_def.required_pages.has(page_def.page_id) or item.pages.has(page_def.page_id): return "Wrong or duplicate page."
				if not Inventory.consume(hero,page): return "Unlock the page first."
				item.pages.append(page_def.page_id)
				if item.pages.size() == book_def.required_pages.size():
					item.definition_id = book_def.complete_book
					item.pages.clear()
			"rank_up":
				var skill: Resource = catalog.definition(data.item)
				if skill == null or not data.item.begins_with("skill.") or not hero.skill_ranks.has(data.item): return "Learn this skill first."
				var rank: String = hero.skill_ranks[data.item]
				if rank == skill.prototype_cap: return "Prototype rank cap: "+rank
				if hero.training.get(data.item,0) < 100 or hero.growth.ap < CONFIG.rank_ap_cost: return "Needs 100 training and %d AP." % CONFIG.rank_ap_cost
				for index: int in skill.ranks.size()-1:
					if skill.ranks[index].rank == rank:
						hero.skill_ranks[data.item] = skill.ranks[index+1].rank
						break
				hero.training[data.item] = 0
				hero.growth.ap -= CONFIG.rank_ap_cost
			"equip_title":
				if data.destination not in ["first","second"]: return "Invalid title slot."
				if not data.item.is_empty() and (not CONFIG.titles.has(data.item) or not hero.growth.titles.has(data.item) or CONFIG.titles[data.item].slot != data.destination): return "Earn a compatible title first."
				hero.growth[data.destination] = data.item
			"read_coupon":
				if item == null: return "Choose a coupon."
				var definition: Resource = catalog.definition(item.definition_id)
				if definition.category != "coupon" or hero.growth.titles.has(definition.title_id): return "Coupon already earned or incompatible."
				if not Inventory.consume(hero,item): return "Withdraw or unlock the coupon first."
				hero.growth.titles.append(definition.title_id)
				if not hero.growth.known_titles.has(definition.title_id): hero.growth.known_titles.append(definition.title_id)
			"choose_talent":
				if hero.growth.talent_chosen or not CONFIG.talents.has(data.item): return "Talent is fixed for this life."
				hero.growth.talent = data.item
				hero.growth.talent_chosen = true
			"talent_display":
				if not data.item.is_empty() and not CONFIG.talents.has(data.item): return "Unknown talent display."
				hero.growth.talent_display = data.item
			"bag_priority":
				if data.item == "backpack" or Inventory.dimensions(hero,data.item,catalog) == Vector2i.ZERO: return "Choose a bag."
				hero.growth.bag_order.erase(data.item)
				hero.growth.bag_order.push_front(data.item)
			"quest_accept":
				if not CONFIG.quests.has(data.item): return "Unknown quest."
				if quest_record(hero,data.item).get("state","") != "available": return "This quest is not offered right now."
				hero.growth.quests[data.item].state = "active"
			"quest_claim":
				error = claim_quest(hero,data,catalog,operation)
			"quest_track":
				if not data.item.is_empty() and (not CONFIG.quests.has(data.item) or not hero.growth.quests.has(data.item)): return "Track a delivered quest."
				hero.growth.track = data.item
			"apply_enchant":
				error = apply_enchant(session,hero,data,catalog)
			"burn_item":
				error = burn_item(session,hero,data,catalog)
			"rebirth":
				error = perform_rebirth(session,hero,data,catalog)
			_: return "Unsupported progression action."
	if not error.is_empty(): return error
	recompute(hero,catalog)
	if hero.growth.banked > 1000000 or not Inventory.validate(hero,catalog): return "Inventory or carried gold capacity exceeded."
	deliver(hero,catalog)
	refresh(hero,catalog)
	return ""

static func unique_prefix(hero: RefCounted, base: String) -> String:
	var prefix := base
	var suffix := 0
	while true:
		var collision := false
		for item: Item in hero.items:
			if item.instance_id == prefix or item.instance_id.begins_with(prefix+":"): collision = true
		if not collision: return prefix
		suffix += 1
		prefix = base+"-"+str(suffix)
	return prefix

## Explicit town hand-in/claim. Item objectives are revalidated against the
## live inventory so spending the required items elsewhere unreads the quest.
static func claim_quest(hero: RefCounted, data: Dictionary, catalog: RefCounted, operation: String) -> String:
	if not CONFIG.quests.has(data.item): return "Unknown quest."
	var record: Dictionary = quest_record(hero,data.item)
	if record.is_empty(): return "This quest was never delivered."
	var state: String = str(record.get("state",""))
	if state == "claimed": return "This quest was already claimed."
	if state != "ready": return "Objectives are not complete yet."
	var definition: Dictionary = CONFIG.quests[data.item]
	for stage: Variant in definition.stages:
		for objective: Variant in stage:
			if str(objective.get("type","")) != "item": continue
			var remaining: int = maxi(1,int(objective.get("count",1)))
			while remaining > 0:
				var stack: Item = accessible_stack(hero,str(objective.target),catalog)
				if stack == null: return "The required items are no longer carried."
				var take: int = mini(remaining,stack.quantity)
				if not Inventory.consume(hero,stack,take): return "Unlock the required items first."
				remaining -= take
	var rewards: Dictionary = definition.get("rewards",{})
	if int(rewards.get("gold",0)) > 0: hero.committed_gold += int(rewards.gold)
	if int(rewards.get("xp",0)) > 0: grant_xp(hero,int(rewards.xp),hero.growth.talent)
	if int(rewards.get("ap",0)) > 0: hero.growth.ap = mini(1000000,int(hero.growth.ap)+int(rewards.ap))
	var title: String = str(rewards.get("title",""))
	if not title.is_empty() and CONFIG.titles.has(title):
		if not hero.growth.titles.has(title): hero.growth.titles.append(title)
		if not hero.growth.known_titles.has(title): hero.growth.known_titles.append(title)
	var skill: String = str(rewards.get("skill",""))
	if not skill.is_empty() and catalog.definition(skill) != null and not hero.skill_ranks.has(skill):
		hero.skill_ranks[skill] = "F"
		hero.training[skill] = 0
	var item_reward: Dictionary = rewards.get("item",{})
	if not item_reward.is_empty() and not Inventory.grant(hero,str(item_reward.get("id","")),maxi(1,int(item_reward.get("quantity",1))),"quest:"+operation,catalog,false):
		return "No room for the quest reward."
	record.state = "claimed"
	record.claim = operation
	deliver(hero,catalog)
	refresh(hero,catalog)
	return ""

## Role-playing mission sessions: a borrowed NPC actor fights the authored
## encounter in an isolated battle. The hero never participates; borrowed
## skills and gear cannot export. Only a committed victory records the
## mission evidence, grants authored rewards and can advance quests.
static func mission_record(hero: RefCounted, mission_id: String) -> Dictionary:
	var missions: Dictionary = hero.growth.get("missions",{})
	var record: Variant = missions.get(mission_id,{})
	return record if record is Dictionary else {}

## Commits a finished mission battle inside the caller's candidate session.
## Victory grants rewards once and merges mission evidence into the committed
## ledger; failure and abandonment change nothing, so the scenario stays
## available for a deliberate retry. The mission context clears either way.
static func mission_complete(session: RefCounted, catalog: RefCounted, operation: String) -> String:
	var mission_id: String = str(session.mission_id)
	var battle: RefCounted = session.battle
	if mission_id.is_empty() or battle == null or str(battle.mission_id) != mission_id: return "No mission is active."
	if battle.phase != BattleState.Phase.FINISHED: return "The battle is not finished."
	var mission: Dictionary = CONFIG.missions.get(mission_id,{})
	if battle.outcome == "victory":
		var hero: RefCounted = session.hero
		var missions: Dictionary = hero.growth.get("missions",{})
		var record: Dictionary = mission_record(hero,mission_id)
		if record.get("state","") == "claimed": return "This outcome is already committed."
		var rewards: Dictionary = mission.get("rewards",{})
		merge_facts(hero,{"mission:"+mission_id:1})
		if int(rewards.get("gold",0)) > 0: hero.committed_gold = mini(1000000,hero.committed_gold+int(rewards.gold))
		if int(rewards.get("xp",0)) > 0: grant_xp(hero,int(rewards.xp),hero.growth.talent)
		missions[mission_id] = {"state":"claimed","claim":operation}
		hero.growth["missions"] = missions
		deliver(hero,catalog)
		refresh(hero,catalog)
		detail = "The memory is recorded. The keeper will want to hear of it."
	else:
		detail = "The memory fades. The scenario can be attempted again."
	session.mission_id = ""
	session.battle = null
	return ""

## Deliberate rebirth: level cap, carried cost and authored cooldown gate it.
## Mastery, ranks, training, AP, titles, banked gold and committed quest
## history survive; life growth, level and XP reset without an AP refund.
static func perform_rebirth(session: RefCounted, hero: RefCounted, data: Dictionary, catalog: RefCounted) -> String:
	var blocker: String = rebirth_eligible(hero,session)
	if not blocker.is_empty(): return blocker
	if not data.destination.is_valid_int(): return "Choose a rebirth age."
	var age: int = data.destination.to_int()
	if age < int(CONFIG.rebirth.choice_minimum) or age > int(CONFIG.rebirth.choice_maximum):
		return "Rebirth ages span %d-%d." % [int(CONFIG.rebirth.choice_minimum),int(CONFIG.rebirth.choice_maximum)]
	if not data.item.is_empty() and not CONFIG.talents.has(data.item): return "Unknown talent."
	hero.committed_gold -= int(CONFIG.rebirth.cost)
	hero.growth.rebirth_week = session.clock_week
	hero.growth.birth_week = session.clock_week
	hero.growth.birth_age = age
	hero.growth.aged_to = age
	hero.growth.age = age
	hero.growth.rebirths = int(hero.growth.rebirths)+1
	hero.growth.level = 1
	hero.growth.xp = 0
	hero.growth.life_growth = {}
	hero.growth.talent_chosen = false
	if not data.item.is_empty(): hero.growth.talent = data.item
	if not hero.growth.titles.has("title.reborn"):
		hero.growth.titles.append("title.reborn")
		if not hero.growth.known_titles.has("title.reborn"): hero.growth.known_titles.append("title.reborn")
	deliver(hero,catalog)
	refresh(hero,catalog)
	detail = "Reborn at age %d. Level, XP and life growth reset; skills, training, AP, titles and quests are retained." % age
	return ""

## One prefix and one suffix per equipment instance; an occupied slot replaces
## on success only. Scroll, powder and MP are spent on success and failure.
static func apply_enchant(session: RefCounted, hero: RefCounted, data: Dictionary, catalog: RefCounted) -> String:
	var target: Item = Inventory.find(hero,data.item)
	var scroll: Item = Inventory.find(hero,data.destination)
	if target == null or scroll == null: return "Choose carried equipment and a scroll."
	if target.container == "overflow" or scroll.container == "overflow": return "Withdraw both items first."
	var scroll_definition: Resource = catalog.definition(scroll.definition_id)
	if scroll_definition == null or scroll_definition.category != "enchant_scroll" or not CONFIG.enchants.has(scroll_definition.enchant_id):
		return "Choose an enchant scroll."
	var enchant: Dictionary = CONFIG.enchants[scroll_definition.enchant_id]
	var target_definition: Resource = catalog.definition(target.definition_id)
	if target_definition == null or target_definition.category != "equipment": return "Enchants apply to equipment."
	if not enchant.get("targets",[]).has(target_definition.category): return "This scroll does not fit that equipment."
	var slot: String = str(enchant.get("slot","prefix"))
	var powder: Item = accessible_stack(hero,"item.powder",catalog)
	if powder == null: return "Enchanting consumes one magic powder."
	var mp_cost: int = int(enchant.get("mp_cost",0))
	if hero.current[1] < mp_cost: return "Not enough MP."
	if scroll.quantity <= 1: hero.items.erase(scroll)
	else: scroll.quantity -= 1
	if not Inventory.consume(hero,powder,1): return "Unlock the powder first."
	hero.current[1] -= mp_cost
	var stream: RefCounted = session.rng.stream("enchant")
	var success: bool = stream.bounded(10000) < int(enchant.get("chance",0))
	if success:
		target.enchants[slot] = {"id":scroll_definition.enchant_id,"values":enchant_values(scroll_definition.enchant_id,stream)}
		detail = "%s now carries %s in its %s slot." % [target_definition.display_name,enchant.name,slot]
	else:
		detail = "The enchant failed. Scroll, powder and MP are spent; the equipment keeps its current enchants."
	return ""

## Destructive burning: one independent draw per installed slot; empty slots
## never draw. Recovered scrolls must fit the inventory or the attempt aborts.
static func burn_item(session: RefCounted, hero: RefCounted, data: Dictionary, catalog: RefCounted) -> String:
	var target: Item = Inventory.find(hero,data.item)
	if target == null or target.container == "overflow": return "Choose carried equipment."
	var target_definition: Resource = catalog.definition(target.definition_id)
	if target_definition == null or target_definition.category != "equipment": return "Only equipment can be burned."
	if target.locked: return "Unlock the item before burning it."
	var stream: RefCounted = session.rng.stream("enchant")
	var recovered: Array[String] = []
	for slot: String in ["prefix","suffix"]:
		var installed: Dictionary = target.installed_enchant(slot)
		var enchant_id: String = str(installed.get("id",""))
		if enchant_id.is_empty() or not CONFIG.enchants.has(enchant_id): continue
		if stream.bounded(10000) < int(CONFIG.enchants[enchant_id].get("burn_chance",0)):
			recovered.append(str(CONFIG.enchants[enchant_id].get("scroll","")))
	hero.items.erase(target)
	var names: Array[String] = []
	var index: int = 0
	for scroll_id: String in recovered:
		if scroll_id.is_empty() or catalog.definition(scroll_id) == null: continue
		if not Inventory.grant(hero,scroll_id,1,"burn:%d:%d" % [session.revision,index],catalog,false):
			return "No room for the recovered scrolls."
		names.append(catalog.definition(scroll_id).display_name)
		index += 1
	detail = "The item burned away. Recovered: "+", ".join(names)+"." if not names.is_empty() else "The item burned away. Nothing was recovered."
	return ""
