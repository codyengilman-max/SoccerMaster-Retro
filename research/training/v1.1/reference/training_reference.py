"""Offline specification checks. Not the game's production importer or security boundary."""
import hashlib,json,re,sqlite3
from urllib.parse import urlsplit

MAX_BYTES=1_000_000
HOSTS={'www.ussoccer.com','www.coerver.com','www.thefa.com','norcalpremier.com','www.gftskills.com','mypersonalfootballcoach.com','www.soccerdrive.com','community.thefa.com','www.fifatrainingcentre.com'}
def require(ok,msg):
    if not ok: raise ValueError(msg)
def keys(o,names):
    require(type(o) is dict and set(o)==set(names.split()),'unknown/missing fields: '+names)
    array_fields={'capabilities','sources','spaceProfiles','claims','families','demos','sessionTemplates','substitutions','reviewRecords','requiredCapabilities','optionalEquipment','levels','sourceIds','steps','prerequisites','components','demoIds','claimIds','slots','prohibited'}
    object_fields={'rewardPolicy','progressionDecision','physicalSchedule','safety'}
    bool_fields={'textReviewed','videoReviewed','sameOutcome','skipPenalty'}
    integer_fields={'schemaVersion','ordinal','index'}
    nullable={'locator','videoTimestamp','assetPath','assetSha256','captionSha256'}
    for k,v in o.items():
        expected=list if k in array_fields else dict if k in object_fields else bool if k in bool_fields else int if k in integer_fields else str
        require((k in nullable and v is None) or type(v) is expected,'field type '+k)
def strings(a):
    require(type(a) is list and all(type(x) is str and x for x in a),'string array')
    require(len(a)==len(set(a)),'duplicate entries')
def unique(a):
    ids=[x['id'] for x in a];require(len(ids)==len(set(ids)),'duplicate IDs');return {x['id']:x for x in a}
def load(raw):
    require(type(raw) is bytes and len(raw)<=MAX_BYTES,'byte limit')
    def pairs(items):
        d={}
        for k,v in items:
            require(k not in d and k not in {'__proto__','constructor','prototype'},'duplicate/dangerous key');d[k]=v
        return d
    def constant(x):raise ValueError('nonfinite number')
    # Structural depth is checked BEFORE JSON parsing, ignoring quoted strings.
    depth=0;quoted=False;escaped=False
    for c in raw.decode('utf-8'):
        if quoted:
            if escaped:escaped=False
            elif c=='\\':escaped=True
            elif c=='"':quoted=False
        elif c=='"':quoted=True
        elif c in '[{':
            depth+=1;require(depth<=16,'depth limit')
        elif c in ']}':depth-=1
    obj=json.loads(raw,object_pairs_hook=pairs,parse_constant=constant)
    validate(obj);return obj
