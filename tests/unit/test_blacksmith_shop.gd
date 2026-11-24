extends GutTest

const Town = preload("res://scripts/dungeon_town.gd")
const Store = preload("res://scripts/character_store.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")

var _town: Control
var _id := ""
var _previous := ""


func before_each() -> void:
	_previous = Store._selected_id
	var draft := {"name": "Shop test"}
	for field: String in Store.LIMITS:
		draft[field] = Store.LIMITS[field][0]
	var created := Store.create(draft)
	_id = created["id"]
	assert_true(Store.select_character(_id))
	assert_false(Store.update_world({"gold": 100000}).is_empty())
	_town = Town.new()
	add_child_autofree(_town)
	for index in _town._landmarks.size():
		if _town._landmarks[index]["id"] == "blacksmith":
			_town.player = _town._points[index] + Vector2i.DOWN
			break
	_town._interact()


func after_each() -> void:
	Store._selected_id = _previous
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json.tmp"))
	DirAccess.remove_absolute(Satchel.DIRECTORY.path_join(_id + ".json"))


func test_starter_claim_disappears_and_cannot_be_repeated() -> void:
	assert_true(_choice_exists("Claim starter sword"))
	assert_false(_choice_exists("Browse swords"))
	assert_true(_choice_exists("Shop"))
	_town._starter()
	assert_true(Store.load_selected()["world"]["starter_sword_claimed"])
	assert_true(_town.satchel.owns("ashen_arcblade"))
	assert_false(_choice_exists("Claim starter sword"))
	var before := Store.load_selected()
	_town._starter()
	assert_eq(Store.load_selected(), before)


func test_shop_tabs_purchase_equipment_and_restore_equipped_items() -> void:
	_town._open_shop()
	assert_true(_town._shop.visible)
	assert_eq(_town._shop._tabs.tab_count, Catalog.shop_categories().size())
	var stock := Catalog.shop_stock()
	for slot: String in ["main_hand", "armor"]:
		var id := _item_for_slot(stock, slot)
		assert_false(id.is_empty())
		if id.is_empty():
			return
		var before := int(Store.load_selected()["world"]["gold"])
		_town._purchase_shop_item(id)
		assert_true(_town.satchel.owns(id))
		assert_eq(int(Store.load_selected()["world"]["gold"]), before - int(stock[id]["price"]))
		assert_eq(_town.satchel.equip(id, slot), "")
		var restored := Satchel.new()
		restored.open(_id, Catalog.items_by_id())
		assert_eq(restored.equipped_in(slot), id)
		var after := Store.load_selected()
		_town._purchase_shop_item(id)
		assert_eq(Store.load_selected(), after)


func test_purchase_without_gold_keeps_inventory_and_gold() -> void:
	assert_false(Store.update_world({"gold": 0}).is_empty())
	_town._open_shop()
	var id := _item_for_slot(Catalog.shop_stock(), "main_hand")
	var before := Store.load_selected()
	_town._purchase_shop_item(id)
	assert_eq(Store.load_selected(), before)
	assert_false(_town.satchel.owns(id))


func _choice_exists(caption: String) -> bool:
	for child in _town.dialogue.get_children():
		if child is Button and child.text == caption:
			return true
	return false


func _item_for_slot(stock: Dictionary, slot: String) -> String:
	for id: String in stock:
		if stock[id]["slot"] == slot:
			return id
	return ""


func test_supply_packs_stack_and_charge_per_pack() -> void:
	_town._open_shop()
	_town._purchase_shop_item("arrow_20")
	_town._purchase_shop_item("arrow_100")
	var world: Dictionary = Store.load_selected()["world"]
	assert_eq(world["shop_supplies"], {"arrow": 120})
	assert_eq(world["gold"], 99910)


func test_failed_purchase_does_not_charge_gold_or_add_gear() -> void:
	_town._open_shop()
	var before := Store.load_selected()
	var temporary := Store.DIRECTORY.path_join(_id + ".json.tmp")
	assert_eq(DirAccess.make_dir_absolute(temporary), OK)
	_town._purchase_shop_item("wooden_stick")
	assert_push_error("Unable to save character.")
	assert_eq(Store.load_selected(), before)
	assert_false(_town.satchel.owns("wooden_stick"))
	assert_eq(DirAccess.remove_absolute(temporary), OK)


func test_every_shop_listing_has_art_in_the_two_column_grid() -> void:
	_town._open_shop()
	var shop = _town._shop
	assert_eq(shop._rows.columns, 2)
	var listings := 0
	for index in range(shop._tabs.tab_count):
		shop._tabs.current_tab = index
		for item: Button in shop._rows.get_children():
			assert_not_null(item.icon, str(item.name))
			if item.icon != null:
				assert_eq(item.icon.get_size(), Vector2(16, 24))
			listings += 1
	assert_eq(listings, Catalog.shop_stock().size())
