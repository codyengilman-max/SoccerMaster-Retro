"""Builds docs/training/library-v1/REVIEW_SHEET.md and SESSION_MAPPING.md from the generated library import.
Source summaries are what Devin read in the fetched originals; the verdicts are proposals for Coach Cody, not approvals."""
import json, re, sys
GEN = 'src/game/training12/library/tacticalLibraryV1.generated.ts'
t = open(GEN).read()
meta = json.loads(re.search(r'LIBRARY_V1: LibraryMeta = (\{.*?\});', t, re.S).group(1))
srcs = json.loads(re.search(r'LIBRARY_V1_SOURCES: readonly LibrarySourceRef\[\] = (\[.*?\]);', t, re.S).group(1))
briefs = json.loads(re.search(r'LIBRARY_V1_BRIEFS: readonly LibraryBrief\[\] = (\[.*\]);', t, re.S).group(1))
sessions = json.load(open(sys.argv[1]))

FETCH = {  # fetched 2026-10-26, SHA-256 of the bytes served
 'S1': ('HTML', '40e03884113810af8a1ed63f6906b56a86fe6cb5f8d1c62ca30555f4e2da4303'),
 'S2': ('PDF, 5 pages', '67244f62609e12cebc56bd7eb2d133e814b6b8512ebb1c1d88430ee1bf6d8dd8'),
 'S3': ('PDF, 7 pages', 'ea20cdf176a78e2becb92da26fdbb58e10373b88ca7691a978f7b11922ff7ac6'),
 'S4': ('HTML', 'da57ff5ef765db88e91e354f2c50e60dfd43e24a481e6a2ecbcb4c18e73723ab'),
 'S5': ('HTML', '762057da371a7d463003bb5dada470875716d4410dc2dd328f9ac594ec2a46cf'),
 'S6': ('HTML', 'c66b2292d31bdc8d5cffc420af150a2186236a1703fd59b5b0e1835b19263e10'),
 'S7': ('HTML', '5ff546ffb3f6a4437d5809ad4c385b17e4012c1c1eedb0159cb8170ee97713e7'),
}
SETUP = {
 'S1': ('Small-group defending: 2v2, 2v3 and 3v3 on two goals with goalkeepers.',
        '“The closest defender to the ball applies pressure and angles their body shape to show the attacker to the outside.” “The second defender provides support behind and inside to help prevent split passes and give-and-go combinations.” Defenders must recognise “when and who must press, provide cover or balance”.'),
 'S2': ('Build-up session with goalkeeper and back players, including a 2+1v2+1 exercise; extra players join to support build-up.',
        'Players “keep a good distance away from the opposition and open up safe passing angles”, focus on “space, the passing angles … the timing of their movement and staying away from pressure”, to “provide a safe option for their team-mates”. Passes to bypass pressure “should be firm, accurate and quick”.'),
 'S3': ('Defensive-transition session: “realistic 1v2 scenarios” in lanes with recovery from the front, side and behind, building to a compact block.',
        'After losing the ball the closest player pressures while teammates recover; the aim is “to form a compact block and restrict space for the opponents”, deciding quickly between press and cover.'),
 'S4': ('Team pressing from a compact block (unit and team exercises).',
        '“The members of the team have to remain compact by constantly adjusting their positioning and shifting towards the ball.” Players “signal and communicate … who initiates the press and which players provide cover”; “identify pressing triggers as a team and act together”; “When the attacking unit initiates the press, the midfield unit must close the space behind”.'),
 'S5': ('Receiving and combining: a 1v1 “where the player in possession can make use of five supporting players”, 1v2 support exercises, ending in a free-flowing 6v6 with goalkeepers.',
        'Find space away from defenders, open body to receive, combine with support, turn only when the situation allows.'),
 'S6': ('IFAB Law 11 (Offside). A law, not a coaching session.',
        '“It is not an offence to be in an offside position.” Position “is determined at the moment the ball is played or touched by a team-mate”; an offence needs involvement (interfering with play or an opponent, or gaining an advantage); no offence in the player’s own half or directly from a goal kick, throw-in or corner.'),
 'S7': ('High press: team organisation with suitable distances between units.',
        '“The team have to stay compact so as not to allow the opposition to break the lines with forward passes into pockets of space.” “It helps to have triggers for when and how to press”; “every player knows the trigger points”. Pressing angle limits the next pass.'),
}
# Devin's comparison: (directly supported, adapted for the 9v9 game, gaps, proposal)
A, B = 'Ready to build a scene for review', 'Needs tactical authoring/review'
NOTE = {
 'GK01': ('Choosing the safe passing angle away from pressure (S2).', 'Specific actors (striker on CB, free RB) and the 9v9 build-up shape.', 'What makes a lane “clear” or space “usable”: distance, opponent speed and pass length are not set.', A),
 'GK02': ('Moving to stay a playable, safe option away from pressure (S2).', 'LB under pressure with the GK hidden behind the presser’s line.', 'When moving would “obstruct another safe route” is not defined.', A),
 'GK03': ('Closest player pressures, others recover and protect the centre after a loss (S3).', 'S3 is an outfield transition session; the goalkeeper’s recovery position and decision to come out are not in it.', 'No source defines a goalkeeper’s goal-protecting position or when intervention is “clearly reachable”. The library also lists goalkeeper animation as OPEN.', B),
 'CB01': ('Second defender covers behind and inside the first defender (S1, directly).', 'LB/CB/RB/6 roles in a back three; the inside runner.', 'Cover distance and when responsibility “transfers” are not set.', A),
 'CB02': ('Units stay connected and the next unit closes space behind a press (S4, S7).', 'Extended from the midfield unit (S4) to the back line stepping up.', 'What counts as “detached”, and how far the line steps, is not set. The sources describe the midfield closing behind, not explicitly the back line.', A),
 'CB03': ('After a loss, recover, delay and protect the dangerous space until support arrives (S3).', 'An 8 losing the ball; CB facing carrier plus a separate runner.', 'When a pass is “clearly exposed” enough to intercept is not set.', A),
 'LB01': ('Combining with an available support player instead of dribbling into pressure (S5).', 'The touchline trap: S5 is a central 1v1/1v2 support exercise, not a touchline situation. Touchline as a pressing trap comes from S4 (the defending side).', 'S5 does not establish the left-back’s position, the 6’s angle or when CB is the better recycle. The combination of two sources creates a new setup.', B),
 'LB02': ('Pressing triggers include back to goal and near the touchline; press only with cover (S4).', 'LB/CB/LW roles and the receiving winger.', 'When CB counts as “occupied” is not set.', A),
 'LB03': ('Recover into a compact shape that protects the centre (S3).', 'Ranking a central runner above a distant wide player.', 'Relative danger (distance, speed, goal-side) is not quantified.', A),
 'DM01': ('Move into space away from defenders to be available; scan before receiving (S5).', 'CB-to-6 build-up angle behind a screening opponent.', 'How far the lateral move must be, and when clearing the lane for 8 is better, are not set.', A),
 'DM02': ('Second defender covers rather than doubling the first press (S1, directly).', 'Screening the pass into the striker.', 'When 8 is “beaten” and cover transfers is not set.', A),
 'DM03': ('Combining with support under pressure (S5); quick reaction after a turnover (S3).', 'S3 is about losing the ball, not regaining it; securing possession after a regain is an inference.', 'No source sets when a forward turn after a regain is safe. Answer depends on unstated pressure distance.', B),
 'CM01': ('Turn only when the situation allows; otherwise combine with support (S5, directly).', 'Receiving between opponents with the 9 and 6 as supports.', 'How tight is “tight pressure” is not set.', A),
 'CM02': ('Pressing angle and the next unit closing the exit pass (S4, S7).', 'Opposing 6 as the inside escape; own 9 on the CB.', 'Distances that make the lane “closed” are not set.', A),
 'CM03': ('Supporting players offer different angles (S5).', 'RW on the ball; 9 already in the forward lane.', 'When running beyond is better than the backward-diagonal angle is not set.', A),
 'LW01': ('A second defender changes the 1v1 decision; combine with support (S5 1v2, directly).', 'Left-wing location and LB as the support.', 'When the second defender is “too far to cover” is not set.', A),
 'LW02': ('Coordinated press, covering the free player/outlet (S4).', 'Winger closing the opposing RB while 9 presses.', 'When the press is “broken” is not set.', A),
 'LW03': ('Offside legality at the moment of the pass and involvement (S6, Law).', 'The tactical choice itself (delay, curve, check short). S6 governs legality only, not which run is better.', 'No tactical source supports ranking a curved run over checking short. Only the legal/illegal part is sourced.', B),
 'ST01': ('Turn only when the defender’s position and space allow; otherwise protect and combine (S5).', 'Back-to-goal 9 with the 8 as support.', 'Distance at which turning becomes valid is not set.', A),
 'ST02': ('Press on a team trigger, only when teammates can close the exits (S4, S7).', '9 as the first presser with winger and 8.', 'What counts as “detached” midfield is not set.', A),
 'ST03': ('Position judged when the teammate plays the ball; stepping back after release does not change it; no offence from own half (S6).', 'The tactical choice of a different run. Law 11 governs legality, not which run is better.', 'Legal rulings are sourced; the preference between “return onside” and “offer a different run” is not.', B),
}
for m in ('RB01', 'RB02', 'RB03', 'RW01', 'RW02', 'RW03'):
    o = 'LB' + m[2:] if m.startswith('RB') else 'LW' + m[2:]
    a, b, c, d = NOTE[o]
    NOTE[m] = (a, b + ' Mirrored right-side version of ' + o + '.', c, d)
