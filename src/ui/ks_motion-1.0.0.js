/* ==========================================================================
   KineSys Motion 1.0.0 — microanimações de retorno visual.
   Regras de segurança:
   - Somente adiciona/remove classes ks-motion-*. Não altera texto, valores,
     disabled, dados nem classes lidas pelo sistema.
   - Anima somente TRANSIÇÕES (estado anterior conhecido → novo estado);
     a primeira renderização de cada item só registra a linha de base.
   - Qualquer erro é engolido: o sistema segue funcionando sem animação.
   - Desligar: localStorage.setItem('ks_motion_off','1') e recarregar.
   ========================================================================== */
(function(root){
    'use strict';

    const DURACAO_MAX_MS=2200;

    function desligado(){
        try{
            if(root.localStorage&&root.localStorage.getItem('ks_motion_off')==='1')return true;
            if(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches)return true;
        }catch(_){ }
        return false;
    }

    // Aplica a classe e garante a remoção (animationend ou tempo máximo).
    function pulsar(el,classe){
        if(!el||!el.classList)return false;
        try{
            el.classList.remove(classe);
            void el.offsetWidth; // reinicia a animação se já estava aplicada
            el.classList.add(classe);
            let feito=false;
            const limpar=()=>{if(feito)return;feito=true;try{el.classList.remove(classe);el.removeEventListener('animationend',aoFim);}catch(_){}};
            const aoFim=(ev)=>{if(ev.target===el)limpar();};
            el.addEventListener('animationend',aoFim);
            root.setTimeout(limpar,DURACAO_MAX_MS);
            return true;
        }catch(_){return false;}
    }

    // Detector de transições: chave estável → último estado conhecido.
    function criarDetector(){
        const estados=new Map();
        return {
            // Retorna true somente quando havia estado anterior diferente e o novo é o alvo.
            transicao(chave,estado,alvo){
                if(!chave)return false;
                const anterior=estados.get(chave);
                estados.set(chave,estado);
                return anterior!==undefined&&anterior!==estado&&estado===alvo;
            },
            mudou(chave,valor){
                if(!chave)return false;
                const anterior=estados.get(chave);
                estados.set(chave,valor);
                return anterior!==undefined&&anterior!==valor;
            },
            tamanho(){return estados.size;}
        };
    }

    function statusDaClasse(el,prefixo){
        const c=Array.from(el.classList||[]).find(n=>n.indexOf(prefixo)===0);
        return c?c.slice(prefixo.length):'';
    }

    // ---------- Varreduras por tela (cada uma isolada em try/catch) ----------
    const det=criarDetector();

    function varrerExame(raiz){
        raiz.querySelectorAll('.cluster-card').forEach(card=>{
            const sel=card.querySelector('select[data-regiao][data-item]');
            if(!sel)return;
            const chave='exame|'+sel.dataset.regiao+'|'+(sel.dataset.grupo||'')+'|'+sel.dataset.item;
            const st=card.classList.contains('status-positivo')?'positivo':card.classList.contains('status-negativo')?'negativo':card.classList.contains('status-inconclusivo')?'inconclusivo':'pendente';
            if(det.transicao(chave,st,'positivo'))pulsar(card,'ks-motion-criterio');
        });
    }

    function varrerAgenda(raiz){
        raiz.querySelectorAll('.agenda-compromisso').forEach(comp=>{
            const host=comp.parentElement;
            const titulo=host&&host.title;
            if(!titulo)return;
            const coluna=host.closest('[data-data],[data-dia],[data-date]');
            const dia=coluna?(coluna.dataset.data||coluna.dataset.dia||coluna.dataset.date||''):'';
            const chave='agenda|'+dia+'|'+titulo;
            if(det.transicao(chave,statusDaClasse(comp,'status-'),'confirmado'))pulsar(comp,'ks-motion-confirmado');
        });
    }

    function varrerFinanceiro(raiz){
        raiz.querySelectorAll('.finance-plan-card').forEach(card=>{
            const cab=card.querySelector('.finance-plan-head');
            const linha=card.querySelector('.finance-money-line');
            if(!cab||!linha)return;
            const chave='fin|'+cab.textContent.replace(/\s+/g,' ').trim();
            const rotulo=(linha.querySelector('b')||{}).textContent||'';
            const pago=(linha.querySelectorAll('b')[1]||{}).textContent||'';
            const quitou=det.transicao(chave+'|rotulo',rotulo.trim(),'Quitado');
            const pagouMais=det.mudou(chave+'|pago',pago.trim());
            if(quitou)pulsar(card,'ks-motion-quitado');
            else if(pagouMais)pulsar(card,'ks-motion-pagamento');
        });
    }

    function varrerMeuDia(raiz){
        raiz.querySelectorAll('.ks-fisio-day-row').forEach(row=>{
            const hora=row.querySelector('.ks-fisio-day-time');
            const nome=row.querySelector('.ks-fisio-day-patient-name');
            if(!hora||!nome)return;
            const chave='dia|'+hora.textContent.trim()+'|'+nome.textContent.trim();
            if(det.transicao(chave,row.classList.contains('is-current')?'atual':'outro','atual'))pulsar(row,'ks-motion-atual');
        });
    }

    function desenharGrafico(svg){
        if(!svg||svg.dataset.ksMotionDesenhado)return;
        if(svg.closest('#avaliacao_eva_previa'))return; // prévia recalcula a cada ajuste do controle
        svg.dataset.ksMotionDesenhado='1';
        const linha=svg.querySelector('polyline');
        if(!linha||typeof linha.getTotalLength!=='function')return;
        const len=Math.ceil(linha.getTotalLength()||0);
        if(!len)return;
        svg.style.setProperty('--ks-motion-len',String(len));
        pulsar(svg,'ks-motion-desenhar');
    }

    // ---------- Observadores com escopo por tela, em lote por quadro ----------
    function observar(alvo,fn,opcoes){
        if(!alvo||typeof root.MutationObserver!=='function')return null;
        let agendado=false;
        const rodar=()=>{agendado=false;try{fn(alvo);}catch(_){}};
        const obs=new root.MutationObserver(()=>{
            if(agendado)return;agendado=true;
            (root.requestAnimationFrame||root.setTimeout)(rodar);
        });
        obs.observe(alvo,opcoes||{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
        rodar(); // linha de base
        return obs;
    }

    function iniciar(){
        if(desligado())return;
        const doc=root.document;
        const id=(x)=>doc.getElementById(x);
        observar(id('tela_avaliacao'),varrerExame);
        observar(id('tela_agenda'),varrerAgenda);
        observar(id('tela_financeiro'),varrerFinanceiro);

        // Início / Meu dia: cascata na primeira entrada após o login + atendimento atual.
        const home=id('tela_home');
        if(home){
            observar(home,varrerMeuDia);
            let entrou=false;
            const obsTela=new root.MutationObserver(()=>{
                try{
                    if(!entrou&&home.classList.contains('ativa')){entrou=true;pulsar(home,'ks-motion-entrada');obsTela.disconnect();}
                }catch(_){ }
            });
            obsTela.observe(home,{attributes:true,attributeFilter:['class']});
        }

        // Gráfico da dor: janela de análise criada sob demanda no <body>.
        observar(doc.body,(b)=>{
            const dlg=b.querySelector(':scope > #ks_fisio_evolution_dialog');
            if(dlg&&!dlg.dataset.ksMotionObservado){
                dlg.dataset.ksMotionObservado='1';
                observar(dlg,(d)=>d.querySelectorAll('svg.ks-fisio-evolution-chart').forEach(desenharGrafico),{childList:true,subtree:true});
            }
        },{childList:true});
    }

    root.KineSysMotion=Object.freeze({criarDetector,pulsar,desligado,_varrer:{exame:varrerExame,agenda:varrerAgenda,financeiro:varrerFinanceiro,meuDia:varrerMeuDia,grafico:desenharGrafico}});

    try{
        if(root.document&&root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>{try{iniciar();}catch(_){}});
        else if(root.document)iniciar();
    }catch(_){ }
})(typeof window!=='undefined'?window:globalThis);
