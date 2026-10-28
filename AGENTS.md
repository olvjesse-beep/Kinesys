# KineSys — instruções permanentes de projeto e produção

## Condições previamente informadas no Radar — 27/10/2026

- Catálogo nominal de condições e procedimentos é separado dos clusters de investigação. Diagnóstico informado/documento mencionado não é confirmação pelo sistema, resultado de teste ou causa presumida de todas as queixas. Não alterar limiares nem ativar testes positivos por correspondência de nome.
- Preservar negação, suspeita, familiar, condição antiga, indicação cirúrgica distinta de cirurgia realizada, datas, lados e fonte literal. Fratura de tíbia genérica não equivale a planalto tibial nem autoriza inferir consolidação, material de síntese ou liberação de carga. Chikungunya anterior não define fase atual nem causalidade. Reumatismo/artrite sem subtipo não equivale a artrite reumatoide.
- Radar e plano compartilham `condicoesInformadas` e `mencoesCondicoes` com origem exata. Condição fora do catálogo explicitamente nomeada permanece como relato a esclarecer; não criar critérios clínicos por isso. Troca de avaliação/HMA limpa o contexto anterior; preservar seleção manual e exames existentes.
- Ampliar `tests/clinical_evidence_reasoning.test.cjs` e manter a barreira hospedada inteira. Usar dados sintéticos e referências institucionais com limites explícitos; a suíte verifica contratos do software e não certifica acurácia clínica.

Estas instruções são obrigatórias para qualquer agente, automação ou sessão de desenvolvimento que trabalhe neste repositório. Existem **dois projetos independentes** e essa separação deve ser preservada em qualquer edição, configuração ou publicação.

## 1. Identifique o projeto antes de agir

- **KineSys:** software de gestão em `https://app.fisiofixfisioterapia.com`.
- **Site institucional FisioFix:** site comercial em `https://fisiofixfisioterapia.com` e `https://www.fisiofixfisioterapia.com`.

Se o pedido identificar claramente o projeto, prossiga. Se estiver ambíguo, pergunte qual dos dois deve ser modificado. Pedidos envolvendo ambos devem ser tratados como duas alterações separadas, com backups e validações próprios.

## 2. Estrutura de produção que deve ser preservada

Diretório base:
`/home/u760374282/domains/fisiofixfisioterapia.com/`

- Site institucional WordPress: `public_html`
- KineSys: `public_html/app`
- Repositório KineSys: `olvjesse-beep/Kinesys`, branch de produção `main`.
- O repositório KineSys **NÃO contém** o site institucional original.

O domínio principal e `www` devem mostrar exclusivamente o site institucional. O subdomínio `app` deve mostrar o KineSys.

## 3. Antes de qualquer alteração

Confira o estado atual; não presuma que as configurações continuam iguais às descritas.

Identifique os arquivos, repositório, branch, destino de deploy e eventual banco envolvidos. Faça um backup datado dos itens que serão alterados, fora da pasta pública, e verifique que ele está acessível. Defina como reverter a alteração.

Para mudanças no WordPress que afetem conteúdo ou configurações, preserve também o banco MySQL correspondente. Não restaure bancos ou pastas inteiras quando uma recuperação seletiva for suficiente.

Não apague, sobrescreva ou mova arquivos de produção sem backup verificado. Se não conseguir preservar os itens afetados, pare e explique o impedimento.

## 4. Regras para editar o KineSys

- Edite somente o projeto KineSys.
- Publique exclusivamente em `public_html/app`.
- Nunca publique este repositório diretamente em `public_html`.
- Nunca altere WordPress, arquivos institucionais ou seu banco como efeito colateral.
- Não modifique Supabase, dados de pacientes, Motor Clínico, Avaliação, Evolução ou regras clínicas, salvo quando o pedido solicitar especificamente essa mudança.

## 5. Regras para editar o site institucional

- Trabalhe no WordPress e nos arquivos pertencentes ao site institucional.
- Exclua expressamente `public_html/app` de limpezas, sincronizações, substituições e restaurações do site comercial.
- Não altere o repositório, deploy, arquivos ou Supabase do KineSys.
- Não substitua o WordPress por uma página improvisada para encobrir um problema de publicação.

## 6. Git e automações de deploy

Inspecione as integrações do hPanel e os fluxos de publicação existentes no GitHub.

Se necessário, corrija os fluxos para garantir:

- KineSys publica somente em `public_html/app`.
- Nenhuma rotina do KineSys limpa, substitui ou sincroniza a pasta pai `public_html`.
- Scripts validam o destino e interrompem a publicação se ele estiver vazio, incorreto ou fora da pasta autorizada.
- Exclusões de arquivos ficam limitadas ao projeto publicado.
- Credenciais de publicação usam o menor acesso necessário e nunca são gravadas no repositório.

Faça alterações de código em branch própria e apresente o diff ou PR com a validação. Não faça force-push nem descarte alterações existentes.

Se o site institucional precisar de versionamento, use um repositório separado para seu código próprio, como tema filho e plugins personalizados. Não coloque senhas, `wp-config.php`, dumps de banco ou backups no Git. O versionamento não substitui os backups de conteúdo, uploads e banco.

## 7. Hostinger

Confira os document roots, subdomínios, integração Git e contas de publicação antes de mudar configurações.

Corrija configurações incorretas quando necessário ao pedido, preservando a separação acima. Não remova nem recrie sites, instalações WordPress, bancos ou subdomínios como atalho.

Não altere DNS, nameservers, SSL ou redirecionamentos sem demonstrar que a mudança é necessária. Não use CSS ou redirecionamentos para mascarar arquivos publicados na pasta errada.

