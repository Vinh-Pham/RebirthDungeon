extends RefCounted
const Item = preload("res://scripts/domain/state/item_state.gd")
const SLOTS := ["main_hand","off_hand","head","body","hands","feet","accessory_1","accessory_2"]
const POTION := "item.potion"

static func find(hero: RefCounted, id: String) -> Item:
	for item: Item in hero.items:
		if item.instance_id == id: return item
	return null

static func dimensions(hero: RefCounted, container: String, catalog: RefCounted) -> Vector2i:
	if container == "backpack": return Vector2i(6,10)
	var bag := find(hero,container)
	if bag == null or bag.container != "backpack": return Vector2i.ZERO
	var definition: Resource = catalog.definition(bag.definition_id)
	return Vector2i(definition.bag_width,definition.bag_height) if definition != null else Vector2i.ZERO

static func destinations(hero: RefCounted, catalog: RefCounted) -> Array[String]:
	var result: Array[String] = []
	for id: String in hero.growth.get("bag_order",[]):
		if dimensions(hero,id,catalog) != Vector2i.ZERO: result.append(id)
	for item: Item in hero.items:
		if dimensions(hero,item.instance_id,catalog) != Vector2i.ZERO and not result.has(item.instance_id): result.append(item.instance_id)
	result.append("backpack")
	return result

static func fits(hero: RefCounted, item: Item, container: String, x: int, y: int, catalog: RefCounted) -> bool:
	var definition: Resource = catalog.definition(item.definition_id)
	if definition == null: return false
	var size := dimensions(hero,container,catalog)
	if size == Vector2i.ZERO or x < 0 or y < 0 or x+definition.width > size.x or y+definition.height > size.y: return false
	if definition.category == "bag" and container != "backpack": return false
	var rectangle := Rect2i(x,y,definition.width,definition.height)
	for other: Item in hero.items:
		if other == item or other.container != container: continue
		var other_def: Resource = catalog.definition(other.definition_id)
		if other_def == null or rectangle.intersects(Rect2i(other.column,other.row,other_def.width,other_def.height)): return false
	return true

static func compatible(a: Item, b: Item) -> bool:
	return a.origin_id == b.origin_id and a.definition_id == b.definition_id and a.locked == b.locked and a.rolled_modifiers == b.rolled_modifiers and a.pages == b.pages

static func place(hero: RefCounted, item: Item, catalog: RefCounted, merge: bool = true) -> bool:
	var definition: Resource = catalog.definition(item.definition_id)
	var containers := destinations(hero,catalog)
	if definition.category == "bag": containers.assign(["backpack"])
	if merge and definition.max_stack > 1:
		for container: String in containers:
			var sorted: Array = hero.items.duplicate()
			sorted.sort_custom(func(a: Item,b: Item) -> bool: return a.row*6+a.column < b.row*6+b.column)
			for other: Item in sorted:
				if other == item or other.container != container or not compatible(other,item): continue
				var amount := mini(item.quantity,definition.max_stack-other.quantity)
				other.quantity += amount
				item.quantity -= amount
				if item.quantity == 0:
					hero.items.erase(item)
					return true
	for container: String in containers:
		var size := dimensions(hero,container,catalog)
		for y: int in size.y:
			for x: int in size.x:
				if fits(hero,item,container,x,y,catalog):
					item.container = container
					item.column = x
					item.row = y
					return true
	return false

static func grant(hero: RefCounted, definition_id: String, quantity: int, prefix: String, catalog: RefCounted, overflow: bool) -> bool:
	var definition: Resource = catalog.definition(definition_id)
	if definition == null or quantity < 1 or quantity > 1000: return false
	var serial := 0
	while quantity > 0:
		var item := Item.new()
		item.instance_id = prefix+":"+str(serial)
		if find(hero,item.instance_id) != null: return false
		serial += 1
		item.definition_id = definition_id
		item.quantity = mini(quantity,definition.max_stack)
		quantity -= item.quantity
		hero.items.append(item)
		if not place(hero,item,catalog):
			if not overflow: return false
			item.container = "overflow"
	return true

static func capacity(hero: RefCounted, catalog: RefCounted) -> int:
	var result := 0
	for item: Item in hero.items:
		if item.container == "overflow": continue
		var definition: Resource = catalog.definition(item.definition_id)
		if definition != null: result += definition.gold_capacity
	return mini(result,1000000)

static func count(hero: RefCounted, id: String) -> int:
	var result := 0
	for item: Item in hero.items:
		if item.definition_id == id and item.container != "overflow" and not item.container.begins_with("equip:"):
			result += item.quantity
	return result

static func consume(hero: RefCounted, item: Item, quantity: int = 1) -> bool:
	if item == null or item.locked or item.container == "overflow" or quantity < 1 or quantity > item.quantity: return false
	item.quantity -= quantity
	if item.quantity == 0: hero.items.erase(item)
	return true

static func use_potion(hero: RefCounted) -> bool:
	var sorted: Array = hero.items.duplicate()
	sorted.sort_custom(func(a: Item,b: Item) -> bool: return a.instance_id < b.instance_id)
	for item: Item in sorted:
		if item.definition_id == POTION and consume(hero,item):
			hero.potions = count(hero,POTION)
			return true
	return false

static func refresh(hero: RefCounted) -> void:
	hero.potions = count(hero,POTION)

