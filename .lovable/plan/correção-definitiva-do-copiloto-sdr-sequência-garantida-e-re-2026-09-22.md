# Correção definitiva do Copiloto SDR: sequência garantida e resposta rápida

## Diagnóstico confirmado

- **Não é falta de saldo Lovable.** Há 107,14 créditos disponíveis para IA. Além disso, o Copiloto ao vivo não usa o saldo do Lovable AI: ele chama a Anthropic diretamente. Todas as seis análises da ligação da captura foram aceitas e concluídas; se faltasse saldo/chave, elas teriam falhado em vez de responder.
- **O banco também não é o gargalo.** Está saudável, com baixa ocupação e consultas deste fluxo normalmente abaixo de dezenas de milissegundos.
- **A ligação da captura executou uma versão antiga na URL publicada.** A call terminou com seis sugestões, mas `turno_copiloto` permaneceu em zero e `estado_qualificacao` continuou vazio em `apresentacao`. As respostas gravadas também usam campos antigos (`leitura`, `porque`, alertas longos) e não trazem `etapa_qualificacao`, embora o código novo exija esses campos. Portanto, a correção anterior não estava efetivamente rodando nessa ligação.
- **A lentidão medida está na geração e na espera da resposta completa.** Na primeira orientação, o texto útil já existia em 1,721 s, mas a tela só recebeu o resultado em 3,904 s. Nas demais análises, o total ficou entre 3,557 s e 4,138 s, além da pausa de 900 ms antes de chamar a IA. Trocar para um modelo mais caro não elimina esse desenho e pode até aumentar o tempo.
- **A sequência ainda depende demais da interpretação da IA.** As nove perguntas estão ordenadas, mas suas categorias são `momento`, `fit`, `dor`, `urgencia` e `autoridade`, enquanto o estado usa `apresentacao`, `motivo`, `diagnostico`, `dor_implicacao`, `interesse`, `agendamento`, `validacao` e `compromisso`. Não há hoje uma ligação estrutural e editável entre cada pergunta e sua etapa.
- **O estado atual não registra a pergunta pendente.** O servidor confia no modelo para escolher a etapa e a próxima pergunta. A trava apenas impede voltar; ela não obriga avançar para a próxima pergunta cadastrada. Por isso o modelo pode permanecer em diagnóstico, repetir ou criar um alerta fora do fluxo.
- **O controle de turno usa segundos.** Duas falas analisadas no mesmo segundo podem receber o mesmo número e uma delas ser descartada como antiga.
- **Comentários sobre o próprio teste foram enviados como fala do lead.** Frases como “não está indo para as próximas perguntas” e “você não está respeitando” fizeram a IA abandonar o roteiro e produzir os alertas vermelhos da captura.

## Solução definitiva

### 1. Tornar o servidor dono da sequência

- Estruturar no Cérebro CX, por produto, cada etapa e cada pergunta com ordem, texto pronto, pergunta complementar e obrigatoriedade.
- Registrar por ligação: etapa atual, pergunta pendente, perguntas respondidas, etapas concluídas, respostas coletadas e próximo número de turno.
- A IA deixa de escolher livremente a próxima pergunta. Ela apenas identifica o que a fala respondeu, se a resposta foi vaga, se respondeu várias perguntas ou se trouxe uma objeção.
- O servidor valida essa leitura e escolhe a próxima pergunta pela ordem cadastrada. Uma pergunta respondida nunca volta; uma pergunta pulada gera aviso curto, mas a conversa continua do ponto mais avançado.
- Apresentação e motivo da ligação entram na mesma sequência estruturada, em vez de ficarem apenas dentro de um roteiro grande em texto.

### 2. Separar orientação imediata de análise complementar

- O resultado urgente terá somente: próxima fala pronta, etapa e eventual aviso curto.
- Remover do caminho ao vivo DISC, pontuação, justificativas e alertas narrativos; essas análises ficam para depois e nunca seguram a orientação.
- Reduzir o conteúdo enviado ao modelo ao estado atual, à pergunta pendente, às próximas poucas perguntas e à fala agrupada — não ao cérebro inteiro a cada turno.
- Ativar o cache por produto que já existe no servidor, mas hoje não é usado nessa rota.
- Meta validada: orientação única visível em até 2 segundos depois do fim da fala em condições normais. Medir separadamente pausa de transcrição, servidor, IA e exibição.

### 3. Corrigir agrupamento e concorrência

- Trocar o turno baseado em segundos por contador monotônico/milissegundos seguro, sem colisão.
- Só aceitar no banco e na tela a resposta do turno mais recente.
- Agrupar fragmentos até uma pausa real, sem gerar uma nova análise para cada pedaço.
- Comentários técnicos sobre o Copiloto não alteram a etapa nem geram alerta comercial.
- Cancelar de fato chamadas antigas quando o cliente continua falando, a gravação é pausada ou a ligação termina.

### 4. Impedir versão antiga em produção

- Expor uma versão do protocolo entre tela e servidor.
- Se a tela antiga chamar um servidor novo, ou o inverso, bloquear a análise e pedir atualização em vez de continuar com estado vazio.
- Publicar código e estrutura de dados juntos e confirmar que a URL publicada grava turno, etapa e pergunta respondida já na primeira fala.

### 5. Validar com a conversa exata da captura

Reproduzir, na ordem:

1. saudação e apresentação;
2. confirmação do formulário;
3. área de atuação;
4. tempo de formação;
5. consultório próprio;
6. dor com casos de bruxismo;
7. volume de pacientes;
8. prontidão;
9. decisão e agenda.

Confirmar em cada turno:

- uma única orientação curta;
- avanço para a próxima pergunta cadastrada;
- nenhuma repetição;
- nenhuma regressão;
- estado persistido corretamente;
- comentário técnico ignorado;
- produto da Dra. Andréa sem qualquer conteúdo da AVA;
- tempo total e tempo de cada etapa registrados.

Depois, repetir um fluxo equivalente no produto AVA para comprovar isolamento e publicar somente após os dois testes passarem na prévia e na URL pública.

## Critérios de aceite

- Saldo, chave ou modelo deixam de ser tratados como hipótese quando a chamada responde normalmente.
- A ordem é garantida pelo sistema, não pela memória livre da IA.
- Cada resposta do lead avança, mantém conscientemente ou usa uma pergunta complementar; nunca volta sozinha.
- A tela não mostra textos longos como “PARAR IMEDIATAMENTE”. Avisos têm uma frase curta.
- A orientação aparece uma vez e inteira, sem ser substituída por resposta atrasada.
- Tempo normal entre fim da fala e orientação visível: até 2 segundos, com telemetria que mostra exatamente onde qualquer excedente ocorreu.
- A versão publicada executa o mesmo protocolo validado na prévia.
