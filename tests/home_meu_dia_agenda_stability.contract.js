'use strict';
const fs=require('fs');
const assert=require('assert');

const home=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
const resume=fs.readFileSync('src/core/operational_resume_refresh-1.0.0.js','utf8');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');

assert.match(home,/function perfilAtualEquivale\(perfilInicial\)/,
  'Meu dia deve comparar identidade estável do perfil, não referência do objeto de sessão');
assert.match(home,/perfilId===atualId&&clinicaId===atualClinicaId/,
  'A identidade estável deve preservar perfil e clínica');
assert.match(home,/let painelFisioterapeutaInicializado = false;/,
  'Meu dia deve conhecer se a fotografia inicial já foi carregada');
assert.match(home,/let revisaoCargaPainelFisioterapeuta = 0;/,
  'Meu dia deve possuir geração própria para descartar respostas antigas');
assert.match(home,/function aplicarSnapshotPainelFisioterapeuta\(/,
  'Renderização do Meu dia deve ser centralizada em um único commit visual');
assert.match(home,/document\.createDocumentFragment\(\)/,
  'Meu dia deve montar a fotografia fora do DOM antes de publicá-la');
assert.match(home,/lista\.replaceChildren\(fragmento\)/,
  'A fotografia final deve substituir a lista de forma atômica');
assert.doesNotMatch(home,/timeline\.forEach\(item=>lista\.appendChild/,
  'Meu dia não pode anexar a timeline diretamente linha a linha no DOM');
assert.match(home,/function atualizarPainelFisioterapeuta\(opcoes=\{\}\)/,
  'Atualização real deve possuir uma única função dona');
assert.match(home,/if\(cargaPainelFisioterapeutaEmAndamento\)return cargaPainelFisioterapeutaEmAndamento/,
  'Chamadas simultâneas devem compartilhar a mesma carga em andamento');
assert.match(home,/function garantirPainelFisioterapeuta\(\)/,
  'Retorno à Home deve apenas garantir a fotografia inicial');
assert.match(home,/if\(painelFisioterapeutaInicializado\)return Promise\.resolve\(true\)/,
  'Voltar para a Home não deve gerar nova consulta se a fotografia já existe');
assert.match(home,/if\(id==='tela_agenda'\)[\s\S]*atualizarPainelFisioterapeuta\(\{motivo:'agenda'\}\)/,
  'Entrar na Agenda deve ser o gatilho operacional de atualização do Meu dia');
assert.match(home,/original\.removeAttribute\('onclick'\)/,
  'Botão Atualizar deve deixar de usar o handler legado inline');
assert.match(home,/original\.addEventListener\('click',\(\)=>atualizarPainelFisioterapeuta\(\{motivo:'manual'\}\)\)/,
  'Botão Atualizar deve forçar a fonte única diretamente');
assert.match(home,/window\.KineSysMeuDiaClinico=Object\.freeze/,
  'Meu dia deve expor uma única API pública explícita');
assert.match(home,/window\.carregarPainelFisioterapeuta=garantirPainelFisioterapeuta/,
  'Nome legado chamado pelo núcleo deve ser somente um alias de ensure, não uma segunda atualização');

assert.match(core,/if \(idTela === 'tela_home'\)[\s\S]*carregarPainelFisioterapeuta\(\)/,
  'Núcleo legado ainda pode chamar a API histórica ao navegar para Home');
assert.doesNotMatch(resume,/carregarPainelFisioterapeuta/,
  'Resume refresh não pode ser um segundo dono do Meu dia');
assert.doesNotMatch(resume,/normalizarMeuDiaClinico|observarMeuDiaClinico|MutationObserver/,
  'Resume refresh não pode corrigir DOM do Meu dia por observador ou deduplicação posterior');
assert.doesNotMatch(resume,/painel_fisio_lista|card_painel_fisioterapeuta/,
  'Resume refresh não deve tocar no DOM do Meu dia');

console.log('Meu dia clínico: fonte única, refresh pela Agenda e renderização atômica OK');
