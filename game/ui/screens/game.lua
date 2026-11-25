local GridRenderer = require("game.rendering.grid_renderer")
local Chronicle = require("game.ui.components.chronicle")
local FlowScene = require("game.ui.components.flow_scene")
local Data = require("game.data.characters")
local Catalog = require("game.data.catalog")
local Equipment = require("game.systems.equipment")
local M = {}
local V = {}
V.__index = V
local MAP_VIEW = GridRenderer.view
local TILE_WIDTH, TILE_HEIGHT = GridRenderer.tile_width, GridRenderer.tile_height
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
	mp = "5689b4",
	stamina = "f2ec8b",
	xp = "85b5ef",
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
function M.new(session)
	return setmetatable(
		{
			flow = FlowScene.new(),
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
	if id == "move" and self.map_preview and self.map_preview.reverse then
		args = { dx = -args.dx, dy = args.dy }
	end
	self.s:dispatch(id, args)
end
function V:box(x, y, w, h, c, parent)
	local n = gui.new_box_node(vmath.vector3(x, 720 - y, 0), vmath.vector3(w, h, 0))
	gui.set_color(n, color(c))
	if parent then
		gui.set_parent(n, parent, true)
	else
		self.flow:add_native(n)
	end
	self.nodes[#self.nodes + 1] = n
	return n
end
local function color_hex(name)
	return "#" .. (palette[name] or name)
end

function V:text(x, y, value, c, font, align)
	local text = FlowScene.Text({
		key = "text_" .. (#self.flow.anchors + 1),
		text = tostring(value or ""),
		font = font or "ui",
		color = color_hex(c or "text"),
		align = align,
	})
	self.flow:place(text, x, y, 0, 0)
end

function V:paragraph(x, y, value, width, c, limit)
	if self.s.panel and x >= 238 and x <= 900 then
		width = math.max(12, math.min(width, 78, math.floor((1040 - x) / 9.6)))
	end
	local lines = wrap(value, width)
	for i = 1, math.min(#lines, limit or 20) do
		self:text(x, y + (i - 1) * 22, lines[i], c, "prose")
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
function V:button_element(x, y, w, label, id, args, disabled)
	local key = table.concat({ "button", self.s.screen, self.s.panel or "", self.page, x, y, label }, "_")
	local props = {
		key = key,
		style = { width = w, height = 30, padding_left = 10, justify_content = "center" },
		color = color_hex(disabled and "dark" or "border"),
		children = {
			FlowScene.Text({
				key = key .. "_label",
				text = label,
				font = "ui",
				color = color_hex(disabled and "muted" or "text"),
				style = { height = 0 },
			}),
		},
	}
	if disabled or (self.s.panel and not self.drawing_panel) then
		props.key = key .. "_inactive"
		return FlowScene.Box(props)
	end
	local function activate()
		if type(id) == "function" then
			id()
		else
			self:dispatch(id, args)
		end
	end
	props.on_click = function()
		self.clicked = activate
	end
	local element = self.flow:button(key, props)
	self.buttons[#self.buttons + 1] =
		{ element = element, args = args, label = label, x = x, y = y, w = w, activate = activate }
	return element
end

function V:button(x, y, w, label, id, args, disabled)
	self.flow:place(self:button_element(x, y, w, label, id, args, disabled), x, y - 15, w, 30)
end

function V:bar(x, y, w, value, c, track)
	self:box(x + w / 2, y, w, 6, track or "dark")
	local n = self:box(x, y, w, 6, c)
	gui.set_pivot(n, gui.PIVOT_W)
	gui.set_size(n, vmath.vector3(math.max(0, math.min(1, value or 0)) * w, 6, 0))
	return n
end

function V:status_bar(x, y, label, value, maximum, c)
	self:text(x, y, string.format("%s  %d / %d", label, value, maximum))
	return self:bar(x, y + 17, STATUS_BAR_WIDTH, value / maximum, c)
end

function V:clear()
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
end
function V:header()
	self:text(24, 27, "REBIRTH DUNGEON", "gold")
	self:text(24, 53, "THE LONG WAY BELOW", "muted")
	self:text(1026, 28, "A SIGNAL IN THE STONE", "teal", "ui_small")
	self:box(640, 70, 1232, 1, "border")
end
function V:title()
	self:art(925, 312, 256, 384, "title_gate")
	self:text(116, 184, "THE DUNGEON REMEMBERS.", "gold", "ui_large")
	self:paragraph(
		116,
		242,
		"A signal flickers through the buried towns. Follow its echoes, master your skills, and discover what waits below.",
		56,
		"muted"
	)
	local actions = FlowScene.Box({
		key = "title_actions",
		color = "transparent",
		style = { height = 120, gap = 15 },
		children = {
			self:button_element(116, 365, 360, "[N] New character", "new_character"),
			self:button_element(116, 410, 360, "[L] Your characters", "characters"),
			self:button_element(116, 455, 360, "Settings", "settings"),
		},
	})
	self.flow:place(actions, 116, 350, 360, 120)
	self:text(116, 576, "Arrow keys / WASD  ·  Enter / E to interact", "muted")
	self:text(116, 608, "Original science-fantasy roguelike", "teal", "prose")
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
		self.dirty = true
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
local function character_vitals(s)
	local st, combat = s.stats, s.combat
	local health = combat and combat.health or s.profile.world.health
	local max_health = combat and combat.max_health or st.life
	if health < 0 then
		health = max_health
	end
	local stamina = combat and combat.stamina or st.stamina
	local max_stamina = combat and combat.max_stamina or st.stamina
	return math.ceil(health), max_health, stamina, max_stamina
end
function V:character_status()
	local s = self.s
	local st = s.stats
	local left, top = 1038, MAP_VIEW.y
	self:box(1144, top + 168, 240, 336, "panel")
	self:text(left, top + 22, "Level " .. st.level, "muted")
	local health, max_health, stamina, max_stamina = character_vitals(s)
	self.gauges.health = self:status_bar(left, top + 51, "HP", health, max_health, "red")
	-- The playable session derives maximum MP and has no separate mana pool.
	self:status_bar(left, top + 94, "MP", st.mana, st.mana, "mp")
	self.gauges.stamina = self:status_bar(left, top + 137, "STAMINA", stamina, max_stamina, "stamina")
	self:status_bar(left, top + 180, "XP", st.experience, st.next_level_experience, "xp")
	self:box(1144, top + 218, STATUS_BAR_WIDTH, 1, "border")
	self:text(left, top + 239, "NEARBY", "gold")
	local place = s.world and s.world:interact()
	local nearby = place and (place.id == "rack" and human(place.name) or place.label or place.name or human(place.id))
	self:paragraph(
		left,
		top + 263,
		nearby or "Nothing.",
		22,
		"muted",
		2
	)
	self:text(left, top + 318, "MOVE  WASD / ARROWS", "muted")
end
function V:world_actions()
	local buttons = {
		{ "Character [C]", "character" },
		{ "Inventory [I]", "inventory" },
		{ "Skills [K]", "skills" },
		{ "Journal [Q]", "quests" },
		{ "Settings", "settings" },
	}
	local gap, width = 8, 1248
	local step = (width + gap) / #buttons
	local actions = FlowScene.Box({
		key = "world_actions",
		color = "transparent",
		style = { flex_direction = "row", height = 30, gap = gap },
		children = {},
	})
	for i, row in ipairs(buttons) do
		local x = 16 + math.floor((i - 1) * step)
		local button_width = 16 + math.floor(i * step) - x - gap
		actions.children[i] = self:button_element(x, ACTION_Y, button_width, row[1], row[2])
	end
	self.flow:place(actions, 16, ACTION_Y - 15, width, 30)
end
function V:map_text(...)
	return GridRenderer.map_text(self, ...)
end
function V:map()
	return GridRenderer.render(self)
end
function V:color(name)
	return color(name)
end
function V:wrap(text, width)
	return wrap(text, width)
end

function V:logs()
	local logs = list(self.s.log)
	local first = math.max(1, #logs - 4)
	local dungeon = self.s.world.currentLocation == "threshold"
	local x, y = MAP_VIEW.x, 580
	if dungeon then
		x, y = 1038, 380
		self:box(1144, 511, 240, 300, "panel")
	end
	self:text(x, y, "CHRONICLE", "gold")
	local lines = {}
	for i = first, #logs do
		local value = logs[i]
		if type(value) == "table" then
			value = value.message
		end
		local entry = wrap(value, dungeon and 22 or 96)
		for j = 1, dungeon and #entry or 1 do
			lines[#lines + 1] = entry[j]
		end
	end
	local top = math.max(1, #lines - 15)
	for i = top, #lines do
		Chronicle.line(self, x, y + 20 + (i - top) * 16, lines[i], color("muted"))
	end
end
function V:battle()
	local c = self.s.combat
	if not c or not c.active then
		return
	end
	local left = MAP_VIEW.x + 20
	self:box(MAP_VIEW.x + MAP_VIEW.w / 2, 382, MAP_VIEW.w, 442, "dark")
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
		self:bar(x, 389, 150, e.health / e.stats.health, "red", "panel")
		self:text(x + 160, 389, "HP", "muted", "ui_small")
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
	local world = self.s.profile.world
	local tonics = world.tonics or 0
	local tonic_unavailable = tonics == 0 or c.health >= c.max_health
	local action_x = left
	local action_widths = { 152, 152, 152, 172, 152, 132 }
	for i, a in ipairs({ "attack", "defend", "smash", "counterattack", "windmill", "tonic" }) do
		local disabled
		if a == "tonic" then
			disabled = tonic_unavailable
		else
			disabled = c.allowed and not c:allowed(a) or false
		end
		self:button(action_x, 540, action_widths[i], i .. " " .. human(a), a, nil, disabled)
		action_x = action_x + action_widths[i] + 8
	end
	local slots = world.quick_slots or {}
	local gap, width = 8, (TIME_BAR_WIDTH - 3 * 8) / 4
	for i = 1, 4 do
		local assigned = slots[i] == "tonic"
		local label = "F" .. i .. (assigned and " Tonic ×" .. tonics or " Empty")
		self:button(left + (i - 1) * (width + gap), 580, width, label, "tonic", nil, not assigned or tonic_unavailable)
	end
end
function V:pagination(count, size, y)
	local pages = math.max(1, math.ceil(count / size))
	self.pages = pages
	self.page = math.min(self.page, pages - 1)
	self:button(824, y, 92, "< Prev", function()
		self.page = math.max(0, self.page - 1)
		self.dirty = true
	end, nil, self.page == 0)
	self:text(928, y, tostring(self.page + 1) .. "/" .. pages, "muted")
	self:button(982, y, 92, "Next >", function()
		self.page = math.min(pages - 1, self.page + 1)
		self.dirty = true
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
	local item, anchor
	if self.hover_cell then
		item, anchor = self:item_at(
			grid.x + self.hover_cell.x * grid.unit + 1,
			grid.y + self.hover_cell.y * grid.unit + 1
		)
	end
	local focused = self.buttons[self.focus]
	local text
	for _, slot in ipairs(self.slot_hits) do
		if slot.slot == self.hover_slot or (not item and self.inventory_buttons and focused and focused.args
			and slot.slot == focused.args.slot) then
			text = slot.item and self:inventory_description(slot.item) or slot.status
			anchor = slot
			break
		end
	end
	if not text and (item or self.selected_item) then
		text = self:inventory_description(item or self.selected_item)
	end
	if not text then
		return
	end
	local lines = wrap(text, 33)
	local count = math.min(#lines, 12)
	local width, height = 350, 18 + count * 22
	local x, y = 636, 180
	if anchor then
		local gap = 8
		x = anchor.x + anchor.w + gap
		if x + width > self.flow.width - gap then
			x = anchor.x - width - gap
		end
		y = math.min(anchor.y, self.flow.height - height - gap)
	end
	self:box(x + width / 2, y + height / 2, width, height, "dark")
	for i = 1, count do
		self:text(x + 10, y + 20 + (i - 1) * 22, lines[i], "text", "prose")
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
				self:text(px + 3, py + height * unit - 8, item.count, "gold", "ui_small")
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
			self.dirty = true
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
			self.dirty = true
		end, nil, self.skill_task_page == 0)
		self:button(395, 522, 125, "Next >", function()
			self.skill_task_page = math.min(pages - 1, self.skill_task_page + 1)
			self.dirty = true
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
		self.dirty = true
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
			self.dirty = true
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
	self:text(256, 449, "Completed runs: " .. tostring(w.threshold_completions or 0))
	self:text(256, 475, "REGISTERED MOON GATES", "gold")
	self:paragraph(256, 512, table.concat(w.gates or {}, ", "), 84, "teal")
end
local function character_card(view, key, x, y, width, height, title)
	view.flow:place(FlowScene.Box({
		key = "character_" .. key,
		color = color_hex("back"),
		style = { width = width, height = height },
	}), x, y, width, height)
	if title then
		view:text(x + 14, y + 19, title, "teal")
	end
end

local function character_value(view, x, right, y, label, value)
	view:text(x, y, label, "muted")
	view:text(right, y, value, "text", nil, "right")
end

local function character_meter(view, x, right, y, label, value, maximum, tint, detail)
	character_value(view, x, right, y, label, detail or string.format("%d / %d", value, maximum))
	view:bar(x, y + 13, right - x, value / maximum, tint)
end

local function character_stats(view, key, x, width, title, rows)
	character_card(view, key, x, 394, width, 185, title)
	for i, row in ipairs(rows) do
		character_value(view, x + 14, x + width - 14, 438 + (i - 1) * 24, row[1], row[2])
	end
end

function V:character_panel()
	local s = self.s
	local p, st, combat = s.profile, s.stats, s.combat
	local race = Data.RACES[(p.race or 0) + 1] or Data.RACES[1]
	local gender = Data.GENDERS[(p.gender or 0) + 1] or Data.GENDERS[1]
	local talent = Data.TALENTS[(p.talent or 0) + 1] or Data.TALENTS[1]
	character_card(self, "identity", 238, 154, 820, 84)
	self:portrait(278, 196, p, 2)
	self:text(316, 180, p.name, "gold", "ui_large")
	self:text(316, 212, string.format("%s  ·  %s  ·  %d years old", race, gender, p.age), "muted")
	self:text(737, 179, "ACTIVE TALENT", "teal")
	self:text(737, 210, talent)

	local hp, max_hp, stamina, max_stamina = character_vitals(s)
	character_card(self, "vitals", 238, 249, 404, 134, "VITALS")
	character_meter(self, 252, 628, 290, "HP", hp, max_hp, "red")
	character_meter(self, 252, 628, 323, "MP", st.mana, st.mana, "mp")
	character_meter(self, 252, 628, 356, "Stamina", stamina, max_stamina, "stamina")

	character_card(self, "progression", 654, 249, 404, 134, "PROGRESSION")
	character_value(self, 668, 1044, 290, "Level", st.level)
	character_value(self, 668, 1044, 323, "AP", st.ability_points)
	local xp, next_xp = st.experience, st.next_level_experience
	local xp_detail = string.format("%d / %d  (%.1f%%)", xp, next_xp, xp / next_xp * 100)
	character_meter(self, 668, 1044, 356, "XP", xp, next_xp, "xp", xp_detail)

	character_stats(self, "attributes", 238, 242, "ATTRIBUTES", {
		{ "Strength", st.strength },
		{ "Intelligence", st.intelligence },
		{ "Dexterity", st.dexterity },
		{ "Will", st.will },
		{ "Luck", st.luck },
	})
	character_stats(self, "defense", 492, 258, "DEFENSE", {
		{ "Defense", st.defense },
		{ "Protection", string.format("%g%%", st.protection) },
		{ "Magic Defense", st.magic_defense },
		{ "Magic Protection", st.magic_protection },
	})
	character_stats(self, "offense", 762, 296, "OFFENSE", {
		{ "Damage", string.format("%d–%d", st.damage_min, st.damage_max) },
		{ "Magic Attack", string.format("%g", st.magic_attack) },
		{ "Injury Rate", string.format("%.1f–%.1f%%", st.injury_min, st.injury_max) },
		{ "Critical", string.format("%.1f%%", st.critical) },
		{ "Balance", string.format("%.1f%%", st.balance) },
		{ "Armor Pierce", st.armor_pierce },
	})

	local status = "None"
	if combat and combat.active then
		if combat.guarded then
			status = "Guarding"
		elseif combat.countering then
			status = "Counterattack ready"
		end
	end
	character_card(self, "status", 238, 590, 820, 32)
	self:text(252, 606, "STATUS EFFECTS", "teal")
	self:text(433, 606, status)
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
		self.dirty = true
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
		self.dirty = true
	end)
	self:paragraph(
		256,
		429,
		"Move: arrows / WASD. Interact: E or Enter. Inventory: I. Skills: K. Journal: Q. Character: C. Gates: G. Combat: 1–5. Tonic: 6. Tab: focus next control. Shift-Tab: previous. Escape: close.",
		82,
		"muted"
	)
	if self.s.screen == "world" then
		self:button(256, 520, 785, "Return to title", "title")
	end
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
	self.flow:begin()
	self.coordinate_node = self:box(640, 360, 1280, 720, "back")
	if screen ~= "world" then
		self:header()
	end
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
	self.drawing_panel = true
	self:panel()
	self.drawing_panel = false
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
	self.flow:render()
	self.dirty = false
end
function V:highlight()
	self.focus = math.max(1, math.min(self.focus, #self.buttons))
	for i, b in ipairs(self.buttons) do
		b.element.color = color_hex(i == self.focus and "back" or "border")
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
	-- Defold reclaims deleted GUI nodes at the end of the frame. Coalesce
	-- input, camera and model changes into a single scene rebuild.
	if self.dirty or self.revision ~= self.s.revision or camera_moved then
		self:render()
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
			return r.item, r
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
			self.dirty = true
		end
	end
	if id == hash("touch") then
		local x, y = self:pointer(a)
		if a.pressed then
			self.drag = self:item_at(x, y)
			if self.drag then
				self.selected_item = self.drag
				self.drag_pointer = { x = x, y = y }
				self.dirty = true
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
			self.dirty = true
			return true
		end
	end
	if self.drag_pointer and a.x and a.y then
		local px, py = self:pointer(a)
		self.drag_pointer.x, self.drag_pointer.y = px, py
		if self.drag_ghost then
			gui.set_position(self.drag_ghost, vmath.vector3(px, 720 - py, 0))
		end
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
			self.dirty = true
			return true
		end
	end
	if id == hash("key_esc") and self.held then
		self.held = nil
		self.selected_item = nil
		self.dirty = true
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
			self.dirty = true
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
		self.dirty = true
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
				self.dirty = true
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
		self.dirty = true
		return true
	end
	if id == hash("key_enter") and a.pressed and (self.s.panel or self.s.screen ~= "world") then
		local b = self.buttons[self.focus]
		if b then
			b.activate()
		end
		return true
	end
	if self.flow:on_input(id, a) then
		if self.clicked then
			local callback = self.clicked
			self.clicked = nil
			callback()
		end
		return true
	end
	if self.s.panel and id == hash("touch") then
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
			self.dirty = true
		elseif id == hash("mouse_wheel_up") then
			self.page = math.max(0, self.page - 1)
			self.dirty = true
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
			local col = math.floor(r.ox + (x - r.x) / (r.tile_width or TILE_WIDTH))
			local row = math.floor(r.oy + (y - r.y) / (r.tile_height or TILE_HEIGHT))
			local target_x, target_y = GridRenderer.path_target(self.s.world, self.map_preview, col, row)
			if target_x then
				self:dispatch("path", { x = target_x, y = target_y })
			end
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
		map_preview = self.map_preview,
		editing_name = self.name_edit,
		bindings = self.binding_mode,
	}
end
function V:final()
	self:clear()
	self.flow:final()
end
return M
