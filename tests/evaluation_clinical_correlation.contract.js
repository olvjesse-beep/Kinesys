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
assert.match(src,/versaoTexto:11/,'a base automática anterior deve ser atualizada com segurança');
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
    KineSysMotorClinico3:{ultimoPlano:{versao:'teste',hipoteses:[{id:'radiculopatia',nome:'Radiculopatia lombar',regiaoId:'lombar',aConfirmar:['neurodinâmica']},{id:'patelofemoral',nome:'Síndrome da dor patelofemoral',regiaoId:'joelho',aConfirmar:['carga']},{id:'radiculopatia_toracica',nome:'Radiculopatia torácica',regiaoId:'toracica',aConfirmar:['neurológico']}],exame:{testesPrioritarios:[{texto:'Teste A',hipoteseId:'radiculopatia'}]}}}
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
assert.match(report,/1 achado positivo, 1 achado negativo e 1 achado inconclusivo/,'a integração deve flexionar os achados em linguagem natural');
assert.match(report,/conjunto oferece suporte parcial à hipótese de radiculopatia lombar, porém os resultados divergentes limitam a conclusão/,'resultados mistos devem produzir interpretação clínica cautelosa e natural');
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
assert.match(somenteNegativos,/2 achados negativos/,'resultados negativos devem ser flexionados corretamente');
assert.match(somenteNegativos,/não sustentaram a hipótese de radiculopatia lombar/,'resultado negativo não deve ser apresentado como confirmação');
assert.match(somenteNegativos,/isoladamente, não a exclui/,'resultado negativo isolado não deve excluir a hipótese');

const somenteInconclusivo=renderizarCaso(
  [{regiao:'Coluna lombar',id:'radiculopatia',nome:'Radiculopatia lombar',achados:[{texto:'Slump',resultado:'inconclusivo'}]}],
  [{regiao:'Coluna lombar',codigoHipotese:'radiculopatia',nomeHipotese:'Radiculopatia lombar',nivel:'inconclusivo',redFlags:[]}]
);
assert.match(somenteInconclusivo,/1 achado inconclusivo/,'resultado inconclusivo deve ser descrito no singular');
assert.match(somenteInconclusivo,/foi inconclusivo e não esclareceu a hipótese de radiculopatia lombar/,'resultado inconclusivo deve preservar a incerteza clínica');

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
assert.match(multirregional,/A investigação de síndrome da dor patelofemoral/,'cada região deve receber interpretação própria');
assert.match(multirregional,/A investigação de radiculopatia torácica/,'o relatório deve preservar hipóteses multirregionais');
assert.doesNotMatch(report,/permanece em aberto|registra-se|cabe ressaltar|faz-se necessário/i,'o relatório não deve usar clichês de texto automatizado');

const predominioPositivo=renderizarCaso(
  [{regiao:'Coluna lombar',id:'radiculopatia',nome:'Radiculopatia lombar',achados:[{texto:'SLR',resultado:'positivo'},{texto:'Slump',resultado:'positivo'},{texto:'Déficit sensitivo',resultado:'positivo'},{texto:'Reflexos',resultado:'negativo'}]}],
  [{regiao:'Coluna lombar',codigoHipotese:'radiculopatia',nomeHipotese:'Radiculopatia lombar',nivel:'positivo',redFlags:[]}]
);
assert.match(predominioPositivo,/3 achados positivos e 1 achado negativo/,'o relatório deve resumir corretamente três de quatro testes positivos');
assert.match(predominioPositivo,/predomínio de respostas positivas, em conjunto com a história clínica, sustenta a hipótese de radiculopatia lombar/,'três de quatro testes positivos devem sustentar, sem confirmar, a hipótese');

const semExame=renderizarCaso([],[]);
assert.doesNotMatch(semExame,/EXAME FÍSICO-FUNCIONAL|IMPRESSÃO FISIOTERAPÊUTICA|SEGURANÇA CLÍNICA/,'seções sem conteúdo não devem ser exibidas');

console.log('Evaluation clinical correlation contract OK');

