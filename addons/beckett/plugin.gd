@tool
extends EditorPlugin

## Beckett (MCP for Godot) — EditorPlugin entry point.
## Wires up the embedded MCP server (zero-sidecar) and an optional dock panel.
## The server is OFF by default; it starts only when BECKETT_ENABLE=1 (or via the panel).

const MCPServerScript := preload("res://addons/beckett/core/mcp_server.gd")
const PanelScript := preload("res://addons/beckett/panel/panel.gd")
const MCPClientConfig := preload("res://addons/beckett/core/client_config.gd")
const ExportFilterScript := preload("res://addons/beckett/core/export_filter.gd")
const BreakWatchScript := preload("res://addons/beckett/core/break_watch.gd")

const RUNTIME_AUTOLOAD := "BeckettRuntime"
## A parse-safe stub, NOT the implementation. It is the one Beckett file that reaches a
## shipped game, so it names no engine class that a custom build profile could strip and
## it goes inert outside the editor. See runtime/beckett_autoload.gd for the full why.
const RUNTIME_SCRIPT := "res://addons/beckett/runtime/beckett_autoload.gd"
## What the autoload pointed at before the stub existed; projects set up then get re-pointed.
const LEGACY_RUNTIME_SCRIPT := "res://addons/beckett/runtime/mcp_runtime.gd"

## Serving waits for the editor to settle: the first filesystem scan finished, then this many
## quiet frames. A process that quits first (`godot --headless --import`, `--quit`) never gets
## there. See _settle_tick.
const SETTLE_FRAMES := 5
## A scanner that never goes quiet must not keep the server down for good.
const SETTLE_MAX_MS := 30000

var _settle_left := SETTLE_FRAMES
var _settle_t0 := 0
var _server: MCPServerScript = null
var _panel: Control = null
var _dock: Control = null
var _export_filter: EditorExportPlugin = null
var _break_watch: EditorDebuggerPlugin = null


func _enter_tree() -> void:
	_export_filter = ExportFilterScript.new()
	add_export_plugin(_export_filter)

	var one_shot := one_shot_flag(OS.get_cmdline_args())
	if not one_shot.is_empty():
		print("[beckett] one-shot run (%s): no server, no client configs, no dock; only the export filter is active" % one_shot)
		_repoint_legacy_autoload()
		return

	_install_runtime_autoload()

	_server = MCPServerScript.new()
	_server.name = "GodotMCPServer"
	_server.plugin = self
	add_child(_server)
	_server.setup()

	if ClassDB.class_exists("EditorDebuggerPlugin") and ClassDB.can_instantiate("EditorDebuggerPlugin"):
		_break_watch = BreakWatchScript.new()
		add_debugger_plugin(_break_watch)
		_server.bridge.break_watch = _break_watch

	_settle_left = SETTLE_FRAMES
	_settle_t0 = Time.get_ticks_msec()
	get_tree().process_frame.connect(_settle_tick)

	_panel = PanelScript.new()
	_panel.server = _server
	_panel.plugin = self
	_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_dock = ScrollContainer.new()
	_dock.name = "Beckett"
	_dock.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_dock.add_child(_panel)
	add_control_to_dock(EditorPlugin.DOCK_SLOT_RIGHT_UL, _dock)
	_reveal_dock_once()


## Why serving waits. `godot --headless --import`, `--quit` and `--build-solutions --quit` boot
## this editor, do their job and exit. The engine consumes those flags (main.cpp never forwards
## them to OS.get_cmdline_args(); read on 4.4.1, 4.6.2, 4.7 and master), so no flag check can
## see them. What they share is that the process is gone at the end of the iteration in which the
## first filesystem scan completes, so an editor that has outlived the scan by a few frames is
## one somebody is going to work in. Serving from _enter_tree instead made such a child walk to
## the next free port, rewrite res://.beckett/port and the .mcp.json entry to it, and leave both
## pointing at a port that died with the child (reproduced live with `--import` while an editor
## was serving the project: 8790 -> 8792).
func _settle_tick() -> void:
	var fs := EditorInterface.get_resource_filesystem()
	_settle_left = settle_left(_settle_left, fs != null and fs.is_scanning(), Time.get_ticks_msec() - _settle_t0)
	if _settle_left > 0:
		return
	get_tree().process_frame.disconnect(_settle_tick)
	_start_serving()


