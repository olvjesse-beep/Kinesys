'use strict';
// Casos sintéticos, sem importar dados clínicos/pessoais de produção.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/clinical/evaluation_workspace-1.17.0.js','utf8').replace(/\r\n/g,'\n');
function field(id,value,type='text'){return {id,value,type,tagName:'INPUT',disabled:false,labels:[{textContent:id,querySelector:()=>null}],classList:{contains:()=>false},closest:()=>null};}
function tag(value){return {textContent:value+'✕',cloneNode(){const copy={textContent:value+'remover✕',querySelectorAll:()=>[{remove(){copy.textContent=value;}}]};return copy;}};}
function fixture(){
 const fields=[field('paciente_nome','Paciente Exemplo'),field('paciente_idade','38'),field('paciente_hma','Pacient erelata que no dia 3 de maio a mesma relata que sentiu dor no pescoço para o ombro, a mesma relata que a dor não passou a mesma relata que a dor irradiou para escapula. A memsa relata que fez mais de um mês a dor. Nega dormencia no braço direito. Paciente relata que a dor acorda a mesma anoite. Refere piora ao dormir e dor de 3.5/10.','textarea')];
 const nodes=Object.fromEntries(fields.map(f=>[f.id,f]));nodes['ks-laudo-texto']={value:''};nodes['ks-laudo-status']={textContent:''};nodes['ks-laudo-revisado']={checked:false};nodes.avaliacao_realizado_em={value:'2026-10-21T09:00'};
 nodes.tags_cirurgias={children:[tag('Procedimento A'),tag('Procedimento B')],textContent:'Procedimento A✕Procedimento B✕'};
 nodes.tags_medicamentos={children:[tag('Medicamento A (genérico / marca)'),tag('Medicamento B'),tag('Medicamento C')],textContent:'Medicamento A✕Medicamento B✕Medicamento C✕'};
 const notes={contexto_saude_observacao:'Condição prévia relatada, sem documentação adicional',contexto_cirurgia_regiao:'joelho esquerdo',contexto_cirurgia_data:'2018',contexto_trauma_observacao:'Trauma antigo no tornozelo, sem cirurgia',contexto_medicamento_observacao:'Uso informado de 25 mg à noite; sem alteração de dose registrada',contexto_trabalho_tarefa:'organizar materiais',contexto_trabalho_tempo:'2 horas/dia',contexto_trabalho_frequencia:'semanal',contexto_trabalho_observacao:'Alterna pausas de 10 minutos'};
 const context={versao:1,estados:{saude:'relata',cirurgias:'relata',medicamentos:'relata',trabalho:'relata',atividade:'nega',exames:'nao_informado'},campos:notes};
 let tests=[{regiaoId:'cervical',regiao:'Coluna cervical',id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',achados:[{texto:'Spurling / compressão foraminal reproduz sintomas radiculares típicos',resultado:'positivo'},{texto:'Distração cervical reduz sintomas radiculares',resultado:'positivo'},{texto:'ULTT1 / teste neurodinâmico do nervo mediano compatível com os sintomas',resultado:'positivo'}]}];
 const regions=[{dataset:{regiao:'cervical'}},{dataset:{regiao:'cefaleia'}}];
 const c={console,usuarioLogado:{nome:'Profissional Exemplo',registro:'CREFITO-TESTE'},BANCO_MAPEAMENTO_CLINICO:{cervical:{nome:'Coluna cervical'},cefaleia:{nome:'Cabeça / Cefaleia — triagem'}},window:{coletarAchadosLaudoKineSys:()=>tests,validarSegurancaParaFinalizacao:()=>({ok:true}),KineSysContextoAnamnese:{coletar:()=>context},KineSysMotorClinico3:{ultimoPlano:{versao:'sintética',hipoteses:[{id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',regiaoId:'cervical',limiar:3}],exame:{testesPrioritarios:[]}}}},document:{readyState:'loading',addEventListener(){},querySelectorAll:s=>s.startsWith('#subtela_triagem')?fields:s==='#grupo_regioes_mapeamento input:checked'?regions:[],getElementById:id=>nodes[id]||null},gerarSinteseMapeamento:()=>({resumoPorRegiao:[{regiao:'Coluna cervical',codigoHipotese:'radiculopatia_cervical',nomeHipotese:'Radiculopatia Cervical',nivel:'positivo',redFlags:[]}],segurancaGlobal:{pistasGlobais:[]}}),coletarRestricoesPosOperatorias:()=>({ativo:false})};
 vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('\n\n/* Product Design')),c);
 const render=()=>{c.window.preencherLaudoAvaliacaoKineSys(null);c.window.renderizarLaudoAvaliacaoKineSys();return c.window.coletarLaudoAvaliacaoKineSys();};
 return {c,fields,nodes,context,regions,notes,render,set tests(value){tests=value;}};
}
const t=fixture(),original=t.fields[2].value,report=t.render(),text=report.texto;
assert.equal(t.fields[2].value,original,'compositor nunca altera a HMA original');
for(const s of ['Procedimento A e Procedimento B','Medicamento A (genérico / marca), Medicamento B e Medicamento C','25 mg à noite','joelho esquerdo','2018','Trauma antigo no tornozelo','2 horas/dia','semanal','10 minutos','Nega dormência no braço direito','3.5/10','piora ao dormir'])assert(text.includes(s),s);
assert(!/Medicamento BMedicamento|Pacient erelata|memsa|anoite|Spurling\s*\/|ULTT1\s*\/|\b[aAoO]\. Mesm[ao]|\bMesma Refere/.test(text));
assert(text.includes('teste de Spurling (compressão foraminal cervical) reproduziu'));
assert(text.includes('A distração cervical reduziu'));assert(text.includes('teste neurodinâmico do nervo mediano (ULTT1) foi positivo'));
assert(text.includes('não estabelecem diagnóstico definitivo isoladamente'));
assert(text.includes('Cabeça / Cefaleia — triagem, mas não há resultados de exame registrados'));
assert(!text.includes('Nega cefaleia'));assert.deepEqual(Array.from(report.validacao.regioesPendentes),['Cabeça / Cefaleia — triagem']);
assert.equal(report.validacao.contextoAusente.length,0);assert.equal(report.validacao.listasAusentes.length,0);assert.equal(report.validacao.relatoAusente.length,0);assert.equal(report.validacao.testesAusentes.length,0);
assert(t.nodes['ks-laudo-status'].textContent.includes('Regiões sem resultados: Cabeça'));
assert(text.includes('Informou não praticar atividade física'));assert(!text.includes('Não informado'),'ausência de dado não vira negativa nem preenchimento automático');
// A mesma fonte de fatos alimenta cópia/salvamento/reabertura do JSON do laudo.
t.c.window.preencherLaudoAvaliacaoKineSys(JSON.parse(JSON.stringify(report)));t.c.window.renderizarLaudoAvaliacaoKineSys();assert.equal(t.nodes['ks-laudo-texto'].value,text);assert.equal((text.match(/Data de emissão:/g)||[]).length,1);
// A edição profissional não é sobrescrita ao incluir um novo dado na avaliação.
t.c.window.preencherLaudoAvaliacaoKineSys({...report,texto:'Redação profissional preservada.',textoAutomatico:false,revisado:false});t.notes.contexto_trabalho_observacao='Nova informação';t.c.window.renderizarLaudoAvaliacaoKineSys();assert(t.nodes['ks-laudo-texto'].value.startsWith('Redação profissional preservada.'));assert(t.nodes['ks-laudo-status'].textContent.includes('Seu texto foi preservado'));
// Campos futuros sem regra de integração têm aviso explícito, não omissão silenciosa.
t.notes.contexto_novo='Novo detalhe sintético';const future=t.render();assert(future.validacao.contextoAusente.includes('contexto novo'));assert(t.nodes['ks-laudo-status'].textContent.includes('Dados não incorporados'));
// Relato vazio e negativa contraditória têm significados distintos.
delete t.notes.contexto_novo;t.notes.contexto_saude_observacao='';const missing=t.render();assert(missing.validacao.contextoPendente.some(x=>x.includes('Saúde e hábitos')));
t.context.estados.medicamentos='nega';const conflict=t.render();assert(!conflict.texto.includes('Negou uso dos medicamentos'));assert(conflict.validacao.contextoPendente.some(x=>x.includes('negativa conflita')));
// Expressão ambígua não é convertida em fato presumido; esclarecimento é local ao caso.
t.fields[2].value='Refere que o pior período de dor é ao dor. Nega perda de força.';const ambiguous=t.render();assert(ambiguous.validacao.trechosParaConferir.length);assert(ambiguous.texto.includes('ao dor'));assert(!ambiguous.texto.includes('ao dormir'));assert(ambiguous.texto.includes('Nega perda de força'));
t.fields[2].value='Nega que a mesma relata dor durante o movimento.';const neg=t.render();assert(!neg.texto.includes('Nega que.'));assert(neg.texto.includes('Nega que'));
// Sem resultado de exame, não inventar um relatório completo.
t.tests=[];assert.equal(t.render().modo,'incompleto');assert.equal(t.nodes['ks-laudo-texto'].value,'');
console.log('Avaliação→relatório: contexto completo, listas, prosa cervical, regiões pendentes, JSON, texto manual, negativa/ausência/ambiguidade e original preservado OK.');
if(process.env.KINESYS_REPORT_EXAMPLE==='1')console.log(text);
module.exports={fixture};
