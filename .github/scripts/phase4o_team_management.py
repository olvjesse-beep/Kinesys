from pathlib import Path

SCRIPT=Path('script-1.18.0.js')
INDEX=Path('index.html')
MODULE=Path('team_management_core-1.0.0.js')
TEST=Path('tests/team_management_modularization.contract.js')
ACCESS_TEST=Path('tests/access_management.contract.js')

src=SCRIPT.read_text(encoding='utf-8')
start_marker='/* ================= 4. GESTÃO DE EQUIPE ================= */'
end_marker='/* ==========================================================================\n   KINESYS - SCRIPT DEFINITIVO (ID ÚNICO E SEM DUPLICATAS) - PARTE 3 DE 4\n   Radar Clínico em Tempo Real\n   ========================================================================== */'
start=src.find(start_marker)
end=src.find(end_marker,start)
if start<0 or end<=start:
    raise SystemExit(f'team block markers not found: start={start} end={end}')
block=src[start:end].rstrip()

required=[
    'perfilPorConselho','normalizarNivelAcessoEquipe','conselhoFuncionarioEquipe',
    'normalizarIdentificador','somenteDigitosEquipe','formatarRegistroProfissional',
    'atualizarAjudaNivelAcesso','sugerirNivelAcessoPorRegistro','alternarCampoRegistroProfissional',
    'verificarDuplicidadeFuncionario','funcionarioPodeAparecerNaAgenda','limparFormularioEquipe',
    'abrirEdicaoFuncionario','cadastrarNovoFuncionario','carregarListaEquipe','reativarFuncionario',
    'enviarRedefinicaoAcessoFuncionario','excluirFuncionario'
]
for fn in required:
    if f'function {fn}(' not in block and f'async function {fn}(' not in block:
        raise SystemExit(f'missing team function in extracted block: {fn}')

MODULE.write_text("""'use strict';
/* ==========================================================================\n   KineSys — Team Management Core 1.0.0\n   Phase 4O: gestão administrativa da equipe extraída sem alteração de regra.\n   Autorização, Supabase, validações e controladores de acesso permanecem os mesmos.\n   ========================================================================== */\n\n"""+block+'\n',encoding='utf-8')
SCRIPT.write_text(src[:start]+src[end:],encoding='utf-8')

html=INDEX.read_text(encoding='utf-8')
old='core_mod=20260911-phase4n-r1'
new='core_mod=20260911-phase4o-r1'
if html.count(old)!=1:
    raise SystemExit(f'core cache marker expected once, got {html.count(old)}')
html=html.replace(old,new,1)
anchor='    <script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1&data_cache=20260911-r1&core_mod=20260911-phase4o-r1"></script>\n'
team='    <script defer src="team_management_core-1.0.0.js?v=20260911-phase4o-r1"></script>\n'
if html.count(anchor)!=1:
    raise SystemExit(f'core script anchor expected once after cache update, got {html.count(anchor)}')
html=html.replace(anchor,team+anchor,1)
INDEX.write_text(html,encoding='utf-8')

for p in Path('tests').glob('*.js'):
    t=p.read_text(encoding='utf-8')
    if old in t:
        p.write_text(t.replace(old,new),encoding='utf-8')

access=ACCESS_TEST.read_text(encoding='utf-8')
old_import="const core=fs.readFileSync('script-1.18.0.js','utf8');"
new_import="const core=fs.readFileSync('script-1.18.0.js','utf8');\nconst team=fs.readFileSync('team_management_core-1.0.0.js','utf8');"
if access.count(old_import)!=1:
    raise SystemExit(f'access core import expected once, got {access.count(old_import)}')
access=access.replace(old_import,new_import,1)
old_reset="const resetStart=core.indexOf('async function enviarRedefinicaoAcessoFuncionario(id)');\nconst resetEnd=core.indexOf('async function excluirFuncionario(id)',resetStart);\nassert.ok(resetStart>=0&&resetEnd>resetStart,'team reset compatibility function must exist');\nconst resetBlock=core.slice(resetStart,resetEnd);\nassert.match(resetBlock,/KineSysAccessAdmin\\?\\.open/,'legacy team action must delegate to the secure access admin controller');\nassert.doesNotMatch(resetBlock,/resetPasswordForEmail/,'team administration must not depend on recovery email');\nassert.match(core,/>Definir nova senha<\\/button>/,'team action must be labeled as direct password definition');"
new_reset="const resetStart=team.indexOf('async function enviarRedefinicaoAcessoFuncionario(id)');\nconst resetEnd=team.indexOf('async function excluirFuncionario(id)',resetStart);\nassert.ok(resetStart>=0&&resetEnd>resetStart,'team reset compatibility function must exist in the dedicated team module');\nconst resetBlock=team.slice(resetStart,resetEnd);\nassert.match(resetBlock,/KineSysAccessAdmin\\?\\.open/,'legacy team action must delegate to the secure access admin controller');\nassert.doesNotMatch(resetBlock,/resetPasswordForEmail/,'team administration must not depend on recovery email');\nassert.match(team,/>Definir nova senha<\\/button>/,'team action must be labeled as direct password definition');"
if access.count(old_reset)!=1:
    raise SystemExit(f'access reset block expected once, got {access.count(old_reset)}')