Se faltar acesso, informe exatamente qual configuração precisa mudar, seu valor atual, o valor correto e a tela do hPanel correspondente. Não improvise.

## 8. Validação após cada publicação

Teste os três endereços, mesmo que apenas um projeto tenha sido alterado:

- Principal: site institucional.
- `www`: site institucional; redirecionamento canônico para o principal é aceitável.
- `app`: KineSys.

Verifique HTTP, conteúdo visual e a funcionalidade modificada. Use sessão anônima quando disponível; se não estiver disponível, informe a limitação e teste também por requisições sem cookies.

Se a publicação causar regressão, reverta somente os itens alterados nesse projeto.

Ao finalizar, informe de forma breve:

- projeto e alterações realizadas;
- arquivos/repositório e pasta de publicação;
- backup criado e procedimento de reversão;
- resultado dos três domínios;
- riscos ou pendências.

## 9. Barreira permanente contra regressões de Agenda e Planos

- Toda PR para `main`, inclusive de Avaliação, Radar, Home ou CSS compartilhado, deve executar o check `Agenda e planos - regressao critica` do workflow existente `agenda-edit-contract.yml`.
- Esse check usa executor hospedado do GitHub. Não trocar por executor local, filtrar por caminhos, marcar `continue-on-error` ou remover testes para liberar uma publicação.
- Não integrar PR enquanto o check estiver pendente ou falhando. Não publicar branches de desenvolvimento diretamente, nem usar upload manual para contornar a barreira de `main`.
- Preservar: criação e edição extraordinária com confirmação/conflitos/bloqueios; abertura de planos antes de carregar a Agenda; contrato entre IDs do HTML e JS; trava de concorrência independente de `button.disabled`; campos de recorrência alinhados e respeito a `[hidden]`.
- Diálogos genéricos pertencem a `src/ui/modal_helpers-1.0.0.js`, carregado antes do Financeiro. Não redeclarar `abrirModal`/`fecharModal` em módulos lazy.
- Testes de cache devem conferir coerência entre HTML e loader, não congelar uma revisão antiga que obrigue ignorar a suíte a cada release.
- Corrigir a implementação quando um teste funcional falhar. Só alterar a expectativa quando o requisito mudar explicitamente; não substituir testes por verificações vazias.

## 10. Contratos permanentes de Agenda e Paciente

- O portal público não mantém a primeira consulta como disponibilidade permanente: reconsulta ao retornar à aba, periodicamente enquanto visível, por atualização manual e antes de avançar para os dados. Preservar mês, escolha ainda válida e campos preenchidos; escolha removida ou erro de consulta bloqueiam a continuação sem exibir horário antigo. Não descartar UUID de tentativa sem resposta: retentativa idempotente deve recuperar a reserva. Não ampliar silenciosamente os períodos publicados, a jornada ou a antecedência configurada. Executar `agendamento_publico_modelo2.test.cjs` na barreira hospedada.

- Conforme solicitação explícita de 28/10/2026, a Agenda interna permite sobreposição, ausência/bloqueio e feriado somente após aviso e confirmação do encaixe excepcional. Conferir no servidor o profissional, período e os conflitos/bloqueios atuais; mudança durante o diálogo exige nova confirmação. Aviso interno ao responsável pertence à mesma transação do agendamento. Não estender essa autorização ao portal público. Preservar escopo de clínica/perfil e edição financeira atômica. Atendimentos simultâneos continuam acessíveis lado a lado na grade.
- Ausências permitem datas inicial/final inclusivas; horas opcionais aplicadas a cada dia, ambas vazias significam dia todo. Cadastro completo é atômico e repetição da mesma operação não duplica dias. Manter a trava independente de botão e os testes funcionais/DB na barreira hospedada.

Estas decisões só podem ser removidas ou revertidas por solicitação explícita do usuário. Refatorações devem preservar o comportamento e ampliar os testes quando necessário:

- Em notebook, navegação e filtros da Agenda quebram por grupos, nunca por letras ou por sobreposição de campos. Conferir 1366×768, 1280×720, 1024×768 e mobile.
- Busca de pacientes ordena relevância antes de paginar: nome exato, começo do nome, palavra no meio e ocorrência parcial. Ignorar acentos/caixa; sem filtro manter alfabética. Caso permanente: José Antônio antes de Dilson José e João José ao buscar jose.
- Trocar somente procedimento na edição não limpa horário nem modifica duração original ou campos não tocados. Respostas assíncronas antigas não sobrescrevem a escolha atual; conflitos, bloqueios e confirmação extraordinária permanecem obrigatórios.
- Pagamento aberto pela Agenda retorna à Agenda somente após sucesso, inclusive contrato/pacote; aberto no Financeiro permanece ali. Erro de lançamento conserva formulário/contexto para nova tentativa.
- Cada abertura de pagamento limpa o contexto anterior e confirma paciente, clínica, agendamento, procedimento e cobrança no servidor. O vínculo permanece imutável até salvar ou cancelar. Respostas antigas, troca de paciente/clínica e duplo clique não podem registrar em outra pessoa. Preservar os testes unitário → pacote → genérico, concorrência e repetição após erro em `financeiro_modal_bootstrap.test.cjs`.
- Não remover Abrir prontuário do detalhe, nem Histórico de agendamentos e Financeiro do prontuário ativo. Atalhos selecionam o paciente pelo ID e respeitam permissões, sem busca manual.
- Histórico é somente leitura, por paciente e clínica, em data/hora decrescente, com paginação e situação financeira canônica. Não transformar falha de consulta em Pago/Pendente falso nem revelar financeiro a perfil restrito.
- Corrigir procedimento de uma ocorrência unitária pode preservar o contrato financeiro original; jamais reatribuir paciente/clínica/contrato nem converter pacote incompatível silenciosamente. Identidade, condições originais e recebimentos do contrato permanecem imutáveis. Conforme solicitação explícita de 28/10/2026, o preço atual de uma ocorrência individual acompanha o novo procedimento: sem saldo recebido, criar uma contratação individual própria preservando a anterior; com recebimento/crédito aplicado, exigir confirmação e registrar personalização auditada sem alterar pagamentos ou condições originais.

