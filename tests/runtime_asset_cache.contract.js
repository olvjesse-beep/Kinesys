const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const screenLoader = fs.readFileSync('src/ui/screen_loader-1.25.0.js', 'utf8');
const resume = fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js', 'utf8');

assert(index.includes('src/ui/screen_loader-1.25.0.js') && index.includes('runtime_cache=20260912-r1'),
  'index.html deve invalidar o cache do screen loader pela revisão runtime_cache');
assert(index.includes('src/core/operational_resume_refresh-1.0.0.js?v=20260912-home-mobile-r5'),
  'index.html deve invalidar o cache do operational resume atual');
assert(screenLoader.includes("const ASSET_REVISION='20260912-runtime-r1';"),
  'screen loader deve possuir revisão global dos assets sob demanda');
assert(screenLoader.includes("searchParams.set('ksv',ASSET_REVISION)"),
  'screen loader deve anexar a revisão global a fragments, scripts e styles');
assert(screenLoader.includes("cache:'no-cache'"),
  'fragmentos sob demanda devem revalidar com o servidor');
assert(resume.includes("const PROFESSIONAL_HOME_ASSET_VERSION='20260912-home-mobile-r5';"),
  'Home profissional deve usar a mesma revisão publicada pelo bootstrap operacional');

console.log('runtime_asset_cache.contract: OK');
