'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const source=fs.readFileSync('src/clinical/evaluation_free_exam-1.0.0.js','utf8');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
function setup(){
    const t=fixture();let contexto={pacienteId:'sintetico-a',avaliacaoId:'avaliacao-a',revisao:1},fp='historia-a';
    t.tests=[];t.c.window.obterContextoAvaliacaoKineSys=()=>contexto;t.c.window.fingerprintContextoExameKineSys=()=>fp;
    t.c.document.dispatchEvent=()=>{};t.c.CustomEvent=class{constructor(type){this.type=type;}};
    const testes=['Spurling / compressão foraminal reproduz sintomas radiculares típicos','Distração cervical reduz sintomas radiculares','ULTT1 / teste neurodinâmico do nervo mediano compatível com os sintomas'];
    t.c.BANCO_MAPEAMENTO_CLINICO.cervical.clusters=[{id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',testes,limiar:3}];
    t.c.BANCO_MAPEAMENTO_CLINICO.ombro={nome:'Ombro',clusters:[{id:'hipotese_ombro',nome:'Hipótese sintética do ombro',testes:['Teste sintético do ombro'],limiar:1}]};
    vm.runInContext(source,t.c);const api=t.c.window.KineSysExameLivre;
    const add=(i,extra={})=>api.adicionar({regiaoId:'cervical',lado:'direito',texto:testes[i]+' — resposta registrada.',resultado:'positivo',vinculo:'clusters::radiculopatia_cervical::'+i,...extra});
    return {t,api,add,testes,next(){contexto={pacienteId:'sintetico-b',avaliacaoId:'avaliacao-b',revisao:2};},changeHMA(){fp='historia-b';}};
}
{
    const f=setup();f.api.adicionar({regiaoId:'cervical',lado:'direito',texto:'Rotação cervical direita: 45 graus, com dor familiar. Medida repetida duas vezes.'});
    f.api.adicionar({regiaoId:'ombro',lado:'esquerdo',texto:'No ombro esquerdo, observada limitação durante elevação ativa.'});
    const r=f.t.render();
    assert.notEqual(r.modo,'incompleto','exame livre permite compor relatório sem checklist artificial');
    assert(r.texto.includes('45 graus'));assert(r.texto.includes('ombro esquerdo'));
    const fatos=r.semantica.fatos.filter(x=>x.tipo==='exame_livre');assert.equal(fatos.length,2);
    assert.equal(fatos[0].regiaoId,'cervical');assert.equal(fatos[1].regiaoId,'ombro');assert.equal(fatos[1].lado,'esquerdo');
    assert(fatos.every(x=>x.origens[0].campo==='clinicaEstruturada.exameLivre'));
    assert(r.semantica.relacoes.some(x=>x.tipo==='mesma_regiao_documentada'&&x.para===fatos[0].id));
    assert.equal(f.api.integrar([]).length,0,'nome livre sem critério não confirma hipótese');
    assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true));
}
{
    const f=setup();f.add(0);f.add(1);f.add(2);
    const achados=f.api.integrar([]);assert.equal(achados.length,1);assert.equal(achados[0].lado,'direito');
    assert.deepEqual(Array.from(achados[0].achados,x=>x.resultado),['positivo','positivo','positivo']);
    const r=f.t.render();assert.equal(r.semantica.correlacoes[0].criterioAtendido,true,'critérios existentes, índices e limiar preservados');
    assert(r.texto.includes('não estabelecem diagnóstico definitivo isoladamente'));
    assert.equal(r.validacao.testesAusentes.length,0);
    const duplicado=f.add(0);assert.equal(f.api.integrar([])[0].achados.length,3,'repetição não cria critério adicional');
    assert(duplicado.criterioCatalogo.includes('Spurling'));
    f.api.adicionar({regiaoId:'ombro',lado:'esquerdo',texto:'Teste sintético do ombro',resultado:'positivo',vinculo:'clusters::hipotese_ombro::0'});
    assert.equal(f.api.integrar([]).length,1,'região não selecionada não é promovida automaticamente');
}
{
    const f=setup();f.add(0,{texto:'Artrodese cervical realizada em 2012.'});
    assert.equal(f.api.integrar([]).length,0,'uma cirurgia digitada no teste não confirma um critério');
    assert.equal(f.api.documentar()[0].situacao.tipo,'revisar');
    assert(f.t.render().validacao.exameLivrePendente.length);
    assert.equal(f.api.registros()[0].texto,'Artrodese cervical realizada em 2012.');
}
{
    const f=setup();f.add(0);f.add(1,{lado:'esquerdo'});f.add(2);
    assert.equal(f.api.integrar([]).length,0,'não soma critérios de lados diferentes');
    assert(f.t.render().texto.includes('lados distintos foram mantidos separados'));
}
{
    const f=setup();f.add(0);f.add(0,{resultado:'negativo'});
    assert.equal(f.api.integrar([]).length,0,'resultados conflitantes não são contados como positivos');
    const r=f.t.render();assert(r.validacao.conflitos.length);assert(r.validacao.exameLivrePendente.length);
    assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true));
}
{
    const f=setup();f.add(0,{texto:'Spurling negativo, não foi realizado outro teste.',resultado:'positivo'});
    assert.equal(f.api.integrar([]).length,0);assert(f.t.render().validacao.conflitos.length);
    f.api.preencher();f.add(0,{texto:'Spurling à esquerda',lado:'direito'});assert.equal(f.api.integrar([]).length,0);
}
{
    const f=setup();f.t.tests=[{regiaoId:'cervical',regiao:'Coluna cervical',id:'radiculopatia_cervical',achados:[{texto:f.testes[0],resultado:'negativo'}]}];f.add(0);
    const r=f.t.render();assert(r.validacao.conflitos.length,'divergência entre livre e guiado suspende síntese');assert(!r.texto.includes('dá suporte à hipótese'));
}
{
    const f=setup();f.add(0);const salvo=JSON.parse(JSON.stringify(f.api.coletar()));
    f.api.preencher(salvo);assert.equal(f.api.registros()[0].texto,salvo.registros[0].texto);
    f.changeHMA();assert.equal(f.api.integrar([]).length,0,'HMA alterada exige revisão do vínculo');
    const revisao=f.t.render();assert(revisao.texto.includes('pendente de revisão profissional'));
    assert(revisao.validacao.exameLivrePendente.some(t=>t.includes('história clínica mudou')),'o aviso técnico continua disponível fora do texto copiável');
    f.next();assert.equal(f.api.coletar().registros.length,0,'troca de pessoa limpa registro imediatamente');
    assert.equal(f.api.registros().length,0);
}
{
    const f=setup();f.add(0);f.next();
    assert.equal(f.add(1),false,'uma ação do contexto anterior não registra texto na pessoa nova');
    assert.equal(f.api.registros().length,0);
}
{
    const f=setup(),original=f.add(0);
    f.api.preencher({versao:1,registros:[],rascunho:original});
    const editado=f.add(0,{texto:'Achado revisado, mesmo teste e mesmo lado.'});
    assert.equal(editado.id,original.id);assert.equal(editado.registradoEm,original.registradoEm);assert(editado.atualizadoEm);
    assert.equal(f.api.registros().length,1,'editar conserva identidade e carimbo original sem duplicar o registro');
}
{
    const f=setup(),get=f.t.c.document.getElementById,resultado={value:''},status={textContent:'Registro anterior'};
    f.t.c.document.getElementById=id=>id==='ks_exame_livre_resultado'?resultado:id==='ks_exame_livre_status'?status:get(id);
    f.api.preencher({registros:[],rascunho:{id:'registro-sintetico',texto:'Achado descritivo.',resultado:'descritivo'}});
    assert.equal(resultado.value,'','descrição reabre com a opção Não classificado, sem select vazio');
    assert(status.textContent.includes('Registro em edição'));
    f.api.preencher();assert.equal(status.textContent,'','limpar cadastro também limpa aviso do paciente anterior');
}
{
    const f=setup();f.api.preencher({versao:1,registros:[],rascunho:{regiaoId:'cervical',texto:'Palpação dolorosa na região cervical, sem classificação.',lado:'direito'}});
    const r=f.t.render();assert(r.texto.includes('Palpação dolorosa'));assert(r.validacao.exameLivrePendente.length);assert.equal(f.api.integrar([]).length,0);
    f.t.c.window.preencherLaudoAvaliacaoKineSys({...r,texto:'Texto profissional preservado.',textoAutomatico:false});
    f.api.adicionar({regiaoId:'cervical',texto:'Outro achado registrado.'});f.t.c.window.renderizarLaudoAvaliacaoKineSys();
    assert(f.t.nodes['ks-laudo-texto'].value.startsWith('Texto profissional preservado.'));
}
{
    const f=setup();f.add(0);f.t.c.BANCO_MAPEAMENTO_CLINICO.cervical.clusters[0].testes[0]='Critério alterado do catálogo';
    assert.equal(f.api.integrar([]).length,0,'catálogo alterado não reaproveita índice com outro significado');
    const coletor=f.t.c.window.coletarAchadosLaudoKineSys;vm.runInContext(source,f.t.c);
    assert.equal(f.t.c.window.coletarAchadosLaudoKineSys,coletor,'montagem repetida não envolve coletor duas vezes');
}
{
    const f=setup();Object.assign(f.t.c,{atualizarVisibilidadeRestricoesPosOp(){},atualizarPSFSMedia(){},preencherRestricoesPosOperatorias(){}});
    f.t.c.window.KineSysContextoAnamnese.preencher=()=>{};
    vm.runInContext(core.slice(core.indexOf('let clinicaEstruturadaPreservada ='),core.indexOf('function montarContextoMotorParaSalvar(')),f.t.c);
    f.add(0);const clinica=f.t.c.coletarClinicaEstruturada();clinica.chaveLegada={conservar:true};
    f.t.c.preencherClinicaEstruturada(JSON.parse(JSON.stringify(clinica)));
    const reaberto=f.t.c.coletarClinicaEstruturada();assert.equal(reaberto.exameLivre.registros.length,1);assert(reaberto.chaveLegada.conservar);
    f.t.c.limparClinicaEstruturada();assert.equal(f.api.registros().length,0);
}
const fragment=fs.readFileSync('screens/tela_avaliacao.html','utf8'),engine=fs.readFileSync('src/clinical/clinical_engine-1.17.0.js','utf8');
assert(!fragment.includes('id="painel_integracao_multirregional"'),'bloco multirregional retirado do DOM');
assert(fragment.indexOf('id="radar_flutuante_container"')>fragment.indexOf('id="subtela_mapeamento"'),'Radar fica junto ao exame, não sob o cabeçalho fixo');
assert(fragment.indexOf('id="ks_exam_safety_review"')>fragment.indexOf('id="subtela_diagnostico"'));
assert(!engine.includes('container.appendChild(construirPainelSegurancaGlobal(contexto))'),'etapa 2 sem botão de segurança');
assert(engine.includes('window.validarSegurancaParaFinalizacao ='),'regra de segurança preservada');
assert(engine.includes('host.replaceChildren(construirPainelSegurancaGlobal(contexto))'),'revisão acessível na etapa 3');
{
    const calls=[],host={replaceChildren(box){calls.push(['replace',box]);},querySelector:()=>({click(){calls.push(['click']);}})};
    const ctx={window:{},document:{getElementById:id=>id==='ks_exam_safety_review'?host:null},coletarContextoClinico:()=>({id:'contexto-sintetico'}),construirPainelSegurancaGlobal:value=>({contexto:value})};
    vm.runInNewContext(engine.slice(engine.indexOf('function atualizarRevisaoSegurancaNoRelatorio('),engine.indexOf('window.renderizarMapeamentoRegioes = function(){')),ctx);
    ctx.window.revisarSegurancaAvaliacaoKineSys();assert.equal(calls[0][0],'replace');assert.equal(calls[1][0],'click');assert.equal(calls.length,2,'abre revisão existente na etapa 3, sem duplicar painel nem retirar regras');
}
const ids=Array.from(fragment.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(new Set(ids).size,ids.length);
{
    const f=setup(),get=f.t.c.document.getElementById,radar={parentElement:null};let etapa='subtela_triagem',moves=0;
    const hosts=Object.fromEntries(['ks_radar_hma_host','ks_radar_exam_host','ks_radar_report_host'].map(id=>[id,{appendChild(value){value.parentElement=this;moves++;}}]));
    f.t.c.document.getElementById=id=>id==='radar_flutuante_container'?radar:hosts[id]||get(id);
    f.t.c.document.querySelector=()=>({id:etapa});
    for(const [subtela,host] of [['subtela_triagem','ks_radar_hma_host'],['subtela_mapeamento','ks_radar_exam_host'],['subtela_diagnostico','ks_radar_report_host']]){
        etapa=subtela;f.t.c.window.posicionarRadarAvaliacaoKineSys();assert.equal(radar.parentElement,hosts[host]);
        f.t.c.window.posicionarRadarAvaliacaoKineSys();
    }
    assert.equal(moves,3,'um único Radar é movido sem reconstruir IDs nem repetir mutações');
}
console.log('PASS: exame livre regional, texto integral, correlação canônica, limites/lados, divergências, HMA, rascunho, isolamento e roundtrip no JSON real.');
