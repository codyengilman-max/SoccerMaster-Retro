from pathlib import Path
import subprocess,concurrent.futures
R=Path(__file__).resolve().parent/'complete_training_review'
P=R/'PNG';P.mkdir(exist_ok=True)
files=sorted((R/'previews').glob('*_base_boy_*.svg'))
def render(p):
 subprocess.run(['inkscape',str(p),'--export-width=720','--export-type=png','--export-filename='+str(P/(p.stem+'.png'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 return p.name
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 for i,n in enumerate(ex.map(render,files),1):
  if i%12==0:print('Rendered',i,'of',len(files),flush=True)
assert len(list(P.glob('*.png')))==72
