# KineSys — instruções permanentes de projeto e produção

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

Estas decisões só podem ser removidas ou revertidas por solicitação explícita do usuário. Refatorações devem preservar o comportamento e ampliar os testes quando necessário:

- Em notebook, navegação e filtros da Agenda quebram por grupos, nunca por letras ou por sobreposição de campos. Conferir 1366×768, 1280×720, 1024×768 e mobile.
- Busca de pacientes ordena relevância antes de paginar: nome exato, começo do nome, palavra no meio e ocorrência parcial. Ignorar acentos/caixa; sem filtro manter alfabética. Caso permanente: José Antônio antes de Dilson José e João José ao buscar jose.
- Trocar somente procedimento na edição não limpa horário nem modifica duração original ou campos não tocados. Respostas assíncronas antigas não sobrescrevem a escolha atual; conflitos, bloqueios e confirmação extraordinária permanecem obrigatórios.
- Pagamento aberto pela Agenda retorna à Agenda somente após sucesso, inclusive contrato/pacote; aberto no Financeiro permanece ali. Erro de lançamento conserva formulário/contexto para nova tentativa.
- Cada abertura de pagamento limpa o contexto anterior e confirma paciente, clínica, agendamento, procedimento e cobrança no servidor. O vínculo permanece imutável até salvar ou cancelar. Respostas antigas, troca de paciente/clínica e duplo clique não podem registrar em outra pessoa. Preservar os testes unitário → pacote → genérico, concorrência e repetição após erro em `financeiro_modal_bootstrap.test.cjs`.
- Não remover Abrir prontuário do detalhe, nem Histórico de agendamentos e Financeiro do prontuário ativo. Atalhos selecionam o paciente pelo ID e respeitam permissões, sem busca manual.
- Histórico é somente leitura, por paciente e clínica, em data/hora decrescente, com paginação e situação financeira canônica. Não transformar falha de consulta em Pago/Pendente falso nem revelar financeiro a perfil restrito.
- Corrigir procedimento de uma ocorrência unitária pode preservar o contrato financeiro original; jamais reatribuir paciente/clínica/contrato nem converter pacote incompatível silenciosamente. Identidade/valores/pagamentos do contrato permanecem imutáveis.

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

## 14. Contrato permanente dos atalhos de WhatsApp

- Agenda (lembrete e lista de espera), CRM e Home administrador abrem diretamente `https://web.whatsapp.com/send?phone=...&text=...`, com número internacional e mensagem codificada, sem `wa.me`/`api.whatsapp.com` como etapa intermediária. O envio continua manual, sem clicar em Enviar automaticamente.
- Não afirmar que o KineSys consegue inspecionar a sessão ou controlar uma aba externa já aberta. O WhatsApp verifica o login do próprio perfil do navegador; sessão desconectada pode exigir autenticação.
- Invalidar os assets de todos os consumidores e executar `whatsapp_direct_web.test.cjs` na barreira hospedada. Preservar destinatário responsável/dependente, texto configurado e o registro de lembrete; usar somente destinatários sintéticos nos testes, sem enviar mensagens reais.

## Regra de segurança prioritária

A separação entre `public_html` e `public_html/app` é uma invariável de produção. Qualquer deploy, script, sincronização, restauração ou limpeza que possa atravessar essa fronteira deve ser interrompido antes de executar. Nunca use o repositório KineSys como fonte do site institucional.
