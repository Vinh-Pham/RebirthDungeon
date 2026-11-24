local druid = require("druid.druid")
local richtext = require("richtext.richtext")
local Bridge = require("game.ui.session")
local M = {}
M.colors = {
	bg = vmath.vector4(0.055, 0.071, 0.102, 1),
	panel = vmath.vector4(0.085, 0.11, 0.15, 0.98),
	edge = vmath.vector4(0.19, 0.30, 0.33, 1),
	teal = vmath.vector4(0.38, 0.84, 0.75, 1),
	white = vmath.vector4(0.9, 0.93, 0.94, 1),
	muted = vmath.vector4(0.56, 0.65, 0.70, 1),
	hp = vmath.vector4(0.84, 0.31, 0.51, 1),
	mp = vmath.vector4(0.28, 0.57, 0.89, 1),
	sp = vmath.vector4(0.9, 0.73, 0.30, 1),
}
local c = M.colors
local RICH_FONTS = {
	body = { regular = hash("body"), bold = hash("heading") },
	heading = { regular = hash("heading"), bold = hash("heading") },
}
local function hex(rgb)
	return string.format(
		"%02x%02x%02x",
		math.floor(rgb.x * 255 + 0.5),
		math.floor(rgb.y * 255 + 0.5),
		math.floor(rgb.z * 255 + 0.5)
	)
end
local function carried(p)
	return p.pack
