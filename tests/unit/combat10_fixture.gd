extends RefCounted
## Phase 10: multi-enemy target sets, reactions, criticals, masteries,
## Final Hit, disabled Charge and isolated role-playing mission sessions.
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Math = preload("res://scripts/domain/rules/combat_math.gd")
const Resolver = preload("res://scripts/domain/commands/command_resolver.gd")
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Codec = preload("res://scripts/data/save_codec.gd")
const Progression = preload("res://scripts/domain/rules/progression_rules.gd")
const SaveHelpers = preload("res://tests/integration/save_fixture.gd")
var failures := PackedStringArray()
var checks: int = 0
var serial: int = 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Combat10: " + label)
func catalog() -> RefCounted:
	var result := Catalog.new()
	check(result.publish(load("res://content/catalog.tres")).is_empty(),"Phase 10 catalog validates")
	return result
## Duel-sentinel fixture: hero side versus two enemies in stable order.
## Authored ranks must exist before the run snapshot freezes the loadout.
func dual(c: RefCounted, ranks: Array[String] = []) -> SessionShell:
	var s: SessionShell = SaveHelpers.new().session(c)
	s.battle = null
	Progression.initialize(s.hero,c)
	for rank: String in ranks: s.hero.skill_ranks[rank] = "F"
	Progression.begin(s)
	s.exploration.active_encounter = "encounter.dual"
	check(Rules.begin(s,"encounter.dual",c),"dual encounter begins")
	return s
func mission_town(c: RefCounted) -> SessionShell:
	var s: SessionShell = SaveHelpers.new().session(c)
	s.mode = SessionShell.Mode.TOWN
	s.battle = null
	s.exploration = null
	s.hero.committed_gold = 40
	Progression.initialize(s.hero,c)
	return s
func intent(s: SessionShell, kind: String, skill: String = "", target: String = "", data: Dictionary = {}) -> Dictionary:
	serial += 1
	var result := {"session_id":s.session_id,"expected_revision":s.revision,
		"operation_id":"c10:%d" % serial,"kind":kind,
		"actor_id":s.battle.active_actor_id if s.mode == SessionShell.Mode.BATTLE else "hero",
		"skill_id":skill,"target_id":target}
	if kind in ["keep","reroll"]: result.indices = []
	if not data.is_empty(): result.data = data
	return result
func resolve(s: SessionShell, c: RefCounted, input: Dictionary) -> RefCounted:
	return Resolver.resolve(s,Resolver.parse_intent(input),c)
func step(s: SessionShell, c: RefCounted, input: Dictionary) -> SessionShell:
	var result := resolve(s,c,input)
	check(result.accepted,"accept %s: %s" % [input.get("kind",""),result.code])
	return result.candidate if result.accepted else s
func locked_hand(s: SessionShell, c: RefCounted, skill: String, target: String = "") -> SessionShell:
	s = step(s,c,intent(s,"select_skill",skill,target))
	return step(s,c,intent(s,"roll"))
func mission_entry(s: SessionShell) -> Dictionary:
	var input := intent(s,"mission_enter","","npc.keeper",{"item":"mission.defenders_memory","destination":"","column":0,"row":0,"quantity":1})
	input.actor_id = "hero"
	return input
