"""Normalize saved Firecrawl HTML (requires beautifulsoup4). Never fetches implicitly.
Run after saving markdown,html JSON to .firecrawl/skills/<icon-stem>.json.
Expands row/column spans before associating values with ranks.
"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
RANKS = list('FEDCBA987654321')

def text(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip()

def grid(table):
    cells = {}
    result = []
    for r, tr in enumerate(tr for tr in table.find_all('tr') if tr.find_parent('table') == table):
        c = 0
        for cell in tr.find_all(['th', 'td'], recursive=False):
            while (r, c) in cells:
                c += 1
            for dr in range(int(cell.get('rowspan', 1))):
                for dc in range(int(cell.get('colspan', 1))):
                    cells[r + dr, c + dc] = text(cell)
            c += int(cell.get('colspan', 1))
        width = max((col for row, col in cells if row == r), default=-1) + 1
        result.append([cells.get((r, col), '') for col in range(width)])
    return result

def extract(path):
    raw = json.loads(path.read_text())
    soup = BeautifulSoup(raw['html'], 'html.parser')
    summary = soup.find(id='Summary')
    if not summary:
        raise ValueError(f'{path.stem}: missing Summary')
    tables = []
    for node in summary.parent.find_next_siblings():
        if node.name == 'h2':
            break
        if node.name == 'table':
            tables.append(node)
    rows = []
    for table in tables:
        data = grid(table)
        header = next((r for r in data if 'F' in r and '1' in r), None)
        if not header:
            continue
        first = header.index('F')
        for row in data[data.index(header)+1:]:
            # Rank columns are fixed by the header. Some source rows over-span;
            # never shift F to the right to compensate for trailing extra cells.
            start = first
            if start < 1 or len(row) < start + 15:
                continue
            # Thunder's charge-cost section explicitly applies to every rank.
            if 'Charges' in row or 'Mana Use (Total)' in row:
                continue
            if 'Mana Use [/Charge]' in row:
                label = re.sub(r'\s+', ' ', row[0].replace('**', '')).strip()
                amount = next(value for value in row[1:] if re.fullmatch(r'\d+(?:\.\d+)?', value))
                rows.append({'label': label, 'values': [amount] * 15})
                continue
            label = ' · '.join(dict.fromkeys(x for x in row[:start - (1 if 'N' in header[:first] else 0)] if x))
            if not label or label == 'Rank':
                continue
            rows.append({'label': label, 'values': row[start:start+15]})
    if not rows:
        raise ValueError(f'{path.stem}: no rank rows')
    effects = {}
    for rank in RANKS:
        h = soup.find(id='Rank_'+rank)
        parts = []
        if h:
            for node in h.parent.find_next_siblings():
                if node.name in ['h2', 'h3']:
                    break
                if node.name == 'table':
                    data = grid(node)
                    if data and any(v in ['Effect','Effects'] for v in data[0]):
                        index = next(i for i,v in enumerate(data[0]) if v in ['Effect','Effects'])
                        for row in data[1:]:
                            if len(row) > index:
                                parts.append((row[0]+': ' if index > 1 else '')+row[index])
                elif node.name == 'ul':
                    for li in node.find_all('li',recursive=False):
                        if re.match(r'Effects?\s*:',text(li)):
                            parts.append(re.sub(r'^Effects?\s*:\s*','',text(li)))
        effects[rank] = parts
    url=raw.get('metadata',{}).get('sourceURL') or raw.get('metadata',{}).get('url')
    return {'url':url,'retrievedAt':datetime.now(timezone.utc).date().isoformat(),'rows':rows,'effects':effects}

if __name__ == '__main__':
    retrieved = datetime.now(timezone.utc).date().isoformat()
    paths = {path.stem: path for path in (ROOT / '.firecrawl/skills').glob('*.json')}
    data = {}
    for icon in sorted((ROOT / 'public/assets/game/skills').glob('*.webp')):
        slug = icon.stem
        if slug not in paths:
            raise ValueError(f'Missing Firecrawl source for {slug}')
        raw = json.loads(paths[slug].read_text())
        if slug != 'wand-mastery':
            data[slug] = extract(paths[slug])
            if slug == 'range-attack':
                elf = extract(paths['elf-ranged-attack'])
                human = data[slug]
                human['rows'] = [dict(row, label=row['label']+' (Human)') for row in human['rows']] + [dict(row, label=row['label']+' (Elf)') for row in elf['rows']]
                human['effects'] = {rank: ['Human: '+v for v in human['effects'][rank]] + ['Elf: '+v for v in elf['effects'][rank]] for rank in RANKS}
                human['additionalUrls'] = [elf['url']]
            target = ROOT / 'src/domain/skills' / (slug+'.wiki.json')
            target.write_text(json.dumps(data[slug], indent=2, ensure_ascii=False)+'\n')
            print(slug, len(data[slug]['rows']), 'rank rows')
        source = raw.get('metadata', {}).get('sourceURL', '')
        header = f'# Saved wiki reference: {slug}\n\nSource: {source}\n\nRetrieved: {retrieved} UTC using Firecrawl (markdown + HTML).\n\nOriginal wiki text follows. Game adaptations are in the matching skill module.\n\n---\n\n'
        (ROOT / 'docs/references/skills' / (slug+'.md')).write_text(header+raw['markdown'])
    elf = json.loads(paths['elf-ranged-attack'].read_text())
    (ROOT / 'docs/references/skills/elf-ranged-attack.md').write_text(f'# Elf Ranged Attack reference\n\nRetrieved {retrieved} UTC using Firecrawl.\n\n'+elf['markdown'])
