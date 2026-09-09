/* ============================================================================
   KineSys Clinical v1.11.2 — Exportação de prontuário completo
   - Simplificado: cadastro + avaliações + evoluções.
   - Detalhado: conteúdo completo + carimbos de rastreabilidade + trilha de alterações.
   A impressão usa a janela nativa do navegador, permitindo impressora física ou
   "Salvar como PDF" sem bibliotecas externas.
   ============================================================================ */
(function(){
'use strict';

const PERFIS_DETALHADO = new Set(['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA','FISIOTERAPEUTA','PROFISSIONAL']);

function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function vazio(v){
    if(v===null||v===undefined||v==='') return true;
    if(Array.isArray(v)) return v.length===0;
    if(typeof v==='object') return Object.keys(v).length===0;
    return false;
}
function usuarioAtual(){ try{return (typeof usuarioLogado!=='undefined'&&usuarioLogado)?usuarioLogado:(window.usuarioLogado||null);}catch(_){return window.usuarioLogado||null;} }
function perfilAtual(){ return String(usuarioAtual()?.tipo || '').toUpperCase(); }
function podeDetalhado(){ return PERFIS_DETALHADO.has(perfilAtual()); }
window.podeExportarProntuarioDetalhado = podeDetalhado;

function dataHora(v, segundos=true){
    if(!v) return 'Não informado';
    if(typeof v==='number' && Number.isFinite(v)){ const d=new Date(v); if(Number.isFinite(d.getTime())) return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:segundos?'2-digit':undefined,hour12:false}); }
    const s=String(v).trim();
    if(/^\d{12,13}$/.test(s)){ const d=new Date(Number(s)); if(Number.isFinite(d.getTime())) return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:segundos?'2-digit':undefined,hour12:false}); }
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
        const [a,m,d]=s.split('-'); return `${d}/${m}/${a}`;
    }
    const d=new Date(s);
    if(!Number.isFinite(d.getTime())) return s;
    return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:segundos?'2-digit':undefined,hour12:false});
}
function dataSomente(v){
    if(!v) return 'Não informado';
    if(typeof v==='number' && Number.isFinite(v)){ const d=new Date(v); if(Number.isFinite(d.getTime())) return d.toLocaleDateString('pt-BR'); }
    const s=String(v).trim();
    if(/^\d{12,13}$/.test(s)){ const d=new Date(Number(s)); if(Number.isFinite(d.getTime())) return d.toLocaleDateString('pt-BR'); }
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const [a,m,d]=s.split('-');return `${d}/${m}/${a}`;}
    const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString('pt-BR'):s;
}
function valorCurto(v){
    if(v===true) return 'Sim';
    if(v===false) return 'Não';
    if(v===null||v===undefined||v==='') return '—';
    if(typeof v==='number') return String(v).replace('.',',');
    if(typeof v==='string') return v;
    return JSON.stringify(v);
}
function chaveBonita(k){
    const mapa={
        hma:'História da moléstia atual', eva:'EVA', evaInicial:'EVA inicial', eva_inicial:'EVA inicial',
        estadoClinico:'Estado clínico', estado_clinico:'Estado clínico', relatoLivre:'Relato livre', relato_livre:'Relato livre',
        respostaCarga:'Resposta à carga', resposta_carga:'Resposta à carga', dadosEstruturados:'Dados estruturados', dados_estruturados:'Dados estruturados',
        mapeamento:'Exame direcionado', comorbidades:'Comorbidades', cirurgias:'Cirurgias', medicamentos:'Medicamentos', esporte:'Esporte / atividade',
        medidasObjetivas:'Medidas objetivas', objetivosPlano:'Objetivos / plano', outcomes:'PROMs / desfechos', psfs:'PSFS',
        novoAlerta:'Novo alerta', novaIntercorrencia:'Nova intercorrência', mudancaMedicacao:'Mudança de medicação', novoExame:'Novo exame',
        dorDurante:'Dor durante', dor24h:'Dor em 24 h', rpe:'RPE', duracaoMin:'Duração (min)', resposta24h:'Resposta em 24 h', edema:'Edema',
        tipo:'Tipo', status:'Status', profissao:'Profissão', idade:'Idade', sexo:'Sexo', nascimento:'Data de nascimento', telefone:'Telefone',
        estadoCivil:'Estado civil', estado_civil:'Estado civil', endereco:'Endereço', cep:'CEP', cpf:'CPF', cadastradoPor:'Cadastrado por', cadastrado_por:'Cadastrado por',
        responsavelNome:'Responsável', responsavel_nome:'Responsável', responsavelParentesco:'Parentesco', responsavel_parentesco:'Parentesco',
        responsavelTelefone:'Telefone do responsável', responsavel_telefone:'Telefone do responsável'
    };
    if(mapa[k]) return mapa[k];
    return String(k).replace(/_/g,' ').replace(/([a-záéíóúç])([A-Z])/g,'$1 $2').replace(/^./,m=>m.toUpperCase());
}
function caminhoBonito(path){ return path.split('.').map(p=>/^\d+$/.test(p)?`Item ${Number(p)+1}`:chaveBonita(p)).join(' › '); }