access=access.replace(old_reset,new_reset,1)
ACCESS_TEST.write_text(access,encoding='utf-8')

TEST.write_text(r"""'use strict';
const fs=require('fs');
const assert=require('assert');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const team=fs.readFileSync('team_management_core-1.0.0.js','utf8');
const index=fs.readFileSync('index.html','utf8');

const functions=[
  'perfilPorConselho','normalizarNivelAcessoEquipe','conselhoFuncionarioEquipe',
  'normalizarIdentificador','somenteDigitosEquipe','formatarRegistroProfissional',
  'atualizarAjudaNivelAcesso','sugerirNivelAcessoPorRegistro','alternarCampoRegistroProfissional',
  'verificarDuplicidadeFuncionario','funcionarioPodeAparecerNaAgenda','limparFormularioEquipe',
  'abrirEdicaoFuncionario','cadastrarNovoFuncionario','carregarListaEquipe','reativarFuncionario',
  'enviarRedefinicaoAcessoFuncionario','excluirFuncionario'
];
for(const fn of functions){
  const re=new RegExp(`(?:async\\s+)?function\\s+${fn}\\(`);
  assert.match(team,re,`${fn} deve existir no módulo de equipe`);
  assert.doesNotMatch(core,re,`${fn} não pode permanecer duplicada no monólito`);
}
assert.doesNotMatch(core,/4\. GESTÃO DE EQUIPE/,'bloco de Gestão de Equipe não deve permanecer no monólito');
assert.match(core,/const CAMPOS_PUBLICOS_PERFIL\s*=\s*\[/,'projeção pública de perfil permanece no core de autenticação');
assert.match(core,/function usuarioEhMaster\(/,'autorização MASTER permanece no core de sessão');
assert.match(core,/function rotuloPerfil\(/,'rótulos de perfil compartilhados permanecem no core');

assert.match(team,/if \(!usuarioEhMaster\(\)\) \{ alert\('Apenas Administrador pode cadastrar ou editar a equipe\.'/,'cadastro de equipe deve permanecer MASTER-only');
assert.match(team,/_supabase\.functions\.invoke\('cadastrar-equipe'/,'criação de conta deve continuar delegada à Edge Function');
assert.match(team,/solicitante_perfil_id:\s*usuarioLogado\?\.id/,'criação deve continuar vinculando o perfil solicitante');
assert.match(team,/if \(editId && usuarioLogado && String\(usuarioLogado\.id \|\| ''\) === String\(editId\)\)/,'autoproteção do administrador em edição deve permanecer');
assert.match(team,/KineSysAccessAdmin\?\.open\(id\)/,'redefinição de senha deve continuar delegada ao controlador seguro');
assert.match(team,/String\(usuarioLogado\?\.id \|\| ''\) === String\(id\)/,'exclusão deve continuar bloqueando o próprio perfil conectado');
assert.match(team,/from\('agendamentos'\)\.select\('id'\)\.eq\('profissional_id', id\)/,'remoção deve continuar verificando histórico de agendamentos');
assert.match(team,/update\(\{ ativo: false, aparece_na_agenda: false \}\)/,'perfil com histórico deve continuar sendo desativado, não apagado');
assert.match(team,/from\('equipe'\)\.delete\(\)/,'perfil sem histórico deve manter caminho de exclusão existente');
assert.doesNotMatch(team,/service_role|SUPABASE_SERVICE_ROLE_KEY/i,'módulo frontend não pode conter segredo administrativo');

const teamTag='team_management_core-1.0.0.js?v=20260911-phase4o-r1';
const teamPos=index.indexOf(teamTag);
const corePos=index.indexOf('script-1.18.0.js');
assert.ok(teamPos>=0,'index deve carregar o módulo de Gestão de Equipe');
assert.ok(teamPos<corePos,'helpers de equipe devem carregar antes do core consumidor');
assert.match(index,/core_mod=20260911-phase4o-r1/,'cache-buster do core deve acompanhar a Phase 4O');

const size=fs.statSync('team_management_core-1.0.0.js').size;
const coreSize=fs.statSync('script-1.18.0.js').size;
assert.ok(size>12000,`módulo de equipe parece pequeno demais: ${size}`);
assert.ok(coreSize<695645,`monólito deve reduzir em relação à 4N; atual=${coreSize}`);
console.log(`Team management modularization: OK | module=${size} bytes | monolith=${coreSize} bytes`);
""",encoding='utf-8')

print('Phase 4O transform prepared')
