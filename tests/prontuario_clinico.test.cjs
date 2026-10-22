const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/patient/prontuario_export_impl.js','utf8');
function fixture(){
 const p={id:'p1',clinica_id:'c1',nome:'Paciente de teste',idade:'40',profissao:'Atividade sintética',avaliacoes:[],evolucoes:[]};
 const fonte={campos:{yellow_flags_observacao:'Preocupação com o retorno às tarefas'},gruposAnamnese:{exposicoesOcupacionais:['Exposição confirmada']},achados:[{regiao:'Coluna cervical',achados:[{texto:'Movimento cervical concordante',resultado:'positivo'},{texto:'Teste neurológico',resultado:'negativo'},{texto:'Teste não realizado',resultado:'nao_avaliado'}]}],fingerprint:'INTERNAL_FINGERPRINT',plano:{raciocinio:{origemHMA:'INTERNAL_ORIGIN'}}};
 p.avaliacoes=[{id:'a1',paciente_id:'p1',dataAvaliacao:'2026-10-21',realizadoEm:'2026-10-21T09:00',status:'finalizada',tipo:'Avaliação inicial',profissionalNome:'Profissional de teste',profissionalRegistro:'REG-TESTE',hma:'Relato original preservado.\nSegunda linha da entrevista.',evaInicial:3,comorbidades:{hipertenso:true,diabetico:false},cirurgias:[{texto:'Artrodese lombar L4-L5'}],medicamentos:[{texto:'Uso relatado, sem prescrição'}],mapeamento:{detalhes:{coluna:{modoDirecao:'auto',fingerprint:'INTERNAL_CACHE'}},resumoPorRegiao:[{regiao:'Coluna cervical',textoDocumento:'Síntese do exame registrada, sem novo diagnóstico.',redflagConduta:'Orientação registrada'}],clinicaEstruturada:{contextoAnamnese:{estados:{saude:'relata',cirurgias:'relata',atividade:'nega'},campos:{contexto_trauma_observacao:'Limitação funcional documentada',contexto_medicamento_observacao:'Dose relatada: preservar',contexto_cirurgia_data:'2021'}},examesImagem:{descricao:'Descrição do laudo apresentado',fonte:'laudo_conferido'},medidasObjetivas:[{nome:'Amplitude',valor:80,unidade:'graus'}],psfs:{itens:[{atividade:'Vestir-se',pontuacao:4}]},objetivosPlano:{objetivos:[{texto:'Meta funcional registrada'}]},laudo:{contextoPaciente:{pacienteId:'p1'},texto:'RELATÓRIO SALVO\n\nTexto manual <script>sem execução</script>\nData e assinatura originais.',revisado:false,fonte:JSON.stringify(fonte)}}}}];
 p.evolucoes=[{id:'e1',paciente_id:'p1',data:'2026-10-20',realizadoEm:'2026-10-20T09:00',profissionalNome:'Profissional de teste',relatoLivre:'Sessão antiga: conduta documentada',eva:5,dadosEstruturados:{estadoClinico:'igual',mudancasDetalhes:{novaIntercorrencia:'Intercorrência antiga'},respostaCarga:{rpe:4,dor24h:3}}},{id:'e2',paciente_id:'p1',data:'2026-10-22',realizadoEm:'2026-10-22T09:00',profissionalNome:'Profissional de teste',relatoLivre:'Sessão recente: conduta documentada',eva:2,dadosEstruturados:{estadoClinico:'melhor',mudancasDetalhes:{novoExame:'Novo laudo preservado',novaIntercorrencia:'Nova intercorrência preservada',mudancaMedicacao:'Mudança de medicamento preservada',novoAlerta:'Alerta e orientação preservados'},respostaCarga:{dorDurante:2,dor24h:3,rpe:5,duracaoMin:50}}}];
 return p;
}
function setup(){
 const writes=[],alerts=[];let patients=[fixture()],pending=null;
 const popup={closed:false,document:{open(){},write:s=>writes.push(s),close(){}},focus(){}};
 const ctx={console,Date,JSON,Map,Set,usuarioLogado:{id:'u1',tipo:'FISIOTERAPEUTA',clinica_id:'c1',nome:'Profissional de teste',registro:'REG-TESTE'},document:{createElement:()=>({textContent:''}),head:{appendChild(){}}},alert:s=>alerts.push(s),window:{open:()=>popup,obterPacientesSalvos:async()=>pending||patients,telaPermitida:()=>true}};
 vm.runInNewContext(source.replace('window.gerarProntuarioCompletoPDF=gerar;','window.__test={montarDocumento,conteudoClinicoAvaliacao};window.gerarProntuarioCompletoPDF=gerar;'),ctx);
 return {ctx,writes,alerts,popup,set patients(v){patients=v;},set pending(v){pending=v;}};
}
async function run(){
 const t=setup(),p=fixture(),before=JSON.stringify(p),render=t.ctx.window.__test.montarDocumento;
 const html=render(p,[],'simplificado');assert.equal(JSON.stringify(p),before);
 for(const text of ['Relato original preservado','Artrodese lombar L4-L5','Dose relatada: preservar','Descrição do laudo apresentado','Síntese do exame registrada','Movimento cervical concordante','Teste neurológico','Negativo','Amplitude','Vestir-se','Meta funcional registrada','Nova intercorrência preservada','Novo laudo preservado','Alerta e orientação preservados','Mudança de medicamento preservada','REG-TESTE'])assert(html.includes(text),text);
 for(const internal of ['INTERNAL_FINGERPRINT','INTERNAL_CACHE','INTERNAL_ORIGIN','Modo Direcao','Apêndice técnico','&quot;ctx&quot;'])assert(!html.includes(internal),'Não expor cache interno: '+internal);
 assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('Diabetico'),'Checkbox não marcado não vira negativa clínica');
 assert(html.includes('Negativa explicitamente registrada'),'Negativa explícita deve ser preservada');
 const detailed=render(p,[],'detalhado');assert(detailed.includes('Apêndice técnico'));assert(detailed.includes('INTERNAL_CACHE'));assert(detailed.includes('Trilha de alterações'));
 const evol=render(p,[],'evolucoes');assert(!evol.includes('Relato original preservado'));assert(evol.includes('somente leitura'));assert(evol.indexOf('Sessão recente')<evol.indexOf('Sessão antiga'));
 const assessments=render(p,[],'avaliacoes');assert(assessments.includes('Relato original preservado'));assert(!assessments.includes('Sessão recente'));
 const wrong=fixture();wrong.avaliacoes[0].mapeamento.clinicaEstruturada.laudo.contextoPaciente.pacienteId='outro';assert(!render(wrong,[],'simplificado').includes('RELATÓRIO SALVO'));assert(render(wrong,[],'simplificado').includes('vínculo divergente'));
 wrong.avaliacoes[0].paciente_id='outro';assert(!render(wrong,[],'simplificado').includes('Relato original preservado'));
 t.ctx.window.telaPermitida=()=>false;await t.ctx.window.gerarProntuarioCompletoPDF('p1','avaliacoes');assert.equal(t.writes.length,0);t.ctx.window.telaPermitida=()=>true;
 await t.ctx.window.gerarProntuarioCompletoPDF('p1','avaliacoes');assert(t.writes.at(-1).includes('Consulta de avaliações'));assert(!t.writes.at(-1).includes('Sessão recente'));
 let resolve;t.pending=new Promise(r=>resolve=r);const request=t.ctx.window.gerarProntuarioCompletoPDF('p1','evolucoes');const n=t.writes.length;t.ctx.usuarioLogado={...t.ctx.usuarioLogado,clinica_id:'c2'};resolve([fixture()]);await request;assert.equal(t.writes.length,n,'Resposta de outra clínica não pode preencher janela');
 const design=fs.readFileSync('src/core/design_system-1.20.1.js','utf8');for(const s of ['Consultar avaliação','Histórico de evoluções',"acao==='consultar_avaliacao'", "acao==='historico_evolucao'"])assert(design.includes(s));
 console.log('PASS Prontuário: conteúdo clínico organizado, texto manual preservado, técnicos separados, consultas somente leitura, ordem e isolamento.');
}
module.exports={fixture,setup};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
