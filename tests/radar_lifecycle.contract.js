const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('script-1.18.0.js', 'utf8');

assert.match(source, /function instalarObservadorCicloVidaRadar\(\)/, 'Radar deve manter o ponto público de instalação do lifecycle');
assert.doesNotMatch(source, /new MutationObserver\(\(\) => sincronizarCicloVidaRadar\(\)\)/, 'Radar não deve manter MutationObserver apenas para detectar ativação da tela');
assert.match(source, /document\.addEventListener\('kinesys:tela-ativada', sincronizarSeAvaliacao\)/, 'Radar deve reagir ao evento oficial de ativação');
assert.match(source, /document\.addEventListener\('kinesys:tela-desativada', sincronizarSeAvaliacao\)/, 'Radar deve reagir ao evento oficial de desativação');
assert.match(source, /if \(event\?\.detail\?\.id === 'tela_avaliacao'\) sincronizarCicloVidaRadar\(\)/, 'Eventos de outras telas não devem disparar lifecycle do Radar');
assert.match(source, /tela\.dataset\.radarLifecycleBound === '1'/, 'Binding do lifecycle deve continuar idempotente');
assert.match(source, /container\.classList\.toggle\('radar-contexto-avaliacao', ativa\)/, 'Sincronização visual existente deve ser preservada');
assert.match(source, /if \(!ativa\) fecharRadarKineSys\(true\)/, 'Ao sair da avaliação o Radar deve continuar sendo fechado');

console.log('Radar lifecycle contract: OK');
