# Correção definitiva: isolamento dos cérebros e resposta em tempo real

## Diagnóstico confirmado

- **O banco não está misturado:** a Pós da Dra. Andréa tem 9 perguntas próprias sobre odontologia, bruxismo, ronco e apneia; o AVA tem 8 perguntas próprias sobre execuções, honorários, patrimônio e Judiciário. Cada grupo está ligado ao produto correto.
- **A IA também recebeu o produto correto no teste recente:** a ligação das 14:53 foi gravada como “Pós graduação Bruximos, Ronco e Apneia”, e as sete respostas salvas trataram apenas da Dra. Andréa/odontologia.
- **A mistura mostrada nas capturas vem da versão publicada antiga:** nela, a tela ainda baixa perguntas de todos os produtos e as junta no roteiro. A prévia corrigida já mostra somente as nove perguntas da Pós; o site publicado ainda não contém essa correção.
- **A lentidão é um problema diferente da mistura:** cada pequeno trecho final da transcrição abre uma nova análise. Na ligação analisada, três respostas foram disparadas com menos de seis segundos entre si. Outra ligação abriu 35 análises, sendo 17 quase simultâneas. Cada resposta levou de 2,8 a 5,5 segundos (média de 4,3 s), então várias análises competem e respostas antigas podem chegar depois de falas novas.
- Os roteiros de ambos os produtos têm cerca de 4 mil caracteres e a resposta completa solicita muitos campos. Isso aumenta o tempo, mas não é a causa da mistura visual.

## O que será alterado

### 1. Uma única fonte para o cérebro ativo

- A tela e a IA deixarão de montar o cérebro por caminhos diferentes.
- O servidor carregará um pacote fechado pelo `oferta_id` da ligação: identidade do produto, regras SDR, roteiro, perguntas, critérios e objeções.
- Esse pacote retornará um identificador e uma versão do cérebro; a tela só exibirá e aceitará respostas cuja identidade seja exatamente igual à da ligação.
- Não haverá herança automática do “Padrão geral” em produtos com cérebro próprio. DISC e configurações operacionais continuam globais, mas nenhum texto comercial será compartilhado.
- Se faltar qualquer bloco obrigatório ou houver divergência de produto, a gravação será bloqueada com uma mensagem clara — nunca será usado conteúdo de outro produto como fallback.

### 2. Proteção contra conteúdo cruzado

- Validar no servidor, antes de cada análise, que call, produto e cérebro têm o mesmo identificador.
- Rotular toda sugestão salva com o produto e a versão do cérebro usados para gerá-la.
- Ao trocar de ligação/produto, limpar imediatamente sugestão, histórico e dados em memória.
- A Nova ligação continuará exigindo escolha explícita do produto, sem reaproveitar silenciosamente o produto anterior.
- O painel administrativo mostrará apenas o conteúdo efetivamente usado pelo produto selecionado, sem misturar “geral” e “próprio”.

### 3. Resposta realmente rápida para SDR

- Agrupar fragmentos consecutivos da fala do cliente e enviar uma análise somente após uma pausa curta, em vez de uma chamada por fragmento.
- Permitir apenas uma análise ativa por ligação; quando chegar uma fala mais nova, cancelar ou ignorar a resposta antiga.
- Mostrar imediatamente a próxima pergunta-base do roteiro daquele produto enquanto a IA ajusta a orientação ao contexto.
- Enviar à IA somente o trecho recente necessário, o estado atual da qualificação e uma versão compacta do cérebro.
- Reduzir a saída ao essencial para o SDR ao vivo; leitura detalhada, DISC, pontuação e justificativas podem completar depois sem segurar a pergunta principal.
- Registrar separadamente tempo até a primeira pergunta e tempo até a análise completa, para medir o ganho real.

### 4. Validação obrigatória

- Testar AVA e Pós lado a lado com frases reais das capturas.
- Confirmar que “execuções”, “honorários”, “devedor”, “patrimônio” e “Judiciário” nunca aparecem na Pós.
- Confirmar que “bruxismo”, “ronco”, “apneia”, “odontologia” e “bolsa” nunca aparecem no AVA.
- Simular transcrição fragmentada e comprovar que ela gera uma única análise por turno, sem respostas fora de ordem.
- Medir primeira orientação e resposta completa em várias rodadas.
- Validar a versão publicada depois que a nova versão for publicada; até lá, os testes devem ser feitos na prévia corrigida.

## Critério de aceite

- Zero conteúdo cruzado em tela, prompt e resposta salva.
- Uma análise por turno do cliente, sem concorrência entre respostas antigas e novas.
- A próxima pergunta aparece rapidamente e sempre identifica o produto ativo.
- Produto sem cérebro completo não inicia a gravação.
