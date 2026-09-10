from pathlib import Path
import re

# ---------- script principal ----------
p=Path('script-1.18.0.js')
s=p.read_text(encoding='utf-8')

old="""  function normalizar(valor) {
    return String(valor || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
  }
"""
new="""  function normalizar(valor) {
    return String(valor || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9\\s]/g, ' ').replace(/\\s+/g, ' ').trim()
      .replace(/\\bencima\\b/g, 'em cima')
      .replace(/\\b(durmo|dorme|dormia|dormindo|dormir)\\b/g, 'dormir')
      .replace(/\\b(deito|deita|deitado|deitada|deitando|deitar)\\b/g, 'deitar')
      .replace(/\\b(apoio|apoia|apoiado|apoiada|apoiando|apoiar)\\b/g, 'apoiar')
      .replace(/\\bpra\\b/g, 'para')
      .replace(/\\s+/g, ' ').trim();
  }
"""
if old not in s: raise SystemExit('HMA normalizer anchor missing')
s=s.replace(old,new,1)

# Novo conceito de comportamento ao deitar sobre ombro/membro superior.
anchor='''  "provocacaoOmbro": [\n'''
if s.count(anchor)!=1: raise SystemExit(f'provocacaoOmbro anchor count={s.count(anchor)}')
insert='''  "decubitoOmbro": [
    "dormir em cima do ombro",
    "dormir encima do ombro",
    "dormir sobre o ombro",
    "deitar em cima do ombro",
    "deitar encima do ombro",
    "deitar sobre o ombro",
    "dorme em cima do ombro",
    "deita em cima do ombro",
    "dormir em cima do braço",
    "dormir encima do braço",
    "dormir sobre o braço",
    "deitar em cima do braço",
    "deitar encima do braço",
    "deitar sobre o braço",
    "dorme em cima do braço",
    "deita em cima do braço",
    "piora ao dormir de lado sobre o ombro",
    "piora ao deitar de lado sobre o ombro",
    "não consegue dormir sobre o ombro",
    "nao consegue dormir sobre o ombro",
    "dor quando apoia o ombro na cama",
    "dor ao apoiar o ombro na cama"
  ],
'''
s=s.replace(anchor,insert+anchor,1)

# Rótulo, classificação e escopo regional do novo conceito.
s=s.replace('''  "elevacaoBraco": "dor ao elevar o braço",\n  "provocacaoOmbro":''','''  "elevacaoBraco": "dor ao elevar o braço",\n  "decubitoOmbro": "piora ao deitar ou dormir sobre o ombro/membro superior",\n  "provocacaoOmbro":''',1)
s=s.replace("'transferencia','elevacaoBraco','provocacaoOmbro'","'transferencia','elevacaoBraco','decubitoOmbro','provocacaoOmbro'",1)
s=s.replace("'ombro','bicepsOmbro','elevacaoBraco','provocacaoOmbro'","'ombro','bicepsOmbro','elevacaoBraco','decubitoOmbro','provocacaoOmbro'",1)

# Peso como comportamento de apoio/decúbito: contribui, mas não confirma estrutura.
s=s.replace('''      "elevacaoBraco": 3,\n      "amplitudePassivaPreservadaOmbro": 2,''','''      "elevacaoBraco": 3,\n      "decubitoOmbro": 1,\n      "amplitudePassivaPreservadaOmbro": 2,''',1)
s=s.replace('''      "elevacaoBraco": 3,\n      "carga": 1,\n      "noturna": 1,\n      "rigidezOmbro": 1,''','''      "elevacaoBraco": 3,\n      "carga": 1,\n      "noturna": 1,\n      "decubitoOmbro": 1,\n      "rigidezOmbro": 1,''',1)
# AC: dor por compressão pode contribuir quando o restante do contexto aponta para a articulação.
s=s.replace('''      "acromioclavicular": 3,\n      "traumaOmbro": 1,\n      "ombro": 1''','''      "acromioclavicular": 3,\n      "traumaOmbro": 1,\n      "decubitoOmbro": 1,\n      "ombro": 1''')

# Casos de regressão para acento, flexão verbal e "encima".
case_anchor="""    caso('C3','cervical_ombro','Dor cervical vai para o ombro, mas não passa do cotovelo e não apresenta formigamento.',{
"""
if case_anchor not in s: raise SystemExit('C3 regression anchor missing')
new_cases="""    caso('C2A','cervical_ombro','Dor no ombro e piora ao dormir em cima do braço.',{
      sinaisIncluem:['ombro','decubitoOmbro']
    }),
    caso('C2B','cervical_ombro','Dor no ombro e piora ao deitar encima do braco.',{
      sinaisIncluem:['ombro','decubitoOmbro']
    }),
"""
s=s.replace(case_anchor,new_cases+case_anchor,1)

