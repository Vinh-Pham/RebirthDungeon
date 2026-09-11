extends RefCounted
## Main scene/layout fixture retained from Phase 0 and extended for the shell.

func run(tree: SceneTree, break_layout: bool = false) -> PackedStringArray:
	var failures := PackedStringArray()
	var packed := load(ProjectSettings.get_setting("application/run/main_scene", "")) as PackedScene
	if packed == null:
		return PackedStringArray(["Configured main scene must load"])
	var viewport := SubViewport.new()
	viewport.size = Vector2i(1280, 720)
	tree.root.add_child(viewport)
	var main := packed.instantiate() as DungeonApplication
	viewport.add_child(main)
	for frame: int in 3:
		await tree.process_frame
	var ui := main.get_node("UI/UIHost") as Control
	if break_layout:
		ui.anchor_right = 0.0
	for dimensions: Vector2i in [Vector2i(1280, 720), Vector2i(960, 540), Vector2i(1560, 720)]:
		viewport.size = dimensions
		for frame: int in 3:
			await tree.process_frame
		if not ui.size.is_equal_approx(Vector2(dimensions)):
			failures.append("Shell must fill viewport %s; got %s" % [dimensions, ui.size])
		var heading := ui.get_node("Layout/ModeHost/ModeView/Heading") as Label
		if heading.text.is_empty() or not Rect2(Vector2.ZERO, Vector2(dimensions)).encloses(heading.get_global_rect()):
			failures.append("Shell heading must be visible at %s" % dimensions)
	viewport.queue_free()
	await tree.process_frame
	return failures
