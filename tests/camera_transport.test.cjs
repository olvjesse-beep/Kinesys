'use strict';
const assert=require('node:assert/strict'),transport=require('../src/core/camera_transport-1.0.0.js');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Socket{
 static all=[];static packets=[];static dropReplies=0;static refuse=false;
 constructor(){this.readyState=0;this.listeners={};Socket.all.push(this);queueMicrotask(()=>{this.readyState=1;this.event('open',{});});}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 event(name,data){for(const fn of this.listeners[name]||[])fn(data);}
 send(raw){const m=JSON.parse(raw);Socket.packets.push(m);if(m.event==='phx_join'){this.topic=m.topic;queueMicrotask(()=>this.event('message',{data:JSON.stringify({topic:m.topic,event:'phx_reply',ref:m.ref,payload:{status:Socket.refuse?'error':'ok'}})}));}
  if(m.event==='broadcast')for(const target of Socket.all)if(target!==this&&target.readyState===1&&target.topic===m.topic){if(m.payload.payload.from==='desktop'&&Socket.dropReplies){Socket.dropReplies--;continue;}queueMicrotask(()=>target.event('message',{data:JSON.stringify(m)}));}}
 close(){this.readyState=3;this.event('close',{});}
}
async function main(){
 const native=global.WebSocket;let desktop,phone;
 try{
  const cap=transport.capability(),key=await transport.importKey(cap.secret);assert.notEqual(cap.room,cap.secret);assert.equal(new Set(Array.from({length:100},()=>transport.capability().room)).size,100);
  transport.validate(cap);assert.throws(()=>transport.validate({...cap,expires:Date.now()-1}),/expirado/);assert.throws(()=>transport.validate({...cap,secret:'bad'}));
  const packet=await transport.seal(key,cap,'phone',{id:'a'.repeat(64),body:'confidential-photo-marker'});
  assert(!JSON.stringify(packet).includes('confidential-photo-marker'));assert.equal((await transport.open(key,cap,'phone',packet)).body,'confidential-photo-marker');
  await assert.rejects(transport.open(await transport.importKey('a'.repeat(64)),cap,'phone',packet));await assert.rejects(transport.open(key,cap,'desktop',packet));await assert.rejects(transport.open(key,{...cap,room:'b'.repeat(64)},'phone',packet));
  global.WebSocket=Socket;let writes=0;
  desktop=await transport.connect(cap,'desktop',async(op,body)=>{if(op==='save'){writes++;await sleep(12);return {saved:body.value};}throw Error('rejected');});
  phone=await transport.connect(cap,'phone',async()=>({}));
  Socket.dropReplies=1;assert.equal((await phone.request('save',{value:'synthetic-photo'},25)).saved,'synthetic-photo');assert.equal(writes,1,'Lost acknowledgement must not repeat a disk write');
  await assert.rejects(phone.request('unknown',{},25),/rejected/);
  assert(!JSON.stringify(Socket.packets).includes('synthetic-photo'),'Only ciphertext leaves the browser');
  assert(!Socket.packets.some(m=>m.event==='phx_join'&&m.payload.access_token),'No user JWT, anonymous Auth or database access');
  desktop.close();desktop=null;await assert.rejects(phone.request('save',{},15),/não respondeu/);phone.close();phone=null;
  Socket.refuse=true;await assert.rejects(transport.connect(transport.capability(),'phone',async()=>{}),/encerrada/);Socket.refuse=false;
  let expired=false;const short={...transport.capability(),expires:Date.now()+150};desktop=await transport.connect(short,'desktop',async()=>({}),()=>{expired=true;});await sleep(250);assert(expired);desktop.close();desktop=null;
  // Optional real public Broadcast test: synthetic bytes only, no Auth or patient DB writes.
  if(process.env.RUN_CAMERA_LIVE==='1'){
   global.WebSocket=native;const {setup}=require('./iphone_camera.test.cjs'),x=setup(),c=transport.capability(),device='c'.repeat(64);
   const bytes=new Uint8Array([255,216,255,224,...Array.from({length:100000},(_,i)=>i%256)]),sha256=await x.api.hash(bytes.buffer);
   desktop=await transport.connect(c,'desktop',(op,body)=>x.t.handleCaptureRequest(x.s,op,body));phone=await transport.connect(c,'phone',async()=>({}));
   await phone.request('hello',{device});await phone.request('start',{device,op:'start',size:bytes.length,mime:'image/jpeg',sha256});
   let seq=0;for(let i=0;i<bytes.length;i+=transport.CHUNK){await phone.request('chunk',{device,seq:seq++,data:transport.b64(bytes.subarray(i,i+transport.CHUNK))});await sleep(150);}
   const r=await phone.request('end',{device});assert.equal(r.saved,true);await phone.request('received',{device});clearTimeout(x.s.receiptTimer);assert.equal(x.written.length,1);assert.equal(x.inserted.length,1);assert.equal(await x.api.hash(await x.written[0].arrayBuffer()),sha256);assert.equal(x.inserted[0].paciente_id,'patient1');assert(!('original' in x.inserted[0]));x.t.setActive(null);
   console.log('LIVE: anonymous encrypted photo transfer, local hash and thumbnail-only persistence: PASS');
  }
  console.log('Camera transport: encryption, wrong key/role/room, retry idempotency, timeouts, refusal, expiry: PASS');
 }finally{desktop?.close();phone?.close();global.WebSocket=native;}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
