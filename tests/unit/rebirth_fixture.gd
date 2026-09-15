extends RefCounted
const H = preload("res://tests/integration/save_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const I = preload("res://scripts/domain/rules/inventory_rules.gd")
const R = preload("res://scripts/domain/commands/command_resolver.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
var failures := PackedStringArray()
var checks := 0
var serial := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Rebirth: "+label)
func fresh(c: RefCounted) -> SessionShell:
	var s := H.new().session(c)
	s.mode = SessionShell.Mode.TOWN
	s.battle = null
	s.exploration = null
	P.initialize(s.hero,c)
	s.hero.committed_gold = 200
	return s
func command(s: SessionShell,c: RefCounted,kind: String,talent: String,age: String) -> RefCounted:
	serial += 1
	var input := H.new().intent(s,kind,"rebirth:"+str(serial))
	input.data = {"item":talent,"destination":age,"column":0,"row":0,"quantity":1}
	input.target_id = ""
	return R.resolve(s,R.parse_intent(input),c)
func max_level(s: SessionShell) -> SessionShell:
	s.hero.growth.level = P.CONFIG.xp_to_next.size()+1
	s.hero.growth.cumulative = 9
	s.hero.growth.life_growth = {"max_hp":8,"stat.strength":4}
	s.hero.skill_ranks["skill.sword"] = "E"
	return s

func run() -> PackedStringArray:
	var c := H.new().catalog()
	# Aging reconciles at explicit boundaries; backward clocks never regress.
	var s := fresh(c)
	P.reconcile_age(s,1000)
	check(int(s.hero.growth.birth_week) == 1000,"First reconcile anchors the aging clock without elapsed years")
	check(int(s.hero.growth.ap) == 0,"Anchoring grants no age-up AP")
	P.reconcile_age(s,1052)
	check(int(s.hero.growth.age) == int(P.CONFIG.aging.start_age)+1,"Fifty-two weeks age the hero one year")
	check(int(s.hero.growth.ap) == int(P.CONFIG.aging.ap_per_year),"Each new age year grants the authored AP")
	var awarded: int = int(s.hero.growth.ap)
	P.reconcile_age(s,1052)
	check(int(s.hero.growth.ap) == awarded,"Reconciling the same boundary never repeats the age-up reward")
	P.reconcile_age(s,900)
	check(int(s.hero.growth.age) == int(P.CONFIG.aging.start_age)+1 and int(s.hero.growth.ap) == awarded,"Backward clock changes cannot remove age or rewards")
	P.reconcile_age(s,27000)
	check(int(s.hero.growth.age) == int(P.CONFIG.aging.maximum_age),"Aging clamps at the authored maximum age")
	# Rebirth gates: level cap, carried cost, cooldown and age/talent choices.
	var gated := fresh(c)
	serial += 1
	var too_soon := command(gated,c,"rebirth","","12")
	check(not too_soon.accepted,"Rebirth below the level cap is rejected")
	var funded := max_level(fresh(c))
	funded.clock_week = 2000
	P.reconcile_age(funded,2000)
	serial += 1
	var bad_age := command(funded,c,"rebirth","talent.magic","9")
	check(not bad_age.accepted,"Age choices below the authored minimum are rejected")
	serial += 1
	var old_age := command(funded,c,"rebirth","","18")
	check(not old_age.accepted,"Age choices above the authored maximum are rejected")
	serial += 1
	var accepted := command(funded,c,"rebirth","talent.magic","12")
	check(accepted.accepted,"Eligible rebirth is accepted: "+accepted.code)
	var hero: Dictionary = accepted.candidate.hero.growth
	check(accepted.candidate.hero.committed_gold == 150,"Rebirth pays the authored carried cost")
	check(int(hero.level) == 1 and int(hero.xp) == 0,"Rebirth resets level and XP")
	check(hero.life_growth.is_empty(),"Rebirth clears life growth")
	check(int(hero.cumulative) == 9,"Cumulative level survives rebirth")
	check(hero.talent == "talent.magic" and not bool(hero.talent_chosen),"Rebirth selects the talent and reopens the choice")
	check(int(hero.age) == 12 and int(hero.birth_week) == 2000 and int(hero.rebirths) == 1,"Rebirth sets the chosen age and clock anchors")
	check(accepted.candidate.hero.skill_ranks.get("skill.sword","") == "E","Skill ranks survive rebirth")
	check(hero.quests.has("quest.main.seal"),"Committed quest history survives rebirth")
	check(hero.titles.has("title.reborn"),"First rebirth awards its title")
	check(accepted.candidate.hero.growth.quests.get("quest.skill.second_life",{}).get("state","") == "active","Rebirthing into the trigger talent delivers its skill quest")
	accepted.candidate.hero.growth.level = P.CONFIG.xp_to_next.size()+1
	serial += 1
	var cooldown := command(accepted.candidate,c,"rebirth","","13")
	check(not cooldown.accepted and cooldown.code.contains("cooldown"),"Rebirth honors the authored cooldown")
	# Conditional enchant clauses re-evaluate across rebirth.
	var s2 := fresh(c)
	I.grant(s2.hero,"item.iron_sword",1,"fx:sword",c,false)
	for item: RefCounted in s2.hero.items:
		if item.definition_id == "item.iron_sword":
			item.container = "equip:main_hand"
			item.enchants["suffix"] = {"id":"enchant.spellweave","values":{"max_mp":-3}}
	P.recompute(s2.hero,c)
	var combat_sources: Dictionary = P.sources(s2.hero,c)
	check(int(combat_sources.Equipment.get("stat.magic_attack",0)) == 0,"Inactive conditional benefit grants nothing outside its condition")
	check(int(combat_sources.Equipment.get("max_mp",-99)) == -3,"Authored penalties stay active while the clause is inactive")
	s2.hero.growth.talent = "talent.magic"
	P.recompute(s2.hero,c)
	var magic_sources: Dictionary = P.sources(s2.hero,c)
	check(int(magic_sources.Equipment.get("stat.magic_attack",0)) == 2,"Conditional benefit activates under its condition")
	print("REBIRTH_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures

func run_part2() -> PackedStringArray:
	var c := H.new().catalog()
	# Legacy Phase 8 checkpoint migrates structurally to growth v2 without
	# inventing retroactive aging, quests or enchants.
	var legacy := fresh(c)
	legacy.hero.growth.age = 17
	for field: String in ["quests","track","ledger","birth_week","birth_age","aged_to","rebirth_week","rebirths"]:
		legacy.hero.growth.erase(field)
	legacy.hero.growth.version = 1
	var data: Dictionary = Capture.capture(legacy)
	data.exploration = {}
	Codec.new()._migrate_phase9(data)
	var migrated: Dictionary = data.hero.growth
	check(int(migrated.version) == 2 and migrated.quests.is_empty(),"Migration upgrades growth to v2 without inventing quests")
	check(int(migrated.age) == 17 and int(migrated.aged_to) == 17 and int(migrated.birth_week) == -1,"Legacy age is preserved with an unanchored clock")
	# True Phase 8 wire checkpoint: strip every Phase 9 field and decode through
	# the real envelope path, including checksum and JSON transport.
	var codec8 := Codec.new()
	var envelope: Dictionary = JSON.parse_string(codec8.encode(fresh(c),5))
	var payload: Dictionary = JSON.parse_string(envelope.payload)
	payload.erase("clock_week")
	var wire_growth: Dictionary = payload.hero.growth
	wire_growth.version = 1
	for field: String in ["quests","track","ledger","birth_week","birth_age","aged_to","rebirth_week","rebirths"]:
		wire_growth.erase(field)
	for wire_item: Dictionary in payload.hero.items: wire_item.erase("enchants")
	if payload.exploration is Dictionary and not payload.exploration.is_empty():
		var wire_progression: Dictionary = payload.exploration.get("progression",{})
		if not wire_progression.is_empty(): wire_progression.erase("facts")
	payload.rng.streams.erase("enchant")
	envelope.payload = JSON.stringify(payload,"",true,true)
	envelope.checksum = (envelope.format+"\n"+envelope.sequence+"\n"+envelope.payload).sha256_text()
	var wire_text: String = JSON.stringify(envelope,"",true,true)
	var legacy_codec := Codec.new()
	var wire_decoded: Dictionary = legacy_codec.decode(wire_text,c)
	check(wire_decoded.status == "ok","Legacy Phase 8 wire checkpoint decodes: "+legacy_codec.error)
	if wire_decoded.status == "ok":
		var migrated_session: SessionShell = wire_decoded.session
		check(int(migrated_session.clock_week) == 0 and migrated_session.hero.growth.quests.is_empty(),"Wire migration supplies the clock and quest defaults")
		check(migrated_session.rng.capture().streams.size() == 5,"Wire migration derives the enchant stream")
		check(migrated_session.hero.growth.version == 2 and int(migrated_session.hero.growth.age) == int(P.CONFIG.aging.start_age),"Wire migration upgrades growth to v2")
	# Legacy four-stream RNG captures restore with the derived enchant stream.
	var streams: Dictionary = legacy.rng.capture()
	streams.streams.erase("enchant")
	var probe := preload("res://scripts/domain/rules/rng_streams.gd").new(int(streams.root_seed))
	check(probe.restore(streams),"Legacy four-stream capture restores")
	var probe_two := preload("res://scripts/domain/rules/rng_streams.gd").new(1)
	probe_two.stream("combat").bounded(7)
	var capture_two: Dictionary = probe_two.capture()
	var probe_three := preload("res://scripts/domain/rules/rng_streams.gd").new(1)
	check(probe_three.restore(capture_two),"Five-stream capture restores")
	check(probe_three.stream("combat").capture() == probe_two.stream("combat").capture(),"Restored combat stream continues identically")
	# Enchanted items survive an encode/decode round trip with exact values.
	var s := fresh(c)
	I.grant(s.hero,"item.iron_sword",1,"fx:sword",c,false)
	for item: RefCounted in s.hero.items:
		if item.definition_id == "item.iron_sword":
			item.enchants["prefix"] = {"id":"enchant.keen","values":{"stat.strength":2}}
	P.recompute(s.hero,c)
	var codec2 := Codec.new()
	var decoded: Dictionary = codec2.decode(codec2.encode(s,7),c)
	check(decoded.status == "ok","Enchanted session decodes: "+codec2.error)
	var found := false
	for item: RefCounted in decoded.session.hero.items:
		if item.definition_id == "item.iron_sword":
			found = str(item.enchants.get("prefix",{}).get("id","")) == "enchant.keen" and int(item.enchants.get("prefix",{}).get("values",{}).get("stat.strength",0)) == 2
	check(found,"Rolled enchant values survive reload exactly")
	# Quest counters, states and claims survive the combined save.
	var s3 := fresh(c)
	I.grant(s3.hero,"item.focus_book",1,"fixture:book",c,false)
	s3 = command(s3,c,"quest_accept","quest.side.record","").candidate
	P.refresh(s3.hero,c)
	serial += 1
	var claim_input := H.new().intent(s3,"quest_claim","rebirth-claim:"+str(serial))
	claim_input.data = {"item":"quest.side.record","destination":"","column":0,"row":0,"quantity":1}
	claim_input.target_id = "npc.keeper"
	var claim := R.resolve(s3,R.parse_intent(claim_input),c)
	check(claim.accepted,"Hand-in claim accepted: "+claim.code)
	s3 = claim.candidate if claim.accepted else s3
	var codec3 := Codec.new()
	var decoded3: Dictionary = codec3.decode(codec3.encode(s3,8),c)
	check(decoded3.status == "ok","Quest session decodes: "+codec3.error)
	check(str(decoded3.session.hero.growth.quests.get("quest.side.record",{}).get("state","")) == "claimed","Claimed quest state persists in the combined save")
	check(str(decoded3.session.hero.growth.quests["quest.side.record"].claim).contains("rebirth"),"Claim operation identity persists")
	print("REBIRTH_FIXTURE2: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures