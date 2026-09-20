local M = {}
function M.copy(value, seen)
    if type(value) ~= "table" then return value end
    seen = seen or {}
    assert(not seen[value], "Cyclic/shared save tables are not supported")
    seen[value] = true
    local out = {}
    for k, v in pairs(value) do out[k] = M.copy(v, seen) end
    seen[value] = nil
    return out
end
function M.equal(a, b)
    if type(a) ~= type(b) then return false end
    if type(a) ~= "table" then return a == b end
    for k, v in pairs(a) do if not M.equal(v, b[k]) then return false end end
    for k in pairs(b) do if a[k] == nil then return false end end
    return true
end
function M.clamp(n, lo, hi) return math.max(lo, math.min(hi, n)) end
function M.finite(n) return type(n) == "number" and n == n and math.abs(n) < math.huge end
function M.integer(n, lo, hi) return M.finite(n) and n % 1 == 0 and n >= lo and n <= hi end
function M.round(n, places) local f = 10 ^ (places or 0); return math.floor(n * f + 0.5) / f end
function M.keys(t) local a = {}; for k in pairs(t) do a[#a+1] = k end; table.sort(a); return a end
function M.contains(t, value) for _, v in ipairs(t) do if v == value then return true end end; return false end
function M.count(t) local n = 0; for _ in pairs(t) do n = n + 1 end; return n end
function M.id(state, prefix) state.next_id = state.next_id + 1; return prefix .. "_" .. state.id .. "_" .. state.next_id end
function M.require_ok(ok, message) if not ok then error(message, 0) end end
function M.plain(value, depth, seen)
    depth = depth or 0; seen = seen or {}
    if depth > 32 then return false end
    local t = type(value)
    if t == "number" then return M.finite(value) end
    if t == "string" then return #value <= 4096 end
    if t == "boolean" then return true end
    if t ~= "table" or getmetatable(value) or seen[value] then return false end
    seen[value] = true
    local n = 0
    for k, v in pairs(value) do
        n = n + 1
        if n > 20000 or (type(k) ~= "string" and not M.integer(k, 1, 20000)) or not M.plain(v, depth + 1, seen) then return false end
    end
    seen[value] = nil
    return true
end
return M
