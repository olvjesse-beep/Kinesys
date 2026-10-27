/* KineSys — Input Helpers Core 1.0.0
 * EVA e autocompletes extraídos do core sem alterar contratos históricos.
 */
'use strict';

/* ================= 5. TERMÔMETRO DA DOR (ESCALA EVA) ================= */
function aplicarClasseEvaKineSys(el, val) {
    if (!el) return;
    for (let i = 0; i <= 5; i++) el.classList.remove('kds-eva-level-' + i);
    const faixa = val === 0 ? 0 : val <= 3 ? 1 : val <= 5 ? 2 : val <= 7 ? 3 : val <= 9 ? 4 : 5;
    el.classList.add('kds-eva-level-' + faixa);
}
function notificarSugestaoAvaliacaoKineSys(input){
    if(input)input.dispatchEvent(new Event('change',{bubbles:true}));
    if(typeof agendarAutosaveKineSys==='function')agendarAutosaveKineSys();
}

let sliderEVA = null;
let valorEVA = null;

function obterEvaAvaliacaoKineSys(){
    const slider=document.getElementById('eva_slider'),estado=document.getElementById('context_state_dor_relata');
    if(!slider||slider.disabled||(estado&&!estado.checked)||slider.value==='')return null;
    const valor=Number(slider.value);
    return Number.isInteger(valor)&&valor>=0&&valor<=10?valor:null;
}
function atualizarEvaAvaliacaoKineSys(){
    const slider=document.getElementById('eva_slider'),estado=document.getElementById('context_state_dor_relata'),saida=document.getElementById('eva_valor');
    if(!slider)return;
    if(estado)slider.disabled=!estado.checked;
    const valor=obterEvaAvaliacaoKineSys();
    if(saida)saida.textContent=valor===null?'Não avaliada':valor+'/10';
    slider.setAttribute('aria-valuetext',valor===null?'Dor não avaliada':valor+' de 10');
    const previa=document.getElementById('avaliacao_eva_previa'),data=document.getElementById('avaliacao_realizado_em')?.value||'';
    const grafico=window.KineSysAnaliseEvolucao?.grafico;
    if(previa){
        const chave=JSON.stringify([valor,data,!!grafico]);
        if(previa.dataset.evaPrevia!==chave){
            previa.dataset.evaPrevia=chave;
            if(valor!==null&&data&&grafico)previa.innerHTML=grafico([{data,eva:valor,tipo:'Avaliação',estado:'Prévia da avaliação, ainda não salva'}],{compacto:true});
            else previa.textContent=valor===null?'Marque Avaliada para registrar a intensidade da dor.':valor+'/10 · Informe a data da avaliação para visualizar o ponto inicial.';
        }
    }
    const botao=document.getElementById('avaliacao_eva_analise');
    if(botao)botao.disabled=!window.obterContextoAvaliacaoKineSys?.()?.pacienteId;
}
function preencherEvaAvaliacaoKineSys(valor){
    const valido=valor!==null&&valor!==undefined&&valor!==''&&Number.isInteger(Number(valor))&&Number(valor)>=0&&Number(valor)<=10;
    const sim=document.getElementById('context_state_dor_relata'),nao=document.getElementById('context_state_dor_nao_informado'),slider=document.getElementById('eva_slider');
    const status=document.getElementById('avaliacao_eva_status');if(status)status.textContent='';
    if(sim)sim.checked=valido;if(nao)nao.checked=!valido;
    if(slider){slider.value=valido?Number(valor):0;slider.disabled=!valido;}
    atualizarEvaAvaliacaoKineSys();
    window.KineSysContextoAnamnese?.atualizar();
}
function inicializarEvaAvaliacao(){
    sliderEVA=document.getElementById('eva_slider');valorEVA=document.getElementById('eva_valor');
    if(!sliderEVA||sliderEVA.dataset.ksEva==='true')return;
    sliderEVA.dataset.ksEva='true';
    sliderEVA.addEventListener('input',atualizarEvaAvaliacaoKineSys);
    document.getElementById('avaliacao_realizado_em')?.addEventListener('change',atualizarEvaAvaliacaoKineSys);
    atualizarEvaAvaliacaoKineSys();
}

const sliderEvo = document.getElementById("eva_slider_evo");

function atualizarEvaEvolucaoKineSys(){
    const slider=document.getElementById('eva_slider_evo'),valor=document.getElementById('eva_valor_evo');
    if(!slider)return;
    const avaliada=!!document.getElementById('evo_eva_avaliada')?.checked;
    slider.disabled=!avaliada;
    if(valor){
        valor.textContent=avaliada?'Nível '+Number(slider.value):'Não avaliada';
        aplicarClasseEvaKineSys(valor,avaliada?Number(slider.value):0);
    }
}

if (sliderEvo) {
    sliderEvo.addEventListener("input", function() {
        atualizarEvaEvolucaoKineSys();
    });
}

