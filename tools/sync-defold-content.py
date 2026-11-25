#!/usr/bin/env python3
"""Repackage original artwork, without redrawing or resampling it.
Run: uv run --with pillow python tools/sync-defold-content.py
"""
from pathlib import Path
from PIL import Image
import shutil
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'assets'
FRAMES=DEST/'frames'
FRAMES.mkdir(parents=True,exist_ok=True)
images=[]
def export(img,name):
 p=FRAMES/(name+'.png');img.save(p);images.append('/assets/frames/'+name+'.png')
for name in ['character_atlas','character_hair_extra','town_atlas','town_amenities','spider_atlas','sword_atlas']:
 path=ROOT/'assets/art'/(name+'.png')
 if not path.exists():continue
 img=Image.open(path).convert('RGBA')
 for row in range(img.height//24):
  for col in range(img.width//16):
   export(img.crop((col*16,row*24,col*16+16,row*24+24)),name+'_'+str(row*(img.width//16)+col))
# Reproduce the original Godot portrait compositor using independently tintable
# masks. These are exact source pixels; no drawing or interpolation is added.
body_atlas=Image.open(ROOT/'assets/art/character_atlas.png').convert('RGBA')
hair_extra=Image.open(ROOT/'assets/art/character_hair_extra.png').convert('RGBA')
for body in range(3):
 for face in range(3):
  for eyes in range(3):
   base=body_atlas.crop((body*16,0,body*16+16,24))
   outfit=Image.new('RGBA',(16,24));skin=Image.new('RGBA',(16,24));eye=Image.new('RGBA',(16,24))
   for y in range(24):
    for x in range(16):
     rgba=base.getpixel((x,y))
     if rgba[:3]==(91,191,197):outfit.putpixel((x,y),(255,255,255,rgba[3]));base.putpixel((x,y),(0,0,0,0))
     elif rgba[:3]==(176,169,135):skin.putpixel((x,y),(255,255,255,rgba[3]));base.putpixel((x,y),(0,0,0,0))
   for xy in ([(6,7),(9,7)] if face==1 else []):
    base.putpixel(xy,(40,53,62,255));skin.putpixel(xy,(0,0,0,0));outfit.putpixel(xy,(0,0,0,0))
   for xy in ([(5,7),(10,7)] if face==2 else []):
    base.putpixel(xy,(0,0,0,0));skin.putpixel(xy,(255,255,255,255));outfit.putpixel(xy,(0,0,0,0))
   eyey=5 if eyes==1 else 6
   for xy in [(7,eyey),(9,eyey)]+([(7,5),(9,5)] if eyes==2 else []):
    base.putpixel(xy,(0,0,0,0));skin.putpixel(xy,(0,0,0,0));outfit.putpixel(xy,(0,0,0,0));eye.putpixel(xy,(255,255,255,255))
   for layer,img in [('base',base),('outfit',outfit),('skin',skin),('eyes',eye)]:export(img,f'body_{body}_{face}_{eyes}_{layer}')
for hair in range(12):
 src=body_atlas if hair<4 else hair_extra;col=3+hair if hair<4 else hair-4
 img=src.crop((col*16,0,col*16+16,24))
 for y in range(24):
  for x in range(16):
   rgba=img.getpixel((x,y));img.putpixel((x,y),(255,255,255,255 if rgba[3]>127 else 0))
 export(img,f'hair_mask_{hair}')
for path in (ROOT/'assets/art').rglob('*.png'):
 if path.stem.endswith('atlas') or path.stem=='character_hair_extra':continue
 export(Image.open(path).convert('RGBA'),('skill_' if path.parent.name=='skills' else 'item_' if path.parent.name=='blacksmith' else '')+path.stem)
(ROOT/'game/rendering/tiles.atlas').write_text('\n'.join('images { image: "'+name+'" }' for name in sorted(set(images)))+'\nmargin: 0\nextrude_borders: 2\ninner_padding: 0\n')
for folder,filename,out in [('DepartureMono','DepartureMono-Regular.otf','ui'),('SourceCodePro/OTF','SourceCodePro-Regular.otf','prose')]:
 shutil.copyfile(ROOT/'assets/fonts'/folder/filename,DEST/'fonts'/(out+'.otf'))
for path in list((ROOT/'assets/fonts').rglob('*')):
 if path.is_file() and path.name.lower() in ['license','license.txt','license.md','ofl.txt']:
  shutil.copyfile(path,DEST/'fonts'/('LICENSE-'+path.parent.name))
print('Packaged',len(set(images)),'original art frames into Defold atlas.')
