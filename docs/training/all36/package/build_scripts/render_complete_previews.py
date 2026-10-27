import json, shutil, html, zipfile, hashlib
from functools import lru_cache
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parent
out=root/'complete_training_review'
out.mkdir(exist_ok=True)
assets=root/'assets_review/SoccerMaster_Team_Training_Devin'
episodes=json.loads((out/'episodes.json').read_text())
roles=['LB','CB','RB','DM','CM','LW','RW','ST']
inventory=[]
for p in assets.rglob('*.png'):
 im=Image.open(p); alpha=im.getchannel('A')
 inventory.append({'file':str(p.relative_to(assets)),'size':list(im.size),'alpha_range':alpha.getextrema(),'review':'metadata only; not frame-by-frame approval'})
def sheet(a,protagonist,sex):
 if a['id']==protagonist:return assets/'01_Protagonists'/f'{sex}_highlight.png'
 if a['role']=='GK':return assets/'04_Goalkeepers'/('home_keeper_keyposes.png' if a['team']=='H' else 'opposition_keeper_keyposes.png')
 if a['team']=='A':return assets/'03_Opponents'/f'opponent_{roles.index(a["role"])+1:02d}.png'
 teammate_roles=[r for r in roles if 'H_'+r!=protagonist]
 return assets/'02_Teammates'/f'teammate_{teammate_roles.index(a["role"])+1:02d}.png'
