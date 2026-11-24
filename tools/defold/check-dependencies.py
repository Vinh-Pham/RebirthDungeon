#!/usr/bin/env python3
"""Validate pins, source notices and the active dependency URL inventory."""
import json,pathlib,re,urllib.parse
root=pathlib.Path(__file__).resolve().parents[2]
entries=json.loads((root/'dependencies.lock.json').read_text())['dependencies']
archives={};notices=0;unresolved=[]
for entry in entries:
 path=root/entry['path']
 assert path.is_dir() and any(path.iterdir()),entry['id']
 sha=entry['commit'];assert re.fullmatch('[0-9a-f]{40}',sha),entry['id']
 repo=entry['repository'].removeprefix('https://github.com/')
 url=entry['archive'];parsed=urllib.parse.urlparse(url)
 assert parsed.scheme=='https' and not parsed.query and not parsed.fragment,url
 allowed=[f'https://github.com/{repo}/archive/{sha}.zip',f'https://codeload.github.com/{repo}/zip/{sha}']
 assert url in allowed,'Dependency archive does not match repository and full SHA: '+url
 archives[url]=entry
 licenses=[f for f in path.iterdir() if f.is_file() and any(n in f.name.lower() for n in ('license','copying','notice'))]
 for file in licenses:assert file.stat().st_size>0,file
 if licenses:notices+=1
 else:unresolved.append(entry['id'])
for file in [root/'game.project',root/'tools/defold/dependencies.settings']:
 for url in re.findall(r'^dependencies#\d+\s*=\s*(\S+)',file.read_text(),re.M):
  assert url in archives,'Unpinned or mismatched declared dependency: '+url
assert (root/'game/integrations/third_party_licenses.txt').is_file()
print(f'Verified {len(entries)} pinned dependency source installations and declared immutable URLs; {notices} retained upstream license files')
if unresolved:
 print('Upstream license-file omission requires separate redistribution review: '+', '.join(unresolved))
