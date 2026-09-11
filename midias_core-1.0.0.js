/* KineSys — Media Core 1.0.0
 * Extraído de script-1.18.0.js sem alterar nomes, fluxo clínico, persistência ou lifecycle.
 */
'use strict';

/* ========================================================================== 
   KINESYS v1.10 — KINESYS LOCAL / FOTOS CLÍNICAS
   Originais permanecem no Windows; Supabase recebe apenas metadados.
   ========================================================================== */
const KINESYS_LOCAL_URL = 'http://127.0.0.1:8765';
let kinesysLocalOnline = false;
let kinesysLocalStatus = null;
let midiasPacienteAtual = [];
let midiaComparacaoA = null;
let midiaComparacaoB = null;
let midiaPollTimer = null;
let midiaPollingCapturaSolicitado = false;
let kinesysLocalStatusTimer = null;
let midiaUltimaQuantidadeLocal = 0;
let midiaTabelaSupabaseDisponivel = true;

async function kinesysLocalFetch(path, options = {}, timeoutMs = 2200) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const headers = { ...(options.headers || {}) };
        if (options.body && typeof options.body !== 'string' && !(options.body instanceof Blob)) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            options.body = JSON.stringify(options.body);
        }
        const resp = await fetch(KINESYS_LOCAL_URL + path, { ...options, headers, signal: controller.signal, cache: 'no-store' });
        const text = await resp.text();
        let data = null;
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
        if (!resp.ok) throw new Error(data?.error || `KineSys Local respondeu ${resp.status}`);
        return data;
    } finally { clearTimeout(timer); }
}

function definirStatusKinesysLocal(online, texto) {
    kinesysLocalOnline = !!online;
    const box = document.getElementById('midia_status_local');
    if (!box) return;
    box.classList.toggle('online', !!online);
    box.classList.toggle('offline', !online);
    box.innerHTML = `<span class="midia-dot"></span>${escapeHTML(texto || (online ? 'KineSys Local conectado' : 'Serviço local não detectado'))}`;
}

async function verificarKinesysLocal(mostrarErro = false) {
    try {
        const st = await kinesysLocalFetch('/api/local-status', { method: 'GET' });
        kinesysLocalStatus = st;
        definirStatusKinesysLocal(true, 'KineSys Local conectado');
        const info = document.getElementById('midia_local_info');
        if (info) info.style.display = 'grid';
        const url = document.getElementById('midia_iphone_url'); if (url) url.textContent = st.iphone_url || '—';
        const code = document.getElementById('midia_pair_code'); if (code) code.textContent = st.pair_code || '—';
        const root = document.getElementById('midia_data_root'); if (root) root.textContent = st.data_root || '—';
        const backup = document.getElementById('midia_backup_resumo'); if (backup) backup.textContent = st.backup_root || 'Não configurado';
        const backupInput = document.getElementById('midia_backup_path'); if (backupInput && !backupInput.matches(':focus')) backupInput.value = st.backup_root || '';
        return st;
    } catch (err) {
        kinesysLocalStatus = null;
        definirStatusKinesysLocal(false, 'Serviço local não detectado');
        const info = document.getElementById('midia_local_info'); if (info) info.style.display = 'none';
        if (mostrarErro) alert('⚠️ O KineSys Local não está em execução neste Windows.\n\nAbra a pasta Windows_Local e execute "INICIAR_KINESYS_LOCAL.bat". Na primeira instalação, use "INSTALAR_KINESYS_LOCAL_ADMIN.bat".');
        return null;
    }
}