@lru_cache(maxsize=None)
def frame(p):
 im=Image.open(p);w,h=im.size
 # Static row2 first pose for outfield; first keeper keypose. Read-only bounds analysis.
 box=(0,0,w,h//4) if 'keeper' in p.name else (0,h//4,w//6,h//2)
 alpha=im.getchannel('A').crop(box)
 # Ignore isolated remnants of adjacent rows: select longest occupied horizontal band.
 mask=alpha.point(lambda x:255 if x>180 else 0)
 runs=[];start=None
 for yy in range(mask.height+1):
  occupied=yy<mask.height and sum(v>0 for v in list(mask.crop((0,yy,mask.width,yy+1)).getdata()))>3
  if occupied and start is None:start=yy
  if not occupied and start is not None:runs.append((start,yy));start=None
 lo,hi=max(runs,key=lambda r:r[1]-r[0])
 sub=mask.crop((0,lo,mask.width,hi)); b=sub.getbbox()
 bounds=(b[0],b[1]+lo,b[2],b[3]+lo)
 if bounds is None:raise ValueError(str(p))
 x0,y0,x1,y1=bounds
 return (box[0]+x0,box[1]+y0,x1-x0,y1-y0,w,h)
pages=[]
for e in episodes:
 for v in e['variants']:
  choice=next(k for k,g in v['grades'].items() if g=='preferred')
  branch=v['branches'][choice]
  for sex in ('boy','girl'):
   for state in ('decision','consequence'):
    positions={a['id']:v['actor_overrides'].get(a['id'],a['position_m']) for a in e['actors']}
    before=dict(positions)
    if state=='consequence':positions.update(branch['actor_targets'])
    ball=v['ball_position_m'] if state=='decision' else branch['ball_target']
    x0,y0,x1,y1=e['camera_bounds_m'];s=min(880/(x1-x0),650/(y1-y0))
    left=60+(880-s*(x1-x0))/2;top=150
    tx=lambda x:left+(x-x0)*s
    ty=lambda y:top+(y1-y)*s
    svg=['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1000" height="1050" viewBox="0 0 1000 1050">', '<rect width="1000" height="1050" fill="#14233b"/>']
    def text(x,y,t,size=21,color='#fff1cd'):
     svg.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans,sans-serif" font-size="{size}" fill="{color}">{html.escape(t)}</text>')
    text(40,42,f'{e["decision_id"]} — {v["id"]} — {state.upper()}',27,'#ffcc66')
    text(40,77,e['title'],22)
    text(40,112,f'{sex.capitalize()} protagonist • Home attacks up • Static review, not approved',18)
    svg.append(f'<rect x="{left}" y="{top}" width="{s*(x1-x0)}" height="{s*(y1-y0)}" fill="#528740" stroke="#fff4d6" stroke-width="3"/>')
    for y in range(0,70,5):
     if y0<=y<=y1:svg.append(f'<path d="M {left} {ty(y)} H {tx(x1)}" stroke="#73a256" stroke-width="2" opacity=".5"/>')
    if y0<=34.29<=y1:svg.append(f'<path d="M {left} {ty(34.29)} H {tx(x1)}" stroke="white" stroke-width="2"/>')
    for gy in (0,68.58):
     if y0<=gy<=y1:svg.append(f'<path d="M {tx(19.2)} {ty(gy)} H {tx(26.52)}" stroke="white" stroke-width="9"/>')
    # Schematic pitch markings: for orientation only, not a competition dimensions claim.
    for near in (True,False):
     end=0 if near else 68.58; inner=12 if near else 56.58
     if y0<=inner<=y1 and y0<=end<=y1:
      svg.append(f'<path d="M {tx(12)} {ty(end)} V {ty(inner)} H {tx(33.72)} V {ty(end)}" fill="none" stroke="white" stroke-width="2" opacity=".8"/>')
    if y0<=34.29-7<=y1 and y0<=34.29+7<=y1:
     svg.append(f'<circle cx="{tx(22.86)}" cy="{ty(34.29)}" r="{7*s}" fill="none" stroke="white" stroke-width="2" opacity=".8"/>')
    if state=='consequence':
     for aid,end in branch['actor_targets'].items():
      start=before[aid]
      if start!=end:svg.append(f'<path d="M {tx(start[0])} {ty(start[1])} L {tx(end[0])} {ty(end[1])}" stroke="#ffe09a" stroke-width="3" stroke-dasharray="6 5"/>')
    for a in sorted(e['actors'],key=lambda a:-positions[a['id']][1]):
     p=sheet(a,e['protagonist_id'],sex);target=out/'assets'/p.relative_to(assets);target.parent.mkdir(parents=True,exist_ok=True)
     if not target.exists():shutil.copy2(p,target)
     fx,fy,fw,fh,iw,ih=frame(p);height=54;width=height*fw/fh;x,y=positions[a['id']]
     scale=height/fh; sx=tx(x)-width/2; sy=ty(y)-height; clip='clip_'+a['id']
     svg.append(f'<defs><clipPath id="{clip}" clipPathUnits="userSpaceOnUse"><rect x="{sx}" y="{sy}" width="{width}" height="{height}"/></clipPath></defs><image x="{sx-fx*scale}" y="{sy-fy*scale}" width="{iw*scale}" height="{ih*scale}" clip-path="url(#{clip})" xlink:href="../assets/{p.relative_to(assets).as_posix()}"/>')
     text(tx(x)+width/2+3,ty(y)-10,('YOU / ' if a['id']==e['protagonist_id'] else '')+a['id'],15,'#ffda71' if a['id']==e['protagonist_id'] else '#ffffff')
    svg.append(f'<circle cx="{tx(ball[0])}" cy="{ty(ball[1])}" r="6" fill="white" stroke="#111" stroke-width="2"/>')
    text(140,850,'COACH CODE',22,'#ffcc66')
    words=(v['visible_cues'] if state=='decision' else [branch['label']+'. '+v['reason'],branch['feedback']])
    import textwrap
    lines=[line for t in words for line in textwrap.wrap(t,76)]
    for i,line in enumerate(lines[:5]):text(140,882+i*25,line,18)
    text(140,1025,'Sources: '+', '.join(e['source_ids'])+' • Authored coordinates • No animation certification',15)
    svg.append('</svg>')
    name=f'{e["decision_id"]}_{v["id"]}_{sex}_{state}.svg'
    (out/'previews').mkdir(exist_ok=True)
    (out/'previews'/name).write_text(''.join(svg))
    pages.append(name)

coverage=[{'decision_id':e['id'],'role':e['protagonist_id'][2:],'source_ids':e['source_ids'],'panels':8,'preview_status':'authored_static_review','coach_approved':False} for e in episodes]
(out/'coverage.json').write_text(json.dumps(coverage,indent=2))
(out/'asset_metadata.json').write_text(json.dumps(inventory,indent=2))
gallery='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>All36 SoccerMaster situations</title><style>body{background:#14233b;color:#fff1cd;font:18px sans-serif;margin:20px}section{max-width:1100px;margin:35px auto;border-top:2px solid #f5be60}object{width:100%;max-width:1000px;display:block;margin:12px auto}a{color:#ffda71}summary{cursor:pointer;padding:12px}h1,p{max-width:1100px;margin:20px auto}</style></head><body><h1>SoccerMaster — all36 situations</h1><p>36 situations ×2 cue states ×2 panels ×2 protagonist choices =288 SVG panels. The PNG folder supplies72 base-state boy decision/consequence images for easy phone viewing. Source-linked, authored adaptations; coaching and runtime approval remain pending.</p>'
for e in episodes:
 gallery+='<section><h2>'+html.escape(e['id']+' — '+e['title'])+'</h2>'
 for sex in ('boy','girl'):
  for variant in ('base','changed'):
   gallery+='<details><summary>'+sex.title()+' / '+variant+' — decision and consequence</summary>'
   for state in ('decision','consequence'):
    name=f'{e["id"]}_{variant}_{sex}_{state}.svg'
    gallery+=f'<object type="image/svg+xml" data="previews/{name}"></object>'
   gallery+='</details>'
 gallery+='</section>'
gallery+='</body></html>'
(out/'OPEN_ALL_PREVIEWS.html').write_text(gallery)
assert len(pages)==288 and len(coverage)==36
print('288 SVG panels generated. All36 situations represented.')
