#!/usr/bin/env python3
"""Draw ten illustrated house editions for v336 Originals. No source cover art.
Each has a distinct hand-drawn-style visual built from original geometry."""
from PIL import Image, ImageDraw, ImageFont
import os, math, textwrap
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets','covers')
F1='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; F2='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
books=[
('the-8-pm-reset','THE\n8 PM\nRESET','#F6E9C8','#181713','#E5A83B','moon'),
('the-commute-advantage','THE\nCOMMUTE\nADVANTAGE','#DCE8E2','#14201D','#308872','train'),
('the-family-ledger','THE\nFAMILY\nLEDGER','#F7E3D4','#241A15','#BF6548','ledger'),
('the-quiet-internship','THE\nQUIET\nINTERNSHIP','#DFE8F4','#162236','#5278B8','desk'),
('the-neighbourhood-network','THE\nNEIGHBOURHOOD\nNETWORK','#F6E6A6','#211F17','#D98B27','houses'),
('the-attention-garden','THE\nATTENTION\nGARDEN','#E0EDD6','#172318','#4F8E53','garden'),
('the-long-game-classroom','THE\nLONG GAME\nCLASSROOM','#ECE3F3','#241A2D','#8766AE','books'),
('the-repair-economy','THE\nREPAIR\nECONOMY','#E4E2DA','#1B1B19','#69655B','tools'),
('the-kind-boundary','THE\nKIND\nBOUNDARY','#F8DCE0','#321921','#C44F70','line'),
('the-listening-bench','THE\nLISTENING\nBENCH','#DCEAF0','#14232B','#4C94AA','bench')]
def font(sz,b=True):return ImageFont.truetype(F1 if b else F2,sz)
def cx(draw,txt,y,f,fill,w=360):
 box=draw.textbbox((0,0),txt,font=f,spacing=0);draw.text(((400-(box[2]-box[0]))/2,y),txt,font=f,fill=fill)
