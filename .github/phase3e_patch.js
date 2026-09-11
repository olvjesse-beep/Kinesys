'use strict';
const fs=require('fs');

function replaceExact(path,from,to){
  let s=fs.readFileSync(path,'utf8');
  if(!s.includes(from))throw new Error(`Bloco não encontrado em ${path}`);
  s=s.replace(from,to);
  fs.writeFileSync(path,s);
}

replaceExact(
  'screen_loader-1.25.0.js',
  "                'database/mapeamento_regioes-1.0.0.js?v=20260911-phase3b-r1',\n                'clinical_engine-1.17.0.js',",
  "                'database/mapeamento_regioes-1.0.0.js?v=20260911-phase3b-r1',\n                'database/mapeamento_clinico_core-1.0.0.js?v=20260911-phase3e-r1',\n                'clinical_engine-1.17.0.js',"
);

replaceExact(
  'script-1.18.0.js',
  "        input.addEventListener('change', function() {\n            input.dataset.tocadoManualmente = 'true';\n            renderizarMapeamentoRegioes();\n        });",
  "        input.addEventListener('change', function() {\n            input.dataset.tocadoManualmente = 'true';\n            if (!input.checked) {\n                renderizarMapeamentoRegioes();\n                return;\n            }\n            const loader = window.KineSysClinicalRegionLoader;\n            if (!loader?.ensure) {\n                renderizarMapeamentoRegioes();\n                return;\n            }\n            loader.ensure([idRegiao]).then(() => {\n                const carregada = loader.status?.().bankRegions?.includes(idRegiao);\n                if (carregada) renderizarMapeamentoRegioes();\n                else {\n                    input.checked = false;\n                    if (typeof window.mostrarToastKineSys === 'function') window.mostrarToastKineSys('Não foi possível carregar os dados clínicos desta região. Tente novamente.','erro',6500);\n                }\n            });\n        });"
);

replaceExact(
  'tests/screen_loader.contract.js',
  "  'database/irradiacao_clinica.js',\n  'database/mapeamento_regioes-1.0.0.js'\n];",
  "  'database/irradiacao_clinica.js',\n  'database/mapeamento_regioes-1.0.0.js',\n  'database/mapeamento_clinico_core-1.0.0.js'\n];"
);

replaceExact(
  'tests/screen_loader.contract.js',
  "assert.strictEqual(vm.runInContext('typeof BANCO_MAPEAMENTO_CLINICO',clinicalDbContext),'undefined','banco clínico pesado não deve existir no bundle-base da Avaliação');",
  "assert.strictEqual(vm.runInContext('typeof BANCO_MAPEAMENTO_CLINICO',clinicalDbContext),'object','núcleo leve do banco clínico deve existir no bundle-base da Avaliação');\nconst bancoCore=vm.runInContext('BANCO_MAPEAMENTO_CLINICO',clinicalDbContext);\nassert.deepStrictEqual(Object.keys(bancoCore),Object.keys(vm.runInContext('BANCO_MAPEAMENTO_REGIOES',clinicalDbContext)),'núcleo leve deve preservar todos os IDs regionais');\nfor(const reg of Object.values(bancoCore)){\n  assert.ok(Array.isArray(reg.clusters)&&reg.clusters.length===0,'núcleo leve não deve antecipar clusters clínicos');\n  assert.ok(Array.isArray(reg.diferenciais)&&reg.diferenciais.length===0,'núcleo leve não deve antecipar diferenciais clínicos');\n  assert.ok(Array.isArray(reg.redFlags)&&reg.redFlags.length===0,'núcleo leve não deve antecipar red flags clínicas');\n}"
);
