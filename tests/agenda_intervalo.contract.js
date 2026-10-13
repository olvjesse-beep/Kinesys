const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const agenda = fs.readFileSync(path.join(raiz, 'src/agenda/agenda-1.20.0.js'), 'utf8');
const estilo = fs.readFileSync(path.join(raiz, 'styles/design_agenda.css'), 'utf8');

assert.match(agenda, /function intervalosEntreJanelasAgenda\s*\(/,
    'A Agenda deve calcular os espaços reais entre períodos, inclusive com janelas antigas sobrepostas.');
assert.match(agenda, /function intervaloEntreJanelasAgenda\s*\(/,
    'A Agenda deve reconhecer o espaço entre dois períodos de atendimento.');
assert.match(agenda, /intervalo \? 'intervalo' : dentro \? 'atendimento'/,
    'As células entre períodos devem ser classificadas como intervalo, antes de atendimento.');
assert.match(agenda, /className = 'agenda-intervalo-bloco'/,
    'A grade deve renderizar uma faixa única para o intervalo.');
assert.match(agenda, /INTERVALO|rotulo\.toUpperCase\(\)/,
    'A faixa deve exibir o rótulo de intervalo.');
assert.match(agenda, /2º período · após intervalo/,
    'O editor existente deve explicar onde o segundo período começa após o intervalo.');
assert.match(agenda, /será marcado como INTERVALO na agenda/,
    'A ação de marcar intervalo deve ficar explícita sem criar outro formulário.');
assert.match(estilo, /\.agenda-celula\.intervalo\s*\{/,
    'As células de intervalo devem ter estilo próprio.');
assert.match(estilo, /\.agenda-intervalo-bloco\s*\{/,
    'A faixa de intervalo deve ter estilo próprio.');
assert.match(estilo, /--agenda-intervalo-fundo:/,
    'O intervalo deve preservar a sinalização amarela do KineSys.');

const inicioFuncoes = agenda.indexOf('function intervalosEntreJanelasAgenda');
const fimFuncoes = agenda.indexOf('function bloqueioNoMinuto', inicioFuncoes);
assert(inicioFuncoes >= 0 && fimFuncoes > inicioFuncoes, 'Não foi possível isolar o cálculo de intervalos para teste.');
const contexto = {
    horaCurta: valor => String(valor || '').slice(0, 5),
    horaParaMinutos: valor => {
        const [hora, minuto] = String(valor).split(':').map(Number);
        return hora * 60 + minuto;
    }
};
vm.createContext(contexto);
vm.runInContext(agenda.slice(inicioFuncoes, fimFuncoes), contexto);

const periodos = (lista) => contexto.intervalosEntreJanelasAgenda(lista);
assert.deepEqual(Array.from(periodos([
    { hora_inicio:'08:00', hora_fim:'12:00' },
    { hora_inicio:'13:00', hora_fim:'18:00' }
]), x => ({ inicio:x.inicio, fim:x.fim })), [{ inicio:720, fim:780 }], 'Deve reconhecer o intervalo de 12:00 a 13:00.');
assert.equal(periodos([
    { hora_inicio:'08:00', hora_fim:'12:00' },
    { hora_inicio:'12:00', hora_fim:'18:00' }
]).length, 0, 'Períodos adjacentes não devem criar intervalo.');
assert.deepEqual(Array.from(periodos([
    { hora_inicio:'08:00', hora_fim:'14:00' },
    { hora_inicio:'12:00', hora_fim:'13:00' },
    { hora_inicio:'15:00', hora_fim:'18:00' }
]), x => ({ inicio:x.inicio, fim:x.fim })), [{ inicio:840, fim:900 }], 'Registros antigos sobrepostos devem produzir somente o espaço realmente livre.');

console.log('Agenda intervalo: espaço entre períodos restaurado e protegido por contrato.');

