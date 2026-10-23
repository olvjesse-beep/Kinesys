'use strict';
// Prévia isolada: fragmento, estilos, registro livre e compositor reais; sem core de rede/DB.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),fragment=read('screens/tela_avaliacao.html'),workspace=read('src/clinical/evaluation_workspace-1.17.0.js'),core=read('src/core/script-1.18.0.js');
const css=[...(index.match(/<link[^>]*rel="stylesheet"[^>]*>/g)||[]).filter(t=>!t.includes('data-kinesys-lazy')),
 ...['design_clinical.css','design_clinical_direction-1.17.0.css','design_evaluation_workspace-1.18.0.css','design_evaluation_context-1.18.3.css','avaliacao_experiencia-1.22.0.css','evaluation_free_exam-1.0.0.css'].map(p=>`<link rel="stylesheet" href="/styles/${p}">`)];
const setup=`
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
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exame livre — prévia isolada</title>${css.join('')}<style>body{padding:20px!important;display:block!important}#tela_avaliacao{margin:0 auto!important;width:100%!important;max-width:1120px!important}#qa{max-width:1120px;margin:0 auto 16px;padding:12px;background:#17434b;color:white}.precadastro-compacto,.avaliacao-draft-toolbar{display:none!important}</style></head><body class="ks-design-ready"><p id="qa">Prévia isolada · dados fictícios · sem gravações reais no banco</p><section id="tela_avaliacao" class="tela ativa">${fragment}</section><script>${setup}</script><script src="/src/clinical/evaluation_free_exam-1.0.0.js"></script><script src="/__workspace.js"></script></body></html>`;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
 if(url.pathname==='/__workspace.js'){res.setHeader('Content-Type','text/javascript');res.end(workspace.slice(0,workspace.indexOf('/* Product Design')));return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname));}catch(_){res.writeHead(400).end();return;}
 const permitido=['styles','assets','src/clinical'].some(dir=>file.startsWith(path.join(root,dir)+path.sep));
 if(!permitido||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(file));
}).listen(4185,'127.0.0.1',()=>console.log('Prévia isolada do exame: http://127.0.0.1:4185/'));
