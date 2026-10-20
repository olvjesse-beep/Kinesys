# Documentos — Modelo 2

Alteração de apresentação restrita a Documentos, sem migração ou alteração de dados.

- Busca de paciente acima da lista; dropdown conserva overflow visível e camada própria.
- Lista cronológica com agrupamento por data, Todos/Fotos/Documentos e filtros detalhados.
- Comparação somente de imagens; ações por arquivo no menu acessível.
- Painel verde de captura, QR verdadeiro somente durante sessão válida; pasta abaixo.
- Controles originais são movidos, não clonados, mantendo IDs e listeners de importação/câmera/pasta.
- Nenhum QR, fotografia, pasta ou registro de paciente fictício é inserido na aplicação.
- Shell, perfis, permissões e módulos clínicos/financeiros ficam preservados.

## Verificação

`node tests/documentos_modelo2.test.cjs` executa o renderizador real em VM: ordem,
datas, categorias, filtros, permissões, escape, ausência de comparação de PDFs e
proteção ao limpar paciente. Integra o check hospedado obrigatório de regressão.
Os testes existentes de câmera, picker, Agenda, planos, pagamentos e Home continuam obrigatórios.

Revisão visual local: desktop, notebook1366/1280/1024 e mobile390px.
Captura iPhone física permanece teste de aceitação do usuário; não confundir testes
de protocolo/armazenamento simulados com prova física da transferência.

## Publicação e reversão

Esta alteração não autoriza publicação. Só integrar após aprovação e check hospedado verde.
Destino exclusivo quando autorizado: public_html/app. Nunca public_html institucional.
Reverter somente o commit desta apresentação; não restaurar bancos ou registros.
Backup externo verificado: C:/Users/User/.codex/backups/kinesys-20261020-documentos-modelo2/antes.zip.

Ícones: Tabler Icons3.34.1, licença MIT preservada em assets/vendor/tabler/LICENSE.