def validate(m):
    def walk(o,depth=0):
        require(depth<=16,'depth')
        if type(o) is str:
            require(0<len(o)<=4000 and not any(ord(c)<32 and c not in '\n\t' for c in o),'text length/control')
            require('<' not in o and '>' not in o,'markup not permitted in catalog')
        elif type(o) is dict:
            for k,v in o.items():
                require(k not in {'__proto__','constructor','prototype'},'dangerous key');walk(v,depth+1)
        elif type(o) is list:
            require(len(o)<=500,'array bound')
            for v in o:walk(v,depth+1)
        else:require(o is None or type(o) in (bool,int),'unexpected type')
    walk(m)
    keys(m,'schemaVersion contentVersion audience capabilities sources spaceProfiles claims families demos sessionTemplates substitutions reviewRecords rewardPolicy progressionDecision physicalSchedule safety')
    require(type(m['schemaVersion']) is int and m['schemaVersion']==2,'schema version')
    require(re.fullmatch(r'\d+\.\d+\.\d+',m['contentVersion']) is not None,'content version')
    require(m['audience']=='U11-U12','audience');strings(m['capabilities']);caps=set(m['capabilities'])
    require(caps=={'ball','clear_floor','lane_clear','permitted_wall','safe_rebound','safe_runout','overhead_clear','outdoor_clear','safe_target','backstop'},'capability vocabulary')
    require(0<len(m['families'])<=250,'family count')
    src=unique(m['sources']);profiles=unique(m['spaceProfiles']);claims=unique(m['claims']);families=unique(m['families']);demos=unique(m['demos'])
    for x in src.values():
        keys(x,'id title url scope textReviewed videoReviewed reviewDate')
        u=urlsplit(x['url']);require(u.scheme=='https' and u.hostname in HOSTS and u.port in (None,443) and u.username is None and u.password is None and not u.query and not u.fragment,'source URL')
        require(type(x['textReviewed']) is bool and type(x['videoReviewed']) is bool,'review bool')
        require(re.fullmatch(r'\d{4}-\d{2}-\d{2}',x['reviewDate']) is not None,'date')
    for x in profiles.values():
        keys(x,'id requiredCapabilities setup');strings(x['requiredCapabilities']);require(set(x['requiredCapabilities'])<=caps,'profile capabilities')
    for x in claims.values():
        keys(x,'id type sourceIds claim locator scope videoTimestamp');strings(x['sourceIds'])
        require(x['type'] in ['direct_technique','contextual_principle','original_adaptation','unresolved'],'claim type')
        require(set(x['sourceIds'])<=set(src),'claim sources')
        if x['type'] in ['direct_technique','contextual_principle']:require(bool(x['sourceIds']) and bool(x['locator']),'evidence locator')
        require(x['videoTimestamp'] is None,'v2 text-only evidence; no video timestamps approved')
    levels={};owner={}
    for f in families.values():
        keys(f,'id title category profile requiredCapabilities optionalEquipment qualityCheck correction limitation levels')
        require(re.fullmatch(r'[A-Z]{2}\d{2}',f['id']) is not None,'family id')
        require(f['category'] in ['ball_control','dribbling','turning','passing','first_touch','aerial_control','finishing'],'category')
        require(f['profile'] in profiles,'profile');strings(f['requiredCapabilities']);strings(f['optionalEquipment'])
        require(set(f['requiredCapabilities'])==set(profiles[f['profile']]['requiredCapabilities']),'profile mismatch')
        require(set(f['optionalEquipment'])<={'flat_soft_markers'},'optional equipment')
        require(len(f['levels'])==5,'level count')
        for i,l in enumerate(f['levels'],1):
            keys(l,'id ordinal setup startingState steps endingState footMode prerequisites components demoIds claimIds releaseStatus')
            require(type(l['ordinal']) is int and l['ordinal']==i and l['id']==f['id']+'-L'+str(i),'level identity')
            require(l['id'] not in levels,'duplicate level');levels[l['id']]=l;owner[l['id']]=f
            for name in ['steps','prerequisites','components','demoIds','claimIds']:strings(l[name])
            require(2<=len(l['steps'])<=12,'steps');require(l['releaseStatus']=='draft','content import cannot publish')
            require(set(l['claimIds'])<=set(claims) and l['claimIds'],'claims')
            require(set(l['demoIds'])=={l['id']+'-right',l['id']+'-left'},'demo sides')
    require(set(demos)=={did for l in levels.values() for did in l['demoIds']},'demo coverage')
    for l in levels.values():
        require(set(l['prerequisites']+l['components'])<=set(levels),'prerequisite reference')
        require(set(l['components'])<=set(l['prerequisites']),'components require familiarity')
        if owner[l['id']]['id']=='CO01':require(set(l['components'])==({'BM01-L1'} if l['ordinal']==1 else {'BM01-L1','BM02-L1'}),'combination allowlist')
        else:require(l['components']==[],'unexpected component')
    def visit(id,path):
        require(id not in path,'prerequisite cycle')
        for x in levels[id]['prerequisites']:visit(x,path|{id})
    for id in levels:visit(id,set())
    for d in demos.values():
        keys(d,'id levelId side assetPath assetSha256 captionSha256 status checkpoint videoReviewed')
        require(d['levelId'] in levels and d['side'] in ['left','right'] and d['id']==d['levelId']+'-'+d['side'],'demo identity')
        require(d['status']=='not_created' and d['assetPath'] is None and d['assetSha256'] is None and d['captionSha256'] is None and d['videoReviewed'] is False,'draft asset authority')
    require(m['reviewRecords']==[],'runtime catalog may not carry approvals')
    focus=[]
    for t in m['sessionTemplates']:
        keys(t,'focus slots');focus.append(t['focus']);require(len(t['slots'])==3,'slot count')
        for i,s in enumerate(t['slots']):
            keys(s,'index families');strings(s['families']);require(type(s['index']) is int and s['index']==i and len(s['families'])==2 and set(s['families'])<=set(families),'slot')
    require(len(focus)==len(set(focus)),'duplicate focus')
    edges={}
    for s in m['substitutions']:
        keys(s,'fromFamily toFamily sameOutcome notice');require(s['fromFamily'] in families and s['toFamily'] in families and s['fromFamily']!=s['toFamily'],'substitution reference')
        require(s['fromFamily'] not in edges and s['sameOutcome'] is False and s['notice'],'substitution metadata');edges[s['fromFamily']]=s['toFamily']
    for id in edges:
        seen=set();p=id
        while p in edges:require(p not in seen,'substitution cycle');seen.add(p);p=edges[p]
    require(json.dumps(m['rewardPolicy'],sort_keys=True)==json.dumps(dict(entitlementFields=['careerId','careerWeekId','slotIndex'],slotsPerWeek=3,reward='local_journal_stamp',amount=1,transferable=False,convertible=False,statDelta=0,currencyDelta=0,clockDriven=False),sort_keys=True),'reward policy')
    require(json.dumps(m['physicalSchedule'],sort_keys=True)==json.dumps(dict(automaticExercisePrompts=False,careerAdvanceCreatesPhysicalBacklog=False,mandatorySessions=0,completionTimerRequired=False),sort_keys=True),'physical schedule')
    keys(m['progressionDecision'],'status home gameplay conflictAction');require(m['progressionDecision']['status']=='implementation_proposal','decision status')
    keys(m['safety'],'prohibited stopRule skipPenalty');require(m['safety']['skipPenalty'] is False,'skip penalty');strings(m['safety']['prohibited'])
    require(set(m['safety']['prohibited'])=={'heading','standing_on_ball','eyes_closed_balance','max_power_indoor_shooting','fatigue_sprints','contact_tackles'},'safety exclusions')
    return True

