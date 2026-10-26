"""Builds docs/training/library-v1.2/REVIEW_SHEET.md and SESSION_MAPPING.md from the committed v1.2 package.
Run: python3 scripts/training/review-sheet.py /path/to/sessions.json
Source notes are what Devin read in the originals fetched on 2026-10-26; verdicts are proposals for Coach Cody, not approvals."""
import json, re, sys
D = 'docs/training/library-v1.2'
pkg = json.load(open(D + '/scenarios.json'))
gen = json.load(open('src/game/training12/library/tacticalLibrary.generated.json'))
meta, cards = gen['meta'], gen['cards']
sessions = json.load(open(sys.argv[1]))
src = {s['id']: s for s in pkg['sources']}
v1ids = re.findall(r'^### (\w+) —', open('docs/training/library-v1/SoccerMaster_9v9_Tactical_Library_v1.md').read(), re.M)

FETCH = {  # SHA-256 of the bytes served on 2026-10-26 (HTTP 200 for all 15)
 'S1': '6e869bb6cd42fa427fb0b7f252834e4cabc12161b3145868f263028f57b892a4', 'S3': 'ea20cdf176a78e2becb92da26fdbb58e10373b88ca7691a978f7b11922ff7ac6',
 'S4': '93f5b4fe340e8166ef03dafa81b302db7412bb23be841e04f4c01f2af977ce1d', 'S5': 'fa8c2e6bb658269ab41dfc84832d062475e2cf1dff8f4296712287239434da0c',
 'S6': 'c66b2292d31bdc8d5cffc420af150a2186236a1703fd59b5b0e1835b19263e10', 'S7': 'ec4146c4443ed92af35493ea8edc76981273a7ccd16ee8f16d783ccd47949d27',
 'S8': '252c594ed61f6ab91a39b7d1a89ef2668fe1dd15b49dd0a2882367292a64141d', 'S9': '8f318c2887962998d941fdb53d1ef330475155e92b48c9030870c201656ad5d7',
 'S10': '8e855d655c079c02dc94ca73d1e62ca9faf5ec2c3f5fc1de61cad544aada0d6d', 'S11': 'eb99bbaed98cfc97883cc5de0e4bbdf3ee0ba868ad87ce33e5c5de08606d91d7',
 'S12': '9cd3173ae89facca88dfd34e840d811584e87fcf23f2f2df0ea9ef4e2c08c4d4', 'S13': '26a5332779e67167d7c1b349df07d716858e25f39f9f6983ebdc51af22ebb04f',
 'S14': '70e1801010e71301838b421e09c028302f376a9b022641709545fc53367ae588', 'S15': 'f12ed3085a36b8ab74a99c5dd73b8cc6a7193b091892ad67129d31e5ae67fd54',
 'S16': '7c109816133384dcb4197bb5be76dfc49c643fd5b407fcee04f7c44e93077692',
}
READ = {  # (what the cited section sets up, the guidance it gives) as read in the fetched original
 'S1': ('Exercise 1: 2v2 pressure and cover on a 30 x 20 m pitch with goals and goalkeepers; Exercises 2–3 build to 3v2 and 3v3.',
        'Press first as the defender closest to the ball, stopping the pass inside; “provide close cover as the second defender, denying through balls”; screen passing angles and protect the space behind the press.'),
 'S3': ('Defensive transition session (PDF, 7 pages); Parts 3–4 are reduced games that assume a back four.',
        'After a loss the closest player pressures, teammates recover to form a compact block and restrict space; decide quickly between press and cover.'),
 'S4': ('6v6 plus 2 team game with neutrals: initiating the press from a compact block.',
        'Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press.'),
 'S5': ('Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball.',
        'Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits.'),
 'S6': ('IFAB Law 11 (Offside), 11.1–11.3 and the contact footnote.',
        'Not an offence to be in an offside position; position judged when the ball is played or touched by a team-mate, using the first point of contact (last contact for a goalkeeper throw); level is not offside; offence needs involvement; no offence in own half.'),
 'S7': ('11v11 game analysis of the high press, “Team structure”.',
        'A solid shape from goalkeeper to forwards with suitable distances between units; triggers for when and how to press.'),
 'S8': ('Talent coach session “Progressing through the thirds”: reduced game with a neutral and artificial lines.',
        'Against a press that blocks passing lines, break lines by playing around; use gaps between lines; connect through players who drop or move into space.'),
 'S9': ('11v11 game-analysis article on third-player combinations.',
        'A third player unlocks an organised defence; the pass–layoff–run is hard to anticipate when the runner moves as the ball is laid off.'),
 'S10': ('Elite session (Gygax) attacking in wide areas: Part 3 is 10v1, Part 4 is 9v9 in an octagon with conditions.',
         'Advance from central possession to wide areas, create overloads on the wings, make coordinated runs into space and find targets.'),
 'S11': ('Talent coach session “Attacking the cross”: Part 3 is a 3v1 rondo and cross to finish; Part 4 is 6v6 plus 3.',
         'Well-timed runs and correctly weighted passes; deliveries into space behind the back line; central players time arrivals.'),
 'S12': ('Elite session (Boothroyd) breaking down a low block: Part 3 is 4v4 plus support players with crosses, cutbacks, whipped and clipped balls. Part 4 is 11v11 (excluded).',
         'Switch side to side to penetrate; get into wide areas and around the back of defenders; choose the delivery that suits the receiver and route.'),
 'S13': ('Unopposed passing circuit: receiving between the lines.',
         'Players drop to receive between the lines from various angles; centre-backs can disguise passes; body orientation and first touch.'),
 'S14': ('FIFA World Cup 2022 analysis, “Use of wide areas”, types of crosses.',
         'Six cross types including the cut-back; describes elite trends only.'),
 'S15': ('EPYSA page on U.S. Soccer player development initiatives, “9v9 Formations: U11 & U12”.',
         '1-3-2-3 and 1-3-3-2 let players connect through lines; players should know the roles in two connecting lines.'),
 'S16': ('U.S. Youth Soccer Player Development Initiatives (2017 PDF), pages 45 and 47: 9v9 standards of play.',
         'Field 70–80 x 45–55 yards; goals no larger than 7 x 21 ft; 9v9 = 8 field players + 1 goalkeeper; size 4 ball.'),
}
A, B = 'Ready to build a scene for review', 'Needs tactical authoring/review'
WEAK = {'law', '11v11_analysis_background', 'unopposed_circuit'}
SPECIFIC = {  # gaps Devin found in the cited source beyond the package's own correction line
 'LB01': 'S5 is a central circle/square keep-ball with outside supports; it has no touchline, no left-back and no 6. The trap and the inside/recycle ranking are authored.',
 'RB01': 'Same as LB01 on the right: S5 has no touchline trap.',
 'DM03': 'S3 covers losing the ball, not regaining it; S5 covers combining. When a forward turn after a regain is safe is not in either source.',
}
def verdict(c):
    tac = [s for s in c['source_ids'] if s not in ('S15', 'S16')]
    if c['id'] in SPECIFIC: return B, SPECIFIC[c['id']]
    if all(src[s]['origin'] in WEAK for s in tac):
        kinds = ', '.join(sorted({src[s]['origin'] for s in tac}))
        return B, f'Only {kinds} source(s): they explain the principle or the legal rule, but cannot establish which choice is better in an opposed youth scene.'
    return A, 'The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.'