/* ================= 6. AUTOCOMPLETES (RESTAURADOS E ORIGINAIS) ================= */

function toggleCirurgias(labelElement) {
    const checkbox = labelElement.querySelector('input');
    const bloco = document.getElementById('bloco_cirurgias');
    const inputCirurgia = document.getElementById('input_cirurgia');
    const tagsCirurgias = document.getElementById('tags_cirurgias');
    const sugestaoBox = document.getElementById('sugestao_box');

    if (checkbox && checkbox.checked) {
        if (bloco) bloco.style.display = 'block';
        if (inputCirurgia) inputCirurgia.focus();
    } else {
        if (tagsCirurgias?.children.length && !window.confirm('Remover os procedimentos registrados? Cancelar mantém as informações.')) { checkbox.checked=true; return; }
        if (bloco) bloco.style.display = 'none';
        if (tagsCirurgias) tagsCirurgias.innerHTML = '';
        if (inputCirurgia) inputCirurgia.value = '';
        if (sugestaoBox) sugestaoBox.style.display = 'none';
        if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
    }
}

// ============================================================================
// MOTOR 1.3 — SUGESTÕES CANÔNICAS INDIVIDUAIS
// Evita opções agrupadas como "Ciclismo / MTB / Gravel". O item selecionado
// permanece vinculado à chave-base do dicionário para compatibilidade com o
// Radar, mas a descrição exata escolhida fica preservada no campo/tag.
// ============================================================================
const OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE = {
    "Trabalho Administrativo / Escritório Geral": ["Assistente Administrativo", "Analista Administrativo", "Trabalho de Escritório"],
    "Programador / Desenvolvedor de Software / TI": ["Programador", "Desenvolvedor de Software", "Profissional de TI"],
    "Designer Gráfico / Ilustrador / Editor de Vídeo": ["Designer Gráfico", "Ilustrador", "Editor de Vídeo"],
    "Advogado / Jurídico / Promotor": ["Advogado", "Profissional Jurídico", "Promotor"],
    "Contador / Auditor / Analista Financeiro": ["Contador", "Auditor", "Analista Financeiro"],
    "Fisioterapeuta / Osteopata / Terapeuta Manual": ["Fisioterapeuta", "Osteopata", "Terapeuta Manual"],
    "Cirurgião-Dentista / Ortodontista / Endodontista": ["Cirurgião-Dentista", "Ortodontista", "Endodontista"],
    "Médico Cirurgião / Instrumentador Cirúrgico": ["Médico Cirurgião", "Instrumentador Cirúrgico"],
    "Enfermeiro / Técnico de Enfermagem / Cuidador": ["Enfermeiro", "Técnico de Enfermagem", "Cuidador"],
    "Pedreiro / Servente / Construção Civil": ["Pedreiro", "Servente de Obra", "Trabalhador da Construção Civil"],
    "Pintor / Marceneiro / Carpinteiro": ["Pintor", "Marceneiro", "Carpinteiro"],
    "Mecânico / Montador Industrial / Funileiro": ["Mecânico", "Montador Industrial", "Funileiro"],
    "Carregador / Estoquista / Carga e Descarga / Ajudante": ["Carregador", "Estoquista", "Trabalhador de Carga e Descarga", "Ajudante de Depósito"],
    "Motorista Profissional / Caminhoneiro / Uber / Taxista": ["Motorista Profissional", "Caminhoneiro", "Motorista de Aplicativo", "Taxista"],
    "Motoboy / Entregador de Motocicleta / Piloto": ["Motoboy", "Entregador de Motocicleta", "Piloto de Motocicleta"],
    "Cabeleireiro / Barbeiro / Esteticista Capilar": ["Cabeleireiro", "Barbeiro", "Esteticista Capilar"],
    "Massoterapeuta / Esteticista Corporal / Podólogo": ["Massoterapeuta", "Esteticista Corporal", "Podólogo"],
    "Professor / Educador / Atendente de Sala": ["Professor", "Educador", "Atendente de Sala"],
    "Vendedor / Caixa / Atendente de Balcão / Garçom": ["Vendedor", "Operador de Caixa", "Atendente de Balcão", "Garçom"],

    "Caminhada Recreativa / Aeróbico de Baixo Impacto": ["Caminhada Recreativa", "Aeróbico de Baixo Impacto"],
    "Pilates Solo / Aparelhos": ["Pilates Solo", "Pilates em Aparelhos"],
    "Yoga / Hatha / Vinyasa": ["Yoga", "Hatha Yoga", "Vinyasa Yoga"],
    "Corrida de Rua / Maratona / Trail Run": ["Corrida de Rua", "Maratona", "Trail Running"],
    "Ciclismo de Estrada / Mountain Bike (MTB) / Gravel": ["Ciclismo de Estrada (Speed)", "Mountain Bike (MTB)", "Ciclismo Gravel"],
    "Beach Tennis / Tênis de Arena / Padel": ["Beach Tennis", "Tênis", "Padel"],
    "Natação (Crawl / Costas / Peito / Borboleta)": ["Natação Crawl", "Natação Costas", "Natação Peito", "Natação Borboleta"],
    "CrossFit / Treinamento Funcional de Alta Intensidade": ["CrossFit", "Treinamento Funcional de Alta Intensidade"],
    "Musculação Pesada / Powerlifting / LPO": ["Musculação", "Powerlifting", "Levantamento de Peso Olímpico (LPO)"],
    "Futebol de Campo / Society": ["Futebol de Campo", "Futebol Society"],
    "Futsal / Futebol de Salão": ["Futsal", "Futebol de Salão"],
    "Basquetebol / Basquete 3x3": ["Basquetebol", "Basquete 3x3"],
    "Voleibol / Vôlei de Praia": ["Voleibol de Quadra", "Vôlei de Praia"],
    "Jiu-Jitsu / Lutas de Solo / Grappling": ["Jiu-Jitsu", "Luta de Solo", "Grappling"],
    "Muay Thai / Kickboxing / Boxe": ["Muay Thai", "Kickboxing", "Boxe"],
    "Judô / Lutas de Projeção": ["Judô", "Luta de Projeção"],
    "Surfe / Bodyboard": ["Surfe", "Bodyboard"],
    "Skate (Street / Park / Bowl)": ["Skate Street", "Skate Park", "Skate Bowl"],
    "Futebol / Futsal": ["Futebol", "Futsal"]
};