## 11. Contratos permanentes da Anamnese e sugestões

- Preservar o modelo de índice com sete grupos e um painel de preenchimento, sem duplicar IDs/campos clínicos. Trocar de grupo não apaga informações.
- Medicamentos, cirurgias e atividades físicas devem continuar pesquisáveis ao montar a Avaliação sob demanda, após carregar os catálogos e ao sair/voltar à tela. Inicialização repetida não duplica eventos. Consultar o catálogo atual e reaplicar a consulta ativa quando terminar o carregamento.
- Não recortar listas de sugestões pelo container, diálogo ou rodapé; manter navegação por teclado, fechamento acessível, seleção canônica e ausência de tags duplicadas. Não transformar sugestões de registro em prescrições.
- Não informado, negativa explícita e relato são estados distintos. Dados positivos existentes não podem ser apagados silenciosamente por uma negativa. Gravar/reabrir o contexto adicional no JSON clínico existente, preservar chaves anteriores e limpar o contexto ao iniciar avaliação de outro paciente.
- Executar `tests/input_helpers_modularization.contract.js`, `tests/evaluation_context_model2.test.cjs` e `tests/evaluation_context_lifecycle.contract.js` na barreira hospedada de Agenda e Planos. Conferir visualmente listas abertas em notebook e celular ao alterar estes componentes.
- Estas decisões só podem ser removidas por solicitação explícita do usuário; refatorações devem preservar o comportamento e ampliar os testes.

## 12. Contratos permanentes da Evolução

- Preservar o modelo 1: narrativa principal e painel de mudanças com checkboxes e detalhes condicionais, reutilizando IDs e funções canônicas. Estilos exclusivos de Evolução, sem alterar as demais telas.
- Salvar e reabrir exame/laudo, intercorrência, medicação e alerta no JSON clínico existente e exibir seus detalhes no Histórico de sessões. Edição pontual preserva os demais dados, chaves legadas, autoria e carimbos originais; manter a janela clínica de edição e a justificativa de exceção.
- Não apagar detalhes preenchidos ao desmarcar. Duplicação de sessão não reapresenta intercorrências antigas como novas. Falha ao salvar conserva o formulário e não cria evolução fantasma no cache. Respostas atrasadas não preenchem outro paciente.
- Executar `evolution_persistence.contract.js` e `evolution_model1_roundtrip.test.cjs` na barreira hospedada de Agenda e Planos. Conferir layout amplo, notebooks e celular, detalhes abertos e parâmetros de carga acessíveis.
- Remover essas decisões somente mediante pedido explícito do usuário; refatorações devem preservar o comportamento e ampliar os testes.

## 13. Contratos permanentes de integração Avaliação → Relatório

- Incorporar os detalhes preenchidos nos sete grupos da Anamnese, preservar a separação de medicamentos e cirurgias e sinalizar campos sem regra de integração. Negativa explícita, ausência e relato incompleto são estados distintos.
- Regiões selecionadas sem resultados não podem ser apresentadas como examinadas, negativas ou confirmadas. Preservar resultados inconclusivos, alternativas dos itens compostos, doses, medidas, lateralidade e limites das hipóteses clínicas.
- Não alterar a HMA de origem ao compor a narrativa nem completar trechos ambíguos por suposição. Texto profissional ou revisado não é substituído automaticamente; atualizar a base exige confirmação. Preservar data, autoria e registro profissional.
- Executar `evaluation_clinical_correlation.contract.js` e `evaluation_report_integration.test.cjs` na barreira hospedada, sem reduzir os testes clínicos anteriores. Usar apenas dados sintéticos em testes e PRs.
- Preservar a camada de fatos/origens, relações documentais, planejamento de parágrafos e auditoria semântica da versão 21. Não voltar a concatenar a HMA como único parágrafo nem substituir auditoria por presença de palavras. Hipóteses consomem apenas testes explicitamente vinculados ao eixo ou a testes prioritários registrados; não usar outros testes da região como confirmação. Contagem não duplica teste idêntico.
- Possível contradição no relato exige revisão e suspende a síntese automática. Diferenças de lado/momento e negativas de modificadores não comprovam contradição nem ausência do sintoma. Relação anatômica documental não é causalidade. Executar `evaluation_semantic_facts.test.cjs` na mesma barreira; preservar os metadados no JSON do laudo e o texto profissional.
- O laudo pertence ao paciente, avaliação e sessão de trabalho, nunca apenas ao nome/HMA. Trocar paciente ou iniciar outra avaliação limpa imediatamente texto, revisão, JSON clínico e plano anterior. Respostas atrasadas, recuperação de rascunho e confirmação de atualização não podem reintroduzir outro contexto. Preservar texto manual somente dentro do mesmo atendimento; executar `evaluation_patient_isolation.test.cjs` na barreira hospedada.
- Preservar a versão 22: fatos com origem exata e proposições por sintoma/local/lado/momento/sujeito, dose vinculada ao medicamento, diagnóstico somente relatado e cirurgia indicada distinta de realizada. Validar mudanças de significado e causalidade nova; ambiguidades exigem revisão, não preenchimento presumido. Biblioteca sintética não equivale a validação clínica profissional.
- Queixas independentes explícitas não ficam limitadas a duas regiões ou a uma única hipótese. Não transformar destino de irradiação, movimento provocativo, local de procedimento anterior, familiar ou negativa em nova queixa. Preservar antecedentes pertinentes, campos estruturados vinculados à região de origem e seleção manual soberana. Cada hipótese tem seus próprios testes e critérios; não alterar limiares científicos nem confirmar por contagem arbitrária.
- O relatório deve preservar várias hipóteses examinadas da mesma região, identificar queixas sem exame e conservar o texto profissional. Executar `evaluation_semantic_graph.test.cjs`, `evaluation_multicomplaint.test.cjs`, `radar_multicomplaint.test.cjs` e `radar_lifecycle.contract.js` na barreira hospedada, além dos contratos anteriores.
- Preservar a camada compartilhada de evidências da versão 23 entre HMA, plano e relatório: origem exata, anatomia específica, lado, sujeito, cronologia e distinção entre ausência, negativa, divergência e informação pendente. Hipótese com localização/lado/cronologia pendentes não recebe bônus positivo de correspondência nominal nem conclusão automática por testes positivos isolados. Não presumir fase aguda ou causalidade de uma entorse sem data/relação esclarecidas.
- Caso permanente: primeiros passos com dor lateral no tornozelo não promovem fasciopatia plantar; calcanhar sem sublocalização pede esclarecimento, sem inventar negativa. Manter evento narrado em outra frase como informação a esclarecer, sem transferi-lo entre regiões/pessoas. Banco suplementar é idempotente após carga regional, com fontes e limites explícitos, sem novos limiares inventados. Executar `clinical_evidence_reasoning.test.cjs` e `clinical_evidence_integration.test.cjs` na mesma barreira hospedada. Não reduzir as suítes anteriores para aprovar uma expansão.
- “Canela” é localização conhecida da perna, não “local não especificado” nem sinônimo de tornozelo. Preservar qualificador lateral/medial/anterior/posterior, sujeito, negativa e lado; não usar a eversão ou primeiros passos dessa queixa como evidência de outra localização. Conservar termo/origem no relatório e executar `clinical_canela_anatomy.test.cjs` na mesma barreira. Não cortar a palavra “mãe” no “e” final ao separar orações; isso não pode transformar história familiar em achado próprio.

