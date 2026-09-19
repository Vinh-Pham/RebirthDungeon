import re,json
s=open('docs/references/mabinogi-level.md').read().split('### Level',1)[1]
table=[0]*201
for level,total,needed in re.findall(r'^\| (\d+) \| ([\d,]+|-) \| ([\d,]+) \|',s,re.M):
 n=int(level)
 if n<201 and table[n]==0:table[n]=int(needed.replace(',',''))
assert all(table[1:200]),[i for i in range(1,200) if not table[i]]
open('src/domain/xp-table.json','w').write(json.dumps(table)+'\n')