# Evita as três rotas pesadas imediatamente em toda tecla da HMA.
old_listener="""        el.addEventListener(el.type==='text'||el.tagName==='TEXTAREA'?'input':'change', event=>{
            processarRadarEmTempoReal();
            if(el.id==='paciente_origem_irradiacao'||el.id==='paciente_irradiacao'||el.id==='paciente_hma')renderizarAnaliseIrradiacao();
            agendarAutosaveKineSys();
        });
"""
new_listener="""        el.addEventListener(el.type==='text'||el.tagName==='TEXTAREA'?'input':'change', event=>{
            const ehDigitacaoHMA = el.id === 'paciente_hma' && event.type === 'input';
            if (!ehDigitacaoHMA) {
                processarRadarEmTempoReal();
                if(el.id==='paciente_origem_irradiacao'||el.id==='paciente_irradiacao')renderizarAnaliseIrradiacao();
            }
            agendarAutosaveKineSys();
        });
"""
if old_listener not in s: raise SystemExit('evaluation input listener anchor missing')
s=s.replace(old_listener,new_listener,1)

# Memoização: Radar e Motor 3 não recalculam a mesma HMA duas vezes.
memo_anchor="""  window.renderizarRadarHMAKineSys = function () {
"""
if s.count(memo_anchor)!=1: raise SystemExit(f'render HMA anchor count={s.count(memo_anchor)}')
memo="""  (function memoizarAnaliseHMAKineSys(){
    var original = window.analisarHMAClinicaKineSys;
    if (typeof original !== 'function' || original.__kinesysMemoized) return;
    var ultimaChave = null;
    var ultimoResultado = null;
    var memo = function(texto, contexto){
      var chave = normalizar(texto || '') + '|' + JSON.stringify(contexto || {});
      if (chave === ultimaChave && ultimoResultado) return ultimoResultado;
      ultimoResultado = original.call(this, texto, contexto);
      ultimaChave = chave;
      return ultimoResultado;
    };
    memo.__kinesysMemoized = true;
    memo.__original = original;
    window.analisarHMAClinicaKineSys = memo;
  })();

"""
s=s.replace(memo_anchor,memo+memo_anchor,1)

# Substitui render imediato por debounce central da HMA.
old_doc="""document.addEventListener('input', e => {
    if (e.target?.id !== 'paciente_hma') return;
    const box = document.getElementById('ks20_hma_radar');
    if (box) box.dataset.confirmado = 'false';
    if (typeof window.renderizarRadarHMAKineSys === 'function') window.renderizarRadarHMAKineSys();
});
"""
new_doc="""let kinesysHmaTempoRealTimer = null;
let kinesysHmaUltimaAssinatura = null;
function assinaturaHMAKineSys(valor='') {
    return String(valor || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()
        .replace(/[^a-z0-9\\s]/g,' ').replace(/\\bencima\\b/g,'em cima').replace(/\\s+/g,' ').trim();
}
function executarHMAEmTempoRealKineSys(forcar=false) {
    const campo = document.getElementById('paciente_hma');
    if (!campo) return;
    const assinatura = assinaturaHMAKineSys(campo.value);
    if (!forcar && assinatura === kinesysHmaUltimaAssinatura) return;
    kinesysHmaUltimaAssinatura = assinatura;
    if (typeof window.renderizarRadarHMAKineSys === 'function') window.renderizarRadarHMAKineSys();
    if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
    const origem = document.getElementById('paciente_origem_irradiacao')?.value || '';
    const destino = document.getElementById('paciente_irradiacao')?.value || '';
    if ((origem || destino) && typeof renderizarAnaliseIrradiacao === 'function') renderizarAnaliseIrradiacao();
}
function agendarHMAEmTempoRealKineSys(atraso=300, forcar=false) {
    clearTimeout(kinesysHmaTempoRealTimer);
    kinesysHmaTempoRealTimer = setTimeout(() => executarHMAEmTempoRealKineSys(forcar), atraso);
}
document.addEventListener('input', e => {
    if (e.target?.id !== 'paciente_hma') return;
    const box = document.getElementById('ks20_hma_radar');
    if (box) box.dataset.confirmado = 'false';
    if (e.isComposing) return;
    agendarHMAEmTempoRealKineSys(300, false);
});
document.addEventListener('compositionend', e => {
    if (e.target?.id === 'paciente_hma') agendarHMAEmTempoRealKineSys(80, true);
});
document.addEventListener('focusout', e => {
    if (e.target?.id === 'paciente_hma') agendarHMAEmTempoRealKineSys(40, false);
}, true);
"""
if old_doc not in s: raise SystemExit('HMA document input listener anchor missing')
s=s.replace(old_doc,new_doc,1)

