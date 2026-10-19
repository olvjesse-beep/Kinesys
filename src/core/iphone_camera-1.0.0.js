/* KineSys: original -> pasta autorizada; miniatura -> Supabase; WebRTC sem relay de fotos. */
(function () {
 'use strict';
 const MAX=25*1024*1024, UUID=/^[a-f0-9-]{36}$/i;
 let dbPromise, root=null, scope='', active=null, phone=null, phoneAttempt=false, starting=false, syncing=false;
 const localIds=new Set(), objectUrls=new Set();
 const cameraId=new URL(location.href).searchParams.get('camera');
 const $=id=>document.getElementById(id);
 const status=t=>{if($('camera_status'))$('camera_status').textContent=t;};
 const errorText=e=>e?.message||String(e);
 const safe=s=>{s=String(s||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(s))throw Error('Identificação local inválida.');return s;};
 function context(){
  if(typeof usuarioLogado==='undefined'||!usuarioLogado?.id||!usuarioLogado?.clinica_id)throw Error('Entre no KineSys e selecione seu perfil.');
  return {clinica:String(usuarioLogado.clinica_id),perfil:String(usuarioLogado.id),nome:String(usuarioLogado.nome||'Profissional')};
 }
 const key=c=>`${c.clinica}:${c.perfil}`;
 function assertContext(c){if(key(context())!==key(c))throw Error('O perfil ou a clínica mudou. Inicie novamente.');}
 function assertActive(s){assertContext(s.ctx);if(active!==s||Date.now()>=Date.parse(s.row.expira_em))throw Error('A conexão expirou ou foi cancelada. Gere outro QR code.');if(String(obterPacienteIdMidiasAtivo())!==String(s.row.paciente_id))throw Error('O paciente mudou. Gere outro QR code para a pessoa correta.');}
 function db(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
   const r=indexedDB.open('kinesys-camera-local-v1',1);
   r.onupgradeneeded=()=>r.result.createObjectStore('items');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });return dbPromise;
 }
 async function local(op,k,v){
  const d=await db();return new Promise((resolve,reject)=>{
   const tx=d.transaction('items',op==='get'?'readonly':'readwrite'),s=tx.objectStore('items');
   const r=op==='get'?s.get(k):op==='delete'?s.delete(k):s.put(v,k);let result;
   r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Armazenamento local interrompido.'));
  });
 }
 async function loadRoot(){
  const c=context(),s=key(c);if(scope!==s){root=null;scope=s;localIds.clear();}
  if(!root)root=await local('get','folder:'+s);assertContext(c);return root;
 }
 async function chooseFolder(){
  try{
   const c=context();if(active)throw Error('Cancele a captura antes de trocar a pasta.');
   if(!window.showDirectoryPicker)throw Error('Escolha a pasta pelo Chrome ou Edge no computador. Este navegador não oferece gravação autorizada em pasta.');
   // Permission picker must be the first asynchronous browser operation after the click.
   const handle=await window.showDirectoryPicker({id:'kinesys-fotos',mode:'readwrite'});assertContext(c);
   await local('put','folder:'+key(c),handle);root=handle;scope=key(c);await folderInfo();
   status('Pasta autorizada. Os originais serão organizados por clínica, paciente e mês. Mantenha uma cópia de segurança dessa pasta.');
  }catch(e){if(e.name!=='AbortError')status(errorText(e));}
 }
 async function folderInfo(){
  try{
   const c=context(),handle=await loadRoot(),ids=await local('get','ids:'+key(c))||[];assertContext(c);
   ids.forEach(id=>localIds.add(id));if($('camera_folder'))$('camera_folder').textContent=handle?handle.name:'Nenhuma pasta selecionada neste navegador';
   const badge=$('midia_status_local');if(badge){badge.classList.remove('offline');badge.textContent=handle?'Originais: pasta selecionada':'Originais: escolha uma pasta';}
   const type=$('camera_tipo');if(type)for(const option of type.options){option.disabled=!tiposMidiaPermitidosParaPerfil().includes(option.value);option.hidden=option.disabled;}if(type?.selectedOptions[0]?.disabled)type.value='documento';
  }catch(_){if($('camera_folder'))$('camera_folder').textContent='Entre para configurar a pasta deste computador.';}
 }
 async function authorizedFolder(){
  const c=context(),handle=await loadRoot();assertContext(c);
  if(!handle)throw Error('Primeiro clique em Escolher pasta dos originais.');
  if(await handle.queryPermission({mode:'readwrite'})!=='granted' && await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('Autorize a pasta antes de conectar o iPhone.');
  assertContext(c);return handle;
 }
 async function hash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');}
 function validateMeta(m){
  if(!m||m.op!=='start'||!Number.isInteger(m.size)||m.size<=0||m.size>MAX||!['image/jpeg','image/png','image/webp'].includes(m.mime)||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('Foto inválida: use JPEG, PNG ou WEBP até 25 MB.');
  return {size:m.size,mime:m.mime,sha256:m.sha256};
 }
 function validateMagic(buffer,mime){
  const b=new Uint8Array(buffer),jpeg=b[0]===255&&b[1]===216&&b[2]===255,png=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
  const webp=b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;
  if(!(mime==='image/jpeg'&&jpeg||mime==='image/png'&&png||mime==='image/webp'&&webp))throw Error('O conteúdo da foto não corresponde ao formato informado.');
 }
 async function thumbnail(blob){
  const url=URL.createObjectURL(blob);try{
   const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('A foto não pôde ser decodificada. Use JPEG, PNG ou WEBP.'));im.src=url;});
   if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>60000000)throw Error('Resolução da imagem não suportada.');
   const ratio=Math.min(1,480/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   let data=canvas.toDataURL('image/jpeg',0.6);if(data.length>90000)data=canvas.toDataURL('image/jpeg',0.3);
   if(data.length>90000)throw Error('Não foi possível gerar uma miniatura pequena. O original não foi alterado.');
   return {miniatura:data,largura:canvas.width,altura:canvas.height};
  }finally{URL.revokeObjectURL(url);}
 }
 async function persistPhoto(s,blob,meta){
  assertActive(s);const bytes=await blob.arrayBuffer();if(bytes.byteLength!==meta.size||await hash(bytes)!==meta.sha256)throw Error('Transferência incompleta. Nenhum recebimento foi confirmado.');validateMagic(bytes,meta.mime);
  const thumb=await thumbnail(blob);assertActive(s);
  const id=crypto.randomUUID(),now=new Date(),ext=meta.mime==='image/jpeg'?'jpg':meta.mime==='image/png'?'png':'webp';
  const parts=[safe(s.ctx.clinica),safe(s.row.paciente_id),String(now.getFullYear()),String(now.getMonth()+1).padStart(2,'0')];
  let dir=s.folder;for(const part of parts)dir=await dir.getDirectoryHandle(part,{create:true});
  const filename=id+'.'+ext;try{await dir.getFileHandle(filename);throw Error('O arquivo já existe. Nada foi sobrescrito.');}catch(e){if(e.name!=='NotFoundError')throw e;}
  assertActive(s);const handle=await dir.getFileHandle(filename,{create:true}),stream=await handle.createWritable();
  try{await stream.write(blob);await stream.close();}catch(e){try{await stream.abort();}catch(_){}throw e;}
  if(await hash(await (await handle.getFile()).arrayBuffer())!==meta.sha256)throw Error('A verificação do arquivo gravado falhou. Não houve confirmação de sucesso.');
  assertContext(s.ctx);
  const record={id,clinica_id:s.ctx.clinica,paciente_id:s.row.paciente_id,profissional_id:s.ctx.perfil,profissional_nome:s.ctx.nome,tipo:s.row.tipo,data_hora:now.toISOString(),arquivo_nome:filename,caminho_relativo:[...parts,filename].join('/'),tamanho_bytes:meta.size,mime_type:meta.mime,sha256:meta.sha256,...thumb,estacao:s.folder.name};
  // Durable outbox: cloud failure never loses the local original or silently claims sync.
  await local('put','photo:'+key(s.ctx)+':'+id,{handle,record});
  const ids=await local('get','ids:'+key(s.ctx))||[];ids.push(id);await local('put','ids:'+key(s.ctx),ids);localIds.add(id);
  const pending=await local('get','pending:'+key(s.ctx))||[];pending.push(record);await local('put','pending:'+key(s.ctx),pending);
  await syncPending(s.ctx);return record;
 }
 async function syncPending(c=context()){
  if(syncing)throw Error('Já existe uma sincronização em andamento. Aguarde.');syncing=true;
  try{
  const pending=await local('get','pending:'+key(c))||[],failed=[];
  for(const record of pending){
   assertContext(c);const {error}=await _supabase.from('midias_miniaturas').insert(record);
   if(error){
    if(error.code==='23505'){
     const existing=await _supabase.from('midias_miniaturas').select('id,sha256,paciente_id,clinica_id').eq('id',record.id).maybeSingle();
     if(existing.error||existing.data?.sha256!==record.sha256||existing.data?.paciente_id!==record.paciente_id||existing.data?.clinica_id!==record.clinica_id)failed.push(record);
    }else failed.push(record);
   }
  }
  assertContext(c);await local('put','pending:'+key(c),failed);
  if(failed.length)throw Error('Original salvo na pasta. A miniatura ainda não foi sincronizada. Clique em Reenviar miniaturas pendentes; não fotografe novamente.');
  }finally{syncing=false;}
 }
 async function retry(){try{await syncPending();status('Miniaturas sincronizadas. Originais preservados no computador.');await atualizarGaleriaMidias(true);}catch(e){status(errorText(e));}}
 function iceComplete(pc){return new Promise((resolve,reject)=>{
  if(pc.iceGatheringState==='complete'){resolve();return;}
  const timeout=setTimeout(()=>{clean();reject(Error('A conexão local demorou. Verifique a rede Wi-Fi e tente novamente.'));},15000);
  const on=()=>{if(pc.iceGatheringState==='complete'){clean();resolve();}};
  function clean(){clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',on);}pc.addEventListener('icegatheringstatechange',on);
 });}
 function peer(){if(!window.RTCPeerConnection)throw Error('Este navegador não oferece a conexão direta de câmera.');return new RTCPeerConnection({iceServers:[]});}
 async function closeDesktop(message='Captura cancelada. Gere outro QR code para continuar.'){
  const old=active;active=null;if(old){clearTimeout(old.timer);clearTimeout(old.deadline);old.pc.close();
   try{await _supabase.from('midias_camera_sessoes').delete().eq('id',old.row.id);}catch(_){}
  }
  if(active)return;
  if($('camera_pair'))$('camera_pair').hidden=true;status(message);
 }
 async function start(){
  if(starting){status('A conexão já está sendo preparada. Aguarde.');return;}starting=true;
  let pc;
  try{
   if(active)throw Error('Já existe uma captura aberta. Cancele-a antes de gerar outro QR code.');
   const ctx=context(),folder=await authorizedFolder(),paciente=await sincronizarPacienteMidias(false);assertContext(ctx);
   if(!paciente)throw Error('Escolha o paciente antes de conectar o iPhone.');
   if(!/^https:/.test(location.protocol))throw Error('O iPhone precisa abrir o endereço HTTPS publicado do KineSys. A prévia 127.0.0.1 não funciona no celular.');
   const tipo=$('camera_tipo')?.value||'avaliacao';if(!tiposMidiaPermitidosParaPerfil().includes(tipo))throw Error('Tipo de fotografia não permitido para este perfil.');
   pc=peer();const channel=pc.createDataChannel('kinesys-foto',{ordered:true});
   status('Preparando conexão direta…');await pc.setLocalDescription(await pc.createOffer());await iceComplete(pc);assertContext(ctx);
   if(String(obterPacienteIdMidiasAtivo())!==String(paciente))throw Error('O paciente mudou durante a conexão. Tente novamente.');
   const {data:row,error}=await _supabase.from('midias_camera_sessoes').insert({clinica_id:ctx.clinica,paciente_id:paciente,perfil_id:ctx.perfil,tipo,offer:pc.localDescription.toJSON()}).select().single();if(error)throw error;
   assertContext(ctx);if(String(obterPacienteIdMidiasAtivo())!==String(paciente)){
    await _supabase.from('midias_camera_sessoes').delete().eq('id',row.id);throw Error('O paciente mudou. A conexão foi cancelada.');
   }
   const s={ctx,folder,pc,row,channel,chunks:[],meta:null,count:0,started:false,finishing:false};active=s;bindReceiver(s);
   const link=new URL(location.href);link.search='';link.searchParams.set('camera',row.id);link.hash='tela_login';
   const qr=qrcode(0,'M');qr.addData(link.href);qr.make();$('camera_qr').innerHTML=qr.createSvgTag({cellSize:4,margin:4,scalable:true});
   $('camera_link').href=link.href;$('camera_link').textContent='Abrir câmera neste dispositivo';$('camera_pair').hidden=false;
   status('Leia o QR code com o iPhone. Entre com a mesma conta e o mesmo perfil do computador. Ambos devem estar na mesma rede Wi-Fi. O QR code expira em 10 minutos.');
   s.deadline=setTimeout(()=>closeDesktop('QR code expirado. Gere outro para continuar.'),Math.max(0,Date.parse(row.expira_em)-Date.now()));
   const poll=async()=>{if(active!==s)return;try{
    assertActive(s);const {data,error}=await _supabase.from('midias_camera_sessoes').select('answer').eq('id',row.id).maybeSingle();if(error)throw error;
    if(data?.answer&&!pc.remoteDescription){await pc.setRemoteDescription(data.answer);status('iPhone conectado. Tire a foto e confirme o envio no celular.');}
   }catch(e){await closeDesktop(errorText(e));return;}if(active===s)s.timer=setTimeout(poll,1800);};poll();
   pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')closeDesktop('Não foi possível conectar. Use a mesma rede Wi-Fi, sem rede de convidados ou isolamento de dispositivos.');};
  }catch(e){if(pc&&active?.pc!==pc)pc.close();status(errorText(e));}finally{starting=false;}
 }
 function bindReceiver(s){
  const ch=s.channel;ch.binaryType='arraybuffer';
  ch.onmessage=async e=>{try{
   assertActive(s);
   if(typeof e.data==='string'){
    const m=JSON.parse(e.data);
    if(m.op==='start'){if(s.started)throw Error('Esta conexão aceita uma única foto.');s.meta=validateMeta(m);s.started=true;}
    else if(m.op==='end'){
     if(!s.started||s.finishing||s.count!==s.meta.size)throw Error('Transferência incompleta. Tente novamente.');s.finishing=true;
     const result=await persistPhoto(s,new Blob(s.chunks,{type:s.meta.mime}),s.meta);s.chunks=[];
     ch.send(JSON.stringify({op:'saved',id:result.id}));status('Foto salva e verificada na pasta; miniatura sincronizada no prontuário.');
     await atualizarGaleriaMidias(true);setTimeout(()=>{if(active===s)closeDesktop('Foto salva. Para outra foto, gere um novo QR code.');},2000);
    }else throw Error('Mensagem de captura inválida.');
   }else{
    if(!s.started||s.finishing||!(e.data instanceof ArrayBuffer)||e.data.byteLength>65536)throw Error('Bloco de foto inválido.');
    s.count+=e.data.byteLength;if(s.count>s.meta.size||s.count>MAX)throw Error('Arquivo maior que o informado.');s.chunks.push(e.data);
   }
  }catch(e){try{ch.send(JSON.stringify({op:'error',message:errorText(e)}));}catch(_){}await closeDesktop(errorText(e));}};
 }
 async function list(paciente){
  const c=context();await folderInfo();assertContext(c);
  const {data,error}=await _supabase.from('midias_miniaturas').select('*').eq('clinica_id',c.clinica).eq('paciente_id',paciente).order('data_hora',{ascending:false}).limit(200);
  if(error){status('Miniaturas indisponíveis: '+errorText(error));return [];}
  assertContext(c);return (data||[]).map(x=>({id:x.id,patient_id:x.paciente_id,type:x.tipo,captured_at:x.data_hora,filename:x.arquivo_nome,size_bytes:x.tamanho_bytes,mime_type:x.mime_type,sha256:x.sha256,thumbnail:x.miniatura,cloud_thumbnail:true,cloud_only:!localIds.has(x.id),backup_status:'pending'}));
 }
 async function openOriginal(id){
  try{const c=context(),photo=await local('get','photo:'+key(c)+':'+id);assertContext(c);
   if(!photo)throw Error('O original está em outro computador ou navegador. A miniatura continua disponível.');
   if(await photo.handle.queryPermission({mode:'read'})!=='granted'&&await photo.handle.requestPermission({mode:'read'})!=='granted')throw Error('Autorize a leitura do original.');
   const file=await photo.handle.getFile();assertContext(c);if(await hash(await file.arrayBuffer())!==photo.record.sha256)throw Error('O arquivo foi alterado fora do KineSys. Confira o original na pasta.');const url=URL.createObjectURL(file);objectUrls.add(url);window.open(url,'_blank','noopener');
  }catch(e){status('Original indisponível: '+errorText(e));}
 }
 async function receivePhone(){
  if(!cameraId||phoneAttempt)return;phoneAttempt=true;
  try{
   if(!UUID.test(cameraId))throw Error('QR code inválido.');const ctx=context();
   const {data:row,error}=await _supabase.from('midias_camera_sessoes').select('*').eq('id',cameraId).maybeSingle();if(error)throw error;
   if(!row||row.concluida_em||Date.parse(row.expira_em)<=Date.now())throw Error('QR code expirado ou vinculado a outra conta/perfil. Gere outro no computador e entre com a mesma conta.');
   const pc=peer();phone={pc,row,ctx,channel:null,busy:false};
   const panel=$('camera_phone');panel.hidden=false;$('camera_phone_status').textContent='Conectando ao computador…';
   pc.ondatachannel=event=>{
    phone.channel=event.channel;event.channel.onopen=()=>{$('camera_phone_status').textContent='Conectado. Confira no computador o paciente e tire a foto.';$('camera_phone_file').disabled=false;};
    event.channel.onmessage=e=>{const m=JSON.parse(e.data);if(m.op==='saved'){$('camera_phone_status').textContent='Foto salva no computador e miniatura sincronizada. Você pode fechar esta página.';phone.busy=false;}else if(m.op==='error'){$('camera_phone_status').textContent=m.message;phone.busy=false;}};
    event.channel.onclose=()=>{if(phone?.busy)$('camera_phone_status').textContent='Conexão encerrada sem confirmação. Confira a pasta e as miniaturas pendentes no computador antes de tentar novamente.';};
   };
   await pc.setRemoteDescription(row.offer);await pc.setLocalDescription(await pc.createAnswer());await iceComplete(pc);assertContext(ctx);
   const result=await _supabase.from('midias_camera_sessoes').update({answer:pc.localDescription.toJSON()}).eq('id',row.id).is('answer',null).select('id');if(result.error)throw result.error;if(!result.data?.length)throw Error('Este QR code já foi utilizado. Gere outro.');
   phone.deadline=setTimeout(()=>{pc.close();$('camera_phone_status').textContent='Conexão expirada. Gere outro QR code.';},Math.max(0,Date.parse(row.expira_em)-Date.now()));
  }catch(e){if(phone?.pc)phone.pc.close();$('camera_phone').hidden=false;$('camera_phone_status').textContent=errorText(e);}
 }
 async function sendPhoto(input){
  const p=phone,f=input.files?.[0];if(!f||!p||p.busy)return;
  try{
   assertContext(p.ctx);if(Date.now()>=Date.parse(p.row.expira_em))throw Error('Conexão expirada. Gere outro QR code.');
   if(p.channel?.readyState!=='open')throw Error('A conexão direta ainda não está pronta.');
   if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size<=0||f.size>MAX)throw Error('Use JPEG, PNG ou WEBP até 25 MB. No iPhone, prefira capturar uma nova foto para enviar em JPEG.');
   p.busy=true;input.disabled=true;const buffer=await f.arrayBuffer(),sha256=await hash(buffer);assertContext(p.ctx);
   p.channel.send(JSON.stringify({op:'start',size:f.size,mime:f.type,sha256}));
   for(let offset=0;offset<buffer.byteLength;offset+=16384){
    while(p.channel.bufferedAmount>262144){if(p.channel.readyState!=='open'||Date.now()>=Date.parse(p.row.expira_em))throw Error('Transferência interrompida.');await new Promise(r=>setTimeout(r,25));}
    assertContext(p.ctx);p.channel.send(buffer.slice(offset,offset+16384));$('camera_phone_status').textContent=`Enviando foto… ${Math.round(Math.min(offset+16384,f.size)/f.size*100)}%`;
   }
   p.channel.send(JSON.stringify({op:'end'}));$('camera_phone_status').textContent='Foto enviada. Aguarde o computador confirmar a gravação na pasta.';
  }catch(e){p.busy=false;$('camera_phone_status').textContent=errorText(e);input.disabled=false;}finally{input.value='';}
 }
 function exitPhone(){if(phone){clearTimeout(phone.deadline);phone.pc.close();}phone=null;$('camera_phone').hidden=true;const u=new URL(location.href);u.searchParams.delete('camera');history.replaceState(null,'',u.href);}
 async function boot(){
  if(cameraId){const wait=setInterval(()=>{try{context();clearInterval(wait);receivePhone();}catch(_){}},1200);window.addEventListener('pagehide',()=>clearInterval(wait),{once:true});}
  $('camera_choose')?.addEventListener('click',chooseFolder);$('camera_start')?.addEventListener('click',start);$('camera_cancel')?.addEventListener('click',()=>closeDesktop());$('camera_retry')?.addEventListener('click',retry);
  $('camera_phone_file')?.addEventListener('change',e=>sendPhoto(e.target));$('camera_phone_exit')?.addEventListener('click',exitPhone);
  document.addEventListener('kinesys:tela-ativada',e=>{if(e.detail?.id==='tela_midias')folderInfo();});
  document.addEventListener('kinesys:tela-desativada',e=>{if(e.detail?.id==='tela_midias'&&active)closeDesktop('Captura cancelada ao sair de Documentos.');});
  $('midia_paciente_select')?.addEventListener('change',()=>{if(active)closeDesktop('Paciente alterado. Gere outro QR code para evitar vincular a foto à pessoa errada.');});
  window.addEventListener('pagehide',()=>{if(active)active.pc.close();if(phone)phone.pc.close();for(const u of objectUrls)URL.revokeObjectURL(u);});
 }
 window.KineSysCamera={chooseFolder,start,cancel:closeDesktop,list,openOriginal,folderInfo,validateMeta,validateMagic,hash,safe};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
