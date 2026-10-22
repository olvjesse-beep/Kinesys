# Semântica documental v22 e múltiplas queixas

## Escopo

Implementação local e determinística, sem API de IA, envio de prontuários, tabela nova ou alteração de pacientes. Não é um modelo clínico validado e não substitui revisão profissional. Mantém os bancos, critérios e limiares científicos existentes.

## Seis mudanças

1. Proposições por manifestação, localização, lateralidade, momento, sujeito e origem textual exata. Doses ficam ligadas ao nome informado do medicamento, não apenas a uma lista global de números.
2. Sintoma, negativa, incerteza, diagnóstico relatado e indicação cirúrgica são papéis distintos. Uma indicação não é cirurgia realizada. Registros não reconhecidos continuam no texto, com a origem preservada.
3. Planejamento por problemas regionais quando o vínculo é inequívoco; contexto e referências não resolvidas conservam ordem. Prosa sem subtítulos burocráticos, sem presumir causa compartilhada entre queixas.
4. Microplanejamento conserva as condensações de persistência, sono e despertares da v21, agrega dores simples e evita repetição idêntica sem descartar as respectivas fontes.
5. Auditoria reextrai significado e compara lado, negativa, tempo, sensação específica, diagnóstico, procedimento e dose. Detecta proposições novas e marcadores causais sem fonte, além da cobertura literal anterior. Isso é uma barreira parcial e conservadora, não garantia de compreensão universal da linguagem.
6. Biblioteca com oito casos inteiramente sintéticos, proposições e narrativas de referência. Status explícito `professionalReview: pending`; precisa de revisão do profissional antes de ser chamada de biblioteca aprovada. Não aprende automaticamente com prontuários reais.

## Múltiplas hipóteses

- Remove o limite de duas regiões para problemas independentes explicitamente localizados. Mantém fallback anatômico anterior para linguagem não extraída e a escolha manual do profissional.
- Escopo regional evita que um sintoma de uma região pontue outra. Preserva trajetos de irradiação e antecedentes pertinentes, por exemplo biópsia cervical no contexto de alteração do ombro.
- Destino de irradiação, movimento provocativo ou local de procedimento prévio não vira automaticamente nova queixa local.
- Testes priorizados dão cobertura às regiões antes de preencher vagas com outras hipóteses. O limite é organizacional, não critério diagnóstico.
- A interface mostra uma prioridade por região e abre as demais hipóteses em uma seção expansível. O relatório admite várias hipóteses examinadas na mesma região, cada uma com seus resultados e critérios.
- Queixa sem exame fica documentada e exige revisão; não some por estar fora das regiões selecionadas, tampouco força a seleção ou um diagnóstico.

## Persistência e compatibilidade

Reutiliza o JSON clínico/laudo existente. Preserva a HMA original, edição profissional, revisão, assinatura e data, bem como a proteção v21 de paciente/avaliação/clínica/sessão e respostas atrasadas. Base automática não revisada pode migrar; texto profissional só muda com confirmação explícita. Módulo semântico é lazy e precede os consumidores; versões do loader e dos quatro especialistas foram atualizadas.

## Evidência técnica e limites

O desenho de escopo de negativa, temporalidade e sujeito foi inspirado metodologicamente no [ConText, Harkema et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC2757457/). Trata-se de implementação própria em português, não reprodução validada do artigo.

A separação entre problemas, achados e hipóteses tem como referência conceitual [FHIR ClinicalImpression R4](https://hl7.org/fhir/R4/clinicalimpression.html) e [Condition R4](https://hl7.org/fhir/R4/condition.html). Não constitui integração/exportação FHIR nem certificação de conformidade.

O motor não resolve toda abreviação, referência pronominal, causalidade, nuance temporal ou erro de digitação. Não presume se “dedo mínimo” é da mão ou do pé. Sinaliza pendências e preserva a redação para esclarecimento. Resultados de imagem ou diagnósticos relatados não confirmam uma hipótese por si sós.

## Verificação e reversão

Todos os testes usam dados fictícios, sem gravações de produção. O gate `Agenda e planos - regressao critica` mantém contratos anteriores e acrescenta auditoria semântica, múltiplas queixas, bancos clínicos e caminhos reais de WhatsApp. O corpus documental cobre 426 documentos de 11 regiões, agora com o novo módulo carregado.

Backup da base: `C:/Users/User/.codex/backups/kinesys-20261021-semantica-multiqueixas-v22/antes.zip`, commit `9892639540c344277682083457639f174c966005`, SHA256 `BAF80608579E4F3F80A63ECBE1655671134B67FF80AE957379CEE96E842EC945`. Conferido como arquivo ZIP acessível com 518 entradas.

Reversão seletiva: nova PR revertendo somente os commits desta evolução, mantendo os guards de isolamento v21, recebimentos e dados existentes. Nunca restaurar banco ou o diretório institucional. A publicação desta versão ainda requer autorização do usuário e gate hospedado aprovado.
