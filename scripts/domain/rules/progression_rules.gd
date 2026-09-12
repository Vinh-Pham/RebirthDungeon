extends RefCounted
const Inventory = preload("res://scripts/domain/rules/inventory_rules.gd")
static var CONFIG: Resource = load("res://content/progression/starter.tres")
const Item = preload("res://scripts/domain/state/item_state.gd")
const KINDS := ["buy_item","sell_item","bank_deposit","bank_withdraw","learn_lesson","read_book","insert_page","rank_up","equip_title","read_coupon","choose_talent","move_item","withdraw_item","split_stack","merge_stack","lock_item","equip_item","unequip_item","sort_items","bag_priority","talent_display"]
const INVENTORY_KINDS := ["move_item","withdraw_item","split_stack","merge_stack","lock_item","equip_item","unequip_item","sort_items"]
const DATA_FIELDS := {"item":TYPE_STRING,"destination":TYPE_STRING,"column":TYPE_INT,"row":TYPE_INT,"quantity":TYPE_INT}
static func valid_data(data: Dictionary) -> bool:
	if data.size() != DATA_FIELDS.size(): return false
	for key: String in DATA_FIELDS:
		if typeof(data.get(key)) != DATA_FIELDS[key]: return false
	return data.item.length() <= 256 and data.destination.length() <= 256 and data.quantity >= 0 and data.quantity <= 1000000 and data.column >= 0 and data.column <= 6 and data.row >= 0 and data.row <= 10

static func initialize(hero: RefCounted, catalog: RefCounted) -> void:
	if not hero.growth.is_empty(): return
	hero.growth = {"version":1,"banked":hero.committed_gold,"level":1,"xp":0,"cumulative":1,"ap":0,
		"age":17,"talent":"talent.combat","talent_chosen":false,"life_growth":{},"base_stats":hero.stats.duplicate(),
		"base_maximum":Array(hero.maximum),"titles":[],"known_titles":["title.delver"],"first":"","second":"","talent_display":"",
		"evidence":{},"bag_order":[]}
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
		"age":hero.growth.age,"talent":hero.growth.talent,"xp":0,"training":{},"items":[],"evidence":[],"closed":false}

static func activation(session: RefCounted, skill_id: String) -> void:
	if session.exploration == null or session.exploration.progression.is_empty() or skill_id.is_empty(): return
	var p: Dictionary = session.exploration.progression
	var total: int = session.hero.training.get(skill_id,0)+p.training.get(skill_id,0)
	p.training[skill_id] = p.training.get(skill_id,0)+mini(CONFIG.training_per_use,maxi(0,100-total))

static func encounter(session: RefCounted) -> void:
	if session.exploration == null or session.exploration.progression.is_empty(): return
	var p: Dictionary = session.exploration.progression
	var id: String = session.battle.encounter_id
	if p.evidence.has(id): return
	p.evidence.append(id)
	p.xp += CONFIG.encounter_xp
	p.items.append({"id":"item.focus_page_one" if id == "encounter.gallery" else "item.focus_page_two","quantity":1})

static func finish(session: RefCounted, success: bool, catalog: RefCounted) -> String:
	var ex: RefCounted = session.exploration
	if ex == null or ex.progression.is_empty(): return ""
	var p: Dictionary = ex.progression
	if p.closed: return "This outcome is already committed."
	if success and (not ex.resolved.has("encounter.gallery") or not ex.resolved.has("encounter.sanctum")): return "Defeat both sentinels before committing rewards."
	var hero: RefCounted = session.hero
	if success and hero.committed_gold+ex.pending_gold > Inventory.capacity(hero,catalog): return "Carried gold is full. Abandon or free gold capacity on a future run."
	if success:
		hero.growth.xp += p.xp
		while hero.growth.level <= CONFIG.xp_to_next.size() and hero.growth.xp >= CONFIG.xp_to_next[hero.growth.level-1]:
			hero.growth.xp -= CONFIG.xp_to_next[hero.growth.level-1]
			hero.growth.level += 1
			hero.growth.cumulative += 1
			hero.growth.ap += CONFIG.ap_per_level
			for key: String in CONFIG.talents[p.talent].growth:
				hero.growth.life_growth[key] = hero.growth.life_growth.get(key,0)+CONFIG.talents[p.talent].growth[key]
		if hero.growth.level > CONFIG.xp_to_next.size(): hero.growth.xp = 0
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
	for item: Item in hero.items: item.origin_id = ""
	p.closed = true
	hero.growth.talent_chosen = true
	recompute(hero,catalog)
	return ""

static func action(session: RefCounted, kind: String, data: Dictionary, operation: String, catalog: RefCounted) -> String:
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
				if hero.skill_ranks.has(CONFIG.lesson_skill): return "Already learned; training is unchanged."
				if hero.committed_gold < CONFIG.lesson_price: return "Lesson costs %d carried gold." % CONFIG.lesson_price
				hero.committed_gold -= CONFIG.lesson_price
				hero.skill_ranks[CONFIG.lesson_skill] = "F"
				hero.training[CONFIG.lesson_skill] = 0
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
			_: return "Unsupported progression action."
	if not error.is_empty(): return error
	recompute(hero,catalog)
	if hero.growth.banked > 1000000 or not Inventory.validate(hero,catalog): return "Inventory or carried gold capacity exceeded."
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
