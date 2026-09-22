# Isolamento definitivo do cérebro por produto

## Diagnóstico confirmado

- A ligação mostrada está vinculada ao produto **Pós graduação Bruximos, Ronco e Apneia**.
- O banco contém **9 perguntas próprias desse produto**, todas sobre odontologia, bruxismo, ronco e apneia.
- As perguntas sobre execuções estão vinculadas somente ao produto **AVA — Mentoria Tubarões da Execução**.
- A mistura exibida acontece no caminho de leitura da tela: hoje ela busca perguntas de todos os produtos e só depois tenta separá-las. Isso permite que uma versão antiga ou estado já carregado mostre conteúdo indevido.

## Solução

1. **Filtrar na origem, não na tela**
   - A tela ao vivo buscará diretamente apenas as perguntas cujo produto seja exatamente o produto da ligação.
   - Não será mais permitido baixar perguntas de todos os produtos para filtrar no navegador.
   - O padrão geral só será consultado quando o produto realmente não tiver cérebro próprio.

2. **Criar uma trava de identidade do cérebro**
   - O servidor validará que oferta, roteiro, perguntas, critérios e objeções pertencem ao mesmo produto da ligação.
   - Se algum item vier de outro produto, ele será descartado antes de chegar à IA ou à tela.
   - Produtos com cérebro próprio não herdarão persona, roteiro, perguntas, critérios ou objeções comerciais de outro produto.
   - Apenas o DISC continuará global, conforme definido anteriormente.

3. **Eliminar estados e caches antigos**
   - A troca de produto ou de ligação limpará imediatamente o roteiro anterior da tela.
   - O cache do cérebro passará a ser identificado pelo produto e pela versão do conteúdo, evitando reaproveitar orientação antiga após alterações.

4. **Deixar explícito qual cérebro está ativo**
   - A tela ao vivo mostrará o nome do produto junto ao roteiro e à orientação do copiloto.
   - Se o produto não tiver cadastro próprio completo, a gravação não iniciará silenciosamente com conteúdo genérico: será mostrado um aviso claro para o administrador completar o cérebro.

5. **Validar os dois produtos lado a lado**
   - Testar uma ligação da pós da Dra. Andréa e confirmar ausência total de “execuções”, “judiciário”, “honorários” e referências ao professor José Andrade.
   - Testar o AVA e confirmar ausência total de “bruxismo”, “ronco”, “apneia”, “bolsa parcial” e referências à Dra. Andréa Melo.
   - Conferir tanto o roteiro visível quanto as respostas reais da IA durante a transcrição.

## Resultado esperado

Cada ligação utilizará exclusivamente o cérebro do produto escolhido. Conteúdo do AVA nunca poderá aparecer na pós da Dra. Andréa, e conteúdo da pós nunca poderá aparecer no AVA.
