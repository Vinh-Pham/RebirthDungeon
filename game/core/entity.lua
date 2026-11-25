local M = {}
local Index = {}
Index.__index = Index

function M.new(decore)
	return setmetatable({ decore = decore, ecs = decore.new_world() }, Index)
end

function Index:sync(landmarks)
	if self.landmarks == landmarks then
		return
	end
	self.ecs:clearEntities()
	self.ecs:refresh()
	for index, landmark in ipairs(landmarks) do
		self.ecs:addEntity({ id = index, landmark_kind = landmark.id, landmark = landmark })
	end
	self.ecs:refresh()
	self.landmarks = landmarks
end

local function nearby(place, player)
	return math.abs(place.x - player.x) + math.abs(place.y - player.y) <= 1
end

function M.nearby_landmark(index, world, kind)
	local landmarks = world.landmarks
	if index then
		index:sync(landmarks)
		for _, entity in ipairs(index.decore.find_entities(index.ecs, "landmark_kind", kind)) do
			if nearby(entity.landmark, world.player) then
				return entity.landmark
			end
		end
	else
		for _, place in ipairs(landmarks) do
			if place.id == kind and nearby(place, world.player) then
				return place
			end
		end
	end
	return false
end

function Index:final()
	self.ecs:clearEntities()
	self.ecs:clearSystems()
	self.ecs:refresh()
end

return M
