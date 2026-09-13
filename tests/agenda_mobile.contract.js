'use strict';
const fs=require('fs');
const assert=require('assert');

const css=fs.readFileSync('styles/agenda_mobile-1.0.0.css','utf8');
const lifecycle=fs.readFileSync('src/agenda/agenda_lifecycle-1.0.0.js','utf8');
const htaccess=fs.readFileSync('.htaccess','utf8');

assert.match(lifecycle,/agenda_mobile-1\.0\.0\.css\?v=20260913-mobile-r1/,'mobile Agenda stylesheet must be loaded by the lazy lifecycle');
assert.match(css,/@media \(max-width:760px\)/,'mobile Agenda layer must remain scoped to small screens');
assert.match(css,/agenda-grade-scroll[\s\S]*overflow-x:auto!important/,'weekly grid must support horizontal swipe instead of squeezing all days');
assert.match(css,/agenda-semana-grade[\s\S]*min-width:900px/,'weekly grid must preserve readable day-column width');
assert.match(css,/repeat\(var\(--kds-agenda-runtime-day-count\),minmax\(150px,1fr\)\)/,'weekly day columns must keep a readable minimum width');
assert.match(css,/:has\(\[data-agenda-periodo="dia"\]\[aria-pressed="true"\]\)[\s\S]*min-width:100%/,'day view must remain fluid without forced horizontal scrolling');
assert.match(css,/agenda-hora-eixo[\s\S]*position:sticky[\s\S]*left:0/,'hour axis must remain visible while swiping horizontally');
assert.match(css,/agenda-semana-grade \.agenda-canto[\s\S]*position:sticky[\s\S]*top:0/,'top-left grid corner must remain sticky');
assert.match(css,/min-height:44px/,'mobile navigation targets must meet the 44px touch target floor');
assert.match(css,/font-size:16px/,'mobile form fields must avoid iOS zoom and remain readable');
assert.match(css,/#modal_agendamento \.actions[\s\S]*position:sticky/,'mobile appointment actions must remain reachable while the modal scrolls');
assert.match(css,/env\(safe-area-inset-bottom\)/,'mobile Agenda must respect the iPhone bottom safe area');
assert.match(htaccess,/agenda_lifecycle-1\.0\.0\.js/,'Agenda lifecycle must remain revalidated in production');
assert.match(htaccess,/agenda_mobile-1\.0\.0\.css/,'Agenda mobile stylesheet must remain revalidated in production');

console.log('Agenda mobile contract OK: readable weekly swipe, fluid day view, sticky time axis, touch targets and iPhone-safe modal.');
