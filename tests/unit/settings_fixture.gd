extends RefCounted
## Phase 12: persisted presentation settings, audio buses and key rebinding.
const Settings = preload("res://scripts/services/settings_service.gd")
const InputShell = preload("res://scripts/application/shell_input_map.gd")

var failures := PackedStringArray()
var checks := 0
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append("Settings: " + label)

func path() -> String:
	return "user://phase12-tests.cfg"

func run() -> PackedStringArray:
	InputShell.configure()
	var defaults := Settings.new()
	check(defaults.master_volume == 0.8 and defaults.music_volume == 0.7 and defaults.sfx_volume == 0.9, "default audio levels")
	check(not defaults.reduced_motion and defaults.text_scale == 1.0, "default accessibility values")
	var default_left: PackedInt64Array = defaults.bindings["move_left"]
	check(default_left.has(65) and default_left.has(4194319), "default movement keys keep WASD and arrows")

	# Round trip: every persisted field survives the file.
	var file := path()
	var written := Settings.new()
	written.master_volume = 0.25
	written.music_volume = 0.5
	written.sfx_volume = 1.0
	written.reduced_motion = true
	written.set_text_scale(1.3)
	written.set_binding_key("shell_back", 88)  # X joins Escape
	check(written.save_settings(file), "settings save reports success")
	var loaded := Settings.new()
	check(loaded.load_settings(file), "settings load reports success")
	check(absf(loaded.master_volume - 0.25) < 0.001 and absf(loaded.sfx_volume - 1.0) < 0.001, "audio levels round-trip")
	check(loaded.reduced_motion and loaded.text_scale == 1.3, "accessibility values round-trip")
	var back_keys: PackedInt64Array = loaded.bindings["shell_back"]
	check(back_keys.has(4194305) and back_keys.has(88), "rebinding keeps the old key and adds the new one")
	check(loaded.bindings["move_up"] == defaults.bindings["move_up"], "unmodified actions keep their defaults")

	# Corrupt files fall back to defaults.
	# Corrupt values fall back to defaults: ConfigFile tolerates malformed
	# text, so every read validates type and range before adopting a value.
	var corrupt := FileAccess.open(file, FileAccess.WRITE)
	corrupt.store_string("[audio]\n\nmaster_volume=\"oops\"\nmusic_volume=-3\n\n[accessibility]\n\nreduced_motion=\"yes\"\ntext_scale=-5.0\n\n[input]\n\nmove_left=[0, -7, \"x\"]\n")
	corrupt.close()
	var recovered := Settings.new()
	check(recovered.load_settings(file), "corrupt values still load via per-field fallback")
	check(recovered.master_volume == 0.8 and recovered.music_volume == 0.7, "corrupt audio values fall back to defaults")
	check(not recovered.reduced_motion and recovered.text_scale == 1.0, "corrupt accessibility values fall back to defaults")
	check(recovered.bindings["move_left"] == defaults.bindings["move_left"], "corrupt bindings fall back to defaults")
	check(recovered.master_volume == 0.8 and not recovered.reduced_motion, "corrupt settings fall back to defaults")

	# Text scale bounds: the battle-view maximum stays continuous.
	var bounded := Settings.new()
	bounded.set_text_scale(1.4)
	check(bounded.text_scale == 1.4, "text scale keeps the battle-view maximum")
	bounded.set_text_scale(2.0)
	check(bounded.text_scale == 1.4, "text scale clamps above the authored maximum")
	var stored := Settings.new()
	stored.set_text_scale(1.3)
	stored.save_settings(file)
	var reread := Settings.new()
	reread.load_settings(file)
	check(reread.text_scale == 1.3, "authored text options round-trip exactly")

	# AudioServer application: bus volumes follow the service.
	var audio := Settings.new()
	audio.master_volume = 0.5
	audio.music_volume = 0.0
	audio.apply_audio()
	var master := AudioServer.get_bus_index("Master")
	var music := AudioServer.get_bus_index("Music")
	var sfx := AudioServer.get_bus_index("SFX")
	check(master >= 0 and sfx >= 0 and music >= 0, "Music and SFX buses exist in the layout")
	if master >= 0:
		check(absf(AudioServer.get_bus_volume_db(master) - linear_to_db(0.5)) < 0.01, "master volume applies to the bus")
	if music >= 0:
		check(AudioServer.is_bus_mute(music), "zero music volume mutes the bus")
	audio.master_volume = 0.8
	audio.music_volume = 0.7
	audio.sfx_volume = 0.9
	audio.apply_audio()

	# InputMap application: listed keys are replaced, joystick events survive.
	var rebound := Settings.new()
	rebound.set_binding_key("move_left", 88)
	rebound.apply_bindings()
	var seen := {}
	for event: InputEvent in InputMap.action_get_events("move_left"):
		if event is InputEventKey: seen[(event as InputEventKey).physical_keycode] = true
	check(seen.has(88) and seen.has(65) and seen.has(4194319), "rebinding adds the new key beside the authored ones")
	var joy := false
	for event: InputEvent in InputMap.action_get_events("shell_back"):
		if event is InputEventJoypadButton: joy = true
	check(joy, "joystick bindings survive key remapping")
	rebound.reset_bindings()
	rebound.apply_bindings()
	var restored := {}
	for event: InputEvent in InputMap.action_get_events("move_left"):
		if event is InputEventKey: restored[(event as InputEventKey).physical_keycode] = true
	check(restored.has(65) and restored.has(4194319) and not restored.has(88), "reset restores the default keys")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(file))
	print("SETTINGS_FIXTURE: %s (%d checks)" % ["PASS" if failures.is_empty() else "FAIL", checks])
	return failures
