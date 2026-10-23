/* Exame complementar: registro profissional, origem explícita e vínculo canônico opcional. */
(function(){
    'use strict';
    if(window.KineSysExameLivre)return;
    const clone=v=>JSON.parse(JSON.stringify(v));
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
    const resultadoValido=v=>['positivo','negativo','inconclusivo'].includes(v);
    const identidade=()=>JSON.stringify(window.obterContextoAvaliacaoKineSys?.()||{});
    const fingerprint=()=>String(window.fingerprintContextoExameKineSys?.()||'');
    const banco=()=>typeof BANCO_MAPEAMENTO_CLINICO==='undefined'?{}:BANCO_MAPEAMENTO_CLINICO;
    let dono=identidade(),estado={versao:1,registros:[],rascunho:{}},sequencia=0;
    const node=id=>document.getElementById(id);
    function conferir(){if(dono!==identidade()){dono=identidade();estado={versao:1,registros:[],rascunho:{}};limparCampos();const regiao=node('ks_exame_livre_regiaoId');if(regiao)regiao.value='';renderLista();return false;}return true;}
    function catalogo(regiaoId){
        const regiao=banco()[regiaoId];if(!regiao)return[];
        return ['clusters','diferenciais'].flatMap(grupo=>(regiao[grupo]||[]).flatMap(item=>(item.testes||[]).map((texto,indice)=>({
            chave:`${grupo}::${item.id}::${indice}`,regiaoId,regiao:regiao.nome,grupo:grupo==='clusters'?'cluster':'diferencial',id:item.id,nome:item.nome,indice,texto
        }))));
    }
    function resolver(registro){return catalogo(registro.regiaoId).find(t=>t.chave===registro.vinculo&&(!registro.criterioCatalogo||registro.criterioCatalogo===t.texto))||null;}
    function limparCampos(){['texto','resultado','vinculo','lado'].forEach(chave=>{const el=node('ks_exame_livre_'+chave);if(el)el.value='';});}
    function lerCampos(){return Object.fromEntries(['regiaoId','texto','resultado','vinculo','lado'].map(chave=>[chave,node('ks_exame_livre_'+chave)?.value||'']));}
    function registro(r,id){return {...clone(r),id,regiao:banco()[r.regiaoId]?.nome||r.regiao||'Região não especificada',resultado:resultadoValido(r.resultado)?r.resultado:'descritivo'};}
    function coletar(){conferir();return clone(estado);}
    function registros(){
        conferir();const itens=clone(estado.registros);
        if(String(estado.rascunho?.texto||'').trim())itens.push(registro({...estado.rascunho,rascunho:true},'rascunho-exame-livre'));
        return itens;
    }
    function preencher(value){
        dono=identidade();estado=value&&typeof value==='object'?clone(value):{};
        estado.versao=1;estado.registros=Array.isArray(estado.registros)?estado.registros.filter(r=>r&&typeof r.texto==='string'):[];
        estado.rascunho=estado.rascunho&&typeof estado.rascunho==='object'?estado.rascunho:{};
        limparCampos();atualizarOpcoes();
        ['regiaoId','texto','resultado','vinculo','lado'].forEach(chave=>{const el=node('ks_exame_livre_'+chave);if(el)el.value=estado.rascunho[chave]||'';if(chave==='regiaoId')atualizarVinculos();});
        renderLista();
    }
    function adicionar(value){
        if(!conferir())return false;const anterior=estado.rascunho||{},r=registro({...anterior,...value},anterior.id||'exame-livre-'+Date.now()+'-'+(++sequencia));
        if(!r.texto.trim())return false;
        r.contextoExameFingerprint=fingerprint();r.registradoEm=anterior.registradoEm||new Date().toISOString();r.atualizadoEm=new Date().toISOString();delete r.rascunho;
        r.criterioCatalogo=resolver(r)?.texto||'';
        estado.registros.push(r);estado.rascunho={};limparCampos();renderLista();notificar();window.atualizarMotorClinico3KineSys?.(true);return clone(r);
    }
    function notificar(){
        window.agendarAutosaveKineSys?.();
        document.dispatchEvent(new CustomEvent('kinesys:exame-livre-alterado'));
    }
    function atualizarVinculos(){
        const select=node('ks_exame_livre_vinculo');if(!select)return;
        const atual=select.value;select.replaceChildren(new Option('Sem vínculo ao catálogo',''));
        catalogo(node('ks_exame_livre_regiaoId')?.value).forEach(t=>select.appendChild(new Option(t.nome+' — '+t.texto,t.chave)));
        if(Array.from(select.options).some(o=>o.value===atual))select.value=atual;
    }
    function atualizarOpcoes(){
        const select=node('ks_exame_livre_regiaoId');if(!select)return;
        const atual=select.value||estado.rascunho.regiaoId||'';
        select.replaceChildren(new Option('Sem região definida',''));
        Object.entries(banco()).forEach(([id,r])=>select.appendChild(new Option(r.nome||id,id)));
        if(Array.from(select.options).some(o=>o.value===atual))select.value=atual;
        atualizarVinculos();
    }
    function conflitosTexto(r,t){
        const texto=norm(r.texto),teste=norm(t.texto),semLado=!r.lado||r.lado==='nao_informado';
        // Texto livre não substitui a descrição operacional completa de um critério.
        // Só integra o catálogo quando o profissional confirma o vínculo e o resultado.
        return (r.resultado==='positivo'&&/\b(?:negativo|nao realizado|nao foi realizado|nao testado|nao se realizou)\b/.test(texto))||
            (r.resultado==='negativo'&&/\bpositivo\b/.test(texto))||
            (!semLado&&r.lado==='direito'&&/\besquerd[oa]\b/.test(texto))||(!semLado&&r.lado==='esquerdo'&&/\bdireit[oa]\b/.test(texto))||
            !teste;
    }
    function situacao(r){
        const t=resolver(r);
        if(r.rascunho)return {tipo:'rascunho',mensagem:'Texto em preenchimento: incluído como descrição, sem confirmar critérios.'};
        if(!t||!resultadoValido(r.resultado))return {tipo:'descritivo',mensagem:'Achado descritivo: preservado no relatório, sem confirmar critérios do catálogo.'};
        if(r.contextoExameFingerprint!==fingerprint())return {tipo:'revisar',mensagem:'A história clínica mudou. Revise o vínculo antes de usá-lo na correlação.'};
        if(conflitosTexto(r,t))return {tipo:'divergente',mensagem:'Texto, lado ou resultado divergentes: confira o registro; sem conclusão automática.'};
        const pares=estado.registros.filter(x=>x.id!==r.id&&x.regiaoId===r.regiaoId&&x.vinculo===r.vinculo&&x.lado===r.lado);
        if(pares.some(x=>resultadoValido(x.resultado)&&x.resultado!==r.resultado))return {tipo:'divergente',mensagem:'Há resultados divergentes para o mesmo teste e lado; revise antes de concluir.'};
        // Resultados sem lado ou bilaterais são documentados, não fundidos a um cluster sem lateralidade.
        if(!['direito','esquerdo'].includes(r.lado))return {tipo:'descritivo',mensagem:'Defina o lado para integrar o critério; o registro permanece no relatório.'};
        if(estado.registros.some(x=>x.regiaoId===r.regiaoId&&resolver(x)?.id===t.id&&['direito','esquerdo'].includes(x.lado)&&x.lado!==r.lado))return {tipo:'descritivo',mensagem:'Foram registrados lados diferentes: preservados separadamente, sem somar critérios entre lados.'};
        const guiado=typeof coletorBase==='function'?(coletorBase()||[]).find(e=>e.regiaoId===r.regiaoId&&e.id===t.id):null;
        if(guiado&&!guiado.lado){
            const resposta=guiado.achados?.[t.indice]?.resultado;
            if(resultadoValido(resposta)&&resposta!==r.resultado)return {tipo:'divergente',mensagem:'O resultado livre diverge do exame guiado. Confira o lado e o resultado antes de concluir.'};
            return {tipo:'descritivo',mensagem:'Complementa o exame guiado: não soma critérios sem lado registrado no exame original.'};
        }
        return {tipo:'vinculado',mensagem:'Vinculado a '+t.nome+'; resultado '+r.resultado+'.'};
    }
    function integrar(base){
        const saida=clone(base||[]),selecionadas=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(el=>el.dataset.regiao);
        registros().forEach(r=>{
            if(situacao(r).tipo!=='vinculado'||!selecionadas.includes(r.regiaoId))return;
            const t=resolver(r);
            // Mantém lado como eixo independente: nunca soma positivos do lado oposto.
            const existentes=saida.filter(e=>e.regiaoId===r.regiaoId&&e.id===t.id);
            if(existentes.some(e=>e.lado&&e.lado!==r.lado))return;
            let eixo=existentes.find(e=>e.lado===r.lado);
            // Não combina um resultado livre unilateral com critérios guiados sem lado registrado.
            if(!eixo&&existentes.some(e=>!e.lado))return;
            if(!eixo){
                eixo={id:t.id,nome:t.nome,regiaoId:r.regiaoId,regiao:t.regiao,grupo:t.grupo,lado:r.lado,origem:'exameLivre',
                    achados:catalogo(r.regiaoId).filter(x=>x.id===t.id&&x.grupo===t.grupo).map(x=>({texto:x.texto,resultado:'nao_avaliado'}))};
                saida.push(eixo);
            }
            const atual=eixo.achados[t.indice];
            if(atual&&resultadoValido(atual.resultado)&&atual.resultado!==r.resultado){
                eixo.divergenciaExameLivre=true;
                eixo.achados[t.indice]={...atual,resultado:'inconclusivo',origensLivres:[...(atual.origensLivres||[]),r.id]};
            }else if(atual&&!eixo.divergenciaExameLivre)eixo.achados[t.indice]={...atual,resultado:r.resultado,origensLivres:[...(atual.origensLivres||[]),r.id]};
        });return saida;
    }
    function renderLista(){
        const lista=node('ks_exame_livre_registros');if(!lista)return;lista.replaceChildren();
        estado.registros.forEach(r=>{
            const row=document.createElement('article');row.className='ks-free-exam-record';
            const title=document.createElement('strong');title.textContent=[r.regiao,r.lado&&r.lado!=='nao_informado'?r.lado:'',r.resultado==='descritivo'?'Descrição':r.resultado].filter(Boolean).join(' · ');
            const texto=document.createElement('p');texto.textContent=r.texto;
            const status=document.createElement('small');status.textContent=situacao(r).mensagem;
            const remove=document.createElement('button');remove.type='button';remove.className='btn-secondary';remove.textContent='Editar registro';
            remove.addEventListener('click',()=>{
                if(!conferir())return;
                if(node('ks_exame_livre_texto')?.value.trim()){node('ks_exame_livre_status').textContent='Adicione o texto em preenchimento antes de editar outro registro.';return;}
                estado.registros=estado.registros.filter(x=>x.id!==r.id);estado.rascunho=clone(r);preencher(estado);notificar();node('ks_exame_livre_texto')?.focus();
            });
            row.append(title,texto,status,remove);lista.appendChild(row);
        });
    }
    function inicializar(){
        const root=node('ks_exame_livre');if(!root||root.dataset.bound==='1')return;root.dataset.bound='1';
        node('ks_exame_livre_atalho')?.addEventListener('click',()=>{node('ks_exame_livre_texto')?.focus();});
        atualizarOpcoes();
        root.addEventListener('input',e=>{if(!e.target.id?.startsWith('ks_exame_livre_'))return;conferir();estado.rascunho={...estado.rascunho,...lerCampos()};notificar();});
        root.addEventListener('change',e=>{conferir();if(e.target.id==='ks_exame_livre_regiaoId')atualizarVinculos();estado.rascunho={...estado.rascunho,...lerCampos()};notificar();});
        node('ks_exame_livre_adicionar')?.addEventListener('click',()=>{
            if(adicionar(lerCampos()))node('ks_exame_livre_status').textContent='Registro adicionado ao exame e à base do relatório.';
            else{node('ks_exame_livre_status').textContent='Descreva o teste ou achado realizado.';node('ks_exame_livre_texto')?.focus();}
        });
        const preservado=typeof clinicaEstruturadaPreservada!=='undefined'?clinicaEstruturadaPreservada?.exameLivre:null;
        preencher(preservado||estado);
        posicionarRadar();
    }
    function posicionarRadar(){
        const etapa=document.querySelector?.('#tela_avaliacao .subtela.ativa')?.id||'subtela_triagem';
        const destino={subtela_triagem:'ks_radar_hma_host',subtela_mapeamento:'ks_radar_exam_host',subtela_diagnostico:'ks_radar_report_host'}[etapa];
        const host=node(destino),radar=node('radar_flutuante_container');
        if(host&&radar&&radar.parentElement!==host){window.fecharRadarKineSys?.();host.appendChild(radar);}
    }
    const coletorBase=window.coletarAchadosLaudoKineSys;
    if(typeof coletorBase==='function')window.coletarAchadosLaudoKineSys=()=>integrar(coletorBase());
    const documentar=()=>registros().map(r=>({...r,referencia:resolver(r),situacao:situacao(r)}));
    window.KineSysExameLivre={coletar,preencher,registros,documentar,adicionar,integrar,situacao,catalogo,inicializar,atualizarOpcoes};
    window.posicionarRadarAvaliacaoKineSys=posicionarRadar;
    document.addEventListener('kinesys:motor3-plano-atualizado',()=>{atualizarOpcoes();renderLista();});
    document.addEventListener('kinesys:tela-dom-pronta',e=>{if(e.detail?.id==='tela_avaliacao')inicializar();});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inicializar,{once:true});else inicializar();
})();
