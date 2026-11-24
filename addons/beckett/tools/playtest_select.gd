@tool
extends RefCounted

## Impact-based suite selection (v1.16, playtest op=run_all since=<git ref>): run only the suites a change
## can reach, and say when it cannot tell. Unity's CLI ships the same pair (`unity test --affected --since
## <ref>` and `--affected-compare`); the compare half is what makes the first one trustworthy, because a
## selection that skips a suite which would have failed is worse than no selection.
##
## Three steps, each a function you can call without a game:
##   changed_files   what git says changed since the ref (tracked changes plus untracked files). The ref
##                   goes to git as ONE argument after the options and before "--". A ref that could be
##                   read as an option, or that holds whitespace, control characters, quotes, backslashes,
##                   "$" or backticks, is refused before git runs: on Linux and macOS Godot's OS.execute
##                   hands the command to sh, which would act on the last four.
##   closure         everything a suite's scene can load: its scene, every resource and script on the
##                   resource dependency list, recursively, and what those scripts name in a preload/load
##                   literal or by class_name. A script has no dependency list of its own in the engine
##                   (ResourceLoader.get_dependencies returns nothing for a .gd), hence the text scan. A
##                   literal that names a folder or the front of a name the script builds ("res://data/jobs/",
##                   "res://levels/lv_%d.tscn") counts as a reference to everything under it: a loop over a
##                   folder is how a data-driven game loads its content, and no list shows it.
##   select          which suites a set of changed files reaches, and WHY for each. A change this cannot
##                   place selects EVERYTHING, with that reason: project.godot; an autoload or anything
##                   an autoload loads; a data file (JSON, CSV, text...) that no resource references,
##                   because a script may read it by path at runtime and a dependency list cannot rule that out.
##                   Docs and tooling files select nothing. A resource or script that no suite loads reaches
##                   no suite.
##
## What it cannot see: a path a script gets without writing its front down (read from a file or a setting,
## or put together from pieces none of which starts with "res://"). That is the gap compare exists to measure:
## run everything, then count the suites selection would have skipped that FAILED.
##
## Full-only like the tool (pack.ps1 trims it from Lite).

const PathGuard := preload("res://addons/beckett/core/path_guard.gd")
const Subprocess := preload("res://addons/beckett/core/subprocess.gd")

const SUITE_DIR := "res://tests/playtests/"
const REF_MAX := 200
## The exit codes git itself gives `rev-parse --is-inside-work-tree`: yes or no, "fatal: not a repository", usage. Any other number
## is not git speaking (whatever this OS calls a program that never ran), so it reads as git missing.
const GIT_EXITS := [0, 128, 129]
const CHANGED_MAX := 4000
const CLOSURE_MAX := 3000
const SCRIPT_MAX := 400000
const SHOWN := 4
const UNREACHED_SHOWN := 10
const PATH_SHOWN := 200

## Files a running game cannot be affected by: docs, tooling, version control and editor housekeeping.
const INERT_DIRS := [".git", ".github", ".gitlab", ".vscode", ".idea", ".vs", ".godot", ".claude", ".beckett"]
const INERT_EXT := ["md", "markdown", "rst", "adoc", "uid", "ps1", "sh", "bat", "cmd"]
const INERT_NAMES := ["license", "licence", "readme", "changelog", "authors", "notice", "codeowners", ".gitignore", ".gitattributes",
	".gitmodules", ".editorconfig", ".gdignore", "export_presets.cfg", "plugin.cfg"]
## What a dependency walk can represent: a scene, a resource, a script, an imported asset. A changed file of
## one of these kinds that no suite's closure holds cannot reach a suite; any OTHER kind is data a script may
## read by path.
const SCENE_EXT := ["tscn", "scn", "tres", "res"]
const SCRIPT_EXT := ["gd", "gdshader", "gdshaderinc", "cs"]
const ASSET_EXT := ["png", "jpg", "jpeg", "webp", "svg", "bmp", "tga", "exr", "hdr", "dds", "ktx", "wav", "ogg", "mp3", "mp4", "webm", "ogv",
	"ttf", "otf", "woff", "woff2", "obj", "glb", "gltf", "fbx", "dae", "blend", "mesh", "material", "anim", "translation", "atlastex"]

