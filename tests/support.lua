local M = {}
function M.mock_rng(seed, seq)
	-- Test double only. Native PCG32 has separate known-sequence engine fixtures.
	local n = (seed + seq) % 2147483647
	return {
		number = function()
			n = (n * 48271) % 2147483647
			return n
		end,
	}
end
function M.backend()
	local U = require("game.domain.util")
	local b = { data = {}, mode = "ok" }
	function b.read(name)
		local d = b.data[name]
		if d == "corrupt" then
			return nil, "Corrupt fixture", true
		end
		return d and U.copy(d), nil, d ~= nil
	end
	function b.write(name, value)
		if b.mode == "fail" then
			return nil
		end
		if b.mode == "corrupt" then
			b.data[name] = "corrupt"
			return true
		end
		b.data[name] = U.copy(value)
		if b.mode == "uncertain" then
			return nil
		end
		return true
	end
	return b
end
return M
