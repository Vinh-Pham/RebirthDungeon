local U = require("game.util")
local S = require("game.systems.skills")
local Dungeons = require("game.generation.dungeons")
local M = {}
local defaults = {
	location = "lantern_rest",
	map_position = {},
	visited = {},
	gates = {},
	quest = 0,
	gold = 24,
	bank_gold = 0,
	tonics = 0,
	health = -1,
	dungeon_from = "lantern_rest",
	pending_loot = {},
	spent_ap = 0,
	quick_slots = { "", "", "", "" },
	armor_owned = false,
	equipment_durability = {},
	starter_sword_claimed = false,
	gear_inventory = {},
	shop_supplies = {},
	threshold_cleared = 0,
	threshold_defeated = {},
	threshold_explored = {},
	threshold_links = {},
	threshold_treasure_claimed = false,
	threshold_treasure_chest = -1,
	threshold_run = 0,
	threshold_completions = 0,
	town_materials = { fish = 0, grain = 0, flour = 0, fiber = 0, thread = 0, cloth = 0, cobweb = 0, firewood = 0 },
	tree_harvests = {},
	legacy_layouts = {},
	generator_version = Dungeons.VERSION,
}
function M.defaults()
	local w = U.copy(defaults)
	w.skills = U.copy(S.STARTING)
	return w
end
local function position(v, w)
	if type(v) ~= "table" or v.location ~= w.location then
		return {}
	end
	if w.location ~= "threshold" and w.location ~= "lantern_rest" and w.location ~= "spindle_hollow" then
		return {}
	end
	if v.landmark == "dungeon" and w.location ~= "threshold" then
		return { location = w.location, landmark = "dungeon" }
	end
	if not U.integer(v.x, 0, 2147483647) or not U.integer(v.y, 0, 2147483647) then
		return {}
	end
	local p = { location = w.location, x = v.x, y = v.y }
	if w.location == "threshold" then
		local last = w.generator_version == Dungeons.VERSION and 8 or w.threshold_cleared
		if not U.integer(v.room, 0, last) or v.run ~= w.threshold_run then
			return {}
		end
		p.room = v.room
		p.run = v.run
	end
	return p
