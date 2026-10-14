const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('src/clinical/evaluation_workspace-1.17.0.js','utf8').replace(/\r\n/g,'\n');

assert.match(src,/KineSysMotorClinico3\?\.ultimoPlano/,'o laudo deve consumir o plano derivado da anamnese');
assert.match(src,/ultimoPlano\|\|window\.gerarPlanoClinicoHMAKineSys\?\.\(\)/,'o laudo deve reconstruir o plano quando um rascunho restaurado ainda não populou ultimoPlano');
assert.match(src,/function construirCorrelacoes\(d\)/,'deve existir uma correlação clínica única');
assert.match(src,/hipoteseAnamnese/,'a correlação deve preservar a hipótese originada na anamnese');
assert.match(src,/resultados/,'a correlação deve incorporar resultados do exame');
assert.match(src,/IMPRESSÃO FISIOTERAPÊUTICA/,'o laudo deve integrar anamnese e exame em uma única impressão profissional');
assert.match(src,/coletarContextoIntegradoAvaliacaoKineSys/,'o fluxo deve expor uma fonte clínica integrada');
assert.match(src,/gruposAnamnese=\{/,'campos repetidos sem id devem ser preservados em grupos clínicos');
assert.match(src,/grupoCampo\(el\)/,'a coleta deve classificar fatores de piora, exposições, comorbidades e fatores psicossociais');
assert.match(src,/versaoTexto:12/,'a base automática anterior deve ser atualizada com segurança');
assert.match(src,/textoAutomatico&&!laudo\.revisado/,'texto profissional editado ou revisado deve continuar preservado');
assert.match(src,/Quanto à queixa atual, registra-se:/,'rascunhos automáticos da versão anterior devem ser reconhecidos para migração');
assert.match(src,/O exame físico ainda não contém resultados de testes registrados\./,'a migração deve ser restrita ao modelo automático antigo');
assert.match(src,/HISTÓRIA CLÍNICA RELEVANTE\\n/,'o relatório formal deve apresentar a história clínica sem linguagem de formulário');
assert.match(src,/EXAME FÍSICO-FUNCIONAL\\n/,'o relatório formal deve separar o exame físico-funcional');
assert.match(src,/contagem=resultados\.reduce/,'a integração deve resumir resultados sem repetir a lista completa de testes');
assert.match(src,/idsVinculados=new Set/,'testes prioritários devem manter vínculo com a hipótese que os originou');
assert.match(src,/eixoId:a\.id\|\|''/,'resultados do exame devem preservar o eixo clínico de origem');
assert.match(src,/if\(seguranca\)secoes\.push\(`SEGURANÇA CLÍNICA/,'segurança clínica só deve aparecer quando houver conteúdo relevante');
assert.doesNotMatch(src,/`CONDUTA FISIOTERAPÊUTICA\\n\$\{conduta\}`/,'o relatório automático não deve inventar uma conduta não registrada');

function campo({id='',value='',label='',type='text',checked=true,classes=[],tagName='INPUT',selectedText=''}){
  const span={textContent:label};
  return {id,value,type,checked,disabled:false,tagName,selectedOptions:[{textContent:selectedText||value}],classList:{contains:n=>classes.includes(n)},labels:[{textContent:label,querySelector:s=>s==='span'?span:null}],closest:()=>null};
}
const fields=[
  campo({id:'paciente_nome',value:'Paciente Teste',label:'Nome'}),campo({id:'paciente_idade',value:'42',label:'Idade',type:'number'}),
  campo({id:'paciente_hma',value:'Dor lombar irradiada para o membro inferior, pior ao permanecer em pé.',label:'Relato clínico',tagName:'TEXTAREA'}),
  campo({id:'eva_slider',value:'7',label:'Dor atual'}),campo({label:'Em pé',type:'checkbox',classes:['chk_fator_piora']}),
  campo({id:'paciente_ocupacao',value:'Professor',label:'Profissão'}),campo({label:'Ortostatismo prolongado',type:'checkbox',classes:['chk_exposicao_ocupacional']}),
  campo({id:'chk_diabetico',label:'DM',type:'checkbox'}),campo({label:'Sono ruim',type:'checkbox',classes:['chk_yellow_flag']}),
  campo({id:'origem_informacao_clinica',value:'relato_paciente',label:'Fonte',tagName:'SELECT',selectedText:'Relato do paciente'})
];
const elements={
  'ks-laudo-texto':{value:''},'ks-laudo-revisado':{checked:false},'ks-laudo-status':{textContent:''},
  tags_cirurgias:{textContent:''},tags_medicamentos:{textContent:''}
};
let achadosAtuais=[{regiaoId:'lombar',regiao:'Coluna lombar',id:'radiculopatia',grupo:'cluster',nome:'Radiculopatia lombar',status:'positivo',completo:true,achados:[{texto:'Teste A',resultado:'positivo'},{texto:'Teste B',resultado:'negativo'},{texto:'Teste C',resultado:'inconclusivo'}]}];
let resumoAtual=[{regiao:'Coluna lombar',codigoHipotese:'radiculopatia',nomeHipotese:'Radiculopatia lombar',nivel:'positivo',redFlags:[],direcaoProfissional:'hipotese'}];
const context={
  window:{
    coletarAchadosLaudoKineSys:()=>achadosAtuais,
    validarSegurancaParaFinalizacao:()=>({ok:true}),nomeHipoteseLimpoKineSys:n=>n,
    KineSysMotorClinico3:{ultimoPlano:{versao:'teste',hipoteses:[{id:'radiculopatia',nome:'Radiculopatia lombar',regiaoId:'lombar',aConfirmar:['neurodinâmica'],limiar:2},{id:'patelofemoral',nome:'Síndrome da dor patelofemoral',regiaoId:'joelho',aConfirmar:['carga'],limiar:2},{id:'radiculopatia_toracica',nome:'Radiculopatia torácica',regiaoId:'toracica',aConfirmar:['neurológico'],limiar:2}],exame:{testesPrioritarios:[{texto:'Teste A',hipoteseId:'radiculopatia'}]}}}
  },
  document:{readyState:'loading',addEventListener:()=>{},querySelectorAll:s=>s.startsWith('#subtela_triagem')?fields:[],getElementById:id=>elements[id]||null},
  gerarSinteseMapeamento:()=>({resumoPorRegiao:resumoAtual,segurancaGlobal:{pistasGlobais:[]}}),
  coletarRestricoesPosOperatorias:()=>({ativo:false}),agendarAutosaveKineSys:()=>{},confirmarKineSys:()=>true,
  console
};
context.window.window=context.window;
vm.runInNewContext(src.slice(0,src.indexOf('\n\n/* Product Design')),context);
context.window.preencherLaudoAvaliacaoKineSys('rascunho-legado-invalido');
context.window.renderizarLaudoAvaliacaoKineSys();
const report=elements['ks-laudo-texto'].value;
assert.match(report,/Em pé/i,'fatores de piora sem id devem chegar ao relatório');
assert.match(report,/Ortostatismo prolongado/i,'exposições ocupacionais sem id devem chegar ao relatório');
assert.match(report,/DM/,'comorbidades devem chegar ao relatório');
assert.match(report,/Sono ruim/,'fatores psicossociais devem chegar ao relatório');
assert.strictEqual((report.match(/Paciente Teste/g)||[]).length,1,'a identificação do paciente não deve ser repetida na anamnese');
assert.match(report,/Teste A \(positivo\); Teste B \(negativo\); Teste C \(inconclusivo\)/,'todos os resultados válidos do exame devem chegar ao relatório');
assert.match(report,/(?:não preenche|insuficientes para atingir|não atendem) (?:o|ao) critério clínico/,'resultados abaixo do limiar devem produzir interpretação clínica cautelosa');
assert.strictEqual((report.match(/em pé/gi)||[]).length,1,'fator de piora já descrito na HMA não deve ser repetido');
assert.doesNotMatch(report,/positivo\(s\)|negativo\(s\)|inconclusivo\(s\)/,'o relatório não deve exibir flexões mecânicas');
assert.doesNotMatch(report,/CONDUTA FISIOTERAPÊUTICA/,'o texto copiável não deve conter uma conduta genérica inventada');

function renderizarCaso(achados,resumo){
  achadosAtuais=achados;resumoAtual=resumo;
  context.window.preencherLaudoAvaliacaoKineSys(null);
  context.window.renderizarLaudoAvaliacaoKineSys();
  return elements['ks-laudo-texto'].value;
}
const somenteNegativos=renderizarCaso(
  [{regiao:'Coluna lombar',id:'radiculopatia',nome:'Radiculopatia lombar',achados:[{texto:'SLR',resultado:'negativo'},{texto:'Slump',resultado:'negativo'}]}],
  [{regiao:'Coluna lombar',codigoHipotese:'radiculopatia',nomeHipotese:'Radiculopatia lombar',nivel:'negativo',redFlags:[]}]
);
assert.match(somenteNegativos,/(?:não ofereceu suporte à hipótese|não sustentaram a hipótese) de radiculopatia lombar/,'resultado negativo não deve ser apresentado como confirmação');
assert.match(somenteNegativos,/(?:isoladamente|por si só), não (?:permitem excluí-la|permite afastá-la)/,'resultado negativo isolado não deve excluir a hipótese');

const somenteInconclusivo=renderizarCaso(
  [{regiao:'Coluna lombar',id:'radiculopatia',nome:'Radiculopatia lombar',achados:[{texto:'Slump',resultado:'inconclusivo'}]}],
  [{regiao:'Coluna lombar',codigoHipotese:'radiculopatia',nomeHipotese:'Radiculopatia lombar',nivel:'inconclusivo',redFlags:[]}]
);
assert.match(somenteInconclusivo,/foi inconclusivo e não permitiu esclarecer a hipótese de radiculopatia lombar/,'resultado inconclusivo deve preservar a incerteza clínica');

const multirregional=renderizarCaso(
  [
    {regiao:'Joelho',id:'patelofemoral',nome:'Síndrome da dor patelofemoral',achados:[{texto:'Agachamento',resultado:'positivo'}]},
    {regiao:'Coluna torácica',id:'radiculopatia_toracica',nome:'Radiculopatia torácica',achados:[{texto:'Exame neurológico',resultado:'negativo'}]}
  ],
  [
    {regiao:'Joelho',codigoHipotese:'patelofemoral',nomeHipotese:'Síndrome da dor patelofemoral',nivel:'positivo',redFlags:[]},
    {regiao:'Coluna torácica',codigoHipotese:'radiculopatia_toracica',nomeHipotese:'Radiculopatia torácica',nivel:'negativo',redFlags:[]}
  ]
);
assert.match(multirregional,/hipótese de síndrome da dor patelofemoral/,'cada região deve receber interpretação própria');
assert.match(multirregional,/hipótese de radiculopatia torácica/,'o relatório deve preservar hipóteses multirregionais');
assert.doesNotMatch(report,/permanece em aberto|registra-se|cabe ressaltar|faz-se necessário/i,'o relatório não deve usar clichês de texto automatizado');

const predominioPositivo=renderizarCaso(
  [{regiao:'Coluna lombar',id:'radiculopatia',nome:'Radiculopatia lombar',achados:[{texto:'SLR',resultado:'positivo'},{texto:'Slump',resultado:'positivo'},{texto:'Déficit sensitivo',resultado:'positivo'},{texto:'Reflexos',resultado:'negativo'}]}],
  [{regiao:'Coluna lombar',codigoHipotese:'radiculopatia',nomeHipotese:'Radiculopatia lombar',nivel:'positivo',redFlags:[]}]
);
assert.match(predominioPositivo,/(?:preenchem|atende|atingem) (?:o|ao) critério (?:clínico )?registrado para radiculopatia lombar/,'três de quatro testes positivos devem preencher o limiar configurado');

const semExame=renderizarCaso([],[]);
assert.doesNotMatch(semExame,/EXAME FÍSICO-FUNCIONAL|IMPRESSÃO FISIOTERAPÊUTICA|SEGURANÇA CLÍNICA/,'seções sem conteúdo não devem ser exibidas');

function testarCondicao({id,nome,regiaoId,regiao,limiar,testes,esperaPreencher=false}){
  context.window.KineSysMotorClinico3.ultimoPlano={versao:'matriz-10',hipoteses:[{id,nome,regiaoId,aConfirmar:[],limiar}],exame:{testesPrioritarios:testes.map(t=>({texto:t.texto,hipoteseId:id}))}};
  const texto=renderizarCaso([{regiaoId,regiao,id,nome,achados:testes}],[{regiao,codigoHipotese:id,nomeHipotese:nome,nivel:'avaliado',redFlags:[]}]);
  if(esperaPreencher)assert.match(texto,/(?:preenchem|atende|atingem) (?:o|ao) critério/);else assert.match(texto,/(?:não preenche|insuficientes para atingir|não atendem) (?:o|ao) critério clínico/);
  return texto;
}
const matrizPoucoTestada=[
  {id:'dtm_dolorosa_muscular',nome:'DTM dolorosa — componente muscular',regiaoId:'atm',regiao:'ATM / Dor Orofacial',limiar:2,testes:[{texto:'Palpação do masseter reproduz dor familiar',resultado:'positivo'}]},
  {id:'cefaleia_cervicogenica_triagem',nome:'Cefaleia cervicogênica — investigação causal',regiaoId:'cefaleia',regiao:'Cabeça / Cefaleia',limiar:3,testes:[{texto:'Flexão-rotação cervical reproduz cefaleia',resultado:'positivo'}]},
  {id:'tendinopatia_lateral_cotovelo',nome:'Dor lateral do cotovelo / tendinopatia extensora',regiaoId:'cotovelo',regiao:'Cotovelo / Antebraço',limiar:2,testes:[{texto:'Cozen',resultado:'positivo'}]},
  {id:'tunel_carpo',nome:'Síndrome do túnel do carpo — padrão clínico',regiaoId:'punho_mao',regiao:'Punho e Mão',limiar:2,testes:[{texto:'Tinel no túnel do carpo',resultado:'positivo'}]},
  {id:'fai_sindrome',nome:'Síndrome do impacto femoroacetabular — suspeita',regiaoId:'quadril',regiao:'Quadril / Virilha / Pelve',limiar:3,testes:[{texto:'FADIR',resultado:'positivo'}]},
  {id:'meniscal_traumatica',nome:'Lesão meniscal — padrão clínico',regiaoId:'joelho',regiao:'Joelho',limiar:2,testes:[{texto:'McMurray',resultado:'positivo'}]},
  {id:'entorse_lateral_tornozelo',nome:'Entorse lateral de tornozelo',regiaoId:'tornozelo_pe',regiao:'Tornozelo e Pé',limiar:2,testes:[{texto:'Gaveta anterior',resultado:'positivo'}]},
  {id:'ruptura_aquiles',nome:'Ruptura do tendão de Aquiles',regiaoId:'tornozelo_pe',regiao:'Tornozelo e Pé',limiar:2,testes:[{texto:'Thompson',resultado:'positivo'}]},
  {id:'dor_plantar_calcanhar',nome:'Dor plantar do calcâneo / fasciopatia plantar',regiaoId:'tornozelo_pe',regiao:'Tornozelo e Pé',limiar:2,testes:[{texto:'Palpação da tuberosidade medial',resultado:'positivo'},{texto:'Windlass',resultado:'positivo'}],esperaPreencher:true},
  {id:'tos',nome:'Síndrome do desfiladeiro torácico — diferencial neurovascular',regiaoId:'ombro',regiao:'Ombro / Complexo Glenoumeral',limiar:2,testes:[{texto:'Roos/EAST',resultado:'positivo'}]}
];
const relatoriosMatriz=matrizPoucoTestada.map(testarCondicao);
assert.strictEqual(relatoriosMatriz.length,10,'dez condições pouco testadas devem permanecer cobertas');
assert.match(relatoriosMatriz[0],/hipótese de DTM dolorosa/,'siglas clínicas não devem ser deformadas');
assert.doesNotMatch(relatoriosMatriz.join('\n'),/— (?:padrão clínico|suspeita|investigação causal|diferencial neurovascular)/i,'qualificadores internos não devem vazar para o relatório');

context.window.KineSysMotorClinico3.ultimoPlano={versao:'regra-combinada',hipoteses:[{id:'combinada',nome:'Hipótese combinada',regiaoId:'teste',regraConfirmacao:{tipo:'combinada',obrigatorios:[0],minimo:2}}],exame:{testesPrioritarios:[]}};
const obrigatorioAusente=renderizarCaso(
  [{regiao:'Região teste',id:'combinada',nome:'Hipótese combinada',achados:[{texto:'Teste obrigatório',resultado:'negativo'},{texto:'Teste B',resultado:'positivo'},{texto:'Teste C',resultado:'positivo'}]}],
  [{regiao:'Região teste',codigoHipotese:'combinada',nomeHipotese:'Hipótese combinada',nivel:'avaliado',redFlags:[]}]
);
assert.match(obrigatorioAusente,/(?:não preenche|insuficientes para atingir|não atendem) (?:o|ao) critério clínico/,'regra combinada não pode ser aprovada sem o teste obrigatório');
context.window.KineSysMotorClinico3.ultimoPlano.hipoteses[0].regraConfirmacao={tipo:'qualquer'};
const regraQualquer=renderizarCaso(
  [{regiao:'Região teste',id:'combinada',nome:'Hipótese combinada',achados:[{texto:'Teste A',resultado:'positivo'}]}],
  [{regiao:'Região teste',codigoHipotese:'combinada',nomeHipotese:'Hipótese combinada',nivel:'avaliado',redFlags:[]}]
);
assert.match(regraQualquer,/(?:preenchem|atende|atingem) (?:o|ao) critério/,'regra qualquer deve aceitar um achado positivo quando a base assim definir');

console.log('Evaluation clinical correlation contract OK');

