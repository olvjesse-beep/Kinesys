/* KineSys — Configurações > Agenda: workspace operacional 1.0.0 */
(() => {
    'use strict';

    const VERSION = '1.0.0';
    const ASSET_REVISION = '20261016-config-paginas-r1';
    const STYLE_PATH = 'styles/configuracoes_agendamento_online_layout-1.0.0.css';
    const GLASS_STYLE_PATH = 'styles/navigation_glass-1.0.0.css';
    const STORAGE_KEY = 'kinesys_online_config_stage';

    const STAGES = Object.freeze([
        { id: 'geral', label: 'Agendamento online', sections: ['ks_online_sec_publicacao'] },
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
    let paginasMontadas = false;
    let equipeOrigem = null;
    let equipeNos = [];
    let documentosPerfis = [];

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
            tab.setAttribute('aria-label', 'Agenda e serviços');
        }

        const headerCopy = document.querySelector('#tela_configuracoes .ks-config-hub-header p');
        if (headerCopy) headerCopy.textContent = 'Controle da clínica, comunicação e conexões.';

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
        </div><button type="button" class="btn-secondary ks-config-colors-link" data-config-destino="aparencia">Aparência da agenda · Cores dos atendimentos</button>`;
    }

    const AREAS = Object.freeze({
        clinica: {titulo:'Clínica', itens:[['identidade','Identidade da clínica'],['contato','Contato e endereço'],['publico','Presença pública']]},
        equipe: {titulo:'Equipe', itens:[['profissionais','Profissionais'],['registros','Registros profissionais'],['acessos','Perfis de acesso']]},
        documentos: {titulo:'Documentos', itens:[['assinatura','Identificação e assinatura'],['clinica','Dados da clínica'],['relatorios','Documentos e relatórios']]},
        integracoes: {titulo:'Integrações', itens:[['geral','Visão geral'],['whatsapp','WhatsApp'],['google','Google Calendar']]},
        dados: {titulo:'Dados e segurança', itens:[['backup','Backup e restauração'],['acessos','Acessos da equipe'],['inventario','Informações dos dados']]}
    });

    function contextoArea(id, itens) {
        const nav = document.createElement('nav');
        nav.className = 'ks-config-context';
        nav.setAttribute('aria-label', `Seções de ${AREAS[id]?.titulo || 'Agenda e serviços'}`);
        nav.innerHTML = itens.map(([key,label],index) => `<button type="button" data-config-context="${id}:${key}" aria-current="${index ? 'false' : 'page'}">${label}</button>`).join('');
        nav.querySelectorAll('button').forEach(button => {
            const icon = document.querySelector(`#ks_config_tab_${id === 'agenda' ? 'online' : id} .ks-nav-icon`)?.cloneNode(true);
            if (icon) button.prepend(icon);
        });
        return nav;
    }

    function prepararPaginas() {
        if (paginasMontadas) return;
        const root = document.getElementById('tela_configuracoes');
        if (!root) return;
        const identidade = document.getElementById('ks_online_sec_identidade_publica');
        if (!identidade) return;
        Object.entries(AREAS).forEach(([id,area]) => {
            const panel = document.getElementById(`ks_config_panel_${id}`);
            if (!panel) return;
            const existentes = [...panel.children];
            const body = document.createElement('div');
            body.className = 'ks-config-page-content';
            body.id = `ks_config_content_${id}`;
            panel.classList.add('ks-config-dedicated-page');
            panel.append(contextoArea(id,area.itens),body);
            if (id === 'dados') {
                existentes.forEach(el => body.appendChild(el));
                const card = body.querySelector('.ks-data-governance-card');
                const actions = card?.querySelector('.ks-data-actions');
                if (card && actions) {
                    const intro = card.querySelector('.card-header p');
                    if (intro) intro.textContent='Exporte e restaure cópias locais deste navegador. Isso não substitui um backup do banco de dados da clínica.';
                    const backup = document.createElement('section'); backup.className='ks-config-data-section';
                    backup.innerHTML='<h3>Exportar backup local</h3><p>Guarde o arquivo em local seguro: ele pode conter informações sensíveis.</p>';
                    backup.appendChild(document.getElementById('ks_dados_backup_btn'));
                    const restore = document.createElement('section'); restore.className='ks-config-data-section';
                    restore.innerHTML='<h3>Restaurar backup</h3><p>Selecione um arquivo JSON para análise antes de confirmar a restauração.</p><p id="ks_config_backup_file">Nenhum arquivo selecionado.</p>';
                    const input = document.getElementById('ks_dados_importar_input');
                    const picker = document.getElementById('ks_dados_importar_btn');
                    picker.textContent='Selecionar arquivo JSON';
                    restore.append(picker,input);
                    const analisar = document.createElement('button'); analisar.type='button'; analisar.className='btn-secondary'; analisar.disabled=true; analisar.textContent='Analisar arquivo';
                    input.removeAttribute('onchange');
                    input.addEventListener('change',()=>{ document.getElementById('ks_config_backup_file').textContent=input.files?.[0]?.name || 'Nenhum arquivo selecionado.'; analisar.disabled=!input.files?.length; });
                    analisar.addEventListener('click',()=>{ window.importarBackupDadosKineSys?.({target:input}); analisar.disabled=true; });
                    restore.appendChild(analisar);
                    restore.insertAdjacentHTML('beforeend','<p class="ks-config-restore-warning">A restauração exige revisão e confirmação. A nuvem não será alterada.</p>');
                    actions.before(backup,restore);
                    const avancado = document.createElement('details'); avancado.id='ks_config_data_advanced';
                    avancado.innerHTML='<summary>Informações dos dados e ferramentas de migração</summary>';
                    [...card.children].filter(el=>!el.classList.contains('card-header') && el!==backup && el!==restore).forEach(el=>avancado.appendChild(el));
                    card.appendChild(avancado);
                }
            }
            else if (id === 'integracoes') {
                existentes.forEach(el => body.appendChild(el));
                const heading = body.querySelector('h2'); const copy = body.querySelector('p');
                if (heading && copy) { const header=document.createElement('header'); header.className='ks-config-page-heading'; heading.before(header); heading.textContent='Integrações da clínica'; copy.textContent='Veja o que está disponível e o que exige configuração adicional.'; header.append(heading,copy); }
                const logo = body.querySelector('details img')?.cloneNode(true);
                const manual = document.createElement('section'); manual.className='ks-config-manual-integration';
                manual.innerHTML='<div><h3>WhatsApp — envio manual</h3><p>Disponível · Abre a mensagem para revisão e envio pela equipe.</p></div><button type="button" class="btn-primary" data-config-open-messages>Configurar mensagens</button>';
                if (logo) manual.prepend(logo);
                body.querySelector('.ks-config-integrations')?.before(manual);
                body.insertAdjacentHTML('beforeend','<p class="ks-config-integration-note">Nenhuma conta externa é conectada sem autorização.</p>');
            }
            else existentes.forEach(el => el.remove());
            if (id === 'clinica') {
                body.innerHTML = '<header class="ks-config-page-heading"><h2>Identidade da clínica</h2><p>Organize os dados usados para apresentar a clínica aos pacientes.</p></header>';
                body.appendChild(identidade);
                identidade.hidden = false;
                body.insertAdjacentHTML('beforeend','<section class="ks-config-clinic-preview" id="ks_config_clinic_preview"><h3>Como será exibido para os pacientes</h3><strong id="ks_config_clinic_name"></strong><p id="ks_config_clinic_contact"></p></section>');
                body.insertAdjacentHTML('beforeend','<div class="ks-config-page-footer"><output id="ks_clinica_feedback" role="status" aria-live="polite"></output><button class="btn-primary" type="button" data-config-save-clinic>Salvar dados da clínica</button></div>');
            }
            if (id === 'equipe') {
                body.innerHTML = '<header class="ks-config-page-heading ks-config-page-heading-actions"><div><h2>Profissionais da clínica</h2><p>Organize profissionais, registros e vínculos sem duplicar cadastros.</p></div><button class="btn-primary" type="button" data-config-add-team>Adicionar profissional</button></header><label class="ks-config-team-search">Buscar profissional<input type="search" id="ks_config_team_search" placeholder="Digite o nome do profissional"></label><div id="ks_config_team_form" hidden></div><div id="ks_config_team_list"></div><p class="field-help">As permissões são definidas por perfil. Revise os vínculos antes de salvar alterações.</p>';
            }
            if (id === 'documentos') {
                body.innerHTML = '<header class="ks-config-page-heading"><h2>Identificação nos documentos</h2><p>Confira os dados da clínica e do profissional responsável.</p></header><div class="ks-config-document-grid"><div><label for="ks_config_doc_profissional">Profissional responsável</label><select id="ks_config_doc_profissional"><option value="">Carregando profissionais…</option></select><p id="ks_config_doc_registro" class="field-help"></p><button type="button" class="btn-secondary" data-config-open-team>Editar cadastro profissional</button><hr><h3>Clínica</h3><p id="ks_config_doc_clinica"></p><button type="button" class="btn-secondary" data-config-open-clinic>Editar dados da clínica</button></div><section class="ks-config-document-preview" aria-label="Prévia ilustrativa"><p>Prévia ilustrativa</p><p id="ks_config_doc_data"></p><div class="ks-config-signature"><p id="ks_config_doc_nome"></p><p id="ks_config_doc_registro_preview"></p></div></section></div><footer class="ks-config-page-footer"><p>O conteúdo clínico do relatório continua sendo definido na avaliação.</p><button type="button" class="btn-primary" data-config-open-reports>Abrir documentos e relatórios</button></footer>';
            }
        });
        // Mensagens: mantém todos os controles e handlers; muda apenas a composição.
        const mensagens = document.getElementById('ks_config_panel_mensagens');
        const comunicacao = mensagens?.querySelector('.ks-config-communication');
        const lista = document.getElementById('cfg_msg_lista');
        if (comunicacao && lista) {
            mensagens.classList.add('ks-config-dedicated-page');
            const nav = document.createElement('nav'); nav.className = 'ks-config-context'; nav.setAttribute('aria-label','Modelos de mensagens');
            lista.dataset.paginaDedicada='1';
            nav.appendChild(lista); mensagens.prepend(nav);
            const titulo = comunicacao.querySelector('.ks-config-communication-heading h2');
            if (titulo) { titulo.id='ks_config_current_message_title'; titulo.textContent='Lembrete de sessão'; }
            comunicacao.classList.add('ks-config-page-content');
            comunicacao.querySelector('.ks-config-breadcrumb')?.remove();
            const regras = comunicacao.querySelector('.ks-config-communication-rules');
            if (regras) {
                const details = document.createElement('details'); details.className='ks-config-rules-details';
                details.innerHTML='<summary>Regras da comunicação</summary>';
                regras.before(details); details.appendChild(regras);
            }
            document.getElementById('ks_config_integracoes_resumo')?.remove();
        }
        const aparencia = document.getElementById('ks_config_panel_aparencia');
        aparencia?.querySelector('[data-config-voltar-agenda]')?.remove();
        aparencia?.classList.add('ks-config-dedicated-page');
        aparencia?.prepend(contextoArea('agenda',[['procedimentos','Procedimentos e cores'],['horarios','Horários e intervalos'],['ausencias','Ausências'],['geral','Agendamento online']]));
        aparencia?.querySelector('.ks-agenda-colors-shell')?.classList.add('ks-config-page-content');
        root.querySelector('.ks-config-tabs')?.insertAdjacentHTML('afterend','<p class="ks-config-page-breadcrumb" id="ks_config_page_breadcrumb">Configurações / Comunicação</p>');
        const falta = document.getElementById('ks_agenda_cor_falta')?.closest('.ks-agenda-color-field');
        if (falta) {
            const linha = document.createElement('section'); linha.className='ks-config-falta-row';
            linha.innerHTML='<div><h3>Cor para faltas</h3><p>A falta é um status e tem prioridade sobre a cor do procedimento.</p></div>';
            linha.appendChild(falta);
            document.getElementById('ks_cores_procedimentos')?.after(linha);
        }
        // Mover nós originais, não cloná-los: IDs, validadores e eventos permanecem únicos.
        equipeOrigem = document.getElementById('tela_equipe');
        equipeNos = equipeOrigem ? [...equipeOrigem.children] : [];
        const form = document.getElementById('ks_config_team_form');
        const listaEquipe = document.getElementById('ks_config_team_list');
        if (equipeNos[0]) form?.appendChild(equipeNos[0]);
        equipeNos.slice(1).forEach(el => listaEquipe?.appendChild(el));
        const refletirEquipe = () => {
            const emConfig = root.classList.contains('ativa');
            equipeNos.forEach((el,i) => { const destino = emConfig ? (i ? listaEquipe : form) : equipeOrigem; if (destino && el.parentElement !== destino) destino.appendChild(el); });
        };
        new MutationObserver(refletirEquipe).observe(root,{attributes:true,attributeFilter:['class']});
        refletirEquipe();
        document.getElementById('ks_config_team_search')?.addEventListener('input',evento => {
            const termo = evento.target.value.trim().toLocaleLowerCase('pt-BR');
            document.querySelectorAll('#lista_equipe_corpo tr').forEach(row => { row.hidden = !row.textContent.toLocaleLowerCase('pt-BR').includes(termo); });
        });
        listaEquipe?.addEventListener('click',evento => { if (evento.target.closest('button')) { if (form) form.hidden = false; } });
        root.addEventListener('input',evento => {
            if (evento.target.closest('#ks_config_content_clinica')) atualizarPreviaClinica();
            if (evento.target.matches('[data-cor-procedimento]')) {
                const texto = evento.target.parentElement.querySelector('span'); if (texto) texto.textContent = evento.target.value.toUpperCase();
                root.querySelector(`[data-preview-procedimento="${evento.target.dataset.corProcedimento}"]`)?.style.setProperty('--preview-color',evento.target.value);
            }
        });
        root.addEventListener('click',async evento => {
            const alvo = evento.target.closest('button'); if (!alvo) return;
            if (alvo.hasAttribute('data-config-save-clinic')) {
                alvo.disabled = true;
                try { await window.KineSysConfiguracoesAgendaOnlinePerfilPublico?.saveClinic?.(); }
                finally { alvo.disabled = false; }
                const feedback = document.getElementById('ks_online_v2_feedback');
                document.getElementById('ks_clinica_feedback').textContent = feedback?.textContent || '';
            }
            if (alvo.hasAttribute('data-config-add-team')) { window.limparFormularioEquipe?.(); if (form) form.hidden = false; document.getElementById('eq_nome')?.focus(); }
            if (alvo.hasAttribute('data-adicionar-procedimento') || alvo.dataset.editarProcedimento) {
                if (window.KineSysScreenLoader?.ensure) await window.KineSysScreenLoader.ensure('tela_agenda');
                if (typeof window.carregarProfissionaisAgenda === 'function') await window.carregarProfissionaisAgenda();
                if (typeof window.carregarProcedimentos === 'function') await window.carregarProcedimentos();
                window.abrirModalProcedimento?.(alvo.dataset.editarProcedimento || '');
            }
            if (alvo.hasAttribute('data-config-open-team')) window.KineSysConfiguracoesAgendaOnline?.abrirAba('equipe');
            if (alvo.hasAttribute('data-config-open-clinic')) window.KineSysConfiguracoesAgendaOnline?.abrirAba('clinica');
            if (alvo.hasAttribute('data-config-open-reports')) window.navegarPara?.('tela_relatorio');
            if (alvo.hasAttribute('data-config-open-messages')) window.KineSysConfiguracoesAgendaOnline?.abrirAba('mensagens');
            if (alvo.dataset.configContext) {
                const [area,key] = alvo.dataset.configContext.split(':');
                if (area === 'agenda') { window.KineSysConfiguracoesAgendaOnline?.abrirAba(key === 'procedimentos' ? 'aparencia' : 'online'); if (key !== 'procedimentos') mostrarStage(key); }
                else if (area === 'clinica') { showClinicSection(key); }
                else if (area === 'equipe') { if (key !== 'profissionais' && form) form.hidden = false; document.getElementById(key === 'acessos' ? 'eq_nivel_acesso' : key === 'registros' ? 'eq_tipo_registro' : 'ks_config_team_search')?.focus(); }
                else if (area === 'documentos') { if (key === 'clinica') window.KineSysConfiguracoesAgendaOnline?.abrirAba('clinica'); if (key === 'relatorios') window.navegarPara?.('tela_relatorio'); }
                else if (area === 'dados') { if (key === 'acessos') window.KineSysConfiguracoesAgendaOnline?.abrirAba('equipe'); else { if (key === 'inventario') document.getElementById('ks_config_data_advanced').open=true; document.getElementById(key === 'inventario' ? 'ks_dados_inventory' : 'ks_dados_backup_btn')?.scrollIntoView({block:'center',behavior:'smooth'}); } }
                else if (area === 'integracoes') { const id = key === 'google' ? 1 : 0; const detalhe = document.querySelectorAll('#ks_config_panel_integracoes details')[id]; if (detalhe && key !== 'geral') { detalhe.open = true; detalhe.scrollIntoView({block:'center',behavior:'smooth'}); } }
                alvo.closest('nav')?.querySelectorAll('button').forEach(button => button.setAttribute('aria-current',button === alvo ? 'page' : 'false'));
            }
        });
        document.getElementById('ks_config_doc_profissional')?.addEventListener('change',atualizarPreviaDocumentos);
        showClinicSection('identidade');
        paginasMontadas = true;
    }

    function atualizarPreviaClinica() {
        const nome=document.getElementById('ks_config_clinic_name'),contato=document.getElementById('ks_config_clinic_contact');
        if (nome) nome.textContent=document.getElementById('ks_online_v2_nome_publico')?.value || 'Nome público não informado';
        if (contato) contato.textContent=[document.getElementById('ks_online_v2_endereco')?.value,document.getElementById('ks_online_v2_telefone')?.value].filter(Boolean).join(' · ');
    }

    function showClinicSection(key='identidade') {
        const textos={identidade:['Identidade da clínica','Organize os dados usados para apresentar a clínica aos pacientes.'],contato:['Contato e endereço','Mantenha o endereço e o telefone público da clínica atualizados.'],publico:['Presença pública','Confira o link público e as orientações enviadas após o agendamento.']};
        const [titulo,descricao]=textos[key] || textos.identidade;
        const header=document.querySelector('#ks_config_content_clinica .ks-config-page-heading');
        if (header) { header.querySelector('h2').textContent=titulo; header.querySelector('p').textContent=descricao; }
        const campos={identidade:['ks_online_v2_nome_publico','ks_online_v2_endereco','ks_online_v2_telefone'],contato:['ks_online_v2_endereco','ks_online_v2_telefone'],publico:['ks_online_v2_slug','ks_online_v2_link','ks_online_v2_mensagem_confirmacao']};
        const ids=campos[key] || campos.identidade;
        const grid=document.querySelector('#ks_config_content_clinica .ks-online-v2-link-grid');
        if (grid) [...grid.children].forEach(el=>{ el.hidden=![...el.querySelectorAll('input,textarea')].some(input=>ids.includes(input.id)); });
        document.querySelectorAll('[data-config-context^="clinica:"]').forEach(button=>button.setAttribute('aria-current',button.dataset.configContext===`clinica:${key}`?'page':'false'));
        const preview=document.getElementById('ks_config_clinic_preview'); if(preview) preview.hidden=key==='publico';
        atualizarPreviaClinica();
    }

    function atualizarPreviaDocumentos() {
        const id = document.getElementById('ks_config_doc_profissional')?.value;
        const perfil = documentosPerfis.find(p => String(p.id) === id) || {};
        const set = (id,texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
        set('ks_config_doc_nome',perfil.nome || 'Profissional não selecionado');
        set('ks_config_doc_registro',perfil.registro || 'Registro profissional não informado. Confira o cadastro.');
        set('ks_config_doc_registro_preview',perfil.registro || 'Registro não informado');
        set('ks_config_doc_clinica',document.getElementById('ks_online_v2_nome_publico')?.value || 'Confira o cadastro da clínica.');
        const preview=document.querySelector('.ks-config-document-preview');
        if (preview && !document.getElementById('ks_config_doc_clinica_preview')) preview.querySelector('p')?.insertAdjacentHTML('afterend','<h3 id="ks_config_doc_clinica_preview"></h3>');
        set('ks_config_doc_clinica_preview',document.getElementById('ks_online_v2_nome_publico')?.value || 'Clínica');
        set('ks_config_doc_data',`Data de emissão: ${new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'numeric',month:'long',year:'numeric'})}`);
    }

    function decorarContextos() {
        document.querySelectorAll('#tela_configuracoes [data-config-context]').forEach(button => {
            if (button.querySelector('.ks-nav-icon')) return;
            const area = button.dataset.configContext.split(':')[0];
            const icon = document.querySelector(`#ks_config_tab_${area === 'agenda' ? 'online' : area} .ks-nav-icon`);
            if (icon) button.prepend(icon.cloneNode(true));
        });
        document.querySelectorAll('#cfg_msg_lista .ks-msg-template-item').forEach(button=>{
            if (button.querySelector('.ks-nav-icon')) return;
            const icon=document.querySelector('#ks_config_tab_mensagens .ks-nav-icon');
            if (icon) button.prepend(icon.cloneNode(true));
        });
    }

    async function showPage(aba) {
        prepararPaginas();
        decorarContextos();
        const label = document.getElementById(`ks_config_tab_${aba === 'aparencia' ? 'online' : aba}`)?.textContent?.trim() || 'Configurações';
        const bread = document.getElementById('ks_config_page_breadcrumb'); if (bread) bread.textContent = `Configurações / ${label}`;
        if (aba === 'equipe' && typeof window.carregarListaEquipe === 'function') await window.carregarListaEquipe();
        if (aba === 'clinica') atualizarPreviaClinica();
        if (aba === 'documentos') {
            try {
                const usuario = (typeof usuarioLogado !== 'undefined' && usuarioLogado) || window.usuarioLogado;
                const client = (typeof _supabase !== 'undefined' && _supabase) || window._supabase;
                if (!usuario?.clinica_id || !client) return;
                const {data,error} = await client.from('equipe').select('id,nome,registro,tipo').eq('clinica_id',usuario.clinica_id).eq('ativo',true).order('nome');
                if (error) throw error;
                documentosPerfis = data || [];
                const select = document.getElementById('ks_config_doc_profissional');
                if (select) { select.replaceChildren(...documentosPerfis.map(p => new Option(p.nome,p.id))); if (documentosPerfis.some(p => p.id === usuario.id)) select.value = usuario.id; }
                atualizarPreviaDocumentos();
            } catch (_) { const el = document.getElementById('ks_config_doc_registro'); if (el) el.textContent = 'Não foi possível carregar os registros. Tente reabrir esta página.'; }
        }
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
        prepararPaginas();
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
            let aba='mensagens'; try { aba=sessionStorage.getItem('kinesys_config_tab') || aba; } catch (_) {}
            showPage(aba);
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
    document.addEventListener('kinesys:design-ready', decorarContextos);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onOpen, { once: true });
    else onOpen();

    window.KineSysConfiguracoesAgendaOnlineLayout = Object.freeze({
        version: VERSION,
        onOpen,
        showPage,
        decorateContexts: decorarContextos,
        showClinicSection,
        refreshClinicPreview: atualizarPreviaClinica,
        showStage: mostrarStage
    });
})();
