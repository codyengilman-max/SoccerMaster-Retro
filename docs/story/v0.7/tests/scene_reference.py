"""SQLite reference contract. Not the Phaser runtime or browser storage adapter."""
import json, sqlite3, uuid
from pathlib import Path
CATALOG=Path(__file__).resolve().parents[1]/'week_one_scenes.json'

def validate(catalog):
    scenes=catalog['scenes']; ids=[s['id'] for s in scenes]
    assert len(ids)==len(set(ids)) and catalog['entry'] in ids
    assert catalog['version']=='0.7'
    links={}
    for s in scenes:
        assert s['version']==catalog['version']
        ns={n['id']:n for n in s['nodes']}
        assert len(ns)==len(s['nodes']) and s['entry'] in ns
        edges={}
        for n in ns.values():
            t=n['type']; targets=[]
            assert t in ('line','choice','activity_handoff','end')
            if t=='line':
                assert isinstance(n['text'],str) and n['text'] and len(n['text'])<=4096
                targets=[n['next']]
            elif t=='choice':
                opts=n['options']; keys=[o['id'] for o in opts]
                assert opts and len(keys)==len(set(keys))
                for o in opts:
                    assert o['predicate']=='always' and o['label']
                    for e in o['effects']:
                        assert e['op']=='remember_choice' and e['key']==n['id'] and e['value']==o['id']
                targets=[o['next'] for o in opts]
            elif t=='activity_handoff':
                assert n['adapter'] in ('identity','crossbar','training_arrangement','weekly_focus','practice','assignment','match','week_close')
                assert n['predicate'] in ('always','crossbar_accepted')
                required={'completed','declined','abandoned','interrupted'} if n['adapter'] in ('crossbar','practice','match') else {'completed'}
                assert set(n['outcomes'])==required
                targets=list(n['outcomes'].values())+[n['on_false']]
            else:
                assert n['next_scene'] is None or n['next_scene'] in ids
                links[s['id']]=n['next_scene']
            assert all(x in ns for x in targets)
            edges[n['id']]=targets
        seen=set(); active=set()
        def visit(x):
            assert x not in active, 'cycle'
            if x in seen:return
            active.add(x)
            for y in edges[x]:visit(y)
            active.remove(x);seen.add(x)
        visit(s['entry']);assert seen==set(ns), 'unreachable node'
        assert any(n['type']=='end' for n in ns.values())
    seen=set(); sid=catalog['entry']
    while sid is not None:
        assert sid not in seen,'scene cycle'
        seen.add(sid);sid=links[sid]
    assert seen==set(ids),'unreachable scene'
    return True

class Session:
    def __init__(self,path,career,occurrence,scene_id,mode='live'):
        if mode not in ('live','replay'):raise ValueError('mode')
        self.__mode=mode
        catalog=json.loads(CATALOG.read_text());validate(catalog)
        self.scene=next(s for s in catalog['scenes'] if s['id']==scene_id)
        self.nodes={n['id']:n for n in self.scene['nodes']}
        self.key=json.dumps([career,occurrence,scene_id,self.scene['version']])
        self.db=sqlite3.connect(path)
        if mode=='live':
            self.db.executescript('CREATE TABLE IF NOT EXISTS states(k TEXT PRIMARY KEY, value TEXT); CREATE TABLE IF NOT EXISTS effects(k TEXT PRIMARY KEY, value TEXT);')
            initial={'node':self.scene['entry'],'revision':0,'revealed':False,'decisions':{},'run':None,'trigger':None,'gestures':[]}
            self.db.execute('INSERT OR IGNORE INTO states VALUES (?,?)',(self.key,json.dumps(initial)));self.db.commit()
        row=self.db.execute('SELECT value FROM states WHERE k=?',(self.key,)).fetchone()
        if row is None:raise ValueError('no canonical occurrence')
        self.state=json.loads(row[0])
    def close(self):self.db.close()
    def act(self,action,revision,value=None,gesture=None,inject_failure=False):
        if self.__mode!='live':return False
        self.db.execute('BEGIN IMMEDIATE')
        try:
            st=json.loads(self.db.execute('SELECT value FROM states WHERE k=?',(self.key,)).fetchone()[0])
            if revision!=st['revision']:raise ValueError('stale revision')
            node=self.nodes[st['node']]; effect=None
            if action=='advance' and node['type']=='line':
                if not gesture or gesture in st['gestures']:raise ValueError('gesture')
                st['gestures'].append(gesture)
                if not st['revealed']:st['revealed']=True
                else:st.update(node=node['next'],revealed=False,trigger=gesture)
            elif action=='choose' and node['type']=='choice':
                if not gesture or gesture==st['trigger'] or gesture in st['gestures']:raise ValueError('gesture')
                opt=next((o for o in node['options'] if o['id']==value),None)
                if opt is None or opt['predicate']!='always':raise ValueError('invalid choice')
                st['gestures'].append(gesture);st['decisions'][node['id']]=value
                effect=(self.key+':'+node['id'],json.dumps(opt['effects']))
                st.update(node=opt['next'],revealed=False,trigger=gesture)
            elif action=='launch' and node['type']=='activity_handoff':
                # Only unconditional local handoffs in this reference. Conditional adapters
                # require canonical upstream evidence in the actual runtime.
                if node['predicate']!='always':raise ValueError('requires canonical evidence adapter')
                if st['run'] is not None:
                    self.db.rollback();self.state=st;return st['run']
                st['run']=str(uuid.uuid4())
                effect=(self.key+':'+node['id']+':launch',st['run'])
            else:raise ValueError('unsupported action')
            st['revision']+=1
            if effect:self.db.execute('INSERT INTO effects VALUES (?,?)',effect)
            if inject_failure:raise OSError('injected failure between effect and cursor writes')
            self.db.execute('UPDATE states SET value=? WHERE k=?',(json.dumps(st),self.key));self.db.commit();self.state=st
            return st['run'] if action=='launch' else True
        except (ValueError,OSError,sqlite3.IntegrityError):
            self.db.rollback();return False

def followup_route(original):
    return {'missed':('repair_proposed',True),'advance_cancelled':('acknowledged',False),'never_promised':('neutral',False)}[original]
