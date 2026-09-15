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
console.log('PASS: explicit eager release versions; single static Home bootstrap; lazy revision preserved; no HTML rewriting.');
