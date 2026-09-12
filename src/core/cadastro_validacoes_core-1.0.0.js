/* KineSys — Cadastro Validations Core 1.0.0
 * Extraído de src/core/script-1.18.0.js preservando nomes, validações e fluxo de CEP.
 */
'use strict';

function somenteDigitos(valor) {
    return (valor || "").replace(/\D/g, "");
}

/* ================= 9.1 VALIDAÇÕES CADASTRAIS — v1.8.2 =================
   Campos continuam opcionais quando já eram opcionais, porém, se preenchidos,
   precisam estar completos e consistentes antes do prontuário ser salvo.
   ========================================================================== */
function formatarCPF(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

function formatarCEP(valor) {
    const d = somenteDigitos(valor).slice(0, 8);
    return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

function formatarTelefoneBR(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function cpfValido(valor) {
    const cpf = somenteDigitos(valor);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const calcular = (base, pesoInicial) => {
        let soma = 0;
        for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };
    const d1 = calcular(cpf.slice(0, 9), 10);
    const d2 = calcular(cpf.slice(0, 10), 11);
    return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function cepValido(valor) {
    const cep = somenteDigitos(valor);
    return cep.length === 8 && !/^0{8}$/.test(cep);
}

function telefoneBRValido(valor) {
    const tel = somenteDigitos(valor);
    if (!tel) return true; // campo opcional
    if (![10, 11].includes(tel.length)) return false;
    if (/^(\d)\1+$/.test(tel)) return false;
    return tel.slice(0, 2) !== '00';
}

function definirEstadoCampo(id, valido, mensagem = '') {
    const input = document.getElementById(id);
    if (!input) return valido;
    const grupo = input.closest('.input-group');
    const erro = document.getElementById(id + '_erro');
    if (grupo) {
        grupo.classList.toggle('has-error', valido === false);
        grupo.classList.toggle('has-success', valido === true && !!String(input.value || '').trim());
    }
    input.setAttribute('aria-invalid', valido === false ? 'true' : 'false');
    if (erro) {
        erro.textContent = valido === false ? mensagem : '';
        erro.classList.toggle('show', valido === false);
    }
    return valido;
}

function limparEstadoCampo(id) {
    const input = document.getElementById(id);
    if (!input) return;
    const grupo = input.closest('.input-group');
    const erro = document.getElementById(id + '_erro');
    if (grupo) grupo.classList.remove('has-error', 'has-success');
    input.setAttribute('aria-invalid', 'false');
    if (erro) { erro.textContent = ''; erro.classList.remove('show'); }
}

function validarCPFInput(id, { obrigatorio = false } = {}) {
    const el = document.getElementById(id);
    if (!el) return true;
    const d = somenteDigitos(el.value);
    if (!d) return obrigatorio ? definirEstadoCampo(id, false, 'CPF inválido: informe os 11 números.') : (limparEstadoCampo(id), true);
    if (d.length !== 11) return definirEstadoCampo(id, false, `CPF inválido: informe 11 números. Foram digitados ${d.length}.`);
    if (!cpfValido(d)) return definirEstadoCampo(id, false, 'CPF inválido: verifique os números e os dígitos verificadores.');
    el.value = formatarCPF(d);
    return definirEstadoCampo(id, true);
}

function validarCEPInput(id, { obrigatorio = false } = {}) {
    const el = document.getElementById(id);
    if (!el) return true;
    const d = somenteDigitos(el.value);
    if (!d) return obrigatorio ? definirEstadoCampo(id, false, 'CEP inválido: informe os 8 números.') : (limparEstadoCampo(id), true);
    if (d.length !== 8) return definirEstadoCampo(id, false, `CEP inválido: informe 8 números. Foram digitados ${d.length}.`);
    if (!cepValido(d)) return definirEstadoCampo(id, false, 'CEP inválido: revise a numeração informada.');
    el.value = formatarCEP(d);
    return definirEstadoCampo(id, true);
}



/* ================= CEP INTELIGENTE (v1.8.2) =================
   Consulta endereço automaticamente após 8 dígitos.
   Provedor primário: ViaCEP. Fallback: BrasilAPI.
   A indisponibilidade da consulta NÃO bloqueia o cadastro; CEP inexistente, sim.
   ============================================================ */
const cacheCEP = new Map();
let consultaCEPController = null;
let ultimoCEPPesquisado = '';

function definirUltimoCEPPesquisadoKineSys(valor = '') {
    ultimoCEPPesquisado = somenteDigitos(valor);
}

function definirStatusCEP(tipo = '', mensagem = '') {
    const el = document.getElementById('cad_cep_status');
    if (!el) return;
    el.className = 'field-status' + (tipo ? ` show ${tipo}` : '');
    el.textContent = mensagem || '';
}

function montarEnderecoBaseCEP(dados) {
    if (!dados) return '';
    const logradouro = (dados.logradouro || dados.street || '').trim();
    const bairro = (dados.bairro || dados.neighborhood || '').trim();
    const cidade = (dados.localidade || dados.city || '').trim();
    const uf = (dados.uf || dados.state || '').trim();
    const partes = [];
    if (logradouro) partes.push(logradouro);
    if (bairro) partes.push(bairro);
    const cidadeUf = [cidade, uf].filter(Boolean).join(' - ');
    if (cidadeUf) partes.push(cidadeUf);
    return partes.join(', ');
}

async function buscarCEPViaCEP(cep) {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: consultaCEPController ? consultaCEPController.signal : undefined,
        headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error(`ViaCEP HTTP ${resp.status}`);
    const dados = await resp.json();
    if (dados && dados.erro === true) {
        const erro = new Error('CEP não encontrado');
        erro.codigo = 'CEP_NAO_ENCONTRADO';
        throw erro;
    }
    return dados;
}

function buscarCEPViaJSONP(cep) {
    // Fallback para cenários em que o KineSys é aberto diretamente como arquivo local
    // e o navegador bloqueia fetch/CORS. O ViaCEP oferece callback JSONP oficialmente.
    return new Promise((resolve, reject) => {
        const callbackName = `kinesysViaCEP_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const script = document.createElement('script');
        const timeout = setTimeout(() => finalizar(new Error('ViaCEP JSONP timeout')), 7000);
        let concluido = false;
        function finalizar(erro, dados) {
            if (concluido) return;
            concluido = true;
            clearTimeout(timeout);
            try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
            script.remove();
            if (erro) reject(erro); else resolve(dados);
        }
        window[callbackName] = (dados) => {
            if (dados && dados.erro === true) {
                const erro = new Error('CEP não encontrado');
                erro.codigo = 'CEP_NAO_ENCONTRADO';
                finalizar(erro);
                return;
            }
            finalizar(null, dados || {});
        };
        script.onerror = () => finalizar(new Error('Falha ao carregar ViaCEP JSONP'));
        script.src = `https://viacep.com.br/ws/${cep}/json/?callback=${callbackName}`;
        document.head.appendChild(script);
    });
}

async function buscarCEPBrasilAPI(cep) {
    const resp = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
        signal: consultaCEPController ? consultaCEPController.signal : undefined,
        headers: { 'Accept': 'application/json' }
    });
    if (resp.status === 404) {
        const erro = new Error('CEP não encontrado');
        erro.codigo = 'CEP_NAO_ENCONTRADO';
        throw erro;
    }
    if (!resp.ok) throw new Error(`BrasilAPI HTTP ${resp.status}`);
    return await resp.json();
}

async function consultarCEPAutomaticamente({ forcar = false } = {}) {
    const cepEl = document.getElementById('cad_cep');
    const enderecoEl = document.getElementById('cad_endereco');
    if (!cepEl || !enderecoEl) return false;

    const cep = somenteDigitos(cepEl.value);
    if (cep.length !== 8 || !cepValido(cep)) {
        definirStatusCEP('', '');
        return false;
    }

    if (!forcar && cep === ultimoCEPPesquisado && cacheCEP.has(cep)) {
        const dados = cacheCEP.get(cep);
        const endereco = montarEnderecoBaseCEP(dados);
        if (endereco) {
            enderecoEl.value = endereco;
            enderecoEl.dataset.preenchidoPorCep = '1';
            enderecoEl.dataset.cepBase = endereco;
            definirStatusCEP('success', '✓ Endereço preenchido pelo CEP. Acrescente apenas número e complemento.');
            return true;
        }
    }

    if (consultaCEPController) consultaCEPController.abort();
    consultaCEPController = new AbortController();
    ultimoCEPPesquisado = cep;
    definirStatusCEP('loading', 'Consultando endereço do CEP…');

    let dados = null;
    let naoEncontradoConfirmado = false;

    try {
        try {
            dados = await buscarCEPViaCEP(cep);
        } catch (erroViaCEP) {
            if (erroViaCEP?.name === 'AbortError') return false;
            if (erroViaCEP?.codigo === 'CEP_NAO_ENCONTRADO') naoEncontradoConfirmado = true;

            // 2ª tentativa: JSONP do próprio ViaCEP. É especialmente útil quando o
            // sistema é executado como arquivo local e o navegador restringe fetch/CORS.
            try {
                dados = await buscarCEPViaJSONP(cep);
                naoEncontradoConfirmado = false;
            } catch (erroJSONP) {
                if (erroJSONP?.codigo === 'CEP_NAO_ENCONTRADO') naoEncontradoConfirmado = true;

                // 3ª tentativa: BrasilAPI.
                try {
                    dados = await buscarCEPBrasilAPI(cep);
                    naoEncontradoConfirmado = false;
                } catch (erroBrasilAPI) {
                    if (erroBrasilAPI?.name === 'AbortError') return false;
                    if (erroBrasilAPI?.codigo === 'CEP_NAO_ENCONTRADO') {
                        naoEncontradoConfirmado = true;
                    } else if (!naoEncontradoConfirmado) {
                        throw erroBrasilAPI;
                    }
                }
            }
        }

        if (!dados && naoEncontradoConfirmado) {
            definirEstadoCampo('cad_cep', false, 'CEP inválido: não foi encontrado nas bases consultadas.');
            definirStatusCEP('', '');
            // Só limpa se o endereço foi preenchido automaticamente anteriormente.
            if (enderecoEl.dataset.preenchidoPorCep === '1') {
                enderecoEl.value = '';
                delete enderecoEl.dataset.preenchidoPorCep;
                delete enderecoEl.dataset.cepBase;
            }
            return false;
        }
        if (!dados) throw new Error('Consulta sem resposta');

        cacheCEP.set(cep, dados);
        const endereco = montarEnderecoBaseCEP(dados);
        cepEl.value = formatarCEP(dados.cep || cep);
        definirEstadoCampo('cad_cep', true);

        if (endereco) {
            enderecoEl.value = endereco;
            enderecoEl.dataset.preenchidoPorCep = '1';
            enderecoEl.dataset.cepBase = endereco;
            definirStatusCEP('success', '✓ Endereço preenchido pelo CEP. Acrescente apenas número e complemento.');
            // Facilita o fluxo da secretaria: após o CEP, já vai para o endereço.
            setTimeout(() => {
                if (document.activeElement === cepEl) {
                    enderecoEl.focus();
                    try { enderecoEl.setSelectionRange(enderecoEl.value.length, enderecoEl.value.length); } catch (_) {}
                }
            }, 0);
        } else {
            definirStatusCEP('warning', 'CEP localizado, mas a base não informou logradouro. Complete o endereço manualmente.');
        }
        return true;
    } catch (erro) {
        if (erro?.name === 'AbortError') return false;
        console.warn('KineSys: consulta automática de CEP indisponível.', erro);
        // Importante: indisponibilidade externa não impede atender/cadastrar paciente.
        definirStatusCEP('warning', 'Não foi possível consultar o endereço agora. O CEP continua válido; preencha o endereço manualmente.');
        return false;
    }
}

async function buscarCEPPeloBotao() {
    const ok = validarCEPInput('cad_cep');
    if (!ok) return false;
    return await consultarCEPAutomaticamente({ forcar: true });
}

function validarTelefoneInput(id) {
    const el = document.getElementById(id);
    if (!el) return true;
    const d = somenteDigitos(el.value);
    if (!d) { limparEstadoCampo(id); return true; }
    if (![10,11].includes(d.length)) return definirEstadoCampo(id, false, `Telefone inválido: informe DDD + número (10 ou 11 dígitos). Foram digitados ${d.length}.`);
    if (!telefoneBRValido(d)) return definirEstadoCampo(id, false, 'Telefone inválido: revise DDD e número informados.');
    el.value = formatarTelefoneBR(d);
    return definirEstadoCampo(id, true);
}

function alternarCamposResponsavel() {
    const chk = document.getElementById('cad_dependente');
    const bloco = document.getElementById('cad_responsavel_bloco');
    if (!chk || !bloco) return;
    bloco.style.display = chk.checked ? 'block' : 'none';
    bloco.setAttribute('aria-hidden', chk.checked ? 'false' : 'true');
    if (!chk.checked) {
        limparEstadoCampo('cad_responsavel_telefone');
        limparEstadoCampo('cad_responsavel_nome');
    }
}

function validarResponsavelCadastro() {
    const dependente = !!document.getElementById('cad_dependente')?.checked;
    if (!dependente) return true;
    const nome = document.getElementById('cad_responsavel_nome');
    const telefone = document.getElementById('cad_responsavel_telefone');
    if (!nome?.value.trim()) {
        return definirEstadoCampo('cad_responsavel_nome', false, 'Informe o nome do responsável pelo paciente.');
    }
    definirEstadoCampo('cad_responsavel_nome', true);
    if (!telefone?.value.trim()) {
        return definirEstadoCampo('cad_responsavel_telefone', false, 'Informe o telefone/WhatsApp do responsável.');
    }
    return validarTelefoneInput('cad_responsavel_telefone');
}

function configurarValidacoesCadastrais() {
    const cpfIds = ['cad_cpf', 'eq_cpf'];
    cpfIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.validacaoConfigurada) return;
        el.dataset.validacaoConfigurada = '1';
        el.addEventListener('input', () => {
            el.value = formatarCPF(el.value);
            const n = somenteDigitos(el.value).length;
            if (n === 11) validarCPFInput(id); else limparEstadoCampo(id);
        });
        el.addEventListener('blur', () => validarCPFInput(id));
    });

    const cep = document.getElementById('cad_cep');
    if (cep && !cep.dataset.validacaoConfigurada) {
        cep.dataset.validacaoConfigurada = '1';
        let timerCEP = null;
        const dispararConsultaCEP = () => {
            if (timerCEP) clearTimeout(timerCEP);
            const n = somenteDigitos(cep.value).length;
            if (n === 8 && validarCEPInput('cad_cep')) {
                // Consulta praticamente imediata. O pequeno atraso só consolida paste/input
                // no mesmo ciclo e evita duas chamadas idênticas consecutivas.
                timerCEP = setTimeout(() => consultarCEPAutomaticamente({ forcar: true }), 40);
            }
        };
        cep.addEventListener('input', () => {
            cep.value = formatarCEP(cep.value);
            const n = somenteDigitos(cep.value).length;
            definirStatusCEP('', '');
            if (n === 8) dispararConsultaCEP();
            else {
                if (timerCEP) clearTimeout(timerCEP);
                limparEstadoCampo('cad_cep');
                ultimoCEPPesquisado = '';
            }
        });
        cep.addEventListener('change', dispararConsultaCEP);
        cep.addEventListener('paste', () => setTimeout(dispararConsultaCEP, 0));
        cep.addEventListener('blur', async () => {
            const ok = validarCEPInput('cad_cep');
            if (ok && somenteDigitos(cep.value).length === 8) await consultarCEPAutomaticamente({ forcar: true });
        });
    }

    const tel = document.getElementById('cad_telefone');
    if (tel && !tel.dataset.validacaoConfigurada) {
        tel.dataset.validacaoConfigurada = '1';
        tel.addEventListener('input', () => { tel.value = formatarTelefoneBR(tel.value); limparEstadoCampo('cad_telefone'); });
        tel.addEventListener('blur', () => validarTelefoneInput('cad_telefone'));
    }

    const nomeResp = document.getElementById('cad_responsavel_nome');
    if (nomeResp && !nomeResp.dataset.validacaoConfigurada) {
        nomeResp.dataset.validacaoConfigurada = '1';
        nomeResp.addEventListener('input', () => limparEstadoCampo('cad_responsavel_nome'));
    }

    const telResp = document.getElementById('cad_responsavel_telefone');
    if (telResp && !telResp.dataset.validacaoConfigurada) {
        telResp.dataset.validacaoConfigurada = '1';
        telResp.addEventListener('input', () => { telResp.value = formatarTelefoneBR(telResp.value); limparEstadoCampo('cad_responsavel_telefone'); });
        telResp.addEventListener('blur', () => { if (document.getElementById('cad_dependente')?.checked) validarTelefoneInput('cad_responsavel_telefone'); });
    }
}

document.addEventListener('DOMContentLoaded', configurarValidacoesCadastrais);

