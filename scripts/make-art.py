"""Original vector artwork and synthesized ambient music for Rebirth Dungeon."""
from pathlib import Path
import math, wave, struct, random
out=Path('public/assets/game');out.mkdir(parents=True,exist_ok=True)
random.seed(73)
head='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><defs><linearGradient id="grass" x2="0" y2="1"><stop stop-color="#53694b"/><stop offset="1" stop-color="#84916a"/></linearGradient><linearGradient id="water" x2="0" y2="1"><stop stop-color="#355c64"/><stop offset="1" stop-color="#6f9c94"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity=".22"/></filter><pattern id="roof" width="20" height="12" patternUnits="userSpaceOnUse"><path d="M0 11H20M10 0V11" stroke="#101c20" stroke-opacity=".25" fill="none"/></pattern></defs>'
s=[head,'<path fill="url(#grass)" d="M0 0H1600V1000H0z"/>']
for i in range(1200):
 x=random.randrange(1600);y=random.randrange(1000)
 s.append(f'<path d="M{x} {y}l2 -4 2 4m2 -2 2 -3" stroke="{random.choice(["#b4b584","#3e5845","#6e835b"])}" opacity=".32" fill="none"/>')
s+=['<path d="M750 40Q730 230 780 400L770 800M270 295L780 400 1230 330M310 710L770 800 1290 640" stroke="#4c5a43" stroke-width="94" fill="none" opacity=".4"/>','<path d="M750 40Q730 230 780 400L770 800M270 295L780 400 1230 330M310 710L770 800 1290 640" stroke="#c2b78b" stroke-width="76" stroke-linecap="round" fill="none"/>','<path d="M0 470Q350 440 780 535T1600 490" stroke="#526a54" stroke-width="100" fill="none"/>','<path d="M0 470Q350 440 780 535T1600 490" stroke="url(#water)" stroke-width="74" fill="none"/>','<path d="M0 465Q350 435 780 530T1600 485" stroke="#a5cdc0" stroke-width="2" opacity=".4" fill="none"/>','<rect x="715" y="470" width="114" height="145" rx="5" fill="#8b7552" stroke="#594b37" stroke-width="6"/>']
for y in range(478,610,13):s.append(f'<path d="M721 {y}H823" stroke="#bca77e" stroke-width="5"/>')
for x in [708,834]:s.append(f'<path d="M{x} 469V615" stroke="#d3c59d" stroke-width="9"/>')
# Village houses, drawn in a consistent roof-heavy top-down perspective.
for x,y,w,h,color in [(300,230,180,120,'#697c79'),(1110,240,210,135,'#a57857'),(1260,655,180,130,'#69747b'),(300,735,220,135,'#765755'),(850,800,190,125,'#927b55')]:
 s.append(f'<g filter="url(#shadow)"><rect x="{x-w/2}" y="{y-h/2+22}" width="{w}" height="{h}" rx="5" fill="#dcc9a2" stroke="#4b493c" stroke-width="5"/><path d="M{x-w/2-18} {y-h/2+35}L{x} {y-h/2-65}L{x+w/2+18} {y-h/2+35}V{y+h/2-20}H{x-w/2-18}Z" fill="{color}" stroke="#39453c" stroke-width="5"/><path d="M{x-w/2-18} {y-h/2+35}H{x+w/2+18}V{y+h/2-20}H{x-w/2-18}Z" fill="url(#roof)"/><rect x="{x-20}" y="{y+h/2+3}" width="40" height="44" rx="18" fill="#454738"/><rect x="{x-w/2+25}" y="{y+h/2+3}" width="28" height="23" fill="#e3b96c" stroke="#665642" stroke-width="4"/><rect x="{x+w/2-53}" y="{y+h/2+3}" width="28" height="23" fill="#e3b96c" stroke="#665642" stroke-width="4"/><path d="M{x-40} {y+h/2+49}H{x+40}" stroke="#ddd1ad" stroke-width="9"/></g>')
s.append('<g filter="url(#shadow)"><path d="M660 155V88Q740 -32 825 88V155Z" fill="#475853" stroke="#9da38a" stroke-width="18"/><path d="M703 158V96Q745 40 786 96V158Z" fill="#182c2a"/><path d="M688 170H805M680 185H813" stroke="#adad8d" stroke-width="10"/><circle cx="746" cy="73" r="11" fill="#75c1ab"/></g>')
# Trees around the edges, leaving every route readable.
for i in range(85):
 x=random.randrange(40,1560);y=random.randrange(40,960)
 if 150<x<1400 and 100<y<900:continue
 s.append(f'<g filter="url(#shadow)"><ellipse cx="{x}" cy="{y+22}" rx="30" ry="12" fill="#273e35" opacity=".3"/><path d="M{x} {y}v27" stroke="#6d5c40" stroke-width="10"/><circle cx="{x}" cy="{y-10}" r="35" fill="#334f41"/><circle cx="{x-10}" cy="{y-24}" r="24" fill="#547451"/><circle cx="{x+10}" cy="{y-22}" r="19" fill="#6c875b"/></g>')
