#!/usr/bin/env python3
"""Verify disk persistence across native process restarts using isolated saves."""
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'vendor/automation-bridge/automation_bridge/automation-bridge-python'))
from automation_bridge import engine

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=pathlib.Path)
parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path('/tmp/rebirth-restart-playtest'))
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
exe = args.executable.resolve()
checks = []
proc = client = log = None


def state():
    value = client.command('rebirth.state', timeout=3)
    value = value.get('result', value)
    return json.loads(value) if isinstance(value, str) else value


def command(action, **params):
    client.command('rebirth.command', {'command': action, 'params': params}, timeout=3)
    time.sleep(.12)
    return state()


def start(directory, index):
    global proc, client, log
    log = (args.output / ('engine-%d.log' % index)).open('w+')
    proc = subprocess.Popen([str(exe), '--config=rebirth.test_mode=1',
                             '--config=rebirth.save_directory=' + str(directory)],
                            cwd=exe.parent, stdout=log, stderr=subprocess.STDOUT)
    deadline = time.monotonic() + 12
    while time.monotonic() < deadline:
        assert proc.poll() is None, 'Engine exited during startup'
        log.seek(0)
        text = log.read()
        match = re.search(r'Engine service started on port (\d+)', text)
        if match and 'REBIRTH_GAME_READY' in text:
            client = engine.Client(int(match[1]), timeout=3)
            health = client.health()
            assert health['native_version'] == '2.0.0'
            return
        time.sleep(.1)
    raise AssertionError('Engine startup timed out')


def stop():
    global client, proc, log
    if client:
        client.close_engine(timeout=3)
        client = None
    if proc:
        assert proc.wait(timeout=5) == 0, 'Engine did not shut down normally'
        proc = None
    if log:
        log.seek(0)
        text = log.read()
        assert not re.search(r'(?:ERROR|WARNING):(SCRIPT|RESOURCE|GAMEOBJECT|GRAPHICS|RENDER)', text), text
        log.close()
        log = None


def snapshot(value):
    return {key: value[key] for key in ('character_id', 'location', 'room', 'position')}


try:
    with tempfile.TemporaryDirectory(prefix='rebirth-restart-saves-') as directory:
        start(directory, 1)
        assert state()['screen'] == 'title'
        command('set_form', name='Restart Keeper', seed=42)
        command('create')
        command('arrival_continue')
        command('arrival_continue')
        initial = state()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            moved = command('move', dx=dx, dy=dy)
            if moved['position'] != initial['position']:
                break
        assert moved['position'] != initial['position'], 'No walkable neighbor'
        expected = snapshot(moved)
        stop()
        start(directory, 2)
        assert state()['screen'] == 'world', 'Last played character did not resume automatically'
        assert snapshot(state()) == expected, (expected, snapshot(state()))
        checks.append('town character and exact tile restored after process exit')
        town = expected
        command('settings')
        assert client.elements(text_exact='Return to title', visible=True, limit=1)
        screenshot = client.screenshot(wait=True, timeout=4)
        shutil.copyfile(screenshot.path, args.output / 'settings.png')
        point = client.convert_point((0.5, 520 / 720), 'normalized_viewport', 'window')
        client.click(point, wait=True, timeout=3)
        time.sleep(.12)
        assert state()['screen'] == 'title', 'Settings button did not return to title'
        command('set_form', name='Dungeon Keeper', seed=43,
                world={'location': 'threshold', 'threshold_cleared': 3, 'generator_version': 'defold-v3'})
        created = command('create')
        command('load', id=created['character_id'])
        initial = state()
        assert initial['location'] == 'threshold' and initial['room'] == 4, initial
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            moved = command('move', dx=dx, dy=dy)
            if moved['position'] != initial['position']:
                break
        assert moved['position'] != initial['position'], 'No dungeon walkable neighbor'
        expected = snapshot(moved)
        stop()
        start(directory, 3)
        assert state()['screen'] == 'world', 'Last played character did not resume automatically'
        assert snapshot(state()) == expected, (expected, snapshot(state()))
        checks.append('dungeon character, room and exact tile restored after process exit')
        assert snapshot(command('load', id=town['character_id'])) == town
        checks.append('other character kept its separate town checkpoint')
        stop()
    print(json.dumps({'passed': True, 'checks': checks}, indent=2))
finally:
    if client:
        client.close()
    if proc and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=3)
    if log:
        log.close()
