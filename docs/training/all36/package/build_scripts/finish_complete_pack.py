import json,html,shutil,subprocess,zipfile,hashlib
from pathlib import Path
R=Path(__file__).resolve().parent;O=R/'complete_training_review'
es=json.loads((O/'episodes.json').read_text())
md='# All36 scene review sheets\n\nEach is an authored adaptation, not a copied source diagram. Every state has four choices. Camera/coordinate units are meters; home attacks +y. Before/after previews show the preferred action only.\n\n'
for e in es:
 md+='## '+e['id']+' — '+e['title']+'\n\nSources: '+', '.join(e['source_ids'])+'. Protagonist: '+e['protagonist_id']+'. Participants: '+str(len(e['actors']))+'.\n\n'
 for v in e['variants']:
  md+='### '+v['id']+'\n\n'+v['visible_cues'][0]+'\n\n|Choice|Action|Grade|\n|---|---|---|\n'
  for c in e['choices']:md+='|'+c['id']+'|'+c['label']+'|'+v['grades'][c['id']]+'|\n'
  md+='\nCoach emphasis: '+v['reason']+'\n\n'
 md+='Reviewer: ______ Date: ______ Verdict: revise / approve for prototype / approve for production\n\n'
(O/'SCENE_REVIEW.md').write_text(md)
shutil.copy2(R/'v2/RESEARCH_AND_AUDIT.md',O/'PRIOR_SOURCE_AUDIT.md')
shutil.copy2(R/'v2/SOURCES.md',O/'SOURCES.md')
for name in ['build_complete_library.py','render_complete_previews.py','validate_complete.py','export_complete_png.py','finish_complete_pack.py']:
 (O/'build_scripts').mkdir(exist_ok=True);shutil.copy2(R/name,O/'build_scripts'/name)
contacts=O/'CONTACT_SHEETS';contacts.mkdir(exist_ok=True)
for state in ('decision','consequence'):
 for page in range(3):
  svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1512"><rect width="1080" height="1512" fill="#14233b"/>'
  for k in range(12):
   n=page*12+k+1;svg+=f'<image x="{k%3*360}" y="{k//3*378}" width="360" height="378" xlink:href="../PNG/D{n:02d}_base_boy_{state}.png"/>'
  svg+='</svg>';p=contacts/f'{state}_{page+1}.svg';p.write_text(svg)
  subprocess.run(['inkscape',str(p),'--export-type=png','--export-filename='+str(p.with_suffix('.png'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
print('Review sheets and six contact sheets complete.')
