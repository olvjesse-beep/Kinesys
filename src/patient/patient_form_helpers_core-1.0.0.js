'use strict';
/* ==========================================================================
   KineSys — Patient Form Helpers Core 1.0.0
   Phase 4Q: helpers puros/de formulário extraídos sem alteração de comportamento.
   Não acessa Supabase, rede ou persistência.
   ========================================================================== */

/* ================= 3. IDADE E FILTRO DE 2 HORAS ================= */
function calcularIdadeCadastro() {
    const campoData = document.getElementById('cad_nascimento');
    const campoIdade = document.getElementById('cad_idade');
    if (!campoData || !campoIdade) return;

    const dataNasc = campoData.value;
    if (!dataNasc) { campoIdade.value = ""; return; }

    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();

    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    campoIdade.value = idade >= 0 ? idade + " anos" : "";

    // Menores de 18 anos entram automaticamente como dependentes.
    // Adultos continuam podendo ser marcados manualmente como dependentes/cuidadores.
    const chkDependente = document.getElementById('cad_dependente');
    if (chkDependente && idade >= 0 && idade < 18) {
        chkDependente.checked = true;
        if (typeof alternarCamposResponsavel === 'function') alternarCamposResponsavel();
    }
}

function removerAcentos(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function obterTextoExibicao(item) {
    if (!item) return "";
    return typeof item === 'object' && item.exibicao ? item.exibicao : item;
}
