local Class = require("game.vendor.rot.class")
local ROT = Class:extend("ROT", {DEFAULT_WIDTH=80, DEFAULT_HEIGHT=24,
 DIRS={FOUR={{0,-1},{1,0},{0,1},{-1,0}}, EIGHT={{0,-1},{1,-1},{1,0},{1,1},{0,1},{-1,1},{-1,0},{-1,-1}}}})
package.loaded[...] = ROT
ROT.Class = Class
function ROT.assert(pass, ...) if pass then return pass,... end error(table.concat({...}),2) end
ROT.RNG = require("game.vendor.rot.rng")
function Class:bind(fn) return function(...)return fn(self,...)end end
Class._rng=ROT.RNG
function Class:getRNG()return self._rng end
function Class:setRNG(rng)self._rng=rng or ROT.RNG;return self end
ROT.FOV=require("game.vendor.rot.fov")
ROT.FOV.Precise=require("game.vendor.rot.fov.precise")
ROT.Map=require("game.vendor.rot.map")
ROT.Type={PointSet=require("game.vendor.rot.type.pointSet")}
ROT.Map.Feature=require("game.vendor.rot.map.feature")
ROT.Map.Room=require("game.vendor.rot.map.room")
ROT.Map.Corridor=require("game.vendor.rot.map.corridor")
ROT.Map.Arena=require("game.vendor.rot.map.arena")
ROT.Map.IceyMaze=require("game.vendor.rot.map.iceyMaze")
return ROT