static var _re_lit: RegEx = null
static var _re_ident: RegEx = null



## "" when `ref` is safe to hand to git, else why not. A ref that starts with "-" would be an option, and
## whitespace or a control character is never in a ref a person means to name. Quotes and backslashes are
## refused because Windows builds one command line out of the arguments, and `$` and backticks because
## on Linux and macOS the engine builds one command line for sh, putting each argument between double
## quotes that still expand both. git still judges the rest.
static func ref_error(ref: String) -> String:
	if ref.is_empty():
		return "a git ref is needed (a branch, a tag, a commit, HEAD~3 ...)"
	if ref.length() > REF_MAX:
		return "the ref is %d characters long; the limit is %d" % [ref.length(), REF_MAX]
	if ref.begins_with("-"):
		return "a ref must not start with '-': git would read it as an option"
	for i in ref.length():
		var c := ref.unicode_at(i)
		if c <= 32 or c == 127 or _is_space(c):
			return "a ref must not contain whitespace or control characters"
		if c == 34 or c == 92:
			return "a ref must not contain quotes or backslashes"
		if c == 36 or c == 96:
			return "a ref must not contain $ or backticks (Linux and macOS run git through a shell that expands them)"
	return ""


static func _is_space(c: int) -> bool:
	return c == 0x85 or c == 0xA0 or c == 0x1680 or c == 0x180E or (c >= 0x2000 and c <= 0x200F) or c == 0x2028 or c == 0x2029 \
		or c == 0x202F or c == 0x205F or c == 0x3000 or c == 0xFEFF


## The files that differ from `ref` in the project folder's repository, as paths relative to the project:
## {files: [..], count, capped} or {error}. `git diff --name-only <ref> --` (no renames, so a moved file lists both
## paths) plus the untracked files git would add. More than CHANGED_MAX files is "everything" to select() and is
## never listed, so the list stops at CHANGED_MAX + 1 and `capped` says it was cut: a diff against an old ref, or an
## un-ignored folder of imports, can name a hundred thousand paths, and this runs on the editor's main thread.
## An error says what to do: git missing, not a repository, a ref git does not know.
static func changed_files(project_dir: String, ref: String, git: String = "git") -> Dictionary:
	var bad := ref_error(ref)
	if not bad.is_empty():
		return {"error": "since: " + bad}
	var inside := _git(git, project_dir, ["rev-parse", "--is-inside-work-tree"], true)
	if Subprocess.not_started(int(inside["rc"]), str(inside["text"]), git, GIT_EXITS):
		return {"error": "since needs the git command on PATH, and it could not be started. Install git, or run_all without since to run every suite"}
	if int(inside["rc"]) != 0 or not _lines(str(inside["text"])).has("true"):
		return {"error": _git_failure(int(inside["rc"]), str(inside["text"]), ref)}
	var diff := _git(git, project_dir, ["diff", "--name-only", "--no-renames", "--relative", ref, "--"], false)
	if int(diff["rc"]) != 0:
		var why := _git(git, project_dir, ["diff", "--name-only", "--no-renames", "--relative", ref, "--"], true)
		return {"error": _git_failure(int(diff["rc"]), str(why["text"]), ref)}
	var files: Array = []
	var seen := {}
	var capped := _collect(files, seen, str(diff["text"]), CHANGED_MAX)
	if not capped:
		var more := _git(git, project_dir, ["ls-files", "--others", "--exclude-standard"], false)
		if int(more["rc"]) == 0:
			capped = _collect(files, seen, str(more["text"]), CHANGED_MAX)
	return {"files": files, "count": files.size(), "capped": capped}


## One git call: {rc, text}. Always -C <project>, quotePath off (UTF-8 names stay readable), and no optional
## locks (a read must not write the index). Subprocess.not_started(rc, text, git) says whether git could not be
## started at all: that is -1 on Windows and 127 on Linux and macOS, not one number everywhere.
static func _git(git: String, project_dir: String, args: Array, with_stderr: bool) -> Dictionary:
	var argv := PackedStringArray(["-C", project_dir, "-c", "core.quotePath=false", "--no-optional-locks"])
	argv.append_array(PackedStringArray(args))
	var out: Array = []
	var rc := OS.execute(git, argv, out, with_stderr)
	return {"rc": rc, "text": str(out[0]) if not out.is_empty() else ""}


