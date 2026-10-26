/* KineSys — Configurações administrativas do agendamento online v1.0.0 */
(() => {
    'use strict';

    const VERSION = '1.0.0';
    const ASSET_REVISION = '20261016-config-paginas-r1';
    const STYLE_PATH = 'styles/configuracoes_agendamento_online-1.0.0.css';
    const CONFIG_AREAS = Object.freeze([
        ['clinica', 'Clínica'], ['online', 'Agenda e serviços'], ['equipe', 'Equipe'],
        ['mensagens', 'Comunicação'], ['documentos', 'Documentos'],
        ['integracoes', 'Integrações'], ['dados', 'Dados e segurança']
    ]);
    const AGENDA_CORES_PADRAO = Object.freeze({
        osteopatia: '#2F8F72',
        fisioterapia: '#2F7EAD',
        falta: '#7B878C'
    });
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
        erroCarga: false,
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
    let salvandoCores = false;

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
        // A composição do hub não depende de abrir Agenda nem do perfil público.
        [STYLE_PATH, 'styles/configuracoes_agendamento_online_layout-1.0.0.css'].forEach(path => {
            if (document.querySelector(`link[href^="${path}"]`)) return;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${path}?v=${ASSET_REVISION}`;
            document.head.appendChild(link);
        });
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
        // A sessão principal é lexical (let), não uma propriedade de window.
        const usuario = (typeof usuarioLogado !== 'undefined' && usuarioLogado) || window.usuarioLogado;
        return String(usuario?.clinica_id || '').trim();
    }

    function chaveCoresAgenda() {
        return `kinesys_agenda_cores::${obterClinicaIdLocal() || state.clinicaId || 'sem_clinica'}`;
    }

    function corHexValida(valor) {
        return /^#[0-9a-f]{6}$/i.test(String(valor || '').trim());
    }

    function lerCoresAgenda() {
        let salvas = {};
        try { salvas = JSON.parse(localStorage.getItem(chaveCoresAgenda()) || '{}') || {}; }
        catch (_) { salvas = {}; }
        return Object.fromEntries(Object.entries(AGENDA_CORES_PADRAO).map(([tipo, padrao]) => [
            tipo,
            corHexValida(salvas[tipo]) ? String(salvas[tipo]).toUpperCase() : padrao
        ]));
    }

    function preencherCoresAgenda(cores = lerCoresAgenda()) {
        Object.entries(cores).forEach(([tipo, cor]) => {
            const input = document.getElementById(`ks_agenda_cor_${tipo}`);
            const valor = document.getElementById(`ks_agenda_cor_${tipo}_valor`);
            if (input) input.value = cor;
            if (valor) valor.textContent = cor;
            document.querySelector(`[data-preview-cor="${tipo}"]`)?.style.setProperty('--preview-color', cor);
        });
    }

    function salvarCoresAgenda(cores = null) {
        if (!ehAdministrador() || !(obterClinicaIdLocal() || state.clinicaId)) {
            const feedback = document.getElementById('ks_agenda_cores_feedback');
            if (feedback) { feedback.textContent = 'Aguarde a identificação da clínica antes de salvar as cores.'; feedback.className = 'ks-online-feedback erro'; feedback.hidden = false; }
            return false;
        }
        const proximas = cores || Object.fromEntries(Object.keys(AGENDA_CORES_PADRAO).map(tipo => [
            tipo,
            document.getElementById(`ks_agenda_cor_${tipo}`)?.value || AGENDA_CORES_PADRAO[tipo]
        ]));
        if (Object.values(proximas).some(cor => !corHexValida(cor))) return false;
        try { localStorage.setItem(chaveCoresAgenda(), JSON.stringify(proximas)); }
        catch (_) { return false; }
        preencherCoresAgenda(proximas);
        const telaAgenda = document.getElementById('tela_agenda');
        Object.entries(proximas).forEach(([tipo, cor]) => telaAgenda?.style.setProperty(`--agenda-cor-${tipo}`, cor));
        window.dispatchEvent(new CustomEvent('kinesys:agenda-cores-atualizadas', { detail: proximas }));
        const feedback = document.getElementById('ks_agenda_cores_feedback');
        if (feedback) { feedback.textContent = 'Cores salvas para esta clínica.'; feedback.className = 'ks-online-feedback sucesso'; feedback.hidden = false; }
        if (typeof window.mostrarToastKineSys === 'function') window.mostrarToastKineSys('Cores da Agenda atualizadas.', 'sucesso', 3000);
        return true;
    }

    function chaveCoresProcedimentos() {
        return chaveCoresAgenda().replace('kinesys_agenda_cores::', 'kinesys_agenda_cores_procedimentos::');
    }

    function lerCoresProcedimentos() {
        try {
            const raw = JSON.parse(localStorage.getItem(chaveCoresProcedimentos()) || '{}');
            return Object.fromEntries(Object.entries(raw || {}).filter(([id, cor]) => /^[\w-]+$/.test(id) && corHexValida(cor)));
        } catch (_) { return {}; }
    }

    function renderizarCoresProcedimentos() {
        const lista = document.getElementById('ks_cores_procedimentos');
        if (!lista) return;
        const salvar=document.getElementById('ks_agenda_cores_salvar');
        if(salvar)salvar.disabled=!state.carregado||state.carregando||state.erroCarga;
        if(state.erroCarga){lista.innerHTML='<p class="field-help" role="status">Não foi possível carregar os procedimentos. <button type="button" class="btn-secondary" onclick="KineSysConfiguracoesAgendaOnline.refresh()">Tentar novamente</button></p>';return;}
        if(!state.carregado&&!state.procedimentos.length){lista.innerHTML='<p class="field-help" role="status">Carregando procedimentos…</p>';return;}
        const cores = lerCoresProcedimentos();
        lista.innerHTML = state.procedimentos.length ? `<div class="ks-config-table-scroll"><table class="ks-config-procedure-table"><thead><tr><th>Procedimento</th><th>Duração</th><th>Valor</th><th>Cor</th><th>Ações</th></tr></thead><tbody>${state.procedimentos.map(p => {
            const tipo = /osteo/i.test(p.nome) ? 'osteopatia' : 'fisioterapia';
            const cor = cores[p.id] || lerCoresAgenda()[tipo];
            return `<tr><td><strong>${escapeHTML(p.nome)}</strong></td><td>${Number(p.duracao_minutos)} min</td><td>${p.valor == null ? 'Não informado' : escapeHTML(Number(p.valor).toLocaleString('pt-BR', {style:'currency',currency:'BRL'}))}</td><td><label class="ks-procedure-color"><input type="color" value="${cor}" data-cor-procedimento="${escapeHTML(p.id)}" aria-label="Cor de ${escapeHTML(p.nome)}"><span>${cor.toUpperCase()}</span></label></td><td><button type="button" class="btn-secondary" data-editar-procedimento="${escapeHTML(p.id)}">Editar</button></td></tr>`;
        }).join('')}</tbody></table></div>` : '<p class="field-help">Nenhum procedimento disponível. Use Adicionar procedimento para cadastrar o primeiro.</p>';
        const previa = document.querySelector('.ks-agenda-color-preview');
        if (previa && state.procedimentos.length) previa.innerHTML = state.procedimentos.slice(0,4).map(p => `<span data-preview-procedimento="${escapeHTML(p.id)}" style="--preview-color:${cores[p.id] || lerCoresAgenda()[/osteo/i.test(p.nome) ? 'osteopatia' : 'fisioterapia']}">${escapeHTML(p.nome)}<small>${Number(p.duracao_minutos)} min</small></span>`).join('');
    }

    async function salvarCoresCompartilhadas() {
        if (salvandoCores || !ehAdministrador()) return false;
        const feedback = document.getElementById('ks_agenda_cores_feedback');
        const btn = document.getElementById('ks_agenda_cores_salvar');
        const dizer = (texto, erro = false) => { if (feedback) { feedback.hidden = false; feedback.textContent = texto; feedback.className = `ks-online-feedback ${erro ? 'erro' : 'sucesso'}`; } };
        salvandoCores = true;
        if (btn) btn.disabled = true;
        try {
            if (!state.carregado) throw new Error('Aguarde o carregamento dos procedimentos antes de salvar.');
            const clinicaId = await resolverClinicaId();
            const cores = Object.fromEntries(Object.keys(AGENDA_CORES_PADRAO).map(tipo => [tipo, document.getElementById(`ks_agenda_cor_${tipo}`)?.value || lerCoresAgenda()[tipo]]));
            const procedimentos = {...lerCoresProcedimentos()};
            document.querySelectorAll('[data-cor-procedimento]').forEach(input => { procedimentos[input.dataset.corProcedimento] = input.value.toUpperCase(); });
            if ([...Object.values(cores), ...Object.values(procedimentos)].some(cor => !corHexValida(cor))) throw new Error('Confira as cores informadas.');
            const payload = {cores_agenda: {...cores, procedimentos}};
            const client = sb();
            if (!client) throw new Error('Servidor indisponível. As cores não foram salvas.');
            const res = await client.from('configuracoes_agendamento_online').update(payload).eq('clinica_id', clinicaId).select('clinica_id');
            if (res.error) throw res.error;
            if (!res.data?.length) {
                const criado = await client.from('configuracoes_agendamento_online').insert({clinica_id: clinicaId, ...configPadrao(), ...payload});
                if (criado.error) throw criado.error;
            }
            // Só anunciar sucesso depois da confirmação do servidor. Cache é auxiliar.
            try { localStorage.setItem(chaveCoresProcedimentos(), JSON.stringify(procedimentos)); } catch (_) {}
            salvarCoresAgenda(cores);
            window.dispatchEvent(new CustomEvent('kinesys:agenda-cores-atualizadas'));
            dizer('Cores salvas para a equipe desta clínica.');
            return true;
        } catch (error) { dizer(`Não foi possível salvar as cores: ${error.message || error}`, true); return false; }
        finally { salvandoCores = false; if (btn) btn.disabled = false; }
    }

    function markupAparenciaAgenda() {
        return `
            <div class="ks-online-shell ks-agenda-colors-shell">
                <div class="ks-online-topline">
                    <div>
                        <h2>Procedimentos e cores</h2>
                        <p>Cada procedimento pode ter sua própria cor na Agenda, sem alterar o status do atendimento.</p>
                    </div>
                    <button type="button" class="btn-primary" data-adicionar-procedimento>Adicionar procedimento</button>
                </div>
                <div id="ks_agenda_cores_feedback" class="ks-online-feedback neutro" role="status" aria-live="polite" hidden></div>
                <section class="ks-online-section">
                    <div class="ks-online-section-head ks-online-section-head-simple">
                        <div>
                            <h3>Cores dos atendimentos</h3>
                            <p>Defina a cor de cada procedimento. A cor de falta tem prioridade sobre a cor do serviço.</p>
                        </div>
                    </div>
                    <div id="ks_cores_procedimentos"></div>
                    <details class="ks-config-default-colors"><summary>Cores padrão e status de falta</summary><div class="ks-agenda-color-grid">
                        ${Object.entries({ osteopatia: 'Osteopatia', fisioterapia: 'Fisioterapia', falta: 'Falta' }).map(([tipo, rotulo]) => `
                            <label class="ks-agenda-color-field" for="ks_agenda_cor_${tipo}">
                                <span class="ks-agenda-color-copy"><strong>${rotulo}</strong><small id="ks_agenda_cor_${tipo}_valor">${AGENDA_CORES_PADRAO[tipo]}</small></span>
                                <input type="color" id="ks_agenda_cor_${tipo}" value="${AGENDA_CORES_PADRAO[tipo]}" aria-label="Cor para ${rotulo}">
                            </label>`).join('')}
                    </div></details>
                    <div class="ks-agenda-color-preview" aria-label="Prévia das cores">
                        <span data-preview-cor="osteopatia">Osteopatia</span>
                        <span data-preview-cor="fisioterapia">Fisioterapia</span>
                        <span data-preview-cor="falta">Falta</span>
                    </div>
                    <div class="ks-agenda-color-actions">
                        <button type="button" class="btn-secondary" id="ks_agenda_cores_restaurar">Restaurar padrão</button>
                        <button type="button" class="btn-primary" id="ks_agenda_cores_salvar">Salvar cores</button>
                    </div>
                </section>
            </div>`;
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
            descricao_publica: 'Escolha o profissional, o atendimento e um horário disponível.',
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

        const tabs = document.createElement('div');
        tabs.className = 'ks-config-tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Áreas de configuração');

        const online = document.createElement('div');
        online.id = 'ks_config_panel_online';
        online.className = 'ks-config-panel';
        online.setAttribute('role', 'tabpanel');
        online.setAttribute('aria-labelledby', 'ks_config_tab_online');
        online.innerHTML = markupAgendamentoOnline();

        const aparencia = document.createElement('div');
        aparencia.id = 'ks_config_panel_aparencia';
        aparencia.className = 'ks-config-panel';
        aparencia.setAttribute('role', 'tabpanel');
        aparencia.setAttribute('aria-labelledby', 'ks_config_tab_online');
        aparencia.hidden = true;
        aparencia.innerHTML = markupAparenciaAgenda();
        aparencia.insertAdjacentHTML('afterbegin', '<button type="button" class="btn-secondary" data-config-voltar-agenda>Voltar para Agenda e serviços</button>');

        const mensagens = document.createElement('div');
        mensagens.id = 'ks_config_panel_mensagens';
        mensagens.className = 'ks-config-panel';
        mensagens.setAttribute('role', 'tabpanel');
        mensagens.setAttribute('aria-labelledby', 'ks_config_tab_mensagens');
        mensagens.hidden = true;
        existentes.filter(el => !el.classList.contains('ks-data-governance-card')).forEach(el => mensagens.appendChild(el));

        const adicionais = CONFIG_AREAS.filter(([id]) => !['online', 'mensagens'].includes(id)).map(([id, label]) => {
            const panel = document.createElement('div');
            panel.id = `ks_config_panel_${id}`;
            panel.className = 'ks-config-panel ks-config-domain';
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', `ks_config_tab_${id}`);
            panel.hidden = true;
            if (id === 'dados') existentes.filter(el => el.classList.contains('ks-data-governance-card')).forEach(el => panel.appendChild(el));
            else if (id === 'integracoes') panel.innerHTML = `<h2>Integrações</h2><p>Conexões propostas para a clínica. Nenhum serviço externo é conectado automaticamente.</p>${markupIntegracoes()}`;
            else panel.innerHTML = `<h2>${label}</h2><p>${({clinica:'Identidade pública, endereço e comunicação da clínica.',equipe:'Profissionais, registros e permissões continuam na gestão de equipe.',documentos:'Os documentos usam os dados da clínica e o registro do profissional responsável.'})[id]}</p><button type="button" class="btn-secondary" data-config-destino="${id === 'clinica' ? 'identidade' : id === 'equipe' ? 'tela_equipe' : 'tela_relatorio'}">${id === 'clinica' ? 'Editar identidade da clínica' : id === 'equipe' ? 'Gerenciar equipe e acessos' : 'Abrir relatórios'}</button>${id === 'documentos' ? '<button type="button" class="btn-secondary" data-config-destino="tela_equipe">Editar registro profissional</button>' : ''}`;
            return panel;
        });

        tabs.innerHTML = CONFIG_AREAS.map(([id, label]) => `<button type="button" id="ks_config_tab_${id}" role="tab" aria-selected="${id === 'mensagens'}" aria-controls="ks_config_panel_${id}" data-config-tab="${id}">${label}</button>`).join('');
        header.innerHTML = `<label class="ks-config-search"><input type="search" id="ks_config_busca" placeholder="Buscar ajuste" autocomplete="off" aria-label="Buscar ajuste"></label><span class="ks-config-scope">Clínica atual</span>`;
        tela.classList.add('ks-config-connected');
        tela.append(header, tabs, online, aparencia, mensagens, ...adicionais);
        document.getElementById('ks_config_integracoes_resumo')?.insertAdjacentHTML('beforeend', markupIntegracoes());
        tela.classList.add('ks-config-hub-ready');
        tabs.addEventListener('click', evento => {
            const btn = evento.target.closest('[data-config-tab]');
            if (!btn) return;
            abrirAba(btn.dataset.configTab);
        });
        tabs.addEventListener('keydown', evento => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
            const buttons = [...tabs.querySelectorAll('[role="tab"]')].filter(button => !button.hidden);
            const index = buttons.indexOf(evento.target);
            if (index < 0) return;
            evento.preventDefault();
            const next = evento.key === 'Home' ? 0 : evento.key === 'End' ? buttons.length - 1 : (index + (evento.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
            abrirAba(buttons[next].dataset.configTab);
            buttons[next].focus();
        });
        tela.addEventListener('click', evento => {
            if (evento.target.closest('[data-config-voltar-agenda]')) { abrirAba('online'); return; }
            const destino = evento.target.closest('[data-config-destino]')?.dataset.configDestino;
            if (!destino) return;
            if (destino === 'identidade') {
                abrirAba('online');
                window.KineSysConfiguracoesAgendaOnlineLayout?.showStage?.('geral');
                document.getElementById('ks_online_v2_nome_publico')?.focus();
            } else if (destino === 'aparencia') abrirAba('aparencia');
            else if (typeof window.navegarPara === 'function') window.navegarPara(destino);
        });
        document.getElementById('ks_config_busca')?.addEventListener('input', evento => {
            const normalizar = valor => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const termo = normalizar(evento.target.value.trim());
            const aliases = { online: 'agenda horarios intervalos encaixes servicos cores aparencia ausencias procedimentos', mensagens: 'comunicacao whatsapp mensagens lembretes', dados: 'dados seguranca backup exportar restaurar', documentos: 'documentos relatorios assinatura registro', equipe: 'equipe profissionais acessos permissoes', clinica: 'clinica identidade endereco', integracoes: 'integracoes google calendar whatsapp api' };
            const resultados = [...tabs.querySelectorAll('[data-config-tab]')].filter(button => !termo || normalizar(aliases[button.dataset.configTab] || button.textContent).includes(termo));
            // A busca não esconde a aba cujo conteúdo continua aberto.
            tabs.querySelectorAll('[data-config-tab]').forEach(button => { button.hidden = false; });
            const statusBusca=document.getElementById('ks_config_busca_status');
            statusBusca.replaceChildren();
            if(termo){
                statusBusca.append(document.createTextNode(resultados.length?'Abrir ajustes encontrados: ':'Nenhum ajuste encontrado. Tente horários, mensagens ou backup.'));
                resultados.forEach(button=>{const resultado=document.createElement('button');resultado.type='button';resultado.className='btn-secondary';resultado.textContent=button.textContent.trim();resultado.addEventListener('click',()=>{
                    abrirAba(button.dataset.configTab);
                    if(button.dataset.configTab==='online'&&/cor|aparencia/.test(termo))abrirAba('aparencia');
                    else if(button.dataset.configTab==='online')window.KineSysConfiguracoesAgendaOnlineLayout?.showStage?.(/ausencia/.test(termo)?'ausencias':/horario|intervalo/.test(termo)?'horarios':/servico|procedimento/.test(termo)?'servicos':'geral');
                });statusBusca.append(resultado);});
            }
        });
        tabs.insertAdjacentHTML('afterend', '<p id="ks_config_busca_status" role="status" aria-live="polite"></p>');

        ligarEventosOnline();
        ligarEventosAparencia();
        state.montado = true;
        // Reutiliza os ícones do próprio produto, sem outro pacote ou desenhos paralelos.
        const decorarAbas = () => {
            const origem = {clinica:'tela_home',online:'tela_agenda',equipe:'tela_equipe',mensagens:'tela_evolucao',documentos:'tela_relatorio',integracoes:'tela_configuracoes',dados:'tela_midias'};
            CONFIG_AREAS.forEach(([id]) => {
                const icon = document.querySelector(`[data-tela-menu="${origem[id]}"] .ks-nav-icon`);
                const tab = document.getElementById(`ks_config_tab_${id}`);
                if (icon && !tab?.querySelector('.ks-nav-icon')) tab?.prepend(icon.cloneNode(true));
            });
        };
        decorarAbas();
        document.addEventListener('kinesys:design-ready', decorarAbas);
        return true;
    }

    function markupIntegracoes() {
        // Ícones de marca incorporados: Simple Icons e favicon oficial do Google Calendar.
        // Não há consulta a terceiros ao abrir as configurações.
        const marcas = ['data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMUU3NTZGIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+V2hhdHNBcHA8L3RpdGxlPjxwYXRoIGQ9Ik0xNy40NzIgMTQuMzgyYy0uMjk3LS4xNDktMS43NTgtLjg2Ny0yLjAzLS45NjctLjI3My0uMDk5LS40NzEtLjE0OC0uNjcuMTUtLjE5Ny4yOTctLjc2Ny45NjYtLjk0IDEuMTY0LS4xNzMuMTk5LS4zNDcuMjIzLS42NDQuMDc1LS4yOTctLjE1LTEuMjU1LS40NjMtMi4zOS0xLjQ3NS0uODgzLS43ODgtMS40OC0xLjc2MS0xLjY1My0yLjA1OS0uMTczLS4yOTctLjAxOC0uNDU4LjEzLS42MDYuMTM0LS4xMzMuMjk4LS4zNDcuNDQ2LS41Mi4xNDktLjE3NC4xOTgtLjI5OC4yOTgtLjQ5Ny4wOTktLjE5OC4wNS0uMzcxLS4wMjUtLjUyLS4wNzUtLjE0OS0uNjY5LTEuNjEyLS45MTYtMi4yMDctLjI0Mi0uNTc5LS40ODctLjUtLjY2OS0uNTEtLjE3My0uMDA4LS4zNzEtLjAxLS41Ny0uMDEtLjE5OCAwLS41Mi4wNzQtLjc5Mi4zNzItLjI3Mi4yOTctMS4wNCAxLjAxNi0xLjA0IDIuNDc5IDAgMS40NjIgMS4wNjUgMi44NzUgMS4yMTMgMy4wNzQuMTQ5LjE5OCAyLjA5NiAzLjIgNS4wNzcgNC40ODcuNzA5LjMwNiAxLjI2Mi40ODkgMS42OTQuNjI1LjcxMi4yMjcgMS4zNi4xOTUgMS44NzEuMTE4LjU3MS0uMDg1IDEuNzU4LS43MTkgMi4wMDYtMS40MTMuMjQ4LS42OTQuMjQ4LTEuMjg5LjE3My0xLjQxMy0uMDc0LS4xMjQtLjI3Mi0uMTk4LS41Ny0uMzQ3bS01LjQyMSA3LjQwM2gtLjAwNGE5Ljg3IDkuODcgMCAwMS01LjAzMS0xLjM3OGwtLjM2MS0uMjE0LTMuNzQxLjk4Mi45OTgtMy42NDgtLjIzNS0uMzc0YTkuODYgOS44NiAwIDAxLTEuNTEtNS4yNmMuMDAxLTUuNDUgNC40MzYtOS44ODQgOS44ODgtOS44ODQgMi42NCAwIDUuMTIyIDEuMDMgNi45ODggMi44OThhOS44MjUgOS44MjUgMCAwMTIuODkzIDYuOTk0Yy0uMDAzIDUuNDUtNC40MzcgOS44ODQtOS44ODUgOS44ODRtOC40MTMtMTguMjk3QTExLjgxNSAxMS44MTUgMCAwMDEyLjA1IDBDNS40OTUgMCAuMTYgNS4zMzUuMTU3IDExLjg5MmMwIDIuMDk2LjU0NyA0LjE0MiAxLjU4OCA1Ljk0NUwuMDU3IDI0bDYuMzA1LTEuNjU0YTExLjg4MiAxMS44ODIgMCAwMDUuNjgzIDEuNDQ4aC4wMDVjNi41NTQgMCAxMS44OS01LjMzNSAxMS44OTMtMTEuODkzYTExLjgyMSAxMS44MjEgMCAwMC0zLjQ4LTguNDEzWiIvPjwvc3ZnPg==', 'data:image/x-icon;base64,AAABAAEAICAAAAEAIAAoEQAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAAAAAABMLAAATCwAAAAAAAAAAAAA1gBUwOIAY3ziAGP84gBj/OIAY/ziAGP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/zZC6YAAAAAAAAAAAAAAAAAAAAAAAAAAADeAF+84gBj/OIAY/ziAGP84gBj/OIAY/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/NUPq/zZC6YAAAAAAAAAAAAAAAAAAAAAAOIAY/ziAGP84gBj/OIAY/ziAGP84gBj/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP81Q+r/NUPq/zZC6YAAAAAAAAAAAAAAAAA4gBj/OIAY/ziAGP84gBj/OIAY/ziAGP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/zVD6v81Q+r/NUPq/zZC6YAAAAAAAAAAADiAGP84gBj/OIAY/ziAGP84gBj/OIAY/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/NUPq/zVD6v81Q+r/NUPq/zZC6YAAAAAAOIAY/ziAGP84gBj/OIAY/ziAGP84gBj/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP9TqDT/U6g0/1OoNP81Q+r/NUPq/zVD6v81Q+r/NUPq/zZC6YD0hUL/9IVC//SFQv/0hUL/9IVC//SFQv///////////////////////////////////////////////////////////////////////////////////////////////////////////wS8+/8EvPv/BLz7/wS8+/8EvPv/BLz7//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC////////////////////////////////////////////////////////////////////////////////////////////////////////////BLz7/wS8+/8EvPv/BLz7/wS8+/8EvPv/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL///////////////////////////////////////////////////////////////////////////////////////////////////////////8EvPv/BLz7/wS8+/8EvPv/BLz7/wS8+//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/////////////////57OL/7sao/92NU//djVP/46Bv//TZxf/////////////////////////////////os4z/67ya/////////////////wS8+/8EvPv/BLz7/wS8+/8EvPv/BLz7//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC////////////+ezi/9d6Nv/SZxn/0mcZ/9JnGf/SZxn/0mcZ/+/Gqf///////////////////////////9JnGf/Yejb/////////////////BLz7/wS8+/8EvPv/BLz7/wS8+/8EvPv/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL////////////djVL/0mcZ/9qDRP/349T/+uzj/+izjP/SZxn/0mcZ//ns4v//////////////////////0mcZ/9h6Nv////////////////8EvPv/BLz7/wS8+/8EvPv/BLz7/wS8+//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv///////////9h6Nv/SZxn//PXx/////////////////+CWYf/SZxn/8dC3///////////////////////SZxn/2Ho2/////////////////wS8+/8EvPv/BLz7/wS8+/8EvPv/BLz7//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//////////////////rs4///////////////////////5al+/9JnGf/uxqn//////////////////////9JnGf/Yejb/////////////////BLz7/wS8+/8EvPv/BLz7/wS8+/8EvPv/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL///////////////////////////////////////ns4v/Xejb/0mcZ//TZxf//////////////////////0mcZ/9h6Nv////////////////8EvPv/BLz7/wS8+/8EvPv/BLz7/wS8+//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv///////////////////////////+Ogb//gl2H/13o2/9JnGf/os4z////////////////////////////SZxn/2Ho2/////////////////wS8+/8EvPv/BLz7/wS8+/8EvPv/BLz7//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC////////////////////////////0mcZ/9JnGf/SZxn/3Y1S/////////////////////////////////9JnGf/Yejb/////////////////BLz7/wS8+/8EvPv/BLz7/wS8+/8EvPv/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL////////////////////////////67OP/9+PU/+Kgb//SZxn/6bOM/////////////PXx////////////0mcZ/9h6Nv////////////////8EvPv/BLz7/wS8+/8EvPv/BLz7/wS8+//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv///////////////////////////////////////////9JnGf/Xejb////////////djVL/9NnF///////SZxn/2Ho2/////////////////wS8+/8EvPv/BLz7/wS8+/8EvPv/BLz7//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC////////////6LOM/92NU//57OL/////////////////1XEn/9JnGf///////////9uDRP/SZxn/6bOM/9JnGf/Yejb/////////////////BLz7/wS8+/8EvPv/BLz7/wS8+/8EvPv/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL////////////rvJv/0mcZ/9qDRP/02cX/9+PT/+apfv/SZxn/3Y1S////////////9uPT/9h6Nv/SZxn/0mcZ/9h6Nv////////////////8EvPv/BLz7/wS8+/8EvPv/BLz7/wS8+//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/////////////////djVL/0mcZ/9JnGf/SZxn/0mcZ/9h6Nv/349P//////////////////PXx/+Wpfv/SZxn/2Ho2/////////////////wS8+/8EvPv/BLz7/wS8+/8EvPv/BLz7//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC///////////////////////uxqn/46Bv/+Ogb//rvZr/+ezi//////////////////////////////////HPt//xz7j/////////////////BLz7/wS8+/8EvPv/BLz7/wS8+/8EvPv/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL///////////////////////////////////////////////////////////////////////////////////////////////////////////8EvPv/BLz7/wS8+/8EvPv/BLz7/wS8+//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv///////////////////////////////////////////////////////////////////////////////////////////////////////////wS8+/8EvPv/BLz7/wS8+/8EvPv/BLz7//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC////////////////////////////////////////////////////////////////////////////////////////////////////////////BLz7/wS8+/8EvPv/BLz7/wS8+/8EvPv/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/SZxn/0mcZ/9JnGf/SZxn/0mcZ/9JnGf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC/9JnGf/SZxn/0mcZ/9JnGf/SZxn/0mcZ//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/0mcZ/9JnGf/SZxn/0mcZ/9JnGf/SZxn/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/SZxn/0mcZ/9JnGf/SZxn/0mcZ/9JnGf/0hULf9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC/9JnGf/SZxn/0mcZ/9JnGf/SZxn/0mcZv/eGQF/zhULv9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/0mcZ/9JnGf/SZxn/0mcZ/9JnGb/PaBggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='];
        return `<div class="ks-config-integrations">${[
            ['WhatsApp Business API', 'Envio automático requer implantação.', 'Será necessário definir um provedor oficial, consentimentos, permissões e custos antes da ativação. Nenhuma mensagem é enviada por esta tela.'],
            ['Google Calendar', 'Sincronização da agenda.', 'Será necessário autorizar a conta Google e definir o sentido da sincronização, dados compartilhados e tratamento de conflitos. Nenhum acesso foi concedido.']
        ].map(([nome, descricao, requisitos], index) => `<details class="ks-config-integration"><summary><img src="${marcas[index]}" width="30" height="30" alt=""><span><strong>${nome}</strong><small>Planejada · ${descricao}</small></span><span class="ks-config-requirements">Ver requisitos</span></summary><p>${requisitos}</p></details>`).join('')}</div>`;
    }

    function ligarEventosAparencia() {
        document.querySelectorAll('[id^="ks_agenda_cor_"]').forEach(input => {
            if (input.type !== 'color') return;
            input.addEventListener('input', () => {
                const tipo = input.id.replace('ks_agenda_cor_', '');
                const valor = document.getElementById(`${input.id}_valor`);
                if (valor) valor.textContent = input.value.toUpperCase();
                const previa = document.querySelector(`[data-preview-cor="${tipo}"]`);
                if (previa) previa.style.setProperty('--preview-color', input.value);
            });
        });
        document.getElementById('ks_agenda_cores_salvar')?.addEventListener('click', salvarCoresCompartilhadas);
        document.getElementById('ks_agenda_cores_restaurar')?.addEventListener('click', () => {
            preencherCoresAgenda(AGENDA_CORES_PADRAO);
            document.querySelectorAll('[data-cor-procedimento]').forEach(input => { input.value = AGENDA_CORES_PADRAO[/osteo/i.test(input.getAttribute('aria-label')) ? 'osteopatia' : 'fisioterapia']; input.dispatchEvent(new Event('input', {bubbles:true})); });
        });
        preencherCoresAgenda();
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
            const anterior = state.profissionalSelecionado;
            if (!capturarHorariosProfissionalAtual()) {
                evento.target.value = anterior;
                return;
            }
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
                const card = remover.closest('[data-dia-card]');
                remover.closest('.ks-online-time-row')?.remove();
                capturarHorariosProfissionalAtual();
                marcarSujo();
                atualizarEstadoDia(card);
            }
        });
        document.getElementById('ks_online_horarios')?.addEventListener('change', () => { capturarHorariosProfissionalAtual(); marcarSujo(); });
        document.getElementById('ks_online_salvar')?.addEventListener('click', salvarTudo);
    }

    function abrirAba(nome = 'mensagens') {
        if (!montarHub()) return;
        const aba = [...CONFIG_AREAS.map(([id]) => id), 'aparencia'].includes(nome) ? nome : 'mensagens';
        const online = aba === 'online';
        const aparencia = aba === 'aparencia';
        const mensagens = aba === 'mensagens';
        const painelAparencia = document.getElementById('ks_config_panel_aparencia');
        painelAparencia.hidden = !aparencia;
        CONFIG_AREAS.forEach(([id]) => {
            const active = id === aba || (id === 'online' && aparencia);
            const tab = document.getElementById(`ks_config_tab_${id}`);
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            const panel = document.getElementById(`ks_config_panel_${id}`);
            panel.hidden = id !== aba;
        });
        try { sessionStorage.setItem('kinesys_config_tab', aba); } catch (_) {}

        if (online) carregar(false);
        else if (aparencia) { preencherCoresAgenda(); renderizarCoresProcedimentos(); carregar(false); }
        else if (mensagens && typeof window.abrirConfiguracoesMensagens === 'function') window.abrirConfiguracoesMensagens();
        else if (['clinica','documentos'].includes(aba)) carregar(false);
        window.KineSysConfiguracoesAgendaOnlineLayout?.showPage?.(aba);
    }

    async function onOpen() {
        if (!ehAdministrador()) return;
        if (!montarHub()) return;
        let aba = 'mensagens';
        try { aba = sessionStorage.getItem('kinesys_config_tab') || 'mensagens'; } catch (_) {}
        abrirAba(aba);
    }

    async function carregar(forcar = false) {
        if (!ehAdministrador() || state.carregando || (state.carregado && !forcar)) return;
        const client = sb();
        if (!client) {
            state.erroCarga=true;renderizarCoresProcedimentos();
            setStatus('Serviço indisponível. Recarregue a página e tente novamente.', 'erro');
            return;
        }

        state.carregando = true;
        state.erroCarga=false;
        renderizarCoresProcedimentos();
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
            const cores = cfgRes.data?.cores_agenda;
            if (cores && Object.keys(cores).length) {
                try {
                    localStorage.setItem(chaveCoresProcedimentos(), JSON.stringify(cores.procedimentos || {}));
                    localStorage.setItem(chaveCoresAgenda(), JSON.stringify(Object.fromEntries(Object.keys(AGENDA_CORES_PADRAO).map(tipo => [tipo, corHexValida(cores[tipo]) ? cores[tipo] : AGENDA_CORES_PADRAO[tipo]]))));
                } catch (_) {}
            }
            preencherCoresAgenda();
            renderizarCoresProcedimentos();
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
            state.erroCarga=true;
            console.error('KineSys: erro ao carregar configuração de agendamento online', err);
            const mensagem = /column|schema cache|does not exist|not found/i.test(String(err?.message || err))
                ? 'A estrutura administrativa do agendamento online ainda não está disponível no banco.'
                : `Não foi possível carregar a configuração: ${err?.message || err}`;
            setStatus(mensagem, 'erro');
        } finally {
            state.carregando = false;
            renderizarCoresProcedimentos();
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
        capturarHorariosProfissionalAtual();
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

    function estadoPublicacaoAtual() {
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

    function atualizarResumoPublicacao() {
        const ativo = !!document.getElementById('ks_online_ativo')?.checked;
        const publicacao = estadoPublicacaoAtual();
        const profCount = publicacao.profissionais.length;
        const procCount = publicacao.procedimentos.length;
        const horarios = publicacao.horarios.length;
        const completo = profCount > 0 && procCount > 0 && horarios > 0 && !publicacao.procedimentoIncompativel;
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
        const publicacao = estadoPublicacaoAtual();
        if (!publicacao.profissionais.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um profissional.', id: 'ks_online_sec_profissionais' };
        if (!publicacao.procedimentos.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um procedimento.', id: 'ks_online_sec_procedimentos' };
        if (publicacao.procedimentoIncompativel) return { ok: false, msg: `O procedimento “${publicacao.procedimentoIncompativel.nome || 'selecionado'}” não possui profissional publicado com horário online compatível.`, id: 'ks_online_sec_procedimentos' };
        if (!publicacao.horarios.length) return { ok: false, msg: 'Para abrir o portal, publique pelo menos um período para um profissional publicado.', id: 'ks_online_sec_horarios' };
        return { ok: true };
    }

    function chaveHorario(x) {
        return [String(x.profissional_id), Number(x.dia_semana), String(x.hora_inicio).slice(0, 5), String(x.hora_fim).slice(0, 5)].join('|');
    }

    async function salvarConfiguracaoPortal(client, cfg) {
        const { error } = await client.from('configuracoes_agendamento_online')
            .upsert(cfg, { onConflict: 'clinica_id' });
        if (error) throw error;
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
            // Fail-safe: alterações estruturais persistem com o portal fechado.
            // A ativação volta somente depois de todas as dependências salvarem.
            await salvarConfiguracaoPortal(client, { ...cfg, ativo: false });

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

            if (cfg.ativo) await salvarConfiguracaoPortal(client, cfg);

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
        refresh: () => carregar(true),
        lerCoresAgenda,
        salvarCoresAgenda,
        salvarCoresCompartilhadas,
        renderizarCoresProcedimentos,
        async refreshProcedures() {
            const clinicaId = await resolverClinicaId();
            const {data,error} = await sb().from('procedimentos').select('id,nome,duracao_minutos,valor,profissionais_ids,ativo,agendamento_online_ativo').eq('clinica_id',clinicaId).eq('ativo',true).order('nome');
            if (error) throw error;
            if (String(clinicaId) !== String(state.clinicaId)) return;
            const anteriores = new Map(state.procedimentos.map(p => [String(p.id), p]));
            state.procedimentos = (data || []).map(p => {
                const anterior = anteriores.get(String(p.id));
                return { ...p,
                    agendamento_online_ativo: anterior ? anterior.agendamento_online_ativo : !!p.agendamento_online_ativo,
                    _onlineOriginal: anterior ? anterior._onlineOriginal : !!p.agendamento_online_ativo
                };
            });
            renderizarProcedimentos();
            renderizarCoresProcedimentos();
            atualizarResumoPublicacao();
        }
    });
})();
