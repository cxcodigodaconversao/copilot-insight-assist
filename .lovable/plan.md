# Aba de Cadastros completa + convite de equipe

Uma aba única onde o líder cadastra tudo que aparece nos selects da Nova call: Cliente, Produto, Time, Closer, SDR, Funil e Origem. Modalidade sai de vez.

## 1. Aba "Cadastros" (Cérebro CX)

Uma seção por tipo, cada uma com criar, renomear, ativar/desativar, ordenar e excluir:

- Cliente, Time, Funil, Origem — listas simples (já existem, ficam na mesma aba)
- Produto — passa a editar as ofertas (nome, descrição, preço/condições, garantia, diferenciais, público ideal)
- Closer e SDR — seção "Equipe": lista de quem já tem acesso, com o papel de cada um, e um campo "Convidar por e-mail" (nome + e-mail + papel closer ou SDR). A pessoa recebe o convite, cria a senha e passa a aparecer nos selects de closer/SDR.

## 2. Cadastro rápido na Nova call

Ao lado de cada select (cliente, produto, time, funil, origem) um botão "+" abre uma janelinha para criar o item na hora; ele já fica selecionado no formulário. Closer e SDR não têm "+" — dependem de convite, e a janelinha mostra um atalho para a aba Equipe.

## 3. Modalidade removida

Sai do formulário Nova call, dos filtros e do CSV da lista de calls, da aba Cadastros, e a coluna `modalidade` e a tabela `modalidades` são apagadas do banco.

Atenção: os dados de modalidade já gravados nas calls serão perdidos. Essa parte da mudança pede sua confirmação antes de rodar.

## Detalhes técnicos

- Migração: `DROP TABLE public.modalidades`; `ALTER TABLE public.calls DROP COLUMN modalidade` (com o CHECK associado). Nova tabela `convites` (email, nome, role, status, convidado_por, created_at) com RLS: só `is_lider()` lê e escreve.
- Convite: server function `convidarMembro` com `requireSupabaseAuth`, valida que o chamador é líder via `has_role`, e usa `supabaseAdmin.auth.admin.inviteUserByEmail` com `data: { nome, role }` — o trigger `handle_new_user` já lê `raw_user_meta_data->>'role'` e cria o papel correto (nunca `lider`). Import de `client.server` dentro do handler.
- `Cadastros.tsx`: `TabelaCadastro` perde `modalidades`; ganha um bloco `Ofertas` (CRUD reaproveitando a aba Ofertas existente) e um bloco `Equipe` (lista `profiles` + `user_roles`, formulário de convite).
- `nova-call.tsx`: remove estado/campo `modalidade`; cada select de cadastro recebe um `DialogNovoItem` que insere na tabela correspondente e invalida a query `cadastro-<tabela>`.
- `calls.tsx`: remove filtro, coluna do CSV e leitura de `modalidades`.
- Regenerar `types.ts` após a migração; `copiloto`/`resumo-call` e a captura de áudio ficam intactos; RLS de calls inalterada.
