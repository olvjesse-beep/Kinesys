# Fotos por QR code: original local, miniatura na nuvem

## Uso

1. No computador, abra o KineSys publicado em HTTPS pelo Chrome ou Edge. Escolha o paciente em Documentos.
2. Em **iPhone, pasta dos originais e backup**, clique em **Escolher pasta dos originais** e autorize uma pasta dedicada. O navegador mostra o nome da pasta, não seu caminho absoluto.
3. Escolha o tipo e clique em **Gerar QR code**. No iPhone, leia o código e entre com a mesma conta **e perfil** do computador.
4. Ambos devem estar na mesma rede Wi-Fi, sem isolamento de clientes/rede de convidados. O computador e a aba precisam permanecer abertos. Não há TURN/STUN de terceiros nem transmissão de foto pelo Supabase. A prévia 127.0.0.1 não é endereço de celular.
5. Fotografe no iPhone e confirme o envio. Espere **Foto salva no computador e miniatura sincronizada**. Uma foto por conexão; gere outro QR para a próxima.

## Persistência e privacidade

- WebRTC DataChannel criptografado (DTLS). Supabase guarda somente sinalização autenticada temporária, metadados e miniatura JPEG até 480px/90.000 caracteres. Nunca original, vídeo ou áudio.
- Sessão vinculada a conta, perfil, clínica, paciente e tipo; expiração máxima no servidor de 10 minutos. O celular precisa se autenticar; QR sozinho não dá acesso ao prontuário. A seleção do paciente é imutável durante a transferência.
- RLS em ambas as tabelas; nenhum acesso `anon`; secretaria limitada a tipos administrativos. Sem novos endpoints `SECURITY DEFINER`.
- A pasta é autorizada por origem do site/navegador/perfil e gravada via File System Access API. A foto original é preservada byte a byte, com SHA-256 conferido depois da gravação. Estrutura: `clinica_id/paciente_id/AAAA/MM/uuid.ext`.
- Limite: JPEG, PNG ou WEBP até 25 MB. HEIC não é silenciosamente convertido nem descartado: capture em JPEG. A miniatura é produzida em canvas e não carrega EXIF.
- Falha de disco não envia miniatura. Falha de nuvem mantém original e uma fila local durável; **Reenviar miniaturas pendentes** não gera novo recebimento de arquivo nem substitui foto.
- Mudar pasta não move/apaga arquivos antigos. Apagar dados do navegador remove referências/permissões, não arquivos: não use limpeza do navegador como backup. Originais de outra estação não são prometidos como disponíveis só por existir miniatura.
- A referência de abertura local é conservada no navegador que recebeu a foto. Se esse navegador for limpo, o original permanece na pasta e poderá ser aberto manualmente. Não há migração automática nem indexação de pastas antigas nesta versão.
- O serviço local anterior continua disponível em seção própria para documentos legados e seu backup. A função nova não depende dele. Nenhum original legado é movido, enviado ou apagado.

## Implantação e testes

- Migração: `supabase/migrations/20261019211914_iphone_camera_local.sql`.
- Código isolado: `src/core/iphone_camera-1.0.0.js`; CSS escopado; QR gerado localmente com qrcode-generator 1.4.4 (MIT), incluído em `assets/vendor`, sem serviço externo de QR.
- `node tests/iphone_camera.test.cjs` está na barreira obrigatória de Agenda/Planos. Testa limites, paths, integridade, miniatura-only, troca de paciente/clínica, expiração, falha de disco, falha de nuvem/reenvio, protocolo e QR. Os testes usam foto sintética, não prontuários reais.
- Antes de declarar compatibilidade final, testar com um iPhone físico (Safari, login de mesmo perfil, captura real, arquivo na pasta e miniatura em outra estação), incluindo notebook com Wi-Fi restrita. Simulações não substituem esse teste.
- Faça backup externo da pasta: cópia em outro disco protegida e monitorada. A miniatura não recupera o original e este recurso não instala backup automático.

## Reversão

Reverter somente o commit da câmera, sem tocar em Agenda/Financeiro/WordPress. Não remover tabelas usadas nem fotos. Para desativar, revogar escrita nas tabelas novas, preservando SELECT com RLS. Backup da base anterior e roteiro privado em `.codex/backups/kinesys-20261019-midias` fora do repositório público.
