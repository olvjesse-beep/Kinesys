/* KineSys — Agendamento online: layout operacional destilado 1.0.0 */
(() => {
    'use strict';

    const VERSION = '1.0.0';
    const ASSET_REVISION = '20260913-online-v5';
    const STYLE_PATH = 'styles/configuracoes_agendamento_online_layout-1.0.0.css';
    const STORAGE_KEY = 'kinesys_online_config_stage';
    const STAGES = Object.freeze([
        { id: 'geral', label: 'Geral', sections: ['ks_online_sec_publicacao', 'ks_online_sec_identidade_publica'] },
        { id: 'profissional', label: 'Profissional', sections: ['ks_online_sec_profissionais', 'ks_online_sec_profissional_publico'] },
        { id: 'servicos', label: 'Serviços', sections: ['ks_online_sec_procedimentos'] },
        { id: 'horarios', label: 'Horários', sections: ['ks_online_sec_horarios'] }
    ]);

    let mounted = false;
    let currentStage = 'geral';

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

    function elementosProntos() {
        const panel = document.getElementById('ks_config_panel_online');
        const shell = panel?.querySelector('.ks-online-shell');
        const surface = shell?.querySelector('.ks-online-surface');
        if (!panel || !shell || !surface) return null;
        for (const stage of STAGES) {
            for (const id of stage.sections) if (!document.getElementById(id)) return null;
        }
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
        return `<div class="ks-online-layout-nav" role="tablist" aria-label="Configuração do agendamento online">
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
                <span>Profissional selecionado</span>
                <strong data-online-context-name>${nomeProfissionalSelecionado()}</strong>
            </div>
            <button type="button" class="btn-secondary" data-online-trocar-profissional>Trocar profissional</button>
        </div>`;
    }

    function garantirContextos() {
        ['servicos', 'horarios'].forEach(stageId => {
            const stage = STAGES.find(item => item.id === stageId);
            const section = document.getElementById(stage?.sections?.[0]);
            if (!section || section.querySelector(`[data-online-context="${stageId}"]`)) return;
            section.insertAdjacentHTML('afterbegin', contextoMarkup(stageId));
        });
        atualizarContextos();
    }

    function atualizarContextos() {
        const nome = nomeProfissionalSelecionado();
        document.querySelectorAll('[data-online-context-name]').forEach(el => { el.textContent = nome; });
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

        garantirCSS();
        const { shell, surface } = refs;
        shell.classList.add('ks-online-distilled');

        if (!shell.querySelector('.ks-online-layout-nav')) {
            const feedback = document.getElementById('ks_online_status_feedback');
            if (feedback) feedback.insertAdjacentHTML('afterend', navMarkup());
            else surface.insertAdjacentHTML('beforebegin', navMarkup());
        }

        STAGES.forEach(stage => stage.sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.dataset.onlineStageSection = stage.id;
        }));

        garantirContextos();
        ligarEventos(shell);
        mounted = true;
        mostrarStage(carregarStageSalvo());
        return true;
    }

    function onOpen() {
        if (!ehAdministrador()) return false;
        if (montar()) {
            mostrarStage(currentStage || carregarStageSalvo());
            return true;
        }

        let tentativas = 0;
        const timer = setInterval(() => {
            tentativas += 1;
            if (montar() || tentativas >= 20) clearInterval(timer);
        }, 100);
        return false;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onOpen, { once: true });
    else onOpen();

    window.KineSysConfiguracoesAgendaOnlineLayout = Object.freeze({
        version: VERSION,
        onOpen,
        showStage: mostrarStage
    });
})();
