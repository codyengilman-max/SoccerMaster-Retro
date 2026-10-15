"""Club design-data checks and reference models, not game integration tests."""
import json
from pathlib import Path
import unittest
DATA=json.loads((Path(__file__).resolve().parents[1]/'club_world.json').read_text())

def invitation_key(edition,age,club): return (edition,age,club,'standing')
def issue(records,edition,age,club,league_record=None):
    if not edition or age!='U12' or club!='next_horizon': return False
    key=invitation_key(edition,age,club)
    if key in records: return False
    records[key]={'state':'issued','registration':'pending','selection':'undecided'}
    return True

def table(teams): return [x['id'] for x in teams if x['leagueParticipation']=='entered']

class ClubContractTests(unittest.TestCase):
    def test_unique_six_clubs(self):
        self.assertEqual(len(DATA['clubs']),6);self.assertEqual(len({c['id'] for c in DATA['clubs']}),6)
    def test_next_horizon_not_in_table(self):
        self.assertNotIn('next_horizon',table(DATA['clubs']))
    def test_unconfigured_not_assumed_entered(self): self.assertEqual(table(DATA['clubs']),[])
    def test_two_named_events(self):
        self.assertEqual({e['displayName'] for e in DATA['events']},{'Pacific Wave Cup','Lone Star International Cup'})
    def test_u12_and_unknown_routes(self):
        for e in DATA['events']:
            self.assertEqual(e['playableFromAgeBand'],'U12');self.assertEqual(e['otherClubEntryPolicy'],'unconfigured');self.assertIsNone(e['dates'])
    def test_record_independent_invitation(self):
        for record in [None,{'wins':0,'losses':20},{'wins':20,'losses':0}]:
            r={};self.assertTrue(issue(r,'wave-1','U12','next_horizon',record))
    def test_no_u11_entry(self): self.assertFalse(issue({},'wave-1','U11','next_horizon'))
    def test_no_undefined_edition(self): self.assertFalse(issue({},None,'U12','next_horizon'))
    def test_duplicate_no_reset(self):
        r={};issue(r,'wave-1','U12','next_horizon');key=invitation_key('wave-1','U12','next_horizon');r[key]['state']='declined'
        self.assertFalse(issue(r,'wave-1','U12','next_horizon'));self.assertEqual(r[key]['state'],'declined')
    def test_invitation_not_selection(self):
        r={};issue(r,'wave-1','U12','next_horizon');self.assertEqual(next(iter(r.values()))['selection'],'undecided');self.assertEqual(next(iter(r.values()))['registration'],'pending')
    def test_editions_separate(self): self.assertNotEqual(invitation_key('wave-1','U12','next_horizon'),invitation_key('wave-2','U12','next_horizon'))
    def test_affiliations_are_proposals(self):
        self.assertIn('proposedAffiliations',DATA);self.assertNotIn('memberships',DATA)

if __name__=='__main__': unittest.main(verbosity=2)
