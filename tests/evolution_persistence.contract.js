const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'src/core/script-1.18.0.js'), 'utf8');
const design = fs.readFileSync(path.join(root, 'src/core/design_system-1.20.1.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles/evolucao_modelo1.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

for (const id of ['evo_novo_exame_texto', 'evo_intercorrencia_texto', 'evo_medicacao_texto', 'evo_alerta_texto']) {
  assert(script.includes(id), `${id} precisa participar do ciclo de persistência da evolução`);
  assert(design.includes(`id="${id}"`), `${id} precisa existir na interface da evolução`);
}

assert(script.includes('mudancasDetalhes'), 'os quatro relatos clínicos precisam ser persistidos em dadosEstruturados');
assert(script.includes("adicionarDetalhe('Novo exame ou laudo',detalhes.novoExame)"), 'novo exame precisa aparecer no histórico');
assert(script.includes("adicionarDetalhe('Nova intercorrência',detalhes.novaIntercorrencia)"), 'intercorrência precisa aparecer no histórico');
assert(script.includes("adicionarDetalhe('Mudança de medicação',detalhes.mudancaMedicacao)"), 'medicação precisa aparecer no histórico');
assert(script.includes("adicionarDetalhe('Novo sinal de alerta',detalhes.novoAlerta)"), 'sinal de alerta precisa aparecer no histórico');
assert(script.includes('montarRelatoEvolucaoParaExibicao(evo)'), 'o histórico precisa reconstruir o resumo a partir dos dados persistidos');
assert(script.includes("document.getElementById('eva_slider_evo').value=e.eva??0"), 'EVA precisa voltar ao editar uma evolução');
assert(script.includes('const d=e.dadosEstruturados||{},r=d.respostaCarga||{}'), 'estado e resposta à carga precisam voltar ao editar');
assert(script.includes('mudancasDetalhes:e.dadosEstruturados?.mudancasDetalhes||null'), 'relatórios precisam receber os quatro relatos estruturados');

assert(design.includes("historico.className='btn-secondary ks-evo-history-action'"), 'botão de histórico precisa usar o padrão secundário KineSys');
assert(!html.includes('id="evo_mudancas"'), 'campo genérico legado não pode continuar renderizado');
assert(!design.includes("evo_mudancas"), 'layout não pode recriar o campo genérico legado');
assert(!script.includes("getElementById('evo_mudancas')"), 'novos salvamentos não podem ler ou preencher o campo genérico legado');
assert(script.includes("hasOwnProperty.call(registroEmEdicao.dadosEstruturados,'mudancas')"), 'edição precisa preservar o valor histórico legado sem o expor');
assert(css.includes('.ks-evo-editor-layout') && css.includes('grid-template-columns:minmax(0,2fr) minmax(300px,1fr)'), 'modelo 1 precisa ter narrativa principal e painel lateral');
assert(design.includes('detail.hidden=!check.checked'), 'detalhes precisam acompanhar os checkboxes');
assert(html.includes('styles/evolucao_modelo1.css'), 'a folha isolada da Evolução precisa ser carregada');

const resumoInicio = script.indexOf('function montarResumoEvolucaoEstruturada');
const resumoFim = script.search(/\r?\n\r?\nfunction montarRelatoEvolucaoParaExibicao/);
assert(resumoInicio >= 0 && resumoFim > resumoInicio, 'função de resumo estruturado precisa ser extraível para teste');
const sandbox = {};
vm.runInNewContext(`${script.slice(resumoInicio, resumoFim)}\nresultado=montarResumoEvolucaoEstruturada({estadoClinico:'pior',mudancasDetalhes:{novoExame:'RM lombar com achado novo',novaIntercorrencia:'queda sem trauma',mudancaMedicacao:'analgésico ajustado',novoAlerta:'perda de força'},respostaCarga:{dorDurante:8,rpe:7}});`, sandbox);
for (const trecho of ['Estado clínico: Pior.', 'Novo exame ou laudo: RM lombar com achado novo.', 'Nova intercorrência: queda sem trauma.', 'Mudança de medicação: analgésico ajustado.', 'Novo sinal de alerta: perda de força.', 'dor durante 8/10', 'RPE 7/10']) {
  assert(sandbox.resultado.includes(trecho), `resumo do histórico precisa conter: ${trecho}`);
}

console.log('evolution_persistence.contract: ok');

