# Cérebro de marcação do SDR — Mentoria Tubarões da Execução (Projeto AVA)

Usar o roteiro do Projeto AVA (6 etapas, falas prontas e técnicas) como o cérebro do SDR exclusivo do produto **Mentoria Tubarões da Execução**. Como o Cérebro CX agora é separado por produto, esse conteúdo entra como personalização daquele produto — os demais produtos continuam com o padrão geral.

## O que será feito

### 1. Roteiro das etapas por produto
Hoje as "etapas de qualificação" do prompt do SDR são um texto fixo genérico (abertura, diagnóstico, pontuação, agendamento, encerramento). Vou criar uma nova regra editável `roteiro_sdr` (etapas + falas prontas + técnicas). Quando o produto tiver um roteiro próprio, ele substitui o texto genérico no cérebro do SDR.

Para a Mentoria Tubarões da Execução, o roteiro será o do Projeto AVA, exatamente como você enviou:
- Etapa 01 Introdução (fala de abertura do SDR, se apresentando como executivo da equipe do professor José Andrade)
- Etapa 02 Investigação e qualificação (execuções travadas, valor parado, domínio de busca de bens, ocultação de patrimônio, marasmo do judiciário, peso das execuções no escritório) + técnica de aprofundar no assunto A antes de ir para o B
- Etapa 03 Teste de prioridade (fala pronta)
- Etapa 04 Apresentação do diagnóstico e agendamento (fala pronta + técnica das duas opções de horário)
- Etapa 05 Confirmação de dados e agendamento (nome completo, e-mail, agendar no sistema)
- Etapa 06 Assentamento do compromisso (fala anti-no-show, duração 60 a 90 min, fechamento "Excelente diagnóstico, até mais!")

### 2. Persona e conduta do SDR personalizadas para o produto
- `persona_sdr` da Mentoria Tubarões da Execução: copiloto do SDR da equipe do professor José Andrade, com o objetivo único de agendar o diagnóstico estratégico com o especialista.
- `regras_conduta_sdr` do produto: linguagem falada, aprofundar antes de mudar de assunto, nunca pular etapas, sempre oferecer dois horários, confirmar dados e fazer o assentamento do compromisso.

### 3. Perguntas e critérios de qualificação do produto
Cadastrar como itens **personalizados** da Mentoria Tubarões da Execução (sem mexer no padrão geral):
- Perguntas: quantas execuções travadas, valor em honorários parado, domínio de sistemas de busca de bens, como lida com ocultação de patrimônio, marasmo do judiciário, peso das execuções no faturamento do escritório, teste de prioridade.
- Critérios: advogado com execuções travadas relevantes (peso maior), valor parado significativo, quer escalar a área de execuções (não só um caso pontual), é decisor, aceitou prioridade no teste, aceitou horário do diagnóstico.

Os itens herdados do padrão geral que não fizerem sentido para esse produto ficam ocultos só nele.

### 4. Verificação
Testar em Cérebro CX → produto Mentoria Tubarões da Execução → aba "Testar o cérebro" (modo SDR), simulando falas de um advogado com execuções travadas, e conferir se a resposta segue as etapas do roteiro AVA (pergunta certa por etapa, dois horários na etapa 4, assentamento na etapa 6).

## Detalhes técnicos
- Migração: `INSERT ... ON CONFLICT` da chave `roteiro_sdr` em `regras_copiloto` (linha geral vazia + linha do produto com o roteiro AVA), e das linhas personalizadas de `persona_sdr`/`regras_conduta_sdr` com `oferta_id` do produto; `INSERT` das perguntas e critérios com `oferta_id` do produto. Produto identificado pelo nome ("Mentoria Tubarões da Execução", online). O mesmo roteiro pode ser copiado para o Presencial depois, pela própria tela.
- `src/lib/cerebro.server.ts`: `montarSystemPromptSdr` passa a usar `ctx.regras["roteiro_sdr"]` quando preenchida, substituindo o bloco fixo "ETAPAS DE QUALIFICAÇÃO" (o formato de resposta JSON não muda).
- Nada muda na captura de áudio, na transcrição, no cérebro do closer nem nos demais produtos.
