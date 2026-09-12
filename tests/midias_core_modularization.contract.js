'use strict';
const fs=require('fs');
const assert=require('assert');

const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const midias=fs.readFileSync('src/core/midias_core-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(!core.includes('KINESYS v1.10 — KINESYS LOCAL / FOTOS CLÍNICAS'), 'Bloco principal de Mídias ainda está embutido no core');
assert(!core.includes("const KINESYS_LOCAL_URL = 'http://127.0.0.1:8765'"), 'Estado principal de Mídias ainda está no core');
assert(midias.includes('KINESYS v1.10 — KINESYS LOCAL / FOTOS CLÍNICAS'), 'Módulo extraído perdeu o bloco principal de Mídias');
assert(midias.includes("const KINESYS_LOCAL_URL = 'http://127.0.0.1:8765'"), 'Módulo extraído perdeu KineSys Local URL');
assert(midias.includes('async function kinesysLocalFetch('), 'Módulo perdeu acesso ao serviço local');
assert(midias.includes('async function atualizarGaleriaMidias('), 'Módulo perdeu galeria de Mídias');
assert(midias.includes('async function salvarConfiguracaoBackupLocal()'), 'Módulo perdeu configuração de backup local');
assert(core.includes("protegerFuncaoKineSys('salvarConfiguracaoBackupLocal'"), 'Ponto de instalação do operation guard para backup deve permanecer no core');
assert(core.includes("if (event.detail?.id === 'tela_midias') ativarLifecycleMidiasKineSys();"), 'Listener oficial de ativação deve permanecer no core');
assert(core.includes("if (event.detail?.id === 'tela_midias') suspenderLifecycleMidiasKineSys();"), 'Listener oficial de suspensão deve permanecer no core');
assert(core.includes('function atualizarPSFSMedia('), 'Patient self-service media helper não deve ser movido nesta etapa');

const states=['KINESYS_LOCAL_URL','kinesysLocalOnline','kinesysLocalStatus','midiasPacienteAtual','midiaComparacaoA','midiaComparacaoB','midiaPollTimer','midiaPollingCapturaSolicitado','kinesysLocalStatusTimer','midiaUltimaQuantidadeLocal','midiaTabelaSupabaseDisponivel'];
for(const state of states) assert(!new RegExp('\\b'+state+'\\b').test(core), `Estado interno ${state} não pode permanecer acoplado ao core`);

const mediaTag='<script defer src="src/core/midias_core-1.0.0.js?v=20260911-phase4d-r1"></script>';
const escapeTag='<script defer src="src/core/html_escape-1.0.0.js?v=20260911-phase4c-r1"></script>';
const coreNeedle='<script defer src="src/core/script-1.18.0.js';
assert(html.includes(mediaTag), 'index.html não carrega o módulo principal de Mídias');
assert(html.indexOf(escapeTag)<html.indexOf(mediaTag), 'HTML escape deve carregar antes de Mídias');
assert(html.indexOf(mediaTag)<html.indexOf(coreNeedle), 'Mídias deve carregar antes do core para preservar APIs globais no bootstrap');

console.log('Media core modularization contract Phase 4D: OK');
