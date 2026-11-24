#!/usr/bin/env python3
"""Reproducible desktop journey through the debug bridge; only in-memory characters.
Usage: python3 tools/defold/playtest.py /path/Game.app/Contents/MacOS/Game --output /tmp/rebirth-playtest
"""
import argparse,json,pathlib,re,shutil,signal,subprocess,sys,tempfile,time,traceback
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'vendor/automation-bridge/automation_bridge/automation-bridge-python'))
from automation_bridge import engine
parser=argparse.ArgumentParser();parser.add_argument('executable',type=pathlib.Path);parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path('/tmp/rebirth-playtest'));args=parser.parse_args()
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
checks=[];receipts=[];shots=[];started=time.monotonic();g=None;proc=None;log=None

def deadline(_signum,_frame):raise TimeoutError('Desktop playtest exceeded 180 seconds')
signal.signal(signal.SIGALRM,deadline);signal.alarm(180)
def record(name,condition=True,detail=None):
 assert condition, name+': '+str(detail)
 checks.append({'name':name,'passed':True,'detail':detail})
def result(record):
 value=record.get('result',record)
 return json.loads(value) if isinstance(value,str) else value
def state():return result(g.command('rebirth.state',timeout=3))
def ui_state():return g.state('rebirth.game').value

def command(name,**params):
 value=result(g.command('rebirth.command',{'command':name,'params':params},timeout=3))
 receipts.append({'kind':'command','command':name,'params':params,'revision':value.get('revision')})
 return value

def key(name):
 r=g.key(name,wait=True,timeout=3)
 receipts.append({'kind':'key','key':name,'receipt':str(r)})
 time.sleep(.12)
 return state()

def wait(predicate,timeout=5,label='state transition'):
 end=time.monotonic()+timeout;last={}
 while time.monotonic()<end:
  last=state()
  if predicate(last):return last
  time.sleep(.08)
 raise AssertionError(label+': '+json.dumps(last))

def shot(name):
 r=g.screenshot(wait=True,timeout=4,after_frames=2)
 dest=out/(name+'.png');shutil.copyfile(r.path,dest);shots.append(str(dest))

def point(value):
 if 'cell' in value:return point(value['cell'])
 if isinstance(value,list):return {'x':value[0],'y':value[1]}
 return {'x':int(value['x']),'y':int(value['y'])}

def walk(place_id, camera_origins=None):
 s=state();place=next(p for p in s['map']['landmarks'] if p['id']==place_id);p=point(place)
 for dx,dy in [(0,0),(0,1),(0,-1),(-1,0),(1,0)]:
  target={'x':p['x']+dx,'y':p['y']+dy}
  s=command('path',**target)
  if s['position']==target:return s
  if s.get('move_queued',0)==0:continue
  # Town routes can cross the full 68-cell map; allow their actual queued
  # length instead of timing out an otherwise healthy long walk.
  def arrived(value):
   if camera_origins is not None:
    view = ui_state()['ui']['map_view']
    camera_origins.append((view['ox'], view['oy']))
   return value.get('move_queued',0)==0 or value.get('combat')
  s=wait(arrived,max(8,min(30,s['move_queued']*.2+2)),'walk to '+place_id)
  if s.get('combat'):return s
  if abs(s['position']['x']-p['x'])+abs(s['position']['y']-p['y'])<=1:return s
 raise AssertionError('No reachable service approach: '+place_id)

