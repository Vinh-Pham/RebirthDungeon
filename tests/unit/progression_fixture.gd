extends RefCounted
const H = preload("res://tests/integration/save_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const I = preload("res://scripts/domain/rules/inventory_rules.gd")
const C = preload("res://scripts/data/save_codec.gd")
const R = preload("res://scripts/domain/commands/command_resolver.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
var failures := PackedStringArray()
var checks := 0
var serial := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Progression: "+label)
func fresh(c: RefCounted) -> SessionShell:
	var s := H.new().session(c)
	s.mode = SessionShell.Mode.TOWN
	s.battle = null
	s.exploration = null
	s.hero.committed_gold = 200
	s.hero.potions = 3
	P.initialize(s.hero,c)
	return s
func command(s: SessionShell,c: RefCounted,kind: String,item: String = "",qty: int = 1,dest: String = "",x: int = 0,y: int = 0) -> RefCounted:
	serial += 1
	var input := H.new().intent(s,kind,"growth:"+str(serial))
	input.target_id = "npc.keeper" if kind in ["buy_item","sell_item","bank_deposit","bank_withdraw","learn_lesson"] else ""
	input.data = {"item":item,"quantity":qty,"destination":dest,"column":x,"row":y}
	return R.resolve(s,R.parse_intent(input),c)
func step(s: SessionShell,c: RefCounted,kind: String,item: String = "",qty: int = 1,dest: String = "",x: int = 0,y: int = 0) -> SessionShell:
	var result := command(s,c,kind,item,qty,dest,x,y)
	check(result.accepted,kind+": "+result.code)
	return result.candidate if result.accepted else s
func reject(s: SessionShell,c: RefCounted,kind: String,item: String = "",qty: int = 1,dest: String = "",x: int = 0,y: int = 0) -> void:
	var before := Capture.capture(s)
	check(not command(s,c,kind,item,qty,dest,x,y).accepted,"reject "+kind)
	check(Capture.capture(s) == before,"rejected "+kind+" preserves state and RNG")
func item_id(s: SessionShell,id: String) -> String:
	for item: RefCounted in s.hero.items:
		if item.definition_id == id: return item.instance_id
	return ""
func roundtrip(s: SessionShell,c: RefCounted) -> void:
	var codec := C.new()
	var decoded := codec.decode(codec.encode(s,1),c)
	check(decoded.status == "ok","save validates: "+codec.error)
	if decoded.status == "ok": check(Capture.capture(decoded.session) == Capture.capture(s),"exact progression roundtrip")
func run() -> PackedStringArray:
	var c := H.new().catalog()
	var s := fresh(c)
	check(s.hero.growth.banked == 200 and s.hero.committed_gold == 0 and s.hero.potions == 3,"legacy value and supplies preserved")
	roundtrip(s,c)
	s = step(s,c,"bank_withdraw","",150)
	s = step(s,c,"learn_lesson")
	check(s.hero.skill_ranks["skill.blood"] == "F" and s.hero.training["skill.blood"] == 0,"lesson F with zero training")
	reject(s,c,"learn_lesson")
	s = step(s,c,"buy_item","item.spark_book")
	s = step(s,c,"read_book",item_id(s,"item.spark_book"))
	check(s.hero.skill_ranks["skill.spark"] == "F" and s.hero.training["skill.spark"] == 0,"book F with zero training")
	s = step(s,c,"buy_item","item.spark_book")
	reject(s,c,"read_book",item_id(s,"item.spark_book"))
	s = step(s,c,"buy_item","item.focus_notes")
	s = step(s,c,"buy_item","item.focus_page_one",2)
	s = step(s,c,"buy_item","item.focus_page_two")
	var notes := item_id(s,"item.focus_notes")
	s = step(s,c,"insert_page",notes,1,item_id(s,"item.focus_page_one"))
	reject(s,c,"insert_page",notes,1,item_id(s,"item.focus_page_one"))
	s = step(s,c,"insert_page",notes,1,item_id(s,"item.focus_page_two"))
	s = step(s,c,"read_book",notes)
	check(s.hero.skill_ranks["skill.focus"] == "F" and s.hero.training["skill.focus"] == 0,"assembled book F")
	s = step(s,c,"buy_item","item.armor")
	var pools: PackedInt64Array = s.hero.current.duplicate()
	s = step(s,c,"equip_item",item_id(s,"item.armor"),1,"body")
	check(s.hero.current == pools and s.hero.maximum[0] > pools[0],"equipment maximum never refills")
	s = step(s,c,"unequip_item",item_id(s,"item.armor"))
	s = step(s,c,"lock_item",item_id(s,"item.armor"))
	reject(s,c,"sell_item",item_id(s,"item.armor"))
	reject(s,c,"move_item",item_id(s,"item.field_bag"),1,item_id(s,"item.field_bag"))
	reject(s,c,"move_item",item_id(s,"item.armor"),1,"backpack",5,9)
	var potions := item_id(s,"item.potion")
	s = step(s,c,"split_stack",potions,1,"backpack",5,9)
	check(s.hero.potions == 3,"split conserves potions")
	s = step(s,c,"sort_items",potions)
	check(s.hero.potions == 3,"sort/gather conserves potions")
	reject(s,c,"bank_withdraw","",10000)
	reject(s,c,"rank_up","skill.sword")
	s.hero.training["skill.sword"] = 100
	s.hero.growth.ap = 2
	var mastery_before: Dictionary = P.mastery(s.hero)
	s = step(s,c,"rank_up","skill.sword")
	check(s.hero.skill_ranks["skill.sword"] == "E" and s.hero.training["skill.sword"] == 0 and s.hero.growth.ap == 1,"one explicit rank, AP once, training reset")
	check(P.mastery(s.hero) != mastery_before,"mastery from rank advancement")
	reject(s,c,"rank_up","skill.sword")
	roundtrip(s,c)
	# Successful-run rewards are pending until outcome; consumed supplies never return.
	var run := fresh(c)
	run = step(run,c,"bank_withdraw","",100)
	run.exploration = preload("res://scripts/domain/state/exploration_state.gd").new()
	run.mode = SessionShell.Mode.DUNGEON
	P.begin(run)
	check(I.use_potion(run.hero),"consume brought potion")
	P.activation(run,"skill.sword")
	P.activation(run,"skill.sword")
	P.activation(run,"skill.sword")
	check(run.hero.training["skill.sword"] == 0 and run.exploration.progression.training["skill.sword"] == 100,"training pending capped without autorank")
	for encounter: String in ["encounter.gallery","encounter.sanctum"]:
		run.battle = preload("res://scripts/domain/state/battle_state.gd").new()
		run.battle.encounter_id = encounter
		P.encounter(run)
		P.encounter(run)
		run.exploration.resolved.append(encounter)
	run.battle = null
	run.exploration.pending_gold = 25
	check(run.exploration.progression.xp == 150 and run.exploration.progression.items.size() == 2,"encounter evidence deduplicated")
	var failed: SessionShell = run.copy()
	check(P.finish(failed,false,c).is_empty(),"failure reconciliation")
	check(failed.hero.committed_gold == 70 and failed.hero.growth.banked == 100 and failed.hero.potions == 2 and failed.hero.growth.level == 1 and failed.hero.training["skill.sword"] == 0,"30 percent carried loss, bank/items retained, pending discarded")
	check(failed.exploration.progression.items.is_empty(),"failure pending cleared")
	pools = run.hero.current.duplicate()
	check(P.finish(run,true,c).is_empty(),"success reconciliation")
	run.hero.committed_gold += run.exploration.pending_gold
	run.exploration.pending_gold = 0
	run.mode = SessionShell.Mode.RESULTS
	check(run.hero.growth.level == 2 and run.hero.growth.cumulative == 2 and run.hero.growth.ap == 1 and run.hero.growth.xp == 50,"XP level AP committed")
	check(run.hero.current == pools and run.hero.training["skill.sword"] == 100 and run.hero.skill_ranks["skill.sword"] == "F","no refill or auto rank")
	check(not P.finish(run,true,c).is_empty(),"duplicate outcome rejected")
	roundtrip(run,c)
	run.mode = SessionShell.Mode.TOWN
	run.exploration = null
	run = step(run,c,"rank_up","skill.sword")
	run = step(run,c,"equip_title","title.delver",1,"first")
	run = step(run,c,"buy_item","item.lantern_coupon")
	run = step(run,c,"read_coupon",item_id(run,"item.lantern_coupon"))
	run = step(run,c,"equip_title","title.lantern",1,"second")
	check(run.hero.current == pools and run.hero.maximum[0] >= pools[0]+15,"first/second titles combine without refill")
	run = step(run,c,"equip_title","title.breaker",1,"first")
	check(run.hero.current[1] <= run.hero.maximum[1],"negative maximum clamps current")
	run = step(run,c,"buy_item","item.iron_sword")
	var strength: int = run.hero.stats["stat.strength"]
	run = step(run,c,"equip_item",item_id(run,"item.iron_sword"),1,"main_hand")
	check(run.hero.stats["stat.strength"] == strength+3,"retained reward improves next run equipment")
	roundtrip(run,c)
	# Failed purchases retain every original rectangle and balance.
	var full := fresh(c)
	full = step(full,c,"bank_withdraw","",150)
	reject(full,c,"buy_item","item.armor",100)
	# Malformed saved geometry and provenance are rejected.
	var broken := Capture.capture(run)
	broken.hero.items[0].container = "missing-bag"
	check(C.new().decode(H.new().rewrap(broken),c).status != "ok","invalid saved container rejected")
	broken = Capture.capture(run)
	broken.hero.items[0].origin_id = "orphan"
	check(C.new().decode(H.new().rewrap(broken),c).status != "ok","town origin rejected")
	# Full inventory rewards persist in withdraw-only overflow, then withdraw atomically.
	var overflow := fresh(c)
	check(I.grant(overflow.hero,"item.potion",1000,"fill-a",c,true),"fill first stacks")
	check(I.grant(overflow.hero,"item.potion",1000,"fill-b",c,true),"fill overflow stacks")
	P.recompute(overflow.hero,c)
	var overflow_id := ""
	for item: RefCounted in overflow.hero.items:
		if item.container == "overflow":
			overflow_id = item.instance_id
			break
	check(not overflow_id.is_empty(),"full inventory creates overflow")
	roundtrip(overflow,c)
	reject(overflow,c,"move_item",overflow_id,1,"backpack",0,0)
	reject(overflow,c,"withdraw_item",overflow_id)
	var entry := H.new().intent(overflow,"enter_dungeon","overflow-entry")
	entry.target_id = "entrance.undercrypt"
	check(not R.resolve(overflow,R.parse_intent(entry),c).accepted,"overflow blocks entry")
	for item: RefCounted in overflow.hero.items.duplicate():
		if item.definition_id == "item.potion" and item.container != "overflow":
			I.consume(overflow.hero,item,item.quantity)
			break
	P.recompute(overflow.hero,c)
	overflow = step(overflow,c,"withdraw_item",overflow_id)
	check(I.find(overflow.hero,overflow_id) == null or I.find(overflow.hero,overflow_id).container != "overflow","withdraw saves successful placement")
	roundtrip(overflow,c)
	# Version 2 keeps the old active hand intact, then upgrades once in town.
	var legacy := H.new().session(c)
	legacy = H.new().step(legacy,c,"select_skill","old-select")
	legacy = H.new().step(legacy,c,"roll","old-roll")
	var old_data := Capture.capture(legacy)
	old_data.hero.erase("growth")
	old_data.exploration.erase("progression")
	for item: Dictionary in old_data.hero.items:
		for field: String in ["origin_id","container","column","row","locked","pages"]: item.erase(field)
	var payload := JSON.stringify(C.wire(old_data),"",true,true)
	var wire := JSON.stringify({"format":"rebirth.session.v2","sequence":"1","payload":payload,"checksum":("rebirth.session.v2\n1\n"+payload).sha256_text()})
	var migration := C.new().decode(wire,c)
	check(migration.status == "ok","v2 locked migration accepted")
	if migration.status == "ok":
		check(migration.session.battle.hand == legacy.battle.hand and migration.session.hero.growth.is_empty(),"legacy hand not converted mid-run")
		migration.session.mode = SessionShell.Mode.TOWN
		migration.session.battle = null
		migration.session.hero.reserved.fill(0)
		migration.session.exploration = null
		P.initialize(migration.session.hero,c)
		var once := Capture.capture(migration.session)
		P.initialize(migration.session.hero,c)
		check(once == Capture.capture(migration.session),"migration exactly once")
		roundtrip(migration.session,c)
	print("PROGRESSION_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures
