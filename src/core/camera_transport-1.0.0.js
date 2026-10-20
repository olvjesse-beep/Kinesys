/* Ephemeral camera transport. No Auth, REST, Storage, SQL or replay.
 * Public Broadcast is only the carrier: room + AES-256 key are random capabilities.
 * Photo bytes and protocol commands are encrypted before entering the socket. */
(function(root){
 'use strict';
 const CONFIG={url:'https://yulkylvkofeisbjwnxhe.supabase.co',key:'sb_publishable_STAVKxWe_UAlyADqxyQxjQ_c3NP5npE'};
 const MAX=25*1024*1024,CHUNK=48*1024,TTL=10*60*1000;
 const enc=new TextEncoder(),dec=new TextDecoder();
 function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=4096)s+=String.fromCharCode(...bytes.subarray(i,i+4096));return btoa(s);}
 function unb64(s){if(typeof s!=='string'||s.length>130000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('Pacote de captura inválido.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
 function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
 function capability(){return {room:token(),secret:token(),expires:Date.now()+TTL};}
 function validate(c){if(!c||!/^([a-f0-9]{64})$/.test(c.room)||!/^([a-f0-9]{64})$/.test(c.secret)||!Number.isSafeInteger(c.expires)||c.expires<=Date.now()||c.expires>Date.now()+TTL+5000)throw Error('QR code inválido ou expirado. Gere outro no computador.');}
 async function importKey(secret){return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),h=>parseInt(h,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
 async function seal(key,c,from,message){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(c.room+':'+from)},key,enc.encode(JSON.stringify(message)));return {v:2,from,iv:b64(iv),data:b64(new Uint8Array(data))};}
 async function open(key,c,from,packet){if(packet?.v!==2||packet.from!==from||typeof packet.iv!=='string'||packet.iv.length!==16)throw Error('Pacote inválido.');return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(packet.iv),additionalData:enc.encode(c.room+':'+from)},key,unb64(packet.data))));}
 async function connect(c,role,handler,onError=()=>{}){
  validate(c);if(!['desktop','phone'].includes(role))throw Error('Perfil de conexão inválido.');
  const aes=await importKey(c.secret),remote=role==='desktop'?'phone':'desktop';
  const topic='realtime:ks-camera-v2-'+c.room,pending=new Map(),seen=new Map();let ref=0,closed=false,joined=false,heartbeat,deadline,queue=Promise.resolve(),queued=0,bad=0;
  const socket=new WebSocket(CONFIG.url.replace(/^https:/,'wss:')+'/realtime/v1/websocket?apikey='+encodeURIComponent(CONFIG.key)+'&vsn=1.0.0');
  let resolveJoin,rejectJoin;const ready=new Promise((resolve,reject)=>{resolveJoin=resolve;rejectJoin=reject;});
  const timeout=setTimeout(()=>fail('Não foi possível abrir a conexão em 15 segundos. Verifique a internet e tente novamente.'),15000);
  function live(){if(closed||Date.now()>=c.expires)throw Error('A conexão expirou ou foi encerrada. Gere outro QR code.');}
  function frame(event,payload,t=topic){live();if(socket.readyState!==1)throw Error('A conexão foi interrompida. Gere outro QR code.');socket.send(JSON.stringify({topic:t,event,payload,ref:String(++ref)}));}
  async function emit(message){live();const packet=await seal(aes,c,role,message);live();frame('broadcast',{type:'broadcast',event:'capture',payload:packet});}
  function close(){if(closed)return;closed=true;clearTimeout(timeout);clearTimeout(deadline);clearInterval(heartbeat);for(const p of pending.values())p.reject(Error('Conexão encerrada. Confira o computador antes de repetir a foto.'));pending.clear();seen.clear();socket.close();if(!joined)rejectJoin(Error('A conexão foi encerrada.'));}
  function fail(message){if(closed)return;close();onError(Error(message));}
  async function receive(packet){
   let m;try{m=await open(aes,c,remote,packet);}catch(_){if(++bad>=12)fail('Conexão inválida. Gere outro QR code.');return;}
   live();if(!m||typeof m.id!=='string'||!/^[a-f0-9]{64}$/.test(m.id))return;
   if(m.reply){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(String(m.error).slice(0,700))):p.resolve(m.value);}return;}
   if(typeof m.op!=='string'||m.op.length>30)return;
   // Same id, including retries during disk writes, shares one result. Never save twice.
   let work=seen.get(m.id);if(!work){if(seen.size>=3000){fail('Limite da captura atingido. Gere outro QR code.');return;}
    work=Promise.resolve().then(()=>handler(m.op,m.body));seen.set(m.id,work);}
   let answer;try{answer={id:m.id,reply:true,value:await work};}catch(e){answer={id:m.id,reply:true,error:String(e?.message||e).slice(0,700)};}
   if(!closed)await emit(answer);
  }
  socket.addEventListener('open',()=>{try{frame('phx_join',{config:{broadcast:{ack:false,self:false},presence:{enabled:false},private:false}});}catch(e){fail(e.message);}});
  socket.addEventListener('message',e=>{
   if(closed||typeof e.data!=='string'||e.data.length>145000)return;let m;try{m=JSON.parse(e.data);}catch(_){return;}
   if(m.topic!==topic&&m.topic!=='phoenix')return;
   if(m.event==='phx_reply'&&m.ref==='1'&&!joined){
    if(m.payload?.status!=='ok'){fail('O serviço de captura recusou a conexão. Tente novamente.');return;}
    joined=true;clearTimeout(timeout);heartbeat=setInterval(()=>{try{frame('heartbeat',{},'phoenix');}catch(e){fail(e.message);}},20000);
    deadline=setTimeout(()=>fail('QR code expirado. Gere outro no computador.'),Math.max(1,c.expires-Date.now()));resolveJoin();return;
   }
   if(m.event==='phx_error'||m.event==='phx_close'||m.event==='system'&&m.payload?.status==='error'){fail('O serviço de captura ficou indisponível. Gere outro QR code.');return;}
   if(m.event!=='broadcast'||m.payload?.event!=='capture'||!joined)return;
   if(queued>=64){fail('A conexão recebeu dados demais. Gere outro QR code.');return;}queued++;
   queue=queue.then(()=>receive(m.payload.payload)).catch(e=>fail(e.message)).finally(()=>queued--);
  });
  socket.addEventListener('error',()=>fail('Falha na conexão de captura. Verifique a internet e tente novamente.'));
  socket.addEventListener('close',()=>{if(!closed)fail('Conexão perdida. Confira o computador antes de repetir a foto.');});
  await ready;
  async function request(op,body,waitMs=6000){
   live();const id=token();let timer;
   const result=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));
   const message={id,op,body};
   const attempt=async n=>{if(!pending.has(id))return;try{await emit(message);}catch(e){pending.get(id)?.reject(e);pending.delete(id);return;}
    if(!pending.has(id))return;timer=setTimeout(()=>{if(n<2)attempt(n+1);else{pending.get(id)?.reject(Error('O outro aparelho não respondeu. Confira o computador antes de tentar de novo.'));pending.delete(id);}},waitMs);};
   // Attach result handlers before the first send, including a synchronously closed socket.
   const finish=result.finally(()=>{clearTimeout(timer);pending.delete(id);});attempt(0);return finish;
  }
  return {request,close,capability:c};
 }
 const api={CONFIG,MAX,CHUNK,TTL,capability,validate,connect,b64,unb64,importKey,seal,open};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KineSysCameraTransport=api;
})(typeof window!=='undefined'?window:globalThis);
