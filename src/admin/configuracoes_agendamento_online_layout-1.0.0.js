/* KineSys — Configurações > Agenda: workspace operacional 1.0.0 */
(() => {
    'use strict';

    const VERSION = '1.0.0';
    const ASSET_REVISION = '20260913-config-agenda-r1';
    const STYLE_PATH = 'styles/configuracoes_agendamento_online_layout-1.0.0.css';
    const GLASS_STYLE_PATH = 'styles/navigation_glass-1.0.0.css';
    const STORAGE_KEY = 'kinesys_online_config_stage';

    const STAGES = Object.freeze([
        { id: 'geral', label: 'Geral', sections: ['ks_online_sec_publicacao', 'ks_online_sec_identidade_publica'] },
        { id: 'profissional', label: 'Profissionais', sections: ['ks_online_sec_profissionais', 'ks_online_sec_profissional_publico'] },
        { id: 'servicos', label: 'Serviços', sections: ['agenda_procedimentos', 'ks_online_sec_procedimentos'] },
        { id: 'horarios', label: 'Horários', sections: ['agenda_horarios', 'ks_online_sec_horarios'] },
        { id: 'ausencias', label: 'Ausências', sections: ['agenda_bloqueios'] }
    ]);

    const ONLINE_REQUIRED = Object.freeze([
        'ks_online_sec_publicacao',
        'ks_online_sec_identidade_publica',
        'ks_online_sec_profissionais',
        'ks_online_sec_profissional_publico',
        'ks_online_sec_procedimentos',
        'ks_online_sec_horarios'
    ]);

    let mounted = false;
    let currentStage = 'geral';
    let agendaInternaPromise = null;
    let agendaInternaPronta = false;

    function ehAdministrador() {
        if (typeof usuarioEhMaster === 'function') return !!usuarioEhMaster();
        const tipo = String(window.usuarioLogado?.tipo || '').toUpperCase();
        return tipo === 'MASTER' || tipo === 'MASTER_FEM';
    }

    function garantirCSS(path, revision) {
        if (document.querySelector(`link[href^="${path}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${path}?v=${revision}`;
        document.head.appendChild(link);
    }

    function ajustarHubConfiguracoes() {
        const tab = document.getElementById('ks_config_tab_online');
        if (tab) {
            tab.textContent = 'Agenda';
            tab.setAttribute('aria-label', 'Agenda');
        }

        const headerCopy = document.querySelector('#tela_configuracoes .ks-config-hub-header p');
        if (headerCopy) headerCopy.textContent = 'Agenda, comunicação e preferências administrativas da clínica.';

        const titulo = document.querySelector('#ks_config_panel_online .ks-online-topline h2');
        const descricao = document.querySelector('#ks_config_panel_online .ks-online-topline p');
        if (titulo) titulo.textContent = 'Agenda';
        if (descricao) descricao.textContent = 'Configure serviços, profissionais, horários, ausências e o portal de agendamento em um único lugar.';
    }

    function removerConfiguracaoDaAgendaOperacional() {
        const wrap = document.querySelector('#tela_agenda .ks-agenda-config-wrap');
        if (wrap) wrap.remove();
        const controls = document.getElementById('ks_agenda_controls');
        if (controls) controls.classList.add('ks-agenda-controls-operational-only');
    }

    function elementosProntos() {
        const panel = document.getElementById('ks_config_panel_online');
        const shell = panel?.querySelector('.ks-online-shell');
        const surface = shell?.querySelector('.ks-online-surface');
        if (!panel || !shell || !surface) return null;
        if (ONLINE_REQUIRED.some(id => !document.getElementById(id))) return null;
        return { panel, shell, surface };
    }

    function carregarStageSalvo() {
        try {
            const salvo = sessionStorage.getItem(STORAGE_KEY);
            if (STAGES.some(stage => stage.id === salvo)) return salvo;
        } catch (_) {}
        return 'geral';
    }

    function navMarkup() {
        return `<div class="ks-online-layout-nav" role="tablist" aria-label="Áreas de configuração da Agenda">
            ${STAGES.map((stage, index) => `<button type="button" role="tab" data-online-stage="${stage.id}" aria-selected="${index === 0 ? 'true' : 'false'}">${stage.label}</button>`).join('')}
        </div>`;
    }

    function nomeProfissionalSelecionado() {
        const select = document.getElementById('ks_online_profissional_horarios');
        const option = select?.selectedOptions?.[0];
        return String(option?.textContent || '').trim() || 'Selecione um profissional';
    }

    function contextoMarkup(stageId) {
        return `<div class="ks-online-layout-context" data-online-context="${stageId}">
            <div>
                <span>Publicação online para</span>
                <strong data-online-context-name>${nomeProfissionalSelecionado()}</strong>
            </div>
            <button type="button" class="btn-secondary" data-online-trocar-profissional>Trocar profissional</button>
        </div>`;
    }

    function garantirContextos() {
        const alvoPorStage = {
            servicos: document.getElementById('ks_online_sec_procedimentos'),
            horarios: document.getElementById('ks_online_sec_horarios')
        };
        Object.entries(alvoPorStage).forEach(([stageId, section]) => {
            if (!section || section.querySelector(`[data-online-context="${stageId}"]`)) return;
            section.insertAdjacentHTML('afterbegin', contextoMarkup(stageId));
        });
        atualizarContextos();
    }

    function atualizarContextos() {
        const nome = nomeProfissionalSelecionado();
        document.querySelectorAll('[data-online-context-name]').forEach(el => { el.textContent = nome; });
    }

    function marcarSecoes() {
        STAGES.forEach(stage => stage.sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.dataset.onlineStageSection = stage.id;
        }));
    }

    function decorarSecaoNativa(section, tipo) {
        if (!section || section.dataset.configAgendaDecorated === '1') return;
        section.dataset.configAgendaDecorated = '1';
        section.classList.remove('subtela', 'ativa');
        section.classList.add('ks-config-agenda-native');
        section.dataset.configAgendaTipo = tipo;

        const primeiro = section.firstElementChild;
        if (primeiro?.classList.contains('card')) primeiro.classList.add('ks-config-agenda-native-card');
    }

    function moverSecaoNativa(surface, id, beforeId, tipo) {
        const section = document.getElementById(id);
        if (!section || !surface) return false;
        decorarSecaoNativa(section, tipo);
        const before = beforeId ? document.getElementById(beforeId) : null;
        if (before && before.parentElement === surface) surface.insertBefore(section, before);
        else if (section.parentElement !== surface) surface.appendChild(section);
        return true;
    }

    async function carregarDadosAgendaInterna() {
        if (typeof window.carregarProfissionaisAgenda === 'function') await window.carregarProfissionaisAgenda();
        await Promise.all([
            typeof window.carregarProcedimentos === 'function' ? window.carregarProcedimentos() : Promise.resolve(),
            typeof window.carregarHorarios === 'function' ? window.carregarHorarios() : Promise.resolve(),
            typeof window.carregarBloqueios === 'function' ? window.carregarBloqueios() : Promise.resolve()
        ]);
        if (typeof window.carregarEditorGradeSemanal === 'function') await window.carregarEditorGradeSemanal();
    }

    async function garantirAgendaInterna(surface) {
        if (agendaInternaPromise) return agendaInternaPromise;
        agendaInternaPromise = (async () => {
            if (window.KineSysScreenLoader?.ensure) await window.KineSysScreenLoader.ensure('tela_agenda');

            removerConfiguracaoDaAgendaOperacional();
            moverSecaoNativa(surface, 'agenda_procedimentos', 'ks_online_sec_procedimentos', 'servicos');
            moverSecaoNativa(surface, 'agenda_horarios', 'ks_online_sec_horarios', 'horarios');
            moverSecaoNativa(surface, 'agenda_bloqueios', null, 'ausencias');

            marcarSecoes();
            garantirContextos();
            await carregarDadosAgendaInterna();
            agendaInternaPronta = true;
            mostrarStage(currentStage);
            return true;
        })().catch(error => {
            agendaInternaPromise = null;
            console.error('KineSys Configurações > Agenda: falha ao carregar configurações internas da Agenda.', error);
            if (typeof window.mostrarToastKineSys === 'function') {
                window.mostrarToastKineSys('Não foi possível carregar todas as configurações da Agenda agora.', 'erro', 6000);
            }
            return false;
        });
        return agendaInternaPromise;
    }

    function atualizarStageNativo(stageId) {
        if (!agendaInternaPronta) return;
        if (stageId === 'servicos' && typeof window.carregarProcedimentos === 'function') {
            Promise.resolve(window.carregarProcedimentos()).catch(console.warn);
        }
        if (stageId === 'horarios') {
            if (typeof window.carregarHorarios === 'function') Promise.resolve(window.carregarHorarios()).catch(console.warn);
            if (typeof window.carregarEditorGradeSemanal === 'function') Promise.resolve(window.carregarEditorGradeSemanal()).catch(console.warn);
        }
        if (stageId === 'ausencias' && typeof window.carregarBloqueios === 'function') {
            Promise.resolve(window.carregarBloqueios()).catch(console.warn);
        }
    }

    function mostrarStage(stageId, { focus = false } = {}) {
        const stage = STAGES.find(item => item.id === stageId) || STAGES[0];
        currentStage = stage.id;

        STAGES.forEach(item => {
            item.sections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) section.hidden = item.id !== stage.id;
            });
        });

        document.querySelectorAll('.ks-online-layout-nav [data-online-stage]').forEach(button => {
            const active = button.dataset.onlineStage === stage.id;
            button.setAttribute('aria-selected', String(active));
            button.tabIndex = active ? 0 : -1;
            if (active && focus) button.focus({ preventScroll: true });
        });

        atualizarContextos();
        atualizarStageNativo(stage.id);
        try { sessionStorage.setItem(STORAGE_KEY, stage.id); } catch (_) {}
    }

    function ligarEventos(shell) {
        shell.querySelector('.ks-online-layout-nav')?.addEventListener('click', event => {
            const button = event.target.closest('[data-online-stage]');
            if (!button) return;
            mostrarStage(button.dataset.onlineStage);
        });

        shell.querySelector('.ks-online-layout-nav')?.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const buttons = [...shell.querySelectorAll('.ks-online-layout-nav [data-online-stage]')];
            const index = buttons.indexOf(document.activeElement);
            if (index < 0) return;
            event.preventDefault();
            let next = index;
            if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
            if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = buttons.length - 1;
            mostrarStage(buttons[next].dataset.onlineStage, { focus: true });
        });

        shell.addEventListener('click', event => {
            if (!event.target.closest('[data-online-trocar-profissional]')) return;
            mostrarStage('profissional');
            setTimeout(() => document.getElementById('ks_online_profissional_horarios')?.focus(), 0);
        });

        document.getElementById('ks_online_profissional_horarios')?.addEventListener('change', atualizarContextos);
    }

    function montar() {
        if (mounted || !ehAdministrador()) return mounted;
        const refs = elementosProntos();
        if (!refs) return false;

        garantirCSS(STYLE_PATH, ASSET_REVISION);
        ajustarHubConfiguracoes();
        removerConfiguracaoDaAgendaOperacional();

        const { shell, surface } = refs;
        shell.classList.add('ks-online-distilled', 'ks-config-agenda-workspace');

        if (!shell.querySelector('.ks-online-layout-nav')) {
            const feedback = document.getElementById('ks_online_status_feedback');
            if (feedback) feedback.insertAdjacentHTML('afterend', navMarkup());
            else surface.insertAdjacentHTML('beforebegin', navMarkup());
        }

        marcarSecoes();
        garantirContextos();
        ligarEventos(shell);
        mounted = true;
        mostrarStage(carregarStageSalvo());
        garantirAgendaInterna(surface);
        return true;
    }

    function onOpen() {
        removerConfiguracaoDaAgendaOperacional();
        if (!ehAdministrador()) return false;
        if (montar()) {
            ajustarHubConfiguracoes();
            mostrarStage(currentStage || carregarStageSalvo());
            const surface = document.querySelector('#ks_config_panel_online .ks-online-surface');
            if (surface) garantirAgendaInterna(surface);
            return true;
        }

        let tentativas = 0;
        const timer = setInterval(() => {
            tentativas += 1;
            if (montar() || tentativas >= 20) clearInterval(timer);
        }, 100);
        return false;
    }

    garantirCSS(GLASS_STYLE_PATH, '20260913-glass-r1');
    removerConfiguracaoDaAgendaOperacional();
    document.addEventListener('kinesys:tela-ativada', removerConfiguracaoDaAgendaOperacional);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onOpen, { once: true });
    else onOpen();

    window.KineSysConfiguracoesAgendaOnlineLayout = Object.freeze({
        version: VERSION,
        onOpen,
        showStage: mostrarStage
    });
})();
