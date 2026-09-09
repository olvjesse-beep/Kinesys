/* ============================================================================
   KineSys — PROMs / ESCALAS PREENCHÍVEIS v1.11.2 — CATÁLOGO AMPLIADO
   - Abre a escala em uma nova aba.
   - Faz cálculo automático e devolve o resultado à avaliação.
   - Preserva respostas/subescalas para reabertura.
   - Organiza catálogo por região/finalidade com busca e filtro.
   - Instrumentos protegidos/licenciados: o KineSys usa estrutura de pontuação,
     nomes de domínios e numeração dos itens sem reproduzir enunciados completos.
   ============================================================================ */

const KINESYS_PROM_DEFS = {
    NDI: {
        key:'NDI', nome:'Neck Disability Index', categoria:'Coluna / cervical', faixa:'0–100', direcao:'menor_melhor',
        itens:10, min:0, max:5, passo:1, scoring:'percent_5',
        grupos:[{titulo:'Itens do NDI',inicio:1,fim:10}],
        rotulos:['Intensidade da dor','Cuidados pessoais','Levantar peso','Leitura','Cefaleia','Concentração','Trabalho','Dirigir','Sono','Recreação'],
        nota:'10 itens pontuados de 0 a 5. Resultado normalizado para 0–100; menor pontuação indica menor incapacidade.'
    },
    ODI: {
        key:'ODI', nome:'Oswestry Disability Index', categoria:'Coluna / lombar', faixa:'0–100', direcao:'menor_melhor',
        itens:10, min:0, max:5, passo:1, scoring:'percent_5',
        grupos:[{titulo:'Seções do ODI',inicio:1,fim:10}],
        rotulos:['Intensidade da dor','Cuidados pessoais','Levantar peso','Caminhar','Sentar','Ficar em pé','Dormir','Vida sexual','Vida social','Viajar'],
        nota:'10 seções pontuadas de 0 a 5. Resultado normalizado para 0–100; menor pontuação indica menor incapacidade.'
    },
    RMDQ: {
        key:'RMDQ', nome:'Roland–Morris Disability Questionnaire', categoria:'Coluna / lombar', faixa:'0–24', direcao:'menor_melhor',
        itens:24, min:0, max:1, passo:1, scoring:'sum',
        grupos:[{titulo:'RMDQ — 24 afirmações',inicio:1,fim:24}],
        nota:'24 itens dicotômicos. Soma de 0–24; menor pontuação indica menor incapacidade relacionada à lombalgia.'
    },
    OREBRO10: {
        key:'Örebro-10', nome:'Örebro Musculoskeletal Pain Screening Questionnaire — Short Form', categoria:'Dor / prognóstico', faixa:'1–100', direcao:'menor_melhor',
        itens:10, min:0, max:10, passo:1, minPorItem:{1:1}, reverse:[3,4,8], scoring:'orebro10',
        grupos:[{titulo:'Dor e duração',inicio:1,fim:2},{titulo:'Função percebida',inicio:3,fim:4},{titulo:'Distresse',inicio:5,fim:6},{titulo:'Expectativa de retorno',inicio:7,fim:8},{titulo:'Crenças / medo',inicio:9,fim:10}],
        nota:'10 itens. O item 1 varia de 1–10; itens 3, 4 e 8 têm pontuação invertida automaticamente. Total 1–100; maior = maior risco estimado de persistência/incapacidade.'
    },
    STARTBACK: {
        key:'STarT Back', nome:'STarT Back Screening Tool', categoria:'Coluna / prognóstico', faixa:'0–9', direcao:'menor_melhor',
        itens:9, min:0, max:1, passo:1, maxPorItem:{9:4}, scoring:'startback',
        grupos:[{titulo:'Itens 1–8',inicio:1,fim:8},{titulo:'Item 9 — incômodo percebido',inicio:9,fim:9}],
        nota:'Triagem de risco para lombalgia. Itens 1–8 são 0/1; o item 9 usa cinco opções e é convertido automaticamente. Resultado total 0–9 + subescala psicossocial 0–5.'
    },
    SPADI: {
        key:'SPADI', nome:'Shoulder Pain and Disability Index', categoria:'Ombro', faixa:'0–100', direcao:'menor_melhor',
        itens:13, min:0, max:10, passo:1, scoring:'spadi',
        grupos:[{titulo:'Dor',inicio:1,fim:5},{titulo:'Incapacidade',inicio:6,fim:13}],
        nota:'5 itens de dor + 8 itens de incapacidade, pontuados de 0 a 10. Total 0–100; menor = melhor.'
    },
    QuickDASH: {
        key:'QuickDASH', nome:'QuickDASH', categoria:'Membro superior', faixa:'0–100', direcao:'menor_melhor',
        itens:11, min:1, max:5, passo:1, scoring:'dash_formula',
        grupos:[{titulo:'QuickDASH — 11 itens',inicio:1,fim:11}],
        nota:'11 itens pontuados de 1 a 5. O cálculo usa a fórmula padronizada do DASH/QuickDASH; menor = melhor.'
    },
    DASH30: {
        key:'DASH', nome:'Disabilities of the Arm, Shoulder and Hand — DASH', categoria:'Membro superior', faixa:'0–100', direcao:'menor_melhor',
        itens:30, min:1, max:5, passo:1, scoring:'dash_formula',
        grupos:[{titulo:'DASH — 30 itens',inicio:1,fim:30}],
        nota:'30 itens pontuados de 1 a 5. Resultado convertido para 0–100; menor pontuação indica menor incapacidade.'
    },
    PRWE: {
        key:'PRWE', nome:'Patient-Rated Wrist Evaluation', categoria:'Punho / mão', faixa:'0–100', direcao:'menor_melhor',
        itens:15, min:0, max:10, passo:1, scoring:'prwe',
        grupos:[{titulo:'Dor',inicio:1,fim:5},{titulo:'Função',inicio:6,fim:15}],
        nota:'15 itens. Dor contribui com 50 pontos e função com 50 pontos. Total 0–100; menor = melhor.'
    },
    PRTEE: {
        key:'PRTEE', nome:'Patient-Rated Tennis Elbow Evaluation', categoria:'Cotovelo', faixa:'0–100', direcao:'menor_melhor',
        itens:15, min:0, max:10, passo:1, scoring:'prtee',
        grupos:[{titulo:'Dor',inicio:1,fim:5},{titulo:'Função',inicio:6,fim:15}],
        nota:'15 itens. Dor contribui com 50 pontos e função com 50 pontos. Total 0–100; menor = melhor.'
    },
    SST12: {
        key:'SST', nome:'Simple Shoulder Test', categoria:'Ombro', faixa:'0–12', direcao:'maior_melhor',
        itens:12, min:0, max:1, passo:1, scoring:'sum',
        grupos:[{titulo:'SST — 12 itens',inicio:1,fim:12}],
        nota:'12 respostas dicotômicas. Soma de 0–12; maior pontuação indica melhor função do ombro.'
    },
    LEFS: {
        key:'LEFS', nome:'Lower Extremity Functional Scale', categoria:'Membro inferior', faixa:'0–80', direcao:'maior_melhor',
        itens:20, min:0, max:4, passo:1, scoring:'sum',
        grupos:[{titulo:'LEFS — 20 atividades',inicio:1,fim:20}],
        nota:'20 itens pontuados de 0 a 4. Soma de 0–80; maior pontuação indica melhor função.'
    },
    KOOS12: {
        key:'KOOS-12', nome:'KOOS-12', categoria:'Joelho', faixa:'0–100', direcao:'maior_melhor',
        itens:12, min:0, max:4, passo:1, scoring:'koos12',
        grupos:[{titulo:'Dor',inicio:1,fim:4},{titulo:'Função',inicio:5,fim:8},{titulo:'Qualidade de vida',inicio:9,fim:12}],
        nota:'12 itens em Dor, Função e Qualidade de vida. Domínios e resumo em 0–100; maior = melhor.'
    },
    HOOS12: {
        key:'HOOS-12', nome:'HOOS-12', categoria:'Quadril', faixa:'0–100', direcao:'maior_melhor',
        itens:12, min:0, max:4, passo:1, scoring:'hoos12',
        grupos:[{titulo:'Dor',inicio:1,fim:4},{titulo:'Função',inicio:5,fim:8},{titulo:'Qualidade de vida',inicio:9,fim:12}],
        nota:'12 itens em Dor, Função e Qualidade de vida. Domínios e resumo em 0–100; maior = melhor.'
    },
    WOMAC: {
        key:'WOMAC', nome:'WOMAC Osteoarthritis Index', categoria:'Quadril / joelho', faixa:'0–96', direcao:'menor_melhor',
        itens:24, min:0, max:4, passo:1, scoring:'womac',
        grupos:[{titulo:'Dor',inicio:1,fim:5},{titulo:'Rigidez',inicio:6,fim:7},{titulo:'Função física',inicio:8,fim:24}],
        nota:'Versão Likert 0–4: Dor 0–20, Rigidez 0–8, Função 0–68 e total 0–96. Menor = melhor.'
    },
    FAAM_ADL: {
        key:'FAAM-ADL', nome:'Foot and Ankle Ability Measure — Activities of Daily Living', categoria:'Pé / tornozelo', faixa:'0–100', direcao:'maior_melhor',
        itens:21, min:0, max:4, passo:1, scoring:'percent_max',
        grupos:[{titulo:'Atividades de vida diária',inicio:1,fim:21}],
        nota:'21 itens pontuados de 0 a 4. Resultado percentual de 0–100; maior = melhor.'
    },
    FAAM_SPORT: {
        key:'FAAM-Sport', nome:'Foot and Ankle Ability Measure — Sports', categoria:'Pé / tornozelo', faixa:'0–100', direcao:'maior_melhor',
        itens:8, min:0, max:4, passo:1, scoring:'percent_max',
        grupos:[{titulo:'Esporte',inicio:1,fim:8}],
        nota:'8 itens pontuados de 0 a 4. Resultado percentual de 0–100; maior = melhor.'
    },
    FFI: {
        key:'FFI', nome:'Foot Function Index', categoria:'Pé / tornozelo', faixa:'0–100', direcao:'menor_melhor',
        itens:23, min:0, max:10, passo:1, scoring:'ffi',
        grupos:[{titulo:'Dor',inicio:1,fim:9},{titulo:'Incapacidade',inicio:10,fim:18},{titulo:'Limitação de atividade',inicio:19,fim:23}],
        nota:'23 itens pontuados de 0 a 10. O total é convertido em percentual; menor = melhor função.'
    },
    BERG: {
        key:'Berg', nome:'Berg Balance Scale', categoria:'Equilíbrio / quedas', faixa:'0–56', direcao:'maior_melhor',
        itens:14, min:0, max:4, passo:1, scoring:'sum',
        grupos:[{titulo:'Berg — 14 tarefas',inicio:1,fim:14}],
        nota:'14 tarefas avaliadas de 0 a 4. Soma de 0–56; maior pontuação indica melhor desempenho de equilíbrio.'
    },
    ABC16: {
        key:'ABC', nome:'Activities-specific Balance Confidence Scale', categoria:'Equilíbrio / quedas', faixa:'0–100', direcao:'maior_melhor',
        itens:16, min:0, max:100, passo:10, scoring:'average',
        grupos:[{titulo:'Confiança no equilíbrio',inicio:1,fim:16}],
        nota:'16 situações avaliadas de 0% a 100%. O resultado é a média; maior = maior confiança no equilíbrio.'
    },
    FESI: {
        key:'FES-I', nome:'Falls Efficacy Scale — International', categoria:'Equilíbrio / quedas', faixa:'16–64', direcao:'menor_melhor',
        itens:16, min:1, max:4, passo:1, scoring:'sum',
        grupos:[{titulo:'Preocupação com quedas',inicio:1,fim:16}],
        nota:'16 itens pontuados de 1 a 4. Soma de 16–64; menor pontuação indica menor preocupação com quedas.'
    },
    PCS13: {
        key:'PCS', nome:'Pain Catastrophizing Scale', categoria:'Dor / psicossocial', faixa:'0–52', direcao:'menor_melhor',
        itens:13, min:0, max:4, passo:1, scoring:'pcs',
        grupos:[{titulo:'Itens do PCS',inicio:1,fim:13}],
        nota:'13 itens de 0 a 4. Total 0–52; o KineSys também calcula ruminação, magnificação e desamparo.'
    },
    CSI25: {
        key:'CSI', nome:'Central Sensitization Inventory — Part A', categoria:'Dor / psicossocial', faixa:'0–100', direcao:'menor_melhor',
        itens:25, min:0, max:4, passo:1, scoring:'sum',
        grupos:[{titulo:'CSI — 25 itens',inicio:1,fim:25}],
        nota:'25 itens pontuados de 0 a 4. Soma de 0–100; maior pontuação indica maior carga de sintomas relacionados à sensibilização central.'
    },
    NPRS: {
        key:'NPRS', nome:'Numeric Pain Rating Scale', categoria:'Dor / sintomas', faixa:'0–10', direcao:'menor_melhor',
        itens:1, min:0, max:10, passo:1, scoring:'sum',
        grupos:[{titulo:'Intensidade da dor',inicio:1,fim:1}],
        rotulos:['Dor no momento / período escolhido'],
        nota:'Escala numérica de dor de 0 a 10. Menor = menor intensidade de dor.'
    },
    PSEQ10: {
        key:'PSEQ', nome:'Pain Self-Efficacy Questionnaire', categoria:'Dor / psicossocial', faixa:'0–60', direcao:'maior_melhor',
        itens:10, min:0, max:6, passo:1, scoring:'sum',
        grupos:[{titulo:'Autoeficácia diante da dor',inicio:1,fim:10}],
        nota:'10 itens pontuados de 0 a 6. Soma de 0–60; maior pontuação indica maior autoeficácia para funcionar apesar da dor.'
    }
};


