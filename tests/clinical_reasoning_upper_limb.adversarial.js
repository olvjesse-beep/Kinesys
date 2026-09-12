const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
let currentHma='';
let currentContext={};
global.window=global;
global.BANCO_MAPEAMENTO_CLINICO={ombro:{clusters:[],diferenciais:[]},cotovelo:{clusters:[],diferenciais:[]},punho_mao:{clusters:[],diferenciais:[]}};
global.coletarContextoClinico=()=>({origemIrradiacao:'',irradiacao:'',comorbidades:[],medicamentos:[],cirurgias:[],textoComorbidades:'',textoMedicamentos:'',textoCirurgias:'',...currentContext});
global.document={readyState:'loading',addEventListener:()=>{},getElementById:(id)=>id==='paciente_hma'?{value:currentHma}:id==='paciente_idade'?{value:currentContext.idade||''}:null};
vm.runInThisContext(fs.readFileSync(__dirname+'/../src/clinical/clinical_reasoning_shoulder-3.1.0.js','utf8'));
vm.runInThisContext(fs.readFileSync(__dirname+'/../src/clinical/clinical_reasoning_elbow-3.1.0.js','utf8'));
vm.runInThisContext(fs.readFileSync(__dirname+'/../src/clinical/clinical_reasoning_wrist-3.1.0.js','utf8'));
function base(regiao){return{insuficiente:false,regioes:[{id:regiao,nome:regiao}],hipoteses:[],exame:{seguranca:[],testesPrioritarios:[],analises:[],modificadores:[]},lacunas:[]};}
function motor(regiao){if(regiao==='ombro')return window.KineSysMotor31Ombro.enriquecer;if(regiao==='cotovelo')return window.KineSysMotor31Cotovelo.enriquecer;return window.KineSysMotor31PunhoMao.enriquecer;}
function ids(p,regiao){return p.hipoteses.filter(h=>h.regiaoId===regiao&&h.motor31?.condicaoId).map(h=>h.motor31.condicaoId);}
function top(p,regiao){return ids(p,regiao)[0]||null;}
function run(c){currentHma=c.hma;currentContext=c.contexto||{};const p=motor(c.regiao)(base(c.regiao));const got=ids(p,c.regiao);for(const id of c.inclui||[])assert(got.includes(id),`${c.id}: esperava ${id}; recebeu ${got.join(', ')||'(nenhum)'}`);for(const id of c.naoInclui||[])assert(!got.includes(id),`${c.id}: não deveria incluir ${id}; recebeu ${got.join(', ')}`);if(c.top)assert.strictEqual(top(p,c.regiao),c.top,`${c.id}: top esperado ${c.top}; recebeu ${top(p,c.regiao)}`);if(c.seguranca){const s=(p.exame.seguranca||[]).map(x=>`${x.titulo} ${x.descricao}`).join(' | ');assert(c.seguranca.test(s),`${c.id}: alerta de segurança ausente: ${s}`);}return{id:c.id,top:top(p,c.regiao)||'-',ids:got.join(',')||'-'};}
const casos=[
 {id:'AE01-cotovelo-grip-generico',regiao:'cotovelo',hma:'Meu cotovelo dói quando aperto a mão, mas não sei dizer se é do lado de dentro ou de fora. Sem formigamento.',naoInclui:['cotovelo_lateral','cotovelo_medial']},
 {id:'AE02-cotovelo-cervical-lateral',regiao:'cotovelo',hma:'Sinto dor no lado de fora do cotovelo, mas também formiga até a mão e virar o pescoço reproduz a dor. Apertar a mão não muda nada.',inclui:['cotovelo_cervical_neural'],naoInclui:['cotovelo_lateral'],top:'cotovelo_cervical_neural'},
 {id:'AE03-cotovelo-articular-lateral',regiao:'cotovelo',hma:'Dor mais para o lado de fora do cotovelo, mas o principal é que ele trava de verdade, não estica todo e range. Apertar a mão não piora.',inclui:['cotovelo_articular'],naoInclui:['cotovelo_lateral'],top:'cotovelo_articular'},
 {id:'AE04-cotovelo-radial-vs-tendao',regiao:'cotovelo',hma:'A dor fica no antebraço lateral uns dedos abaixo do cotovelo e piora para supinar. Apertar a mão quase não interfere.',inclui:['cotovelo_tunel_radial'],naoInclui:['cotovelo_lateral'],top:'cotovelo_tunel_radial'},
 {id:'AE05-cotovelo-ulnar-vs-medial',regiao:'cotovelo',hma:'Dói na parte de dentro do cotovelo e o anelar e mindinho formigam quando deixo o cotovelo dobrado ou apoiado. Flexionar o punho não piora.',inclui:['cotovelo_ulnar'],naoInclui:['cotovelo_medial'],top:'cotovelo_ulnar'},
 {id:'AE06-cotovelo-plri',regiao:'cotovelo',hma:'Depois que desloquei o cotovelo meses atrás ele ficou dando falseio. Sinto um clunk e insegurança quando apoio a mão para levantar da cadeira.',inclui:['cotovelo_plri'],top:'cotovelo_plri'},
 {id:'AE07-cotovelo-local-real',regiao:'cotovelo',hma:'Dor bem localizada no epicôndilo lateral. Apertar forte e estender o punho contra resistência reproduzem exatamente a dor, e mexer o pescoço não altera.',inclui:['cotovelo_lateral'],top:'cotovelo_lateral'},
 {id:'AE08-cotovelo-misto-real',regiao:'cotovelo',hma:'Tenho dor focal no epicôndilo lateral ao apertar e estender o punho, mas também uma segunda sensação de choque que vem do pescoço e chega à mão.',inclui:['cotovelo_lateral','cotovelo_cervical_neural']},
 {id:'AE09-cotovelo-rotulo',regiao:'cotovelo',hma:'Disseram que é epicondilite e tendinite no cotovelo, mas eu só sei que dói e não sei onde nem o que piora.',naoInclui:['cotovelo_lateral','cotovelo_medial']},
 {id:'AS01-ombro-cardiorresp',regiao:'ombro',hma:'Quando subo uma ladeira sinto pressão no peito e dor no ombro esquerdo com falta de ar, suor frio e náusea. Parando o esforço melhora.',inclui:['ombro_cardiorrespiratorio'],top:'ombro_cardiorrespiratorio',seguranca:/card|torác|dispneia|esforço/i},
 {id:'AS02-ombro-cervical',regiao:'ombro',hma:'Dor no ombro que desce além do cotovelo até os dedos com formigamento; virar o pescoço reproduz a queixa e levantar o braço não muda.',inclui:['ombro_cervical_referida'],naoInclui:['ombro_manguito'],top:'ombro_cervical_referida'},
 {id:'AS03-ombro-manguito-local',regiao:'ombro',hma:'Dor lateral do ombro ao elevar e carregar peso acima da cabeça. Não passa do cotovelo e o pescoço não muda a dor.',inclui:['ombro_manguito'],top:'ombro_manguito'},
 {id:'AW01-mediano-proximal',regiao:'punho_mao',hma:'Formigamento em polegar indicador e médio junto com dor na face da frente do antebraço perto do cotovelo. Piora ao pronar contra força, não acorda à noite e sacudir a mão não ajuda.',inclui:['punho_mediano_proximal'],naoInclui:['tunel_carpo'],top:'punho_mediano_proximal'},
 {id:'AW02-cts-classico',regiao:'punho_mao',hma:'Acordo à noite com polegar indicador e médio dormentes, melhora quando sacudo a mão e não tenho dor no antebraço.',inclui:['tunel_carpo'],naoInclui:['punho_mediano_proximal'],top:'tunel_carpo'},
 {id:'AW03-intersecao',regiao:'punho_mao',hma:'Dor e crepitação no dorso radial do antebraço alguns centímetros acima do punho depois de muita extensão repetitiva. A estiloide radial perto do polegar não é o ponto doloroso.',inclui:['punho_intersecao'],naoInclui:['dequervain'],top:'punho_intersecao'},
 {id:'AW04-dequervain-local',regiao:'punho_mao',hma:'Dor bem na estiloide radial junto ao polegar para pegar o bebê e abrir pote; não dói mais acima no antebraço.',inclui:['dequervain'],naoInclui:['punho_intersecao'],top:'dequervain'},
 {id:'AW05-ecu',regiao:'punho_mao',hma:'Dor no dorso do lado ulnar do punho com um estalo do tendão quando giro o antebraço e desvio a mão para o lado do mindinho.',inclui:['punho_ecu'],top:'punho_ecu'},
 {id:'AW06-tfcc',regiao:'punho_mao',hma:'Dor profunda do lado ulnar do punho ao girar chave e apoiar o peso da mão, sem estalo de tendão e sem formigamento.',inclui:['tfcc'],naoInclui:['punho_ecu'],top:'tfcc'},
 {id:'AW07-cervical-mediano',regiao:'punho_mao',hma:'Polegar indicador e médio formigam, mas a sensação começa no pescoço, desce pelo braço e muda quando viro a cabeça. Não é pior à noite.',inclui:['radiculopatia_neuropatia_proximal'],naoInclui:['tunel_carpo'],top:'radiculopatia_neuropatia_proximal'}
];
const resultados=casos.map(run);console.table(resultados);console.log(`Upper-limb adversarial audit: ${resultados.length}/${casos.length} cenários aprovados.`);
