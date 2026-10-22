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
assert.strictEqual(dorsal.testes.length,6,'o diferencial deve preservar as quatro verificações anteriores e acrescentar duas');
assert.ok(!dorsal.item.limiar&&!dorsal.item.regraConfirmacao,'o diferencial não pode receber um limiar de confirmação sem validação');
assert.ok(plano.exame.testesPrioritarios.some(t=>t.hipoteseIds.includes(dorsal.id)),'os novos testes devem manter conexão com o relatório');
console.log('Dorsal scapular differential and evidence-based boundaries: OK');

// Contratos do funil completo: anatomia, seleção discriminativa e exame em tempo real.
// Fixtures isoladas verificam o encadeamento; as baterias clínicas reais continuam separadas.
let achados=[],contexto={},leitura={local:'Joelho',sinais:[]};
env.coletarContextoClinico=()=>contexto;
env.window.coletarAchadosLaudoKineSys=()=>achados;
env.window.analisarHMAClinicaKineSys=()=>({...leitura,negacoesDetectadas:[],suspeitaPrincipal:null,diferenciais:[],lacunas:[]});
env.BANCO_MAPEAMENTO_CLINICO.joelho.clusters.push({id:'sobrecarga',nome:'Sobrecarga mecânica',palavrasChaveHMA:['sobrecarga joelho','dor agachamento'],testes:['Agachamento','Palpação']});
function examinar(id,resultados){
 return {id,regiaoId:'joelho',grupo:'cluster',achados:resultados.map((resultado,i)=>({texto:env.BANCO_MAPEAMENTO_CLINICO.joelho.clusters.find(h=>h.id===id).testes[i],resultado}))};
}
historia='Dor anterior no joelho com dor no agachamento e dor nas escadas. Sobrecarga do joelho.';
plano=env.window.gerarPlanoClinicoHMAKineSys();
assert.ok(plano.exame.testesPrioritarios.some(t=>t.texto==='Subida de degrau'&&t.discriminativo),'deve destacar exame específico entre hipóteses concorrentes');
const agachar=plano.exame.testesPrioritarios.find(t=>t.texto==='Agachamento');
assert.ok(agachar.hipoteseIds.includes('patelofemoral')&&agachar.hipoteseIds.includes('sobrecarga'),'deduplicar não pode apagar o vínculo compartilhado');
assert.strictEqual(plano.exame.testesPrioritarios.filter(t=>t.texto==='Agachamento').length,1);
for(const [resultados,situacao] of [
 [['positivo','positivo'],'achados_favoraveis'],[['negativo','negativo'],'achados_desfavoraveis'],
 [['positivo','negativo'],'achados_divergentes'],[['inconclusivo','inconclusivo'],'exame_inconclusivo'],
 [['positivo','nao_avaliado'],'exame_parcial'],[['positivo','inconclusivo'],'exame_inconclusivo'],[['negativo','inconclusivo'],'exame_inconclusivo'],[['nao_avaliado','nao_aplica'],'aguardando_exame'],
 [['',''],'aguardando_exame']
]){
 achados=[examinar('patelofemoral',resultados)];
 plano=env.window.gerarPlanoClinicoHMAKineSys();
 assert.strictEqual(plano.hipoteses.find(h=>h.id==='patelofemoral').exameAtual.situacao,situacao,JSON.stringify(resultados));
 assert.ok(!JSON.stringify(plano.hipoteses[0].exameAtual).includes('confirmada'),'estado do exame não deve fechar diagnóstico');
}
achados=[examinar('patelofemoral',['negativo','negativo']),examinar('sobrecarga',['positivo','positivo'])];
plano=env.window.gerarPlanoClinicoHMAKineSys();
assert.ok(plano.hipoteses.findIndex(h=>h.id==='sobrecarga')<plano.hipoteses.findIndex(h=>h.id==='patelofemoral'),'o exame deve revisar a ordem da investigação');
assert.ok(plano.hipoteses.some(h=>h.id==='patelofemoral'),'achados negativos não devem apagar hipótese examinada');
const chave=env.window.KineSysMotorClinico3.chaveHipotese(plano.hipoteses.find(h=>h.id==='sobrecarga'));
// Não há UI montada no VM: descartar precisa continuar independente da leitura do exame.
env.document.querySelector=()=>null;env.document.dispatchEvent=()=>{};env.CustomEvent=function(tipo,init){this.type=tipo;this.detail=init.detail;};
assert.strictEqual(env.window.KineSysMotorClinico3.descartarHipotese(chave),true);
assert.ok(!env.window.gerarPlanoClinicoHMAKineSys().hipoteses.some(h=>h.id==='sobrecarga'),'exame positivo não deve ressuscitar hipótese descartada');
achados=[];
const anatomia=[
 ['cervical','Dor cervical que irradia pelo ombro até a mão.',['cervical','ombro','irradiacaoBraco','trajetoAlemCotovelo'],'Ombro',['cervical']],
 ['cervical','Dor cervical que irradia para a mão. Além disso, dor local no ombro ao elevar o braço.',['cervical','ombro','irradiacaoBraco'],'Ombro',['cervical','ombro']],
 ['lombar','Dor lombar irradiada para joelho e pé.',['lombar','joelho','irradiacaoPerna','trajetoAlemJoelhoLombar'],'Joelho',['lombar']],
 ['lombar','Dor lombar irradiada para perna. Além disso, dor anterior no joelho com agachamento.',['lombar','joelho','irradiacaoPerna'],'Joelho',['lombar','joelho']],
 ['cervical','Dor local no ombro ao elevar o braço, sem dor cervical.',['ombro'],'Ombro',['ombro']]
];
env.BANCO_MAPEAMENTO_CLINICO.cervical={nome:'Cervical',palavrasChave:['cervical'],clusters:[],diferenciais:[]};
env.BANCO_MAPEAMENTO_CLINICO.lombar={nome:'Lombar',palavrasChave:['lombar'],clusters:[],diferenciais:[]};
for(const [origem,hma,sinais,local,esperadas] of anatomia){
 historia=hma;leitura={local,sinais};contexto={};
 plano=env.window.gerarPlanoClinicoHMAKineSys();
 assert.deepStrictEqual(Array.from(plano.regioes,r=>r.id).sort(),esperadas.slice().sort(),hma);
}
// Origem estruturada explícita também prevalece sobre o destino, mesmo com leitura incompleta.
historia='Dor que desce pelo braço até a mão.';leitura={local:'Ombro',sinais:['ombro']};contexto={origemIrradiacao:'Cervical',irradiacao:'Ombro e mão'};
plano=env.window.gerarPlanoClinicoHMAKineSys();
assert.deepStrictEqual(Array.from(plano.regioes,r=>r.id),['cervical']);
console.log('Adaptive radar: anatomy, discriminative tests and nine recorded-exam patterns: OK');

