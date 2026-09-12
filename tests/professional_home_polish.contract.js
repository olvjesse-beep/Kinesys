'use strict';
const fs=require('fs');
const assert=require('assert');

const polish=fs.readFileSync('src/home/home_profissional_polish-1.0.0.js','utf8');
const bootstrap=fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js','utf8');
const css=fs.readFileSync('styles/home_profissional_dashboard-1.0.0.css','utf8');

assert.match(polish,/data-ks-home-detail=\"recentes\"/,'polish deve remover o resumo estrutural de cadastros 24h');
assert.match(polish,/ks-home-overview/,'polish deve retirar o overview legado inteiro da Home profissional');
assert.doesNotMatch(polish,/closest\('\.card,article,section'\)/,'polish não pode subir até a própria seção tela_home ao procurar o card legado');
assert.match(polish,/ks_prof_pendencias_btn/,'polish deve preservar o controle de pendências');
assert.match(polish,/ks-fisio-header-actions/,'pendências deve integrar o grupo de ações do Meu dia clínico');
assert.match(polish,/ks-prof-greeting-clean/,'saudação deve receber tratamento visual sem outline indevido');
assert.match(polish,/MutationObserver/,'polish deve acompanhar recomposição da Home sem polling');
assert.doesNotMatch(polish,/setInterval\s*\(/,'polish não pode criar polling');
assert.match(bootstrap,/home_profissional_polish-1\.0\.0\.js/,'bootstrap deve carregar o polish da Home profissional');
assert.match(bootstrap,/PROFESSIONAL_HOME_ASSET_VERSION/,'assets da Home profissional devem ter cache-buster explícito');
assert.match(css,/:has\(#ks_home_recent_count\)/,'CSS deve ocultar defensivamente o card legado de cadastros');
assert.match(css,/\.ks-prof-home-active \.ks-home-overview\{display:none!important\}/,'Home profissional deve ocultar estruturalmente o overview operacional legado');
assert.match(css,/@media\(max-width:620px\)[\s\S]*#ks_home_hero\{display:none!important\}/,'telefone deve remover o hero redundante e liberar espaço vertical');
assert.match(css,/min-height:44px/,'ações móveis devem manter alvo de toque de pelo menos 44px');
assert.match(css,/ks-prof-greeting-clean/,'CSS deve remover contorno indevido da saudação');

console.log('professional_home_polish.contract.js OK');
