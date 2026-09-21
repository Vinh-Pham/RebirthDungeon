-- The native object never escapes this adapter or enters a save.
local U = require("game.domain.util")
local M = { MAX_DRAWS = 1000000 }
function M.seed(a, b)
	return { format_version = 1, algorithm = "pcg32", seed_state = a, seed_sequence = b, raw_draw_count = 0 }
end
function M.valid(d)
	return type(d) == "table"
		and d.format_version == 1
		and d.algorithm == "pcg32"
		and U.integer(d.seed_state, 0, 4294967295)
		and U.integer(d.seed_sequence, 0, 4294967295)
		and U.integer(d.raw_draw_count, 0, M.MAX_DRAWS)
end
function M.open(descriptor, factory)
	assert(M.valid(descriptor), "Invalid random stream")
	factory = factory or function(a, b)
		assert(rng, "Native Defold RNG is required")
		return rng.pcg32(a, b)
	end
	local native = factory(descriptor.seed_state, descriptor.seed_sequence)
	for _ = 1, descriptor.raw_draw_count do
		native:number()
	end
	local stream = {}
	function stream:raw()
		assert(descriptor.raw_draw_count < M.MAX_DRAWS, "Random stream replay limit exceeded")
		local n = native:number()
		descriptor.raw_draw_count = descriptor.raw_draw_count + 1
		return n
	end
	function stream:int(lo, hi)
		assert(U.integer(lo, 0, 4294967295) and U.integer(hi, lo, 4294967295))
		local span = hi - lo + 1
		local limit = 4294967296 - (4294967296 % span)
		local x = self:raw()
		while x >= limit do
			x = self:raw()
		end
		return lo + x % span
	end
	function stream:chance(p)
		assert(U.finite(p) and p >= 0 and p <= 1)
		-- Certain/impossible results consume no draw. Locked by fixtures.
		if p == 0 then
			return false
		end
		if p == 1 then
			return true
		end
		return self:int(0, 9999) < math.floor(p * 10000 + 0.5)
	end
	function stream:shuffle(a)
		for i = #a, 2, -1 do
			local j = self:int(1, i)
			a[i], a[j] = a[j], a[i]
		end
		return a
	end
	return stream
end
return M