function calcularPontuacaoPROM(defOuKey, respostas=[]) {
    const D=typeof defOuKey==='string'?KINESYS_PROM_DEFS[defOuKey]:defOuKey;
    if(!D||!Array.isArray(respostas)||respostas.length!==D.itens||respostas.some(v=>v===null||v===undefined||!Number.isFinite(Number(v))))return null;
    const r=respostas.map(Number),sum=a=>a.reduce((x,y)=>x+Number(y||0),0),round1=v=>Math.round(v*10)/10,pct=(raw,max)=>max>0?round1(raw/max*100):0;
    const iMax=i=>D.maxPorItem&&D.maxPorItem[i]!=null?Number(D.maxPorItem[i]):Number(D.max);
    let valor=0,sub=null,obs='Pontuação calculada automaticamente pelo KineSys.',classificacao='';
    if(D.scoring==='percent_5')valor=round1(sum(r)/(D.itens*5)*100);
    else if(D.scoring==='sum')valor=round1(sum(r));
    else if(D.scoring==='average')valor=round1(sum(r)/r.length);
    else if(D.scoring==='percent_max'){let mx=0;for(let i=1;i<=D.itens;i++)mx+=iMax(i);valor=pct(sum(r),mx);}
    else if(D.scoring==='dash_formula')valor=round1(((sum(r)/r.length)-1)*25);
    else if(D.scoring==='spadi'){const dor=pct(sum(r.slice(0,5)),50),inc=pct(sum(r.slice(5)),80);valor=pct(sum(r),130);sub={Dor:{value:dor,max:100},Incapacidade:{value:inc,max:100}};obs='SPADI — domínios normalizados em 0–100.';}
    else if(D.scoring==='koos12'||D.scoring==='hoos12'){const cv=a=>round1(100-(sum(a)/a.length)*25);const dor=cv(r.slice(0,4)),fun=cv(r.slice(4,8)),qv=cv(r.slice(8,12));valor=round1((dor+fun+qv)/3);sub={Dor:{value:dor,max:100},Função:{value:fun,max:100},'Qualidade de vida':{value:qv,max:100}};obs=D.key+' — subescalas e resumo em 0–100.';}
    else if(D.scoring==='womac'){const dorRaw=sum(r.slice(0,5)),rigRaw=sum(r.slice(5,7)),funRaw=sum(r.slice(7,24));valor=round1(dorRaw+rigRaw+funRaw);sub={Dor:{value:dorRaw,max:20},Rigidez:{value:rigRaw,max:8},Função:{value:funRaw,max:68}};obs='WOMAC Likert — total bruto 0–96; menor = melhor.';}
    else if(D.scoring==='prwe'||D.scoring==='prtee'){const dorRaw=sum(r.slice(0,5)),funRaw=sum(r.slice(5));const dorComp=dorRaw,funComp=funRaw/2;valor=round1(dorComp+funComp);sub={Dor:{value:round1(dorRaw),max:50},Função:{value:round1(funComp),max:50}};obs=D.key+' — Dor 0–50 + Função 0–50.';}
    else if(D.scoring==='ffi'){const dor=sum(r.slice(0,9)),inc=sum(r.slice(9,18)),lim=sum(r.slice(18,23));valor=pct(dor+inc+lim,230);sub={Dor:{value:pct(dor,90),max:100},Incapacidade:{value:pct(inc,90),max:100},'Limitação de atividade':{value:pct(lim,50),max:100}};obs='FFI — resultado e subescalas em percentual; menor = melhor.';}
    else if(D.scoring==='orebro10'){const a=r.map((v,idx)=>Array.isArray(D.reverse)&&D.reverse.includes(idx+1)?10-v:v);valor=round1(sum(a));obs='Örebro-10 — itens 3, 4 e 8 invertidos automaticamente; maior pontuação = maior risco estimado.';}
    else if(D.scoring==='startback'){const conv=r.slice(0,8).map(v=>v?1:0);const q9=Number(r[8])>=3?1:0;valor=sum(conv)+q9;const psic=sum(conv.slice(4,8))+q9;sub={'Subescala psicossocial':{value:psic,max:5}};classificacao=valor<=3?'Baixo risco':(psic>=4?'Alto risco':'Médio risco');obs='STarT Back — classificação calculada pelo total e pela subescala psicossocial.';}
    else if(D.scoring==='pcs'){valor=sum(r);const rum=sum([r[7],r[8],r[9],r[10]]),mag=sum([r[5],r[6],r[12]]),des=sum([r[0],r[1],r[2],r[3],r[4],r[11]]);sub={Ruminação:{value:rum,max:16},Magnificação:{value:mag,max:12},Desamparo:{value:des,max:24}};obs='PCS — total 0–52 com três domínios.';}
    return{valor:round1(valor),sub,obs,classificacao};
}

