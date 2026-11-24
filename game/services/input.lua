-- Project-owned semantic action bindings. Native Defold dispatch and Druid still
-- own input focus/consumption; this module never routes text or mouse input.
local U = require("game.util")
local M = {}
local B = {}
B.__index = B
local DEFINITIONS = {
	{ command = "move_up", label = "Move north", key = "key_w", aliases = { "key_up" }, dispatch = "move", params = {
		dx = 0,
		dy = -1,
	} },
	{ command = "move_down", label = "Move south", key = "key_s", aliases = { "key_down" }, dispatch = "move", params = {
		dx = 0,
		dy = 1,
	} },
	{ command = "move_left", label = "Move west", key = "key_a", aliases = { "key_left" }, dispatch = "move", params = {
		dx = -1,
		dy = 0,
	} },
	{ command = "move_right", label = "Move east", key = "key_d", aliases = { "key_right" }, dispatch = "move", params = {
		dx = 1,
		dy = 0,
	} },
	{ command = "interact", label = "Interact", key = "key_e" },
	{ command = "inventory", label = "Inventory", key = "key_i" },
	{ command = "skills", label = "Skills", key = "key_k" },
	{ command = "quests", label = "Quests", key = "key_q" },
	{ command = "character", label = "Character sheet", key = "key_c" },
	{ command = "gates", label = "Moon Gates", key = "key_g" },
	{ command = "attack", label = "Normal Attack", key = "key_1" },
	{ command = "defend", label = "Defend", key = "key_2" },
	{ command = "smash", label = "Smash", key = "key_3" },
	{ command = "counterattack", label = "Counterattack", key = "key_4" },
	{ command = "windmill", label = "Windmill", key = "key_5" },
	{ command = "tonic", label = "Healing Tonic", key = "key_6" },
	{ command = "practice", label = "Strike practice post", key = "key_space" },
}
local BY_COMMAND = {}
for _, d in ipairs(DEFINITIONS) do
	BY_COMMAND[d.command] = d
end
-- Extracted from pinned Defold 1.14.1 /builtins/input/all.input_binding.
local PHYSICAL_NAMES = {
	"key_space",
	"key_exclamationmark",
	"key_doublequote",
	"key_hash",
	"key_dollarsign",
	"key_ampersand",
	"key_singlequote",
	"key_lparen",
	"key_rparen",
	"key_asterisk",
	"key_plus",
	"key_comma",
	"key_minus",
	"key_period",
	"key_slash",
	"key_0",
	"key_1",
	"key_2",
	"key_3",
	"key_4",
	"key_5",
	"key_6",
	"key_7",
	"key_8",
	"key_9",
	"key_colon",
	"key_semicolon",
	"key_lessthan",
	"key_equals",
	"key_greaterthan",
	"key_questionmark",
	"key_at",
	"key_a",
	"key_b",
	"key_c",
	"key_d",
	"key_e",
	"key_f",
	"key_g",
	"key_h",
	"key_i",
	"key_j",
	"key_k",
	"key_l",
	"key_m",
	"key_n",
	"key_o",
	"key_p",
	"key_q",
	"key_r",
	"key_s",
	"key_t",
	"key_u",
	"key_v",
	"key_w",
	"key_x",
	"key_y",
	"key_z",
	"key_lbracket",
	"key_rbracket",
	"key_backslash",
	"key_caret",
	"key_underscore",
	"key_grave",
	"key_lbrace",
	"key_rbrace",
	"key_pipe",
	"key_esc",
	"key_f1",
	"key_f2",
	"key_f3",
	"key_f4",
	"key_f5",
	"key_f6",
	"key_f7",
	"key_f8",
	"key_f9",
	"key_f10",
	"key_f11",
	"key_f12",
	"key_up",
	"key_down",
	"key_left",
	"key_right",
	"key_lshift",
	"key_rshift",
	"key_lctrl",
	"key_rctrl",
	"key_lalt",
	"key_ralt",
	"key_tab",
	"key_enter",
	"key_backspace",
	"key_insert",
	"key_del",
	"key_pageup",
	"key_pagedown",
	"key_home",
	"key_end",
	"key_numpad_0",
	"key_numpad_1",
	"key_numpad_2",
	"key_numpad_3",
	"key_numpad_4",
	"key_numpad_5",
	"key_numpad_6",
	"key_numpad_7",
	"key_numpad_8",
	"key_numpad_9",
	"key_numpad_divide",
	"key_numpad_multiply",
	"key_numpad_subtract",
	"key_numpad_add",
	"key_numpad_decimal",
	"key_numpad_equal",
	"key_numpad_enter",
	"key_numpad_numlock",
	"key_capslock",
	"key_scrolllock",
	"key_pause",
	"key_lsuper",
	"key_rsuper",
	"key_menu",
	"key_back",
}
M.PHYSICAL_KEYS = U.copy(PHYSICAL_NAMES)
local VALID = {}
for _, name in ipairs(PHYSICAL_NAMES) do
	VALID[name] = true
