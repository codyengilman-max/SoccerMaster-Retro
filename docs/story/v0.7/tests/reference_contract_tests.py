"""Standalone contract models, NOT SoccerMaster implementation tests. No network or file writes."""
import unittest
from itertools import permutations

def ending(evaluations):
    for key,title in [('exploration','New Direction'),('starting','Place Earned'),('contribution','Trusted Option')]:
        if evaluations.get(key)=='eligible': return title
    if evaluations and all(v=='ineligible' for v in evaluations.values()): return 'Next Chance'
    return 'Limited Evidence'

def resolve_promise(state, callback):
    if callback=='complete' and state=='due': return 'kept'
    if callback=='cancel' and state in ('accepted','due','renegotiated'): return 'cancelled'
    if callback=='advance' and state=='due': return 'missed'
    return state

def score(contacts):
    later=[x for x in contacts if x!='initial_rest']
    return int(bool(later) and later[0]=='bar')

class Store:
    def __init__(self): self.revision=0; self.decisions={}; self.effects=0
    def commit(self,key,choice,expected,abort=False):
        if key in self.decisions: return 'replayed' if self.decisions[key]==choice else 'conflict'
        if expected!=self.revision: return 'conflict'
        if abort: return 'aborted'
        self.decisions[key]=choice; self.effects+=1; self.revision+=1; return 'committed'

class ContractTests(unittest.TestCase):
    def test_empty_evaluation_is_unknown(self): self.assertEqual(ending({}),'Limited Evidence')
    def test_unknown_not_ineligible(self): self.assertEqual(ending({'starting':'ineligible','contribution':'unknown'}),'Limited Evidence')
    def test_all_ineligible(self): self.assertEqual(ending({'starting':'ineligible'}),'Next Chance')
    def test_priority(self): self.assertEqual(ending({'starting':'eligible','exploration':'eligible'}),'New Direction')
    def test_repair_never_profits_at_any_trust(self):
        for trust in range(101):
            after=max(0,trust-3); loss=trust-after; repaired=after+min(2,loss)
            self.assertLessEqual(repaired,trust)
    def test_late_completion_cannot_resurrect(self):
        for state in ['cancelled','missed','closed','kept','accepted','renegotiated']:
            self.assertEqual(resolve_promise(state,'complete'),state)
    def test_cancel_completion_order(self):
        for order in permutations(['cancel','complete']):
            state='due'
            for op in order: state=resolve_promise(state,op)
            self.assertEqual(state,'cancelled' if order[0]=='cancel' else 'kept')
    def test_advance_completion_order(self):
        for order in permutations(['advance','complete']):
            state='due'
            for op in order: state=resolve_promise(state,op)
            self.assertEqual(state,'missed' if order[0]=='advance' else 'kept')
    def test_duplicate_returns_prior_result(self):
        s=Store(); self.assertEqual(s.commit(('career','slot','step'),'A',0),'committed')
        self.assertEqual(s.commit(('career','slot','step'),'A',0),'replayed'); self.assertEqual(s.effects,1)
    def test_conflicting_choices(self):
        for choices in permutations(['A','B']):
            s=Store(); s.commit('step',choices[0],0)
            self.assertEqual(s.commit('step',choices[1],0),'conflict'); self.assertEqual(s.effects,1)
    def test_aborted_transaction_has_no_effect(self):
        s=Store(); s.commit('step','A',0,abort=True)
        self.assertEqual((s.effects,s.revision,s.decisions),(0,0,{}))
    def test_stale_revision_rejected(self):
        s=Store(); s.commit('one','A',0); self.assertEqual(s.commit('two','B',0),'conflict')
    def test_first_contact_crossbar(self):
        for contact in ['ground','post','net','wall','player','ground_bar_simultaneous']:
            self.assertEqual(score(['initial_rest',contact,'bar']),0)
        self.assertEqual(score(['initial_rest','bar','bar']),1)
    def test_structured_keys_do_not_alias(self):
        self.assertNotEqual(('a/b','c'),('a','b/c'))
    def test_producer_namespaces(self):
        self.assertNotEqual(('career','match','1'),('career','practice','1'))
    def test_school_budget_reservation(self):
        ledger=set()
        def reserve(week):
            if week in ledger: return 'neutral'
            ledger.add(week); return 'adverse'
        self.assertEqual([reserve(1),reserve(1),reserve(2)],['adverse','neutral','adverse'])

if __name__=='__main__': unittest.main(verbosity=2)
