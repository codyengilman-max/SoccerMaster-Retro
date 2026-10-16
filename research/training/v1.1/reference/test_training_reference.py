import copy,json,hashlib,sqlite3,tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import training_reference as r
ROOT=Path(__file__).parent
base=r.load((ROOT/'training_manifest_v2.json').read_bytes())
results=[]
def check(name,fn):
    fn();results.append({'test':name,'result':'PASS'})
def ok(x):
    if not x:raise AssertionError('expectation failed')
def reject(name,change):
    def run():
        m=copy.deepcopy(base);change(m)
        try:r.load(json.dumps(m).encode())
        except (ValueError,TypeError):return
        raise AssertionError('accepted invalid fixture')
    check(name,run)
def badraw(name,raw):
    def run():
        try:r.load(raw)
        except (ValueError,TypeError):return
        raise AssertionError('accepted invalid raw data')
    check(name,run)
check('valid catalog parses',lambda:ok(len(base['families'])==20))
check('100 standalone variants / 200 demo references',lambda:ok(sum(len(f['levels']) for f in base['families'])==100 and len(base['demos'])==200))
reject('unknown top-level field',lambda m:m.update(untrusted=True))
reject('unknown schema version',lambda m:m.update(schemaVersion=999))
reject('boolean schema version',lambda m:m.update(schemaVersion=True))
reject('duplicate family ID',lambda m:m['families'].append(copy.deepcopy(m['families'][0])))
reject('unknown profile',lambda m:m['families'][0].update(profile='unsafe'))
reject('missing profile capability',lambda m:m['families'][0].update(requiredCapabilities=['ball']))
reject('nonexistent prerequisite',lambda m:m['families'][0]['levels'][0].update(prerequisites=['missing']))
reject('cyclic prerequisite',lambda m:m['families'][0]['levels'][0].update(prerequisites=['BM01-L1']))
reject('missing source reference',lambda m:m['claims'][1].update(sourceIds=['missing']))
reject('missing locator',lambda m:m['claims'][1].update(locator=None))
reject('missing demo',lambda m:m['demos'].pop())
reject('wrong-side demo identity',lambda m:m['demos'][0].update(side='left'))
reject('forged release flag',lambda m:m['families'][0]['levels'][0].update(releaseStatus='published'))
reject('forged catalog approval record',lambda m:m['reviewRecords'].append({'approved':True}))
reject('untrusted demo asset authority',lambda m:m['demos'][0].update(assetPath='https://evil.example/movie'))
reject('combination contains lane drill',lambda m:m['families'][-1]['levels'][0].update(components=['DR01-L1'],prerequisites=['DR01-L1']))
reject('unknown fallback target',lambda m:m['substitutions'][0].update(toFamily='missing'))
reject('fallback cycle',lambda m:m['substitutions'].append(dict(fromFamily='PA01',toFamily='PA02',sameOutcome=False,notice='test')))
reject('duplicate slot index',lambda m:m['sessionTemplates'][0]['slots'][1].update(index=0))
reject('stat reward injection',lambda m:m['rewardPolicy'].update(statDelta=1))
reject('integer disguised as policy boolean',lambda m:m['rewardPolicy'].update(convertible=0))
reject('physical catch-up enabled',lambda m:m['physicalSchedule'].update(careerAdvanceCreatesPhysicalBacklog=True))
reject('null setup',lambda m:m['families'][0]['levels'][0].update(setup=None))
reject('HTML in text',lambda m:m['families'][0].update(title='<img src=x onerror=alert(1)>'))
reject('oversize field',lambda m:m['families'][0].update(title='x'*4001))
reject('non-HTTPS URL',lambda m:m['sources'][0].update(url='javascript:alert(1)'))
reject('hostname suffix spoof',lambda m:m['sources'][0].update(url='https://www.ussoccer.com.evil.example/x'))
reject('URL credentials',lambda m:m['sources'][0].update(url='https://user@www.ussoccer.com/x'))
reject('query-driven redirect URL',lambda m:m['sources'][0].update(url='https://www.ussoccer.com/?next=https://evil.example'))
badraw('duplicate JSON properties',b'{"schemaVersion":2,"schemaVersion":2}')
badraw('prototype-like property',b'{"__proto__":{}}')
badraw('NaN constant',b'{"x":NaN}')
badraw('infinite constant',b'{"x":Infinity}')
badraw('truncated JSON',b'{"schemaVersion":')
badraw('oversized bytes',b' '*1_000_001)
badraw('deep nesting before parse',b'['*17+b'0'+b']'*17)

# Fabricated fixture approvals are strictly test-only and are never saved into the catalog.
fixture=copy.deepcopy(base)
for c in fixture['claims']:
    if c['type']=='unresolved':c['type']='original_adaptation'
trusted={};assets={}
for f in fixture['families']:
    for l in f['levels']:
        sides={}
        for side in ['left','right']:
            assets[l['id']+'-'+side]={'bytes':b'test asset '+side.encode(),'caption':b'test caption','side':side}
            sides[side]={'assetHash':hashlib.sha256(assets[l['id']+'-'+side]['bytes']).hexdigest(),'captionHash':hashlib.sha256(b'test caption').hexdigest()}
        trusted[l['id']]={'revoked':False,'contentHash':r.fingerprint(fixture,l['id']),'coachReviewer':'TEST_ONLY','qaReviewer':'TEST_ONLY','evidenceReviewed':True,'rightsReviewed':True,'sides':sides}
