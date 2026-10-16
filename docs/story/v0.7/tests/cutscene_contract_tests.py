"""Adversarial reference tests; no claim of browser/iPhone execution."""
import json, tempfile, unittest
from copy import deepcopy
from pathlib import Path
from scene_reference import Session,validate,CATALOG,followup_route
class CutsceneTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=str(Path(self.tmp.name)/'save.db');self.opened=[]
    def tearDown(self):
        for s in self.opened:s.close()
        self.tmp.cleanup()
    def session(self,career='c',occ='w1',scene='W1_HOME_01',mode='live'):
        s=Session(self.path,career,occ,scene,mode);self.opened.append(s);return s
    def advance(self,s):
        for _ in range(2):self.assertTrue(s.act('advance',s.state['revision'],gesture=str(s.state['revision'])))
    def choose(self,s,value='friends'):
        return s.act('choose',s.state['revision'],value,gesture='choice'+str(s.state['revision']))
    def test_catalog(self):self.assertTrue(validate(json.loads(CATALOG.read_text())))
    def test_reveal_before_advance(self):
        s=self.session();s.act('advance',0,gesture='a');self.assertEqual(s.state['node'],'intro');self.assertTrue(s.state['revealed'])
    def test_invalid_choice(self):
        s=self.session();self.advance(s);before=deepcopy(s.state);self.assertFalse(self.choose(s,'arbitrary'));self.assertEqual(s.state,before)
    def test_same_gesture(self):
        s=self.session();self.advance(s);self.assertFalse(s.act('choose',2,'friends',gesture='1'))
    def test_duplicate_choice(self):
        s=self.session();self.advance(s);self.assertTrue(self.choose(s));self.assertFalse(self.choose(s))
    def test_multiple_choices(self):
        s=self.session();self.advance(s);self.choose(s);self.advance(s);self.assertTrue(self.choose(s,'learn_role'));self.assertEqual(len(s.state['decisions']),2)
    def test_replay_blocks_all_mutations(self):
        s=self.session();self.advance(s);r=self.session(mode='replay')
        for action in ['advance','choose','launch']:self.assertFalse(r.act(action,2,'friends','fresh'))
        self.assertEqual(self.session().state,s.state)
    def test_replay_launch_blocked_at_handoff(self):
        s=self.session(scene='W1_PRACTICE');self.advance(s);r=self.session(scene='W1_PRACTICE',mode='replay');self.assertFalse(r.act('launch',2))
    def test_failure_rolls_back_effect_and_cursor(self):
        s=self.session();self.advance(s);before=deepcopy(s.state)
        self.assertFalse(s.act('choose',2,'friends','fresh',inject_failure=True));self.assertEqual(self.session().state,before)
        self.assertEqual(s.db.execute('SELECT count(*) FROM effects').fetchone()[0],0);self.assertTrue(self.choose(s))
    def test_reopen_preserves_decisions(self):
        s=self.session();self.advance(s);self.choose(s);self.assertEqual(self.session().state,s.state)
    def test_two_connections_stale_revision(self):
        s=self.session();self.advance(s);other=self.session();self.choose(s);self.assertFalse(other.act('choose',2,'team','other'))
    def test_launch_stable_after_reopen(self):
        s=self.session(scene='W1_PRACTICE');self.advance(s);run=s.act('launch',2);r=self.session(scene='W1_PRACTICE');self.assertEqual(r.act('launch',3),run)
    def test_launch_unique_across_owners(self):
        runs=[]
        for career,occ,scene in [('c','w1','W1_PRACTICE'),('d','w1','W1_PRACTICE'),('c','w2','W1_PRACTICE'),('c','w1','W1_MATCH')]:
            s=self.session(career,occ,scene);self.advance(s);runs.append(s.act('launch',2))
        self.assertEqual(len(set(runs)),4)
    def test_conditional_launch_fails_without_evidence(self):
        s=self.session(scene='W1_CROSSBAR');self.advance(s);self.assertFalse(s.act('launch',2))
    def test_cancelled_has_no_repair_entitlement(self):self.assertEqual(followup_route('advance_cancelled'),('acknowledged',False))
    def test_missed_has_repair_path(self):self.assertEqual(followup_route('missed'),('repair_proposed',True))
    def test_catalog_rejects_missing_target(self):
        c=json.loads(CATALOG.read_text());c['scenes'][0]['nodes'][0]['next']='missing'
        with self.assertRaises(AssertionError):validate(c)
    def test_catalog_rejects_effect_injection(self):
        c=json.loads(CATALOG.read_text());c['scenes'][1]['nodes'][1]['options'][0]['effects'][0]['op']='award_skill'
        with self.assertRaises(AssertionError):validate(c)
    def test_catalog_rejects_unreachable(self):
        c=json.loads(CATALOG.read_text());c['scenes'][0]['nodes'].append({'id':'orphan','type':'end','next_scene':None})
        with self.assertRaises(AssertionError):validate(c)
    def test_catalog_rejects_duplicate_choice(self):
        c=json.loads(CATALOG.read_text());opts=c['scenes'][1]['nodes'][1]['options'];opts.append(deepcopy(opts[0]))
        with self.assertRaises(AssertionError):validate(c)
if __name__=='__main__':unittest.main(verbosity=2)
