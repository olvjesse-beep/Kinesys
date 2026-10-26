'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/clinical/evaluation_context_panels-1.18.3.js','utf8');
const html=fs.readFileSync('screens/tela_avaliacao.html','utf8');
const css=fs.readFileSync('styles/design_evaluation_context-1.18.3.css','utf8');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const keys=['saude','cirurgias','medicamentos','exames','trabalho','atividade','psicossocial'];
for(const key of keys)assert.equal((html.match(new RegExp('data-context-key="'+key+'"','g'))||[]).length,1,key+' must have one canonical panel');
for(const id of ['paciente_esporte','input_cirurgia','input_medicamento','tags_cirurgias','tags_medicamentos'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'no duplicate '+id);
assert.match(css,/#tela_avaliacao \.box-sugestoes\{position:relative!important/,'inline suggestions must not be clipped by modal footer');
assert.match(core,/contextoAnamnese:window\.KineSysContextoAnamnese\?\.coletar\(\)/);
assert.match(core,/window\.KineSysContextoAnamnese\?\.preencher\(d\.contextoAnamnese\|\|\{\}\)/);
assert.match(core,/window\.KineSysContextoAnamnese\?\.limpar\(\)/,'new evaluation must clear previous patient context');
assert.match(fs.readFileSync('src/clinical/evaluation_workspace-1.17.0.js','utf8'),/dataset\?\.contextUi==='true'/,'UI radios must not leak into report prose');
const nodes={},events={},intervals=new Set();let nextTimer=0;
const makeField=(id,value='',type='text')=>({id,value,type,tagName:'INPUT',dataset:{},checked:false,closest:()=>({querySelector:()=>({textContent:id})})});
const panels=keys.map(key=>{const fields=[],tags=[],conditional={hidden:true};return {key,fields,tags,conditional,details:{hidden:true,querySelectorAll(selector){if(selector==='input,select,textarea')return fields;if(selector.includes(' > *'))return tags;if(selector.includes('data-context-condition'))return [conditional];if(selector==='#tags_cirurgias,#tags_medicamentos')return [{replaceChildren(){tags.length=0;}}];return [];},querySelector(){return null;}},radios:['nao_informado','nega','relata'].map(value=>({value,checked:value==='nao_informado'})),button:{classList:{toggle(){}},setAttribute(k,v){this[k]=v;},focus(){}},body:{hidden:false},status:{textContent:''},message:{textContent:''}};});
const extra=makeField('contexto_trabalho_tarefa');panels[4].fields.push(extra);
const extraDetails={open:false,querySelectorAll:()=>[extra]};
const card={querySelectorAll:selector=>selector==='details.context-extra'?[extraDetails]:[extra]},screen={classList:{contains:()=>true}};
const env={console,window:{},document:{readyState:'loading',visibilityState:'visible',getElementById:id=>nodes[id]||null,addEventListener(k,fn){events[k]=fn;}},setInterval(fn){const id=++nextTimer;intervals.add(id);return id;},clearInterval(id){intervals.delete(id);}};
// Test-only access to private state; production contains no debug hooks.
vm.runInNewContext(source.replace('window.KineSysContextoAnamnese={','window.contextTest={set(p,c,s){paineis=p;card=c;avaliacaoAtivaRef=s;},abrir,abrirAnalise,atualizar,mudarEstado,estado,iniciarSincronizacaoContexto,pararSincronizacaoContexto};window.KineSysContextoAnamnese={'),env);
const api=env.window.KineSysContextoAnamnese,t=env.window.contextTest;t.set(panels,card,screen);
api.preencher();assert.equal(panels[0].status.textContent,'Não informado');
const imagingDefault=makeField('exames_imagem_fonte','relato');panels[3].fields.push(imagingDefault);t.atualizar(panels[3]);assert.equal(panels[3].status.textContent,'Não informado','default source is not an exam');
const exposure=makeField('exposicao','sedestacao','checkbox');panels[4].fields.push(exposure);exposure.checked=true;t.atualizar(panels[4]);
assert.equal(t.estado(panels[4]),'relata');assert.equal(panels[4].conditional.hidden,false);
extra.value='Atividade registrada';assert.equal(t.mudarEstado(panels[4],'nega'),false);assert.equal(exposure.checked,true);assert.equal(extra.value,'Atividade registrada');assert.match(panels[4].message.textContent,/nenhum dado foi apagado/);
t.abrir(panels[4]);t.abrir(panels[1]);assert.equal(exposure.checked,true,'switching panels cannot clear data');assert.equal(panels.filter(p=>!p.details.hidden).length,1);
assert.equal(t.mudarEstado(panels[0],'nega'),true);assert.equal(panels[0].body.hidden,true);assert.equal(panels[0].status.textContent,'Nega os itens investigados');
const saved=JSON.parse(JSON.stringify(api.coletar()));assert.equal(saved.estados.saude,'nega');assert.equal(saved.campos.contexto_trabalho_tarefa,'Atividade registrada');
saved.futureProperty={preserve:true};saved.campos.futureField='original';api.preencher(saved);const reopened=JSON.parse(JSON.stringify(api.coletar()));assert.equal(reopened.futureProperty.preserve,true);assert.equal(reopened.campos.futureField,'original');assert.equal(reopened.estados.saude,'nega');assert.equal(extra.value,'Atividade registrada');assert.equal(extraDetails.open,true,'saved optional details must reopen visibly');
panels[1].tags.push({textContent:'Cirurgia confirmada'});panels[2].tags.push({textContent:'Medicamento confirmado'});
nodes.input_cirurgia=makeField('input_cirurgia','old query');nodes.input_medicamento=makeField('input_medicamento','old query');nodes.origem_informacao_clinica=makeField('origem_informacao_clinica','documento');
api.limpar();assert.equal(exposure.checked,false);assert.equal(extra.value,'');assert.equal(panels[1].tags.length,0);assert.equal(panels[2].tags.length,0);assert.equal(nodes.input_medicamento.value,'');assert.equal(nodes.origem_informacao_clinica.value,'relato_paciente');assert.equal(api.coletar().futureProperty,undefined,'new patient cannot inherit previous context');
for(let i=0;i<10;i++){t.iniciarSincronizacaoContexto();t.iniciarSincronizacaoContexto();assert.equal(intervals.size,1);events['kinesys:tela-desativada']({detail:{id:'tela_avaliacao'}});assert.equal(intervals.size,0);}
t.iniciarSincronizacaoContexto();env.document.visibilityState='hidden';events.visibilitychange();assert.equal(intervals.size,0);env.document.visibilityState='visible';events.visibilitychange();assert.equal(intervals.size,1);
console.log('Model 2 context: canonical fields, meaningful summaries, state roundtrip, non-destructive navigation, patient reset and timer lifecycle OK');

// Execute the real persistence hooks with an in-memory document, not a database.
const functions=['coletarClinicaEstruturada','limparClinicaEstruturada','preencherClinicaEstruturada'].map(name=>{const match=core.match(new RegExp('function '+name+'\\([^\\n]+'));assert.ok(match,name+' remains testable');return match[0];}).join('\n');
const persistence={window:env.window,document:env.document,clinicaEstruturadaPreservada:{},coletarRestricoesPosOperatorias:()=>({}),preencherRestricoesPosOperatorias(){},atualizarVisibilidadeRestricoesPosOp(){},atualizarPSFSMedia(){}};
vm.runInNewContext(functions,persistence);
const payload={unknownExistingField:{keep:true},contextoAnamnese:{versao:1,estados:{saude:'nega'},campos:{contexto_trabalho_tarefa:'Trabalho informado'}}};
persistence.preencherClinicaEstruturada(payload);const collected=JSON.parse(JSON.stringify(persistence.coletarClinicaEstruturada()));
assert.equal(collected.unknownExistingField.keep,true);assert.equal(collected.contextoAnamnese.estados.saude,'nega');assert.equal(collected.contextoAnamnese.campos.contexto_trabalho_tarefa,'Trabalho informado');
persistence.preencherClinicaEstruturada({});assert.equal(extra.value,'');assert.equal(persistence.coletarClinicaEstruturada().contextoAnamnese.estados.saude,'nao_informado');
console.log('Real structured-clinical save/reopen hooks preserve new context and legacy payload; empty patient clears previous state OK');

// EVA executa os helpers e a normalização reais: ausência não pode virar zero.
const evaNodes={};for(const id of ['eva_slider','eva_valor','context_state_dor_relata','context_state_dor_nao_informado','avaliacao_realizado_em','avaliacao_eva_previa','avaliacao_eva_analise'])evaNodes[id]={value:'',checked:false,disabled:false,dataset:{},textContent:'',setAttribute(k,v){this[k]=v;},addEventListener(){}};
evaNodes.eva_slider.value='0';evaNodes.eva_slider.disabled=true;evaNodes.context_state_dor_nao_informado.checked=true;evaNodes.avaliacao_realizado_em.value='2026-10-26T09:00';
const evaEnv={document:{getElementById:id=>evaNodes[id]||null},console};evaEnv.window=evaEnv;
vm.createContext(evaEnv);const helper=fs.readFileSync('src/ui/input_helpers_core-1.0.0.js','utf8');vm.runInContext(helper.slice(0,helper.indexOf('const sliderEvo =')),evaEnv);
assert.equal(evaEnv.obterEvaAvaliacaoKineSys(),null);
for(const valor of [0,6,10,null,undefined,'',-1,11]){evaEnv.preencherEvaAvaliacaoKineSys(valor);const esperado=typeof valor==='number'&&valor>=0&&valor<=10?valor:null;assert.equal(evaEnv.obterEvaAvaliacaoKineSys(),esperado);assert.equal(evaNodes.eva_slider.disabled,esperado===null);}
evaEnv.preencherEvaAvaliacaoKineSys(6);evaNodes.context_state_dor_relata.checked=false;evaEnv.atualizarEvaAvaliacaoKineSys();assert.equal(evaEnv.obterEvaAvaliacaoKineSys(),null);assert.equal(Number(evaNodes.eva_slider.value),6,'desmarcar não apaga o valor da interface');
env.window.obterEvaAvaliacaoKineSys=evaEnv.obterEvaAvaliacaoKineSys;env.window.preencherEvaAvaliacaoKineSys=evaEnv.preencherEvaAvaliacaoKineSys;
evaEnv.preencherEvaAvaliacaoKineSys(7);const comEva=JSON.parse(JSON.stringify(api.coletar()));assert.equal(comEva.dorAvaliacao.valor,7);evaEnv.preencherEvaAvaliacaoKineSys(null);api.preencher(comEva);assert.equal(evaEnv.obterEvaAvaliacaoKineSys(),7);api.limpar();assert.equal(evaEnv.obterEvaAvaliacaoKineSys(),null,'trocar paciente limpa a EVA');
const normEnv={console};vm.createContext(normEnv);vm.runInContext(fs.readFileSync('src/patient/patient_data_normalization_core-1.0.0.js','utf8'),normEnv);
for(const valor of [null,0,6,10])assert.equal(normEnv.normalizarPacienteDoBanco({id:'qa',avaliacoes:[{eva_inicial:valor}]}).avaliacoes[0].evaInicial,valor);
assert.match(core,/eva_inicial: av\.evaInicial !== undefined \? av\.evaInicial/,'transporte não pode converter ausência em zero');
assert.match(core,/evaInicial:window\.obterEvaAvaliacaoKineSys\?\.\(\) \?\? null/,'salvamento usa o mesmo valor canônico da interface');
assert.match(core,/window\.atualizarEvaAvaliacaoKineSys\?\.\(\);\s+sincronizarBuscaPacientePreCadastro/,'restauração de rascunho atualiza estado e prévia');
assert.equal((html.match(/id="eva_slider"/g)||[]).length,1);assert(html.indexOf('id="eva_slider"')>html.indexOf('Antecedentes e fatores modificadores'));
assert(html.indexOf('id="ks_radar_context_host"')>html.indexOf('data-context-key="psicossocial"'));
console.log('EVA: nula/zero/valores extremos, normalização, ida e volta no JSON, limpeza entre pacientes e transporte real OK');

const home=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
const extrair=(src,start,end)=>{const i=src.indexOf(start),j=src.indexOf(end,i+start.length);assert(i>=0&&j>i,start);return src.slice(i,j);};
const chartEnv={};vm.createContext(chartEnv);
vm.runInContext(extrair(home,'    function dataRegistro(','    // Somente fontes')+extrair(home,'    function evolucoesPaciente(','    function formatarDiaMes(')+extrair(home,'    function numeroClinico(','    function garantirDialogAnaliseEvolucao('),chartEnv);
const registro={id:'qa',clinica_id:'c1',avaliacoes:[{id:'a1',paciente_id:'qa',evaInicial:6,status:'finalizada',dataAvaliacao:'2026-10-26'},{id:'a2',evaInicial:8,status:'rascunho',dataAvaliacao:'2026-10-25'},{id:'a3',evaInicial:null,status:'finalizada',dataAvaliacao:'2026-10-23'}],evolucoes:[{id:'e1',paciente_id:'qa',clinica_id:'c1',eva:0,data:'2026-10-27'},{id:'e2',eva:null,data:'2026-10-28'},{id:'e3',paciente_id:'outro',eva:10,data:'2026-10-29'},{id:'e4',clinica_id:'outra',eva:10,data:'2026-10-30'}]};
const pontos=JSON.parse(JSON.stringify(chartEnv.pontosEvolucaoPaciente(registro)));assert.deepEqual(pontos.map(p=>p.eva),[6,0]);assert.deepEqual(pontos.map(p=>p.tipo),['Avaliação','Evolução']);
const transporte=extrair(core,'                const avData = {','                const { error: avError }');
for(const valor of [null,0,6]){const x={av:{id:'a1',evaInicial:valor},id:'qa',usuarioLogado:null};vm.runInNewContext(transporte+'resultado=avData;',x);assert.equal(x.resultado.eva_inicial,valor);assert.equal(normEnv.normalizarPacienteDoBanco({id:'qa',avaliacoes:[x.resultado]}).avaliacoes[0].evaInicial,valor);}
console.log('Gráfico e payload: EVA inicial e evolução zero, ausência e rascunho excluídos, isolamento por paciente/clínica e roundtrip de transporte OK');

assert.equal(normEnv.normalizarPacienteDoBanco({id:'qa',avaliacoes:[{evaInicial:null,eva_inicial:8}]}).avaliacoes[0].evaInicial,null,'nulo explícito não recupera coluna legada');

(async()=>{
 let contexto={pacienteId:'qa-a',clinicaId:'c1',avaliacaoId:'a1',revisao:1},resolve,aberturas=0;
 nodes.tela_avaliacao=screen;nodes.avaliacao_eva_status={textContent:''};
 env.window.obterContextoAvaliacaoKineSys=()=>({...contexto});env.window.KineSysAnaliseEvolucao={abrir(){aberturas++;}};
 for(const tipo of ['pacienteId','clinicaId','avaliacaoId','revisao']){
  contexto={pacienteId:'qa-a',clinicaId:'c1',avaliacaoId:'a1',revisao:1};env.obterPacienteCompletoPorId=()=>new Promise(r=>resolve=r);
  const pending=t.abrirAnalise();contexto[tipo]='outro';resolve({id:'qa-a',nome:'Paciente sintético'});await pending;assert.equal(aberturas,0,'resposta antiga de '+tipo+' não abre outro prontuário');
 }
 contexto={pacienteId:'qa-a',clinicaId:'c1',avaliacaoId:'a1',revisao:2};env.obterPacienteCompletoPorId=async()=>({id:'qa-a',nome:'Paciente sintético'});await t.abrirAnalise();assert.equal(aberturas,1);
 env.obterPacienteCompletoPorId=async()=>{throw Error('offline');};await t.abrirAnalise();assert.match(nodes.avaliacao_eva_status.textContent,/Tente novamente/);assert.equal(aberturas,1);
 console.log('Análise da avaliação: isolamento de respostas atrasadas por paciente, clínica, avaliação e revisão; recuperação de falha OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
