#!/usr/bin/env python3
"""Offline structural lint for draft content. NOT soccer physics or runtime tests."""
import copy
import json
import math
import sys
from collections import Counter
from pathlib import Path

ROLES = ['GK', 'LB', 'CB', 'RB', 'DM', 'CM', 'LW', 'RW', 'ST']
OUTFIELD = set(ROLES) - {'GK'}
EXPECTED = {f'{r}{n:02d}' for r in OUTFIELD for n in range(1, 7)}
STATUS = 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING'

def validate(d):
    errors = []
    def need(ok, message):
        if not ok:
            errors.append(message)
    need(d.get('version') == '1.2', 'version')
    need(d.get('kind') == 'content_spec_not_executable_scenes', 'content kind')
    rosters = d.get('rosters', {})
    need(set(rosters) == {'H', 'A'}, 'two teams only')
    actor_ids = set()
    for team in ['H', 'A']:
        actors = rosters.get(team, [])
        need(len(actors) == 9, f'{team}: exactly nine roster actors')
        need(Counter(a.get('role') for a in actors) == Counter(ROLES), f'{team}: eight outfield plus GK')
        for a in actors:
            aid = a.get('id')
            need(aid == team + '_' + str(a.get('role')), 'canonical actor identity')
            need(a.get('team') == team, 'team assignment')
            need(aid not in actor_ids, 'duplicate actor')
            actor_ids.add(aid)
    sources = d.get('sources', [])
    sids = [s.get('id') for s in sources]
    need(len(sids) == len(set(sids)) == 15, 'unique source register')
    for s in sources:
        for f in ['id', 'url', 'origin', 'section', 'supports', 'limitations', 'accessed']:
            need(bool(s.get(f)), 'missing source field: ' + f)
        need(s.get('url', '').startswith('https://'), 'source URL scheme')
    cards = d.get('scenarios', [])
    ids = [c.get('id') for c in cards]
    need(len(ids) == 48 and set(ids) == EXPECTED, '48 exact unique outfield IDs')
    need(Counter(c.get('role') for c in cards) == Counter({r: 6 for r in OUTFIELD}), 'six cards per role')
    need(set(d.get('retired_ids', [])) == {'GK01', 'GK02', 'GK03'}, 'GK migration list')
    for c in cards:
        cid = c.get('id', '?')
        need(c.get('role') in OUTFIELD, cid + ': no GK decision')
        need(c.get('protagonist') == 'H_' + str(c.get('role')), cid + ': protagonist slot')
        for f in ['home_formation', 'opponent_formation']:
            need(c.get(f) == '1-3-2-3', cid + ': supported formation')
        visible = c.get('required_visible_actor_ids', [])
        need(len(visible) == len(set(visible)), cid + ': duplicate visible actor')
        need(set(visible) <= actor_ids, cid + ': unknown or neutral actor')
        need(c.get('protagonist') in visible, cid + ': missing protagonist')
        need(c.get('ball_owner_at_freeze') in visible, cid + ': missing ball owner')
        refs = c.get('source_ids', [])
        need(bool(refs) and set(refs) <= set(sids), cid + ': source resolution')
        need(set(c.get('format_source_ids', [])) == {'S15', 'S16'}, cid + ': 9v9 framework')
        need(set(c.get('source_sections', {})) == set(refs), cid + ': exact source section mapping')
        for f in ['cue', 'preferred_decision', 'acceptable_alternative', 'misconception', 'coach_feedback', 'changed_cue_test', 'coordination', 'correction']:
            need(isinstance(c.get(f), str) and bool(c.get(f)), cid + ': missing ' + f)
        need(c.get('release_status') == STATUS, cid + ': premature release')
        review = c.get('review', {})
        need(review.get('independent_coach_approval') is None, cid + ': invented approval')
        need(review.get('geometry_validated') is False and review.get('runtime_tested') is False, cid + ': unsupported validation claim')
        need(review.get('source_exact') is False, cid + ': unsupported source exactness')
        need(c.get('numeric_scene') is None, cid + ': new geometry requires separate validation')
        need(len(c.get('required_tests', [])) >= 6, cid + ': incomplete test specification')
    p = d.get('pitch_proposal', {})
    need(math.isclose(p.get('length_m', 0), p.get('length_yards', 0) * .9144), 'length conversion')
    need(math.isclose(p.get('width_m', 0), p.get('width_yards', 0) * .9144), 'width conversion')
    need(p.get('local_rules_verified') is False, 'unverified local rules cannot be approved')
    return errors

def self_test(d):
    cases = [
        ('tenth player', lambda x: x['rosters']['H'].append({'id':'H_EXTRA','role':'CB','team':'H'})),
        ('duplicate roster identity', lambda x: x['rosters']['H'][1].update(id='H_GK')),
        ('second centre-back', lambda x: x['rosters']['H'][1].update(role='CB')),
        ('GK protagonist', lambda x: x['scenarios'][0].update(role='GK', protagonist='H_GK')),
        ('neutral actor', lambda x: x['scenarios'][0]['required_visible_actor_ids'].append('NEUTRAL_1')),
        ('duplicate card', lambda x: x['scenarios'].append(copy.deepcopy(x['scenarios'][0]))),
        ('missing card', lambda x: x['scenarios'].pop()),
        ('11v11 formation', lambda x: x['scenarios'][0].update(home_formation='1-4-3-3')),
        ('unknown source', lambda x: x['scenarios'][0]['source_ids'].append('S99')),
        ('missing source section', lambda x: x['scenarios'][0].update(source_sections={})),
        ('duplicate source', lambda x: x['sources'].append(copy.deepcopy(x['sources'][0]))),
        ('missing ball actor', lambda x: x['scenarios'][0].update(ball_owner_at_freeze='A_EXTRA')),
        ('invented approval', lambda x: x['scenarios'][0]['review'].update(independent_coach_approval='AI approved')),
        ('premature production', lambda x: x['scenarios'][0].update(release_status='APPROVED')),
        ('pretend runtime test', lambda x: x['scenarios'][0]['review'].update(runtime_tested=True)),
        ('metres/yards confusion', lambda x: x['pitch_proposal'].update(length_m=75)),
        ('missing alternative', lambda x: x['scenarios'][0].update(acceptable_alternative='')),
        ('false source exactness', lambda x: x['scenarios'][0]['review'].update(source_exact=True)),
        ('extra team', lambda x: x['rosters'].update(N=[])),
        ('invented local rules approval', lambda x: x['pitch_proposal'].update(local_rules_verified=True)),
    ]
    for name, mutate in cases:
        broken = copy.deepcopy(d)
        mutate(broken)
        if not validate(broken):
            raise AssertionError('Mutation escaped: ' + name)
    print(f'PASS: {len(cases)} intentionally invalid package mutations rejected')

if __name__ == '__main__':
    path = Path(__file__).with_name('scenarios.json')
    data = json.loads(path.read_text(encoding='utf-8'))
    failures = validate(data)
    if failures:
        print('\n'.join(failures))
        sys.exit(1)
    print('PASS: 48 cards / 8 outfield roles / 15 sources / 18 unique roster actors')
    self_test(data)
    print('NOT TESTED: soccer geometry, answer correctness in animation, production game security')