assert set(NOTE) == {b['id'] for b in briefs}

out = [f"# Tactical Library v1: source-by-source review sheet\n",
       f"For Coach Cody's approval. **Nothing on this sheet is approved.** Every brief is `{meta['status']}` in `{meta['file']}` "
       f"(v{meta['version']}, SHA-256 `{meta['sha256']}`, uploaded as `{meta['uploadZip']}`, SHA-256 `{meta['uploadZipSha256']}`).\n",
       "Each brief needs two approvals before it can be scored: (1) the brief as written, then (2) the executable scene built from it "
       "(positions, players, field area, options and grades). No scene is built yet, so no Team Training session is scored.\n",
       "The \"Devin's comparison\" columns are my reading of the fetched originals. They are proposals for your review, not approvals.\n",
       "## Sources resolved\n", "| ID | Citation | Fetched | SHA-256 of served file | What the source sets up | Coaching guidance |", "|---|---|---|---|---|---|"]
for s in srcs:
    kind, h = FETCH[s['id']]
    st, gd = SETUP[s['id']]
    out.append(f"| {s['id']} | [{s['citation']}]({s['url']}) | {kind}, HTTP 200 | `{h}` | {st} | {gd} |")
cnt = {A: 0, B: 0}
out += ["\n## Summary\n"]
for b in briefs: cnt[NOTE[b['id']][3]] += 1
out += [f"- **{A}:** {cnt[A]} briefs. The principle is in the cited source; the scene still needs authoring and your sign-off.",
        f"- **{B}:** {cnt[B]} briefs. The cited source does not establish the answer; I flagged the gap instead of filling it.",
        "- **Approved:** 0. **Scored:** 0 of 108 sessions.\n",
        "Common to every brief: the sources are small-sided or unit exercises (or a Law). Placing them in a 9v9 1-3-2-3 game with named roles is an adaptation. "
        "No source gives coordinates, distances, speeds or thresholds, so words like “clear”, “tight” or “usable” must be fixed in the scene and reviewed.\n",
        "## Briefs\n"]