try:
 exe=args.executable.resolve();assert exe.is_file(),exe
 log=tempfile.TemporaryFile();proc=subprocess.Popen([str(exe),'--config=rebirth.test_mode=1'],cwd=exe.parent,stdout=log,stderr=subprocess.STDOUT)
 until=time.monotonic()+10
 while time.monotonic()<until:
  assert proc.poll() is None,'Game exited during startup'
  log.seek(0);text=log.read().decode(errors='replace');match=re.search(r'Engine service started on port (\d+)',text)
  if match and 'REBIRTH_GAME_READY' in text:
   g=engine.Client(int(match[1]),timeout=3)
   try:published=ui_state();break
   except Exception:g.close();g=None
  time.sleep(.1)
 assert g,'Game/bridge not ready in ten seconds'
 record('all installed runtime libraries ready',all(v['available'] for v in published['libraries'].values()),published['libraries'])
 record('isolated title screen',state()['screen']=='title');shot('01-title')
 record('character menu starts with Defold creation and selection',ui_state()['ui']['buttons']==['[N] New character','[L] Your characters','Settings'])
 key('N');record('physical N opens character creation',state()['screen']=='creation')
 key('ENTER');r=g.type_text('Signal Keeper',wait=True,timeout=3);receipts.append({'kind':'text','receipt':str(r)})
 key('ESCAPE');record('physical name entry preserved completely',state()['forms']['name']=='Signal Keeper',state()['forms']);shot('02-character-creation')
 command('create');record('new character enters arrival',state()['screen']=='arrival')
 command('arrival_continue');command('arrival_continue');s=wait(lambda x:x['screen']=='world')
 record('arrival reaches Lantern Rest',s['location']=='lantern_rest');character_id=s['character_id'];shot('03-world')
 # Keep the rendered town fixtures in the playtest: missing art metadata used
 # to make these six landmarks fall back to the default NPC silhouette.
 amenity_sprites={'oven':0,'loom':1,'spinning_wheel':2,'windmill':3,'fishing':4}
 amenities=[p for p in s['map']['landmarks'] if p['id'] in amenity_sprites]
 record('all six amenities use their original object art',len(amenities)==6 and all(
  p.get('amenity_sprite')==amenity_sprites[p['id']] and p.get('sprite') is None for p in amenities),amenities)
 camera_origins=[]
 walk('windmill',camera_origins);shot('03-town-amenities')
 record('town camera scrolls between tile origins',any(x % 1 or y % 1 for x,y in camera_origins),camera_origins)
 record('scroll offsets remain pixel snapped',all(abs(x*16-round(x*16))<1e-6 and abs(y*24-round(y*24))<1e-6 for x,y in camera_origins))
 key('I');record('physical I opens inventory',state()['panel']=='inventory')
 time.sleep(.15);before=ui_state()['ui'];position=state()['position'];key('RIGHT');key('TAB');time.sleep(.15);after=ui_state()['ui']
 record('inventory arrows and Tab update cursor/focus',before.get('inventory_cursor')!=after.get('inventory_cursor') and before.get('focus')!=after.get('focus'),{'before':before,'after':after})
 key('W');record('modal consumes world movement',state()['position']==position);shot('04-inventory');key('ESCAPE')
 key('K');record('physical K opens skills',state()['panel']=='skills');shot('05-skills');key('ESCAPE')
 walk('warden');command('quest_accept');record('quest accepted through nearby warden',state()['quest']==1)
 walk('blacksmith');command('starter_sword');command('armor');s=state()
 record('starter equipment acquired normally',s.get('starter_sword_claimed') and s.get('armor_owned'),s)
 equipment=s.get('gear_inventory');assert equipment is not None,'Session.state must expose gear_inventory'
 key('I');key('TAB');key('TAB')
 ui=ui_state()['ui']
 record('keyboard focus can inspect equipped main-hand weapon',ui['buttons'][ui['focus']-1].startswith('Main hand'))
 shot('05-equipment-details');key('ESCAPE')
 command('armory_open',family='heavy')
 record('armory opens at the smith',state()['panel']=='armory')
 key('TAB');key('ENTER')
 g.type_text('Ashenx',wait=True,timeout=3);key('BACKSPACE');key('ENTER')
 buttons=ui_state()['ui']['buttons']
 record('armory keyboard search filters visible swords',any('Ashen Greatblade'==name for name in buttons) and 'Copper Greatblade' not in buttons,buttons)
 shot('05-armory-search');key('ESCAPE')
 walk('gate');command('gate_register');record('Moon Gate registered in person','lantern_rest' in state()['gates'])
 walk('dungeon');command('enter_dungeon');record('Threshold entered from settlement',state()['location']=='threshold')
 until=time.monotonic()+20
 while not state()['combat'] and time.monotonic()<until:
  s=state();enemies=s['map'].get('enemies',[]);assert enemies,'First room has no enemies'
  enemy=point(enemies[0]);command('path',**enemy)
  if not state().get('move_queued'):
   for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
    command('path',x=enemy['x']+dx,y=enemy['y']+dy)
    if state().get('move_queued'):break
  wait(lambda v:v['combat'] or not v.get('move_queued'),8,'enemy approach')
  if not state()['combat']:
   s=state();p=s['position'];dx=enemy['x']-p['x'];dy=enemy['y']-p['y']
   if abs(dx)+abs(dy)==1:command('move',dx=dx,dy=dy)
 record('normal grid movement starts encounter',state()['combat']);shot('06-combat')
 key('1');record('physical attack queues',state()['queued_action']=='attack',state()['queued_action'])
 key('2');record('latest command replaces attack with Defend',state()['queued_action']=='defend',state()['queued_action'])
 until=time.monotonic()+35
 while state()['combat'] and time.monotonic()<until:
  key('1');time.sleep(.15)
 s=state();record('real-clock encounter won without altered enemy health',not s['combat'] and s['health']>0,s)
 record('battle awarded experience',s.get('experience',0)>0,s.get('experience'))
 if s['pending_loot']:command('take_loot')
 record('loot collection cleared pending drops',not state()['pending_loot'])
 command('leave_dungeon');record('returned safely to town',state()['location']=='lantern_rest')
 # Loot can legitimately add stack anchors. Compare the committed post-loot
 # inventory across reload, while separately checking the original equipment.
 committed_gear=state()['gear_inventory']
 record('combat and loot preserve equipped weapon',committed_gear.get('equipped')==equipment.get('equipped'))
 command('title');command('load',id=character_id);s=state()
 record('save/reload preserves character, quest, gear and gate',s['character_id']==character_id and s['quest']==1 and s.get('gear_inventory')==committed_gear and 'lantern_rest' in s['gates'],s)
 shot('07-reloaded-town')
 log.seek(0);text=log.read().decode(errors='replace');(out/'engine.log').write_text(text)
 record('no renderer, sound or script warnings/errors',not re.search(r'(?:ERROR|WARNING):(SCRIPT|RESOURCE|GAMEOBJECT|GRAPHICS|SHADER|RENDER|SOUND)',text),text)
 summary={'passed':True,'elapsed_seconds':round(time.monotonic()-started,2),'checks':checks,'receipts':receipts,'screenshots':shots}
except BaseException as error:
 summary={'passed':False,'elapsed_seconds':round(time.monotonic()-started,2),'error':str(error),'traceback':traceback.format_exc(),'checks':checks,'receipts':receipts,'screenshots':shots}
 if log:
  log.seek(0);(out/'engine.log').write_bytes(log.read())
 raise
finally:
 signal.alarm(0)
 if g:g.close()
 if proc and proc.poll() is None:
  proc.terminate()
  try:proc.wait(timeout=3)
  except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=2)
 if log:log.close()
 if 'summary' in globals():
  (out/'summary.json').write_text(json.dumps(summary,indent=2,default=str)+'\n');print(json.dumps(summary,indent=2,default=str))
