# Ligação mais rápida: discar primeiro, dados do lead depois

## 1. Nova ligação: só produto e origem

A tela de nova ligação passa a ter apenas dois campos: **Produto** e **Origem**. O cliente é preenchido sozinho a partir do produto escolhido, e o SDR continua vindo automático do usuário logado.

Os campos de nome, telefone, e-mail, notas do CRM e objetivo saem dessa tela.

O botão passa a ser **Começar a ligar** e leva direto para a tela ao vivo, já pronta para gravar. O app lembra o último produto e origem usados, então na ligação seguinte é um clique só.

Na lista de ligações e na tela ao vivo, enquanto o lead não tiver nome, aparece "Lead sem nome ainda" em vez de vazio.

## 2. Dados do lead na pós-ligação

A tela de pós-ligação ganha um bloco **Dados do lead** no topo, antes do resultado: nome, telefone, e-mail e notas. O nome fica obrigatório para salvar o resultado quando a ligação for marcada como agendada.

## 3. Velocidade da resposta do copiloto

Hoje a resposta demora porque três coisas se somam:

- o copiloto usa o modelo mais pesado (o mesmo do resumo final), que "pensa" a resposta inteira antes de devolver;
- a resposta só aparece quando o texto termina 100%, mesmo que a pergunta sugerida já esteja pronta nos primeiros instantes;
- antes de chamar a inteligência, o servidor faz sete consultas ao banco, uma depois da outra, para montar o cérebro do produto.

O que será feito:

1. **Modelo rápido no ao vivo.** O copiloto da ligação passa a usar um modelo rápido da Anthropic (Claude Haiku), e o resumo pós-call continua no modelo atual. Isso é configurável no Cérebro CX, em Configurações, sem mexer em código.
2. **Resposta em tempo real.** A orientação aparece conforme é gerada: a pergunta sugerida surge na tela nos primeiros instantes em vez de esperar o texto completo.
3. **Menos espera antes da chamada.** As consultas ao banco passam a ser feitas em paralelo e o cérebro do produto fica guardado em memória durante a ligação, então só é montado uma vez.
4. **Resposta mais enxuta.** O copiloto responde primeiro a pergunta sugerida e depois os detalhes, com limite menor de texto.

Meta: da fala do cliente até a pergunta na tela, cerca de 1 a 2 segundos, contra os 6 a 10 de hoje.

## Detalhes técnicos

- `nova-ligacao.tsx`: formulário reduzido a `oferta_id` + `origem_lead`; cliente derivado do produto; últimos valores em `localStorage`; insert em `calls` sem campos de lead.
- `pos-call.$callId.tsx`: novo bloco de edição de `nome_lead`, `telefone_lead`, `email_lead`, `notas_crm` gravando na própria `calls`.
- `copiloto.functions.ts`: `gerarSugestao` vira rota de streaming (`src/routes/api/sugestao.ts`, autenticada) com saída incremental; consultas de call/falas/perfil/cérebro em `Promise.all`; `cerebro.server.ts` ganha cache por `oferta_id` com TTL curto.
- `config_api`: nova chave `modelo_claude_rapido` (padrão `claude-haiku-4-5`) usada só no ao vivo; `modelo_claude` continua no resumo e no teste do cérebro.
- Ordem dos campos do JSON de resposta muda para `proxima_pergunta` primeiro (o texto fixo do formato continua o mesmo, só a ordem).
- Sem mudança na captura de áudio, na transcrição Deepgram nem nas regras de acesso.

## Migração de banco

Uma linha nova em `config_api` (`modelo_claude_rapido`). Nenhuma coluna removida; os campos de lead em `calls` continuam existindo, apenas passam a ser preenchidos depois.
