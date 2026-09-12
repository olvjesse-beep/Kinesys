const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let currentHma = '';
let currentContext = {};

global.window = global;
global.BANCO_MAPEAMENTO_CLINICO = {
  ombro: { clusters: [], diferenciais: [] },
  cotovelo: { clusters: [], diferenciais: [] },
  punho_mao: { clusters: [], diferenciais: [] }
};
global.coletarContextoClinico = () => ({
  origemIrradiacao: '', irradiacao: '', comorbidades: [], medicamentos: [], cirurgias: [],
  textoComorbidades: '', textoMedicamentos: '', textoCirurgias: '', ...currentContext
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

vm.runInThisContext(fs.readFileSync(__dirname + '/../src/clinical/clinical_reasoning_shoulder-3.1.0.js', 'utf8'));
vm.runInThisContext(fs.readFileSync(__dirname + '/../src/clinical/clinical_reasoning_elbow-3.1.0.js', 'utf8'));
vm.runInThisContext(fs.readFileSync(__dirname + '/../src/clinical/clinical_reasoning_wrist-3.1.0.js', 'utf8'));

function base(regiao) {
  return {
    insuficiente: false,
    regioes: [{ id: regiao, nome: regiao }],
    hipoteses: [],
    exame: { seguranca: [], testesPrioritarios: [], analises: [], modificadores: [] },
    lacunas: []
  };
}
function motor(regiao) {
  if (regiao === 'ombro') return window.KineSysMotor31Ombro.enriquecer;
  if (regiao === 'cotovelo') return window.KineSysMotor31Cotovelo.enriquecer;
  return window.KineSysMotor31PunhoMao.enriquecer;
}
function ids(plano, regiao) {
  return plano.hipoteses
    .filter(h => h.regiaoId === regiao && h.motor31?.condicaoId)
    .map(h => h.motor31.condicaoId);
}
function top(plano, regiao) { return ids(plano, regiao)[0] || null; }
function safetyText(plano) {
  return (plano.exame.seguranca || []).map(x => `${x.titulo} ${x.descricao}`).join(' | ');
}

const casos = [
  // OMBRO — negação, temporalidade, terceiros, incidentalomas e linguagem solta.
  {id:'CS01-cardio-negado',regiao:'ombro',hma:'Quando subo escada NÃO tenho dor nem pressão no peito, não falta ar, não suo frio e não tenho náusea. O que dói é o lado de fora do ombro direito quando levanto o braço.',inclui:['ombro_manguito'],naoInclui:['ombro_cardiorrespiratorio'],top:'ombro_manguito'},
  {id:'CS02-neuro-negado',regiao:'ombro',hma:'Dor lateral no ombro para elevar e pegar peso. Sem formigamento, sem dormência e sem choque na mão; mexer o pescoço não muda nada.',inclui:['ombro_manguito'],naoInclui:['ombro_cervical_referida'],top:'ombro_manguito'},
  {id:'CS03-luxacao-antiga-sem-instabilidade',regiao:'ombro',hma:'Há 12 anos desloquei esse ombro numa queda e fiquei bom. Hoje força normal, sem falseio, sem apreensão e sem sensação de sair do lugar; agora dói lateral só ao elevar peso.',inclui:['ombro_manguito'],naoInclui:['ombro_trauma_maior','ombro_instabilidade'],top:'ombro_manguito'},
  {id:'CS04-historia-familiar-pmr',regiao:'ombro',contexto:{idade:62},hma:'Minha mãe teve polimialgia, com dor nos dois ombros e nos quadris. Eu tenho só dor no ombro direito, lateral, quando levanto o braço; o esquerdo e os quadris não doem.',inclui:['ombro_manguito'],naoInclui:['ombro_pmr'],top:'ombro_manguito'},
  {id:'CS05-clique-indolor',regiao:'ombro',hma:'Meu ombro dá um clique profundo às vezes, mas esse clique não dói, não trava e não prende. A dor de verdade é lateral quando levanto peso acima da cabeça.',inclui:['ombro_manguito'],naoInclui:['ombro_labral'],top:'ombro_manguito'},
  {id:'CS06-calcificacao-outro-lado',regiao:'ombro',hma:'RX antigo mostrou calcificação no ombro esquerdo, que nunca dói. O problema de hoje é no ombro direito: dor lateral ao elevar e carregar peso acima da cabeça.',inclui:['ombro_manguito'],naoInclui:['ombro_calcaria'],top:'ombro_manguito'},
  {id:'CS07-passivo-livre',regiao:'ombro',hma:'Não consigo colocar a mão nas costas porque dói, mas quando o fisioterapeuta move meu braço passivamente vai completo, sem rigidez. A dor é lateral e piora para elevar.',inclui:['ombro_manguito'],naoInclui:['ombro_capsulite'],top:'ombro_manguito'},
  {id:'CS08-coloquial-abreviado',regiao:'ombro',hma:'ombro drto doi qdo levanto p pegar um trem no armario. nao passa do cotovelo, pescoco n muda e sem formig.',inclui:['ombro_manguito'],top:'ombro_manguito'},
  {id:'CS09-trauma-explicitamente-negado',regiao:'ombro',hma:'Não houve queda, trauma, pancada nem acidente. Começou aos poucos: dor na lateral do ombro quando elevo o braço, sem deformidade.',inclui:['ombro_manguito'],naoInclui:['ombro_trauma_maior'],top:'ombro_manguito'},
  {id:'CS10-cardio-real-coloquial',regiao:'ombro',hma:'Subi a escada e veio um aperto no peito junto com dor no ombro esquerdo, fiquei sem ar, suei frio e enjoei. Parei e foi melhorando.',inclui:['ombro_cardiorrespiratorio'],top:'ombro_cardiorrespiratorio',seguranca:/card|torác|dispneia|esforço/i},
  {id:'CS11-cervical-real-coloquial',regiao:'ombro',hma:'A dor sai da nuca, pega o ombro e corre pelo braço até os dedos; a mão formiga e virar o pescoço piora. Levantar o ombro não muda.',inclui:['ombro_cervical_referida'],naoInclui:['ombro_manguito'],top:'ombro_cervical_referida'},
  {id:'CS12-ruido-outra-articulacao',regiao:'ombro',hma:'Meu joelho trava e range, mas o ombro não trava nem prende. No ombro a dor é lateral e aparece só quando levanto o braço.',inclui:['ombro_manguito'],naoInclui:['ombro_labral'],top:'ombro_manguito'},

  // COTOVELO — escopo da negação, sintomas sistêmicos não relacionados e história antiga.
  {id:'CE01-infeccao-toda-negada',regiao:'cotovelo',hma:'O cotovelo não está vermelho, nem quente, nem inchado e estou sem febre. Só dói bem do lado de fora quando aperto a mão e estendo o punho.',inclui:['cotovelo_lateral'],naoInclui:['cotovelo_infeccao_articular'],top:'cotovelo_lateral'},
  {id:'CE02-articular-todo-negado',regiao:'cotovelo',hma:'O cotovelo não trava, não bloqueia, não range e estica normal. A dor é focal no epicôndilo lateral e aparece ao apertar a mão e estender o punho.',inclui:['cotovelo_lateral'],naoInclui:['cotovelo_articular'],top:'cotovelo_lateral'},
  {id:'CE03-ulnar-negado',regiao:'cotovelo',hma:'Dor focal na parte de dentro do cotovelo que piora ao flexionar o punho e pronar contra força. Sem formigamento, dormência ou choque no anelar e mindinho.',inclui:['cotovelo_medial'],naoInclui:['cotovelo_ulnar'],top:'cotovelo_medial'},
  {id:'CE04-plri-negado-pos-luxacao-antiga',regiao:'cotovelo',hma:'Luxei o cotovelo 8 anos atrás e recuperei. Hoje não tenho falseio, clunk, insegurança nem sensação de ceder ao apoiar; a queixa atual é dor lateral ao apertar e estender o punho.',inclui:['cotovelo_lateral'],naoInclui:['cotovelo_plri','cotovelo_trauma_maior'],top:'cotovelo_lateral'},
  {id:'CE05-biceps-sem-ruptura',regiao:'cotovelo',hma:'Dor na frente do cotovelo fazendo rosca e supinando. Não teve estalo, nem hematoma, nem perda de força.',inclui:['cotovelo_biceps_distal'],naoInclui:['cotovelo_ruptura_biceps_distal'],top:'cotovelo_biceps_distal'},
  {id:'CE06-febre-de-gripe-nao-do-cotovelo',regiao:'cotovelo',hma:'Estou gripado, com febre e calafrio, mas o cotovelo não tem calor, vermelhidão nem inchaço. A dor do cotovelo é lateral e só aparece ao apertar a mão/estender o punho.',inclui:['cotovelo_lateral'],naoInclui:['cotovelo_infeccao_articular'],top:'cotovelo_lateral'},
  {id:'CE07-terceiro-com-bursite-ombro',regiao:'cotovelo',hma:'Minha esposa está com bursite no ombro. Eu não tenho dor no ombro; meu problema é dor focal do lado de fora do cotovelo ao apertar a mão.',inclui:['cotovelo_lateral'],naoInclui:['cotovelo_ombro_referida'],top:'cotovelo_lateral'},
  {id:'CE08-radial-com-negacao-preensao',regiao:'cotovelo',hma:'A dor fica uns quatro dedos abaixo do lado de fora do cotovelo, no antebraço, e piora para supinar. Apertar a mão não piora e estender o punho não muda.',inclui:['cotovelo_tunel_radial'],naoInclui:['cotovelo_lateral'],top:'cotovelo_tunel_radial'},
  {id:'CE09-lateral-coloquial',regiao:'cotovelo',hma:'cotovelo dir doi do lado d fora. segurar caneca, sacola e estender o punho dói. pescoço ok e nada de formigamento.',inclui:['cotovelo_lateral'],top:'cotovelo_lateral'},
  {id:'CE10-articular-real-coloquial',regiao:'cotovelo',hma:'o cotovelo prende de verdade, não estica até o fim e fica rangendo. não é só dor para apertar coisa.',inclui:['cotovelo_articular'],top:'cotovelo_articular'},
  {id:'CE11-infeccao-real-coloquial',regiao:'cotovelo',hma:'Cotovelo vermelhão, quente e bem inchado. Febre 38,5 e calafrio desde ontem.',inclui:['cotovelo_infeccao_articular'],top:'cotovelo_infeccao_articular',seguranca:/infec/i},
  {id:'CE12-misto-local-e-cervical',regiao:'cotovelo',hma:'Tenho uma dor focal no epicôndilo lateral quando aperto e estendo o punho, mas também uma segunda dor que sai do pescoço e dá choque até a mão.',inclui:['cotovelo_lateral','cotovelo_cervical_neural']},

  // PUNHO/MÃO — negação literal, história remota, gíria e falsa urgência.
  {id:'CW01-mediano-negado-com-tfcc',regiao:'punho_mao',hma:'Não tenho formigamento nem dormência no polegar, indicador ou médio. A queixa é dor profunda no lado ulnar do punho ao girar chave e apoiar peso.',inclui:['tfcc'],naoInclui:['tunel_carpo'],top:'tfcc'},
  {id:'CW02-ulnar-negado-com-dequervain',regiao:'punho_mao',hma:'Sem formigamento e sem dormência no anelar ou mindinho. Dói na estiloide radial, junto ao polegar, quando pego o bebê e abro pote.',inclui:['dequervain'],naoInclui:['punho_ulnar_guyon'],top:'dequervain'},
  {id:'CW03-vascular-negado',regiao:'punho_mao',hma:'Depois do treino a mão NÃO ficou fria, pálida, roxa nem azulada; o pulso está normal. Só dói o punho ao estender contra peso, sem trauma.',inclui:['punho_sobrecarga_tendinea'],naoInclui:['punho_vascular_agudo'],top:'punho_sobrecarga_tendinea'},
  {id:'CW04-compartimental-negado',regiao:'punho_mao',hma:'Caí de bicicleta ontem, mas o antebraço não ficou tenso e a dor não é insuportável. Esticar os dedos não piora. O ponto doloroso é a tabaqueira anatômica.',inclui:['punho_escafoide'],naoInclui:['punho_compartimental'],top:'punho_escafoide'},
  {id:'CW05-crps-explicitamente-negado',regiao:'punho_mao',hma:'Depois da fratura a dor NÃO é desproporcional, não dói até ao toque, a mão não muda de cor, não sua e não muda de temperatura.',naoInclui:['punho_crps']},
  {id:'CW06-fratura-remota-ja-alta',regiao:'punho_mao',hma:'Tive fratura do rádio distal há 4 anos, fiz fisioterapia e recebi alta sem sequela. Hoje a dor nova é na estiloide radial para pegar o bebê e mexer o polegar.',inclui:['dequervain'],naoInclui:['fratura_radio_distal_reabilitacao'],top:'dequervain'},
  {id:'CW07-cirurgia-tendao-remota',regiao:'punho_mao',hma:'Há 10 anos fiz reparo cirúrgico de tendão flexor e fiquei sem sequela. Agora acordo de madrugada com polegar, indicador e médio dormentes e melhora ao sacudir a mão.',inclui:['tunel_carpo'],naoInclui:['pos_operatorio_tendao_mao'],top:'tunel_carpo'},
  {id:'CW08-intersecao-com-deq-negado',regiao:'punho_mao',hma:'Não dói na estiloide radial nem junto ao polegar. Dói no dorso radial do antebraço uns 5 cm acima do punho, com crepitação depois de muita extensão repetitiva.',inclui:['punho_intersecao'],naoInclui:['dequervain'],top:'punho_intersecao'},
  {id:'CW09-tfcc-explicitamente-negado',regiao:'punho_mao',hma:'Não tenho dor ulnar nem dor do lado do mindinho. Girar chave também não dói. Minha dor é dorsal-radial e apareceu depois de extensão repetitiva.',naoInclui:['tfcc']},
  {id:'CW10-cts-com-giria-dedao',regiao:'punho_mao',hma:'De madrugada dorme o dedão, o indicador e o dedo do meio. Eu sacudo a mão e volta ao normal; não dói no antebraço.',inclui:['tunel_carpo'],top:'tunel_carpo'},
  {id:'CW11-guyon-bike-coloquial',regiao:'punho_mao',hma:'Quando pedalo e fico apoiado na palma no guidão, o mindinho e o anelar adormecem. Cotovelo e pescoço não mudam isso.',inclui:['punho_ulnar_guyon'],top:'punho_ulnar_guyon'},
  {id:'CW12-escafoide-trauma-coloquial',regiao:'punho_mao',hma:'Capotei da bike e caí com a mão espalmada. Desde então dói forte na covinha/tabaqueira perto do polegar.',inclui:['punho_escafoide'],top:'punho_escafoide',seguranca:/escafoide/i}
];

const resultados = [];
const falhas = [];
for (const c of casos) {
  try {
    currentHma = c.hma;
    currentContext = c.contexto || {};
    const p = motor(c.regiao)(base(c.regiao));
    const got = ids(p, c.regiao);
    for (const id of c.inclui || []) assert(got.includes(id), `esperava ${id}; recebeu ${got.join(', ') || '(nenhum)'}`);
    for (const id of c.naoInclui || []) assert(!got.includes(id), `não deveria incluir ${id}; recebeu ${got.join(', ') || '(nenhum)'}`);
    if (c.top) assert.strictEqual(top(p, c.regiao), c.top, `top esperado ${c.top}; recebeu ${top(p, c.regiao)}`);
    if (c.seguranca) assert(c.seguranca.test(safetyText(p)), `alerta de segurança ausente: ${safetyText(p)}`);
    resultados.push({ id: c.id, status: 'PASS', top: top(p, c.regiao) || '-', ids: got.join(',') || '-' });
  } catch (err) {
    let observed = '(erro antes da leitura)';
    try {
      currentHma = c.hma;
      currentContext = c.contexto || {};
      const p = motor(c.regiao)(base(c.regiao));
      observed = `${top(p, c.regiao) || '-'} | ${ids(p, c.regiao).join(',') || '-'}`;
    } catch (_) {}
    falhas.push(`${c.id}: ${err.message} | observado: ${observed}`);
    resultados.push({ id: c.id, status: 'FAIL', top: observed.split(' | ')[0], ids: observed.split(' | ')[1] || '-' });
  }
}

console.table(resultados);
console.log(`Upper-limb noisy HMA chaos: ${casos.length - falhas.length}/${casos.length} cenários aprovados.`);
if (falhas.length) {
  console.error('\nFalhas reais encontradas:');
  falhas.forEach((f, i) => console.error(`${i + 1}. ${f}`));
  process.exitCode = 1;
}