static func _git_failure(rc: int, text: String, ref: String) -> String:
	var first := ""
	for line in text.split("\n"):
		if not String(line).strip_edges().is_empty():
			first = String(line).strip_edges()
			break
	first = first.left(200)
	var low := text.to_lower()
	if low.contains("not a git repository") or low.begins_with("false"):
		return "the project is not inside a git repository, so there is nothing for since to compare with: run_all without since runs every suite"
	if low.contains("bad revision") or low.contains("unknown revision") or low.contains("ambiguous argument") or low.contains("bad object"):
		return "git does not know the ref '%s' (%s): use a branch, a tag, a commit hash or HEAD~N" % [ref.left(80), first]
	return "git failed (exit %d): %s" % [rc, first]


## The distinct paths in a short piece of git output, in order (the answer to a question, not a file list).
static func _lines(text: String) -> Array:
	var out: Array = []
	_collect(out, {}, text, -1)
	return out


## Add the paths in `text` that `seen` has not met yet to `files`, in order. With `cap` >= 0 it stops once `files`
## holds more than `cap` of them, and says so (true): the rest could only be counted, and a Dictionary for the
## seen-set keeps the pass linear (an Array.has per line made it quadratic: 100,000 paths took 80 s).
static func _collect(files: Array, seen: Dictionary, text: String, cap: int) -> bool:
	for raw in text.split("\n"):
		var rel := _norm(String(raw))
		if rel.is_empty() or seen.has(rel):
			continue
		if cap >= 0 and files.size() > cap:
			return true
		seen[rel] = true
		files.append(rel)
	return false


## A path as git printed it, relative to the project with forward slashes; "" for nothing. git quotes a path
## that holds a control character, a quote or a backslash.
static func _norm(raw: String) -> String:
	var s := raw.strip_edges().replace("\\", "/") if not raw.strip_edges().begins_with("\"") else raw.strip_edges()
	if s.begins_with("\"") and s.ends_with("\"") and s.length() >= 2:
		s = s.substr(1, s.length() - 2).c_unescape().replace("\\", "/")
	while s.begins_with("./"):
		s = s.substr(2)
	return s



## The global classes of the project, {class_name: res:// path}, for the closure's class_name references.
static func global_classes() -> Dictionary:
	var out := {}
	for c in ProjectSettings.get_global_class_list():
		var d: Dictionary = c
		var nm := str(d.get("class", ""))
		if not nm.is_empty():
			out[nm] = str(d.get("path", ""))
	return out


## The scripts and scenes the project's autoloads point at (the leading "*" of a singleton and a uid:// form
## are both resolved), as res:// paths.
static func autoload_roots() -> Array:
	var out: Array = []
	for p in ProjectSettings.get_property_list():
		var nm := str((p as Dictionary).get("name", ""))
		if not nm.begins_with("autoload/"):
			continue
		var v := str(ProjectSettings.get_setting(nm, "")).trim_prefix("*")
		var path := uid_path(v) if v.begins_with("uid://") else v
		if not path.is_empty() and not out.has(path):
			out.append(path)
	return out


## Everything EVERY run depends on: the autoloads, plus any resource a project setting names (the audio bus
## layout, a default environment, the project theme, a custom cursor, a translation). None of them is in a
## scene's dependency list, so a suite's closure would never see a change to one. The settings that only the
## editor reads (application/, editor_plugins/, editor/, this addon's own) are left out.
static func global_roots() -> Array:
	var out := autoload_roots()
	for p in ProjectSettings.get_property_list():
		var nm := str((p as Dictionary).get("name", ""))
		if nm.begins_with("autoload/") or nm.begins_with("application/") or nm.begins_with("editor_plugins/") or nm.begins_with("editor/") or nm.begins_with("beckett/"):
			continue
		var v: Variant = ProjectSettings.get_setting(nm, null)
		var texts: Array = []
		if v is String:
			texts.append(v)
		elif v is PackedStringArray or v is Array:
			for e in v:
				if e is String:
					texts.append(e)
		for t in texts:
			var s := String(t).strip_edges()
			var path := uid_path(s) if s.begins_with("uid://") else (s if s.begins_with("res://") else "")
			if not path.is_empty() and not out.has(path):
				out.append(path)
	return out