// Integração com o analisador real e bancos reais, não apenas os stubs acima.
let hmaReal='';
const real={console,setTimeout:()=>0,clearTimeout(){},coletarContextoClinico:()=>({}),
 document:{readyState:'loading',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='paciente_hma'?{value:hmaReal}:id==='paciente_nome'?{value:'Fixture integração'}:null}};
real.window=real;
vm.createContext(real);
const core=source.replace(/\r\n/g,'\n'),inicio=core.lastIndexOf('(function () {',core.indexOf('var VERSAO_MOTOR_HMA')),fim=core.indexOf('/* ==========================================================================',inicio);
assert.ok(inicio>=0&&fim>inicio,'extrair o motor público real da HMA');
vm.runInContext(core.slice(core.indexOf('function kinesysDividirClausulasHMA'),core.indexOf('function confirmarLeituraHMAKineSys')),real);
const helpersPaciente=fs.readFileSync('src/patient/patient_form_helpers_core-1.0.0.js','utf8');
vm.runInContext(helpersPaciente.slice(helpersPaciente.indexOf('function removerAcentos'),helpersPaciente.indexOf('function obterTextoExibicao')),real);
vm.runInContext(core.slice(core.indexOf('const TERMOS_REGIAO_ESTRITOS'),core.indexOf('function analisarPadroesIrradiacao')),real);
vm.runInContext(core.slice(core.indexOf('function trechoDesdeUltimaQuebraNegacao'),core.indexOf('function detectarAlertasTextuaisHMA')),real);
vm.runInContext(core.slice(inicio,fim),real);
for(const arquivo of ['database/mapeamento_clinico.js','database/regioes/ombro-ext-1.0.0.js','src/clinical/clinical_semantic_graph-1.0.0.js','database/clinical_evidence_profiles-1.0.0.js','src/clinical/clinical_evidence_reasoning-1.0.0.js','src/clinical/clinical_reasoning_hma-3.0.0.js','src/clinical/clinical_reasoning_shoulder-3.1.0.js','src/clinical/clinical_reasoning_elbow-3.1.0.js','src/clinical/clinical_reasoning_cervical-3.1.0.js'])vm.runInContext(fs.readFileSync(arquivo,'utf8'),real);
const casosReais=[
 ['Dor cervical que desce pelo braço até a mão com dormência e fraqueza.','cervical'],
 ['Dor lombar que irradia para perna e pé com formigamento.','lombar'],
 ['Dor anterior no joelho ao agachar e subir escadas, sem travamento.','joelho'],
 ['Dor no joelho após torção, com travamento e dor na interlinha.','joelho'],
 ['Dor lateral no quadril, pior ao deitar sobre esse lado e subir escadas.','quadril'],
 ['Dor no calcanhar nos primeiros passos ao acordar.','tornozelo'],
 ['Dor lateral no cotovelo ao apertar e levantar objetos.','cotovelo'],
 ['Dormência noturna no polegar, indicador e médio da mão.','punho_mao'],
 ['Dor no ombro ao elevar o braço, sem dor no pescoço ou formigamento.','ombro'],
 ['Dor torácica em faixa com queimação e alteração de sensibilidade.','toracica']
];
for(const [hma,regiao] of casosReais){
 hmaReal=hma;assert.ok(real.analisarHMAClinicaKineSys(hma),'analisador real disponível');const p=real.gerarPlanoClinicoHMAKineSys();
 assert.ok(p.regioes.some(r=>r.id.includes(regiao)),`${hma}: regiões ${p.regioes.map(r=>r.id)}`);
 assert.ok(p.hipoteses.length&&p.exame.testesPrioritarios.length,`${hma}: deve orientar hipóteses e testes`);
 assert.ok(p.exame.testesPrioritarios.length<=9,'a lista prioritária não deve crescer com perguntas repetidas');
 assert.strictEqual(new Set(p.exame.testesPrioritarios.map(t=>t.texto.toLowerCase())).size,p.exame.testesPrioritarios.length);
 assert.ok(p.exame.testesPrioritarios.every(t=>t.hipoteseIds?.length),`${hma}: testes sem vínculo ${p.exame.testesPrioritarios.filter(t=>!t.hipoteseIds?.length).map(t=>t.texto)}`);
}
console.log('Full real HMA → regional banks → adaptive radar integration: 10/10 conditions OK');
let examesReais=[];
real.coletarAchadosLaudoKineSys=()=>examesReais;
for(const [hma] of casosReais){
 hmaReal=hma;examesReais=[];const base=real.gerarPlanoClinicoHMAKineSys();
 const h=base.hipoteses.find(h=>h.testes.length);assert.ok(h,'hipótese deve conter verificações registráveis');
 for(const resultado of ['positivo','negativo','inconclusivo']){
  examesReais=[{id:h.id,regiaoId:h.regiaoId,grupo:h.grupo,achados:Array.from(h.testes,texto=>({texto,resultado}))}];
  const atualizado=real.gerarPlanoClinicoHMAKineSys().hipoteses.find(x=>x.id===h.id&&x.regiaoId===h.regiaoId);
  assert.ok(atualizado,'um exame registrado não pode desaparecer');
  assert.strictEqual(atualizado.exameAtual.respondidos,h.testes.length,`${hma}: vínculo canônico do exame ${resultado}`);
 }
}
console.log('Real-bank recorded findings linkage: 30/30 positive, negative and inconclusive combinations OK');
// O cache deve ser invalidado apenas quando os dados mudarem, inclusive exames.
leitura={local:'Joelho',sinais:[]};contexto={};historia='Dor anterior no joelho com dor no agachamento e dor nas escadas.';
achados=[examinar('patelofemoral',['positivo','positivo'])];
env.window.KineSysMotorClinico3.atualizar(true);
achados=[examinar('patelofemoral',['negativo','negativo'])];
assert.strictEqual(env.window.KineSysMotorClinico3.atualizar().hipoteses.find(h=>h.id==='patelofemoral').exameAtual.situacao,'achados_desfavoraveis','resultado alterado precisa invalidar o cache');
env.window.obterEstadoRegiao=()=>({hipotesesDescartadas:['cluster::patelofemoral']});
assert.ok(!env.window.gerarPlanoClinicoHMAKineSys().hipoteses.some(h=>h.id==='patelofemoral'),'restaurar rascunho deve conservar hipótese descartada');

