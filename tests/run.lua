-- Host-Lua parity suites. Run from repository root with LuaJIT.
package.path = "./?.lua;./?/init.lua;./vendor/ink/?.lua;" .. package.path
local M = { count = 0, failed = 0 }
local function equal(a, b, path)
	if type(a) ~= type(b) then
		return false, (path or "value") .. " has different types"
	end
	if type(a) ~= "table" then
		return a == b, (path or "value") .. ": " .. tostring(a) .. " ~= " .. tostring(b)
	end
	for key, value in pairs(a) do
		local ok, message = equal(value, b[key], (path or "value") .. "." .. tostring(key))
		if not ok then
			return ok, message
		end
	end
	for key in pairs(b) do
		if a[key] == nil then
			return false, "Unexpected key " .. tostring(key)
		end
	end
	return true
end
function M.eq(a, b, message)
	local ok, detail = equal(a, b)
	assert(ok, message or detail)
end
function M.ok(value, message)
	assert(value, message or "Expected truthy value")
end
function M.near(a, b, tolerance)
	assert(math.abs(a - b) <= (tolerance or 0.00001), tostring(a) .. " != " .. tostring(b))
end
function M.reject(fn)
	local ok = pcall(fn)
	assert(not ok, "Expected rejection")
end
function M.test(name, fn)
	M.count = M.count + 1
	local ok, err = xpcall(fn, debug.traceback)
	if ok then
		print("PASS " .. name)
	else
		M.failed = M.failed + 1
		print("FAIL " .. name .. "\n" .. err)
	end
end
local suites = { "profiles", "inventory", "combat", "world", "session", "input", "journey" }
if arg and arg[1] then
	suites = { arg[1] }
end
for _, name in ipairs(suites) do
	local ok, suite = pcall(require, "game.tests.test_" .. name)
	if ok then
		suite(M)
	elseif name ~= "session" then
		error(suite)
	end
end
print(string.format("REBIRTH_TEST_RESULT tests=%d passed=%d failed=%d", M.count, M.count - M.failed, M.failed))
if M.failed > 0 then
	os.exit(1)
end
return M