const OPCOES_INDIVIDUAIS_CIRURGIAS = {
    "Artrodese de Coluna (Parafusos / Hastes / Cages)": ["Artrodese de Coluna com Parafusos", "Artrodese de Coluna com Hastes", "Artrodese de Coluna com Cage"],
    "Herniectomia / Discectomia Lombar ou Cervical": ["Discectomia Lombar", "Discectomia Cervical", "Herniectomia Lombar", "Herniectomia Cervical"],
    "Vertebroplastia / Cifoplastia (Cimento Ósseo)": ["Vertebroplastia", "Cifoplastia"],
    "Artroplastia Total/Parcial de Quadril (ATQ)": ["Artroplastia Total de Quadril", "Artroplastia Parcial de Quadril"],
    "Osteossintese de Fêmur Proximal / Pelve": ["Osteossíntese de Fêmur Proximal", "Osteossíntese de Pelve"],
    "Artroscopia de Quadril (Impacto Femoroacetabular / Labrum)": ["Artroscopia de Quadril para FAI", "Artroscopia de Quadril com Reparo Labral"],
    "Osteotomia Periacetabular / Femoral": ["Osteotomia Periacetabular", "Osteotomia Femoral"],
    "Reparo / Sutura de Tendão Glúteo Médio/Mínimo": ["Reparo do Tendão Glúteo Médio", "Reparo do Tendão Glúteo Mínimo"],
    "Osteossíntese de Acetábulo / Pelve": ["Osteossíntese de Acetábulo", "Osteossíntese de Pelve"],
    "Reconstrução de Ligamento Colateral (LCM / LCL)": ["Reconstrução do Ligamento Colateral Medial (LCM)", "Reconstrução do Ligamento Colateral Lateral (LCL)"],
    "Meniscectomia / Sutura Meniscal": ["Meniscectomia", "Sutura Meniscal"],
    "Artroplastia Total/Parcial de Joelho (ATJ)": ["Artroplastia Total de Joelho", "Artroplastia Parcial de Joelho"],
    "Realinhamento Patelar / Reconstrução de MPFL": ["Realinhamento Patelar", "Reconstrução do Ligamento Patelofemoral Medial (MPFL)"],
    "Osteotomia Valgrizante / Varizante de Tíbia ou Fêmur": ["Osteotomia Valgizante de Tíbia", "Osteotomia Varizante de Tíbia", "Osteotomia Valgizante de Fêmur", "Osteotomia Varizante de Fêmur"],
    "Sutura / Reconstrução de Tendão Patelar ou Quadricipital": ["Sutura do Tendão Patelar", "Reconstrução do Tendão Patelar", "Sutura do Tendão Quadricipital", "Reconstrução do Tendão Quadricipital"],
    "Mosaicoplastia / Transplante Osteocondral de Joelho": ["Mosaicoplastia de Joelho", "Transplante Osteocondral de Joelho"],
    "Reparo / Sutura de Manguito Rotador (Artroscopia)": ["Reparo Artroscópico do Manguito Rotador", "Sutura Artroscópica do Manguito Rotador"],
    "Artroplastia Total / Inversa de Ombro": ["Artroplastia Total Anatômica de Ombro", "Artroplastia Reversa de Ombro"],
    "Reparo de Lesão de Bankart / SLAP (Instabilidade)": ["Reparo de Bankart", "Reparo de SLAP"],
    "Procedimento de Latarjet / Enxerto Ósseo Glenoidal": ["Procedimento de Latarjet", "Enxerto Ósseo Glenoidal"],
    "Acromioplastia / Descompressão Subacromial": ["Acromioplastia", "Descompressão Subacromial"],
    "Osteossíntese de Clavícula (Placa / Parafuso)": ["Osteossíntese de Clavícula com Placa", "Osteossíntese de Clavícula com Parafuso"],
    "Osteossíntese de Cotovelo / Olecrano / Cabeça do Rádio": ["Osteossíntese de Cotovelo", "Osteossíntese de Olécrano", "Osteossíntese de Cabeça do Rádio"],
    "Sutura / Reconstrução de Tendão Bíceps Distal": ["Sutura do Bíceps Distal", "Reconstrução do Bíceps Distal"],
    "Desbridamento / Liberação de Epicôndilo Lateral/Medial": ["Desbridamento do Epicôndilo Lateral", "Desbridamento do Epicôndilo Medial", "Liberação do Epicôndilo Lateral", "Liberação do Epicôndilo Medial"],
    "Osteossíntese de Rádio Distal / Ulna": ["Osteossíntese de Rádio Distal", "Osteossíntese de Ulna"],
    "Sutura / Reconstrução de Tendão de Aquiles (Calcâneo)": ["Sutura do Tendão de Aquiles", "Reconstrução do Tendão de Aquiles"],
    "Osteossíntese de Maleólo / Tornozelo (Placa / Parafusos)": ["Osteossíntese de Maléolo com Placa", "Osteossíntese de Maléolo com Parafusos", "Osteossíntese de Tornozelo"],
    "Artrodese Subtalar / Tiobiotalar": ["Artrodese Subtalar", "Artrodese Tibiotalar"],
    "Procedimento de Broström / Ligamentoplastia de Tornozelo": ["Procedimento de Broström", "Ligamentoplastia de Tornozelo"],
    "Fasciotomia Plantar / Liberação de Esporão": ["Fasciotomia Plantar", "Ressecção de Esporão Calcâneo"],
    "Abdominoplastia / Plicatura de Reto Abdominal": ["Abdominoplastia", "Plicatura do Reto Abdominal"],
    "Hernioplastia Umbilical / Inguinal / Incisional": ["Hernioplastia Umbilical", "Hernioplastia Inguinal", "Hernioplastia Incisional"],
    "Cirurgia Bariátrica (Bypass / Sleeve / Gastrectomia)": ["Bypass Gástrico", "Gastrectomia Sleeve", "Gastrectomia Bariátrica"],
    "Histerectomia Total / Parcial (Retirada do Útero)": ["Histerectomia Total", "Histerectomia Parcial"],
    "Cauterização / Exerese de Focos de Endometriose": ["Cauterização de Focos de Endometriose", "Exérese de Focos de Endometriose"],
    "Esternotomia / Revascularização do Miocárdio": ["Esternotomia", "Revascularização do Miocárdio"],
    "Procedimento por pneumotórax": ["Procedimento por pneumotórax — técnica não informada", "Drenagem torácica / toracostomia por pneumotórax", "Pleurodese por pneumotórax", "Cirurgia torácica por pneumotórax"],
    "Esternotomia / Troca Valvar Cardíaca": ["Esternotomia", "Troca Valvar Cardíaca"],
    "Esternotomia / Cirurgia Cardíaca Aberta": ["Esternotomia", "Cirurgia Cardíaca Aberta"],
    "Safenectomia / Escleroterapia Vascular de MMI": ["Safenectomia", "Escleroterapia Vascular de Membro Inferior"],
    "Explante de Prótese de Silicone Mamária / Capsulotomia": ["Explante de Prótese Mamária", "Capsulotomia Mamária"],
    "Mamoplastia Redutora / Mastopexia": ["Mamoplastia Redutora", "Mastopexia"],
    "Mastectomia Total / Parcial (Reconstrução Mamária)": ["Mastectomia Total", "Mastectomia Parcial", "Reconstrução Mamária"],
    "Lipoaspiração / Lipoescultura (Torse / Membros)": ["Lipoaspiração de Tronco", "Lipoaspiração de Membros", "Lipoescultura de Tronco", "Lipoescultura de Membros"],
    "Artroplastia / Cirurgia de ATM (Mandíbula)": ["Artroplastia de ATM", "Cirurgia de ATM"],
    "Osteotomia Ortognática (Maxilar / Mandíbula)": ["Osteotomia Ortognática Maxilar", "Osteotomia Ortognática Mandibular"],
    "Tireoidectomia Total / Parcial (Pescoço)": ["Tireoidectomia Total", "Tireoidectomia Parcial"],
    "Fixação Occipitocervical / Coluna Cervical Alta": ["Fixação Occipitocervical", "Fixação de Coluna Cervical Alta"],
    "Amputação Transtibial / Transfemoral (MMII)": ["Amputação Transtibial", "Amputação Transfemoral"],
    "Amputação Transradial / Transhumeral (MMSS)": ["Amputação Transradial", "Amputação Transhumeral"],
    "Osteossíntese com Fixador Externo (Gaiola / Ilizarov)": ["Osteossíntese com Fixador Externo", "Osteossíntese com Fixador Ilizarov"],
    "Enxerto Ósseo Autólogo / Homólogo": ["Enxerto Ósseo Autólogo", "Enxerto Ósseo Homólogo"]
};