## 14. Contrato permanente dos atalhos de WhatsApp

- Agenda (lembrete e lista de espera), CRM e Home administrador abrem diretamente `https://web.whatsapp.com/send?phone=...&text=...`, com número internacional e mensagem codificada, sem `wa.me`/`api.whatsapp.com` como etapa intermediária. O envio continua manual, sem clicar em Enviar automaticamente.
- Não afirmar que o KineSys consegue inspecionar a sessão ou controlar uma aba externa já aberta. O WhatsApp verifica o login do próprio perfil do navegador; sessão desconectada pode exigir autenticação.
- Invalidar os assets de todos os consumidores e executar `whatsapp_direct_web.test.cjs` na barreira hospedada. Preservar destinatário responsável/dependente, texto configurado e o registro de lembrete; usar somente destinatários sintéticos nos testes, sem enviar mensagens reais.

## 15. Contratos do Meu dia e consulta clínica

- Em Meu dia clínico, “Realizar avaliação” aparece somente no prontuário carregado sem avaliação finalizada; rascunho não conta como finalização. Preservar evolução, exceções justificadas e reavaliação, com vínculo pelo ID do paciente e agendamento. Dados indisponíveis ou locais pendentes não equivalem a paciente sem avaliação.
- Após salvamento bem-sucedido, invalidar a fotografia clínica da Home usando a clínica de origem. Respostas anteriores ao salvamento ou à troca de perfil/clínica não podem recolocar ações ou cuidados desatualizados.
- Cuidados abaixo do nome são registros com origem, não prescrições nem contraindicações automáticas. Diferenciar antecedente, relato a conferir e restrição explicitamente documentada. Não promover negativa, história familiar, cirurgia indicada ou rascunho a antecedente próprio. Restrições ativas usam a avaliação finalizada mais recente, não um pós-operatório antigo.
- Preservar “Consultar avaliação” e “Histórico de evoluções” no paciente selecionado, com permissões e consulta somente leitura, do mais recente ao mais antigo. Não abrir o formulário de edição ao consultar.
- PDF simplificado apresenta conteúdo clínico em seções; fingerprints, caches, planos internos e JSON de rastreamento não são conteúdo narrativo. O detalhado mantém carimbos e trilha de alterações, sem apêndice técnico bruto, conforme solicitação de 26/10/2026. Não regenerar nem alterar texto profissional salvo. Preservar detalhes das intercorrências, exames, medicações e alertas nas evoluções. Resultados legados sem rótulos exigem aviso, nunca omissão silenciosa ou interpretação inventada.
- Executar `home_avaliacao_cuidados.test.cjs` e `prontuario_clinico.test.cjs` na barreira hospedada, além de todas as suítes anteriores. Conferir notebook e mobile. Remover estas decisões somente por solicitação explícita do usuário.

## 16. Exame complementar e Radar contextual

