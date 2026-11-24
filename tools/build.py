#!/usr/bin/env python3
"""Pinned local build/test entry point. Requires Python 3, JDK 25 and LuaJIT."""
from pathlib import Path
import argparse, json, os, platform, shutil, subprocess, urllib.request, zipfile
ROOT=Path(__file__).resolve().parents[1]
PINS=json.loads((ROOT/'tools/dependencies.json').read_text())
def run(args, log=None, **kw):
    print(' '.join(map(str,args)),flush=True)
    if log:
        path=ROOT/'.tools'/log
        with path.open('w') as f:
            result=subprocess.run(list(map(str,args)),cwd=ROOT,stdout=f,stderr=subprocess.STDOUT,**kw)
        output=path.read_text();print(output[-6000:]);result.check_returncode()
        if 'ERROR:SCRIPT:' in output or 'ERROR:GAMESYS:' in output:
            raise RuntimeError('Engine diagnostics failed: '+str(path))
    else: subprocess.run(list(map(str,args)),cwd=ROOT,check=True,**kw)
def download(url,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():
        partial=path.with_suffix(path.suffix+'.part')
        urllib.request.urlretrieve(url,partial);partial.replace(path)
def prepare():
    download('https://d.defold.com/archive/'+PINS['engine']['sha']+'/bob/bob.jar',ROOT/'.tools/bob.jar')
    for name in ['event','quest']:
        pin=PINS['libraries'][name];dest=ROOT/'.tools/deps'/name
        if (dest/name).exists(): continue
        repo=pin['repository'].removeprefix('https://github.com/')
        archive=ROOT/'.tools'/('source-'+name+'.zip')
        download('https://codeload.github.com/'+repo+'/zip/'+pin['commit'],archive)
        with zipfile.ZipFile(archive) as z:
            for member in z.infolist():
                parts=Path(member.filename).parts[1:]
                if not parts or '..' in parts: continue
                target=dest.joinpath(*parts)
                if member.is_dir(): target.mkdir(parents=True,exist_ok=True)
                else: target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(member))
def bob(target,output='build/default',settings=None,bundle=None,variant='debug'):
    args=['java','-jar','.tools/bob.jar','--platform',target,'--architectures',target,'--variant',variant,'--output',output,'--max-cpu-threads','4']
    if settings: args+=['--settings',settings]
    if bundle: args+=['--bundle-output',bundle]
    # Bob's generated platform metadata is shared between output directories.
    # Build sequentially and clean to prevent test settings leaking into release bundles.
    args+=['--build-report-json','.tools/report-'+Path(output).name+'.json','resolve','clean','build','--archive']
    if bundle: args+=['bundle']
    run(args,'build-'+Path(output).name+'.log')
def engine(target):
    name={'arm64-macos':'arm64-osx','x86_64-macos':'x86_64-osx'}.get(target,target)
    file=ROOT/'build'/name/('dmengine.exe' if 'win32' in target else 'dmengine')
    file.chmod(file.stat().st_mode|0o111);return file
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('action',choices=['prepare','unit','test','visual','build','release'])
p.add_argument('--platform',default='arm64-macos' if platform.machine()=='arm64' and platform.system()=='Darwin' else 'x86_64-macos' if platform.system()=='Darwin' else 'x86_64-linux')
a=p.parse_args();os.chdir(ROOT);prepare()
if a.action in ['unit','test']: run(['luajit','tests/run.lua'],'unit-tests.log')
if a.action=='test':
    bob(a.platform,'build/test','tests/test.project')
    exe=engine(a.platform);run([exe,'build/test/game.projectc'],'engine-tests.log',timeout=60)
    for stage in ["prepare","battle","reward","chest"]:
        run([exe,"--config=test.restart="+stage,"build/test/game.projectc"],"restart-"+stage+".log",timeout=60)
    hold_log=(ROOT/'.tools/lock-holder.log').open('w')
    holder=subprocess.Popen([str(exe),'--config=test.lock=hold','build/test/game.projectc'],cwd=ROOT,stdout=hold_log,stderr=subprocess.STDOUT)
    import time
    try:
        for _ in range(100):
            if 'LOCK RESULT true' in (ROOT/'.tools/lock-holder.log').read_text(): break
            if holder.poll() is not None: raise RuntimeError('Lock holder ended early')
            time.sleep(.05)
        else: raise RuntimeError('Lock holder did not start')
        run([exe,'--config=test.lock=probe','build/test/game.projectc'],'lock-probe.log',timeout=8)
        if holder.wait(timeout=12)!=0: raise RuntimeError('Lock holder failed')
    finally:
        if holder.poll() is None: holder.terminate();holder.wait(timeout=5)
        hold_log.close()
if a.action=='visual':
    bob(a.platform,'build/visual','tests/visual.project',bundle='artifacts/visual')
    for width,height in [(1280,720),(1024,768)]:
        run([engine(a.platform),'--config=test.hold=0','--config=test.width='+str(width),'--config=test.height='+str(height),'build/visual/game.projectc'], 'visual-'+str(width)+'x'+str(height)+'.log',timeout=260)
if a.action in ['build','release']:
    bob(a.platform,bundle='artifacts/release' if a.action=='release' else 'artifacts/debug',variant='release' if a.action=='release' else 'debug')
