/* Model 2 presentation only. Move existing nodes: never recreate patient controls,
 * camera listeners, folder handles, import inputs or clinical records. */
(function () {
    'use strict';
    function prepare() {
        const screen = document.getElementById('tela_midias');
        if (!screen || screen.dataset.documentsLayout) return;
        const hero = screen.querySelector('.midia-hero-card');
        const gallery = document.getElementById('midia_galeria')?.closest('.card');
        const settings = document.getElementById('camera_settings');
        const folder = document.getElementById('camera_choose')?.closest('.camera-setting');
        const connection = document.getElementById('camera_start')?.closest('.camera-setting');
        if (!hero || !gallery || !settings || !folder || !connection) return;
        screen.dataset.documentsLayout = '2';
        screen.classList.add('documents-model2');
        const element = (tag, cls, text) => {
            const el = document.createElement(tag); el.className = cls;
            if (text) el.textContent = text;
            return el;
        };
        const libraryIcon = name => {
            const img = element('img', 'documents-icon');
            img.src = 'assets/vendor/tabler/' + name + '.svg'; img.alt = ''; img.setAttribute('aria-hidden', 'true');
            return img;
        };
        const title = gallery.querySelector('h2');
        title.textContent = 'Arquivos do prontuário';
        gallery.classList.add('documents-files');
        const subtitle = element('p', 'documents-description', 'Fotos, documentos e anexos vinculados ao prontuário selecionado.');
        title.parentElement.append(subtitle);
        const patient = document.getElementById('midia_paciente_select').closest('.input-group');
        const role = document.getElementById('midia_perfil_aviso');
        const legacy = settings.querySelector('.camera-legacy');
        // Keep legacy controls and their status available, without putting them in
        // the primary camera flow or claiming the legacy service is connected.
        const legacyBody = settings.querySelector('.midia-settings-body');
        for (const node of hero.querySelectorAll('.midia-local-info,.midia-helper,#midia_status_local')) legacyBody.append(node);
        hero.classList.add('documents-patient');
        const filters = gallery.querySelector('.midia-filterbar');
        const tabs = element('div', 'documents-tabs');
        tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Categoria dos arquivos');
        for (const [value, text] of [['all','Todos'],['photos','Fotos'],['documents','Documentos']]) {
            const button = element('button', 'documents-tab', text);
            button.type = 'button'; button.dataset.mediaCategory = value;
            button.setAttribute('aria-pressed', String(value === 'all'));
            button.addEventListener('click', () => {
                screen.dataset.mediaCategory = value;
                tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
                window.renderizarGaleriaMidias();
            });
            tabs.append(button);
        }
        const toolbar = element('div', 'documents-toolbar');
        const importButton = document.getElementById('btn_importar_documento_pc');
        importButton.textContent = 'Importar arquivo';
        const compareButton = document.getElementById('midia_btn_comparar');
        compareButton.textContent = 'Comparar fotos';
        toolbar.append(tabs, importButton, compareButton);
        filters.before(toolbar);
        const advanced = element('details', 'documents-advanced');
        advanced.append(element('summary', '', 'Filtros e opções de importação'), filters,
            document.getElementById('midia_import_tipo'), document.getElementById('midia_import_input'));
        toolbar.after(advanced);
        const status = document.getElementById('midia_capture_status');
        advanced.append(status);
        const captureShortcut = document.getElementById('btn_captura_iphone');
        captureShortcut.onclick = () => { document.getElementById('camera_start').focus(); };
        advanced.append(captureShortcut);
        advanced.append(role);
        hero.replaceChildren(patient);
        const aside = element('aside', 'documents-aside');
        aside.setAttribute('aria-label', 'Captura e armazenamento');
        const panel = element('section', 'documents-capture');
        panel.append(element('h2', '', 'Capturar com iPhone'), element('p', 'documents-capture-intro', 'Fotografe e receba no prontuário.'));
        panel.querySelector('h2').prepend(libraryIcon('device-mobile'));
        const empty = element('div', 'documents-qr-empty');
        empty.append(element('strong', '', 'Conecte a câmera do iPhone'), element('p', '', 'Selecione o paciente e a pasta dos originais. Depois, gere um QR code para iniciar.'));
        const pair = document.getElementById('camera_pair');
        panel.append(empty, pair);
        pair.querySelector('strong').textContent = 'Escaneie com a câmera do iPhone';
        pair.querySelector('p').textContent = 'Conexão válida por 10 minutos. Confira o paciente antes de fotografar.';
        connection.querySelector('h3').remove();
        connection.querySelector('label').textContent = 'Tipo de registro';
        panel.append(connection, document.getElementById('camera_status'));
        const folderCard = element('section', 'card documents-folder');
        folder.querySelector('h3').textContent = 'Originais neste computador';
        folder.querySelector('h3').prepend(libraryIcon('folder'));
        folder.querySelector('#camera_choose').textContent = 'Alterar pasta';
        const folderRow = element('div', 'documents-folder-row');
        folderRow.append(folder.querySelector('#camera_folder'), folder.querySelector('#camera_choose'));
        folder.querySelector('h3').after(element('p', 'documents-description', 'Os arquivos originais das fotos e documentos ficam salvos nesta pasta.'), folderRow);
        folderCard.append(folder, element('p', 'documents-cloud-note', 'Somente miniaturas e os dados do registro são salvos no Supabase.'));
        const safety = element('details', 'documents-safety');
        safety.append(element('summary', '', 'Permissões, sincronização e backup'), document.getElementById('camera_retry'));
        safety.append(connection.querySelector('.helper-text'), folder.querySelector('.helper-text'));
        safety.append(element('p', '', 'Mantenha esta aba e o computador abertos durante a captura. Trocar a pasta não move arquivos anteriores. Faça backup dos originais; em outro computador, somente as miniaturas estarão disponíveis.'));
        folderCard.append(safety);
        // Preserve the stable id used by existing camera/CSS code, not the old
        // collapsed details wrapper that used to hide every capture control.
        settings.removeAttribute('id');
        aside.id = 'camera_settings';
        aside.append(panel, folderCard);
        const workspace = element('div', 'documents-workspace');
        workspace.append(gallery, aside);
        screen.append(workspace, legacy);
        settings.remove();
        const observed = new MutationObserver(() => {
            const active = !pair.hidden;
            empty.hidden = active;
            document.getElementById('camera_start').textContent = active ? 'Gerar novo QR code' : 'Gerar QR code';
        });
        observed.observe(pair, { attributes: true, attributeFilter: ['hidden'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, { once: true });
    else prepare();
})();
