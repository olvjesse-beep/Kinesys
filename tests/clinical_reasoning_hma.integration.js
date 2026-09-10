const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let currentHma = '';
let currentContext = {};

global.window = global;
global.BANCO_MAPEAMENTO_CLINICO = {
  ombro: { nome: 'Ombro', palavrasChave: ['ombro', 'braço'], clusters: [], diferenciais: [] },
  cotovelo: { nome: 'Cotovelo', palavrasChave: ['cotovelo', 'epicôndilo'], clusters: [], diferenciais: [] },
  cervical: { nome: 'Cervical', palavrasChave: ['cervical', 'pescoço', 'nuca'], clusters: [], diferenciais: [] }
};
global.coletarContextoClinico = () => ({
  origemIrradiacao: '',
  irradiacao: '',
  mecanismo: '',
  fatoresPiora: [],
  comorbidades: [],
  medicamentos: [],
  cirurgias: [],
  textoComorbidades: '',
  textoMedicamentos: '',
  textoCirurgias: '',
  ...currentContext
});
global.analisarHMAClinicaKineSys = (hma) => ({
  versaoMotor: 'integration-contract-stub',
  local: String(hma || ''),
  suspeitaPrincipal: null,
  diferenciais: [],
  alertas: [],
  lacunas: []
});
global.document = {
  readyState: 'loading',
  addEventListener: () => {},
  querySelectorAll: () => [],
  getElementById: (id) => {
    if (id === 'paciente_hma') return { value: currentHma };
    if (id === 'paciente_idade') return { value: currentContext.idade || '' };
    return null;
  }
};

