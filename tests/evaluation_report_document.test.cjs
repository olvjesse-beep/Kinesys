'use strict';
// Regressão documental sintética; nenhum prontuário de produção é importado.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./evaluation_report_integration.test.cjs');
function exemplo(){
 const f=fixture();f.fields[0].value='Pessoa Exemplo';f.fields[1].value='46';
 f.fields.push({id:'paciente_ocupacao',value:'Atividade doméstica',type:'text',tagName:'INPUT',disabled:false,labels:[{textContent:'Ocupação',querySelector:()=>null}],classList:{contains:()=>false},closest:()=>null});
 f.fields[2].value='Refere dor na região da coluna. Relata que investiga fibromialgia. Refere que sente dor no ombro esquerdo e dor na região do ciatico direito. Refere que sente dor há 2 anos. Refere que não houve trauma. Refere que a dor iniciou na região da lombar e descia para perna direita. Também relata que dor irradia para perna direita e braço esquerdo. Refere que já passou por 2 raqui. Refere que sente dor no calcanhar direito. Refere que tem dor de cabeça. Refere que a dor aumenta principalmente ao final do dia e a acorda durante a noite.';
 f.nodes.tags_cirurgias={children:[],textContent:''};f.nodes.tags_medicamentos={children:[],textContent:''};
 for(const k of Object.keys(f.notes))delete f.notes[k];
 f.notes.contexto_saude_observacao='Refere que o pai tem fibromialgia/artrite reumatoide.';
 f.notes.contexto_medicamento_observacao='Refere que mesmo tomando o medicamento para dormir, não consegue dormir bem.';
 f.context.estados={saude:'relata',cirurgias:'nao_informado',medicamentos:'relata',atividade:'nega',exames:'nega'};
 for(const [id,nome] of Object.entries({ombro:'Ombro',lombar:'Coluna lombar',tornozelo_pe:'Tornozelo e pé',quadril:'Quadril'}))f.c.BANCO_MAPEAMENTO_CLINICO[id]={nome};
 f.regions.splice(0,f.regions.length,...['cefaleia','ombro','lombar','tornozelo_pe'].map(id=>({dataset:{regiao:id}})));
 f.tests=[];
 const original='SLR positivo a esquerda, Slump positivo a esquerda, Spurling positivo para dor irradiada para o ombro, Patrick fabere positivo para dor inguinal do lado esquerdo, Rotação interna associado a flexão, positivo para dor coxofemoral a esquerda';
 const registro={id:'exame-sintetico',texto:original,resultado:'descritivo',situacao:{tipo:'rascunho',mensagem:'Texto em preenchimento: incluído como descrição, sem confirmar critérios.'}};
 f.c.window.KineSysExameLivre={documentar:()=>[registro]};
 return {f,registro,original};
}
{
 const {f,original}=exemplo(),r=f.render(),t=r.texto;
 assert(t.startsWith('RELATÓRIO FISIOTERAPÊUTICO\n\nPaciente: Pessoa Exemplo\nIdade: 46 anos\nOcupação: Atividade doméstica'));
 assert(t.includes('Data da avaliação: 21/10/2026'));assert(t.includes('Motivo da avaliação (conforme relato): Dor na região da coluna.'));
 assert(!t.includes('passou por avaliação fisioterapêutica'));assert.equal((t.match(/Pessoa Exemplo/g)||[]).length,1);
 for(const titulo of ['História clínica','Antecedentes e contexto','Exame físico-funcional e correlação clínica'])assert(t.includes('\n\n'+titulo+'\n\n'));
 assert((t.match(/\b(?:Refere|Relata)\b/g)||[]).length<7,'não volta ao excesso de verbos do exemplo');
 assert(t.includes('Informa investigação de fibromialgia'));assert(t.includes('Antecedente familiar referido: o pai com fibromialgia/artrite reumatoide'));
 assert(t.includes('2 raqui'));assert(!/diagnóstico de fibromialgia|anestesia|cesariana|artroplastia/.test(t));
 const livre=r.semantica.fatos.find(x=>x.tipo==='exame_livre');assert.equal(livre.textoOriginal,original);assert.equal(livre.trechosDocumentais.length,5);
 assert.deepEqual(Array.from(livre.trechosDocumentais,x=>x.regiaoId),['lombar','lombar','cervical','quadril','quadril']);
 for(const trecho of livre.trechosDocumentais){assert(t.includes(trecho.texto));assert(!t.includes('• '));assert(original.slice(trecho.inicio,trecho.fim).trim()===trecho.textoOriginal);}
 assert(t.includes('SLR positivo à esquerda'));assert(t.includes('Spurling positivo para dor irradiada para o ombro'));
 assert(t.includes('Rotação interna associada à flexão'));assert(!t.includes('associado a flexão'));
 assert(!t.includes('Região não especificada'));assert(!t.includes('em preenchimento'));assert(!t.includes('confirmar critérios'));
 assert(t.includes('pendente de revisão profissional'));assert(r.validacao.exameLivrePendente.length);assert.equal(r.modo,'revisao');
 assert(!r.validacao.regioesPendentes.includes('Coluna lombar'),'achados lombares descritos não são omitidos por estarem sem combo regional');
 for(const n of ['Cabeça / Cefaleia — triagem','Ombro','Tornozelo e pé'])assert(r.validacao.regioesPendentes.includes(n));
 assert.equal(r.validacao.testesAusentes.length,0);assert.equal(r.validacao.relatoAusente.length,0);assert.equal(r.semantica.validacao.ausentes.length,0);
 assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true),'organização documental não confirma um critério do catálogo');
 assert(!r.semantica.relacoes.some(x=>x.tipo==='fundamenta_sintese_documental'));
 f.c.window.preencherLaudoAvaliacaoKineSys(JSON.parse(JSON.stringify(r)));f.c.window.renderizarLaudoAvaliacaoKineSys();assert.equal(f.nodes['ks-laudo-texto'].value,t);
 if(process.env.KINESYS_STRUCTURED_REPORT_EXAMPLE==='1')console.log(t);
}
{
 const {f,registro}=exemplo();registro.texto='  SLR negativo à esquerda, Slump inconclusivo à direita; Dado desconhecido com medida de 1.5 cm e dose informada de 25 mg.  ';
 const r=f.render(),a=r.semantica.fatos.find(x=>x.tipo==='exame_livre');
 assert.equal(a.trechosDocumentais.length,3);assert(r.texto.includes('SLR negativo à esquerda'));assert(r.texto.includes('Slump inconclusivo à direita'));assert(r.texto.includes('1.5 cm e dose informada de 25 mg'));
 for(const trecho of a.trechosDocumentais)assert.equal(registro.texto.slice(trecho.inicio,trecho.fim).trim(),trecho.textoOriginal,'offsets apontam ao registro original inclusive quando há espaços externos');
 assert.equal(a.trechosDocumentais[2].regiaoId,'');assert.equal(r.validacao.testesAusentes.length,0);
 assert(!r.texto.includes('SLR positivo'));assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true));
 const omitido=f.c.window.validarTextoSemanticoAvaliacaoKineSys(r.texto.replace('Slump inconclusivo à direita.',''));
 assert(omitido.ausentes.includes(a.id),'o auditor detecta remoção de um trecho do exame');
}
{
 const {f,registro}=exemplo();registro.regiaoId='ombro';registro.regiao='Ombro';registro.lado='direito';registro.texto='Teste descritivo, com 15 graus de limitação.';registro.situacao={tipo:'descritivo'};
 const r=f.render(),a=r.semantica.fatos.find(x=>x.tipo==='exame_livre');assert(r.texto.includes('Ombro — lado direito'));assert.equal(a.trechosDocumentais[0].origemLocalizacao,'registro');
 registro.texto='SLR negativo à esquerda';const explicito=f.render().semantica.fatos.find(x=>x.tipo==='exame_livre');
 assert.equal(explicito.trechosDocumentais[0].regiaoId,'ombro','a organização não sobrescreve a região expressamente selecionada pelo profissional');
 assert(explicito.trechosDocumentais[0].localizacaoDivergente);assert(f.render().validacao.exameLivrePendente.length);
 assert(f.render().validacao.regioesPendentes.includes('Ombro'),'SLR rotulado como ombro pede revisão, não cobre falsamente esse exame');
 registro.regiaoId='';registro.regiao='';registro.texto='SLR não realizado; Palpação dolorosa no ombro direito.';
 const pendente=f.render();assert(pendente.validacao.regioesPendentes.includes('Coluna lombar'),'teste não realizado não cobre a região');assert(!pendente.validacao.regioesPendentes.includes('Ombro'));
}
{
 const {f}=exemplo(),base=f.render();
 for(const salvo of [{...base,texto:'Documento profissional já revisado.',revisado:true},{...base,texto:'Redação manual atual.',textoAutomatico:false,revisado:false}]){
  f.c.window.preencherLaudoAvaliacaoKineSys({...salvo,revisaoSemantica:1});f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.startsWith(salvo.texto));assert(f.nodes['ks-laudo-status'].textContent.includes('Seu texto foi preservado'));
 }
 f.c.window.preencherLaudoAvaliacaoKineSys({...base,texto:'Base automática anterior.',revisaoSemantica:1,revisado:false});f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.includes('Paciente: Pessoa Exemplo'));
 const legadoManual='RELATÓRIO FISIOTERAPÊUTICO\nQuanto à queixa atual, registra-se: texto escrito pelo profissional. O exame físico ainda não contém resultados de testes registrados. A hipótese clínica permanece em aberto até a correlação entre a anamnese e o exame físico.';
 f.c.window.preencherLaudoAvaliacaoKineSys({...base,texto:legadoManual,textoAutomatico:false,revisado:false,revisaoSemantica:1});f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.startsWith(legadoManual),'nem assinatura de modelo antigo autoriza substituir texto explicitamente manual');
}
{
 const med={};vm.createContext(med);for(const path of ['database/medicamentos_anvisa-20261024.js','database/medicamentos.js'])vm.runInContext(fs.readFileSync(path,'utf8'),med);
 const {f}=exemplo();f.c.window.KineSysMedicamentos=med.KineSysMedicamentos;
 f.fields[2].value='Dor no ombro direito. Apresenta sono ruim. Usa naproxeno 500 mg à noite.';
 f.c.window.KineSysExameLivre={documentar:()=>[{id:'cirurgia-livre',texto:'Artrodese lombar realizada em 2019.',resultado:'descritivo',situacao:{tipo:'descritivo'}},{id:'exame-livre',texto:'SLR negativo à direita.',resultado:'descritivo',situacao:{tipo:'descritivo'}}]};
 const original=f.fields[2].value,r=f.render(),contexto=r.texto.split('Antecedentes e contexto\n\n')[1].split('\n\nExame físico-funcional')[0];
 assert(contexto.includes('Relata sono de má qualidade. Informa uso de naproxeno 500 mg à noite.'));assert(contexto.includes('Artrodese lombar realizada em 2019.'));
 assert(!r.texto.includes('\n\nApresenta sono ruim\n\n'));assert(!r.texto.includes('\n\nUsa naproxeno'));
 assert(!/Região não|Achados sem localização|Sem região definida/.test(r.texto));assert(!r.texto.includes('• Artrodese'));
 const cirurgia=r.semantica.fatos.find(x=>x.assuntoDocumental==='cirurgias');assert(cirurgia);assert.equal(cirurgia.origens[0].registroId,'cirurgia-livre');assert(cirurgia.trechosDocumentais.every(x=>!x.realizado));
 assert(!r.semantica.fatos.some(x=>x.tipo==='exame_livre'&&x.textoOriginal.includes('Artrodese')));
 assert(r.texto.includes('SLR negativo à direita'));assert.equal(r.validacao.testesAusentes.length,0);assert.equal(r.semantica.validacao.ausentes.length,0);assert.equal(f.fields[2].value,original);
 assert(r.semantica.correlacoes.every(x=>x.criterioAtendido!==true));
 f.c.window.KineSysMedicamentos={buscar:()=>null};assert.doesNotThrow(()=>f.render(),'catálogo ainda carregando não interrompe o relatório');
}
{
 const {f}=exemplo();const raw='Artroplastia de quadril indicada, ainda não realizada; SLR negativo à esquerda; Palpação dolorosa na cicatriz da cirurgia lombar.';
 f.c.window.KineSysExameLivre={documentar:()=>[{id:'misto',texto:raw,resultado:'descritivo',situacao:{tipo:'descritivo'}}]};
 const r=f.render(),antecedente=r.semantica.fatos.find(x=>x.assuntoDocumental==='cirurgias'),exame=r.semantica.fatos.find(x=>x.tipo==='exame_livre');
 assert(antecedente.redacao.includes('indicada, ainda não realizada'));assert(!antecedente.trechosDocumentais[0].realizado);assert(exame.redacao.includes('Palpação dolorosa'));assert.equal(exame.trechosDocumentais.length,2);
 assert.equal(antecedente.textoOriginal,raw);assert.equal(exame.textoOriginal,raw);assert.equal(r.semantica.validacao.ausentes.length,0);assert(!r.texto.includes('artroplastia realizada'));
}
{
 const {f}=exemplo();f.c.window.KineSysExameLivre={documentar:()=>[{id:'sem-local',texto:'Resistência reduzida durante o movimento avaliado.',situacao:{tipo:'descritivo'}}]};
 const r=f.render();assert(r.texto.includes('Resistência reduzida durante o movimento avaliado.'));assert(!/Achados sem localização|Região não especificada/.test(r.texto));assert(r.validacao.exameLivrePendente.some(x=>x.includes('localização esclarecida')));
 f.c.window.KineSysExameLivre={documentar:()=>[{id:'somente-cirurgia',texto:'Artrodese lombar em 2019.',situacao:{tipo:'descritivo'}}]};
 const somente=f.render();assert.equal(somente.modo,'incompleto');assert(somente.validacao.pendencias.some(x=>x.includes('resultado do exame físico')),'um antecedente não substitui o exame');
}
console.log('Documento clínico: assuntos integrados, cirurgia distinta de teste, ausência de região sem título vazio, parágrafos coerentes, origem e texto profissional preservados OK.');

