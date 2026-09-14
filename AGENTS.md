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

## Regra de segurança prioritária

A separação entre `public_html` e `public_html/app` é uma invariável de produção. Qualquer deploy, script, sincronização, restauração ou limpeza que possa atravessar essa fronteira deve ser interrompido antes de executar. Nunca use o repositório KineSys como fonte do site institucional.
