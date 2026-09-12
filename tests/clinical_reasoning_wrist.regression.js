const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let currentHma = '';
let currentContext = {};

global.window = global;
const enriquecerCotoveloSentinela = plano => { plano.__cotoveloPreservado = true; return plano; };
global.enriquecerPlanoCotoveloKineSys = enriquecerCotoveloSentinela;
global.BANCO_MAPEAMENTO_CLINICO = {
  punho_mao: {
    clusters: [
      {id:'tunel_carpo',nome:'Síndrome do Túnel do Carpo — padrão clínico',limiar:2,testes:['Distribuição mediana','Durkan','Phalen']},
      {id:'dequervain',nome:'Tenossinovite de De Quervain',limiar:2,testes:['Dor primeiro compartimento','Finkelstein','WHAT']},
      {id:'fratura_radio_distal_reabilitacao',nome:'Fratura distal do rádio — conservador ou pós-operatório',limiar:2,testes:['Consolidação','ADM','Edema/preensão']},
      {id:'pos_operatorio_tendao_mao',nome:'Pós-reparo de tendão flexor/extensor da mão',limiar:2,testes:['Protocolo','ADM','Integridade']}
    ],
    diferenciais: [
      {id:'tfcc',nome:'Lesão do Complexo da Fibrocartilagem Triangular (TFCC)',testes:['Dor ulnar','Fovea','Press test']},
      {id:'instabilidade_escafolunar',nome:'Lesão / Instabilidade Escafolunar',testes:['Dor dorsal-radial','Watson','Instabilidade']},
      {id:'rizartrose',nome:'Osteoartrite CMC do Polegar / Rizartrose',testes:['Dor base polegar','Grind','Pinça']},
      {id:'radiculopatia_neuropatia_proximal',nome:'Origem Cervical / Neuropatia Proximal — diferencial',testes:['Distribuição','Cervical','Neurológico']}
    ]
  }
};
global.coletarContextoClinico = () => ({
  origemIrradiacao: '', irradiacao: '', comorbidades: [], medicamentos: [], cirurgias: [],
  textoComorbidades: '', textoMedicamentos: '', textoCirurgias: '',
  ...currentContext
});
global.document = {
  readyState: 'loading',
  addEventListener: () => {},
  getElementById: (id) => {
    if (id === 'paciente_hma') return { value: currentHma };
    if (id === 'paciente_idade') return { value: currentContext.idade || '' };
    return null;
  }
};

vm.runInThisContext(fs.readFileSync(__dirname + '/../src/clinical/clinical_reasoning_wrist-3.1.0.js', 'utf8'));

function base(regioes=['punho_mao'], extra={}) {
  return {
    insuficiente: false,
    regioes: regioes.map(id => ({ id, nome: id === 'punho_mao' ? 'Punho e Mão' : id })),
    hipoteses: [],
    exame: { seguranca: [], testesPrioritarios: [], analises: [], modificadores: [] },
    lacunas: [],
    ...extra
  };
}
function ids(plano) {
  return plano.hipoteses.filter(h => h.regiaoId === 'punho_mao' && h.motor31?.condicaoId).map(h => h.motor31.condicaoId);
}
function topId(plano) {
  return plano.hipoteses.find(h => h.regiaoId === 'punho_mao' && h.motor31?.condicaoId)?.motor31?.condicaoId || null;
}
function run(c) {
  currentHma = c.hma;
  currentContext = c.contexto || {};
  const extra = c.extra || {};
  const p = window.enriquecerPlanoPunhoMaoKineSys(base(c.regioes || ['punho_mao'], extra));
  const got = ids(p);
  for (const id of (c.inclui || [])) assert(got.includes(id), `${c.id}: esperava ${id}; recebeu ${got.join(', ') || '(nenhum)'}`);
  for (const id of (c.naoInclui || [])) assert(!got.includes(id), `${c.id}: não deveria priorizar ${id}; recebeu ${got.join(', ')}`);
  if (c.top) assert.strictEqual(topId(p), c.top, `${c.id}: top inesperado; recebeu ${topId(p)}`);
  if (c.seguranca) {
    const s=(p.exame.seguranca||[]).map(x=>`${x.titulo} ${x.descricao}`).join(' | ');
    assert(c.seguranca.test(s), `${c.id}: alerta esperado não encontrado: ${s}`);
  }
  if (c.correlacao !== undefined) assert.strictEqual(p.exame.correlacaoProximalPunhoMao?.ativa,c.correlacao,`${c.id}: correlação proximal incorreta`);
  if (c.semRotulo) {
    const nomes=p.hipoteses.filter(h=>h.motor31).map(h=>h.nome).join(' | ');
    assert(!c.semRotulo.test(nomes),`${c.id}: rótulo informado virou hipótese do motor: ${nomes}`);
  }
  if (c.legacy) assert.strictEqual(p.motor31?.regiao,c.legacy,`${c.id}: plano.motor31 legado foi alterado`);
  assert(p.motores31?.punho_mao, `${c.id}: motores31.punho_mao ausente`);
  return {id:c.id,top:topId(p)||'-',ids:got.join(','),seguranca:(p.exame.seguranca||[]).length};
}

