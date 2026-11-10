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
            // Decisão do produto: as animações são curtas (até ~1,6s), sem piscar e sem
            // deslocamento grande, então seguem ativas mesmo com "menos movimento" no
            // sistema operacional. O desligamento é somente pelo próprio KineSys.
            if(root.localStorage&&root.localStorage.getItem('ks_motion_off')==='1')return true;
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
    let det=criarDetector();

    // Escopo (usuário|clínica): ao trocar perfil/clínica ou sair, toda a memória das
    // animações é descartada, para nunca mostrar dados do contexto anterior.
    let escopoMemoria=null;
    function escopoAtual(){
        try{
            const u=typeof usuarioLogado!=='undefined'?usuarioLogado:root.usuarioLogado;
            return u?String(u.id||'')+'|'+String(u.clinica_id||''):'';
        }catch(_){return '';}
    }
    function garantirEscopo(){
        const atual=escopoAtual();
        if(escopoMemoria===null){escopoMemoria=atual;return;}
        if(atual===escopoMemoria)return;
        escopoMemoria=atual;
        try{zerarMemoria();}catch(_){ }
    }

    function varrerExame(raiz){
        garantirEscopo();
        raiz.querySelectorAll('.cluster-card').forEach(card=>{
            const sel=card.querySelector('select[data-regiao][data-item]');
            if(!sel)return;
            const chave='exame|'+sel.dataset.regiao+'|'+(sel.dataset.grupo||'')+'|'+sel.dataset.item;
            const st=card.classList.contains('status-positivo')?'positivo':card.classList.contains('status-negativo')?'negativo':card.classList.contains('status-inconclusivo')?'inconclusivo':'pendente';
            if(det.transicao(chave,st,'positivo'))pulsar(card,'ks-motion-criterio');
        });
    }

    // ---------- Aviso "Paciente chegou" (camada própria no <body>) ----------
    const avisados=new Set();
    function avisarChegada(lista){
        const novos=lista.filter(x=>x&&x.nome&&!avisados.has(x.nome+'|'+x.hora));
        if(!novos.length)return;
        novos.forEach(x=>avisados.add(x.nome+'|'+x.hora));
        const doc=root.document;if(!doc||!doc.body)return;
        try{
            const antigo=doc.getElementById('ks_motion_aviso_chegada');if(antigo)antigo.remove();
            const aviso=doc.createElement('div');
            aviso.id='ks_motion_aviso_chegada';aviso.className='ks-motion-aviso';
            aviso.setAttribute('role','status');aviso.setAttribute('aria-live','polite');
            aviso.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><div><strong></strong><small></small></div>';
            const titulo=aviso.querySelector('strong'),detalhe=aviso.querySelector('small');
            if(novos.length===1){
                titulo.textContent=novos[0].nome+' chegou';
                detalhe.textContent=(novos[0].hora?'Atendimento das '+novos[0].hora+' · ':'')+'em espera na recepção';
            }else{
                titulo.textContent=novos.length+' pacientes chegaram';
                detalhe.textContent=novos.map(x=>x.nome).join(', ');
            }
            doc.body.appendChild(aviso);
            root.setTimeout(()=>{try{aviso.classList.add('ks-motion-aviso-saindo');}catch(_){}},5200);
            root.setTimeout(()=>{try{aviso.remove();}catch(_){}},5600);
        }catch(_){ }
    }

    // ---------- Agenda: navegação (semana/dia deslizando) ----------
    let navAnterior=null;
    function animarNavegacaoAgenda(grade){
        if(!grade)return;
        const periodo=grade.dataset.periodo||'';
        const dias=(grade.dataset.dias||'').split(',').filter(Boolean);
        const atual={periodo,dias,assin:periodo+'|'+dias.join(',')};
        const ant=navAnterior;navAnterior=atual;
        if(!ant||ant.assin===atual.assin||!dias.length||!ant.dias.length)return;
        if(ant.periodo==='semana'&&periodo==='dia'){
            const i=ant.dias.indexOf(dias[0]),n=ant.dias.length;
            if(i>=0){
                grade.style.setProperty('--ks-motion-l',(i/n*100).toFixed(2)+'%');
                grade.style.setProperty('--ks-motion-r',((n-i-1)/n*100).toFixed(2)+'%');
                pulsar(grade,'ks-motion-abrir-dia');return;
            }
        }
        if(periodo===ant.periodo){pulsar(grade,dias[0]>ant.dias[0]?'ks-motion-avancar':'ks-motion-voltar');return;}
        pulsar(grade,'ks-motion-trocar');
    }

    // ---------- Agenda: confirmado, paciente chegou, falta, cancelamento e novo agendamento ----------
    const STATUS_FALTA=new Set(['falta_nao_justificada','falta_justificada','faltou']);
    const estadoAgenda=new Map();
    let agendaAssinatura=null,agendaChaves=null,agendaPosicoes=new Map();

    // 23. Cancelamento: o cartão sai da grade; "Horário liberado" (camada inerte) aparece onde ele estava.
    function mostrarHorarioLiberado(grade,pos){
        try{
            const doc=root.document,g=grade.getBoundingClientRect();
            const marca=doc.createElement('div');
            marca.className='ks-motion-horario-liberado';marca.setAttribute('aria-hidden','true');
            marca.textContent='Horário liberado';
            marca.style.cssText='left:'+(g.left+pos.x-grade.scrollLeft)+'px;top:'+(g.top+pos.y-grade.scrollTop)+'px;width:'+pos.w+'px;height:'+pos.h+'px';
            doc.body.appendChild(marca);
            const tirar=()=>{try{marca.remove();}catch(_){}};
            marca.addEventListener('animationend',tirar);
            root.setTimeout(tirar,2400);
        }catch(_){ }
    }
    function varrerAgenda(raiz){
        garantirEscopo();
        const grade=raiz.querySelector('#agenda_semana_grade');
        try{animarNavegacaoAgenda(grade);}catch(_){ }
        const filtro=raiz.querySelector('#agenda_filtro_profissional');
        const assinatura=grade?(grade.dataset.periodo||'')+'|'+(grade.dataset.dias||'')+'|'+(filtro?String(filtro.value||''):''):'';
        const vistos=[],chegadas=[];
        raiz.querySelectorAll('.agenda-compromisso').forEach(comp=>{
            const host=comp.parentElement;
            const titulo=host&&host.title;
            if(!titulo)return;
            const coluna=host.closest('[data-data],[data-dia],[data-date]');
            const dia=coluna?(coluna.dataset.data||coluna.dataset.dia||coluna.dataset.date||''):'';
            const chave='agenda|'+dia+'|'+titulo;
            vistos.push([chave,comp]);
            const st=statusDaClasse(comp,'status-');
            const anterior=estadoAgenda.get(chave);
            estadoAgenda.set(chave,st);
            if(anterior===undefined||anterior===st)return;
            if(st==='confirmado')pulsar(comp,'ks-motion-confirmado');
            else if(STATUS_FALTA.has(st))pulsar(comp,'ks-motion-falta');
            else if(st==='em_recepcao'){
                pulsar(comp,'ks-motion-chegou');
                const nome=((comp.querySelector('.agenda-paciente-nome')||{}).textContent||'').trim();
                const hora=(/(\d{2}:\d{2})\s*[–-]/.exec(titulo)||[])[1]||'';
                chegadas.push({nome,hora});
            }
        });
        // Novo agendamento: mesma semana/dia, 1 ou 2 cartões que não existiam.
        // Mais que isso (ou grade antes vazia) é carga inicial: não anima.
        const chavesAtuais=new Set(vistos.map(([k])=>k));
        if(assinatura&&assinatura===agendaAssinatura&&agendaChaves&&agendaChaves.size>0&&vistos.length>0){
            const novos=vistos.filter(([k])=>!agendaChaves.has(k));
            if(novos.length>=1&&novos.length<=2)novos.forEach(([,comp])=>pulsar(comp,'ks-motion-novo'));
            const sumiram=Array.from(agendaChaves).filter(k=>!chavesAtuais.has(k));
            if(grade&&sumiram.length>=1&&sumiram.length<=2)sumiram.forEach(k=>{const p=agendaPosicoes.get(k);if(p)mostrarHorarioLiberado(grade,p);});
        }
        agendaAssinatura=assinatura;agendaChaves=chavesAtuais;
        // Posição de cada cartão relativa à grade (para marcar o horário liberado depois).
        if(grade){
            const g=grade.getBoundingClientRect(),pos=new Map();
            vistos.forEach(([k,comp])=>{const r=comp.parentElement.getBoundingClientRect();if(r.width&&r.height)pos.set(k,{x:r.left-g.left+grade.scrollLeft,y:r.top-g.top+grade.scrollTop,w:r.width,h:r.height});});
            agendaPosicoes=pos;
        }
        if(chegadas.length)avisarChegada(chegadas);
    }

    function varrerFinanceiro(raiz){
        garantirEscopo();
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
        garantirEscopo();
        raiz.querySelectorAll('.ks-fisio-day-row').forEach(row=>{
            const hora=row.querySelector('.ks-fisio-day-time');
            const nome=row.querySelector('.ks-fisio-day-patient-name');
            if(!hora||!nome)return;
            const horaTxt=((hora.querySelector('strong')||hora).textContent||'').trim();
            // Chave pelo horário (sem o rótulo de status, que muda junto com a situação).
            const chave='dia|'+horaTxt+'|'+nome.textContent.trim();
            if(det.transicao(chave,row.classList.contains('is-current')?'atual':'outro','atual'))pulsar(row,'ks-motion-atual');
            if(det.transicao('espera|'+horaTxt+'|'+nome.textContent.trim(),row.classList.contains('is-waiting')?'espera':'outro','espera')){
                pulsar(row,'ks-motion-chegou');
                avisarChegada([{nome:nome.textContent.trim(),hora:horaTxt}]);
            }
        });
    }

    // ---------- Contadores: números sobem de 0 até o valor real ----------
    // O texto real do elemento NUNCA é alterado: a contagem é uma camada visual
    // (::after com attr(data-ks-motion-valor)) sobre o texto, que fica transparente.
    const CONTADORES_ADMIN=['ks_admin_received','ks_admin_receivable','ks_admin_expenses','ks_admin_attended','ks_admin_occupancy','ks_admin_absences','ks_admin_scheduled','ks_admin_free'];
    const CONTADORES_BALANCO=['fin_bal_receita','fin_bal_despesas','fin_bal_resultado','fin_bal_descontos','fin_bal_qtd_pagamentos','fin_bal_ticket','fin_bal_planos','fin_bal_atendidos','fin_bal_faltas','fin_bal_qtd_despesas'];
    const DURACAO_CONTAGEM_MS=900;
    const NUMERO_BR=/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/;
    const ultimoTexto=new Map();
    const contagens=new Map();

    function lerNumero(texto){
        const m=NUMERO_BR.exec(texto||'');
        if(!m)return null;
        const n=Number(m[0].replace(/\./g,'').replace(',','.'));
        return Number.isFinite(n)?{n,inicio:m.index,fim:m.index+m[0].length}:null;
    }

    function agora(){return root.performance&&root.performance.now?root.performance.now():Date.now();}

    function contar(el){
        if(!el||!el.classList)return false;
        try{
            const anterior=contagens.get(el);if(anterior)anterior();
            const final=(el.textContent||'').trim();
            const info=lerNumero(final);
            if(!info||info.n<=0)return false;
            const prefixo=final.slice(0,info.inicio),sufixo=final.slice(info.fim);
            const formatar=v=>prefixo+Math.floor(v).toLocaleString('pt-BR')+sufixo;
            const cor=root.getComputedStyle?root.getComputedStyle(el).color:'';
            if(cor)el.style.setProperty('--ks-motion-cor',cor);
            el.setAttribute('data-ks-motion-valor',formatar(0));
            el.classList.add('ks-motion-contando');
            const t0=agora();
            let feito=false;
            const fim=()=>{
                if(feito)return;feito=true;contagens.delete(el);
                try{el.classList.remove('ks-motion-contando');el.removeAttribute('data-ks-motion-valor');el.style.removeProperty('--ks-motion-cor');}catch(_){}
            };
            const quadro=root.requestAnimationFrame?root.requestAnimationFrame.bind(root):(fn)=>root.setTimeout(fn,16);
            const passo=()=>{
                if(feito)return;
                if((el.textContent||'').trim()!==final){fim();return;} // o sistema reescreveu: para na hora
                const p=Math.min(1,(agora()-t0)/DURACAO_CONTAGEM_MS);
                if(p>=1){fim();return;}
                el.setAttribute('data-ks-motion-valor',formatar(info.n*(1-Math.pow(1-p,3))));
                quadro(passo);
            };
            quadro(passo);
            root.setTimeout(fim,DURACAO_CONTAGEM_MS+600); // garantia (aba em segundo plano)
            contagens.set(el,fim);
            return true;
        }catch(_){return false;}
    }

    // Conta quando o texto passa a ser um número diferente do último visto
    // (inclui a primeira vez); "—", "••••" e zero não contam.
    function varrerContadores(raiz,ids,forcar){
        garantirEscopo();
        let algum=false;
        ids.forEach(id=>{
            const el=raiz.querySelector('#'+id);
            if(!el)return;
            const txt=(el.textContent||'').trim();
            if(!forcar&&ultimoTexto.get(id)===txt)return;
            ultimoTexto.set(id,txt);
            if(contar(el))algum=true;
        });
        return algum;
    }

    function revelarFluxoAdmin(raiz){
        const canvas=raiz.querySelector('#ks_admin_chart');
        if(canvas)pulsar(canvas,'ks-motion-revelar');
    }

    function varrerPainelAdmin(raiz,forcar){
        const painel=raiz.querySelector('#ks_admin_home');
        if(!painel||painel.hidden)return;
        const recebidoAntes=ultimoTexto.get('ks_admin_received');
        varrerContadores(painel,CONTADORES_ADMIN,forcar);
        const recebido=ultimoTexto.get('ks_admin_received');
        if(lerNumero(recebido)&&(forcar||recebido!==recebidoAntes))revelarFluxoAdmin(painel);
    }

    let balancoVisivel=false;
    function varrerBalanco(raiz){
        const painel=raiz.querySelector('#financeiro_painel_balanco');
        if(!painel)return;
        const visivel=!painel.hidden;
        const abriu=visivel&&!balancoVisivel;
        balancoVisivel=visivel;
        if(visivel)varrerContadores(painel,CONTADORES_BALANCO,abriu);
    }

    // ---------- 21. Abas do prontuário: indicador desliza + tela entra pelo lado ----------
    let abaClicada=null; // {de, para, t, dir}
    function aoClicarAbaProntuario(ev){
        garantirEscopo();
        try{
            const alvo=ev.target&&ev.target.closest?ev.target.closest('#ks_patient_context [data-patient-target]'):null;
            if(!alvo)return;
            const nav=alvo.closest('.ks-patient-tabs');if(!nav)return;
            const botoes=Array.from(nav.querySelectorAll('[data-patient-target]'));
            const de=nav.querySelector('[data-patient-target].active');
            if(!de||de===alvo)return;
            abaClicada={de,para:alvo,nav,t:Date.now(),dir:botoes.indexOf(alvo)>botoes.indexOf(de)?'avancar':'voltar'};
            const r0=de.getBoundingClientRect(),n0=nav.getBoundingClientRect();
            abaClicada.origem={x:r0.left-n0.left+nav.scrollLeft,y:r0.top-n0.top+nav.scrollTop,w:r0.width,h:r0.height};
            esperarAbaAtiva(abaClicada,0);
        }catch(_){ }
    }
    function esperarAbaAtiva(c,tentativas){
        if(abaClicada!==c)return;
        if(!c.para.classList.contains('active')){
            if(tentativas<90)(root.requestAnimationFrame||root.setTimeout)(()=>esperarAbaAtiva(c,tentativas+1));
            return;
        }
        deslizarIndicadorAba(c);
    }
    function deslizarIndicadorAba(c){
        try{
            const doc=root.document,nav=c.nav;
            const r1=c.para.getBoundingClientRect(),n1=nav.getBoundingClientRect();
            const destino={x:r1.left-n1.left+nav.scrollLeft,y:r1.top-n1.top+nav.scrollTop,w:r1.width,h:r1.height};
            const ind=doc.createElement('span');
            ind.className='ks-motion-aba-indicador';ind.setAttribute('aria-hidden','true');
            const o=c.origem;
            ind.style.cssText=`left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px`;
            ind.style.setProperty('--ks-motion-x2',destino.x+'px');
            ind.style.setProperty('--ks-motion-w2',destino.w+'px');
            nav.classList.add('ks-motion-aba-nav');
            c.para.classList.add('ks-motion-aba-chegando');
            nav.appendChild(ind);
            const limpar=()=>{try{ind.remove();nav.classList.remove('ks-motion-aba-nav');c.para.classList.remove('ks-motion-aba-chegando');}catch(_){}};
            ind.addEventListener('animationend',limpar);
            root.setTimeout(limpar,600);
        }catch(_){ }
    }
    function aoAtivarTela(ev){
        try{
            const c=abaClicada;
            if(!c||Date.now()-c.t>2500)return;
            const id=ev&&ev.detail&&ev.detail.id;
            if(!id||id!==c.para.dataset.patientTarget)return;
            const tela=root.document.getElementById(id);
            if(tela)pulsar(tela,c.dir==='avancar'?'ks-motion-tela-avancar':'ks-motion-tela-voltar');
        }catch(_){ }
    }

    // ---------- 22. Evolução: nova sessão entra no topo do histórico ----------
    let historicoEvo=null; // {paciente, total}
    function varrerEvolucao(raiz){
        garantirEscopo();
        const lista=raiz.querySelector('#linha_tempo_evolucoes');
        if(!lista)return;
        const sel=raiz.querySelector('#evo_paciente_select');
        const paciente=sel?String(sel.value||''):'';
        const itens=lista.querySelectorAll(':scope > div');
        const total=itens.length;
        const ant=historicoEvo;historicoEvo={paciente,total};
        if(!ant||!paciente||ant.paciente!==paciente)return;
        if(total===ant.total+1&&itens[0]){
            pulsar(itens[0],'ks-motion-evolucao-nova');
            confirmarSalvo('evolucao');
        }
    }

    // ---------- 24. Pendências clínicas: resolvidas saem riscando ----------
    let pendAnteriores=null; // [{chave, html}]
    function varrerPendencias(raiz){
        garantirEscopo();
        const lista=raiz.id==='lista_pendencias_clinicas'?raiz:raiz.querySelector('#lista_pendencias_clinicas');
        if(!lista)return;
        const itens=Array.from(lista.querySelectorAll(':scope > .ks-home-pending-item'));
        if(lista.querySelector(':scope > .ks-motion-pendencia-saindo'))return; // animação em curso
        const atuais=itens.map(el=>({chave:(el.dataset.homePaciente||'')+'|'+(el.textContent||'').replace(/\s+/g,' ').trim(),html:el.outerHTML}));
        const ant=pendAnteriores;pendAnteriores=atuais;
        if(!ant||!ant.length)return;
        const chavesAtuais=new Set(atuais.map(x=>x.chave));
        const saiu=ant.map((x,i)=>({...x,i})).filter(x=>!chavesAtuais.has(x.chave));
        const novos=atuais.filter(x=>!ant.some(a=>a.chave===x.chave));
        // Só quando itens SAÍRAM (resolvidos) e no máximo 3: recarga completa não anima.
        if(!saiu.length||saiu.length>3||novos.length>saiu.length)return;
        const vazio=lista.querySelector(':scope > .ks-home-empty');
        saiu.forEach(x=>{
            try{
                const t=root.document.createElement('div');t.innerHTML=x.html;
                const fantasma=t.firstElementChild;if(!fantasma)return;
                fantasma.removeAttribute('data-home-paciente');fantasma.removeAttribute('data-home-target');
                fantasma.classList.add('ks-motion-pendencia-saindo');
                fantasma.setAttribute('aria-hidden','true');fantasma.setAttribute('tabindex','-1');fantasma.inert=true;
                const ref=lista.children[x.i]||vazio||null;
                lista.insertBefore(fantasma,ref&&ref.parentNode===lista?ref:null);
                const tirar=()=>{try{fantasma.remove();}catch(_){}};
                fantasma.addEventListener('animationend',ev=>{if(ev.target===fantasma)tirar();});
                root.setTimeout(tirar,1400);
            }catch(_){ }
        });
        const contador=root.document.getElementById('home_pending_total');
        if(contador)pulsar(contador,'ks-motion-contador-baixou');
    }

    // ---------- 25. Botões Salvar: girando enquanto salva; "Salvo" só com confirmação ----------
    let ultimoOcupado=null; // {btn, fim}
    function aoMudarOcupado(muts){
        muts.forEach(m=>{
            const b=m.target;
            if(!b||b.tagName!=='BUTTON')return;
            if(b.getAttribute('aria-busy')==='true')ultimoOcupado={btn:b,fim:0};
            else if(ultimoOcupado&&ultimoOcupado.btn===b&&!ultimoOcupado.fim)ultimoOcupado.fim=Date.now();
        });
    }
    // Confirmação vem de sinais do próprio sistema (evolução nova no histórico,
    // kinesys:avaliacao-salva, kinesys:equipe-salva). Sem sinal, nunca mostra "Salvo".
    // O botão precisa ter acabado de salvar (aria-busy do próprio sistema) e ser do tipo do sinal.
    const BOTAO_DO_SINAL={
        evolucao:b=>b.id==='btn_salvar_evolucao',
        avaliacao:b=>!!b.closest('#tela_avaliacao'),
        equipe:b=>!!b.closest('#tela_equipe,.modal-overlay')
    };
    function confirmarSalvo(sinal){
        garantirEscopo();
        try{
            const u=ultimoOcupado;
            if(!u||!u.btn||!u.btn.isConnected)return;
            if(u.fim&&Date.now()-u.fim>5000)return;
            const ok=BOTAO_DO_SINAL[sinal];
            if(!ok||!ok(u.btn))return;
            const btn=u.btn;
            const aplicar=()=>{
                if(btn.getAttribute('aria-busy')==='true'){root.setTimeout(aplicar,120);return;}
                const cor=root.getComputedStyle?root.getComputedStyle(btn).color:'';
                if(cor)btn.style.setProperty('--ks-motion-cor',cor);
                const estatico=!root.getComputedStyle||root.getComputedStyle(btn).position==='static';
                if(estatico)btn.classList.add('ks-motion-salvo-rel');
                pulsar(btn,'ks-motion-salvo');
                root.setTimeout(()=>{try{if(!btn.classList.contains('ks-motion-salvo'))btn.classList.remove('ks-motion-salvo-rel');}catch(_){}},2300);
                root.setTimeout(()=>{try{if(!btn.classList.contains('ks-motion-salvo'))btn.style.removeProperty('--ks-motion-cor');}catch(_){}},2300);
            };
            aplicar();
            ultimoOcupado=null;
        }catch(_){ }
    }

    function zerarMemoria(){
        det=criarDetector();
        estadoAgenda.clear();agendaAssinatura=null;agendaChaves=null;agendaPosicoes=new Map();navAnterior=null;
        avisados.clear();ultimoTexto.clear();contagens.forEach(fim=>{try{fim();}catch(_){}});
        historicoEvo=null;pendAnteriores=null;ultimoOcupado=null;abaClicada=null;balancoVisivel=false;
        const doc=root.document;
        if(doc)doc.querySelectorAll('#ks_motion_aviso_chegada,.ks-motion-pendencia-saindo,.ks-motion-horario-liberado,.ks-motion-aba-indicador').forEach(el=>{try{el.remove();}catch(_){}});
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
        observar(id('tela_agenda'),varrerAgenda,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-dias','data-periodo']});
        observar(id('tela_financeiro'),(t)=>{varrerFinanceiro(t);varrerBalanco(t);},{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});

        // Início / Meu dia / Panorama da clínica: cascata na primeira entrada após o
        // login, atendimento atual e contadores do administrador a cada entrada.
        const home=id('tela_home');
        if(home){
            observar(home,(h)=>{varrerMeuDia(h);varrerPainelAdmin(h,false);},{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
            let entrou=false,ativa=home.classList.contains('ativa');
            const obsTela=new root.MutationObserver(()=>{
                try{
                    const agoraAtiva=home.classList.contains('ativa');
                    if(agoraAtiva&&!ativa){
                        if(!entrou){entrou=true;pulsar(home,'ks-motion-entrada');}
                        varrerPainelAdmin(home,true);
                    }
                    ativa=agoraAtiva;
                }catch(_){ }
            });
            obsTela.observe(home,{attributes:true,attributeFilter:['class']});
        }

        // 21. Abas do prontuário (o contexto do paciente é criado depois do login).
        doc.addEventListener('click',aoClicarAbaProntuario,true);
        doc.addEventListener('kinesys:tela-ativada',aoAtivarTela);
        // 22. Evolução.
        observar(id('tela_evolucao'),varrerEvolucao,{childList:true,subtree:true});
        // 24. Pendências clínicas na Home (a lista pode ser movida para o detalhe da Home).
        observar(doc.body,()=>{const l=doc.getElementById('lista_pendencias_clinicas');if(l&&!l.dataset.ksMotionObservado){l.dataset.ksMotionObservado='1';observar(l,varrerPendencias,{childList:true});}},{childList:true,subtree:true});
        // 25. Botões Salvar.
        if(typeof root.MutationObserver==='function'){
            new root.MutationObserver(aoMudarOcupado).observe(doc.body,{subtree:true,attributes:true,attributeFilter:['aria-busy']});
        }
        doc.addEventListener('kinesys:avaliacao-salva',()=>confirmarSalvo('avaliacao'));
        root.addEventListener('kinesys:equipe-salva',()=>confirmarSalvo('equipe'));

        // Gráfico da dor: janela de análise criada sob demanda no <body>.
        observar(doc.body,(b)=>{
            const dlg=b.querySelector(':scope > #ks_fisio_evolution_dialog');
            if(dlg&&!dlg.dataset.ksMotionObservado){
                dlg.dataset.ksMotionObservado='1';
                observar(dlg,(d)=>d.querySelectorAll('svg.ks-fisio-evolution-chart').forEach(desenharGrafico),{childList:true,subtree:true});
            }
        },{childList:true});
    }

    root.KineSysMotion=Object.freeze({criarDetector,pulsar,desligado,contar,_varrer:{exame:varrerExame,agenda:varrerAgenda,financeiro:varrerFinanceiro,meuDia:varrerMeuDia,grafico:desenharGrafico,painelAdmin:varrerPainelAdmin,balanco:varrerBalanco,evolucao:varrerEvolucao,pendencias:varrerPendencias},_confirmarSalvo:confirmarSalvo,_aoMudarOcupado:aoMudarOcupado});

    try{
        if(root.document&&root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>{try{iniciar();}catch(_){}});
        else if(root.document)iniciar();
    }catch(_){ }
})(typeof window!=='undefined'?window:globalThis);
