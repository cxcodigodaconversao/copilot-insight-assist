# Separar de verdade o cérebro de cada produto

Na sua captura, numa ligação da pós-graduação em Bruxismo, Ronco e Apneia apareceram perguntas do Projeto AVA ("execuções travadas", "honorários parados", "sistemas de busca de bens"). Confirmei a causa: a tela ao vivo busca **todas** as perguntas de qualificação cadastradas, sem filtrar pelo produto da ligação. Por isso o conteúdo de um cliente aparece no de outro.

## O que muda

1. A lista de perguntas da tela ao vivo passa a mostrar **somente as perguntas do produto da ligação**. Nada de outro produto aparece.
2. Quando o produto tem perguntas e critérios próprios cadastrados, o padrão geral deixa de ser usado naquele produto — nem na tela, nem na orientação da IA. Produtos que ainda não têm cadastro próprio continuam usando o padrão geral, como hoje.
3. O mesmo vale para os critérios de qualificação e para as quebras de objeção: cada produto usa o que é dele.
4. Se a ligação estiver sem produto escolhido, a tela mostra o padrão geral e um aviso curto de que nenhum produto foi selecionado.

Resultado: o cérebro da AVA fica só na AVA, o da Dra. Andréa Melo só no produto dela, e cada novo produto começa do padrão geral até ganhar o seu próprio conteúdo.

## Detalhes técnicos

- `src/routes/call.$callId.tsx`: a query `perguntas-qualificacao-ativas` passa a incluir `oferta_id`/`oculto`/`base_id`, usar `call.oferta_id` na queryKey e aplicar a mesma regra de resolução do servidor.
- `src/lib/cerebro.server.ts`: `mesclarPorProduto` passa a "override total" — se existir qualquer linha do produto, retorna apenas as linhas do produto (não ocultas); sem linhas do produto, retorna as globais. Mesma função serve perguntas e critérios.
- Objeções: `montarCerebro` passa a filtrar `oferta_id === ofertaId` quando o produto tem objeções próprias, caindo para as globais só quando não tem.
- Extrair a regra para um helper compartilhado usado pelo servidor e pela tela (ex.: `src/lib/qualificacao.ts`) para não duplicar lógica.
- `src/components/Cadastros.tsx` (Cérebro CX) continua mostrando as etiquetas Padrão/Personalizado; quando o produto já tem itens próprios, os herdados aparecem esmaecidos com a nota de que não estão em uso nesse produto.
- Sem migração de banco e sem alteração na captura de áudio, na transcrição ou no cérebro do closer.
