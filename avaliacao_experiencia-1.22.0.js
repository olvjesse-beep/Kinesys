(function () {
    'use strict';

    const SELECTORS = {
        tela: '#tela_avaliacao',
        draftBar: '.avaliacao-draft-toolbar',
        factors: '.fatores-piora-compactos',
        factorsGroup: '.fatores-piora-compactos .checkbox-group',
        quickSave: '#btn_salvar_avaliacao_rapida'
    };

    const STEPS = {
        subtela_triagem: {
            number: 1,
            title: 'Anamnese',
            help: 'Identifique o paciente, a queixa atual e somente os fatores que mudam a decisão clínica.'
        },
        subtela_mapeamento: {
            number: 2,
            title: 'Exame direcionado',
            help: 'Selecione a região e registre segurança, achados e testes do exame.'
        },
        subtela_diagnostico: {
            number: 3,
            title: 'Síntese clínica',
            help: 'Revise alertas, coerência dos achados e o texto final antes de concluir.'
        }
    };

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function visibleStepId() {
        const active = qs('#tela_avaliacao .subtela.ativa');
        return active && STEPS[active.id] ? active.id : 'subtela_triagem';
    }

    function updateStepContext() {
        const box = qs('#ks-eval-step-context');
        if (!box) return;
        const step = STEPS[visibleStepId()];
        box.innerHTML = '<strong>Etapa ' + step.number + ' de 3 · ' + step.title + '</strong><span>' + step.help + '</span>';

        qsa('#tela_avaliacao .clinical-progress .step').forEach(function (item, index) {
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-current', index + 1 === step.number ? 'step' : 'false');
        });
    }

    function showWorkflowMessage(message) {
        if (typeof window.mostrarToastKineSys === 'function') {
            window.mostrarToastKineSys(message, 'aviso');
            return;
        }
        window.alert(message);
    }

    function goToStep(targetId) {
        if (!STEPS[targetId]) return;

        if (targetId === 'subtela_triagem') {
            if (typeof window.irParaSubtela === 'function') window.irParaSubtela(targetId);
            else activateStepFallback(targetId);
            return;
        }

        if (targetId === 'subtela_mapeamento') {
            if (typeof window.avancarParaMapa === 'function') window.avancarParaMapa();
            else showWorkflowMessage('Não foi possível abrir o exame direcionado. Recarregue a página e tente novamente.');
            return;
        }

        if (typeof window.avancarParaDiagnostico === 'function') window.avancarParaDiagnostico();
        else showWorkflowMessage('Não foi possível gerar a síntese clínica. Recarregue a página e tente novamente.');
    }

    function activateStepFallback(targetId) {
        qsa('#tela_avaliacao .subtela').forEach(function (panel) {
            panel.classList.toggle('ativa', panel.id === targetId);
        });
        const number = STEPS[targetId].number;
        [1, 2, 3].forEach(function (item) {
            const indicator = qs('#step_indicador_' + item);
            if (indicator) indicator.classList.toggle('active', item === number);
        });
        updateStepContext();
    }

    function installGuardedNavigation() {
        window.navegarAvaliacaoEtapaKineSys = goToStep;

        qsa('#tela_avaliacao .clinical-progress .step').forEach(function (item) {
            if (item.dataset.ksNavigationReady === '1') return;
            item.dataset.ksNavigationReady = '1';
            item.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                const target = item.id === 'step_indicador_2'
                    ? 'subtela_mapeamento'
                    : item.id === 'step_indicador_3'
                        ? 'subtela_diagnostico'
                        : 'subtela_triagem';
                goToStep(target);
            });
        });
    }

    function removeDuplicateDraftAction() {
        const bar = qs(SELECTORS.draftBar);
        if (bar) bar.remove();
    }

    function installStepContext() {
        const wrap = qs('#tela_avaliacao .clinical-progress-wrap');
        if (!wrap || qs('#ks-eval-step-context')) return;
        const context = document.createElement('div');
        context.id = 'ks-eval-step-context';
        context.className = 'ks-eval-step-context';
        context.setAttribute('aria-live', 'polite');
        wrap.insertAdjacentElement('afterend', context);

        const tela = qs(SELECTORS.tela);
        if (tela) {
            new MutationObserver(updateStepContext).observe(tela, {
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
        updateStepContext();
    }

    function checkedLabels(group) {
        return qsa('input[type="checkbox"]:checked', group).map(function (input) {
            const label = input.closest('label');
            const text = label ? qs('span', label) : null;
            return (text ? text.textContent : input.value).trim();
        });
    }

    function updateFactorSummary() {
        const summary = qs('#ks-eval-factors-summary');
        const group = qs('#ks-eval-factors-options');
        if (!summary || !group) return;
        const labels = checkedLabels(group);
        summary.textContent = labels.length ? labels.join(', ') : 'Nenhum selecionado';
        const trigger = qs('#ks-eval-factors-trigger');
        if (trigger) {
            trigger.classList.toggle('has-data', labels.length > 0);
            trigger.setAttribute('aria-label', 'Fatores de piora: ' + summary.textContent);
        }
    }

    function createChoiceDialog(id, title, description, content) {
        const tela = qs(SELECTORS.tela);
        if (!tela) return null;
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'ks-eval-dialog-backdrop';
        overlay.hidden = true;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', id + '-title');
        overlay.innerHTML = '<section class="ks-eval-dialog-card"><header><div><span class="eyebrow">ANAMNESE</span><h2 id="' + id + '-title">' + title + '</h2></div><button type="button" class="ks-eval-dialog-close" aria-label="Fechar">×</button></header><p>' + description + '</p><div class="ks-eval-dialog-options"></div><footer><button type="button" class="btn-primary ks-eval-dialog-done">Concluir</button></footer></section>';
        qs('.ks-eval-dialog-options', overlay).appendChild(content);
        tela.appendChild(overlay);

        let returnFocus = null;
        function close() {
            overlay.hidden = true;
            document.body.classList.remove('ks-eval-modal-open');
            if (returnFocus) returnFocus.focus();
        }
        function open(trigger) {
            returnFocus = trigger;
            overlay.hidden = false;
            document.body.classList.add('ks-eval-modal-open');
            const first = qs('select, input, button', overlay);
            if (first) first.focus();
        }
        qs('.ks-eval-dialog-close', overlay).addEventListener('click', close);
        qs('.ks-eval-dialog-done', overlay).addEventListener('click', close);
        overlay.addEventListener('click', function (event) { if (event.target === overlay) close(); });
        overlay.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
        return {overlay: overlay, open: open, close: close};
    }

    function installMechanismDialog() {
        const mechanism = qs('#tela_avaliacao .clinical-mechanism-only');
        const select = qs('#paciente_mecanismo_lesao');
        if (!mechanism || !select || qs('#ks-eval-mechanism-trigger')) return;

        const slot = document.createElement('div');
        slot.className = 'ks-eval-choice-slot ks-eval-mechanism-slot';
        mechanism.parentNode.insertBefore(slot, mechanism);
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.id = 'ks-eval-mechanism-trigger';
        trigger.className = 'ks-eval-choice-trigger';
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', 'ks-eval-mechanism-dialog');
        trigger.innerHTML = '<span><strong>Mecanismo / início</strong><small id="ks-eval-mechanism-summary">Não informado</small></span><span class="ks-eval-choice-action">Selecionar</span>';
        slot.appendChild(trigger);

        const dialog = createChoiceDialog('ks-eval-mechanism-dialog', 'Mecanismo / início', 'Selecione a forma de início que melhor representa o relato e os dados disponíveis.', mechanism);
        if (!dialog) return;
        function update() {
            const label = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : 'Não informado';
            qs('#ks-eval-mechanism-summary').textContent = label;
            trigger.classList.toggle('has-data', !!select.value);
            trigger.setAttribute('aria-label', 'Mecanismo / início: ' + label);
        }
        trigger.addEventListener('click', function () { dialog.open(trigger); });
        select.addEventListener('change', update);
        update();
    }

    function installFactorDialog() {
        const container = qs(SELECTORS.factors);
        const group = qs(SELECTORS.factorsGroup);
        if (!container || !group || qs('#ks-eval-factors-dialog')) return;

        group.id = 'ks-eval-factors-options';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.id = 'ks-eval-factors-trigger';
        trigger.className = 'ks-eval-choice-trigger';
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', 'ks-eval-factors-dialog');
        trigger.innerHTML = '<span><strong>Fatores de piora</strong><small id="ks-eval-factors-summary">Nenhum selecionado</small></span><span class="ks-eval-choice-action">Selecionar</span>';

        const originalLabel = qs(':scope > label', container);
        if (originalLabel) originalLabel.remove();
        container.appendChild(trigger);

        const dialog = createChoiceDialog('ks-eval-factors-dialog', 'Fatores de piora', 'Marque apenas o que o paciente relaciona claramente à piora dos sintomas.', group);
        if (!dialog) return;
        trigger.addEventListener('click', function () { dialog.open(trigger); });
        group.addEventListener('change', function () {
            updateFactorSummary();
        });
        updateFactorSummary();
    }

    function refineLabelsAndCards() {
        const quickSave = qs(SELECTORS.quickSave);
        if (quickSave) {
            const keepDraftLabel = function () {
                if (quickSave.textContent.trim() !== 'Salvar rascunho') quickSave.textContent = 'Salvar rascunho';
            };
            keepDraftLabel();
            if (quickSave.dataset.ksDraftLabelGuard !== '1') {
                quickSave.dataset.ksDraftLabelGuard = '1';
                new MutationObserver(keepDraftLabel).observe(quickSave, {childList: true, subtree: true, characterData: true});
            }
        }

        const patientCard = qs('#subtela_triagem .precadastro-compacto');
        if (patientCard) patientCard.classList.add('ks-eval-patient-loader');

        const synthesis = qs('#subtela_diagnostico');
        if (synthesis) synthesis.classList.add('ks-eval-synthesis');

        const alertsTitle = qs('#card_alertas_consolidados .card-header h2');
        if (alertsTitle) alertsTitle.textContent = 'Alertas para revisar';

        const summaryCard = qs('#container_sintese_diagnostica');
        if (summaryCard && summaryCard.parentElement) summaryCard.parentElement.classList.add('ks-eval-summary-card');

        const reportCard = qs('#ks-laudo-card');
        if (reportCard) reportCard.classList.add('ks-eval-report-card');

        const mechanism = qs('#tela_avaliacao .ks-eval-mechanism-slot');
        const factors = qs('#tela_avaliacao .fatores-piora-compactos');
        const thermometer = qs('#tela_avaliacao .ks-pain-thermometer');
        if (mechanism && factors && thermometer && !qs('#ks-eval-mechanism-pain-row')) {
            const row = document.createElement('div');
            row.id = 'ks-eval-mechanism-pain-row';
            row.className = 'ks-eval-mechanism-pain-row';
            mechanism.parentNode.insertBefore(row, mechanism);
            row.appendChild(mechanism);
            row.appendChild(factors);
            row.appendChild(thermometer);
        }
    }

    function installPatientState() {
        const name = qs('#paciente_nome');
        const loader = qs('#subtela_triagem .ks-eval-patient-loader');
        if (!name || !loader) return;
        function update() {
            loader.classList.toggle('has-patient', !!name.value.trim());
        }
        name.addEventListener('input', update);
        name.addEventListener('change', update);
        update();
    }

    function init() {
        if (!qs(SELECTORS.tela) || document.documentElement.dataset.ksEvalExperience === '1') return;
        document.documentElement.dataset.ksEvalExperience = '1';
        removeDuplicateDraftAction();
        installGuardedNavigation();
        installStepContext();
        installMechanismDialog();
        installFactorDialog();
        refineLabelsAndCards();
        installPatientState();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
