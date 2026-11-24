local M = {}
local function same(a, b, path)
	path = path or "value"
	assert(type(a) == type(b), path .. " has different types")
	if type(a) ~= "table" then
		assert(a == b, path .. ": " .. tostring(a) .. " ~= " .. tostring(b))
		return
	end
	for key, value in pairs(a) do
		same(value, b[key], path .. "." .. tostring(key))
	end
	for key in pairs(b) do
		assert(a[key] ~= nil, "Unexpected key " .. tostring(key))
	end
end
function M.eq(a, b, message)
	local ok, err = pcall(same, a, b)
	assert(ok, message or err)
end
function M.ok(value, message)
	assert(value, message or "Expected truthy value")
end
function M.near(a, b, tolerance)
	assert(math.abs(a - b) <= (tolerance or 0.00001), tostring(a) .. " != " .. tostring(b))
end
function M.reject(fn)
	assert(not pcall(fn), "Expected rejection")
end
return M
