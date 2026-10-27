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
 assert(!t.includes('pendente de revisão profissional'),'estado de edição é aviso do painel, não texto clínico');assert(r.validacao.exameLivrePendente.length);assert.equal(r.modo,'revisao');
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
 const r=f.render(),a=r.semantica.fatos.find(x=>x.tipo==='exame_livre');assert(r.texto.includes('ombro — lado direito'));assert.equal(a.trechosDocumentais[0].origemLocalizacao,'registro');
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
// Segunda rodada: dez histórias diferentes, sem reutilizar HMA da primeira.
const casosAuditoriaSegundaRodada=[
 {tema:'Cotovelo lateral e testes vinculados',idade:44,ocupacao:'Mecânico',regioes:['cotovelo'],eva:4,inicio:'Esforço repetitivo / sobrecarga',
  hma:'Paciente relata dor na face lateral do cotovelo direito há seis semanas, após aumento das tarefas de apertar parafusos. A dor no cotovelo direito piora ao girar a chave e segurar objetos com firmeza. A dor no cotovelo direito melhora ao interromper essas tarefas. Nega dormência na mão direita e trauma recente.',
  saude:'Refere hipertensão em acompanhamento.',cirurgias:[],medicamentos:['Losartana'],obsMedicamento:'Usa losartana 50 mg pela manhã, segundo relato.',psico:['Sono ruim'],trabalho:'Apertar parafusos e manusear ferramentas',tempo:'7 horas/dia',exposicoes:['Repetição mãos/punhos'],atividade:'Ciclismo',frequencia:'2',duracao:'45',
  exame:[['cotovelo','Flexão do cotovelo direito de 140 graus; Extensão completa do cotovelo direito, sem dor; Força de preensão de 24 kg à direita e 31 kg à esquerda.']],guiados:[{regiao:'cotovelo',id:'tendinopatia_lateral_cotovelo',resultados:['positivo','positivo','inconclusivo','negativo']}],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar tolerância às ferramentas e capacidade de preensão.'},
 {tema:'Punho radial esquerdo no pós-parto',idade:32,ocupacao:'Professora',regioes:['punho_mao'],eva:5,inicio:'Esforço repetitivo / sobrecarga',
  hma:'Refere dor no lado radial do punho esquerdo há dois meses, percebida ao carregar o bebê. A dor no punho esquerdo piora ao levantar o bebê e mover o polegar esquerdo. A dor no punho esquerdo melhora ao apoiar o antebraço e descansar. Nega queda, formigamento e dor no punho direito.',
  saude:'Refere estar amamentando; não relatou outras doenças.',cirurgias:['Cesariana (data informada: 11/06/2026)'],medicamentos:['Paracetamol'],obsMedicamento:'Refere uso eventual de paracetamol 500 mg; não informou frequência.',psico:['Sono ruim'],trabalho:'Cuidados com o bebê durante licença do trabalho',tempo:'Períodos intercalados ao longo do dia',exposicoes:[],atividade:'Caminhada',frequencia:'2',duracao:'20',
  exame:[['punho_mao','Dor à palpação da estiloide radial esquerda; Abdução do polegar esquerdo limitada por dor; Sem alteração de sensibilidade descrita na mão esquerda.']],guiados:[{regiao:'punho_mao',id:'dequervain',resultados:['positivo','positivo','inconclusivo']}],imagem:'Ultrassonografia do punho esquerdo apresentada com espessamento tendíneo descrito no laudo.',meta:'Acompanhar a função do punho esquerdo nas tarefas de cuidado do bebê.'},
 {tema:'ATM e mastigação sem causalidade presumida',idade:27,ocupacao:'Estudante',regioes:['atm'],eva:3,inicio:'Insidioso, sem trauma claro',
  hma:'Dor na articulação temporomandibular esquerda há três meses. A dor na mandíbula esquerda piora ao mastigar alimentos firmes e ao abrir muito a boca. A dor na mandíbula esquerda melhora ao evitar essas tarefas. Relata apertamento dos dentes durante o estudo. Nega travamento da boca, trauma e dor de dente.',
  saude:'Refere acompanhamento por ansiedade, sem alteração recente do tratamento.',cirurgias:['Extração de terceiro molar (data informada: 2021)'],medicamentos:['Sertralina'],obsMedicamento:'Usa sertralina 50 mg à noite, conforme relato.',psico:['Estresse elevado'],trabalho:'Estudo e leitura no computador',tempo:'5 horas/dia',exposicoes:['Sedestação prolongada'],atividade:'Natação',frequencia:'2',duracao:'40',
  exame:[['atm','Abertura máxima de 34 mm, com dor familiar à esquerda; Lateralidade mandibular de 7 mm à direita e 9 mm à esquerda; Palpação do masseter esquerdo reproduz dor familiar.']],guiados:[{regiao:'atm',id:'dtm_dolorosa_muscular',resultados:['positivo','positivo','positivo','nao_avaliado']}],imagem:'Não dispõe de exames de imagem.',meta:'Acompanhar a dor na mastigação e a abertura mandibular funcional.'},
 {tema:'Coluna torácica e exposição postural',idade:36,ocupacao:'Programador',regioes:['coluna_toracica'],eva:4,inicio:'Insidioso, sem trauma claro',
  hma:'Paciente relata dor entre as escápulas há cinco meses, sem trauma identificado. A dor torácica piora ao permanecer sentado por mais de uma hora. A dor torácica melhora com pausas e caminhada. Nega dor no peito, falta de ar e febre. Não relata irradiação para os braços.',
  saude:'Refere asma acompanhada, sem crise recente.',cirurgias:[],medicamentos:['Budesonida'],obsMedicamento:'Refere uso inalatório de budesonida 200 mcg duas vezes ao dia.',psico:['Sono ruim'],trabalho:'Desenvolvimento de software com pausas variáveis',tempo:'8 horas/dia',exposicoes:['Sedestação prolongada'],atividade:'Caminhada',frequencia:'3',duracao:'30',
  exame:[['coluna_toracica','Rotação torácica à direita limitada pela dor familiar; Palpação paravertebral torácica reproduz dor local; Expansão torácica de 4 cm.']],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar tolerância à posição sentada e mobilidade torácica.'},
 {tema:'Tendão de Aquiles após aumento de corrida',idade:41,ocupacao:'Vigilante',regioes:['tornozelo_pe'],eva:4,inicio:'Esforço repetitivo / sobrecarga',
  hma:'Dor na região do tendão de Aquiles esquerdo há dois meses, após aumento da distância de corrida. A dor no tendão de Aquiles esquerdo piora em subidas e ao correr por mais de vinte minutos. A dor no tendão de Aquiles esquerdo melhora com redução da corrida. Nega estalo, trauma ou perda súbita de impulsão.',
  saude:'Nega outras doenças conhecidas.',cirurgias:[],medicamentos:['Ibuprofeno'],obsMedicamento:'Refere ter tomado ibuprofeno 400 mg por três dias no início do quadro; nega uso atual.',psico:[],trabalho:'Rondas a pé com períodos em pé',tempo:'6 horas/dia',exposicoes:['Ortostatismo prolongado'],atividade:'Corrida',frequencia:'4',duracao:'50',
  exame:[['tornozelo_pe','Palpação dolorosa no tendão de Aquiles esquerdo, 3 cm acima da inserção; Elevação unilateral do calcanhar esquerdo reproduz dor familiar após 8 repetições; Thompson preservado à esquerda.']],imagem:'Ultrassonografia apresentada com espessamento do tendão de Aquiles esquerdo.',meta:'Acompanhar a tolerância à corrida e às elevações do calcanhar.'},
 {tema:'Canela em linguagem coloquial e exame sem região selecionada',idade:24,ocupacao:'Entregador',regioes:[],eva:6,inicio:'Insidioso, sem trauma claro',
  hma:'Paciente relata dor na parte de fora da canela direita há três semanas. Conta que começou devagar e foi aumentando. Essa dor piora ao fazer eversão e depois das entregas. Essa dor melhora ao descansar. Nega dor na sola do pé e no calcanhar direito. Não sofreu entorse.',
  saude:'Nega outras doenças conhecidas.',cirurgias:[],medicamentos:[],obsMedicamento:'Nega uso atual de medicamentos.',psico:[],trabalho:'Subir e descer da bicicleta e caminhar nas entregas',tempo:'4 horas/dia',exposicoes:[],atividade:'Ciclismo',frequencia:'5',duracao:'60',
  exame:[['','Palpação dolorosa na lateral da canela direita; Eversão resistida reproduz dor na lateral da canela direita; Sem edema observado na perna direita.']],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar a tolerância às entregas e esclarecer a origem da dor na perna direita.'},
 {tema:'Pós-operatório de reconstrução do LCA',idade:30,ocupacao:'Técnico de laboratório',regioes:['joelho'],eva:2,inicio:'Pós-cirúrgico / pós-imobilização',
  hma:'Refere dor e rigidez no joelho direito após reconstrução do ligamento cruzado anterior realizada em 15/08/2026. A dor no joelho direito piora ao descer escadas e ao final do dia. A dor no joelho direito melhora com repouso. Nega novo trauma, febre e secreção na cicatriz.',
  saude:'Refere acompanhamento pós-operatório com o cirurgião.',cirurgias:['Reconstrução do ligamento cruzado anterior direito (data informada: 15/08/2026)'],medicamentos:[],obsMedicamento:'Nega uso atual de medicamentos.',psico:['Medo de movimento/relesão'],trabalho:'Atividades de laboratório com períodos sentados e em pé',tempo:'6 horas/dia',exposicoes:[],atividade:'Bicicleta ergométrica',frequencia:'3',duracao:'15',
  exame:[['joelho','Flexão do joelho direito de 112 graus; Extensão do joelho direito com déficit de 5 graus; Perimetria do joelho direito de 39 cm e do esquerdo de 37 cm; Cicatriz fechada, sem secreção observada.']],imagem:'Relatório cirúrgico apresentado com reconstrução do LCA direito em 15/08/2026.',meta:'Acompanhar mobilidade do joelho direito e tolerância às escadas, respeitando as restrições registradas pelo cirurgião.'},
 {tema:'Cicatriz de queimadura na mão',idade:50,ocupacao:'Cozinheira',regioes:['punho_mao'],eva:3,inicio:'Trauma agudo',
  hma:'Paciente refere dor e hipersensibilidade na cicatriz da palma da mão direita após queimadura em 02/08/2026. A dor na mão direita piora ao tocar superfícies ásperas e segurar talheres. A dor na mão direita melhora ao retirar o contato. Nega dormência e dor na mão esquerda.',
  saude:'Refere hipertensão em acompanhamento.',cirurgias:['Enxerto de pele na mão direita (data informada: 12/08/2026)'],medicamentos:['Losartana','Paracetamol'],obsMedicamento:'Usa losartana 50 mg pela manhã. Refere paracetamol 500 mg à noite em dias de dor, sem frequência fixa informada.',psico:['Medo de movimento/relesão'],trabalho:'Preparar alimentos e manusear utensílios',tempo:'6 horas/dia',exposicoes:['Repetição mãos/punhos'],atividade:'Caminhada',frequencia:'2',duracao:'25',
  exame:[['punho_mao','Cicatriz palmar direita fechada, sem secreção; Dor ao toque leve na cicatriz palmar direita; Extensão do punho direito de 45 graus; Preensão de 14 kg à direita e 23 kg à esquerda.']],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar tolerância ao contato e função da mão direita no manuseio de utensílios.'},
 {tema:'Queimação plantar bilateral e dose por medicamento',idade:63,ocupacao:'Aposentado',regioes:['tornozelo_pe'],eva:5,inicio:'Insidioso, sem trauma claro',
  hma:'Refere queimação na sola dos dois pés há um ano. A queimação nos pés piora à noite e melhora parcialmente ao mudar de posição. Relata diagnóstico de diabetes há dez anos e investigação de neuropatia, ainda sem confirmação apresentada. Nega trauma e feridas nos pés.',
  saude:'Refere diabetes em acompanhamento. A mãe teve neuropatia; o paciente ainda está em investigação.',cirurgias:['Colecistectomia (data informada: 2016)'],medicamentos:['Metformina','Gliclazida'],obsMedicamento:'Usa metformina 850 mg duas vezes ao dia e gliclazida 30 mg pela manhã, conforme relato.',psico:['Sono ruim'],trabalho:'Atividades domésticas e compras',tempo:'2 horas/dia',exposicoes:[],atividade:'Caminhada',frequencia:'3',duracao:'20',
  exame:[['tornozelo_pe','Monofilamento percebido em 3 de 10 pontos no pé direito e 7 de 10 no pé esquerdo; Pele dos pés íntegra na inspeção; Dorsiflexão de 12 graus à direita e 10 graus à esquerda.']],imagem:'Não apresentou exames de imagem.',meta:'Acompanhar sintomas e função dos pés, mantendo a investigação médica relatada.'},
 {tema:'Tontura posicional sem diagnóstico presumido',idade:58,ocupacao:'Atendente',regioes:[],eva:null,inicio:'Insidioso, sem trauma claro',
  hma:'Paciente relata tontura ao virar para a direita na cama há dez dias. Os episódios duram cerca de vinte segundos e melhoram ao permanecer parado. Nega dor, queda, perda de consciência, visão dupla e fraqueza nos membros. Não apresentou diagnóstico para a tontura.',
  saude:'Refere hipotireoidismo em acompanhamento.',cirurgias:['Tireoidectomia parcial (data informada: 2017)'],medicamentos:['Levotiroxina'],obsMedicamento:'Usa levotiroxina 75 mcg pela manhã, segundo relato.',psico:['Medo de movimento/relesão'],trabalho:'Atendimento ao público',tempo:'6 horas/dia',exposicoes:[],atividade:'Caminhada',frequencia:'2',duracao:'30',
  exame:[['','Dix-Hallpike à direita reproduz tontura com nistagmo observado por 18 segundos; À esquerda não houve reprodução dos sintomas; Registro descritivo sem diagnóstico etiológico.']],imagem:'Não dispõe de exames de imagem.',meta:'Acompanhar os episódios de tontura e completar a investigação clínica documentada.'}
];
function gerarAuditoriaDezAvaliacoes(casos=casosAuditoriaNarrativa,inicioId=1){
 const medication={};vm.createContext(medication);for(const p of ['database/medicamentos_anvisa-20261024.js','database/medicamentos.js'])vm.runInContext(fs.readFileSync(p,'utf8'),medication);
 const campo=(id,value,label,extra={})=>({id,value:String(value??''),type:'text',tagName:'INPUT',disabled:false,labels:[{textContent:label,querySelector:()=>({textContent:label})}],classList:{contains:()=>false},closest:()=>null,...extra});
 const tag=text=>({dataset:{exibicao:text},textContent:text,cloneNode(){return {textContent:text,querySelectorAll:()=>[]};}});
 return casos.map((input,index)=>{
  const f=fixture(),name='Paciente Sintético '+String(index+inicioId).padStart(2,'0');f.fields[0].value=name;f.fields[1].value=String(input.idade);f.fields[2].value=input.hma;
  for(const k of Object.keys(f.notes))delete f.notes[k];
  Object.assign(f.notes,{contexto_saude_observacao:input.saude,contexto_medicamento_observacao:input.obsMedicamento,contexto_trabalho_tarefa:input.trabalho,contexto_trabalho_tempo:input.tempo||'6 horas/dia',contexto_trabalho_frequencia:'5 dias/semana'});
  f.context.estados={saude:'relata',cirurgias:input.cirurgias.length?'relata':'nao_informado',medicamentos:'relata',trabalho:'relata',atividade:input.atividade?'relata':'nao_informado',exames:'relata',psicossocial:input.psico.length?'relata':'nao_informado'};
  const fields=[campo('paciente_ocupacao',input.ocupacao,'Profissão'),campo('eva_slider',input.eva,'Dor atual (EVA 0–10)',{type:'range',disabled:input.eva===null}),campo('paciente_mecanismo_lesao',input.inicio,'Mecanismo / início'),campo('paciente_esporte',input.atividade,'Atividade física'),campo('esporte_frequencia',input.frequencia||'','Frequência semanal'),campo('esporte_duracao',input.duracao||'','Duração média'),campo('exames_imagem_descricao',input.imagem,'Exames de imagem'),campo('exames_imagem_fonte',input.fonteImagem||'laudo_conferido','Origem do exame')];
  for(const [group,labels] of [['chk_yellow_flag',input.psico],['chk_exposicao_ocupacional',input.exposicoes]])labels.forEach(label=>fields.push(campo('', 'sim',label,{type:'checkbox',checked:true,classList:{contains:c=>c===group}})));
  fields.forEach(x=>{f.fields.push(x);if(x.id)f.nodes[x.id]=x;});f.nodes.avaliacao_realizado_em.value='2026-10-27T09:00';
  f.nodes.tags_cirurgias={children:input.cirurgias.map(tag),textContent:input.cirurgias.join('; ')};f.nodes.tags_medicamentos={children:input.medicamentos.map(tag),textContent:input.medicamentos.join('; ')};
  f.c.window.KineSysMedicamentos=medication.KineSysMedicamentos;f.c.window.KineSysMotorClinico3={ultimoPlano:{hipoteses:[],exame:{testesPrioritarios:[]}}};f.tests=[];
  for(const id of input.regioes)vm.runInContext(fs.readFileSync('database/regioes/'+id+'-base-1.0.0.js','utf8'),f.c);
  f.regions.splice(0,f.regions.length,...input.regioes.map(regiao=>({dataset:{regiao}})));
  const guiados=(input.guiados||[]).map(item=>{
   const regiao=f.c.BANCO_MAPEAMENTO_CLINICO[item.regiao],cluster=regiao.clusters.find(c=>c.id===item.id);assert(cluster,'critério do catálogo existente');
   f.c.window.KineSysMotorClinico3.ultimoPlano.hipoteses.push({...cluster,regiaoId:item.regiao});
   return {regiaoId:item.regiao,regiao:regiao.nome,id:cluster.id,nome:cluster.nome,achados:cluster.testes.map((texto,i)=>({texto,resultado:item.resultados[i]||'nao_avaliado'}))};
  });
  f.tests=guiados;f.c.gerarSinteseMapeamento=()=>({resumoPorRegiao:guiados.map(g=>({regiao:g.regiao,codigoHipotese:g.id,nomeHipotese:g.nome,nivel:'pendente',redFlags:[]})),segurancaGlobal:{pistasGlobais:[]}});
  f.c.clinicaEstruturadaPreservada={objetivosPlano:{objetivos:[{objetivo:input.meta}]}};
  const registros=input.exame.map(([regiaoId,texto],n)=>({id:'qa-'+index+'-'+n,regiaoId,regiao:f.c.BANCO_MAPEAMENTO_CLINICO[regiaoId]?.nome||'',texto,resultado:'descritivo',situacao:{tipo:'descritivo'}}));
  f.c.window.KineSysExameLivre={documentar:()=>registros};const original=JSON.stringify({hma:input.hma,registros,notes:f.notes}),relatorio=f.render();
  assert.equal(JSON.stringify({hma:f.fields[2].value,registros,notes:f.notes}),original,'auditoria não modifica as origens');
  assert(relatorio.texto.startsWith('RELATÓRIO FISIOTERAPÊUTICO\n\nPaciente: '+name));assert(relatorio.texto.includes('Data da avaliação: 27/10/2026'));
  return {id:index+inicioId,tema:input.tema,nome:name,entrada:input,relatorio,validarTexto:texto=>f.c.window.validarTextoSemanticoAvaliacaoKineSys(texto)};
 });
}
const gerarSegundaRodadaDezAvaliacoes=()=>gerarAuditoriaDezAvaliacoes(casosAuditoriaSegundaRodada,11);
module.exports={gerarAuditoriaDezAvaliacoes,gerarSegundaRodadaDezAvaliacoes};

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
assert(historiaMultiplas.at(-1).includes('6/10 na EVA'));assert(historiaMultiplas.at(-1).includes('Nesta avaliação, a intensidade atual foi registrada em 6/10 na EVA'),'mensuração é explicitamente da avaliação, sem presumir um vínculo regional');assert(!historiaMultiplas.some(p=>/^Nesta avaliação, a intensidade/.test(p)),'EVA não fica isolada num parágrafo de uma linha');
assert(rodadaDez[3].relatorio.texto.includes('0/10 na EVA'));assert(rodadaDez[3].relatorio.texto.includes('ausência de dor em repouso'));
assert(rodadaDez[4].relatorio.texto.includes('ter usado ibuprofeno 400 mg por dois dias'));assert(!rodadaDez[4].relatorio.texto.includes('Medicamentos em uso: Ibuprofeno'));
assert(rodadaDez[6].relatorio.texto.includes('Motivo da avaliação (conforme relato): Formigamento nas mãos direita e esquerda'));
const tres=rodadaDez[8].relatorio.texto;assert(tres.includes('A mãe tem artrite reumatoide'));assert(tres.includes('nega diagnóstico próprio de artrite reumatoide'));assert(tres.includes('ombro esquerdo'));assert(tres.includes('joelho direito'));assert(tres.includes('calcanhar esquerdo'));
const operacao=rodadaDez[9].relatorio;assert(operacao.texto.includes('indicada')||operacao.texto.includes('indicação cirúrgica'));assert(operacao.texto.includes('ainda não realizada'));assert(operacao.texto.includes('Apendicectomia realizada em 1995'));assert(operacao.semantica.fatos.find(f=>f.assuntoDocumental==='cirurgias').trechosDocumentais.every(t=>!t.realizado));
assert(rodadaDez.filter(x=>x.relatorio.modo==='revisao').every(x=>x.relatorio.semantica.validacao.esclarecimentos.length||x.relatorio.semantica.validacao.significado.limites.length),'dúvidas conservam revisão externa ao documento');
console.log('PASS: dez avaliações completas com EVA, início, doses/cronologia, negações, múltiplas queixas, cirurgia indicada/realizada, prosa regional e origens preservadas.');

// Conferência de preservação e guardas: não é aprovação editorial/clínica.
const segundaRodadaDez=gerarSegundaRodadaDezAvaliacoes();
assert.equal(segundaRodadaDez.length,10);assert.equal(new Set([...rodadaDez,...segundaRodadaDez].map(x=>x.entrada.hma)).size,20,'não reutilizar relatos da primeira rodada');
for(const {id,entrada,relatorio:r} of segundaRodadaDez){
 assert(r.texto.includes('Paciente: Paciente Sintético '+id));assert(r.texto.includes('Data da avaliação: 27/10/2026'));
 for(const k of ['testesAusentes','relatoAusente','contextoAusente','listasAusentes'])assert.equal(r.validacao[k].length,0,JSON.stringify({id,campo:k,valor:r.validacao[k]}));
 assert.equal(r.semantica.validacao.ausentes.length,0);assert.equal(r.semantica.validacao.numerosSemOrigem.length,0);
 if(entrada.eva===null)assert(!/\d+\/10 na EVA/.test(r.texto),'não transformar EVA não avaliada em zero');else assert(r.texto.includes(entrada.eva+'/10 na EVA'));
 if(!entrada.guiados?.length)assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true),'texto livre sem vínculo não confirma critérios');
 else for(const c of r.semantica.correlacoes){const origem=entrada.guiados.find(g=>g.id===c.hipoteseId);assert(origem);assert(c.resultados.every(x=>x.eixoId===origem.id));assert.equal(c.resultados.length,origem.resultados.filter(r=>r!=='nao_avaliado').length);}
 if(!r.validacao.ok||!r.semantica.validacao.ok)assert.equal(r.modo,'revisao','pendências não são ocultadas para liberar o relatório');
}
assert(segundaRodadaDez[6].relatorio.texto.includes('15/08/2026'));assert(segundaRodadaDez[7].relatorio.texto.includes('12/08/2026'));
const doses=segundaRodadaDez[8].relatorio.texto;assert(doses.includes('metformina 850 mg duas vezes ao dia e gliclazida 30 mg pela manhã'));assert(doses.includes('investigação de neuropatia, ainda sem confirmação'));assert(doses.includes('A mãe teve neuropatia'));
console.log('Segunda rodada de dez casos executada: preservação das origens/medidas e guardas verificadas; '+segundaRodadaDez.filter(x=>x.relatorio.modo==='revisao').length+' relatório(s) continuam sujeitos a revisão. Isso não certifica a redação ou acurácia clínica.');

// Falhas reais da segunda rodada: a aprovação exige organização e significado.
{
 const porId=id=>segundaRodadaDez.find(x=>x.id===id).relatorio;
 const historia=id=>porId(id).texto.split('História clínica\n\n')[1].split('\n\nAntecedentes e contexto')[0];
 assert(!porId(14).semantica.problemas.some(p=>p.regiaoId==='ombro'),'dor entre escápulas não é uma nova queixa do ombro');
 assert(!porId(14).texto.includes('queixas relatadas em ombro'));
 assert(porId(15).semantica.proposicoes.some(p=>p.estruturaId==='tendao_aquiles'&&p.lado==='esquerdo'));
 assert(!porId(15).semantica.validacao.esclarecimentos.some(q=>q.tipo==='localizacao'));
 assert(porId(17).texto.includes('Motivo da avaliação (conforme relato): Dor e rigidez no joelho direito'));
 assert(!historia(17).includes('Relata dor.'));assert(porId(17).semantica.proposicoes.filter(p=>p.tipo==='sintoma'&&['dor','rigidez'].includes(p.conceito)&&p.fatoId==='hma:0').every(p=>p.regiaoId==='joelho'&&p.lado==='direito'));
 assert(historia(18).includes('hipersensibilidade na cicatriz da palma da mão direita'));assert(porId(18).texto.includes('Motivo da avaliação (conforme relato): Dor e hipersensibilidade'));
 assert(porId(19).texto.includes('Motivo da avaliação (conforme relato): Queimação na sola dos dois pés'));assert(porId(19).semantica.proposicoes.some(p=>p.conceito==='queimacao'&&p.lado==='bilateral'));
 assert(porId(20).texto.includes('Motivo da avaliação (conforme relato): Tontura ao virar para a direita'));
 assert(porId(20).texto.includes('No exame vestibular,'));assert(!porId(20).texto.includes('exame de exame'));
 assert(!/VPPB|vertigem posicional paroxística benigna|labirintite/i.test(porId(20).texto),'Dix-Hallpike não autoriza diagnóstico presumido');
 assert(!porId(12).semantica.validacao.significado.introduzidas.length,'rótulo do exame não é sintoma novo');
 const validar=segundaRodadaDez.find(x=>x.id===12).validarTexto,originalTeste='O teste de Finkelstein reproduziu dor típica.';
 assert(porId(12).texto.includes(originalTeste));
 assert(!validar(porId(12).texto.replace(originalTeste,'O teste de Finkelstein não reproduziu dor típica.')).ok,'a guarda não ignora inversão de resultado no exame');
 assert(!validar(porId(12).texto+'\n\nDor na mão direita.').ok,'uma nova afirmação não é autorizada pelo contexto do exame');
 assert(!validar(porId(12).texto.replace('paracetamol 500 mg','paracetamol 900 mg')).ok,'alteração da dose não desaparece atrás do contexto estruturado');

 assert(!porId(11).texto.includes('grip strength'));assert(!porId(12).texto.includes('WHAT test'));assert(!porId(13).texto.includes('Na avaliação de abertura máxima ou movimentos mandibulares reproduzem'));
 assert(!/Essa dor melhora/.test(historia(16)),'retomada única segura não fica sem vínculo por contar uma referência já resolvida como outra queixa');
 console.log('PASS: correções de anatomia, sintomas coordenados, queixa atual, cabeçalho, testes e auditoria da segunda rodada.');
}

// Fragments, bilateral anatomy, optional individual dose and editorial spelling.
// Entirely synthetic; no patient identity or production record.
{
 const f=fixture();f.fields[0].value='Pessoa Sintética Fragmentos';f.fields[1].value='62';
 f.fields[2].value='Relata dor no nervo ciático. A 5 meses. A dor começou com um choque na região da canela. Do tornozelo esquerdo. E Atualmente apresenta dor na região dos dois gluteos. Relata dor quando caminha. Relata antecedente de chikungunya há 3 anos (sintomatica).';
 const original=f.fields[2].value;for(const k of Object.keys(f.notes))f.notes[k]='';
 f.fields.push({id:'eva_slider',value:'6',type:'range',tagName:'INPUT',disabled:false,labels:[{textContent:'EVA',querySelector:()=>null}],classList:{contains:()=>false},closest:()=>null});
 f.fields.push({id:'exames_imagem_descricao',value:'Espondilodiscroatrose lombar, caraterziada por desidratação discal em L3-L4 e L5-S1; espondilolise bilateral em L4, anterolistese grau I e protusões foraminais bilaterais sem evidencia de conflito radicular.',type:'textarea',tagName:'TEXTAREA',disabled:false,labels:[{textContent:'Imagem',querySelector:()=>null}],classList:{contains:()=>false},closest:()=>null});
 f.nodes.tags_cirurgias={children:[],textContent:''};
 const medicamento=(texto,nome,dosagem)=>({dataset:{exibicao:texto,nomeMedicamento:nome,dosagem},querySelector:()=>null});
 f.nodes.tags_medicamentos={children:[medicamento('Pregabalina','Pregabalina','50MG'),medicamento('Dorflex (citrato de orfenadrina, dipirona monoidratada, cafeína anidra)','Dorflex','')],textContent:''};
 f.notes.contexto_medicamento_observacao='25MG';f.context.estados={cirurgias:'nega',medicamentos:'relata'};
 f.regions.splice(0,f.regions.length,{dataset:{regiao:'quadril'}});f.c.BANCO_MAPEAMENTO_CLINICO.quadril={nome:'Quadril / Virilha / Pelve'};f.tests=[];
 const exame='Fraqueza muscular em MMII. Dor na tuberosidade isquiatica, bilateralmente.';
 f.c.window.KineSysExameLivre={documentar:()=>[{id:'sintetico-fragmentos',texto:exame,situacao:{tipo:'rascunho'},resultado:'descritivo'}]};
 const r=f.render(),t=r.texto,h=t.split('História clínica\n\n')[1].split('\n\nAntecedentes e contexto')[0];
 assert.equal(f.fields[2].value,original);assert(r.semantica.fatos.some(x=>x.textoOriginal===exame));
 assert(t.includes('Foi informada duração de 5 meses.'));assert(t.includes('Também foi mencionado o tornozelo esquerdo.'));
 assert(t.includes('região glútea bilateral'));assert(!t.includes('E Atualmente'));assert(!/\n\nNesta avaliação, a intensidade/.test(h));assert(h.includes('6/10 na EVA'));
 assert(t.includes('Pregabalina 50 mg e Dorflex.'));assert(!/citrato de orfenadrina|dipirona monoidratada|cafeína anidra/.test(t));assert(!t.includes('Informa uso de: 25MG'));assert(t.includes('anotação medicamentosa adicional informa 25 mg'));
 assert(!/dose não informada|dosagem não informada|sem dosagem|sem frequência/i.test(t));
 for(const term of ['espondilodiscoartrose','caracterizada','espondilólise','protrusões','sem evidência de conflito radicular','L3-L4','L5-S1','grau I'])assert(t.includes(term),term);
 assert(t.includes('membros inferiores'));assert(t.includes('isquiática'));assert(!t.includes('A avaliação também contempla'));assert(!t.includes('pendente de revisão profissional'));
 assert(r.validacao.exameLivrePendente.length,'a revisão do profissional continua pendente no painel');
 assert.equal(r.semantica.validacao.ausentes.length,0);assert.equal(r.semantica.validacao.significado.introduzidas.length,0);
 assert(!f.c.window.validarTextoSemanticoAvaliacaoKineSys(t.replace('Pregabalina 50 mg','Pregabalina 100 mg')).ok);
 assert(!f.c.window.validarTextoSemanticoAvaliacaoKineSys(t.replace('glútea bilateral','glútea direita')).ok);
 if(process.env.KINESYS_FRAGMENT_REPORT==='1')console.log(t);
 console.log('PASS: fragmentos, glútea bilateral, EVA integrada, dose individual opcional, ortografia e avisos fora do documento.');
}
