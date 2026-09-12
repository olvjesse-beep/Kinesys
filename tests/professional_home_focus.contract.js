const assert = require('assert');
const fs = require('fs');

const dashboard = fs.readFileSync('src/home/home_profissional_dashboard-1.0.0.js','utf8');
const bootstrap = fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js','utf8');
const css = fs.readFileSync('styles/home_profissional_dashboard-1.0.0.css','utf8');

assert.match(dashboard,/tipo==='FISIOTERAPEUTA'\|\|tipo==='PROFISSIONAL'/,'dashboard deve ficar restrito ao perfil profissional');
assert.match(dashboard,/lista_pacientes_recentes/,'Home profissional deve retirar o card legado de recentes\/24h');
assert.match(dashboard,/data-ks-home-detail=\"recentes\"/,'Home profissional deve retirar também o resumo de cadastros criado pelo Design System');
assert.match(dashboard,/card_pendencias_clinicas/,'Home profissional deve substituir o card grande de pendências');
assert.match(dashboard,/ks_prof_pendencias_badge/,'pendências devem usar badge discreto');
assert.match(dashboard,/Avaliação a concluir/,'pendências devem contemplar avaliação a concluir');
assert.match(dashboard,/Evolução a concluir/,'pendências devem contemplar evolução a concluir');
assert.match(dashboard,/finalizadas=avaliacoes\.filter\(av=>String\(av\?\.status\|\|''\)\.toLowerCase\(\)!=='rascunho'\)/,'avaliação em rascunho não deve encerrar pendência');
assert.match(dashboard,/modo==='avaliacao'\?finalizadas:/,'somente avaliação finalizada deve quitar registro avaliativo');
assert.match(dashboard,/in\('status',\['atendido','concluido'\]\)/,'mês deve contar somente atendimentos realizados');
assert.match(dashboard,/\.gte\('data',limites\.inicio\)\.lt\('data',limites\.proximo\)/,'mês deve usar primeiro dia inclusivo e próximo mês exclusivo');
assert.match(dashboard,/grupos\.get\(id\)/,'atendimentos mensais devem ser agrupados por paciente');
assert.match(dashboard,/p\.nascimento/,'notificações devem considerar aniversário cadastrado');
assert.match(dashboard,/agendaNotificacoesCache/,'notificações da Home devem reutilizar o núcleo de notificações existente');
assert.match(bootstrap,/home_profissional_dashboard-1\.0\.0\.js/,'bootstrap operacional deve carregar o módulo focado');
assert.match(bootstrap,/home_profissional_dashboard-1\.0\.0\.css/,'bootstrap operacional deve carregar o estilo focado');
assert.match(css,/\.ks-prof-home-grid/,'layout profissional precisa de grade própria');
assert.match(css,/\.ks-prof-pending-trigger/,'pendência precisa de tratamento visual compacto');
assert.match(css,/data-prof-home-legacy-hidden/,'cards legados devem permanecer realmente ocultos no perfil profissional');

console.log('professional_home_focus.contract.js OK');
