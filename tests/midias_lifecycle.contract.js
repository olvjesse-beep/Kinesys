'use strict';

const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('script-1.18.0.js', 'utf8');

assert.match(app, /let midiaPollingCapturaSolicitado = false;/, 'Mídias deve rastrear se a captura solicitou polling');
assert.match(app, /let kinesysLocalStatusTimer = null;/, 'status do serviço local deve possuir handle próprio');
assert.match(app, /function telaMidiasAtivaKineSys\(\)/, 'Mídias deve possuir guarda explícita de tela ativa');
assert.match(app, /function suspenderPollingCapturaMidias\(\)/, 'polling de captura deve possuir suspensão explícita');
assert.match(app, /function iniciarPollingStatusMidias\(\)/, 'polling de status deve possuir ativação explícita');
assert.match(app, /function suspenderPollingStatusMidias\(\)/, 'polling de status deve possuir suspensão explícita');
assert.match(app, /function ativarLifecycleMidiasKineSys\(\)/, 'Mídias deve possuir activate do lifecycle');
assert.match(app, /function suspenderLifecycleMidiasKineSys\(\)/, 'Mídias deve possuir suspend do lifecycle');

assert.match(app, /clearInterval\(midiaPollTimer\);\s*midiaPollTimer = null;/s, 'suspend deve realmente parar o polling de captura');
assert.match(app, /clearInterval\(kinesysLocalStatusTimer\);\s*kinesysLocalStatusTimer = null;/s, 'suspend deve realmente parar o polling de status');
assert.match(app, /kinesysLocalStatusTimer = setInterval\([\s\S]*?10000\);/, 'status local deve manter cadência histórica de 10 s quando ativo');
assert.match(app, /midiaPollTimer = setInterval\([\s\S]*?1800\);/, 'captura deve manter cadência histórica de 1,8 s quando ativa');

assert.match(app, /document\.addEventListener\('kinesys:tela-ativada'[\s\S]*?tela_midias[\s\S]*?ativarLifecycleMidiasKineSys/, 'ativação da tela deve iniciar lifecycle de Mídias');
assert.match(app, /document\.addEventListener\('kinesys:tela-desativada'[\s\S]*?tela_midias[\s\S]*?suspenderLifecycleMidiasKineSys/, 'desativação da tela deve suspender lifecycle de Mídias');

assert.doesNotMatch(app, /setInterval\(\(\)=>\{if\(document\.getElementById\('tela_midias'\)\?\.classList\.contains\('ativa'\)\)verificarKinesysLocal\(false\);\},10000\)/, 'polling global anônimo de 10 s não pode continuar acordando fora da tela');
assert.doesNotMatch(app, /setTimeout\(\(\)=>verificarKinesysLocal\(false\),900\)/, 'bootstrap não deve consultar serviço local de Mídias sem a tela ativa');

console.log('Media lifecycle contract: OK');
