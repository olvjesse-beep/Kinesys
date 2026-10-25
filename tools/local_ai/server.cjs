'use strict';
// Optional loopback-only evaluation laboratory. Never reads a patient database.
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const documentEngine=require('./report_engine.cjs');
const ROOT=path.resolve(__dirname,'../..'),MODEL=documentEngine.MODEL;
const TYPES=['sintoma','antecedente','medicamento','exame','medida','hipotese_relatada','contexto','informacao_pendente'];
const {SCHEMA,SYSTEM}=documentEngine;
function input(raw){
 if(!raw||typeof raw!=='object'||!raw.contexto||!Array.isArray(raw.fontes))throw Error('Entrada inválida.');
 const contexto={};for(const key of ['clinicaId','pacienteId','avaliacaoId','revisao']){const v=raw.contexto[key];if(!['string','number'].includes(typeof v)||!String(v).trim()||String(v).length>180)throw Error('Contexto incompleto.');contexto[key]=String(v);}
 if(!contexto.pacienteId||!contexto.avaliacaoId)throw Error('Informe paciente e avaliação da sessão.');
 if(!raw.fontes.length||raw.fontes.length>100)throw Error('Quantidade de fontes inválida.');
 const seen=new Set();let total=0;
 const fontes=raw.fontes.map(f=>{if(!f||typeof f.id!=='string'||!/^[-\w:.\[\]]{1,160}$/.test(f.id)||seen.has(f.id)||typeof f.texto!=='string'||!f.texto.trim()||f.texto.length>16000)throw Error('Fonte inválida.');seen.add(f.id);total+=f.texto.length;return {id:f.id,tipo:String(f.tipo||'contexto').slice(0,80),texto:f.texto,resultado:String(f.resultado||'').slice(0,40),regiaoId:String(f.regiaoId||'').slice(0,80)};});
 if(total>24000)throw Error('A avaliação excede o limite deste piloto; nada foi truncado.');
 const snapshot={contexto,fontes},hashEntrada=crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');return {...snapshot,hashEntrada};
}
function graph(){const c={};c.window=c;vm.createContext(c);for(const f of ['clinical_language_rules-1.0.0.js','clinical_semantic_graph-1.0.0.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'src/clinical',f),'utf8'),c);return c.KineSysSemanticGraph;}
function validate(output,snapshot,engine=graph()){
 if(!output||!Array.isArray(output.fatos)||!Array.isArray(output.paragrafos)||!Array.isArray(output.duvidas)||output.fatos.length>250||output.paragrafos.length>60)throw Error('Formato do modelo inválido.');
 const sources=new Map(snapshot.fontes.map(f=>[f.id,f])),facts=new Map(),avisos=[];
 const numbers=s=>s.match(/\d+(?:[.,]\d+)?/g)||[];
 for(const raw of output.fatos){
  if(!raw||typeof raw.id!=='string'||raw.id.length>160||facts.has(raw.id)||!TYPES.includes(raw.tipo)||typeof raw.trecho!=='string'||!raw.trecho.trim()||raw.trecho.length>16000)throw Error('Fato inválido.');
  // The fact layer is documentary, never a model-written paraphrase.
  if(raw.redacao!==undefined&&raw.redacao!==raw.trecho)throw Error('Fato documental alterado.');
  const f={id:raw.id,fonteId:raw.fonteId,trecho:raw.trecho,redacao:raw.trecho,tipo:raw.tipo};
  const src=sources.get(f.fonteId);if(!src||!src.texto.includes(f.trecho))throw Error('Fato sem trecho literal na fonte.');
  const sentences=[...new Intl.Segmenter('pt-BR',{granularity:'sentence'}).segment(src.texto)].map(s=>s.segment.trim());
  if(!sentences.includes(f.trecho))throw Error('A citação precisa preservar a frase completa da fonte.');
  const parsed=engine.analisar(f.trecho);
  if(!parsed.proposicoes.length)avisos.push('Conferir a interpretação da fonte '+src.id+'; verificação semântica automática limitada.');
  facts.set(f.id,{...f,verificacao:parsed.proposicoes.length?'regras_locais_sem_garantia_clinica':'conferencia_profissional',fonteTipo:src.tipo,resultadoFonte:src.resultado});
 }
 if(!facts.size)throw Error('O modelo não extraiu fatos verificáveis.');
 const used=new Set(),paragraphs=[],pending=[];
 if(output.pendencias!==undefined&&!Array.isArray(output.pendencias))throw Error('Pendências inválidas.');
 for(const p of output.pendencias||[]){const f=facts.get(p.fatoId);if(!f||used.has(f.id)||p.motivo!=='instrucao_na_fonte'||!documentEngine.isInstruction(f.trecho))throw Error('Pendência sem origem válida.');used.add(f.id);pending.push({fatoId:f.id,fonteId:f.fonteId,trecho:f.trecho,motivo:p.motivo});}
 for(const p of output.paragrafos){
  if(!p||typeof p.texto!=='string'||!p.texto.trim()||p.texto.length>8000||!Array.isArray(p.fatoIds)||!p.fatoIds.length||p.fatoIds.some(id=>!facts.has(id)||pending.some(item=>item.fatoId===id)))throw Error('Parágrafo sem vínculo válido.');
  const bases=p.fatoIds.map(id=>facts.get(id).redacao),allowed=bases.join(' '),check=engine.validar(engine.analisar(allowed),p.texto);
  if(!check.ok||numbers(p.texto).some(n=>!numbers(allowed).includes(n)))throw Error('Parágrafo incompatível com os fatos vinculados.');
  p.fatoIds.forEach(id=>used.add(id));paragraphs.push({texto:p.texto,fatoIds:[...new Set(p.fatoIds)]});
 }
 if(!paragraphs.length||[...facts.keys()].some(id=>!used.has(id)))throw Error('Há fatos extraídos sem incorporação ao rascunho.');
 for(const src of snapshot.fontes){const quoted=new Set([...facts.values()].filter(f=>f.fonteId===src.id).map(f=>f.trecho));
  for(const sentence of new Intl.Segmenter('pt-BR',{granularity:'sentence'}).segment(src.texto))if(!quoted.has(sentence.segment.trim()))throw Error('Há uma frase da avaliação sem extração documental.');
 }
 for(const d of output.duvidas){if(typeof d!=='string'||d.length>2000)throw Error('Dúvida inválida.');avisos.push(d);}
 return {contexto:snapshot.contexto,hashEntrada:snapshot.hashEntrada,modelo:documentEngine.MODELS.includes(output.modelo)?output.modelo:MODEL,rascunho:paragraphs.map(p=>p.texto).join('\n\n'),fatos:[...facts.values()],paragrafos:paragraphs,pendencias:pending,avisos:[...new Set(avisos)],analiseDocumental:output.analiseDocumental||null,metricas:output.metricas||null,pipeline:output.pipeline||'contrato_documental',revisaoObrigatoria:true,aplicacaoAutomatica:false};
}
function createServer({port=8766,infer}={}){
 const local=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]),allowed=new Set([...local,'http://127.0.0.1:4173','http://localhost:4173','https://app.fisiofixfisioterapia.com']);
 const sessions=new Map(),pin=String(crypto.randomInt(10000000,100000000));let attempts=0,busy=false;
 const engine=graph();
 const inferDocument=infer||(snapshot=>documentEngine.generate(snapshot,{graph:engine}));
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin||'',host=req.headers.host||'';let url;
  try{if(!req.url.startsWith('/'))throw Error();url=new URL(req.url,'http://127.0.0.1');}catch{res.writeHead(400);return res.end();}
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'"};
  const send=(status,data)=>{res.writeHead(status,{...headers,'Content-Type':'application/json;charset=utf-8'});res.end(JSON.stringify(data));};
  if(!new Set([`127.0.0.1:${port}`,`localhost:${port}`]).has(host))return send(403,{erro:'Host não permitido.'});
  if(origin&&!allowed.has(origin))return send(403,{erro:'Origem não permitida.'});
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin';}
  if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'300'});return res.end();}
  if(req.method==='GET'&&url.pathname==='/api/health')return send(200,{servico:'KineSys IA local — piloto de avaliação',modelo:MODEL,somenteLocal:true});
  if(req.method==='GET'&&url.pathname==='/api/session'){
   if(origin&&!local.has(origin)||req.headers['sec-fetch-site']==='cross-site')return send(403,{erro:'Abra o painel no computador local.'});
   return send(200,{codigo:pin});
  }
  if(req.method==='GET'&&url.pathname==='/connector.js'){res.writeHead(200,{...headers,'Content-Type':'text/javascript;charset=utf-8'});return res.end(fs.readFileSync(path.join(ROOT,'src/clinical/evaluation_local_ai-1.0.0.js')));}
  if(req.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)){
   const name=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.join(__dirname,'ui',name);res.writeHead(200,{...headers,'Content-Type':name.endsWith('.html')?'text/html;charset=utf-8':name.endsWith('.js')?'text/javascript;charset=utf-8':'text/css;charset=utf-8'});return res.end(fs.readFileSync(file));
  }
  if(req.method!=='POST'||!origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(400,{erro:'Requisição inválida.'});
  const chunks=[];let bytes=0;try{
   for await(const chunk of req){bytes+=chunk.length;if(bytes>160000)throw Error('Entrada excessiva.');chunks.push(chunk);}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(url.pathname==='/api/pair'){
    if(++attempts>30)return send(429,{erro:'Limite de pareamentos atingido; reinicie o serviço local.'});
    if(typeof data.codigo!=='string'||data.codigo!==pin)return send(403,{erro:'Código inválido.'});
    const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{origin,expires:Date.now()+30*60*1000});return send(200,{token,expiraEm:30*60});
   }
   if(url.pathname!=='/api/avaliacao')return send(404,{erro:'Rota não encontrada.'});
   const token=(req.headers.authorization||'').replace(/^Bearer /,''),session=sessions.get(token);
   if(!session||session.origin!==origin||session.expires<Date.now())return send(401,{erro:'Conecte novamente a IA local.'});
   const snapshot=input(data);if(busy)return send(409,{erro:'Há uma avaliação em processamento. Aguarde.'});
   busy=true;try{const result=validate(await inferDocument(snapshot),snapshot,engine);if(!res.destroyed)send(200,result);}finally{busy=false;}
  }catch(error){if(!res.headersSent)send(422,{erro:/^[A-Za-zÀ-ÿ0-9 ,.;:—-]{1,180}$/.test(error.message)?error.message:'Não foi possível validar a resposta local. Nenhum relatório foi alterado.'});}
 });
 server.requestTimeout=300000;server.headersTimeout=15000;return server;
}
if(require.main===module){const server=createServer();server.listen(8766,'127.0.0.1',()=>console.log('KineSys IA local: http://127.0.0.1:8766/ — sem gravação de prontuários ou logs de conteúdo.'));}
module.exports={input,validate,createServer,SCHEMA,MODEL,SYSTEM};
