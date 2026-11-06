'use strict';
// Diagnóstico registrado pelo profissional no relatório (06/11/2026, dados sintéticos).
// Caso de origem: o texto de "Diagnóstico / condição clínica" era salvo em
// clinicaEstruturada.diagnosticoProfissional, mas não aparecia no relatório gerado.
const assert=require('node:assert/strict');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const TITULO='\n\nDiagnóstico / condição clínica\n\n';

{ // 1. Sem diagnóstico: nenhuma seção, hipótese do motor nunca vira diagnóstico e a fonte antiga não muda.
  const t=fixture(),r=t.render();
  assert(!r.texto.includes('Diagnóstico / condição clínica'),'sem texto do profissional, sem seção');
  assert(!/Diagnóstico[^\n]*Radiculopatia Cervical/i.test(r.texto),'hipótese não é transformada em diagnóstico');
  assert(!('diagnosticoProfissional' in JSON.parse(r.fonte)),'laudos salvos sem diagnóstico mantêm a mesma fonte');
}
{ // 2. Com diagnóstico: texto literal do profissional, depois do exame e antes de segurança.
  const t=fixture(),sem=t.render();
  t.nodes.avaliacao_diagnostico_profissional={value:'  Radiculopatia cervical C6 à direita, 3.5/10  '};
  const r=t.render(),texto=r.texto;
  assert(texto.includes(TITULO+'Radiculopatia cervical C6 à direita, 3.5/10.'),'diagnóstico aparece no relatório');
  const iExame=texto.indexOf('Exame físico-funcional e correlação clínica'),iDiag=texto.indexOf(TITULO);
  assert(iExame>=0&&iDiag>iExame,'seção vem após o exame');
  const iSeg=texto.indexOf('\n\nSegurança e cuidados\n\n');if(iSeg>=0)assert(iDiag<iSeg,'seção vem antes de segurança');
  assert.equal((texto.match(/Radiculopatia cervical C6/g)||[]).length,1,'sem duplicação');
  assert.equal(r.modo,sem.modo,'diagnóstico não degrada o modo do laudo');
  assert.deepEqual(Array.from(r.validacao?.relatoAusente||[]),Array.from(sem.validacao?.relatoAusente||[]));
  assert(!(r.semantica?.validacao?.numerosSemOrigem||[]).length,'números do diagnóstico têm origem registrada');
  assert.equal(JSON.parse(r.fonte).diagnosticoProfissional,'Radiculopatia cervical C6 à direita, 3.5/10');
  assert(r.semantica.fatos.some(f=>f.tipo==='diagnostico'&&f.origens.some(o=>o.campo==='clinicaEstruturada.diagnosticoProfissional')),'origem auditável');
  // Reabertura do JSON preserva o mesmo texto.
  t.c.window.preencherLaudoAvaliacaoKineSys(JSON.parse(JSON.stringify(r)));t.c.window.renderizarLaudoAvaliacaoKineSys();
  assert.equal(t.nodes['ks-laudo-texto'].value,texto);
  // Alterar o diagnóstico atualiza o texto automático.
  t.nodes.avaliacao_diagnostico_profissional.value='Cervicobraquialgia à direita';
  t.c.window.renderizarLaudoAvaliacaoKineSys();
  assert(t.nodes['ks-laudo-texto'].value.includes(TITULO+'Cervicobraquialgia à direita.'));
  assert(!t.nodes['ks-laudo-texto'].value.includes('Radiculopatia cervical C6'));
}
{ // 3. Campo apagado na tela não ressuscita diagnóstico antigo preservado.
  const t=fixture();
  t.c.clinicaEstruturadaPreservada={diagnosticoProfissional:'Diagnóstico antigo de outra versão'};
  t.nodes.avaliacao_diagnostico_profissional={value:''};
  const r=t.render();
  assert(!r.texto.includes('Diagnóstico antigo'));assert(!r.texto.includes('Diagnóstico / condição clínica'));
}
{ // 4. Texto profissional editado não é sobrescrito ao incluir diagnóstico.
  const t=fixture(),r=t.render();
  t.c.window.preencherLaudoAvaliacaoKineSys({...r,texto:'Redação profissional preservada.',textoAutomatico:false,revisado:false});
  t.nodes.avaliacao_diagnostico_profissional={value:'Radiculopatia cervical'};
  t.c.window.renderizarLaudoAvaliacaoKineSys();
  assert(t.nodes['ks-laudo-texto'].value.startsWith('Redação profissional preservada.'));
}
console.log('Diagnóstico do profissional no relatório: ausência, texto literal, posição, origem, reabertura, atualização, sem ressuscitar e texto manual OK.');
