'use strict';
const fs=require('fs'),assert=require('assert');
const index=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const resume=fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js','utf8');
const htaccess=fs.readFileSync('.htaccess','utf8');
const paths=['src/core/script-1.18.0.js','src/core/design_system-1.20.1.js','src/core/operational_resume_refresh-1.0.0.js','src/home/home_fisioterapeuta_util-1.24.0.js','src/home/home_detalhes-1.18.5.js','src/ui/menu_dropdown-1.0.0.js','src/ui/screen_loader-1.25.0.js'];
for(const path of paths){const tag=index.split('\n').find(l=>l.includes('src="'+path+'?'));assert(tag&&tag.includes('meudia=20260915-owner-r1'),'Changed runtime must have explicit release version: '+path);}
for(const path of ['src/home/home_profissional_dashboard-1.0.0.js','src/home/home_profissional_polish-1.0.0.js'])assert.equal(index.split(path).length-1,1,'Home module must load exactly once in index');
assert(!resume.includes('createElement'),'resume cannot dynamically inject Home assets');
assert(!/^\s*(?:Substitute|AddOutputFilterByType)\s/m.test(htaccess),'server must not rewrite HTML versions');
assert(loader.includes("searchParams.set('ksv',ASSET_REVISION)"));
assert(loader.includes("cache:'no-cache'"));
assert(/const ASSET_REVISION='[^']+'/.test(loader));
// A instalação usa a mesma aplicação online, sem outro bootstrap/cache de dados.
const path=require('node:path');
const manifestLink=index.match(/<link\s+rel="manifest"\s+href="([^"]+)"/);
assert(manifestLink,'metadados devem oferecer manifesto para instalação');
const manifestPath=manifestLink[1].split('?')[0];
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const base=new URL(manifestPath,'https://app.fisiofixfisioterapia.com/');
assert.equal(manifest.name,'KineSys — Gestão Clínica');assert.equal(manifest.short_name,'KineSys');
assert.equal(manifest.display,'standalone');assert.equal(manifest.lang,'pt-BR');
for(const key of ['id','start_url','scope'])assert.equal(new URL(manifest[key],base).href,base.origin+'/','escopo e abertura devem permanecer na raiz do mesmo aplicativo');
assert(!('orientation' in manifest),'não bloquear orientação de uso no computador/celular');
assert.match(index,/<meta name="apple-mobile-web-app-capable" content="yes">/);
assert.match(index,/<meta name="apple-mobile-web-app-title" content="KineSys">/);
assert.match(index,/<meta name="apple-mobile-web-app-status-bar-style" content="default">/);
const touch=index.match(/<link rel="apple-touch-icon" sizes="180x180" href="([^"]+)"/);
assert(touch,'ícone dedicado do iPhone deve estar disponível');
function verifyPNG(file,size){
 const bytes=fs.readFileSync(file.split('?')[0]);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','arquivo deve ser PNG real');
 assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
}
verifyPNG(touch[1],180);
assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
for(const icon of manifest.icons){
 const iconURL=new URL(icon.src,base);assert.equal(iconURL.origin,base.origin);
 assert.equal(icon.type,'image/png');verifyPNG(path.posix.join(path.posix.dirname(manifestPath),icon.src),Number(icon.sizes.split('x')[0]));
}
assert(manifest.icons.some(icon=>icon.purpose.split(' ').includes('maskable')));
assert(!/serviceWorker\s*\.\s*register\s*\(/.test(index),'esta instalação não deve criar interceptação offline');
console.log('PASS: instalação web standalone, raiz autorizada, ícones PNG reais e abertura online preservados.');
console.log('PASS: explicit eager release versions; single static Home bootstrap; lazy revision preserved; no HTML rewriting.');
