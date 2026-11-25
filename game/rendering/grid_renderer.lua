local Grid = require("game.core.grid")
local FloorPlan = require("game.rendering.floor_plan_renderer")
local M = {}
local MAP_VIEW = { x = 16, y = 13, w = 992, h = 552 }
local DUNGEON_VIEW = { x = 16, y = 13, w = 992, h = 648 }
local TILE_WIDTH, TILE_HEIGHT = 16, 24
M.view = MAP_VIEW
M.tile_width, M.tile_height = TILE_WIDTH, TILE_HEIGHT
function M.view_for(world)
	if world and world.currentLocation == "threshold" then
		return DUNGEON_VIEW
	end
	return MAP_VIEW
end

function M.path_target(world, preview, x, y)
	if preview and preview.floor_plan then
		return FloorPlan.path_target(world, x, y)
	end
	if not preview then
		local explored = (world.world.threshold_explored or {})[tostring(world.room)] or {}
		if world.currentLocation == "threshold" and not explored[Grid.key(x, y)] then
			return nil
		end
		return x, y
	end
	return nil
end
local function list(value)
	return type(value) == "table" and value or {}
end
local function cell(p)
	return p and (p.x or p[1]), p and (p.y or p[2])
end
function M.map_text(self, clip, x, y, value, c, font, pivot)
	local node = gui.new_text_node(vmath.vector3(x, 720 - y, 0), value)
	gui.set_font(node, font or "ui")
	gui.set_pivot(node, pivot or gui.PIVOT_W)
	gui.set_color(node, self:color(c))
	gui.set_parent(node, clip, true)
	self.nodes[#self.nodes + 1] = node
end

function M.render(self)
	local world = self.s.world
	if not world or not world.map then
		return
	end
	local map = world.map
	local p = world.player
	local view = M.view_for(world)
	local dungeon = world.currentLocation == "threshold"
	if dungeon and map.chamber then
		FloorPlan.prepare(world.rooms)
		return FloorPlan.render(self, view)
	end
	self.map_preview = nil
	local explored = dungeon and (world.world.threshold_explored or {})[tostring(world.room)] or {}
	local function seen(x, y)
		return not dungeon or explored and explored[Grid.key(x, y)]
	end
	local function visible(x, y)
		return not dungeon or world.visible and world.visible[Grid.key(x, y)]
	end
	local cols, rows = view.w / TILE_WIDTH, view.h / TILE_HEIGHT
	local left = 0
	local top = 0
	local right = map.width
	local bottom = map.height
	local ox = math.floor(math.max(left, math.min(p.x - math.floor(cols / 2), (right or 68) - cols)))
	local oy = math.floor(math.max(top, math.min(p.y - math.floor(rows / 2), (bottom or 42) - rows)))
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
			if not seen(xx, yy) then
				wall, floor, water = nil, nil, nil
			end
			if water or wall and not dungeon then
				self:box(x, y, TILE_WIDTH, TILE_HEIGHT, water and "border" or "dark", clip)
			end
			if wall then
				glyphs[#glyphs + 1] = { x = x - 6, y = y, text = "#", color = visible(xx, yy) and "border" or "floor" }
			elseif water then
				glyphs[#glyphs + 1] = { x = x - 6, y = y, text = "~", color = "water" }
			elseif floor then
				local tint = dungeon and (visible(xx, yy) and "muted" or "floor") or road and "muted" or "floor"
				glyphs[#glyphs + 1] = { x = x - 6, y = y, text = ".", color = tint }
			end
		end
	end
	-- Keep all terrain boxes before all terrain text. Alternating box/font per
	-- cell creates hundreds of font render batches and exhausts the renderer.
	for _, g in ipairs(glyphs) do
		self:map_text(clip, g.x, g.y, g.text, g.color)
	end
	if dungeon then
		for _, door in ipairs({ map.entry, map.exit }) do
			if seen(door.x, door.y) then
				self:map_text(
					clip,
					center_x + door.x * TILE_WIDTH,
					center_y + door.y * TILE_HEIGHT,
					door == map.exit and ">" or "<",
					"gold",
					nil,
					gui.PIVOT_CENTER
				)
			end
		end
		for _, chest in ipairs(list(map.chests)) do
			if seen(chest.x, chest.y) then
				self:map_text(
					clip,
					center_x + chest.x * TILE_WIDTH,
					center_y + chest.y * TILE_HEIGHT,
					"?",
					"gold",
					nil,
					gui.PIVOT_CENTER
				)
			end
		end
	end
	for _, a in ipairs(list(world.landmarks)) do
		local x, y = a.x, a.y
		if not x then
			x, y = cell(a.cell)
		end
		if x and y and seen(x, y) then
			local px, py = center_x + x * TILE_WIDTH, center_y + y * TILE_HEIGHT
			local fixture = dungeon and (a.id == "rack" or a.id == "practice")
			if fixture then
				self:map_text(clip, px, py, a.id == "rack" and "+" or "T", "gold", nil, gui.PIVOT_CENTER)
			elseif a.sprite then
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
				self:map_text(
					clip,
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
					"gold"
				)
			end
			if a.amenity_sprite ~= nil then
				-- Center short lines over each workstation; the six-tile spacing
				-- cannot fit adjacent left-aligned "Spinning Wheel" labels.
				local lines = self:wrap(a.label or a.name, 10)
				for i, line in ipairs(lines) do
					self:map_text(clip, px, py - 21 - (#lines - i) * 14, line, "muted", "ui_small", gui.PIVOT_CENTER)
				end
			elseif a.name and not fixture then
				self:map_text(clip, px - 12, py - 21, a.name, "muted", "ui_small")
			end
		end
	end
	for _, e in ipairs(list(world.enemies)) do
		if visible(e.x, e.y) then
			self:art(
				center_x + e.x * TILE_WIDTH,
				center_y + e.y * TILE_HEIGHT,
				TILE_WIDTH,
				TILE_HEIGHT,
				"spider_atlas_" .. tostring(e.sprite or 0),
				clip
			)
		end
	end
	self:portrait(center_x + p.x * TILE_WIDTH, center_y + p.y * TILE_HEIGHT, self.s.profile, 1, clip)
end
return M
