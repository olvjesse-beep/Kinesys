'use strict';
const fs=require('fs');
const assert=require('assert');

const runtime=fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const agendaLifecycle=fs.readFileSync('src/agenda/agenda_lifecycle-1.0.0.js','utf8');
const homeFisio=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');

assert.match(runtime,/MIN_AUSENCIA_MS\s*=\s*1500/,'retorno deve ignorar trocas acidentais muito curtas');
assert.match(runtime,/const TELA_REVALIDAVEL='tela_agenda'/,'resume refresh deve pertencer somente à Agenda');
assert.match(runtime,/visibilitychange/,'retorno deve observar visibilidade da aba');
assert.match(runtime,/addEventListener\('blur'/,'retorno deve marcar troca de janela');
assert.match(runtime,/addEventListener\('focus'/,'retorno deve revalidar ao recuperar foco');
assert.match(runtime,/addEventListener\('pagehide'/,'retorno deve cobrir suspensão\/bfcache');
assert.match(runtime,/addEventListener\('pageshow'/,'retorno deve cobrir restauração\/bfcache');
assert.match(runtime,/KineSysAgendaLifecycle\?\.suspend\?\.\(\)/,'Agenda visual deve suspender ao sair do navegador');
assert.match(runtime,/KineSysAgendaLifecycle\?\.activate\?\.\(\)/,'Agenda visual deve reativar ao retornar');
assert.match(runtime,/invalidarCacheAgendaSemana\(\)/,'retorno à Agenda deve invalidar somente o cache curto da semana');
assert.match(runtime,/renderizarPainelAgenda\(\)/,'retorno à Agenda deve recarregar rapidamente os dados visíveis');
assert.doesNotMatch(runtime,/carregarPainelFisioterapeuta|KineSysMeuDiaClinico/,'resume refresh não pode atualizar o Meu Dia');
assert.doesNotMatch(runtime,/MutationObserver|normalizarMeuDiaClinico|observarMeuDiaClinico/,'resume refresh não pode conter hotfix visual do Meu Dia');
assert.doesNotMatch(runtime,/setInterval\s*\(/,'resume refresh não pode introduzir polling');
assert.doesNotMatch(runtime,/_supabase\.(from|rpc)/,'resume refresh deve reutilizar APIs existentes, sem criar consultas paralelas');
assert.doesNotMatch(runtime,/agendaSyncTimer|sincronizarAgendamentosPendentes/,'resume refresh não pode interferir na sincronização confiável da Agenda');

assert.match(agendaLifecycle,/function suspend\(/,'Agenda lifecycle precisa manter API de suspensão');
assert.match(agendaLifecycle,/function activate\(/,'Agenda lifecycle precisa manter API de ativação');
assert.match(homeFisio,/window\.KineSysMeuDiaClinico=Object\.freeze/,'Meu Dia deve possuir API própria fora do resume refresh');
assert.match(homeFisio,/window\.carregarPainelFisioterapeuta=garantirPainelFisioterapeuta/,'compatibilidade histórica deve apenas garantir a carga inicial');

const homeTag='src/home/home_fisioterapeuta_util-1.24.0.js';
const resumeTag='src/core/operational_resume_refresh-1.0.0.js';
assert(html.includes(homeTag),'index deve carregar o módulo do Meu Dia');
assert(html.includes(resumeTag),'index deve carregar operational resume refresh');
assert(html.indexOf(homeTag)<html.indexOf(resumeTag),'resume refresh deve carregar depois do Meu Dia Clínico');
assert(html.indexOf('src/ui/screen_loader-1.25.0.js')<html.indexOf(resumeTag),'resume refresh deve carregar depois do lifecycle oficial de telas');

console.log('Operational resume refresh contract: somente Agenda revalida ao retornar; Meu Dia possui lifecycle próprio.');