function expandirSugestoesIndividuais(item, mapa) {
    const exibicao = obterTextoExibicao(item);
    return (mapa && mapa[exibicao]) ? mapa[exibicao] : [exibicao];
}

// Catálogos são consultados no momento da digitação, não capturados antes do lazy-load.
const autocompletesAvaliacaoKineSys=new WeakMap();
function normalizarBuscaClinicaKineSys(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function buscarSugestoesClinicasKineSys(tipo,termo){
 const q=normalizarBuscaClinicaKineSys(termo);if(q.length<2)return [];
 if(tipo==='medicamento'&&globalThis.KineSysMedicamentos)return globalThis.KineSysMedicamentos.buscar(termo);
 const base=tipo==='medicamento'?(typeof dicionarioMedicamentos==='undefined'?null:dicionarioMedicamentos):tipo==='cirurgia'?(typeof dicionarioCirurgias==='undefined'?null:dicionarioCirurgias):(typeof dicionarioOcupacoesEsportes==='undefined'?null:dicionarioOcupacoesEsportes);
 if(!base)return null;
 const results=new Map(),map=tipo==='cirurgia'?OPCOES_INDIVIDUAIS_CIRURGIAS:OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE;
 for(const [chave,item] of Object.entries(base)){
  if((tipo==='esporte'||tipo==='profissao')&&item?.tipo!==tipo)continue;
  const display=typeof item==='string'?item:obterTextoExibicao(item),options=tipo==='medicamento'?[display]:expandirSugestoesIndividuais(item,map),key=normalizarBuscaClinicaKineSys(chave);
  const direct=options.some(t=>normalizarBuscaClinicaKineSys(t).includes(q));
  for(const texto of options){
   const text=normalizarBuscaClinicaKineSys(texto);
   if(direct&&!text.includes(q)&&!key.includes(q))continue;
   if(!q.split(/\s+/).every(part=>(key+' '+text+' '+normalizarBuscaClinicaKineSys(display)).includes(part)))continue;
   const rank=text===q?0:text.startsWith(q)?1:text.split(/[^a-z0-9]+/).some(w=>w.startsWith(q))?2:key===q||key.startsWith(q)?3:4;
   if(!results.has(text)||rank<results.get(text).rank)results.set(text,{chave,texto,rank});
  }
 }
 return Array.from(results.values()).sort((a,b)=>a.rank-b.rank||a.texto.localeCompare(b.texto,'pt-BR')).slice(0,20);
}
function conectarAutocompleteAvaliacaoKineSys(input,box,tipo){
 if(!input||!box)return;
 let state=autocompletesAvaliacaoKineSys.get(input);
 if(state){state.box=box;if(document.activeElement===input)state.render();return;}
 state={input,box,tipo,items:[],selected:-1};autocompletesAvaliacaoKineSys.set(input,state);input.dataset.ksAutocomplete='true';
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',box.id);input.setAttribute('aria-expanded','false');
 const hide=()=>{state.box.style.display='none';input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');state.selected=-1;};
 state.hide=hide;
 function choose(item){
  if(tipo==='cirurgia')adicionarTagCirurgia(item.chave,item.texto);
  else if(tipo==='medicamento')adicionarTagMedicamento(item.texto,{chave:item.chave,nome:item.nome||'',principioAtivo:item.principioAtivo||''});
  else{input.value=item.texto;notificarSugestaoAvaliacaoKineSys(input);if(typeof processarRadarEmTempoReal==='function')processarRadarEmTempoReal();}
  hide();
 }
 function render(){
  const query=input.value||'';if(normalizarBuscaClinicaKineSys(query).length<2){hide();return;}
  state.items=buscarSugestoesClinicasKineSys(tipo,query)||[];state.selected=-1;state.box.innerHTML='';state.box.setAttribute('role','listbox');
  state.items.forEach((item,i)=>{const option=document.createElement('div');option.id=state.box.id+'-op-'+i;option.setAttribute('role','option');option.setAttribute('aria-selected','false');
   if(tipo==='medicamento'&&item.nome){
    const name=document.createElement('strong'),detail=document.createElement('small');name.textContent=item.nome;detail.textContent=item.detalhe;option.appendChild(name);option.appendChild(detail);option.className='ks-medication-option';
   }else option.textContent=item.texto;
   option.onmousedown=e=>e.preventDefault();option.onclick=e=>{e.stopPropagation();choose(item);};state.box.appendChild(option);});
  if(!state.items.length){const message=document.createElement('p');message.className='helper-text';message.textContent=buscarSugestoesClinicasKineSys(tipo,query)===null?'Carregando catálogo. Aguarde a avaliação terminar de abrir.':'Nenhum item encontrado. '+(['cirurgia','medicamento'].includes(tipo)?'Pressione Enter para registrar o texto informado.':'Você pode manter a atividade ou profissão informada.');state.box.appendChild(message);}
  state.box.style.display='block';input.setAttribute('aria-expanded','true');
 }
 state.render=render;input.addEventListener('input',render);input.addEventListener('focus',render);
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){hide();e.stopPropagation();return;}
  if(e.key==='Tab'){hide();return;}
  if(['ArrowDown','ArrowUp'].includes(e.key)){
   e.preventDefault();if(state.box.style.display==='none')render();if(!state.items.length)return;
   state.selected=(state.selected+(e.key==='ArrowDown'?1:-1)+state.items.length)%state.items.length;
   Array.from(state.box.children).forEach((o,i)=>o.setAttribute('aria-selected',String(i===state.selected)));
   const option=state.box.children[state.selected];input.setAttribute('aria-activedescendant',option.id);option.scrollIntoView?.({block:'nearest'});return;
  }
  if(e.key==='Enter'){
   if(state.selected>=0&&state.items[state.selected]){e.preventDefault();choose(state.items[state.selected]);}
   else if(['cirurgia','medicamento'].includes(tipo)&&input.value.trim()){e.preventDefault();choose({chave:'relato_livre',texto:input.value.trim()});}
  }
 });
}
function fecharSugestoesAvaliacaoKineSys(){
 ['input_cirurgia','input_medicamento','paciente_ocupacao','paciente_esporte'].forEach(id=>{const input=document.getElementById(id);if(input)autocompletesAvaliacaoKineSys.get(input)?.hide();});
}
window.fecharSugestoesAvaliacaoKineSys=fecharSugestoesAvaliacaoKineSys;