## The res:// path a uid:// names, "" when it is not (or no longer) a registered one.
static func uid_path(uid: String) -> String:
	if not uid.begins_with("uid://"):
		return ""
	var id: int = ResourceUID.text_to_id(uid)
	if id == ResourceUID.INVALID_ID or not ResourceUID.has_id(id):
		return ""
	return ResourceUID.get_id_path(id)


## Everything `seeds` can load, recursively, as a sorted list of paths (the seeds included). `memo` holds each
## file's direct references across calls (one run_all asks about every suite, and they share most of them);
## `guard_memo` is PathGuard's own scratch.
static func closure(seeds: Array, classes: Dictionary, memo: Dictionary, guard_memo: Dictionary = {}) -> Array:
	var seen := {}
	var order: Array = []
	var queue: Array = []
	for s in seeds:
		queue.append(str(s))
	while not queue.is_empty() and order.size() < CLOSURE_MAX:
		var p: String = queue.pop_back()
		if p.is_empty() or seen.has(p):
			continue
		seen[p] = true
		order.append(p)
		for d in deps_of(p, classes, memo, guard_memo):
			if not seen.has(d):
				queue.append(d)
	order.sort()
	return order


## What one file refers to directly. A scene or resource: the engine's own dependency list. A script or
## shader: the quoted res:// and uid:// literals in its text (preload, load, extends "...", #include), and
## the global classes it names. Anything else, a file that is gone, or one a link would take out of the
## project, refers to nothing.
static func deps_of(path: String, classes: Dictionary, memo: Dictionary, guard_memo: Dictionary) -> Array:
	if memo.has(path):
		return memo[path]
	var out: Array = []
	memo[path] = out
	if not (path.begins_with("res://") or path.begins_with("user://")) or path.contains(".."):
		return out
	var ext := path.get_extension().to_lower()
	var scene_like := SCENE_EXT.has(ext)
	var script_like := SCRIPT_EXT.has(ext)
	if not (scene_like or script_like) or not FileAccess.file_exists(path) or PathGuard.check_read(path, guard_memo).has("error"):
		return out
	if scene_like:
		for d in ResourceLoader.get_dependencies(path):
			var p := _ref_path(str(d))
			if not p.is_empty() and not out.has(p):
				out.append(p)
	if script_like:
		var f := FileAccess.open(path, FileAccess.READ)
		if f != null:
			var text := f.get_buffer(mini(f.get_length(), SCRIPT_MAX)).get_string_from_utf8()
			f.close()
			_scan_script(text, classes if ext == "gd" else {}, out)
	return out


## A dependency entry as a path: the engine hands back the path (a uid already resolved to it), but a binary
## resource can give "uid://...::Type::path", so every "::" part is tried.
static func _ref_path(raw: String) -> String:
	for part in raw.split("::"):
		var p := String(part)
		if p.begins_with("uid://"):
			var r := uid_path(p)
			if not r.is_empty():
				return r
		elif p.begins_with("res://") or p.begins_with("user://"):
			return p
	return ""


static func _scan_script(text: String, classes: Dictionary, out: Array) -> void:
	if _re_lit == null:
		_re_lit = RegEx.create_from_string("[\"'](res://[^\"'\\n]+|uid://[A-Za-z0-9]+)[\"']")
	for m in _re_lit.search_all(text):
		var t := m.get_string(1)
		var p := uid_path(t) if t.begins_with("uid://") else _literal_path(t)
		if not p.is_empty() and not out.has(p):
			out.append(p)
	if classes.is_empty():
		return
	if _re_ident == null:
		_re_ident = RegEx.create_from_string("[A-Za-z_][A-Za-z0-9_]*")
	var seen := {}
	for m in _re_ident.search_all(text):
		var id := m.get_string()
		if seen.has(id):
			continue
		seen[id] = true
		if classes.has(id) and not out.has(classes[id]):
			out.append(classes[id])