n = {A: 0, B: 0}
rows = []
for c in cards:
    v, why = verdict(c); n[v] += 1
    sec = '<br>'.join(f"**{s}** ({src[s]['origin']}), {c['source_sections'][s]}: {READ[s][0]} {READ[s][1]} *Boundary:* {src[s]['limitations']}" for s in c['source_ids'])
    rows += [f"### {c['id']} — {c['title']} ({c['role']}, {c['phase']})\n",
             f"Card SHA-256 `{c['cardSha256']}` · `{c['release_status']}` · {'ID carried from v1' if c['id'] in v1ids else 'ID new in v1.1/v1.2'} · **proposal: {v}**\n",
             '| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |', '|---|---|',
             f"| {sec} | **Ball at freeze:** {c['ball_owner_at_freeze']} · **You:** {c['protagonist']}<br>**Must be visible:** {', '.join(c['required_visible_actor_ids'])}<br>**Cue:** {c['cue']}<br>**Coordination:** {c['coordination']} |",
             f"| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** {c['preferred_decision']}<br>**Valid alternative:** {c['acceptable_alternative']}<br>**Misconception:** {c['misconception']}<br>**Changes the answer:** {c['changed_cue_test']}<br>**Coach Code (success branch only):** {c['coach_feedback']} |",
             '', f"- **Adapted (package):** {c['adaptation_type']}. {c['correction']}", f"- **Devin's read:** {why}",
             '- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.', '']
