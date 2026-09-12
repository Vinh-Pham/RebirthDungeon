extends RefCounted
const Capture = preload("res://scripts/domain/state/combat_checkpoint.gd")
const Rules = preload("res://scripts/domain/rules/battle_rules.gd")
var failures := PackedStringArray()
var checks: int = 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label)
func frames(tree: SceneTree, count: int = 4) -> void:
	for i: int in count: await tree.process_frame
func setup(tree: SceneTree, dimensions: Vector2i) -> Dictionary:
	var viewport := SubViewport.new()
	viewport.size = dimensions
	viewport.world_2d = World2D.new()
	tree.root.add_child(viewport)
	var main := load("res://scenes/main.tscn").instantiate() as DungeonApplication
	main.progression_enabled = false # Preserve the pre-progression contract fixture.
	main.persistence_enabled = false
	viewport.add_child(main)
	await frames(tree,6)
	main.request_mode(SessionShell.Mode.LOADING,1,main._session.revision)
	await frames(tree,6)
	main.request_mode(SessionShell.Mode.DUNGEON,1,main._session.revision)
	await frames(tree,6)
	Rules.begin(main._session,"encounter.training",main._catalog)
	main._session.exploration.active_encounter = "encounter.training"
	main._encounter_authorized = true
	main.request_mode(SessionShell.Mode.BATTLE,1,main._session.revision)
	main._encounter_authorized = false
	await frames(tree,8)
	return {"viewport":viewport,"main":main,"view":main._battle_view}
func touch(viewport: SubViewport, index: int, point: Vector2, pressed: bool) -> void:
	var event := InputEventScreenTouch.new()
	event.index = index
	event.position = point
	event.pressed = pressed
	viewport.push_input(event,true)