// --- AUTOCOMPLETE: CIRURGIAS ---
let inputCirurgia = null;
let sugestaoBoxCirurgia = null;

function inicializarAutocompleteCirurgia(){
    inputCirurgia=document.getElementById('input_cirurgia');sugestaoBoxCirurgia=document.getElementById('sugestao_box');
    conectarAutocompleteAvaliacaoKineSys(inputCirurgia,sugestaoBoxCirurgia,'cirurgia');
}

function registroCirurgiaKineSys(tag) {
    const preservado=tag.ksCirurgiaOriginal||{};
    return {...preservado,chave:tag.dataset.chave||'',texto:tag.dataset.exibicao||preservado.texto||'',dataCirurgia:String(tag.querySelector?.('.ks-cirurgia-data')?.value??tag.dataset.dataCirurgia??'').trim()};
}
function coletarCirurgiasAvaliacaoKineSys() {
    return Array.from(document.getElementById('tags_cirurgias')?.children||[]).filter(tag=>tag.dataset?.exibicao).map(registroCirurgiaKineSys);
}
let restaurandoCirurgiasKineSys=false;
function preencherCirurgiasAvaliacaoKineSys(registros=[]) {
    const container=document.getElementById('tags_cirurgias');if(!container)return;
    container.innerHTML='';
    restaurandoCirurgiasKineSys=true;
    try{(Array.isArray(registros)?registros:[]).forEach(item=>{const r=typeof item==='string'?{texto:item}:item||{};const texto=r.texto||r.exibicao||r.nome||'';if(texto)adicionarTagCirurgia(r.chave||'relato_livre',texto,r);});}finally{restaurandoCirurgiasKineSys=false;}
}
function adicionarTagCirurgia(chave, termoExibicao, registro={}) {
    const container = document.getElementById('tags_cirurgias');
    const data=String(registro.dataCirurgia||'').trim();
    const existente=Array.from(container?.children||[]).find(e=>e.dataset.chave===chave&&e.dataset.exibicao===termoExibicao&&(!data||e.dataset.dataCirurgia===data));
    if(existente){if(inputCirurgia)inputCirurgia.value='';fecharSugestoesAvaliacaoKineSys();existente.querySelector?.('.ks-cirurgia-data')?.focus();return;}
    if (container) {
        const tag = document.createElement('div');
        tag.className = 'tag-cirurgia';
        tag.dataset.chave = chave;
        tag.dataset.exibicao = termoExibicao;
        tag.dataset.dataCirurgia = data;
        tag.ksCirurgiaOriginal=JSON.parse(JSON.stringify(registro||{}));
        const textoTag = document.createElement('span');textoTag.className='ks-cirurgia-nome';textoTag.textContent=termoExibicao;
        const dataLabel=document.createElement('label');dataLabel.className='ks-cirurgia-data-label';
        const dataCaption=document.createElement('span');dataCaption.textContent='Data (opcional)';
        const dataInput=document.createElement('input');dataInput.type='text';dataInput.className='ks-cirurgia-data';dataInput.value=data;dataInput.maxLength=40;dataInput.placeholder='Dia/mês/ano ou ano';dataInput.autocomplete='off';dataInput.dataset.contextUi='true';dataInput.setAttribute('aria-label','Data ou período de '+termoExibicao);
        dataInput.addEventListener('input',()=>{tag.dataset.dataCirurgia=dataInput.value.trim();notificarSugestaoAvaliacaoKineSys(dataInput);if(typeof agendarAutosaveKineSys==='function')agendarAutosaveKineSys();});
        dataLabel.appendChild(dataCaption);dataLabel.appendChild(dataInput);
        const botaoRemover = document.createElement('button');botaoRemover.type='button';botaoRemover.className='ks-cirurgia-remover';botaoRemover.setAttribute('aria-label','Remover '+termoExibicao);
        botaoRemover.title = "Remover";
        botaoRemover.textContent = "✕";
        botaoRemover.onclick = function() {
            tag.remove();
            notificarSugestaoAvaliacaoKineSys(inputCirurgia);
            if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
        };

        tag.appendChild(textoTag);
        tag.appendChild(dataLabel);
        tag.appendChild(botaoRemover);
        container.appendChild(tag);
    }
    if (inputCirurgia) inputCirurgia.value = '';
    if (sugestaoBoxCirurgia) sugestaoBoxCirurgia.style.display = 'none';
    if(!restaurandoCirurgiasKineSys){notificarSugestaoAvaliacaoKineSys(inputCirurgia);if(typeof processarRadarEmTempoReal==='function')processarRadarEmTempoReal();}
}
window.coletarCirurgiasAvaliacaoKineSys=coletarCirurgiasAvaliacaoKineSys;
window.preencherCirurgiasAvaliacaoKineSys=preencherCirurgiasAvaliacaoKineSys;