## One tick of the wait: how many frames are still to go. A scanning editor restarts the count,
## every quiet frame takes one off, and after SETTLE_MAX_MS it is 0 whatever the scanner is
## doing. Pure, so the unit suite can pin it.
static func settle_left(left: int, scanning: bool, waited_ms: int) -> int:
	if waited_ms >= SETTLE_MAX_MS:
		return 0
	if scanning:
		return SETTLE_FRAMES
	return maxi(0, left - 1)


## The part of start-up that touches shared state: the listener, res://.beckett/port and the
## client configs. Runs once the editor has settled (see _settle_tick).
func _start_serving() -> void:
	if not is_instance_valid(_server):
		return
	var port := _port()
	var served := true
	if _autostart() and not _server.is_running():
		served = _server.start_server(port, MCPServerScript.port_is_strict()) == OK
		if served:
			print("[beckett] server listening on " + MCPClientConfig.mcp_url(_server.http.port, _server.auth_token())
				+ (" (token auth on)" if _server.auth_enabled() else ""))

	if _auto_write_config() and served:
		var wrote: Array = MCPClientConfig.ensure_auto(_server.http.port if _server.is_running() else port, _server.auth_token())
		for r in wrote:
			if not bool(r.get("ok", false)):
				push_warning("[beckett] %s config not written: %s" % [str(r.get("name", "?")), str(r.get("error", "unknown error"))])
			elif r.has("warning"):
				push_warning("[beckett] %s config: %s" % [str(r.get("name", "?")), str(r["warning"])])


## First time the plugin is enabled in a project, bring our dock tab to the front so it's
## discoverable. The editor's right dock can overflow, hiding a 4th tab (ours) behind the
## tab-scroll arrows — and on Godot 4.2-4.4 a control renamed *after* add_control_to_dock
## keeps a blank tab title, so without this the tab is effectively invisible. Gated by a
## project flag so we reveal once (first enable / first launch after update) and never
## fight the user's chosen layout afterward.
func _reveal_dock_once() -> void:
	if bool(ProjectSettings.get_setting("beckett/dock_revealed", false)):
		return
	ProjectSettings.set_setting("beckett/dock_revealed", true)
	ProjectSettings.save()
	get_tree().create_timer(0.7).timeout.connect(_bring_dock_to_front)


func _bring_dock_to_front() -> void:
	if not is_instance_valid(_dock):
		return
	var p: Node = _dock.get_parent()
	while p != null and not (p is TabContainer):
		p = p.get_parent()
	if p is TabContainer:
		var idx := _dock.get_index()
		if idx >= 0:
			(p as TabContainer).current_tab = idx


func _exit_tree() -> void:
	var tree := get_tree()
	if tree != null and tree.process_frame.is_connected(_settle_tick):
		tree.process_frame.disconnect(_settle_tick)
	if is_instance_valid(_dock):
		remove_control_from_docks(_dock)
		_dock.free()
	_dock = null
	_panel = null
	if is_instance_valid(_server):
		if _server.bridge != null:
			_server.bridge.break_watch = null
		_server.stop_server()
		_server.queue_free()
	_server = null
	if _break_watch != null:
		remove_debugger_plugin(_break_watch)
	_break_watch = null
	if _export_filter != null:
		remove_export_plugin(_export_filter)
	_export_filter = null
	if ProjectSettings.has_setting("autoload/" + RUNTIME_AUTOLOAD):
		remove_autoload_singleton(RUNTIME_AUTOLOAD)


## Register the runtime autoload, or re-point an older one at the stub.
##
## Projects set up before the stub existed have the autoload aimed straight at
## mcp_runtime.gd. That file names Camera3D, MeshInstance3D, ShaderMaterial, GraphEdit and
## friends at parse time, so on an engine built with a stripped class profile it fails to
## parse and the player sees the errors at boot. Re-pointing is the whole upgrade.
func _install_runtime_autoload() -> void:
	if not ProjectSettings.has_setting("autoload/" + RUNTIME_AUTOLOAD):
		add_autoload_singleton(RUNTIME_AUTOLOAD, RUNTIME_SCRIPT)
		return
	if not _repoint_legacy_autoload():
		return
	var err := ProjectSettings.save()
	if err != OK:
		push_warning("[beckett] could not save project.godot after re-pointing the runtime autoload: %s" % error_string(err))
		return
	print("[beckett] runtime autoload re-pointed at the export-safe stub (%s)" % RUNTIME_SCRIPT)


