local U=require("game.domain.util")
local V=require("game.domain.validate")
local Skills=require("game.domain.skills")
local Log=require("game.domain.combat_log")
local Treasure=require("game.domain.treasure")
local M={}
local function newer(value,version) return type(value)=="number" and value>(version or 1) end
-- The injected backend is also used to test interrupted and uncertain writes.
function M.new(backend)
    local self={backend=backend}
    function self:load(id)
        local candidates,errors={},{}
        for _,suffix in ipairs({"a","b"}) do
            local record,err,exists=backend.read(id.."_"..suffix)
            if record then
                local table_record=type(record)=="table"
                local payload=table_record and type(record.payload)=="table" and record.payload or nil
                if table_record and record.magic=="RebirthDungeon" and (newer(record.version) or payload and
                    (newer(payload.format_version,3) or newer(payload.rules_version,2) or newer(payload.content_version) or type(payload.combat_log)=="table" and newer(payload.combat_log.version) or type(payload.run)=="table" and newer(payload.run.treasure_version))) then
                    return nil,"A newer game version wrote this character",true
                end
                local ok=table_record and record.magic=="RebirthDungeon" and record.version==1 and U.integer(record.generation,1,1000000000)
                    and payload and payload.id==id and payload.generation==record.generation and V.safe(payload)
                if ok then candidates[#candidates+1]={suffix=suffix,record=record} else errors[#errors+1]="Invalid slot "..suffix end
            elseif exists or err then errors[#errors+1]=err or "Unreadable slot "..suffix end
        end
        table.sort(candidates,function(a,b) return a.record.generation>b.record.generation end)
        if #candidates>0 then return Treasure.migrate(Log.migrate(Skills.migrate(U.copy(candidates[1].record.payload)))),#errors>0 and "Recovered the previous valid save generation" or nil,true,candidates[1].suffix end
        return nil,#errors>0 and table.concat(errors,"; ") or nil,#errors>0
    end
    function self:commit(candidate)
        U.require_ok(candidate.rules_version==2 and candidate.format_version==3,"Migrate the character before saving")
        V.profile(candidate)
        local previous,err,exists,slot=self:load(candidate.id)
        if exists and not previous then return nil,err end
        if previous and previous.revision>=candidate.revision then
            if previous.revision==candidate.revision then
                local same=U.copy(candidate);same.generation=previous.generation
                if U.equal(previous,same) then candidate.generation=previous.generation;return true end
            end
            return nil,"Save changed on disk; reload before retrying"
        end
        candidate.generation=(previous and previous.generation or 0)+1
        local name=candidate.id.."_"..(slot=="a" and "b" or "a")
        local record={magic="RebirthDungeon",version=1,generation=candidate.generation,payload=U.copy(candidate)}
        local ok,result=pcall(backend.write,name,record)
        local observed=backend.read(name)
        if observed and U.equal(observed,record) and V.safe(observed.payload) then return true end
        return nil,ok and (result and "Saved data failed read-back validation" or "Storage write failed") or tostring(result)
    end
    function self:list()
        local profiles,errors={},{}
        -- Fixed stable slots make the index reconstructible without a separate pointer write.
        for i=1,20 do
            local id=string.format("profile_%02d",i);local p,err,exists=self:load(id)
            if p then profiles[#profiles+1]=p end
            if err then errors[#errors+1]={id=id,error=err,recovered=not not p} end
        end
        return profiles,errors
    end
    return self
end
function M.defsave_backend(appname)
    local defsave=require("defsave.defsave")
    defsave.appname=appname or sys.get_config_string("storage.appname","RebirthDungeon");defsave.use_default_data=false;defsave.block_reloading=false
    defsave.verbose=false
    local backend={}
    function backend.read(name)
        local path=defsave.get_file_path(name);local f,err,code=io.open(path,"rb")
        if not f then
            if code==2 then return nil,nil,false end
            return nil,"Save file could not be read: "..tostring(err),true
        end
        f:close()
        local ok,data=pcall(sys.load,path)
        if not ok or type(data)~="table" or next(data)==nil then return nil,"Corrupt or unreadable save",true end
        return data,nil,true
    end
    function backend.write(name,record)
        -- The store has already selected a safe inactive slot. Seed its in-memory
        -- replacement directly: loading a damaged old file would prevent recovery.
        defsave.loaded[name]={data={},changed=true}
        for key,value in pairs(record) do defsave.set(name,key,U.copy(value)) end
        return defsave.save(name,true)
    end
    function backend.lock()
        return session_lock and session_lock.acquire(defsave.get_file_path("writer_lock"))
    end
    function backend.release() if session_lock then session_lock.release() end end
    return backend
end
return M
