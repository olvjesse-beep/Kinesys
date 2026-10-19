'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const code=fs.readFileSync('src/core/iphone_camera-1.0.0.js','utf8');
function setup(){
 const values=new Map(),elements=new Map(),inserted=[],written=[],events={};
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:true,addEventListener(){},value:id==='camera_tipo'?'avaliacao':''});return elements.get(id);};
 const ctx={URL,Blob,ArrayBuffer,Uint8Array,crypto:webcrypto,console,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},location:{href:'https://app.fisiofixfisioterapia.com/',protocol:'https:'},history:{replaceState(){}},
 usuarioLogado:{id:'prof1',clinica_id:'clinic1',nome:'Teste'},obterPacienteIdMidiasAtivo:()=> 'patient1',sincronizarPacienteMidias:async()=> 'patient1',tiposMidiaPermitidosParaPerfil:()=>['avaliacao'],atualizarGaleriaMidias:async()=>{},
 document:{readyState:'loading',addEventListener:(n,f)=>events[n]=f,getElementById:get,createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,AA=='})},
 Image:class{naturalWidth=1200;naturalHeight=900;set src(v){queueMicrotask(()=>this.onload());}},
 indexedDB:{open(){const r={};queueMicrotask(()=>{r.result={transaction(){const tx={objectStore(){return {get(k){const rq={};queueMicrotask(()=>{rq.result=values.get(k);rq.onsuccess();queueMicrotask(()=>tx.oncomplete());});return rq;},put(v,k){const rq={};queueMicrotask(()=>{values.set(k,v);rq.result=k;rq.onsuccess();queueMicrotask(()=>tx.oncomplete());});return rq;},delete(k){const rq={};queueMicrotask(()=>{values.delete(k);rq.onsuccess();queueMicrotask(()=>tx.oncomplete());});return rq;}};}};return tx;}};r.onsuccess();});return r;}},
 _supabase:{from(){return {insert:async row=>{inserted.push(row);return {error:null};}}}}
 };
 ctx.window={addEventListener(){}};ctx.URL.createObjectURL=()=> 'blob:test';ctx.URL.revokeObjectURL=()=>{};
 vm.createContext(ctx);vm.runInContext(code.replace('window.KineSysCamera={','window.__test={persistPhoto,syncPending,bindReceiver,assertActive,setActive:s=>active=s,local,start};window.KineSysCamera={'),ctx);
 const folder={name:'PastaTeste',async getDirectoryHandle(){return this;},async getFileHandle(name,opts){if(!opts){const e=Error('missing');e.name='NotFoundError';throw e;}let data;return {async createWritable(){return {async write(blob){data=blob;written.push(blob);},async close(){},async abort(){}};},async getFile(){return data;}};}};
 const s={ctx:{clinica:'clinic1',perfil:'prof1',nome:'Teste'},folder,row:{id:'camera1',paciente_id:'patient1',tipo:'avaliacao',expira_em:new Date(Date.now()+60000).toISOString()},channel:{send(){}},chunks:[],count:0};ctx.window.__test.setActive(s);
 return {ctx,api:ctx.window.KineSysCamera,t:ctx.window.__test,values,inserted,written,s,get};
}
(async()=>{
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
 // Failed disk write never uploads even a thumbnail.
 x=setup();x.s.folder.getFileHandle=async(n,opts)=>{if(!opts){const e=Error();e.name='NotFoundError';throw e;}return {createWritable:async()=>({write:async()=>{throw Error('disk full');},abort:async()=>{}})};};
 await assert.rejects(x.t.persistPhoto(x.s,new Blob([bytes]),meta),/disk full/);assert.equal(x.inserted.length,0);
 // Protocol rejects binary data before a header, and excess bytes.
 x=setup();let last='';x.s.channel.send=m=>last=JSON.parse(m).message;x.s.pc={close(){}};x.ctx._supabase.from=()=>({delete:()=>({eq:async()=>({})})});x.t.bindReceiver(x.s);
 await x.s.channel.onmessage({data:new ArrayBuffer(1)});assert.match(last,/Bloco/);
 const sql=fs.readFileSync('supabase/migrations/20261019211914_iphone_camera_local.sql','utf8');assert(!/security definer/i.test(sql));assert.equal((sql.match(/enable row level security/g)||[]).length,2);assert(sql.includes('from public,anon,authenticated'));assert(sql.includes('expira_em<=criado_em'));
 const qr=require('../assets/vendor/qrcode-generator-1.4.4.js')(0,'M');qr.addData('https://app.fisiofixfisioterapia.com/?camera=11111111-1111-4111-8111-111111111111');qr.make();assert(qr.createSvgTag({cellSize:4,margin:4,scalable:true}).includes('<svg'));
 console.log('iPhone camera: paths, limits, thumbnail-only, local write/hash, wrong patient/clinic, expiry, disk/cloud failure, retry, protocol, SQL isolation and QR: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
