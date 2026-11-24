return function(t)
	local Input = require("game.services.input")
	t.test("default movement aliases and battle commands share a semantic layer", function()
		local input = Input.new({
			read = function()
				return nil
			end,
		})
		local command, args = input:resolve("key_w")
		t.eq(command, "move")
		t.eq(args, { dx = 0, dy = -1 })
		local other, params = input:resolve("key_up")
		t.eq(other, command)
		t.eq(params, args)
		t.eq(input:resolve("key_3"), "smash")
		t.eq(input:resolve("key_enter"), "interact")
		t.eq(input:resolve("text"), nil)
		t.eq(input:resolve("touch"), nil)
	end)
	t.test("rebinding persists and replaces all command aliases", function()
		local saved
		local input = Input.new({
			read = function() end,
			write = function(p)
				saved = p
				return true
			end,
		})
		t.ok(input:bind("move_up", "key_b"))
		t.eq(input:resolve("key_w"), nil)
		t.eq(input:resolve("key_up"), nil)
		local restored = Input.new({
			read = function()
				return saved
			end,
		})
		local command, args = restored:resolve("key_b")
		t.eq(command, "move")
		t.eq(args.dy, -1)
		local rows = restored:bindings()
		rows[1].key = "key_z"
		t.eq(restored:bindings()[1].key, "key_b")
	end)
	t.test("conflicts include primary keys and arrow aliases", function()
		local writes = 0
		local input = Input.new({
			read = function() end,
			write = function()
				writes = writes + 1
				return true
			end,
		})
		t.ok(not input:bind("inventory", "key_w"))
		t.ok(not input:bind("inventory", "key_up"))
		t.eq(writes, 0)
		t.ok(not input:bind("inventory", nil))
		t.ok(input:bind("move_up", "key_b"))
		t.ok(input:bind("inventory", "key_w"))
		t.eq(input:resolve("key_w"), "inventory")
	end)
	t.test("menu text and quick slot keys cannot be stolen by remapping", function()
		local input = Input.new({ read = function() end })
		for _, key in ipairs({
			"key_tab",
			"key_esc",
			"key_enter",
			"key_numpad_enter",
			"key_backspace",
			"key_lshift",
			"key_f1",
			"text",
			"mouse_wheel_up",
			"invalid_key",
		}) do
			t.ok(not input:bind("inventory", key), key)
		end
	end)
	t.test("failed persistence retains the prior complete input map", function()
		local input = Input.new({
			read = function() end,
			write = function()
				return false
			end,
		})
		local before = input:serialize()
		t.ok(not input:bind("inventory", "key_b"))
		t.eq(input:serialize(), before)
		t.eq(input:resolve("key_i"), "inventory")
		t.ok(not input:reset())
		t.eq(input:serialize(), before)
	end)
	t.test("malformed persisted maps fall back as a whole without duplicate routes", function()
		for _, packet in ipairs({
			false,
			{ schema_version = 2, bindings = {} },
			{ schema_version = 1, bindings = { inventory = "key_w" } },
			{ schema_version = 1, bindings = { unknown = "key_b" } },
			{ schema_version = 1, bindings = { inventory = {} } },
		}) do
			local input = Input.new({
				read = function()
					return packet
				end,
			})
			t.ok(input.load_error ~= nil)
			t.eq(input:resolve("key_i"), "inventory")
			t.eq(input:resolve("key_w"), "move")
		end
	end)
	t.test("reset restores defaults and persists independently of character data", function()
		local packet
		local input = Input.new({
			read = function() end,
			write = function(p)
				packet = p
				return true
			end,
		})
		t.ok(input:bind("inventory", "key_b"))
		t.ok(input:reset())
		t.eq(input:resolve("key_i"), "inventory")
		t.eq(input:resolve("key_b"), nil)
		t.eq(packet, { schema_version = 1, bindings = {} })
	end)
	t.test("hashed engine input resolves aliases without engine globals", function()
		local input = Input.new({ read = function() end })
		local command, args = input:resolve_hash("HASH:key_left", function(s)
			return "HASH:" .. s
		end)
		t.eq(command, "move")
		t.eq(args, { dx = -1, dy = 0 })
		t.eq(
			input:resolve_hash("HASH:text", function(s)
				return "HASH:" .. s
			end),
			nil
		)
	end)
end
