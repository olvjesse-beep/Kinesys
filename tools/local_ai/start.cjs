'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(process.env.KINESYS_AI_ROOT||'G:/KineSys-IA');
if(root.toLowerCase()!==path.resolve('G:/KineSys-IA').toLowerCase())throw Error('Diretório de instalação não autorizado.');
const env={...process.env,OLLAMA_MODELS:path.join(root,'Modelos'),OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_NO_CLOUD:'1',OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_CONTEXT_LENGTH:'8192',OLLAMA_DEBUG:'false'};
async function healthy(url){try{return (await fetch(url,{signal:AbortSignal.timeout(1500)})).ok;}catch{return false;}}
function launch(exe,args,log){const out=fs.openSync(path.join(root,'Logs',log+'.log'),'a'),err=fs.openSync(path.join(root,'Logs',log+'-error.log'),'a');const child=spawn(exe,args,{cwd:root,env,windowsHide:true,detached:true,stdio:['ignore',out,err]});child.unref();fs.closeSync(out);fs.closeSync(err);return child.pid;}
async function wait(url){for(let i=0;i<40;i++){if(await healthy(url))return;await new Promise(resolve=>setTimeout(resolve,500));}throw Error('O serviço local não respondeu. Consulte os logs de inicialização.');}
(async()=>{
 for(const d of ['Logs','Modelos'])fs.mkdirSync(path.join(root,d),{recursive:true});
 if(!await healthy('http://127.0.0.1:11434/api/version'))launch(path.join(root,'Ollama','ollama.exe'),['serve'],'ollama');
 await wait('http://127.0.0.1:11434/api/version');
 if(!await healthy('http://127.0.0.1:8766/api/health'))launch(path.join(root,'Runtime','node.exe'),[path.join(root,'App','tools','local_ai','server.cjs')],'avaliacao-local');
 await wait('http://127.0.0.1:8766/api/health');
 console.log('IA local pronta. Abra http://127.0.0.1:8766/ para testar com dados fictícios.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