// --- AUTOCOMPLETE: PROFISSÕES ---
let inputProfissao = null;
let sugestaoBoxProfissao = null;

function inicializarAutocompleteProfissao(){
    inputProfissao=document.getElementById('paciente_ocupacao');sugestaoBoxProfissao=document.getElementById('sugestao_box_profissao');
    conectarAutocompleteAvaliacaoKineSys(inputProfissao,sugestaoBoxProfissao,'profissao');
}

// --- AUTOCOMPLETE: ESPORTES ---
let inputEsporte = null;
let sugestaoBoxEsporte = null;

function inicializarAutocompleteEsporte(){
    inputEsporte=document.getElementById('paciente_esporte');sugestaoBoxEsporte=document.getElementById('sugestao_box_esporte');
    conectarAutocompleteAvaliacaoKineSys(inputEsporte,sugestaoBoxEsporte,'esporte');
}

// --- AUTOCOMPLETE: MEDICAMENTOS ---
let inputMedicamento = null;
let sugestaoBoxMed = null;

function inicializarAutocompleteMedicamento(){
    inputMedicamento=document.getElementById('input_medicamento');sugestaoBoxMed=document.getElementById('sugestao_box_med');
    conectarAutocompleteAvaliacaoKineSys(inputMedicamento,sugestaoBoxMed,'medicamento');
}

