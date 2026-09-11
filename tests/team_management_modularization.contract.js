'use strict';
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
assert.match(team,/window\.KineSysAccessAdmin\?\.open/,'redefinição de senha deve preservar o guard de disponibilidade do controlador seguro');
assert.match(team,/return window\.KineSysAccessAdmin\.open\(id\);/,'redefinição de senha deve continuar delegada ao controlador seguro');
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
assert.match(index,/core_mod=20260911-phase4p-r1/,'cache-buster do core deve acompanhar a Phase 4O');

const size=fs.statSync('team_management_core-1.0.0.js').size;
const coreSize=fs.statSync('script-1.18.0.js').size;
assert.ok(size>12000,`módulo de equipe parece pequeno demais: ${size}`);
assert.ok(coreSize<695645,`monólito deve reduzir em relação à 4N; atual=${coreSize}`);
console.log(`Team management modularization: OK | module=${size} bytes | monolith=${coreSize} bytes`);
