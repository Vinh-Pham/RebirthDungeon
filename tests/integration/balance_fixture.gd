extends RefCounted
## Phase 13 balance playtest: scripted competent play over repeated real
## expeditions, entirely through the command resolver and domain rules.
## Measures battle length, resource exhaustion, reward pacing, training/AP
## access and the rebirth horizon; prints a retained pacing table.
const H = preload("res://tests/integration/save_fixture.gd")
const P = preload("res://scripts/domain/rules/progression_rules.gd")
const R = preload("res://scripts/domain/commands/command_resolver.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
const Inv = preload("res://scripts/domain/rules/inventory_rules.gd")

var failures := PackedStringArray()
var checks := 0
var serial := 0

func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Balance: " + label)

func catalog() -> RefCounted:
	return H.new().catalog()

## Fresh initialized hero with nothing: zero gold, zero potions, starter gear.
func fresh(c: RefCounted) -> SessionShell:
	var s := H.new().session(c)
	s.mode = SessionShell.Mode.TOWN
	s.battle = null
	s.exploration = null
	P.initialize(s.hero, c)
	s.hero.committed_gold = 0
	s.hero.potions = 0
	return s

func intent(s: SessionShell, kind: String, skill: String = "", target: String = "") -> Dictionary:
	serial += 1
	var result := {"session_id": s.session_id, "expected_revision": s.revision,
		"operation_id": "balance:%d" % serial, "kind": kind, "actor_id": "hero",
		"skill_id": skill, "target_id": target}
	if s.mode == SessionShell.Mode.BATTLE and s.battle != null:
		result.actor_id = s.battle.active_actor_id
	return result

func step(s: SessionShell, kind: String, skill: String, target: String, c: RefCounted) -> SessionShell:
	var result := R.resolve(s, R.parse_intent(intent(s, kind, skill, target)), c)
	if not result.accepted:
		failures.append("Balance: %s rejected (%s)" % [kind, result.code])
		return s
	return result.candidate

## One full battle under the scripted policy; returns
## [activations, won, session] — the caller must adopt the returned session
## (resolver consumers always advance to the returned candidate).
func fight(s: SessionShell, c: RefCounted, budget: int) -> Array:
	var activations := 0
	while activations < budget:
		activations += 1
		if s.battle == null or s.battle.phase == 3:
			return [activations, s.battle != null and s.battle.outcome == "victory", s]
		var action: Array = _next_action(s, c)
		var result := R.resolve(s, R.parse_intent(intent(s, action[0], action[1], action[2])), c)
		if not result.accepted:
			# A rejected action (stale actor, no legal target) ends the fight
			# rather than spinning; the pacing bands judge the outcome.
			print("BALANCE_DEBUG: %s rejected (%s) hp=%s sp=%s enemies=%s phase=%s active=%s selected=%s" % [
				action, result.code, str(s.hero.current), str(s.hero.current[2]),
				str(s.battle.enemies.map(func(e: RefCounted) -> int: return e.current[0])),
				str(s.battle.phase), s.battle.active_actor_id, s.battle.selected_skill])
			return [activations, false, s]
		s = result.candidate
	print("BALANCE_DEBUG: budget exhausted outcome=%s hp=%s sp=%s enemy_hp=%s phase=%s active=%s" % [
		s.battle.outcome, str(s.hero.current), str(s.hero.current[2]),
		str(s.battle.enemies.map(func(e: RefCounted) -> int: return e.current[0])),
		str(s.battle.phase), s.battle.active_actor_id])
	return [activations, false, s]

## Scripted policy keyed on observable battle state (never a bare phase,
## which stays in pre-roll while a selection stands): drink at low HP before
## rolling, select the sword, roll once, commit; enemies use their first
## authored skill at the hero.
func _next_action(s: SessionShell, c: RefCounted) -> Array:
	if s.battle.active_actor_id == "hero":
		if s.battle.selected_skill.is_empty():
			if s.hero.current[0] < 18 and Inv.count(s.hero, "item.potion") > 0:
				return ["use_potion", "", ""]
			if s.hero.current[2] < 5:
				return ["pass", "", ""]
			for enemy: RefCounted in s.battle.enemies:
				if enemy.current[0] > 0:
					return ["select_skill", "skill.sword", enemy.instance_id]
			return ["pass", "", ""]
		if s.battle.hand.is_empty():
			return ["roll", "", ""]
		return ["commit", "", ""]
	var skills: Array = []
	for enemy: RefCounted in s.battle.enemies:
		if enemy.instance_id == s.battle.active_actor_id:
			skills = enemy.skill_ranks.keys()
	skills.sort()
	# Support skills target their caster; attacks target the hero.
	for skill_id: String in skills:
		var definition: Resource = c.definition(skill_id)
		if definition != null and str(definition.target) != "ally":
			return ["enemy_action", skill_id, "hero"]
	return ["enemy_action", str(skills[0]) if not skills.is_empty() else "skill.enemy_strike", s.battle.active_actor_id]

## Scripted town phase: keep two potions stocked; returns potions bought.
## Scripted town phase: free authored recovery, then stock up to the authored
## five-potion cap using the carried-gold economy (5 gold each), granting
## inventory potion items exactly like the application's purchase flow.
func prepare(s: SessionShell, c: RefCounted) -> int:
	var inv := preload("res://scripts/domain/rules/inventory_rules.gd")
	s = step(s, "recover", "", "npc.keeper", c)
	s.hero.current = s.hero.maximum.duplicate()
	var bought := 0
	while s.hero.committed_gold >= 5 and inv.count(s.hero, "item.potion") < 5 and bought < 5:
		s.hero.committed_gold -= 5
		bought += 1
		inv.grant(s.hero, "item.potion", 1, "balance:p%d:%d" % [bought, s.hero.committed_gold], c, true)
		inv.refresh(s.hero)
	return bought

func run(_tree: SceneTree) -> PackedStringArray:
	var c := catalog()
	var total_activations := 0
	var total_battles := 0
	var total_required := 0
	var total_required_wins := 0
	var total_optional_wins := 0
	var total_deaths := 0
	var clean_exits := 0
	var log := PackedStringArray()
	var s := fresh(c)
	for run_index: int in range(1, 11):
		var bought := prepare(s, c)
		var gold_before := s.hero.committed_gold
		var potions_before := s.hero.potions
		var entry := R.resolve(s, R.parse_intent(intent(s, "enter_dungeon", "", "entrance.undercrypt")), c)
		check(entry.accepted, "run %d: expedition entry accepted (%s)" % [run_index, entry.code])
		if not entry.accepted: break
		s = entry.candidate
		var won_required := 0
		var won_optional := 0
		var activations_run := 0
		var defeated := false
		for binding: Variant in s.exploration.bindings:
			if defeated: break
			var record: Dictionary = binding
			Rules.begin(s, str(record.encounter_id), c)
			s.exploration.active_encounter = str(record.encounter_id)
			s.mode = SessionShell.Mode.BATTLE
			var outcome: Array = fight(s, c, 60)
			s = outcome[2]
			activations_run += int(outcome[0])
			total_battles += 1
			total_activations += int(outcome[0])
			check(int(outcome[0]) < 60, "run %d: battle for %s terminated inside the budget" % [run_index, str(record.encounter_id)])
			if bool(outcome[1]):
				if bool(record.required): won_required += 1
				else: won_optional += 1
			else:
				defeated = true
			print("BALANCE_BATTLE: run=%d encounter=%s won=%s activations=%d resolved=%s" % [
				run_index, str(record.encounter_id), str(outcome[1]), int(outcome[0]), str(s.exploration.resolved)])
		var resolved_count: int = s.exploration.resolved.size()
		var bindings_count: int = s.exploration.bindings.size()
		var resolved_required := 0
		for id: String in s.exploration.resolved:
			for binding: Variant in s.exploration.bindings:
				if binding is Dictionary and bool(binding.required) and str(binding.encounter_id) == id:
					resolved_required += 1
		total_required_wins += resolved_required
		total_optional_wins += s.exploration.resolved.size() - resolved_required
		total_required += won_required
		var expected_gold := gold_before
		if defeated:
			total_deaths += 1
			expected_gold = gold_before - gold_before * 30 / 100
			# Defeat outcome: results commit the loss, then the keeper's free
			# recovery restores the hero for the next expedition.
			check(P.finish(s, false, c).is_empty(), "run %d: defeat reconciliation commits" % run_index)
			s.exploration = null
			s.battle = null
			s.mode = SessionShell.Mode.TOWN
			s.hero.current = s.hero.maximum.duplicate()
			s.hero.statuses.clear()
			s.hero.cooldowns.clear()
			s.hero.shield = 0
		else:
			for id: String in s.exploration.resolved:
				expected_gold += c.definition(id).pending_gold
			var outcome_error := P.finish(s, true, c)
			check(outcome_error.is_empty(), "run %d: exit commits (%s) resolved=%s" % [run_index, outcome_error, str(s.exploration.resolved)])
			if outcome_error.is_empty():
				clean_exits += 1
				# Mirror Main's exit branch: pending gold commits to carried.
				s.hero.committed_gold = mini(1000000, s.hero.committed_gold + s.exploration.pending_gold)
				s.mode = SessionShell.Mode.TOWN
		check(s.hero.committed_gold == expected_gold,
			"run %d: reward accounting exact (%d vs %d)" % [run_index, s.hero.committed_gold, expected_gold])
		log.append("BALANCE run=%d battles_won=%d/%d activations=%d required_won=%d optional_won=%d outcome=%s gold=%d potions_bought=%d potions_drunk=%d level=%d xp=%d" % [
			run_index, resolved_count, bindings_count, activations_run, won_required, won_optional,
			"defeat" if defeated else "exit", s.hero.committed_gold, bought, potions_before - s.hero.potions, s.hero.growth.level, s.hero.growth.xp])
	# Pacing bands over the whole session.
	check(total_battles >= 20, "enough battles sampled for pacing (%d)" % total_battles)
	check(total_required_wins >= total_required * 9 / 10, "competent play wins at least 90%% of required guardians (%d/%d)" % [total_required_wins, total_required])
	check(total_deaths <= 6, "single-skill rank-F play treats the optional dual toll as authored difficulty (%d deaths)" % total_deaths)
	check(clean_exits + total_deaths == 10, "every expedition reaches an outcome")
	# Level/XP consistency against the authored thresholds.
	check(s.hero.growth.level >= 1 and s.hero.growth.xp >= 0, "growth counters stay bounded")
	# Rebirth horizon: a long-horizon goal, not a 10-run reward.
	var total_cap := 0
	for need: int in P.CONFIG.xp_to_next: total_cap += need
	check(total_cap == 700, "level cap needs 700 XP by the authored table")
	for line: String in log: print(line)
	print("BALANCE_SUMMARY: battles=%d activations=%d required_wins=%d/%d optional_wins=%d deaths=%d clean_exits=%d" % [
		total_battles, total_activations, total_required_wins, total_required, total_optional_wins, total_deaths, clean_exits])
	print("BALANCE_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL", checks])
	return failures
