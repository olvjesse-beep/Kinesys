/* Standalone capability-only camera. Never boots Auth or reads patient records. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),transport=window.KineSysCameraTransport;
 let relay,stream,busy=false,ended=false,connected=false,cap,device;
 const status=message=>{$('phone_status').textContent=message;};
 function controls(enabled){$('phone_capture').disabled=!enabled||!stream;$('phone_file').disabled=!enabled;$('phone_file_label').setAttribute('aria-disabled',String(!enabled));}
 function stopCamera(){stream?.getTracks().forEach(track=>track.stop());stream=null;$('phone_video').srcObject=null;$('phone_video').hidden=true;}
 function finish(message){ended=true;controls(false);stopCamera();relay?.close();status(message);$('phone_placeholder').hidden=false;$('phone_placeholder').textContent='Captura encerrada';}
 async function startCamera(){
  let timer,timedOut=false;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Câmera não disponível neste navegador.');
   const request=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1440}}}).then(candidate=>{if(timedOut||ended){candidate.getTracks().forEach(track=>track.stop());throw Error('Permissão da câmera não concluída.');}return candidate;});
   const candidate=await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(Error('Autorize a câmera ou use a captura alternativa.'));},12000);})]);
   if(ended){candidate.getTracks().forEach(track=>track.stop());return;}
   stream=candidate;$('phone_video').srcObject=stream;$('phone_video').hidden=false;await $('phone_video').play();$('phone_placeholder').hidden=true;
   if(connected&&!busy&&!ended)controls(true);
  }catch(_){if(!ended){$('phone_placeholder').textContent='Use a opção “Abrir câmera do iPhone” abaixo.';if(connected&&!busy)controls(true);}}
  finally{clearTimeout(timer);}
 }
 async function send(file){
  if(!file||busy||ended||!connected||!relay)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>transport.MAX){status('Use uma foto JPEG, PNG ou WEBP de até 25 MB.');return;}
  busy=true;controls(false);stopCamera();$('phone_progress').hidden=false;
  try{
   transport.validate(cap);status('Preparando envio…');
   const bytes=new Uint8Array(await file.arrayBuffer());
   const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
   await relay.request('start',{device,op:'start',size:file.size,mime:file.type,sha256});
   let seq=0;
   for(let offset=0;offset<bytes.length;offset+=transport.CHUNK){
    if(ended)throw Error('Captura encerrada.');
    await relay.request('chunk',{device,seq:seq++,data:transport.b64(bytes.subarray(offset,offset+transport.CHUNK))});
    const percent=Math.round(Math.min(offset+transport.CHUNK,bytes.length)/bytes.length*100);$('phone_progress').value=percent;status('Enviando foto… '+percent+'%');
    // Includes both requests and acknowledgements; stay below shared Realtime limits.
    await new Promise(resolve=>setTimeout(resolve,125));
   }
   status('Verificando a gravação no computador…');
   const result=await relay.request('end',{device},20000);
   if(!result?.saved)throw Error('O computador não confirmou a gravação.');
   // Success is already verified; a lost receipt must never turn it into failure.
   try{await relay.request('received',{device},1000);}catch(_){}
   finish(result.pending?'Foto salva no computador. A miniatura aguarda sincronização; use “Reenviar miniaturas pendentes” no computador.':'Foto salva no computador e miniatura disponível no prontuário. Pode fechar esta página.');
  }catch(e){finish('Envio não confirmado: '+e.message+' Confira a pasta e o prontuário no computador antes de gerar outro QR code.');}
 }
 async function capture(){
  if(busy||ended||!stream)return;
  const video=$('phone_video');if(!video.videoWidth||!video.videoHeight){status('Aguarde a câmera ficar pronta ou use “Abrir câmera do iPhone”.');return;}
  // Reserve the action before the asynchronous encoder to prevent double taps.
  controls(false);busy=true;
  try{const canvas=document.createElement('canvas'),scale=Math.min(1,2400/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Não foi possível capturar a foto.')),'image/jpeg',.9));
   busy=false;await send(blob);
  }catch(e){busy=false;if(!ended){status(e.message);controls(true);}}
 }
 async function boot(){
  controls(false);$('phone_capture').addEventListener('click',capture);$('phone_file').addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';send(file);});$('phone_close').addEventListener('click',()=>finish('Captura encerrada. Gere outro QR code no computador para fotografar.'));
  window.addEventListener('pagehide',()=>{ended=true;stopCamera();relay?.close();});
  try{
   const params=new URLSearchParams(location.hash.slice(1));cap={room:params.get('r'),secret:params.get('k'),expires:Number(params.get('e'))};
   // Capability never reaches the HTTP server and is removed from the visible URL.
   history.replaceState(null,'',location.pathname+location.search);transport.validate(cap);device=transport.capability().room;
   // Permission is requested by Safari; no KineSys login is involved.
   startCamera();
   const connection=await transport.connect(cap,'phone',async(op,body)=>{if(op==='cancel'){finish(body?.message||'Captura cancelada pelo computador.');return {closed:true};}throw Error('Comando inválido.');},e=>{if(!ended)finish(e.message);});
   if(ended){connection.close();return;}relay=connection;
   await relay.request('hello',{device});if(ended)return;
   connected=true;status('Conectado. Tire a foto; o envio será automático.');controls(true);
  }catch(e){finish(e.message);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