const casos = [
  {id:'W01-cts-noturno',hma:'Acordo de noite com polegar, indicador e dedo médio formigando e a mão dormente; sacudir a mão melhora.',inclui:['tunel_carpo'],top:'tunel_carpo'},
  {id:'W02-cts-dirigindo',hma:'Quando dirijo ou seguro o celular minha mão formiga, principalmente polegar, indicador e médio.',inclui:['tunel_carpo'],top:'tunel_carpo'},
  {id:'W03-guyon-bike',hma:'Pedalando e apoiando a palma no guidão começo a sentir formigamento no anelar e mindinho.',inclui:['punho_ulnar_guyon'],top:'punho_ulnar_guyon'},
  {id:'W04-ulnar-cotovelo',hma:'O anelar e o mindinho formigam quando deixo o cotovelo dobrado ou apoiado; o punho não dói.',inclui:['radiculopatia_neuropatia_proximal'],naoInclui:['punho_ulnar_guyon'],top:'radiculopatia_neuropatia_proximal'},
  {id:'W05-cervical',hma:'A dor começa no pescoço, desce pelo braço até a mão e os dedos formigam; virar o pescoço piora.',inclui:['radiculopatia_neuropatia_proximal'],top:'radiculopatia_neuropatia_proximal'},
  {id:'W06-dequervain',hma:'Dor na lateral do punho perto do polegar para pegar o bebê e abrir potes; mexer o polegar piora.',inclui:['dequervain'],top:'dequervain'},
  {id:'W07-tfcc',hma:'Dor do lado do mindinho no punho; piora para girar a chave e quando apoio o peso na mão para levantar da cadeira.',inclui:['tfcc'],top:'tfcc'},
  {id:'W08-escafolunar',hma:'Depois de cair com a mão espalmada fiquei com dor no dorso do punho e um clique doloroso quando apoio peso.',inclui:['instabilidade_escafolunar'],top:'instabilidade_escafolunar'},
  {id:'W09-escafoide',hma:'Caí com a mão aberta e desde então dói muito na tabaqueira anatômica perto do polegar.',inclui:['punho_escafoide'],top:'punho_escafoide',seguranca:/escafoide/i},
  {id:'W10-trauma-maior',hma:'Caí sobre a mão ontem, o punho ficou deformado e não consigo mexer direito.',inclui:['punho_trauma_maior'],top:'punho_trauma_maior',seguranca:/trauma importante|fratura-luxação/i},
  {id:'W11-infeccao',hma:'A mão está muito quente, vermelha e inchada depois de um corte e estou com febre e calafrios.',inclui:['punho_infeccao'],top:'punho_infeccao',seguranca:/infecção/i},
  {id:'W12-compartimental',hma:'Depois do trauma o antebraço ficou muito tenso e inchado, com dor insuportável e dor ao esticar os dedos.',inclui:['punho_compartimental'],top:'punho_compartimental',seguranca:/compartimental/i},
  {id:'W13-vascular',hma:'Depois do trauma minha mão ficou fria e pálida e parece que perdeu o pulso.',inclui:['punho_vascular_agudo'],top:'punho_vascular_agudo',seguranca:/vascular/i},
  {id:'W14-radio-distal',hma:'Quebrei o punho, fratura do rádio distal, usei gesso e agora estou iniciando fisioterapia.',inclui:['fratura_radio_distal_reabilitacao'],top:'fratura_radio_distal_reabilitacao'},
  {id:'W15-rizartrose',hma:'Dor na base do polegar para fazer pinça e abrir pote, com crepitação.',contexto:{idade:64},inclui:['rizartrose'],top:'rizartrose'},
  {id:'W16-sobrecarga',hma:'Depois de aumentar a musculação comecei com dor no punho ao estender contra peso, sem queda e sem formigamento.',inclui:['punho_sobrecarga_tendinea'],top:'punho_sobrecarga_tendinea'},
  {id:'W17-pos-tendao',hma:'Fiz cirurgia para reparo de tendão flexor cortado no dedo e estou no pós-operatório.',inclui:['pos_operatorio_tendao_mao'],top:'pos_operatorio_tendao_mao'},
  {id:'W18-crps',hma:'Depois da fratura do punho a dor ficou desproporcional e persistente; a mão muda de cor, sua muito e dói até ao toque.',inclui:['punho_crps']},
  {id:'W19-rotulo-cts',hma:'O médico falou túnel do carpo, mas eu só sei dizer que minha mão dói.',semRotulo:/túnel do carpo/i},
  {id:'W20-generico',hma:'Meu punho dói há alguns dias, não sei explicar onde nem o que piora.'},
  {id:'W21-edema-sem-febre',hma:'Meu punho ficou um pouco inchado depois de usar muito o computador, sem febre, sem vermelhidão e sem calor.',naoInclui:['punho_infeccao']},
  {id:'W22-radial-sem-trauma',hma:'Sem queda ou trauma, dor na estiloide radial do punho ao pegar o bebê e mexer o polegar.',inclui:['dequervain'],naoInclui:['punho_escafoide'],top:'dequervain'},
  {id:'W23-ulnar-sem-neuro',hma:'Dor ulnar no punho para girar maçaneta e apoiar peso, sem formigamento ou dormência.',inclui:['tfcc'],naoInclui:['punho_ulnar_guyon'],top:'tfcc'},
  {id:'W24-mediano-nao-ulnar',hma:'Formigamento noturno no polegar, indicador e médio; não sinto nada no mindinho.',inclui:['tunel_carpo'],naoInclui:['punho_ulnar_guyon'],top:'tunel_carpo'},
  {id:'W25-correlacao',hma:'Tenho dor no punho e formigamento na mão, e às vezes piora quando apoio o cotovelo.',regioes:['punho_mao','cotovelo'],correlacao:true},
  {id:'W26-sem-correlacao',hma:'Dor na base do polegar para abrir potes, sem sintomas no braço ou cotovelo.',correlacao:false},
  {id:'W27-legacy',hma:'Dor do lado do mindinho no punho ao girar chave e apoiar peso.',extra:{motor31:{regiao:'cotovelo',versao:'x'},motores31:{cotovelo:{regiao:'cotovelo'}}},inclui:['tfcc'],legacy:'cotovelo'}
];

const resultados=casos.map(run);

// Integração com o contrato vigente do Motor 3.0: Punho/Mão é encadeado após
// o enriquecedor de cotovelo sem apagar nem substituir o comportamento anterior.
currentHma='Dor do lado do mindinho no punho ao girar chave e apoiar peso.';
currentContext={};
const bridgePlan=window.enriquecerPlanoCotoveloKineSys(base(['punho_mao']));
assert.strictEqual(bridgePlan.__cotoveloPreservado,true,'Ponte Punho/Mão apagou o enriquecedor anterior de cotovelo');
assert(bridgePlan.motores31?.punho_mao,'Ponte Punho/Mão não executou o enriquecedor regional');
assert.strictEqual(window.enriquecerPlanoCotoveloKineSys.__original,enriquecerCotoveloSentinela,'Ponte não preservou referência do enriquecedor original');

console.table(resultados);
console.log(`Punho/Mão 3.1 regression: ${resultados.length}/${casos.length} cenários aprovados + ponte de integração aprovada.`);