// Dez avaliações completas, exclusivamente fictícias, para revisão narrativa.
// Os resultados são registros fornecidos, não novos critérios diagnósticos.
const casosAuditoriaNarrativa=[
 {tema:'Cervical com irradiação',idade:42,ocupacao:'Analista de sistemas',regioes:['cervical'],eva:6,inicio:'Insidioso, sem trauma claro',
  hma:'Dor no pescoço direito há três meses, com irradiação para o braço direito. A dor cervical começou gradualmente, sem trauma. A dor cervical piora ao trabalhar no computador e ao girar a cabeça para a direita. A dor cervical melhora com pausas e apoio do braço. Nega perda de força no braço direito.',
  saude:'Refere hipertensão em acompanhamento.',cirurgias:['Apendicectomia (data informada: 2014)'],medicamentos:['Naproxeno'],obsMedicamento:'Usa naproxeno 500 mg à noite, conforme relato.',psico:['Sono ruim'],trabalho:'Trabalho ao computador',exposicoes:['Sedestação prolongada'],atividade:'Caminhada',frequencia:'3',duracao:'30',
  exame:[['cervical','Rotação cervical à direita de 45 graus, com dor cervical familiar; Spurling reproduz os sintomas no braço direito; Distração cervical reduz os sintomas do braço direito.']],imagem:'Laudo de RM cervical apresentado: protrusão discal em C6-C7.',meta:'Retomar o trabalho ao computador com pausas e tolerância funcional acompanhada.'},
 {tema:'Lombar após esforço',idade:36,ocupacao:'Estoquista',regioes:['lombar'],eva:7,inicio:'Esforço repetitivo / sobrecarga',
  hma:'Dor lombar à esquerda há duas semanas. A dor lombar iniciou após levantar uma caixa no trabalho. A dor lombar piora ao inclinar o tronco e levantar peso. A dor lombar melhora ao deitar de lado. Nega dormência nas pernas.',
  saude:'Nega outras doenças conhecidas.',cirurgias:[],medicamentos:['Paracetamol'],obsMedicamento:'Refere uso de paracetamol 750 mg quando necessário; não informou frequência.',psico:[],trabalho:'Movimentar caixas',exposicoes:['Flexão/rotação com carga'],atividade:'',
  exame:[['lombar','Flexão lombar limitada pela dor à esquerda; SLR negativo à esquerda; Slump negativo à esquerda.']],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar a tolerância às tarefas de flexão e movimentação de cargas.'},
 {tema:'Ombro após queda',idade:57,ocupacao:'Professora',regioes:['ombro'],eva:5,inicio:'Trauma agudo',
  hma:'Dor no ombro direito há seis semanas, após queda sobre o lado direito. A dor no ombro direito piora ao elevar o braço e ao deitar sobre esse lado. A dor no ombro direito melhora com repouso. Nega dor cervical e dormência na mão direita.',
  saude:'Refere diabetes em acompanhamento.',cirurgias:['Colecistectomia (data informada: 2018)'],medicamentos:['Metformina'],obsMedicamento:'Usa metformina 850 mg duas vezes ao dia, segundo relato.',psico:['Medo de movimento/relesão'],trabalho:'Escrever no quadro',exposicoes:['Acima da cabeça'],atividade:'Caminhada',frequencia:'2',duracao:'20',
  exame:[['ombro','Elevação ativa do ombro direito de 100 graus, limitada por dor; Rotação externa do ombro direito de 40 graus; Jobe com dor no ombro direito, sem fraqueza registrada.']],imagem:'Ultrassonografia apresentada: alteração tendínea do supraespinhal direito.',meta:'Acompanhar a recuperação da elevação funcional do membro superior direito.'},
 {tema:'Joelho com EVA atual zero',idade:29,ocupacao:'Técnica de laboratório',regioes:['joelho'],eva:0,inicio:'Trauma agudo',
  hma:'Dor no joelho esquerdo há dez dias, após torção durante uma caminhada. A dor no joelho esquerdo piora ao descer escadas. A dor no joelho esquerdo melhora em repouso. No momento da avaliação, refere ausência de dor em repouso. Nega travamento do joelho esquerdo.',
  saude:'Nega outras doenças conhecidas.',cirurgias:[],medicamentos:[],obsMedicamento:'Nega uso atual de medicamentos.',psico:[],trabalho:'Alternar períodos sentada e em pé',exposicoes:[],atividade:'Caminhada',frequencia:'2',duracao:'25',
  exame:[['joelho','Flexão do joelho esquerdo de 125 graus; Dor no joelho esquerdo ao descer um degrau; Lachman negativo à esquerda.']],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar a tolerância do joelho esquerdo na descida de escadas.'},
 {tema:'Tornozelo lateral após entorse',idade:31,ocupacao:'Vendedora',regioes:['tornozelo_pe'],eva:4,inicio:'Trauma agudo',
  hma:'Dor na lateral do tornozelo direito há quatro semanas, após entorse em inversão durante corrida. A dor lateral do tornozelo direito piora ao caminhar em terreno irregular e na eversão. A dor lateral do tornozelo direito melhora com repouso. Nega dor no calcanhar direito.',
  saude:'Nega outras doenças conhecidas.',cirurgias:[],medicamentos:['Ibuprofeno'],obsMedicamento:'Refere ter usado ibuprofeno 400 mg por dois dias após a entorse; nega uso atual.',psico:[],trabalho:'Atendimento em loja',exposicoes:['Ortostatismo prolongado'],atividade:'Corrida',frequencia:'3',duracao:'40',
  exame:[['tornozelo_pe','Palpação dolorosa na região lateral do tornozelo direito; Dorsiflexão do tornozelo direito de 10 graus; Eversão resistida reproduz dor na lateral do tornozelo direito.']],imagem:'Radiografia apresentada sem fratura descrita no laudo.',meta:'Acompanhar a tolerância à marcha em diferentes superfícies.'},
 {tema:'Pós-operatório de quadril',idade:68,ocupacao:'Aposentada',regioes:['quadril'],eva:2,inicio:'Pós-cirúrgico / pós-imobilização',
  hma:'Dor no quadril esquerdo após artroplastia total realizada em 12/03/2025. A dor no quadril esquerdo piora ao caminhar por mais de quinze minutos. A dor no quadril esquerdo melhora ao sentar. Refere dificuldade para calçar o sapato esquerdo.',
  saude:'Refere hipertensão em acompanhamento.',cirurgias:['Artroplastia total de quadril esquerdo (data informada: 12/03/2025)'],medicamentos:['Losartana'],obsMedicamento:'Usa losartana 50 mg pela manhã, conforme relato.',psico:['Medo de movimento/relesão'],trabalho:'Atividades domésticas',exposicoes:[],atividade:'Caminhada',frequencia:'5',duracao:'15',
  exame:[['quadril','Flexão do quadril esquerdo de 90 graus; Abdução do quadril esquerdo de 25 graus; Marcha com apoio de bengala na mão direita.']],imagem:'Relatório cirúrgico apresentado com data de 12/03/2025.',meta:'Acompanhar marcha, mobilidade funcional e capacidade de calçar o sapato.'},
 {tema:'Mãos com queixas bilaterais',idade:48,ocupacao:'Costureira',regioes:['punho_mao'],eva:3,inicio:'Insidioso, sem trauma claro',
  hma:'Formigamento nas mãos direita e esquerda há quatro meses. O formigamento nas mãos piora durante a costura e à noite. O formigamento nas mãos melhora ao interromper a atividade. Refere cirurgia no punho esquerdo em 2020. Nega nova cirurgia indicada.',
  saude:'Nega diabetes conhecida.',cirurgias:['Liberação do túnel do carpo esquerdo (data informada: 2020)'],medicamentos:[],obsMedicamento:'Nega uso atual de medicamentos.',psico:['Sono ruim'],trabalho:'Costurar peças',exposicoes:['Repetição mãos/punhos'],atividade:'',
  exame:[['punho_mao','Phalen reproduz formigamento à direita; Phalen inconclusivo à esquerda; Força de preensão de 18 kg à direita e 16 kg à esquerda.']],imagem:'Eletroneuromiografia não apresentada.',meta:'Acompanhar sintomas e tolerância à costura, com lados registrados separadamente.'},
 {tema:'Cefaleia e cervical',idade:39,ocupacao:'Dentista',regioes:['cefaleia','cervical'],eva:5,inicio:'Insidioso, sem trauma claro',
  hma:'Dor na região cervical direita há dois meses. A dor cervical piora após longos períodos de atendimento e melhora com pausas. Refere também dor de cabeça na região occipital direita, duas vezes por semana. A dor de cabeça piora após um dia prolongado de trabalho e melhora ao descansar. Nega início súbito da dor de cabeça.',
  saude:'Refere episódios prévios semelhantes de dor de cabeça; não apresentou diagnóstico confirmado.',cirurgias:[],medicamentos:['Dipirona'],obsMedicamento:'Refere uso de dipirona 500 mg nos episódios de dor de cabeça, sem frequência diária informada.',psico:['Estresse elevado'],trabalho:'Atendimento odontológico',exposicoes:['Flexão/rotação com carga'],atividade:'Pilates',frequencia:'2',duracao:'50',
  exame:[['cervical','Rotação cervical direita de 50 graus com dor cervical; Palpação cervical reproduz dor local.'],['cefaleia','Durante a entrevista, a paciente negou dor de cabeça súbita e alteração visual; Registro descritivo sem conclusão de causalidade cervical.']],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar separadamente frequência da cefaleia e função cervical.'},
 {tema:'Três queixas e antecedente familiar',idade:52,ocupacao:'Cabeleireira',regioes:['ombro','joelho','tornozelo_pe'],eva:6,inicio:'Insidioso, sem trauma claro',
  hma:'Dor no ombro esquerdo há seis meses. A dor no ombro esquerdo piora ao trabalhar com o braço elevado e melhora com repouso. Dor no joelho direito há dois anos. A dor no joelho direito piora ao subir escadas e melhora ao sentar. Dor no calcanhar esquerdo há um mês. A dor no calcanhar esquerdo piora nos primeiros passos e melhora após caminhar alguns minutos. A mãe tem artrite reumatoide. A paciente nega diagnóstico próprio de artrite reumatoide.',
  saude:'Refere hipertensão em acompanhamento.',cirurgias:['Apendicectomia (data informada: 2008)'],medicamentos:['Losartana','Naproxeno'],obsMedicamento:'Usa losartana 50 mg pela manhã e naproxeno 250 mg à noite, segundo relato.',psico:['Sono ruim'],trabalho:'Cortar e secar cabelos',exposicoes:['Acima da cabeça','Ortostatismo prolongado'],atividade:'Caminhada',frequencia:'2',duracao:'20',
  exame:[['ombro','Elevação do ombro esquerdo de 110 graus, com dor; Jobe doloroso à esquerda.'],['joelho','Flexão do joelho direito de 120 graus; Dor no joelho direito ao subir um degrau.'],['tornozelo_pe','Palpação dolorosa no calcanhar esquerdo; Dorsiflexão do tornozelo esquerdo de 8 graus.']],imagem:'Radiografia do joelho direito apresentada com redução do espaço articular no laudo.',meta:'Acompanhar separadamente as limitações nas tarefas de braço elevado, escadas e marcha.'},
 {tema:'Indicação cirúrgica e anotação fora do campo',idade:61,ocupacao:'Motorista',regioes:['lombar'],eva:7,inicio:'Insidioso, sem trauma claro',
  hma:'Dor lombar à direita há três anos, com irradiação para a perna direita. A dor lombar piora ao permanecer sentado por mais de trinta minutos e melhora ao caminhar por períodos curtos. Refere que recebeu indicação de cirurgia lombar, ainda não realizada. Nega perda de controle urinário.',
  saude:'Refere hipertensão em acompanhamento.',cirurgias:[],medicamentos:['Pregabalina'],obsMedicamento:'Usa pregabalina 75 mg à noite, conforme relato.',psico:['Sono ruim'],trabalho:'Dirigir por períodos prolongados',exposicoes:['Sedestação prolongada'],atividade:'Caminhada',frequencia:'4',duracao:'10',
  exame:[['','Apendicectomia realizada em 1995.'],['lombar','SLR positivo à direita para a dor familiar na perna direita; Slump inconclusivo à direita; Flexão lombar limitada pela dor.']],imagem:'Laudo de RM lombar apresentado: protrusão discal em L4-L5.',meta:'Acompanhar a tolerância à posição sentada e os sintomas na perna direita.'}
];
function gerarAuditoriaDezAvaliacoes(){
 const medication={};vm.createContext(medication);for(const p of ['database/medicamentos_anvisa-20261024.js','database/medicamentos.js'])vm.runInContext(fs.readFileSync(p,'utf8'),medication);
 const campo=(id,value,label,extra={})=>({id,value:String(value??''),type:'text',tagName:'INPUT',disabled:false,labels:[{textContent:label,querySelector:()=>({textContent:label})}],classList:{contains:()=>false},closest:()=>null,...extra});
 const tag=text=>({dataset:{exibicao:text},textContent:text,cloneNode(){return {textContent:text,querySelectorAll:()=>[]};}});
 return casosAuditoriaNarrativa.map((input,index)=>{
  const f=fixture(),name='Paciente Sintético '+String(index+1).padStart(2,'0');f.fields[0].value=name;f.fields[1].value=String(input.idade);f.fields[2].value=input.hma;
  for(const k of Object.keys(f.notes))delete f.notes[k];
  Object.assign(f.notes,{contexto_saude_observacao:input.saude,contexto_medicamento_observacao:input.obsMedicamento,contexto_trabalho_tarefa:input.trabalho,contexto_trabalho_tempo:'6 horas/dia',contexto_trabalho_frequencia:'5 dias/semana'});
  f.context.estados={saude:'relata',cirurgias:input.cirurgias.length?'relata':'nao_informado',medicamentos:'relata',trabalho:'relata',atividade:input.atividade?'relata':'nao_informado',exames:'relata',psicossocial:input.psico.length?'relata':'nao_informado'};
  const fields=[campo('paciente_ocupacao',input.ocupacao,'Profissão'),campo('eva_slider',input.eva,'Dor atual (EVA 0–10)',{type:'range'}),campo('paciente_mecanismo_lesao',input.inicio,'Mecanismo / início'),campo('paciente_esporte',input.atividade,'Atividade física'),campo('esporte_frequencia',input.frequencia||'','Frequência semanal'),campo('esporte_duracao',input.duracao||'','Duração média'),campo('exames_imagem_descricao',input.imagem,'Exames de imagem'),campo('exames_imagem_fonte','laudo_conferido','Origem do exame')];
  for(const [group,labels] of [['chk_yellow_flag',input.psico],['chk_exposicao_ocupacional',input.exposicoes]])labels.forEach(label=>fields.push(campo('', 'sim',label,{type:'checkbox',checked:true,classList:{contains:c=>c===group}})));
  fields.forEach(x=>{f.fields.push(x);if(x.id)f.nodes[x.id]=x;});f.nodes.avaliacao_realizado_em.value='2026-10-27T09:00';
  f.nodes.tags_cirurgias={children:input.cirurgias.map(tag),textContent:input.cirurgias.join('; ')};f.nodes.tags_medicamentos={children:input.medicamentos.map(tag),textContent:input.medicamentos.join('; ')};
  f.c.window.KineSysMedicamentos=medication.KineSysMedicamentos;f.c.window.KineSysMotorClinico3={ultimoPlano:{hipoteses:[],exame:{testesPrioritarios:[]}}};f.tests=[];
  for(const id of input.regioes)vm.runInContext(fs.readFileSync('database/regioes/'+id+'-base-1.0.0.js','utf8'),f.c);
  f.regions.splice(0,f.regions.length,...input.regioes.map(regiao=>({dataset:{regiao}})));
  f.c.gerarSinteseMapeamento=()=>({resumoPorRegiao:[],segurancaGlobal:{pistasGlobais:[]}});
  f.c.clinicaEstruturadaPreservada={objetivosPlano:{objetivos:[{objetivo:input.meta}]}};
  const registros=input.exame.map(([regiaoId,texto],n)=>({id:'qa-'+index+'-'+n,regiaoId,regiao:f.c.BANCO_MAPEAMENTO_CLINICO[regiaoId]?.nome||'',texto,resultado:'descritivo',situacao:{tipo:'descritivo'}}));
  f.c.window.KineSysExameLivre={documentar:()=>registros};const original=JSON.stringify({hma:input.hma,registros,notes:f.notes}),relatorio=f.render();
  assert.equal(JSON.stringify({hma:f.fields[2].value,registros,notes:f.notes}),original,'auditoria não modifica as origens');
  assert(relatorio.texto.startsWith('RELATÓRIO FISIOTERAPÊUTICO\n\nPaciente: '+name));assert(relatorio.texto.includes('Data da avaliação: 27/10/2026'));
  return {id:index+1,tema:input.tema,nome:name,entrada:input,relatorio};
 });
}
module.exports={gerarAuditoriaDezAvaliacoes};

// Esta rodada integra a barreira existente, além da inspeção humana dos textos.
const rodadaDez=gerarAuditoriaDezAvaliacoes();
assert.equal(rodadaDez.length,10);
for(const {id,entrada,relatorio:r} of rodadaDez){
 const texto=r.texto,historia=texto.split('História clínica\n\n')[1].split('\n\nAntecedentes e contexto')[0],v=r.semantica.validacao;
 assert(r.validacao.ok,JSON.stringify({id,validacao:r.validacao}));assert.equal(v.ausentes.length,0);assert.equal(v.significado.ausentes.length,0);assert.equal(v.significado.introduzidas.length,0);assert.equal(v.significado.causalidade.length,0);assert.equal(v.contradicoes.length,0);assert.equal(v.numerosSemOrigem.length,0);
 assert(historia.includes(entrada.eva+'/10 na EVA'),'EVA explícita no bloco da história: '+id);
 assert(historia.includes('início')||historia.includes('iniciado')||historia.includes('começou'),'início não deslocado para antecedentes: '+id);
 assert(texto.includes('Motivo da avaliação (conforme relato): '));assert(!/Informa uso de:\s*(?:Usa|Toma)|documento de imagem apresentado descreve Não|Região não especificada|Achados sem localização|^• /m.test(texto));
 for(const f of r.semantica.fatos.filter(f=>f.trechosDocumentais))for(const trecho of f.trechosDocumentais)assert(texto.includes(trecho.texto),'achado integral e classificação preservados: '+id);
 assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true),'descrição sem vínculo não confirma hipótese: '+id);
}
const historiaMultiplas=rodadaDez[8].relatorio.texto.split('História clínica\n\n')[1].split('\n\nAntecedentes e contexto')[0].split('\n\n');
assert(historiaMultiplas.at(-1).includes('6/10 na EVA'));assert(!/ombro|joelho|calcanhar/.test(historiaMultiplas.at(-1)),'caracterização global não é atribuída à última queixa regional');
assert(rodadaDez[3].relatorio.texto.includes('0/10 na EVA'));assert(rodadaDez[3].relatorio.texto.includes('ausência de dor em repouso'));
assert(rodadaDez[4].relatorio.texto.includes('ter usado ibuprofeno 400 mg por dois dias'));assert(!rodadaDez[4].relatorio.texto.includes('Medicamentos em uso: Ibuprofeno'));
assert(rodadaDez[6].relatorio.texto.includes('Motivo da avaliação (conforme relato): Formigamento nas mãos direita e esquerda'));
const tres=rodadaDez[8].relatorio.texto;assert(tres.includes('A mãe tem artrite reumatoide'));assert(tres.includes('nega diagnóstico próprio de artrite reumatoide'));assert(tres.includes('ombro esquerdo'));assert(tres.includes('joelho direito'));assert(tres.includes('calcanhar esquerdo'));
const operacao=rodadaDez[9].relatorio;assert(operacao.texto.includes('indicada')||operacao.texto.includes('indicação cirúrgica'));assert(operacao.texto.includes('ainda não realizada'));assert(operacao.texto.includes('Apendicectomia realizada em 1995'));assert(operacao.semantica.fatos.find(f=>f.assuntoDocumental==='cirurgias').trechosDocumentais.every(t=>!t.realizado));
assert(rodadaDez.filter(x=>x.relatorio.modo==='revisao').every(x=>x.relatorio.semantica.validacao.esclarecimentos.length||x.relatorio.semantica.validacao.significado.limites.length),'dúvidas conservam revisão externa ao documento');
console.log('PASS: dez avaliações completas com EVA, início, doses/cronologia, negações, múltiplas queixas, cirurgia indicada/realizada, prosa regional e origens preservadas.');
