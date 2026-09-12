'use strict';

const fs=require('fs');
const assert=require('assert');

const screen=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const regional=fs.readFileSync('src/clinical/clinical_region_loader-1.0.0.js','utf8');
const strip=v=>String(v).split('?')[0];
const bytes=files=>files.reduce((total,file)=>total+fs.statSync(strip(file)).size,0);
const unique=files=>Array.from(new Set(files.map(strip)));

const evaluationBase=[
  'screens/tela_avaliacao.html',
  'styles/design_clinical.css',
  'styles/design_clinical_direction-1.17.0.css',
  'styles/design_evaluation_workspace-1.18.0.css',
  'styles/design_evaluation_context-1.18.3.css',
  'styles/avaliacao_experiencia-1.22.0.css',
  'styles/clinical_reasoning_hma-3.0.0.css',
  'styles/radar_clinico_focus-3.0.0.css',
  'styles/dialog_rascunho_focus-1.0.0.css',
  'src/clinical/cirurgias-1.18.0.js',
  'database/medicamentos.js',
  'database/irradiacao_clinica.js',
  'database/mapeamento_regioes-1.0.0.js',
  'database/mapeamento_clinico_core-1.0.0.js',
  'src/clinical/clinical_engine-1.17.0.js',
  'src/clinical/evaluation_workspace-1.17.0.js',
  'src/clinical/proms_escalas.js',
  'src/clinical/evaluation_context_panels-1.18.3.js',
  'src/clinical/avaliacao_experiencia-1.22.0.js',
  'src/clinical/clinical_reasoning_hma-3.0.0.js',
  'src/clinical/clinical_region_loader-1.0.0.js'
];

const scenarios={
  lombar:[
    'database/regioes/lombar-base-1.0.0.js'
  ],
  ombro:[
    'database/regioes/ombro-base-1.0.0.js',
    'database/regioes/ombro-ext-1.0.0.js',
    'styles/clinical_reasoning_shoulder-3.1.0.css',
    'src/clinical/clinical_reasoning_shoulder-3.1.0.js'
  ],
  punho_mao:[
    'database/regioes/punho_mao-base-1.0.0.js',
    'database/regioes/punho_mao-ext-1.0.0.js',
    'styles/clinical_reasoning_elbow-3.1.0.css',
    'src/clinical/clinical_reasoning_elbow-3.1.0.js',
    'styles/clinical_reasoning_wrist-3.1.0.css',
    'src/clinical/clinical_reasoning_wrist-3.1.0.js'
  ],
  cervical:[
    'database/regioes/cervical-base-1.0.0.js',
    'styles/clinical_reasoning_elbow-3.1.0.css',
    'src/clinical/clinical_reasoning_elbow-3.1.0.js',
    'styles/clinical_reasoning_cervical-3.1.0.css',
    'src/clinical/clinical_reasoning_cervical-3.1.0.js'
  ]
};

const budgets={
  evaluationBase:{bytes:550000,requests:21},
  lombar:{bytes:15000,requests:1},
  ombro:{bytes:70000,requests:4},
  punho_mao:{bytes:110000,requests:6},
  cervical:{bytes:115000,requests:5}
};

for(const file of evaluationBase){
  assert.ok(fs.existsSync(file),`${file} deve existir`);
  assert.ok(screen.includes(file),`${file} deve permanecer registrado no bundle lazy da Avaliação`);
}
assert.ok(!screen.includes('database/mapeamento_clinico.js'),'banco clínico monolítico não pode voltar ao bundle da Avaliação');
assert.ok(!regional.includes("'database/mapeamento_clinico.js'"),'banco clínico monolítico não pode voltar aos cenários regionais');

for(const [name,files] of Object.entries(scenarios)){
  for(const file of files){
    assert.ok(fs.existsSync(file),`${name}: ${file} deve existir`);
    assert.ok(regional.includes(file),`${name}: ${file} deve permanecer registrado no loader regional`);
  }
  const assets=unique(files);
  const total=bytes(assets);
  assert.ok(total<=budgets[name].bytes,`${name}: orçamento excedido (${total} > ${budgets[name].bytes} bytes)`);
  assert.ok(assets.length<=budgets[name].requests,`${name}: requisições excedidas (${assets.length} > ${budgets[name].requests})`);
}

const baseAssets=unique(evaluationBase);
const baseBytes=bytes(baseAssets);
assert.ok(baseBytes<=budgets.evaluationBase.bytes,`Avaliação base excedeu orçamento (${baseBytes} > ${budgets.evaluationBase.bytes} bytes)`);
assert.ok(baseAssets.length<=budgets.evaluationBase.requests,`Avaliação base excedeu requisições (${baseAssets.length} > ${budgets.evaluationBase.requests})`);

const allRegional=unique(Object.values(scenarios).flat());
assert.ok(!evaluationBase.some(file=>allRegional.includes(strip(file))),'nenhum ativo regional medido deve voltar ao bundle-base da Avaliação');

const measured={evaluationBase:{bytes:baseBytes,requests:baseAssets.length}};
for(const [name,files] of Object.entries(scenarios)){
  const assets=unique(files);
  measured[name]={bytes:bytes(assets),requests:assets.length};
}

console.log('Clinical loading performance budget: OK');
console.log(JSON.stringify({measured,budgets},null,2));
