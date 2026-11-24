#!/usr/bin/env python3
"""Reproduce reviewed source packages at their locked commits."""
import pathlib,json,urllib.request,tarfile,io
root=pathlib.Path(__file__).resolve().parents[2]
for entry in json.loads((root/'dependencies.lock.json').read_text())['dependencies']:
 dest=root/entry['path']
 if dest.exists():continue
 repo=entry['repository'].removeprefix('https://github.com/')
 data=urllib.request.urlopen('https://codeload.github.com/'+repo+'/tar.gz/'+entry['commit'],timeout=60).read()
 dest.mkdir(parents=True)
 with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
  for member in archive.getmembers():
   rel=pathlib.PurePosixPath(member.name).parts[1:]
   if not rel:continue
   assert '..' not in rel and not member.issym() and not member.islnk()
   member.name=str(pathlib.Path(*rel));archive.extract(member,dest,filter='data')
 print(entry['id'],entry['commit'])
