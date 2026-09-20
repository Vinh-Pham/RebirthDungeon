local M={}
-- Invert the same centered fixed-fit transform used by the renderer and root GUI.
function M.design(screen_x,screen_y,width,height)
    local scale=math.min(width/1280,height/720)
    return (screen_x-(width-1280*scale)/2)/scale,(screen_y-(height-720*scale)/2)/scale
end
return M