const EXCLUIR_CONTEUDO = new Set([
    'id','paciente_id','pacienteId','dataHoraISO','data_hora_iso','realizadoEm','realizado_em','salvoEm','salvo_em','edicaoLimiteEm','edicao_limite_em',
    'profissionalId','profissional_id','profissionalNome','profissional_nome','profissionalRegistro','profissional_registro','realizadoPor','realizado_por','profissional',
    'ultimaEdicaoEm','ultima_edicao_em','ultimaEdicaoPorId','ultima_edicao_por_id','ultimaEdicaoPorNome','ultima_edicao_por_nome','dataAvaliacao','data_avaliacao','data'
]);
function achatar(obj, prefix='', linhas=[], depth=0){
    if(depth>8) { if(!vazio(obj)) linhas.push([prefix, valorCurto(obj)]); return linhas; }
    if(vazio(obj)) return linhas;
    if(Array.isArray(obj)){
        if(obj.every(x=>x===null||['string','number','boolean'].includes(typeof x))){
            linhas.push([prefix, obj.map(valorCurto).join('; ')]); return linhas;
        }
        obj.forEach((x,i)=>achatar(x, prefix?`${prefix}.${i}`:String(i), linhas, depth+1));
        return linhas;
    }
    if(typeof obj==='object'){
        Object.entries(obj).forEach(([k,v])=>{
            if(k.startsWith('_')||EXCLUIR_CONTEUDO.has(k)||vazio(v)) return;
            achatar(v,prefix?`${prefix}.${k}`:k,linhas,depth+1);
        });
        return linhas;
    }
    linhas.push([prefix,valorCurto(obj)]); return linhas;
}
function tabelaCampos(linhas){
    if(!linhas.length) return '<p class="muted">Nenhum dado adicional registrado.</p>';
    return `<table class="kv"><tbody>${linhas.map(([k,v])=>`<tr><th>${esc(caminhoBonito(k))}</th><td>${esc(v).replace(/\n/g,'<br>')}</td></tr>`).join('')}</tbody></table>`;
}
function obterRealizado(r){ return r?.realizadoEm||r?.realizado_em||r?.dataHoraRealizacao||r?.data_hora_realizacao||r?.dataHoraISO||r?.data_hora_iso||(r?.data?`${r.data}T12:00:00`:null); }
function obterSalvo(r){ return r?.salvoEm||r?.salvo_em||r?.dataHoraISO||r?.data_hora_iso||null; }
function obterLimite(r){
    const x=r?.edicaoLimiteEm||r?.edicao_limite_em;if(x)return x;
    const d=new Date(obterRealizado(r)||'');return Number.isFinite(d.getTime())?new Date(d.getTime()+86400000).toISOString():null;
}
function profissional(r){
    const n=r?.profissionalNome||r?.profissional_nome||r?.realizadoPor||r?.realizado_por||r?.profissional||'Não identificado';
    const reg=r?.profissionalRegistro||r?.profissional_registro||'';
    return reg&&!String(n).includes(reg)?`${n} · ${reg}`:String(n);
}
function idadePaciente(p){
    try { if(typeof window.idadeNumericaPaciente==='function') return window.idadeNumericaPaciente(p)||''; } catch(_){ }
    return p?.idade||'';
}
function blocoCadastro(p){
    const idade=idadePaciente(p);
    const rows=[
        ['Nome completo',p.nome],['CPF',p.cpf],['Nascimento',p.nascimento?dataSomente(p.nascimento):''],['Idade',idade?`${String(idade).replace(/\D/g,'')} anos`:''],
        ['Sexo',p.sexo],['Telefone',p.telefone],['Profissão',p.profissao],['Estado civil',p.estadoCivil||p.estado_civil],['CEP',p.cep],['Endereço',p.endereco],
        ['Paciente dependente',p.dependente===true?'Sim':p.dependente===false?'Não':''],['Responsável',p.responsavelNome||p.responsavel_nome],
        ['Parentesco',p.responsavelParentesco||p.responsavel_parentesco],['Telefone do responsável',p.responsavelTelefone||p.responsavel_telefone],
        ['Cadastro realizado em',p.timestampCadastro?dataHora(p.timestampCadastro):p.dataCadastro||p.data_cadastro],['Cadastrado por',p.cadastradoPor||p.cadastrado_por]
    ].filter(([,v])=>!vazio(v));
    return `<section><h2>1. Identificação e cadastro</h2><table class="kv"><tbody>${rows.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></section>`;
}
function blocoAvaliacao(av,i,detalhado){
    const tipo=av.tipo||'Avaliação fisioterapêutica';
    const conteudo=achatar(av);
    const meta=detalhado?`<div class="trace"><div><b>Realizada:</b> ${esc(dataHora(obterRealizado(av)))}</div><div><b>Profissional:</b> ${esc(profissional(av))}</div><div><b>Salva no banco:</b> ${esc(dataHora(obterSalvo(av)))}</div><div><b>Janela de edição até:</b> ${esc(dataHora(obterLimite(av)))}</div>${(av.ultimaEdicaoEm||av.ultima_edicao_em)?`<div><b>Última edição:</b> ${esc(dataHora(av.ultimaEdicaoEm||av.ultima_edicao_em))}${(av.ultimaEdicaoPorNome||av.ultima_edicao_por_nome)?` · ${esc(av.ultimaEdicaoPorNome||av.ultima_edicao_por_nome)}`:''}</div>`:''}<div><b>ID do registro:</b> ${esc(av.id||'—')}</div></div>`:'';
    const resumo=[];
    if(av.dataAvaliacao||av.data_avaliacao) resumo.push(`<span>Data: <b>${esc(av.dataAvaliacao||av.data_avaliacao)}</b></span>`);
    if(av.status) resumo.push(`<span>Status: <b>${esc(av.status)}</b></span>`);
    if(av.evaInicial!==undefined||av.eva_inicial!==undefined) resumo.push(`<span>EVA inicial: <b>${esc(av.evaInicial??av.eva_inicial)}</b></span>`);
    return `<article class="record"><div class="record-head"><div><span class="index">Avaliação ${i+1}</span><h3>${esc(tipo)}</h3></div><div class="record-summary">${resumo.join('')}</div></div>${meta}${tabelaCampos(conteudo)}</article>`;
}
function blocoEvolucao(ev,i,detalhado){
    const conteudo=achatar(ev);
    const meta=detalhado?`<div class="trace"><div><b>Realizada:</b> ${esc(dataHora(obterRealizado(ev)))}</div><div><b>Profissional:</b> ${esc(profissional(ev))}</div><div><b>Salva no banco:</b> ${esc(dataHora(obterSalvo(ev)))}</div><div><b>Janela de edição até:</b> ${esc(dataHora(obterLimite(ev)))}</div>${(ev.ultimaEdicaoEm||ev.ultima_edicao_em)?`<div><b>Última edição:</b> ${esc(dataHora(ev.ultimaEdicaoEm||ev.ultima_edicao_em))}${(ev.ultimaEdicaoPorNome||ev.ultima_edicao_por_nome)?` · ${esc(ev.ultimaEdicaoPorNome||ev.ultima_edicao_por_nome)}`:''}</div>`:''}<div><b>ID do registro:</b> ${esc(ev.id||'—')}</div></div>`:'';
    const resumo=[];
    if(ev.data) resumo.push(`<span>Data: <b>${esc(dataSomente(ev.data))}</b></span>`);
    if(ev.eva!==undefined) resumo.push(`<span>EVA: <b>${esc(ev.eva)}</b></span>`);
    const estado=ev.dadosEstruturados?.estadoClinico||ev.dados_estruturados?.estadoClinico;if(estado) resumo.push(`<span>Estado: <b>${esc(estado)}</b></span>`);
    return `<article class="record"><div class="record-head"><div><span class="index">Evolução ${i+1}</span><h3>Evolução fisioterapêutica</h3></div><div class="record-summary">${resumo.join('')}</div></div>${meta}${tabelaCampos(conteudo)}</article>`;
}

