/* KineSys — Configurações administrativas do agendamento online v1.0.0 */
(() => {
    'use strict';

    const VERSION = '1.0.0';
    const ASSET_REVISION = '20260912-r1';
    const STYLE_PATH = 'styles/configuracoes_agendamento_online-1.0.0.css';
    const DIAS = Object.freeze([
        { valor: 1, nome: 'Segunda-feira' },
        { valor: 2, nome: 'Terça-feira' },
        { valor: 3, nome: 'Quarta-feira' },
        { valor: 4, nome: 'Quinta-feira' },
        { valor: 5, nome: 'Sexta-feira' },
        { valor: 6, nome: 'Sábado' },
        { valor: 0, nome: 'Domingo' }
    ]);

    const state = {
        montado: false,
        carregado: false,
        carregando: false,
        salvando: false,
        sujo: false,
        clinicaId: '',
        config: null,
        profissionais: [],
        procedimentos: [],
        disponibilidadeOriginal: [],
        disponibilidadeEditada: [],
        profissionalSelecionado: ''
    };

    function sb() {
        return (typeof _supabase !== 'undefined' && _supabase) ? _supabase : window._supabase;
    }

    function ehAdministrador() {
        if (typeof usuarioEhMaster === 'function') return usuarioEhMaster();
        const tipo = String(window.usuarioLogado?.tipo || '').toUpperCase();
        return tipo === 'MASTER' || tipo === 'MASTER_FEM';
    }

    function escapeHTML(valor = '') {
        if (typeof window.escapeHTML === 'function') return window.escapeHTML(String(valor ?? ''));
        return String(valor ?? '').replace(/[&<>'"]/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[c]));
    }

    function garantirCSS() {
        if (document.querySelector(`link[href^="${STYLE_PATH}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${STYLE_PATH}?v=${ASSET_REVISION}`;
        document.head.appendChild(link);
    }

    function setStatus(mensagem, tipo = 'neutro') {
        const el = document.getElementById('ks_online_status_feedback');
        if (!el) return;
        el.textContent = mensagem || '';
        el.className = `ks-online-feedback ${tipo}`;
        el.hidden = !mensagem;
    }

    function marcarSujo() {
        state.sujo = true;
        const indicador = document.getElementById('ks_online_unsaved');
        if (indicador) indicador.hidden = false;
        const btn = document.getElementById('ks_online_salvar');
        if (btn) btn.disabled = false;
        atualizarResumoPublicacao();
    }

    function marcarLimpo() {
        state.sujo = false;
        const indicador = document.getElementById('ks_online_unsaved');
        if (indicador) indicador.hidden = true;
    }

    function obterClinicaIdLocal() {
        return String(window.usuarioLogado?.clinica_id || '').trim();
    }

    async function resolverClinicaId() {
        const local = obterClinicaIdLocal();
        if (local) return local;
        const client = sb();
        if (!client) throw new Error('Supabase indisponível.');
        const { data, error } = await client.rpc('kinesys_current_clinica_id');
        if (error) throw error;
        const id = String(data || '').trim();
        if (!id) throw new Error('Não foi possível identificar a clínica ativa.');
        return id;
    }

    function configPadrao() {
        return {
            ativo: false,
            antecedencia_minima_minutos: 120,
            horizonte_dias: 30,
            titulo_publico: 'Agende seu atendimento',
            descricao_publica: 'Escolha o atendimento, o profissional e um horário disponível.',
            mensagem_fechado: 'O agendamento online está temporariamente indisponível. Entre em contato com a clínica para agendar.',
            mostrar_valores: false
        };
    }

    function montarHub() {
        if (state.montado) return true;
        const tela = document.getElementById('tela_configuracoes');
        if (!tela || !ehAdministrador()) return false;

        garantirCSS();

        const existentes = Array.from(tela.children);
        const header = document.createElement('div');
        header.className = 'ks-config-hub-header';
        header.innerHTML = `
            <div>
                <h1>Configurações</h1>
                <p>Defina regras administrativas da clínica sem alterar a operação diária da Agenda.</p>
            </div>`;

        const tabs = document.createElement('div');
        tabs.className = 'ks-config-tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Áreas de configuração');
        tabs.innerHTML = `
            <button type="button" id="ks_config_tab_online" role="tab" aria-selected="true" aria-controls="ks_config_panel_online" data-config-tab="online">Agendamento online</button>
            <button type="button" id="ks_config_tab_mensagens" role="tab" aria-selected="false" aria-controls="ks_config_panel_mensagens" data-config-tab="mensagens">Mensagens padrão</button>`;

        const online = document.createElement('div');
        online.id = 'ks_config_panel_online';
        online.className = 'ks-config-panel';
        online.setAttribute('role', 'tabpanel');
        online.setAttribute('aria-labelledby', 'ks_config_tab_online');
        online.innerHTML = markupAgendamentoOnline();

        const mensagens = document.createElement('div');
        mensagens.id = 'ks_config_panel_mensagens';
        mensagens.className = 'ks-config-panel';
        mensagens.setAttribute('role', 'tabpanel');
        mensagens.setAttribute('aria-labelledby', 'ks_config_tab_mensagens');
        mensagens.hidden = true;
        existentes.forEach(el => mensagens.appendChild(el));

        tela.append(header, tabs, online, mensagens);
        tela.classList.add('ks-config-hub-ready');
        tabs.addEventListener('click', evento => {
            const btn = evento.target.closest('[data-config-tab]');
            if (!btn) return;
            abrirAba(btn.dataset.configTab);
        });

        ligarEventosOnline();
        state.montado = true;
        return true;
    }

    function markupAgendamentoOnline() {
        return `
            <div class="ks-online-shell">
                <div class="ks-online-topline">
                    <div>
                        <h2>Agendamento online</h2>
                        <p>Controle exatamente o que o paciente poderá ver e reservar pela internet.</p>
                    </div>
                    <span id="ks_online_badge" class="ks-online-badge fechado">Fechado</span>
                </div>

                <div id="ks_online_status_feedback" class="ks-online-feedback neutro" role="status" aria-live="polite" hidden></div>

                <div class="ks-online-surface">
                    <section class="ks-online-section" id="ks_online_sec_publicacao">
                        <div class="ks-online-section-head">
                            <div>
                                <h3>Publicação</h3>
                                <p>A clínica pode deixar o portal configurado e mantê-lo fechado até decidir publicar.</p>
                            </div>
                            <label class="ks-switch-row ks-switch-row-master" for="ks_online_ativo">
                                <span>
                                    <strong>Aceitar agendamentos online</strong>
                                    <small id="ks_online_ativo_help">Portal fechado para novos agendamentos.</small>
                                </span>
                                <span class="ks-switch-control"><input type="checkbox" id="ks_online_ativo"><span aria-hidden="true"></span></span>
                            </label>
                        </div>

                        <div class="ks-online-fields ks-online-fields-2">
                            <label class="ks-online-field">
                                <span>Título para o paciente</span>
                                <input id="ks_online_titulo" type="text" maxlength="100" autocomplete="off">
                            </label>
                            <label class="ks-online-field">
                                <span>Antecedência mínima</span>
                                <select id="ks_online_antecedencia">
                                    <option value="0">Sem antecedência mínima</option>
                                    <option value="60">1 hora</option>
                                    <option value="120">2 horas</option>
                                    <option value="240">4 horas</option>
                                    <option value="720">12 horas</option>
                                    <option value="1440">24 horas</option>
                                    <option value="2880">48 horas</option>
                                </select>
                            </label>
                            <label class="ks-online-field ks-online-field-wide">
                                <span>Texto de apresentação</span>
                                <textarea id="ks_online_descricao" rows="3" maxlength="320"></textarea>
                            </label>
                            <label class="ks-online-field">
                                <span>Agenda disponível por</span>
                                <select id="ks_online_horizonte">
                                    <option value="7">7 dias</option>
                                    <option value="14">14 dias</option>
                                    <option value="30">30 dias</option>
                                    <option value="45">45 dias</option>
                                    <option value="60">60 dias</option>
                                    <option value="90">90 dias</option>
                                </select>
                            </label>
                            <label class="ks-switch-row" for="ks_online_mostrar_valores">
                                <span>
                                    <strong>Mostrar valores</strong>
                                    <small>Exibe o valor cadastrado do procedimento quando houver.</small>
                                </span>
                                <span class="ks-switch-control"><input type="checkbox" id="ks_online_mostrar_valores"><span aria-hidden="true"></span></span>
                            </label>
                            <label class="ks-online-field ks-online-field-wide">
                                <span>Mensagem quando o portal estiver fechado</span>
                                <textarea id="ks_online_mensagem_fechado" rows="3" maxlength="320"></textarea>
                            </label>
                        </div>
                    </section>

                    <section class="ks-online-section" id="ks_online_sec_profissionais">
                        <div class="ks-online-section-head ks-online-section-head-simple">
                            <div>
                                <h3>Profissionais exibidos</h3>
                                <p>Somente profissionais já habilitados na Agenda interna podem ser publicados.</p>
                            </div>
                            <span id="ks_online_profissionais_count" class="ks-online-count">0 publicados</span>
                        </div>
                        <div id="ks_online_profissionais" class="ks-online-choice-list" aria-live="polite"></div>
                    </section>

                    <section class="ks-online-section" id="ks_online_sec_procedimentos">
                        <div class="ks-online-section-head ks-online-section-head-simple">
                            <div>
                                <h3>Procedimentos exibidos</h3>
                                <p>Escolha quais serviços o paciente poderá selecionar no portal.</p>
                            </div>
                            <span id="ks_online_procedimentos_count" class="ks-online-count">0 publicados</span>
                        </div>
                        <div id="ks_online_procedimentos" class="ks-online-choice-list" aria-live="polite"></div>
                    </section>

                    <section class="ks-online-section" id="ks_online_sec_horarios">
                        <div class="ks-online-section-head ks-online-section-head-simple">
                            <div>
                                <h3>Horários publicados</h3>
                                <p>Estes períodos nunca ampliam a jornada interna: bloqueios, feriados e horários ocupados continuam prevalecendo.</p>
                            </div>
                        </div>
                        <label class="ks-online-field ks-online-profissional-select">
                            <span>Configurar horários de</span>
                            <select id="ks_online_profissional_horarios"></select>
                        </label>
                        <div id="ks_online_horarios" class="ks-online-week"></div>
                    </section>
                </div>

                <div class="ks-online-savebar">
                    <div class="ks-online-save-meta">
                        <strong id="ks_online_save_summary">Portal fechado</strong>
                        <span id="ks_online_unsaved" hidden>Alterações não salvas</span>
                    </div>
                    <button type="button" class="btn-primary" id="ks_online_salvar">Salvar alterações</button>
                </div>
            </div>`;
    }

    function ligarEventosOnline() {
        const ids = [
            'ks_online_ativo', 'ks_online_titulo', 'ks_online_descricao', 'ks_online_antecedencia',
            'ks_online_horizonte', 'ks_online_mostrar_valores', 'ks_online_mensagem_fechado'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener(el.matches('input[type="checkbox"],select') ? 'change' : 'input', marcarSujo);
        });

        document.getElementById('ks_online_profissional_horarios')?.addEventListener('change', evento => {
            capturarHorariosProfissionalAtual();
            state.profissionalSelecionado = String(evento.target.value || '');
            renderizarHorariosProfissional();
        });

        document.getElementById('ks_online_horarios')?.addEventListener('click', evento => {
            const add = evento.target.closest('[data-add-dia]');
            if (add) {
                adicionarIntervalo(Number(add.dataset.addDia));
                return;
            }
            const remover = evento.target.closest('[data-remover-intervalo]');
            if (remover) {
                remover.closest('.ks-online-time-row')?.remove();
                marcarSujo();
                atualizarEstadoDia(remover.closest('[data-dia-card]'));
            }
        });
        document.getElementById('ks_online_horarios')?.addEventListener('change', marcarSujo);
        document.getElementById('ks_online_salvar')?.addEventListener('click', salvarTudo);
    }

    function abrirAba(nome = 'online') {
        if (!montarHub()) return;
        const online = nome !== 'mensagens';
        const painelOnline = document.getElementById('ks_config_panel_online');
        const painelMensagens = document.getElementById('ks_config_panel_mensagens');
        const tabOnline = document.getElementById('ks_config_tab_online');
        const tabMensagens = document.getElementById('ks_config_tab_mensagens');

        painelOnline.hidden = !online;
        painelMensagens.hidden = online;
        tabOnline.setAttribute('aria-selected', String(online));
        tabMensagens.setAttribute('aria-selected', String(!online));
        tabOnline.tabIndex = online ? 0 : -1;
        tabMensagens.tabIndex = online ? -1 : 0;
        try { sessionStorage.setItem('kinesys_config_tab', online ? 'online' : 'mensagens'); } catch (_) {}

        if (online) carregar(false);
        else if (typeof window.abrirConfiguracoesMensagens === 'function') window.abrirConfiguracoesMensagens();
    }

    async function onOpen() {
        if (!ehAdministrador()) return;
        if (!montarHub()) return;
        let aba = 'online';
        try { aba = sessionStorage.getItem('kinesys_config_tab') || 'online'; } catch (_) {}
        abrirAba(aba);
    }

    async function carregar(forcar = false) {
        if (!ehAdministrador() || state.carregando || (state.carregado && !forcar)) return;
        const client = sb();
        if (!client) {
            setStatus('Supabase indisponível. Recarregue a página e tente novamente.', 'erro');
            return;
        }

        state.carregando = true;
        setStatus('Carregando configuração do agendamento online…', 'neutro');
        try {
            state.clinicaId = await resolverClinicaId();
            const [cfgRes, profRes, procRes, dispRes] = await Promise.all([
                client.from('configuracoes_agendamento_online').select('*').eq('clinica_id', state.clinicaId).maybeSingle(),
                client.from('equipe')
                    .select('id,nome,tipo,ativo,aparece_na_agenda,agendamento_online_ativo,agendamento_online_ordem')
                    .eq('clinica_id', state.clinicaId).eq('ativo', true).eq('aparece_na_agenda', true)
                    .order('agendamento_online_ordem', { ascending: true }).order('nome', { ascending: true }),
                client.from('procedimentos')
                    .select('id,nome,duracao_minutos,valor,profissionais_ids,ativo,agendamento_online_ativo')
                    .eq('clinica_id', state.clinicaId).eq('ativo', true).order('nome', { ascending: true }),
                client.from('disponibilidade_agendamento_online')
                    .select('id,profissional_id,dia_semana,hora_inicio,hora_fim,ativo')
                    .eq('clinica_id', state.clinicaId).eq('ativo', true)
                    .order('profissional_id', { ascending: true }).order('dia_semana', { ascending: true }).order('hora_inicio', { ascending: true })
            ]);

            for (const resposta of [cfgRes, profRes, procRes, dispRes]) {
                if (resposta.error) throw resposta.error;
            }

            state.config = { ...configPadrao(), ...(cfgRes.data || {}) };
            state.profissionais = (profRes.data || []).map(p => ({ ...p, _onlineOriginal: !!p.agendamento_online_ativo }));
            state.procedimentos = (procRes.data || []).map(p => ({ ...p, _onlineOriginal: !!p.agendamento_online_ativo }));
            state.disponibilidadeOriginal = (dispRes.data || []).map(x => ({ ...x }));
            state.disponibilidadeEditada = (dispRes.data || []).map(x => ({ ...x }));
            state.profissionalSelecionado = state.profissionalSelecionado && state.profissionais.some(p => p.id === state.profissionalSelecionado)
                ? state.profissionalSelecionado
                : (state.profissionais[0]?.id || '');

            preencherFormulario();
            state.carregado = true;
            marcarLimpo();
            setStatus('', 'neutro');
        } catch (err) {
            console.error('KineSys: erro ao carregar configuração de agendamento online', err);
            const mensagem = /column|schema cache|does not exist|not found/i.test(String(err?.message || err))
                ? 'A estrutura administrativa do agendamento online ainda não está disponível no banco.'
                : `Não foi possível carregar a configuração: ${err?.message || err}`;
            setStatus(mensagem, 'erro');
        } finally {
            state.carregando = false;
        }
    }

    function preencherFormulario() {
        const cfg = state.config || configPadrao();
        const setValue = (id, valor) => { const el = document.getElementById(id); if (el) el.value = String(valor ?? ''); };
        const setChecked = (id, valor) => { const el = document.getElementById(id); if (el) el.checked = !!valor; };
        setChecked('ks_online_ativo', cfg.ativo);
        setValue('ks_online_titulo', cfg.titulo_publico);
        setValue('ks_online_descricao', cfg.descricao_publica);
        setValue('ks_online_antecedencia', cfg.antecedencia_minima_minutos);
        setValue('ks_online_horizonte', cfg.horizonte_dias);
        setChecked('ks_online_mostrar_valores', cfg.mostrar_valores);
        setValue('ks_online_mensagem_fechado', cfg.mensagem_fechado);
        renderizarProfissionais();
        renderizarProcedimentos();
        renderizarSeletorProfissionais();
        renderizarHorariosProfissional();
        atualizarResumoPublicacao();
    }

    function renderizarProfissionais() {
        const alvo = document.getElementById('ks_online_profissionais');
        if (!alvo) return;
        if (!state.profissionais.length) {
            alvo.innerHTML = '<p class="ks-online-empty">Nenhum profissional ativo está habilitado na Agenda interna.</p>';
            atualizarContadores();
            return;
        }
        alvo.innerHTML = state.profissionais.map(p => `
            <label class="ks-online-choice" for="ks_online_prof_${escapeHTML(p.id)}">
                <span class="ks-online-choice-copy">
                    <strong>${escapeHTML(p.nome)}</strong>
                    <small>${escapeHTML(String(p.tipo || 'Profissional').replaceAll('_', ' '))}</small>
                </span>
                <span class="ks-switch-control"><input type="checkbox" id="ks_online_prof_${escapeHTML(p.id)}" data-profissional-online="${escapeHTML(p.id)}" ${p.agendamento_online_ativo ? 'checked' : ''}><span aria-hidden="true"></span></span>
            </label>`).join('');
        alvo.querySelectorAll('[data-profissional-online]').forEach(input => input.addEventListener('change', () => {
            const item = state.profissionais.find(p => p.id === input.dataset.profissionalOnline);
            if (item) item.agendamento_online_ativo = input.checked;
            marcarSujo();
            atualizarContadores();
            atualizarResumoPublicacao();
        }));
        atualizarContadores();
    }

    function renderizarProcedimentos() {
        const alvo = document.getElementById('ks_online_procedimentos');
        if (!alvo) return;
        if (!state.procedimentos.length) {
            alvo.innerHTML = '<p class="ks-online-empty">Nenhum procedimento ativo foi encontrado.</p>';
            atualizarContadores();
            return;
        }
        alvo.innerHTML = state.procedimentos.map(p => `
            <label class="ks-online-choice" for="ks_online_proc_${escapeHTML(p.id)}">
                <span class="ks-online-choice-copy">
                    <strong>${escapeHTML(p.nome)}</strong>
                    <small>${Number(p.duracao_minutos) || 0} min${p.valor != null ? ` · R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}</small>
                </span>
                <span class="ks-switch-control"><input type="checkbox" id="ks_online_proc_${escapeHTML(p.id)}" data-procedimento-online="${escapeHTML(p.id)}" ${p.agendamento_online_ativo ? 'checked' : ''}><span aria-hidden="true"></span></span>
            </label>`).join('');
        alvo.querySelectorAll('[data-procedimento-online]').forEach(input => input.addEventListener('change', () => {
            const item = state.procedimentos.find(p => String(p.id) === input.dataset.procedimentoOnline);
            if (item) item.agendamento_online_ativo = input.checked;
            marcarSujo();
            atualizarContadores();
            atualizarResumoPublicacao();
        }));
        atualizarContadores();
    }

    function renderizarSeletorProfissionais() {
        const select = document.getElementById('ks_online_profissional_horarios');
        if (!select) return;
        if (!state.profissionais.length) {
            select.innerHTML = '<option value="">Nenhum profissional disponível</option>';
            select.disabled = true;
            return;
        }
        select.disabled = false;
        select.innerHTML = state.profissionais.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)}</option>`).join('');
        select.value = state.profissionalSelecionado || state.profissionais[0].id;
        state.profissionalSelecionado = select.value;
    }

    function horariosDoProfissional(id) {
        return state.disponibilidadeEditada.filter(x => String(x.profissional_id) === String(id));
    }

    function renderizarHorariosProfissional() {
        const alvo = document.getElementById('ks_online_horarios');
        if (!alvo) return;
        const id = state.profissionalSelecionado;
        if (!id) {
            alvo.innerHTML = '<p class="ks-online-empty">Selecione um profissional para configurar os horários.</p>';
            return;
        }
        const rows = horariosDoProfissional(id);
        alvo.innerHTML = DIAS.map(dia => {
            const intervalos = rows.filter(x => Number(x.dia_semana) === dia.valor);
            return `
                <div class="ks-online-day" data-dia-card="${dia.valor}">
                    <div class="ks-online-day-head">
                        <div>
                            <strong>${dia.nome}</strong>
                            <small>${intervalos.length ? `${intervalos.length} período${intervalos.length > 1 ? 's' : ''} publicado${intervalos.length > 1 ? 's' : ''}` : 'Não publicado'}</small>
                        </div>
                        <button type="button" class="btn-secondary ks-online-add-time" data-add-dia="${dia.valor}">Adicionar horário</button>
                    </div>
                    <div class="ks-online-time-list">
                        ${intervalos.map((x, indice) => markupIntervalo(dia.valor, x, indice)).join('')}
                    </div>
                </div>`;
        }).join('');
    }

    function markupIntervalo(dia, item = {}, indice = 0) {
        const inicio = String(item.hora_inicio || '08:00').slice(0, 5);
        const fim = String(item.hora_fim || '12:00').slice(0, 5);
        return `
            <div class="ks-online-time-row" data-time-index="${indice}">
                <label><span>Início</span><input type="time" step="300" data-hora-inicio data-dia="${dia}" value="${escapeHTML(inicio)}"></label>
                <label><span>Fim</span><input type="time" step="300" data-hora-fim data-dia="${dia}" value="${escapeHTML(fim)}"></label>
                <button type="button" class="ks-online-remove-time" data-remover-intervalo aria-label="Remover este horário">Remover</button>
            </div>`;
    }

    function adicionarIntervalo(dia) {
        const card = document.querySelector(`[data-dia-card="${dia}"]`);
        const lista = card?.querySelector('.ks-online-time-list');
        if (!lista) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = markupIntervalo(dia, {}, lista.children.length);
        lista.appendChild(wrapper.firstElementChild);
        atualizarEstadoDia(card);
        marcarSujo();
        lista.lastElementChild?.querySelector('[data-hora-inicio]')?.focus();
    }

    function atualizarEstadoDia(card) {
        if (!card) return;
        const count = card.querySelectorAll('.ks-online-time-row').length;
        const small = card.querySelector('.ks-online-day-head small');
        if (small) small.textContent = count ? `${count} período${count > 1 ? 's' : ''} publicado${count > 1 ? 's' : ''}` : 'Não publicado';
    }

    function capturarHorariosProfissionalAtual() {
        const id = state.profissionalSelecionado;
        if (!id) return true;
        const alvo = document.getElementById('ks_online_horarios');
        if (!alvo) return true;
        const novos = [];
        for (const card of alvo.querySelectorAll('[data-dia-card]')) {
            const dia = Number(card.dataset.diaCard);
            const intervalosDia = [];
            for (const row of card.querySelectorAll('.ks-online-time-row')) {
                const inicio = row.querySelector('[data-hora-inicio]')?.value || '';
                const fim = row.querySelector('[data-hora-fim]')?.value || '';
                if (!inicio || !fim) continue;
                if (fim <= inicio) {
                    setStatus(`${DIAS.find(d => d.valor === dia)?.nome || 'Dia'}: o horário final precisa ser posterior ao inicial.`, 'erro');
                    row.querySelector('[data-hora-fim]')?.focus();
                    return false;
                }
                intervalosDia.push({ inicio, fim, row });
            }
            intervalosDia.sort((a, b) => a.inicio.localeCompare(b.inicio));
            for (let i = 1; i < intervalosDia.length; i++) {
                if (intervalosDia[i].inicio < intervalosDia[i - 1].fim) {
                    setStatus(`${DIAS.find(d => d.valor === dia)?.nome || 'Dia'}: existem horários publicados que se sobrepõem.`, 'erro');
                    intervalosDia[i].row.querySelector('[data-hora-inicio]')?.focus();
                    return false;
                }
            }
            intervalosDia.forEach(x => novos.push({
                profissional_id: id,
                dia_semana: dia,
                hora_inicio: x.inicio,
                hora_fim: x.fim,
                ativo: true
            }));
        }
        state.disponibilidadeEditada = [
            ...state.disponibilidadeEditada.filter(x => String(x.profissional_id) !== String(id)),
            ...novos
        ];
        return true;
    }

    function atualizarContadores() {
        const profCount = state.profissionais.filter(p => p.agendamento_online_ativo).length;
        const procCount = state.procedimentos.filter(p => p.agendamento_online_ativo).length;
        const profEl = document.getElementById('ks_online_profissionais_count');
        const procEl = document.getElementById('ks_online_procedimentos_count');
        if (profEl) profEl.textContent = `${profCount} publicado${profCount === 1 ? '' : 's'}`;
        if (procEl) procEl.textContent = `${procCount} publicado${procCount === 1 ? '' : 's'}`;
    }

    function atualizarResumoPublicacao() {
        const ativo = !!document.getElementById('ks_online_ativo')?.checked;
        const profCount = state.profissionais.filter(p => p.agendamento_online_ativo).length;
        const procCount = state.procedimentos.filter(p => p.agendamento_online_ativo).length;
        const horarios = state.disponibilidadeEditada.length;
        const completo = profCount > 0 && procCount > 0 && horarios > 0;
        const badge = document.getElementById('ks_online_badge');
        const help = document.getElementById('ks_online_ativo_help');
        const summary = document.getElementById('ks_online_save_summary');
        if (badge) {
            badge.className = `ks-online-badge ${ativo && completo ? 'ativo' : ativo ? 'atencao' : 'fechado'}`;
            badge.textContent = ativo && completo ? 'Ativo' : ativo ? 'Configuração incompleta' : 'Fechado';
        }
        if (help) help.textContent = ativo ? 'Novos agendamentos serão aceitos quando a configuração estiver completa.' : 'Portal fechado para novos agendamentos.';
        if (summary) summary.textContent = ativo && completo
            ? `${profCount} profissional${profCount === 1 ? '' : 'is'} · ${procCount} procedimento${procCount === 1 ? '' : 's'} · ${horarios} período${horarios === 1 ? '' : 's'}`
            : ativo ? 'Complete profissionais, procedimentos e horários para publicar' : 'Portal fechado';
    }

    function lerConfigDoFormulario() {
        return {
            clinica_id: state.clinicaId,
            ativo: !!document.getElementById('ks_online_ativo')?.checked,
            antecedencia_minima_minutos: Number(document.getElementById('ks_online_antecedencia')?.value || 120),
            horizonte_dias: Number(document.getElementById('ks_online_horizonte')?.value || 30),
            titulo_publico: String(document.getElementById('ks_online_titulo')?.value || '').trim(),
            descricao_publica: String(document.getElementById('ks_online_descricao')?.value || '').trim(),
            mensagem_fechado: String(document.getElementById('ks_online_mensagem_fechado')?.value || '').trim(),
            mostrar_valores: !!document.getElementById('ks_online_mostrar_valores')?.checked,
            atualizado_em: new Date().toISOString()
        };
    }

    function validarPublicacao(cfg) {
        if (!cfg.titulo_publico) return { ok: false, msg: 'Informe o título que será exibido ao paciente.', id: 'ks_online_titulo' };
        if (!cfg.descricao_publica) return { ok: false, msg: 'Informe o texto de apresentação do agendamento online.', id: 'ks_online_descricao' };
        if (!cfg.mensagem_fechado) return { ok: false, msg: 'Informe a mensagem exibida quando o portal estiver fechado.', id: 'ks_online_mensagem_fechado' };
        if (!cfg.ativo) return { ok: true };
        if (!state.profissionais.some(p => p.agendamento_online_ativo)) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um profissional.', id: 'ks_online_sec_profissionais' };
        if (!state.procedimentos.some(p => p.agendamento_online_ativo)) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um procedimento.', id: 'ks_online_sec_procedimentos' };
        if (!state.disponibilidadeEditada.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um período de atendimento.', id: 'ks_online_sec_horarios' };
        return { ok: true };
    }

    function chaveHorario(x) {
        return [String(x.profissional_id), Number(x.dia_semana), String(x.hora_inicio).slice(0, 5), String(x.hora_fim).slice(0, 5)].join('|');
    }

    async function salvarTudo() {
        if (state.salvando || !state.carregado) return;
        if (!capturarHorariosProfissionalAtual()) return;
        const client = sb();
        if (!client) return setStatus('Supabase indisponível.', 'erro');
        const cfg = lerConfigDoFormulario();
        const validacao = validarPublicacao(cfg);
        if (!validacao.ok) {
            setStatus(validacao.msg, 'erro');
            const alvo = document.getElementById(validacao.id);
            alvo?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            if (alvo?.matches?.('input,textarea,select')) alvo.focus();
            return;
        }

        state.salvando = true;
        const btn = document.getElementById('ks_online_salvar');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
        setStatus('Salvando configuração…', 'neutro');
        try {
            const { error: cfgError } = await client.from('configuracoes_agendamento_online')
                .upsert(cfg, { onConflict: 'clinica_id' });
            if (cfgError) throw cfgError;

            for (const p of state.profissionais) {
                if (!!p.agendamento_online_ativo === !!p._onlineOriginal) continue;
                const { error } = await client.from('equipe')
                    .update({ agendamento_online_ativo: !!p.agendamento_online_ativo })
                    .eq('id', p.id).eq('clinica_id', state.clinicaId);
                if (error) throw error;
            }

            for (const p of state.procedimentos) {
                if (!!p.agendamento_online_ativo === !!p._onlineOriginal) continue;
                const { error } = await client.from('procedimentos')
                    .update({ agendamento_online_ativo: !!p.agendamento_online_ativo })
                    .eq('id', p.id).eq('clinica_id', state.clinicaId);
                if (error) throw error;
            }

            const desejados = state.disponibilidadeEditada.map(x => ({
                clinica_id: state.clinicaId,
                profissional_id: x.profissional_id,
                dia_semana: Number(x.dia_semana),
                hora_inicio: String(x.hora_inicio).slice(0, 5),
                hora_fim: String(x.hora_fim).slice(0, 5),
                ativo: true,
                atualizado_em: new Date().toISOString()
            }));
            if (desejados.length) {
                const { error } = await client.from('disponibilidade_agendamento_online')
                    .upsert(desejados, { onConflict: 'clinica_id,profissional_id,dia_semana,hora_inicio,hora_fim' });
                if (error) throw error;
            }
            const chavesDesejadas = new Set(desejados.map(chaveHorario));
            const removerIds = state.disponibilidadeOriginal
                .filter(x => x.id && !chavesDesejadas.has(chaveHorario(x)))
                .map(x => x.id);
            if (removerIds.length) {
                const { error } = await client.from('disponibilidade_agendamento_online')
                    .delete().in('id', removerIds).eq('clinica_id', state.clinicaId);
                if (error) throw error;
            }

            setStatus(cfg.ativo ? 'Configuração salva. O portal está preparado para aceitar agendamentos.' : 'Configuração salva. O portal continua fechado.', 'sucesso');
            if (typeof window.mostrarToastKineSys === 'function') {
                window.mostrarToastKineSys('Configuração do agendamento online salva.', 'sucesso', 4000);
            }
            await carregar(true);
        } catch (err) {
            console.error('KineSys: erro ao salvar configuração do agendamento online', err);
            setStatus(`Não foi possível salvar: ${err?.message || err}`, 'erro');
        } finally {
            state.salvando = false;
            if (btn) { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
        }
    }

    function inicializar() {
        if (!ehAdministrador()) return;
        if (!montarHub()) return;
        onOpen();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializar, { once: true });
    else inicializar();

    window.KineSysConfiguracoesAgendaOnline = Object.freeze({
        version: VERSION,
        abrirAba,
        onOpen,
        refresh: () => carregar(true)
    });
})();