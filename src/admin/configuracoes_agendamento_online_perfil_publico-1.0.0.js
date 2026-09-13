/* KineSys — Agendamento online V2 — identidade pública e perfil por profissional */
(() => {
    'use strict';

    const VERSION = '1.0.0';
    const ASSET_REVISION = '20260913-online-v4';
    const STYLE_PATH = 'styles/configuracoes_agendamento_online_perfil_publico-1.0.0.css';

    const state = {
        mounted: false,
        loading: false,
        saving: false,
        clinicaId: '',
        clinica: null,
        config: null,
        profissionais: [],
        procedimentos: [],
        perfis: new Map(),
        profissionalId: ''
    };

    const $ = (id) => document.getElementById(id);
    const sb = () => (typeof _supabase !== 'undefined' && _supabase) ? _supabase : window._supabase;

    function ehAdministrador() {
        if (typeof usuarioEhMaster === 'function') return !!usuarioEhMaster();
        const tipo = String(window.usuarioLogado?.tipo || '').toUpperCase();
        return tipo === 'MASTER' || tipo === 'MASTER_FEM';
    }

    function garantirCSS() {
        if (document.querySelector(`link[href^="${STYLE_PATH}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${STYLE_PATH}?v=${ASSET_REVISION}`;
        document.head.appendChild(link);
    }

    function slugificar(valor = '') {
        return String(valor || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
    }

    function linkPublico(slug) {
        const origem = /^https?:$/i.test(location.protocol) ? location.origin : 'https://app.fisiofixfisioterapia.com';
        return `${origem}/agendamento/?clinica=${encodeURIComponent(slug || '')}`;
    }

    function feedback(mensagem = '', tipo = '') {
        const el = $('ks_online_v2_feedback');
        if (!el) return;
        el.textContent = mensagem;
        el.dataset.tipo = tipo;
        el.hidden = !mensagem;
    }

    function setSaving(valor) {
        state.saving = !!valor;
        const btn = $('ks_online_v2_salvar');
        if (btn) {
            btn.disabled = state.saving;
            btn.textContent = state.saving ? 'Salvando…' : 'Salvar dados públicos';
        }
    }

    function markupIdentidade() {
        return `
            <section class="ks-online-section" id="ks_online_sec_identidade_publica">
                <div class="ks-online-section-head ks-online-section-head-simple">
                    <div>
                        <h3>Link e comunicação com o paciente</h3>
                        <p>Defina o endereço público da agenda e a mensagem exibida imediatamente após a confirmação.</p>
                    </div>
                </div>

                <div class="ks-online-v2-link-grid">
                    <label class="ks-online-field ks-online-v2-span-4">
                        <span>Nome no link</span>
                        <input id="ks_online_v2_slug" type="text" maxlength="80" autocomplete="off" placeholder="nome-da-clinica">
                        <small class="ks-online-v2-help">Use letras minúsculas, números e hífen. O link é exclusivo por clínica.</small>
                    </label>
                    <div class="ks-online-v2-linkbox ks-online-v2-span-8">
                        <label class="ks-online-field">
                            <span>Link público para enviar aos pacientes</span>
                            <input id="ks_online_v2_link" type="text" readonly aria-readonly="true">
                        </label>
                        <button type="button" class="btn-secondary ks-online-v2-copy" id="ks_online_v2_copiar">Copiar link</button>
                    </div>
                    <label class="ks-online-field ks-online-v2-span-8">
                        <span>Endereço exibido ao paciente</span>
                        <input id="ks_online_v2_endereco" type="text" maxlength="500" autocomplete="street-address" placeholder="Rua, número, bairro, cidade">
                    </label>
                    <label class="ks-online-field ks-online-v2-span-4">
                        <span>Telefone público</span>
                        <input id="ks_online_v2_telefone" type="text" maxlength="80" autocomplete="tel" placeholder="(38) 0000-0000">
                    </label>
                    <label class="ks-online-field ks-online-v2-span-12">
                        <span>Mensagem após confirmar o agendamento</span>
                        <textarea id="ks_online_v2_mensagem_confirmacao" rows="5" maxlength="2000"></textarea>
                        <small class="ks-online-v2-help">Esta mensagem aparece depois de “Seu atendimento foi agendado!”. Inclua orientações como confirmação no dia anterior, roupa confortável, exames e outras informações úteis.</small>
                    </label>
                </div>
            </section>`;
    }

    function markupPerfil() {
        return `
            <section class="ks-online-section" id="ks_online_sec_profissional_publico">
                <div class="ks-online-v2-workspace-head">
                    <div>
                        <h3>Configurar profissional</h3>
                        <p>Escolha primeiro o profissional. O perfil público, os procedimentos compatíveis e os horários abaixo passam a se referir a ele.</p>
                    </div>
                    <div id="ks_online_v2_selector_slot" class="ks-online-v2-selector-slot"></div>
                </div>

                <div class="ks-online-v2-profile-editor" id="ks_online_v2_profile_editor">
                    <div class="ks-online-v2-profile-grid">
                        <label class="ks-online-field ks-online-v2-span-6">
                            <span>Título ou especialidade pública</span>
                            <input id="ks_online_v2_titulo_prof" type="text" maxlength="120" placeholder="Ex.: Fisioterapeuta · Osteopatia">
                        </label>
                        <label class="ks-online-field ks-online-v2-span-6">
                            <span>Foto do profissional</span>
                            <input id="ks_online_v2_foto_url" type="url" maxlength="600" placeholder="https://...">
                        </label>
                        <label class="ks-online-field ks-online-v2-span-12">
                            <span>Apresentação</span>
                            <textarea id="ks_online_v2_apresentacao" rows="4" maxlength="1200" placeholder="Texto curto de apresentação para o paciente."></textarea>
                        </label>
                        <label class="ks-online-field ks-online-v2-span-6">
                            <span>Formação</span>
                            <textarea id="ks_online_v2_formacao" rows="3" maxlength="1600" placeholder="Uma formação por linha."></textarea>
                        </label>
                        <label class="ks-online-field ks-online-v2-span-6">
                            <span>Local de atendimento</span>
                            <textarea id="ks_online_v2_local" rows="3" maxlength="500" placeholder="Se vazio, será usado o endereço público da clínica."></textarea>
                        </label>
                        <label class="ks-switch-row ks-online-v2-span-6" for="ks_online_v2_atende_convenios">
                            <span>
                                <strong>Atende convênios</strong>
                                <small>Desative para exibir apenas “Atendimento particular”.</small>
                            </span>
                            <span class="ks-switch-control"><input type="checkbox" id="ks_online_v2_atende_convenios"><span aria-hidden="true"></span></span>
                        </label>
                        <div class="ks-online-v2-convenios ks-online-v2-span-6" id="ks_online_v2_convenios_area" hidden>
                            <label class="ks-online-field">
                                <span>Convênios atendidos</span>
                                <input id="ks_online_v2_convenios" type="text" maxlength="1200" placeholder="Unimed, Hapvida, SulAmérica">
                                <small class="ks-online-v2-help">Separe os nomes por vírgula.</small>
                            </label>
                        </div>
                    </div>

                    <div class="ks-online-v2-actions">
                        <span id="ks_online_v2_feedback" class="ks-online-v2-feedback" role="status" aria-live="polite" hidden></span>
                        <button type="button" class="btn-primary ks-online-v2-save" id="ks_online_v2_salvar">Salvar dados públicos</button>
                    </div>
                </div>
            </section>`;
    }

    function montar() {
        if (state.mounted || !ehAdministrador()) return false;
        const surface = document.querySelector('#ks_config_panel_online .ks-online-surface');
        const publicacao = $('ks_online_sec_publicacao');
        const profissionais = $('ks_online_sec_profissionais');
        const procedimentos = $('ks_online_sec_procedimentos');
        const horarios = $('ks_online_sec_horarios');
        if (!surface || !publicacao || !profissionais || !procedimentos || !horarios) return false;

        garantirCSS();
        publicacao.insertAdjacentHTML('afterend', markupIdentidade());
        profissionais.insertAdjacentHTML('afterend', markupPerfil());

        const slot = $('ks_online_v2_selector_slot');
        const seletorAtual = horarios.querySelector('.ks-online-profissional-select');
        if (slot && seletorAtual) slot.appendChild(seletorAtual);

        procedimentos.querySelector('.ks-online-section-head p').textContent = 'Mostramos os procedimentos compatíveis com o profissional selecionado.';
        const contexto = document.createElement('p');
        contexto.className = 'ks-online-v2-procedure-context';
        contexto.id = 'ks_online_v2_procedure_context';
        contexto.textContent = 'Selecione um profissional acima para revisar os procedimentos.';
        procedimentos.querySelector('.ks-online-section-head')?.after(contexto);

        surface.insertBefore(procedimentos, horarios);
        surface.insertBefore(horarios, procedimentos.nextSibling);

        ligarEventos();
        state.mounted = true;
        carregar();
        return true;
    }

    function ligarEventos() {
        $('ks_online_v2_slug')?.addEventListener('input', () => {
            const el = $('ks_online_v2_slug');
            const cursor = el.selectionStart;
            el.value = slugificar(el.value);
            try { el.setSelectionRange(cursor, cursor); } catch (_) {}
            atualizarLink();
        });
        $('ks_online_v2_copiar')?.addEventListener('click', copiarLink);
        $('ks_online_v2_salvar')?.addEventListener('click', salvar);
        $('ks_online_v2_atende_convenios')?.addEventListener('change', atualizarConvenios);

        const select = $('ks_online_profissional_horarios');
        select?.addEventListener('change', () => {
            state.profissionalId = String(select.value || '');
            preencherPerfil();
            filtrarProcedimentos();
        });

        if (select) {
            const observer = new MutationObserver(() => {
                if (!select.value && select.options.length) select.value = select.options[0].value;
                if (!state.profissionalId || ![...select.options].some(o => o.value === state.profissionalId)) {
                    state.profissionalId = String(select.value || '');
                }
                preencherPerfil();
                filtrarProcedimentos();
            });
            observer.observe(select, { childList: true, subtree: true });
        }

        const procList = $('ks_online_procedimentos');
        if (procList) {
            new MutationObserver(filtrarProcedimentos).observe(procList, { childList: true, subtree: true });
        }
    }

    async function resolverClinicaId() {
        const local = String(window.usuarioLogado?.clinica_id || '').trim();
        if (local) return local;
        const client = sb();
        const { data, error } = await client.rpc('kinesys_current_clinica_id');
        if (error) throw error;
        return String(data || '').trim();
    }

    async function carregar() {
        if (state.loading || !state.mounted) return;
        const client = sb();
        if (!client) return;
        state.loading = true;
        feedback('Carregando dados públicos…', '');
        try {
            state.clinicaId = await resolverClinicaId();
            const [clinicaRes, configRes, profRes, perfisRes, procRes] = await Promise.all([
                client.from('clinicas').select('id,nome,slug').eq('id', state.clinicaId).maybeSingle(),
                client.from('configuracoes_agendamento_online')
                    .select('slug_publico,endereco_publico,telefone_publico,mensagem_confirmacao')
                    .eq('clinica_id', state.clinicaId).maybeSingle(),
                client.from('equipe')
                    .select('id,nome,tipo,ativo,aparece_na_agenda')
                    .eq('clinica_id', state.clinicaId).eq('ativo', true).eq('aparece_na_agenda', true).order('nome'),
                client.from('agendamento_online_profissionais_config')
                    .select('profissional_id,titulo_publico,apresentacao,formacao,foto_url,atende_convenios,convenios,local_atendimento')
                    .eq('clinica_id', state.clinicaId),
                client.from('procedimentos')
                    .select('id,nome,profissionais_ids')
                    .eq('clinica_id', state.clinicaId).eq('ativo', true)
            ]);
            for (const resposta of [clinicaRes, configRes, profRes, perfisRes, procRes]) if (resposta.error) throw resposta.error;

            state.clinica = clinicaRes.data || null;
            state.config = configRes.data || {};
            state.profissionais = profRes.data || [];
            state.procedimentos = procRes.data || [];
            state.perfis = new Map((perfisRes.data || []).map(p => [String(p.profissional_id), p]));

            preencherIdentidade();
            const select = $('ks_online_profissional_horarios');
            state.profissionalId = String(select?.value || state.profissionais[0]?.id || '');
            preencherPerfil();
            filtrarProcedimentos();
            feedback('', '');
        } catch (error) {
            console.error('KineSys: falha ao carregar perfil público do agendamento online', error);
            feedback(`Não foi possível carregar os dados públicos: ${error?.message || error}`, 'erro');
        } finally {
            state.loading = false;
        }
    }

    function preencherIdentidade() {
        const sugerido = state.config?.slug_publico || slugificar(state.clinica?.nome || '') || state.clinica?.slug || '';
        if ($('ks_online_v2_slug')) $('ks_online_v2_slug').value = sugerido;
        if ($('ks_online_v2_endereco')) $('ks_online_v2_endereco').value = state.config?.endereco_publico || '';
        if ($('ks_online_v2_telefone')) $('ks_online_v2_telefone').value = state.config?.telefone_publico || '';
        if ($('ks_online_v2_mensagem_confirmacao')) $('ks_online_v2_mensagem_confirmacao').value = state.config?.mensagem_confirmacao || '';
        atualizarLink();
    }

    function atualizarLink() {
        const slug = slugificar($('ks_online_v2_slug')?.value || '');
        const input = $('ks_online_v2_link');
        if (input) input.value = slug ? linkPublico(slug) : '';
    }

    function perfilAtual() {
        return state.perfis.get(String(state.profissionalId)) || {};
    }

    function preencherPerfil() {
        const perfil = perfilAtual();
        const profissional = state.profissionais.find(p => String(p.id) === String(state.profissionalId));
        const set = (id, valor) => { const el = $(id); if (el) el.value = String(valor ?? ''); };
        set('ks_online_v2_titulo_prof', perfil.titulo_publico || String(profissional?.tipo || '').replaceAll('_', ' '));
        set('ks_online_v2_foto_url', perfil.foto_url || '');
        set('ks_online_v2_apresentacao', perfil.apresentacao || '');
        set('ks_online_v2_formacao', perfil.formacao || '');
        set('ks_online_v2_local', perfil.local_atendimento || '');
        const atende = $('ks_online_v2_atende_convenios');
        if (atende) atende.checked = !!perfil.atende_convenios;
        set('ks_online_v2_convenios', Array.isArray(perfil.convenios) ? perfil.convenios.join(', ') : '');
        atualizarConvenios();
    }

    function atualizarConvenios() {
        const area = $('ks_online_v2_convenios_area');
        if (area) area.hidden = !$('ks_online_v2_atende_convenios')?.checked;
    }

    function filtrarProcedimentos() {
        const id = String($('ks_online_profissional_horarios')?.value || state.profissionalId || '');
        if (!id) return;
        state.profissionalId = id;
        const nome = state.profissionais.find(p => String(p.id) === id)?.nome || 'profissional selecionado';
        const contexto = $('ks_online_v2_procedure_context');
        if (contexto) contexto.textContent = `Procedimentos compatíveis com ${nome}.`;

        document.querySelectorAll('#ks_online_procedimentos [data-procedimento-online]').forEach(input => {
            const item = state.procedimentos.find(p => String(p.id) === String(input.dataset.procedimentoOnline));
            const vinculados = Array.isArray(item?.profissionais_ids) ? item.profissionais_ids.map(String) : [];
            const compativel = !vinculados.length || vinculados.includes(id);
            const linha = input.closest('.ks-online-choice');
            if (linha) linha.hidden = !compativel;
        });
    }

    async function copiarLink() {
        const valor = $('ks_online_v2_link')?.value || '';
        if (!valor) return;
        try {
            await navigator.clipboard.writeText(valor);
            feedback('Link copiado para a área de transferência.', 'sucesso');
        } catch (_) {
            const input = $('ks_online_v2_link');
            input?.select?.();
            document.execCommand?.('copy');
            feedback('Link copiado para a área de transferência.', 'sucesso');
        }
    }

    function conveniosDoFormulario() {
        if (!$('ks_online_v2_atende_convenios')?.checked) return [];
        return String($('ks_online_v2_convenios')?.value || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean)
            .slice(0, 30);
    }

    async function salvar() {
        if (state.saving || !state.clinicaId) return;
        const client = sb();
        if (!client) return;

        const slug = slugificar($('ks_online_v2_slug')?.value || '');
        if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) {
            feedback('Informe um nome válido para o link público.', 'erro');
            $('ks_online_v2_slug')?.focus();
            return;
        }
        const fotoUrl = String($('ks_online_v2_foto_url')?.value || '').trim();
        if (fotoUrl && !/^https:\/\//i.test(fotoUrl)) {
            feedback('A foto pública deve usar um endereço https://.', 'erro');
            $('ks_online_v2_foto_url')?.focus();
            return;
        }
        const mensagem = String($('ks_online_v2_mensagem_confirmacao')?.value || '').trim();
        if (!mensagem) {
            feedback('Informe a mensagem exibida após o agendamento.', 'erro');
            $('ks_online_v2_mensagem_confirmacao')?.focus();
            return;
        }

        setSaving(true);
        feedback('Salvando dados públicos…', '');
        try {
            const { error: cfgError } = await client.from('configuracoes_agendamento_online')
                .update({
                    slug_publico: slug,
                    endereco_publico: String($('ks_online_v2_endereco')?.value || '').trim(),
                    telefone_publico: String($('ks_online_v2_telefone')?.value || '').trim(),
                    mensagem_confirmacao: mensagem,
                    atualizado_em: new Date().toISOString()
                })
                .eq('clinica_id', state.clinicaId);
            if (cfgError) throw cfgError;

            if (state.profissionalId) {
                const perfil = {
                    clinica_id: state.clinicaId,
                    profissional_id: state.profissionalId,
                    titulo_publico: String($('ks_online_v2_titulo_prof')?.value || '').trim(),
                    apresentacao: String($('ks_online_v2_apresentacao')?.value || '').trim(),
                    formacao: String($('ks_online_v2_formacao')?.value || '').trim(),
                    foto_url: fotoUrl,
                    atende_convenios: !!$('ks_online_v2_atende_convenios')?.checked,
                    convenios: conveniosDoFormulario(),
                    local_atendimento: String($('ks_online_v2_local')?.value || '').trim(),
                    atualizado_em: new Date().toISOString()
                };
                const { error: perfilError } = await client.from('agendamento_online_profissionais_config')
                    .upsert(perfil, { onConflict: 'clinica_id,profissional_id' });
                if (perfilError) throw perfilError;
                state.perfis.set(String(state.profissionalId), { ...perfil });
            }

            state.config = {
                ...(state.config || {}),
                slug_publico: slug,
                endereco_publico: String($('ks_online_v2_endereco')?.value || '').trim(),
                telefone_publico: String($('ks_online_v2_telefone')?.value || '').trim(),
                mensagem_confirmacao: mensagem
            };
            atualizarLink();
            feedback('Dados públicos salvos.', 'sucesso');
            if (typeof window.mostrarToastKineSys === 'function') {
                window.mostrarToastKineSys('Perfil público do agendamento salvo.', 'sucesso', 3500);
            }
        } catch (error) {
            console.error('KineSys: falha ao salvar perfil público do agendamento online', error);
            const msg = /duplicate|unique/i.test(String(error?.message || ''))
                ? 'Esse nome de link já está em uso por outra clínica.'
                : `Não foi possível salvar: ${error?.message || error}`;
            feedback(msg, 'erro');
        } finally {
            setSaving(false);
        }
    }

    function inicializar() {
        if (!ehAdministrador()) return;
        if (montar()) return;
        const observer = new MutationObserver(() => {
            if (montar()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializar, { once: true });
    else inicializar();

    window.KineSysConfiguracoesAgendaOnlinePerfilPublico = Object.freeze({
        version: VERSION,
        refresh: carregar
    });
})();
