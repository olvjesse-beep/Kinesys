'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const code=fs.readFileSync('src/core/iphone_camera-1.0.0.js','utf8');
function setup(){
 const values=new Map(),elements=new Map(),inserted=[],written=[],events={};
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:true,addEventListener(){},value:id==='camera_tipo'?'avaliacao':''});return elements.get(id);};
 const ctx={URL,Blob,ArrayBuffer,Uint8Array,AbortController,crypto:webcrypto,console,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},location:{href:'https://app.fisiofixfisioterapia.com/',protocol:'https:'},history:{replaceState(){}},
 usuarioLogado:{id:'prof1',clinica_id:'clinic1',nome:'Teste'},obterPacienteIdMidiasAtivo:()=> 'patient1',sincronizarPacienteMidias:async()=> 'patient1',tiposMidiaPermitidosParaPerfil:()=>['avaliacao'],atualizarGaleriaMidias:async()=>{},
 document:{readyState:'loading',addEventListener:(n,f)=>events[n]=f,getElementById:get,createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,AA=='})},
 Image:class{naturalWidth=1200;naturalHeight=900;set src(v){queueMicrotask(()=>this.onload());}},
 indexedDB:{open(){const r={};queueMicrotask(()=>{r.result={transaction(){const tx={objectStore(){return {get(k){const rq={};queueMicrotask(()=>{rq.result=values.get(k);rq.onsuccess?.();queueMicrotask(()=>tx.oncomplete());});return rq;},put(v,k){const rq={};queueMicrotask(()=>{values.set(k,v);rq.result=k;rq.onsuccess?.();queueMicrotask(()=>tx.oncomplete());});return rq;},delete(k){const rq={};queueMicrotask(()=>{values.delete(k);rq.onsuccess?.();queueMicrotask(()=>tx.oncomplete());});return rq;}};}};return tx;}};r.onsuccess();});return r;}},
 _supabase:{from(){return {insert:async row=>{inserted.push(row);return {error:null};}}}}
 };
 ctx.window={addEventListener(){},KineSysCameraTransport:require('../src/core/camera_transport-1.0.0.js')};ctx.URL.createObjectURL=()=> 'blob:test';ctx.URL.revokeObjectURL=()=>{};
 vm.createContext(ctx);vm.runInContext(code.replace('window.KineSysCamera={','window.__test={persistPhoto,syncPending,handleCaptureRequest,assertActive,setActive:s=>active=s,local,start};window.KineSysCamera={'),ctx);
 const folder={name:'PastaTeste',async getDirectoryHandle(){return this;},async getFileHandle(name,opts){if(!opts){const e=Error('missing');e.name='NotFoundError';throw e;}let data;return {async createWritable(){return {async write(blob){data=blob;written.push(blob);},async close(){},async abort(){}};},async getFile(){return data;}};}};
 const s={ctx:{clinica:'clinic1',perfil:'prof1',nome:'Teste'},folder,row:{id:'camera1',paciente_id:'patient1',tipo:'avaliacao',expira_em:new Date(Date.now()+60000).toISOString()},channel:{send(){}},chunks:[],count:0};ctx.window.__test.setActive(s);
 return {ctx,api:ctx.window.KineSysCamera,t:ctx.window.__test,values,inserted,written,s,get};
}
if(require.main===module)(async()=>{
 let x=setup();assert.equal(x.api.safe('pac_123'),'pac_123');for(const bad of ['../x','C:\\fotos','a/b','', '<svg>'])assert.throws(()=>x.api.safe(bad));
 const bytes=new Uint8Array([255,216,255,224]),digest=await x.api.hash(bytes.buffer),meta={op:'start',size:4,mime:'image/jpeg',sha256:digest};
 assert.throws(()=>x.api.validateMagic(new Uint8Array([60,115,118,103]).buffer,'image/jpeg'),/conteúdo/);
 assert.equal(x.api.validateMeta(meta).size,4);for(const bad of [{...meta,size:26214401},{...meta,mime:'text/html'},{...meta,sha256:'bad'},{...meta,size:0}])assert.throws(()=>x.api.validateMeta(bad));
 const saved=await x.t.persistPhoto(x.s,new Blob([bytes],{type:'image/jpeg'}),meta);
 assert.equal(x.written.length,1);assert.equal(x.inserted.length,1);assert.equal(saved.tamanho_bytes,4);assert.equal(saved.paciente_id,'patient1');assert.equal(saved.largura,480);assert.equal(saved.altura,360);
 assert.equal(x.inserted[0].miniatura,'data:image/jpeg;base64,AA==');assert(!('original' in x.inserted[0]));assert.equal((await x.t.local('get','pending:clinic1:prof1')).length,0);
 // Hash/length failures must not touch disk or cloud.
 x=setup();await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),{...meta,sha256:'0'.repeat(64)}),/incompleta/);assert.equal(x.written.length,0);assert.equal(x.inserted.length,0);
 x=setup();await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),{...meta,size:9}),/incompleta/);assert.equal(x.written.length,0);
 // Patient, clinic and expiration changes invalidate the immutable destination.
 x=setup();x.ctx.obterPacienteIdMidiasAtivo=()=> 'different';await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),meta),/paciente mudou/);assert.equal(x.written.length,0);
 x=setup();x.ctx.usuarioLogado.clinica_id='other';await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),meta),/clínica mudou/);assert.equal(x.written.length,0);
 x=setup();x.s.row.expira_em='2000-01-01';await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),meta),/expirou/);
 // An offline cloud keeps the original AND a durable outbox, and does not report success.
 x=setup();x.ctx._supabase.from=()=>({insert:async()=>({error:{code:'NETWORK'}})});
 await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),meta),/Original salvo/);assert.equal(x.written.length,1);assert.equal((await x.t.local('get','pending:clinic1:prof1')).length,1);
 x.ctx._supabase.from=()=>({insert:async()=>({error:null})});await x.t.syncPending();assert.equal((await x.t.local('get','pending:clinic1:prof1')).length,0);
 // A hung thumbnail service is bounded, preserves the outbox and confirms only the local save.
 x=setup();x.ctx.setTimeout=(fn,ms)=>setTimeout(fn,ms===15000?5:ms);x.ctx._supabase.from=()=>({insert:()=>new Promise(()=>{})});
 let offlineError;try{await x.t.persistPhoto(x.s,new Blob([bytes]),meta);}catch(e){offlineError=e;}assert(offlineError.savedId);assert.equal(x.written.length,1);assert.equal((await x.t.local('get','pending:clinic1:prof1')).length,1);
 // Processing one photo cannot discard another photo added to the outbox mid-request.
 x=setup();const first={id:'first',paciente_id:'patient1'},second={id:'second',paciente_id:'patient2'};await x.t.local('put','pending:clinic1:prof1',[first]);
 x.ctx._supabase.from=()=>({insert:async()=>{await x.t.local('put','pending:clinic1:prof1',[first,second]);return {error:null};}});await x.t.syncPending(x.s.ctx,'first');assert.equal((await x.t.local('get','pending:clinic1:prof1'))[0].id,'second');
 // Failed disk write never uploads even a thumbnail.
 x=setup();x.s.folder.getFileHandle=async(n,opts)=>{if(!opts){const e=Error();e.name='NotFoundError';throw e;}return {createWritable:async()=>({write:async()=>{throw Error('disk full');},abort:async()=>{}})};};
 await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),meta),/disk full/);assert.equal(x.inserted.length,0);
 // A single phone, ordered bytes and complete header are required before disk writes.
 const device='a'.repeat(64),transport=require('../src/core/camera_transport-1.0.0.js');
 x=setup();await assert.rejects(x.t.handleCaptureRequest(x.s,'chunk',{device,seq:0,data:transport.b64(bytes)}),/não autorizado/);
 await x.t.handleCaptureRequest(x.s,'hello',{device});
 await assert.rejects(x.t.handleCaptureRequest(x.s,'hello',{device:'b'.repeat(64)}),/outro celular/);
 await assert.rejects(x.t.handleCaptureRequest(x.s,'chunk',{device,seq:0,data:transport.b64(bytes)}),/fora de ordem/);
 await x.t.handleCaptureRequest(x.s,'start',{...meta,device});
 await assert.rejects(x.t.handleCaptureRequest(x.s,'start',{...meta,device}),/única foto/);
 await assert.rejects(x.t.handleCaptureRequest(x.s,'chunk',{device,seq:1,data:transport.b64(bytes)}),/fora de ordem/);
 await assert.rejects(x.t.handleCaptureRequest(x.s,'end',{device}),/incompleta/);
 await assert.rejects(x.t.handleCaptureRequest(x.s,'chunk',{device,seq:0,data:transport.b64(new Uint8Array(5))}),/maior/);
 await x.t.handleCaptureRequest(x.s,'chunk',{device,seq:0,data:transport.b64(bytes)});
 await assert.rejects(x.t.handleCaptureRequest(x.s,'chunk',{device,seq:0,data:transport.b64(bytes)}),/fora de ordem/);
 const result=await x.t.handleCaptureRequest(x.s,'end',{device});assert.equal(result.saved,true);assert.equal(x.written.length,1);assert.equal(x.inserted[0].paciente_id,'patient1');
 await x.t.handleCaptureRequest(x.s,'received',{device});clearTimeout(x.s.receiptTimer);
 await assert.rejects(x.t.handleCaptureRequest(x.s,'end',{device}),/incompleta/);assert.equal(x.written.length,1);
 x.t.setActive(null);
 const sql=fs.readFileSync('supabase/migrations/20261019211914_iphone_camera_local.sql','utf8');assert(!/security definer/i.test(sql));assert.equal((sql.match(/enable row level security/g)||[]).length,2);assert(sql.includes('from public,anon,authenticated'));assert(sql.includes('expira_em<=criado_em'));
 const cap=transport.capability(),link=new URL('camera.html','https://app.fisiofixfisioterapia.com/');link.hash=new URLSearchParams({r:cap.room,k:cap.secret,e:String(cap.expires)});assert.equal(link.search,'');
 const qr=require('../assets/vendor/qrcode-generator-1.4.4.js')(0,'M');qr.addData(link.href);qr.make();assert(qr.createSvgTag({cellSize:4,margin:4,scalable:true}).includes('<svg'));
 // Real desktop startup: double clicks create one room; a late connection cannot attach to another patient.
 x=setup();x.t.setActive(null);x.s.folder.queryPermission=async()=> 'granted';await x.t.local('put','folder:clinic1:prof1',x.s.folder);
 x.ctx.qrcode=()=>({addData(){},make(){},createSvgTag:()=>'<svg></svg>'});let connections=0,resolveConnect,closed=0;
 x.ctx.window.KineSysCameraTransport={...transport,connect:()=>{connections++;return new Promise(resolve=>resolveConnect=resolve);}};
 const starting=x.t.start();await x.t.start();await new Promise(resolve=>setImmediate(resolve));assert.equal(connections,1);
 x.ctx.obterPacienteIdMidiasAtivo=()=> 'patient2';resolveConnect({close:()=>closed++,request:async()=>({})});await starting;assert.equal(closed,1);assert.equal(x.get('camera_pair').hidden,true);assert.match(x.get('camera_status').textContent,/paciente mudou/);
 console.log('iPhone camera: paths, limits, thumbnail-only, local write/hash, wrong patient/clinic, expiry, disk/cloud failure, retry, protocol, SQL isolation and QR: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={setup};