function perfilEhSecretaria() { return String(usuarioLogado?.tipo || '').toUpperCase() === 'SECRETARIA'; }
function tiposMidiaPermitidosParaPerfil() {
    if (perfilEhSecretaria()) return ['termo','identificacao','guia','exame','documento','outro_admin'];
    return ['avaliacao','evolucao','postura','ferida','edema','exame','termo','identificacao','guia','documento','outro','outro_admin'];
}
function configurarMidiasPorPerfil() {
    const secretaria = perfilEhSecretaria();
    const aviso = document.getElementById('midia_perfil_aviso');
    if (aviso) {
        aviso.style.display = 'block';
        aviso.className = 'midia-role-note ' + (secretaria ? 'administrativo' : 'clinico');
        aviso.textContent = secretaria
            ? 'Acesso administrativo: termos, identificação, guias, exames/laudos recebidos e documentos. Fotografias clínicas de avaliação/evolução permanecem restritas à equipe clínica.'
            : 'Acesso clínico: fotografias clínicas e documentos administrativos vinculados ao prontuário.';
    }
    const filtro = document.getElementById('midia_filtro_tipo');
    if (filtro) Array.from(filtro.options).forEach(opt => {
        if (!opt.value) { opt.hidden = false; opt.disabled = false; return; }
        const permitido = tiposMidiaPermitidosParaPerfil().includes(opt.value);
        opt.hidden = !permitido; opt.disabled = !permitido;
        if (!permitido && filtro.value === opt.value) filtro.value = '';
    });
    const btnComparar = document.getElementById('midia_btn_comparar');
    if (btnComparar) btnComparar.style.display = secretaria ? 'none' : 'inline-flex';
    const titulo = document.getElementById('midia_galeria_titulo');
    if (titulo) titulo.textContent = secretaria ? 'Documentos administrativos' : 'Galeria clínica e documental';
    const captura = document.getElementById('btn_captura_iphone');
    if (captura) captura.textContent = secretaria ? 'Digitalizar documento com iPhone' : 'Capturar com iPhone';
}

function obterPacienteIdMidiasAtivo() {
    const selecionado = String(document.getElementById('midia_paciente_select')?.value || '').trim();
    if (selecionado) return selecionado;
    let contexto = '';
    try { contexto = String(localStorage.getItem('kinesys_paciente_contexto') || '').trim(); } catch (_) { contexto = ''; }
    return contexto || String(pacienteAtualId || '').trim();
}