end
function M.validate_world(w)
	if type(w) ~= "table" then
		return nil, "Invalid world"
	end
	local n = M.defaults()
	for k in pairs(n) do
		if w[k] ~= nil then
			n[k] = U.copy(w[k])
		end
	end
	local function bad(k)
		return nil, "Invalid " .. k
	end
	if not ({ arrival = true, lantern_rest = true, spindle_hollow = true, threshold = true })[n.location] then
		return bad("location")
	end
	local imported = type(n.legacy_layouts) == "table" and n.legacy_layouts.threshold
	if imported or (w.generator_version == nil and n.location == "threshold") then
		n.generator_version = Dungeons.LEGACY_VERSION
	end
	if n.dungeon_from ~= "lantern_rest" and n.dungeon_from ~= "spindle_hollow" then
		return bad("dungeon_from")
	end
	local function townlist(v)
		if type(v) ~= "table" then
			return nil
		end
		local out, seen = {}, {}
		for k, town in pairs(v) do
			if not U.integer(k, 1, #v) or (town ~= "lantern_rest" and town ~= "spindle_hollow") then
				return nil
			end
			if not seen[town] then
				seen[town] = true
				out[#out + 1] = town
			end
		end
		return out
	end
	n.visited = townlist(n.visited)
	n.gates = townlist(n.gates)
	if not n.visited or not n.gates then
		return bad("towns")
	end
	local visited = {}
	for _, town in ipairs(n.visited) do
		visited[town] = true
	end
	for _, town in ipairs(n.gates) do
		if not visited[town] then
			return bad("gate")
		end
	end
	if type(n.quick_slots) ~= "table" or #n.quick_slots ~= 4 then
		return bad("quick_slots")
	end
	for _, v in ipairs(n.quick_slots) do
		if v ~= "" and v ~= "tonic" then
			return bad("quick_slots")
		end
	end
	local bounds = {
		quest = { 0, 3 },
		gold = { 0, 2000000000 },
		bank_gold = { 0, 20000000 },
		tonics = { 0, 2000000000 },
		health = { -1, 2500 },
		threshold_cleared = { 0, 8 },
		threshold_run = { 0, 2000000000 },
		threshold_completions = { 0, 2000000000 },
		threshold_treasure_chest = { -1, 4 },
		spent_ap = { 0, 2000000000 },
	}
	for k, b in pairs(bounds) do
		if not U.integer(n[k], b[1], b[2]) then
			return bad(k)
		end
	end
	if type(n.threshold_defeated) ~= "table" or type(n.threshold_explored) ~= "table" or type(n.threshold_links) ~= "table" then
		return bad("dungeon exploration")
	end
	local defeated = 0
	for room, value in pairs(n.threshold_defeated) do
		if type(room) ~= "string" or not room:match("^[1-8]$") or value ~= true then
			return bad("dungeon encounters")
		end
		defeated = defeated + 1
	end
	if n.generator_version == Dungeons.VERSION and defeated ~= n.threshold_cleared then
		return bad("dungeon encounters")
	end
	for room, cells in pairs(n.threshold_explored) do
		if type(room) ~= "string" or not room:match("^[1-9]$") or type(cells) ~= "table" then
			return bad("dungeon exploration")
		end
		for cell, value in pairs(cells) do
			local x, y
			if type(cell) == "string" then
				x, y = cell:match("^(%d+),(%d+)$")
			end
			if value ~= true or not U.integer(tonumber(x), 0, 127) or not U.integer(tonumber(y), 0, 127) then
				return bad("dungeon exploration")
			end
		end
	end
	for link, value in pairs(n.threshold_links) do
		local a, b
		if type(link) == "string" then
			a, b = link:match("^([1-9]):([1-9])$")
		end
		if value ~= true or not a or a >= b then
			return bad("dungeon passages")
		end
	end
	for _, k in ipairs({ "armor_owned", "starter_sword_claimed", "threshold_treasure_claimed" }) do
		if type(n[k]) ~= "boolean" then
			return bad(k)
		end
	end
	if n.threshold_treasure_chest >= 0 and not n.threshold_treasure_claimed then
		return bad("treasure")
	end
	if n.threshold_treasure_claimed and n.threshold_cleared ~= 8 then
		return bad("treasure")
	end
	if type(n.town_materials) ~= "table" then
		return bad("materials")
	end
	local materials = U.copy(defaults.town_materials)
	for k, v in pairs(n.town_materials) do
		if materials[k] == nil or not U.integer(v, 0, 2000000000) then
			return bad("materials")
		end
		materials[k] = v
	end
	n.town_materials = materials
	for _, k in ipairs({ "pending_loot", "equipment_durability", "shop_supplies" }) do
		if type(n[k]) ~= "table" then
			return bad(k)
		end
	end
	for k, v in pairs(n.pending_loot) do
		if (k ~= "gold" and k ~= "tonic" and materials[k] == nil) or not U.integer(v, 1, 2000000000) then
			return bad("loot")
		end
	end
	for k, v in pairs(n.equipment_durability) do
		if type(k) ~= "string" or k == "" or not U.integer(v, 0, 1000000) then
			return bad("durability")
		end
	end
	for k, v in pairs(n.shop_supplies) do
		if (k ~= "arrow" and k ~= "bolt" and k ~= "altar_of_restoration") or not U.integer(v, 1, 2000000000) then
			return bad("supplies")
		end
	end
	n.skills = S.normalize(n.skills)
	if not n.skills then
		return bad("skills")
	end
	if type(n.gear_inventory) ~= "table" then
		return bad("gear")
	end
	if next(n.gear_inventory) then
		local inv = require("game.systems.inventory")
		local normalized, err = inv.normalize(n.gear_inventory, n)
		if not normalized then
			return nil, err
		end
		n.gear_inventory = normalized
	end
	local trees = {}
	if type(n.tree_harvests) == "table" then
		for k, v in pairs(n.tree_harvests) do
			if
				type(k) == "string"
				and (k:match("^lantern_rest:%-?%d+:%-?%d+$") or k:match("^spindle_hollow:%-?%d+:%-?%d+$"))
				and type(v) == "table"
				and U.integer(v.count, 0, 4)
				and U.integer(v.next_at, 1, 253402300799)
			then
				trees[k] = { count = v.count, next_at = v.next_at }
			end
		end
	end
	n.tree_harvests = trees
	n.map_position = position(n.map_position, n)
	return n
end
local function utf8_length(text)
	if type(text) ~= "string" then
		return nil
	end
	local i, count = 1, 0
	while i <= #text do
		local b = text:byte(i)
		local size
		if b < 128 then
			size = 1
		elseif b >= 194 and b <= 223 then
			size = 2
		elseif b >= 224 and b <= 239 then
			size = 3
		elseif b >= 240 and b <= 244 then
			size = 4
		else
			return nil
		end
		for j = 1, size - 1 do
			local c = text:byte(i + j)
			if not c or c < 128 or c > 191 then
				return nil
			end
		end
		local second = text:byte(i + 1)
		if
			(b == 224 and second < 160)
			or (b == 237 and second > 159)
			or (b == 240 and second < 144)
			or (b == 244 and second > 143)
		then
			return nil
		end
		count = count + 1
		i = i + size
	end
	return count
end
local function array(value, limit)
	if type(value) ~= "table" or #value > limit then
		return false
	end
	local count = 0
	for k in pairs(value) do
		if not U.integer(k, 1, #value) then
			return false
		end
		count = count + 1
	end
	return count == #value
end
local function geometry(map, width, height, room)
	if type(map) ~= "table" or map.width ~= width or map.height ~= height then
		return nil, "Invalid layout dimensions"
	end
	local function point(p, walkable)
		if type(p) ~= "table" or not U.integer(p.x, 0, width - 1) or not U.integer(p.y, 0, height - 1) then
			return false
		end
		return not walkable or map.floor[p.x .. "," .. p.y] == true
	end
	for _, field in ipairs({ "floor", "walls", "water", "roads" }) do
		local cells = map[field]
		if type(cells) ~= "table" then
			return nil, "Invalid layout " .. field
		end
		if field == "floor" and not next(cells) then
			return nil, "Empty layout floor"
		end
		for k, v in pairs(cells) do
			if type(k) ~= "string" or v ~= true then
				return nil, "Invalid layout cell"
			end
			local x, y = k:match("^(%d+),(%d+)$")
			x, y = tonumber(x), tonumber(y)
			if not U.integer(x, 0, width - 1) or not U.integer(y, 0, height - 1) or k ~= x .. "," .. y then
				return nil, "Invalid layout coordinate"
			end
		end
	end
	for k in pairs(map.floor) do
		if map.walls[k] or map.water[k] then
			return nil, "Blocked layout floor"
		end
	end
	if not point(map.spawn, true) then
		return nil, "Invalid layout spawn"
	end
	if room and (not point(map.entry, true) or not point(map.exit, true)) then
		return nil, "Invalid room entry or exit"
	end
	for field, limit in pairs({ landmarks = 128, enemies = 56, chests = 5 }) do
		if not array(map[field], limit) then
			return nil, "Invalid layout " .. field
		end
		local occupied = {}
		for _, entity in ipairs(map[field]) do
			if not point(entity, true) then
				return nil, "Invalid " .. field .. " position"
			end
			local cell = entity.x .. "," .. entity.y
			if occupied[cell] then
				return nil, "Overlapping " .. field
			end
			occupied[cell] = true
			for _, key in ipairs({ "id", "name", "label" }) do
				if entity[key] ~= nil and (type(entity[key]) ~= "string" or #entity[key] > 256) then
					return nil, "Invalid layout entity label"
				end
			end
			if type(entity.id) ~= "string" or entity.id == "" then
				return nil, "Missing layout entity id"
			end
			if
				entity.cell ~= nil
				and (not point(entity.cell, true) or entity.cell.x ~= entity.x or entity.cell.y ~= entity.y)
			then
				return nil, "Invalid landmark cell"
			end
			if entity.door ~= nil and not point(entity.door, true) then
				return nil, "Invalid building door"
			end
			local b = entity.building
			if
				b ~= nil
				and (
					type(b) ~= "table"
					or not point(b, false)
					or not U.integer(b.width, 1, width)
					or not U.integer(b.height, 1, height)
					or b.x + b.width > width
					or b.y + b.height > height
				)
			then
				return nil, "Invalid building footprint"
			end
		end
	end
	return true
end
local function layout_set(layouts, require_rooms)
	if type(layouts) ~= "table" then
		return nil, "Invalid layout set"
	end
	for k in pairs(layouts) do
		if k ~= "lantern_rest" and k ~= "spindle_hollow" and k ~= "threshold" then
			return nil, "Unknown layout"
		end
	end
	local ok, err = geometry(layouts.lantern_rest, 68, 42, false)
	if not ok then
		return nil, err
	end
	ok, err = geometry(layouts.spindle_hollow, 30, 11, false)
	if not ok then
		return nil, err
	end
	if require_rooms or layouts.threshold ~= nil then
		if not array(layouts.threshold, 9) or #layouts.threshold ~= 9 then
			return nil, "Nine threshold rooms required"
		end
		for _, room in ipairs(layouts.threshold) do
			ok, err = geometry(room, 31, 15, true)
			if not ok then
				return nil, err
			end
		end
	end
	return true
end
function M.normalize(p)
	if type(p) ~= "table" or type(p.name) ~= "string" then
		return nil, "Invalid character name"
	end
	if p.schema_version ~= nil and p.schema_version ~= 0 and p.schema_version ~= 1 then
		return nil, "Unsupported profile schema version"
	end
	local name = p.name:match("^%s*(.-)%s*$")
	local length = utf8_length(name)
	if not length or length < 1 or length > 24 or name:find("[%z\1-\31\127]") then
		return nil, "Invalid character name"
	end
	local n = U.copy(p)
	n.name = name
	n.race = n.race or n.lineage
	n.world = M.validate_world(p.world or {})
	if not n.world then
		return nil, "Invalid world"
	end
	for k, range in pairs({
		race = { 0, 2 },
		body = { 0, 2 },
		age = { 10, 25 },
		gender = { 0, 2 },
		hair = { 0, 11 },
		hair_color = { 0, 9 },
		skin = { 0, 3 },
		eyes = { 0, 2 },
		eye_color = { 0, 9 },
		face = { 0, 2 },
		talent = { 0, 23 },
	}) do
		if (k ~= "gender" or n[k] ~= nil) and not U.integer(n[k], range[1], range[2]) then
			return nil, "Invalid " .. k
		end
	end
	if type(n.id) ~= "string" or #n.id ~= 32 or n.id:find("[^0-9a-f]") then
		return nil, "Invalid id"
	end
	if type(n.world.legacy_layouts) ~= "table" then
		return nil, "Invalid legacy layouts"
	end
	if next(n.world.legacy_layouts) then
		local ok, err = layout_set(n.world.legacy_layouts, false)
		if not ok then
			return nil, err
		end
	end
	n.schema_version = 1
	n.experience = n.experience or 0
	n.seed = n.seed or 1
	if not U.integer(n.experience, 0, 2000000000) or not U.integer(n.seed, 1, 2147483647) then
		return nil, "Invalid experience or seed"
	end
	return n
end
function M.new(o)
	o = U.copy(o or {})
	o.name = o.name or "Delver"
	for _, k in ipairs({ "body", "hair", "hair_color", "skin", "eyes", "eye_color", "face" }) do
		o[k] = o[k] or 0
	end
	o.race = o.race or 0
	o.gender = o.gender or 0
	o.age = o.age or 17
	o.talent = o.talent or 0
	if
		o.age > 17
		or not require("game.util").contains(require("game.data.characters").available_talents(o.race), o.talent)
	then
		return nil, "Unavailable starting age or talent"
	end
	o.id = o.id
		or string.format(
			"%08x%08x%08x%08x",
			os.time() % 2147483647,
			math.random(1, 2147483646),
			math.random(1, 2147483646),
			math.random(1, 2147483646)
		)
	o.seed = o.seed or math.random(1, 2147483646)
	o.world = o.world or M.defaults()
	return M.normalize(o)
end
function M.update(p, changes)
	local n = U.copy(p)
	for k, v in pairs(changes) do
		if defaults[k] == nil and k ~= "skills" then
			return nil, "Unknown world field"
		end
		n.world[k] = U.copy(v)
	end
	return M.normalize(n)
end
return M
