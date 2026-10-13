const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const engine=fs.readFileSync('src/clinical/clinical_engine-1.17.0.js','utf8');
const screen=fs.readFileSync('screens/tela_avaliacao.html','utf8');
const experience=fs.readFileSync('src/clinical/avaliacao_experiencia-1.22.0.js','utf8');

assert.match(engine,/window\.aplicarRegioesDoRadarKineSys\s*=\s*function\(plano\)/,'a etapa 2 deve aplicar automaticamente as regiões do Radar');
assert.match(engine,/KineSysMotorClinico3\?\.atualizar\?\.\(true\)/,'o avanço deve atualizar o plano da anamnese antes de montar o exame');
assert.match(engine,/regioesRadar=window\.aplicarRegioesDoRadarKineSys\(plano\);[\s\S]*window\.renderizarMapeamentoRegioes\(\)/,'as regiões devem ser ativadas antes da primeira renderização dos testes');
assert.match(engine,/input\.dataset\.sugeridaPelaHMA='true'/,'a seleção automática deve manter sua origem auditável');
assert.match(engine,/dataset\.tocadoManualmente==='true'/,'uma decisão manual posterior do fisioterapeuta deve ser preservada');
assert.match(engine,/await window\.KineSysClinicalRegionLoader\.ensure\(regioesRadar\)/,'o banco clínico regional deve terminar de carregar antes de mostrar os testes');
assert.match(engine,/function regioesComAchadosRegistrados\(\)/,'a síntese deve recuperar regiões que tenham resultados, mesmo se o checkbox não estiver mais marcado');
assert.match(engine,/function regioesParaSintese\(\)/,'relatório e síntese devem compartilhar a união de regiões selecionadas e examinadas');
assert.match(engine,/coletarAchadosLaudoKineSys\s*=\s*function\(\)\{[\s\S]*?regioesParaSintese\(\)/,'o relatório deve consumir as regiões que possuem achados registrados');
assert.match(engine,/return \{regiaoId:id,regiao:BANCO_MAPEAMENTO_CLINICO\[id\]\.nome,id:entry\.item\.id,grupo:entry\.grupo/,'cada achado deve manter identificadores estáveis para a teia entre Radar, exame e relatório');

const helper=engine.match(/window\.aplicarRegioesDoRadarKineSys\s*=\s*function\(plano\)\{[\s\S]*?\n    \};/)?.[0];
assert.ok(helper,'o helper de regiões do Radar deve ser isolável para teste');
const controles=['lombar','quadril','joelho'].map(id=>({checked:false,dataset:{regiao:id}}));
let regiaoAtiva='',autosaves=0;
const context={
  window:{definirRegiaoAtivaAvaliacaoKineSys:id=>{regiaoAtiva=id;}},
  document:{
    querySelectorAll:()=>controles,
    getElementById:id=>controles.find(input=>id==='chk_regiao_'+input.dataset.regiao)||null
  },
  agendarAutosaveKineSys:()=>{autosaves+=1;},
  Set
};
context.window.window=context.window;
vm.runInNewContext(helper,context);
const ativadas=context.window.aplicarRegioesDoRadarKineSys({regioes:[{id:'lombar'},{id:'quadril'}]});
assert.deepStrictEqual(Array.from(ativadas),['lombar','quadril'],'o Radar deve ativar todas as regiões priorizadas e existentes');
assert.deepStrictEqual(controles.map(input=>input.checked),[true,true,false],'os testes das regiões do plano devem nascer visíveis');
assert.strictEqual(regiaoAtiva,'lombar','a primeira região priorizada deve abrir seus testes imediatamente');
assert.strictEqual(autosaves,1,'a seleção derivada da anamnese deve entrar no rascunho');

controles.forEach(input=>{input.checked=false;delete input.dataset.sugeridaPelaHMA;});
controles[0].dataset.tocadoManualmente='true';
context.window.aplicarRegioesDoRadarKineSys({regioes:[{id:'lombar'}]});
assert.deepStrictEqual(controles.map(input=>input.checked),[false,false,false],'remoção manual de todas as regiões não pode ser desfeita automaticamente');

const recuperarAchados=engine.match(/function regioesComAchadosRegistrados\(\)\{[\s\S]*?\n    \}/)?.[0];
const unirRegioes=engine.match(/function regioesParaSintese\(\)\{[\s\S]*?\n    \}/)?.[0];
assert.ok(recuperarAchados&&unirRegioes,'a recuperação de regiões examinadas deve ser testável');
const reportContext={
  Set,
  Object,
  BANCO_MAPEAMENTO_CLINICO:{lombar:{},joelho:{}},
  window:{obterEstadoRegiao:id=>id==='lombar'
    ? {exameContextFingerprint:'hma-atual',resultados:{'cluster::radiculopatia::0':'positivo','cluster::radiculopatia::1':'positivo','cluster::radiculopatia::2':'positivo'}}
    : {exameContextFingerprint:'hma-anterior',resultados:{'cluster::patelofemoral::0':'positivo'}},
    fingerprintContextoExameKineSys:()=> 'hma-atual'},
  regioesSelecionadas:()=>[]
};
vm.runInNewContext(recuperarAchados+'\n'+unirRegioes,reportContext);
assert.deepStrictEqual(Array.from(reportContext.regioesParaSintese()),['lombar'],'somente achados pertencentes à HMA atual devem seguir para o relatório; resultados antigos não podem contaminar a nova avaliação');

assert.match(screen,/id="subtela_diagnostico"[\s\S]*id="ks-laudo-card"/,'a etapa 3 deve manter o relatório editável');
assert.match(screen,/id="ks-laudo-card"[\s\S]*Finalizar e salvar avaliação[\s\S]*id="card_restricoes_posop"/,'a finalização deve permanecer disponível dentro do relatório');
assert.match(screen,/id="card_alertas_consolidados" hidden style="display:none !important"/,'painéis auxiliares devem ficar ocultos na etapa 3');
assert.match(screen,/id="card_restricoes_posop" hidden style="display:none !important"/,'restrições devem continuar persistíveis sem aparecer como item da etapa 3');
const etapa3=screen.slice(screen.indexOf('id="subtela_diagnostico"'),screen.indexOf('id="card_restricoes_posop"'));
assert.match(etapa3,/id="ks-laudo-copiar">Copiar texto/,'copiar texto deve ser a única ação de destino documental da etapa 3');
assert.doesNotMatch(etapa3,/>\s*(Exportar|Imprimir|Gerar PDF|Gerar com IA)\b/i,'a etapa 3 não deve ganhar exportação, impressão ou geração por IA');
assert.match(experience,/subtela_diagnostico:\s*\{[\s\S]*?title:\s*'Relatório'[\s\S]*?help:\s*'Revise o relatório fisioterapêutico final e copie o texto quando estiver pronto\.'/,'o cabeçalho da etapa 3 deve descrever somente revisão e cópia do relatório final');
assert.doesNotMatch(experience,/subtela_diagnostico:\s*\{[\s\S]*?title:\s*'Síntese clínica'/,'a etapa 3 não deve reapresentar a antiga síntese clínica');

console.log('Evaluation three-stage flow contract OK');

