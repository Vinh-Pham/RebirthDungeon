extends RefCounted
const Inventory = preload("res://scripts/domain/rules/inventory_rules.gd")
const Rules = preload("res://scripts/domain/rules/progression_rules.gd")
const ITEM_FIELDS := ["instance_id","definition_id","quantity","rolled_modifiers","origin_id","container","column","row","locked","pages"]
const GROWTH_FIELDS := ["version","banked","level","xp","cumulative","ap","age","talent","talent_chosen","life_growth","base_stats","base_maximum","titles","known_titles","first","second","talent_display","evidence","bag_order"]
static func keys(value: Variant, fields: Array) -> bool:
	if not value is Dictionary or value.size() != fields.size(): return false
	for key: String in fields:
		if not value.has(key): return false
	return true
static func integer(value: Variant, low: int = 0, high: int = 1000000) -> bool:
	return typeof(value) == TYPE_INT and value >= low and value <= high
static func strings(value: Variant, valid: Array = []) -> bool:
	if not value is Array or value.size() > 1000: return false
	var seen := {}
	for element: Variant in value:
		if not element is String or seen.has(element) or (not valid.is_empty() and not valid.has(element)): return false
		seen[element] = true
	return true
static func stats(value: Variant, catalog: RefCounted, allow_max: bool = false, signed: bool = false) -> bool:
	if not value is Dictionary or value.size() > 20: return false
	for key: Variant in value:
		if not key is String or not integer(value[key],-1000000 if signed else 0): return false
		if not (allow_max and key in ["max_hp","max_mp","max_sp"]) and (not key.begins_with("stat.") or catalog.definition(key) == null): return false
	return true
static func item_fields(value: Variant) -> bool:
	if not keys(value,ITEM_FIELDS): return false
	return value.origin_id is String and value.origin_id.length() <= 256 and value.container is String and value.container.length() <= 256 and integer(value.column,0,6) and integer(value.row,0,10) and typeof(value.locked) == TYPE_BOOL and strings(value.pages)