async function popularSelectMidiasPaciente(preSelecionado = '') {
    const select = document.getElementById('midia_paciente_select');
    if (!select) return;
    const lista = await obterPacientesBasicos();
    select.innerHTML = '<option value="">-- Selecione um paciente --</option>' + lista
        .slice().sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'))
        .map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)}${p.cpf ? ' · '+escapeHTML(p.cpf) : ''}</option>`).join('');
    const alvo = String(preSelecionado || '').trim();
    if (alvo && lista.some(p=>String(p.id)===alvo)) select.value = alvo;
}

async function sincronizarPacienteMidias(dispararChange = false) {
    const alvo = obterPacienteIdMidiasAtivo();
    const select = document.getElementById('midia_paciente_select');
    if (!alvo || !select) return alvo;

    let existe = [...select.options].some(o => String(o.value) === String(alvo));
    if (!existe) {
        await popularSelectMidiasPaciente(alvo);
        existe = [...select.options].some(o => String(o.value) === String(alvo));
    }
    if (existe && String(select.value) !== String(alvo)) {
        select.value = String(alvo);
        if (dispararChange) select.dispatchEvent(new Event('change', { bubbles:true }));
    }
    return existe ? String(alvo) : '';
}

async function abrirMidiasPaciente(pacienteId = '') {
    navegarPara('tela_midias');
    configurarMidiasPorPerfil();
    let contexto = '';
    try { contexto = String(localStorage.getItem('kinesys_paciente_contexto') || '').trim(); } catch (_) { contexto = ''; }
    const alvo = String(pacienteId || contexto || pacienteAtualId || '').trim();
    await popularSelectMidiasPaciente(alvo);
    await sincronizarPacienteMidias(false);
    await verificarKinesysLocal(false);
    const pacienteAtivo = obterPacienteIdMidiasAtivo();
    if (pacienteAtivo) await carregarMidiasPacienteSelecionado();
    else {
        const gal = document.getElementById('midia_galeria');
        if (gal) gal.innerHTML = '<p class="midia-empty">Selecione um paciente para visualizar os registros.</p>';
    }
}

async function carregarMidiasPacienteSelecionado() {
    midiaComparacaoA = null; midiaComparacaoB = null;
    atualizarPainelComparacao();
    await atualizarGaleriaMidias(true);
}

async function iniciarCapturaComIPhone() {
    const pacienteId = await sincronizarPacienteMidias(false);
    if (!pacienteId) { alert('⚠️ Selecione o paciente antes de iniciar a captura.'); return; }
    const st = await verificarKinesysLocal(true); if (!st) return;
    const lista = await obterPacientesBasicos();
    const p = lista.find(x=>String(x.id)===String(pacienteId)); if (!p) { alert('Paciente não encontrado.'); return; }
    try {
        const r = await kinesysLocalFetch('/api/session', {
            method:'POST',
            body:{ patient_id:p.id, patient_name:p.nome, started_by:usuarioLogado?.nome || 'Profissional não identificado', started_role:usuarioLogado?.tipo || '', allowed_types:tiposMidiaPermitidosParaPerfil() }
        });
        const msg = document.getElementById('midia_capture_status');
        if (msg) msg.innerHTML = `Aguardando foto do iPhone para <strong>${escapeHTML(p.nome)}</strong>…`;
        midiaUltimaQuantidadeLocal = (await obterMidiasLocais(p.id)).length;
        iniciarPollingMidias();
    } catch (err) { alert('❌ Não foi possível iniciar a captura pelo iPhone.\n\n'+err.message); }
}

function versaoKinesysLocalNumero(v) {
    const p=String(v||'0').split('.').map(x=>parseInt(x,10)||0);
    return (p[0]||0)*10000+(p[1]||0)*100+(p[2]||0);
}

async function abrirSeletorImportacaoComputador() {
    const pacienteId=await sincronizarPacienteMidias(false);
    if(!pacienteId){alert('⚠️ Selecione o paciente antes de importar um documento.');return;}
    const st=await verificarKinesysLocal(true); if(!st)return;
    if(versaoKinesysLocalNumero(st.version)<11002){
        alert('⚠️ O KineSys Local deste computador precisa ser atualizado para importar documentos.\n\nNa pasta Windows_Local desta versão, execute novamente INSTALAR_KINESYS_LOCAL_ADMIN.bat e depois reabra o KineSys.');
        return;
    }
    const input=document.getElementById('midia_import_input');
    if(!input)return;
    input.value='';
    input.click();
}

async function importarDocumentosComputador(input) {
    const arquivos=Array.from(input?.files||[]);
    if(!arquivos.length)return;
    const pacienteId=await sincronizarPacienteMidias(false);
    if(!pacienteId){input.value='';alert('⚠️ Selecione o paciente antes de importar.');return;}
    const lista=await obterPacientesBasicos();
    const p=lista.find(x=>String(x.id)===String(pacienteId));
    if(!p){input.value='';alert('Paciente não encontrado.');return;}
    const tipo=document.getElementById('midia_import_tipo')?.value||'documento';
    const tiposPermitidos=['documento','exame','termo','identificacao','guia','outro_admin'];
    if(!tiposPermitidos.includes(tipo)){input.value='';alert('Tipo de documento inválido.');return;}
    if(arquivos.length>20){input.value='';alert('⚠️ Importe no máximo 20 arquivos por vez.');return;}
    const extOk=/\.(pdf|jpe?g|png|webp|tiff?|bmp|docx?|xlsx?|txt|rtf)$/i;
    const invalidos=arquivos.filter(f=>!extOk.test(f.name)||f.size<=0||f.size>50*1024*1024);
    if(invalidos.length){
        input.value='';
        alert('⚠️ Há arquivo vazio, maior que 50 MB ou em formato não suportado:\n\n'+invalidos.map(f=>'• '+f.name).join('\n')+'\n\nUse PDF, JPG, PNG, WEBP, TIFF, BMP, DOC/DOCX, XLS/XLSX, TXT ou RTF.');
        return;
    }
    const btn=document.getElementById('btn_importar_documento_pc');
    const msg=document.getElementById('midia_capture_status');
    if(btn)btn.disabled=true;
    let ok=0; const falhas=[];
    try{
        for(let i=0;i<arquivos.length;i++){
            const f=arquivos[i];
            if(msg)msg.textContent=`Importando ${i+1} de ${arquivos.length}: ${f.name}…`;
            const qs=new URLSearchParams({
                patient_id:String(p.id), patient_name:p.nome||'', type:tipo,
                original_name:f.name, mime_type:f.type||'application/octet-stream',
                imported_by:usuarioLogado?.nome||'Usuário não identificado'
            });
            try{
                await kinesysLocalFetch('/api/import-document?'+qs.toString(),{
                    method:'POST', headers:{'Content-Type':f.type||'application/octet-stream'}, body:f
                },120000);
                ok++;
            }catch(err){falhas.push(`${f.name}: ${err.message||'falha no envio'}`);}
        }
        await atualizarGaleriaMidias(true);
        if(msg)msg.textContent=falhas.length?`✓ ${ok} arquivo(s) importado(s); ${falhas.length} falha(s).`:`✓ ${ok} arquivo(s) importado(s) e vinculado(s) ao prontuário.`;
        if(falhas.length)alert('Alguns arquivos não puderam ser importados:\n\n'+falhas.join('\n'));
    } finally {
        if(btn)btn.disabled=false;
        input.value='';
    }
}

function telaMidiasAtivaKineSys() {
    return !!document.getElementById('tela_midias')?.classList.contains('ativa');
}

function suspenderPollingCapturaMidias() {
    if (midiaPollTimer) {
        clearInterval(midiaPollTimer);
        midiaPollTimer = null;
    }
}

function iniciarPollingMidias() {
    midiaPollingCapturaSolicitado = true;
    suspenderPollingCapturaMidias();
    if (!telaMidiasAtivaKineSys()) return;
    midiaPollTimer = setInterval(async()=>{
        if (!telaMidiasAtivaKineSys()) return;
        const id=await sincronizarPacienteMidias(false); if(!id) return;
        try {
            const locais=await obterMidiasLocais(id);
            if (locais.length > midiaUltimaQuantidadeLocal) {
                midiaUltimaQuantidadeLocal = locais.length;
                const msg=document.getElementById('midia_capture_status'); if(msg) msg.textContent='✓ Foto recebida e vinculada ao prontuário.';
                await atualizarGaleriaMidias(true);
            }
        } catch(_){}
    },1800);
}

function iniciarPollingStatusMidias() {
    if (kinesysLocalStatusTimer || !telaMidiasAtivaKineSys()) return;
    verificarKinesysLocal(false);
    kinesysLocalStatusTimer = setInterval(() => {
        if (telaMidiasAtivaKineSys()) verificarKinesysLocal(false);
    }, 10000);
}

function suspenderPollingStatusMidias() {
    if (!kinesysLocalStatusTimer) return;
    clearInterval(kinesysLocalStatusTimer);
    kinesysLocalStatusTimer = null;
}

function ativarLifecycleMidiasKineSys() {
    iniciarPollingStatusMidias();
    if (midiaPollingCapturaSolicitado) iniciarPollingMidias();
}

function suspenderLifecycleMidiasKineSys() {
    suspenderPollingStatusMidias();
    suspenderPollingCapturaMidias();
}

async function obterMidiasLocais(pacienteId) {
    if (!pacienteId) return [];
    try {
        const data = await kinesysLocalFetch('/api/uploads?patient_id=' + encodeURIComponent(pacienteId), {method:'GET'}, 3000);
        return Array.isArray(data?.items) ? data.items : [];
    } catch (_) { return []; }
}

async function obterMidiasSupabase(pacienteId) {
    if (!_supabase || !pacienteId || !midiaTabelaSupabaseDisponivel) return [];
    try {
        const {data,error}=await _supabase.from('arquivos_paciente').select('*').eq('paciente_id',pacienteId).order('data_hora',{ascending:false});
        if(error) throw error;
        return (data||[]).map(x=>({
            id:x.id, patient_id:x.paciente_id, patient_name:'', captured_at:x.data_hora,
            type:x.tipo || 'outro', region:x.regiao || '', description:x.descricao || '', filename:x.arquivo_nome || '',
            relative_path:x.caminho_relativo || '', size_bytes:x.tamanho_bytes || 0, mime_type:x.mime_type || 'image/jpeg',
            sha256:x.sha256 || '', backup_status:x.backup_status || 'pending', professional_id:x.profissional_id || null,
            professional_name:x.profissional_nome || '', station:x.estacao || '', cloud_only:true
        }));
    } catch(err) {
        console.warn('Tabela arquivos_paciente indisponível:',err);
        if(String(err.message||'').match(/arquivos_paciente|relation|does not exist|schema cache/i)) midiaTabelaSupabaseDisponivel=false;
        return [];
    }
}

async function sincronizarMetadadosMidiasSupabase(items) {
    if (!_supabase || !midiaTabelaSupabaseDisponivel || !Array.isArray(items) || !items.length) return;
    const rows=items.map(x=>({
        id:x.id, paciente_id:x.patient_id, data_hora:x.captured_at || new Date().toISOString(),
        tipo:x.type || 'outro', regiao:x.region || null, descricao:x.description || null, arquivo_nome:x.filename || null,
        caminho_relativo:x.relative_path || null, tamanho_bytes:Number(x.size_bytes)||0, mime_type:x.mime_type || 'image/jpeg',
        sha256:x.sha256 || null, backup_status:x.backup_status || 'pending', profissional_id:x.professional_id || null,
        profissional_nome:x.professional_name || null, estacao:x.station || null
    }));
    try {
        const {error}=await _supabase.from('arquivos_paciente').upsert(rows,{onConflict:'id'});
        if(error) throw error;
    } catch(err){
        console.warn('Não foi possível sincronizar metadados das fotos:',err);
        if(String(err.message||'').match(/arquivos_paciente|relation|does not exist|schema cache/i)) midiaTabelaSupabaseDisponivel=false;
    }
}

async function atualizarGaleriaMidias(silencioso=false) {
    const pacienteId=await sincronizarPacienteMidias(false);
    const gal=document.getElementById('midia_galeria');
    if(!pacienteId){if(gal)gal.innerHTML='<p class="midia-empty">Selecione um paciente para visualizar os registros.</p>';return;}
    if(!silencioso && gal) gal.innerHTML='<p class="midia-empty">Atualizando registros…</p>';
    await verificarKinesysLocal(false);
    const [locais,nuvem]=await Promise.all([obterMidiasLocais(pacienteId),obterMidiasSupabase(pacienteId)]);
    if(locais.length) await sincronizarMetadadosMidiasSupabase(locais);
    const map=new Map(); nuvem.forEach(x=>map.set(x.id,x)); locais.forEach(x=>map.set(x.id,{...(map.get(x.id)||{}),...x,cloud_only:false}));
    midiasPacienteAtual=[...map.values()].sort((a,b)=>String(b.captured_at||'').localeCompare(String(a.captured_at||'')));
    midiaUltimaQuantidadeLocal=locais.length;
    renderizarGaleriaMidias();
}

function formatarTamanhoArquivo(bytes){const n=Number(bytes)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(0)+' KB';return (n/1048576).toFixed(1)+' MB';}
function rotuloTipoMidia(t){return ({avaliacao:'Avaliação',evolucao:'Evolução',postura:'Postura',ferida:'Ferida / cicatriz',edema:'Edema',exame:'Exame / laudo',termo:'Termo / autorização',identificacao:'Identificação / CPF / RG',guia:'Guia / pedido',documento:'Documento',outro_admin:'Outro documento',outro:'Outro'}[t]||'Registro');}
function urlMidiaLocal(item,thumb=true){return `${KINESYS_LOCAL_URL}/${thumb?'thumb':'media'}/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.sha256||item.captured_at||'')}`;}

function renderizarGaleriaMidias(){
    const gal=document.getElementById('midia_galeria'); if(!gal)return;
    const filtro=document.getElementById('midia_filtro_tipo')?.value||'';
    const permitidos=tiposMidiaPermitidosParaPerfil();
    const itens=midiasPacienteAtual.filter(x=>permitidos.includes(x.type||'outro') && (!filtro||x.type===filtro));
    if(!itens.length){gal.innerHTML='<p class="midia-empty">Nenhuma foto ou documento registrado para este filtro.</p>';return;}
    gal.innerHTML=itens.map(item=>{
        const local=!item.cloud_only && kinesysLocalOnline;
        const dt=item.captured_at?new Date(item.captured_at).toLocaleString('pt-BR'):'Data N/I';
        const ehImagem=String(item.mime_type||'').toLowerCase().startsWith('image/');
        const iconeDoc=String(item.mime_type||'').toLowerCase().includes('pdf')?'PDF':'📄';
        const img=(local&&ehImagem)?`<img src="${urlMidiaLocal(item,true)}" alt="Registro clínico" loading="lazy" onerror="this.parentElement.innerHTML='📄'">`:`<span class="ks-media-doc-icon ${iconeDoc==='PDF'?'ks-media-doc-icon--pdf':'ks-media-doc-icon--generic'}">${iconeDoc}</span>`;
        return `<article class="midia-card">
            <div class="midia-thumb">${img}</div>
            <div class="midia-card-body">
                <div class="midia-card-title">${escapeHTML(rotuloTipoMidia(item.type))}${item.region?' · '+escapeHTML(item.region):''}</div>
                <div class="midia-card-meta">${escapeHTML(dt)}<br>${escapeHTML(item.filename||'arquivo')} · ${escapeHTML(formatarTamanhoArquivo(item.size_bytes))}</div>
                <div class="midia-card-badges"><span class="midia-badge ${local?'ok':'warn'}">${local?'Original local':'Original não disponível nesta estação'}</span><span class="midia-badge ${item.backup_status==='ok'?'ok':'warn'}">Backup ${item.backup_status==='ok'?'OK':'pendente'}</span></div>
                <div class="midia-card-actions">${local?`<button onclick="abrirMidiaLocal('${escapeHTML(item.id)}')">Abrir</button>${perfilEhSecretaria()?'':`<button onclick="selecionarMidiaComparacao('${escapeHTML(item.id)}','A')">Inicial</button><button onclick="selecionarMidiaComparacao('${escapeHTML(item.id)}','B')">Atual</button>`}`:''}</div>
            </div></article>`;
    }).join('');
}

function abrirMidiaLocal(id){window.open(`${KINESYS_LOCAL_URL}/media/${encodeURIComponent(id)}`,'_blank','noopener');}
function alternarComparacaoMidias(){const p=document.getElementById('midia_compare_panel');if(p)p.style.display=p.style.display==='none'?'grid':'none';}
function selecionarMidiaComparacao(id,lado){const item=midiasPacienteAtual.find(x=>x.id===id);if(!item)return;if(lado==='A')midiaComparacaoA=item;else midiaComparacaoB=item;const p=document.getElementById('midia_compare_panel');if(p)p.style.display='grid';atualizarPainelComparacao();}
function atualizarPainelComparacao(){[['midia_compare_a',midiaComparacaoA,'Inicial'],['midia_compare_b',midiaComparacaoB,'Atual']].forEach(([id,item,rot])=>{const el=document.getElementById(id);if(!el)return;if(!item){el.innerHTML=`Selecione uma foto como <strong>${rot}</strong>.`;return;}el.innerHTML=`<img src="${urlMidiaLocal(item,false)}" alt="${rot}">`;});}

async function salvarConfiguracaoBackupLocal(){
    const st=await verificarKinesysLocal(true);if(!st)return;
    const path=document.getElementById('midia_backup_path')?.value.trim()||'';
    try{const r=await kinesysLocalFetch('/api/config',{method:'POST',body:{backup_root:path}},4000);await verificarKinesysLocal(false);alert(path?'✓ Pasta de backup configurada.':'✓ Backup automático desativado.');}
    catch(err){alert('❌ Não foi possível salvar a configuração de backup.\n'+err.message);}
}
async function executarBackupLocal(){try{const r=await kinesysLocalFetch('/api/backup/run',{method:'POST',body:{}},15000);await atualizarGaleriaMidias(true);alert(`✓ Backup concluído. ${r.copied||0} arquivo(s) copiado(s); ${r.failed||0} falha(s).`);}catch(err){alert('❌ Falha no backup local.\n'+err.message);}}

