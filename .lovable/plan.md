# Copiloto SDR: responder o que o lead perguntou, sem perder o contexto

## O que está errado no print

O lead disse: *"Preenchi e queria entender melhor como funciona a bolsa."*
O Copiloto respondeu: *"E dentro dessa área, você tem pego casos de bruxismo ou de dor orofacial?"*

Motivo real: hoje, na ligação SDR, a inteligência **não conversa** — ela só marca quais perguntas do roteiro já foram respondidas. A frase mostrada na tela é sempre a próxima pergunta pendente da lista, escolhida por regra fixa. Por isso:

- quando o lead faz uma pergunta, ela é simplesmente ignorada;
- o Copiloto pula para uma pergunta adiante (a de área de atuação foi marcada como respondida indevidamente, então apareceu a seguinte);
- nada do que o lead falou antes influencia a frase sugerida.

Além disso, a transcrição do print mostra falas do cliente repetidas como "VENDEDOR" (o microfone capta o som da aba). Esse eco polui a análise e faz o Copiloto tratar a própria pergunta como fala nova.

## O que vai mudar

1. **Reconhecer quando o lead pergunta.** Se a fala do lead for uma dúvida (bolsa, valor, carga horária, formato, certificação, etc.), o Copiloto mostra primeiro **como responder**, usando só o que está cadastrado no cérebro daquele produto (oferta, quebras de objeção). Nada inventado: se a informação não está cadastrada, a orientação é "responda com o que você sabe e volte para..." sem números fictícios.

2. **Responder e retomar.** Junto da resposta, aparece a ponte de volta ao roteiro: primeiro a resposta curta, depois a próxima pergunta pendente. Uma dúvida do lead nunca marca perguntas do roteiro como respondidas.

3. **Sequência mais confiável.** A classificação só marca uma pergunta como respondida quando o lead realmente deu a informação daquela pergunta; confirmações curtas ("isso mesmo") só valem para a pergunta pendente. Assim para de saltar etapas como a de área de atuação.

4. **Contexto real na análise.** A fala em análise passa a ir acompanhada das últimas trocas já limpas, e o eco (fala do vendedor idêntica à do cliente) é descartado antes de chegar à inteligência e à tela.

5. **Tela.** O painel passa a mostrar, quando houver dúvida do lead: "Responda" (frase curta) e "Depois pergunte" (retomada do roteiro). Nos demais casos continua como hoje, com uma única frase.

## Detalhes técnicos

- `src/lib/sugestao.server.ts`: a chamada SDR deixa de ser só classificador. Passa a devolver `{ ids_respondidos, resposta_vaga, duvida_do_lead, resposta_sugerida }` em uma única chamada, com o trecho de oferta/objeções do produto injetado no prompt (limitado, para não perder velocidade). A próxima pergunta continua sendo escolhida pelo servidor (determinística); só a resposta à dúvida vem do modelo. Quando `duvida_do_lead` é verdadeiro, `ids_respondidos` é ignorado.
- Deduplicação de eco: antes de montar o contexto e de persistir, descartar fala do vendedor cujo texto normalizado seja igual (ou quase) a uma fala do cliente nos últimos segundos. Também aplicado em `src/hooks/useTranscricao.ts` apenas no nível de texto exibido — sem alterar a captura de áudio, os dois WebSockets nem o Deepgram.
- Payload de saída ganha `resposta_sugerida?: string`; `src/routes/call.$callId.tsx` renderiza os dois blocos e mantém protocolo/identidade/turno como estão.
- `PROTOCOLO_COPILOTO` sobe para `sdr-sequencial-v3`, para não misturar com sessões antigas.
- Sem mudanças em RLS, Edge Functions, captura de áudio ou isolamento por produto.

## Validação antes de entregar

Reproduzir a conversa exata do print na Pós-Graduação (Bruxismo/Ronco/Apneia): confirmação do formulário → "queria entender melhor como funciona a bolsa" → área de atuação → tempo de formação. Critérios: a dúvida da bolsa recebe resposta; nenhuma pergunta do roteiro é pulada; tempo de resposta abaixo de 2 s. Depois, o mesmo teste no AVA para confirmar que os roteiros seguem isolados.
