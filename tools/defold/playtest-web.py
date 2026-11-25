#!/usr/bin/env python3
"""Isolated HTML5 journey. Run with: uv run --with playwright python tools/defold/playtest-web.py <bundle>.
Owns its loopback server/browser; never uses an existing browser profile.
"""
import argparse,contextlib,functools,http.server,json,pathlib,re,signal,subprocess,sys,tempfile,threading,time,traceback
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('bundle',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('/tmp/rebirth-web-playtest'));args=p.parse_args()
bundle=args.bundle.resolve();assert (bundle/'index.html').is_file(),bundle
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
checks=[];console=[];errors=[];shots=[];started=time.monotonic();browser=None;server=None;thread=None

def alarm(_signum,_frame):raise TimeoutError('HTML5 playtest exceeded 180 seconds')
signal.signal(signal.SIGALRM,alarm);signal.alarm(180)
class Handler(http.server.SimpleHTTPRequestHandler):
 def end_headers(self):
  self.send_header('Cross-Origin-Opener-Policy','same-origin');self.send_header('Cross-Origin-Embedder-Policy','require-corp');super().end_headers()
 def log_message(self,*_):pass

def check(name,passed=True,detail=None):
 assert passed,name+': '+str(detail)
 checks.append({'name':name,'passed':True,'detail':detail})

def state():return page.evaluate('window.rebirthGameState || null')
def wait(js,timeout=10000):page.wait_for_function(js,timeout=timeout)
def command(name,**params):
 revision=(state() or {}).get('revision',-1)
 page.evaluate('entry => { (window.rebirthGameCommands ||= []).push(entry); }',{'command':name,'params':params})
 page.wait_for_function('(r)=>window.rebirthGameState && window.rebirthGameState.revision > r',arg=revision,timeout=5000)
 return state()

def key(value):
 page.keyboard.press(value,delay=100);page.wait_for_timeout(200);return state()

def shot(name):
 path=out/(name+'.png');page.screenshot(path=str(path));shots.append(str(path))

def focus_canvas():
 page.locator('canvas').evaluate('(c)=> {c.tabIndex=0; c.focus();}')

def canvas_point(logical_x, logical_y):
 rect=page.locator('canvas').bounding_box();assert rect
 scale=min(rect['width']/1280,rect['height']/720)
 x=rect['x']+(rect['width']-1280*scale)/2+logical_x*scale
 y=rect['y']+(rect['height']-720*scale)/2+logical_y*scale
 return x,y,rect

def map_pick_test(label):
 # Establish a known legal neighboring destination through the same move rules,
 # then click back to the former tile using the viewport's actual fit transform.
 old=state()['position'];moved=command('move',dx=1,dy=0)
 if moved['position']==old:moved=command('move',dx=-1,dy=0)
 check(label+' establishes legal neighbor',moved['position']!=old,moved)
 current=moved['position'];map_info=moved['map'];ox=max(0,min(current['x']-31,max(0,map_info['width']-62)));oy=max(0,min(current['y']-9,max(0,map_info['height']-19)))
 page.wait_for_timeout(650)
 logical_x=24+(old['x']-ox)*16;logical_y=121+(old['y']-oy)*24
 assert logical_x < 254, 'Expected a destination in the expanded left side of the map'
 x,y,rect=canvas_point(logical_x,logical_y)
 page.mouse.click(x,y,delay=100);page.wait_for_timeout(200)
 check(label+' click receipt',True,{'target':old,'before':current,'after':state()['position'],'queued':state()['move_queued'],'canvas':rect,'click':{'x':x,'y':y}})
 page.wait_for_function('(p)=>window.rebirthGameState.position.x===p.x && window.rebirthGameState.position.y===p.y',arg=old,timeout=5000)
 check(label+' canvas picking returns to expected grid cell',state()['position']==old)

try:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(bundle)))
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 with sync_playwright() as pw:
  try:browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
  except Exception as exc:
   if 'Executable doesn\'t exist' not in str(exc):raise
   subprocess.run([sys.executable,'-m','playwright','install','chromium'],check=True,timeout=100)
   browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
  context=browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1)
  page=context.new_page();page.on('console',lambda message:console.append({'type':message.type,'text':message.text}));page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/',wait_until='domcontentloaded',timeout=30000)
  wait('window.rebirthGameState && window.rebirthGameState.screen === "title"',45000)
  check('HTML5 engine and debug state ready',not errors,errors);shot('01-web-title')
  focus_canvas();key('n');wait('window.rebirthGameState.screen === "creation"');check('physical N opens creation',state()['screen']=='creation')
  key('Enter');page.keyboard.type('Web Signal',delay=60);wait('window.rebirthGameState.forms.name === "Web Signal"',5000);key('Escape');check('complete name typed into canvas',state()['forms']['name']=='Web Signal',state()['forms']);shot('02-web-creation')
  command('create');command('arrival_continue');command('arrival_continue');wait('window.rebirthGameState.screen === "world"')
  saved=state();character_id=saved['character_id'];check('created isolated browser character in Lantern Rest',saved['location']=='lantern_rest');shot('03-web-world')
  x,y,_=canvas_point(390,693)
  page.mouse.click(x,y,delay=100)
  wait('window.rebirthGameState.panel === "inventory"')
  check('bottom Inventory button opens the panel',state()['panel']=='inventory')
  key('Escape')
  focus_canvas();key('i');check('physical I opens inventory',state()['panel']=='inventory');position=state()['position'];key('w');check('modal blocks world input',state()['position']==position);shot('04-web-inventory')
  # A new satchel allocates its starting gold at the first free cell.
  # The anchor is persisted after the first inventory change.
  source = state()['gear_inventory'].get('stack_positions', {}).get('gold', [[0, 0]])[0]
  destination = [2 if source[0] != 2 else 3, source[1]]
  grid_y = 178+(source[1]+.5)*43
  x, y, _ = canvas_point(256+(source[0]+.5)*43, grid_y)
  target_x, target_y, _ = canvas_point(256+(destination[0]+.5)*43, grid_y)
  page.mouse.move(x,y);page.wait_for_timeout(180);shot('04-web-stack-details')
  page.mouse.down()
  page.mouse.move(target_x,target_y,steps=8)
  page.wait_for_timeout(100);page.mouse.up()
  page.wait_for_function('(p)=>JSON.stringify(window.rebirthGameState.gear_inventory.stack_positions?.gold?.[0])===JSON.stringify(p)',arg=destination,timeout=5000)
  check('canvas drag moves a gold stack to the chosen slot', state()['gear_inventory']['stack_positions']['gold'][0] == destination)
  key('Escape')
  focus_canvas();map_pick_test('1280x720')
  page.set_viewport_size({'width':900,'height':700});page.wait_for_timeout(300);focus_canvas();shot('05-web-resized-900x700');map_pick_test('900x700')
  page.set_viewport_size({'width':1280,'height':720});page.wait_for_timeout(300);shot('06-web-restored-1280x720')
  before_reload=state();page.wait_for_timeout(1500);page.reload(wait_until='domcontentloaded',timeout=30000);wait('window.rebirthGameState && window.rebirthGameState.screen === "title"',45000)
  command('load',id=character_id);wait('window.rebirthGameState.screen === "world"')
  loaded=state();check('IndexedDB preserves character across reload',loaded['character_id']==character_id and loaded['character']=='Web Signal',loaded)
  check('IndexedDB preserves position, quest and inventory',loaded['position']==before_reload['position'] and loaded['quest']==before_reload['quest'] and loaded['gear_inventory']==before_reload['gear_inventory'],{'before':before_reload,'after':loaded});shot('07-web-reloaded')
  focus_canvas();key('k');check('canvas focus restored after reload',state()['panel']=='skills');shot('08-web-skills')
  library_lines=[e['text'] for e in console if 'REBIRTH_LIBRARY' in e['text']]
  unavailable=[line for line in library_lines if 'unavailable' in line and 'automation_bridge' not in line]
  check('all web-capable libraries load',not unavailable,{'unavailable':unavailable,'all':library_lines})
  script_errors=[e for e in console if re.search(r'ERROR:(SCRIPT|RESOURCE|GAMEOBJECT|GRAPHICS|SHADER)|WARNING:RENDER',e['text'])]
  check('no browser or Lua/render errors',not errors and not script_errors,{'pageerrors':errors,'engineerrors':script_errors})
  summary={'passed':True,'elapsed_seconds':round(time.monotonic()-started,2),'checks':checks,'screenshots':shots,'browser':'Chromium','storage':'isolated browser context / IndexedDB'}
  context.close();browser.close();browser=None
except BaseException as error:
 summary={'passed':False,'elapsed_seconds':round(time.monotonic()-started,2),'error':str(error),'traceback':traceback.format_exc(),'checks':checks,'screenshots':shots}
 raise
finally:
 signal.alarm(0)
 if browser:
  with contextlib.suppress(Exception):browser.close()
 if server:server.shutdown();server.server_close()
 if thread:thread.join(timeout=2)
 (out/'console.json').write_text(json.dumps({'console':console,'pageerrors':errors},indent=2)+'\n')
 if 'summary' in globals():(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