function limparParaDiff(v){
    if(!v||typeof v!=='object'||Array.isArray(v)) return v;
    const out={}; Object.entries(v).forEach(([k,val])=>{ if(['ultima_edicao_em','ultima_edicao_por_id','ultima_edicao_por_nome','ultimaEdicaoEm','ultimaEdicaoPorId','ultimaEdicaoPorNome'].includes(k))return; out[k]=val; }); return out;
}
function diffObjetos(a,b,prefix='',out=[]){
    a=limparParaDiff(a);b=limparParaDiff(b);
    if(typeof a==='object'&&a!==null&&typeof b==='object'&&b!==null&&!Array.isArray(a)&&!Array.isArray(b)){
        const keys=new Set([...Object.keys(a),...Object.keys(b)]); keys.forEach(k=>diffObjetos(a[k],b[k],prefix?`${prefix}.${k}`:k,out)); return out;
    }
    if(Array.isArray(a)||Array.isArray(b)){
        if(JSON.stringify(a??null)!==JSON.stringify(b??null)) out.push([prefix,valorCurto(a??'—'),valorCurto(b??'—')]); return out;
    }
    if(JSON.stringify(a??null)!==JSON.stringify(b??null)) out.push([prefix,valorCurto(a??'—'),valorCurto(b??'—')]);
    return out;
}
function blocoAuditoria(auditoria=[],erro=''){
    if(erro) return `<section class="audit-section"><h2>4. Trilha de alterações</h2><div class="warning"><b>Trilha técnica indisponível nesta exportação.</b><br>${esc(erro)}</div></section>`;
    if(!auditoria.length) return `<section class="audit-section"><h2>4. Trilha de alterações</h2><p class="muted">Nenhuma alteração auditada foi registrada após a ativação da rastreabilidade clínica.</p></section>`;
    return `<section class="audit-section"><h2>4. Trilha de alterações</h2><p class="section-note">Cada evento abaixo foi registrado no banco quando houve mudança efetiva no conteúdo clínico.</p>${auditoria.map((a,i)=>{
        const diffs=diffObjetos(a.antes||{},a.depois||{});
        return `<article class="audit"><div class="audit-head"><b>${esc(a.tabela==='avaliacoes'?'Avaliação':'Evolução')} · alteração ${i+1}</b><span>${esc(dataHora(a.alterado_em))}</span></div><div class="audit-meta">Alterado por <b>${esc(a.alterado_por_nome||'Usuário não identificado')}</b>${a.registro_id?` · Registro ${esc(a.registro_id)}`:''}</div>${diffs.length?`<table class="diff"><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${diffs.map(([k,x,y])=>`<tr><th>${esc(caminhoBonito(k))}</th><td>${esc(x).replace(/\n/g,'<br>')}</td><td>${esc(y).replace(/\n/g,'<br>')}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">Evento de auditoria sem diferenças clínicas renderizáveis.</p>'}</article>`;
    }).join('')}</section>`;
}

async function consultarAuditoria(pacienteId){
    const sb=window._supabase || ((typeof _supabase!=='undefined')?_supabase:null);
    if(!sb) throw new Error('Supabase indisponível.');
    const args={
        p_solicitante_id:String(usuarioAtual()?.id||''),
        p_solicitante_tipo:String(usuarioAtual()?.tipo||''),
        p_solicitante_nome:String(usuarioAtual()?.nome||''),
        p_paciente_id:String(pacienteId),
        p_limite:500
    };
    const {data,error}=await sb.rpc('kinesys_listar_auditoria_clinica_prontuario',args);
    if(error) throw error;
    return Array.isArray(data)?data:[];
}

function cssDocumento(){return `
:root{--ink:#183B43;--muted:#60757A;--line:#DDE8E5;--soft:#F5F9F8;--accent:#2A8078;--warn:#FFF7E8}
*{box-sizing:border-box}body{margin:0;background:#EEF3F2;color:#24383D;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.42}.toolbar{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:10px 18px;background:#173B45;color:#fff}.toolbar .label{margin-right:auto;font-weight:700}.toolbar button{border:1px solid rgba(255,255,255,.25);border-radius:7px;padding:8px 12px;background:#fff;color:#173B45;font-weight:700;cursor:pointer}.toolbar button.secondary{background:transparent;color:#fff}.paper{width:210mm;min-height:297mm;margin:18px auto;background:#fff;padding:18mm 17mm;box-shadow:0 10px 35px rgba(20,55,60,.12)}.doc-head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid var(--ink);padding-bottom:12px;margin-bottom:18px}.brand{font-size:18pt;font-weight:800;letter-spacing:.02em;color:var(--ink)}.brand small{display:block;font-size:8.5pt;font-weight:600;color:var(--muted);margin-top:3px}.doc-type{text-align:right}.doc-type strong{display:block;font-size:13pt;color:var(--ink)}.doc-type span{font-size:8.5pt;color:var(--muted)}.patient-banner{display:grid;grid-template-columns:1fr auto;gap:15px;background:var(--soft);border:1px solid var(--line);border-radius:9px;padding:12px 14px;margin-bottom:17px}.patient-banner h1{font-size:16pt;margin:0;color:var(--ink)}.patient-banner p{margin:3px 0 0;color:var(--muted);font-size:9pt}.patient-banner .counts{text-align:right;font-size:9pt;color:var(--muted)}.patient-banner .counts b{color:var(--ink)}section{margin:0 0 20px}h2{font-size:12.5pt;color:var(--ink);margin:0 0 9px;padding-bottom:5px;border-bottom:1px solid var(--line)}h3{font-size:11.5pt;color:var(--ink);margin:2px 0 0}.record{border:1px solid var(--line);border-radius:8px;padding:11px 12px;margin:0 0 11px;break-inside:avoid-page}.record-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-bottom:8px}.index{font-size:7.8pt;text-transform:uppercase;letter-spacing:.07em;color:var(--accent);font-weight:800}.record-summary{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;color:var(--muted);font-size:8.5pt}.record-summary span{white-space:nowrap}.trace{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;background:#F2F8F7;border-left:3px solid var(--accent);padding:8px 10px;margin:7px 0 10px;font-size:8.4pt;color:#4B6267}.kv,.diff{width:100%;border-collapse:collapse;table-layout:fixed}.kv th,.kv td,.diff th,.diff td{border-bottom:1px solid #E8EFED;padding:5px 6px;vertical-align:top;overflow-wrap:anywhere}.kv th{width:31%;text-align:left;color:#526A6F;font-size:8.7pt;font-weight:700}.kv td{font-size:9pt}.diff thead th{background:#F4F8F7;color:var(--ink);font-size:8pt;text-align:left}.diff tbody th{width:26%;text-align:left;color:#526A6F;font-size:8pt}.diff td{font-size:8pt}.audit-section{page-break-before:auto}.audit{border:1px solid var(--line);border-radius:7px;padding:9px;margin-bottom:9px;break-inside:avoid-page}.audit-head{display:flex;justify-content:space-between;gap:10px;color:var(--ink);font-size:9pt}.audit-meta{color:var(--muted);font-size:8.2pt;margin:3px 0 7px}.section-note,.muted{color:var(--muted);font-size:8.5pt}.warning{background:var(--warn);border:1px solid #ECD9AE;border-radius:7px;padding:10px;font-size:9pt}.footer{margin-top:24px;padding-top:9px;border-top:1px solid var(--line);font-size:7.8pt;color:var(--muted);display:flex;justify-content:space-between;gap:15px}.privacy{margin-top:7px;font-size:7.5pt;color:#718286}.page-break{page-break-before:always}
@page{size:A4;margin:12mm}@media print{body{background:#fff}.toolbar{display:none!important}.paper{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}.record,.audit{break-inside:avoid-page}a{color:inherit;text-decoration:none}}
@media(max-width:850px){.paper{width:auto;min-height:0;margin:0;padding:18px}.trace{grid-template-columns:1fr}.patient-banner{grid-template-columns:1fr}.doc-head{flex-direction:column}.doc-type{text-align:left}}
`;}

function montarDocumento(p,auditoria,modo,erroAuditoria=''){
    const detalhado=modo==='detalhado';
    const avs=(typeof window.obterAvaliacoes==='function'?window.obterAvaliacoes(p):(p.avaliacoes||[])).slice().sort((a,b)=>String(obterRealizado(a)||a.dataAvaliacao||'').localeCompare(String(obterRealizado(b)||b.dataAvaliacao||'')));
    const evs=(p.evolucoes||[]).slice().sort((a,b)=>String(obterRealizado(a)||a.data||'').localeCompare(String(obterRealizado(b)||b.data||'')));
    const idade=idadePaciente(p);
    const emitidoPor=usuarioAtual()?.nome||'Usuário não identificado';
    const titulo=detalhado?'Prontuário completo detalhado':'Prontuário completo simplificado';
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} — ${esc(p.nome||'Paciente')}</title><style>${cssDocumento()}</style></head><body>
    <div class="toolbar"><div class="label">Pré-visualização · ${esc(titulo)}</div><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button><button class="secondary" onclick="window.close()">Fechar</button></div>
    <main class="paper"><header class="doc-head"><div class="brand">FISIOFIX<small>Fisioterapia · Reabilitação · Movimento</small></div><div class="doc-type"><strong>${esc(titulo)}</strong><span>Gerado em ${esc(dataHora(new Date().toISOString()))}</span></div></header>
    <div class="patient-banner"><div><h1>${esc(p.nome||'Paciente')}</h1><p>${esc([idade?`${idade} anos`:'',p.profissao||'',p.cpf?`CPF ${p.cpf}`:''].filter(Boolean).join(' · '))}</p></div><div class="counts"><div><b>${avs.length}</b> avaliação(ões)</div><div><b>${evs.length}</b> evolução(ões)</div></div></div>
    ${blocoCadastro(p)}
    <section><h2>2. Avaliações fisioterapêuticas</h2>${avs.length?avs.map((a,i)=>blocoAvaliacao(a,i,detalhado)).join(''):'<p class="muted">Nenhuma avaliação registrada.</p>'}</section>
    <section><h2>3. Evoluções fisioterapêuticas</h2>${evs.length?evs.map((e,i)=>blocoEvolucao(e,i,detalhado)).join(''):'<p class="muted">Nenhuma evolução registrada.</p>'}</section>
    ${detalhado?blocoAuditoria(auditoria,erroAuditoria):''}
    <footer class="footer"><span>Emitido por ${esc(emitidoPor)}${usuarioAtual()?.registro?` · ${esc(usuarioAtual()?.registro)}`:''}</span><span>KineSys Clinical · ${detalhado?'Documento com rastreabilidade':'Resumo integral do prontuário'}</span></footer>
    <div class="privacy">Documento contendo dados pessoais e clínicos. Manter sob guarda e compartilhamento compatíveis com a finalidade assistencial e documental.</div></main></body></html>`;
}

function abrirJanelaCarregando(){
    const w=window.open('','_blank');
    if(!w){ alert('⚠️ O navegador bloqueou a janela de impressão. Permita pop-ups para o KineSys e tente novamente.'); return null; }
    w.document.open();w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Preparando prontuário…</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#173B45}small{color:#60757A}</style></head><body><h2>Preparando prontuário…</h2><small>Carregando os registros do paciente.</small></body></html>');w.document.close();
    return w;
}

async function gerar(pacienteId,modo='simplificado'){
    const id=String(pacienteId||'').trim();
    if(!id){alert('⚠️ Selecione um paciente antes de gerar o prontuário.');return;}
    if(modo==='detalhado'&&!podeDetalhado()){
        alert('🔒 O prontuário detalhado com trilha de alterações é restrito a administradores e fisioterapeutas.');return;
    }
    const w=abrirJanelaCarregando();if(!w)return;
    try{
        const lista=await window.obterPacientesSalvos();
        const p=(lista||[]).find(x=>String(x.id)===id);
        if(!p) throw new Error('Paciente não encontrado.');
        let auditoria=[], erroAuditoria='';
        if(modo==='detalhado'){
            try{ auditoria=await consultarAuditoria(id); }
            catch(e){
                console.error('KineSys: auditoria clínica indisponível para exportação.',e);
                const msg=String(e?.message||e||'');
                erroAuditoria=/kinesys_listar_auditoria_clinica_prontuario|function .* does not exist|schema cache/i.test(msg)
                    ? 'Execute a migration SUPABASE_SQL/SUPABASE_MIGRACAO_EXPORTACAO_PRONTUARIO_DETALHADO_v1.11.2.sql para liberar a leitura segura da trilha de alterações.'
                    : msg;
            }
        }
        const html=montarDocumento(p,auditoria,modo,erroAuditoria);
        w.document.open();w.document.write(html);w.document.close();w.focus();
    }catch(e){
        console.error('KineSys: falha ao montar prontuário para impressão.',e);
        w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Erro</title></head><body style="font-family:Arial;padding:32px"><h2>Não foi possível montar o prontuário.</h2><p>${esc(e?.message||e)}</p></body></html>`);w.document.close();
    }
}
window.gerarProntuarioCompletoPDF=gerar;

function garantirModal(){
    let modal=document.getElementById('modal_exportar_prontuario_pdf');
    if(modal)return modal;
    modal=document.createElement('div');modal.id='modal_exportar_prontuario_pdf';modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal-box ks-prontuario-export-modal"><button class="modal-fechar" type="button" data-close>✕</button><h2>Imprimir / salvar prontuário</h2><p class="ks-prontuario-export-intro">Escolha o nível de detalhe do documento.</p><div class="ks-prontuario-export-grid"><button type="button" class="btn-secondary ks-prontuario-export-option" data-modo="simplificado"><strong class="ks-prontuario-export-option-title">📄 Completo simplificado</strong><span class="ks-prontuario-export-option-copy">Cadastro do cabeçalho, todas as avaliações e todas as evoluções, sem a trilha técnica de alterações.</span></button><button type="button" class="btn-primary ks-prontuario-export-option" data-modo="detalhado"><strong class="ks-prontuario-export-option-title">🧾 Completo detalhado</strong><span class="ks-prontuario-export-option-copy">Inclui horários, profissionais, carimbos de salvamento e histórico das alterações auditadas.</span></button></div><p data-permissao class="ks-prontuario-export-permission"></p></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick=()=>{modal.classList.remove('active');modal.style.display='none';};
    modal.addEventListener('click',e=>{if(e.target===modal){modal.classList.remove('active');modal.style.display='none';}});
    modal.querySelectorAll('[data-modo]').forEach(btn=>btn.addEventListener('click',()=>{
        const id=modal.dataset.pacienteId||'';const modo=btn.dataset.modo;
        if(modo==='detalhado'&&!podeDetalhado()){alert('🔒 O prontuário detalhado com auditoria é restrito a administradores e fisioterapeutas.');return;}
        modal.classList.remove('active');modal.style.display='none';gerar(id,modo);
    }));
    return modal;
}
function abrirEscolha(pacienteId){
    const id=String(pacienteId||((typeof pacienteAtualId!=='undefined')?pacienteAtualId:'')||'').trim();if(!id){alert('⚠️ Selecione um paciente.');return;}
    const modal=garantirModal();modal.dataset.pacienteId=id;
    const det=modal.querySelector('[data-modo="detalhado"]');const nota=modal.querySelector('[data-permissao]');
    if(det){det.disabled=!podeDetalhado();}
    if(nota)nota.textContent=podeDetalhado()?'No detalhado, a trilha de alterações é carregada diretamente do Supabase.':'Seu perfil pode emitir o prontuário simplificado. O detalhado é restrito a administradores e fisioterapeutas.';
    modal.style.display='flex';modal.classList.add('active');
}
window.abrirEscolhaProntuarioPDF=abrirEscolha;

// Ajuste responsivo do modal criado em runtime.
const style=document.createElement('style');style.textContent='@media(max-width:650px){.ks-prontuario-export-grid{grid-template-columns:1fr!important}}';document.head.appendChild(style);
})();
