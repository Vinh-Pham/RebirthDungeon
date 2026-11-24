#!/usr/bin/env python3
"""Verify a generated debug bundle within ten seconds, then stop only its process."""
import argparse,json,pathlib,re,subprocess,tempfile,time,urllib.request
p=argparse.ArgumentParser();p.add_argument('executable',type=pathlib.Path);p.add_argument('--seconds',type=float,default=10);a=p.parse_args()
exe=a.executable.resolve();assert exe.is_file(),exe
lock=json.loads((pathlib.Path(__file__).resolve().parent/'toolchain.json').read_text())
def get(url):
 with urllib.request.urlopen(url,timeout=1) as response:return json.load(response)
with tempfile.TemporaryFile() as log:
 proc=subprocess.Popen([str(exe)],cwd=exe.parent,stdout=log,stderr=subprocess.STDOUT)
 try:
  deadline=time.monotonic()+min(10,max(1,a.seconds));text='';ready=False
  while time.monotonic()<deadline:
   assert proc.poll() is None,'Native game exited during startup'
   log.seek(0);text=log.read().decode(errors='replace')
   assert not re.search(r'ERROR:(SCRIPT|RESOURCE|GAMEOBJECT|GRAPHICS|SHADER)|WARNING:RENDER',text),text
   assert not re.search(r'REBIRTH_LIBRARY[^\n]*unavailable',text),text
   match=re.search(r'Engine service started on port (\d+)',text)
   if match and 'REBIRTH_GAME_READY' in text:
    base='http://127.0.0.1:'+match[1]
    try:
     info=get(base+'/info');health=get(base+'/automation-bridge/v2/health');state=get(base+'/automation-bridge/v2/state?name=rebirth.game')
     assert health.get('ok'),health
     assert state.get('ok') and state.get('data'),state
     assert lock['defold_version'] in json.dumps(info) or lock['defold_version'] in text,'Unexpected engine version'
     assert lock['defold_engine_sha1'][:7] in json.dumps(info) or lock['defold_engine_sha1'][:7] in text,'Unexpected engine revision'
     ready=True;break
    except (OSError,ValueError):pass
   time.sleep(0.1)
  print(text)
  assert ready,'Game and bridge state did not become ready within ten seconds'
  print('Engine:',json.dumps(info));print('Automation Bridge health:',json.dumps(health));print('Published state:',json.dumps(state))
  print('Native bundle launch verification passed')
 finally:
  if proc.poll() is None:
   proc.terminate()
   try:proc.wait(timeout=3)
   except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=2)