end
local RESERVED = {
	key_esc = true,
	key_tab = true,
	key_enter = true,
	key_kp_enter = true,
	key_numpad_enter = true,
	key_backspace = true,
	key_del = true,
	key_back = true,
	key_lshift = true,
	key_rshift = true,
	key_lctrl = true,
	key_rctrl = true,
	key_lalt = true,
	key_ralt = true,
	key_lsuper = true,
	key_rsuper = true,
	key_f1 = true,
	key_f2 = true,
	key_f3 = true,
	key_f4 = true,
}
-- Keep Enter as a fixed interaction alternative; while a menu is open it stays
-- an activation key. Arrow aliases can be replaced, but never steal UI focus.
function M.is_bindable(name)
	if type(name) ~= "string" or not VALID[name] then
		return false, "Choose a recognized keyboard key."
	end
	if RESERVED[name] then
		return false, "That key is reserved for menu navigation, text editing or quick slots."
	end
	return true
end
local function active_rows(overrides)
	local rows = {}
	for _, d in ipairs(DEFINITIONS) do
		local row = {
			command = d.command,
			label = d.label,
			key = overrides[d.command] or d.key,
			aliases = overrides[d.command] and {} or U.copy(d.aliases or {}),
		}
		rows[#rows + 1] = row
	end
	return rows
end
local function validate(overrides)
	if type(overrides) ~= "table" then
		return nil, "Malformed input settings."
	end
	local out = {}
	for command, key in pairs(overrides) do
		if not BY_COMMAND[command] then
			return nil, "Unknown input command."
		end
		local ok, message = M.is_bindable(key)
		if not ok then
			return nil, message
		end
		out[command] = key
	end
	local claimed = {}
	for _, row in ipairs(active_rows(out)) do
		local keys = { row.key }
		for _, name in ipairs(row.aliases) do
			keys[#keys + 1] = name
		end
		for _, key in ipairs(keys) do
			if claimed[key] then
				return nil, "That key is already assigned to " .. claimed[key] .. "."
			end
			claimed[key] = row.command
		end
	end
	return out
end
local function default_read()
	if not sys then
		return nil
	end
	local ok, value = pcall(sys.load, sys.get_save_file("rebirth_dungeon", "input_bindings"))
	return ok and value or nil
end
local function default_write(packet)
	if not sys then
		return true
	end
	local ok, result = pcall(sys.save, sys.get_save_file("rebirth_dungeon", "input_bindings"), packet)
	return ok and result == true
end
function M.new(opts)
	opts = opts or {}
	local self = setmetatable({ overrides = {}, write = opts.write or default_write, load_error = nil }, B)
	local ok, packet = pcall(opts.read or default_read)
	if not ok then
		self.load_error = "Could not read input settings."
		return self
	end
	if packet == nil or type(packet) == "table" and next(packet) == nil then
		return self
	end
	if type(packet) ~= "table" or packet.schema_version ~= 1 then
		self.load_error = "Unsupported input settings."
		return self
	end
	local normalized, err = validate(packet.bindings)
	if normalized then
		self.overrides = normalized
	else
		self.load_error = err
	end
	return self
end
function B:bindings()
	return active_rows(self.overrides)
end
function B:physical_bindings()
	local rows = {}
	for _, row in ipairs(self:bindings()) do
		rows[#rows + 1] = { command = row.command, label = row.label, key = row.key }
		for _, name in ipairs(row.aliases) do
			rows[#rows + 1] = { command = row.command, label = row.label, key = name, alias = true }
		end
	end
	rows[#rows + 1] = { command = "interact", label = "Interact", key = "key_enter", fixed = true }
	return rows
end
function B:resolve(name)
	if name == "key_enter" then
		return "interact", {}
	end
	for _, row in ipairs(self:physical_bindings()) do
		if row.key == name then
			local d = BY_COMMAND[row.command]
			return d.dispatch or d.command, U.copy(d.params or {})
		end
	end
	return nil
end
function B:resolve_hash(id, hash_fn)
	hash_fn = hash_fn or hash
	if not hash_fn or id == nil then
		return nil
	end
	for _, row in ipairs(self:physical_bindings()) do
		if id == hash_fn(row.key) then
			return self:resolve(row.key)
		end
	end
	return nil
end
function B:serialize()
	return { schema_version = 1, bindings = U.copy(self.overrides) }
end
function B:_commit(overrides)
	local packet = { schema_version = 1, bindings = U.copy(overrides) }
	local ok, saved = pcall(self.write, packet)
	if not ok or saved ~= true then
		return false, "Could not save input bindings."
	end
	self.overrides = overrides
	self.load_error = nil
	return true
end
function B:bind(command, name)
	if not BY_COMMAND[command] then
		return false, "Unknown input command."
	end
	local bindable, message = M.is_bindable(name)
	if not bindable then
		return false, message
	end
	local candidate = U.copy(self.overrides)
	candidate[command] = name
	local normalized, err = validate(candidate)
	if not normalized then
		return false, err
	end
	return self:_commit(normalized)
end
function B:reset()
	return self:_commit({})
end
return M