end
local function parent(self, n)
	gui.set_parent(n, self.root, false)
	gui.set_inherit_alpha(n, false)
	self.nodes[#self.nodes + 1] = n
	return n
end
function M.box(self, x, y, w, h, color)
	local n = parent(self, gui.new_box_node(vmath.vector3(x - 640, y - 360, 0), vmath.vector3(w, h, 0)))
	gui.set_color(n, color or c.panel)
	return n
end
-- Plain text node, only for Druid text input fields and other nodes mutated after creation.
function M.plain_text(self, x, y, text, size, color, width, bold, center)
	local n = parent(self, gui.new_text_node(vmath.vector3(x - 640, y - 360, 0), tostring(text)))
	gui.set_font(n, bold and "heading" or "body")
	gui.set_color(n, color or c.white)
	gui.set_scale(n, vmath.vector3((size or 18) / 40, (size or 18) / 40, 1))
	gui.set_outline(n, vmath.vector4(0, 0, 0, 0))
	gui.set_shadow(n, vmath.vector4(0, 0, 0, 0))
	gui.set_pivot(n, center and gui.PIVOT_CENTER or gui.PIVOT_W)
	if width then
		gui.set_size(n, vmath.vector3(width * 40 / (size or 18), 100, 0))
		gui.set_line_break(n, true)
	end
	return n
end
-- Rich text (defold-richtext): markup such as <b>, <color=#rrggbb>, <font=heading>, <size=2>.
-- Same-style words per line combine into one node; the block is centered on x,y like the old pivots.
local function rich(self, x, y, text, size, color, width, bold, center, reuse)
	size = size or 18
	local n = reuse or parent(self, gui.new_text_node(vmath.vector3(x - 640, y - 360, 0), ""))
	text = tostring(text)
	local words, metrics = {}, {}
	if text ~= "" then
		words, metrics = richtext.create(text, bold and "heading" or "body", {
			parent = n,
			color = color or c.white,
			size = size / 40,
			width = width,
			align = center and richtext.ALIGN_CENTER or richtext.ALIGN_LEFT,
			combine_words = true,
			fonts = RICH_FONTS,
		})
		for _, word in ipairs(words) do
			gui.set_inherit_alpha(word.node, false)
		end
	end
	gui.set_position(n, vmath.vector3(x - 640, y - 360 + (metrics.height or 0) / 2, 0))
	return n, words, metrics
end
function M.text(self, x, y, text, size, color, width, bold, center)
	return (rich(self, x, y, text, size, color, width, bold, center))
end
function M.icon(self, x, y, tile, size, tint)
	local n = M.box(self, x, y, size, size, tint or vmath.vector4(1))
	gui.set_texture(n, "tiles")
	gui.play_flipbook(n, tile)
	return n
end
function M.button(self, x, y, w, label, fn, enabled, accent)
	local S = self.ui
	local C = S.catalog
	enabled = enabled ~= false and not self.ui_pending and not self.ui_refreshing
	local b =
		M.box(self, x, y, w, 38, enabled == false and c.bg or accent and c.edge or vmath.vector4(0.13, 0.19, 0.23, 1))
	M.text(self, x, y, label, 16, enabled == false and c.muted or accent and c.teal or c.white, nil, true, true)
	local index = #self.buttons + 1
	local button = self.druid:new_button(b, function()
		if enabled ~= false then
			self.focus = index
			M.focus(self)
			msg.post("/bootstrap#session", "ui_click")
			fn()
		end
	end)
	button:set_enabled(enabled ~= false)
	self.buttons[#self.buttons + 1] = { node = b, fn = fn, enabled = enabled ~= false, label = label }
	return b
end
local function panel(self, title, subtitle)
	M.box(self, 640, 377, 1140, 520, c.edge)
	M.box(self, 640, 377, 1138, 518, c.panel)
	M.text(self, 98, 610, title, 30, c.white, nil, true)
	if subtitle then
		M.text(self, 98, 574, subtitle, 16, c.muted)
	end
end
local function open(self, name)
	self.ui.panel(name)
end
local function command(self, data)
	Bridge.command(self, data)
end
local function action(self, skill, target)
	local S = self.ui
	local C = S.catalog
	local p = S.snapshot()
	command(self, p.battle.actions[skill].command)
end

local function bar(self, x, y, w, value, max, color, label, size)
	M.box(self, x + w / 2, y, w, 9, c.bg)
	local fill = w * math.max(0, math.min(1, value / max))
	if fill > 0 then
		M.box(self, x + fill / 2, y, fill, 9, color)
	end
	M.text(
		self,
		x,
		y + 19,
		"<color="
			.. hex(color)
			.. ">"
			.. label
			.. "</color>  "
			.. string.format("%.1f", value):gsub("%.0$", "")
			.. " / "
			.. max,
		size or 13,
		c.muted
	)
end
local function hud(self, p)
	local S = self.ui
	local scale = S.settings.hud_scale
	if S.screen == "title" or S.screen == "characters" then
		return
	end
	M.box(self, 640, 139, 1280, 48, c.bg)
	M.box(self, 640, 57, 1280, 114, c.bg)
	M.box(self, 640, 114, 1280, 1, c.edge)
	M.icon(self, 42, 62, "tile_0084", 38, p and c.teal or c.muted)
	M.text(self, 74, 88, p and p.name or "No character selected", 16 * scale, p and c.white or c.muted, nil, true)
	M.text(self, 74, 60, p and p.race .. " · " .. p.talent or "Your journey begins above", 12 * scale, c.muted)
	M.text(
		self,
		74,
		35,
		p and "Lv. " .. p.level .. " · " .. p.gold .. " gold" or "Level — · Gold —",
		12 * scale,
		c.teal
	)
	for index, pool in ipairs({ "hp", "mp", "sp" }) do
		local x = 365 + (index - 1) * 211
		if p then
			bar(
				self,
				x,
				64,
				183,
				p.pools[pool],
				p.stats[pool],
				c[pool],
				({ "HEALTH", "MANA", "STAMINA" })[index],
				13 * scale
			)
		else
			M.box(self, x + 91, 64, 183, 9, c.panel)
			M.text(self, x, 83, ({ "HEALTH", "MANA", "STAMINA" })[index] .. "  — / —", 13, c.muted)
		end
	end
	local ratio = p and (p.level == 200 and 1 or p.xp / p.xp_next) or 0
	for index = 1, 20 do
		M.box(self, 374 + (index - 1) * 31, 32, 28, 4, index <= math.floor(ratio * 20) and c.teal or c.edge)
	end
	M.text(self, 1020, 86, p and "AP " .. p.ap .. " · Life " .. p.life or "AP — · Life —", 13 * scale, c.teal)
	M.text(
		self,
		1020,
		60,
		p and (p.level == 200 and "Maximum level" or p.xp .. " / " .. p.xp_next .. " EXP") or "EXP — / —",
		12 * scale,
		c.muted
	)
	M.text(self, 1020, 34, p and "Saved · " .. p.revision or "Awaiting selection", 11, c.muted)
	local names = {
		{ "Character", "character" },
		{ "Skills", "skills" },
		{ "Talent", "talent" },
		{ "Quests", "quests" },
		{ "Inventory", "inventory" },
		{ "Pets", "pets" },
		{ "Menu", "menu" },
	}
	for index, entry in ipairs(names) do
		M.button(self, 78 + (index - 1) * 122, 139, 114, entry[1], function()
			open(self, entry[2])
		end, p ~= nil)
	end
	M.text(self, 1185, 139, self.ui_pending and "Saving…" or "Tab · Enter · Esc", 12, c.muted, nil, false, true)
end
local function heading(self, label, detail)
	M.box(self, 640, 678, 1280, 84, c.bg)
	M.box(self, 640, 636, 1280, 1, c.edge)
	M.text(self, 32, 690, label, 25, c.white, nil, true)
	M.text(self, 32, 657, detail or "", 14, c.muted)
end
local function title(self)
	local S = self.ui
	local C = S.catalog
	M.box(self, 640, 360, 1280, 720, c.bg)
	for row = 0, 7 do
		for col = 0, 9 do
			M.icon(
				self,
				845 + col * 32,
				270 + row * 32,
				(row == 0 or row == 7 or col == 0 or col == 9) and "tile_0040" or "tile_0049",
				32,
				vmath.vector4(0.45, 0.52, 0.63, 1)
			)
		end
	end
	M.icon(self, 986, 409, "tile_0084", 100)
	M.icon(self, 1077, 445, "tile_0120", 68)
	M.icon(self, 890, 328, "tile_0090", 48)
	M.text(self, 85, 575, "BEGIN AGAIN", 15, c.teal, nil, true)
	M.text(self, 81, 499, "REBIRTH", 66, c.white, nil, true)
	M.text(self, 84, 433, "DUNGEON", 58, c.white, nil, true)
	M.text(self, 87, 362, "A quiet town. A restless dungeon. A life made new.", 19, c.muted)
	M.button(self, 205, 266, 238, "Start your journey", function()
		S.list()
		S.set_screen("characters")
	end, true, true)
	M.button(self, 414, 266, 145, "Settings", function()
		S.panel("settings")
	end)
	M.text(self, 87, 202, "WASD to walk · Click to travel · E to interact", 14, c.muted)
end
local function characters(self)
	local S = self.ui
	local C = S.catalog
	panel(self, "Your characters", #(S.profiles or {}) .. " / 20 slots · every journey saves automatically")
	local profiles = S.profiles or {}
	local page = self.character_page or 1
	for i = (page - 1) * 6 + 1, math.min(#profiles, page * 6) do
		local p = profiles[i]
		local n = i - (page - 1) * 6 - 1
		local x = 283 + (n % 3) * 351
		local y = 491 - math.floor(n / 3) * 143
		M.box(self, x, y, 330, 125, c.bg)
		M.icon(self, x - 127, y + 17, "tile_0084", 48)
		M.text(self, x - 90, y + 32, p.name, 17, c.white, nil, true)
		M.text(self, x - 90, y + 5, "Level " .. p.level .. " · " .. p.race, 14, c.muted)
		M.button(self, x - 66, y - 35, 158, p.phase == "town" and "Play" or "Resume " .. p.phase, function()
			S.select(p.id)
		end, not S.read_only, true)
		M.button(self, x + 97, y - 35, 135, "Rebirth", function()
			self.form = nil
			Bridge.intent(self, "rebirth_profile", { id = p.id })
		end, p.rebirth.enabled and not S.read_only)
		M.text(self, x - 144, y - 70, p.rebirth.reason, 11, c.muted, 310)
	end
	M.button(self, 220, 184, 235, "New character", function()
		self.form = nil
		S.set_screen("create")
	end, #profiles < 20 and not S.read_only, true)
	M.button(self, 422, 184, 140, "Back", function()
		S.set_screen("title")
	end)
	if #profiles >= 20 then
		M.text(self, 111, 233, "All 20 character slots are occupied.", 14, c.sp)
	end
	if #profiles > 6 then
		M.button(self, 851, 184, 95, "Previous", function()
			self.character_page = math.max(1, page - 1)
			S.refresh()
		end, page > 1)
		M.button(self, 967, 184, 95, "Next", function()
			self.character_page = page + 1
			S.refresh()
		end, page * 6 < #profiles)
	end
	if next(S.recovery_errors or {}) then
		M.text(self, 650, 233, "A damaged or newer save was preserved. See recovery details in Menu.", 14, c.hp)
	end
end
local function creation(self, p, rebirth)
	local S = self.ui
	local C = S.catalog
	self.form = self.form
		or {
			name = rebirth and p.name or "",
			race = rebirth and p.race or "Human",
			age = 17,
			talent = rebirth and p.talent or "Close Combat",
		}
	local f = self.form
	panel(
		self,
		rebirth and "Begin a new life" or "A name for your story",
		rebirth and "Keep your race, skills, AP and possessions. Reset this life's level and growth."
			or "Choose a beginning. Rebirth will let you change your path later."
	)
	M.text(self, 108, 524, "NAME", 13, c.teal, nil, true)
	local field = M.box(self, 345, 482, 475, 44, c.bg)
	local text = M.plain_text(self, 122, 482, f.name, 22)
	if not rebirth then
		local input = self.druid:new_input(field, text)
		input:set_max_length(24)
		input:set_text(f.name)
		input.on_input_text:subscribe(function(_, value)
			f.name = value
		end)
		self.name_input = input
		self.name_input_node = field
		M.text(self, 108, 443, "2–24 characters: A–Z, numbers, spaces, apostrophes, hyphens", 13, c.muted)
	end
	M.text(self, 108, 397, "RACE", 13, c.teal, nil, true)
	for i, race in ipairs({ "Human", "Elf", "Giant" }) do
		M.button(self, 174 + (i - 1) * 163, 360, 150, race, function()
			f.race = race
			if race == "Giant" and f.talent == "Archery" then
				f.talent = "Close Combat"
			end
			S.refresh()
		end, not rebirth, f.race == race)
	end
	M.text(self, 108, 308, "STARTING AGE", 13, c.teal, nil, true)
	for age = 10, 17 do
		M.button(self, 132 + (age - 10) * 59, 270, 50, tostring(age), function()
			f.age = age
			S.refresh()
		end, not rebirth or age <= p.age, f.age == age)
	end
	M.text(self, 658, 524, "TALENT", 13, c.teal, nil, true)
	for i, talent in ipairs(C.talent_order) do
		M.button(self, 830, 477 - (i - 1) * 53, 345, talent, function()
			f.talent = talent
			S.refresh()
		end, not (f.race == "Giant" and talent == "Archery"), f.talent == talent)
	end
	if rebirth then
		M.text(self, 658, 285, "Level → 1 · Growth resets · Age → " .. f.age, 15, c.sp)
		M.text(self, 108, 222, p.rebirth.reason .. " · Identity stays locked", 13, c.muted)
	elseif f.race == "Giant" then
		M.text(self, 658, 285, "Giants cannot equip bows or select Archery.", 13, c.sp)
	end
	M.text(self, 658, 245, "Starter skill: " .. C.skills[C.talents[f.talent].skill].name, 16, c.muted)
	M.button(self, 285, 184, 350, rebirth and "Confirm rebirth" or "Enter Town1", function()
		if rebirth then
			command(self, { type = "rebirth", talent = f.talent, age = f.age })
		else
			S.create(f.name, f.race, f.age, f.talent)
		end
	end, not rebirth or p.rebirth.enabled, true)
	M.button(self, 535, 184, 120, "Cancel", function()
		S.set_screen(rebirth and p.phase or "characters")
	end)
	if self.name_input then
		self.buttons[#self.buttons + 1] = {
			node = self.name_input_node,
			enabled = true,
			label = "Name",
			fn = function()
				self.name_input:select()
			end,
		}
	end
end
local function battle(self, p)
	local S = self.ui
	local C = S.catalog
	heading(self, "Alby / Battle", "Fixed Speed order · one item, then one action · Defend expires at your next turn")
	local b = p.battle
	local a = p.battle.active
	local active = a.hero and b.started
	if self.presented_battle ~= b.id then
		self.presented_battle = b.id
		self.presented_sequence = b.sequence or 0
	end
	M.box(self, 640, 397, 1280, 477, c.bg)
	for i, id in ipairs(b.order) do
		local actor = b.actors[id]
		local x = 155 + (i - 1) * 238
		M.box(self, x, 602, 225, 38, id == a.id and c.edge or c.panel)
		M.text(
			self,
			x,
			602,
			(id == a.id and "> " or "") .. actor.name .. "  ·  " .. b.speeds[id],
			14,
			actor.pools.hp > 0 and c.white or c.muted,
			nil,
			false,
			true
		)
	end
	self.actor_nodes = { [p.id] = M.icon(self, 214, 426, "tile_0084", 112) }
	M.text(self, 214, 343, p.name, 19, c.teal, nil, true, true)
	local target
	for _, e in ipairs(b.enemies) do
		if e.id == self.target and e.pools.hp > 0 then
			target = e
		end
	end
	if not target then
		for _, e in ipairs(b.enemies) do
			if e.pools.hp > 0 then
				target = e
				break
			end
		end
	end
	self.target = target and target.id
	for i, e in ipairs(b.enemies) do
		local x = 534 + (i - 1) * 267
		local d = C.enemies[e.def]
		local dead = e.pools.hp <= 0
		M.box(self, x, 415, 230, 234, self.target == e.id and c.edge or c.panel)
		self.actor_nodes[e.id] = M.icon(
			self,
			x,
			444,
			d.tile,
			e.def == "giant" and 110 or 78,
			dead and vmath.vector4(0.3, 0.3, 0.3, 1)
				or e.def == "red" and vmath.vector4(1, 0.45, 0.45, 1)
				or vmath.vector4(1)
		)
		M.text(self, x, 371, e.name, 17, c.white, nil, true, true)
		bar(self, x - 95, 333, 190, e.pools.hp, d.hp, c.hp, "HP")
		M.button(self, x, 284, 215, dead and "Defeated" or self.target == e.id and "Selected" or "Target", function()
			self.target = e.id
			S.refresh()
		end, not dead, self.target == e.id)
	end
	M.text(
		self,
		48,
		546,
		"ROUND " .. b.round .. "  /  " .. (active and "YOUR TURN" or a.name .. "'s turn"),
		16,
		active and c.teal or c.muted,
		nil,
		true
	)
	for index, skill in ipairs({ "normal", "defense" }) do
		local preview = b.actions[skill]
		local x = index == 1 and 172 or 772
		local label = C.skills[skill].name .. " · " .. preview.cost .. " " .. preview.pool:upper()
		if preview.damage then
			label = label .. " · " .. preview.damage .. "/" .. preview.critical .. " normal/crit"
		end
		M.button(self, x, 232, 282, label, function()
			action(self, skill, self.target)
		end, preview.enabled, true)
		M.text(self, x - 135, 200, preview.reason, 12, c.sp, 278)
	end
	M.button(self, 472, 232, 282, "Skills", function()
		S.panel("skills")
	end, true, true)
	M.text(self, 333, 200, "Inspect costs, cooldowns and training", 12, c.muted)
	M.button(self, 1077, 232, 235, b.item_used and "Item used this turn" or "Items · 1 available", function()
		S.panel("inventory")
	end, active and not b.item_used)
	M.text(
		self,
		960,
		200,
		not active and "Wait for your turn" or b.item_used and "Act to finish your turn" or "Optional before acting",
		12,
		c.muted
	)
	if active and b.can_wait then
		M.button(self, 1090, 284, 200, "Wait", function()
			action(self, "wait")
		end, true)
	end
	M.text(
		self,
		48,
		180,
		"Log history is saved with each action. Mouse wheel browses; open Battle log for details.",
		13,
		c.muted
	)
	for index, line in ipairs(p.combat_log.compact) do
		M.text(self, 48, 308 - (index - 1) * 18, line, 11, c.muted)
	end
	if p.combat_log.new_entries > 0 then
		M.text(self, 48, 326, p.combat_log.new_entries .. " new entries · open Battle log", 11, c.teal)
	end
	M.button(self, 1139, 602, 180, "Battle log", function()
		S.panel("log")
	end)
	for _, e in ipairs(p.last_events or {}) do
		if e.kind == "damage" and e.sequence > (self.presented_sequence or 0) and self.actor_nodes[e.target] then
			if not S.settings.reduced_motion then
				local node = self.actor_nodes[e.target]
				local pos = gui.get_position(node)
				gui.set_position(node, pos + vmath.vector3(7, 0, 0))
				gui.animate(node, "position", pos, gui.EASING_OUTQUAD, 0.16)
			end
		end
		self.presented_sequence = math.max(self.presented_sequence or 0, e.sequence)
	end
end
local function claim_rewards(self, p, all)
	command(self, p.pending[all and "all" or "selected"].command)
end
local function rewards(self, p)
	local S = self.ui
	local C = S.catalog
	panel(self, "Spoils of battle", "Choose what to take. Unselected rewards will be left behind when you collect.")
	self.selected = self.selected or {}
	for i, e in ipairs(p.pending.entries) do
		local label = e.kind == "gold" and e.amount .. " gold" or C.items[e.def].name .. " × " .. e.amount
		M.box(self, 640, 487 - (i - 1) * 81, 1030, 68, c.bg)
		if e.kind == "item" then
			M.icon(self, 151, 487 - (i - 1) * 81, C.items[e.def].tile, 42)
		end
		M.text(self, 194, 487 - (i - 1) * 81, label, 21, e.claimed and c.muted or c.white)
		M.button(
			self,
			1035,
			487 - (i - 1) * 81,
			165,
			e.claimed and "Claimed" or self.selected[e.id] ~= false and "Selected" or "Select",
			function()
				self.selected[e.id] = self.selected[e.id] == false
				S.refresh()
			end,
			not e.claimed,
			self.selected[e.id] ~= false
		)
	end
	M.button(self, 219, 184, 225, "Take All", function()
		claim_rewards(self, p, true)
	end, p.pending.all.enabled, true)
	M.button(self, 460, 184, 225, "Take selected", function()
		claim_rewards(self, p, false)
	end, p.pending.selected.enabled)
	M.text(self, 670, 184, carried(p) .. " / 30 inventory slots", 14, c.muted)
	M.text(
		self,
		117,
		240,
		p.pending.all.reason ~= "" and p.pending.all.reason or p.pending.selected.reason,
		14,
		c.sp,
		1000
	)
end
local function inventory(self, p, service)
	local S = self.ui
	local C = S.catalog
	local context = p.id .. ":" .. p.revision .. ":" .. tostring(S.read_only) .. ":" .. tostring(S.error)
	require("game.ui.inventory").render(self, M, context, service)
end

local function settings(self)
	local S = self.ui
	local C = S.catalog
	for i, entry in ipairs({ { "music", "Music" }, { "effects", "Sound effects" } }) do
		local key, label = unpack(entry)
		local y = 489 - (i - 1) * 74
		M.text(self, 119, y, label .. "  " .. math.floor(S.settings[key] * 100 + 0.5) .. "%", 21)
		M.button(self, 642, y, 76, "−", function()
			S.set_setting(key, math.max(0, S.settings[key] - 0.1))
		end)
		M.button(self, 734, y, 76, "+", function()
			S.set_setting(key, math.min(1, S.settings[key] + 0.1))
		end)
	end
	M.button(self, 330, 339, 422, "Reduced motion: " .. (S.settings.reduced_motion and "On" or "Off"), function()
		S.set_setting("reduced_motion", not S.settings.reduced_motion)
	end, true, true)
	M.button(self, 820, 339, 422, "HUD text: " .. math.floor(S.settings.hud_scale * 100 + 0.5) .. "%", function()
		S.set_setting("hud_scale", S.settings.hud_scale >= 1.3 and 1 or (S.settings.hud_scale > 1 and 1.3 or 1.15))
	end)
	M.text(
		self,
		119,
		270,
		"WASD / arrows: move     Click: travel     E: interact     I: inventory     Q: quests",
		18,
		c.muted
	)
	M.text(self, 119, 234, "M: map     Escape: menu / close     Tab / Enter: navigate buttons", 18, c.muted)
	M.text(
		self,
		119,
		204,
		"Mouse wheel: pages · Shift+Tab: previous control · Escape: close details before parent",
		14,
		c.muted
	)
	M.text(
		self,
		119,
		174,
		"Every committed action saves. Music and effects are original placeholder audio.",
		15,
		c.muted
	)
end
local function journal(self, p)
	local S = self.ui
	local C = S.catalog
	for i, id in ipairs(C.quest_order) do
		local d = C.quests[id]
		local y = 487 - (i - 1) * 83
		M.text(self, 117, y, d.name, 21, c.white, nil, true)
		M.text(self, 117, y - 28, d.text .. " · " .. d.gold .. " gold + " .. d.xp .. " EXP", 15, c.muted)
		M.button(
			self,
			974,
			y - 9,
			260,
			p.quest_claims[id] and "Complete" or p.quest_evidence[id] and "Claim in town" or "In progress",
			function()
				command(self, { type = "claim_quest", quest = id })
			end,
			p.phase == "town" and p.quest_evidence[id] and not p.quest_claims[id],
			true
		)
	end
end
local function map_panel(self, p)
	local S = self.ui
	local C = S.catalog
	local map = S.map
	local scale = math.min(1020 / map.width, 320 / map.height)
	local ox = 640 - map.width * scale / 2
	local oy = 380 - map.height * scale / 2
	for _, cell in ipairs(map.cells) do
		M.box(self, ox + cell.x * scale, oy + cell.y * scale, scale - 0.5, scale - 0.5, c.edge)
	end
	local pos = map.position
	M.box(self, ox + pos.x / 48 * scale, oy + pos.y / 48 * scale, 9, 9, c.teal)
	local points = map.points
	for _, v in ipairs(points) do
		local x, y = ox + v.x * scale, oy + v.y * scale
		local node = M.box(self, x, y, 16, 16, v.cleared and c.muted or c.sp)
		M.text(self, x, y + 19, v.name, 12, c.white, nil, false, true)
		local fn = function()
			Bridge.intent(self, "route", { x = v.x, y = v.y, service = v.service })
		end
		self.druid:new_button(node, fn)
		self.buttons[#self.buttons + 1] = { node = node, fn = fn, enabled = true, label = v.name }
	end
	M.text(self, 110, 191, "Click a marker to travel there. Gold markers are destinations; teal is you.", 16, c.muted)
end
local function service_panel(self, p, id)
	local S = self.ui
	local C = S.catalog
	local ui = require("game.ui.services")
	if id == "bank" then
		inventory(self, p, id)
		ui.talk(self, M, id, 950, 579)
		return
	end
	if self.shop_inventory then
		inventory(self, p, id)
		M.button(self, 1044, 571, 205, "Back to service", function()
			self.shop_inventory = false
			S.refresh()
		end)
		return
	end
	ui.render(self, M, p.id .. ":" .. p.revision .. ":" .. tostring(S.read_only) .. ":" .. tostring(S.error), id, false)
end
local function modal(self, p, name)
	local S = self.ui
	local C = S.catalog
	M.box(self, 640, 390, 1280, 550, vmath.vector4(0.015, 0.02, 0.03, 0.78))
	local service = C.services[name]
	local titles = {
		inventory = "Inventory",
		character = "Character",
		skills = "Skills",
		talent = "Talents",
		pets = "Companions",
		menu = "Journey paused",
		settings = "Settings",
		quests = "Onboarding journal",
		map = "Map",
		dialogue = "A moment in town",
		discard = "Leave these rewards?",
		abandon = "Return to town?",
		leave_dungeon = "Leave the dungeon?",
		goddess = "Return with the goddess?",
		log = "Combat log",
	}
	panel(
		self,
		service and service.title or titles[name] or "Menu",
		service and service.name
			or name == "skills" and "World paused · F-rank skills and combat lessons"
			or "World movement and battle pacing are paused while this panel is open."
	)
	if name == "inventory" then
		inventory(self, p)
	elseif name == "settings" then
		settings(self)
	elseif name == "log" then
		require("game.ui.combat_log").render(self, M, p.combat_log)
	elseif name == "quests" then
		journal(self, p)
	elseif name == "map" then
		map_panel(self, p)
	elseif service then
		service_panel(self, p, name)
	elseif name == "dialogue" then
		require("game.ui.services").render(
			self,
			M,
			p.id .. ":" .. p.revision .. ":" .. tostring(S.read_only) .. ":" .. tostring(S.error),
			S.dialogue_service,
			true
		)
	elseif name == "goddess" then
		M.icon(self, 1053, 440, "tile_0087", 110, vmath.vector4(0.7, 0.82, 0.95, 1))
		M.text(self, 124, 470, "The goddess can return you to the entrance outside.", 22, c.white)
		M.text(
			self,
			124,
			420,
			p.run.keys > 0 and "Unused keys and unopened chests will be left behind."
				or "Your collected treasure will come with you.",
			18,
			c.muted
		)
		M.button(self, 384, 305, 470, "Return to town", function()
			command(self, { type = "return", confirm = true })
		end, true, true)
		M.button(self, 884, 305, 350, "Stay here", function()
			S.panel(nil)
		end)
	elseif name == "leave_dungeon" then
		M.text(self, 124, 470, "Would you like to leave the dungeon?", 24, c.white)
		M.text(self, 124, 420, "This run will end. Earned rewards and experience are kept.", 18, c.muted)
		M.button(self, 384, 305, 470, "Leave dungeon", function()
			command(self, { type = "leave_dungeon", run = p.run.id, confirm = true })
		end, true, true)
		M.button(self, 884, 305, 350, "Cancel", function()
			S.panel(nil)
		end)
	elseif name == "discard" or name == "abandon" then
		M.text(
			self,
			124,
			457,
			name == "discard" and "Unclaimed rewards will be lost when you continue."
				or "The current dungeon will end. Claimed rewards and experience remain.",
			22,
			c.white,
			950
		)
		M.button(self, 384, 305, 470, "Confirm", function()
			command(self, { type = name == "discard" and "leave_rewards" or "abandon", confirm = true })
		end, true, true)
	elseif name == "character" then
		local st = p.stats
		M.text(self, 121, 508, p.name .. " · " .. p.race .. " · Age " .. p.age, 25, c.white, nil, true)
		M.text(
			self,
			121,
			466,
			"Level "
				.. p.level
				.. " / Lifetime "
				.. p.cumulative
				.. " / AP "
				.. p.ap
				.. " / Life "
				.. p.life
				.. " · "
				.. p.talent,
			18,
			c.teal
		)
		if self.character_details then
			for index, line in ipairs(p.sources) do
				M.text(self, 121, 417 - (index - 1) * 40, line, 16, c.muted, 1010)
			end
		else
			for index, pool in ipairs({ "hp", "mp", "sp" }) do
				bar(self, 121 + (index - 1) * 345, 387, 300, p.pools[pool], st[pool], c[pool], pool:upper())
			end
			for index, key in ipairs({
				"str",
				"int",
				"dex",
				"wil",
				"luk",
				"speed",
				"defense",
				"magic_defense",
				"melee",
				"ranged",
				"magic",
				"guns",
			}) do
				M.text(
					self,
					121 + math.floor((index - 1) / 4) * 345,
					336 - ((index - 1) % 4) * 37,
					key:upper():gsub("_", " ") .. "   " .. st[key],
					16,
					c.muted
				)
			end
		end
		M.button(self, 865, 579, 330, self.character_details and "Effective stats" or "Sources / effects", function()
			self.character_details = not self.character_details
			self.dirty = true
		end)
		M.text(
			self,
			121,
			171,
			p.run and "Frozen at dungeon entry · Equipment changes in town"
				or "Equipment and progression affect current stats · Raising maxima does not heal",
			14,
			c.teal
		)
	elseif name == "skills" then
		require("game.ui.skills").render(
			self,
			M,
			p.id .. ":" .. p.revision .. ":" .. tostring(S.read_only) .. ":" .. tostring(S.error)
		)
	elseif name == "talent" then
		M.text(self, 121, 467, p.talent .. " · " .. C.skills[C.talents[p.talent].skill].name, 27, c.teal, nil, true)
		M.text(
			self,
			121,
			404,
			"Your talent supplies growth bonuses and a starting skill. Rebirth can change it.",
			20,
			c.muted,
			970
		)
		M.text(self, 121, 326, "Broader talent ranks arrive with the expanded progression systems.", 18, c.muted)
	elseif name == "pets" then
		M.text(self, 121, 459, "Companions are not available in this release.", 23, c.muted)
	elseif name == "menu" then
		M.button(self, 335, 491, 430, "Resume", function()
			S.panel(nil)
		end, true, true)
		M.button(self, 335, 432, 430, "Settings", function()
			S.panel("settings")
		end)
		M.button(self, 335, 373, 430, "Save and return to Title", function()
			S.set_screen("title")
		end)
		if p then
			local seconds = p.rebirth.seconds
			M.button(
				self,
				841,
				491,
				430,
				seconds > 0 and "Rebirth in " .. math.ceil(seconds / 3600) .. " hours" or "Rebirth",
				function()
					self.form = nil
					S.set_screen("rebirth")
				end,
				not p.run and seconds == 0
			)
			M.button(self, 841, 432, 430, "Abandon dungeon", function()
				S.panel("abandon")
			end, p.run ~= nil)
			M.button(self, 841, 373, 430, "Map", function()
				S.panel("map")
			end, p.phase == "town" or p.phase == "dungeon")
		end
		if p then
			M.button(self, 335, 314, 430, "View combat log", function()
				S.panel("log")
			end)
		end
		local errors = S.recovery_errors or {}
		local text = {}
		for _, reason in ipairs(errors) do
			text[#text + 1] = reason
		end
		if #text > 0 then
			M.text(self, 119, 259, table.concat(text, "\n"), 14, c.hp, 970)
		end
	end
	M.button(self, 1112, 610, 132, "Close", function()
		self.shop_inventory = false
		S.panel(nil)
	end)
end
function M.focus(self)
	for _, node in ipairs(self.focus_nodes or {}) do
		gui.set_enabled(node, false)
	end
	local button = self.focus and self.buttons[self.focus]
	if not button or not button.enabled then
		return
	end
	local pos, size = gui.get_position(button.node), gui.get_size(button.node)
	local edges = {
		{ 0, size.y / 2 + 3, size.x + 6, 2 },
		{ 0, -size.y / 2 - 3, size.x + 6, 2 },
		{ -size.x / 2 - 3, 0, 2, size.y + 6 },
		{ size.x / 2 + 3, 0, 2, size.y + 6 },
	}
	for index, edge in ipairs(edges) do
		local node = self.focus_nodes[index]
		gui.set_enabled(node, true)
		gui.set_position(node, vmath.vector3(pos.x + edge[1], pos.y + edge[2], 0))
		gui.set_size(node, vmath.vector3(edge[3], edge[4], 0))
	end
end
function M.render(self)
	local S = self.ui
	local C = S.catalog
	local scope = S.screen .. ":" .. (S.modal or "")
	if scope ~= self.focus_scope then
		if self.focus_scope then
			self.focus_by_scope[self.focus_scope] = self.focus
		end
		self.focus = self.focus_by_scope[scope]
		self.focus_scope = scope
	end
	if self.previous_modal ~= S.modal then
		self.previous_modal = S.modal
		self.inventory_key = nil
		self.inventory_confirmation = nil
		self.skills_key = nil
		self.service_key = nil
		self.shop_inventory = false
	end
	if self.druid then
		self.druid:final()
	end
	for _, node in ipairs(self.nodes or {}) do
		gui.cancel_animations(node)
		gui.delete_node(node)
	end
	self.nodes = {}
	self.buttons = {}
	self.labels = {}
	self.label_texts = {}
	self.label_words = {}
	self.label_metrics = {}
	self.name_input = nil
	self.service_input = nil
	self.inventory_inputs = {}
	self.druid = druid.new(self)
	local p = S.snapshot()
	local screen = S.screen
	local playing = p and screen == p.phase
	if screen == "title" then
		title(self)
	elseif screen == "characters" then
		M.box(self, 640, 360, 1280, 720, c.bg)
		characters(self)
	elseif screen == "create" or screen == "rebirth" then
		M.box(self, 640, 420, 1280, 610, c.bg)
		creation(self, p, screen == "rebirth")
	elseif screen == "battle" then
		battle(self, p)
	elseif screen == "rewards" then
		M.box(self, 640, 420, 1280, 610, c.bg)
		rewards(self, p)
	else
		heading(
			self,
			screen == "town" and "Town1 / A place to begin"
				or p.run.treasure_room and "Alby / Treasure room"
				or "Alby / Beneath the old stones",
			screen == "town" and "Click an NPC to approach and talk. WASD moves; E opens the nearest service. M: map."
				or p.run.boss_defeated and "Treasure chest keys: " .. p.run.keys .. " · Click a chest to open it, or the goddess statue to return to town."
				or "Defeat every monster to open the room gates. Amber gates are locked; teal gates are open."
		)
		M.button(self, 1109, 600, 260, "Map · M", function()
			open(self, "map")
		end)
		M.button(self, 1109, 191, 260, "Interact · E", function()
			if S.world_interact then
				S.world_interact()
			end
		end, true, true)
		M.box(self, 477, 186, 926, 44, c.panel)
		M.text(self, 32, 185, p.last_message or "", 14, c.white, 890)
		for i = 1, 13 do
			self.labels[i] = M.text(self, -100, -100, "", 13, c.white, nil, true, true)
		end
	end
	hud(self, playing and p or nil)
	if S.modal then
		-- Keep the backdrop visible, but remove every underlying input component.
		self.druid:final()
		self.druid = druid.new(self)
		self.buttons = {}
		self.name_input = nil
		modal(self, p, S.modal)
	end
	if S.notice then
		M.box(self, 640, 690, 970, 42, c.panel)
		M.text(self, 181, 690, tostring(S.notice):gsub("^.-:%d+: ", ""), 15, c.sp)
		M.button(self, 1170, 689, 62, "OK", function()
			Bridge.intent(self, "dismiss_notice")
		end)
	end
	if S.error and S.modal ~= "log" then
		self.druid:final()
		self.druid = druid.new(self)
		self.buttons = {}
		self.focus = nil
		self.name_input = nil
		M.box(self, 640, 377, 1200, 540, c.bg)
		M.text(self, 135, 526, "Saving needs attention", 31, c.hp, nil, true)
		M.text(self, 135, 440, tostring(S.error), 19, c.white, 940)
		M.text(
			self,
			135,
			350,
			"The last saved state is safe. Retry this exact action, or reload that state.",
			19,
			c.muted
		)
		M.button(self, 370, 249, 410, "Retry save", function()
			S.retry()
		end, true, true)
		M.button(self, 821, 249, 410, "Reload saved state", function()
			S.reload()
		end)
		if p then
			M.button(self, 595, 187, 460, "View combat log", function()
				S.panel("log")
			end)
		end
	end
	-- Keep the fitted play area letterboxed when the world camera reveals extra terrain.
	local margin = vmath.vector4(0, 0, 0, 1)
	M.box(self, 640, 2768, 8192, 4096, margin)
	M.box(self, 640, -2048, 8192, 4096, margin)
	M.box(self, -2048, 360, 4096, 720, margin)
	M.box(self, 3328, 360, 4096, 720, margin)
	self.focus_nodes = {}
	for index = 1, 4 do
		self.focus_nodes[index] = M.box(self, -100, -100, 1, 1, c.teal)
	end
	M.focus(self)
end
function M.labels(self)
	local S = self.ui
	if S.modal then
		return
	end
	for i, node in ipairs(self.labels or {}) do
		local m = (S.world_labels or {})[i]
		local markup = m
				and m.x > 30
				and m.x < 1230
				and m.y > 214
				and m.y < 569
				and m.label .. (m.service and m.near and " · <color=" .. hex(c.teal) .. ">E</color>" or "")
			or ""
		if markup ~= self.label_texts[i] then
			self.label_texts[i] = markup
			if self.label_words[i] then
				richtext.remove(self.label_words[i])
			end
			local _, words, metrics =
				rich(self, m and m.x or -100, m and m.y + 37 or -100, markup, 13, c.white, nil, true, true, node)
			self.label_words[i] = words
			self.label_metrics[i] = metrics
		end
		if m and markup ~= "" then
			local height = self.label_metrics[i] and self.label_metrics[i].height or 0
			gui.set_position(node, vmath.vector3(m.x - 640, m.y + 37 - 360 + height / 2, 0))
		end
	end
end
return M
