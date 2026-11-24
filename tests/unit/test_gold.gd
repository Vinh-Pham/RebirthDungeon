extends GutTest

const Gold = preload("res://scripts/gold.gd")
const Satchel = preload("res://scripts/sword_satchel.gd")
const Store = preload("res://scripts/character_store.gd")
const Catalog = preload("res://scripts/sword_catalog.gd")
const Loot = preload("res://scripts/battle_loot.gd")

var _id := ""
var _previous := ""
var _satchel: Satchel


func before_each() -> void:
	_previous = Store._selected_id
	var draft := {"name": "Gold test"}
	for field in Store.LIMITS:
		draft[field] = Store.LIMITS[field][0]
	_id = Store.create(draft)["id"]
	Store.select_character(_id)
	_satchel = Satchel.new()


func after_each() -> void:
	_satchel = null
	Store._selected_id = _previous
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json"))
	DirAccess.remove_absolute(Store.DIRECTORY.path_join(_id + ".json.tmp"))
	DirAccess.remove_absolute(Satchel.DIRECTORY.path_join(_id + ".json"))


func _open(changes: Dictionary) -> void:
	assert_false(Store.update_world(changes).is_empty())
	_satchel.open(_id, Catalog.items_by_id())


func test_gold_stack_boundary_and_compact_units() -> void:
	assert_eq(Gold.format_amount(1), "1g")
	assert_eq(Gold.format_amount(1000), "1k")
	assert_eq(Gold.format_amount(1000000), "1m")
	_open({"gold": 1001})
	assert_eq(_satchel.gold_items.size(), 2)
	assert_eq(_satchel.gold_items[0]["count"], 1000)
	assert_eq(_satchel.gold_items[1]["count"], 1)
	assert_ne(_satchel.gold_items[0]["cell"], _satchel.gold_items[1]["cell"])


func test_pouch_purchase_autofills_and_survives_reload() -> void:
	_open({"gold": 15000})
	assert_eq(_satchel.purchase_pouch("gold_pouch_small", 1760), "")
	assert_eq(Store.load_selected()["world"]["gold"], 13240)
	_satchel.open(_id, Catalog.items_by_id())
	var stored := 0
	var pouch_count := 0
	for item in _satchel.gold_items:
		stored += int(item["count"])
		if item["id"] == "gold_pouch_small":
			pouch_count += 1
			assert_eq(item["capacity"], 10000)
			assert_eq(item["count"], 10000)
	assert_eq(stored, 13240)
	assert_eq(pouch_count, 1)
	assert_eq(_satchel.gold_capacity(0), 62000)


func test_failed_pouch_purchase_preserves_gold_and_inventory() -> void:
	_open({"gold": 100})
	var before := Store.load_selected()
	assert_false(_satchel.purchase_pouch("gold_pouch_small", 1760).is_empty())
	assert_eq(Store.load_selected(), before)
	assert_eq(_satchel.gold_items.size(), 1)


func test_bank_transfers_preserve_total_and_reject_excess_withdrawal() -> void:
	_open({"gold": 1500, "bank_gold": 500})
	assert_eq(_satchel.deposit_gold(1000), "")
	var world: Dictionary = Store.load_selected()["world"]
	assert_eq(world["gold"], 500)
	assert_eq(world["bank_gold"], 1500)
	assert_eq(_satchel.withdraw_gold(250), "")
	world = Store.load_selected()["world"]
	assert_eq(world["gold"], 750)
	assert_eq(world["bank_gold"], 1250)
	assert_false(_satchel.withdraw_gold(1251).is_empty())
	assert_false(_satchel.deposit_gold(0).is_empty())
	assert_eq(Store.load_selected()["world"], world)


func test_full_bag_rejects_bank_withdrawal_without_debit() -> void:
	_open({"gold": 56000, "bank_gold": 1000})
	var before := Store.load_selected()
	assert_false(_satchel.withdraw_gold(1).is_empty())
	assert_eq(Store.load_selected(), before)
	assert_eq(_satchel.deposit_gold(1000), "")
	assert_eq(_satchel.gold_items.size(), 55)


func test_loot_collects_only_gold_that_fits_and_keeps_remainder() -> void:
	var world := Store._normalize_world({"gold": 995, "pending_loot": {"gold": 20}})
	var changes := Loot.collect(world, ["gold"], Satchel.MAX_COBWEB_CAPACITY, 1000)
	assert_eq(changes["gold"], 1000)
	assert_eq(changes["pending_loot"], {"gold": 15})
	world.merge(changes, true)
	assert_eq(Loot.collect(world, ["gold"], Satchel.MAX_COBWEB_CAPACITY, 1000), {})


func test_rearranged_stacks_and_pouch_keep_their_cells_on_reload() -> void:
	_open({"gold": 12500, "town_materials": {"cobweb": 100}})
	assert_eq(_satchel.purchase_pouch("gold_pouch_small", 1760), "")
	var gold_cell: Vector2i = _satchel.gold_items[0]["cell"]
	var pouch_cell: Vector2i = _satchel.gold_items[1]["cell"]
	var web_cell: Vector2i = _satchel.cobweb_stacks.find_key(99)
	assert_eq(_satchel.move_item(pouch_cell, Vector2i(5, 4)), "")
	assert_eq(_satchel.move_item(gold_cell, Vector2i(4, 3)), "")
	assert_eq(_satchel.move_item(web_cell, Vector2i(7, 6)), "")
	_satchel.open(_id, Catalog.items_by_id())
	assert_eq(_satchel.gold_items[0]["cell"], Vector2i(4, 3))
	assert_eq(_satchel.gold_items[0]["count"], 740)
	assert_eq(_satchel.gold_items[1]["cell"], Vector2i(5, 4))
	assert_eq(_satchel.gold_items[1]["count"], 10000)
	assert_eq(_satchel.cobweb_stacks[Vector2i(7, 6)], 99)