- Preservar os registros e o texto em preenchimento de `clinicaEstruturada.exameLivre` no JSON clínico existente, com região/lado/resultado/origem. Registros sem resultado ou sem vínculo válido são descrições, não testes positivos presumidos. Troca de pessoa/avaliação limpa o estado e ações antigas não podem adicionar registros ao contexto novo.
- Vínculo a critério do catálogo deve ser explícito, atual e coerente. Não criar limiares, duplicar testes, somar lados distintos, combinar checklist sem lado com registro unilateral, nem usar resultados divergentes para confirmar hipótese. Alteração de HMA/catalogo exige revisão, sem apagar a descrição.
- Testes e achados livres entram na base documental do relatório e sua auditoria; texto profissional/revisado não é sobrescrito automaticamente. Preservar chaves clínicas anteriores ao salvar/reabrir.
- Não recolocar o bloco visual de integração multirregional na etapa 2. Revisão de segurança pertence à etapa 3, mantendo critérios/condutas/bloqueios. O único Radar acompanha o contexto das etapas sem duplicar IDs nem cobrir o cabeçalho.
- Executar `evaluation_free_exam.test.cjs` junto às suítes anteriores na barreira hospedada. Mudança destas decisões somente por pedido explícito do usuário.

## 17. Documento clínico e exame livre narrado

- Preservar cabeçalho de identificação e seções do relatório solicitados pelo usuário. Não recolocar nome/idade numa abertura burocrática da história nem inventar motivo, diagnóstico, plano ou detalhes de antecedente.
- Organizar achados digitados sem perder texto original, medidas, dose, lado, negação ou fonte. Localização documental pelo nome do teste não confirma critério nem substitui a região selecionada pelo profissional. Teste planejado/não realizado não conta como exame realizado. Não nomear uma manobra mais específica do que a descrita.
- Avisos técnicos continuam no painel/auditoria e ressalvas clínicas necessárias no documento; não ocultar revisão pendente. Texto manual/revisado permanece protegido e atualização de base exige confirmação.
- Executar `evaluation_report_document.test.cjs` na barreira hospedada junto às suítes anteriores. Preservar deduplicação da história, adjacência exame/interpretação regional e isolamento entre pacientes.

## Regra de segurança prioritária

### Analisador documental local

- Preservar o fluxo local: inventário tipado da avaliação completa, unidades com origem, grafo/escopo, roteiro por assunto, realização gramatical e validação de significado. Não voltar a usar somente substituições de palavras ou copiar a HMA como relatório final. Nenhum serviço de IA/API externa faz parte deste fluxo.
- A gramática tem cobertura finita: se a realização mudar local, lado, tempo, negação, sujeito, dose ou certeza, conservar a origem e exigir revisão. Texto desconhecido não autoriza completar lacunas, trocar testes, diagnosticar ou criar causalidade. Preservar texto manual/revisado, cabeçalho e seções clínicas úteis, sem títulos por frase nem metadados de auditoria na narrativa.
- Deduplicação textual exige conteúdo documental completo equivalente e mantém todas as origens. Não fundir repetição com hipótese nova, outro momento, outro lado, outra dose ou outro paciente. Executar `clinical_document_analyzer.test.cjs` na barreira hospedada sem reduzir os testes anteriores.
- Cada queixa tem localização/lado e episódios próprios; início, duração, repercussões e modificadores só pertencem à sua fonte explícita. Um fator sem queixa definida requer esclarecimento, não distribuição automática entre regiões. Troca de sujeito explícito não transfere negação ou história familiar para o paciente.
- Matriz documental mantém cada hipótese e seus testes explicitamente vinculados, com critérios atendidos/não atendidos/inconclusivos e limites. Resultado positivo não é diagnóstico; negativo não é exclusão e correspondência regional não é confirmação. Não alterar critérios científicos para produzir uma conclusão mais forte.
- Perguntas de esclarecimento e indicadores de qualidade ficam fora da narrativa/PDF. Revisão direciona ao campo de origem, sem respostas presumidas, sem gravação automática e com guarda de contexto contra paciente anterior. Indicadores são contagens documentais, não probabilidades ou certificação de acurácia clínica. Executar `semantic_six_improvements.test.cjs` e `evaluation_document_review.test.cjs` na barreira hospedada.
- Preservar a camada local de linguagem antes do grafo: tokens/orações com offsets, vocabulário explícito e estrutura anatômica específica, sem correção difusa de termos clínicos. Negativas compartilhadas, hipóteses, familiares e citações não perdem escopo ao separar orações. Vocabulário vago exige conferência, não diagnóstico presumido.
- “Essa dor” e referências suportadas só recebem localização quando houver um único antecedente explícito seguro no documento atual; guardar referência e antecedente na auditoria. Não escolher o mais próximo entre várias queixas, herdar duração/intensidade, atravessar paciente ou transformar relação documental em causalidade. Texto original/manual permanece soberano. Executar `clinical_language_rules.test.cjs` na barreira hospedada e manter os fixtures anteriores exercitando a camada real.
- Sugestões de testes na etapa 2 usam o mesmo plano do Radar e a chave região + grupo + ID, sem substituir silenciosamente por outro ranking regional. Recalcular após carga lazy com guarda de contexto; preservar seleção manual, hipóteses descartadas e resultados. Rótulos conhecidos da anotação são estrutura auditada, nunca justificativa para remover conteúdo clínico desconhecido ou escopo de família/medicamento. Trechos sem interpretação automática exigem revisão explícita. Executar `report_radar_consistency.test.cjs` junto às suítes anteriores.
- História clínica usa realização gramatical por fatos e transições discursivas auditadas, sem apagar a HMA original ou inventar lados/elos entre queixas. “Outra coisa.” isolado pode separar parágrafos; fala citada, expressão desconhecida e hipótese não podem ser removidas como se fossem formatação. Preservar autoria e texto revisado.
- Cirurgias selecionadas têm data/período opcional individual (`dataCirurgia`), com nome canônico independente do rótulo da interface. Salvar/reabrir no registro e JSON clínico existentes, preservar legado/chaves anteriores, refletir no relatório/PDF e limpar entre pacientes. Não distribuir uma data geral por várias cirurgias nem disparar autosave durante a restauração. Executar `evaluation_history_surgery_dates.test.cjs` na barreira hospedada junto aos contratos anteriores.

