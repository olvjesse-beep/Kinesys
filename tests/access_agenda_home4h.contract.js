'use strict';
const fs=require('fs');
const assert=require('assert');

const login=fs.readFileSync('login_access-1.18.0.js','utf8');
const script=fs.readFileSync('script-1.18.0.js','utf8');
const agenda=fs.readFileSync('agenda-1.20.0.js','utf8');
const agendaCss=fs.readFileSync('design_agenda.css','utf8');
const home=fs.readFileSync('home_fisioterapeuta_util-1.24.0.js','utf8');
const homeCss=fs.readFileSync('home_fisioterapeuta_util-1.24.0.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('screen_loader-1.25.0.js','utf8');

function bloco(texto,inicio,fim){const a=texto.indexOf(inicio);assert.ok(a>=0,`ausente: ${inicio}`);const b=texto.indexOf(fim,a);assert.ok(b>a,`fim ausente: ${fim}`);return texto.slice(a,b);}

// Login e administração de acesso.
assert.match(login,/typeof event\.getModifierState==='function'/,'Caps Lock deve tolerar eventos sem getModifierState');
const equipe=bloco(script,'async function carregarListaEquipe','async function excluirFuncionario');
assert.doesNotMatch(equipe,/data\.filter\(f => f\.ativo !== false\)/,'Perfis inativos não podem desaparecer da administração');
assert.match(equipe,/data-equipe-reativar/,'Lista deve permitir reativar perfil inativo');
assert.match(equipe,/data-equipe-redefinir/,'Lista deve permitir recuperar acesso');
assert.match(equipe,/resetPasswordForEmail/,'Redefinição deve atingir a credencial real do Supabase Auth');
assert.match(equipe,/update\(\{ ativo:true \}\)/,'Reativação deve preservar cadastro e apenas reabrir o perfil');
assert.match(html,/<th>Status<\/th>/,'Tabela deve mostrar status do perfil');
assert.match(html,/editar nome, e-mail ou função não troca a senha/,'UI deve explicar que editar cadastro não redefine senha');

// Agenda proporcional.
assert.match(agenda,/const AGENDA_GRADE_PASSO_MIN = 10;/,'Escala da grade deve ser de 10 minutos');
assert.match(agenda,/const passo = AGENDA_GRADE_PASSO_MIN;/,'Renderização deve usar o passo proporcional');
assert.match(agenda,/passo=AGENDA_GRADE_PASSO_MIN/,'Marcador Agora deve usar a mesma escala temporal');
assert.match(agenda,/restoHora===0\?'hora-cheia':\(restoHora===30\?'meia-hora':'subhora'\)/,'Grade deve manter hierarquia visual horária');
assert.match(agendaCss,/Agenda compacta proporcional — 10 min = 1 unidade visual/,'CSS compacto deve estar presente');
assert.match(agendaCss,/height:clamp\(340px,calc\(100dvh - 280px\),620px\)/,'Grade desktop deve se adaptar à altura disponível');
assert.match(agendaCss,/grid-template-rows:var\(--kds-agenda-header-height\) repeat\(var\(--kds-agenda-runtime-slot-count\),minmax\(3px,1fr\)\)/,'Slots devem dividir a altura disponível');
assert.match(agendaCss,/\.agenda-agora-linha\{[\s\S]*z-index:9/,'Linha Agora deve ficar destacada acima dos compromissos');
assert.match(loader,/agenda-1\.20\.0\.js\?v=20260910-agenda-edit-r1&compact_time=20260910-r1/,'Agenda lazy deve invalidar cache');
assert.doesNotMatch(html,/<script[^>]+agenda-1\.20\.0\.js/i,'Agenda deve continuar lazy');

// Meu dia clínico: somente janela seguinte de 4h, com estados e lacunas livres.
assert.match(home,/const JANELA_HOME_MINUTOS = 4 \* 60;/,'Home deve limitar a janela a quatro horas');
assert.match(home,/fimJanela=Math\.min\(24\*60,inicioJanela\+JANELA_HOME_MINUTOS\)/,'Janela deve ser móvel a partir do horário atual');
const painel=bloco(home,'async function carregarPainelFisioterapeutaUtil','window.carregarPainelFisioterapeuta=');
assert.doesNotMatch(painel,/\.neq\('status','cancelado'\)/,'Cancelados devem permanecer visíveis na janela');
assert.match(home,/rotulo:'Em atendimento'/,'Estado em atendimento deve existir');
assert.match(home,/rotulo:'Atendimento concluído'/,'Estado concluído deve existir');
assert.match(home,/rotulo:'Remarcado'/,'Estado remarcado deve existir');
assert.match(home,/rotulo:'Cancelado'/,'Estado cancelado deve existir');
assert.match(home,/rotulo:'A ser atendido'/,'Estado futuro deve existir');
const statusBlock=bloco(home,'function situacaoTemporal','function diaSemanaISOHome');
assert.ok(statusBlock.indexOf("rotulo:'Atendimento concluído'") < statusBlock.indexOf("rotulo:'Remarcado'"),'Concluído deve prevalecer sobre origem por reagendamento');
assert.ok(statusBlock.indexOf("rotulo:'Em atendimento'") < statusBlock.indexOf("rotulo:'Remarcado'"),'Em atendimento deve prevalecer sobre origem por reagendamento');
assert.match(equipe,/colspan=\"7\"/,'Estados vazio/erro da tabela devem respeitar as sete colunas');
assert.match(home,/function intervalosLivresHome/,'Home deve calcular lacunas livres reais da jornada');
assert.match(home,/nome\.textContent='Horário livre'/,'Lacunas devem ser explicitamente rotuladas');
assert.match(home,/contextoAgendaHomeFisioterapeuta=contexto\|\|null/,'Jornada e bloqueios devem vir do contexto seguro da Agenda');
assert.doesNotMatch(home,/LIMITE_COMPACTO/,'Home não deve voltar ao recorte arbitrário de três itens');
assert.match(homeCss,/is-free/,'Estado visual de horário livre deve existir');
assert.match(homeCss,/is-cancelled/,'Cancelamento deve ter estado visual próprio');
assert.match(homeCss,/is-rescheduled/,'Reagendamento deve ter estado visual próprio');

// Cache dos arquivos alterados sem remover revisões anteriores.
assert.match(html,/script-1\.18\.0\.js\?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1/);
assert.match(html,/screen_loader-1\.25\.0\.js\?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r1/);
assert.match(html,/login_access-1\.18\.0\.js\?v=20260910-access-r1/);
assert.match(html,/home_fisioterapeuta_util-1\.24\.0\.js\?v=20260910-r3&fisio_home=20260910-r1&home4h=20260910-r1/);

console.log('Access + Agenda compact + Home 4h contract: OK');
