local prefix = (...) .. "."
local Class = require(prefix .. "class")
local ROT = Class:extend("ROT", {DEFAULT_WIDTH=80, DEFAULT_HEIGHT=24,
 DIRS={FOUR={{0,-1},{1,0},{0,1},{-1,0}}, EIGHT={{0,-1},{1,-1},{1,0},{1,1},{0,1},{-1,1},{-1,0},{-1,-1}}}})
package.loaded[...] = ROT
ROT.Class = Class
function ROT.assert(pass, ...) if pass then return pass,... end error(table.concat({...}),2) end
ROT.RNG = require(prefix .. "rng")
function Class:bind(fn) return function(...)return fn(self,...)end end
Class._rng=ROT.RNG
function Class:getRNG()return self._rng end
function Class:setRNG(rng)self._rng=rng or ROT.RNG;return self end
ROT.FOV=require(prefix .. "fov")
ROT.FOV.Precise=require(prefix .. "fov.precise")
ROT.Map=require(prefix .. "map")
ROT.Map.Arena=require(prefix .. "map.arena")
return ROT
