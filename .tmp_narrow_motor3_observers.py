from pathlib import Path
p=Path('clinical_reasoning_hma-3.0.0.js')
s=p.read_text(encoding='utf-8')
old="""        ['tags_medicamentos','tags_cirurgias'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(agendarAtualizacao).observe(el,{childList:true,subtree:true,characterData:true});});
        new MutationObserver(agendarAtualizacao).observe(tela,{subtree:true,attributes:true,attributeFilter:['class']});
"""
new="""        ['tags_medicamentos','tags_cirurgias'].forEach(id=>{
            const el=document.getElementById(id);
            if(el)new MutationObserver(()=>agendarAtualizacao(120)).observe(el,{childList:true,subtree:true,characterData:true});
        });
        const etapaMapeamento=document.getElementById('subtela_mapeamento');
        if(etapaMapeamento){
            new MutationObserver(mudancas=>{
                if(mudancas.some(m=>m.target===etapaMapeamento&&m.attributeName==='class'))agendarAtualizacao(100);
            }).observe(etapaMapeamento,{attributes:true,attributeFilter:['class']});
        }
        const grupoRegioes=document.getElementById('grupo_regioes_mapeamento');
        if(grupoRegioes){
            new MutationObserver(()=>agendarAtualizacao(120)).observe(grupoRegioes,{childList:true,subtree:true});
        }
"""
if old not in s: raise SystemExit('broad observer anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('Motor 3 observers narrowed')
