from pathlib import Path

# Preserve existing HMA/shoulder contracts; only add elbow integration.
p=Path('clinical_reasoning_hma-3.0.0.js')
s=p.read_text(encoding='utf-8')
elbow_hook="""        if(typeof window.enriquecerPlanoCotoveloKineSys==='function'){
            try { planoGerado=window.enriquecerPlanoCotoveloKineSys(planoGerado)||planoGerado; }
            catch(err){ console.warn('Motor 3.1 Cotovelo:',err); }
        }
"""
if 'enriquecerPlanoCotoveloKineSys' not in s:
    marker="""        if(typeof window.enriquecerPlanoOmbroKineSys==='function'){
            try { planoGerado=window.enriquecerPlanoOmbroKineSys(planoGerado)||planoGerado; }
            catch(err){ console.warn('Motor 3.1 Ombro:',err); }
        }
"""
    if marker not in s: raise SystemExit('Shoulder hook marker not found in HMA engine')
    s=s.replace(marker,marker+elbow_hook,1)
p.write_text(s,encoding='utf-8')

p=Path('clinical_reasoning_shoulder-3.1.0.js')
s=p.read_text(encoding='utf-8')
registry='plano.motores31={...(plano.motores31||{}),ombro:plano.motor31};'
if registry not in s:
    start=s.find("plano.motor31={versao:VERSION,regiao:'ombro'")
    pos=s.find('\n\n    const extras=[];',start)
    if start<0 or pos<0: raise SystemExit('Shoulder motor31 marker not found')
    s=s[:pos]+'\n    '+registry+s[pos:]
old="""    const m=plano?.motor31;
    if(!m||m.regiao!=='ombro'){host.hidden=true;host.innerHTML='';return;}
"""
new="""    const m=plano?.motores31?.ombro||(plano?.motor31?.regiao==='ombro'?plano.motor31:null);
    if(!m){host.hidden=true;host.innerHTML='';return;}
"""
if old in s:s=s.replace(old,new,1)
elif 'plano?.motores31?.ombro' not in s:raise SystemExit('Shoulder render marker not found')
p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'clinical_reasoning_elbow-3.1.0.css' not in s:
    marker='    <link rel="stylesheet" href="clinical_reasoning_shoulder-3.1.0.css?v=20260910-r2">\n'
    if marker not in s: raise SystemExit('Shoulder CSS marker not found')
    s=s.replace(marker,marker+'    <link rel="stylesheet" href="clinical_reasoning_elbow-3.1.0.css?v=20260910-r1">\n',1)
if 'clinical_reasoning_elbow-3.1.0.js' not in s:
    marker='    <script defer src="clinical_reasoning_shoulder-3.1.0.js?v=20260910-lang-r3"></script>\n'
    if marker not in s: raise SystemExit('Shoulder JS marker not found')
    s=s.replace(marker,marker+'    <script defer src="clinical_reasoning_elbow-3.1.0.js?v=20260910-r1"></script>\n',1)
p.write_text(s,encoding='utf-8')
print('Elbow 3.1 integration patch applied')
