extends RefCounted
const Catalog = preload("res://scripts/data/content_catalog.gd")
const Setup = preload("res://tests/unit/command_fixture.gd")
const Resolver = preload("res://scripts/domain/commands/command_resolver.gd")
const Dice = preload("res://scripts/domain/rules/dice_rules.gd")
const Math = preload("res://scripts/domain/rules/combat_math.gd")
const Checkpoint = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Exploration = preload("res://scripts/domain/state/exploration_state.gd")
const StatusDef = preload("res://scripts/data/definitions/status_definition.gd")
var failures := PackedStringArray()
var checks: int = 0
var catalog := Catalog.new()
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label)
func fresh() -> SessionShell:
	return Setup.new().make_session(catalog)
func command(s: SessionShell, kind: String, skill: String = "", target: String = "", indices: Array = []) -> RefCounted:
	var intent := {"session_id":s.session_id,"expected_revision":s.revision,"operation_id":"test:%d" % s.revision,
		"kind":kind,"actor_id":s.battle.active_actor_id,"skill_id":skill,"target_id":target}
	if kind in ["keep","reroll"]: intent.indices = indices
	return Resolver.parse_intent(intent)
func apply(s: SessionShell, kind: String, skill: String = "", target: String = "", indices: Array = []) -> SessionShell:
	var result := Resolver.resolve(s,command(s,kind,skill,target,indices),catalog)
	check(result.accepted,"Accept " + kind + ": " + result.code)
	return result.candidate if result.accepted else s
func reject(s: SessionShell, cmd: RefCounted, label: String) -> void:
	var before := Checkpoint.capture(s)
	var result := Resolver.resolve(s,cmd,catalog)
	check(not result.accepted and result.candidate == null and result.events.is_empty(),label)
	check(Checkpoint.capture(s) == before,label + " leaves state and all RNG untouched")
func locked(skill: String = "skill.sword") -> SessionShell:
	var s := fresh()
	s.hero.skill_ranks[skill] = "F"
	s = apply(s,"select_skill",skill,"hero" if skill in ["skill.fortify","skill.focus"] else "enemy.0")
	return apply(s,"roll")
