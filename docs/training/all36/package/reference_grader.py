"""Exact review-fixture lookup. No generic AI, simulation or progression writes."""
import json
from pathlib import Path
def grade(scene_id,variant_id,choice_id):
 if not all(isinstance(x,str) for x in (scene_id,variant_id,choice_id)):
  return {'status':'needs_review','credit':False}
 data=json.loads(Path(__file__).with_name('episodes.json').read_text())
 scene=next((e for e in data if e['id']==scene_id),None)
 state=next((v for v in scene['variants'] if v['id']==variant_id),None) if scene else None
 if not state or choice_id not in state['grades']:
  return {'status':'needs_review','credit':False}
 value=state['grades'][choice_id]
 return {'status':'review_only','grade':value,'defensible':value in ('preferred','acceptable'),'feedback':state['branches'][choice_id]['feedback'],'credit':False}
if __name__=='__main__':
 data=json.loads(Path(__file__).with_name('episodes.json').read_text());count=0
 for e in data:
  for v in e['variants']:
   for c,g in v['grades'].items():
    r=grade(e['id'],v['id'],c);assert r['grade']==g and not r['credit'];count+=1
 for bad in [('ghost','base','A'),('D01','ghost','A'),('D01','base','X'),(None,'base','A')]:
  assert grade(*bad)['status']=='needs_review'
 print(str(count)+' grade lookups and four unknown-input tests PASS; no production credit.')
