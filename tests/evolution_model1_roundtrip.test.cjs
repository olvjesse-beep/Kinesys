// Exercita as funções reais; transporte isolado em memória, sem dados clínicos reais.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/core/script-1.18.0.js'),'utf8');
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a);return source.slice(a,b);}
const clone=x=>JSON.parse(JSON.stringify(x));
const inputs=['evo_relato','evo_realizado_em','evo_data','evo_novo_exame_texto','evo_intercorrencia_texto','evo_medicacao_texto','evo_alerta_texto','evo_nova_intercorrencia','evo_mudanca_medicacao','evo_novo_exame','evo_novo_alerta','evo_dor_durante','evo_dor_24h','evo_rpe','evo_duracao','evo_resposta_24h','evo_edema','eva_slider_evo','evo_eva_avaliada','evo_excecao_sem_avaliacao','evo_justificativa_excecao','btn_salvar_evolucao','btn_cancelar_edicao_evolucao','linha_tempo_evolucoes','bloco_excecao_sem_avaliacao'];
function setup(){
 const nodes=Object.fromEntries(inputs.map(id=>[id,{value:'',checked:false,style:{},innerHTML:'',textContent:'',focus(){},dispatchEvent(){}}]));
 let active='p1',db={id:'p1',nome:'Paciente sintético',evolucoes:[]},cached=db,state='pior',saveOK=true,expired=false,assessment=true,fetchOverride=null,writes=0,ui=0;
 const alerts=[],payloads=[];
 const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sandbox={console,Date,Math,Event:class{},evolucaoEdicaoId:null,document:{getElementById:id=>nodes[id]||null,querySelector:q=>{const m=q.match(/value="([^"]+)"/);return m?{set checked(v){if(v)state=m[1];}}:{value:state};}},window:{KineSysEvolucaoUI:{atualizar(){ui++;}}},alert:m=>alerts.push(m),obterPacienteIdEvolucaoAtivo:()=>active,sincronizarSelectPacienteEvolucao(){},validarRealizacaoClinicaInput:()=>nodes.evo_realizado_em.value,obterPacienteCompletoPorId:async()=>fetchOverride?fetchOverride():cached,registroClinicoPodeEditar:()=>!expired,formatarDataHoraClinica:x=>x,obterLimiteEdicaoRegistro:e=>e.edicaoLimiteEm,obterRealizadoEmRegistro:e=>e.realizadoEm,obterSalvoEmRegistro:e=>e.salvoEm,obterAvaliacaoFinalizadaMaisRecente:()=>assessment?{mapeamento:{clinicaEstruturada:{}}}:null,obterAvaliacaoMaisRecente:()=>null,metadadosProfissionalLogado:()=>({profissionalId:'prof1',profissionalNome:'Profissional sintético',profissionalRegistro:'TESTE'}),resolverAgendamentoClinicoParaRegistro:async()=> 'agenda1',salvarPacienteNaNuvem:async(p,opts)=>{writes++;assert.equal(opts.exigirRastreabilidadeClinica,true);payloads.push(clone(p));if(!saveOK)return false;db=clone(p);db.evolucoes.forEach(e=>{e.salvoEm ||= '2026-10-21T12:00:00Z';e.edicaoLimiteEm ||= '2026-10-22T12:00:00Z';});cached=db;return true;},limparAgendamentoClinicoContexto(){},valorDatetimeLocalAgora:x=>x||'2026-10-21T09:00',renderResumoPaciente(){},renderizarRestricoesPersistentesEvolucao(){},renderizarLinhaTempoClinicaCompleta(){},carregarDocumentosTimelineNuvem:async()=>{},profissionalRegistroClinico:e=>e.profissional,escapeHTML,textoJanelaEdicaoRegistro:()=> 'Janela preservada',obterPacientesSalvos:async()=>[cached]};
 vm.createContext(sandbox);
 vm.runInContext(between('async function salvarEvolucaoSessao()','function renderResumoPaciente(')+between('async function editarEvolucaoClinica(','/* ================= NOVAS FUNÇÕES')+between('async function duplicarUltimaEvolucao()','function renderizarLinhaTempoClinicaCompleta('),sandbox);
 function fill(){Object.assign(nodes.evo_relato,{value:'Conduta completa <script>não executar</script> '+ 'texto '.repeat(850)});nodes.evo_realizado_em.value='2026-10-21T09:00';nodes.eva_slider_evo.value='7';nodes.evo_eva_avaliada.checked=true;nodes.evo_novo_exame_texto.value='Laudo novo';nodes.evo_intercorrencia_texto.value='Intercorrência sintética documentada';nodes.evo_medicacao_texto.value='Alteração relatada';nodes.evo_alerta_texto.value='Alerta e encaminhamento registrados';nodes.evo_dor_durante.value='6';nodes.evo_dor_24h.value='5';nodes.evo_rpe.value='4';nodes.evo_duracao.value='50';nodes.evo_resposta_24h.value='leve_piora';nodes.evo_edema.value='sem_aumento';}
 return {sandbox,nodes,alerts,payloads,fill,get db(){return db;},get writes(){return writes;},get ui(){return ui;},set active(v){active=v;},set fail(v){saveOK=!v;},set expired(v){expired=v;},set assessment(v){assessment=v;},set fetch(v){fetchOverride=v;},get state(){return state;},set state(v){state=v;}};
}
(async()=>{
 const t=setup();t.fill();const originalText=t.nodes.evo_relato.value.trim();await t.sandbox.salvarEvolucaoSessao();
 assert.equal(t.writes,1);assert.equal(t.db.evolucoes.length,1);
 const ev=clone(t.db.evolucoes[0]),d=ev.dadosEstruturados;
 assert.equal(ev.relatoLivre,originalText);assert(ev.relatoLivre.length>4000,'não truncar informações');assert.equal(ev.eva,7);assert.equal(d.estadoClinico,'pior');
 assert.deepEqual(d.mudancasDetalhes,{novoExame:'Laudo novo',novaIntercorrencia:'Intercorrência sintética documentada',mudancaMedicacao:'Alteração relatada',novoAlerta:'Alerta e encaminhamento registrados'});
 assert.deepEqual(d.respostaCarga,{dorDurante:6,dor24h:5,rpe:4,duracaoMin:50,resposta24h:'leve_piora',edema:'sem_aumento'});
 assert(d.novaIntercorrencia&&d.novoExame&&d.mudancaMedicacao&&d.novoAlerta);
 await t.sandbox.carregarHistoricoEvolucao();const history=t.nodes.linha_tempo_evolucoes.innerHTML;
 for(const note of Object.values(d.mudancasDetalhes))assert(history.includes(note));
 assert(history.includes('&lt;script&gt;'));assert(!history.includes('<script>'));assert(history.includes('Profissional sintético'));assert(history.includes('2026-10-21T09:00'));
 // Edição pontual não apaga detalhes, dados legados ou carimbos originais.
 t.db.evolucoes[0].dadosEstruturados.mudancas='Detalhe legado';t.db.evolucoes[0].dadosEstruturados.futuro={preservar:true};
 t.db.evolucoes[0].dadosEstruturados.respostaCarga.extra='preservar';
 await t.sandbox.editarEvolucaoClinica(ev.id);assert.equal(t.nodes.evo_intercorrencia_texto.value,d.mudancasDetalhes.novaIntercorrencia);assert(t.nodes.evo_nova_intercorrencia.checked);assert.equal(t.nodes.eva_slider_evo.value,7);assert(t.nodes.evo_realizado_em.disabled);assert.equal(t.state,'pior');
 t.nodes.evo_relato.value='Somente narrativa revisada';await t.sandbox.salvarEvolucaoSessao();
 assert.equal(t.db.evolucoes.length,1);const edited=t.db.evolucoes[0];
 for(const key of ['id','realizadoEm','salvoEm','edicaoLimiteEm','profissionalId','profissionalRegistro','agendamentoId'])assert.equal(edited[key],ev[key],key);
 assert.deepEqual(edited.dadosEstruturados.mudancasDetalhes,d.mudancasDetalhes);assert.equal(edited.dadosEstruturados.mudancas,'Detalhe legado');assert(edited.dadosEstruturados.futuro.preservar);assert.equal(edited.dadosEstruturados.respostaCarga.extra,'preservar');assert(edited.ultimaEdicaoEm);
 // Duplicar mantém a base da conduta, mas nunca copia uma intercorrência como nova.
 t.fill();await t.sandbox.duplicarUltimaEvolucao();assert.equal(t.nodes.evo_relato.value,'Somente narrativa revisada');
 for(const id of ['evo_novo_exame_texto','evo_intercorrencia_texto','evo_medicacao_texto','evo_alerta_texto'])assert.equal(t.nodes[id].value,'');
 for(const id of ['evo_nova_intercorrencia','evo_mudanca_medicacao','evo_novo_exame','evo_novo_alerta'])assert.equal(t.nodes[id].checked,false);
 assert.equal(t.writes,2);
 // Falha e repetição: conteúdo intacto e nenhuma evolução fantasma no cache.
 const failed=setup();failed.fill();failed.fail=true;await failed.sandbox.salvarEvolucaoSessao();assert.equal(failed.db.evolucoes.length,0);assert.equal(failed.nodes.evo_intercorrencia_texto.value,'Intercorrência sintética documentada');assert(!failed.alerts.some(x=>x.includes('Evolução registrada')));failed.fail=false;await failed.sandbox.salvarEvolucaoSessao();assert.equal(failed.db.evolucoes.length,1);
 // Ausência não vira uma resposta clínica, e zero explícito continua sendo zero.
 const unknown=setup();unknown.fill();unknown.state='';unknown.nodes.evo_eva_avaliada.checked=false;
 await unknown.sandbox.salvarEvolucaoSessao();assert.equal(unknown.db.evolucoes[0].eva,null);assert.equal(unknown.db.evolucoes[0].dadosEstruturados.estadoClinico,'');
 await unknown.sandbox.editarEvolucaoClinica(unknown.db.evolucoes[0].id);assert.equal(unknown.nodes.evo_eva_avaliada.checked,false);assert.equal(unknown.state,'');
 const zero=setup();zero.fill();zero.nodes.eva_slider_evo.value='0';await zero.sandbox.salvarEvolucaoSessao();assert.equal(zero.db.evolucoes[0].eva,0);
 await zero.sandbox.editarEvolucaoClinica(zero.db.evolucoes[0].id);assert.equal(zero.nodes.evo_eva_avaliada.checked,true);
 // Validações clínicas continuam obrigatórias.
 const alert=setup();alert.fill();alert.nodes.evo_alerta_texto.value='';alert.nodes.evo_novo_alerta.checked=true;await alert.sandbox.salvarEvolucaoSessao();assert.equal(alert.writes,0);
 const noAssessment=setup();noAssessment.fill();noAssessment.assessment=false;await noAssessment.sandbox.salvarEvolucaoSessao();assert.equal(noAssessment.writes,0);noAssessment.nodes.evo_excecao_sem_avaliacao.checked=true;noAssessment.nodes.evo_justificativa_excecao.value='Justificativa sintética documentada';await noAssessment.sandbox.salvarEvolucaoSessao();assert.equal(noAssessment.writes,1);
 t.expired=true;await t.sandbox.editarEvolucaoClinica(ev.id);assert.equal(t.sandbox.evolucaoEdicaoId,null);
 // Resposta atrasada não preenche o paciente seguinte nem salva nele.
 const race=setup();race.fill();let release;race.fetch=()=>new Promise(r=>{release=r;});const pending=race.sandbox.salvarEvolucaoSessao();race.active='p2';release({id:'p1',evolucoes:[]});await pending;assert.equal(race.writes,0);assert(race.nodes.evo_relato.value);
 const historyRace=setup();historyRace.nodes.linha_tempo_evolucoes.innerHTML='Paciente atual';historyRace.fetch=()=>new Promise(r=>{release=r;});const loading=historyRace.sandbox.carregarHistoricoEvolucao();historyRace.active='p2';release({id:'p1',evolucoes:[ev]});await loading;assert.equal(historyRace.nodes.linha_tempo_evolucoes.innerHTML,'Paciente atual');
 // Compatibilidade: uma evolução antiga não perde a narrativa ao mostrar/editar.
 const legacy={relato:'Narrativa histórica completa',dadosEstruturados:{estadoClinico:'igual',mudancasDetalhes:{novaIntercorrencia:'Detalhe antigo'}}};const shown=t.sandbox.montarRelatoEvolucaoParaExibicao(legacy);assert(shown.includes(legacy.relato));assert(shown.includes('Detalhe antigo'));
 legacy.relatoLivre='';assert(t.sandbox.montarRelatoEvolucaoParaExibicao(legacy).includes(legacy.relato),'normalização antiga com relatoLivre vazio preserva narrativa');
 // Leitura e escrita da nuvem preservam o mesmo JSON clínico, sem nova tabela.
 const normalization=fs.readFileSync(path.join(root,'src/patient/patient_data_normalization_core-1.0.0.js'),'utf8');assert(normalization.includes('ev.dadosEstruturados || ev.dados_estruturados || {}'));assert(source.includes('dados_estruturados: ev.dadosEstruturados || {}'));
 console.log('evolution_model1_roundtrip: ok (gravação, JSON, histórico, edição, legado, falha/repetição, duplicação e isolamento de paciente)');
})().catch(e=>{console.error(e);process.exitCode=1;});