### Catálogo medicamentoso individual

- Novas sugestões representam um produto por opção, com nome e campo integral de princípios ativos da fonte Anvisa. Não agrupar marcas alternativas, converter expressões vagas em fármacos específicos, decompor vírgulas em associações presumidas nem inventar dose/indicação. Naproxeno deve permanecer pesquisável.
- Preservar literalmente medicamentos já salvos e texto profissional. Não migrar nem reinterpretar descrições legadas ambíguas automaticamente. Seleção deve continuar independente, sem duplicar tags, com teclado e sob carga tardia.
- Atualizações da base passam pelo importador reprodutível, com hash, data, filtro de registros ativos e fonte documentados. Executar `medication_catalog.test.cjs` junto aos contratos da Anamnese, relatório e Agenda. Dados de catálogo não são prescrição nem comprovam disponibilidade comercial.

### Contratos da auditoria de interface de 25/10/2026

- A Agenda móvel preserva Anterior/Hoje/Próxima, Semana/Dia e seletor de data. Reposicionar os mesmos controles, com restauração ao desktop, sem alterar cálculo de horários, dados, sincronização ou lista de espera. Esta decisão substitui a antiga remoção visual dos controles no celular.
- Nova evolução começa com estado clínico não informado e EVA não avaliada. Ausência é `null`, distinta de dor zero explícita. Preservar valores antigos, edição/duplicação, transporte, histórico e exportação; não reinterpretar registros anteriores como ausentes. Não presumir uma medida clínica a partir da posição inicial do slider.
- Consultas distinguem carregamento, erro, vazio confirmado e zero confirmado. Equipe oferece nova tentativa e ignora respostas anteriores à mudança de clínica/perfil; Pendências não apresenta cache como consulta confirmada após erro. Cores não podem ser salvas antes de carregar os procedimentos.
- Relatórios mantêm checkboxes visíveis com foco de teclado e colunas alinhadas sem deslocamento sticky. Tabelas de Equipe e procedimentos mantêm palavras legíveis com rolagem lateral restrita à tabela no celular; não aplicar correções globais que mudem outras telas.
- Anúncios de navegação aguardam o carregamento real e usam o título atual; respostas antigas não podem focar/anunciar outra rota. Datas de diretório aparecem em dia/mês/ano sem converter o dia pelo fuso. Remoção de ícones decorativos trata sequências Unicode inteiras, sem deixar surrogates ou seletores de variação.
- Executar `interface_audit_regression.test.cjs` e `evolution_model1_roundtrip.test.cjs` na barreira hospedada, preservando todas as suítes anteriores. A prévia `tests/helpers/ui_preview.cjs` é local, somente leitura; sua composição `__audit_fixture` usa dados sintéticos e não integra a aplicação publicada. Nunca incluir evidências com dados de pacientes no Git.
- A pedido de 26/10, títulos que recebem foco programático para leitura não exibem caixa/contorno, nos perfis administrativo e profissional. Preservar foco visível em links, botões, campos e demais controles de teclado; corrigir no CSS de origem, sem uma nova folha de sobreposições.
- A inicialização mostra apresentação neutra enquanto restaura a sessão e monta a rota autorizada. Não exibir primeiro o login legado, a Home de outro perfil ou conteúdo intermediário. Sessão ausente/erro liberam o login unificado; espera prolongada oferece ação de recarregar. Preservar recuperação, permissões e a invalidação de respostas anteriores ao logout. Não depender de animação para liberar a interface. Executar `access_management.contract.js` na barreira hospedada.
- Textos fixos de interface são escritos sem emojis na origem. Preservar conteúdo digitado de pacientes e gravidade dos avisos por metadados explícitos, sem remover ícones SVG funcionais. Não regravar históricos nem eliminar campos clínicos para limpar decoração.

### Contratos da auditoria completa de 26/10/2026

- Agenda → pagamento define o contexto do paciente da ocorrência antes de navegar e aguarda a inicialização do Financeiro. Cancelamento, outra abertura, falha de carga e troca de perfil/clínica continuam invalidando respostas anteriores. Nunca retirar as travas ou reaproveitar dados do paciente anterior para contornar uma falha de abertura.
- A primeira carga financeira respeita a aba escolhida enquanto aguarda dados. Livro-caixa libera a propriedade dos painéis ao trocar de aba também por atalhos programáticos; não reabrir Caixa por temporizador que possa desfazer a escolha atual.
- As buscas de Documentos, Evolução, Relatórios e Lista de espera ordenam correspondência antes do limite de resultados, ignorando acentos. Preservar seleção pelo ID, teclado e fechamento. Reaplicação tardia do contexto não seleciona um paciente ou uma rota anterior.
- Detalhe de agendamento mostra a data; histórico e plano identificam o paciente dentro do diálogo. Última avaliação usa a mesma formatação de data do diretório, sem alteração de fuso.
- Editar cadastro tem título próprio e cancelamento de volta ao prontuário selecionado. Não salvar ao cancelar. Tabelas, campos ocultos de senha e formulários de Equipe mantêm comportamento tanto na página própria quanto dentro de Configurações.
- Busca de ajustes preserva a aba aberta e oferece resultados com destino explícito. Campos de registro e perfil continuam sendo editados pelo formulário canônico, sem duplicar IDs ou permissões.
- Uma região ainda sem hipótese nem exame não vira hipótese sem nome no relatório. A consulta de catálogo não aprova hipótese. Um único ponto de EVA não comprova tendência. Não alterar critérios científicos, valores antigos ou texto profissional para corrigir apresentação.
- Instruções de Documentos distinguem QR/pasta/miniaturas atuais e serviço legado. Falha do gerador externo é informada em português e não representa indisponibilidade da avaliação local. Não expor chaves, ativar provedor pago ou afirmar conexão inexistente para esconder erro de configuração.
- Executar `tests/interface_audit_full.test.cjs` e os testes financeiros ampliados na barreira hospedada, preservando as demais suítes. Dados e evidências reais de pacientes continuam fora do Git.