p.write_text(s,encoding='utf-8')

# ---------- Motor 3.0 ----------
p=Path('clinical_reasoning_hma-3.0.0.js')
s=p.read_text(encoding='utf-8')
s=s.replace("const VERSION='3.0.0-alpha1';","const VERSION='3.0.1-performance1';",1)
s=s.replace("    let timerAtualizacao=null;\n","    let timerAtualizacao=null;\n    let ultimaAssinaturaAtualizacao=null;\n",1)

anchor="""    function atualizar(){
        garantirUI();
        const plano=gerarPlano();
"""
replacement="""    function assinaturaAtualizacao(){
        const c=contextoAtual();
        const cirurgias=arr(c?.cirurgias).map(x=>typeof x==='string'?x:(x?.texto||x?.nome||''));
        return JSON.stringify({
            hma:n(hmaAtual()), origem:n(c?.origemIrradiacao||''), irradiacao:n(c?.irradiacao||''),
            mecanismo:n(c?.mecanismo||''), idade:Number(c?.idade)||0,
            fatores:arr(c?.fatoresPiora).map(n).sort(),
            medicamentos:n(c?.textoMedicamentos||arr(c?.medicamentos).join(' ')),
            cirurgias:n(c?.textoCirurgias||cirurgias.join(' ')),
            regioes:regioesSelecionadasAtual().slice().sort()
        });
    }

    function atualizar(forcar=false){
        garantirUI();
        const assinatura=assinaturaAtualizacao();
        if(!forcar&&ultimoPlano&&assinatura===ultimaAssinaturaAtualizacao)return ultimoPlano;
        const plano=gerarPlano();
        ultimaAssinaturaAtualizacao=assinatura;
"""
if anchor not in s: raise SystemExit('Motor3 atualizar anchor missing')
s=s.replace(anchor,replacement,1)

