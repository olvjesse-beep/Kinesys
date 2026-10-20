'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const real=require('../src/core/camera_transport-1.0.0.js'),source=fs.readFileSync('src/core/camera_phone-1.0.0.js','utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup({invalid=false,cameraFailure=false,cameraNever=false,helloFailure=false,pending=false}={}){
 const nodes=new Map(),events={},calls=[],cap=real.capability();let cameraCalls=0,stopped=0,closed=0,cleaned='';
 const get=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,hidden:false,value:0,textContent:'',videoWidth:640,videoHeight:480,addEventListener:(name,fn)=>events[id+':'+name]=fn,setAttribute(){},play:async()=>{}});return nodes.get(id);};
 const relay={request:async(op,body)=>{calls.push({op,body});if(op==='hello'&&helloFailure)throw Error('O outro aparelho não respondeu.');return op==='end'?{saved:true,pending}:{ready:true};},close:()=>closed++};
 const context={console,Blob,Uint8Array,URLSearchParams,crypto:webcrypto,history:{replaceState:(a,b,url)=>cleaned=url},location:{hash:invalid?'':`#r=${cap.room}&k=${cap.secret}&e=${cap.expires}`,pathname:'/camera.html',search:''},setTimeout:(fn,ms)=>{if(ms>=12000&&!cameraNever)return setTimeout(fn,ms);queueMicrotask(fn);return 0;},clearTimeout,navigator:{mediaDevices:{getUserMedia:async()=>{cameraCalls++;if(cameraFailure)throw Error('denied');if(cameraNever)return new Promise(()=>{});return {getTracks:()=>[{stop:()=>stopped++}]};}}},document:{readyState:'complete',getElementById:get,createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:fn=>fn(new Blob([new Uint8Array([255,216,255,224])],{type:'image/jpeg'}))})},window:{addEventListener:(name,fn)=>events[name]=fn,KineSysCameraTransport:{...real,connect:async()=>relay}}};
 vm.runInNewContext(source,context);return {get,events,calls,context,cameraCalls:()=>cameraCalls,stopped:()=>stopped,closed:()=>closed,cleaned:()=>cleaned};
}
(async()=>{
 let x=setup({invalid:true});await settle();assert.equal(x.cameraCalls(),0);assert.match(x.get('phone_status').textContent,/expirado/);assert.equal(x.cleaned(),'/camera.html');
 x=setup();await settle();assert.equal(x.get('phone_capture').disabled,false);assert.equal(x.calls[0].op,'hello');assert.equal(x.cleaned(),'/camera.html');
 const a=x.events['phone_capture:click'](),b=x.events['phone_capture:click']();await Promise.all([a,b]);await settle();assert.deepEqual(x.calls.map(c=>c.op),['hello','start','chunk','end','received']);assert.match(x.get('phone_status').textContent,/Foto salva no computador/);assert(x.stopped()>0);assert(x.closed()>0);
 x=setup({cameraFailure:true,pending:true});await settle();assert.equal(x.get('phone_capture').disabled,true);assert.equal(x.get('phone_file').disabled,false);x.events['phone_file:change']({target:{files:[new Blob([new Uint8Array([255,216,255,224])],{type:'image/jpeg'})],value:'fake'}});await settle();await settle();assert.match(x.get('phone_status').textContent,/miniatura aguarda/);
 x=setup({helloFailure:true});await settle();assert.equal(x.get('phone_file').disabled,true);assert.match(x.get('phone_status').textContent,/não respondeu/);assert(x.stopped()>0);
 x=setup({cameraNever:true});await settle();assert.equal(x.get('phone_capture').disabled,true);assert.equal(x.get('phone_file').disabled,false);assert.match(x.get('phone_placeholder').textContent,/Abrir câmera/);x.events['phone_close:click']();
 const html=fs.readFileSync('camera.html','utf8'),index=fs.readFileSync('index.html','utf8'),desktop=fs.readFileSync('src/core/iphone_camera-1.0.0.js','utf8');
 assert(!/script-1\.18|supabase-js|tela_login/.test(html));assert(!/_supabase|localStorage|sessionStorage|fetch\(/.test(source));assert(!/RTCPeerConnection|receivePhone|cameraId/.test(desktop));assert(desktop.includes("new URL('camera.html'"));assert(desktop.includes('link.hash=new URLSearchParams'));assert(index.indexOf('src/core/camera_transport-1.0.0.js')<index.indexOf('src/core/iphone_camera-1.0.0.js'));assert(!index.includes('entre com a mesma conta e perfil'));
 console.log('Phone: no-login boot, removed URL secret, invalid QR, camera permission fallback, double tap, automatic transfer, saved/pending and bounded failure: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
