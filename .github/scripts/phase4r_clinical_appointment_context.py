from pathlib import Path

SCRIPT=Path('script-1.18.0.js')
INDEX=Path('index.html')
MODULE=Path('clinical_appointment_context_core-1.0.0.js')
TEST=Path('tests/clinical_appointment_context_modularization.contract.js')

src=SCRIPT.read_text(encoding='utf-8')
start_marker='let agendamentoClinicoContexto = null;'
end_marker='window.resolverAgendamentoClinicoParaRegistro = resolverAgendamentoClinicoParaRegistro;'
start=src.find(start_marker)
end_start=src.find(end_marker,start)
if start<0 or end_start<0:
    raise SystemExit(f'appointment context markers not found: start={start} end={end_start}')
end=end_start+len(end_marker)
while end<len(src) and src[end] in ' \t': end+=1
if end<len(src) and src[end]=='\r': end+=1
if end<len(src) and src[end]=='\n': end+=1
block=src[start:end].rstrip()

for token in [
    "const KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY = 'kinesys_agendamento_clinico_contexto_v1';",
    'function definirAgendamentoClinicoContexto(',
    'function obterAgendamentoClinicoContexto(',
    'function limparAgendamentoClinicoContexto(',
    'async function resolverAgendamentoClinicoParaRegistro(',
    'window.definirAgendamentoClinicoContexto = definirAgendamentoClinicoContexto;',
    'window.resolverAgendamentoClinicoParaRegistro = resolverAgendamentoClinicoParaRegistro;'
]:
    if token not in block:
        raise SystemExit(f'missing context token in extraction: {token}')

MODULE.write_text("""'use strict';
/* ==========================================================================\n   KineSys — Clinical Appointment Context Core 1.0.0\n   Phase 4R: vínculo entre atendimento clínico e Agenda extraído sem alterar regra.\n   Mantém apenas estado de sessão e leitura de agendamentos; não grava Supabase.\n   ========================================================================== */\n\n"""+block+'\n',encoding='utf-8')
SCRIPT.write_text(src[:start]+src[end:],encoding='utf-8')

html=INDEX.read_text(encoding='utf-8')
old='core_mod=20260911-phase4q-r1'
new='core_mod=20260911-phase4r-r1'
if html.count(old)!=1:
    raise SystemExit(f'core cache marker expected once, got {html.count(old)}')
html=html.replace(old,new,1)
anchor='    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1&core_mod=20260911-phase4r-r1"></script>\n'
module='    <script defer src="clinical_appointment_context_core-1.0.0.js?v=20260911-phase4r-r1"></script>\n'
if html.count(anchor)!=1:
    raise SystemExit(f'core anchor expected once after cache update, got {html.count(anchor)}')
