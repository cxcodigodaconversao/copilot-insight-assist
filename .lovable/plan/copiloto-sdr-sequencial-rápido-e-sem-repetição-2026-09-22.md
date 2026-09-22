# Copiloto SDR sequencial, rápido e sem repetição

## Diagnóstico confirmado

- Na ligação mais recente da Pós da Dra. Andréa, a inteligência gerou corretamente a pergunta seguinte após o lead confirmar o interesse, mas marcou a resposta como `manter`. A tela hoje descarta qualquer resposta marcada como `manter`, mesmo quando ela contém uma nova pergunta. Por isso a orientação antiga continuou visível.
- Depois disso, a fala “ele era para ter mudado a escrita” foi analisada como se fosse fala comercial do lead. Como o sistema não guarda oficialmente quais etapas já foram concluídas, a inteligência tentou retomar a confirmação do formulário e voltou para uma pergunta anterior.
- A sequência da ligação existe apenas no texto do roteiro. Não existe um estado persistente dizendo: etapa atual, etapas concluídas, respostas já obtidas, etapa pulada e próxima pergunta válida. A IA tenta deduzir tudo novamente usando somente as últimas falas, o que permite repetição e regressão.
- A orientação é transmitida letra por letra. Na ligação recente, a primeira parte apareceu entre 1,5 e 2,6 segundos, mas a resposta completa levou entre 3,3 e 3,9 segundos. Isso produz a sensação de que o Copiloto continua escrevendo depois que o cliente terminou.
- O direcionamento atual pede muitos campos ao mesmo tempo — DISC, temperatura, pontuação, sinal, justificativa e alerta. Isso aumenta o tempo e desvia o foco da única informação urgente: o que o SDR deve falar agora.

## O que será alterado

### 1. Progresso real da conversa

- Criar um estado próprio para cada ligação, contendo etapa atual, etapas concluídas, respostas já coletadas, última orientação exibida e número do turno.
- O servidor atualizará esse estado a cada fala completa do cliente; a IA não precisará reconstruir toda a sequência a cada análise.
- Uma etapa concluída não poderá voltar a ser a etapa principal. Se o cliente adiantar uma informação, ela será registrada na etapa correspondente e a conversa seguirá do ponto mais avançado alcançado.
- Se o SDR avançar sem cobrir algo obrigatório, a orientação seguirá o assunto atual e exibirá um lembrete curto, por exemplo: “Você pulou a etapa de implicação”. O Copiloto não voltará silenciosamente para perguntas antigas.
- O estado será sempre isolado pela ligação, pelo produto e pela versão do cérebro.

### 2. Uma orientação por fala

- Agrupar os fragmentos da transcrição até identificar uma pausa real do cliente.
- Gerar somente um turno de análise para essa fala agrupada.
- Se o cliente voltar a falar antes da resposta terminar, cancelar a análise anterior e considerar a continuação no mesmo turno.
- Usar um número sequencial validado pelo servidor para impedir que uma resposta antiga seja salva ou reapareça depois de uma nova.
- Corrigir a regra de `manter`: ela só manterá a tela quando não houver nova orientação. Se houver nova pergunta, a tela avançará independentemente desse rótulo.

### 3. Resposta curta e imediata

- A resposta principal do Copiloto será uma única orientação pronta para o SDR falar, sem efeito de digitação contínua.
- A frase aparecerá de uma vez assim que estiver completa; não ficará crescendo na tela.
- O pedido principal à inteligência será reduzido para: etapa reconhecida, direção curta, pergunta pronta e eventual lembrete de etapa pulada.
- DISC, temperatura, pontuação e justificativas serão calculados depois ou atualizados sem segurar a orientação principal.
- Limitar o direcionamento a uma ou duas frases faladas, sem explicações longas.

### 4. Regras específicas da Pós da Dra. Andréa

- Transformar as etapas do playbook em uma sequência explícita: apresentação, motivo da ligação, diagnóstico profissional, dor/implicação, interesse/prontidão, agendamento, validação e compromisso.
- Relacionar cada pergunta cadastrada à sua etapa e registrar quando ela já foi respondida.
- Não repetir confirmação do formulário, área de atuação ou tempo de formação depois que essas informações forem obtidas.
- Permitir avanço natural quando o lead responder várias etapas de uma vez.

### 5. Validação com conversa real

- Reproduzir a ligação recente, incluindo confirmação do formulário, área de atuação e comentários sobre lentidão.
- Confirmar que cada fala gera no máximo uma nova orientação.
- Confirmar que a pergunta muda quando a informação anterior foi respondida e nunca volta para uma etapa concluída.
- Simular uma etapa pulada e verificar o lembrete curto sem interromper a sequência atual.
- Simular fala fragmentada e interrupção do cliente para comprovar cancelamento da resposta antiga.
- Medir separadamente: fim da fala → orientação visível e análise complementar concluída.
- Validar na prévia e depois na versão publicada.

## Critérios de aceite

- Uma fala completa do cliente produz uma única orientação curta.
- A orientação aparece inteira, sem continuar sendo escrita por vários segundos.
- Nenhuma pergunta já respondida volta a ser sugerida.
- A conversa sempre avança ou mantém conscientemente a etapa atual.
- Etapas puladas geram lembrete explícito, sem fazer a conversa retroceder.
- Respostas antigas, canceladas ou de outro produto nunca aparecem nem alteram o progresso.