func run(tree: SceneTree) -> PackedStringArray:
	var environment := await setup(tree,Vector2i(960,540))
	var main: DungeonApplication = environment.main
	var view: Control = environment.view
	var viewport: SubViewport = environment.viewport
	check(view.flow.current == "Selection" and view.actions.roll.disabled,"Selection gates roll")
	var dice_ids: Array = []
	for die: Button in view.dice: dice_ids.append(die.get_instance_id())
	view.choose_skill("skill.sword")
	view.choose_skill("skill.sword")
	await frames(tree)
	var revision: int = main._session.revision
	check(main._session.battle.selected_skill == "skill.sword","Skill selected")
	check(main._battle_view == view and not view.actions.roll.disabled,"Persistent view enables legal roll")
	var focus_before := Capture.capture(main._session)
	view.send_action("roll")
	main.set_application_focused(false)
	await frames(tree)
	main.set_application_focused(true)
	check(not view._request_pending and Capture.capture(main._session) == focus_before,"Focus-loss rejection releases the deferred input latch")
	var before := Capture.capture(main._session)
	main.set_next_checkpoint_test("pending")
	view.send_action("roll")
	view.send_action("roll")
	await frames(tree)
	check(Capture.capture(main._session) == before,"Pending candidate not published by repeated roll")
	check(view.flow.current == "Saving" and view.actions.commit.disabled and view.dice[0].disabled,"Saving permits inspection only")
	var candidate := Capture.capture(main.checkpoint.pending.candidate)
	check(main.checkpoint.pending.candidate.battle.hand.size() == 5,"One five-die candidate")
	check(not main.complete_checkpoint_test(99,revision,true),"Stale save rejected")
	check(main.complete_checkpoint_test(1,revision,false),"Current simulated failure")
	await frames(tree)
	check(view.flow.current == "SaveFailed" and view.actions.retry.visible,"Failure exposes Retry")
	check(not main.request_mode(SessionShell.Mode.RESULTS,1,revision),"Pending blocks transition")
	view.actions.retry.pressed.emit()
	await frames(tree)
	check(Capture.capture(main._session) == candidate,"Retry publishes exact state/RNG")
	check(not main.complete_checkpoint_test(1,revision,true),"Old callback cannot republish")
	check(view.flow.current == "Locked" and not view.dice[0].disabled,"Accepted result drives locked chart")
	view.flow.chart.send_event("show_Outcome")
	check(view.flow.current == "Locked","Chart guard rejects a phase not authorized by an observation")
	for i: int in 5: check(view.dice[i].get_instance_id() == dice_ids[i],"Stable die " + str(i))
	var host: Node = view.stage.camera.get_node("PhantomCameraHost")
	var host_id: int = host.get_instance_id()
	await frames(tree,10)
	check(host.get_active_pcam() == view.stage.detail and view.stage.detail.priority == 30,"Battle camera priority")
	view.dice[2].grab_focus()
	view.open_details()
	check(view._modal and viewport.gui_get_focus_owner() == view._close,"Modal focus")
	await frames(tree)
	var page_key := InputEventKey.new()
	page_key.keycode = KEY_PAGEDOWN
	page_key.pressed = true
	viewport.push_input(page_key,true)
	page_key.pressed = false
	viewport.push_input(page_key,true)
	await frames(tree)
	check(view._sheet_scroll.scroll_vertical > 0,"Keyboard can read lower inspection details")
	view.scroll_details(-100)
	var page_down: Button = view.find_child("PageDown",true,false)
	page_down.grab_focus()
	var accept := InputEventJoypadButton.new()
	accept.button_index = JOY_BUTTON_A
	accept.pressed = true
	viewport.push_input(accept,true)
	accept.pressed = false
	viewport.push_input(accept,true)
	await frames(tree)
	check(view._sheet_scroll.scroll_vertical > 0,"Controller activates inspection paging")
	var modal_before := Capture.capture(main._session)
	view.send_action("commit")
	touch(viewport,4,Vector2(2,2),true)
	touch(viewport,4,Vector2(940,530),false)
	await frames(tree)
	check(Capture.capture(main._session) == modal_before,"Modal cannot click through")
	view.close_sheet()
	check(viewport.gui_get_focus_owner() == view.dice[2],"Opener focus restored")
	var point: Vector2 = view.dice[0].get_global_rect().get_center()
	touch(viewport,0,point,true)
	var drag := InputEventScreenDrag.new()
	drag.index = 0
	drag.position = point + Vector2(0,-40)
	drag.relative = Vector2(0,-40)
	viewport.push_input(drag,true)
	touch(viewport,0,point,false)
	await frames(tree)
	check(Capture.capture(main._session) == modal_before,"Drag cancels activation")
	touch(viewport,0,point,true)
	touch(viewport,1,view.dice[1].get_global_rect().get_center(),true)
	touch(viewport,0,point,false)
	await frames(tree)
	var touch_revision: int = main._session.revision
	touch(viewport,1,view.dice[1].get_global_rect().get_center(),false)
	await frames(tree)
	check(touch_revision == revision+2 and main._session.revision == touch_revision,"Multi-touch submits once across publication")
	check(main._session.battle.kept[0] and not main._session.battle.kept[1],"Original pointer keeps original die")
	var key := InputEventKey.new()
	key.physical_keycode = KEY_2
	key.pressed = true
	viewport.push_input(key,true)
	key.pressed = false
	viewport.push_input(key,true)
	await frames(tree)
	check(main._session.battle.kept[1],"Keyboard keep shortcut")
	view.dice[0].grab_focus()
	var joy := InputEventJoypadButton.new()
	joy.button_index = JOY_BUTTON_DPAD_RIGHT
	joy.pressed = true
	viewport.push_input(joy,true)
	joy.pressed = false
	viewport.push_input(joy,true)
	await frames(tree)
	check(viewport.gui_get_focus_owner() == view.dice[1],"Controller focus chain")
	var layout_before := Capture.capture(main._session)
	for dimensions: Vector2i in [Vector2i(960,540),Vector2i(1920,1080)]:
		viewport.size = dimensions
		for scale_value: float in [1.0,1.3,1.4]:
			view.set_text_scale(scale_value)
			view.set_safe_insets(Vector4(24,10,24,10))
			await frames(tree,8)
			var usable := Rect2(Vector2(36,22),Vector2(dimensions)-Vector2(72,44))
			for die: Button in view.dice:
				check(usable.encloses(die.get_global_rect()),"Safe die rect %s scale %s" % [dimensions,scale_value])
				check(die.size.x >= 48 and die.size.y >= 48,"48-unit touch target")
			for kind: String in ["roll","reroll","commit","pass"]:
				check(usable.encloses(view.actions[kind].get_global_rect()),"Essential action fits %s scale %s: %s" % [dimensions,scale_value,kind])
			check(view.compact == (dimensions.x == 960),"Adaptive breakpoint")
			view.show_rejection("application_unavailable")
			await frames(tree,2)
			check(usable.encloses(view.actions["pass"].get_global_rect()),"Rejection feedback preserves the compact action area")
			view.present(main.observation(),[])
			view.open_details()
			await frames(tree,2)
			check(usable.encloses(view._close.get_global_rect()),"Sheet Close remains inside safe area")
			view.close_sheet()
	check(Capture.capture(main._session) == layout_before,"Layout changes no domain state")
	view.set_reduced_motion(true)
	var separate_stage: Node = load("res://scenes/battle/stage.tscn").instantiate()
	check(is_equal_approx(separate_stage.get_node("Wide").tween_resource.duration,0.2),"Motion settings do not mutate another stage resource")
	separate_stage.free()
	view.stage.skip_motion()
	await frames(tree)
	check(Capture.capture(main._session) == layout_before,"Skipped motion cosmetic")
	check(not host.get_trigger_pcam_tween(),"Skip finishes the Phantom Camera transition")
	for i: int in 5:
		if not main._session.battle.kept[i]:
			view.send_action("keep",[i])
			await frames(tree)
	check(view.actions.reroll.disabled,"All kept blocks empty reroll")
	view.send_action("reroll")
	await frames(tree)
	check(main._session.battle.rerolls_remaining == 2,"Empty reroll no budget cost")
	var replay_start := Capture.capture(main._session)
	var replay_serial: int = view._serial
	view.send_action("pass")
	view.send_action("pass")
	await frames(tree,8)
	check(main._session.battle.activation == 2,"One paid pass and one enemy response")
	check(view.flow.history.has("Resolved") and view.flow.history.has("Enemy") and view.flow.current == "Selection","Resolved and next actor chart states")
	var replay_end := Capture.capture(main._session)
	main._session = Capture.restore(replay_start,main._catalog)
	main._scheduler._last_token = ""
	var old_ref: WeakRef = weakref(view)
	main._replace_view()
	view = main._battle_view
	await frames(tree,8)
	check(view.flow.current == "Locked","Restored chart locked")
	view._serial = replay_serial
	check(view.reduced_motion and is_equal_approx(view.text_scale,1.4),"Preferences survive scene replacement")
	view.set_reduced_motion(false)
	check(Capture.capture(main._session) == replay_start,"Re-entry no rolls or AI")
	main._battle_intent({"kind":"pass"},old_ref)
	view.send_action("pass")
	await frames(tree,8)
	check(Capture.capture(main._session) == replay_end,"Normal/reduced motion identical result and timing")
	check(host_id != view.stage.camera.get_node("PhantomCameraHost").get_instance_id(),"Fresh camera after replacement")
	main.set_next_checkpoint_test("failure")
	view.choose_skill("skill.sword")
	await frames(tree)
	var failed_candidate := Capture.capture(main.checkpoint.pending.candidate)
	main._replace_view()
	view = main._battle_view
	await frames(tree,8)
	check(view.flow.current == "SaveFailed" and view.actions.retry.visible and view.actions.roll.disabled,"Replaced view reconstructs failure gate")
	main.retry_checkpoint()
	await frames(tree)
	check(Capture.capture(main._session) == failed_candidate,"Re-entry Retry retains same candidate")
	viewport.queue_free()
	await frames(tree,8)
	print("BATTLE_UI_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL",checks])
	return failures