def fingerprint(m,lid):
    # Python canonical bytes for this reference only. Production uses hashes of committed files.
    f=next(f for f in m['families'] if any(l['id']==lid for l in f['levels']))
    l=next(l for l in f['levels'] if l['id']==lid)
    claim=[x for x in m['claims'] if x['id'] in l['claimIds']]
    sourceIds={s for c in claim for s in c['sourceIds']}
    payload={'family':{k:v for k,v in f.items() if k!='levels'},'level':l,'claims':claim,'sources':[s for s in m['sources'] if s['id'] in sourceIds],'profile':next(p for p in m['spaceProfiles'] if p['id']==f['profile']),'safety':m['safety']}
    return hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()

def approved(m,lid,trusted,assets):
    # `trusted` supplied by a trusted release build, NEVER read from user content/save.
    r=trusted.get(lid)
    if not r or r['revoked'] or r['contentHash']!=fingerprint(m,lid):return False
    if not all(r.get(x) for x in ['coachReviewer','qaReviewer','evidenceReviewed','rightsReviewed']):return False
    if set(r['sides'])!={'left','right'}:return False
    l=next(l for f in m['families'] for l in f['levels'] if l['id']==lid)
    if any(x['type']=='unresolved' for x in m['claims'] if x['id'] in l['claimIds']):return False
    for side in ['left','right']:
        a=assets.get(lid+'-'+side);s=r['sides'][side]
        if not a or a['side']!=side:return False
        if hashlib.sha256(a['bytes']).hexdigest()!=s['assetHash'] or hashlib.sha256(a['caption']).hexdigest()!=s['captionHash']:return False
    return True