## The in-memory half of the upgrade above: if the autoload still names the legacy
## implementation, aim it at the stub. True when it did. Saving is the caller's call, because
## an export run needs the new target in the settings it serializes but must not rewrite the
## user's project.godot.
func _repoint_legacy_autoload() -> bool:
	var key := "autoload/" + RUNTIME_AUTOLOAD
	if not ProjectSettings.has_setting(key):
		return false
	if _autoload_target(str(ProjectSettings.get_setting(key, ""))) != LEGACY_RUNTIME_SCRIPT:
		return false
	remove_autoload_singleton(RUNTIME_AUTOLOAD)
	add_autoload_singleton(RUNTIME_AUTOLOAD, RUNTIME_SCRIPT)
	return true


## The command-line modes, other than the --export-* family, that boot the editor to do one job
## and quit. Read off `godot --help` ("Standalone tools", tagged E for editor) on 4.4.1 and
## 4.7; every flag is in both except --dump-gdextension-interface-json, which is 4.7+ and
## harmless to name on an engine that lacks it. --check-only / --script are not here: they
## never create the editor, so no plugin loads.
##
## Whether a flag can be SEEN here is a separate question, answered by the engine's main.cpp
## (4.4.1, 4.6.2, 4.7 and master agree): it pushes --doctool, --dump-*, --validate-extension-api,
## --convert-3to4 and --validate-conversion-3to4 into OS.get_cmdline_args(), but swallows
## --import and --build-solutions (and --quit) without forwarding them, and `godot --path P
## --import` reads exactly like `godot --path P --editor`. Those two stay in the table because
## the help lists them and a later engine may forward them; today they match nothing, and the
## settle wait (_settle_tick) is what keeps such a child from serving. Of the forwarded ones only
## --export-* goes on to create the editor at all (the rest exit before it), so for them this is
## belt and braces.
const ONE_SHOT_FLAGS := [
	"--import",
	"--doctool",
	"--dump-extension-api",
	"--dump-extension-api-with-docs",
	"--dump-gdextension-interface",
	"--dump-gdextension-interface-json",
	"--validate-extension-api",
	"--convert-3to4",
	"--validate-conversion-3to4",
	"--build-solutions",
]


## The engine flag that makes this a ONE-SHOT run, "" when it is a normal editor session. A
## one-shot run is a process started to do a single job and exit instead of being worked in:
## an export (`--export-release`, `--export-debug`, `--export-pack`, `--export-patch`, i.e.
## any flag that begins with "--export-") or one of ONE_SHOT_FLAGS. Booting the editor loads
## every enabled plugin this one included, so the child would otherwise start its own server
## beside the one the human is using and repoint the port file and .mcp.json at a port that dies
## with it. Takes the arguments instead of reading them so the unit suite can pin it without
## launching a second engine. `--headless --editor` is NOT one-shot: it is how tests and CI serve
## a project. Only flags the engine forwards can be matched (see ONE_SHOT_FLAGS).
static func one_shot_flag(args: PackedStringArray) -> String:
	for a in args:
		if a.begins_with("--export-") or ONE_SHOT_FLAGS.has(a):
			return a
	return ""


static func is_one_shot_run(args: PackedStringArray) -> bool:
	return one_shot_flag(args) != ""


## Resolve an [autoload] entry's value to a res:// path.
##
## Two things make a plain string compare wrong: the value carries a leading "*" when the
## autoload is exposed as a singleton, and since 4.4 the editor writes the target as a
## uid:// reference rather than a path, so the stored value for mcp_runtime.gd can read
## "*uid://dspgi2nxto4e8" with the path nowhere in sight.
static func _autoload_target(value: String) -> String:
	var p := value.trim_prefix("*")
	if not p.begins_with("uid://"):
		return p
	var id := ResourceUID.text_to_id(p)
	if id == ResourceUID.INVALID_ID or not ResourceUID.has_id(id):
		return p
	return ResourceUID.get_id_path(id)


## The port we ask for at boot. Shared with the dock (MCPClientConfig.configured_port) so a
## manual Stop→Start can never bind a different port than this did.
func _port() -> int:
	return MCPClientConfig.configured_port()


func _autostart() -> bool:
	var env := OS.get_environment("BECKETT_ENABLE")
	if env != "":
		return env == "1" or env.to_lower() == "true"
	return bool(ProjectSettings.get_setting("beckett/autostart", true))


func _auto_write_config() -> bool:
	var env := OS.get_environment("BECKETT_AUTO_CONFIG")
	if env != "":
		return env == "1" or env.to_lower() == "true"
	return bool(ProjectSettings.get_setting("beckett/auto_write_client_config", true))
