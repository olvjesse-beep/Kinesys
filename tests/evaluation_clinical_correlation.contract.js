const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('src/clinical/evaluation_workspace-1.17.0.js','utf8').replace(/\r\n/g,'\n');
const html=fs.readFileSync('screens/tela_avaliacao.html','utf8');
const css=fs.readFileSync('styles/design_evaluation_workspace-1.18.0.css','utf8');

assert.match(src,/KineSysMotorClinico3\?\.ultimoPlano/,'o laudo deve consumir o plano derivado da anamnese');
assert.match(src,/ultimoPlano\|\|window\.gerarPlanoClinicoHMAKineSys\?\.\(\)/,'o laudo deve reconstruir o plano quando um rascunho restaurado ainda não populou ultimoPlano');
assert.match(src,/function construirCorrelacoes\(d\)/,'deve existir uma correlação clínica única');
assert.match(src,/hipoteseAnamnese/,'a correlação deve preservar a hipótese originada na anamnese');
assert.match(src,/resultados/,'a correlação deve incorporar resultados do exame');
assert.match(src,/BANCO_SEMANTICO_LAUDO/,'o laudo deve possuir um banco semântico próprio e reutilizável');
assert.match(src,/coletarContextoIntegradoAvaliacaoKineSys/,'o fluxo deve expor uma fonte clínica integrada');
assert.match(src,/gruposAnamnese=\{/,'campos repetidos sem id devem ser preservados em grupos clínicos');
assert.match(src,/grupoCampo\(el\)/,'a coleta deve classificar fatores de piora, exposições, comorbidades e fatores psicossociais');
assert.match(src,/versaoTexto:19/,'a base automática anterior deve ser atualizada com segurança');
assert.match(src,/function construirFatosClinicos\(d\)/,'o relatório deve nascer de fatos clínicos estruturados');
assert.match(src,/function validarNarrativaClinica\(d,secoes\)/,'o texto final deve ser validado contra os fatos registrados');
assert.match(src,/function conflitosDoExame\(d\)/,'resultados contraditórios devem ser detectados antes da conclusão');
assert.match(src,/textoAutomatico&&!laudo\.revisado/,'texto profissional editado ou revisado deve continuar preservado');
assert.match(src,/Quanto à queixa atual, registra-se:/,'rascunhos automáticos da versão anterior devem ser reconhecidos para migração');
assert.match(src,/O exame físico ainda não contém resultados de testes registrados\./,'a migração deve ser restrita ao modelo automático antigo');
assert.match(src,/function polirRelatoClinico\(value\)/,'o relato livre deve passar por tratamento semântico antes da composição');
assert.match(src,/anamnese:Object\.freeze\(\[/,'o banco deve variar aberturas da narrativa clínica');
assert.match(src,/contagem=resultados\.reduce/,'a integração deve resumir resultados sem repetir a lista completa de testes');
assert.match(src,/idsVinculados=new Set/,'testes prioritários devem manter vínculo com a hipótese que os originou');
assert.match(src,/eixoId:a\.id\|\|''/,'resultados do exame devem preservar o eixo clínico de origem');
assert.match(src,/Quanto à segurança clínica/,'segurança clínica deve ser integrada em prosa quando houver conteúdo relevante');
assert.doesNotMatch(src,/`CONDUTA FISIOTERAPÊUTICA\\n\$\{conduta\}`/,'o relatório automático não deve inventar uma conduta não registrada');
assert.match(html,/class="ks-laudo-document"/,'o relatório deve ser apresentado como documento, não como campo solto');
assert.match(html,/id="ks-laudo-texto"/,'o editor existente deve permanecer compatível com salvamento e cópia');
assert.match(css,/#tela_avaliacao #ks-laudo-texto\{[^}]*font-family:Georgia,"Times New Roman",serif[^}]*font-size:17px[^}]*line-height:1\.78/,'o documento deve usar tipografia e entrelinha próprias para leitura prolongada');
assert.match(css,/\.ks-laudo-document\{[^}]*width:min\(100%,940px\)|\.ks-laudo-heading,#tela_avaliacao #ks-laudo-status,#tela_avaliacao \.ks-laudo-document,#tela_avaliacao \.ks-laudo-footer\{[^}]*width:min\(100%,940px\)/,'a linha de leitura do relatório deve ter largura documental');

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
  usuarioLogado:{id:'prof-teste',nome:'Profissional Teste',conselho:'CREFITO',regional:'4',numero_registro:'123456-F',registro:'CREFITO-4 123456-F'},
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
assert.match(report,/refere dor lombar/i,'relato iniciado com sintoma deve receber um verbo de apresentação');
assert.match(report,/alterações do sono/i,'fatores psicossociais devem chegar ao relatório em linguagem documental');
assert.strictEqual((report.match(/Paciente Teste/g)||[]).length,1,'a identificação do paciente não deve ser repetida na anamnese');
assert.match(report,/Teste A (?:foi positivo|mostrou resposta positiva|reproduziu o achado esperado|apresentou resposta compatível)/,'achados positivos devem ser narrados naturalmente');
assert.match(report,/Teste B (?:foi negativo|não reproduziu o achado esperado|não apresentou resposta positiva|não ofereceu suporte ao achado pesquisado)/,'achados negativos devem ser narrados naturalmente');
assert.match(report,/Teste C (?:permaneceu inconclusivo|não permitiu interpretação conclusiva|apresentou resposta indeterminada|exigiu correlação adicional)/,'achados inconclusivos devem preservar a incerteza');
assert.doesNotMatch(report,/\((?:positivo|negativo|inconclusivo)\)/,'o exame não deve parecer uma exportação direta de campos');
assert.match(report,/(?:não preenche|insuficientes para atingir|não atende(?:m)?) (?:o|ao) critério(?: clínico)?(?: registrado| definido| estabelecido)?/,'resultados abaixo do limiar devem produzir interpretação clínica cautelosa');
assert.strictEqual((report.match(/em pé/gi)||[]).length,1,'fator de piora já descrito na HMA não deve ser repetido');
assert.doesNotMatch(report,/positivo\(s\)|negativo\(s\)|inconclusivo\(s\)/,'o relatório não deve exibir flexões mecânicas');
assert.doesNotMatch(report,/CONDUTA FISIOTERAPÊUTICA/,'o texto copiável não deve conter uma conduta genérica inventada');
assert.doesNotMatch(report,/HISTÓRIA CLÍNICA RELEVANTE|EXAME FÍSICO-FUNCIONAL|IMPRESSÃO FISIOTERAPÊUTICA|SEGURANÇA CLÍNICA/,'subtítulos mecânicos não devem fragmentar a narrativa final');
assert.match(report,/Data de emissão: [\s\S]*_{10,}\nProfissional Teste\nCREFITO-4 123456-F$/,'todo relatório deve terminar com data, espaço de assinatura, nome e registro da conta logada');

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
assert.match(somenteNegativos,/(?:não ofereceu suporte|reduziram o suporte) à hipótese de radiculopatia lombar/,'resultado negativo não deve ser apresentado como confirmação');
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
assert.ok(multirregional.indexOf('hipótese de síndrome da dor patelofemoral')<multirregional.indexOf('Na avaliação da coluna torácica'),'a interpretação do joelho deve acompanhar seu exame antes da próxima região');
assert.doesNotMatch(report,/permanece em aberto|registra-se|cabe ressaltar|faz-se necessário/i,'o relatório não deve usar clichês de texto automatizado');

const predominioPositivo=renderizarCaso(
  [{regiao:'Coluna lombar',id:'radiculopatia',nome:'Radiculopatia lombar',achados:[{texto:'SLR',resultado:'positivo'},{texto:'Slump',resultado:'positivo'},{texto:'Déficit sensitivo',resultado:'positivo'},{texto:'Reflexos',resultado:'negativo'}]}],
  [{regiao:'Coluna lombar',codigoHipotese:'radiculopatia',nomeHipotese:'Radiculopatia lombar',nivel:'positivo',redFlags:[]}]
);
assert.match(predominioPositivo,/(?:atingiu|preencheram|atingindo) (?:o|ao) critério (?:clínico )?(?:definido|estabelecido|previsto)/,'três de quatro testes positivos devem preencher o limiar configurado');

const semExame=renderizarCaso([],[]);
assert.doesNotMatch(semExame,/EXAME FÍSICO-FUNCIONAL|IMPRESSÃO FISIOTERAPÊUTICA|SEGURANÇA CLÍNICA/,'seções sem conteúdo não devem ser exibidas');
assert.strictEqual(semExame,'','sem exame, o sistema não deve fabricar um relatório final incompleto');

function testarCondicao({id,nome,regiaoId,regiao,limiar,testes,esperaPreencher=false}){
  context.window.KineSysMotorClinico3.ultimoPlano={versao:'matriz-10',hipoteses:[{id,nome,regiaoId,aConfirmar:[],limiar}],exame:{testesPrioritarios:testes.map(t=>({texto:t.texto,hipoteseId:id}))}};
  const texto=renderizarCaso([{regiaoId,regiao,id,nome,achados:testes}],[{regiao,codigoHipotese:id,nomeHipotese:nome,nivel:'avaliado',redFlags:[]}]);
  if(esperaPreencher)assert.match(texto,/(?:atingiu|preencheram|atingindo) (?:o|ao) critério/);else assert.match(texto,/(?:não preenche|insuficientes para atingir|não atende(?:m)?) (?:o|ao) critério(?: clínico)?(?: necessário| definido| estabelecido)?/);
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
assert.match(obrigatorioAusente,/(?:não preenche|insuficientes para atingir|não atende(?:m)?) (?:o|ao) critério(?: clínico)?(?: registrado| definido| estabelecido)?/,'regra combinada não pode ser aprovada sem o teste obrigatório');
context.window.KineSysMotorClinico3.ultimoPlano.hipoteses[0].regraConfirmacao={tipo:'qualquer'};
const regraQualquer=renderizarCaso(
  [{regiao:'Região teste',id:'combinada',nome:'Hipótese combinada',achados:[{texto:'Teste A',resultado:'positivo'}]}],
  [{regiao:'Região teste',codigoHipotese:'combinada',nomeHipotese:'Hipótese combinada',nivel:'avaliado',redFlags:[]}]
);
assert.match(regraQualquer,/(?:atingiu|preencheram|atingindo) (?:o|ao) critério/,'regra qualquer deve aceitar um achado positivo quando a base assim definir');

const contraditorio=renderizarCaso(
  [{regiao:'Região teste',id:'combinada',nome:'Hipótese combinada',achados:[{texto:'Teste duplicado',resultado:'positivo'},{texto:'Teste duplicado',resultado:'negativo'}]}],
  [{regiao:'Região teste',codigoHipotese:'combinada',nomeHipotese:'Hipótese combinada',nivel:'avaliado',redFlags:[]}]
);
assert.match(contraditorio,/resultados divergentes/i,'resultados contraditórios devem interromper uma conclusão automática');
assert.doesNotMatch(contraditorio,/preenchem o critério|atende ao critério|atingem o critério/,'um exame contraditório não pode sustentar a hipótese');

const hmaField=fields.find(f=>f.id==='paciente_hma'),hmaOriginal=hmaField.value;
hmaField.value='Paciente relata dor na região medial da escápula esquerda. A mesma relata dor há cerca de 1 ano. Paciente relata também quadro de pneumonia severa há cerca de 1 ano, com evolução para sepsemia. Hoje apresenta dor a palpação e queimação na borda medial. Associado a isto apresenta perca de força no ombro hipsilateral, déficiencia para rotação externa e abdução do ombro.';
context.window.KineSysMotorClinico3.ultimoPlano={versao:'caso-escapular',hipoteses:[{id:'neuropatia_supraescapular',nome:'Neuropatia do nervo supraescapular',regiaoId:'ombro',limiar:2}],exame:{testesPrioritarios:[]}};
const narrativaEscapular=renderizarCaso(
  [{regiaoId:'ombro',regiao:'Ombro / complexo glenoumeral',id:'neuropatia_supraescapular',nome:'Neuropatia do nervo supraescapular',achados:[{texto:'Fraqueza de rotação externa ou abdução',resultado:'positivo'},{texto:'Atrofia supra ou infraespinal',resultado:'positivo'}]}],
  [{regiao:'Ombro / complexo glenoumeral',codigoHipotese:'neuropatia_supraescapular',nomeHipotese:'Neuropatia do nervo supraescapular',nivel:'positivo',redFlags:[]}]
);
assert.doesNotMatch(narrativaEscapular,/Paciente relata|A mesma relata|Hoje apresenta|Associado a isto apresenta/i,'o motor deve remover repetições e construções artificiais do relato livre');
assert.match(narrativaEscapular,/Também refere|Atualmente apresenta|O quadro associa-se/i,'o motor deve manter todos os fatos em linguagem clínica natural');
assert.match(narrativaEscapular,/septicemia|dor à palpação|perda de força|ipsilateral|deficiência/i,'o motor deve normalizar erros frequentes sem alterar o sentido clínico');
assert.doesNotMatch(narrativaEscapular,/sepsemia|dor a palpação|perca de força|hipsilateral|déficiencia/i,'erros frequentes da digitação clínica não devem vazar para o documento final');
assert.doesNotMatch(narrativaEscapular,/HISTÓRIA CLÍNICA RELEVANTE|EXAME FÍSICO-FUNCIONAL|IMPRESSÃO FISIOTERAPÊUTICA/,'o caso completo deve permanecer como narrativa contínua');
assert.match(narrativaEscapular,/A avaliação do ombro e do complexo glenoumeral evidenciou/,'anatomia deve introduzir diretamente os achados');
assert.doesNotMatch(narrativaEscapular,/Resultado positivo para|“|”|ombro\s*\//,'achados não devem virar rótulos de formulário');
assert.doesNotMatch(narrativaEscapular,/Durante a entrevista clínica|No contexto clínico|foi avaliada a região|ainda sem força suficiente/,'composição não deve manter as aberturas mecânicas rejeitadas');
assert.ok(!narrativaEscapular.includes('fisioterapêutica.\n\n'),'identificação e história devem formar uma abertura integrada');
const rotulosSupra=[
 'Dor posterior/superior do ombro com distribuição compatível',
 'Fraqueza de rotação externa e/ou abdução não explicada apenas por dor',
 'Atrofia de supra/infraespinal ou contexto de tração/compressão do nervo'
];
for(const resultado of ['positivo','negativo','inconclusivo']){
 const texto=renderizarCaso([{regiaoId:'ombro',regiao:'Ombro / complexo glenoumeral',id:'neuropatia_supraescapular',nome:'Neuropatia do nervo supraescapular',achados:rotulosSupra.map(texto=>({texto,resultado}))}],
  [{regiao:'Ombro / complexo glenoumeral',codigoHipotese:'neuropatia_supraescapular',nomeHipotese:'Neuropatia do nervo supraescapular',nivel:resultado,redFlags:[]}]);
 assert.doesNotMatch(texto,/posterior\/superior|e\/ou|supra\/infraespinal|tração\/compressão|Resultado positivo para|“|”/,'rótulos do banco real devem gerar prosa');
 assert.match(texto,/rotação externa, na abdução ou em ambos os movimentos, não explicada apenas pela dor/,'não transformar alternativas em dois déficits confirmados');
 assert.match(texto,/supraespinhal ou do infraespinhal ou contexto de tração ou compressão/,'não trocar possibilidade de contexto por atrofia confirmada');
 if(resultado==='positivo'){
  assert.match(texto,/não distingue qual dessas situações foi identificada/,'o resultado composto não autoriza escolher um achado');
  assert.match(elements['ks-laudo-status'].textContent,/Especifique no texto qual achado foi observado/,'ambiguidade deve ser sinalizada para revisão profissional');
 }
 if(resultado==='negativo')assert.match(texto,/Não houve resposta positiva na avaliação de atrofia/);
 if(resultado==='inconclusivo')assert.match(texto,/avaliação de atrofia[\s\S]*permaneceu inconclusiva/);
 assert.deepStrictEqual(Array.from(context.window.coletarLaudoAvaliacaoKineSys().validacao.testesAusentes),[],'validação deve reconhecer a descrição equivalente sem perder fatos');
}
const hmaAntesDaComposicao=hmaField.value;
hmaField.value='Paciente relata dor na região da escápula que irradia para base inferior, Também refere dormência na região e dor à palpação, região medial da escápula, apresenta fraqueza de rotação externa, e abdução de ombro. Refere quadro de pneumonia há 1 ano, que evoluiu para septicemia.';
context.window.KineSysMotorClinico3.ultimoPlano={versao:'composicao',hipoteses:[{id:'neuropatia_supraescapular',nome:'Neuropatia do Nervo Supraescapular',regiaoId:'ombro'}],exame:{testesPrioritarios:[]}};
const composicao=renderizarCaso([{regiaoId:'ombro',regiao:'Ombro / complexo glenoumeral',id:'neuropatia_supraescapular',nome:'Neuropatia do Nervo Supraescapular',achados:rotulosSupra.map(texto=>({texto,resultado:'positivo'}))}],
 [{regiao:'Ombro / complexo glenoumeral',codigoHipotese:'neuropatia_supraescapular',nomeHipotese:'Neuropatia do Nervo Supraescapular',nivel:'positivo',redFlags:[]}]);
assert.match(composicao,/Refere dor na região escapular que irradia para sua porção inferior\. Relata dormência local e dor à palpação na região medial da escápula\. Também relata redução da força/,'organizar as orações sem alterar localização e força relatadas');
assert.match(composicao,/Esses achados mantêm a hipótese de neuropatia do nervo supraescapular como possibilidade de investigação, sem estabelecer diagnóstico definitivo/);
assert.ok(composicao.indexOf('sem estabelecer diagnóstico definitivo')<composicao.indexOf('O registro referente à atrofia'),'a lacuna composta deve ficar depois da interpretação, em parágrafo próprio');
assert.deepStrictEqual(Array.from(context.window.coletarLaudoAvaliacaoKineSys().validacao.relatoAusente),[],'verificar fatos na composição final, não num texto intermediário');
hmaField.value=hmaAntesDaComposicao;
if(process.env.KINESYS_EXIBIR_COMPOSICAO==='1')console.log(composicao);
assert.doesNotMatch(narrativaEscapular,/reproduzido de forma consistente|história clínica e os achados objetivos convergem/,'o texto não pode afirmar reprodução da queixa sem um registro específico');
assert.match(narrativaEscapular,/fraqueza na rotação externa ou na abdução/,'um critério composto deve manter suas alternativas, sem atribuir todos os achados ao paciente');
assert.deepStrictEqual(Array.from(context.window.coletarLaudoAvaliacaoKineSys().validacao.relatoAusente),[],'nenhuma frase clínica deve se perder durante a composição');
const unidadesPreservadas=renderizarCaso(
 [{regiaoId:'ombro',regiao:'Ombro',id:'neuropatia_supraescapular',nome:'Neuropatia do nervo supraescapular',achados:[{texto:'Velocidade de marcha 1,2 m/s e dor 3/10',resultado:'positivo'}]}],
 [{regiao:'Ombro',codigoHipotese:'neuropatia_supraescapular',nomeHipotese:'Neuropatia do nervo supraescapular',nivel:'positivo',redFlags:[]}]
);
assert.match(unidadesPreservadas,/1,2 m\/s e dor 3\/10/,'barras de unidades e escalas numéricas não podem virar conjunções');
hmaField.value='Paciente relata dor no ombro esquerdo. Paciente relata dor no ombro esquerdo. Nega parestesia no braço direito. Refere dor de 3.5/10 após corrida e alívio em repouso.';
const relatoPreciso=renderizarCaso(
  [{regiao:'Ombro',id:'neuropatia_supraescapular',nome:'Neuropatia do nervo supraescapular',achados:[{texto:'Teste de força',resultado:'inconclusivo'},{texto:'Dor ao movimento',resultado:'negativo'}]}],
  [{regiao:'Ombro',codigoHipotese:'neuropatia_supraescapular',nomeHipotese:'Neuropatia do nervo supraescapular',nivel:'inconclusivo',redFlags:[]}]
);
assert.strictEqual((relatoPreciso.match(/dor no ombro esquerdo/gi)||[]).length,1,'a mesma frase clínica repetida deve aparecer uma única vez');
assert.match(relatoPreciso,/Nega parestesia no braço direito/,'negações e lateralidade devem ser preservadas');
assert.match(relatoPreciso,/3\.5\/10 após corrida e alívio em repouso/,'números decimais e fatores de alívio devem permanecer intactos');
assert.match(relatoPreciso,/Teste de força permaneceu inconclusivo/,'a incerteza de um teste não pode virar ausência ou confirmação');
context.window.preencherLaudoAvaliacaoKineSys(null);
context.window.renderizarLaudoAvaliacaoKineSys();
assert.strictEqual(elements['ks-laudo-texto'].value,relatoPreciso,'a mesma avaliação deve gerar um texto estável em cada carregamento');
context.window.preencherLaudoAvaliacaoKineSys({texto:'Texto profissional revisado.',textoAutomatico:true,revisado:true,versaoTexto:14,fonte:'anterior'});
context.window.renderizarLaudoAvaliacaoKineSys();
assert.ok(elements['ks-laudo-texto'].value.startsWith('Texto profissional revisado.\n\nData de emissão:'),'migração deve preservar o texto revisado e acrescentar somente o fechamento');
context.window.preencherLaudoAvaliacaoKineSys({texto:'Texto editado manualmente.',textoAutomatico:false,revisado:false,versaoTexto:14,fonte:'anterior'});
context.window.renderizarLaudoAvaliacaoKineSys();
assert.ok(elements['ks-laudo-texto'].value.startsWith('Texto editado manualmente.\n\nData de emissão:'),'migração deve preservar o texto editado e acrescentar somente o fechamento');
// Exercita todos os rótulos reais em três estados; não equivale a validar diagnósticos.
const corpusClinico=vm.createContext({});
vm.runInContext(fs.readFileSync('database/mapeamento_clinico.js','utf8'),corpusClinico);
for(const arquivo of fs.readdirSync('database/regioes').filter(nome=>nome.endsWith('-ext-1.0.0.js')))vm.runInContext(fs.readFileSync('database/regioes/'+arquivo,'utf8'),corpusClinico);
const bancoReal=vm.runInContext('BANCO_MAPEAMENTO_CLINICO',corpusClinico);
let narrativasVerificadas=0;
for(const [regiaoId,regiao] of Object.entries(bancoReal)){
 for(const item of [...regiao.clusters,...regiao.diferenciais]){
  if(!item.testes?.length)continue;
  context.window.KineSysMotorClinico3.ultimoPlano={versao:'corpus-narrativo',hipoteses:[{id:item.id,nome:item.nome,regiaoId,aConfirmar:[]}],exame:{testesPrioritarios:[]}};
  for(const resultado of ['positivo','negativo','inconclusivo']){
   const texto=renderizarCaso([{regiaoId,regiao:regiao.nome,id:item.id,nome:item.nome,achados:item.testes.map(texto=>({texto,resultado}))}],
    [{regiao:regiao.nome,codigoHipotese:item.id,nomeHipotese:item.nome,nivel:resultado,redFlags:[]}]);
   const laudoTeste=context.window.coletarLaudoAvaliacaoKineSys();
   assert.ok(texto.trim(),`${item.id}: documento não vazio`);
   assert.deepStrictEqual(Array.from(laudoTeste.validacao.testesAusentes),[],`${item.id} ${resultado}: todos os achados precisam estar representados`);
   assert.doesNotMatch(texto,/undefined|\[object Object\]|Resultado positivo para “/,'não exportar dados crus');
   assert.match(texto,/Data de emissão:[\s\S]*CREFITO/,'preservar fechamento documental');
   narrativasVerificadas++;
  }
 }
}
console.log(`Clinical narrative corpus: ${narrativasVerificadas} documents across ${Object.keys(bancoReal).length} regions OK`);
const gtpsPublicado=bancoReal.quadril.clusters.find(h=>h.id==='gtps');
context.window.KineSysMotorClinico3.ultimoPlano={versao:'gtps-evidencia',hipoteses:[{id:gtpsPublicado.id,nome:gtpsPublicado.nome,regiaoId:'quadril',item:gtpsPublicado}],exame:{testesPrioritarios:[]}};
for(const [respostas,preenche] of [[['positivo','positivo','',''],true],[['negativo','negativo','positivo','positivo'],false],[['positivo','inconclusivo','positivo','positivo'],false]]){
 const texto=renderizarCaso([{regiaoId:'quadril',regiao:'Quadril',id:'gtps',nome:gtpsPublicado.nome,achados:gtpsPublicado.testes.map((texto,i)=>({texto,resultado:respostas[i]||'nao_avaliado'}))}],
  [{regiao:'Quadril',codigoHipotese:'gtps',nomeHipotese:gtpsPublicado.nome,nivel:'avaliado',redFlags:[]}]);
 if(preenche)assert.match(texto,/(?:atingiu|preencheram|atingindo) (?:o|ao) critério/);
 else assert.match(texto,/(?:não preenche|insuficientes para atingir|não atende(?:m)?) (?:o|ao) critério/,'laudo deve respeitar os dois testes publicados, e não uma soma arbitrária');
}
const ausenciaNegativa=renderizarCaso([{regiaoId:'ombro',regiao:'Ombro',id:'ausencia',nome:'Verificação de segurança',achados:[{texto:'Ausência de sinais sistêmicos preocupantes',resultado:'negativo'}]}],[]);
assert.match(ausenciaNegativa,/critério de ausência não foi confirmado/);
assert.doesNotMatch(ausenciaNegativa,/O exame evidenciou sinais sistêmicos/,'negação de ausência não comprova presença');
const declaracaoNegativa=renderizarCaso([{regiaoId:'ombro',regiao:'Ombro',id:'provocacao',nome:'Provocação',achados:[{texto:'Palpação reproduz a dor familiar',resultado:'negativo'}]}],[]);
assert.match(declaracaoNegativa,/Não se confirmou no exame que palpação reproduzisse a dor familiar/);
hmaField.value='';
const semHistoria=renderizarCaso(
  [{regiao:'Região teste',id:'combinada',nome:'Hipótese combinada',achados:[{texto:'Teste A',resultado:'positivo'}]}],
  [{regiao:'Região teste',codigoHipotese:'combinada',nomeHipotese:'Hipótese combinada',nivel:'avaliado',redFlags:[]}]
);
assert.strictEqual(semHistoria,'','sem HMA, o sistema não deve preencher o documento com frases de ausência de dados');
assert.match(elements['ks-laudo-status'].textContent,/História da Moléstia Atual/,'a pendência deve aparecer fora do documento');
hmaField.value=hmaOriginal;

// Comunicação interprofissional: valores e plano já registrados, sem gerar novos questionários.
context.clinicaEstruturadaPreservada={
  medidasObjetivas:[{nome:'Flexão de joelho',valor:95,unidade:'°',observacao:'lado esquerdo'},{nome:'Extensão de joelho',valor:0,unidade:'°'}],
  psfs:{itens:[{atividade:'Subir escadas',valor:3},{atividade:'Caminhar',valor:4.5}],media:3.75},
  outcomes:[{nome:'LEFS',valor:42,faixa:'0–80',observacao:'versão apresentada pelo paciente'}],
  objetivosPlano:{plano:'exercícios graduados conforme tolerância',frequencia:'duas sessões por semana',objetivos:[{objetivo:'retornar à caminhada',baseline:'10 minutos',meta:'30 minutos',prazo:'quatro semanas',status:'em_progresso'}],criterios:'reavaliar dor e capacidade funcional',criteriosAlta:'atingir a meta funcional estabelecida',previsaoAlta:'2026-11-14'}
};
context.coletarRestricoesPosOperatorias=()=>({ativo:true,procedimento:'reconstrução ligamentar',dataCirurgia:'2026-09-01',statusCarga:'parcial',ortese:'órtese articulada',restricaoADM:'flexão limitada a 90°',proibicoes:'evitar pivô',orientacoesCirurgiao:'progredir apoio após revisão',retornoMedico:'2026-10-20',protocoloDisponivel:'nao_informado',observacoes:'Mantém acompanhamento da equipe cirúrgica.'});
elements.avaliacao_realizado_em={value:'2026-10-14T08:20'};
const comunicacao=renderizarCaso(
  [{regiao:'Joelho',id:'patelofemoral',nome:'Síndrome da dor patelofemoral',achados:[{texto:'Dor ao agachamento',resultado:'positivo'}]}],
  [{regiao:'Joelho',codigoHipotese:'patelofemoral',nomeHipotese:'Síndrome da dor patelofemoral',nivel:'avaliado',redFlags:[]}]
);
assert.match(comunicacao,/avaliação fisioterapêutica em 14\/10\/2026/,'data de atendimento fora da anamnese deve aparecer no documento');
assert.match(comunicacao,/diabetes mellitus \(DM\)/,'siglas de antecedentes devem ser explicadas para o destinatário');
assert.match(comunicacao,/Flexão de joelho: 95 ° \(lado esquerdo\)/i,'medidas devem conservar valor, unidade e lado');
assert.match(comunicacao,/Extensão de joelho: 0 °/i,'zero é resultado válido e não pode desaparecer');
assert.match(comunicacao,/Subir escadas: 3\/10; Caminhar: 4,5\/10/,'capacidades registradas devem ser agrupadas com suas pontuações');
assert.match(comunicacao,/LEFS: 42, na faixa registrada de 0–80/,'escores devem ser preservados sem classificar gravidade sem regra validada');
assert.match(comunicacao,/exercícios graduados conforme tolerância|duas sessões por semana|retornar à caminhada/,'plano informado pelo profissional deve compor o relatório');
assert.match(comunicacao,/apoio parcial de carga/,'código de restrição deve virar expressão clínica');
assert.match(comunicacao,/retorno médico previsto para 20\/10\/2026/,'retorno médico deve permanecer explícito');
assert.doesNotMatch(comunicacao,/statusCarga|restricaoADM|em_progresso|nao_informado/,'códigos internos não devem vazar para o documento');
assert.strictEqual((comunicacao.match(/Data de emissão:/g)||[]).length,1,'deve existir somente um fechamento');
for(let i=0;i<3;i++)context.window.renderizarLaudoAvaliacaoKineSys();
assert.strictEqual((elements['ks-laudo-texto'].value.match(/Data de emissão:/g)||[]).length,1,'reabrir ou coletar o relatório não pode duplicar a assinatura');
context.usuarioLogado={id:'outro-prof',nome:'Outra Profissional',conselho:'CREFITO',regional:'3',numero_registro:'654321-F'};
context.window.renderizarLaudoAvaliacaoKineSys();
assert.match(elements['ks-laudo-texto'].value,/Outra Profissional\nCREFITO-3 654321-F$/,'assinatura deve acompanhar os campos públicos da conta logada');
assert.doesNotMatch(elements['ks-laudo-texto'].value,/Profissional Teste|123456-F/,'a assinatura anterior não deve persistir após trocar de conta');
context.usuarioLogado={id:'sem-registro',nome:'Profissional sem registro'};
context.window.renderizarLaudoAvaliacaoKineSys();
assert.match(elements['ks-laudo-texto'].value,/Profissional sem registro\nRegistro profissional \(conselho e número\): _+$/,'sem registro cadastrado, o motor deve oferecer espaço preenchível');
assert.doesNotMatch(elements['ks-laudo-texto'].value,/CREFITO-3|654321-F/,'nunca reutilizar o registro de outro profissional');

async function testarExameRestaurado(){
  const consultarOriginal=context.document.querySelectorAll;
  context.document.querySelectorAll=s=>s==='#grupo_regioes_mapeamento input:checked'?[{dataset:{regiao:'joelho'}}]:consultarOriginal(s);
  let bancoPronto=false,concluirBanco;
  const carga=new Promise(resolve=>{concluirBanco=resolve;});
  context.window.KineSysClinicalRegionLoader={status:()=>({bankRegions:bancoPronto?['joelho']:[]}),ensure:()=>carga};
  const textoAnterior=elements['ks-laudo-texto'].value;
  context.window.renderizarLaudoAvaliacaoKineSys();
  assert.match(elements['ks-laudo-status'].textContent,/Carregando os resultados do exame/,'entrada direta na etapa 3 deve aguardar o banco da região restaurada');
  assert.strictEqual(elements['ks-laudo-texto'].value,textoAnterior,'texto existente não deve ser apagado durante o carregamento');
  await Promise.resolve();
  bancoPronto=true;concluirBanco();
  await carga;
  await new Promise(setImmediate);
  assert.match(elements['ks-laudo-texto'].value,/dor ao agachamento/i,'o relatório deve incorporar o exame quando o banco fica pronto');
  assert.doesNotMatch(elements['ks-laudo-status'].textContent,/Carregando|falta registrar/,'os testes restaurados devem gerar o documento sem voltar à etapa 2');
}
testarExameRestaurado().then(()=>console.log('Evaluation clinical correlation contract OK')).catch(error=>{console.error(error);process.exitCode=1;});