def motif(draw,k,ac,ink):
 # illustration zone: y 288–490. Confident, simple, original line art.
 if k=='moon':
  draw.ellipse((124,286,276,438),fill=ac);draw.ellipse((154,272,296,414),fill='#F6E9C8')
  for x,y,r in [(102,318,5),(294,340,4),(101,410,3),(286,430,5),(210,265,3)]:draw.ellipse((x-r,y-r,x+r,y+r),fill=ac)
  draw.line((85,474,315,474),fill=ink,width=4)
 elif k=='train':
  draw.rounded_rectangle((72,350,328,430),12,fill=ac);draw.rounded_rectangle((88,364,312,395),5,fill='#DCE8E2')
  for x in [106,166,226,286]:draw.rectangle((x,365,x+34,393),fill='#14201D')
  for x in [125,275]:draw.ellipse((x,416,x+30,446),fill=ink)
  draw.line((55,460,345,460),fill=ink,width=4)
 elif k=='ledger':
  draw.polygon([(92,300),(292,276),(318,450),(112,470)],fill='#FFF8E8',outline=ink,width=4)
  for y in range(325,440,28):draw.line((118,y,292,y-16),fill=ac,width=3)
  for x in [148,206,262]:draw.line((x,307,x+23,459),fill=ink,width=2)
  draw.ellipse((278,422,304,448),fill=ac)
 elif k=='desk':
  draw.line((70,454,330,454),fill=ink,width=7);draw.line((105,454,85,490),fill=ink,width=7);draw.line((295,454,315,490),fill=ink,width=7)
  draw.rounded_rectangle((140,320,267,404),7,fill=ac,outline=ink,width=4);draw.rectangle((151,332,256,389),fill='#DFE8F4')
  draw.line((184,425,224,425),fill=ink,width=5);draw.line((204,404,204,425),fill=ink,width=5)
  for y in [342,356,370]:draw.line((163,y,240,y),fill=ink,width=2)
 elif k=='houses':
  for x,h in [(73,70),(151,108),(240,82)]:
   y=455-h;draw.rectangle((x,y,x+67,455),fill='#FFEFC0',outline=ink,width=3);draw.polygon([(x-8,y),(x+34,y-35),(x+75,y)],fill=ac,outline=ink)
   for dx in [13,42]:draw.rectangle((x+dx,y+27,x+dx+11,y+42),fill=ac)
  draw.line((52,463,348,463),fill=ink,width=4)
 elif k=='garden':
  draw.line((75,462,325,462),fill=ink,width=3)
  for x,h in [(112,70),(173,116),(245,82),(291,52)]:
   y=462-h;draw.line((x,462,x,y),fill=ink,width=4)
   for a in range(5):
    ang=-math.pi/2+a*math.pi*2/5;draw.ellipse((x+math.cos(ang)*21-10,y+math.sin(ang)*21-10,x+math.cos(ang)*21+10,y+math.sin(ang)*21+10),fill=ac,outline=ink)
  draw.ellipse((163,320,183,340),fill=ac,outline=ink)
 elif k=='books':
  for i,(x,w,y) in enumerate([(90,66,410),(160,80,364),(246,62,327)]):
   draw.rounded_rectangle((x,y,x+w,470),4,fill=ac if i==1 else '#F8F3E8',outline=ink,width=3)
   draw.line((x+13,y+17,x+w-13,y+17),fill=ink,width=2)
  draw.line((66,478,334,478),fill=ink,width=4)
 elif k=='tools':
  draw.ellipse((150,333,248,431),outline=ink,width=13);draw.ellipse((181,364,217,400),fill=ac)
  for a in range(8):
   ang=a*math.pi/4; x=199+math.cos(ang)*64;y=382+math.sin(ang)*64;draw.line((199+math.cos(ang)*46,382+math.sin(ang)*46,x,y),fill=ink,width=8)
  draw.line((83,469,317,469),fill=ac,width=5)
 elif k=='line':
  pts=[(75,385),(118,335),(161,408),(207,315),(250,400),(321,346)]
  draw.line(pts,fill=ac,width=13,joint='curve')
  for x,y in pts:draw.ellipse((x-8,y-8,x+8,y+8),fill='#F8DCE0',outline=ink,width=3)
  draw.line((70,462,330,462),fill=ink,width=3)
 elif k=='bench':
  draw.rounded_rectangle((98,385,302,411),5,fill=ac,outline=ink,width=3);draw.rounded_rectangle((112,346,288,373),5,fill='#EFF9FB',outline=ink,width=3)
  for x in [123,275]:draw.line((x,411,x-10,465),fill=ink,width=6)
  for x in [143,257]:draw.line((x,411,x+10,465),fill=ink,width=6)
  for i in range(4):draw.arc((65+i*11,300-i*4,136+i*11,365-i*4),200,330,fill=ac,width=3)
for bid,title,bg,ink,ac,k in books:
 im=Image.new('RGB',(400,600),bg);d=ImageDraw.Draw(im)
 d.rectangle((12,12,388,588),outline=ink,width=5);d.rectangle((22,22,378,578),outline=ink,width=1)
 d.text((36,38),'THE SMALLBOOK',font=font(10),fill=ink);d.text((322,38),'ORIGINAL',font=font(9),fill=ink)
 # title lines maintain deliberate editorial slab character
 y=92
 for line in title.split('\n'):
  f=font(37); d.text((36,y),line,font=f,fill=ink); y+=42
 d.line((36,y+11,104,y+11),fill=ac,width=5)
 motif(d,k,ac,ink)
 d.text((36,542),'WRITTEN IN-HOUSE',font=font(10),fill=ink);d.text((312,542),'2026',font=font(10),fill=ink)
 im.save(os.path.join(OUT,bid+'.jpg'),'JPEG',quality=92,optimize=True,progressive=True)
print('drew',len(books),'Original covers')
