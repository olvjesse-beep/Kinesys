'use strict';

/* Phase 4S — helpers de apresentação/formatação de documentos.
 * Sem persistência, Supabase, autorização ou regra clínica.
 */

let documentoVisualAtualKineSys = null;

/* A mesma árvore A4 é exibida e impressa. O iframe isola o documento das
 * fontes, grids e margens do aplicativo; reduzir a prévia não reflui o texto. */
function montarDocumentoComTimbrado(htmlConteudo) {
    const documento = document.getElementById('documento_impressao');
    const container = document.getElementById('preview_relatorio_container');
    if (!documento || !container) return;
    documentoVisualAtualKineSys?.observador?.disconnect();
    documentoVisualAtualKineSys?.espelho?.remove();
    const estado = { elemento: documento, frame: null, pronto: null, observador: null, espelho: null };
    documentoVisualAtualKineSys = estado;
    documento.replaceChildren();
    const frame = document.createElement('iframe');
    estado.frame = frame;
    frame.className = 'documento-preview-frame';
    frame.title = 'Prévia paginada do documento A4';
    frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
    container.style.display = 'block';
    const estilo = new URL('styles/design_base.css?documento=20261103-r2', document.baseURI).href;
    const arte = new URL('assets/timbrado-fisiofix.png', document.baseURI).href;
    estado.pronto = new Promise((resolve, reject) => {
        const prazo = setTimeout(() => {
            if (documentoVisualAtualKineSys === estado) documento.textContent = 'A prévia não terminou de carregar. Gere o documento novamente para tentar de novo.';
            reject(new Error('Tempo excedido ao preparar o documento.'));
        }, 20000);
        frame.addEventListener('load', async () => {
            try {
                const doc = frame.contentDocument;
                await doc.fonts?.ready;
                const css = doc.querySelector('link[rel="stylesheet"]');
                if (!css?.sheet) throw new Error('O estilo do documento não carregou.');
                paginarDocumentoKineSys(doc, htmlConteudo, arte);
                await Promise.all([...doc.images].map(img => img.decode()));
                clearTimeout(prazo);
                if (documentoVisualAtualKineSys !== estado || !frame.isConnected) return resolve(null);
                estado.espelho = criarEspelhoImpressaoDocumentoKineSys(doc);
                const ajustar = () => {
                    if (documentoVisualAtualKineSys !== estado) return;
                    const largura = doc.body.getBoundingClientRect().width;
                    const altura = Math.ceil(doc.body.scrollHeight);
                    const escala = Math.min(1, documento.clientWidth / largura);
                    frame.style.height = altura + 'px';
                    frame.style.transform = `scale(${escala})`;
                    documento.style.height = Math.ceil(altura * escala) + 'px';
                };
                ajustar();
                if (typeof ResizeObserver !== 'undefined') {
                    estado.observador = new ResizeObserver(ajustar);
                    estado.observador.observe(documento);
                }
                resolve(frame.contentWindow);
            } catch (erro) {
                clearTimeout(prazo);
                if (documentoVisualAtualKineSys === estado) {
                    documento.textContent = 'Não foi possível preparar a prévia. Gere o documento novamente antes de imprimir.';
                }
                reject(erro);
            }
        }, { once: true });
    });
    // A rejeição continua disponível ao botão Imprimir, sem erro não tratado.
    estado.pronto.catch(erro => console.warn('KineSys: prévia documental indisponível.', erro));
    frame.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Documento FisioFix</title><link rel="stylesheet" href="${estilo}"></head><body class="ks-documento-paginado"></body></html>`;
    documento.appendChild(frame);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function paginarDocumentoKineSys(doc, htmlConteudo, arte) {
    const origem = doc.createElement('div');
    origem.innerHTML = htmlConteudo;
    // Documentos gerados não precisam de conteúdo ativo na folha.
    origem.querySelectorAll('script,iframe,object,embed,link,style').forEach(el => el.remove());
    origem.querySelectorAll('*').forEach(el => [...el.attributes].forEach(attr => {
        if (/^on/i.test(attr.name) || /^(?:href|src)$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }));
    const blocos = [...origem.childNodes].flatMap(no =>
        no.nodeType === 1 && no.matches('.doc-secao') ? [...no.childNodes] : [no]
    ).filter(no => no.nodeType !== 3 || no.textContent.trim());
    let conteudo;
    const novaPagina = () => {
        const folha = doc.createElement('article');
        folha.className = 'documento-timbrado';
        folha.setAttribute('aria-label', `Página ${doc.body.children.length + 1}`);
        const fundo = doc.createElement('img');
        fundo.className = 'timbrado-fundo'; fundo.src = arte; fundo.alt = '';
        // Imagem branca também é impressa com gráficos de fundo desativados.
        const mascara = doc.createElement('img');
        mascara.className = 'timbrado-mascara'; mascara.alt = '';
        mascara.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3Cpath fill="white" d="M0 0h1v1H0z"/%3E%3C/svg%3E';
        conteudo = doc.createElement('div'); conteudo.className = 'timbrado-conteudo';
        folha.append(fundo, mascara, conteudo); doc.body.appendChild(folha);
        return conteudo;
    };
    const cabe = () => conteudo.scrollHeight <= conteudo.clientHeight + 1;
    const temTexto = () => !!conteudo.textContent.trim();
    const seguirPagina = () => {
        const anterior = conteudo.lastElementChild;
        const titulo = anterior?.matches('h1,h2,h3,h4,.doc-secao-titulo') ? anterior : null;
        if (titulo) titulo.remove();
        if (temTexto()) novaPagina();
        if (titulo) conteudo.appendChild(titulo);
    };
    novaPagina();
    for (const bloco of blocos) {
        let no = bloco.cloneNode(true);
        conteudo.appendChild(no);
        if (cabe()) continue;
        no.remove();
        if (temTexto()) seguirPagina();
        conteudo.appendChild(no);
        if (cabe()) continue;
        no.remove();
        if (no.nodeType === 1 && no.matches('table')) {
            const linhas = [...no.querySelectorAll('tbody > tr')];
            if (linhas.length) {
                let tabela, corpo;
                const iniciarTabela = () => {
                    tabela = no.cloneNode(true);
                    tabela.querySelectorAll('tbody > tr').forEach(tr => tr.remove());
                    corpo = tabela.tBodies[0] || tabela.appendChild(doc.createElement('tbody'));
                    conteudo.appendChild(tabela);
                };
                iniciarTabela();
                for (const linha of linhas) {
                    const tr = linha.cloneNode(true); corpo.appendChild(tr);
                    if (cabe()) continue;
                    tr.remove();
                    if (!corpo.children.length) throw new Error('Uma linha da tabela excede a área A4.');
                    seguirPagina(); iniciarTabela(); corpo.appendChild(tr);
                    if (!cabe()) throw new Error('Uma linha da tabela excede a área A4.');
                }
                continue;
            }
        }
        if (no.nodeType !== 1 || !no.matches('p,div,li') || no.matches('.fechamento-documento') || !no.textContent.trim()) {
            throw new Error('Um bloco do documento excede a área A4.');
        }
        // Parágrafos maiores que uma folha são divididos em limites de palavras,
        // preservando texto e marcação inline através de Range, nunca reticências.
        const texto = no.textContent;
        const limites = [...texto.matchAll(/\S+\s*/g)].map(m => m.index + m[0].length);
        let inicio = 0;
        while (inicio < texto.length) {
            let esquerda = 0, direita = limites.length - 1, fim = -1;
            while (esquerda <= direita) {
                const meio = Math.floor((esquerda + direita) / 2);
                const candidato = limites[meio];
                if (candidato <= inicio) { esquerda = meio + 1; continue; }
                const parte = fatiarTextoDocumentoKineSys(doc, no, inicio, candidato);
                conteudo.appendChild(parte);
                const coube = cabe(); parte.remove();
                if (coube) { fim = candidato; esquerda = meio + 1; } else direita = meio - 1;
            }
            if (fim <= inicio) throw new Error('Um trecho do documento não cabe na área A4.');
            conteudo.appendChild(fatiarTextoDocumentoKineSys(doc, no, inicio, fim));
            inicio = fim;
            if (inicio < texto.length) seguirPagina();
        }
    }
    return doc.body.children.length;
}

function fatiarTextoDocumentoKineSys(doc, no, inicio, fim) {
    const textos = doc.createTreeWalker(no, 4);
    const range = doc.createRange();
    let cursor = 0, atual, comecou = false;
    while ((atual = textos.nextNode())) {
        const proximo = cursor + atual.textContent.length;
        if (!comecou && inicio < proximo) { range.setStart(atual, Math.max(0, inicio - cursor)); comecou = true; }
        if (comecou && fim <= proximo) { range.setEnd(atual, fim - cursor); break; }
        cursor = proximo;
    }
    const parte = no.cloneNode(false); parte.appendChild(range.cloneContents());
    return parte;
}

async function obterDocumentoProntoParaImpressaoKineSys() {
    const estado = documentoVisualAtualKineSys;
    const preview = document.getElementById('preview_relatorio_container');
    if (!estado || !documentoEstaVisivelKineSys(preview)) throw new Error('Gere a prévia antes de imprimir.');
    const janela = await estado.pronto;
    if (!janela || documentoVisualAtualKineSys !== estado || !estado.frame.isConnected) throw new Error('A prévia mudou. Confira o documento atual.');
    return { janela, atual: () => documentoVisualAtualKineSys === estado && estado.frame.isConnected && documentoEstaVisivelKineSys(preview) };
}

function documentoEstaVisivelKineSys(preview) {
    const tela = preview?.closest('.tela');
    return !!preview && preview.style.display !== 'none' && (!tela || tela.classList.contains('ativa'));
}

/* Ctrl+P/menu do navegador também recebe as MESMAS páginas, num ShadowRoot
 * sem os estilos do aplicativo. O botão usa diretamente a janela da prévia. */
function criarEspelhoImpressaoDocumentoKineSys(doc) {
    const host = document.createElement('div');
    host.id = 'ks_documento_impressao';
    host.style.display = 'none';
    host.setAttribute('aria-hidden', 'true');
    const sombra = host.attachShadow({ mode: 'open' });
    const estilo = document.createElement('style');
    estilo.textContent = [...doc.styleSheets].flatMap(sheet => [...sheet.cssRules].map(rule => rule.cssText)).join('\n');
    const paginas = document.createElement('div'); paginas.className = 'ks-documento-paginado';
    [...doc.body.children].forEach(folha => paginas.appendChild(folha.cloneNode(true)));
    sombra.append(estilo, paginas); document.body.appendChild(host);
    return host;
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeprint', () => {
        const preview = document.getElementById('preview_relatorio_container');
        if (documentoVisualAtualKineSys?.espelho?.isConnected && documentoEstaVisivelKineSys(preview)) {
            document.body.setAttribute('data-ks-documento-impressao', 'true');
        }
    });
    window.addEventListener('afterprint', () => document.body.removeAttribute('data-ks-documento-impressao'));
}

function endpointGemini(modelo) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
}

function minutosEntreHoras(inicio,fim){if(!inicio||!fim)return null;const [hi,mi]=inicio.split(':').map(Number),[hf,mf]=fim.split(':').map(Number);const n=(hf*60+mf)-(hi*60+mi);return n>0?n:null;}

function atualizarDuracaoComparecimento(){const i=document.getElementById('rel_comp_entrada')?.value,f=document.getElementById('rel_comp_saida')?.value,el=document.getElementById('rel_comp_duracao');if(!el)return;const m=minutosEntreHoras(i,f);el.value=m==null?'':`${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}min`;}

document.addEventListener('change',e=>{if(['rel_comp_entrada','rel_comp_saida'].includes(e.target?.id))atualizarDuracaoComparecimento();});

function formatarDataBR(v){if(!v)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [a,m,d]=v.split('-');return `${d}/${m}/${a}`;}return v;}
