const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('src/core/script-1.18.0.js', 'utf8');

assert.match(source, /function instalarObservadorCicloVidaRadar\(\)/, 'Radar deve manter o ponto público de instalação do lifecycle');
assert.doesNotMatch(source, /new MutationObserver\(\(\) => sincronizarCicloVidaRadar\(\)\)/, 'Radar não deve manter MutationObserver apenas para detectar ativação da tela');
assert.match(source, /document\.addEventListener\('kinesys:tela-ativada', sincronizarSeAvaliacao\)/, 'Radar deve reagir ao evento oficial de ativação');
assert.match(source, /document\.addEventListener\('kinesys:tela-desativada', sincronizarSeAvaliacao\)/, 'Radar deve reagir ao evento oficial de desativação');
assert.match(source, /if \(event\?\.detail\?\.id === 'tela_avaliacao'\) sincronizarCicloVidaRadar\(\)/, 'Eventos de outras telas não devem disparar lifecycle do Radar');
assert.match(source, /tela\.dataset\.radarLifecycleBound === '1'/, 'Binding do lifecycle deve continuar idempotente');
assert.match(source, /container\.classList\.toggle\('radar-contexto-avaliacao', ativa\)/, 'Sincronização visual existente deve ser preservada');
assert.match(source, /if \(!ativa\) fecharRadarKineSys\(true\)/, 'Ao sair da avaliação o Radar deve continuar sendo fechado');

console.log('Radar lifecycle contract: OK');

const vm=require('vm');
let historia='',principal=null;
const env={console,setTimeout:()=>0,clearTimeout(){},window:{},document:{readyState:'loading',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='paciente_hma'?{value:historia}:id==='paciente_nome'?{value:'Teste Radar'}:null},coletarContextoClinico:()=>({})};
env.window.analisarHMAClinicaKineSys=()=>({local:'Joelho',sinais:[],negacoesDetectadas:[],suspeitaPrincipal:principal,diferenciais:[],lacunas:[]});
env.BANCO_MAPEAMENTO_CLINICO={joelho:{nome:'Joelho',palavrasChave:['joelho'],clusters:[
 {id:'patelofemoral',nome:'Dor patelofemoral',palavrasChaveHMA:['dor anterior joelho','dor agachamento','dor escadas'],testes:['Agachamento','Subida de degrau']},
 {id:'menisco',nome:'Lesão meniscal',palavrasChaveHMA:['travamento joelho','dor interlinha'],testes:['McMurray']},
 {id:'ligamento',nome:'Lesão ligamentar',palavrasChaveHMA:['falseio joelho','entorse joelho'],testes:['Lachman']}
],diferenciais:[]}};
vm.runInNewContext(fs.readFileSync('src/clinical/clinical_reasoning_hma-3.0.0.js','utf8'),env);
historia='Dor anterior no joelho ao subir escadas e no agachamento. Nega travamento do joelho.';
principal={nome:'Dor patelofemoral',aFavor:['dor anterior ao agachar'],aConfirmar:[]};
let plano=env.window.gerarPlanoClinicoHMAKineSys();
assert.strictEqual(plano.hipoteses[0].id,'patelofemoral','o padrão específico deve superar hipóteses da mesma família');
assert.ok(!plano.hipoteses.some(h=>h.id==='menisco'),'travamento negado não deve priorizar lesão meniscal');
assert.ok(plano.exame.testesPrioritarios.some(t=>t.hipoteseId==='patelofemoral'),'o teste deve conservar o identificador da hipótese para o relatório');
historia='Dor no joelho, sem outros detalhes.';principal=null;
plano=env.window.gerarPlanoClinicoHMAKineSys();
assert.strictEqual(plano.hipoteses.length,0,'queixa genérica não deve receber hipóteses arbitrárias por posição no banco');
historia='Dor na interlinha do joelho com travamento do joelho após torção.';principal={nome:'Lesão meniscal',aFavor:[],aConfirmar:[]};
plano=env.window.gerarPlanoClinicoHMAKineSys();
assert.strictEqual(plano.hipoteses[0].id,'menisco','novo padrão afirmado deve mudar o foco de investigação');
assert.ok(plano.exame.testesPrioritarios.some(t=>t.texto==='McMurray'),'o novo foco deve orientar os testes correspondentes');
console.log('Radar discriminative evidence and report linkage: OK');
env.BANCO_MAPEAMENTO_CLINICO.ombro={nome:'Ombro',palavrasChave:['escapula','ombro'],clusters:[],diferenciais:[]};
vm.runInNewContext(fs.readFileSync('database/regioes/ombro-ext-1.0.0.js','utf8'),env);
env.window.analisarHMAClinicaKineSys=()=>({local:'Ombro',sinais:['ombro'],negacoesDetectadas:[],suspeitaPrincipal:null,diferenciais:[],lacunas:[]});
historia='Dor na borda medial da escápula com fraqueza dos romboides e retração escapular fraca.';
plano=env.window.gerarPlanoClinicoHMAKineSys();
const dorsal=plano.hipoteses.find(h=>h.id==='neuropatia_dorsal_escapular');
assert.ok(dorsal,'dor medial escapular com alterações dos romboides deve permitir o diferencial dorsal escapular');
assert.strictEqual(dorsal.testes.length,4,'o diferencial deve orientar quatro verificações clínicas');
assert.ok(!dorsal.item.limiar&&!dorsal.item.regraConfirmacao,'o diferencial não pode receber um limiar de confirmação sem validação');
assert.ok(plano.exame.testesPrioritarios.some(t=>t.hipoteseIds.includes(dorsal.id)),'os novos testes devem manter conexão com o relatório');
console.log('Dorsal scapular differential and evidence-based boundaries: OK');