s.append('<g fill="#d8d0aa" stroke="#756e53" stroke-width="3"><circle cx="790" cy="385" r="47"/><circle cx="790" cy="385" r="34" fill="#6f9990"/><circle cx="790" cy="385" r="12" fill="#aaa989"/></g></svg>')
(out/'town.svg').write_text(''.join(s))
for race,color,scale in [('Human','#839cb0',1),('Elf','#91b5a0',.9),('Giant','#b38b67',1.2)]:
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80"><ellipse cx="32" cy="70" rx="19" ry="6" fill="#172a25" opacity=".3"/><path d="M23 53L21 68M40 53L43 68" stroke="#413f36" stroke-width="9" stroke-linecap="round"/><path d="M18 30L14 59Q32 70 50 59L46 30" fill="{color}" stroke="#354947" stroke-width="3"/><path d="M21 31L32 51 44 31" fill="#d3bb84"/><rect x="27" y="22" width="11" height="13" rx="4" fill="#dbb28a"/><circle cx="32" cy="19" r="13" fill="#e9c39b"/><path d="M18 18Q18 0 34 3Q49 5 46 22L37 10 21 20Z" fill="#4b4038"/><path d="M20 40L15 51M44 40L50 51" stroke="#e2bb91" stroke-width="7" stroke-linecap="round"/><path d="M53 31L50 58" stroke="#eee2b9" stroke-width="4"/></svg>'
 (out/(race.lower()+'.svg')).write_text(svg)
for name,color in [('spider','#b5aca0'),('redspider','#a76a59'),('boss','#475b57')]:
 s=['<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">']
 for sign in [-1,1]:
  for i in range(4):s.append(f'<path d="M80 {48+i*9}L{80+sign*(45+i*5)} {20+i*22}L{80+sign*(65+i*3)} {37+i*22}" stroke="#343c36" stroke-width="7" fill="none" stroke-linecap="round"/>')
 s.append(f'<ellipse cx="80" cy="48" rx="35" ry="31" fill="{color}" stroke="#35443b" stroke-width="4"/><ellipse cx="80" cy="81" rx="23" ry="20" fill="{color}" stroke="#35443b" stroke-width="4"/><path d="M71 89l-4 17m21 -17 5 17" stroke="#dcc49b" stroke-width="5"/><circle cx="71" cy="79" r="4" fill="#e6b16e"/><circle cx="89" cy="79" r="4" fill="#e6b16e"/></svg>')
 (out/(name+'.svg')).write_text(''.join(s))
(out/'chest.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><ellipse cx="60" cy="87" rx="48" ry="8" fill="#15221e" opacity=".4"/><path d="M16 44Q16 12 60 12T104 44V80H16Z" fill="#876648" stroke="#352f26" stroke-width="5"/><path d="M16 45H104M35 20V80M85 20V80" stroke="#d7b775" stroke-width="7"/><rect x="51" y="40" width="18" height="24" rx="3" fill="#e2c78b"/><circle cx="60" cy="51" r="3" fill="#55432e"/></svg>')
# Quiet original chord beds, 12-second loops; no external recordings.
for name,chord in [('town',[130.81,164.81,196]),('dungeon',[110,130.81,164.81]),('battle',[146.83,174.61,220])]:
 rate=22050;duration=12
 with wave.open(str(out/(name+'.wav')),'w') as f:
  f.setparams((1,2,rate,0,'NONE','not compressed'))
  samples=[]
  for i in range(rate*duration):
   t=i/rate;env=min(1,t/1.5,(duration-t)/1.5)
   v=sum(math.sin(2*math.pi*freq*t)*.045+math.sin(2*math.pi*freq*2*t)*.012 for freq in chord)*env
   samples.append(struct.pack('<h',int(v*32767)))
  f.writeframes(b''.join(samples))
(out/'LICENSE.txt').write_text('Original artwork and synthesized audio created for Rebirth Dungeon. No Mabinogi or Dicero art/audio is included. Distributed under the project MIT license.\n')
# A short original impact sound, separate from the music volume channel.
with wave.open(str(out/'hit.wav'),'wb') as wav:
 wav.setparams((1,2,22050,0,'NONE','not compressed'))
 wav.writeframes(b''.join(struct.pack('<h',int(10000*math.exp(-t/500)*math.sin(2*math.pi*(150-t/70)*t/22050))) for t in range(4400)))
