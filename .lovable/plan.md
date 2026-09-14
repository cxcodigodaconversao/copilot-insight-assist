# Alinhar Nova Call e registro de calls ao padrão do Golden Insights

Sim, é possível e faz sentido. Tudo é acrescentado ao que já existe — o copiloto ao vivo, a captura de áudio e o resumo automático não são tocados.

## 1. Novos campos no registro de calls

Acrescento à tabela de calls: time, closer, SDR, cliente (empresa dona da oferta), modalidade, funil, data/hora da reunião agendada, status da reunião, resultado, valor vendido, valor coletado, valor pendente, forma de pagamento e observações. Produto continua sendo a oferta já existente e origem continua o mesmo campo, só que virando lista de opções.

Também acrescento telefone e e-mail do lead, já que a seção "Lead" do formulário pede esses dois.

Valores padrão: valores em zero, resultado "indefinido", status "agendada". Nada quebra nas calls já criadas.

## 2. Nova aba "Cadastros" no Cérebro CX

Cinco listas simples editáveis só pelo líder: **times, origens, funis, clientes, modalidades**. Cada item tem nome, ativo e ordem. Os selects do formulário passam a ler dessas listas, então você muda as opções sem mexer em código.

Sementes iniciais para não começar vazio: modalidades (online, presencial, telefone) e algumas origens comuns.

## 3. Formulário "Nova call" em duas seções

- **Identificação**: cliente, produto/oferta, time, closer, SDR, modalidade, funil, origem, data e hora agendada.
- **Lead**: nome, telefone, e-mail, notas do CRM, objetivo da call, tipo (closer | sdr).

Ao escolher o tipo, o campo correspondente (closer ou SDR) já vem preenchido com você. O botão "Como usar" continua onde está.

## 4. Bloco "Resultado" na tela pós-call

Um formulário no topo do resumo com status da reunião, resultado, valor vendido, valor coletado, valor pendente, forma de pagamento e observações, com botão "Salvar resultado". O valor pendente é calculado automaticamente (vendido − coletado), mas pode ser ajustado à mão.

## 5. Filtros e cards na lista de calls

Cards no topo, no mesmo visual do Golden Insights: reuniões agendadas, no-show (%), calls realizadas (%), taxa de conversão, valor vendido, valor coletado.

Filtros: time, closer, SDR, cliente, origem, produto, modalidade, funil e período (hoje, ontem, 7 dias, 30 dias, mês atual, mês anterior, personalizado). Mantenho a busca por nome do lead.

## 6. Exportar CSV

Botão na lista que baixa as calls filtradas com todas as colunas acima, usando exatamente os nomes de campo desta lista, para casar com o outro sistema.

## Regras de acesso

Sem mudança de comportamento: closer e SDR continuam vendo apenas as próprias calls; o líder vê todas e é o único que edita os cadastros. Uma observação: para os selects de closer/SDR funcionarem para quem não é líder, preciso liberar a leitura apenas do nome dos usuários da equipe (sem nenhum outro dado) — se preferir, deixo esses selects visíveis só para o líder.

## Detalhes técnicos

- Migração única: novas colunas em `calls` (com defaults, sem NOT NULL para não quebrar linhas existentes), FKs `closer_id`/`sdr_id` → `profiles(id)`, índices em `data_reuniao_agendada`, `status_reuniao`, `resultado`.
- Tabelas auxiliares `times`, `origens`, `funis`, `clientes`, `modalidades` (id, nome, ativo, ordem, created_at) com GRANTs, RLS: leitura para autenticados, escrita apenas via `is_lider()`.
- Validação de `modalidade`, `status_reuniao` e `resultado` por CHECK de lista fixa; demais campos livres vindos dos cadastros.
- Frontend: `nova-call.tsx` reorganizado em duas seções; novo `cerebro.tsx` com aba "Cadastros" (CRUD genérico reutilizado pelas 5 listas); `pos-call.$callId.tsx` com bloco de resultado (update em `calls`); `calls.tsx` com barra de filtros, agregados calculados no cliente sobre o resultado filtrado e geração de CSV via Blob.
- `copiloto.functions.ts`, `cerebro.server.ts` e `useTranscricao.ts` não são alterados.
