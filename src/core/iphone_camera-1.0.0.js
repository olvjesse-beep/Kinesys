/* KineSys: original -> pasta autorizada; miniatura -> Supabase.
 * Camera v2 uses ephemeral end-to-end encrypted Broadcast, never cloud photo storage. */
(function () {
 'use strict';
 const MAX=25*1024*1024;
 let dbPromise, root=null, scope='', active=null, starting=false, syncing=false;
 const localIds=new Set(), objectUrls=new Set();
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
 async function updateLocal(k,update){
  const d=await db();return new Promise((resolve,reject)=>{
   const tx=d.transaction('items','readwrite'),store=tx.objectStore('items'),request=store.get(k);let value;
   request.onsuccess=()=>{try{value=update(request.result);store.put(value,k);}catch(e){reject(e);tx.abort?.();}};
   tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Armazenamento local interrompido.'));
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
  if(!handle)throw Error('Primeiro escolha a pasta dos originais no botão Alterar pasta.');
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
  await updateLocal('ids:'+key(s.ctx),ids=>[...(ids||[]),id]);localIds.add(id);
  await updateLocal('pending:'+key(s.ctx),pending=>[...(pending||[]),record]);
  try{await syncPending(s.ctx,record.id);}catch(e){e.savedId=record.id;throw e;}return record;
 }
 async function cloudRequest(query){
  const controller=new AbortController();let timer;
  try{return await Promise.race([typeof query.abortSignal==='function'?query.abortSignal(controller.signal):query,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Tempo de sincronização esgotado.'));},15000);})]);}
  finally{clearTimeout(timer);}
 }
 async function syncPending(c=context(),onlyId){
  if(syncing)throw Error('Já existe uma sincronização em andamento. Aguarde.');syncing=true;
  try{
  const pending=(await local('get','pending:'+key(c))||[]).filter(record=>!onlyId||record.id===onlyId),completed=new Set();
  for(const record of pending){
   assertContext(c);let error;try{({error}=await cloudRequest(_supabase.from('midias_miniaturas').insert(record)));}catch(_){continue;}
   if(error){
    if(error.code==='23505'){
     let existing;try{existing=await cloudRequest(_supabase.from('midias_miniaturas').select('id,sha256,paciente_id,clinica_id').eq('id',record.id).maybeSingle());}catch(_){continue;}
     if(!existing.error&&existing.data?.sha256===record.sha256&&existing.data?.paciente_id===record.paciente_id&&existing.data?.clinica_id===record.clinica_id)completed.add(record.id);
    }
   }else completed.add(record.id);
  }
  assertContext(c);await updateLocal('pending:'+key(c),latest=>(latest||[]).filter(record=>!completed.has(record.id)));
  if(pending.some(record=>!completed.has(record.id)))throw Error('Original salvo na pasta. A miniatura ainda não foi sincronizada. Clique em Reenviar miniaturas pendentes; não fotografe novamente.');
  }finally{syncing=false;}
 }
 async function retry(){try{await syncPending();status('Miniaturas sincronizadas. Originais preservados no computador.');await atualizarGaleriaMidias(true);}catch(e){status(errorText(e));}}
 async function closeDesktop(message='Captura cancelada. Gere outro QR code para continuar.'){
  const old=active;active=null;if(old){clearTimeout(old.deadline);clearTimeout(old.receiptTimer);old.chunks=[];
   if(old.relay){try{await old.relay.request('cancel',{message},250);}catch(_){}old.relay.close();}}
  if(active)return;
  if($('camera_pair'))$('camera_pair').hidden=true;status(message);
 }
 async function start(){
  if(starting){status('A conexão já está sendo preparada. Aguarde.');return;}starting=true;
  let s;
  try{
   if(active?.finishing&&!active.savedResult)throw Error('Aguarde a verificação da foto antes de gerar outro QR code.');
   if(active)await closeDesktop('Conexão anterior encerrada.');
   const ctx=context(),folder=await authorizedFolder(),paciente=await sincronizarPacienteMidias(false);assertContext(ctx);
   if(!paciente)throw Error('Escolha o paciente antes de conectar o iPhone.');
   if(!/^https:/.test(location.protocol))throw Error('O iPhone precisa abrir o endereço HTTPS publicado do KineSys. A prévia 127.0.0.1 não funciona no celular.');
   const tipo=$('camera_tipo')?.value||'avaliacao';if(!tiposMidiaPermitidosParaPerfil().includes(tipo))throw Error('Tipo de fotografia não permitido para este perfil.');
   const transport=window.KineSysCameraTransport;if(!transport)throw Error('Atualize a página antes de conectar o iPhone.');
   const cap=transport.capability();
   s={ctx,folder,row:{id:crypto.randomUUID(),paciente_id:paciente,tipo,expira_em:new Date(cap.expires).toISOString()},chunks:[],meta:null,count:0,seq:0,started:false,finishing:false,phoneDevice:null};active=s;
   status('Preparando captura segura…');
   s.relay=await transport.connect(cap,'desktop',(op,body)=>handleCaptureRequest(s,op,body),e=>{if(active===s)closeDesktop(e.message);});
   assertActive(s);
   const link=new URL('camera.html',location.href);link.searchParams.set('v','20261020-camera-r2');link.hash=new URLSearchParams({r:cap.room,k:cap.secret,e:String(cap.expires)}).toString();
   const qr=qrcode(0,'M');qr.addData(link.href);qr.make();$('camera_qr').innerHTML=qr.createSvgTag({cellSize:4,margin:4,scalable:true});
   $('camera_link').href=link.href;$('camera_link').textContent='Abrir câmera neste dispositivo';$('camera_pair').hidden=false;
   status('Leia o QR code no iPhone: não precisa entrar no KineSys. Autorize a câmera, tire a foto e aguarde a confirmação. Não compartilhe este QR code.');
   s.deadline=setTimeout(()=>{if(active===s)closeDesktop('QR code expirado. Gere outro para continuar.');},Math.max(0,cap.expires-Date.now()));
  }catch(e){if(s){if(active===s)await closeDesktop(errorText(e));else s.relay?.close();}status(errorText(e));}finally{starting=false;}
 }
 async function handleCaptureRequest(s,op,m){
  assertActive(s);
  if(op==='hello'){
   if(!/^[a-f0-9]{64}$/.test(m?.device||''))throw Error('Conexão inválida.');
   if(s.phoneDevice&&s.phoneDevice!==m.device)throw Error('Este QR code já foi conectado a outro celular. Gere outro.');
   s.phoneDevice=m.device;status('iPhone conectado. A foto será enviada para o paciente selecionado neste computador.');return {ready:true};
  }
  if(!s.phoneDevice||m?.device!==s.phoneDevice)throw Error('Celular não autorizado nesta captura.');
  if(op==='received'){
   if(!s.savedResult)throw Error('A gravação ainda não foi confirmada.');
   clearTimeout(s.receiptTimer);s.receiptTimer=setTimeout(()=>{if(active===s)closeDesktop(s.savedResult.pending?'Original salvo. Reenvie a miniatura pendente pelo computador.':'Foto salva. Para outra foto, gere um novo QR code.');},2000);return {received:true};
  }
  if(op==='start'){
   if(s.started)throw Error('Esta conexão aceita uma única foto. Gere outro QR code.');
   s.meta=validateMeta(m);s.started=true;s.seq=0;return {ready:true};
  }
  if(op==='chunk'){
   if(!s.started||s.finishing||m.seq!==s.seq)throw Error('Bloco de foto inválido ou fora de ordem.');
   const bytes=window.KineSysCameraTransport.unb64(m.data);
   if(!bytes.length||bytes.length>window.KineSysCameraTransport.CHUNK||s.count+bytes.length>s.meta.size||s.count+bytes.length>MAX)throw Error('Arquivo maior que o informado.');
   s.count+=bytes.length;s.seq++;s.chunks.push(bytes);
   status('Recebendo foto… '+Math.round(s.count/s.meta.size*100)+'%');return {received:s.seq};
  }
  if(op==='end'){
   if(!s.started||s.finishing||s.count!==s.meta.size)throw Error('Transferência incompleta. Gere outro QR code.');
   s.finishing=true;let result;
   try{const record=await persistPhoto(s,new Blob(s.chunks,{type:s.meta.mime}),s.meta);result={saved:true,id:record.id,pending:false};status('Foto salva e verificada na pasta; miniatura sincronizada no prontuário.');}
   catch(e){if(!e.savedId){status('Não foi possível concluir: '+errorText(e));throw e;}result={saved:true,id:e.savedId,pending:true};status(errorText(e));}
   finally{s.chunks=[];}
   // Refresh cannot turn a verified disk save into a false failure on the phone.
   Promise.resolve().then(()=>atualizarGaleriaMidias(true)).catch(()=>{});
   s.savedResult=result;
   // Keep the cached save result available across all three 20-second retries.
   s.receiptTimer=setTimeout(()=>{if(active===s)closeDesktop(result.pending?'Original salvo. Reenvie a miniatura pendente pelo computador.':'Foto salva. Para outra foto, gere um novo QR code.');},70000);
   return result;
  }
  throw Error('Mensagem de captura inválida.');
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
 async function boot(){
  $('camera_choose')?.addEventListener('click',chooseFolder);$('camera_start')?.addEventListener('click',start);$('camera_cancel')?.addEventListener('click',()=>closeDesktop());$('camera_retry')?.addEventListener('click',retry);
  document.addEventListener('kinesys:tela-ativada',e=>{if(e.detail?.id==='tela_midias')folderInfo();});
  document.addEventListener('kinesys:tela-desativada',e=>{if(e.detail?.id==='tela_midias'&&active)closeDesktop('Captura cancelada ao sair de Documentos.');});
  $('midia_paciente_select')?.addEventListener('change',()=>{if(active)closeDesktop('Paciente alterado. Gere outro QR code para evitar vincular a foto à pessoa errada.');});
  $('camera_tipo')?.addEventListener('change',()=>{if(active)closeDesktop('Tipo de registro alterado. Gere outro QR code para a nova categoria.');});
  window.addEventListener('pagehide',()=>{active?.relay?.close();for(const u of objectUrls)URL.revokeObjectURL(u);});
 }
 window.KineSysCamera={chooseFolder,start,cancel:closeDesktop,list,openOriginal,folderInfo,validateMeta,validateMagic,hash,safe};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
