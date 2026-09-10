const fs=require('fs'),vm=require('vm'),assert=require('assert');
let hma='';
global.window=global;
global.BANCO_MAPEAMENTO_CLINICO={ombro:{clusters:[],diferenciais:[]},cotovelo:{clusters:[],diferenciais:[]}};
global.coletarContextoClinico=()=>({origemIrradiacao:'',irradiacao:'',comorbidades:[],textoComorbidades:'',textoMedicamentos:'',textoCirurgias:''});
global.document={readyState:'loading',addEventListener:()=>{},getElementById:id=>id==='paciente_hma'?{value:hma}:null};
vm.runInThisContext(fs.readFileSync('clinical_reasoning_shoulder-3.1.0.js','utf8'));
vm.runInThisContext(fs.readFileSync('clinical_reasoning_elbow-3.1.0.js','utf8'));
const base=regions=>({insuficiente:false,regioes:regions.map(id=>({id,nome:id})),hipoteses:[],exame:{seguranca:[],testesPrioritarios:[],analises:[]},lacunas:[]});

hma='Tenho bursite no ombro. A dor começa no ombro e desce até o cotovelo, piorando quando levanto o braço.';
let p=window.enriquecerPlanoOmbroKineSys(base(['ombro','cotovelo']));
p=window.enriquecerPlanoCotoveloKineSys(p);
assert(p.motores31?.ombro,'shoulder registry missing');
assert(p.motores31?.cotovelo,'elbow registry missing');
assert.strictEqual(p.motor31.regiao,'ombro','legacy plano.motor31 must remain shoulder');
assert.strictEqual(p.exame.correlacaoOmbroCotovelo.ativa,true);
assert(p.hipoteses.some(x=>x.motor31?.condicaoId==='cotovelo_ombro_referida'),'proximal shoulder differential missing');
assert(!p.hipoteses.some(x=>/bursite do ombro/i.test(x.nome)),'patient label became diagnostic label');

hma='Dor do lado de fora do cotovelo ao apertar a mão e carregar uma sacola.';
p=window.enriquecerPlanoCotoveloKineSys(base(['cotovelo']));
assert(p.hipoteses.some(x=>x.motor31?.condicaoId==='cotovelo_lateral'),'lateral elbow family missing');
assert(p.exame.matrizCotovelo.some(x=>x.id==='cotovelo_lateral'));

hma='Dor no cotovelo com choque que passa do cotovelo e vai para a mão; mexer o pescoço muda a dor.';
p=window.enriquecerPlanoCotoveloKineSys(base(['cotovelo']));
assert(p.hipoteses.some(x=>x.motor31?.condicaoId==='cotovelo_cervical_neural'),'cervical/neural differential missing');

hma='Quarto e quinto dedos formigam quando apoio o cotovelo e deixo ele dobrado.';
p=window.enriquecerPlanoCotoveloKineSys(base(['cotovelo']));
assert(p.hipoteses.some(x=>x.motor31?.condicaoId==='cotovelo_ulnar'),'ulnar neuropathy family missing');

hma='Cotovelo vermelho inchado com febre e muito quente.';
p=window.enriquecerPlanoCotoveloKineSys(base(['cotovelo']));
assert(p.exame.seguranca.some(x=>/Infecção articular\/bursal/i.test(x.titulo)),'infection safety flag missing');

hma='Estalo na frente do cotovelo, hematoma e perda de força para supinar depois de levantar uma caixa.';
p=window.enriquecerPlanoCotoveloKineSys(base(['cotovelo']));
assert(p.exame.seguranca.some(x=>/Ruptura aguda do bíceps distal/i.test(x.titulo)),'distal biceps rupture safety flag missing');

assert(window.KineSysMotor31Cotovelo.referencias.some(x=>x.pmid==='36453071'));
assert(window.KineSysMotor31Cotovelo.referencias.some(x=>x.pmid==='42437185'));
assert(window.KineSysMotor31Cotovelo.condicoes.length>=12);
console.log('Motor 3.1 Cotovelo clinical invariants: OK');
