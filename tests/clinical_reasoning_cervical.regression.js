const fs=require('fs');const vm=require('vm');const assert=require('assert');
let currentHma='';let currentContext={};
global.window=global;
global.enriquecerPlanoCotoveloKineSys=(plano)=>{plano.__ponteAnteriorVisitada=(plano.__ponteAnteriorVisitada||0)+1;return plano;};
global.BANCO_MAPEAMENTO_CLINICO={cervical:{clusters:[],diferenciais:[]}};
global.coletarContextoClinico=()=>({origemIrradiacao:'',irradiacao:'',comorbidades:[],medicamentos:[],cirurgias:[],textoComorbidades:'',textoMedicamentos:'',textoCirurgias:'',...currentContext});
global.document={readyState:'loading',addEventListener:()=>{},getElementById:(id)=>{if(id==='paciente_hma')return{value:currentHma};if(id==='paciente_idade')return{value:currentContext.idade||''};return null;}};
const motorSource=fs.readFileSync(__dirname+'/../src/clinical/clinical_reasoning_cervical-3.1.0.js','utf8');
vm.runInThisContext(motorSource);
const bancoSource=fs.readFileSync(__dirname+'/../database/mapeamento_clinico.js','utf8');
for(const id of ['radiculopatia_cervical','mielopatia_cervical_suspeita','pos_operatorio_cervical','lesao_muscular_cervical_aguda','dor_cervical_mecanica','cefaleia_cervicogenica','dor_cervical_padrao_irradiado','dor_cervical_coordenacao_movimento','instabilidade_craniocervical']){
  assert(new RegExp(`id:\\s*[\"']${id}[\"']`).test(bancoSource),`ID cervical existente deve ser preservado no banco: ${id}`);
}
assert.strictEqual(window.KineSysMotor31Cervical.version,'3.1.0-cervical1','versão cervical esperada');
assert.strictEqual(window.enriquecerPlanoCotoveloKineSys.__kinesysCervicalBridge,true,'ponte cervical deve encadear o enriquecedor anterior');
const base=()=>({insuficiente:false,regioes:[{id:'cervical',nome:'Coluna Cervical'}],hipoteses:[],exame:{seguranca:[],testesPrioritarios:[],analises:[],modificadores:[]},lacunas:[]});
const ids=p=>p.hipoteses.filter(h=>h.regiaoId==='cervical'&&h.motor31?.condicaoId).map(h=>h.motor31.condicaoId);const top=p=>ids(p)[0]||null;const safety=p=>(p.exame.seguranca||[]).map(x=>`${x.titulo} ${x.descricao}`).join(' | ');
const casos=[
{id:'CV01-mecanica',hma:'Dor no pescoço e rigidez ao virar para a direita, pior depois de muito tempo no computador. Sem formigamento ou fraqueza.',inc:['dor_cervical_mecanica'],top:'dor_cervical_mecanica'},
{id:'CV02-mecanica-coloquial',hma:'pescoco duro, trava p olhar pro lado e melhora quando me mexo. mao normal sem formig.',inc:['dor_cervical_mecanica'],top:'dor_cervical_mecanica'},
{id:'CV03-radicular',hma:'Dor no pescoço que desce pelo braço até a mão com formigamento e fraqueza. Virar o pescoço piora o choque no braço.',inc:['radiculopatia_cervical'],top:'radiculopatia_cervical'},
{id:'CV04-radicular-c7',hma:'Dor cervical com choque descendo para o braço e mão, fraqueza no tríceps e formigamento. Estender o pescoço piora os sintomas.',inc:['radiculopatia_cervical'],top:'radiculopatia_cervical'},
{id:'CV05-irradiada-nao-radicular',hma:'Dor começa no pescoço e vai para a escápula e ombro, sem formigamento, dormência ou fraqueza. Virar o pescoço reproduz a dor.',inc:['dor_cervical_padrao_irradiado'],not:['radiculopatia_cervical'],top:'dor_cervical_padrao_irradiado'},
{id:'CV06-mielopatia',ctx:{idade:64},hma:'Nos últimos meses as duas mãos ficaram desajeitadas, derrubo objetos e estou tropeçando com dificuldade para andar e equilíbrio pior.',inc:['mielopatia_cervical_suspeita'],top:'mielopatia_cervical_suspeita',safe:/mielopatia/i},
{id:'CV07-mielopatia-multissegmentar',ctx:{idade:58},hma:'Tenho dor cervical, formigamento nos dois braços e pernas pesadas, marcha estranha e clônus relatado no exame anterior.',inc:['mielopatia_cervical_suspeita'],top:'mielopatia_cervical_suspeita'},
{id:'CV08-vascular-diplopia',hma:'Começou de repente uma dor muito intensa e diferente na nuca e pescoço junto com visão dupla e dificuldade para falar.',inc:['cervical_vascular_suspeita'],top:'cervical_vascular_suspeita',safe:/vascular/i},
{id:'CV09-vascular-horner',hma:'Dor nova e súbita no lado do pescoço, diferente do habitual, com ptose e pupila pequena do mesmo lado.',inc:['cervical_vascular_suspeita'],top:'cervical_vascular_suspeita'},
{id:'CV10-trauma-estrutural',hma:'Capotei de moto e bati forte. Dor intensa bem no meio do pescoço e não consigo virar a cabeça direito, com formigamento no braço.',inc:['cervical_trauma_estrutural'],top:'cervical_trauma_estrutural',safe:/trauma/i},
{id:'CV11-infeccao',hma:'Dor forte e constante no pescoço com febre e calafrios. Fiz cirurgia recente e a dor não muda com movimento.',inc:['cervical_infeccao'],top:'cervical_infeccao',safe:/infec/i},
{id:'CV12-neoplasia',hma:'Tenho histórico de câncer e agora dor cervical progressiva, pior à noite, não muda com movimento e perdi peso sem querer.',inc:['cervical_neoplasia_suspeita'],top:'cervical_neoplasia_suspeita',safe:/neoplasia|oncolog/i},
{id:'CV13-whiplash',hma:'Depois de uma colisão traseira no carro fiquei com dor cervical, intolerância para mover o pescoço e fadiga cervical. Sem formigamento ou déficit neurológico.',inc:['dor_cervical_coordenacao_movimento'],top:'dor_cervical_coordenacao_movimento'},
{id:'CV14-muscular',hma:'Puxei o pescoço na academia fazendo peso e ficou uma dor muscular cervical focal. Sem queda, sem formigamento e sem fraqueza.',inc:['lesao_muscular_cervical_aguda'],top:'lesao_muscular_cervical_aguda'},
{id:'CV15-cefaleia-cervicogenica',hma:'Dor de cabeça começa na nuca e vai para a testa. Virar o pescoço reproduz a mesma cefaleia e sinto a cervical limitada.',inc:['cefaleia_cervicogenica'],top:'cefaleia_cervicogenica'},
{id:'CV16-occipital',hma:'Tenho crises curtas de choque e pontada na nuca, atrás da cabeça, com couro cabeludo sensível naquela faixa.',inc:['neuralgia_occipital'],top:'neuralgia_occipital'},
{id:'CV17-posop',hma:'Estou no pós-operatório de artrodese cervical há 6 semanas. Quero avaliar mobilidade, função e as restrições atuais.',inc:['pos_operatorio_cervical'],top:'pos_operatorio_cervical'},
{id:'CV18-posop-complicacao',hma:'Fiz cirurgia cervical há 10 dias e desde ontem a fraqueza no braço piorou e estou com dificuldade progressiva para engolir.',inc:['cervical_posop_complicacao'],top:'cervical_posop_complicacao',safe:/pós-operatória|complica/i},
{id:'CV19-instabilidade',hma:'Tenho artrite reumatoide e agora sensação de instabilidade no pescoço, como se não sustentasse bem a cabeça, com sintomas neurológicos estranhos.',inc:['instabilidade_craniocervical'],top:'instabilidade_craniocervical'},
{id:'CV20-cts-mimic',hma:'De madrugada o polegar, indicador e médio ficam dormentes, melhora quando sacudo a mão. Mexer o pescoço não muda nada.',not:['radiculopatia_cervical']},
{id:'CV21-ulnar-mimic',hma:'Anelar e mindinho formigam quando fico com o cotovelo dobrado ou apoiado. Mexer o pescoço não muda nada.',not:['radiculopatia_cervical']},
{id:'CV22-ombro-mimic',hma:'Dor lateral no ombro para elevar peso acima da cabeça. Sem formigamento e mexer o pescoço não altera a dor.',not:['radiculopatia_cervical','dor_cervical_padrao_irradiado']},
{id:'CV23-migranea-mimic',hma:'Tenho dor de cabeça pulsátil com náusea e fotofobia. O pescoço fica dolorido junto, mas virar ou mexer não reproduz a cefaleia.',not:['cefaleia_cervicogenica']},
{id:'CV24-tensional-mimic',hma:'Dor de cabeça em faixa e pressão dos dois lados, leve a moderada. Mexer o pescoço não muda a dor.',not:['cefaleia_cervicogenica']},
{id:'CV25-remote-trauma',hma:'Tive acidente de carro há 12 anos, fiz fisioterapia e fiquei bem sem sequela. Hoje começou dor no pescoço ao virar depois de horas no computador.',inc:['dor_cervical_mecanica'],not:['cervical_trauma_estrutural','dor_cervical_coordenacao_movimento']},
{id:'CV26-remote-surgery',hma:'Fiz artrodese cervical há 10 anos, recebi alta e fiquei bem sem sequela. Hoje tenho dor mecânica no pescoço ao virar, sem sintomas neurológicos.',inc:['dor_cervical_mecanica'],not:['pos_operatorio_cervical','cervical_posop_complicacao']},
{id:'CV27-third-party',ctx:{idade:65},hma:'Minha mãe teve mielopatia cervical e derrubava objetos. Eu tenho apenas dor no pescoço ao virar, sem formigamento, sem dificuldade para andar e sem perda de destreza.',inc:['dor_cervical_mecanica'],not:['mielopatia_cervical_suspeita']},
{id:'CV28-flu-fever',hma:'Estou gripado com febre, mas o pescoço só dói ao virar depois de dormir torto; não é constante, não tenho calafrios nem fator de risco infeccioso.',inc:['dor_cervical_mecanica'],not:['cervical_infeccao']},
{id:'CV29-family-cancer',hma:'Meu pai teve câncer. Eu não tenho câncer, não perdi peso e minha dor cervical aparece só quando viro o pescoço.',inc:['dor_cervical_mecanica'],not:['cervical_neoplasia_suspeita']},
{id:'CV30-radic-label-only',hma:'A ressonância falou hérnia cervical C5-C6, mas não tenho dor no braço, formigamento, dormência nem fraqueza. Minha queixa é só rigidez cervical ao virar.',inc:['dor_cervical_mecanica'],not:['radiculopatia_cervical']}
];
const rows=[],fails=[];for(const c of casos){try{currentHma=c.hma;currentContext=c.ctx||{};const p=window.KineSysMotor31Cervical.enriquecer(base());const got=ids(p);for(const x of c.inc||[])assert(got.includes(x),`esperava ${x}; recebeu ${got}`);for(const x of c.not||[])assert(!got.includes(x),`não deveria incluir ${x}; recebeu ${got}`);if(c.top)assert.strictEqual(top(p),c.top,`top esperado ${c.top}; recebeu ${top(p)}`);if(c.safe)assert(c.safe.test(safety(p)),`segurança ausente: ${safety(p)}`);rows.push({id:c.id,status:'PASS',top:top(p)||'-',ids:got.join(',')||'-'});}catch(e){currentHma=c.hma;currentContext=c.ctx||{};const p=window.KineSysMotor31Cervical.enriquecer(base());fails.push(`${c.id}: ${e.message} | ${top(p)||'-'} | ${ids(p).join(',')||'-'}`);rows.push({id:c.id,status:'FAIL',top:top(p)||'-',ids:ids(p).join(',')||'-'});}}
currentHma='Dor cervical local ao virar o pescoço, sem sintomas neurológicos.';
currentContext={};
const integrado=window.enriquecerPlanoCotoveloKineSys(base());
assert.strictEqual(integrado.__ponteAnteriorVisitada,1,'ponte cervical deve preservar execução do enriquecedor anterior');
assert.ok(integrado.motores31?.cervical,'ponte deve acrescentar o Motor Cervical 3.1 ao plano');
console.table(rows);console.log(`Cervical 3.1 regression: ${casos.length-fails.length}/${casos.length} cenários aprovados + ponte de integração aprovada.`);if(fails.length){console.error(fails.join('\n'));process.exitCode=1;}
