const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const screenLoader = fs.readFileSync('src/ui/screen_loader-1.25.0.js', 'utf8');
const resume = fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js', 'utf8');
const htaccess = fs.readFileSync('.htaccess', 'utf8');

assert(index.includes('src/ui/screen_loader-1.25.0.js') && index.includes('runtime_cache=20260912-r1'),
  'index.html deve manter a referência base do screen loader para compatibilidade de entrega');
assert(htaccess.includes('src/ui/screen_loader-1.25.0.js?v=20260913-agenda-mobile-r16'),
  'servidor deve substituir a referência base por uma URL inequívoca da revisão mobile atual');
assert(index.includes('src/core/operational_resume_refresh-1.0.0.js?v=20260912-home-mobile-r5'),
  'index.html deve invalidar o cache do operational resume atual');
assert(screenLoader.includes("const ASSET_REVISION='20260913-agenda-mobile-r16';"),
  'screen loader deve possuir a revisão global atual dos assets sob demanda');
assert(screenLoader.includes("searchParams.set('ksv',ASSET_REVISION)"),
  'screen loader deve anexar a revisão global a fragments, scripts e styles');
assert(screenLoader.includes("cache:'no-cache'"),
  'fragmentos sob demanda devem revalidar com o servidor');
assert(resume.includes("const PROFESSIONAL_HOME_ASSET_VERSION='20260912-home-mobile-r5';"),
  'Home profissional deve usar a mesma revisão publicada pelo bootstrap operacional');

console.log('runtime_asset_cache.contract: OK');
