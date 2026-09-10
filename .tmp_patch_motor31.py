from pathlib import Path

core=Path('clinical_reasoning_hma-3.0.0.js')
s=core.read_text(encoding='utf-8')
old="""        ultimoPlano={
            versao:VERSION,
            geradoEm:new Date().toISOString(),
            insuficiente:false,
            fonteHMA:String(hmaResultado?.versaoMotor||window.KINESYS_HMA_ENGINE_VERSION||''),
            contextoResumo:{idade:contexto?.idade||null,mecanismo:contexto?.mecanismo||'',medicamentos:contexto?.textoMedicamentos||'',cirurgias:contexto?.textoCirurgias||''},
            hmaResultado,regioes,hipoteses,exame,
            lacunas:uniq(arr(hmaResultado?.lacunas)),
            aviso:'Prioridade de investigação; não representa probabilidade diagnóstica nem substitui decisão profissional.'
        };
        return ultimoPlano;
"""
new="""        let planoGerado={
            versao:VERSION,
            geradoEm:new Date().toISOString(),
            insuficiente:false,
            fonteHMA:String(hmaResultado?.versaoMotor||window.KINESYS_HMA_ENGINE_VERSION||''),
            contextoResumo:{idade:contexto?.idade||null,mecanismo:contexto?.mecanismo||'',medicamentos:contexto?.textoMedicamentos||'',cirurgias:contexto?.textoCirurgias||''},
            hmaResultado,regioes,hipoteses,exame,
            lacunas:uniq(arr(hmaResultado?.lacunas)),
            aviso:'Prioridade de investigação; não representa probabilidade diagnóstica nem substitui decisão profissional.'
        };
        if(typeof window.enriquecerPlanoOmbroKineSys==='function'){
            try { planoGerado=window.enriquecerPlanoOmbroKineSys(planoGerado)||planoGerado; }
            catch(err){ console.warn('Motor 3.1 Ombro:',err); }
        }
        ultimoPlano=planoGerado;
        return ultimoPlano;
"""
if s.count(old)!=1:
    raise SystemExit(f'core plan anchor count={s.count(old)}')
core.write_text(s.replace(old,new,1),encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
css_anchor='    <link rel="stylesheet" href="clinical_reasoning_hma-3.0.0.css?v=20260910-r1">\n'
css_line='    <link rel="stylesheet" href="clinical_reasoning_shoulder-3.1.0.css?v=20260910-r1">\n'
if h.count(css_anchor)!=1:
    raise SystemExit(f'css anchor count={h.count(css_anchor)}')
if 'clinical_reasoning_shoulder-3.1.0.css' not in h:
    h=h.replace(css_anchor,css_anchor+css_line,1)
found=[x for x in h.splitlines(True) if 'clinical_reasoning_hma-3.0.0.js' in x and '<script' in x]
if len(found)!=1:
    raise SystemExit(f'js anchor candidates={len(found)}')
js_anchor=found[0]
js_line='    <script defer src="clinical_reasoning_shoulder-3.1.0.js?v=20260910-r1"></script>\n'
if 'clinical_reasoning_shoulder-3.1.0.js' not in h:
    h=h.replace(js_anchor,js_anchor+js_line,1)
idx.write_text(h,encoding='utf-8')