static func validate(hero: RefCounted, catalog: RefCounted) -> bool:
	var ids := {}
	var slots := {}
	for item: Item in hero.items:
		var definition: Resource = catalog.definition(item.definition_id)
		if definition == null or ids.has(item.instance_id) or item.instance_id.is_empty() or item.instance_id.length() > 256: return false
		ids[item.instance_id] = true
		if item.quantity < 1 or item.quantity > definition.max_stack or item.pages.size() > definition.required_pages.size(): return false
		var pages := {}
		for page: String in item.pages:
			if not definition.required_pages.has(page) or pages.has(page): return false
			pages[page] = true
		if item.container == "overflow":
			if item.column != 0 or item.row != 0: return false
			continue
		if item.container.begins_with("equip:"):
			var slot := item.container.trim_prefix("equip:")
			if slot not in SLOTS or slots.has(slot) or item.quantity != 1 or definition.category != "equipment": return false
			if definition.slot != slot and not (definition.slot == "accessory" and slot.begins_with("accessory_")) and not (definition.slot == "main_hand" and slot == "off_hand" and not definition.two_handed): return false
			slots[slot] = definition
		elif not fits(hero,item,item.container,item.column,item.row,catalog): return false
	if slots.has("off_hand"):
		if not slots.has("main_hand") or slots.main_hand.two_handed: return false
		if slots.off_hand.weapon != "" and (slots.off_hand.weapon != "sword" or slots.main_hand.weapon != "sword"): return false
	return hero.committed_gold <= capacity(hero,catalog) and hero.potions == count(hero,POTION)

static func action(hero: RefCounted, kind: String, data: Dictionary, operation: String, catalog: RefCounted) -> String:
	var item := find(hero,data.item)
	if item == null: return "Unknown item."
	match kind:
		"move_item":
			if item.container == "overflow": return "Use Withdraw for overflow."
			if item.container.begins_with("equip:"): return "Unequip first."
			if not fits(hero,item,data.destination,data.column,data.row,catalog): return "The item rectangle does not fit."
			item.container = data.destination
			item.column = data.column
			item.row = data.row
		"withdraw_item":
			if item.container != "overflow" or not place(hero,item,catalog): return "No rectangle for this reward."
		"split_stack":
			if item.container == "overflow" or data.quantity < 1 or data.quantity >= item.quantity: return "Invalid split quantity."
			var split: Item = item.copy()
			split.instance_id = operation+":split"
			split.quantity = data.quantity
			if not fits(hero,split,data.destination,data.column,data.row,catalog): return "Split rectangle does not fit."
			item.quantity -= split.quantity
			split.container = data.destination
			split.column = data.column
			split.row = data.row
			hero.items.append(split)
		"merge_stack":
			var target := find(hero,data.destination)
			if target == null or target == item or target.container == "overflow" or item.container == "overflow" or not compatible(item,target): return "Stacks are incompatible."
			var amount := mini(data.quantity,catalog.definition(item.definition_id).max_stack-target.quantity)
			if amount < 1 or amount > item.quantity: return "Invalid merge quantity."
			target.quantity += amount
			item.quantity -= amount
			if item.quantity == 0: hero.items.erase(item)
		"lock_item":
			item.locked = not item.locked
		"equip_item":
			var definition: Resource = catalog.definition(item.definition_id)
			if item.container == "overflow" or definition.category != "equipment": return "Withdraw equipment first."
			var slot: String = data.destination
			if slot not in SLOTS: return "Unknown slot."
			var displaced: Array[Item] = []
			for other: Item in hero.items:
				if other == item: continue
				if other.container == "equip:"+slot or (slot == "main_hand" and definition.two_handed and other.container == "equip:off_hand"):
					displaced.append(other)
					other.container = "transit"
			item.container = "equip:"+slot
			item.column = 0
			item.row = 0
			for other: Item in displaced:
				if not place(hero,other,catalog,false): return "No room for displaced equipment."
		"unequip_item":
			if not item.container.begins_with("equip:") or not place(hero,item,catalog,false): return "No room to unequip."
		"sort_items":
			var chosen: Array[Item] = []
			for other: Item in hero.items:
				if other.container == item.container: chosen.append(other)
			chosen.sort_custom(func(a: Item,b: Item) -> bool:
				var ad: Resource = catalog.definition(a.definition_id)
				var bd: Resource = catalog.definition(b.definition_id)
				if ad.width*ad.height != bd.width*bd.height: return ad.width*ad.height > bd.width*bd.height
				return a.definition_id+a.instance_id < b.definition_id+b.instance_id)
			var container := item.container
			if dimensions(hero,container,catalog) == Vector2i.ZERO: return "Choose a carried container."
			# Gather only compatible stacks in this container, retaining origin and protection.
			for source: Item in chosen.duplicate():
				for target: Item in chosen:
					if target == source: break
					if not compatible(source,target): continue
					var amount := mini(source.quantity,catalog.definition(source.definition_id).max_stack-target.quantity)
					target.quantity += amount
					source.quantity -= amount
					if source.quantity == 0:
						hero.items.erase(source)
						chosen.erase(source)
						break
			for other: Item in chosen: other.container = "sorting"
			var size := dimensions(hero,container,catalog)
			for other: Item in chosen:
				var placed := false
				for y: int in size.y:
					for x: int in size.x:
						if not placed and fits(hero,other,container,x,y,catalog):
							other.container = container
							other.column = x
							other.row = y
							placed = true
				if not placed: return "Sorting cannot fit all items; original layout retained."
		_: return "Unsupported inventory action."
	refresh(hero)
	return "" if validate(hero,catalog) else "Invalid loadout or carried capacity."
