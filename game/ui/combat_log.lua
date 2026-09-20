local Bridge = require("game.ui.session")
local M = {}

function M.move(self,anchor)
    self.log_anchor=anchor;self.log_group=nil;self.log_detail_page=1;Bridge.request(self)
end

function M.scroll(self,direction)
    local log=self.ui.profile and self.ui.profile.combat_log
    if not log or not log.available then return end
    local earlier,later=log.earlier,log.later
    if self.ui.modal~="log" then earlier=log.compact_earlier;later=log.compact_later end
    if direction<0 and earlier then M.move(self,earlier)
    elseif direction>0 then
        if later then M.move(self,later) elseif not log.following then M.move(self,0) end
    end
end

function M.render(self,view,log)
    local c=view.colors
    if not log.available then
        view.text(self,118,505,"No encounter recorded yet.",23,c.muted)
        view.text(self,118,457,"Your next battle will appear here, including its final outcome.",17,c.muted)
        return
    end
    view.text(self,118,534,log.encounter.." · "..log.outcome.." · "..log.origin.." · Round "..log.round,18,c.teal)
    local note=log.incomplete and "Partial history · Older complete operations were omitted." or "Latest encounter · Each row is one saved operation."
    if log.trimmed then note="The position you were reading has left the retained history." end
    view.text(self,118,506,note,13,log.incomplete and c.sp or c.muted)
    for index,row in ipairs(log.rows) do
        view.button(self,419,469-(index-1)*44,606,"T"..row.turn.." · "..row.summary,function()
            self.log_group=self.log_group==row.id and nil or row.id
            self.log_detail_page=1;Bridge.request(self)
        end,true,row.selected)
    end
    view.box(self,942,367,412,248,c.bg)
    view.text(self,756,474,log.detail_title or "Select an operation",16,c.teal)
    if log.selected then
        for index,line in ipairs(log.details) do view.text(self,756,443-(index-1)*23,line,13,c.white) end
        view.button(self,832,226,178,"Detail back",function()
            self.log_detail_page=log.detail_page-1;Bridge.request(self)
        end,log.detail_page>1)
        view.button(self,1037,226,178,"Detail next",function()
            self.log_detail_page=log.detail_page+1;Bridge.request(self)
        end,log.detail_page<log.detail_pages)
        view.text(self,757,253,log.detail_page.." / "..log.detail_pages,12,c.muted)
    else
        view.text(self,756,433,"Costs, hits, recovery and statuses",14,c.muted)
        view.text(self,756,408,"appear here. Browsing never acts.",14,c.muted)
    end
    view.button(self,221,181,210,"Earlier actions",function() M.move(self,log.earlier) end,log.earlier~=nil)
    view.button(self,455,181,210,"Later actions",function() M.move(self,log.later) end,log.later~=nil)
    view.button(self,703,181,250,"Jump to latest",function() M.move(self,0) end,not log.following)
    view.text(self,854,181,log.new_entries>0 and log.new_entries.." new entries" or log.following and "Following latest" or "Reading earlier actions",13,c.muted)
end

return M