for b in briefs:
    sup, ad, gap, verdict = NOTE[b['id']]
    out += [f"### {b['id']} — {b['title']} ({', '.join(b['sourceIds'])})\n",
            f"Brief SHA-256 `{b['briefSha256']}` · status `{meta['status']}` · **proposal: {verdict}**\n",
            "| Source setup and guidance | Proposed game situation (library text, verbatim) |", "|---|---|",
            "| " + "<br>".join(f"**{i}:** {SETUP[i][0]}" for i in b['sourceIds']) + f" | **Setup:** {b['setup']} |",
            "| " + "<br>".join(f"**{i}:** {SETUP[i][1]}" for i in b['sourceIds']) + f" | **Preferred decision:** {b['preferredCondition']}<br>**Valid alternative:** {b['acceptableAlternative']}<br>**Misconception:** {b['misconception']}<br>**Team response:** {b['teamResponse']}<br>**Coach Code:** {b['coachFeedback']}<br>**Changes the answer:** {b['counterfactualTest']} |",
            "", f"- **Directly supported:** {sup}", f"- **Adapted:** {ad}", f"- **Gap:** {gap}", ""]
open('docs/training/library-v1/REVIEW_SHEET.md', 'w').write('\n'.join(out))

m = ["# Team Training: 108 sessions to Tactical Library v1\n",
     f"Library `{meta['file']}` v{meta['version']} (SHA-256 `{meta['sha256']}`). The library says it is \"not a complete 108-session mapping\", "
     "and no session-to-brief mapping has been approved, so every session below is held out of scored training. "
     "The earlier 40 ts-1 situations are review-only proposals (`?debug&ttProposals`) and never count.\n",
     "| Season/week/session | Theme | Tactical moments | Library file/version | Source location | Adaptations | Review status |", "|---|---|---|---|---|---|---|"]
for s in sessions:
    m.append(f"| {s['id']} | {s['theme']} | none mapped ({len(s['roles'])} roles) | {meta['file']} v{meta['version']} | — | — | Blocked: no approved mapping or scene |")
m += [f"\n**Counts:** {len(sessions)} sessions × 9 roles = {len(sessions)*9} routes. Directly sourced and approved: 0. Approved adaptations: 0. Blocked pending review: {len(sessions)*9}.\n"]
open('docs/training/library-v1/SESSION_MAPPING.md', 'w').write('\n'.join(m))
print(cnt, len(sessions))
