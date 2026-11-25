local druid = require("druid.druid")
local Data = require("game.model.character_data")
local Catalog = require("game.catalog")
local Equipment = require("game.model.equipment")
local M = {}
local V = {}
V.__index = V
local MAP_VIEW = { x = 16, y = 109, w = 992, h = 456 }
local TILE_WIDTH, TILE_HEIGHT = 16, 24
local STATUS_BAR_WIDTH = 212
local TIME_BAR_WIDTH = MAP_VIEW.w - 40
local ACTION_Y = 693
local palette = {
	back = "28353e",
	dark = "2e222f",
	panel = "344a5a",
	border = "407080",
	text = "d6dad3",
	muted = "a9b2a2",
	gold = "fbb954",
	teal = "5bbfc5",
	red = "993d41",
	floor = "576069",
	water = "508da0",
}
local function color(name)
	local s = palette[name] or name
	return vmath.vector4(
		tonumber(s:sub(1, 2), 16) / 255,
		tonumber(s:sub(3, 4), 16) / 255,
		tonumber(s:sub(5, 6), 16) / 255,
		1
	)
end
local function cell(p)
	return p and (p.x or p[1]), p and (p.y or p[2])
end
local function human(s)
	return tostring(s or ""):gsub("_", " "):gsub("^%l", string.upper)
end
local function list(v)
	if type(v) == "table" then
		return v
	end
	return {}