static func validate(session: RefCounted, catalog: RefCounted) -> bool:
	var hero: RefCounted = session.hero
	var g: Dictionary = hero.growth
	if g.is_empty():
		if hero.potions > 5: return false
		return session.exploration == null or session.exploration.progression.is_empty()
	if not keys(g,GROWTH_FIELDS): return false
	for points: int in hero.training.values():
		if points < 0 or points > 100: return false
	for key: String in ["version","banked","level","xp","cumulative","ap","age"]:
		if not integer(g[key]): return false
	if g.version != 1 or g.level < 1 or g.level > Rules.CONFIG.xp_to_next.size()+1 or g.cumulative < g.level or g.age != 17: return false
	if (g.level > Rules.CONFIG.xp_to_next.size() and g.xp != 0) or (g.level <= Rules.CONFIG.xp_to_next.size() and g.xp >= Rules.CONFIG.xp_to_next[g.level-1]): return false
	if not g.talent is String or not Rules.CONFIG.talents.has(g.talent) or typeof(g.talent_chosen) != TYPE_BOOL: return false
	if not stats(g.base_stats,catalog) or not stats(g.life_growth,catalog,true): return false
	if not g.base_maximum is Array or g.base_maximum.size() != 3: return false
	for number: Variant in g.base_maximum:
		if not integer(number): return false
	if not strings(g.titles,Rules.CONFIG.titles.keys()) or not strings(g.known_titles,Rules.CONFIG.titles.keys()) or not strings(g.bag_order): return false
	for slot: String in ["first","second"]:
		if not g[slot] is String: return false
		if not g[slot].is_empty() and (not g.titles.has(g[slot]) or Rules.CONFIG.titles[g[slot]].slot != slot): return false
	if not g.talent_display is String or (not g.talent_display.is_empty() and not Rules.CONFIG.talents.has(g.talent_display)): return false
	if not g.evidence is Dictionary: return false
	for key: Variant in g.evidence:
		if key not in ["undercrypt_clears","reached_level"] or not integer(g.evidence[key]): return false
	for id: String in g.bag_order:
		if Inventory.dimensions(hero,id,catalog) == Vector2i.ZERO: return false
	if not Inventory.validate(hero,catalog): return false
	var probe: RefCounted = hero.copy()
	Rules.recompute(probe,catalog)
	if hero.stats != probe.stats or hero.maximum != probe.maximum or hero.weapon != probe.weapon: return false
	if session.exploration == null:
		for item: RefCounted in hero.items:
			if not item.origin_id.is_empty(): return false
		return true
	var p: Dictionary = session.exploration.progression
	if not keys(p,["origins","stats","maximum","ranks","first","second","age","talent","xp","training","items","evidence","closed"]): return false
	if typeof(p.closed) != TYPE_BOOL or not integer(p.xp) or not stats(p.stats,catalog): return false
	if p.age != 17 or not Rules.CONFIG.talents.has(p.talent) or not p.ranks is Dictionary: return false
	if not p.maximum is Array or p.maximum.size() != 3: return false
	for number: Variant in p.maximum:
		if not integer(number): return false
	if not p.first is String or not p.second is String: return false
	if not p.training is Dictionary or not p.items is Array or p.items.size() > 1000 or not strings(p.evidence,["encounter.gallery","encounter.sanctum"]): return false
	for skill: Variant in p.training:
		if not hero.skill_ranks.has(skill) or not integer(p.training[skill],0,100): return false
	for reward: Variant in p.items:
		if not keys(reward,["id","quantity"]) or reward.id not in ["item.focus_page_one","item.focus_page_two"] or not integer(reward.quantity,1,100): return false
	if not p.origins is Array or p.origins.size() > 1000: return false
	var origins := {}
	for record: Variant in p.origins:
		if not item_fields(record) or not record.instance_id is String or origins.has(record.instance_id) or not integer(record.quantity,1,1000) or catalog.definition(record.definition_id) == null: return false
		if not record.definition_id is String or not record.definition_id.begins_with("item.") or record.origin_id != record.instance_id or not stats(record.rolled_modifiers,catalog,true,true): return false
		origins[record.instance_id] = record
	if not p.closed:
		if hero.stats != p.stats or Array(hero.maximum) != p.maximum or hero.skill_ranks != p.ranks or g.first != p.first or g.second != p.second: return false
		var used := {}
		for item: RefCounted in hero.items:
			if not origins.has(item.origin_id): return false
			var origin: Dictionary = origins[item.origin_id]
			if item.definition_id != origin.definition_id or item.rolled_modifiers != origin.rolled_modifiers or item.locked != origin.locked or item.pages != origin.pages: return false
			if (item.container.begins_with("equip:") or origin.container.begins_with("equip:")) and item.container != origin.container: return false
			used[item.origin_id] = used.get(item.origin_id,0)+item.quantity
			if used[item.origin_id] > origin.quantity: return false
		for id: String in origins:
			if catalog.definition(origins[id].definition_id).category != "potion" and used.get(id,0) != origins[id].quantity: return false
		if p.evidence != session.exploration.resolved or p.xp != p.evidence.size()*Rules.CONFIG.encounter_xp or p.items.size() != p.evidence.size(): return false
		for index: int in p.evidence.size():
			if p.items[index] != {"id":"item.focus_page_one" if p.evidence[index] == "encounter.gallery" else "item.focus_page_two","quantity":1}: return false
		if session.mode == SessionShell.Mode.RESULTS: return false
	else:
		if session.mode not in [SessionShell.Mode.RESULTS,SessionShell.Mode.BATTLE] or p.xp != 0 or not p.training.is_empty() or not p.items.is_empty() or not p.evidence.is_empty(): return false
		for item: RefCounted in hero.items:
			if not item.origin_id.is_empty(): return false
	return true
