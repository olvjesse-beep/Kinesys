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

vm.runInThisContext(fs.readFileSync('src/clinical/clinical_reasoning_shoulder-3.1.0.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('src/clinical/clinical_reasoning_elbow-3.1.0.js', 'utf8'));

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
  return plano.hipoteses.find(h => h.regiaoId === regiao && h.motor31?.condicaoId)?.motor31?.condicaoId || null;
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
      assert(
        atuais.includes(esperado),
        `${caso.id}: esperava ${esperado} em ${regiao}; recebeu ${atuais.join(', ') || '(nenhum)'}`
      );
    }
  }

  for (const [regiao, proibidos] of Object.entries(caso.naoInclui || {})) {
    const atuais = ids(plano, regiao);
    for (const proibido of proibidos) {
      assert(!atuais.includes(proibido), `${caso.id}: não deveria priorizar ${proibido} em ${regiao}`);
    }
  }

  for (const [regiao, esperado] of Object.entries(caso.top || {})) {
    assert.strictEqual(topId(plano, regiao), esperado, `${caso.id}: prioridade principal inesperada em ${regiao}`);
  }

  if (caso.seguranca) {
    const texto = (plano.exame.seguranca || []).map(x => `${x.titulo} ${x.descricao}`).join(' | ');
    assert(caso.seguranca.test(texto), `${caso.id}: alerta de segurança esperado não encontrado: ${caso.seguranca}`);
  }

  if (caso.pergunta) {
    const todas = [
      ...(plano.exame.perguntasDirigidasOmbro || []),
      ...(plano.exame.perguntasDirigidasCotovelo || [])
    ].join(' | ');
    assert(caso.pergunta.test(todas), `${caso.id}: pergunta discriminativa esperada não encontrada`);
  }

  if (caso.correlacao !== undefined) {
    assert.strictEqual(
      plano.exame.correlacaoOmbroCotovelo?.ativa,
      caso.correlacao,
      `${caso.id}: estado incorreto da correlação ombro-cotovelo`
    );
  }

  if (caso.registros) {
    if (caso.registros.ombro) assert(plano.motores31?.ombro, `${caso.id}: registro motores31.ombro ausente`);
    if (caso.registros.cotovelo) assert(plano.motores31?.cotovelo, `${caso.id}: registro motores31.cotovelo ausente`);
    if (caso.registros.legacy) assert.strictEqual(plano.motor31?.regiao, caso.registros.legacy, `${caso.id}: plano.motor31 legado alterado`);
  }

  if (caso.semRotuloPaciente) {
    const nomes = plano.hipoteses.map(h => String(h.nome || '')).join(' | ');
    assert(!caso.semRotuloPaciente.test(nomes), `${caso.id}: rótulo informado pelo paciente virou diagnóstico do motor`);
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
  // OMBRO — padrões locais, sistêmicos, traumáticos e neurais.
  {id:'O01-manguito',hma:'Dói no lado de fora do ombro quando levanto o braço de lado e para pegar coisa no armário.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_manguito']},top:{ombro:'ombro_manguito'}},
  {id:'O02-manguito-decubito',hma:'Quando durmo em cima do braço o ombro dói na lateral e piora para elevar.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_manguito']},naoInclui:{ombro:['ombro_ac']},pergunta:/deitar\/dormir sobre o braço ou ombro/i},
  {id:'O03-capsulite',hma:'Foi travando aos poucos. Não consigo coçar as costas e outra pessoa também não consegue levantar meu braço direito.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_capsulite']},naoInclui:{ombro:['ombro_ruptura_manguito']},top:{ombro:'ombro_capsulite'}},
  {id:'O04-capsulite-diabetes',hma:'Ombro congelado, cada mês mexe menos e não consigo colocar a mão nas costas.',contexto:{idade:58,diabetico:true,textoComorbidades:'diabetes'},regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_capsulite']}},
  {id:'O05-artrose',hma:'Meu ombro range, parece areia dentro da junta, está duro e perdi rotação devagar.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_artrose_gh']},top:{ombro:'ombro_artrose_gh'}},
  {id:'O06-ac',hma:'Dor bem no ossinho em cima do ombro e dói quando levo a mão para o ombro contrário.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_ac']},top:{ombro:'ombro_ac'}},
  {id:'O07-biceps',hma:'Dor na frente do ombro para fazer rosca e pegar panela com a palma para cima.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_biceps']},top:{ombro:'ombro_biceps'}},
  {id:'O08-instabilidade',hma:'Já desloquei o ombro duas vezes e tenho medo de abrir o braço e girar para fora porque parece que vai sair.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_instabilidade']},top:{ombro:'ombro_instabilidade'}},
  {id:'O09-labral',hma:'No arremesso sinto um clique doloroso bem dentro do ombro e às vezes parece que prende por dentro.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_labral']},top:{ombro:'ombro_labral'}},
  {id:'O10-calcaria',hma:'Raio X mostrou cálcio no ombro e tive uma crise de dor muito forte de repente sem cair.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_calcaria']},naoInclui:{ombro:['ombro_trauma_maior']},top:{ombro:'ombro_calcaria'}},
  {id:'O11-cervical',hma:'A dor vem do pescoço para o ombro, corre pelo braço até os dedos e a mão fica formigando; virar o pescoço piora.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_cervical_referida']},top:{ombro:'ombro_cervical_referida'}},
  {id:'O12-trauma',hma:'Caí em cima do ombro ontem, ficou deformado e não consigo levantar o braço depois da queda.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_trauma_maior']},top:{ombro:'ombro_trauma_maior'},seguranca:/fratura-luxação|traumática importante/i},
  {id:'O13-ruptura-manguito',hma:'Depois de um estalo fiquei muito fraco: não consigo erguer sozinho, mas alguém consegue levantar meu braço e ele despenca.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_ruptura_manguito']}},
  {id:'O14-pmr',hma:'Os dois ombros amanhecem travados e também sinto dor nos quadris; demora muito para soltar de manhã.',contexto:{idade:68},regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_pmr']},top:{ombro:'ombro_pmr'},seguranca:/polimialgia reumática/i},
  {id:'O15-rotulo-bursite',hma:'O médico falou bursite no ombro, mas eu só sei dizer que dói.',regioes:['ombro'],aplicar:['ombro'],semRotuloPaciente:/bursite do ombro/i,registros:{ombro:true,legacy:'ombro'}},

  // COTOVELO — padrões locais, nervos, trauma e segurança.
  {id:'C01-lateral',hma:'Dor do lado de fora do cotovelo quando aperto a mão, seguro xícara e carrego sacola.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_lateral']},top:{cotovelo:'cotovelo_lateral'}},
  {id:'C02-tunel-radial',hma:'A dor fica mais para baixo do epicôndilo lateral, no antebraço, e dói para supinar.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_tunel_radial']}},
  {id:'C03-medial',hma:'Dor do lado de dentro do cotovelo; piora para flexionar o punho e pronar contra força.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_medial']},naoInclui:{cotovelo:['cotovelo_lateral']},top:{cotovelo:'cotovelo_medial'}},
  {id:'C04-ulnar',hma:'O mindinho e o anelar formigam quando apoio o cotovelo ou deixo ele dobrado.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_ulnar']},top:{cotovelo:'cotovelo_ulnar'}},
  {id:'C05-biceps-distal',hma:'Dor na frente do cotovelo para fazer rosca e virar a palma para cima, sem estalo nem hematoma.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_biceps_distal']},naoInclui:{cotovelo:['cotovelo_ruptura_biceps_distal']}},
  {id:'C06-ruptura-biceps',hma:'Ao levantar uma caixa senti estalo na frente do cotovelo, apareceu hematoma e perdi força para virar a palma para cima.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_ruptura_biceps_distal']},top:{cotovelo:'cotovelo_ruptura_biceps_distal'},seguranca:/ruptura aguda do bíceps distal/i},
  {id:'C07-olecrano',hma:'Formou uma bola na ponta do cotovelo depois de ficar apoiando ele na mesa; está inchado atrás mas sem febre.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_olecrano']},naoInclui:{cotovelo:['cotovelo_infeccao_articular']}},
  {id:'C08-ucl',hma:'Sou arremessador e tenho dor medial no cotovelo durante o arremesso, principalmente com carga em valgo.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_ucl']},top:{cotovelo:'cotovelo_ucl'}},
  {id:'C09-triceps',hma:'Dor atrás do cotovelo quando faço supino e quando estendo o cotovelo contra peso.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_triceps_posterior']}},
  {id:'C10-articular',hma:'Meu cotovelo trava de verdade, não estica totalmente, range e está cada vez mais rígido.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_articular']}},
  {id:'C11-trauma',hma:'Caí em cima do cotovelo, ele ficou deformado e não consigo mexer depois da queda.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_trauma_maior']},top:{cotovelo:'cotovelo_trauma_maior'},seguranca:/fratura-luxação|trauma importante/i},
  {id:'C12-infeccao',hma:'Cotovelo vermelho, inchado e muito quente, estou com febre e calafrios.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_infeccao_articular']},top:{cotovelo:'cotovelo_infeccao_articular'},seguranca:/infecção articular\/bursal/i},
  {id:'C13-cervical-neural',hma:'A dor vem do pescoço, passa do cotovelo e vai para a mão em choque; mexer o pescoço muda a dor.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_cervical_neural']},top:{cotovelo:'cotovelo_cervical_neural'}},
  {id:'C14-generico',hma:'Estou com dor no cotovelo há algumas semanas, ainda não sei apontar exatamente o local.',regioes:['cotovelo'],aplicar:['cotovelo'],registros:{cotovelo:true,legacy:'cotovelo'}},

  // CASOS AMBÍGUOS / CORRELAÇÃO OMBRO ↔ COTOVELO ↔ CERVICAL.
  {id:'M01-ombro-para-cotovelo',hma:'A dor começa no ombro, desce pela lateral do braço e vai até o cotovelo; levantar o braço piora.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_manguito'],cotovelo:['cotovelo_ombro_referida']},naoInclui:{cotovelo:['cotovelo_lateral']},correlacao:true,registros:{ombro:true,cotovelo:true,legacy:'ombro'}},
  {id:'M02-bursite-relatada',hma:'Disseram que tenho bursite no ombro. A dor do ombro desce até o cotovelo quando levanto o braço.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{cotovelo:['cotovelo_ombro_referida']},correlacao:true,semRotuloPaciente:/bursite do ombro/i,registros:{ombro:true,cotovelo:true,legacy:'ombro'}},
  {id:'M03-local-lateral-com-ombro',hma:'Tenho dor lateral no cotovelo ao apertar a mão e carregar sacola. O ombro também dói às vezes, mas mexer o punho reproduz a dor do cotovelo.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{cotovelo:['cotovelo_lateral','cotovelo_ombro_referida']},correlacao:true},
  {id:'M04-cervical-distal',hma:'Começa no pescoço, pega ombro e braço, passa do cotovelo e chega no polegar com formigamento; olhar para cima piora.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_cervical_referida'],cotovelo:['cotovelo_cervical_neural']},correlacao:true},
  {id:'M05-medial-ulnar',hma:'Dor do lado de dentro do cotovelo e formigamento no anelar e mindinho quando fico com o cotovelo dobrado.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_medial','cotovelo_ulnar']}},
  {id:'M06-arremesso-cadeia',hma:'No arremesso sinto dor medial no cotovelo e também desconforto no ombro quando armo o braço.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{cotovelo:['cotovelo_ucl']},top:{cotovelo:'cotovelo_ucl'},correlacao:true},
  {id:'M07-ombro-vs-cervical',hma:'Dói na lateral do ombro quando elevo, mas às vezes a dor passa do cotovelo e a mão formiga quando mexo o pescoço.',regioes:['ombro','cotovelo'],aplicar:['ombro','cotovelo'],inclui:{ombro:['ombro_manguito','ombro_cervical_referida'],cotovelo:['cotovelo_cervical_neural']},correlacao:true},
  {id:'M08-trauma-ombro-neurovascular',hma:'Depois da queda o ombro saiu do lugar, o braço ficou pendurado e a mão ficou dormente.',regioes:['ombro'],aplicar:['ombro'],inclui:{ombro:['ombro_trauma_maior','ombro_cervical_referida']},seguranca:/traumática importante|fratura-luxação/i},
  {id:'M09-cotovelo-infeccao-vs-bursa',hma:'Começou como uma bola na ponta do cotovelo, agora está vermelho, quente e com febre.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_olecrano','cotovelo_infeccao_articular']},top:{cotovelo:'cotovelo_infeccao_articular'},seguranca:/infecção articular\/bursal/i},
  {id:'M10-ruptura-vs-tendinopatia',hma:'Eu já tinha dor na frente do cotovelo para fazer rosca, mas ontem senti um estalo, apareceu hematoma e perdi muita força para supinar.',regioes:['cotovelo'],aplicar:['cotovelo'],inclui:{cotovelo:['cotovelo_biceps_distal','cotovelo_ruptura_biceps_distal']},top:{cotovelo:'cotovelo_ruptura_biceps_distal'},seguranca:/ruptura aguda do bíceps distal/i}
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
  console.error('\nFalhas clínicas de regressão:');
  console.table(falhas);
  process.exitCode = 1;
} else {
  console.log(`\nMotor 3.1 Ombro + Cotovelo: ${resultados.length}/${casos.length} cenários passaram.`);
}

// Contratos estruturais adicionais: coexistência e cautela diagnóstica.
assert(window.KineSysMotor31Ombro?.condicoes?.length >= 10, 'Banco regional de ombro incompleto');
assert(window.KineSysMotor31Cotovelo?.condicoes?.length >= 12, 'Banco regional de cotovelo incompleto');
assert(window.KineSysMotor31Cotovelo?.referencias?.some(x => x.pmid === '42437185'), 'Referência cervicotorácica do cotovelo ausente');