old="""    function agendarAtualizacao(){ clearTimeout(timerAtualizacao);timerAtualizacao=setTimeout(atualizar,220); }

    function instalarEventos(){
        const tela=document.getElementById('tela_avaliacao'); if(!tela)return;
        ['paciente_hma','paciente_origem_irradiacao','paciente_irradiacao','paciente_mecanismo_lesao','paciente_idade'].forEach(id=>{
            const el=document.getElementById(id);if(el){el.addEventListener('input',agendarAtualizacao);el.addEventListener('change',agendarAtualizacao);}
        });
"""
new="""    function agendarAtualizacao(atraso=220){ clearTimeout(timerAtualizacao);timerAtualizacao=setTimeout(()=>atualizar(false),atraso); }

    function instalarEventos(){
        const tela=document.getElementById('tela_avaliacao'); if(!tela)return;
        ['paciente_hma','paciente_origem_irradiacao','paciente_irradiacao','paciente_mecanismo_lesao','paciente_idade'].forEach(id=>{
            const el=document.getElementById(id);if(el){
                el.addEventListener('input',()=>agendarAtualizacao(id==='paciente_hma'?460:220));
                el.addEventListener('change',()=>agendarAtualizacao(80));
            }
        });
"""
if old not in s: raise SystemExit('Motor3 scheduler anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# ---------- Motor 3.1 Ombro ----------
p=Path('clinical_reasoning_shoulder-3.1.0.js')
s=p.read_text(encoding='utf-8')
s=s.replace("const VERSION='3.1.1-shoulder2';","const VERSION='3.1.2-shoulder3';",1)
old="""  const norm=(v='')=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();
  const arr=v=>Array.isArray(v)?v:[];
  const uniq=v=>Array.from(new Set(arr(v).filter(Boolean)));
  const hmaTexto=()=>String(document.getElementById('paciente_hma')?.value||'');
  const contem=(texto,termos)=>{
    const t=norm(texto);
    return arr(termos).filter(x=>t.includes(norm(x)));
  };
"""
new="""  const normBase=(v='')=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();
  const norm=(v='')=>normBase(v)
    .replace(/\\bencima\\b/g,'em cima')
    .replace(/\\b(durmo|dorme|dormia|dormindo|dormir)\\b/g,'dormir')
    .replace(/\\b(deito|deita|deitado|deitada|deitando|deitar)\\b/g,'deitar')
    .replace(/\\b(apoio|apoia|apoiado|apoiada|apoiando|apoiar)\\b/g,'apoiar')
    .replace(/\\bpra\\b/g,'para')
    .replace(/\\s+/g,' ').trim();
  const arr=v=>Array.isArray(v)?v:[];
  const uniq=v=>Array.from(new Set(arr(v).filter(Boolean)));
  const hmaTexto=()=>String(document.getElementById('paciente_hma')?.value||'');
  const contem=(texto,termos)=>{
    const t=norm(texto);
    return arr(termos).filter(x=>t.includes(norm(x)));
  };
"""
if old not in s: raise SystemExit('shoulder norm anchor missing')
s=s.replace(old,new,1)

old="""      'doi no lado de fora do ombro','dor desce so ate o meio do braco','doi no meio do levantamento','doi mais para subir do que parado'
"""
new="""      'doi no lado de fora do ombro','dor desce so ate o meio do braco','doi no meio do levantamento','doi mais para subir do que parado',
      'dormir em cima do ombro','dormir sobre o ombro','deitar em cima do ombro','deitar sobre o ombro','dormir em cima do braco','dormir sobre o braco',
      'deitar em cima do braco','deitar sobre o braco','dormir do lado do ombro','deitar do lado do ombro','doi ao dormir de lado','doi quando deita sobre o ombro'
"""
if old not in s: raise SystemExit('shoulder manguito vocab anchor missing')
s=s.replace(old,new,1)

# Evita normalizar centenas de frases novamente em cada atualização.
anchor="""  const MATRIZ_EXAME={
"""
compiled="""  const VOCABULARIO_COMPILADO={};
  CONDICOES.forEach(cond=>{
    VOCABULARIO_COMPILADO[cond.id]=uniq([...arr(cond.termos),...arr(VOCABULARIO_NACIONAL[cond.id])]).map(raw=>({raw,normalizado:norm(raw)}));
  });
  const ITEM_BANCO_CACHE=new Map();

"""
if s.count(anchor)!=1: raise SystemExit('MATRIZ_EXAME anchor missing')
s=s.replace(anchor,compiled+anchor,1)

old="""  function textoContexto(){
    const c=contexto();
    return [hmaTexto(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');
  }

  function pontuar(cond,texto,c){
    const hits=contem(texto,uniq([...arr(cond.termos),...arr(VOCABULARIO_NACIONAL[cond.id])]));
"""
new="""  function textoContexto(c=contexto()){
    return [hmaTexto(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');
  }

  function pontuar(cond,texto,c){
    const t=norm(texto);
    const hits=arr(VOCABULARIO_COMPILADO[cond.id]).filter(x=>x.normalizado&&t.includes(x.normalizado)).map(x=>x.raw);
"""
if old not in s: raise SystemExit('shoulder textoContexto/pontuar anchor missing')
s=s.replace(old,new,1)

old="""  function itemBancoPorCondicao(cond){
    try{
      const reg=typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO?.ombro:null;
      const itens=[...arr(reg?.clusters),...arr(reg?.diferenciais)];
      return itens.find(item=>cond.nomes.some(rx=>rx.test(norm(item?.nome||''))))||null;
    }catch(_){return null;}
  }
"""
new="""  function itemBancoPorCondicao(cond){
    if(ITEM_BANCO_CACHE.has(cond.id))return ITEM_BANCO_CACHE.get(cond.id);
    try{
      const reg=typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO?.ombro:null;
      const itens=[...arr(reg?.clusters),...arr(reg?.diferenciais)];
      const item=itens.find(item=>cond.nomes.some(rx=>rx.test(norm(item?.nome||''))))||null;
      ITEM_BANCO_CACHE.set(cond.id,item);
      return item;
    }catch(_){return null;}
  }
"""
if old not in s: raise SystemExit('shoulder item cache anchor missing')
s=s.replace(old,new,1)

s=s.replace("const c=contexto(); const texto=textoContexto();","const c=contexto(); const texto=textoContexto(c);",1)

old="""    host.hidden=false;
    const matriz=arr(plano?.exame?.matrizOmbro).slice(0,4);
    host.innerHTML=`<header>"""
new="""    host.hidden=false;
    const matriz=arr(plano?.exame?.matrizOmbro).slice(0,4);
    const assinatura=JSON.stringify({v:VERSION,c:m.condicoes.map(x=>x.id),f:m.frasesReconhecidas,p:m.perguntas.slice(0,10),mx:matriz.map(x=>x.id)});
    if(host.dataset.ks31Signature===assinatura)return;
    host.dataset.ks31Signature=assinatura;
    host.innerHTML=`<header>"""
if old not in s: raise SystemExit('shoulder render signature anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# ---------- cache bust ----------
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('script-1.18.0.js?v=20260910-agendamento-clinico-r2','script-1.18.0.js?v=20260910-hma-perf-r3')
s=s.replace('clinical_reasoning_hma-3.0.0.js?v=20260910-r1','clinical_reasoning_hma-3.0.0.js?v=20260910-perf-r2')
s=s.replace('clinical_reasoning_shoulder-3.1.0.js?v=20260910-r2','clinical_reasoning_shoulder-3.1.0.js?v=20260910-lang-r3')
p.write_text(s,encoding='utf-8')

print('HMA latency/language patch applied')