A separação entre `public_html` e `public_html/app` é uma invariável de produção. Qualquer deploy, script, sincronização, restauração ou limpeza que possa atravessar essa fronteira deve ser interrompido antes de executar. Nunca use o repositório KineSys como fonte do site institucional.

### EVA inicial e Radar light glass — 26/10/2026

- Preservar integralmente a HMA e a interface anterior a Antecedentes e fatores modificadores. Dor (EVA) é um painel adicional no mesmo índice, sem excluir os sete grupos existentes. Ausência é nula, distinta de zero explícito, no formulário, rascunho, transporte, normalização, relatório e gráfico.
- A curva usa avaliações finalizadas e evoluções do próprio paciente/clínica. A prévia da EVA não salva nem inventa histórico ou tendência; abrir a análise ignora respostas antigas após troca de contexto. Não reintroduzir valor legado quando a medida atual estiver explicitamente nula.
- Alertas da anamnese ficam no final dos antecedentes em light glass suave, com severidade e conteúdo reais do Radar, sem alterar os critérios clínicos ou retirar acesso a todos os alertas.
- Prontuário completo não exibe apêndice técnico bruto nem o texto automático de Quadro geral sem região investigada. Contexto da entrevista apresenta o conteúdo registrado (inclusive sono, trabalho, cirurgias e medicações), não a etiqueta Relato registrado. Falta de detalhe continua explícita; texto original, laudo profissional e auditoria permanecem preservados.
- Manter os casos de EVA e prontuário ampliados nas suítes existentes evaluation_context_model2.test.cjs, prontuario_clinico.test.cjs e prontuario_export_lazy.contract.js; executar também meu_dia_lifecycle.contract.js na barreira hospedada. Nenhum arquivo de correção adicional é necessário.

### Coerência documental por assunto — 26/10/2026

- Exame livre é campo de origem, não prova de que o conteúdo é um teste. Cirurgia, sono e uso de medicamento explicitamente descritos entram no contexto do relatório; conservar texto, data, sujeito, negação, doses e origem. Antecedente não cobre exame regional nem confirma critério, mesmo que vinculado indevidamente ao catálogo.
- Sem região selecionada, usar localização documental explícita ou nome conhecido do teste somente para organizar a narrativa, sem alterar a seleção profissional ou confirmar diagnóstico. Dado ainda sem localização permanece descrito, com revisão fora do documento; não imprimir títulos Região não definida ou similares.
- Antecedentes curtos são articulados em parágrafos de contexto, preservando seções clínicas úteis e as fronteiras de exames/regiões. Não preencher um parágrafo curto com conteúdo inventado nem criar causalidade entre sono, medicamento e queixa. Gramática de sono e uso medicamentoso é estrita; fármaco desconhecido, negativa ou sujeito familiar não autoriza reformulação presumida.
- Executar os casos ampliados em evaluation_report_document.test.cjs, evaluation_free_exam.test.cjs e clinical_document_analyzer.test.cjs, além de toda a barreira anterior. Texto manual/revisado e HMA original continuam protegidos.

### Auditoria narrativa de dez avaliações — 27/10/2026

- História clínica mantém, por queixa, o relato e seus modificadores em ordem documental, com início e EVA na história. Zero é medida explícita, não ausência de avaliação. Contexto é organizado em parágrafos clínicos e de rotina; não distribuir EVA ou mecanismo sem vínculo específico entre várias queixas.
- Uso medicamentoso histórico ou negativa atual não se torna uso atual pela presença de uma tag. Nota detalhada que cobre os produtos selecionados conserva doses, frequência e cronologia sem duplicar a lista genérica. Negativa de início súbito não nega a própria cefaleia. Locais/qualificadores distintos não são contradições só por pertencerem à mesma região.
- Referência nominal definida pode resolver apenas o lado de um antecedente explícito único no mesmo território, com origem auditada. Não herdar duração, intensidade ou causalidade; múltiplos lados/episódios, familiares, negativas e hipóteses impedem essa resolução. Apoio e elevação do braço em modificadores não criam outra queixa.
- Exame livre é organizado em parágrafos por localização documentada, com trechos e offsets íntegros, sem listas ou títulos regionais vazios. Nenhuma reformatação aprova hipótese nem transforma cirurgia/medicação em teste. Ausência de imagem não é um laudo apresentado. Texto desconhecido permanece rastreável e sujeito a revisão.
- Executar os dez casos completos incorporados a evaluation_report_document.test.cjs e os casos ampliados de clinical_language_rules.test.cjs/evaluation_semantic_graph.test.cjs na barreira existente. Ausência de omissões/invenções nos testes não equivale à validação clínica profissional; dúvidas continuam sinalizadas fora do texto copiável. Preservar HMA, relatórios manuais/revisados e isolamento de paciente.

### Correções da segunda rodada de relatórios — 27/10/2026