// Biblioteca científica: reconhecimento real, negações e conexão com os achados canônicos.
examesReais=[];
for(const arquivo of ['database/regioes/quadril-ext-1.0.0.js','database/regioes/tornozelo_pe-ext-1.0.0.js'])vm.runInContext(fs.readFileSync(arquivo,'utf8'),real);
const casosCientificos=[
 ['Síndrome de encarceramento do escapular dorsal.','neuropatia_dorsal_escapular'],
 ['Dor na borda medial da escápula com fraqueza dos romboides e retração escapular fraca.','neuropatia_dorsal_escapular'],
 ['Lesão do nervo torácico longo com escápula alada e fraqueza do serrato anterior.','neuropatia_toracico_longo'],
 ['Ombro caído após biópsia cervical, com fraqueza e atrofia do trapézio.','neuropatia_acessorio_espinal'],
 ['Dor intensa no ombro seguida de fraqueza, hipótese de Parsonage Turner.','amiotrofia_neuralgica'],
 ['Escápula crepitante com crepitação dolorosa e estalido doloroso na escápula.','sindrome_escapula_crepitante'],
 ['Síndrome glútea profunda, dor profunda glútea que piora sentado.','deep_gluteal'],
 ['Queimação na planta do pé com parestesia plantar e dor no maléolo medial.','tunel_tarsal_neural']
];
for(const [hma,id] of casosCientificos){
 hmaReal=hma;examesReais=[];const p=real.gerarPlanoClinicoHMAKineSys(),h=p.hipoteses.find(h=>h.id===id);
 assert.ok(h,`${hma}: faltou ${id}; atuais ${p.hipoteses.map(h=>h.id)}`);
 assert.ok(h.item.evidencia&&h.item.nivelEvidencia,'fontes e limitações precisam acompanhar o item');
 assert.ok(!h.item.limiar&&!h.item.regraConfirmacao,'neuropatia não recebe cluster confirmatório inventado');
 examesReais=[{id:h.id,regiaoId:h.regiaoId,grupo:h.grupo,achados:h.testes.map(texto=>({texto,resultado:'positivo'}))}];
 const revisto=real.gerarPlanoClinicoHMAKineSys().hipoteses.find(x=>x.id===id);
 assert.strictEqual(revisto.exameAtual.respondidos,h.testes.length,'novos exames precisam integrar os resultados e o laudo');
}
examesReais=[];hmaReal='Dor no ombro ao elevar o braço. Nega encarceramento do nervo escapular dorsal. Nega fraqueza dos romboides.';
assert.ok(!real.gerarPlanoClinicoHMAKineSys().hipoteses.some(h=>h.id==='neuropatia_dorsal_escapular'),'nome negado não deve promover a hipótese');
hmaReal='Dor no joelho ao agachar. Minha mãe tem encarceramento do nervo escapular dorsal.';
assert.ok(!real.gerarPlanoClinicoHMAKineSys().hipoteses.some(h=>h.id==='neuropatia_dorsal_escapular'),'condição familiar não é hipótese do paciente');
const gtpsReal=vm.runInContext('BANCO_MAPEAMENTO_CLINICO.quadril.clusters.find(x=>x.id==="gtps")',real);
assert.deepStrictEqual(Array.from(gtpsReal.regraConfirmacao.obrigatorios),[0,1],'a combinação publicada não equivale a quaisquer dois testes');
vm.runInContext(core.slice(core.indexOf('const KINESYS_META_CRITERIOS_2'),core.indexOf('function grupoDoItemKineSys')),real);
vm.runInContext(core.slice(core.indexOf('function grupoDoItemKineSys'),core.indexOf('function calcularSuficienciaInvestigacaoKineSys')),real);
const estadoGTPS={resultados:{}};
real.obterEstadoRegiao=()=>estadoGTPS;
function preencherGTPS(respostas){estadoGTPS.resultados={};respostas.forEach((r,i)=>estadoGTPS.resultados[`cluster::gtps::${i}`]=r);return real.avaliarCluster('quadril',gtpsReal);}
assert.strictEqual(preencherGTPS(['positivo','positivo','','']),'positivo','palpação e abdução resistida concordantes sustentam a combinação estudada');
assert.notStrictEqual(preencherGTPS(['negativo','negativo','positivo','positivo']),'positivo','dois itens acessórios não substituem os testes estudados');
assert.notStrictEqual(preencherGTPS(['positivo','inconclusivo','positivo','positivo']),'positivo','abdução inconclusiva não equivale a positiva');
console.log('Scientific library integration: eight patterns + negation, family attribution and published cluster boundaries OK');
