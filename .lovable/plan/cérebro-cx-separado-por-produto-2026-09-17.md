# Cérebro CX separado por produto

Hoje o Cérebro CX é um só para todos os produtos. Passa a existir um cérebro por produto: ao abrir o Cérebro, você escolhe o cliente e o produto, e só então vê e edita o conteúdo daquele produto.

## Como vai funcionar

1. Ao entrar em Cérebro CX aparece uma tela de seleção: primeiro o cliente, depois o produto dele (com busca). Um botão "Trocar produto" fica sempre visível no topo depois de escolher.
2. Escolhido o produto, as abas passam a mostrar somente o conteúdo daquele produto:
   - Oferta (dados do próprio produto)
   - Quebras de objeção
   - Regras do copiloto (closer e SDR)
   - Perguntas e critérios de qualificação
   - Testar o cérebro (testa com o produto selecionado)
3. Perfis DISC continuam valendo para todos os produtos (comportamento humano não muda de produto). Cadastros e Configurações também continuam gerais.
4. Conteúdo geral como base: cada produto começa "herdando" as regras, perguntas e critérios gerais que já existem. Em cada item aparece a marcação **Padrão** (herdado) ou **Personalizado deste produto**. Ao editar um item herdado, ele vira personalizado só daquele produto; um botão "Voltar ao padrão" desfaz.
5. Existe uma aba/visão "Padrão geral" (só administrador) para editar a base que todos herdam.
6. Nas telas ao vivo (Nova call e Nova ligação) nada muda para o vendedor: a IA passa a usar automaticamente o cérebro do produto escolhido na call.

## Detalhes técnicos

Migração:
- `regras_copiloto`: adicionar `oferta_id uuid null REFERENCES ofertas(id) ON DELETE CASCADE`; trocar a PK por `id uuid` + índices únicos `(chave) WHERE oferta_id IS NULL` e `(chave, oferta_id) WHERE oferta_id IS NOT NULL`. Linhas atuais ficam com `oferta_id NULL` (padrão geral).
- `perguntas_qualificacao` e `criterios_qualificacao`: adicionar `oferta_id uuid null REFERENCES ofertas(id) ON DELETE CASCADE` + coluna `oculto boolean default false` (para remover, no produto, um item herdado) e índice por `oferta_id`.
- `objecoes` já tem `oferta_id`; manter o comportamento atual (null = vale para todos).
- RLS/GRANTs iguais aos atuais: leitura para autenticados, escrita só `is_adm()`.

Resolução do cérebro (`src/lib/cerebro.server.ts`):
- `carregarCerebro(supabase, ofertaId)` passa a mesclar por produto: para regras, o valor do produto sobrescreve a chave global; para perguntas e critérios, lista = globais não ocultas + as do produto; objeções seguem a regra atual.
- `montarSystemPrompt` e `montarSystemPromptSdr` continuam iguais — recebem o contexto já resolvido.

Frontend:
- `src/routes/cerebro.tsx`: estado de produto selecionado (persistido na URL, ex. `?oferta=<id>`), tela de seleção cliente → produto, cabeçalho com produto atual e "Trocar produto", abas filtradas por `oferta_id`, badges Padrão/Personalizado e ação "Voltar ao padrão".
- `src/components/Cadastros.tsx`: os CRUDs de regras, perguntas e critérios recebem `ofertaId` e gravam com esse vínculo; edição de item herdado cria a linha do produto (copiando o texto) em vez de alterar a global.
- `testarCerebro` já recebe `ofertaId`; sem mudança de contrato.
- Sem alterações na captura de áudio nem nas funções de transcrição/resumo.