- Localização explicitamente interescapular não vira nova queixa de ombro; Aquiles mantém estrutura, lado e origem, sem inferir tendinopatia/ruptura. Queimação, hipersensibilidade e tontura são sintomas relatados, sem criar diagnóstico. Direção que provoca tontura não é lado de uma lesão.
- Coordenação nominal direta pode compartilhar o local explicitamente posposto (“dor e rigidez no joelho”), preservando negação/sujeito. Outro local, predicado, dose ou data interrompe essa ligação. A queixa atual em cicatriz permanece na história; antecedente de queimadura/cirurgia não substitui a queixa.
- Referências já resolvidas não contam como episódios independentes. Qualificadores coloquiais conhecidos mantêm a origem literal e o qualificador documental; múltiplas queixas, lados ou episódios continuam exigindo esclarecimento, sem escolher o mais próximo.
- Cabeçalho inclui sintomas não dolorosos reconhecidos. Tontura sem EVA medida não ganha EVA zero. Dix-Hallpike organiza somente o território documental do exame e a continuação explícita do mesmo registro; não confirma etiologia nem altera a região escolhida pelo profissional.
- Redação dos testes preserva resultado, alternativas, vínculo e limiares originais, com concordância verbal e nomes compreensíveis. O auditor considera o contexto regional dos fatos estruturados, sem ignorar trechos do texto escrito. Troca de resultado/lado/dose, omissões e novas afirmações continuam detectáveis; HMA e relatórios manuais/revisados permanecem intactos.
- Reexecutar as duas rodadas (20 casos) em evaluation_report_document.test.cjs e os cenários ampliados de clinical_language_rules.test.cjs na mesma barreira crítica existente. Aprovação funcional não equivale à validação clínica profissional; pendências legítimas ficam fora do texto copiável e não devem ser apagadas apenas para obter modo assistido.


### Redação e dosagem individual — 27/10/2026

- Relatório não imprime estado de preenchimento/revisão do exame livre nem a lista automática de regiões sem resultados. Manter essas pendências no painel, auditoria e bloqueios de finalização; não confirmar hipótese por omissão de um aviso. Preservar ressalvas clínicas de resultados divergentes e a conclusão profissional.
- EVA integra o parágrafo de história com referência explícita à avaliação, sem atribuição presumida à última região. Fragmentos de duração/localização podem receber gramática documental estrita, sem inventar a relação anatômica entre canela e tornozelo ou distribuir uma duração por várias queixas.
- Nomenclatura glútea bilateral exige bilateralidade explícita. Ortografia usa regras fechadas e conserva original, negação, dose, data, nível vertebral, grau e incerteza. Não corrigir por aproximação um termo clínico desconhecido nem transformar o verbo evidencia em evidência.
- Medicamento tem dosagem opcional individual em clinicaEstruturada.medicamentos no JSON existente, preservando rótulo original, legado e demais chaves. Campo de dose limpa entre pessoas, restaura sem autosave e permanece no prontuário/PDF. Catálogo mantém composição na avaliação; relatório usa nome do produto reconhecido e dose explicitamente vinculada. Não inferir dose a partir do catálogo, de outra seleção ou de uma nota solta; não imprimir aviso de dose ausente.
- Executar os casos ampliados de evaluation_report_document.test.cjs, evaluation_report_integration.test.cjs, clinical_language_rules.test.cjs e evaluation_history_surgery_dates.test.cjs na barreira existente. Conferir a linha de medicamentos/dose em notebook e celular. Texto manual/revisado permanece protegido.


### Edição financeira atômica — 28/10/2026

- Edição online de ocorrência persistida usa `kinesys_editar_atendimento`: guarda de versão, autorização/clínica, horário e cobrança numa transação. Falha financeira não permite confirmar apenas a edição clínica. Manter conflitos, bloqueios, confirmação de horário extraordinário e o mesmo id/paciente/status/duração. A regra vale para qualquer horário, normal ou extraordinário; nunca codificar exceção só para 07h/13h.
- Pacote cancelado sem saldo de recebimentos/créditos pode ter uma ocorrência explicitamente convertida para procedimento individual em uma operação. Não reativar o pacote, transferir recebimentos silenciosamente, desvincular em etapa intermediária inválida ou recriar cobrança do pacote. Pacote ativo ou com saldo exige revisão, sem liberação silenciosa.
- Cobrança paga só é reprecificada após confirmação explícita, por personalização auditada, preservando identidade, condições originais, recebimentos, estornos e créditos aplicados. Conferir descontos do novo serviço. Alterar apenas horário não cria contratação desnecessária.
- Executar o teste PostgreSQL isolado `tests/pacotes_contrato_db.test.mjs` no próprio check obrigatório, com PGlite 0.5.12 fixado, além das suítes anteriores. Cobrir vários horários extraordinários e normais, 100→150, pacote cancelado→individual, desconto/65 quitado sem crédito fictício, concorrência, autorização e rollback quando a cobrança falha.

### Redação documental sem repetição — 28/10/2026

- Relatório realiza orações clínicas completas por regras finitas de conteúdo, sem variar verbos aleatoriamente nem apenas remover refere/relata. Localização, lateralidade, dose, cronologia, negação, familiar e diagnóstico apenas informado permanecem protegidos pela validação semântica e pelas origens literais. Rotina de computador e dominância são contexto, sem causalidade presumida.
- Continuação de frequência só se liga à ocorrência explicitamente descrita imediatamente antes, com ambas as origens auditadas. Uso não frequente sem objeto não é atribuído ao medicamento/dispositivo mais próximo. Evitar cortes mecânicos de parágrafo que deixem uma frase final isolada; não inventar conteúdo para preencher parágrafo.
- Base automática não revisada recebe revisão semântica 11; texto manual ou revisado não é sobrescrito. Manter os cenários ampliados em clinical_document_analyzer.test.cjs e toda a barreira crítica hospedada.
- A nova RPC de edição de atendimento não concede execução a anon, inclusive quando houver grant direto por default privileges; manter esse cenário no teste PostgreSQL isolado.
