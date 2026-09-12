'use strict';
const fs=require('fs');
const assert=require('assert');

const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const lifecycle=fs.readFileSync('src/agenda/agenda_lifecycle-1.0.0.js','utf8');
const agenda=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');

assert.ok(loader.indexOf('src/agenda/agenda-1.20.0.js')<loader.indexOf('src/agenda/agenda_lifecycle-1.0.0.js'),'Agenda lifecycle must load after the Agenda module');
assert.match(loader,/src\/agenda\/agenda_lifecycle-1\.0\.0\.js/,'Agenda lifecycle must remain lazy with the Agenda bundle');

assert.match(lifecycle,/function activate\(/,'Agenda lifecycle must expose activate');
assert.match(lifecycle,/function suspend\(/,'Agenda lifecycle must expose suspend');
assert.match(lifecycle,/function destroy\(/,'Agenda lifecycle must expose destroy');
assert.match(lifecycle,/kinesys:tela-ativada/,'Agenda lifecycle must react to screen activation');
assert.match(lifecycle,/kinesys:tela-desativada/,'Agenda lifecycle must react to screen suspension');
assert.match(lifecycle,/clearInterval\(relogioTimer\)/,'Agenda visual timer must stop when screen is suspended');
assert.match(lifecycle,/resizeObserver\.disconnect\(\)/,'Agenda ResizeObserver must disconnect while inactive');
assert.match(lifecycle,/removeEventListener\('visibilitychange',aoVisibilityChange\)/,'Agenda visibility listener must be removed while inactive');
assert.match(lifecycle,/removeEventListener\('resize',aoResize\)/,'Agenda resize listener must be removed while inactive');
assert.match(lifecycle,/document\.visibilityState!==['"]visible['"]/,'Agenda visual work must remain suspended while document is hidden');
assert.match(lifecycle,/iniciarRelogioAgenda=iniciarRelogioAgendaLifecycle/,'Agenda lifecycle must replace only the visual clock starter');

const syncStart=agenda.indexOf('function configurarSincronizacaoConfiavelAgenda()');
const syncEnd=agenda.indexOf('async function inicializarAgenda()',syncStart);
assert.ok(syncStart>=0&&syncEnd>syncStart,'reliable Agenda sync block must exist');
const syncBlock=agenda.slice(syncStart,syncEnd);
assert.match(syncBlock,/agendaSyncTimer\s*=\s*setInterval/,'reliable pending sync timer must remain intact in Phase 2A');
assert.doesNotMatch(lifecycle,/agendaSyncTimer|sincronizarAgendamentosPendentes/,'visual lifecycle must not interfere with reliable pending sync');

console.log('Agenda Lifecycle Phase 2A: visual timer, observer and listeners suspend with the screen; reliable pending sync remains untouched.');