## A res:// string literal as a reference. A folder ("res://data/jobs/"), the front of a name a script builds
## ("res://levels/level_") and a template ("res://levels/level_%d.tscn", cut where the placeholder starts) have
## no extension left, which is how select() tells a PREFIX from a file: every path under it may be loaded by
## listing the folder or building the name, and no dependency list shows that. "res://" alone is dropped:
## every path check in every script names it, and it would put the whole project under every suite.
static func _literal_path(t: String) -> String:
	if not t.begins_with("res://"):
		return t
	var cut := t.length()
	for mark in ["%", "{"]:
		var at := t.find(mark)
		if at >= 0:
			cut = mini(cut, at)
	var p := t.left(cut)
	return p if p.length() > "res://".length() else ""


## What a suite depends on: {deps, own}. `deps` is its scene's closure (null when the suite saved no scene: it
## plays whichever scene is running, so what it loads is unknowable); `own` is what belongs to the suite
## itself: its file and the screenshot baselines its asserts compare with.
static func suite_deps(doc: Dictionary, suite_path: String, classes: Dictionary, memo: Dictionary, guard_memo: Dictionary = {}) -> Dictionary:
	var own: Array = [suite_path]
	var asserts: Array = doc.get("asserts", []) if doc.get("asserts", []) is Array else []
	for a in asserts:
		if a is Dictionary and str((a as Dictionary).get("type", "")).to_lower() == "screenshot":
			var b := str((a as Dictionary).get("baseline", ""))
			if b.begins_with("res://") and not own.has(b):
				own.append(b)
	var scene := str(doc.get("scene", "")).strip_edges()
	var deps: Variant = null
	if not scene.is_empty():
		deps = closure([scene], classes, memo, guard_memo)
	return {"deps": deps, "own": own}



## Which of `suites` a set of changed files reaches. `changed` is git's paths (relative to the project);
## `suites` is [{name, deps, own}] (see suite_deps); `autoload` is the closure of global_roots() (what every
## run depends on, the autoloads first among them). `capped` is changed_files' flag: `changed` was cut at
## CHANGED_MAX + 1 paths, so its size is not the number of files that changed.
## Returns {mode: "impact" | "all", why, selected, skipped, reasons: {name: why}, changed, ignored,
## unreached, unreached_count}. In mode "all" every suite is selected and `why` says what could not be placed.
static func select(changed: Array, suites: Array, autoload: Array, capped: bool = false) -> Dictionary:
	var auto_set := {}
	for p in autoload:
		auto_set[_key(str(p))] = true
	var auto_under := _prefixes(autoload)
	var sets := {}
	var hits := {}
	var names: Array = []
	for s in suites:
		var nm := str((s as Dictionary)["name"])
		names.append(nm)
		hits[nm] = []
		var paths := {}
		var deps: Variant = (s as Dictionary).get("deps", null)
		if deps is Array:
			for d in deps:
				paths[_key(str(d))] = true
		for o in (s as Dictionary).get("own", []):
			paths[_key(str(o))] = true
		sets[nm] = {"known": deps is Array, "paths": paths, "under": _prefixes(deps) if deps is Array else []}
	var why := ""
	if changed.size() > CHANGED_MAX:
		why = ("more than %d files changed (the list stops there), too many to check one by one" % CHANGED_MAX) if capped else "%d files changed, more than the %d this checks one by one" % [changed.size(), CHANGED_MAX]
	var unreached: Array = []
	var ignored := 0
	var live := 0
	for raw in changed.slice(0, CHANGED_MAX):
		var rel := _norm(str(raw))
		if rel.is_empty():
			continue
		if rel == "project.godot":
			if why.is_empty():
				why = "project.godot changed (autoloads, input map, physics and rendering settings can change every run)"
			continue
		if is_inert(rel):
			ignored += 1
			continue
		live += 1
		var path := "res://" + rel
		if path.ends_with(".import"):
			path = path.trim_suffix(".import")
		var key := _key(path)
		var reached := false
		if auto_set.has(key):
			if why.is_empty():
				why = "%s is an autoload, a resource a project setting names, or something they load, so every run depends on it" % path.left(PATH_SHOWN)
			reached = true
		elif _under(auto_under, key):
			if why.is_empty():
				why = "%s sits under a folder or name that an autoload (or something it loads) spells out, so a script may load it on every run" % path.left(PATH_SHOWN)
			reached = true
		for nm in names:
			var entry: Dictionary = sets[nm]
			if (entry["paths"] as Dictionary).has(key) or _under(entry["under"], key):
				(hits[nm] as Array).append(path)
				reached = true
			elif not bool(entry["known"]):
				(hits[nm] as Array).append(path)
		if not reached:
			if is_resource_kind(path) or path.begins_with(SUITE_DIR):
				unreached.append(path.left(PATH_SHOWN))
			elif why.is_empty():
				why = "%s is data that no resource references (a script may read it by path), so no dependency list can rule it out" % path.left(PATH_SHOWN)
	var selected: Array = []
	var skipped: Array = []
	var reasons := {}
	for nm in names:
		if not why.is_empty():
			selected.append(nm)
			reasons[nm] = "all suites: " + why
		elif not (hits[nm] as Array).is_empty():
			selected.append(nm)
			var h: Array = hits[nm]
			reasons[nm] = ("changed: %s%s" % [", ".join(PackedStringArray(h.slice(0, SHOWN).map(func(p): return str(p).left(PATH_SHOWN)))), (" (+%d more)" % (h.size() - SHOWN)) if h.size() > SHOWN else ""])
		else:
			skipped.append(nm)
			reasons[nm] = "nothing it loads changed" if live > 0 else "nothing that matters to a run changed"
	return {"mode": "all" if not why.is_empty() else "impact", "why": why, "selected": selected, "skipped": skipped, "reasons": reasons,
		"changed": changed.size(), "ignored": ignored, "unreached": unreached.slice(0, UNREACHED_SHOWN), "unreached_count": unreached.size()}


