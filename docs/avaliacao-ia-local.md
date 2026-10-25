# Piloto de IA local da Avaliação

Instalação solicitada em 24/10/2026 no HD NOVO (G:). Não altera o KineSys publicado, banco ou avaliações existentes. Não contém chave de API, serviço pago ou dependência de provedor externo para inferência. Baixar o programa e os pesos exige internet; a inferência acontece neste computador.

## Componentes e uso

- Ollama standalone oficial 0.40.11: `G:\KineSys-IA\Ollama`.
- Modelos comparáveis locais: `qwen3:4b`, `qwen3:4b-instruct-2507-q4_K_M` e `qwen2.5:7b-instruct-q4_K_M`, preservados em `G:\KineSys-IA\Modelos`. O modelo padrão fica fixado no código após comparação sintética, sem troca automática ou fallback em nuvem.
- Padrão v2: `qwen3:4b-instruct-2507-q4_K_M`. Na comparação inicial de oito casos, o 7B foi mais lento, recusado em mais cenários e produziu expansão incorreta de uma sigla; não foi promovido. A sigla indevidamente expandida passou numa versão intermediária da conferência, foi detectada ao ler o resultado e originou uma checagem/teste adicional. Isso demonstra por que métricas automáticas não substituem revisão.
- Node e laboratório: `G:\KineSys-IA\Runtime` e `G:\KineSys-IA\App`.
- Iniciar: `G:\KineSys-IA\Iniciar-IA-Local.cmd`; depois abrir `http://127.0.0.1:8766/`.
- Somente demonstração fictícia, sem conexão ao banco. O usuário deve confirmar que os dados são fictícios antes de gerar o rascunho. Modelo geral, não validado como dispositivo clínico.
- O computador precisa estar ligado e os serviços iniciados. Não há inicialização automática com o Windows. Reiniciar o serviço invalida pareamentos existentes.

O painel usa o conector `evaluation_local_ai-1.0.0.js`. O conector é uma fábrica opcional, **não está incluído no loader da Avaliação de produção**. Não há botão aplicado à avaliação real nesta fase. Conectar a página HTTPS ao loopback ainda exige testes específicos de permissões do navegador e uma integração separada; não basta publicar estes arquivos.

## Fluxo e limites

1. Painel local obtém código de pareamento local e o troca por token temporário em memória.
2. Captura imutável de fontes e IDs de clínica/paciente/avaliação/revisão; sem histórico de outro paciente.
3. O programa monta o inventário de todas as frases com origem e offsets, tipo e regiões documentais, sem pedir à IA que recopie fatos. Conteúdo com aparência de instrução é separado para conferência, com o texto original visível, e não enviado ao redator como dado clínico.
4. O modelo escreve somente parágrafos, com IDs de fatos limitados pelo schema. Não gera perguntas, condutas ou diagnóstico. A análise regional documental permanece separada da narrativa: rótulo regional não autoriza acrescentar anatomia à queixa.
5. Valida significado reconhecido pelo grafo existente, referências, números/unidades, níveis anatômicos, sujeito familiar, procedimento indicado, resultados/lados de manobras conhecidas e acréscimos indevidos. Termos de frases não reconhecidas têm uma barreira lexical adicional contra omissão; isso não equivale a compreensão clínica. Uma correção limitada usa o mesmo inventário; se ainda falhar, bloqueia a redação, sem colar o original para fabricar sucesso.
6. Exibe rascunho, rastreamento, fontes em conferência e indicadores documentais para revisão profissional. Não salva, não aplica e não substitui texto profissional. Editar a fonte limpa imediatamente o rascunho exibido; resposta atrasada é descartada.

Respostas após mudança do paciente, avaliação, revisão ou conteúdo são descartadas. Há trava de uma inferência por vez. Nenhuma chamada acessa Supabase, Agenda, Financeiro, Evolução ou uma API de IA em nuvem.

Até 5.500 bytes para mensagens + schema, usa janela de 8.192 tokens e saída de até 2.048 tokens. Entradas maiores, até 10.000 bytes, usam 16.384/4.096 tokens e podem ficar mais lentas por usar parte da CPU nesta máquina. Limite de 120 frases; excesso ou saída incompleta é recusado explicitamente, sem truncar. Há uma única tentativa de correção documental, com prazo total limitado. Suporte a prontuários grandes não está concluído. Não dividir uma avaliação real em partes sem preservar relações e testar cobertura.

