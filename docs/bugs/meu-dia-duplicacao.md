# Meu Dia: duplicação ao retornar da Agenda

## Evidência e causa

Em produção foi observado Operational com arquivo 1.2.1-home-structural-dedupe, mas versão executando 1.0.0. index.html ainda usava chaves antigas para core, Home e Operational; home_detalhes não tinha versão. O problema combinava assets antigos com donos e gatilhos concorrentes.

Auditoria global dos 178 arquivos JavaScript da árvore base ed756b8f994b350a98963cbe33346e17227c969e: carregarPainelFisioterapeuta, painel_fisio_lista, KineSysMeuDiaClinico, kinesys:tela-ativada, tela_home, tela_agenda, focus, blur, visibilitychange, pageshow e MutationObserver.

- Core tinha um carregador legado completo e o chamava em cada entrada na Home.
- Home tinha seu próprio carregador e sobrescrevia o nome global do core.
- Operational envolvia navegarPara e substituía temporariamente o carregador por um noop; também injetava dinamicamente os módulos home_profissional.
- home_profissional_polish observava mutações, movia filhos de listas duplicadas e apagava linhas repetidas: um segundo escritor corretivo.
- home_detalhes envolvia a navegação com timeout e mantinha polling; design_system também solicitava carga dos cards da Home. home_profissional_dashboard tinha três gatilhos de bootstrap/retorno.

Esses caminhos concorrentes e caches explicam a inconsistência; a evidência disponível não permite atribuir cada linha duplicada histórica a uma única resposta de rede.

## Arquitetura corrigida

home_fisioterapeuta_util é o único dono do Meu Dia. Login/primeira Home solicita uma carga; entrar na Agenda solicita atualização; Agenda → Home reutiliza os mesmos nós, sem consulta nem render da timeline. Atualizar executa refresh manual. A lista usa replaceChildren(fragmento), sem dedupe, observer, polling ou wrapper de navegação. Revisões impedem resposta anterior de sobrescrever o snapshot atual; requisição manual concorrente compartilha a carga em curso.

Operational fica exclusivamente com o retorno de foco da Agenda. Os dois scripts profissionais passam a tags defer únicas e versionadas no index. O polish só organiza o cabeçalho após o evento de snapshot, sem escrever na lista. Os outros cards da Home têm carga inicial única e ações explícitas; não são recarregados ao voltar da Agenda.

Exportada fecharMenu pelo módulo que já a implementa. O listener de clique da configuração da Agenda consulta os controles atuais e verifica sua existência, evitando referências a DOM removido. Sino SVG monocromático substitui o emoji de notificação.

URLs dos módulos envolvidos receberam meudia=20260915-owner-r1 no index. Não há substituição de HTML pelo servidor. Não foi alterado Supabase, SQL, regra clínica ou financeiro.

## Validação

Executar na raiz:

```sh
node tests/meu_dia_lifecycle.contract.js
node tests/home_return_queries.contract.js
node tests/operational_resume_refresh.contract.js
node tests/runtime_asset_cache.contract.js
node tests/menu_dropdown_modularization.contract.js
node tests/fisio_home_patient_self_service.contract.js
node tests/screen_loader.contract.js
```

Os testes usam dados sintéticos: 20 ciclos, zero atendimentos/um intervalo livre, identidade dos nós preservada na volta, refresh manual, foco/blur/pageshow, reload, falha/recuperação e resposta atrasada. São testes de execução dos módulos em VM e contratos de integração; não substituem validar a sessão profissional no navegador.

Console, já na Agenda após terminar a carga:

```js
window.meuDiaAntes = KineSysMeuDiaClinico.status();
window.meuDiaListaAntes = document.getElementById('painel_fisio_lista').firstElementChild;
```

Voltar pela interface para Home e executar:

```js
console.table({
  versao: KineSysMeuDiaClinico.version,
  operational: KineSysOperationalResumeRefresh.version,
  cargasAdicionais: KineSysMeuDiaClinico.status().revision - meuDiaAntes.revision,
  rendersAdicionais: KineSysMeuDiaClinico.status().renders - meuDiaAntes.renders,
  mesmoSnapshot: document.getElementById('painel_fisio_lista').firstElementChild === meuDiaListaAntes,
  listas: document.querySelectorAll('#painel_fisio_lista').length
});
```

Esperado: 1.25.0-single-owner; 1.3.0-agenda-only; 0; 0; true; 1. Nenhum dado de paciente é incluído no diagnóstico.

## Reversão

Backup local verificado fora da pasta pública: kinesys-backup-20260915-meudia, ao lado da pasta de trabalho. Reverter o PR e publicar somente os arquivos afetados em public_html/app. Nunca restaurar a pasta public_html inteira. O cache novo requer recarregar abas abertas; sessões já abertas não podem trocar código JavaScript em memória com segurança sem reload.

Validação adicional no navegador local: DOM real com dados sintéticos e módulo de produção; 20 ciclos + refresh manual = 22 cargas/22 renders e sempre 1 linha; reload = 1 carga/1 render. Nove arquivos de produção foram baixados, preservados e comparados com a base auditada antes do PR.
