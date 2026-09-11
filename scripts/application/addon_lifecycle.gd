class_name ShellAddonLifecycle
extends RefCounted
## Existing autoloads own their lifetime. Phase 1 adds no gameplay subscriptions.
## QuestSystem's editor defaults are stripped by ProjectSettings.save(), so its
## runtime get_setting(no fallback) must receive an explicit application default.

static func configure_runtime() -> void:
	ProjectSettings.set_setting("quest_system/config/require_objective_completed", true)
	ProjectSettings.set_setting("quest_system/config/allow_repeating_completed_quests", false)