Trecho literal e aprovação por regras **não comprovam** que a interpretação está correta ou que toda informação de cada frase foi incorporada à redação final. As regras têm cobertura finita. A saída pode omitir detalhes, apresentar texto inadequado, apenas repetir a fonte ou falhar na validação mesmo quando a paráfrase é aceitável. O modelo 4B pode ter qualidade inferior a modelos maiores. Sempre revisar contra a avaliação inteira; não usar o piloto para diagnosticar ou prescrever.

O v2 agrupa sentenças consecutivas de mesma fonte/assunto sem fundir suas afirmações, preservando os IDs. Ainda usa redação bastante conservadora; não atingiu interpretação equivalente a um humano ou a uma API de modelo maior. A rodada selecionada aceitou seis de oito exemplos; os casos de canela com referências fragmentadas e a narrativa longa continuaram bloqueados após a correção. Não apresentar essa proporção como acurácia, nem ocultar as limitações para ativar o recurso em pacientes reais.

## Segurança local

- Ollama: `127.0.0.1:11434`, `OLLAMA_NO_CLOUD=1`, `OLLAMA_MODELS` no G:.
- Ponte: `127.0.0.1:8766`; nenhum binding de LAN ou túnel.
- Allowlist exata de Origin/Host, sem CORS curinga. Código disponível somente ao painel local, token de 30 minutos vinculado à origem, máximo de 30 tentativas de pareamento por execução. Código dura até reinício.
- Corpo JSON limitado, validação de contexto, CSP, sem cache e sem log de conteúdo clínico. O Ollama não oferece autenticação própria neste loopback; processos do mesmo usuário e extensões maliciosas continuam sendo riscos locais. Isto não é uma plataforma multiusuário comercial pronta.
- Programas, pesos e logs técnicos no G:. Ollama pode criar pequenos metadados/chaves no perfil do Windows. Não mudamos PATH, regras de firewall, registro, tarefas agendadas nem inicialização do Windows.

## Testes e reversão

`node tests/evaluation_local_ai.test.cjs` e `node tests/evaluation_local_ai_quality.test.cjs` usam somente fontes sintéticas e inferência falsa para testar o contrato: números/negação/lado, trecho literal, fonte ausente, contexto, resposta antiga, concorrência, origem/token, tamanho, UTF-8 fragmentado, nomes de testes/resultados, doses, procedimento indicado, omissão de termos desconhecidos e revisão limitada. O CI não baixa pesos nem faz inferência. As demais suítes de regressão continuam obrigatórias.

`node tools/local_ai/benchmark.cjs` compara os modelos em casos fictícios e grava somente esses resultados gerados em `G:\KineSys-IA\Resultados`. Há seis cenários de desenvolvimento e dois de reserva. `--model=<tag permitida>` testa um só modelo. Não substituir os fixtures por prontuários reais. Aceitação por regras, proporção de texto reaproveitado e velocidade **não são acurácia clínica**; ler os textos e investigar recusas, sem afrouxar invariantes para elevar o resultado. O indicador textual mede sobreposição de sequências de quatro palavras; repetição de termos médicos pode ser necessária e não há uma meta artificial de “reescrever tudo”.

Fontes técnicas: [modelos Qwen3 no Ollama](https://ollama.com/library/qwen3:4b-instruct-2507-q4_K_M), [Qwen2.5 7B](https://ollama.com/library/qwen2.5:7b-instruct-q4_K_M), [API de chat](https://docs.ollama.com/api/chat) e [janela de contexto](https://docs.ollama.com/context-length). Nenhuma dessas fontes valida o uso clínico deste piloto.

Inferência real e GPU devem ser verificadas no computador após a instalação; testes de contrato não certificam a qualidade do modelo. Não ampliar a integração a pacientes reais com base apenas nesses testes.

Backup prévio verificado: `G:\KineSys-IA\Backups\kinesys-before-ia-local.zip` (produção `755311e61b5e4fc45e758f4b95bc1a7eea3afb96`). Sem publicação, nenhuma restauração de produção é necessária. Para parar, identificar os PIDs das portas 8766/11434 e confirmar executável/linha de comando dentro de `G:\KineSys-IA` antes de encerrar somente esses processos. Remover futuramente apenas a instalação confirmada em `G:\KineSys-IA`, após preservar os resultados desejados. Não remover pastas gerais, o perfil ou outros serviços Ollama.

Antes do v2 também foi arquivada e aberta a versão anterior do piloto: `G:\KineSys-IA\Backups\piloto-v1-1762339.zip`, 585 entradas, SHA256 `81df10eb1a7f8b7296a250c83c43da3c1f7ef102c6c42e317629ad50f9a606ee`. Para reversão seletiva, parar somente a ponte deste G:, recuperar apenas os módulos do piloto daquele backup e reiniciar; o modelo anterior foi preservado. Não restaurar banco, site ou pasta inteira.
