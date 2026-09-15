'use strict';
const fs=require('fs');
const assert=require('assert');

const home=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');

assert.match(home,/function perfilAtualEquivale\(perfilInicial\)/,
  'Meu dia deve comparar identidade estável do perfil, não referência do objeto de sessão');
assert.match(home,/perfilId===atualId&&clinicaId===atualClinicaId/,
  'A identidade estável deve preservar perfil e clínica');
assert.doesNotMatch(home,/usuarioLogado:null\)!==perfilInicial/,
  'Meu dia não pode descartar a Agenda apenas porque usuarioLogado foi reidratado em outro objeto');
assert.match(home,/if\(!perfilAtualEquivale\(perfilInicial\)\) return '';/,
  'Resposta da Agenda deve ser descartada somente quando a identidade lógica da sessão mudar');
assert.match(home,/String\(contexto\?\.perfil_id\|\|''\)!==perfilId/,
  'Validação segura do perfil devolvido pelo backend deve continuar ativa');
assert.match(home,/String\(contexto\?\.clinica_id\|\|''\)!==clinicaId/,
  'Validação segura da clínica devolvida pelo backend deve continuar ativa');
assert.match(home,/let cargaPainelFisioterapeutaEmAndamento = null;/,
  'Meu dia deve controlar carregamentos concorrentes');
assert.match(home,/if\(cargaPainelFisioterapeutaEmAndamento\)return cargaPainelFisioterapeutaEmAndamento/,
  'Chamadas simultâneas devem compartilhar a mesma carga em andamento');
assert.match(home,/window\.carregarPainelFisioterapeuta=carregarPainelFisioterapeutaCoalescido/,
  'API pública do Home deve usar o carregamento coalescido');

console.log('Meu dia clínico / Agenda stability contract: OK');
