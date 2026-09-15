'use strict';
const fs=require('fs');
const assert=require('assert');

const home=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
const resume=fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js','utf8');

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

assert.match(resume,/function normalizarMeuDiaClinico\(\)/,
  'Retorno da Agenda deve possuir normalização idempotente do Meu dia');
assert.match(resume,/const agendamentoId=String\(linha\?\.dataset\?\.agendamentoId\|\|''\)\.trim\(\)/,
  'Deduplicação deve usar a identidade estável do agendamento');
assert.match(resume,/if\(vistos\.has\(chave\)\)linha\.remove\(\)/,
  'Uma segunda representação do mesmo agendamento deve ser removida');
assert.match(resume,/if\(cards\.length>1\)cards\.slice\(1\)\.forEach\(card=>card\.remove\(\)\)/,
  'O Home não pode manter dois cards Meu dia com o mesmo ID');
assert.match(resume,/if\(meuDiaEmCurso\)return meuDiaEmCurso/,
  'O hotfix deve compartilhar uma atualização em andamento ao voltar da Agenda');
assert.match(resume,/protegido\.__kinesysMeuDiaIdempotente=true/,
  'Wrapper do Meu dia deve ser instalado apenas uma vez');
assert.match(resume,/function observarMeuDiaClinico\(\)/,
  'Meu dia deve observar alterações tardias no DOM depois do carregamento principal');
assert.match(resume,/new MutationObserver\(mudancas=>/,
  'Proteção deve reagir a inserções assíncronas que ocorram depois da primeira renderização');
assert.match(resume,/observadorMeuDia\.observe\(lista,\{childList:true\}\)/,
  'Observador deve acompanhar inclusões e remoções na lista do Meu dia');
assert.match(resume,/if\(mudouFilhos\)normalizarMeuDiaClinico\(\)/,
  'Qualquer segunda finalização que anexe linhas deve disparar deduplicação imediata');
assert.match(resume,/observadorMeuDia\?\.disconnect\(\)/,
  'Observador deve ser desconectado de forma explícita no ciclo de vida');
assert.match(resume,/document\.addEventListener\('kinesys:tela-ativada',aoTelaAtivadaMeuDia\)/,
  'Proteção deve ser reaplicada no lifecycle oficial ao retornar para a Home');

console.log('Meu dia clínico / Agenda stability contract: OK');
