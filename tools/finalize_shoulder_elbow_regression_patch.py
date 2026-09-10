from pathlib import Path
import runpy

# Apply both prior refinement passes in the isolated Actions workspace.
runpy.run_path('tools/refine_shoulder_elbow_regression_patch.py', run_name='__main__')

p = Path('clinical_reasoning_elbow-3.1.0.js')
s = p.read_text(encoding='utf-8')
old = "    if(cond.id==='cotovelo_lateral'&&localLateral)score+=2.8;"
new = "    if(cond.id==='cotovelo_lateral'&&localLateral)score+=2.8;\n    if(cond.id==='cotovelo_lateral'&&relacaoOmbro&&/lateral do braco/.test(t)&&!cargaExtensoraLocal)score-=3.2;"
if old not in s:
    raise SystemExit('Elbow lateral scoring marker not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
