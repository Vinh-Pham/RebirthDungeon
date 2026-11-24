local M = {}

function M.copy(value, seen)
	if type(value) ~= "table" then
		return value
	end
	seen = seen or {}
	if seen[value] then
		return seen[value]
	end
	local out = {}
	seen[value] = out
	for key, item in pairs(value) do
		out[M.copy(key, seen)] = M.copy(item, seen)
	end
	return out
end

function M.clamp(value, low, high)
	return math.max(low, math.min(high, value))
end
function M.integer(value, low, high)
	return type(value) == "number"
		and value == value
		and value ~= math.huge
		and value ~= -math.huge
		and value == math.floor(value)
		and (low == nil or value >= low)
		and (high == nil or value <= high)
end
function M.key(x, y)
	return tostring(x) .. "," .. tostring(y)
end
-- World updates replace each supplied field as a transaction; nested fields
-- are deliberately not recursively merged (inventory deletion must survive).
function M.merge(base, changes)
	local out = M.copy(base)
	for key, value in pairs(changes or {}) do
		out[key] = M.copy(value)
	end
	return out
end
function M.contains(array, value)
	for _, item in ipairs(array or {}) do
		if item == value then
			return true
		end
	end
	return false
end
function M.sorted_keys(values)
	local out = {}
	for key in pairs(values or {}) do
		out[#out + 1] = key
	end
	table.sort(out)
	return out
end
function M.empty(value)
	return type(value) ~= "table" or next(value) == nil
end
function M.utf8_prefix(value, count)
	local out = {}
	for point in tostring(value):gmatch("[%z\1-\127\194-\244][\128-\191]*") do
		if #out >= count then
			break
		end
		out[#out + 1] = point
	end
	return table.concat(out)
end
return M
