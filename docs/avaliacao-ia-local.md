# Piloto de IA local da Avaliação

Instalação solicitada em 24/10/2026 no HD NOVO (G:). Não altera o KineSys publicado, banco ou avaliações existentes. Não contém chave de API, serviço pago ou dependência de provedor externo para inferência. Baixar o programa e os pesos exige internet; a inferência acontece neste computador.

## Componentes e uso

- Ollama standalone oficial 0.40.11: `G:\KineSys-IA\Ollama`.
- Modelo `qwen3:4b`, Q4_K_M, aproximadamente 2,5 GB, Apache 2.0: `G:\KineSys-IA\Modelos`.
- Node e laboratório: `G:\KineSys-IA\Runtime` e `G:\KineSys-IA\App`.
- Iniciar: `G:\KineSys-IA\Iniciar-IA-Local.cmd`; depois abrir `http://127.0.0.1:8766/`.
- Somente demonstração fictícia, sem conexão ao banco. O usuário deve confirmar que os dados são fictícios antes de gerar o rascunho. Modelo geral, não validado como dispositivo clínico.
- O computador precisa estar ligado e os serviços iniciados. Não há inicialização automática com o Windows. Reiniciar o serviço invalida pareamentos existentes.

O painel usa o conector `evaluation_local_ai-1.0.0.js`. O conector é uma fábrica opcional, **não está incluído no loader da Avaliação de produção**. Não há botão aplicado à avaliação real nesta fase. Conectar a página HTTPS ao loopback ainda exige testes específicos de permissões do navegador e uma integração separada; não basta publicar estes arquivos.

## Fluxo e limites

1. Painel local obtém código de pareamento local e o troca por token temporário em memória.
2. Captura imutável de fontes e IDs de clínica/paciente/avaliação/revisão; sem histórico de outro paciente.
3. Envia apenas fontes ao Ollama local, com schema JSON e instruções de preservação do significado. Conteúdo das fontes não é autoridade para executar instruções.
4. Valida frases literais completas, exige que todas as frases das fontes apareçam na extração, confere números, fatos vinculados aos parágrafos e significado reconhecido pelo grafo determinístico existente. A camada de fatos mantém a citação original; a IA reescreve somente os parágrafos.
5. Exibe rascunho, rastreamento e dúvidas para revisão profissional. Não salva, não aplica e não substitui texto profissional.

Respostas após mudança do paciente, avaliação, revisão ou conteúdo são descartadas. Há trava de uma inferência por vez. Nenhuma chamada acessa Supabase, Agenda, Financeiro, Evolução ou uma API de IA em nuvem.

O piloto usa janela de 8.192 tokens e reserva de saída de 2.048 tokens. O orçamento conservador limita a soma em UTF-8 de instruções + fontes + schema a 5.500 bytes. Avaliações longas são recusadas explicitamente, sem truncar; suporte a prontuários grandes não está concluído. Não dividir uma avaliação real em partes sem preservar relações e testar cobertura.

Trecho literal e aprovação por regras **não comprovam** que a interpretação está correta ou que toda informação de cada frase foi incorporada à redação final. As regras têm cobertura finita. A saída pode omitir detalhes, apresentar texto inadequado, apenas repetir a fonte ou falhar na validação mesmo quando a paráfrase é aceitável. O modelo 4B pode ter qualidade inferior a modelos maiores. Sempre revisar contra a avaliação inteira; não usar o piloto para diagnosticar ou prescrever.

## Segurança local

- Ollama: `127.0.0.1:11434`, `OLLAMA_NO_CLOUD=1`, `OLLAMA_MODELS` no G:.
- Ponte: `127.0.0.1:8766`; nenhum binding de LAN ou túnel.
- Allowlist exata de Origin/Host, sem CORS curinga. Código disponível somente ao painel local, token de 30 minutos vinculado à origem, máximo de 30 tentativas de pareamento por execução. Código dura até reinício.
- Corpo JSON limitado, validação de contexto, CSP, sem cache e sem log de conteúdo clínico. O Ollama não oferece autenticação própria neste loopback; processos do mesmo usuário e extensões maliciosas continuam sendo riscos locais. Isto não é uma plataforma multiusuário comercial pronta.
- Programas, pesos e logs técnicos no G:. Ollama pode criar pequenos metadados/chaves no perfil do Windows. Não mudamos PATH, regras de firewall, registro, tarefas agendadas nem inicialização do Windows.

## Testes e reversão

`node tests/evaluation_local_ai.test.cjs` usa somente fontes sintéticas e inferência falsa para testar o contrato: números/negação/lado, trecho literal, fonte ausente, contexto, resposta antiga, concorrência, origem/token, tamanho e UTF-8 fragmentado. O CI não baixa pesos nem faz inferência. As demais suítes de regressão continuam obrigatórias.

Inferência real e GPU devem ser verificadas no computador após a instalação; testes de contrato não certificam a qualidade do modelo. Não ampliar a integração a pacientes reais com base apenas nesses testes.

Backup prévio verificado: `G:\KineSys-IA\Backups\kinesys-before-ia-local.zip` (produção `755311e61b5e4fc45e758f4b95bc1a7eea3afb96`). Sem publicação, nenhuma restauração de produção é necessária. Para parar, identificar os PIDs das portas 8766/11434 e confirmar executável/linha de comando dentro de `G:\KineSys-IA` antes de encerrar somente esses processos. Remover futuramente apenas a instalação confirmada em `G:\KineSys-IA`, após preservar os resultados desejados. Não remover pastas gerais, o perfil ou outros serviços Ollama.
