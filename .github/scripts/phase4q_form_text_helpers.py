from pathlib import Path

SCRIPT=Path('script-1.18.0.js')
INDEX=Path('index.html')
MODULE=Path('patient_form_helpers_core-1.0.0.js')
TEST=Path('tests/patient_form_helpers_modularization.contract.js')

src=SCRIPT.read_text(encoding='utf-8')
start_marker='/* ================= 3. IDADE E FILTRO DE 2 HORAS ================= */'
end_marker='/* ==========================================================================\n   KINESYS - SCRIPT DEFINITIVO (ID ÚNICO E SEM DUPLICATAS) - PARTE 2 DE 4'
start=src.find(start_marker)
end=src.find(end_marker,start)
if start<0 or end<=start:
    raise SystemExit(f'helper block markers not found: start={start} end={end}')
block=src[start:end].rstrip()

for fn in ['calcularIdadeCadastro','removerAcentos','obterTextoExibicao']:
    if f'function {fn}(' not in block:
        raise SystemExit(f'missing helper in extraction block: {fn}')

MODULE.write_text("""'use strict';
/* ==========================================================================\n   KineSys — Patient Form Helpers Core 1.0.0\n   Phase 4Q: helpers puros/de formulário extraídos sem alteração de comportamento.\n   Não acessa Supabase, rede ou persistência.\n   ========================================================================== */\n\n"""+block+'\n',encoding='utf-8')
SCRIPT.write_text(src[:start]+src[end:],encoding='utf-8')

html=INDEX.read_text(encoding='utf-8')
old='core_mod=20260911-phase4p-r1'
new='core_mod=20260911-phase4q-r1'
if html.count(old)!=1:
    raise SystemExit(f'core cache marker expected once, got {html.count(old)}')
html=html.replace(old,new,1)
anchor='    <script defer src="input_helpers_core-1.0.0.js?v=20260911-phase4f-r1"></script>\n'
module='    <script defer src="patient_form_helpers_core-1.0.0.js?v=20260911-phase4q-r1"></script>\n'
if html.count(anchor)!=1:
    raise SystemExit(f'input helpers anchor expected once, got {html.count(anchor)}')
html=html.replace(anchor,module+anchor,1)
INDEX.write_text(html,encoding='utf-8')

for p in Path('tests').glob('*.js'):
    t=p.read_text(encoding='utf-8')
    if old in t:
        p.write_text(t.replace(old,new),encoding='utf-8')

TEST.write_text(r"""'use strict';
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const core=fs.readFileSync('script-1.18.0.js','utf8');
const helpers=fs.readFileSync('patient_form_helpers_core-1.0.0.js','utf8');
const team=fs.readFileSync('team_management_core-1.0.0.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const fn of ['calcularIdadeCadastro','removerAcentos','obterTextoExibicao']){
  const re=new RegExp(`function\\s+${fn}\\(`);
  assert.match(helpers,re,`${fn} deve existir no módulo de helpers`);
  assert.doesNotMatch(core,re,`${fn} não pode permanecer duplicada no monólito`);
}
assert.doesNotMatch(core,/3\. IDADE E FILTRO DE 2 HORAS/,'seção utilitária 3 não deve permanecer no monólito');
assert.doesNotMatch(helpers,/_supabase|fetch\s*\(|localStorage|sessionStorage|\.from\s*\(/,'helpers não podem acessar Supabase, rede ou storage');

assert.match(helpers,/document\.getElementById\('cad_nascimento'\)/,'cálculo de idade deve preservar campo de nascimento');
assert.match(helpers,/document\.getElementById\('cad_idade'\)/,'cálculo de idade deve preservar campo de idade');
assert.match(helpers,/document\.getElementById\('cad_dependente'\)/,'menor deve continuar marcando dependência');
assert.match(helpers,/idade >= 0 && idade < 18/,'regra histórica de menor de 18 anos deve permanecer');
assert.match(helpers,/typeof alternarCamposResponsavel === 'function'/,'integração opcional com campos do responsável deve permanecer');
assert.match(team,/removerAcentos\(/,'Gestão de Equipe deve continuar consumindo normalização de acentos compartilhada');

const fields={
  cad_nascimento:{value:''},
  cad_idade:{value:''},
  cad_dependente:{checked:false}
};
let alternou=0;
const ctx={
  document:{getElementById:id=>fields[id]||null},
  alternarCamposResponsavel:()=>{alternou++;},
  Date,
  console
};
vm.createContext(ctx);
vm.runInContext(helpers,ctx);
assert.strictEqual(ctx.removerAcentos('Áção Çervical'),'acao cervical','removerAcentos deve preservar normalização histórica');
assert.strictEqual(ctx.removerAcentos(''),'','removerAcentos deve manter vazio');
assert.strictEqual(ctx.obterTextoExibicao({exibicao:'Texto exibido'}),'Texto exibido','objeto deve usar exibicao');
assert.strictEqual(ctx.obterTextoExibicao('Texto simples'),'Texto simples','string deve permanecer inalterada');
assert.strictEqual(ctx.obterTextoExibicao(null),'','valor vazio deve continuar retornando string vazia');

const hoje=new Date();
const anoMenor=hoje.getFullYear()-10;
fields.cad_nascimento.value=`${anoMenor}-01-01`;
ctx.calcularIdadeCadastro();
assert.match(fields.cad_idade.value,/^10 anos$/,'idade de exemplo determinístico deve ser calculada');
assert.strictEqual(fields.cad_dependente.checked,true,'menor de 18 deve ser marcado como dependente');
assert.strictEqual(alternou,1,'campos do responsável devem ser sincronizados para menor');

const cadastroPos=index.indexOf('cadastro_validacoes_core-1.0.0.js');
const helpersPos=index.indexOf('patient_form_helpers_core-1.0.0.js');
const inputPos=index.indexOf('input_helpers_core-1.0.0.js');
const teamPos=index.indexOf('team_management_core-1.0.0.js');
const corePos=index.indexOf('script-1.18.0.js');
assert.ok(cadastroPos>=0&&helpersPos>cadastroPos&&inputPos>helpersPos&&teamPos>helpersPos&&corePos>teamPos,'ordem deve disponibilizar helpers antes dos consumidores e do core');
assert.match(index,/core_mod=20260911-phase4q-r1/,'cache-buster do core deve acompanhar a Phase 4Q');

assert.match(core,/async function salvarPacienteNaNuvem\(pacienteObjeto, opcoes = \{\}\)/,'persistência do paciente deve permanecer fora do escopo da 4Q');
const moduleSize=fs.statSync('patient_form_helpers_core-1.0.0.js').size;
const coreSize=fs.statSync('script-1.18.0.js').size;
assert.ok(moduleSize>1200,`módulo parece pequeno demais: ${moduleSize}`);
assert.ok(coreSize<663152,`monólito deve reduzir em relação à 4P; atual=${coreSize}`);
console.log(`Patient form helpers modularization: OK | module=${moduleSize} bytes | monolith=${coreSize} bytes`);
""",encoding='utf-8')

print('Phase 4Q transform prepared')
