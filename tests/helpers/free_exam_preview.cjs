'use strict';
// Prévia isolada: fragmento, estilos, registro livre e compositor reais; sem core de rede/DB.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),fragment=read('screens/tela_avaliacao.html'),workspace=read('src/clinical/evaluation_workspace-1.17.0.js'),core=read('src/core/script-1.18.0.js');
const css=[...(index.match(/<link[^>]*rel="stylesheet"[^>]*>/g)||[]).filter(t=>!t.includes('data-kinesys-lazy')),
 ...['design_clinical.css','design_clinical_direction-1.17.0.css','design_evaluation_workspace-1.18.0.css','design_evaluation_context-1.18.3.css','avaliacao_experiencia-1.22.0.css','evaluation_free_exam-1.0.0.css'].map(p=>`<link rel="stylesheet" href="/styles/${p}">`)];
let setup=`
let pacienteAtualId='paciente-sintetico',avaliacaoEdicaoId=null,usuarioLogado={nome:'Profissional de demonstração',registro:'CREFITO-TESTE'},clinicaEstruturadaPreservada={};
const BANCO_MAPEAMENTO_CLINICO={cervical:{nome:'Coluna cervical',clusters:[{id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',limiar:3,testes:['Spurling / compressão foraminal reproduz sintomas radiculares típicos','Distração cervical reduz sintomas radiculares','ULTT1 / teste neurodinâmico do nervo mediano compatível com os sintomas']}]},ombro:{nome:'Ombro',clusters:[]},joelho:{nome:'Joelho',clusters:[]}};
window.obterContextoAvaliacaoKineSys=()=>({pacienteId:pacienteAtualId,avaliacaoId:'',usuarioId:'demo',clinicaId:'demo',revisao:1});
window.fingerprintContextoExameKineSys=()=>document.getElementById('paciente_hma')?.value||'';
window.coletarAchadosLaudoKineSys=()=>[];
window.validarSegurancaParaFinalizacao=()=>({ok:false,tipo:'revisao_global',mensagem:'Revisão de segurança pendente.'});
window.KineSysMotorClinico3={ultimoPlano:{versao:'demo',hipoteses:[{id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',regiaoId:'cervical',limiar:3}],exame:{testesPrioritarios:[]}}};
function gerarSinteseMapeamento(){return{resumoPorRegiao:[{regiao:'Coluna cervical',codigoHipotese:'radiculopatia_cervical',nomeHipotese:'Radiculopatia Cervical',nivel:'pendente',redFlags:[]}],segurancaGlobal:{pistasGlobais:[]}};}
function coletarRestricoesPosOperatorias(){return{ativo:false};}
function agendarAutosaveKineSys(){sessionStorage.setItem('qa-exame-livre',JSON.stringify(window.KineSysExameLivre?.coletar()||{}));}
function confirmarKineSys(){return Promise.resolve(true);}
${core.slice(core.indexOf('function irParaSubtela('),core.indexOf('function avancarParaMapa('))}
window.navegarAvaliacaoEtapaKineSys=id=>{irParaSubtela(id);if(id==='subtela_diagnostico')window.renderizarLaudoAvaliacaoKineSys();};window.avancarParaDiagnostico=()=>window.navegarAvaliacaoEtapaKineSys('subtela_diagnostico');
document.getElementById('paciente_nome').value='Paciente de Demonstração';document.getElementById('paciente_idade').value='38';document.getElementById('paciente_ocupacao').value='Profissão de exemplo';
document.getElementById('paciente_hma').value='Dor cervical à direita irradiada para o braço direito. Dor no ombro esquerdo e no joelho direito.';
document.getElementById('avaliacao_realizado_em').value='2026-10-23T10:00';
document.getElementById('grupo_regioes_mapeamento').innerHTML=Object.entries(BANCO_MAPEAMENTO_CLINICO).map(([id,r])=>'<label><input type="checkbox" checked data-regiao="'+id+'">'+r.nome+'</label>').join('');
document.getElementById('ks-regions-selected').innerHTML=Object.values(BANCO_MAPEAMENTO_CLINICO).map(r=>'<span class="ks-region-chip">'+r.nome+'</span>').join('');
document.getElementById('container_clusters_regioes').innerHTML='<section class="card"><h2>Exame por região</h2><p>Prévia de apresentação. Os testes guiados permanecem no sistema; registre abaixo os achados complementares.</p></section>';
document.getElementById('ks_exam_safety_review').innerHTML='<section class="card"><strong>Revisão de segurança antes de finalizar</strong><p>Na aplicação, a revisão e as condutas existentes permanecem obrigatórias.</p></section>';
document.getElementById('radar_flutuante_container').classList.add('radar-ativo','radar-contexto-avaliacao');
document.getElementById('radar_launcher').addEventListener('click',()=>{const p=document.getElementById('radar_painel'),aberto=p.classList.toggle('aberto');p.setAttribute('aria-hidden',String(!aberto));document.getElementById('radar_launcher').setAttribute('aria-expanded',String(aberto));});
document.getElementById('radar_fechar').addEventListener('click',()=>{document.getElementById('radar_painel').classList.remove('aberto');document.getElementById('radar_painel').setAttribute('aria-hidden','true');document.getElementById('radar_launcher').setAttribute('aria-expanded','false');});
irParaSubtela('subtela_mapeamento');
document.querySelectorAll('[onclick*="salvarAvaliacaoAtual"],[onclick*="abrirInfoMotorClinico"]').forEach(b=>b.disabled=true);
document.addEventListener('DOMContentLoaded',()=>{try{const salvo=sessionStorage.getItem('qa-exame-livre');if(salvo)window.KineSysExameLivre.preencher(JSON.parse(salvo));}catch(_){}});
`;
const reportDemo=process.argv.includes('--document-report');
const historySurgeryDemo=process.argv.includes('--history-surgeries');
const knownConditionsDemo=process.argv.includes('--known-conditions');
if(knownConditionsDemo){
 css.push('<link rel="stylesheet" href="/styles/radar_clinico_focus-3.0.0.css">');
 const helpers=read('src/patient/patient_form_helpers_core-1.0.0.js');
 const inicio=core.lastIndexOf('(function () {',core.indexOf('var VERSAO_MOTOR_HMA')),fim=core.indexOf('/* ==========================================================================',inicio);
 setup+=`\nfunction escapeHTML(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}\nfunction coletarContextoClinico(){return {hma:document.getElementById('paciente_hma').value};}\n`+
  [core.slice(core.indexOf('function kinesysDividirClausulasHMA'),core.indexOf('function confirmarLeituraHMAKineSys')),helpers.slice(helpers.indexOf('function removerAcentos'),helpers.indexOf('function obterTextoExibicao')),core.slice(core.indexOf('const TERMOS_REGIAO_ESTRITOS'),core.indexOf('function analisarPadroesIrradiacao')),core.slice(core.indexOf('function trechoDesdeUltimaQuebraNegacao'),core.indexOf('function detectarAlertasTextuaisHMA')),core.slice(inicio,fim)].join('\n')+`
 document.addEventListener('DOMContentLoaded',()=>{
  window.navegarAvaliacaoEtapaKineSys('subtela_triagem');
  const hma=document.getElementById('paciente_hma');
  const casos=[['Fratura pós-operatória','Paciente com diagnóstico de fratura de tíbia esquerda em pós-operatório há 20 dias.'],['Condições associadas','Paciente com diagnóstico de artrite reumatoide. Teve chikungunya há 4 anos. Dor no ombro direito ao elevar o braço.'],['Família e suspeita','Minha mãe tem lúpus. O paciente investiga fibromialgia e nega artrite reumatoide.']];
  for(const [nome,texto] of casos){const b=document.createElement('button');b.textContent=nome;b.type='button';b.addEventListener('click',()=>{hma.value=texto;renderizarRadarHMAKineSys();});document.getElementById('qa').appendChild(b);}
  hma.value=casos[0][1];renderizarRadarHMAKineSys();hma.addEventListener('input',()=>renderizarRadarHMAKineSys());
 });`;
}
if(historySurgeryDemo)setup+=`
function obterTextoExibicao(item){return typeof item==='string'?item:item?.exibicao||'';}
document.getElementById('paciente_hma').value='Relata dor no ombro direito que irradia para mão. Essa dor piora ao deitar à noite e agrava ao elevar o braço. Outra coisa. Dor referida na região do tornozelo, principalmente porção medial. Refere que essa dor piora ao caminhar muito ou ficar muito tempo em pé.';
window.coletarAchadosLaudoKineSys=()=>[{regiaoId:'cervical',regiao:'Coluna cervical',id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',achados:[{texto:'Spurling / compressão foraminal reproduz sintomas radiculares típicos',resultado:'positivo'},{texto:'Distração cervical reduz sintomas radiculares',resultado:'positivo'},{texto:'ULTT1 / teste neurodinâmico do nervo mediano compatível com os sintomas',resultado:'positivo'}]}];
document.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('chk_cirurgia').checked=true;
 window.preencherCirurgiasAvaliacaoKineSys([{chave:'mamoplastia_redutora',texto:'Mamoplastia Redutora',dataCirurgia:'03/2019'},{chave:'apendicectomia',texto:'Apendicectomia',dataCirurgia:'2021'}]);
 window.preencherMedicamentosAvaliacaoKineSys([{texto:'Pregabalina',nome:'Pregabalina',dosagem:'50 mg à noite'},{texto:'Dorflex (citrato de orfenadrina, dipirona monoidratada, cafeína anidra)',nome:'Dorflex',dosagem:''}]);
 window.navegarAvaliacaoEtapaKineSys('subtela_triagem');
 const bar=document.getElementById('qa');
 for(const [id,text,fn]of [['qa-formulario','Ver formulário',()=>window.navegarAvaliacaoEtapaKineSys('subtela_triagem')],['qa-relatorio','Ver relatório',()=>window.navegarAvaliacaoEtapaKineSys('subtela_diagnostico')],['qa-reabrir','Reabrir dados fictícios',()=>{const saved=JSON.parse(JSON.stringify(window.coletarCirurgiasAvaliacaoKineSys()));window.preencherCirurgiasAvaliacaoKineSys(saved);const med=JSON.parse(JSON.stringify(window.coletarMedicamentosAvaliacaoKineSys()));window.preencherMedicamentosAvaliacaoKineSys(med);}]] ){
  const b=document.createElement('button');b.id=id;b.type='button';b.textContent=text;b.addEventListener('click',fn);bar.appendChild(b);
 }
});
`;
if(reportDemo)setup+=`
document.getElementById('paciente_hma').value='Refere dor na região da coluna. Relata que investiga fibromialgia. Refere que sente dor no ombro esquerdo e dor na região do ciatico direito. Refere que sente dor há 2 anos. Refere que não houve trauma. Refere que a dor iniciou na região da lombar e descia para perna direita. Também relata que dor irradia para perna direita e braço esquerdo. Refere que já passou por 2 raqui. Refere que sente dor no calcanhar direito. Refere que tem dor de cabeça. Refere que a dor aumenta principalmente ao final do dia e a acorda durante a noite.';
Object.assign(BANCO_MAPEAMENTO_CLINICO,{lombar:{nome:'Coluna lombar',clusters:[]},quadril:{nome:'Quadril',clusters:[]},cefaleia:{nome:'Cabeça / Cefaleia — triagem',clusters:[]},tornozelo_pe:{nome:'Tornozelo e pé',clusters:[]}});
document.getElementById('grupo_regioes_mapeamento').innerHTML=['cefaleia','ombro','lombar','tornozelo_pe'].map(id=>'<label><input type="checkbox" checked data-regiao="'+id+'">'+BANCO_MAPEAMENTO_CLINICO[id].nome+'</label>').join('');
window.KineSysMotorClinico3.ultimoPlano={versao:'demo',hipoteses:[],exame:{testesPrioritarios:[]}};
document.addEventListener('DOMContentLoaded',()=>{
window.KineSysExameLivre.preencher({registros:[],rascunho:{id:'demonstracao-sem-paciente-real',texto:'SLR positivo a esquerda, Slump positivo a esquerda, Spurling positivo para dor irradiada para o ombro, Patrick fabere positivo para dor inguinal do lado esquerdo, Rotação interna associado a flexão, positivo para dor coxofemoral a esquerda'}});
window.navegarAvaliacaoEtapaKineSys('subtela_diagnostico');
document.querySelectorAll('[id^="step_indicador_"]').forEach(b=>b.setAttribute('aria-selected',String(b.id==='step_indicador_3')));
});
`;
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exame livre — prévia isolada</title>${css.join('')}<style>body{padding:20px!important;display:block!important}#tela_avaliacao{margin:0 auto!important;width:100%!important;max-width:1120px!important}#qa{max-width:1120px;margin:0 auto 16px;padding:12px;background:#17434b;color:white}.precadastro-compacto,.avaliacao-draft-toolbar{display:none!important}</style></head><body class="ks-design-ready"><p id="qa">Prévia isolada · dados fictícios · sem gravações reais no banco</p><section id="tela_avaliacao" class="tela ativa">${fragment}</section><script>${setup}</script><script src="/src/clinical/clinical_language_rules-1.0.0.js"></script><script src="/src/clinical/clinical_document_analyzer-1.0.0.js"></script>${historySurgeryDemo?'<script src="/src/clinical/cirurgias-1.18.0.js"></script><script src="/src/ui/input_helpers_core-1.0.0.js"></script><script src="/src/clinical/evaluation_context_panels-1.18.3.js"></script>':''}<script src="/src/clinical/clinical_semantic_graph-1.0.0.js"></script>${knownConditionsDemo?'<script src="/database/clinical_evidence_profiles-1.0.0.js"></script><script src="/src/clinical/clinical_evidence_reasoning-1.0.0.js"></script>':''}<script src="/src/clinical/evaluation_free_exam-1.0.0.js"></script><script src="/__workspace.js"></script></body></html>`;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
 if(url.pathname==='/__workspace.js'){res.setHeader('Content-Type','text/javascript');res.end(workspace.slice(0,workspace.indexOf('/* Product Design')));return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname));}catch(_){res.writeHead(400).end();return;}
 const permitido=['styles','assets','database','src/clinical','src/ui'].some(dir=>file.startsWith(path.join(root,dir)+path.sep));
 if(!permitido||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(fs.readFileSync(file));
}).listen(Number(process.env.KINESYS_EXAM_PREVIEW_PORT)||(historySurgeryDemo?4199:reportDemo?4186:4185),'127.0.0.1',function(){console.log('Prévia isolada do exame: http://127.0.0.1:'+this.address().port+'/');});