html=html.replace(anchor,anchor+module,1)
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
const ctxSource=fs.readFileSync('clinical_appointment_context_core-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const home=fs.readFileSync('home_fisioterapeuta_util-1.24.0.js','utf8');

for(const fn of ['definirAgendamentoClinicoContexto','obterAgendamentoClinicoContexto','limparAgendamentoClinicoContexto','resolverAgendamentoClinicoParaRegistro']){
  const re=new RegExp(`(?:async\\s+)?function\\s+${fn}\\(`);
  assert.match(ctxSource,re,`${fn} deve existir no módulo de contexto`);
  assert.doesNotMatch(core,re,`${fn} não pode permanecer duplicada no monólito`);
}
assert.doesNotMatch(core,/KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY/,'chave de sessão do contexto não deve permanecer no core');
assert.match(ctxSource,/const KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY\s*=\s*'kinesys_agendamento_clinico_contexto_v1'/,'chave histórica da sessão deve ser preservada');
for(const fn of ['definirAgendamentoClinicoContexto','obterAgendamentoClinicoContexto','limparAgendamentoClinicoContexto','resolverAgendamentoClinicoParaRegistro']){
  assert.match(ctxSource,new RegExp(`window\\.${fn}\\s*=\\s*${fn}`),`${fn} deve preservar API global`);
}

assert.match(ctxSource,/sessionStorage\.setItem\(KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY/,'definição deve persistir contexto na sessão');
assert.match(ctxSource,/sessionStorage\.getItem\(KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY\)/,'leitura deve recuperar contexto da sessão');
assert.match(ctxSource,/sessionStorage\.removeItem\(KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY\)/,'limpeza deve remover contexto da sessão');
assert.match(ctxSource,/pacienteEsperado && contexto\.pacienteId/,'contexto deve continuar validando paciente');
assert.match(ctxSource,/modoEsperado && contexto\.modo/,'contexto deve continuar validando modo');
assert.match(ctxSource,/_supabase[\s\S]{0,300}\.from\('agendamentos'\)/,'resolver deve continuar consultando somente agendamentos');
assert.match(ctxSource,/\.select\('id,status'\)/,'consulta deve preservar projeção mínima');
assert.match(ctxSource,/\.eq\('paciente_id', String\(pacienteId\)\)/,'consulta deve permanecer limitada ao paciente');
assert.match(ctxSource,/\.eq\('data', data\)/,'consulta deve permanecer limitada à data clínica');
assert.match(ctxSource,/\.neq\('status', 'cancelado'\)/,'agendamento cancelado deve continuar excluído');
assert.match(ctxSource,/\.limit\(3\)/,'consulta deve preservar limite defensivo');
assert.match(ctxSource,/falta_justificada','falta_nao_justificada','faltou'/,'faltas devem continuar fora dos candidatos clínicos');
assert.doesNotMatch(ctxSource,/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/,'módulo de contexto não pode escrever no Supabase');

assert.match(core,/await resolverAgendamentoClinicoParaRegistro\(pacienteId,realizadoEm,'evolucao'\)/,'Evolução deve continuar vinculando o atendimento à Agenda');
assert.match(core,/await resolverAgendamentoClinicoParaRegistro\(pacienteExistente\?\.id\|\|pacienteAtualId\|\|'',realizadoEm,'avaliacao'\)/,'Avaliação deve continuar vinculando o atendimento à Agenda');
assert.ok((core.match(/limparAgendamentoClinicoContexto\(\)/g)||[]).length>=2,'Avaliação e Evolução devem continuar limpando contexto após vínculo salvo');
assert.match(home,/window\.definirAgendamentoClinicoContexto/,'Home do fisioterapeuta deve continuar definindo o contexto pela API pública');

const storage=new Map();
const calls=[];
let resultData=[];
const chain={
  select(v){calls.push(['select',v]);return this;},
  eq(k,v){calls.push(['eq',k,v]);return this;},
  neq(k,v){calls.push(['neq',k,v]);return this;},
  limit(n){calls.push(['limit',n]);return Promise.resolve({data:resultData,error:null});}
};
const runtime={
  window:{},
  sessionStorage:{
    setItem:(k,v)=>storage.set(k,String(v)),
    getItem:k=>storage.has(k)?storage.get(k):null,
    removeItem:k=>storage.delete(k)
  },
  _supabase:{from:t=>{calls.push(['from',t]);return chain;}},
  Date,
  JSON,
  String,
  console
};
vm.createContext(runtime);
vm.runInContext(ctxSource,runtime);

async function validarRuntime(){
  const definido=runtime.definirAgendamentoClinicoContexto('ag_1','pac_1','Evolucao');
  assert.strictEqual(definido.agendamentoId,'ag_1');
  assert.strictEqual(definido.pacienteId,'pac_1');
  assert.strictEqual(definido.modo,'evolucao');
  assert.ok(storage.has('kinesys_agendamento_clinico_contexto_v1'),'contexto deve persistir na sessão');
  assert.strictEqual(runtime.obterAgendamentoClinicoContexto('pac_1','evolucao'),'ag_1');
  assert.strictEqual(runtime.obterAgendamentoClinicoContexto('outro','evolucao'),null,'paciente divergente não pode reutilizar contexto');
  assert.strictEqual(await runtime.resolverAgendamentoClinicoParaRegistro('pac_1','2026-09-11T10:00:00','evolucao'),'ag_1','contexto explícito deve ter precedência');
  assert.strictEqual(calls.length,0,'contexto explícito não deve consultar Supabase');

  runtime.limparAgendamentoClinicoContexto();
  assert.ok(!storage.has('kinesys_agendamento_clinico_contexto_v1'),'limpeza deve remover sessão');
  resultData=[{id:'faltou_1',status:'faltou'},{id:'ag_2',status:'agendado'}];
  const resolvido=await runtime.resolverAgendamentoClinicoParaRegistro('pac_1','2026-09-11T10:00:00','evolucao');
  assert.strictEqual(resolvido,'ag_2','único candidato clínico válido deve ser resolvido');
  assert.deepStrictEqual(calls[0],['from','agendamentos']);
  assert.ok(calls.some(x=>x[0]==='eq'&&x[1]==='paciente_id'&&x[2]==='pac_1'));
  assert.ok(calls.some(x=>x[0]==='eq'&&x[1]==='data'&&x[2]==='2026-09-11'));
  assert.ok(calls.some(x=>x[0]==='neq'&&x[1]==='status'&&x[2]==='cancelado'));

  calls.length=0;
  resultData=[{id:'ag_2',status:'agendado'},{id:'ag_3',status:'agendado'}];
  assert.strictEqual(await runtime.resolverAgendamentoClinicoParaRegistro('pac_1','2026-09-11T10:00:00','avaliacao'),null,'mais de um candidato válido deve continuar ambíguo');
}

const corePos=html.indexOf('script-1.18.0.js');
const contextPos=html.indexOf('clinical_appointment_context_core-1.0.0.js');
const deletionPos=html.indexOf('patient_deletion_core-1.0.0.js');
assert.ok(corePos>=0&&contextPos>corePos&&deletionPos>contextPos,'contexto deve carregar depois do _supabase do core e antes dos módulos posteriores');
assert.match(html,/core_mod=20260911-phase4r-r1/,'cache-buster do core deve acompanhar a Phase 4R');

const moduleSize=fs.statSync('clinical_appointment_context_core-1.0.0.js').size;
const coreSize=fs.statSync('script-1.18.0.js').size;
assert.ok(moduleSize>2500,`módulo parece pequeno demais: ${moduleSize}`);
assert.ok(coreSize<661782,`monólito deve reduzir em relação à 4Q; atual=${coreSize}`);

validarRuntime().then(()=>{
  console.log(`Clinical appointment context modularization: OK | module=${moduleSize} bytes | monolith=${coreSize} bytes`);
}).catch(err=>{console.error(err);process.exitCode=1;});
""",encoding='utf-8')

print('Phase 4R transform prepared')
