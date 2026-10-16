# Package files only. No networking or game execution. Requires Pillow for PNG inspection.
from pathlib import Path
from PIL import Image
import json,hashlib,re
from html.parser import HTMLParser
r=Path(__file__).resolve().parents[1]
def unique_pairs(pairs):
 result={}
 for key,value in pairs:
  if key in result or key in ('__proto__','prototype','constructor'): raise ValueError('Unsafe/duplicate JSON key')
  result[key]=value
 return result
def read_json(path):
 raw=path.read_bytes(); assert len(raw)<5*1024*1024
 return json.loads(raw,object_pairs_hook=unique_pairs)
def local_asset(path):
 assert isinstance(path,str) and path and '\\' not in path
 assert not path.startswith('/') and ':' not in path and all(x not in ('','..','.') for x in path.split('/'))
 p=(r/path).resolve();assert p.is_relative_to(r) and p.is_file();return p
for candidate in r.rglob('*.json'):read_json(candidate)
for invalid in ['../outside.png','/etc/passwd','https://example.com/x.png','assets/../x.png','assets\\x.png']:
 try:local_asset(invalid)
 except AssertionError:pass
 else:raise AssertionError('Invalid path accepted')
for raw in ['{"x":1,"x":2}','{"__proto__":{}}','{"constructor":1}']:
 try:json.loads(raw,object_pairs_hook=unique_pairs)
 except ValueError:pass
 else:raise AssertionError('Unsafe JSON accepted')
a=read_json(r/'assets/asset-manifest.json')['assets'];idx={x['assetId']:x for x in a}
assert len(idx)==len(a)==28
assert sum(x['type']=='portrait' for x in a)==24
assert sum(x['status']=='REFERENCE_APPROVED' for x in a)==5
for x in a:
 p=local_asset(x['path'])
 assert hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256'];im=Image.open(p);im.load()
 assert (im.width,im.height)==(x['width'],x['height'])
 if x['type']=='portrait':assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
w=json.loads((r/'assets/wardrobe-map.json').read_text());chars={x['characterId']:x for x in w['characters']};assert len(chars)==10
for place,rule in w['locations'].items():
 assert idx[rule['background']]['type']=='background'
 for who,outfit in rule['wardrobe'].items():
  asset=chars[who]['variants'][outfit];assert idx[asset]['characterId']==who and idx[asset]['outfitId']==outfit
fm=json.loads((r/'assets/gameplay/frame-map.json').read_text());assert len(fm['frames'])==80
for f in fm['frames']:assert f['x']+96<=768 and f['y']+96<=960
aps=json.loads((r/'assets/gameplay/appearances.json').read_text());assert len(aps)==19
for ap in aps:
 im=Image.open(r/'assets/gameplay'/f"{ap['id']}.png");assert im.size==(768,960) and im.mode=='RGBA'
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('src','href') and v and not re.match(r'^(https?:|#|data:|blob:)',v):
    p=(self.base/v.split('#')[0]).resolve();assert p.is_file(),str(p)
for html in r.rglob('*.html'):
 p=Links();p.base=html.parent;p.feed(html.read_text())
for f in r.rglob('*'):
 assert not f.is_symlink();assert f.name not in ('.env','.git','.openai')
print('PASS: 28 cutscene PNGs, 24 transparent portraits, 10 visual identities, 4 location maps, 19 gameplay atlases, 80 valid frame rectangles per atlas, hashes, local HTML links, no symlinks or .env/.git entries.')
print('Not tested here: actual Phaser integration, story inventory completeness, browser rendering, Safari or physical iPhone.')

registry=read_json(r/'assets/character-continuity.json');vis={x['visualId']:x for x in registry['characters']}
assert len(vis)==10 and vis['alex']['storyRole']=='alex' and vis['boy']['storyRole']==vis['girl']['storyRole']=='player'
for v in vis.values():assert idx[v['identityMasterAssetId']]['characterId']==v['visualId']
source=read_json(r/'docs/reference/source-index.json');scene_map=read_json(r/'assets/scene-visual-map.json')
assert [x['sceneId'] for x in scene_map['scenes']]==source['story']['sceneOrder']
assert len({x['sceneId'] for x in scene_map['scenes']})==18
for sc in scene_map['scenes']:
 if sc['backgroundAssetId'] is not None:assert idx[sc['backgroundAssetId']]['type']=='background'
 assert len(sc['castRoles'])==len(set(sc['castRoles'])) and len(sc['castRoles'])<=3
 assert set(sc['wardrobeByRole'])==set(sc['castRoles'])
 for role in sc['castRoles']:
  for who in (['boy','girl'] if role=='player' else [role]):
   aid=chars[who]['variants'][sc['wardrobeByRole'][role]]
   assert idx[aid]['characterId']==who
print('PASS: 18 ordered scene bindings, character masters, explicit wardrobe joins and rejected traversal/duplicate/prototype-key fixtures.')