function coletarMedicamentosAvaliacaoKineSys(){
    return Array.from(document.getElementById('tags_medicamentos')?.children||[]).map(tag=>({...tag.ksMedicamentoOriginal,texto:tag.dataset?.exibicao||tag.textContent.replace(/[✕×]/g,'').trim(),nome:tag.dataset?.nomeMedicamento||'',dosagem:String(tag.querySelector?.('.ks-medicamento-dose')?.value??tag.dataset?.dosagem??'').trim()})).filter(r=>r.texto);
}
let restaurandoMedicamentosKineSys=false;
function preencherMedicamentosAvaliacaoKineSys(registros=[]){
    const container=document.getElementById('tags_medicamentos');if(!container)return;
    container.innerHTML='';restaurandoMedicamentosKineSys=true;
    try{(Array.isArray(registros)?registros:[]).forEach(item=>{const r=typeof item==='string'?{texto:item}:item||{};if(r.texto||r.nome)adicionarTagMedicamento(r.texto||r.nome,r);});}finally{restaurandoMedicamentosKineSys=false;}
}
window.coletarMedicamentosAvaliacaoKineSys=coletarMedicamentosAvaliacaoKineSys;
window.preencherMedicamentosAvaliacaoKineSys=preencherMedicamentosAvaliacaoKineSys;
function adicionarTagMedicamento(termo,registro={}) {
    const container = document.getElementById('tags_medicamentos');
    if(container&&Array.from(container.children).some(e=>normalizarBuscaClinicaKineSys(e.dataset?.exibicao||e.textContent.replace(/[✕×]/g,''))===normalizarBuscaClinicaKineSys(termo))){if(inputMedicamento)inputMedicamento.value='';fecharSugestoesAvaliacaoKineSys();return;}
    if (container) {
        const tag = document.createElement('div');
        tag.className='tag-medicamento';tag.dataset.exibicao=termo;
        tag.ksMedicamentoOriginal=JSON.parse(JSON.stringify(registro));
        const catalogo=globalThis.KineSysMedicamentos?.obter?.(termo);
        tag.dataset.nomeMedicamento=registro.nome||catalogo?.nome||'';
        tag.dataset.dosagem=String(registro.dosagem||'');

        const textoTag = document.createElement('span');textoTag.className='ks-medicamento-nome';textoTag.textContent=termo;
        const doseLabel=document.createElement('label');doseLabel.className='ks-medicamento-dose-label';doseLabel.setAttribute('aria-label','Dosagem de '+(tag.dataset.nomeMedicamento||termo)+' (opcional)');
        const doseInput=document.createElement('input');doseInput.type='text';doseInput.className='ks-medicamento-dose';doseInput.value=tag.dataset.dosagem;doseInput.placeholder='Dosagem (opcional)';doseInput.maxLength=100;doseInput.autocomplete='off';doseInput.dataset.contextUi='true';doseInput.setAttribute('aria-label','Dosagem de '+(tag.dataset.nomeMedicamento||termo)+' (opcional)');
        doseInput.addEventListener('input',()=>{tag.dataset.dosagem=doseInput.value.trim();notificarSugestaoAvaliacaoKineSys(doseInput);});doseLabel.appendChild(doseInput);
        const botaoRemover = document.createElement('button');botaoRemover.type='button';botaoRemover.className='ks-medicamento-remover';botaoRemover.setAttribute('aria-label','Remover '+termo);
        botaoRemover.title = "Remover";
        botaoRemover.textContent = "✕";
        botaoRemover.onclick = function() {
            tag.remove();
            notificarSugestaoAvaliacaoKineSys(inputMedicamento);
            if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
        };

        tag.appendChild(textoTag);
        tag.appendChild(doseLabel);
        tag.appendChild(botaoRemover);
        container.appendChild(tag);
    }
    if (inputMedicamento) inputMedicamento.value = '';
    if (sugestaoBoxMed) sugestaoBoxMed.style.display = 'none';
    if(!restaurandoMedicamentosKineSys){notificarSugestaoAvaliacaoKineSys(inputMedicamento);if(typeof processarRadarEmTempoReal==='function')processarRadarEmTempoReal();}
}

