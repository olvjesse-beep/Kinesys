'use strict';
const fs=require('fs');
const assert=require('assert');

const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const lifecycle=fs.readFileSync('src/agenda/agenda_lifecycle-1.0.0.js','utf8');
const agenda=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');
const mobileCss=fs.readFileSync('styles/agenda_mobile-1.0.0.css','utf8');
const htaccess=fs.readFileSync('.htaccess','utf8');

assert.ok(loader.indexOf('src/agenda/agenda-1.20.0.js')<loader.indexOf('src/agenda/agenda_lifecycle-1.0.0.js'),'Agenda lifecycle must load after the Agenda module');
assert.match(loader,/src\/agenda\/agenda_lifecycle-1\.0\.0\.js/,'Agenda lifecycle must remain lazy with the Agenda bundle');

assert.match(lifecycle,/function activate\(/,'Agenda lifecycle must expose activate');
assert.match(lifecycle,/function suspend\(/,'Agenda lifecycle must expose suspend');
assert.match(lifecycle,/function destroy\(/,'Agenda lifecycle must expose destroy');
assert.match(lifecycle,/kinesys:tela-ativada/,'Agenda lifecycle must react to screen activation');
assert.match(lifecycle,/kinesys:tela-desativada/,'Agenda lifecycle must react to screen suspension');
assert.match(lifecycle,/clearInterval\(relogioTimer\)/,'Agenda visual timer must stop when screen is suspended');
assert.match(lifecycle,/resizeObserver\.disconnect\(\)/,'Agenda ResizeObserver must disconnect while inactive');
assert.match(lifecycle,/mutationObserver\.disconnect\(\)/,'Agenda MutationObserver must disconnect while inactive');
assert.match(lifecycle,/removeEventListener\('visibilitychange',aoVisibilityChange\)/,'Agenda visibility listener must be removed while inactive');
assert.match(lifecycle,/removeEventListener\('resize',aoResize\)/,'Agenda resize listener must be removed while inactive');
assert.match(lifecycle,/document\.visibilityState!==['"]visible['"]/,'Agenda visual work must remain suspended while document is hidden');
assert.match(lifecycle,/iniciarRelogioAgenda=iniciarRelogioAgendaLifecycle/,'Agenda lifecycle must replace only the visual clock starter');

assert.match(lifecycle,/agenda_mobile-1\.0\.0\.css\?v=20260913-mobile-r1/,'Agenda lifecycle must load the dedicated mobile stylesheet');
assert.match(lifecycle,/function sincronizarEstadoVisualAgenda\(/,'Agenda lifecycle must synchronize the global shell after lazy activation');
assert.match(lifecycle,/document\.body\.dataset\.tela=['"]tela_agenda['"]/,'Agenda activation must synchronize body[data-tela]');
assert.match(lifecycle,/ks_page_title[\s\S]*textContent=['"]Agenda['"]/,'Agenda activation must repair the global page title after async lazy navigation');
assert.match(lifecycle,/ks_page_subtitle[\s\S]*Semana de atendimento e disponibilidade/,'Agenda activation must repair the global page subtitle');
assert.match(lifecycle,/function alinharHojeNaGradeMobile\(/,'Agenda lifecycle must expose mobile today alignment internally');
assert.match(lifecycle,/agenda-dia-cabecalho\.hoje/,'mobile weekly view must locate the current day header');
assert.match(lifecycle,/scroll\.scrollLeft=Math\.max\(0,alvo\)/,'mobile weekly view must center today without changing the Agenda data model');

assert.match(mobileCss,/@media \(max-width:760px\)/,'mobile Agenda layer must remain scoped to the official 760px breakpoint');
assert.match(mobileCss,/@media \(max-width:430px\)/,'narrow-phone refinement must use the official 430px breakpoint');
assert.match(mobileCss,/agenda-grade-scroll[\s\S]*overflow-x:auto!important/,'weekly grid must support horizontal swipe instead of squeezing all days');
assert.match(mobileCss,/agenda-semana-grade[\s\S]*min-width:1120px/,'weekly grid must preserve readable width for the full week');
assert.match(mobileCss,/repeat\(var\(--kds-agenda-runtime-day-count\),minmax\(150px,1fr\)\)/,'weekly day columns must keep a readable minimum width');
assert.match(mobileCss,/:has\(\[data-agenda-periodo="dia"\]\[aria-pressed="true"\]\)[\s\S]*min-width:100%/,'day view must remain fluid without forced horizontal scrolling');
assert.match(mobileCss,/agenda-hora-eixo[\s\S]*position:sticky[\s\S]*left:0/,'hour axis must remain visible while swiping horizontally');
assert.match(mobileCss,/agenda-semana-grade \.agenda-canto[\s\S]*position:sticky[\s\S]*top:0/,'top-left grid corner must remain sticky');
assert.match(mobileCss,/min-height:44px/,'mobile navigation targets must meet the 44px touch target floor');
assert.match(mobileCss,/font-size:16px/,'mobile form fields must avoid iOS zoom and remain readable');
assert.doesNotMatch(mobileCss,/font-size:(?:11|12)px/,'Agenda mobile must not reintroduce unreadable microtype');
assert.match(mobileCss,/#modal_agendamento \.actions[\s\S]*position:sticky/,'mobile appointment actions must remain reachable while the modal scrolls');
assert.match(mobileCss,/env\(safe-area-inset-bottom\)/,'mobile Agenda must respect the iPhone bottom safe area');
assert.match(htaccess,/agenda_lifecycle-1\.0\.0\.js/,'Agenda lifecycle must remain revalidated in production');
assert.match(htaccess,/agenda_mobile-1\.0\.0\.css/,'Agenda mobile stylesheet must remain revalidated in production');

const syncStart=agenda.indexOf('function configurarSincronizacaoConfiavelAgenda()');
const syncEnd=agenda.indexOf('async function inicializarAgenda()',syncStart);
assert.ok(syncStart>=0&&syncEnd>syncStart,'reliable Agenda sync block must exist');
const syncBlock=agenda.slice(syncStart,syncEnd);
assert.match(syncBlock,/agendaSyncTimer\s*=\s*setInterval/,'reliable pending sync timer must remain intact in Phase 2A');
assert.doesNotMatch(lifecycle,/agendaSyncTimer|sincronizarAgendamentosPendentes/,'visual lifecycle must not interfere with reliable pending sync');

console.log('Agenda lifecycle/mobile contract OK: readable weekly swipe, fluid day view, sticky time axis, touch targets, iPhone-safe modal and synchronized shell.');