## A path as the comparisons key it: Windows and macOS file systems ignore case, so a scene that refers to
## res://Scenes/Main.tscn and a repository that lists scenes/main.tscn are the same file there.
static func _key(path: String) -> String:
	var os_name := OS.get_name()
	return path.to_lower() if (os_name == "Windows" or os_name == "macOS") else path


## The prefixes in a dependency list, as comparison keys: the res:// entries with no extension (a folder a
## script lists, the front of a name it builds; see _literal_path). A file under one is reachable.
static func _prefixes(paths: Array) -> Array:
	var out: Array = []
	for p in paths:
		var s := str(p)
		if s.begins_with("res://") and s.length() > "res://".length() and s.get_extension().is_empty():
			out.append(_key(s))
	return out


static func _under(prefixes: Array, key: String) -> bool:
	for p in prefixes:
		if key.begins_with(str(p)):
			return true
	return false


## Can a change to this file never reach a running game? (Docs, scripts for the tooling, VCS and editor files.)
static func is_inert(rel: String) -> bool:
	var parts := rel.to_lower().split("/")
	if INERT_DIRS.has(parts[0]):
		return true
	var file: String = parts[parts.size() - 1]
	if INERT_NAMES.has(file) or INERT_EXT.has(file.get_extension()):
		return true
	return file.ends_with(".report.json") or file.ends_with(".actual.png")


## Is this the kind of file a dependency walk can represent (a scene, resource, script or imported asset)?
static func is_resource_kind(path: String) -> bool:
	var ext := path.get_extension().to_lower()
	return SCENE_EXT.has(ext) or SCRIPT_EXT.has(ext) or ASSET_EXT.has(ext)


## What a full run says about the selection it did not use: of the suites selection would have SKIPPED, how
## many failed? `verdicts` is {suite name: verdict} for every suite that ran. A skipped suite that failed is a
## false negative (or was already red before the change: compare cannot tell, the note says so); one that was
## blocked is listed apart, since blocked judged nothing.
static func compare(sel: Dictionary, verdicts: Dictionary) -> Dictionary:
	var skipped: Array = sel.get("skipped", [])
	var failed: Array = []
	var blocked: Array = []
	var checked := 0
	for n in skipped:
		var v := str(verdicts.get(str(n), ""))
		if v.is_empty():
			continue
		checked += 1
		if v == "fail":
			failed.append(n)
		elif v == "blocked":
			blocked.append(n)
	return {"would_run": (sel.get("selected", []) as Array).size(), "would_skip": skipped.size(), "checked": checked,
		"skipped_failed": failed, "skipped_blocked": blocked, "false_negatives": failed.size()}
