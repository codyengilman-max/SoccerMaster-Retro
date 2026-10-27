"""Author-resolved review scenes, not a general tactical scene generator."""
import json, copy, shutil, html, math, hashlib, zipfile, textwrap
from pathlib import Path
from functools import lru_cache
from PIL import Image
R=Path(__file__).resolve().parent
O=R/'complete_training_review'; O.mkdir(exist_ok=True)
AS=R/'assets_review/SoccerMaster_Team_Training_Devin'
families=json.loads((R/'v2/session_families.json').read_text())
sources=json.loads((R/'v2/sources.json').read_text())
roles=['LB','CB','RB','DM','CM','LW','RW','ST']
# Reference layouts are explicitly authored match fragments. No source coordinates claimed.
build={'H_GK':[23,3],'H_CB':[23,13],'H_LB':[6,20],'H_RB':[39,17],'H_DM':[17,29],'H_CM':[31,31],'A_ST':[23,22],'A_RW':[10,25],'A_LW':[34,26]}
attack={'H_CM':[23,40],'H_DM':[23,33],'H_LW':[7,46],'H_RW':[39,47],'H_ST':[24,51],'A_GK':[23,66],'A_CB':[24,57],'A_LB':[34,53],'A_RB':[11,52],'A_DM':[20,46]}
finish={'H_CM':[25,48],'H_DM':[23,37],'H_LW':[9,52],'H_RW':[37,55],'H_ST':[25,56],'A_GK':[23,67],'A_CB':[24,60],'A_LB':[33,58],'A_RB':[13,58],'A_DM':[21,44]}
press={'H_ST':[23,48],'H_LW':[11,46],'H_RW':[35,45],'H_CM':[23,39],'H_DM':[27,34],'A_GK':[23,66],'A_CB':[23,54],'A_LB':[8,54],'A_RB':[38,54],'A_DM':[25,44]}
defend={'H_GK':[23,3],'H_LB':[9,21],'H_CB':[21,16],'H_RB':[34,20],'H_DM':[23,27],'H_CM':[31,31],'A_RW':[9,26],'A_LW':[37,27],'A_ST':[23,22],'A_CM':[26,34]}
wide={'H_GK':[23,3],'H_LB':[10,16],'H_CB':[22,13],'H_RB':[35,17],'H_DM':[26,23],'A_LW':[39,20],'A_ST':[23,17],'A_CM':[29,27],'A_RW':[11,20]}
records=[]
def add(n,base,owner,over,actionA,actionB,change,changed_cue,grades=('preferred','acceptable','misread','acceptable'),changed_grades=('acceptable','preferred','misread','acceptable')):
 f=families[(n-1)//3];d=f['decisions'][(n-1)%3]
 positions=copy.deepcopy(base);positions.update(over)
 records.append({'id':d['id'],'family_id':f['id'],'title':f['title']+' — '+d['role'],'role':d['role'],'source_ids':[f['source_id']], 'positions':positions,'owner':owner,'A':actionA,'B':actionB,'change':change,'changed_cue':changed_cue,'grades':grades,'changed_grades':changed_grades,'brief':d})
# Action = (label, actor endpoint map, ball receiver or None). None keeps the current ball owner.
add(1,build,'H_CB',{'A_ST':[23,17]},('Pass to LB',{},'H_LB'),('Carry into central space',{'H_CB':[23,18]},None),{'A_ST':[14,17]},'The presser shifts across the LB passing lane; central carrying space opens.')
add(2,build,'H_CB',{'H_LB':[7,22],'A_RW':[15,18]},('Widen outside the shadow',{'H_LB':[4,19]},None),('Offer a short diagonal',{'H_LB':[13,13]},None),{'A_ST':[23,16]},'Pressure reaches CB; a nearer support angle is more urgent than maximum width.')
add(3,build,'H_LB',{},('Offer a forward diagonal',{'H_DM':[13,29]},None),('Support underneath',{'H_DM':[13,16]},None),{'A_RW':[7,22]},'The receiver is now pressed tightly; offer a secure route beneath the ball.')
add(4,build,'H_LB',{},('Reset through GK',{},'H_GK'),('Carry up the open side',{'H_LB':[6,25]},None),{'A_RW':[17,26]},'The wide presser has moved inside; the carrying route has opened.')
add(5,build,'H_LB',{},('Keep switch width',{'H_RB':[40,20]},None),('Narrow for transition cover',{'H_RB':[31,17]},None),{'A_RW':[7,21],'A_ST':[19,17]},'LB is trapped and the central outlet is threatened; prepare for a possible turnover.')
add(6,build,'H_LB',{'A_RW':[7,23]},('Show a short support angle',{'H_DM':[13,19]},None),('Offer higher support',{'H_DM':[14,28]},None),{'A_RW':[15,28]},'LB can advance in space; avoid bringing your marker into that route.')
add(7,attack,'H_LW',{'A_RB':[9,52],'A_DM':[25,46]},('Carry to engage the defender',{'H_LW':[7,49]},None),('Release inside to CM',{},'H_CM'),{'A_RB':[7,48]},'The defender closes the carrier; the inside support pass is still available.')
add(8,attack,'H_CM',{'A_DM':[13,44],'A_RB':[9,49],'H_CM':[20,39],'H_RW':[39,42]},('Switch to RW',{},'H_RW'),('Combine with LW',{},'H_LW'),{'A_LB':[31,41],'A_RB':[15,53],'A_DM':[17,48]},'The direct switch is screened, while the left-side combination has opened.')
add(9,attack,'H_CM',{'H_CM':[32,45],'H_RW':[35,48]},('Separate toward the touchline',{'H_RW':[41,49]},None),('Time an inside diagonal',{'H_RW':[30,52]},None),{'H_CM':[39,45],'A_LB':[40,54]},'The carrier stays wide and the defender follows; an inside lane is now available.')
add(10,attack,'H_CM',{'A_DM':[15,44],'H_RW':[39,42]},('Switch to RW',{},'H_RW'),('Recycle through DM',{},'H_DM'),{'A_LB':[31,41]},'The far-side passing route is now occupied; retain and reorganize instead.')
add(11,attack,'H_RW',{'A_LB':[29,54]},('Advance into the right channel',{'H_RW':[39,52]},None),('Combine underneath with CM',{},'H_CM'),{'A_LB':[39,50]},'The defender has arrived in front of you; CM remains available underneath.')
add(12,attack,'H_RW',{'A_RB':[14,53],'A_CB':[25,57]},('Time a diagonal toward goal',{'H_LW':[15,52]},None),('Hold useful width',{'H_LW':[6,47]},None),{'A_RB':[11,49]},'The diagonal is covered; maintain another passing lane instead of running into the marker.')
add(13,finish,'H_CM',{'H_CM':[20,48],'H_ST':[29,53],'A_CB':[21,53]},('Separate into the forward lane',{'H_ST':[31,56]},None),('Check short for support',{'H_ST':[28,49]},None),{'A_LB':[30,55],'A_DM':[22,49]},'A recovering defender closes the forward lane; the carrier needs a shorter option.')
add(14,finish,'H_CM',{'H_CM':[20,48],'H_ST':[31,53],'A_CB':[28,53],'A_LB':[38,59]},('Carry through the open channel',{'H_CM':[20,53]},None),('Release to ST',{},'H_ST'),{'A_CB':[20,51]},'The defender commits to the carrier; the striker is now free to receive.')
add(15,finish,'H_RW',{'H_ST':[29,59],'H_LW':[13,54],'A_RB':[10,59]},('Offer a separate far-side lane',{'H_LW':[17,59]},None),('Hold for the rebound',{'H_LW':[13,54]},None),{'H_LW':[28,58],'H_ST':[18,60]},'Your proposed run now crosses the shooting lane; do not obstruct the carrier.')
add(16,finish,'H_RW',{'A_LB':[32,58],'H_ST':[24,55],'A_CB':[19,61]},('Pass inside to ST',{},'H_ST'),('Shoot through the open lane',{},'SHOT'),{'A_LB':[40,60],'A_CB':[18,62]},'The blocker has moved away; the shot route is available, although the pass remains valid.')
add(17,finish,'H_RW',{'H_ST':[24,54],'H_LW':[12,55]},('Time a near-side run',{'H_ST':[28,59]},None),('Take the vacant central lane',{'H_ST':[23,58]},None),{'H_LW':[28,58]},'A teammate occupies the near-side lane; select a different arrival lane.')
add(18,finish,'H_RW',{'H_ST':[28,59],'H_LW':[17,59]},('Support the cutback',{'H_CM':[26,52]},None),('Hold transition cover',{'H_CM':[25,43]},None),{'H_DM':[19,53],'A_DM':[23,39]},'The holding midfielder has advanced; an opponent is available behind the attack.')
add(19,press,'A_CB',{'H_ST':[23,51],'A_CB':[23,55]},('Contest the exposed ball',{'H_ST':[23,52]},'WIN'),('Contain the central route',{'H_ST':[24,50]},None),{'A_CB':[23,53]},'The opponent has secured the touch before you arrive; the loose-ball cue has expired.')
add(20,press,'A_CB',{'H_ST':[23,51],'A_DM':[24,45]},('Screen the inside receiver',{'H_CM':[24,43]},None),('Take over pressure',{'H_CM':[23,46]},None),{'A_CB':[23,48],'H_ST':[27,53]},'The carrier has escaped the striker toward you; take pressure while ST recovers.')
add(21,press,'A_DM',{'A_DM':[25,38],'H_DM':[27,34],'H_CM':[24,44]},('Recover goal-side',{'H_DM':[25,32]},None),('Contest with cover',{'H_DM':[26,36]},'WIN'),{'A_DM':[25,39],'H_CM':[24,32]},'The ball is loose within reach and CM is now covering behind you.')
add(22,press,'A_LB',{'A_LB':[8,54],'H_LW':[11,49],'H_CM':[17,44]},('Approach from the inside',{'H_LW':[10,52]},None),('Hold a connected position',{'H_LW':[13,47]},None),{'H_CM':[29,35],'A_DM':[14,46]},'Your inside support is detached; do not launch an isolated chase.')
add(23,press,'A_LB',{'A_DM':[26,44],'H_RW':[38,44]},('Tuck toward the central outlet',{'H_RW':[29,44]},None),('Shift outward with the switch',{'H_RW':[36,48]},None),{'A_RB':[38,51]},'The ball has switched to the opposite outside back; move as the new ball-side winger.')
add(24,press,'A_LB',{'H_LW':[9,51],'H_ST':[20,49]},('Close the return route',{'H_ST':[18,52]},None),('Take pressure after the handoff',{'H_ST':[14,51]},None),{'A_LB':[15,53],'H_LW':[8,55]},'The carrier escapes inside the winger; the striker is now the closest available presser.')
add(25,defend,'A_RW',{},('Apply controlled pressure',{'H_LB':[9,24]},None),('Delay while protecting inside',{'H_LB':[11,21]},None),{'H_CB':[28,14]},'Central cover is farther away; do not commit beyond your ability to recover.')
add(26,defend,'A_RW',{},('Keep diagonal cover',{'H_CB':[17,17]},None),('Take over first pressure',{'H_CB':[15,18]},None),{'A_RW':[13,21],'H_LB':[8,26],'H_RB':[29,16]},'The outside back has been beaten; become first defender with RB covering inside.')
add(27,defend,'A_LW',{'A_LW':[35,24],'H_CB':[25,16]},('Take controlled pressure',{'H_RB':[35,22]},None),('Delay and reconnect',{'H_RB':[32,19]},None),{'A_LW':[43,32]},'The receiver is now much farther away; protect the space while your unit shifts.')
add(28,defend,'A_CM',{'A_CM':[32,33],'H_DM':[23,27]},('Shift and screen forward access',{'H_DM':[28,27]},None),('Step to a reachable loose ball',{'H_DM':[29,29]},'WIN'),{'A_CM':[30,32],'H_DM':[29,27],'H_CB':[25,20]},'A loose touch enters your reach and the center back provides cover.')
add(29,defend,'A_CM',{'H_DM':[26,31],'A_CM':[26,34]},('Protect central depth',{'H_CB':[22,15]},None),('Step with the connected unit',{'H_CB':[22,20],'H_LB':[10,24],'H_RB':[34,24]},None),{'A_CM':[26,33],'H_DM':[26,32]},'The midfielder has closed the ball; advance only while forward delivery remains prevented.')
add(30,defend,'A_CM',{'H_CM':[31,35],'A_CM':[27,30],'H_DM':[22,25]},('Recover into midfield',{'H_CM':[29,26]},None),('Press the trapped receiver',{'H_CM':[31,32]},None),{'A_CM':[34,33],'H_RB':[34,27]},'The receiver is near the sideline with RB covering; pressure is now supported.')
add(31,wide,'A_LW',{'H_RB':[34,17],'A_LW':[39,21]},('Protect inside then close',{'H_RB':[36,19]},None),('Contest a reachable loose touch',{'H_RB':[36,19]},'WIN'),{'A_LW':[39,22]},'The attacker knocks the ball inside toward you; check reach before contesting.')
add(32,defend,'A_RW',{'H_LB':[10,21],'A_RW':[10,24],'H_CB':[29,12]},('Delay on the goal-side route',{'H_LB':[11,20]},None),('Contest the loose ball',{'H_LB':[10,22]},'WIN'),{'A_RW':[10,25]},'A touch escapes toward you; the ball is available without lunging through the player.')
add(33,defend,'A_RW',{'A_RW':[14,20],'H_LB':[9,25],'H_CB':[19,16]},('Become first defender',{'H_CB':[16,18]},None),('Remain the covering defender',{'H_CB':[19,16]},None),{'H_LB':[13,18],'A_RW':[14,21]},'The outside back has recovered goal-side; preserve cover instead of duplicating pressure.')
add(34,wide,'A_LW',{},('Stay goal-side with the runner',{'H_CB':[23,12]},None),('Step with the line',{'H_CB':[22,17],'H_LB':[11,18],'H_RB':[36,21]},None),{'H_RB':[38,20],'A_LW':[40,21]},'Ball pressure prevents the immediate delivery; step only with the rest of the line.')
add(35,wide,'A_LW',{'H_DM':[27,24]},('Protect the cutback lane',{'H_DM':[28,21]},None),('Track the runner through your zone',{'H_DM':[28,17]},None),{'H_RB':[29,21],'A_CM':[28,20]},'RB has taken the cutback zone while a runner threatens behind you; communicate the handoff.')
add(36,wide,'A_LW',{'H_RB':[36,18]},('Close to obstruct delivery',{'H_RB':[38,19]},None),('Recover inside',{'H_RB':[32,16]},None),{'H_RB':[29,17],'A_LW':[42,17]},'The carrier is now too distant for immediate pressure; protect the inside route.')

records[11]['A'][1]['H_LW']=[19,54]
records[19]['A'][1]['H_CM']=[24,47]

def action_branch(rec,variant,key,positions,owner,ball):
 label,targets,receiver=rec[key]
 target=copy.deepcopy(positions);target.update(targets)
 endball=list(ball);endowner=owner
 if receiver=='SHOT':endball=[23,68];endowner=None
 elif receiver=='WIN':endowner='H_'+rec['role'];endball=target[endowner][:]
 elif receiver:endowner=receiver;endball=target[receiver][:]
 elif owner in targets:endball=target[owner][:]
 return {'label':label,'actor_targets':targets,'ball_target':endball,'owner_after':endowner,'feedback':('Read the original cue: ' if variant=='base' else 'Read the changed cue: ')+(rec['brief']['cue'] if variant=='base' else rec['changed_cue']), 'consequence':'Illustrative endpoint for this option; no guaranteed goal, turnover or calibrated travel time.'}

episodes=[]
for rec in records:
 n=int(rec['id'][1:]); pos=rec['positions'];allpts=list(pos.values())+list(rec['change'].values())+list(rec['A'][1].values())+list(rec['B'][1].values())
 low=max(0,min(p[1] for p in allpts)-7);high=min(68.58,max(p[1] for p in allpts)+7)
 e={'id':rec['id'],'decision_id':rec['id'],'family_id':rec['family_id'],'title':rec['title'],'source_ids':rec['source_ids'],'protagonist_id':'H_'+rec['role'],'actors':[{'id':a,'team':a[0],'role':a[2:],'position_m':p} for a,p in pos.items()],'camera_bounds_m':[0,low,45.72,high], 'field':{'width_m':45.72,'length_m':68.58,'home_attack':'+y'},'geometry_provenance':'Original authored match-fragment adaptation, not source-exact coordinates.','status':'review_candidate','approval':None,'variants':[],'choices':[{'id':'A','label':rec['A'][0]},{'id':'B','label':rec['B'][0]},{'id':'C','label':rec['brief']['misread']},{'id':'D','label':'Pause, scan and communicate before committing'}]}
 for variant in ('base','changed'):
  positions=copy.deepcopy(pos)
  if variant=='changed':positions.update(rec['change'])
  owner=rec['owner']; ball=[positions[owner][0]+.35,positions[owner][1]]
  if n==19 and variant=='base':ball=[23,52.1];owner=None
  if n in (21,28,31,32) and variant=='changed':
   ball={21:[26,36.3],28:[29,29.2],31:[36,19.3],32:[10,22.2]}[n];owner=None
  if n==23 and variant=='changed':owner='A_RB';ball=[38,51]
  grades=dict(zip(('A','B','C','D'),rec['grades'] if variant=='base' else rec['changed_grades']))
  if variant=='base' and n in (16,21,28,31,32):grades['B']='misread'
  if variant=='changed' and n in (1,7,8,10,11,14,17,19,26,33):grades['A']='misread'
  # Pausing is low-value when a reachable opportunity is explicitly time-sensitive, not a technical error.
  branches={k:action_branch(rec,variant,k,positions,owner,ball) for k in ('A','B')}
  for k in ('A','B'):
   if grades[k]=='misread':
    branches[k].update(actor_targets={},ball_target=ball,owner_after=owner,feedback='This action is not supported by the current cue. '+(rec['brief']['cue'] if variant=='base' else rec['changed_cue']),consequence='Freeze for explanation; do not illustrate a successful outcome for an unavailable action.')
  for k in ('C','D'):branches[k]={'label':e['choices'][2 if k=='C' else 3]['label'],'actor_targets':{},'ball_target':ball,'owner_after':owner,'feedback':('This risks losing the relationship we are trying to preserve: '+rec['brief']['misread'] if k=='C' else 'Scanning is useful, but reassess before the opportunity disappears.'),'consequence':'Review pause only; no speculative failure animation.'}
  e['variants'].append({'id':variant,'ball_owner':owner,'ball_position_m':ball,'actor_overrides':rec['change'] if variant=='changed' else {},'visible_cues':[rec['brief']['cue'] if variant=='base' else rec['changed_cue'],'Identify pressure, support and the next threat before selecting.'],'grades':grades,'branches':branches,'reason':rec['brief']['preferred'] if variant=='base' else rec['brief']['conditional_alternative']})
 episodes.append(e)
(O/'episodes.json').write_text(json.dumps(episodes,indent=2))
(O/'sources.json').write_text(json.dumps(sources,indent=2))
shutil.copy2(R/'v2/curriculum.json',O/'curriculum.json')
print('Authored36 situations /72 cue states; explicit numeric positions and four choices each.')
