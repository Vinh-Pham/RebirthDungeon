local M = { VERSION = "park-miller-v1" }
function M.new(seed)
	local s = math.floor(tonumber(seed) or 1) % 2147483647
	if s <= 0 then
		s = 1
	end
	return {
		range = function(self, a, b)
			s = (s * 16807) % 2147483647
			return a + s % (b - a + 1)
		end,
		float = function(self)
			s = (s * 16807) % 2147483647
			return (s - 1) / 2147483646
		end,
		state = function()
			return s
		end,
		restore = function(self, value)
			assert(
				type(value) == "number" and value >= 1 and value < 2147483647 and value % 1 == 0,
				"Invalid RNG state"
			)
			s = value
		end,
	}
end
return M
