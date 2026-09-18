# Excluir ligações e calls (somente administrador)

Hoje não existe nenhum botão de excluir nas listas. Como você faz testes, precisa poder apagar registros.

## O que muda

Nas listas **Ligações (SDR)** e **Calls (Closer)**, cada linha ganha um ícone de lixeira no canto direito — visível apenas para o administrador.

- Ao clicar, aparece uma confirmação com o nome do lead e o aviso de que a transcrição e as análises daquele registro também serão apagadas.
- Confirmando, o registro some da lista na hora e um aviso confirma a exclusão.
- Se algo falhar, aparece uma mensagem explicando o motivo e nada é apagado.
- O clique na lixeira não abre a call (a linha inteira continua sendo um link).

Também na tela de **Pós-call** (o resumo de uma call/ligação encerrada): botão "Excluir" no topo, só para o administrador, que apaga e volta para a lista correspondente.

Líder, closer e SDR não veem esses botões.

## Detalhes técnicos

- Não há mudança de banco: a política `calls_delete` já restringe a exclusão a `is_adm()`, e `falas`/`sugestoes` têm `ON DELETE CASCADE` para `calls` — apagar a call remove falas e sugestões.
- `src/routes/ligacoes.tsx` e `src/routes/calls.tsx`: `useAuth().ehAdm` para exibir o botão; `useMutation` com `supabase.from("calls").delete().eq("id", id)`, `invalidateQueries` de `["ligacoes-sdr"]` / `["calls"]`, `AlertDialog` de confirmação e `toast` de sucesso/erro; `e.preventDefault()`/`stopPropagation()` no botão dentro do `Link`.
- `src/routes/pos-call.$callId.tsx`: mesma mutação, com `navigate` para `/ligacoes` ou `/calls` conforme `call.tipo`.
