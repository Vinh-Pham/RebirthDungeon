-- The pinned Flow release reads display dimensions through Defold's former
-- string configuration accessor. Defold 1.14.1 exposes it as get_config_string.
if not sys.get_config then
	sys.get_config = sys.get_config_string
end

return require("flow.flow")
