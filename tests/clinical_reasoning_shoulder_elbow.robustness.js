const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let currentHma = '';
let currentContext = {};

global.window = global;
global.BANCO_MAPEAMENTO_CLINICO = {
  ombro: { clusters: [], diferenciais: [] },
  cotovelo: { clusters: [], diferenciais: [] }
};
global.coletarContextoClinico = () => ({
  origemIrradiacao: '',
  irradiacao: '',
  comorbidades: [],
  textoComorbidades: '',
  textoMedicamentos: '',
  textoCirurgias: '',
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

vm.runInThisContext(fs.readFileSync('clinical_reasoning_shoulder-3.1.0.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('clinical_reasoning_elbow-3.1.0.js', 'utf8'));

function base(regioes) {
  return {
    insuficiente: false,
    regioes: regioes.map(id => ({ id, nome: id === 'ombro' ? 'Ombro' : 'Cotovelo' })),
    hipoteses: [],
    exame: { seguranca: [], testesPrioritarios: [], analises: [] },
    lacunas: []
  };
}

function ids(plano, regiao) {
  return plano.hipoteses
    .filter(h => h.regiaoId === regiao && h.motor31?.condicaoId)
    .map(h => h.motor31.condicaoId);
}

function topId(plano, regiao) {
  return ids(plano, regiao)[0] || null;
}

function executar(caso) {
  currentHma = caso.hma;
  currentContext = caso.contexto || {};
  let plano = base(caso.regioes);

  for (const etapa of caso.aplicar) {
    if (etapa === 'ombro') plano = window.enriquecerPlanoOmbroKineSys(plano);
    if (etapa === 'cotovelo') plano = window.enriquecerPlanoCotoveloKineSys(plano);
  }

  for (const [regiao, esperados] of Object.entries(caso.inclui || {})) {
    const atuais = ids(plano, regiao);
    for (const esperado of esperados) {
      assert(atuais.includes(esperado), `${caso.id}: esperava ${esperado} em ${regiao}; recebeu ${atuais.join(', ') || '(nenhum)'}`);
    }
  }

  for (const [regiao, proibidos] of Object.entries(caso.naoInclui || {})) {
    const atuais = ids(plano, regiao);
    for (const proibido of proibidos) {
      assert(!atuais.includes(proibido), `${caso.id}: não deveria priorizar ${proibido} em ${regiao}; recebeu ${atuais.join(', ') || '(nenhum)'}`);
    }
  }

  for (const [regiao, esperado] of Object.entries(caso.top || {})) {
    assert.strictEqual(topId(plano, regiao), esperado, `${caso.id}: prioridade principal inesperada em ${regiao}; recebeu ${ids(plano, regiao).join(', ') || '(nenhum)'}`);
  }

  if (caso.ordem) {
    for (const [regiao, esperada] of Object.entries(caso.ordem)) {
      assert.deepStrictEqual(ids(plano, regiao).slice(0, esperada.length), esperada, `${caso.id}: ordem inicial instável/incorreta em ${regiao}`);
    }
  }

  const seguranca = (plano.exame.seguranca || []).map(x => `${x.titulo} ${x.descricao}`).join(' | ');
  if (caso.seguranca) assert(caso.seguranca.test(seguranca), `${caso.id}: alerta de segurança esperado não encontrado`);
  if (caso.semSeguranca) assert.strictEqual((plano.exame.seguranca || []).length, 0, `${caso.id}: gerou alerta de segurança sem suporte positivo`);

  if (caso.pergunta) {
    const perguntas = [
      ...(plano.exame.perguntasDirigidasOmbro || []),
      ...(plano.exame.perguntasDirigidasCotovelo || [])
    ].join(' | ');
    assert(caso.pergunta.test(perguntas), `${caso.id}: pergunta discriminativa esperada não encontrada`);
  }

  if (caso.objetivo) {
    const objetivos = [
      ...(plano.exame.objetivosOmbro || []),
      ...(plano.exame.objetivosCotovelo || []),
      ...(plano.exame.testesPrioritarios || []).map(x => x.texto || '')
    ].join(' | ');
    assert(caso.objetivo.test(objetivos), `${caso.id}: objetivo de exame esperado não encontrado`);
  }

  if (caso.correlacao !== undefined) {
    assert.strictEqual(plano.exame.correlacaoOmbroCotovelo?.ativa, caso.correlacao, `${caso.id}: correlação ombro-cotovelo incorreta`);
  }

  return {
    id: caso.id,
    topOmbro: topId(plano, 'ombro') || '-',
    topCotovelo: topId(plano, 'cotovelo') || '-',
    ombro: ids(plano, 'ombro').join(','),
    cotovelo: ids(plano, 'cotovelo').join(','),
    seguranca: (plano.exame.seguranca || []).length
  };
}

const casos = [
  // OMBRO — linguagem coloquial, negativas, contexto e coexistência.
  {id:'R-O01-coloquial-manguito',hma:'Meu onbro doi por fora qnd levanto o braco pra pegar coisa no alto.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_manguito']},top:{ombro:'ombro_manguito'}},
  {id:'R-O02-ac-coloquial',hma:'Dói bem no ossinho no topo do ombro perto da clavícula e piora quando cruzo o braço.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_ac']},top:{ombro:'ombro_ac'}},
  {id:'R-O03-capsulite-coloquial',hma:'Foi ficando preso aos poucos; até quando outra pessoa tenta mexer meu braço ele não vai direito e mão nas costas não chega.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_capsulite']},top:{ombro:'ombro_capsulite'},objetivo:/ADM ativa e passiva|rotação externa passiva/i},
  {id:'R-O04-biceps-coloquial',hma:'Dói na frente do ombro quando faço rosca e quando pego peso com a palma virada pra cima.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_biceps']}},
  {id:'R-O05-instabilidade-coloquial',hma:'Quando armo o braço parece que o ombro vai escapar e fico com medo de jogar ele pra trás.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_instabilidade']},top:{ombro:'ombro_instabilidade'}},
  {id:'R-O06-clique-indolor',hma:'Meu ombro dá um clique lá dentro, mas o clique não dói, não prende e não limita nada.',regioes:['ombro'],aplicar:['ombro'],naoInclui:{ombro:['ombro_labral']}},
  {id:'R-O07-pmr-idade-incompativel',hma:'Os dois ombros amanhecem travados e os quadris também doem; demoro para soltar de manhã.',contexto:{idade:35},regioes:['ombro'],aplicar:['ombro'],naoInclui:{ombro:['ombro_pmr']},semSeguranca:true},
  {id:'R-O08-pmr-idade-compativel',hma:'Os dois ombros amanhecem travados e os quadris também doem; demoro para soltar de manhã.',contexto:{idade:68},regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_pmr']},top:{ombro:'ombro_pmr'},seguranca:/polimialgia reumática/i},
  {id:'R-O09-neuro-negado',hma:'Dor lateral no ombro ao elevar. Não tenho formigamento nem dormência na mão e mexer o pescoço não muda a dor.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_manguito']},naoInclui:{ombro:['ombro_cervical_referida']}},
  {id:'R-O10-trauma-negado',hma:'O ombro começou a doer sozinho; sem queda, sem pancada e sem trauma.',regioes:['ombro'],aplicar:['ombro'],naoInclui:{ombro:['ombro_trauma_maior']},semSeguranca:true},
  {id:'R-O11-trauma-remoto',hma:'Caí desse lado há dez anos, mas essa dor no ombro começou agora sem queda nem trauma novo.',regioes:['ombro'],aplicar:['ombro'],naoInclui:{ombro:['ombro_trauma_maior']},semSeguranca:true},
  {id:'R-O12-ruptura-negada',hma:'Ombro dói para elevar, mas não perdi força, o braço não cai e consigo levantar sozinho.',regioes:['ombro'],aplicar:['ombro'],naoInclui:{ombro:['ombro_ruptura_manguito','ombro_trauma_maior']},semSeguranca:true},
  {id:'R-O13-ac-manguito-coexistem',hma:'Tenho dor lateral ao elevar o braço e também dor bem no topo do ombro quando cruzo o braço para o lado contrário.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_manguito','ombro_ac']}},
  {id:'R-O14-diabetes-sem-rigidez',hma:'Tenho diabetes e comecei com dor leve no ombro, mas mexo normalmente e não sinto rigidez.',contexto:{idade:58,diabetico:true,textoComorbidades:'diabetes'},regioes:['ombro'],aplicar:['ombro'],naoInclui:{ombro:['ombro_capsulite']}},
  {id:'R-O15-diabetes-com-rigidez-passiva',hma:'Tenho diabetes; o ombro foi travando aos poucos, mão nas costas não chega e até outra pessoa não consegue girar meu braço.',contexto:{idade:58,diabetico:true,textoComorbidades:'diabetes'},regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_capsulite']},top:{ombro:'ombro_capsulite'}},
  {id:'R-O16-calcificacao-incidental',hma:'Raio X mostrou cálcio no ombro, mas esse ombro não dói, não está rígido e não limita minhas atividades.',regioes:['ombro'],aplicar:['ombro'],naoInclui:{ombro:['ombro_calcaria']}},

  // COTOVELO — erros de escrita, negativas e diferenciação local/proximal.
  {id:'R-C01-erro-escrita-lateral',hma:'Meu cotuvelo do lado de fora doi qnd aperto a mao e carrego sacola.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_lateral']},top:{cotovelo:'cotovelo_lateral'}},
  {id:'R-C02-ulnar-coloquial',hma:'Anelar e mindinho formiga qdo fico com o cotovelo dobrado ou apoiado.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_ulnar']},top:{cotovelo:'cotovelo_ulnar'},pergunta:/quarto\/quinto dedos|borda ulnar/i},
  {id:'R-C03-ulnar-negado',hma:'Dor do lado de dentro do cotovelo, mas não tenho formigamento no anelar nem no mindinho e não sinto choque.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_medial']},naoInclui:{cotovelo:['cotovelo_ulnar']}},
  {id:'R-C04-infeccao-negada',hma:'Cotovelo ficou vermelho e inchado depois de apoiar, mas não está quente e estou sem febre ou calafrios.',regioes:['cotovelo'],aplicar:['cotovelo'],naoInclui:{cotovelo:['cotovelo_infeccao_articular']},semSeguranca:true},
  {id:'R-C05-infeccao-positiva',hma:'Cotovelo vermelho, inchado e muito quente, com febre e calafrios desde ontem.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_infeccao_articular']},top:{cotovelo:'cotovelo_infeccao_articular'},seguranca:/infecção articular\/bursal/i,objetivo:/estado sistêmico|Sinais vitais/i},
  {id:'R-C06-olecrano-sem-infeccao',hma:'Tem uma bola mole na ponta do cotovelo de tanto apoiar na mesa; sem calor, sem vermelhidão e sem febre.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_olecrano']},naoInclui:{cotovelo:['cotovelo_infeccao_articular']}},
  {id:'R-C07-tunel-radial-vs-lateral',hma:'Dor no antebraço lateral alguns centímetros abaixo do epicôndilo; piora para supinar, mas apertar a mão não reproduz.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_tunel_radial']},naoInclui:{cotovelo:['cotovelo_lateral']}},
  {id:'R-C08-ucl-prioritario',hma:'Arremessando sinto dor do lado de dentro do cotovelo na carga em valgo; flexionar o punho e pronar não reproduzem.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_ucl']},top:{cotovelo:'cotovelo_ucl'}},
  {id:'R-C09-articular-negado',hma:'Meu cotovelo não trava, estica totalmente, não range e não está rígido; a dor é só ao apertar a mão.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_lateral']},naoInclui:{cotovelo:['cotovelo_articular']}},
  {id:'R-C10-trauma-negado',hma:'Dor no cotovelo começou aos poucos; não caí, não bati e não houve trauma.',regioes:['cotovelo'],aplicar:['cotovelo'],naoInclui:{cotovelo:['cotovelo_trauma_maior']},semSeguranca:true},
  {id:'R-C11-cervical-e-local-coexistem',hma:'A dor vem do pescoço até a mão com formigamento, mas também tenho dor focal lateral no cotovelo que piora ao apertar a mão.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_cervical_neural','cotovelo_lateral']},top:{cotovelo:'cotovelo_cervical_neural'}},
  {id:'R-C12-rotulo-ombro-nao-supera-local',hma:'Tive bursite no ombro anos atrás. Agora a dor é focal do lado de fora do cotovelo e aparece ao apertar a mão e estender o punho.',regioes:['ombro','cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_lateral']},top:{cotovelo:'cotovelo_lateral'}},

  // MISTOS — negações proximais, coexistência e ordem clínica.
  {id:'R-M01-local-com-proximais-negados',hma:'Dor lateral no cotovelo ao apertar a mão. O ombro não dói, não tenho formigamento na mão e mexer o pescoço não muda nada.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{cotovelo:['cotovelo_lateral']},naoInclui:{cotovelo:['cotovelo_cervical_neural','cotovelo_ombro_referida'],ombro:['ombro_cervical_referida']}},
  {id:'R-M02-ombro-referido-sem-cervical',hma:'A dor começa na lateral do ombro ao levantar o braço e desce só até o cotovelo; não chega na mão e mexer o pescoço não altera.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_manguito'],cotovelo:['cotovelo_ombro_referida']},naoInclui:{ombro:['ombro_cervical_referida'],cotovelo:['cotovelo_cervical_neural']},correlacao:true},
  {id:'R-M03-cervical-com-epicondilalgia-real',hma:'Pescoço manda choque até o polegar quando olho para cima, e separadamente o lado de fora do cotovelo dói ao apertar a mão.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_cervical_referida'],cotovelo:['cotovelo_cervical_neural','cotovelo_lateral']},top:{cotovelo:'cotovelo_cervical_neural'},correlacao:true},
  {id:'R-M04-tres-fontes-locais',hma:'O ombro dói lateral ao elevar e no topo ao cruzar o braço; no cotovelo há dor lateral separada quando aperto a mão.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_manguito','ombro_ac'],cotovelo:['cotovelo_lateral']},correlacao:true},
  {id:'R-M05-neurovascular-trauma',hma:'Depois de cair o ombro deformou e não consigo elevar; a mão ficou fria, pálida e dormente.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_trauma_maior']},top:{ombro:'ombro_trauma_maior'},seguranca:/traumática importante|fratura-luxação/i,objetivo:/neurovascular distal/i}
];

const resultados = [];
const falhas = [];
for (const caso of casos) {
  try {
    resultados.push(executar(caso));
  } catch (err) {
    falhas.push({ id: caso.id, erro: err.message });
  }
}

console.table(resultados);
if (falhas.length) {
  console.error('\nFalhas de robustez clínica:');
  console.table(falhas);
  console.error(`\nRobustez Ombro + Cotovelo: ${resultados.length}/${casos.length} cenários passaram; ${falhas.length} falharam.`);
  process.exitCode = 1;
} else {
  console.log(`\nRobustez Ombro + Cotovelo: ${resultados.length}/${casos.length} cenários passaram.`);
}

assert.strictEqual(casos.length, 33, 'Corpus de robustez alterado sem atualizar o contrato de contagem');