'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const chartPath = path.join(root, 'src/patient/patient_chart_read_core-1.0.0.js');
const browsePath = path.join(root, 'src/patient/patient_records_browse_core-1.0.0.js');
const basicPath = path.join(root, 'src/patient/patient_index_cache_core-1.0.0.js');

const chartSource = fs.readFileSync(chartPath, 'utf8');
const browseSource = fs.readFileSync(browsePath, 'utf8');
const basicSource = fs.readFileSync(basicPath, 'utf8');

assert.match(chartSource, /let pacientesSalvosEmCurso = null;/, 'a leitura clínica completa deve compartilhar apenas a requisição em andamento');
assert.match(chartSource, /if \(pacientesSalvosEmCurso\) return pacientesSalvosEmCurso;/, 'chamadas clínicas simultâneas devem reutilizar a mesma Promise');
assert.match(chartSource, /pacientesSalvosEmCurso = Promise\.resolve\(carregar\(\)\)\.finally\(\(\) => \{ pacientesSalvosEmCurso = null; \}\);/, 'o coalescimento clínico deve ser descartado imediatamente após concluir');
assert.doesNotMatch(chartSource, /PACIENTES_SALVOS.*TTL|pacientesSalvos.*ttl/i, 'conteúdo clínico completo não pode ganhar cache temporal');

assert.match(browseSource, /KINESYS_BUSCA_PACIENTE_DEBOUNCE_MS = 320/, 'a busca de pacientes deve usar debounce curto e previsível');
assert.match(browseSource, /KINESYS_BUSCA_PACIENTE_INSTALACAO_MS = 700/, 'o debounce deve ser instalado após a reaplicação tardia do Design System');
assert.match(browseSource, /DOMContentLoaded', agendarDebounceBuscaPacientesKineSys/, 'o debounce deve ser agendado após scripts defer');
assert.match(browseSource, /window\.filtrarPacientesSalvos = debounced;/, 'a busca pública deve ser envolvida sem alterar o renderizador original');
assert.match(browseSource, /debounced\.__kinesysOriginal = original;/, 'o renderizador original deve permanecer explicitamente preservado');

assert.match(basicSource, /KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS = 15000/, 'o índice administrativo leve deve manter cache curto de 15 s');
assert.match(basicSource, /KINESYS_CAMPOS_PACIENTE_BASICO/, 'listas administrativas devem continuar usando projeção leve');

async function testarCoalescimentoClinico() {
    let selects = 0;
    const context = {
        console,
        Promise,
        Map,
        Array,
        String,
        Date,
        Number,
        window: {},
        lerPacientesLocaisComSeguranca: () => [],
        normalizarPacienteDoBanco: value => value,
        _supabase: {
            from(table) {
                assert.strictEqual(table, 'pacientes');
                return {
                    select() {
                        selects += 1;
                        return new Promise(resolve => setTimeout(() => resolve({ data: [{ id:'p1', nome:'Paciente', avaliacoes:[], evolucoes:[] }], error:null }), 20));
                    }
                };
            }
        },
        setTimeout,
        clearTimeout
    };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(chartSource, context, { filename: chartPath });

    const primeira = context.window.obterPacientesSalvos();
    const segunda = context.window.obterPacientesSalvos();
    const [a, b] = await Promise.all([primeira, segunda]);
    assert.strictEqual(selects, 1, 'duas leituras simultâneas devem gerar somente uma consulta Supabase');
    assert.strictEqual(a[0].id, 'p1');
    assert.strictEqual(b[0].id, 'p1');

    await context.window.obterPacientesSalvos();
    assert.strictEqual(selects, 2, 'uma nova leitura após a conclusão deve consultar novamente, sem cache clínico temporal');
}

async function testarDebounceBusca() {
    let handlerDOMContentLoaded = null;
    let instalarAposDesign = null;
    let chamadas = 0;
    const document = {
        readyState: 'loading',
        addEventListener(evento, handler) {
            if (evento === 'DOMContentLoaded') handlerDOMContentLoaded = handler;
        },
        getElementById() { return { value:'ana' }; }
    };
    const window = {};
    const timer = (callback, ms) => {
        if (ms === 700) {
            instalarAposDesign = callback;
            return 700;
        }
        return setTimeout(callback, ms);
    };
    const context = {
        console,
        Promise,
        window,
        document,
        setTimeout: timer,
        clearTimeout,
        escapeHTML: value => String(value),
        obterPacientesBasicos: async () => []
    };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(browseSource, context, { filename: browsePath });

    assert.strictEqual(typeof handlerDOMContentLoaded, 'function', 'o módulo deve aguardar o carregamento completo dos scripts defer');
    window.filtrarPacientesSalvos = async valor => {
        chamadas += 1;
        return `resultado:${valor}`;
    };
    handlerDOMContentLoaded();
    assert.strictEqual(typeof instalarAposDesign, 'function', 'a instalação deve ocorrer somente após a janela de bootstrap do Design System');
    instalarAposDesign();

    const p1 = window.filtrarPacientesSalvos('a');
    const p2 = window.filtrarPacientesSalvos('an');
    const p3 = window.filtrarPacientesSalvos('ana');
    const resultados = await Promise.all([p1, p2, p3]);
    assert.strictEqual(chamadas, 1, 'digitações consecutivas devem produzir uma única renderização/consulta');
    assert.deepStrictEqual(resultados, ['resultado:ana','resultado:ana','resultado:ana']);
}

(async () => {
    await testarCoalescimentoClinico();
    await testarDebounceBusca();
    console.log('frontend_performance_segura.contract: ok');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
