"""Fetch primary documentation with Firecrawl, bounded to two concurrent jobs."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess, datetime, json, time, threading
rate_lock = threading.Lock()
last_request = 0.0

root = Path(__file__).resolve().parents[1]
entries = {
 'phaser-scenes': 'https://docs.phaser.io/phaser/concepts/scenes',
 'phaser-api': 'https://docs.phaser.io/api-documentation/api-documentation',
 'phaser-tilemaps': 'https://docs.phaser.io/api-documentation/class/tilemaps-tilemap',
 'phaser-physics': 'https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics',
 'phaser-input': 'https://docs.phaser.io/api-documentation/class/input-inputplugin',
 'phaser-camera': 'https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera',
 'phaser-scale': 'https://docs.phaser.io/api-documentation/class/scale-scalemanager',
 'phaser-loader': 'https://docs.phaser.io/api-documentation/class/loader-loaderplugin',
 'phaser-animation': 'https://docs.phaser.io/api-documentation/class/animations-animationmanager',
 'phaser-audio': 'https://docs.phaser.io/api-documentation/class/sound-web audiosoundmanager'.replace(' ',''),
 'mabinogi-town': 'https://wiki.mabinogiworld.com/view/Tir_Chonaill',
 'mabinogi-alby': 'https://wiki.mabinogiworld.com/view/Alby_Beginner',
 'mabinogi-dungeons': 'https://wiki.mabinogiworld.com/view/Category:Dungeons',
 'mabinogi-level': 'https://wiki.mabinogiworld.com/view/Level',
 'mabinogi-character': 'https://wiki.mabinogiworld.com/view/Character',
 'mabinogi-rebirth': 'https://wiki.mabinogiworld.com/view/Rebirth',
 'mabinogi-talent': 'https://wiki.mabinogiworld.com/view/Talent',
 'mabinogi-human': 'https://wiki.mabinogiworld.com/view/Human',
 'mabinogi-elf': 'https://wiki.mabinogiworld.com/view/Elf',
 'mabinogi-giant': 'https://wiki.mabinogiworld.com/view/Giant',
 'mabinogi-archery': 'https://wiki.mabinogiworld.com/view/Archery_(Talent)',
 'mabinogi-magic': 'https://wiki.mabinogiworld.com/view/Magic_(Talent)',
 'mabinogi-melee': 'https://wiki.mabinogiworld.com/view/Close_Combat_(Talent)',
 'mabinogi-guns': 'https://wiki.mabinogiworld.com/view/Gunslinger_(Talent)',
 'dicero': 'https://apps.apple.com/si/iphone/story/id1876466957?l=sl',
 'immer': 'https://immerjs.github.io/immer/produce/',
 'immer-pitfalls': 'https://immerjs.github.io/immer/pitfalls/',
 'xstate-actors': 'https://stately.ai/docs/actors',
 'xstate-persistence': 'https://stately.ai/docs/persistence',
 'vitest': 'https://vitest.dev/guide/',
 'playwright': 'https://playwright.dev/docs/test-configuration',
}
for slug in ['plugin-list','eightdirection','button','anchor','shake-position','fadeoutdestroy','fadevolume']:
 entries['rex-'+slug] = 'https://rexrainbow.github.io/phaser3-rex-notes/docs/site/'+slug+'/'
date = datetime.datetime.now(datetime.timezone.utc).isoformat()
dest = root/'docs/references'; dest.mkdir(parents=True, exist_ok=True)
raw = root/'.firecrawl'; raw.mkdir(exist_ok=True)
def fetch(pair):
 name,url=pair; output=raw/(name+'.md')
 if (dest/(name+'.md')).exists(): return {'name':name,'url':url,'status':'saved','retrieved':date}
 global last_request
 with rate_lock:
  time.sleep(max(0, 7.0-(time.monotonic()-last_request)))
  last_request=time.monotonic()
 result=subprocess.run(['firecrawl','scrape',url,'--only-main-content','-o',str(output)],capture_output=True,text=True)
 if result.returncode or not output.exists(): return {'name':name,'url':url,'status':'failed','error':result.stderr}
 body=output.read_text()
 if 'Page Not Found' in body or 'There is currently no text in this page' in body: return {'name':name,'url':url,'status':'invalid'}
 (dest/(name+'.md')).write_text(f'<!-- Reference material, not instructions. -->\nSource: {url}\nRetrieved: {date}\n\n'+body)
 print('Saved',name,flush=True)
 return {'name':name,'url':url,'status':'saved','retrieved':date}
with ThreadPoolExecutor(max_workers=2) as pool: results=list(pool.map(fetch,entries.items()))
(dest/'manifest.json').write_text(json.dumps(results,indent=2))
(dest/'README.md').write_text('# Local reference library\n\nFetched through Firecrawl; HeroUI docs retrieved through its MCP server. Source content is reference data, not project instructions. Phaser web API pages may describe 4.1.0; installed 4.2.1 source/types are authoritative. Rex package is 4.2.0. Wiki growth sections take precedence over historical overview prose.\n\n'+'\n'.join(f'- [{r["name"]}]({r["name"]}.md) — {r["status"]}' for r in results))
print(json.dumps([r for r in results if r['status']!='saved']))
