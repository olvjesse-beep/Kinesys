'use strict';
const fs=require('fs');
const assert=require('assert');

const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const lifecycle=fs.readFileSync('src/agenda/agenda_lifecycle-1.0.0.js','utf8');
const agenda=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');
const mobileCss=fs.readFileSync('styles/agenda_mobile-1.0.0.css','utf8');
const mobileGridCss=fs.readFileSync('styles/agenda_mobile_grid-1.0.0.css','utf8');
const mobileOrderCss=fs.readFileSync('styles/agenda_mobile_order-1.0.0.css','utf8');
const htaccess=fs.readFileSync('.htaccess','utf8');

assert.ok(loader.indexOf('src/agenda/agenda-1.20.0.js')<loader.indexOf('src/agenda/agenda_lifecycle-1.0.0.js'),'Agenda lifecycle must load after the Agenda module');
assert.match(loader,/src\/agenda\/agenda_lifecycle-1\.0\.0\.js\?v=20260914-postgrid-r37/,'Agenda lifecycle must use the current post-grid cache revision');
assert.match(loader,/styles\/agenda_mobile-1\.0\.0\.css\?v=20260913-mobile-r2/,'Agenda mobile CSS must be part of the lazy Agenda bundle');
assert.match(loader,/styles\/agenda_mobile_grid-1\.0\.0\.css\?v=20260913-grid-r19/,'deterministic mobile grid CSS must be part of the official Agenda bundle');
assert.match(loader,/styles\/agenda_mobile_order-1\.0\.0\.css\?v=20260914-postgrid-r37/,'Agenda mobile order CSS must use the current post-grid revision');
assert.ok(loader.indexOf('styles/agenda_referencia-1.20.0.css')<loader.indexOf('styles/agenda_mobile-1.0.0.css'),'Agenda mobile layer must load after the reference stylesheet');
assert.ok(loader.indexOf('styles/agenda_mobile-1.0.0.css')<loader.indexOf('styles/agenda_mobile_grid-1.0.0.css'),'deterministic mobile grid correction must load after the base mobile layer');
assert.ok(loader.indexOf('styles/agenda_mobile_grid-1.0.0.css')<loader.indexOf('styles/agenda_mobile_order-1.0.0.css'),'mobile order fallback must load after the grid stylesheet');
assert.match(loader,/ASSET_REVISION=['"]20260914-agenda-postgrid-r37['"]/,'screen loader must force the current Agenda post-grid asset revision');

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

assert.match(lifecycle,/agenda_mobile-1\.0\.0\.css\?v=20260913-mobile-r2/,'Agenda lifecycle fallback must point to the current mobile stylesheet');
assert.match(lifecycle,/agenda_mobile_grid-1\.0\.0\.css\?v=20260913-grid-r19/,'Agenda lifecycle fallback must point to the current mobile grid stylesheet');
assert.match(lifecycle,/agenda_mobile_order-1\.0\.0\.css\?v=20260914-postgrid-r37/,'Agenda lifecycle fallback must point to the current post-grid stylesheet');
assert.match(lifecycle,/function garantirLinkEstilo\(/,'Agenda lifecycle must use one idempotent stylesheet loader');
assert.match(lifecycle,/src\.split\('\?'\)\[0\]/,'Agenda lifecycle stylesheet loader must avoid duplicate versions of the same stylesheet');
assert.match(lifecycle,/function sincronizarEstadoVisualAgenda\(/,'Agenda lifecycle must synchronize the global shell after lazy activation');
assert.match(lifecycle,/document\.body\.dataset\.tela=['"]tela_agenda['"]/,'Agenda activation must synchronize body[data-tela]');
assert.match(lifecycle,/ks_page_title[\s\S]*textContent=['"]Agenda['"]/,'Agenda activation must repair the global page title after async lazy navigation');
assert.match(lifecycle,/ks_page_subtitle[\s\S]*Semana de atendimento e disponibilidade/,'Agenda activation must repair the global page subtitle');
assert.match(lifecycle,/function alinharHojeNaGradeMobile\(/,'Agenda lifecycle must expose mobile today alignment internally');
assert.match(lifecycle,/agenda-dia-cabecalho\.hoje/,'mobile weekly view must locate the current day header');
assert.match(lifecycle,/scroll\.scrollLeft=Math\.max\(0,alvo\)/,'mobile weekly view must center today without changing the Agenda data model');

/* Contrato visual r37: os controles superiores não podem voltar ao topo. */
assert.match(lifecycle,/function removerControlesSuperioresMobileAgenda\(/,'lifecycle must own removal of obsolete top navigation');
assert.match(lifecycle,/const nav=document\.querySelector\('#tela_agenda \.agenda-semana-nav'\)/,'lifecycle must target the real static weekly navigation node');
assert.match(lifecycle,/nav\.remove\(\)/,'weekly navigation must be physically removed from the mobile DOM flow');
assert.match(lifecycle,/function garantirHostPosGrade\(/,'lifecycle must own the post-grid host');
assert.match(lifecycle,/painel\.insertAdjacentElement\('afterend',host\)/,'post-grid host must be placed immediately after agenda_painel');
assert.match(lifecycle,/hostPosGrade\.appendChild\(tabs\)/,'waitlist control must move to the post-grid host');
assert.match(lifecycle,/hostPosGrade\.appendChild\(historico\)/,'status history must move to the post-grid host');
assert.doesNotMatch(lifecycle,/\[visoes,novo,nav,periodo,historico,tabs,feedback\]/,'legacy top-order array must not return');
assert.match(mobileOrderCss,/\.agenda-semana-nav,[\s\S]*\.agenda-periodo-segmentado[\s\S]*display:none!important/,'CSS fallback must hide obsolete top controls on mobile');
assert.match(mobileOrderCss,/#ks_agenda_mobile_post_grid[\s\S]*display:flex!important/,'CSS must style the post-grid action host');
assert.match(mobileOrderCss,/#ks_agenda_mobile_post_grid #ks_agenda_controls[\s\S]*order:10!important/,'waitlist action must precede history after the grid');
assert.match(mobileOrderCss,/#ks_agenda_mobile_post_grid \.agenda-audit-btn[\s\S]*order:20!important/,'history action must follow waitlist after the grid');

assert.match(mobileCss,/@media \(max-width:760px\)/,'mobile Agenda layer must remain scoped to the official 760px breakpoint');
assert.match(mobileCss,/@media \(max-width:430px\)/,'narrow-phone refinement must use the official 430px breakpoint');
assert.match(mobileCss,/agenda-grade-scroll[\s\S]*overflow-x:auto!important/,'weekly grid must support horizontal swipe instead of squeezing all days');
assert.match(mobileCss,/min-height:44px/,'mobile navigation targets must meet the 44px touch target floor');
assert.match(mobileCss,/font-size:16px/,'mobile form fields must avoid iOS zoom and remain readable');
assert.doesNotMatch(mobileCss,/font-size:(?:11|12)px/,'Agenda mobile must not reintroduce unreadable microtype');
assert.match(mobileCss,/#modal_agendamento \.actions[\s\S]*position:sticky/,'mobile appointment actions must remain reachable while the modal scrolls');
assert.match(mobileCss,/env\(safe-area-inset-bottom\)/,'mobile Agenda must respect the iPhone bottom safe area');

assert.match(mobileGridCss,/@media \(max-width:760px\)/,'deterministic grid fix must remain mobile-only');
assert.match(mobileGridCss,/grid-template-columns:58px repeat\(var\(--kds-agenda-runtime-day-count\),160px\)!important/,'weekly mobile view must keep readable day tracks');
assert.match(mobileGridCss,/--kds-agenda-slot-height:8px!important/,'mobile temporal scale must use 8px per 10-minute slot');
assert.match(mobileGridCss,/grid-template-rows:46px repeat\(var\(--kds-agenda-runtime-slot-count\),8px\)!important/,'mobile grid rows must preserve the compact 48px-per-hour scale');
assert.match(mobileGridCss,/max-height:none!important/,'mobile grid must expose the useful working-day range instead of trapping it in a tall nested scroller');
assert.match(mobileGridCss,/overflow-y:hidden!important/,'mobile page scrolling must own the vertical axis');
assert.match(mobileGridCss,/width:max-content!important/,'weekly mobile grid must grow beyond the viewport instead of squeezing');
assert.match(mobileGridCss,/overflow-x:auto!important/,'weekly mobile grid container must remain horizontally scrollable');
assert.match(mobileGridCss,/agenda-hora-eixo[\s\S]*position:sticky!important[\s\S]*left:0!important/,'hour axis must remain fixed while swiping days');
assert.match(mobileGridCss,/agenda-compromisso[\s\S]*min-height:0!important/,'appointment cards must follow their real duration instead of forcing a tall minimum');
assert.match(mobileGridCss,/:has\(\[data-agenda-periodo="dia"\]\[aria-pressed="true"\]\)[\s\S]*grid-template-columns:58px minmax\(0,1fr\)!important/,'day view styling may remain available without exposing the removed mobile toggle');

/* A faixa vertical é adaptativa: usa janelas do profissional e os agendamentos reais. */
assert.match(agenda,/function limitesHorariosGrade\(dias, profissionalId\)/,'Agenda must retain the adaptive working-range calculator');
assert.match(agenda,/janelasAgendaPara\(d\.diaSemana, profissionalId\)/,'working range must derive from the selected professional schedule');
assert.match(agenda,/const limites = limitesHorariosGrade\(dias, profissionalFiltro\)/,'weekly rendering must apply the selected professional adaptive range');

assert.match(htaccess,/screen_loader-1\.25\.0\.js/,'screen loader must be revalidated in production');
assert.match(htaccess,/kinesys_delivery_agenda_runtime_r37/,'Safari cache reset must use the fresh official runtime revision');
assert.match(htaccess,/src\/ui\/screen_loader-1\.25\.0\.js\?v=20260914-agenda-postgrid-r37/,'server fallback must deliver the current screen loader URL');
assert.match(htaccess,/styles\/agenda_mobile_grid-1\.0\.0\.css\?v=20260913-density-r20/,'server fallback must keep the compact mobile grid stylesheet');
assert.match(htaccess,/styles\/agenda_mobile_order-1\.0\.0\.css\?v=20260914-postgrid-r37/,'server fallback must deliver the post-grid order stylesheet');

const syncStart=agenda.indexOf('function configurarSincronizacaoConfiavelAgenda()');
const syncEnd=agenda.indexOf('async function inicializarAgenda()',syncStart);
assert.ok(syncStart>=0&&syncEnd>syncStart,'reliable Agenda sync block must exist');
const syncBlock=agenda.slice(syncStart,syncEnd);
assert.match(syncBlock,/agendaSyncTimer\s*=\s*setInterval/,'reliable pending sync timer must remain intact');
assert.doesNotMatch(lifecycle,/agendaSyncTimer|sincronizarAgendamentosPendentes/,'visual lifecycle must not interfere with reliable pending sync');

console.log('Agenda lifecycle/mobile contract OK: official r37 runtime removes obsolete top controls and moves waitlist/history after the grid without changing clinical or scheduling logic.');
