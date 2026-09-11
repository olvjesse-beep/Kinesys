from pathlib import Path

module=Path('patient_registration_core-1.0.0.js')
text=module.read_text(encoding='utf-8')
clean='\n'.join(line.rstrip() for line in text.splitlines())+'\n'
module.write_text(clean,encoding='utf-8')

p=Path('tests/screen_loader.contract.js')
t=p.read_text(encoding='utf-8')
old="const app=fs.readFileSync('script-1.18.0.js','utf8');\nconst regionLoader=fs.readFileSync('clinical_region_loader-1.0.0.js','utf8');"
new="const app=fs.readFileSync('script-1.18.0.js','utf8');\nconst registration=fs.readFileSync('patient_registration_core-1.0.0.js','utf8');\nconst regionLoader=fs.readFileSync('clinical_region_loader-1.0.0.js','utf8');"
if t.count(old)!=1: raise SystemExit(f'screen import anchor expected once, got {t.count(old)}')
t=t.replace(old,new,1)
old2="const waits=(app.match(/const navegacao = await navegarPara\\('tela_avaliacao', true\\);/g)||[]).length;\nassert.strictEqual(waits,2,'os dois fluxos que preenchem a Avaliação devem aguardar sua montagem');"
new2="const waits=((app+'\\n'+registration).match(/const navegacao = await navegarPara\\('tela_avaliacao', true\\);/g)||[]).length;\nassert.strictEqual(waits,2,'os dois fluxos que preenchem a Avaliação devem aguardar sua montagem, mesmo após modularização do cadastro');"
if t.count(old2)!=1: raise SystemExit(f'screen waits anchor expected once, got {t.count(old2)}')
t=t.replace(old2,new2,1)
p.write_text(t,encoding='utf-8')
print('Phase 4N PR fixes prepared')
