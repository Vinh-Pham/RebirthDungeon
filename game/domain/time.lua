-- Gregorian arithmetic; independent of the host timezone and DST settings.
-- America/Los_Angeles since 2007: second Sunday March / first Sunday November.
local M = {}
function M.days(y,m,d)
    if m <= 2 then y = y - 1 end
    local era = math.floor(y / 400); local yo = y - era * 400
    local mp = m + (m > 2 and -3 or 9)
    return era * 146097 + yo * 365 + math.floor(yo/4) - math.floor(yo/100)
        + math.floor((153*mp+2)/5) + d - 1 - 719468
end
function M.civil(day)
    local z=day+719468; local era=math.floor(z/146097); local doe=z-era*146097
    local yo=math.floor((doe-math.floor(doe/1460)+math.floor(doe/36524)-math.floor(doe/146096))/365)
    local y=yo+era*400; local doy=doe-(365*yo+math.floor(yo/4)-math.floor(yo/100))
    local mp=math.floor((5*doy+2)/153); local d=doy-math.floor((153*mp+2)/5)+1
    local m=mp+(mp<10 and 3 or -9); if m<=2 then y=y+1 end
    return y,m,d
end
local function sunday(y,m,n)
    local day=M.days(y,m,1); local weekday=(day+4)%7
    return 1+(7-weekday)%7+7*(n-1)
end
function M.noon(day)
    local y,m,d=M.civil(day)
    assert(y>=2007 and y<=2199, "Clock outside supported calendar (2007–2199)")
    local dst=(m>3 and m<11) or (m==3 and d>=sunday(y,3,2)) or (m==11 and d<sunday(y,11,1))
    return day*86400 + (dst and 19 or 20)*3600
end
function M.latest(now)
    assert(type(now)=="number" and now>=1167609600 and now<7258118400,"Unsupported clock")
    local day=math.floor(now/86400)
    day=day-(((day+4)%7-6)%7)
    if M.noon(day)>now then day=day-7 end
    return day
end
function M.next_age(now) return M.noon(M.latest(now)+7) end
function M.cooldown(cumulative)
    if cumulative<5000 then return 86400 elseif cumulative<8000 then return 2*86400 elseif cumulative<10000 then return 4*86400 else return 6*86400 end
end
return M
