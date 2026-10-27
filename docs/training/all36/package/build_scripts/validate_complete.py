import json,math,copy,xml.etree.ElementTree as ET
from pathlib import Path
R=Path(__file__).resolve().parent/'complete_training_review'
def check(es):
 assert len(es)==36 and {e['id'] for e in es}=={f'D{i:02d}' for i in range(1,37)}
 sources={s['id'] for s in json.loads((R/'sources.json').read_text())}
 validroles={'GK','LB','CB','RB','DM','CM','LW','RW','ST'}
 for e in es:
  ids={a['id'] for a in e['actors']};assert len(ids)==len(e['actors'])
  assert set(e['source_ids'])<=sources
  assert e['protagonist_id'] in ids and e['protagonist_id']!='H_GK'
  for t in 'HA':
   actors=[a for a in e['actors'] if a['team']==t]
   assert len(actors)<=9 and len({a['role'] for a in actors})==len(actors)
  assert all(a['role'] in validroles and a['id']==a['team']+'_'+a['role'] for a in e['actors'])
  assert len(e['variants'])==2 and {v['id'] for v in e['variants']}=={'base','changed'}
  pref=[]
  for v in e['variants']:
   assert set(v['grades'])==set(v['branches'])=={'A','B','C','D'}
   assert set(v['grades'].values())<={'preferred','acceptable','misread'}
   pref.append({k for k,g in v['grades'].items() if g=='preferred'});assert pref[-1]
   assert v['ball_owner'] is None or v['ball_owner'] in ids
   assert set(v['actor_overrides'])<=ids
   positions={a['id']:a['position_m'] for a in e['actors']};positions.update(v['actor_overrides'])
   points=list(positions.values())+[v['ball_position_m']]
   for b in v['branches'].values():
    assert set(b['actor_targets'])<=ids
    assert b['owner_after'] is None or b['owner_after'] in ids
    assert b['feedback'] and b['consequence']
    points+=list(b['actor_targets'].values())+[b['ball_target']]
   x0,y0,x1,y1=e['camera_bounds_m']
   for p in points:
    assert len(p)==2 and all(type(x) in (float,int) and math.isfinite(x) for x in p)
    assert 0<=p[0]<=45.72 and 0<=p[1]<=68.58
    assert x0<=p[0]<=x1 and y0<=p[1]<=y1
  assert pref[0]!=pref[1]
 return True
es=json.loads((R/'episodes.json').read_text());check(es)
mutations=[lambda d:d.pop(),lambda d:d[0].update(protagonist_id='H_GK'),lambda d:d[0]['actors'].append(d[0]['actors'][0]),lambda d:d[0]['source_ids'].append('ghost'),lambda d:d[0]['actors'][0].update(position_m=[float('nan'),1]),lambda d:d[0]['actors'][0].update(position_m=[-1,1]),lambda d:d[0]['variants'][0]['grades'].update(A='guaranteed'),lambda d:d[0]['variants'][0]['branches'].pop('A'),lambda d:d[0]['variants'][0].update(ball_owner='ghost'),lambda d:d[0]['variants'][0]['actor_overrides'].update(ghost=[1,1]),lambda d:d[0].update(camera_bounds_m=[0,0,1,1]),lambda d:d[0]['variants'][1].update(grades=copy.deepcopy(d[0]['variants'][0]['grades']))]
for fn in mutations:
 d=copy.deepcopy(es);fn(d)
 try:check(d)
 except (AssertionError,KeyError):pass
 else:raise RuntimeError('Mutation escaped')
previews=list((R/'previews').glob('*.svg'));assert len(previews)==288
for p in previews:
 doc=ET.parse(p);imgs=doc.findall('.//{http://www.w3.org/2000/svg}image')
 e=next(e for e in es if e['id']==p.name[:3]);assert len(imgs)==len(e['actors'])
 for im in imgs:
  path=im.attrib['{http://www.w3.org/1999/xlink}href'];assert (p.parent/path).exists()
report={'structural_checks':'PASS','negative_mutations_rejected':len(mutations),'situations':36,'variants':72,'choice_grade_records':288,'SVG_panels':288,'missing_situations':0,'independent_coach_approval':False,'animation_physics_validated':False}
(R/'validation_results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