// FECHAMENTO DE CAIXAS AO CLICAR FORA
document.addEventListener('click', function(e) {
    if (inputMedicamento && sugestaoBoxMed && !inputMedicamento.contains(e.target) && !sugestaoBoxMed.contains(e.target)) {
        autocompletesAvaliacaoKineSys.get(inputMedicamento)?.hide();
    }
    if (inputCirurgia && sugestaoBoxCirurgia && !inputCirurgia.contains(e.target) && !sugestaoBoxCirurgia.contains(e.target)) {
        autocompletesAvaliacaoKineSys.get(inputCirurgia)?.hide();
    }
    if (inputProfissao && sugestaoBoxProfissao && !inputProfissao.contains(e.target) && !sugestaoBoxProfissao.contains(e.target)) {
        autocompletesAvaliacaoKineSys.get(inputProfissao)?.hide();
    }
    if (inputEsporte && sugestaoBoxEsporte && !inputEsporte.contains(e.target) && !sugestaoBoxEsporte.contains(e.target)) {
        autocompletesAvaliacaoKineSys.get(inputEsporte)?.hide();
    }
});



function inicializarSugestoesAvaliacaoKineSys(){
    inicializarEvaAvaliacao();
    inicializarAutocompleteCirurgia();inicializarAutocompleteProfissao();
    inicializarAutocompleteEsporte();inicializarAutocompleteMedicamento();
}
window.inicializarSugestoesAvaliacaoKineSys=inicializarSugestoesAvaliacaoKineSys;
['kinesys:tela-dom-pronta','kinesys:tela-modulos-prontos','kinesys:tela-ativada'].forEach(evento=>document.addEventListener(evento,e=>{if(e.detail?.id==='tela_avaliacao')inicializarSugestoesAvaliacaoKineSys();}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inicializarSugestoesAvaliacaoKineSys,{once:true});
else inicializarSugestoesAvaliacaoKineSys();

