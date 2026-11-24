#include <dmsdk/sdk.h>
#if defined(_WIN32)
#include <windows.h>
static HANDLE handle = INVALID_HANDLE_VALUE;
#else
#include <sys/file.h>
#include <fcntl.h>
#include <unistd.h>
static int handle = -1;
#endif
static int Acquire(lua_State* L) {
 const char* path = luaL_checkstring(L, 1);
#if defined(_WIN32)
 if (handle != INVALID_HANDLE_VALUE) { lua_pushboolean(L, 1); return 1; }
 handle = CreateFileA(path, GENERIC_READ|GENERIC_WRITE, 0, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
 lua_pushboolean(L, handle != INVALID_HANDLE_VALUE);
#else
 if (handle >= 0) { lua_pushboolean(L, 1); return 1; }
 int fd = open(path, O_CREAT|O_RDWR, 0600);
 if(fd < 0) { lua_pushboolean(L, 0); return 1; }
 if(flock(fd, LOCK_EX|LOCK_NB) != 0) { close(fd); lua_pushboolean(L, 0); return 1; }
 handle = fd; lua_pushboolean(L, 1);
#endif
 return 1;
}
static int Release(lua_State* L) {
#if defined(_WIN32)
 if(handle != INVALID_HANDLE_VALUE) { CloseHandle(handle); handle = INVALID_HANDLE_VALUE; }
#else
 if(handle >= 0) { flock(handle, LOCK_UN); close(handle); handle = -1; }
#endif
 return 0;
}
static const luaL_reg Methods[] = {{"acquire", Acquire}, {"release", Release}, {0, 0}};
static dmExtension::Result Initialize(dmExtension::Params* p) { luaL_register(p->m_L, "session_lock", Methods); lua_pop(p->m_L, 1); return dmExtension::RESULT_OK; }
static dmExtension::Result Finalize(dmExtension::Params* p) { Release(p->m_L); return dmExtension::RESULT_OK; }
DM_DECLARE_EXTENSION(SessionLock, "SessionLock", 0, 0, Initialize, 0, 0, Finalize)
