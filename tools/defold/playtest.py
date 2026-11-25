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

def command(action,**params):
 value=result(g.command('rebirth.command',{'command':action,'params':params},timeout=3))
 receipts.append({'kind':'command','command':action,'params':params,'revision':value.get('revision')})
 return value

def key(name):
 r=g.key(name,wait=True,timeout=3)
 receipts.append({'kind':'key','key':name,'receipt':str(r)})
 time.sleep(.12)
 return state()

def click_game(x, y):
 point = g.convert_point((x/1280, y/720), 'normalized_viewport', 'window')
 receipt = g.click(point, wait=True, timeout=3)
 receipts.append({'kind':'click','x':x,'y':y,'receipt':str(receipt)})

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
 click_game(300,346);time.sleep(.15)
 record('Talent dropdown opens without changing the selection',state()['forms']['talent']==0)
 shot('02-talent-dropdown')
 menu=ui_state()['ui'].get('dropdown_options') or []
 record('Talent menu shows available options',any(option['label']=='Magic' for option in menu),menu)
 record('Talent options are rendered inside the menu',bool(g.elements(text_exact='Magic',visible=True,limit=1)))
 key('DOWN');key('ENTER')
 record('Talent keyboard selection commits Magic',state()['forms']['talent']==1,state()['forms'])
 key('ENTER');key('DOWN');key('ESCAPE')
 record('Escape cancels the highlighted Talent choice',state()['forms']['talent']==1 and not ui_state()['ui'].get('dropdown_options'))
 click_game(300,412);time.sleep(.15)
 shot('02-hair-dropdown')
 click_game(300,472);time.sleep(.15)
 record('Hair pointer selection commits Sweep',state()['forms']['hair']==1,state()['forms'])
 key('ENTER')
 wheel_point=g.convert_point((300/1280,530/720),'normalized_viewport','window')
 wheel=g.wheel(wheel_point,steps=-3,wait=True,timeout=3)
 receipts.append({'kind':'wheel','steps':-3,'receipt':str(wheel)})
 click_game(300,654);time.sleep(.15)
 record('Wheel makes the last hairstyle selectable',state()['forms']['hair']==11,state()['forms'])
 key('ENTER');key('TAB')
 ui=ui_state()['ui']
 record('Tab closes the dropdown and moves focus to Hair color',not ui.get('dropdown_options') and ui['buttons'][ui['focus']-1].startswith('Hair color'))
 command('set_form',race=1,talent=0)
 click_game(300,346);time.sleep(.15)
 labels={option['label'] for option in ui_state()['ui']['dropdown_options']}
 record('Elf Talent menu includes Archery and excludes Lance Combat','Archery' in labels and 'Lance Combat' not in labels)
 key('ESCAPE')
 command('set_form',race=2,talent=0)
 click_game(300,346);time.sleep(.15)
 labels={option['label'] for option in ui_state()['ui']['dropdown_options']}
 record('Giant Talent menu includes Lance Combat and excludes Archery','Lance Combat' in labels and 'Archery' not in labels)
 key('ESCAPE')
 for field,y,initial,expected,count in [
  ('age',313,17,16,8),('body',379,1,2,3),('hair_color',445,0,1,10),
  ('skin',478,1,2,4),('eyes',511,0,1,3),('eye_color',544,0,1,10),('face',577,0,1,3)]:
  click_game(681,y);time.sleep(.15)
  options=ui_state()['ui'].get('dropdown_options') or []
  record(field+' opens all dropdown choices without changing its value',len(options)==count and state()['forms'][field]==initial,options)
  if field=='eye_color':
   shot('02-eye-color-dropdown-above')
   click_game(300,332);time.sleep(.15)
  else:
   key('UP' if field=='age' else 'DOWN');key('ENTER')
  record(field+' dropdown commits the selected value',state()['forms'][field]==expected,state()['forms'])
 shot('02-character-choices')
 command('set_form',age=17,body=1,hair_color=0,skin=1,eyes=0,eye_color=0,face=0)
 command('set_form',seed=42,race=0,talent=0,hair=0)
 command('create');record('new character enters arrival',state()['screen']=='arrival')
 command('arrival_continue');command('arrival_continue');s=wait(lambda x:x['screen']=='world')
 record('arrival reaches Lantern Rest',s['location']=='lantern_rest');character_id=s['character_id'];shot('03-world')
 world_buttons=ui_state()['ui']['buttons']
 record('Character appears before Inventory in the bottom bar',world_buttons==['Character [C]','Inventory [I]','Skills [K]','Journal [Q]','Settings','Expand'],world_buttons)
 record('HUD labels the message panel LOG',bool(g.elements(text_exact='LOG',visible=True,limit=1)))
 click_game(98,693)
 record('first bottom button opens Character',wait(lambda v:v['panel']=='character')['panel']=='character')
 fields=['Signal Keeper','ACTIVE TALENT','HP','MP','Stamina','XP','AP','Strength','Magic Protection','Injury Rate','STATUS EFFECTS']
 wait(lambda _: g.elements(text_exact='ACTIVE TALENT',visible=True,limit=1),label='render Character panel')
 missing=[label for label in fields if not g.elements(text_exact=label,visible=True,limit=1)]
 record('character sheet renders identity, resources, progression and combat stats',not missing,missing);shot('03-character')
 key('ESCAPE')
 key('C');record('physical C opens Character',state()['panel']=='character');key('ESCAPE')
 before_repeat=command('gate_register')['log']
 record('consecutive duplicate messages are suppressed',command('gate_register')['log']==before_repeat)
 for _ in range(14):
  command('load',id='')
  command('gate_register')
 record('log history checks preserve unregistered gates',not state()['gates'])
 click_game(400,620)
 record('clicking town log opens the larger Log window',wait(lambda v:v['panel']=='log')['panel']=='log')
 wait(lambda _: ui_state()['ui'].get('log_scroll_y') is not None,label='render expanded Log history')
 latest_scroll=ui_state()['ui'].get('log_scroll_y',0)
 record('expanded Log begins at the newest retained messages',latest_scroll>0,latest_scroll)
 log_point=g.convert_point((600/1280,400/720),'normalized_viewport','window')
 receipt=g.wheel(log_point,steps=2,wait=True,timeout=3);time.sleep(.15)
 receipts.append({'kind':'wheel','steps':2,'receipt':str(receipt)})
 record('wheel scrolls expanded Log toward older messages',ui_state()['ui']['log_scroll_y']<latest_scroll)
 key('HOME')
 record('Home reveals the earliest arrival message',ui_state()['ui']['log_scroll_y']==0 and bool(g.elements(text_exact='You enter Lantern Rest.',visible=True,limit=1)))
 key('END')
 record('End returns expanded Log to the latest messages',ui_state()['ui']['log_scroll_y']==latest_scroll)
 log_position=state()['position'];key('W')
 record('expanded Log consumes world movement',state()['position']==log_position)
 shot('03-expanded-log-town');key('ESCAPE')
 record('Escape closes the Log window',not state()['panel'])
 for _ in range(len(world_buttons)-1):key('TAB')
 record('Enter expands the keyboard-focused Log',key('ENTER')['panel']=='log')
 key('ESCAPE')
 click_game(390,693)
 record('bottom Inventory button opens the panel',wait(lambda v:v['panel']=='inventory')['panel']=='inventory')
 key('ESCAPE')
 origin = state()['position']
 moved = command('move',dx=1,dy=0)
 if moved['position'] == origin:
  moved = command('move',dx=-1,dy=0)
 assert moved['position'] != origin, 'Could not establish an open neighbor'
 time.sleep(.65)
 map_view = ui_state()['ui']['map_view']
 pick_x = map_view['x'] + (origin['x'] - map_view['ox'] + .5) * 16
 pick_y = map_view['y'] + (origin['y'] - map_view['oy'] + .5) * 24
 assert pick_x < 254, 'Expected a map cell within the former sidebar'
 click_game(pick_x,pick_y)
 record('clicking the expanded left map selects the correct tile',wait(lambda v:v['position']==origin)['position']==origin)
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
 dungeon=state()
 wait(lambda _: (ui_state()['ui'].get('map_preview') or {}).get('floor_plan'),label='render the Threshold floor plan')
 ui=ui_state()['ui'];view=ui['map_view'];preview=ui['map_preview']
 record('dungeon camera uses enlarged square tiles within the map area',preview.get('floor_plan') and view['tile_width']==view['tile_height']==12 and view['h']==648,view)
 shot('06-threshold-map')
 click_game(1100,460)
 record('clicking dungeon log opens the larger Log window',wait(lambda v:v['panel']=='log')['panel']=='log')
 shot('06-expanded-log-dungeon')
 click_game(1020,129)
 record('Close button returns from expanded Log to the dungeon',wait(lambda v:not v['panel'])['location']=='threshold')
 record('fog initially hides every future room',dungeon['map']['discovered_rooms']==1,dungeon['map'])
 initial_explored=dungeon['map']['explored_tiles']
 record('the first door stays locked with monsters in its room',dungeon['map']['exit_locked'] and bool(dungeon['map']['enemies']))
 until=time.monotonic()+20
 while not state()['combat'] and time.monotonic()<until:
  s=state();enemies=s['map'].get('enemies',[]);assert enemies,'First room has no enemies'
  enemy=point(enemies[0]);command('path',**enemy)
  if not state().get('move_queued'):
   for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
    command('path',x=enemy['x']+dx,y=enemy['y']+dy)
    if state().get('move_queued'):break
  approach_timeout=max(8,min(30,state()['move_queued']*.16+3))
  wait(lambda v:v['combat'] or not v.get('move_queued'),approach_timeout,'enemy approach')
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
 record('the first door opens after combat',not state()['map']['exit_locked'])
 record('walking reveals more of the dungeon',state()['map']['explored_tiles']>initial_explored)
 # The doorway must be explored before a pointer may select it through fog.
 exit_cell=state()['map']['exit']
 door_approach={'x':exit_cell['x']-1,'y':exit_cell['y']}
 command('path',**door_approach)
 wait(lambda v:v['position']==door_approach,20,'explore the first room exit')
 view=state()['ui']['map_view']
 door_x=view['x']+(preview['exit_x']-view['ox']+.5)*view['tile_width']
 door_y=view['y']+(preview['exit_y']-view['oy']+.5)*view['tile_height']
 click_game(door_x,door_y)
 arrived=wait(lambda v:v['room']==2,45,'walk into the next room from a map click')
 record('clicking the unlocked door enters the next room',arrived['position']==arrived['map']['entry'],arrived['position'])
 record('the second room offers multiple connected chambers',len(arrived['map']['doors'])>=3,arrived['map']['doors'])
 record('fog reveals only visited rooms',arrived['map']['discovered_rooms']==2,arrived['map']['discovered_rooms'])
 remembered=arrived['map']['explored_tiles']
 command('title');command('load',id=character_id)
 restored=wait(lambda v:v['screen']=='world' and v['room']==2,label='restore the explored dungeon')
 record('fog memory survives save and reload',restored['map']['explored_tiles']>=remembered and restored['map']['discovered_rooms']==2)
 command('leave_dungeon');record('returned safely to town',state()['location']=='lantern_rest')
 # Loot can legitimately add stack anchors. Compare the committed post-loot
 # inventory across reload, while separately checking the original equipment.
 committed_gear=state()['gear_inventory']
 record('combat and loot preserve equipped weapon',committed_gear.get('equipped')==equipment.get('equipped'))
 command('title');command('load',id=character_id);s=state()
 record('save/reload preserves character, quest, gear and gate',s['character_id']==character_id and s['quest']==1 and s.get('gear_inventory')==committed_gear and 'lantern_rest' in s['gates'],s)
 shot('07-reloaded-town')
 command('title');command('set_form',name='Corridor Cartographer',world={'location':'threshold','threshold_cleared':3,'generator_version':'defold-v3'})
 corridor=command('create');command('load',id=corridor['character_id'])
 corridor=wait(lambda v:v['screen']=='world' and v['room']==4 and (ui_state()['ui'].get('map_preview') or {}).get('reverse'),label='render a room on the reversed row')
 record('the descending route reverses the second row of rooms',ui_state()['ui']['map_preview']['reverse'])
 key('LEFT')
 record('Left moves left on the reversed row',state()['position']['x']==corridor['position']['x']+1)
 command('title');command('set_form',name='Vault Cartographer',world={'location':'threshold','threshold_cleared':8,'generator_version':'defold-v3','quest':1})
 vault=command('create');command('load',id=vault['character_id'])
 vault=wait(lambda v:v['screen']=='world' and v['room']==9,label='load a completed run at the treasure chamber')
 record('the final treasury contains five chests',len(vault['map']['chests'])==5 and vault['threshold_completions']==0)
 shot('08-threshold-treasure')
 for chest_index in range(2):
  chest=vault['map']['chests'][chest_index]
  beside={'x':chest['x'],'y':chest['y']-1}
  command('path',**beside);wait(lambda v:v['position']==beside,label='approach treasure chest')
  key('E')
  if chest_index==0:
   record('interacting opens the chosen chest',state()['treasure_chest']==0 and state()['panel']=='loot')
   command('take_loot')
  else:
   record('the second chest stays sealed',state()['treasure_chest']==0 and not state()['pending_loot'])
 command('path',**vault['map']['exit'])
 completed=wait(lambda v:v['location']=='spindle_hollow',label='walk through the treasure room exit')
 record('leaving the treasury completes the dungeon',completed['threshold_completions']==1 and completed['quest']==2,completed['threshold_completions'])
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
