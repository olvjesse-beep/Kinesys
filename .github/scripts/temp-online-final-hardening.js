const fs = require('fs');
const { execFileSync } = require('child_process');

function read(path) {
  return fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function replaceExact(content, oldText, newText, label) {
  if (!content.includes(oldText)) throw new Error(`${label}: trecho esperado não encontrado`);
  return content.replace(oldText, newText);
}

const adminPath = 'src/admin/configuracoes_agendamento_online-1.0.0.js';
let admin = read(adminPath);

admin = replaceExact(admin,
`    const ASSET_REVISION = '20260912-r1';`,
`    const ASSET_REVISION = '20260913-online-r2';`,
'cache do CSS administrativo');

admin = replaceExact(admin,
`        document.getElementById('ks_online_profissional_horarios')?.addEventListener('change', evento => {
            capturarHorariosProfissionalAtual();
            state.profissionalSelecionado = String(evento.target.value || '');
            renderizarHorariosProfissional();
        });`,
`        document.getElementById('ks_online_profissional_horarios')?.addEventListener('change', evento => {
            const anterior = state.profissionalSelecionado;
            if (!capturarHorariosProfissionalAtual()) {
                evento.target.value = anterior;
                return;
            }
            state.profissionalSelecionado = String(evento.target.value || '');
            renderizarHorariosProfissional();
        });`,
'proteção na troca de profissional');

admin = replaceExact(admin,
`            const remover = evento.target.closest('[data-remover-intervalo]');
            if (remover) {
                remover.closest('.ks-online-time-row')?.remove();
                marcarSujo();
                atualizarEstadoDia(remover.closest('[data-dia-card]'));
            }`,
`            const remover = evento.target.closest('[data-remover-intervalo]');
            if (remover) {
                const card = remover.closest('[data-dia-card]');
                remover.closest('.ks-online-time-row')?.remove();
                capturarHorariosProfissionalAtual();
                marcarSujo();
                atualizarEstadoDia(card);
            }`,
'sincronização ao remover período');

admin = replaceExact(admin,
`        document.getElementById('ks_online_horarios')?.addEventListener('change', marcarSujo);`,
`        document.getElementById('ks_online_horarios')?.addEventListener('change', () => { capturarHorariosProfissionalAtual(); marcarSujo(); });`,
'sincronização ao editar período');

admin = replaceExact(admin,
`        lista.appendChild(wrapper.firstElementChild);
        atualizarEstadoDia(card);
        marcarSujo();`,
`        lista.appendChild(wrapper.firstElementChild);
        capturarHorariosProfissionalAtual();
        atualizarEstadoDia(card);
        marcarSujo();`,
'sincronização ao adicionar período');

admin = replaceExact(admin,
`    function atualizarResumoPublicacao() {`,
`    function estadoPublicacaoAtual() {
        const profissionais = state.profissionais.filter(p => p.agendamento_online_ativo);
        const profissionaisIds = new Set(profissionais.map(p => String(p.id)));
        const horarios = state.disponibilidadeEditada.filter(x => profissionaisIds.has(String(x.profissional_id)));
        const profissionaisComHorarios = new Set(horarios.map(x => String(x.profissional_id)));
        const procedimentos = state.procedimentos.filter(p => p.agendamento_online_ativo);
        const procedimentoIncompativel = procedimentos.find(p => {
            const vinculados = Array.isArray(p.profissionais_ids) ? p.profissionais_ids.map(String) : [];
            if (!vinculados.length) return profissionaisComHorarios.size === 0;
            return !vinculados.some(id => profissionaisComHorarios.has(id));
        }) || null;
        return { profissionais, profissionaisIds, profissionaisComHorarios, procedimentos, procedimentoIncompativel, horarios };
    }

    function atualizarResumoPublicacao() {`,
'helper de consistência da publicação');

admin = replaceExact(admin,
`        const profCount = state.profissionais.filter(p => p.agendamento_online_ativo).length;
        const procCount = state.procedimentos.filter(p => p.agendamento_online_ativo).length;
        const horarios = state.disponibilidadeEditada.length;
        const completo = profCount > 0 && procCount > 0 && horarios > 0;`,
`        const publicacao = estadoPublicacaoAtual();
        const profCount = publicacao.profissionais.length;
        const procCount = publicacao.procedimentos.length;
        const horarios = publicacao.horarios.length;
        const completo = profCount > 0 && procCount > 0 && horarios > 0 && !publicacao.procedimentoIncompativel;`,
'resumo de publicação compatível');

admin = replaceExact(admin,
`        if (!state.profissionais.some(p => p.agendamento_online_ativo)) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um profissional.', id: 'ks_online_sec_profissionais' };
        if (!state.procedimentos.some(p => p.agendamento_online_ativo)) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um procedimento.', id: 'ks_online_sec_procedimentos' };
        if (!state.disponibilidadeEditada.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um período de atendimento.', id: 'ks_online_sec_horarios' };`,
`        const publicacao = estadoPublicacaoAtual();
        if (!publicacao.profissionais.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um profissional.', id: 'ks_online_sec_profissionais' };
        if (!publicacao.procedimentos.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um procedimento.', id: 'ks_online_sec_procedimentos' };
        if (publicacao.procedimentoIncompativel) return { ok: false, msg: \`O procedimento “\${publicacao.procedimentoIncompativel.nome || 'selecionado'}” não possui profissional publicado com horário online compatível.\`, id: 'ks_online_sec_procedimentos' };
        if (!publicacao.horarios.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um período para um profissional publicado.', id: 'ks_online_sec_horarios' };`,
'validação de publicação compatível');

admin = replaceExact(admin,
`    async function salvarTudo() {`,
`    async function salvarConfiguracaoPortal(client, cfg) {
        const { error } = await client.from('configuracoes_agendamento_online')
            .upsert(cfg, { onConflict: 'clinica_id' });
        if (error) throw error;
    }

    async function salvarTudo() {`,
'helper de persistência da configuração');

admin = replaceExact(admin,
`        try {
            const { error: cfgError } = await client.from('configuracoes_agendamento_online')
                .upsert(cfg, { onConflict: 'clinica_id' });
            if (cfgError) throw cfgError;

            for (const p of state.profissionais) {`,
`        try {
            // Fail-safe: alterações estruturais persistem com o portal fechado.
            // A ativação volta somente depois de todas as dependências salvarem.
            await salvarConfiguracaoPortal(client, { ...cfg, ativo: false });

            for (const p of state.profissionais) {`,
'fechamento fail-safe antes de salvar');

admin = replaceExact(admin,
`            if (removerIds.length) {
                const { error } = await client.from('disponibilidade_agendamento_online')
                    .delete().in('id', removerIds).eq('clinica_id', state.clinicaId);
                if (error) throw error;
            }

            setStatus(cfg.ativo ? 'Configuração salva. O portal está preparado para aceitar agendamentos.' : 'Configuração salva. O portal continua fechado.', 'sucesso');`,
`            if (removerIds.length) {
                const { error } = await client.from('disponibilidade_agendamento_online')
                    .delete().in('id', removerIds).eq('clinica_id', state.clinicaId);
                if (error) throw error;
            }

            if (cfg.ativo) await salvarConfiguracaoPortal(client, cfg);

            setStatus(cfg.ativo ? 'Configuração salva. O portal está preparado para aceitar agendamentos.' : 'Configuração salva. O portal continua fechado.', 'sucesso');`,
'reativação somente ao final');

write(adminPath, admin);

const accessPath = 'src/admin/access_admin-1.0.0.js';
let access = read(accessPath);
access = replaceExact(access,
`    const ONLINE_CONFIG_REVISION='20260912-r1';`,
`    const ONLINE_CONFIG_REVISION='20260913-online-r2';`,
'cache do módulo administrativo');
write(accessPath, access);

const cssPath = 'styles/configuracoes_agendamento_online-1.0.0.css';
let css = read(cssPath);
css = replaceExact(css,
`@media (max-width: 430px) {
    .ks-online-topline {`,
`@media (max-width: 430px) {
    .ks-online-time-row {
        grid-template-columns: 1fr;
    }

    .ks-online-topline {`,
'horários em coluna única no telefone');
write(cssPath, css);

const edgePath = 'supabase/functions/agendamento-publico/index.ts';
let edge = read(edgePath);
edge = replaceExact(edge,
`    supabase.from("disponibilidade_agendamento_online").select("profissional_id").eq("clinica_id", clinica.id).eq("ativo", true).limit(1),`,
`    supabase.from("disponibilidade_agendamento_online").select("profissional_id").eq("clinica_id", clinica.id).eq("ativo", true),`,
'consulta de disponibilidade do catálogo');

edge = replaceExact(edge,
`  const profissionais = (profRes.data || []).map((p) => ({ id: texto(p.id, 120), nome: texto(p.nome, 120), tipo: texto(p.tipo || "Profissional", 80).replaceAll("_", " ") }));
  const idsProf = new Set(profissionais.map((p) => p.id));
  const procedimentos = (procRes.data || []).map((p) => ({
    id: texto(p.id, 80), nome: texto(p.nome, 120), duracao_minutos: Math.max(5, Math.min(480, Number(p.duracao_minutos) || 30)),
    valor: config.mostrar_valores && p.valor != null ? Number(p.valor) : null,
    profissionais_ids: Array.isArray(p.profissionais_ids) ? p.profissionais_ids.map(String).filter((id: string) => idsProf.has(id)) : [],
  }));
  if (!profissionais.length || !procedimentos.length || !(dispRes.data || []).length) return fechado;`,
`  const idsComDisponibilidade = new Set((dispRes.data || []).map((d) => String(d.profissional_id || "")));
  const profissionais = (profRes.data || [])
    .filter((p) => idsComDisponibilidade.has(String(p.id)))
    .map((p) => ({ id: texto(p.id, 120), nome: texto(p.nome, 120), tipo: texto(p.tipo || "Profissional", 80).replaceAll("_", " ") }));
  const idsProf = new Set(profissionais.map((p) => p.id));
  const procedimentos = (procRes.data || []).flatMap((p) => {
    const vinculadosOriginais = Array.isArray(p.profissionais_ids) ? p.profissionais_ids.map(String) : [];
    const vinculadosPublicos = vinculadosOriginais.filter((id: string) => idsProf.has(id));
    if (vinculadosOriginais.length && !vinculadosPublicos.length) return [];
    return [{
      id: texto(p.id, 80), nome: texto(p.nome, 120), duracao_minutos: Math.max(5, Math.min(480, Number(p.duracao_minutos) || 30)),
      valor: config.mostrar_valores && p.valor != null ? Number(p.valor) : null,
      profissionais_ids: vinculadosPublicos,
    }];
  });
  if (!profissionais.length || !procedimentos.length) return fechado;`,
'filtragem consistente do catálogo público');
write(edgePath, edge);

const testPath = 'tests/agendamento_online_admin_config.contract.js';
let test = read(testPath);
test = replaceExact(test,
`assert(js.includes('não possui profissional publicado habilitado'),
  'procedimento restrito deve exigir ao menos um profissional publicado compatível');`,
`assert(js.includes('não possui profissional publicado com horário online compatível'),
  'procedimento restrito deve exigir profissional publicado com disponibilidade online');
assert(js.includes('profissionaisComHorarios'),
  'validação administrativa deve cruzar procedimento com profissional que possui período publicado');`,
'contrato de compatibilidade procedimento-horário');
write(testPath, test);

const indexPath = 'index.html';
let index = read(indexPath);
const finalTag = 'src/admin/access_admin-1.0.0.js?v=20260913-online-r2';
if (!index.includes(finalTag)) {
  const antigos = [
    'src/admin/access_admin-1.0.0.js?v=20260911-access-r1',
    'src/admin/access_admin-1.0.0.js?v=20260912-online-config-r1',
    'src/admin/access_admin-1.0.0.js?v=20260913-online-r1'
  ];
  const antigo = antigos.find((tag) => index.includes(tag));
  if (!antigo) throw new Error('cache do bootstrap administrativo: tag esperada não encontrada');
  index = index.replace(antigo, finalTag);
  write(indexPath, index);
}

// O workflow já adiciona os arquivos centrais; estes extras precisam
// permanecer no mesmo commit atômico de hardening.
execFileSync('git', ['add', accessPath, cssPath, testPath], { stdio: 'inherit' });

console.log('temp-online-final-hardening: OK');