end
local function wrap(text, width)
	local out = {}
	for line in (tostring(text or "") .. "\n"):gmatch("(.-)\n") do
		local current = ""
		for word in line:gmatch("%S+") do
			if #current + #word + 1 > width and #current > 0 then
				out[#out + 1] = current
				current = word
			else
				current = current == "" and word or current .. " " .. word
			end
		end
		out[#out + 1] = current
	end
	return out
end
function M.new(owner, session)
	return setmetatable(
		{
			owner = owner,
			s = session,
			nodes = {},
			buttons = {},
			focus = 1,
			page = 0,
			cursor = { x = 0, y = 0 },
			name_edit = false,
		},
		V
	)
end
function V:dispatch(id, args)
	self.s:dispatch(id, args)
end
function V:box(x, y, w, h, c, parent)
	local n = gui.new_box_node(vmath.vector3(x, 720 - y, 0), vmath.vector3(w, h, 0))
	gui.set_color(n, color(c))
	if parent then
		gui.set_parent(n, parent, true)
	end
	self.nodes[#self.nodes + 1] = n
	return n
end
function V:text(x, y, value, c, prose, parent, scale)
	local n = gui.new_text_node(vmath.vector3(x, 720 - y, 0), tostring(value or ""))
	gui.set_font(n, prose and "prose" or "ui")
	gui.set_pivot(n, gui.PIVOT_W)
	gui.set_color(n, color(c or "text"))
	if parent then
		gui.set_parent(n, parent, true)
	end
	if scale then
		gui.set_scale(n, vmath.vector3(scale, scale, 1))
	end
	self.nodes[#self.nodes + 1] = n
	return n
end
function V:paragraph(x, y, value, width, c, limit)
	if self.s.panel and x >= 238 and x <= 900 then
		width = math.max(12, math.min(width, 78, math.floor((1040 - x) / 9.6)))
	end
	local lines = wrap(value, width)
	for i = 1, math.min(#lines, limit or 20) do
		self:text(x, y + (i - 1) * 22, lines[i], c, true)
	end
	return y + math.min(#lines, limit or 20) * 22
end
function V:art(x, y, w, h, name, parent)
	local n = self:box(x, y, w, h, "text", parent)
	gui.set_texture(n, "art")
	gui.play_flipbook(n, name)
	return n
end
function V:portrait(x, y, p, scale, parent)
	scale = scale or 2
	p = p or {}
	local prefix = "body_" .. (p.body or 0) .. "_" .. (p.face or 0) .. "_" .. (p.eyes or 0) .. "_"
	local outfits = { "5bbfc5", "508da0", "cd683d" }
	local skins = { "d6dad3", "b0a987", "997f73", "665964" }
	local hairs = { "443846", "7a3045", "cd683d", "fbb954", "2e222f", "997f73", "993d41", "d6dad3", "5bbfc5", "f2ec8b" }
	local eyes = { "28353e", "407080", "45293f", "fbb954", "5bbfc5", "508da0", "788a87", "997f73", "7a3045", "d6dad3" }
	local outfit = outfits[(p.race or 0) + 1] or outfits[1]
	self:art(x, y, 16 * scale, 24 * scale, prefix .. "base", parent)
	for _, layer in ipairs({
		{ "outfit", outfit },
		{ "skin", scale == 1 and outfit or skins[(p.skin or 0) + 1] },
		{ "eyes", scale == 1 and "28353e" or eyes[(p.eye_color or 0) + 1] },
	}) do
		local n = self:art(x, y, 16 * scale, 24 * scale, prefix .. layer[1], parent)
		gui.set_color(n, color(layer[2] or "28353e"))
	end
	local n = self:art(x, y, 16 * scale, 24 * scale, "hair_mask_" .. (p.hair or 0), parent)
	gui.set_color(n, color(scale == 1 and "28353e" or hairs[(p.hair_color or 0) + 1] or hairs[1]))
end
function V:button(x, y, w, label, id, args, disabled)
	local n = self:box(x + w / 2, y, w, 30, disabled and "dark" or "border")
	self:text(x + 10, y, label, disabled and "muted" or "text")
	if not disabled then
		local b = { node = n, id = id, args = args, label = label, x = x, y = y, w = w }
		self.buttons[#self.buttons + 1] = b
		self.druid:new_button(n, function()
			if type(id) == "function" then
				id()
			else
				self:dispatch(id, args)
			end
		end)
	end
	return n
end
function V:bar(x, y, w, value, c)
	self:box(x + w / 2, y, w, 6, "dark")
	local n = self:box(x, y, w, 6, c)
	gui.set_pivot(n, gui.PIVOT_W)
	gui.set_size(n, vmath.vector3(math.max(0, math.min(1, value or 0)) * w, 6, 0))
	return n
end
function V:clear()
	if self.druid then
		self.druid:final()
	end
	for i = #self.nodes, 1, -1 do
		gui.delete_node(self.nodes[i])
	end
	self.nodes = {}
	self.buttons = {}
	self.item_hits = {}
	self.slot_hits = {}
	self.gauges = {}
	self.focus_lines = nil
	self.drag_ghost = nil
	self.druid = druid.new(self.owner)
end
function V:header()
	self.coordinate_node = self:box(640, 360, 1280, 720, "back")
	self:text(24, 27, "REBIRTH DUNGEON", "gold")
	self:text(24, 53, "THE LONG WAY BELOW", "muted")
	self:text(1026, 28, "A SIGNAL IN THE STONE", "teal", false, nil, 0.75)
	self:box(640, 70, 1232, 1, "border")
end
function V:title()
	self:art(925, 312, 256, 384, "title_gate")
	self:text(116, 184, "THE DUNGEON REMEMBERS.", "gold", false, nil, 1.4)
	self:paragraph(
		116,
		242,
		"A signal flickers through the buried towns. Follow its echoes, master your skills, and discover what waits below.",
		56,
		"muted"
	)
	self:button(116, 365, 360, "[N] New character", "new_character")
	self:button(116, 410, 360, "[L] Your characters", "characters")
	self:button(116, 455, 360, "Settings", "settings")
	self:text(116, 576, "Arrow keys / WASD  ·  Enter / E to interact", "muted")
	self:text(116, 608, "Original science-fantasy roguelike", "teal", true)
end
function V:characters()
	self:text(114, 130, "CHOOSE YOUR DELVER", "gold")
	local profiles = list(self.s.profiles)
	if #profiles == 0 then
		self:paragraph(114, 205, "No characters yet. Create a delver to begin your descent.", 60, "muted")
	end
	local first = self.page * 8 + 1
	for i = first, math.min(#profiles, first + 7) do
		local p = profiles[i]
		local y = 194 + (i - first) * 47
		self:portrait(140, y, p, 1)
		self:button(170, y, 790, p.name .. "   " .. human(p.world and p.world.location), "load", { id = p.id })
	end
	self:button(114, 630, 260, "New character", "new_character")
	self:button(400, 630, 180, "Back", "title")
	self:pagination(#profiles, 8, 670)
end
function V:creation()
	local f = self.s.form or self.s.forms or {}
	self:text(116, 122, "CREATE A DELVER", "gold")
	self:portrait(940, 302, f, 8)
	self:button(116, 178, 580, (self.name_edit and "> " or "") .. "Name: " .. (f.name or "Delver"), function()
		self.name_edit = true
		self:render()
	end)
	local rows = {
		{ "race", Data.RACES },
		{ "gender", Data.GENDERS },
		{ "age" },
		{ "talent", Data.TALENTS },
		{ "body", Data.BUILDS },
		{ "hair", Data.HAIR },
		{ "hair_color", Data.HAIR_TONES },
		{ "skin", Data.SKIN_TONES },
		{ "eyes", Data.EYES },
		{ "eye_color", Data.EYE_TONES },
		{ "face", Data.FACES },
	}
	for i, row in ipairs(rows) do
		local index = f[row[1]] or 0
		local label = row[2] and row[2][index + 1] or tostring(index)
		self:button(116, 214 + i * 33, 580, human(row[1]) .. "   " .. tostring(label), "cycle_form", { field = row[1] })
	end
	self:button(785, 514, 330, "Begin descent", "create")
	self:button(785, 558, 330, "Back", "characters")
	self:paragraph(
		785,
		610,
		"Click a field to cycle it. Select the name field to type. Escape cancels editing.",
		36,
		"muted",
		3
	)
end
function V:arrival()
	self:portrait(304, 290, { body = 1, hair = 2 }, 7)
	self:text(510, 177, "THE WAKING VAULT", "gold")
	self:text(510, 226, "Ilex, keeper of the last lantern", "teal")
	self:paragraph(
		510,
		275,
		"You are awake. The dungeon has given you another chance, though it rarely explains its gifts. Find Warden Nera in Lantern Rest. Carry her signal to those still waiting beyond the Threshold.",
		60,
		"text"
	)
	self:button(510, 468, 540, "Follow the lanterns to Lantern Rest", "arrival_continue")
end
function V:character_status()
	local s = self.s
	local p = s.profile or {}
	local st = s.stats or {}
	local w = p.world or {}
	local left = 1038
	self:box(1144, 371, 240, 576, "panel")
	self:portrait(left + 21, 126, p, 2)
	local display_name = p.name or "Delver"
	if #display_name > 15 then
		display_name = require("game.util").utf8_prefix(display_name, 14) .. "…"
	end
	self:text(left + 51, 114, display_name, "gold")
	self:text(left + 51, 139, "Level " .. tostring(st.level or 1), "muted")
	local h = s.combat and s.combat.health or w.health
	if not h or h < 0 then
		h = st.life or 100
	end
	self:text(left, 180, "LIFE  " .. math.ceil(h) .. " / " .. tostring(st.life or 100))
	self.gauges.health = self:bar(left, 198, STATUS_BAR_WIDTH, h / (st.life or 100), "red")
	self:text(left, 228, "STAMINA  " .. tostring(math.floor(s.combat and s.combat.stamina or st.stamina or 40)))
	self.gauges.stamina =
		self:bar(left, 246, STATUS_BAR_WIDTH, (s.combat and s.combat.stamina or st.stamina or 40) / (st.stamina or 40), "teal")
	local y = 284
	for _, k in ipairs({ "strength", "dexterity", "intelligence", "will", "luck", "defense" }) do
		self:text(left, y, string.format("%-13s %s", human(k), tostring(st[k] or 0)))
		y = y + 26
	end
	self:text(left, 462, "AP " .. tostring(st.ability_points or 0), "teal")
	self:text(left, 493, "Gold  " .. tostring(w.gold or 0), "gold")
	self:text(left, 524, "Bank  " .. tostring(w.bank_gold or 0), "muted")
	self:box(1144, 546, STATUS_BAR_WIDTH, 1, "border")
	self:text(left, 566, "NEARBY", "gold")
	local place = s.world and s.world:interact()
	self:paragraph(
		left,
		590,
		place and (place.label or place.name or human(place.id)) or "Explore the surrounding passages.",
		22,
		"muted",
		2
	)
	self:text(left, 643, "MOVE  WASD / ARROWS", "muted", false, nil, 0.75)
end
function V:world_actions()
	local buttons = {
		{ "Inventory [I]", "inventory" },
		{ "Skills [K]", "skills" },
		{ "Journal [Q]", "quests" },
		{ "Character [C]", "character" },
		{ "Moon Gates [G]", "gates" },
		{ "Interact [E]", "interact" },
		{ "Settings", "settings" },
	}
	local gap = 8
	local step = (1248 + gap) / #buttons
	for i, row in ipairs(buttons) do
		local x = 16 + math.floor((i - 1) * step)
		local width = 16 + math.floor(i * step) - x - gap
		self:button(x, ACTION_Y, width, row[1], row[2])
	end
end
function V:map()
	local world = self.s.world
	if not world or not world.map then
		return
	end
	local map = world.map
	local p = world.player
	local view = MAP_VIEW
	local cols, rows = view.w / TILE_WIDTH, view.h / TILE_HEIGHT
	local ox = math.floor(math.max(0, math.min(p.x - math.floor(cols / 2), math.max(0, (map.width or 68) - cols))))
	local oy = math.floor(math.max(0, math.min(p.y - math.floor(rows / 2), math.max(0, (map.height or 42) - rows))))
	self.camera_target = { x = ox * TILE_WIDTH, y = oy * TILE_HEIGHT }
	if self.camera_map ~= map then
		self.camera_map = map
		self.camera_position = { x = self.camera_target.x, y = self.camera_target.y }
	end
	ox = math.floor(self.camera_position.x + 0.5) / TILE_WIDTH
	oy = math.floor(self.camera_position.y + 0.5) / TILE_HEIGHT
	self.map_view = { x = view.x, y = view.y, w = view.w, h = view.h, ox = ox, oy = oy }
	local center_x = view.x + (0.5 - ox) * TILE_WIDTH
	local center_y = view.y + (0.5 - oy) * TILE_HEIGHT
	local location_label = human(world.currentLocation)
	if world.currentLocation == "threshold" then
		location_label = (world.room or 1) <= 8 and ("Threshold · Room " .. tostring(world.room or 1) .. "/8")
			or "Treasure Chamber"
	end
	self:text(view.x, 91, location_label:upper(), "teal")
	local clip = self:box(view.x + view.w / 2, view.y + view.h / 2, view.w, view.h, "back")
	gui.set_clipping_mode(clip, gui.CLIPPING_MODE_STENCIL)
	gui.set_clipping_visible(clip, false)
	local glyphs = {}
	for yy = math.floor(oy), math.ceil(oy + rows) - 1 do
		for xx = math.floor(ox), math.ceil(ox + cols) - 1 do
			local key = xx .. "," .. yy
			local x, y = center_x + xx * TILE_WIDTH, center_y + yy * TILE_HEIGHT
			local wall = map.walls and map.walls[key]
			local floor = map.floor and map.floor[key]
			local water = map.water and map.water[key]
			local road = map.roads and map.roads[key]
			if water or wall then
				self:box(x, y, TILE_WIDTH, TILE_HEIGHT, water and "border" or "dark", clip)
			end
			if wall then
				glyphs[#glyphs + 1] = { x = x - 6, y = y, text = "#", color = "border" }
			elseif water then
				glyphs[#glyphs + 1] = { x = x - 6, y = y, text = "~", color = "water" }
			elseif floor then
				glyphs[#glyphs + 1] = { x = x - 6, y = y, text = ".", color = road and "muted" or "floor" }
			end
		end
	end
	-- Keep all terrain boxes before all terrain text. Alternating box/font per
	-- cell creates hundreds of font render batches and exhausts the renderer.
	for _, g in ipairs(glyphs) do
		self:text(g.x, g.y, g.text, g.color, false, clip)
	end
	for _, a in ipairs(list(world.landmarks)) do
		local x, y = a.x, a.y
		if not x then
			x, y = cell(a.cell)
		end
		if x and y then
			local px, py = center_x + x * TILE_WIDTH, center_y + y * TILE_HEIGHT
			if a.sprite then
				self:art(px, py, 16, 24, "town_atlas_" .. a.sprite, clip)
			elseif a.amenity_sprite then
				self:art(px, py, 16, 24, "town_amenities_" .. a.amenity_sprite, clip)
			elseif a.id == "gate" then
				self:art(px, py, 16, 24, "town_atlas_9", clip)
			elseif a.id == "tree" then
				self:art(px, py, 16, 24, "town_tree", clip)
			elseif a.portrait then
				self:portrait(px, py, a.portrait, 1, clip)
			elseif a.name then
				self:art(px, py, 16, 24, "town_atlas_1", clip)
			else
				self:text(
					px - 6,
					py,
					a.glyph
						or (
							a.id == "dungeon" and ">"
							or a.id == "chest" and "?"
							or a.id == "rack" and "+"
							or a.id == "practice" and "T"
							or "&"
						),
					"gold",
					false,
					clip
				)
			end
			if a.amenity_sprite ~= nil then
				-- Center short lines over each workstation; the six-tile spacing
				-- cannot fit adjacent left-aligned "Spinning Wheel" labels.
				local lines = wrap(a.label or a.name, 10)
				for i, line in ipairs(lines) do
					local caption = self:text(px, py - 21 - (#lines - i) * 14, line, "muted", false, clip, 0.75)
					gui.set_pivot(caption, gui.PIVOT_CENTER)
				end
			elseif a.name then
				self:text(px - 12, py - 21, a.name, "muted", false, clip, 0.75)
			end
		end
	end
	for _, e in ipairs(list(world.enemies)) do
		self:art(center_x + e.x * TILE_WIDTH, center_y + e.y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT, "spider_atlas_" .. tostring(e.sprite or 0), clip)
	end
	self:portrait(center_x + p.x * TILE_WIDTH, center_y + p.y * TILE_HEIGHT, self.s.profile, 1, clip)
end
function V:logs()
	local logs = list(self.s.log)
	local first = math.max(1, #logs - 4)
	self:text(MAP_VIEW.x, 580, "CHRONICLE", "gold")
	for i = first, #logs do
		local value = logs[i]
		if type(value) == "table" then
			value = value.message
		end
		local line = wrap(value, 100)[1]
		self:text(MAP_VIEW.x, 600 + (i - first) * 16, line, "muted", true, nil, 0.9)
	end
end
function V:battle()
	local c = self.s.combat
	if not c or not c.active then
		return
	end
	local left = MAP_VIEW.x + 20
	self:box(MAP_VIEW.x + MAP_VIEW.w / 2, 362, MAP_VIEW.w, 402, "dark")
	self:text(left, 184, "READ THE INTENT. CHOOSE YOUR COUNTER.", "gold")
	for i, e in ipairs(c.enemies or {}) do
		local x = left + 15 + (i - 1) * 228
		self:art(x + 50, 274, 48, 72, "spider_atlas_" .. tostring((e.stats or {}).sprite or 0))
		self:button(
			x - 4,
			331,
			212,
			(c.target == i and "> " or "") .. ((e.stats or {}).name or "Enemy"),
			"target",
			{ index = i },
			e.health <= 0
		)
		self:text(x, 366, human(e.intent), "gold")
		self:text(x, 389, "Life " .. tostring(e.health), "muted")
		self.gauges["enemy" .. i] = self:bar(x, 410, 150, e.gauge, "gold")
	end
	self:text(
		left,
		452,
		"TIME  " .. (c.queued_action and ("Queued: " .. human(c.queued_action)) or "Choose an attack or skill"),
		"teal"
	)
	self.gauges.time = self:bar(left, 475, TIME_BAR_WIDTH, c.player_gauge, "teal")
	self:paragraph(left, 506, "Attack interrupts Smash. Defend softens Attack. Smash breaks Defend.", 80, "muted", 2)
	local action_x = left
	local action_widths = { 152, 152, 152, 172, 152, 132 }
	for i, a in ipairs({ "attack", "defend", "smash", "counterattack", "windmill", "tonic" }) do
		local disabled
		if a == "tonic" then
			disabled = (self.s.profile.world.tonics or 0) < 1 or c.health >= c.max_health
		else
			disabled = c.allowed and not c:allowed(a) or false
		end
		self:button(action_x, 540, action_widths[i], i .. " " .. human(a), a, nil, disabled)
		action_x = action_x + action_widths[i] + 8
	end
end
function V:pagination(count, size, y)
	local pages = math.max(1, math.ceil(count / size))
	self.pages = pages
	self.page = math.min(self.page, pages - 1)
	self:button(824, y, 92, "< Prev", function()
		self.page = math.max(0, self.page - 1)
		self:render()
	end, nil, self.page == 0)
	self:text(928, y, tostring(self.page + 1) .. "/" .. pages, "muted")
	self:button(982, y, 92, "Next >", function()
		self.page = math.min(pages - 1, self.page + 1)
		self:render()
	end, nil, self.page >= pages - 1)
end
function V:item_icon(x, y, item, scale)
	local anim
	if item.family == "shop" or item.slot then
		anim = "item_" .. item.id
	end
	if item.sprite then
		anim = "sword_atlas_" .. item.sprite
	end
	if item.id == "gold" or item.id == "cobweb" or item.id:find("gold_pouch", 1, true) then
		anim = item.id
	end
	if anim then
		self:art(x, y, 16 * (scale or 1), 24 * (scale or 1), anim)
	else
		self:text(x - 4, y, "?", "gold")
	end
end
function V:inventory_description(item)
	local lines = { item.name or human(item.id) }
	if item.count then
		lines[#lines + 1] = "Quantity " .. item.count .. (item.capacity and ("/" .. item.capacity) or "")
	end
	if item.damage_min then
		lines[#lines + 1] = "Damage " .. item.damage_min .. "–" .. item.damage_max
	end
	if item.hands then
		lines[#lines + 1] = item.hands == 2 and "Two hands" or "One hand"
	end
	if item.defense then
		lines[#lines + 1] = "Defense +" .. item.defense
	end
	if item.protection then
		lines[#lines + 1] = "Protection " .. item.protection
	end
	if item.family or item.max_durability then
		local current = Equipment.current(self.s.profile.world, item)
		lines[#lines + 1] = "Durability " .. current .. "/" .. Equipment.maximum(item) .. (current == 0 and " · Broken" or "")
	end
	if item.width then
		lines[#lines + 1] = item.width .. "×" .. (item.height or 1) .. " cells"
	end
	if item.description and item.description ~= "" then
		lines[#lines + 1] = item.description
	end
	return table.concat(lines, "\n")
end
function V:inventory_tooltip()
	if self.s.panel ~= "inventory" or self.drag then
		return
	end
	local grid = self.inventory_view
	local item = self.hover_cell and self:item_at(
		grid.x + self.hover_cell.x * grid.unit + 1,
		grid.y + self.hover_cell.y * grid.unit + 1
	)
	local focused = self.buttons[self.focus]
	local text
	for _, slot in ipairs(self.slot_hits) do
		if slot.slot == self.hover_slot or (not item and self.inventory_buttons and focused and focused.args
			and slot.slot == focused.args.slot) then
			text = slot.item and self:inventory_description(slot.item) or slot.status
			break
		end
	end
	local x = text and 258 or 636
	if not text and (item or self.selected_item) then
		text = self:inventory_description(item or self.selected_item)
	end
	if not text then
		return
	end
	local lines = wrap(text, 38)
	local count = math.min(#lines, 12)
	local width, height = 350, 18 + count * 22
	self:box(x + width / 2, 180 + height / 2, width, height, "dark")
	for i = 1, count do
		self:text(x + 10, 200 + (i - 1) * 22, lines[i], "text", true, nil, 0.85)
	end
end
function V:inventory_panel()
	local inv = self.s.inventory
	if not inv then
		return
	end
	local gx, gy, unit = 256, 178, 43
	self.inventory_view = { x = gx, y = gy, unit = unit }
	for yy = 0, 6 do
		for xx = 0, 7 do
			self:box(gx + xx * unit + unit / 2, gy + yy * unit + unit / 2, unit - 2, unit - 2, "back")
		end
	end
	local items = inv:items()
	for _, v in ipairs(inv:stack_items()) do
		local def = inv.defs[v.id]
		v.width, v.height = def and def.width or 1, def and def.height or 1
		items[#items + 1] = v
	end
	for _, item in ipairs(items) do
		local x, y = cell(item.cell)
		if x and y then
			local width, height = item.width or 1, item.height or 1
			local px, py = gx + x * unit, gy + y * unit
			self:box(px + width * unit / 2, py + height * unit / 2, width * unit - 3, height * unit - 3, "border")
			self:item_icon(px + width * unit / 2, py + height * unit / 2, item, math.min(2, height))
			if item.count then
				self:text(px + 3, py + height * unit - 8, item.count, "gold", false, nil, 0.65)
			end
			self.item_hits[#self.item_hits + 1] = { x = px, y = py, w = width * unit, h = height * unit, item = item }
		end
	end
	self:box(gx + self.cursor.x * unit + unit / 2, gy + self.cursor.y * unit + unit / 2, unit - 4, 2, "gold")
	local serial = inv:serialize()
	local main_hand = inv.defs[serial.equipped]
	local world = self.s.profile.world
	self:text(634, 176, "EQUIPMENT", "gold")
	self:button(833, 165, 215, "Materials & supplies", "panel", { name = "supplies" })
	local slots = { "main_hand", "off_hand", "armor", "headgear", "gloves", "shoes", "accessory_1", "accessory_2" }
	for i, slot in ipairs(slots) do
		local id = slot == "main_hand" and serial.equipped or (serial.slots or {})[slot]
		local item = inv.defs[id]
		if not item and slot == "armor" and world.armor_owned then
			item = Equipment.ARMOR
		end
		local two_handed = slot == "off_hand" and main_hand and main_hand.hands == 2
		local y = 207 + (i - 1) * 34
		self:button(
			634,
			y,
			414,
			human(slot) .. "  " .. (item and (item.name or human(item.id)) or two_handed and "2H" or "—"),
			"unequip",
			{ slot = slot },
			not id or id == ""
		)
		self.slot_hits[#self.slot_hits + 1] = {
			x = 634, y = y - 15, w = 414, h = 30, slot = slot, item = item,
			status = two_handed and "Occupied by a two-handed weapon" or (human(slot) .. " is empty"),
		}
	end
	local selected = self.selected_item
	self:paragraph(
		256,
		496,
			selected and ((selected.name or human(selected.id)) .. " · Enter to move. E to equip.")
				or "Arrow keys move the grid cursor. Enter picks up or places an item. E equips. Tab focuses buttons.",
		90,
		"muted",
		2
	)
	local slots = self.s.profile.world.quick_slots or {}
	for i = 1, 4 do
		local index = i
		local occupied = slots[i] == "tonic"
		self:button(
			256 + (i - 1) * 199,
			559,
			188,
			"F" .. i .. " " .. (occupied and "Tonic" or "Assign tonic"),
			"quick_slot",
			{ index = index, item = occupied and "" or "tonic" }
		)
	end
	self:button(256, 598, 235, "Use tonic ×" .. world.tonics, "tonic", nil, world.tonics == 0)
	self:button(511, 598, 240, "Claim pending loot", "take_loot")
	self:button(
		771,
		598,
		267,
		"Drop selected item",
		"inventory_drop",
		{ id = selected and selected.id },
		not selected or selected.count ~= nil
	)
end
function V:supplies_panel()
	local world = self.s.profile.world
	local balances = {}
	for _, item in ipairs(self.s.inventory:stack_items()) do
		local kind = item.id:find("gold", 1, true) and "gold" or item.id
		balances[kind] = (balances[kind] or 0) + (item.count or 0)
	end
	local rows = { "Healing Tonic ×" .. world.tonics }
	for _, id in ipairs({ "firewood", "fish", "grain", "flour", "fiber", "thread", "cloth" }) do
		local count = world.town_materials[id] or 0
		if count > 0 then
			rows[#rows + 1] = human(id) .. " ×" .. count
		end
	end
	for id, count in pairs(world.shop_supplies) do
		if count > 0 then
			rows[#rows + 1] = human(id) .. " ×" .. count
		end
	end
	for _, id in ipairs({ "gold", "cobweb" }) do
		local quantity = id == "gold" and world.gold or world.town_materials.cobweb
		local overflow = (quantity or 0) - (balances[id] or 0)
		if overflow > 0 then
			rows[#rows + 1] = human(id) .. " ×" .. overflow .. " awaiting bag space"
		end
	end
	table.sort(rows)
	local first = self.page * 8 + 1
	for i = first, math.min(#rows, first + 7) do
		self:text(256, 186 + (i - first) * 41, rows[i])
	end
	self:button(256, 554, 235, "Back to inventory", "inventory")
	self:pagination(#rows, 8, 606)
end
function V:skills_panel()
	if self.skill_detail then
		local e = self.skill_detail
		for _, entry in ipairs(self.s.skills or {}) do
			if entry.id == e.id then
				e = entry
				self.skill_detail = entry
			end
		end
		if self.skill_detail_id ~= e.id then
			self.skill_task_page = 0
			self.skill_detail_id = e.id
		end
		self:text(256, 182, e.name .. "  " .. tostring(e.rank or ""), "teal")
		self:button(877, 181, 164, "All skills", function()
			self.skill_detail = nil
			self:render()
		end)
		local y = self:paragraph(256, 226, e.description or "", 78, "muted", 3) + 20
		self:text(256, y, "TRAINING", "gold")
		y = y + 32
		local tasks = e.training or {}
		local pages = math.max(1, math.ceil(#tasks / 3))
		self.skill_task_page = math.min(self.skill_task_page or 0, pages - 1)
		local first = self.skill_task_page * 3 + 1
		for i = first, math.min(#tasks, first + 2) do
			local task = tasks[i]
			local line = (task.description or "")
				.. "  "
				.. tostring(task.count or 0)
				.. " / "
				.. tostring(task.target or 0)
			y = self:paragraph(256, y, line, 78, "text", 2) + 8
		end
		if #tasks == 0 then
			self:text(256, y, "No active training at this rank.", "muted")
		end
		self:button(256, 522, 125, "< Previous", function()
			self.skill_task_page = math.max(0, self.skill_task_page - 1)
			self:render()
		end, nil, self.skill_task_page == 0)
		self:button(395, 522, 125, "Next >", function()
			self.skill_task_page = math.min(pages - 1, self.skill_task_page + 1)
			self:render()
		end, nil, self.skill_task_page >= pages - 1)
		self:text(548, 522, "Training " .. (self.skill_task_page + 1) .. " / " .. pages, "muted")
		self:button(
			256,
			597,
			235,
			"Rank up · " .. tostring(e.ap_cost or 0) .. " AP",
			"skill_advance",
			{ id = e.id },
			not e.can_advance
		)
		self:button(
			511,
			597,
			235,
			"Learn · " .. tostring(e.learn_cost or 0) .. " AP",
			"skill_learn",
			{ id = e.id },
			not e.can_learn
		)
		self:button(766, 597, 274, "Study lesson", "skill_study", { id = e.id }, not e.can_study)
		if e.locked_reason and e.locked_reason ~= "" then
			self:paragraph(256, 550, e.locked_reason, 78, "gold", 2)
		end
		return
	end
	local skills = list(self.s.skills)
	local first = self.page * 7 + 1
	for i = first, math.min(#skills, first + 6) do
		local e = skills[i]
		local y = 184 + (i - first) * 55
		self:art(267, y, 24, 36, "skill_" .. e.id)
		self:text(292, y - 9, e.name .. "  " .. tostring(e.rank or ""), "text")
		self:text(
			292,
			y + 13,
			string.format(
				"Training %s / %s  ·  AP %s",
				e.training_points or 0,
				e.training_required or 0,
				e.ap_cost or 0
			),
			"muted",
			false,
			nil,
			0.75
		)
		self:button(730, y, 97, "Rank up", "skill_advance", { id = e.id }, not e.can_advance)
		self:button(836, y, 90, "Learn", "skill_learn", { id = e.id }, not e.can_learn)
		self:button(935, y, 97, "Study", "skill_study", { id = e.id }, not e.can_study)
	end
	self:pagination(#skills, 7, 601)
end
function V:shop_panel()
	local rows = {}
	local source = self.s.shoprows or Catalog.shop().categories
	for _, cat in ipairs(source) do
		if cat.items then
			for _, item in ipairs(cat.items) do
				rows[#rows + 1] = item
			end
		else
			rows[#rows + 1] = cat
		end
	end
	local first = self.page * 8 + 1
	for i = first, math.min(#rows, first + 7) do
		local item = rows[i]
		local y = 176 + (i - first) * 48
		self:item_icon(269, y, item, 1)
		self:text(291, y - 8, item.name or human(item.id))
		self:text(
			291,
			y + 13,
			(item.description or human(item.slot)) .. "  " .. tostring(item.price or 0) .. " gold",
			"muted",
			false,
			nil,
			0.75
		)
		self:button(881, y, 155, "Buy", "buy", { id = item.id }, (self.s.profile.world.gold or 0) < (item.price or 0))
	end
	self:pagination(#rows, 8, 601)
end
function V:armory_panel()
	local rows = {}
	local query = (self.armory_query or ""):match("^%s*(.-)%s*$"):lower()
	for _, item in ipairs(self.s.armory_rows or Catalog.swords()) do
		if (item.name or item.id):lower():find(query, 1, true) then
			rows[#rows + 1] = item
		end
	end
	self:button(256, 163, 785, "Search swords  " .. (self.armory_query or "") .. (self.armory_edit and "_" or ""), function()
		self.armory_edit = true
		self:render()
	end)
	local inv = self.s.inventory
	local gear = inv and inv:serialize() or { placements = {}, slots = {} }
	local first = self.page * 6 + 1
	for i = first, math.min(#rows, first + 5) do
		local item = rows[i]
		local y = 205 + (i - first) * 51
		local owned = gear.placements[item.id] ~= nil or gear.equipped == item.id
		for _, id in pairs(gear.slots or {}) do
			if id == item.id then
				owned = true
			end
		end
		self:item_icon(270, y, item, 1)
		self:button(292, y - 7, 345, item.name, function()
			self.selected_sword = item
			self:render()
		end)
		self:text(
			302,
			y + 16,
			tostring(item.damage_min)
				.. "–"
				.. tostring(item.damage_max)
				.. " damage · "
				.. (item.hands == 2 and "Two hands" or "One hand"),
			"muted",
			false,
			nil,
			0.75
		)
		self:button(651, y, 112, "Take", "take_sword", { id = item.id }, owned)
		self:button(776, y, 116, "Return", "return_sword", { id = item.id }, not owned)
		self:button(905, y, 134, "Equip", "equip", { id = item.id }, not gear.placements[item.id])
	end
	if #rows == 0 then
		self:text(256, 215, "No matching swords.", "muted")
	end
	local selected = self.selected_sword
	self:paragraph(
		256,
		502,
		selected and selected.description
			or "The racks hold blades left by earlier delvers. Take a weapon only if it fits in your satchel. Return unwanted blades to make room.",
		86,
		"muted",
		3
	)
	self:pagination(#rows, 6, 607)
end
function V:journal_panel()
	local w = self.s.profile.world
	local q = w.quest or 0
	self:text(256, 181, "A SIGNAL THROUGH THE THRESHOLD", "teal")
	local descriptions = {
		"Speak to Warden Nera in Lantern Rest.",
		"Carry Lantern Rest’s signal through the Threshold to Watchkeeper Oren in Spindle Hollow.",
		"Speak to Watchkeeper Oren in Spindle Hollow to receive your reward.",
		"The signal has reached Spindle Hollow. Two settlements remember the road again.",
	}
	self:paragraph(256, 224, descriptions[q + 1] or descriptions[1], 83, "text")
	self:text(256, 339, "THRESHOLD", "gold")
	self:text(256, 378, "Cleared rooms: " .. tostring(w.threshold_cleared or 0) .. " / 8")
	self:text(256, 414, "Treasure claimed: " .. tostring(w.threshold_treasure_claimed or false))
	self:text(256, 475, "REGISTERED MOON GATES", "gold")
	self:paragraph(256, 512, table.concat(w.gates or {}, ", "), 84, "teal")
end
function V:character_panel()
	local p = self.s.profile
	local st = self.s.stats
	self:portrait(323, 297, p, 5)
	self:text(431, 181, p.name, "gold")
	self:text(431, 218, (Data.RACES or {})[(p.race or 0) + 1] or "Human")
	self:text(
		431,
		253,
		"Age " .. p.age .. "  ·  " .. ((Data.TALENTS or {})[(p.talent or 0) + 1] or "Close Combat"),
		"teal"
	)
	local keys = {
		"damage_min",
		"damage_max",
		"balance",
		"critical",
		"defense",
		"protection",
		"magic_attack",
		"magic_defense",
		"armor_pierce",
		"ability_points",
	}
	for i, k in ipairs(keys) do
		local x = 431 + math.floor((i - 1) / 5) * 290
		local y = 310 + ((i - 1) % 5) * 43
		self:text(x, y, human(k), "muted")
		self:text(x + 190, y, string.format("%.1f", st[k] or 0))
	end
end
function V:gates_panel()
	local w = self.s.profile.world
	self:paragraph(
		256,
		180,
		"Moon Gates remember the settlements you have awakened. Register each gate in person. Once remembered, travel is available at any time.",
		84,
		"muted"
	)
	self:button(256, 309, 750, "Register the nearby gate", "gate_register")
	for i, town in ipairs({ "lantern_rest", "spindle_hollow" }) do
		self:button(256, 361 + i * 50, 750, "Travel to " .. human(town), "gate_travel", { town = town })
	end
end
function V:bindings_panel()
	self:text(256, 182, "KEYBOARD CONTROLS", "teal")
	self:button(865, 181, 175, "Audio", function()
		self.binding_mode = false
		self.page = 0
		self:render()
	end)
	local rows = self.s.input and self.s.input.bindings and self.s.input:bindings() or {}
	local first = self.page * 7 + 1
	for i = first, math.min(#rows, first + 6) do
		local row = rows[i]
		local y = 236 + (i - first) * 44
		self:text(256, y, row.label or human(row.command))
		self:button(
			729,
			y,
			310,
			tostring(row.key or "Unbound"):gsub("^key_", ""):gsub("_", " "):upper(),
			"rebind",
			{ command = row.command }
		)
	end
	if self.s.pending_binding then
		local pending = self.s.pending_binding
		if type(pending) == "table" then
			pending = pending.label or pending.command
		end
		self:paragraph(256, 556, "Press a new key for " .. human(pending) .. ". Escape cancels.", 80, "gold", 2)
	else
		self:paragraph(
			256,
			556,
			"Select a control, then press its new key. Bindings are saved for your next journey.",
			80,
			"muted",
			2
		)
	end
	self:pagination(#rows, 7, 607)
end
function V:settings_panel()
	if self.binding_mode then
		self:bindings_panel()
		return
	end
	local settings = self.s.settings or self.s.audio or { master = 1, music = 1, effects = 1 }
	for i, key in ipairs({ "master", "music", "effects" }) do
		local y = 200 + (i - 1) * 65
		local v = settings[key] or 1
		self:text(256, y, human(key) .. "   " .. math.floor(v * 100) .. "%")
		self:button(630, y, 100, "−", "setting", { key = key, value = math.max(0, v - 0.1) })
		self:button(746, y, 100, "+", "setting", { key = key, value = math.min(1, v + 0.1) })
	end
	self:button(256, 383, 785, "Keyboard bindings", function()
		self.binding_mode = true
		self.page = 0
		self:render()
	end)
	self:paragraph(
		256,
		429,
		"Move: arrows / WASD. Interact: E or Enter. Inventory: I. Skills: K. Journal: Q. Character: C. Gates: G. Combat: 1–5. Tonic: 6. Tab: focus next control. Shift-Tab: previous. Escape: close.",
		82,
		"muted"
	)
end
function V:repair_panel()
	local inv = self.s.inventory
	if not inv then
		return
	end
	local items = inv:items()
	local serial = inv:serialize()
	local defs = Catalog.items()
	if serial.equipped and serial.equipped ~= "" then
		items[#items + 1] = defs[serial.equipped]
	end
	for _, id in pairs(serial.slots or {}) do
		if defs[id] then
			items[#items + 1] = defs[id]
		end
	end
	for i, item in ipairs(items) do
		if i <= 8 then
			local y = 185 + (i - 1) * 48
			self:text(256, y, item.name or human(item.id))
			self:button(701, y, 150, "Repair 1 point", "repair", { id = item.id, full = false })
			self:button(867, y, 166, "Full repair", "repair", { id = item.id, full = true })
		end
	end
end
function V:modal_panel()
	local modal = self.s.modal or {}
	self:text(256, 178, modal.title or "", "teal")
	local y = self:paragraph(256, 220, modal.body or "", 84, "text", 7) + 24
	for i, option in ipairs(modal.options or {}) do
		if i <= 8 then
			self:button(
				256,
				y + (i - 1) * 37,
				785,
				option.label or human(option.id),
				option.id,
				option.params,
				option.disabled
			)
		end
	end
end
function V:panel()
	local panel = self.s.panel
	if not panel then
		return
	end
	self.buttons = {}
	local shade = self:box(640, 360, 1280, 720, "back")
	gui.set_alpha(shade, 0.72)
	self.druid:new_blocker(shade)
	self:box(640, 366, 870, 526, "border")
	self:box(640, 366, 868, 524, "panel")
	self:text(238, 129, human(panel):upper(), "gold")
	self:button(988, 129, 70, "Close", "close")
	if self.s.modal then
		self:modal_panel()
	elseif panel == "inventory" then
		self:inventory_panel()
	elseif panel == "supplies" then
		self:supplies_panel()
	elseif panel == "skills" then
		self:skills_panel()
	elseif panel == "quests" then
		self:journal_panel()
	elseif panel == "shop" then
		self:shop_panel()
	elseif panel == "armory" then
		self:armory_panel()
	elseif panel == "character" then
		self:character_panel()
	elseif panel == "gates" then
		self:gates_panel()
	elseif panel == "settings" then
		self:settings_panel()
	elseif panel == "repair" then
		self:repair_panel()
	elseif panel == "loot" then
		self:text(256, 185, "SPOILS OF THE ENCOUNTER", "teal")
		local y = 240
		for id, count in pairs(self.s.profile.world.pending_loot or {}) do
			self:text(256, y, human(id) .. "  × " .. count)
			y = y + 38
		end
		self:paragraph(
			256,
			440,
			"Items that do not fit remain here until you make room. Leaving discards the remaining loot.",
			82,
			"muted",
			3
		)
		self:button(256, 555, 365, "Take all that fits", "take_loot")
		self:button(645, 555, 390, "Leave remaining loot", "leave_loot")
	else
		self:paragraph(256, 187, self.s.message or "Choose an action below.", 84, "muted")
	end
	if self.s.message then
		self:paragraph(238, 642, self.s.message, 80, "gold", 2)
	end
end
function V:render()
	local screen = self.s.screen
	local panel = self.s.panel
	if self.previous_panel ~= panel or self.previous_screen ~= screen then
		self.page = 0
		self.focus = 1
		self.previous_panel = panel
		self.previous_screen = screen
		self.skill_detail = nil
		self.armory_query, self.armory_edit, self.selected_sword = nil, nil, nil
		self.hover_cell, self.hover_slot, self.inventory_buttons = nil, nil, nil
		self.selected_item, self.held, self.drag, self.drag_pointer = nil, nil, nil, nil
	end
	self:clear()
	self:header()
	if screen == "title" then
		self:title()
	elseif screen == "characters" then
		self:characters()
	elseif screen == "creation" then
		self:creation()
	elseif screen == "arrival" then
		self:arrival()
	else
		self:character_status()
		self:map()
		self:logs()
		self:world_actions()
		self:battle()
	end
	self:panel()
	if self.s.message and not self.s.panel and screen ~= "world" then
		self:paragraph(116, 665, self.s.message, 105, "gold", 2)
	end
	self.revision = self.s.revision
	self:highlight()
	self:inventory_tooltip()
	if self.drag_pointer then
		self.drag_ghost = self:box(self.drag_pointer.x, self.drag_pointer.y, 30, 42, "teal")
		gui.set_alpha(self.drag_ghost, 0.5)
	end
end
function V:highlight()
	self.focus = math.max(1, math.min(self.focus, #self.buttons))
	for i, b in ipairs(self.buttons) do
		gui.set_color(b.node, color(i == self.focus and "back" or "border"))
	end
	local focused = self.buttons[self.focus]
	if not focused then
		return
	end
	if not self.focus_lines then
		self.focus_lines = {}
		for i = 1, 4 do
			self.focus_lines[i] = self:box(0, 0, 1, 1, "teal")
		end
	end
	local lines = {
		{ focused.x + focused.w / 2, focused.y - 15, focused.w, 2 },
		{ focused.x + focused.w / 2, focused.y + 15, focused.w, 2 },
		{ focused.x, focused.y, 2, 30 },
		{ focused.x + focused.w, focused.y, 2, 30 },
	}
	for i, line in ipairs(lines) do
		gui.set_position(self.focus_lines[i], vmath.vector3(line[1], 720 - line[2], 0))
		gui.set_size(self.focus_lines[i], vmath.vector3(line[3], line[4], 0))
	end
end
function V:update(dt)
	local camera_moved = false
	if self.camera_position and self.camera_target and self.s.screen == "world" then
		local amount = 1 - math.exp(-math.max(0, dt) / 0.12)
		for _, axis in ipairs({ "x", "y" }) do
			local previous = self.camera_position[axis]
			local target = self.camera_target[axis]
			local value = previous + (target - previous) * amount
			if math.abs(target - value) < 0.01 then
				value = target
			end
			self.camera_position[axis] = value
			camera_moved = camera_moved or math.floor(previous + 0.5) ~= math.floor(value + 0.5)
		end
	end
	if self.revision ~= self.s.revision or camera_moved then
		self:render()
	end
	if self.druid then
		self.druid:update(dt)
	end
	local c = self.s.combat
	if c and c.active then
		if self.gauges.time then
			gui.set_size(self.gauges.time, vmath.vector3(c.player_gauge * TIME_BAR_WIDTH, 6, 0))
		end
		if self.gauges.health then
			gui.set_size(self.gauges.health, vmath.vector3(c.health / c.max_health * STATUS_BAR_WIDTH, 6, 0))
		end
		if self.gauges.stamina then
			gui.set_size(self.gauges.stamina, vmath.vector3(c.stamina / c.max_stamina * STATUS_BAR_WIDTH, 6, 0))
		end
		for i, e in ipairs(c.enemies) do
			local n = self.gauges["enemy" .. i]
			if n then
				gui.set_size(n, vmath.vector3(e.gauge * 150, 6, 0))
			end
		end
	end
end
local function inside(x, y, r)
	return x >= r.x and x < r.x + r.w and y >= r.y and y < r.y + r.h
end
function V:pointer(action)
	if action.screen_x and action.screen_y and self.coordinate_node then
		local point = gui.screen_to_local(self.coordinate_node, vmath.vector3(action.screen_x, action.screen_y, 0))
		return point.x, 720 - point.y
	end
	return action.x, 720 - action.y
end

function V:item_at(x, y)
	for _, r in ipairs(self.item_hits) do
		if inside(x, y, r) then
			return r.item
		end
	end
end
function V:inventory_input(id, a)
	local g = self.inventory_view
	if not g then
		return false
	end
	if id == nil and a.x and a.y and not self.drag then
		local x, y = self:pointer(a)
		local item, slot = self:item_at(x, y), nil
		for _, r in ipairs(self.slot_hits) do
			if inside(x, y, r) then
				slot = r.slot
				break
			end
		end
		local item_x, item_y = cell(item and item.cell)
		local old_x, old_y = cell(self.hover_cell)
		if item_x ~= old_x or item_y ~= old_y or slot ~= self.hover_slot then
			self.hover_cell = item and { x = item_x, y = item_y }
			self.hover_slot = slot
			self:render()
		end
	end
	if id == hash("touch") then
		local x, y = self:pointer(a)
		if a.pressed then
			self.drag = self:item_at(x, y)
			if self.drag then
				self.selected_item = self.drag
				self.drag_pointer = { x = x, y = y }
				self:render()
				return true
			end
		elseif a.released and self.drag then
			local item = self.drag
			self.drag = nil
			self.drag_pointer = nil
			if self.drag_ghost then
				gui.set_enabled(self.drag_ghost, false)
				self.drag_ghost = nil
			end
			for _, r in ipairs(self.slot_hits) do
				if inside(x, y, r) then
					self:dispatch("equip", { id = item.id, slot = r.slot })
					return true
				end
			end
			if inside(x, y, { x = g.x, y = g.y, w = 8 * g.unit, h = 7 * g.unit }) then
				local xx, yy = math.floor((x - g.x) / g.unit), math.floor((y - g.y) / g.unit)
				if item.count then
					self:dispatch("stack_move", { from = { item.cell[1], item.cell[2] }, to = { xx, yy } })
				else
					self:dispatch("inventory_move", { id = item.id, x = xx, y = yy })
				end
				return true
			end
			self:render()
			return true
		end
	end
	if self.drag_ghost and a.x and a.y then
		local px, py = self:pointer(a)
		self.drag_pointer.x, self.drag_pointer.y = px, py
		gui.set_position(self.drag_ghost, vmath.vector3(px, 720 - py, 0))
	end
	if not (a.pressed or a.repeated) then
		return false
	end
	for name, d in pairs({ key_left = { -1, 0 }, key_right = { 1, 0 }, key_up = { 0, -1 }, key_down = { 0, 1 } }) do
		if id == hash(name) then
			self.inventory_buttons = false
			self.hover_cell, self.hover_slot = nil, nil
			self.cursor.x = math.max(0, math.min(7, self.cursor.x + d[1]))
			self.cursor.y = math.max(0, math.min(6, self.cursor.y + d[2]))
			self.selected_item = self.held or self:item_at(g.x + self.cursor.x * g.unit + 1, g.y + self.cursor.y * g.unit + 1)
			self:render()
			return true
		end
	end
	if id == hash("key_esc") and self.held then
		self.held = nil
		self.selected_item = nil
		self:render()
		return true
	end
	if (id == hash("key_delete") or id == hash("key_del")) and self.selected_item and not self.selected_item.count then
		self:dispatch("inventory_drop", { id = self.selected_item.id })
		return true
	end
	if id == hash("key_enter") and not self.inventory_buttons then
		if self.held then
			local item = self.held
			self.held = nil
			if item.count then
				self:dispatch(
					"stack_move",
					{ from = { item.cell[1], item.cell[2] }, to = { self.cursor.x, self.cursor.y } }
				)
			else
				self:dispatch("inventory_move", { id = item.id, x = self.cursor.x, y = self.cursor.y })
			end
		else
			self.held = self:item_at(g.x + self.cursor.x * g.unit + 1, g.y + self.cursor.y * g.unit + 1)
			self.selected_item = self.held
			self:render()
		end
		return true
	elseif id == hash("key_e") then
		local item = self.held or self.selected_item
		if item then
			self:dispatch("equip", { id = item.id })
			self.held = nil
		end
		return true
	end
	return false
end
function V:on_input(id, a)
	if self.armory_edit and self.s.panel == "armory" then
		if id == hash("text") and a.text then
			self.armory_query = (self.armory_query or "") .. a.text
		elseif id == hash("key_backspace") and (a.pressed or a.repeated) then
			self.armory_query = (self.armory_query or ""):gsub("[%z\1-\127\194-\244][\128-\191]*$", "")
		elseif (id == hash("key_enter") or id == hash("key_esc")) and a.pressed then
			self.armory_edit = false
		else
			return true
		end
		self.page = 0
		self:render()
		return true
	end
	if self.s.pending_binding then
		return false
	end
	if id == hash("key_lshift") then
		self.shift = a.pressed or not a.released
		return true
	end
	if self.name_edit and self.s.screen == "creation" then
		local f = self.s.form or self.s.forms
		if id == hash("text") and a.text then
			f.name = (f.name or "") .. a.text
			self.s.revision = (self.s.revision or 0) + 1
			return true
		end
		if id == hash("key_backspace") and (a.pressed or a.repeated) then
			f.name = (f.name or ""):gsub("[\128-\191]*$", ""):sub(1, -2)
			self.s.revision = (self.s.revision or 0) + 1
			return true
		end
		if id == hash("key_enter") or id == hash("key_esc") then
			if a.pressed then
				self.name_edit = false
				self:render()
			end
			return true
		end
	end
	if self.s.panel == "inventory" and self:inventory_input(id, a) then
		return true
	end
	if id == hash("key_tab") and a.pressed then
		self.focus = ((self.focus - 1 + (self.shift and -1 or 1)) % math.max(1, #self.buttons)) + 1
		self.inventory_buttons = true
		self.hover_cell, self.hover_slot = nil, nil
		self:render()
		return true
	end
	if id == hash("key_enter") and a.pressed and (self.s.panel or self.s.screen ~= "world") then
		local b = self.buttons[self.focus]
		if b then
			if type(b.id) == "function" then
				b.id()
			else
				self:dispatch(b.id, b.args)
			end
		end
		return true
	end
	if self.druid and self.druid:on_input(id, a) then
		return true
	end
	if not (a.pressed or a.repeated) then
		return false
	end
	if id == hash("key_esc") then
		self:dispatch("close")
		return true
	end
	if self.s.panel then
		if id == hash("mouse_wheel_down") then
			self.page = math.min((self.pages or 1) - 1, self.page + 1)
			self:render()
		elseif id == hash("mouse_wheel_up") then
			self.page = math.max(0, self.page - 1)
			self:render()
		end
		return true
	end
	if self.s.screen == "title" then
		if id == hash("key_n") then
			self:dispatch("new_character")
		elseif id == hash("key_l") then
			self:dispatch("characters")
		end
		return true
	end
	for i = 1, 4 do
		if id == hash("key_f" .. i) then
			if self.s.profile and (self.s.profile.world.quick_slots or {})[i] == "tonic" then
				self:dispatch("tonic")
			end
			return true
		end
	end
	local keys = {
		key_i = "inventory",
		key_k = "skills",
		key_q = "quests",
		key_c = "character",
		key_g = "gates",
		key_e = "interact",
		key_enter = "interact",
		key_1 = "attack",
		key_2 = "defend",
		key_3 = "smash",
		key_4 = "counterattack",
		key_5 = "windmill",
		key_6 = "tonic",
	}
	for name, command in pairs(keys) do
		if id == hash(name) then
			self:dispatch(command)
			return true
		end
	end
	for name, d in pairs({
		key_up = { 0, -1 },
		key_w = { 0, -1 },
		key_down = { 0, 1 },
		key_s = { 0, 1 },
		key_left = { -1, 0 },
		key_a = { -1, 0 },
		key_right = { 1, 0 },
		key_d = { 1, 0 },
	}) do
		if id == hash(name) then
			self:dispatch("move", { dx = d[1], dy = d[2] })
			return true
		end
	end
	if id == hash("touch") and a.pressed and self.map_view then
		local x, y = self:pointer(a)
		local r = self.map_view
		if inside(x, y, r) then
			self:dispatch("path", {
				x = math.floor(r.ox + (x - r.x) / TILE_WIDTH),
				y = math.floor(r.oy + (y - r.y) / TILE_HEIGHT),
			})
			return true
		end
	end
	return false
end
function V:state()
	local buttons = {}
	for _, b in ipairs(self.buttons) do
		buttons[#buttons + 1] = b.label
	end
	return {
		screen = self.s.screen,
		panel = self.s.panel,
		focus = self.focus,
		buttons = buttons,
		inventory_cursor = self.cursor,
		map_view = self.map_view,
		editing_name = self.name_edit,
		bindings = self.binding_mode,
	}
end
function V:final()
	self:clear()
	self.druid:final()
end
return M
