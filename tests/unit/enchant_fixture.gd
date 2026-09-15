extends RefCounted
const H = preload("res://tests/integration/save_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const I = preload("res://scripts/domain/rules/inventory_rules.gd")
const R = preload("res://scripts/domain/commands/command_resolver.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
var failures := PackedStringArray()
var checks := 0
var serial := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Enchant: "+label)
func fresh(c: RefCounted, mp: int = 30) -> SessionShell:
	var s := H.new().session(c)
	s.mode = SessionShell.Mode.TOWN
	s.battle = null
	s.exploration = null
	s.hero.committed_gold = 200
	P.initialize(s.hero,c)
	s.hero.current[1] = mini(mp,int(s.hero.maximum[1]))
	I.grant(s.hero,"item.iron_sword",1,"fx:sword",c,false)
	I.grant(s.hero,"item.powder",5,"fx:powder",c,false)
	return s
func command(s: SessionShell,c: RefCounted,kind: String,item: String,dest: String = "") -> RefCounted:
	serial += 1
	var input := H.new().intent(s,kind,"ench:"+str(serial))
	input.data = {"item":item,"destination":dest,"column":0,"row":0,"quantity":1}
	input.target_id = "npc.keeper"
	return R.resolve(s,R.parse_intent(input),c)
func instance(s: SessionShell, definition: String) -> String:
	for item: RefCounted in s.hero.items:
		if item.definition_id == definition: return item.instance_id
	return ""
## Advance the enchant stream through validated states until the next draws
## match the wanted outcome window, then leave the stream positioned there.
func scan(s: SessionShell, predicates: Array) -> int:
	var stream: RefCounted = s.rng.stream("enchant")
	var original: Dictionary = stream.capture()
	var states: Array = [original.duplicate()]
	var values: Array = []
	for k: int in range(0,20000):
		values.append(stream.bounded(10000))
		states.append(stream.capture())
		if values.size() > predicates.size(): values.pop_front()
		if values.size() == predicates.size():
			var ok := true
			for index: int in values.size():
				if not predicates[index].call(values[index]): ok = false
			if ok:
				stream.restore(states[states.size()-1-predicates.size()])
				return k
	stream.restore(original)
	return -1
func install(s: SessionShell, c: RefCounted, enchant: String, slot: String) -> void:
	for item: RefCounted in s.hero.items:
		if item.definition_id == "item.iron_sword":
			item.enchants[slot] = {"id":enchant,"values":P.enchant_values(enchant,s.rng.stream("enchant"))}

func run() -> PackedStringArray:
	var c := H.new().catalog()
	# Success: scroll, powder and MP are consumed and the slot records values.
	var s := fresh(c)
	var chance_seed := scan(s,[func(d: int): return d < 8000])
	check(chance_seed >= 0,"success offset exists")
	I.grant(s.hero,"item.scroll_keen",1,"fx:scroll",c,false)
	var sword := instance(s,"item.iron_sword")
	var scroll := instance(s,"item.scroll_keen")
	var result := command(s,c,"apply_enchant",sword,scroll)
	check(result.accepted,"Enchant application accepted: "+result.code)
	s = result.candidate
	var installed: Dictionary = {}
	for item: RefCounted in s.hero.items:
		if item.instance_id == sword: installed = item.enchants.get("prefix",{})
	check(installed.get("id","") == "enchant.keen","Success installs the prefix enchant")
	var value: int = int(installed.get("values",{}).get("stat.strength",0))
	check(value >= 1 and value <= 2,"Variable roll stays inside the authored range")
	check(I.count(s.hero,"item.scroll_keen") == 0,"Success consumes the scroll")
	check(I.count(s.hero,"item.powder") == 4,"Success consumes one powder")
	check(int(s.hero.current[1]) == maxi(0,int(s.hero.maximum[1])-5),"Success spends the authored MP")
	for item: RefCounted in s.hero.items:
		if item.instance_id == sword: item.container = "equip:main_hand"
	P.recompute(s.hero,c)
	var sources: Dictionary = P.sources(s.hero,c)
	check(int(sources.Equipment.get("stat.strength",0)) >= value,"Recompute includes the installed enchant")
	var stream_state: Dictionary = s.rng.stream("enchant").capture()
	var s2 := fresh(c)
	I.grant(s2.hero,"item.scroll_keen",1,"fx:scroll",c,false)
	scan(s2,[func(d: int): return d < 8000])
	var replay := command(s2,c,"apply_enchant",instance(s2,"item.iron_sword"),instance(s2,"item.scroll_keen"))
	check(replay.accepted and replay.candidate.rng.stream("enchant").capture() == stream_state,"Identical seed replays identical enchant RNG")
	# Failure spends the materials but preserves the equipment and its slots.
	var s3 := fresh(c)
	var fail_seed := scan(s3,[func(d: int): return d >= 8000])
	check(fail_seed >= 0,"failure offset exists")
	I.grant(s3.hero,"item.scroll_keen",1,"fx:scroll",c,false)
	var sword3 := instance(s3,"item.iron_sword")
	var failure := command(s3,c,"apply_enchant",sword3,instance(s3,"item.scroll_keen"))
	check(failure.accepted,"Failure is a committed outcome, not a rejection: "+failure.code)
	s3 = failure.candidate
	for item: RefCounted in s3.hero.items:
		if item.instance_id == sword3: check(item.enchants.is_empty(),"Failure preserves the equipment without enchants")
	check(I.count(s3.hero,"item.scroll_keen") == 0 and I.count(s3.hero,"item.powder") == 4,"Failure consumes scroll and powder")
	check(int(s3.hero.current[1]) == maxi(0,int(s3.hero.maximum[1])-5),"Failure spends MP")
	print("ENCHANT_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures

func run_part2() -> PackedStringArray:
	var c := H.new().catalog()
	# One prefix and one suffix coexist; the opposite slot survives replacement.
	var s := fresh(c)
	install(s,c,"enchant.keen","prefix")
	install(s,c,"enchant.spellweave","suffix")
	I.grant(s.hero,"item.scroll_keen",1,"fx:scroll",c,false)
	var sword := instance(s,"item.iron_sword")
	var replace_seed := scan(s,[func(d: int): return d < 8000])
	var replacement := command(s,c,"apply_enchant",sword,instance(s,"item.scroll_keen"))
	check(replacement.accepted,"Prefix replacement accepted")
	s = replacement.candidate
	for item: RefCounted in s.hero.items:
		if item.instance_id == sword:
			check(str(item.enchants.get("suffix",{}).get("id","")) == "enchant.spellweave","Opposite slot survives replacement")
			check(str(item.enchants.get("prefix",{}).get("id","")) == "enchant.keen","Same-slot replacement reuses the scroll enchant")
	# Rejections never draw or mutate.
	var s4 := fresh(c)
	I.grant(s4.hero,"item.scroll_keen",1,"fx:scroll",c,false)
	for item: RefCounted in s4.hero.items:
		if item.definition_id == "item.scroll_keen": item.container = "overflow" # reward overflow is withdraw-only
	var before := Capture.capture(s4)
	var blocked := command(s4,c,"apply_enchant",instance(s4,"item.iron_sword"),instance(s4,"item.scroll_keen"))
	check(not blocked.accepted,"Overflow scroll is rejected")
	check(Capture.capture(s4) == before,"Rejected application preserves state and RNG")
	var no_powder := fresh(c)
	I.grant(no_powder.hero,"item.scroll_keen",1,"fx:scroll",c,false)
	for item: RefCounted in no_powder.hero.items.duplicate():
		if item.definition_id == "item.powder": no_powder.hero.items.erase(item)
	var before2 := Capture.capture(no_powder)
	var denied := command(no_powder,c,"apply_enchant",instance(no_powder,"item.iron_sword"),instance(no_powder,"item.scroll_keen"))
	check(not denied.accepted and denied.code.contains("powder"),"Missing powder rejects with its reason")
	check(Capture.capture(no_powder) == before2,"Missing powder preserves state and RNG")
	print("ENCHANT_FIXTURE2: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures

func run_part3() -> PackedStringArray:
	var c := H.new().catalog()
	# Burning: full and zero recovery; empty slots never draw.
	var s5 := fresh(c)
	install(s5,c,"enchant.keen","prefix")
	install(s5,c,"enchant.spellweave","suffix")
	var both_seed := scan(s5,[func(d: int): return d < 5000,func(d: int): return d < 4000])
	check(both_seed >= 0,"full-recovery offset exists")
	var burned := command(s5,c,"burn_item",instance(s5,"item.iron_sword"))
	check(burned.accepted,"Burning accepted: "+burned.code)
	if burned.accepted: s5 = burned.candidate
	check(burned.accepted and instance(s5,"item.iron_sword").is_empty(),"Burned equipment is destroyed")
	check(I.count(s5.hero,"item.scroll_keen") == 1 and I.count(s5.hero,"item.scroll_spellweave") == 1,"Full recovery returns both scrolls")
	var s6 := fresh(c)
	install(s6,c,"enchant.keen","prefix")
	install(s6,c,"enchant.spellweave","suffix")
	var none_seed := scan(s6,[func(d: int): return d >= 5000,func(d: int): return d >= 4000])
	check(none_seed >= 0,"zero-recovery offset exists")
	var burned2 := command(s6,c,"burn_item",instance(s6,"item.iron_sword"))
	check(burned2.accepted,"Zero-recovery burn accepted: "+burned2.code)
	check(burned2.accepted and instance(burned2.candidate,"item.scroll_keen").is_empty() and instance(burned2.candidate,"item.scroll_spellweave").is_empty(),"Zero recovery destroys the item without scrolls")
	var s7 := fresh(c)
	var rng_before: Dictionary = s7.rng.stream("enchant").capture()
	var burned3 := command(s7,c,"burn_item",instance(s7,"item.iron_sword"))
	check(burned3.accepted,"Unenchanted burn accepted: "+burned3.code)
	check(burned3.accepted and s7.rng.stream("enchant").capture() == rng_before,"Empty slots never draw enchant RNG")
	# Output-space validation: recovered scrolls must fit or the attempt aborts.
	# An equipped item frees no container space, so a full inventory cannot
	# absorb the scrolls and the whole attempt must reject atomically.
	var s8 := fresh(c)
	install(s8,c,"enchant.keen","prefix")
	install(s8,c,"enchant.spellweave","suffix")
	scan(s8,[func(d: int): return d < 5000,func(d: int): return d < 4000])
	for item: RefCounted in s8.hero.items:
		if item.definition_id == "item.iron_sword":
			item.container = "equip:main_hand"
			item.column = 0
			item.row = 0
	for i: int in 200:
		if not I.grant(s8.hero,"item.potion",20,"fx:fill:"+str(i),c,false): break
	var before3 := Capture.capture(s8)
	var cramped := command(s8,c,"burn_item",instance(s8,"item.iron_sword"))
	check(not cramped.accepted,"Burn aborts when recovered scrolls have no room: "+cramped.code)
	check(Capture.capture(s8) == before3,"Aborted burn preserves state and RNG")
	# Locked equipment refuses burning.
	var s9 := fresh(c)
	install(s9,c,"enchant.keen","prefix")
	for item: RefCounted in s9.hero.items:
		if item.definition_id == "item.iron_sword": item.locked = true
	serial += 1
	var locked := command(s9,c,"burn_item",instance(s9,"item.iron_sword"))
	check(not locked.accepted and locked.code.contains("Unlock"),"Locked equipment cannot burn: "+locked.code)
	print("ENCHANT_FIXTURE3: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures