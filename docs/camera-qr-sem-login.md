# Captura por QR — contrato de funcionamento

## Fluxo

O computador autenticado escolhe paciente, categoria e pasta autorizada e gera um QR code. `camera.html` abre no celular sem iniciar o KineSys/Auth. Safari pede permissão da câmera. O botão **Tirar foto e enviar** captura e transmite automaticamente; a captura nativa por seletor de arquivo é a alternativa quando a câmera web não está disponível.

O original é gravado e conferido por SHA-256 na pasta do computador. Somente a miniatura e seus metadados são inseridos pelo computador autenticado em `midias_miniaturas`, respeitando as políticas existentes. Uma falha de sincronização mantém original e fila local; não exige fotografar novamente.

## Segurança e isolamento

- Sala aleatória de 256 bits, chave AES-256-GCM independente, validade de 10 minutos, um celular e uma foto por QR. Não compartilhar o QR.
- Sala/chave/validade seguem no fragmento, nunca na query HTTP. O celular remove o fragmento da barra ao iniciar. Não registrar QR, chaves, imagens ou dados clínicos nos logs.
- Supabase Realtime Broadcast público é apenas o transporte efêmero de mensagens **já criptografadas no aparelho**. Sem persistência de originais em SQL/Storage, sem replay, sem alteração de RLS, sem login anônimo e sem chave privilegiada.
- A página do celular não pode consultar pacientes, financeiro ou prontuário. Só o computador com a sessão ativa decide a destinação imutável.
- Cada bloco tem ordem e limite; o arquivo completo tem tamanho, assinatura de formato e SHA-256 conferidos. A confirmação só ocorre depois de gravar e reler o original.
- Repetições de uma requisição usam o mesmo ID e reutilizam o resultado. Uma confirmação perdida não gera outra gravação.
- Troca de paciente, categoria, perfil/clínica, expiração, saída de Documentos ou cancelamento invalidam a captura. Não sobrescrever arquivos existentes.

## Operação e limites

- Computador: Chrome/Edge, HTTPS publicado, aba aberta e pasta autorizada. A prévia 127.0.0.1 não é acessível pelo iPhone.
- Celular: internet e navegador com WebCrypto/WebSocket; Safari pode exigir autorização ou a alternativa nativa. Não é possível dispensar a permissão de câmera do iOS.
- Os aparelhos não precisam da mesma rede. Dependem de conexão ao serviço Realtime e das cotas do plano Supabase existente.
- Foto JPEG/PNG/WEBP até 25 MB; blocos de 48 KiB com espaçamento. Sem gravação de vídeo.
- Conexão: limite de 15 segundos; câmera sem resposta: alternativa após 12 segundos. Requisições têm até três tentativas limitadas; sem reconexão infinita. A miniatura usa tempo limite com cancelamento de rede.
- Fechar antes da confirmação requer conferir a pasta/prontuário no computador antes de repetir. Após recarregar a página do celular, gerar novo QR.
- Falhas físicas do disco, permissões do navegador, quotas e indisponibilidade de rede são mostradas; não presumir sucesso.

## Proteção contra regressões

O check obrigatório `Agenda e planos - regressao critica` executa também:

- `tests/iphone_camera.test.cjs`: gravação local, hash, fila, contexto, ordem, duplicidade, concorrência, erro de disco/nuvem e timeout.
- `tests/camera_transport.test.cjs`: criptografia, chave/sala/perfil incorretos, confirmação perdida, limites de espera e expiração.
- `tests/camera_phone.test.cjs`: inicialização sem login, remoção do segredo da URL, permissão/fallback, duplo toque e envio automático.
- Contratos existentes de layout/seleção de Documentos, Agenda, Planos e Financeiro, sem remover verificações.

Teste opcional do transporte real: `RUN_CAMERA_LIVE=1 node tests/camera_transport.test.cjs` (variável no formato do shell local). Usa somente bytes sintéticos e persistência simulada, sem escrever registros de pacientes reais. O teste físico Safari/iPhone deve ser feito após publicar: gerar QR no computador, autorizar câmera, fotografar, conferir original, miniatura, paciente e categoria.

## Reversão seletiva

Reverter somente o commit desta alteração em nova PR, preservando mudanças posteriores. Não restaurar banco nem pasta pública inteira. Não tocar no site institucional, DNS ou raiz `public_html`; eventual publicação é exclusiva de `public_html/app`. As tabelas/políticas e registros existentes não foram alterados.