lid='BM02-L1'
check('synthetic approval positive control',lambda:ok(r.approved(fixture,lid,trusted,assets)))
def approval_mutation(name,mut):
    def run():
        m=copy.deepcopy(fixture);t=copy.deepcopy(trusted);a=copy.deepcopy(assets);mut(m,t,a)
        ok(not r.approved(m,lid,t,a))
    check(name,run)
approval_mutation('revoked approval rejected',lambda m,t,a:t[lid].update(revoked=True))
approval_mutation('changed instruction hash rejected',lambda m,t,a:m['families'][1]['levels'][0]['steps'].append('Changed step.'))
approval_mutation('changed safety hash rejected',lambda m,t,a:m['safety'].update(stopRule='Different rule'))
approval_mutation('changed asset rejected',lambda m,t,a:a[lid+'-right'].update(bytes=b'changed'))
approval_mutation('changed caption rejected',lambda m,t,a:a[lid+'-right'].update(caption=b'changed'))
approval_mutation('wrong-foot asset rejected',lambda m,t,a:a[lid+'-right'].update(side='left'))
approval_mutation('missing reviewer rejected',lambda m,t,a:t[lid].update(coachReviewer=''))
approval_mutation('missing rights review rejected',lambda m,t,a:t[lid].update(rightsReviewed=False))
check('unresolved evidence blocks synthetic approval',lambda:ok(not r.approved(base,'BM01-L1',trusted,assets)))
allcaps=base['capabilities'];comfortable=[l['id'] for f in base['families'] for l in f['levels']]
check('all-draft catalog returns no content',lambda:ok(r.choose(base,'PA02',allcaps,comfortable,{},assets)['levelId'] is None))
check('no wall and small space cannot fallback to target',lambda:ok(r.choose(fixture,'PA02',['ball','clear_floor'],comfortable,trusted,assets)['levelId'] is None))
check('no target/no outdoor cannot fallback to finishing',lambda:ok(r.choose(fixture,'FI01',['ball','clear_floor'],comfortable,trusted,assets)['levelId'] is None))
check('wall fallback requires target capabilities',lambda:ok(r.choose(fixture,'PA02',['ball','clear_floor','lane_clear','safe_runout','safe_target','backstop'],comfortable,trusted,assets)['substituted']))
check('no overhead uses disclosed ground alternative',lambda:ok(r.choose(fixture,'JU01',['ball','clear_floor'],comfortable,trusted,assets)['levelId']=='BM01-L1'))
check('unfamiliar prerequisite blocks one-touch',lambda:ok(not r.eligible(fixture,'PA03-L1',allcaps,[],trusted,assets)))
check('combination rechecks component approval',lambda:ok(not r.eligible(fixture,'CO01-L2',allcaps,comfortable,{k:v for k,v in trusted.items() if k!='BM02-L1'},assets)))
check('mirroring preserves all four surfaces',lambda:ok(all(r.mirror('right',s)==('left',s) for s in ['inside','outside','sole','laces'])))

with tempfile.TemporaryDirectory() as td:
    db=str(Path(td)/'ledger.db');r.init_ledger(db)
    r.seed_slot(db,'career','week',0,'started')
    def race():
        with ThreadPoolExecutor(max_workers=8) as pool:out=list(pool.map(lambda _:r.complete(db,'career','week',0),range(16)))
        ok(out.count('completed')==1 and out.count('already_completed')==15)
        with sqlite3.connect(db) as con:ok(con.execute('select count(*) from claim').fetchone()[0]==1 and con.execute('select count(*) from journal').fetchone()[0]==1)
    check('16 concurrent claims create one stamp',race)
    check('replay remains idempotent',lambda:ok(r.complete(db,'career','week',0)=='already_completed'))
    r.seed_slot(db,'career','week',1,'started')
    def crash():
        try:r.complete(db,'career','week',1,fault=True)
        except RuntimeError:pass
        with sqlite3.connect(db) as con:ok(con.execute('select count(*) from claim where idx=1').fetchone()[0]==0 and con.execute('select state from slot where idx=1').fetchone()[0]=='started')
        ok(r.complete(db,'career','week',1)=='completed')
    check('crash rolls back claim and retry succeeds',crash)
    r.seed_slot(db,'career','week',2,'skipped')
    def skip():
        try:r.complete(db,'career','week',2)
        except ValueError:return
        raise AssertionError('skip rewarded')
    check('skipped slot not rewarded',skip)
    def unknown():
        try:r.complete(db,'career','unknown',0)
        except ValueError:return
        raise AssertionError('unknown slot rewarded')
    check('unknown week slot rejected',unknown)
    check('stable entitlement excludes content and drill versions',lambda:ok(base['rewardPolicy']['entitlementFields']==['careerId','careerWeekId','slotIndex']))
    def invalidslot():
        try:r.complete(db,'career','week',3)
        except ValueError:return
        raise AssertionError('fourth slot permitted')
    check('fourth weekly slot rejected',invalidslot)

ROOT.joinpath('training_recheck_results.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'passed':len(results),'failed':0,'scope':'offline reference contract; synthetic approvals; SQLite transaction model, not browser/game tests'}))