func run() -> PackedStringArray:
	check(catalog.publish(load("res://content/catalog.tres")).is_empty(),"Combat catalog valid")
	var counts := [0,0,0,0,0,0,0,0]
	for encoded: int in 7776:
		var value: int = encoded
		var hand := PackedInt32Array()
		for i: int in 5:
			hand.append(value % 6 + 1)
			@warning_ignore("integer_division")
			value = value / 6
		var pairs: int = 0
		for i: int in 5:
			for j: int in range(i + 1,5):
				if hand[i] == hand[j]: pairs += 1
		var expected: int = {1:1,2:2,3:3,4:5,6:6,10:7}.get(pairs,0)
		var sorted := hand.duplicate()
		sorted.sort()
		if pairs == 0 and sorted[4] - sorted[0] == 4: expected = 4
		var actual := Dice.classify(hand)
		check(actual == expected,"Independent pair-relation oracle " + str(hand))
		counts[actual] += 1
	check(counts == [480,3600,1800,1200,240,300,150,6],"7776-hand histogram")
	check(Dice.classify(PackedInt32Array([1,2,3,4,7])) == -1,"Invalid face")
	var weights := PackedInt64Array([0,1,0,2,0,3])
	for offset: int in 6:
		check(Dice.face_at(weights,offset) == [2,4,4,6,6,6][offset],"Weighted cumulative boundary")
	check(Dice.face_at(weights,-1) == -1 and Dice.face_at(weights,6) == -1,"Outside weighted bounds")
	var s := locked()
	check(s.hero.current[2] == 20 and s.hero.reserved[2] == 5,"Roll reserves without payment")
	var rng := s.rng.capture()
	s = apply(s,"keep","","",[0])
	check(s.rng.capture() == rng and s.battle.kept[0],"Keep draws nothing")
	for subset: Array in [[],[0],[1,1],[-1],[5],[1.0],[1,4,6]]:
		reject(s,command(s,"reroll","","",subset),"Reject subset " + str(subset))
	reject(s,command(s,"select_skill","skill.fortify","hero"),"Selection locked")
	var a := apply(s,"reroll","","",[4,1,3])
	var b := apply(s,"reroll","","",[1,3,4])
	check(Checkpoint.capture(a) == Checkpoint.capture(b),"Canonical subset order")
	check(a.battle.hand[0] == s.battle.hand[0] and a.battle.hand[2] == s.battle.hand[2],"Other dice retained")
	a = apply(a,"reroll","","",[1])
	check(a.battle.rerolls_remaining == 0 and a.battle.phase == 1 and a.hero.current[2] == 20,"Budget exhausted does not commit")
	reject(a,command(a,"reroll","","",[1]),"Third reroll")
	reject(a,command(s,"commit"),"Stale commit")
	var duplicate := command(a,"commit")
	duplicate.operation_id = "test:0"
	reject(a,duplicate,"Duplicate operation")
	var snapshot := Checkpoint.capture(a)
	var restored := Checkpoint.restore(bytes_to_var(var_to_bytes(snapshot)),catalog)
	check(restored != null and Checkpoint.capture(restored) == snapshot,"Explicit unfinished restore")
	if restored != null:
		check(Checkpoint.capture(apply(a,"commit")) == Checkpoint.capture(apply(restored,"commit")),"Restored commit identical")
		var continuation := Checkpoint.restore(Checkpoint.capture(s),catalog)
		check(Checkpoint.capture(apply(s,"reroll","","",[2,4])) == Checkpoint.capture(apply(continuation,"reroll","","",[4,2])),"Restored reroll/RNG identical")
	var preview := Math.preview(a.battle.locked_inputs,a.battle.hand,catalog)
	var hp: int = a.battle.enemies[0].current[0]
	a = apply(a,"commit")
	check(a.hero.current[2] == 17 and a.hero.reserved == PackedInt64Array([0,0,0]),"Pay once then regenerate")
	check(a.battle.enemies[0].current[0] == maxi(0,hp - preview.amount),"Preview equals HP effect")
	s = fresh()
	s.hero.current = PackedInt64Array([10,0,0])
	s = apply(s,"pass")
	check(s.hero.current == PackedInt64Array([10,1,2]),"Free pass recovery")
	s = apply(locked("skill.blood"),"pass")
	check(s.hero.current == PackedInt64Array([26,9,20]) and s.battle.enemies[0].current[0] == 48,"Paid mixed pass discards damage")
	s = fresh()
	s.hero.skill_ranks["skill.blood"] = "F"
	s.hero.current[0] = 4
	reject(s,command(s,"select_skill","skill.blood","enemy.0"),"Nonlethal upfront HP")
	s.hero.current[0] = 5
	s = apply(s,"select_skill","skill.blood","enemy.0")
	s = apply(apply(s,"roll"),"commit")
	check(s.hero.current[0] == 1,"HP cost leaves one")
	_math_and_timing()
	_outcomes()
	print("COMBAT_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures
func _math_and_timing() -> void:
	var s := fresh()
	s.hero.flat_modifiers["cost.hp"] = -100
	s.hero.percent_modifiers["cost.mp"] = -10000
	s.hero.percent_modifiers["cost.sp"] = 2500
	check(Math.costs(s.hero,catalog.definition("skill.blood").ranks[0]) == PackedInt64Array([1,1,3]),"Cost minimum and ceil")
	check(Math.costs(s.hero,catalog.definition("skill.sword").ranks[0])[0] == 0,"Zero cost stays zero")
	s.hero.flat_modifiers["stat.strength"] = 2
	s.hero.percent_modifiers["stat.strength"] = 2500
	check(Math.effective(s.hero,"stat.strength",catalog) == 6,"Flat then percent floor")
	s.hero.flat_modifiers["stat.strength"] = -100
	check(Math.effective(s.hero,"stat.strength",catalog) == 0,"Negative stat clamps")
	var inputs := {"base":2,"pip_scale":1,"attack":3,"defense":4,"protection":2500,"shield":7,"uses_dice":true,"effect":"physical_damage"}
	var hand := PackedInt32Array([1,1,2,3,4])
	var p := Math.preview(inputs,hand,catalog)
	check(p.amount == 6 and p.absorbed == 7,"Mitigation order and integer floors")
	inputs.protection = 10000
	check(Math.preview(inputs,hand,catalog).amount == 0,"Full protection")
	inputs.protection = 0
	inputs.defense = 1000000
	check(Math.preview(inputs,hand,catalog).amount == 0,"No minimum damage")
	inputs.defense = 0
	inputs.attack = 1000000
	check(Math.preview(inputs,PackedInt32Array([6,6,6,6,6]),catalog).amount <= 1000000,"Bounded effect output")
	s = locked("skill.spark")
	check(s.battle.locked_inputs.attack == 3 and s.battle.locked_inputs.effect == "magic_damage","Magic stat mapping")
	s = apply(locked("skill.focus"),"commit")
	check(s.hero.statuses.size() == 1 and s.hero.statuses[0].magnitude == 3 and s.hero.statuses[0].remaining_activations == 3,"Focus independent of dice, skips own boundary")
	var focus: Resource = catalog.definition("status.focused")
	Math.apply_status(s.hero,focus,"other",99,3,"enemy.0")
	check(s.hero.statuses.size() == 1 and s.hero.statuses[0].magnitude == 3,"Refresh no stacking")
	var alternate: Resource = focus.duplicate()
	alternate.id = "status.alternate"
	alternate.priority = -1
	Math.apply_status(s.hero,alternate,"other",1,9,"enemy.0")
	check(s.hero.statuses[0].definition_id == focus.id and s.hero.statuses[0].remaining_activations == 3,"Lower priority cannot refresh")
	alternate.priority = 0
	Math.apply_status(s.hero,alternate,"other",2,2,"enemy.0")
	check(s.hero.statuses[0].definition_id == alternate.id and s.hero.statuses[0].magnitude == 2,"Equal priority replacement")
	for i: int in 2: Math.end_activation(s.hero)
	check(s.hero.statuses.is_empty(),"Owner activation expiry")
	s = locked("skill.fortify")
	var shield: int = Math.preview(s.battle.locked_inputs,s.battle.hand,catalog).amount
	s = apply(s,"commit")
	check(s.hero.shield == shield and s.hero.statuses[0].remaining_activations == 1 and s.hero.cooldowns.has("skill.fortify"),"Shield/cooldown skip casting boundary")
	s = apply(s,"enemy_action","skill.enemy_strike","hero")
	check(s.hero.shield == maxi(0,shield - 5) and s.hero.current[0] == 30,"Shield absorbs strike")
	reject(s,command(s,"select_skill","skill.fortify","hero"),"Cooldown")
	s = apply(s,"pass")
	check(s.hero.shield == 0 and not s.hero.cooldowns.has("skill.fortify"),"Shield/cooldown expire next boundary")
	check(s.hero.statuses[0].remaining_activations == 2,"External debuff ticks next owner ending")
	var maximum := s.hero.maximum.duplicate()
	s.hero.maximum[1] = 1
	Math.end_activation(s.hero)
	check(s.hero.current[1] == 1,"Max decrease clamps")
	s.hero.maximum = maximum
	check(s.hero.current[1] == 1,"Max increase no refill")
func _outcomes() -> void:
	var s := locked()
	s.exploration = Exploration.new()
	s.battle.pending_gold = 5
	s.battle.enemies[0].current[0] = 1
	s = apply(s,"commit")
	check(s.battle.outcome == "victory" and s.exploration.pending_gold == 5 and s.hero.committed_gold == 0,"Rewards pending")
	reject(s,command(s,"commit"),"Finished battle no duplicate reward")
	s = locked()
	s.exploration = Exploration.new()
	s.exploration.pending_gold = 20
	s.battle.enemies[0].current[0] = 1
	var poison := StatusDef.new()
	poison.id = "status.poison"
	poison.effect = "periodic_damage"
	Math.apply_status(s.hero,poison,"enemy.0",100,1,"enemy.0")
	s.hero.current[1] = 0
	s = apply(s,"commit")
	check(s.battle.outcome == "defeat" and s.hero.current[0] == 0 and s.hero.current[1] == 0 and s.exploration.pending_gold == 0,"Periodic simultaneous defeat precedes reward/regen")