vm.runInThisContext(fs.readFileSync('clinical_reasoning_shoulder-3.1.0.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('clinical_reasoning_elbow-3.1.0.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('clinical_reasoning_hma-3.0.0.js', 'utf8'));

function gerar(hma, contexto = {}) {
  currentHma = hma;
  currentContext = contexto;
  return window.KineSysMotorClinico3.gerarPlano();
}

function ids(plano, regiao) {
  return plano.hipoteses
    .filter(h => h.regiaoId === regiao && h.motor31?.condicaoId)
    .map(h => h.motor31.condicaoId);
}

const testes = [
  {
    id: 'I01-hma-curta-insuficiente',
    run() {
      const plano = gerar('dor');
      assert.strictEqual(plano.insuficiente, true);
      assert.deepStrictEqual(plano.regioes, []);
      assert.deepStrictEqual(plano.hipoteses, []);
    }
  },
  {
    id: 'I02-hma-vaga-cotovelo-sem-diagnostico',
    run() {
      const plano = gerar('Estou com dor no cotovelo há algumas semanas e não sei apontar direito onde dói.');
      assert.strictEqual(plano.insuficiente, false);
      assert(plano.regioes.some(r => r.id === 'cotovelo'), 'região cotovelo deveria ser inferida');
      assert.strictEqual(ids(plano, 'cotovelo').length, 0, `HMA vaga não deveria fabricar hipótese específica: ${ids(plano, 'cotovelo').join(', ')}`);
      assert(plano.motores31?.cotovelo, 'motor regional de cotovelo deveria registrar sua análise');
    }
  },
  {
    id: 'I03-hma-vaga-ombro-sem-diagnostico',
    run() {
      const plano = gerar('Estou com dor no ombro faz dias, mas ainda não sei localizar nem dizer o que piora.');
      assert.strictEqual(plano.insuficiente, false);
      assert(plano.regioes.some(r => r.id === 'ombro'), 'região ombro deveria ser inferida');
      assert.strictEqual(ids(plano, 'ombro').length, 0, `HMA vaga não deveria fabricar hipótese específica: ${ids(plano, 'ombro').join(', ')}`);
      assert(plano.motores31?.ombro, 'motor regional de ombro deveria registrar sua análise');
    }
  },
  {
    id: 'I04-ponte-ombro-manguito',
    run() {
      const plano = gerar('Dor lateral no ombro quando levanto o braço para pegar coisa no alto.');
      assert(plano.regioes.some(r => r.id === 'ombro'));
      assert(ids(plano, 'ombro').includes('ombro_manguito'), `manguito ausente: ${ids(plano, 'ombro').join(', ')}`);
      assert(plano.exame.perguntasDirigidasOmbro?.length > 0, 'perguntas dirigidas de ombro ausentes');
      assert(plano.exame.objetivosOmbro?.length > 0, 'objetivos de ombro ausentes');
    }
  },
  {
    id: 'I05-ponte-cotovelo-lateral',
    run() {
      const plano = gerar('Dor do lado de fora do cotovelo quando aperto a mão e carrego sacola.');
      assert(plano.regioes.some(r => r.id === 'cotovelo'));
      assert(ids(plano, 'cotovelo').includes('cotovelo_lateral'), `epicondilalgia lateral ausente: ${ids(plano, 'cotovelo').join(', ')}`);
      assert(plano.exame.perguntasDirigidasCotovelo?.length > 0, 'perguntas dirigidas de cotovelo ausentes');
    }
  },
  {
    id: 'I06-ponte-mista-ombro-cotovelo',
    run() {
      const plano = gerar('A dor começa no ombro, desce pela lateral do braço até o cotovelo e piora quando levanto o braço.');
      assert(plano.regioes.some(r => r.id === 'ombro'), 'ombro não inferido');
      assert(plano.regioes.some(r => r.id === 'cotovelo'), 'cotovelo não inferido');
      assert(ids(plano, 'ombro').includes('ombro_manguito'), `manguito ausente: ${ids(plano, 'ombro').join(', ')}`);
      assert(ids(plano, 'cotovelo').includes('cotovelo_ombro_referida'), `origem proximal ausente: ${ids(plano, 'cotovelo').join(', ')}`);
      assert.strictEqual(plano.exame.correlacaoOmbroCotovelo?.ativa, true, 'correlação ombro-cotovelo deveria estar ativa');
    }
  },
  {
    id: 'I07-contexto-diabetes-nao-cria-capsulite',
    run() {
      const plano = gerar('Dor leve no ombro, movimento normal e sem rigidez.', { idade: 58, diabetico: true, textoComorbidades: 'diabetes' });
      assert(!ids(plano, 'ombro').includes('ombro_capsulite'), `diabetes isolado não deveria criar capsulite: ${ids(plano, 'ombro').join(', ')}`);
    }
  },
  {
    id: 'I08-contexto-idade-pmr',
    run() {
      const plano = gerar('Os dois ombros amanhecem travados e também sinto os quadris rígidos; demora para soltar.', { idade: 68 });
      assert(ids(plano, 'ombro').includes('ombro_pmr'), `PMR não reconhecida: ${ids(plano, 'ombro').join(', ')}`);
      assert((plano.exame.seguranca || []).some(x => /polimialgia reumática/i.test(`${x.titulo} ${x.descricao}`)), 'alerta de PMR ausente');
    }
  },
  {
    id: 'I09-registro-versoes',
    run() {
      const plano = gerar('Dor lateral no ombro ao elevar o braço e dor no cotovelo ao apertar a mão.');
      assert.strictEqual(window.KineSysMotorClinico3.version, '3.0.1-performance1');
      assert.strictEqual(window.KineSysMotor31Ombro.version, '3.1.4-shoulder5');
      assert.strictEqual(window.KineSysMotor31Cotovelo.version, '3.1.2-elbow3');
      assert(plano.motores31?.ombro, 'registro motores31.ombro ausente');
      assert(plano.motores31?.cotovelo, 'registro motores31.cotovelo ausente');
    }
  }
];

const resultados = [];
const falhas = [];
for (const teste of testes) {
  try {
    teste.run();
    resultados.push({ id: teste.id, passou: true });
  } catch (err) {
    falhas.push({ id: teste.id, erro: err.message });
  }
}

console.table(resultados);
if (falhas.length) {
  console.error('\nFalhas de integração HMA → Motor 3.1:');
  console.table(falhas);
  console.error(`\nIntegração HMA: ${resultados.length}/${testes.length} cenários passaram; ${falhas.length} falharam.`);
  process.exitCode = 1;
} else {
  console.log(`\nIntegração HMA: ${resultados.length}/${testes.length} cenários passaram.`);
}

assert.strictEqual(testes.length, 9, 'Corpus de integração HMA alterado sem atualizar o contrato de contagem');