func run() -> PackedStringArray:
	var c := catalog()
	_charge_disabled(c)
	_multi_enemy(c)
	_area_and_training(c)
	_counter(c)
	_critical(c)
	_masteries(c)
	_final_hit(c)
	_mission(c)
	_persistence(c)
	print("COMBAT10_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures

## Charge stays disabled: no authored Charge skill exists and none can select.
func _charge_disabled(c: RefCounted) -> void:
	check(c.definition("skill.charge") == null,"Charge has no authored definition")
	var s := dual(c)
	s.hero.skill_ranks["skill.charge"] = "F"
	check(Rules.selection(s,"hero","skill.charge","enemy.0",c).has("error"),"unauthored Charge cannot select")

## Multi-enemy begin, stable turn order and victory over the last member.
func _multi_enemy(c: RefCounted) -> void:
	var s := dual(c)
	check(s.battle.enemies.size() == 2,"both authored enemies enter")
	check(s.battle.enemies[0].definition_id == "actor.training_enemy" and s.battle.enemies[1].definition_id == "actor.acolyte","stable authored order")
	check(s.battle.active_actor_id == "hero","authored first actor")
	var events: Array[Dictionary] = []
	s.battle.active_actor_id = "enemy.1"
	Rules.finish(s,c,true,events)
	check(s.battle.active_actor_id == "hero","order wraps to the hero side")
	s.battle.enemies[0].current[0] = 0
	s.battle.active_actor_id = "enemy.1"
	Rules.finish(s,c,true,events)
	check(s.battle.active_actor_id == "hero","dead members lose their turn")
	check(s.battle.outcome == "","living members keep the battle running")
	s.battle.enemies[1].current[0] = 0
	s.battle.active_actor_id = "hero"
	Rules.finish(s,c,true,events)
	check(s.battle.outcome == "victory","all members down ends the encounter")

## Windmill: frozen member set, per-target hits, one multi fact per action.
func _area_and_training(c: RefCounted) -> void:
	var s := dual(c,["skill.windmill"])
	var choice := Rules.selection(s,"hero","skill.windmill","",c)
	check(not choice.has("error"),"area skill selects without a single target: %s" % str(choice.get("error","")))
	check(choice.get("target_ids",[]) == ["enemy.0","enemy.1"],"living members frozen in authored order")
	s.battle.enemies[0].current[0] = 0
	choice = Rules.selection(s,"hero","skill.windmill","",c)
	check(choice.get("target_ids",[]) == ["enemy.1"],"target set excludes defeated members")
	s.battle.enemies[0].current[0] = 30
	s = locked_hand(s,c,"skill.windmill")
	check(s.battle.locked_inputs.get("targets",[]).size() == 2,"both members locked into the action")
	var facts_before: int = int(s.exploration.progression.get("facts",{}).get("multi:skill.windmill",0))
	s.battle.enemies[0].current[0] = 1
	s.battle.enemies[1].current[0] = 1
	s = step(s,c,intent(s,"commit"))
	check(s.battle.outcome == "victory","area action defeats the whole watch")
	check(int(s.exploration.progression.get("facts",{}).get("multi:skill.windmill",0)) == facts_before + 1,"one multi fact per multi-target action")
	check(int(s.exploration.progression.get("training",{}).get("skill.windmill",0)) > 0,"area use trains once per action")
	var empty := dual(c)
	empty.hero.skill_ranks["skill.windmill"] = "F"
	empty.battle.enemies[0].current[0] = 0
	empty.battle.enemies[1].current[0] = 0
	check(Rules.selection(empty,"hero","skill.windmill","",c).get("error","") == "invalid_target","no living member rejects area selection")

## Counterattack: prepare, negate one physical hit, retaliate once, expire.
func _counter(c: RefCounted) -> void:
	var s := dual(c,["skill.counter"])
	var hero_hp: int = s.hero.current[0]
	s = locked_hand(s,c,"skill.counter")
	check(s.battle.phase == 1,"counter locks like any skill")
	s = step(s,c,intent(s,"commit"))
	check(not s.hero.reaction.is_empty() and int(s.hero.reaction.get("power",0)) > 0,"stance stores power")
	check(s.hero.current[0] == hero_hp,"preparing costs only SP")
	var rng_before := s.rng.capture()
	var enemy_hp: int = s.battle.enemies[0].current[0]
	s.battle.active_actor_id = "enemy.0"
	var events: Array[Dictionary] = []
	var strike := resolve(s,c,intent(s,"enemy_action","skill.enemy_strike","hero"))
	check(strike.accepted,"enemy strike resolves: %s" % strike.code)
	if strike.accepted:
		s = strike.candidate
		events = strike.events
	var countered: bool = false
	for event: Dictionary in events:
		if event.get("type","") == "counter": countered = true
	check(countered,"physical hit triggers the stance")
	check(s.hero.current[0] == hero_hp,"countered hit deals no damage")
	check(s.battle.enemies[0].current[0] < enemy_hp,"retaliation damages the attacker")
	check(s.rng.capture() == rng_before,"counter interception consumes no combat draw")
	check(s.hero.reaction.is_empty(),"one charge is consumed")
	s.battle.active_actor_id = "enemy.1"
	var hero_hp2: int = s.hero.current[0]
	s = step(s,c,intent(s,"enemy_action","skill.enemy_strike","hero"))
	check(s.hero.current[0] < hero_hp2,"later hits are not negated")
	# Regression: enemy activations never train the hero's run ledger.
	check(not s.exploration.progression.get("training",{}).has("skill.enemy_strike"),"enemy strikes write no hero training")
	var codec := Codec.new()
	var struck := codec.decode(codec.encode(s,9),c)
	check(struck.status == "ok","post-strike session still saves: " + codec.error)
	# Expiry: the stance survives the enemy turns, then dies at the owner's turn.
	s.hero.reaction = {"skill_id":"skill.counter","power":9}
	s.battle.active_actor_id = "hero"
	Rules.finish(s,c,true,events)
	check(not s.hero.reaction.is_empty() and s.battle.active_actor_id != "hero","stance persists through the owner's own turn")
	s.battle.active_actor_id = "enemy.0"
	Rules.finish(s,c,true,events)
	s.battle.active_actor_id = "enemy.1"
	Rules.finish(s,c,true,events)
	check(s.battle.active_actor_id == "hero" and s.hero.reaction.is_empty(),"unused stance expires at the owner's next turn")
	check(int(s.exploration.progression.get("training",{}).get("skill.counter",0)) > 0,"counter training accrues")
	check(int(s.exploration.progression.get("facts",{}).get("counter:skill.counter",0)) == 1,"exactly one counter fact")

## Critical Hit: authored chance gates draws; bonus scales combo damage.
func _critical(c: RefCounted) -> void:
	var locked := {"skill_id":"skill.sword","effect":"physical_damage","base":4,"pip_scale":1,"attack":5,"critical_chance":0}
	var target := {"instance_id":"enemy.0","defense":0,"protection":0,"shield":0}
	var normal: Dictionary = Math.resolve_hit(locked,target,5,2,Vector2i(2,1),0)
	var crit: Dictionary = Math.resolve_hit(locked,target,5,2,Vector2i(2,1),5000)
	check(int(normal.amount) == 28 and int(crit.amount) == 42,"critical replaces combo damage exactly")
	check(bool(crit.critical) and not bool(normal.critical),"critical flag only with bonus")
	var s := dual(c)
	s = locked_hand(s,c,"skill.sword","enemy.0")
	var rng_before := s.rng.capture()
	s = step(s,c,intent(s,"commit"))
	check(s.rng.capture() == rng_before,"zero authored chance draws nothing")
	var staged := dual(c,["skill.critical","skill.windmill"])
	staged = locked_hand(staged,c,"skill.windmill")
	var draw_before: int = staged.rng.capture().streams.combat.state.to_int()
	staged = step(staged,c,intent(staged,"commit"))
	check(staged.rng.capture().streams.combat.state.to_int() != draw_before,"one draw per valid target")
	check(int(staged.exploration.progression.get("training",{}).get("skill.critical",0)) > 0 or int(staged.exploration.progression.get("facts",{}).get("critical:skill.windmill",0)) == 0,"critical training only on landed criticals")
	var rankless := dual(c,["skill.windmill"])
	var windmill: Resource = c.definition("skill.windmill")
	var rank: Resource = Math.rank_of(windmill,"F")
	check(Math.critical_chance(rankless.hero,rank,c) == 0,"no passive means no critical chance")
	rankless.hero.skill_ranks["skill.critical"] = "F"
	check(Math.critical_chance(rankless.hero,rank,c) == rank.critical_chance,"learned passive unlocks authored chance")

## Equipment masteries: frozen attack/defense contributions and gating.
func _masteries(c: RefCounted) -> void:
	var s := dual(c)
	var base: Dictionary = Rules.selection(s,"hero","skill.sword","enemy.0",c)
	var base_attack: int = int(base.attack)
	s.hero.skill_ranks["skill.combat_mastery"] = "F"
	var with_combat: Dictionary = Rules.selection(s,"hero","skill.sword","enemy.0",c)
	check(int(with_combat.attack) == base_attack + 1,"Combat Mastery adds melee attack once")
	s.hero.skill_ranks["skill.sword_mastery"] = "F"
	var with_sword: Dictionary = Rules.selection(s,"hero","skill.sword","enemy.0",c)
	check(int(with_sword.attack) == base_attack + 2,"Sword Mastery adds for sword-tagged actions")
	var enemy: ActorState = s.battle.enemies[0]
	var enemy_defense: int = Math.effective(enemy,"stat.defense",c)
	enemy.skill_ranks["skill.shield_mastery"] = "F"
	var ungated: Dictionary = Rules.selection(s,"hero","skill.sword","enemy.0",c)
	check(int(ungated.defense) == enemy_defense,"defensive mastery sleeps without a shield")
	enemy.shield_equipped = true
	var gated: Dictionary = Rules.selection(s,"hero","skill.sword","enemy.0",c)
	check(int(gated.defense) == enemy_defense + 1,"Shield Mastery defends while equipped")
	var trainer := dual(c,["skill.combat_mastery","skill.sword_mastery","skill.windmill"])
	trainer = locked_hand(trainer,c,"skill.windmill")
	trainer = step(trainer,c,intent(trainer,"commit"))
	var training: Dictionary = trainer.exploration.progression.get("training",{})
	check(int(training.get("skill.windmill",0)) == 50,"active skill trains once")
	check(int(training.get("skill.combat_mastery",0)) == 50,"Combat Mastery trains once per action")
	check(int(training.get("skill.sword_mastery",0)) == 50,"Sword Mastery trains once per action")

## Final Hit: stored magnitude, recast lock, melee-only bonus, expiry.
func _final_hit(c: RefCounted) -> void:
	var s := dual(c,["skill.final_hit"])
	s = locked_hand(s,c,"skill.final_hit")
	s = step(s,c,intent(s,"commit"))
	var stored: int = 0
	for status: RefCounted in s.hero.statuses:
		if status.effect == "attack_bonus": stored = int(status.magnitude)
	check(stored > 0,"resolved magnitude stored once")
	check(Rules.selection(s,"hero","skill.final_hit","hero",c).get("error","") == "already_active","Final Hit cannot be recast while active")
	var melee: Dictionary = Rules.selection(s,"hero","skill.sword","enemy.0",c)
	check(int(melee.attack) > 0,"melee reads the stored bonus through selection")
	var events: Array[Dictionary] = []
	for i: int in 3:
		s.battle.active_actor_id = "hero"
		Rules.finish(s,c,true,events)
	var remaining: int = 0
	for status: RefCounted in s.hero.statuses:
		if status.effect == "attack_bonus": remaining += 1
	check(remaining == 0,"Final Hit expires after its duration")
	check(Rules.selection(s,"hero","skill.final_hit","hero",c).get("error","") != "already_active","recast allowed after expiry")

## Role-playing missions: isolation, committed outcome, exactly-once rewards.
func _mission(c: RefCounted) -> void:
	var town := mission_town(c)
	var hero_hp: int = town.hero.current[0]
	var hero_ranks: Dictionary = town.hero.skill_ranks.duplicate()
	var result := resolve(town,c,mission_entry(town))
	check(result.accepted,"mission entry accepted: %s" % result.code)
	var s: SessionShell = result.candidate
	check(s.mode == SessionShell.Mode.BATTLE and s.mission_id == "mission.defenders_memory","mission battle runs in battle mode")
	check(s.battle.champion != null and s.battle.champion.definition_id == "actor.warden","borrowed champion enters")
	check(s.battle.enemies.size() == 2,"mission encounter keeps its authored members")
	check(not resolve(s,c,mission_entry(s)).accepted,"duplicate mission entry rejected")
	s.battle.champion.current[0] = 5
	check(s.hero.current[0] == hero_hp,"champion damage never touches the hero")
	check(s.hero.skill_ranks == hero_ranks,"borrowed skills never export")
	s.battle.enemies[0].current[0] = 1
	s.battle.enemies[1].current[0] = 1
	s.battle.active_actor_id = "hero"
	s.battle.champion.skill_ranks["skill.windmill"] = "F"
	var locked := Rules.selection(s,"hero","skill.windmill","",c)
	check(not locked.has("error"),"champion fights with borrowed skills")
	Rules.lock(s,locked)
	var events: Array[Dictionary] = []
	s.battle.hand = PackedInt32Array([3,3,3,3,4])
	Rules.finish(s,c,false,events)
	check(s.battle.outcome == "victory","champion victory ends the scenario")
	check(Progression.mission_complete(s,c,"mission:claim:1").is_empty(),"mission outcome commits")
	check(int(s.hero.growth.get("ledger",{}).get("mission:mission.defenders_memory",0)) == 1,"mission evidence merged into the ledger")
	check(s.hero.growth.get("banked",0) == 40 and s.hero.committed_gold == 30,"authored gold granted once")
	check(s.mission_id.is_empty() and s.battle == null,"mission context clears")
	check(not Progression.mission_complete(s,c,"mission:claim:2").is_empty(),"second commit rejected")
	check(Progression.objective_ready(s.hero,"quest.rp.defender",{"type":"mission","target":"mission.defenders_memory","count":1}),"quest readiness follows the committed mission")
	# A claimed scenario cannot re-enter on the same hero.
	s.mode = SessionShell.Mode.TOWN
	check(not resolve(s,c,mission_entry(s)).accepted,"claimed scenario cannot re-enter")
	var failure := mission_town(c)
	var retried := resolve(failure,c,mission_entry(failure))
	check(retried.accepted,"unclaimed scenario re-enters")
	var lost: SessionShell = retried.candidate
	lost.battle.champion.current[0] = 0
	lost.battle.active_actor_id = "hero"
	var events2: Array[Dictionary] = []
	Rules.finish(lost,c,true,events2)
	check(lost.battle.outcome == "defeat","champion defeat loses the memory")
	check(Progression.mission_complete(lost,c,"mission:claim:3").is_empty(),"failure commits without grants")
	check(int(lost.hero.growth.get("ledger",{}).get("mission:mission.defenders_memory",0)) == 0,"defeat records no evidence")
	check(lost.hero.growth.get("missions",{}).is_empty(),"defeat leaves no claimed record")
	check(lost.exploration == null,"mission battles run outside expedition progression")

## Save and restore for every new structure, plus legacy migration.
func _persistence(c: RefCounted) -> void:
	var codec := Codec.new()
	var s := dual(c,["skill.windmill","skill.counter"])
	s = locked_hand(s,c,"skill.windmill")
	var decoded := codec.decode(codec.encode(s,7),c)
	check(decoded.status == "ok","multi-enemy save validates: " + codec.error)
	if decoded.status == "ok":
		check(Capture.capture(decoded.session) == Capture.capture(s),"exact multi-enemy roundtrip")
		# Poisoned-run healing: an enemy strike recorded before the fix must
		# not block the next save; restore drops unlearned training keys.
		var healed: SessionShell = decoded.session
		healed.exploration.progression.training["skill.enemy_strike"] = 50
		var healed_decode := codec.decode(codec.encode(healed,8),c)
		check(healed_decode.status == "ok","poisoned run training heals on save: " + codec.error)
		if healed_decode.status == "ok":
			check(not healed_decode.session.exploration.progression.get("training",{}).has("skill.enemy_strike"),"healed save drops unlearned training")
	var town := mission_town(c)
	var entered := resolve(town,c,mission_entry(town))
	if entered.accepted:
		var m: SessionShell = entered.candidate
		m.battle.champion.reaction = {"skill_id":"skill.counter","power":7}
		var mission_decode := codec.decode(codec.encode(m,3),c)
		check(mission_decode.status == "ok","mission save validates: " + codec.error)
		if mission_decode.status == "ok":
			check(mission_decode.session.battle.champion.definition_id == "actor.warden","champion restored")
			check(int(mission_decode.session.battle.champion.reaction.get("power",0)) == 7,"prepared stance restored")
			check(mission_decode.session.mission_id == "mission.defenders_memory","mission context restored")
	var legacy: Dictionary = Capture.capture(dual(c))
	legacy.erase("mission_id")
	legacy.battle.erase("mission_id")
	legacy.battle.erase("champion")
	legacy.hero.erase("shield_equipped")
	legacy.hero.erase("reaction")
	var migrated := SaveHelpers.new().rewrap(legacy,4)
	var decoded_legacy := codec.decode(migrated,c)
	check(decoded_legacy.status == "ok","legacy capture migrates: " + codec.error)