def eligible(m,lid,capabilities,comfortable,trusted,assets):
    f=next(f for f in m['families'] if any(l['id']==lid for l in f['levels']))
    l=next(l for l in f['levels'] if l['id']==lid)
    if not approved(m,lid,trusted,assets) or not set(f['requiredCapabilities'])<=set(capabilities) or not set(l['prerequisites'])<=set(comfortable):return False
    return all(eligible(m,c,capabilities,comfortable,trusted,assets) for c in l['components'])

def choose(m,family,capabilities,comfortable,trusted,assets):
    # Finite one-hop fallback. No inference from prose, no recursive retries.
    families={f['id']:f for f in m['families']}
    for l in families[family]['levels']:
        if eligible(m,l['id'],capabilities,comfortable,trusted,assets):return {'levelId':l['id'],'substituted':False,'notice':None}
    for s in m['substitutions']:
        if s['fromFamily']==family:
            for l in families[s['toFamily']]['levels']:
                if eligible(m,l['id'],capabilities,comfortable,trusted,assets):return {'levelId':l['id'],'substituted':True,'notice':s['notice']}
    return {'levelId':None,'substituted':False,'notice':'No eligible reviewed activity. Choose another focus or skip without penalty.'}

def mirror(side,surface):
    require(side in ['left','right'] and surface in ['inside','outside','sole','laces'],'mirror inputs')
    return ('left' if side=='right' else 'right',surface)

def init_ledger(path):
    with sqlite3.connect(path) as db:
        db.executescript('CREATE TABLE IF NOT EXISTS slot(career TEXT, week TEXT, idx INTEGER CHECK(idx BETWEEN 0 AND 2), state TEXT, PRIMARY KEY(career,week,idx)); CREATE TABLE IF NOT EXISTS claim(career TEXT, week TEXT, idx INTEGER, PRIMARY KEY(career,week,idx)); CREATE TABLE IF NOT EXISTS journal(career TEXT, week TEXT, idx INTEGER, PRIMARY KEY(career,week,idx));')
def seed_slot(path,career,week,idx,state='available'):
    require(type(idx) is int and idx in range(3),'slot index')
    require(state in ['available','started','skipped','completed'],'state')
    with sqlite3.connect(path) as db:db.execute('INSERT OR IGNORE INTO slot VALUES(?,?,?,?)',(career,week,idx,state))
def complete(path,career,week,idx,*,fault=False):
    # Transaction reference only. Caller must check current authorized plan/eligibility.
    require(type(idx) is int and idx in range(3),'slot index')
    db=sqlite3.connect(path,timeout=10)
    try:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT state FROM slot WHERE career=? AND week=? AND idx=?',(career,week,idx)).fetchone()
        require(row is not None,'unknown slot')
        if row[0]=='completed':db.commit();return 'already_completed'
        require(row[0]=='started','not started')
        db.execute('INSERT INTO claim VALUES(?,?,?)',(career,week,idx))
        if fault:raise RuntimeError('simulated crash before journal')
        db.execute('INSERT INTO journal VALUES(?,?,?)',(career,week,idx))
        db.execute('UPDATE slot SET state=? WHERE career=? AND week=? AND idx=?',('completed',career,week,idx))
        db.commit();return 'completed'
    except:db.rollback();raise
    finally:db.close()

