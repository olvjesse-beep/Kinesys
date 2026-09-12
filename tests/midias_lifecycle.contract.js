'use strict';

const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('src/core/script-1.18.0.js', 'utf8');
const midias = fs.readFileSync('src/core/midias_core-1.0.0.js', 'utf8');

assert.match(midias, /let midiaPollingCapturaSolicitado = false;/, 'Mídias deve rastrear se a captura solicitou polling');
assert.match(midias, /let kinesysLocalStatusTimer = null;/, 'status do serviço local deve possuir handle próprio');
assert.match(midias, /function telaMidiasAtivaKineSys\(\)/, 'Mídias deve possuir guarda explícita de tela ativa');
assert.match(midias, /function suspenderPollingCapturaMidias\(\)/, 'polling de captura deve possuir suspensão explícita');
assert.match(midias, /function iniciarPollingStatusMidias\(\)/, 'polling de status deve possuir ativação explícita');
assert.match(midias, /function suspenderPollingStatusMidias\(\)/, 'polling de status deve possuir suspensão explícita');
assert.match(midias, /function ativarLifecycleMidiasKineSys\(\)/, 'Mídias deve possuir activate do lifecycle');
assert.match(midias, /function suspenderLifecycleMidiasKineSys\(\)/, 'Mídias deve possuir suspend do lifecycle');

assert.match(midias, /clearInterval\(midiaPollTimer\);\s*midiaPollTimer = null;/s, 'suspend deve realmente parar o polling de captura');
assert.match(midias, /clearInterval\(kinesysLocalStatusTimer\);\s*kinesysLocalStatusTimer = null;/s, 'suspend deve realmente parar o polling de status');
assert.match(midias, /kinesysLocalStatusTimer = setInterval\([\s\S]*?10000\);/, 'status local deve manter cadência histórica de 10 s quando ativo');
assert.match(midias, /midiaPollTimer = setInterval\([\s\S]*?1800\);/, 'captura deve manter cadência histórica de 1,8 s quando ativa');

assert.match(app, /document\.addEventListener\('kinesys:tela-ativada'[\s\S]*?tela_midias[\s\S]*?ativarLifecycleMidiasKineSys/, 'ativação da tela deve iniciar lifecycle de Mídias');
assert.match(app, /document\.addEventListener\('kinesys:tela-desativada'[\s\S]*?tela_midias[\s\S]*?suspenderLifecycleMidiasKineSys/, 'desativação da tela deve suspender lifecycle de Mídias');

assert.doesNotMatch(midias + '\n' + app, /setInterval\(\(\)=>\{if\(document\.getElementById\('tela_midias'\)\?\.classList\.contains\('ativa'\)\)verificarKinesysLocal\(false\);\},10000\)/, 'polling global anônimo de 10 s não pode continuar acordando fora da tela');
assert.doesNotMatch(midias + '\n' + app, /setTimeout\(\(\)=>verificarKinesysLocal\(false\),900\)/, 'bootstrap não deve consultar serviço local de Mídias sem a tela ativa');

console.log('Media lifecycle contract: OK');
