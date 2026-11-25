local M = {}
local MAP_VIEW = { x = 16, y = 13, w = 992, h = 552 }
local TILE_WIDTH, TILE_HEIGHT = 16, 24
M.view = MAP_VIEW
M.tile_width, M.tile_height = TILE_WIDTH, TILE_HEIGHT
local function list(value) return type(value) == "table" and value or {} end
local function cell(p) return p and (p.x or p[1]), p and (p.y or p[2]) end
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
		self:map_text(clip, g.x, g.y, g.text, g.color)
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
			elseif a.name then
				self:map_text(clip, px - 12, py - 21, a.name, "muted", "ui_small")
			end
		end
	end
	for _, e in ipairs(list(world.enemies)) do
		self:art(center_x + e.x * TILE_WIDTH, center_y + e.y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT, "spider_atlas_" .. tostring(e.sprite or 0), clip)
	end
	self:portrait(center_x + p.x * TILE_WIDTH, center_y + p.y * TILE_HEIGHT, self.s.profile, 1, clip)
end
return M