out = ['# Audited Library v1.2: source-by-source review sheet\n',
       f"For Coach Cody's approval. **Nothing here is approved.** All 48 cards are `{meta['status']}` in `{meta['path']}` (v{meta['version']}, SHA-256 `{meta['sha256']}`), "
       f"from `{meta['uploadZip']}` (SHA-256 `{meta['uploadZipSha256']}`). Rules profile (pitch + rosters) SHA-256 `{meta['rulesSha256']}`. v1.2 supersedes v1.0; GK01–GK03 are retired.\n",
       'Each card needs your approval of (1) the card and (2) the numeric scene built from it. A card can only score once both are signed and the local rules are verified. The pitch profile is 75 x 50 **yards** and `local_rules_verified` is false in the package.\n',
       '## Sources resolved (15; S2 retired)\n', '| ID | Origin | Cited section | Found in fetched page | SHA-256 served | Supports | Boundary |', '|---|---|---|---|---|---|---|']
for s in pkg['sources']:
    out.append(f"| [{s['id']}]({s['url']}) | {s['origin']} | {s['section']} | yes | `{FETCH[s['id']]}` | {s['supports']} | {s['limitations']} |")
out += ['\n## Summary\n', f'- **{A}:** {n[A]} cards.', f'- **{B}:** {n[B]} cards (law/background/unopposed-only sources, or a setup the cited source does not contain).',
        '- **Approved:** 0. **Scored:** 0. **Retired:** GK01, GK02, GK03.\n', '## Cards\n'] + rows
open(D + '/REVIEW_SHEET.md', 'w').write('\n'.join(out))
m = ['# Team Training: 108 sessions to Audited Library v1.2\n',
     f"Library `{meta['path']}` v{meta['version']} (SHA-256 `{meta['sha256']}`). The package says the 108-session assignment “remains a separate curriculum task” and was not fabricated, "
     'so none is invented here: every session is held out of scored training. The earlier 40 ts-1 situations are review-only proposals (`?debug&ttProposals`) and never count.\n',
     '| Season/week/session | Theme | Tactical moments | Library file/version | Source location | Adaptations | Review status |', '|---|---|---|---|---|---|---|']
for s in sessions:
    m.append(f"| {s['id']} | {s['theme']} | none mapped ({len(s['roles'])} roles) | scenarios.json v{meta['version']} | — | — | Blocked: no approved assignment or scene |")
m.append(f"\n**Counts:** {len(sessions)} sessions × 9 roles = {len(sessions)*9} routes. Directly sourced and approved: 0. Approved adaptations: 0. Blocked pending review: {len(sessions)*9} (the {len(sessions)} GK routes are blocked outright: no goalkeeper decision sessions).\n")
open(D + '/SESSION_MAPPING.md', 'w').write('\n'.join(m))
print(n, len(sessions))
