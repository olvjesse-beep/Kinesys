const assert=require('assert');
const fs=require('fs');
const src=fs.readFileSync('src/ui/ui_experience.js','utf8');

assert.doesNotMatch(src,/setInterval\(.*syncPatientContext.*5000/s,'polling visual de 5 s não deve permanecer');
assert.match(src,/document\.addEventListener\('kinesys:tela-ativada',event=>\{[\s\S]*event\.detail\?\.id==='tela_avaliacao'[\s\S]*requestAnimationFrame\(syncPatientContext\)/,'entrada na Avaliação deve sincronizar contexto visual');
assert.match(src,/evalScreen\.addEventListener\('input'/,'sincronização por input deve ser preservada');
assert.match(src,/evalScreen\.addEventListener\('change'/,'sincronização por change deve ser preservada');
assert.match(src,/new MutationObserver\(syncStepper\)/,'observer do stepper deve permanecer');
assert.match(src,/new MutationObserver\(syncRadarState\)/,'observer visual do Radar deve permanecer');
console.log('UI experience lifecycle contract OK');
