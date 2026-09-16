extends RefCounted
const H = preload("res://tests/integration/save_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const I = preload("res://scripts/domain/rules/inventory_rules.gd")
const R = preload("res://scripts/domain/commands/command_resolver.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Exploration = preload("res://scripts/domain/state/exploration_state.gd")
const Battle = preload("res://scripts/domain/rules/battle_rules.gd")
var failures := PackedStringArray()
var checks := 0
var serial := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Quests: "+label)
func fresh(c: RefCounted) -> SessionShell:
	var s := H.new().session(c)
	s.mode = SessionShell.Mode.TOWN
	s.battle = null
	s.exploration = null
	s.hero.potions = 3
	P.initialize(s.hero,c)
	s.hero.committed_gold = 200
	return s
func command(s: SessionShell,c: RefCounted,kind: String,item: String = "",dest: String = "",target: String = "") -> RefCounted:
	serial += 1
	var input := H.new().intent(s,kind,"quest:"+str(serial))
	input.data = {"item":item,"destination":dest,"column":0,"row":0,"quantity":1}
	input.target_id = target
	return R.resolve(s,R.parse_intent(input),c)
func step(s: SessionShell,c: RefCounted,kind: String,item: String = "",dest: String = "",target: String = "") -> SessionShell:
	var result := command(s,c,kind,item,dest,target)
	check(result.accepted,kind+": "+result.code)
	return result.candidate if result.accepted else s
func reject(s: SessionShell,c: RefCounted,kind: String,item: String = "",dest: String = "",target: String = "") -> void:
	var before := Capture.capture(s)
	var result := command(s,c,kind,item,dest,target)
	check(not result.accepted,"reject "+kind+" ("+result.code+")")
	check(Capture.capture(s) == before,"rejected "+kind+" preserves state and RNG")
func state(s: SessionShell, id: String) -> String:
	return str(s.hero.growth.quests.get(id,{}).get("state","locked"))
func instance_id(s: SessionShell, definition: String) -> String:
	for item: RefCounted in s.hero.items:
		if item.definition_id == definition: return item.instance_id
	return ""
func run_run(c: RefCounted, s: SessionShell, skill: String = "skill.sword") -> SessionShell:
	# Committed exploration run: two encounters, one activation fact per call, exit.
	s.exploration = Exploration.new()
	s.mode = SessionShell.Mode.DUNGEON
	Battle.begin(s,"encounter.gallery",c)
	P.begin(s)
	s.battle.encounter_id = "encounter.gallery"
	P.encounter(s,c)
	s.exploration.resolved.append("encounter.gallery")
	s.battle.encounter_id = "encounter.sanctum"
	P.encounter(s,c)
	s.exploration.resolved.append("encounter.sanctum")
	for i: int in 2: P.activation(s,skill)
	P.finish(s,true,c)
	s.mode = SessionShell.Mode.TOWN
	return s

func run() -> PackedStringArray:
	var c := H.new().catalog()
	var numerics := {}
	for id: String in P.CONFIG.quests:
		var numeric: int = int(P.CONFIG.quests[id].numeric)
		check(not numerics.has(numeric) and numeric >= 1,"unique numeric Quest.id mapping for "+id)
		numerics[numeric] = true
	var s := fresh(c)
	check(state(s,"quest.main.seal") == "active","Mainstream chain auto-delivers active")
	check(state(s,"quest.side.record") == "available" and state(s,"quest.side.focus_unlock") == "available","NPC sidequests deliver as offered")
	check(state(s,"quest.main.expedition") == "locked" and state(s,"quest.skill.focus_milestone") == "locked","Triggered quests stay locked before their trigger")
	reject(s,c,"quest_accept","quest.main.seal")
	reject(s,c,"quest_claim","quest.main.expedition")
	reject(s,c,"quest_track","quest.main.expedition")
	s = step(s,c,"quest_accept","quest.side.record")
	check(state(s,"quest.side.record") == "active","Accept moves the offered quest to active")
	serial += 1
	var repeat := command(s,c,"quest_accept","quest.side.record")
	check(not repeat.accepted and state(s,"quest.side.record") == "active","Repeated acceptance cannot restart an active quest")
	# Pending facts stay separate from committed quest counters until the exit.
	s = run_run(c,s)
	check(int(s.hero.growth.ledger.get("encounter:encounter.gallery",0)) == 1,"Exit commit merges encounter facts into the ledger")
	check(int(s.hero.growth.ledger.get("exit",0)) == 1,"Exit fact commits once per run")
	check(state(s,"quest.main.seal") == "ready","Seal quest becomes ready after both sentinels and exit")
	check(state(s,"quest.main.expedition") == "locked","The successor generation stays locked until the prerequisite is claimed")
	var gold_before: int = s.hero.committed_gold
	s = step(s,c,"quest_claim","quest.main.seal")
	check(state(s,"quest.main.seal") == "claimed","Auto-delivered quest claims from the journal")
	check(s.hero.committed_gold == gold_before+25,"Claim pays authored gold")
	check(state(s,"quest.main.expedition") == "available","Claiming the prerequisite unlocks the successor for NPC delivery")
	serial += 1
	var journal := command(s,c,"quest_claim","quest.main.expedition")
	check(not journal.accepted and journal.code.contains("keeper"),"NPC hand-in cannot claim from the journal")
	s = step(s,c,"quest_accept","quest.main.expedition")
	check(state(s,"quest.main.expedition") == "ready","Committed ledger completes the accepted successor immediately")
	s = step(s,c,"quest_claim","quest.main.expedition","","npc.keeper")
	check(state(s,"quest.main.expedition") == "claimed","Keeper hand-in claims the NPC quest")
	check(int(s.hero.growth.ap) >= 1,"Claim pays authored AP")
	print("QUEST_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures

func run_part2() -> PackedStringArray:
	# Item hand-ins validate and consume live inventory; spending unreads them.
	var c := H.new().catalog()
	var s2 := fresh(c)
	I.grant(s2.hero,"item.focus_book",1,"fixture:book",c,false)
	s2 = step(s2,c,"quest_accept","quest.side.record")
	P.refresh(s2.hero,c)
	check(state(s2,"quest.side.record") == "ready","Carrying the completed book readies the hand-in")
	s2 = step(s2,c,"quest_claim","quest.side.record","","npc.keeper")
	check(state(s2,"quest.side.record") == "claimed" and I.count(s2.hero,"item.focus_book") == 0,"Hand-in consumes the item once")
	check(s2.hero.growth.titles.has("title.scribe"),"Quest-awarded title is granted")
	var s3 := fresh(c)
	I.grant(s3.hero,"item.focus_book",1,"fixture:book",c,false)
	s3 = step(s3,c,"quest_accept","quest.side.record")
	P.refresh(s3.hero,c)
	check(state(s3,"quest.side.record") == "ready","Accepted hand-in quest reads with the book carried")
	var book_id := instance_id(s3,"item.focus_book")
	check(not book_id.is_empty(),"Book instance available for the invalidation test")
	serial += 1
	var sell := H.new().intent(s3,"sell_item","quest-sell:"+str(serial))
	sell.data = {"item":book_id,"destination":"","column":0,"row":0,"quantity":1}
	sell.target_id = "npc.keeper"
	var sold := R.resolve(s3,R.parse_intent(sell),c)
	check(sold.accepted,"Book sale accepted: "+sold.code)
	s3 = sold.candidate if sold.accepted else s3
	check(state(s3,"quest.side.record") == "active","Changed inventory invalidates hand-in readiness")
	# Skill-unlock quest pays Rank F without training and never duplicates.
	var s4 := run_run(c,fresh(c))
	s4 = step(s4,c,"quest_accept","quest.side.focus_unlock")
	s4 = step(s4,c,"quest_claim","quest.side.focus_unlock","","npc.keeper")
	check(s4.hero.skill_ranks.get("skill.focus","") == "F" and int(s4.hero.training.get("skill.focus",0)) == 0,"Skill reward grants Rank F with zero training")
	var s5 := run_run(c,fresh(c))
	s5 = step(s5,c,"quest_accept","quest.side.focus_unlock")
	s5 = step(s5,c,"quest_claim","quest.side.focus_unlock","","npc.keeper")
	var s5b := run_run(c,s5)
	serial += 1
	var again := command(s5b,c,"quest_claim","quest.side.focus_unlock","","npc.keeper")
	check(not again.accepted,"Already-claimed skill quest never grants twice")
	check(s5b.hero.skill_ranks.get("skill.focus","") == "F","Known reward skill stays unchanged")
	# Rank-milestone and equipment triggers deliver idempotently at town commits.
	var s6 := fresh(c)
	I.grant(s6.hero,"item.focus_book",1,"fixture:book",c,false)
	s6 = step(s6,c,"read_book",instance_id(s6,"item.focus_book"))
	s6.hero.training["skill.focus"] = 100
	s6.hero.growth.ap = 1
	s6 = step(s6,c,"rank_up","skill.focus")
	check(state(s6,"quest.skill.focus_milestone") == "active","Reaching the authored rank delivers the milestone skill quest")
	var s7 := fresh(c)
	I.grant(s7.hero,"item.great_sword",1,"fixture:sword",c,false)
	var sword_id := ""
	for item: RefCounted in s7.hero.items:
		if item.definition_id == "item.great_sword": sword_id = item.instance_id
	s7 = step(s7,c,"equip_item",sword_id,"main_hand")
	check(state(s7,"quest.skill.greatsword") == "active","Equipping the trigger weapon delivers its skill quest")
	print("QUEST_FIXTURE2: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures