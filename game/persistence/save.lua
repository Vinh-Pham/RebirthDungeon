local P = require("game.persistence.migrations")
local U = require("game.util")
local M = {}

function M.new(opts)
	opts = opts or {}
	local mem = {}
	local rawread = opts.read
		or function(key)
			if sys then
				return sys.load(sys.get_save_file("rebirth_dungeon", key))
			end
			return mem[key]
		end
	local rawwrite = opts.write
		or function(key, value)
			if sys then
				return sys.save(sys.get_save_file("rebirth_dungeon", key), value)
			end
			mem[key] = U.copy(value)
			return true
		end
	local rawremove = opts.remove
		or function(key)
			if sys then
				return os.remove(sys.get_save_file("rebirth_dungeon", key))
			end
			mem[key] = nil
			return true
		end
	local function read(key)
		local ok, value = pcall(rawread, key)
		return ok and value or nil
	end
	local function write(key, value)
		local ok, result = pcall(rawwrite, key, U.copy(value))
		return ok and result ~= false and result ~= nil
	end
	local function remove(key)
		local ok, result = pcall(rawremove, key)
		return ok and result ~= false
	end
	local function validid(id)
		return type(id) == "string" and #id == 32 and not id:find("[^0-9a-f]")
	end
	local function normalize_profile(value, id)
		local ok, profile = pcall(P.normalize, value)
		if ok and profile and profile.id == id then
			return profile
		end
	end
	local function read_profile(id)
		if not validid(id) then
			return nil
		end
		local primary = normalize_profile(read(id), id)
		if primary then
			return primary, "primary"
		end
		local backup = normalize_profile(read(id .. ".backup"), id)
		if backup then
			return backup, "backup"
		end
	end
	local function manifest(value)
		if type(value) ~= "table" or type(value.ids) ~= "table" then
			return nil
		end
		local ids, seen, count = {}, {}, 0
		for index, id in pairs(value.ids) do
			if not U.integer(index, 1, #value.ids) or not validid(id) or seen[id] then
				return nil
			end
			ids[index] = id
			seen[id] = true
			count = count + 1
		end
		if count ~= #ids then
			return nil
		end
		return { ids = ids }
	end
	local function read_manifest()
		return manifest(read("characters")) or manifest(read("characters.backup")) or { ids = {} }
	end
	local function contains(ids, id)
		for _, candidate in ipairs(ids) do
			if candidate == id then
				return true
			end
		end
		return false
	end
	local self = { selected = nil }
	function self:list()
		local profiles = {}
		for _, id in ipairs(read_manifest().ids) do
			local profile = read_profile(id)
			if profile then
				profiles[#profiles + 1] = profile
			end
		end
		table.sort(profiles, function(a, b)
			return a.name < b.name
		end)
		return profiles
	end
	function self:save(profile)
		local ok, normalized, err = pcall(P.normalize, profile)
		if not ok or not normalized then
			return nil, err or "Invalid profile"
		end
		local id = normalized.id
		local previous, origin = read_profile(id)
		local prior_manifest = read_manifest()
		local next_manifest = U.copy(prior_manifest)
		if not contains(next_manifest.ids, id) then
			next_manifest.ids[#next_manifest.ids + 1] = id
		end
		-- Never replace the only good backup with a corrupt primary during recovery.
		if previous and origin == "primary" and not write(id .. ".backup", previous) then
			return nil, "Backup failed"
		end
		local function rollback_profile()
			if previous then
				return write(id, previous)
			end
			local removed = remove(id)
			remove(id .. ".backup")
			return removed
		end
		if not previous and not write(id .. ".backup", normalized) then
			remove(id .. ".backup")
			return nil, "Initial backup failed"
		end
		if not write(id, normalized) then
			rollback_profile()
			return nil, "Save failed"
		end
		-- Retain the old index before publishing a new one, and mirror the committed
		-- index afterwards so newly created characters also survive index corruption.
		if not write("characters.backup", prior_manifest) then
			rollback_profile()
			return nil, "Manifest backup failed"
		end
		if not write("characters", next_manifest) then
			write("characters", prior_manifest)
			write("characters.backup", prior_manifest)
			rollback_profile()
			return nil, "Manifest save failed"
		end
		if not write("characters.backup", next_manifest) then
			write("characters", prior_manifest)
			write("characters.backup", prior_manifest)
			rollback_profile()
			return nil, "Manifest mirror failed"
		end
		return U.copy(normalized)
	end
	function self:create(options)
		local ok, profile, err = pcall(P.new, options)
		if not ok or not profile then
			return nil, err or "Invalid character options"
		end
		local raw = read(profile.id)
		local occupied = raw ~= nil and not (type(raw) == "table" and next(raw) == nil)
		if occupied or read_profile(profile.id) or contains(read_manifest().ids, profile.id) then
			return nil, "Character id already exists"
		end
		local saved, error_message = self:save(profile)
		if saved then
			self.selected = saved.id
		end
		return saved, error_message
	end
	function self:select(id)
		if not read_profile(id) then
			return false
		end
		self.selected = id
		return true
	end
	function self:load_selected()
		return self.selected and read_profile(self.selected) or nil
	end
	function self:update(changes)
		local profile = self:load_selected()
		if not profile then
			return nil, "No selected character"
		end
		local updated, err = P.update(profile, changes)
		if not updated then
			return nil, err
		end
		return self:save(updated)
	end
	return self
end
return M