const KINESYS_PROM_CATEGORIAS = [
    'Todos','Coluna / cervical','Coluna / lombar','Coluna / prognóstico','Ombro','Membro superior','Punho / mão','Cotovelo',
    'Membro inferior','Joelho','Quadril','Quadril / joelho','Pé / tornozelo','Equilíbrio / quedas','Dor / prognóstico','Dor / psicossocial','Dor / sintomas'
];

function inferirInstrumentoOutcome(nome='') {
    const n=String(nome||'').toLowerCase();
    const testes=[
        ['NDI',/neck disability|\bndi\b/],['ODI',/oswestry|\bodi\b/],['RMDQ',/roland.?morris|\brmdq\b/],['OREBRO10',/örebro|orebro|ömpsq|ompsq/],['STARTBACK',/start back|startback/],
        ['SPADI',/spadi/],['QuickDASH',/quick.?dash/],['DASH30',/(^|\s)dash(\s|$)|disabilities of the arm/],['PRWE',/prwe|wrist evaluation/],['PRTEE',/prtee|tennis elbow evaluation/],['SST12',/simple shoulder|\bsst\b/],
        ['LEFS',/lower extremity functional|\blefs\b/],['KOOS12',/koos/],['HOOS12',/hoos/],['WOMAC',/womac/],['FAAM_ADL',/faam.*adl|foot and ankle ability.*daily/],['FAAM_SPORT',/faam.*sport/],['FFI',/foot function index|\bffi\b/],
        ['BERG',/berg balance|\bberg\b/],['ABC16',/balance confidence|\babc\b/],['FESI',/fes.?i|falls efficacy/],['PCS13',/pain catastroph|\bpcs\b/],['CSI25',/central sensitization|\bcsi\b/],['NPRS',/numeric pain|nprs/],['PSEQ10',/pain self.?efficacy|pseq/]
    ];
    for(const [key,re] of testes) if(re.test(n)) return key;
    return 'Outro';
}

function serializarDadosProm(dados) {
    try { return encodeURIComponent(JSON.stringify(dados ?? null)); } catch(_) { return ''; }
}
function desserializarDadosProm(valor, fallback=null) {
    try { return JSON.parse(decodeURIComponent(valor || '')); } catch(_) { return fallback; }
}

function descricaoCurtaPROM(def) {
    const dir=def.direcao==='maior_melhor'?'maior = melhor':'menor = melhor';
    return `${def.itens} item${def.itens===1?'':'s'} · ${def.faixa} · ${dir}`;
}

function renderizarCatalogoPROM() {
    const grid=document.getElementById('proms_catalogo');
    if(!grid)return;
    const filtro=document.getElementById('proms_filtro_categoria')?.value||'Todos';
    const busca=String(document.getElementById('proms_busca')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const defs=Object.entries(KINESYS_PROM_DEFS).filter(([,d])=>{
        if(filtro!=='Todos'&&d.categoria!==filtro)return false;
        if(!busca)return true;
        const texto=`${d.key} ${d.nome} ${d.categoria} ${d.nota}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        return texto.includes(busca);
    });
    if(!defs.length){grid.innerHTML='<div class="clinical-note proms-empty-state">Nenhuma escala encontrada com estes filtros.</div>';return;}
    grid.innerHTML=defs.map(([key,d])=>`<button type="button" class="prom-card" onclick="abrirEscalaPROM('${key}')"><span class="prom-code">${escapeHTML(d.key)}</span><strong>${escapeHTML(d.nome)}</strong><small>${escapeHTML(descricaoCurtaPROM(d))}</small><small class="prom-cat">${escapeHTML(d.categoria)}</small><span class="prom-action">Preencher escala ↗</span></button>`).join('');
}

function inicializarCatalogoPROM() {
    const filtro=document.getElementById('proms_filtro_categoria');
    if(filtro){
        filtro.innerHTML=KINESYS_PROM_CATEGORIAS.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
        if(!filtro.dataset.promConfigured){filtro.dataset.promConfigured='1';filtro.addEventListener('change',renderizarCatalogoPROM);}
    }
    const busca=document.getElementById('proms_busca');
    if(busca&&!busca.dataset.promConfigured){busca.dataset.promConfigured='1';busca.addEventListener('input',renderizarCatalogoPROM);}
    const modelo=document.getElementById('outcome_modelo');
    if(modelo){
        const atual=modelo.value||'Outro';
        modelo.innerHTML=Object.entries(KINESYS_PROM_DEFS).map(([key,d])=>`<option value="${escapeHTML(key)}">${escapeHTML(d.key)} — ${escapeHTML(d.nome)}</option>`).join('')+'<option value="Outro">Outro instrumento / resultado manual</option>';
        modelo.value=KINESYS_PROM_DEFS[atual]?atual:'Outro';
    }
    renderizarCatalogoPROM();
}

// Substitui a linha antiga por versão capaz de reabrir a escala e preservar respostas.
function adicionarOutcome(dados={}) {
    const c=document.getElementById('lista_outcomes'); if(!c)return;
    const key=dados.instrumento||inferirInstrumentoOutcome(dados.nome||'');
    const m=(typeof OUTCOME_META!=='undefined'&&OUTCOME_META[key])?OUTCOME_META[key]:((typeof OUTCOME_META!=='undefined'&&OUTCOME_META.Outro)||{nome:'Outro instrumento',min:'',max:'',direcao:'maior_melhor'});
    const def=KINESYS_PROM_DEFS[key]||null;
    const calculado=dados.fonte==='calculadora' || Array.isArray(dados.respostas);
    const row=document.createElement('div');
    row.className='clinical-row outcome outcome-row prom-result-row';
    row.dataset.id=++contadorOutcomes;
    row.dataset.instrumento=key;
    row.dataset.fonte=calculado?'calculadora':(dados.fonte||'manual');
    row.dataset.respostas=serializarDadosProm(dados.respostas||[]);
    row.dataset.subescalas=serializarDadosProm(dados.subescalas||null);
    row.dataset.respondidoEm=dados.respondidoEm||'';
    const nome=dados.nome||def?.nome||m.nome;
    const faixa=dados.faixa||def?.faixa||((m.min!==''&&m.max!=='')?`${m.min}–${m.max}`:'');
    const direcao=dados.direcao||def?.direcao||m.direcao;
    const valor=dados.valor??'';
    const obs=dados.observacao||'';
    const ro=calculado?'readonly':'';
    row.innerHTML=`<div><label>Instrumento</label><input class="out_nome" ${ro} value="${escapeHTML(nome)}"></div><div><label>Resultado</label><input class="out_valor" type="number" step="0.1" ${ro} value="${escapeHTML(valor)}"></div><div><label>Faixa</label><input class="out_faixa" ${ro} value="${escapeHTML(faixa)}"></div><div><label>Direção</label><select class="out_direcao"><option value="maior_melhor" ${direcao==='maior_melhor'?'selected':''}>Maior = melhor</option><option value="menor_melhor" ${direcao==='menor_melhor'?'selected':''}>Menor = melhor</option></select></div><div><label>Observação</label><input class="out_obs" value="${escapeHTML(obs)}"></div><div class="prom-result-actions">${def?`<button type="button" class="btn-secondary" onclick="abrirEscalaPROM('${key}', '${row.dataset.id}')">↗ Reabrir</button>`:''}<button type="button" class="btn-secondary" title="Remover resultado" onclick="this.closest('.outcome-row').remove();if(typeof agendarAutosaveKineSys==='function')agendarAutosaveKineSys()">✕</button></div>`;
    c.appendChild(row);
}

function coletarOutcomes(){
    return Array.from(document.querySelectorAll('.outcome-row')).map(r=>{
        const raw=r.querySelector('.out_valor')?.value;
        return {
            instrumento:r.dataset.instrumento||inferirInstrumentoOutcome(r.querySelector('.out_nome')?.value||''),
            nome:r.querySelector('.out_nome')?.value.trim()||'',
            valor:(raw===''||raw==null)?null:Number(raw),
            faixa:r.querySelector('.out_faixa')?.value.trim()||'',
            direcao:r.querySelector('.out_direcao')?.value||'',
            observacao:r.querySelector('.out_obs')?.value.trim()||'',
            fonte:r.dataset.fonte||'manual',
            respostas:desserializarDadosProm(r.dataset.respostas,[])||[],
            subescalas:desserializarDadosProm(r.dataset.subescalas,null),
            respondidoEm:r.dataset.respondidoEm||''
        };
    }).filter(x=>x.nome&&x.valor!==null&&Number.isFinite(x.valor));
}

function adicionarOutcomeSelecionado(){
    const key=document.getElementById('outcome_modelo')?.value||'Outro';
    if(KINESYS_PROM_DEFS[key]) return abrirEscalaPROM(key);
    adicionarOutcome({instrumento:'Outro',fonte:'manual'});
}

function obterDadosLinhaProm(rowId) {
    if(!rowId)return null;
    const row=document.querySelector(`.outcome-row[data-id="${CSS.escape(String(rowId))}"]`);
    if(!row)return null;
    return { respostas:desserializarDadosProm(row.dataset.respostas,[])||[], observacao:row.querySelector('.out_obs')?.value||'' };
}

function receberResultadoEscalaKineSys(resultado={}) {
    const key=resultado.instrumento;
    if(!KINESYS_PROM_DEFS[key] || !Number.isFinite(Number(resultado.valor))) return false;
    const targetId=resultado.targetRowId||'';
    if(targetId){const antiga=document.querySelector(`.outcome-row[data-id="${CSS.escape(String(targetId))}"]`);if(antiga) antiga.remove();}
    adicionarOutcome({...resultado,fonte:'calculadora'});
    if(typeof agendarAutosaveKineSys==='function') agendarAutosaveKineSys();
    const status=document.getElementById('autosave_status');
    if(status){status.style.display='block';status.textContent=`✓ ${KINESYS_PROM_DEFS[key].key} calculado e inserido na avaliação`;}
    return true;
}

function abrirEscalaPROM(key, targetRowId='') {
    const def=KINESYS_PROM_DEFS[key];
    if(!def){alert('Esta escala ainda não possui formulário automático. Use o registro manual.');return;}
    const existente=obterDadosLinhaProm(targetRowId)||{};
    const paciente=(document.getElementById('paciente_nome')?.value||'').trim();
    const respostas=Array.isArray(existente.respostas)?existente.respostas:[];
    const nova=window.open('', '_blank');
    if(!nova){alert('O navegador bloqueou a nova aba. Autorize pop-ups para o KineSys e tente novamente.');return;}
    const payload={def,defKey:key,paciente,respostas,targetRowId};
    const json=JSON.stringify(payload).replace(/</g,'\\u003c');
    nova.document.open();
    nova.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(def.key)} — KineSys</title><style>
        :root{--petrol:#183d42;--teal:#247d73;--line:#dce7e5;--muted:#687e83;--bg:#f5f8f8;--ok:#167965}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,Segoe UI,Arial,sans-serif;color:#28464c}.top{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);padding:15px 20px}.topin{max-width:940px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-weight:900;color:var(--petrol);letter-spacing:-.02em}.brand small{display:block;font-size:12.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--teal);margin-bottom:2px}.progress{font-size:13.5px;font-weight:800;color:var(--teal);white-space:nowrap}.wrap{max-width:940px;margin:22px auto;padding:0 16px 40px}.hero{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 12px 28px rgba(21,62,68,.06);margin-bottom:12px}.hero h1{font-size:24px;color:var(--petrol);margin:0 0 7px}.hero p{margin:0;color:var(--muted);font-size:15px;line-height:1.55}.patient{margin-top:12px;display:inline-flex;padding:6px 10px;border-radius:999px;background:#eaf5f2;color:#23655f;font-size:13px;font-weight:800}.lic{margin:12px 0;padding:12px 14px;border-radius:13px;background:#fff9ed;border:1px solid #f0dfbb;color:#725d35;font-size:13px;line-height:1.5}.group{margin:16px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#567176;font-weight:900}.item{display:grid;grid-template-columns:minmax(190px,1fr) minmax(240px,.8fr);align-items:center;gap:16px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px 15px;margin-bottom:8px}.item .num{display:flex;gap:10px;align-items:center}.circle{min-width:30px;height:30px;border-radius:50%;background:#edf5f3;color:#247d73;display:grid;place-items:center;font-size:12.5px;font-weight:900}.item b{display:block;font-size:15px;color:#2b4b51}.item small{display:block;color:#7a8c90;font-size:13px;margin-top:3px;line-height:1.35}.choices{display:flex;gap:5px;justify-content:flex-end;flex-wrap:wrap}.choices label{position:relative}.choices input{position:absolute;opacity:0;pointer-events:none}.choices span{display:grid;place-items:center;min-width:35px;height:35px;padding:0 8px;border:1px solid #d8e4e2;border-radius:10px;background:#fafcfc;font-size:13px;font-weight:800;cursor:pointer;color:#547077}.choices input:checked+span{background:var(--teal);border-color:var(--teal);color:#fff;box-shadow:0 6px 14px rgba(36,125,115,.2)}.footer{position:sticky;bottom:0;background:rgba(245,248,248,.94);backdrop-filter:blur(8px);padding:12px 0}.actions{max-width:940px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:10px}.btn{border:0;border-radius:12px;padding:12px 16px;font-weight:850;font-size:14px;cursor:pointer}.btn.primary{background:linear-gradient(135deg,#2b9284,#1c6d70);color:#fff}.btn.secondary{background:#fff;border:1px solid var(--line);color:#35555b}.btn:disabled{opacity:.45;cursor:not-allowed}.result{display:none;background:#edf9f5;border:1px solid #bfe4d8;border-radius:17px;padding:18px;margin:15px 0}.result.show{display:block}.result .score{font-size:34px;color:var(--ok);font-weight:950;letter-spacing:-.03em}.result h2{margin:0 0 8px;font-size:15px;color:#315b59}.result p{font-size:14px;color:#58726f;line-height:1.5;margin:5px 0}.sub{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.sub span{background:#fff;border:1px solid #cfe6df;border-radius:10px;padding:7px 9px;font-size:12.5px;font-weight:800;color:#315b59}.classif{display:inline-flex;margin-top:10px;padding:7px 10px;border-radius:999px;background:#fff;border:1px solid #cfe6df;font-size:13px;font-weight:900;color:#315b59}@media(max-width:680px){.item{grid-template-columns:1fr}.choices{justify-content:flex-start}.topin{align-items:flex-start}.actions{padding:0 12px}}
    </style></head><body><div class="top"><div class="topin"><div class="brand"><small>KineSys Clinical</small>PROMs e escalas</div><div class="progress" id="prog">0/${def.itens} respondidos</div></div></div><main class="wrap"><section class="hero"><h1>${escapeHTML(def.key)} · ${escapeHTML(def.nome)}</h1><p>${escapeHTML(def.nota)}</p>${paciente?`<div class="patient">Paciente: ${escapeHTML(paciente)}</div>`:''}</section><div class="lic"><strong>Uso do instrumento:</strong> utilize a versão oficial/autorizada correspondente à escala. O KineSys organiza a resposta por item/domínio e calcula a pontuação sem reproduzir integralmente questionários protegidos.</div><div id="form"></div><section class="result" id="result"><h2>Resultado calculado</h2><div class="score" id="score">—</div><p id="resultText"></p><div class="sub" id="sub"></div><div class="classif" id="classif" style="display:none"></div><p><strong>O resultado já foi enviado para a avaliação aberta no KineSys.</strong></p></section></main><div class="footer"><div class="actions"><button class="btn secondary" type="button" onclick="window.close()">Fechar</button><button class="btn primary" type="button" id="finish" disabled>Finalizar escala e calcular</button></div></div><script>
    const P=${json}; const D=P.def; const initial=P.respostas||[]; const form=document.getElementById('form');
    function labelItem(i){return (D.rotulos&&D.rotulos[i-1])||('Item '+i)}
    function groupFor(i){return (D.grupos||[]).find(g=>i>=g.inicio&&i<=g.fim)}
    function iMin(i){return D.minPorItem&&D.minPorItem[i]!=null?Number(D.minPorItem[i]):Number(D.min)}
    function iMax(i){return D.maxPorItem&&D.maxPorItem[i]!=null?Number(D.maxPorItem[i]):Number(D.max)}
    function iStep(i){return D.passoPorItem&&D.passoPorItem[i]!=null?Number(D.passoPorItem[i]):Number(D.passo||1)}
    let lastGroup=''; let html='';
    for(let i=1;i<=D.itens;i++){const g=groupFor(i);if(g&&g.titulo!==lastGroup){lastGroup=g.titulo;html+='<div class="group">'+g.titulo+'</div>'}const rev=Array.isArray(D.reverse)&&D.reverse.includes(i);html+='<div class="item"><div class="num"><span class="circle">'+i+'</span><div><b>'+labelItem(i)+'</b><small>Selecione a pontuação correspondente ao item '+i+(rev?' · inversão aplicada automaticamente':'')+'</small></div></div><div class="choices">';for(let v=iMin(i);v<=iMax(i)+1e-9;v+=iStep(i)){const val=Math.round(v*100)/100,checked=Number(initial[i-1])===val?' checked':'';html+='<label><input type="radio" name="q'+i+'" value="'+val+'"'+checked+'><span>'+val+'</span></label>'}html+='</div></div>'}form.innerHTML=html;
    function respostas(){const r=[];for(let i=1;i<=D.itens;i++){const e=document.querySelector('input[name="q'+i+'"]:checked');r.push(e?Number(e.value):null)}return r}
    function update(){const r=respostas(),n=r.filter(v=>v!==null).length;document.getElementById('prog').textContent=n+'/'+D.itens+' respondidos';document.getElementById('finish').disabled=n!==D.itens}
    form.addEventListener('change',update);update();
    function round1(v){return Math.round(v*10)/10}
    function sum(a){return a.reduce((x,y)=>x+Number(y||0),0)}
    function pct(raw,max){return max>0?round1(raw/max*100):0}
    function calc(r){
        let valor=0,sub=null,obs='Pontuação calculada automaticamente pelo KineSys.',classificacao='';
        if(D.scoring==='percent_5') valor=round1(sum(r)/(D.itens*5)*100);
        else if(D.scoring==='sum') valor=round1(sum(r));
        else if(D.scoring==='average') valor=round1(sum(r)/r.length);
        else if(D.scoring==='percent_max'){let mx=0;for(let i=1;i<=D.itens;i++)mx+=iMax(i);valor=pct(sum(r),mx)}
        else if(D.scoring==='dash_formula') valor=round1(((sum(r)/r.length)-1)*25);
        else if(D.scoring==='spadi'){const dor=pct(sum(r.slice(0,5)),50),inc=pct(sum(r.slice(5)),80);valor=pct(sum(r),130);sub={Dor:{value:dor,max:100},Incapacidade:{value:inc,max:100}};obs='SPADI — domínios normalizados em 0–100.'}
        else if(D.scoring==='koos12'||D.scoring==='hoos12'){const cv=a=>round1(100-(sum(a)/a.length)*25);const dor=cv(r.slice(0,4)),fun=cv(r.slice(4,8)),qv=cv(r.slice(8,12));valor=round1((dor+fun+qv)/3);sub={Dor:{value:dor,max:100},Função:{value:fun,max:100},'Qualidade de vida':{value:qv,max:100}};obs=D.key+' — subescalas e resumo em 0–100.'}
        else if(D.scoring==='womac'){const dorRaw=sum(r.slice(0,5)),rigRaw=sum(r.slice(5,7)),funRaw=sum(r.slice(7,24));valor=round1(dorRaw+rigRaw+funRaw);sub={Dor:{value:dorRaw,max:20},Rigidez:{value:rigRaw,max:8},Função:{value:funRaw,max:68}};obs='WOMAC Likert — total bruto 0–96; menor = melhor.'}
        else if(D.scoring==='prwe'||D.scoring==='prtee'){const dorRaw=sum(r.slice(0,5)),funRaw=sum(r.slice(5));const dorComp=dorRaw,funComp=funRaw/2;valor=round1(dorComp+funComp);sub={Dor:{value:round1(dorRaw),max:50},Função:{value:round1(funComp),max:50}};obs=D.key+' — Dor 0–50 + Função 0–50.'}
        else if(D.scoring==='ffi'){const dor=sum(r.slice(0,9)),inc=sum(r.slice(9,18)),lim=sum(r.slice(18,23));valor=pct(dor+inc+lim,230);sub={Dor:{value:pct(dor,90),max:100},Incapacidade:{value:pct(inc,90),max:100},'Limitação de atividade':{value:pct(lim,50),max:100}};obs='FFI — resultado e subescalas em percentual; menor = melhor.'}
        else if(D.scoring==='orebro10'){const a=r.map((v,idx)=>Array.isArray(D.reverse)&&D.reverse.includes(idx+1)?10-v:v);valor=round1(sum(a));obs='Örebro-10 — itens 3, 4 e 8 invertidos automaticamente; maior pontuação = maior risco estimado.'}
        else if(D.scoring==='startback'){const conv=r.slice(0,8).map(v=>v?1:0);const q9=Number(r[8])>=3?1:0;valor=sum(conv)+q9;const psic=sum(conv.slice(4,8))+q9;sub={'Subescala psicossocial':{value:psic,max:5}};classificacao=valor<=3?'Baixo risco':(psic>=4?'Alto risco':'Médio risco');obs='STarT Back — classificação calculada pelo total e pela subescala psicossocial.'}
        else if(D.scoring==='pcs'){valor=sum(r);const rum=sum([r[7],r[8],r[9],r[10]]),mag=sum([r[5],r[6],r[12]]),des=sum([r[0],r[1],r[2],r[3],r[4],r[11]]);sub={Ruminação:{value:rum,max:16},Magnificação:{value:mag,max:12},Desamparo:{value:des,max:24}};obs='PCS — total 0–52 com três domínios.'}
        return{valor:round1(valor),sub,obs,classificacao};
    }
    function renderSub(sub){if(!sub)return'';return Object.entries(sub).map(([k,v])=>{if(v&&typeof v==='object')return '<span>'+k+': '+v.value+'/'+v.max+'</span>';return '<span>'+k+': '+v+'</span>'}).join('')}
    document.getElementById('finish').addEventListener('click',()=>{const r=respostas();if(r.some(v=>v===null))return;const c=calc(r);document.getElementById('score').textContent=c.valor+' / '+D.faixa.split('–').pop();document.getElementById('resultText').textContent=(D.direcao==='maior_melhor'?'Quanto maior a pontuação, melhor o desfecho funcional/avaliado.':'Quanto menor a pontuação, melhor o desfecho funcional/avaliado, salvo quando o instrumento representa risco/sintomas.');document.getElementById('sub').innerHTML=renderSub(c.sub);const cl=document.getElementById('classif');if(c.classificacao){cl.style.display='inline-flex';cl.textContent=c.classificacao}else cl.style.display='none';document.getElementById('result').classList.add('show');const result={instrumento:P.defKey||'${key}',nome:D.nome,valor:c.valor,faixa:D.faixa,direcao:D.direcao,observacao:c.obs+(c.classificacao?' Classificação: '+c.classificacao+'.':''),respostas:r,subescalas:c.sub,respondidoEm:new Date().toISOString(),targetRowId:P.targetRowId||''};try{if(window.opener&&!window.opener.closed&&typeof window.opener.receberResultadoEscalaKineSys==='function'){window.opener.receberResultadoEscalaKineSys(result);document.getElementById('finish').textContent='Resultado enviado ao KineSys ✓';document.getElementById('finish').disabled=true}else{document.getElementById('resultText').textContent+=' Não foi possível localizar a aba principal do KineSys; mantenha este resultado aberto para registro manual.'}}catch(e){console.error(e)}document.getElementById('result').scrollIntoView({behavior:'smooth',block:'center'})});
    <\/script></body></html>`);
    nova.document.close();
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(inicializarCatalogoPROM,50));
