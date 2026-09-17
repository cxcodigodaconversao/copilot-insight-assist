# Qualificação: perguntas, critérios e resultado do SDR

## O que será feito

### 1. Banco de dados (migração única)
- Criar `perguntas_qualificacao` (categoria: momento, autoridade, dor, orçamento, fit, urgência; pergunta; o que identificar; pergunta de follow-up; ativo; ordem) e `criterios_qualificacao` (critério, como identificar, peso, ativo), ambas com leitura para toda a equipe e escrita **somente para o administrador** (ajuste em relação ao SQL enviado, que liberava para o líder — no seu modelo o líder só visualiza).
- Em `calls`, adicionar: `resultado_sdr` (agendado, não qualificado, remarcar, sem resposta) e `call_origem_id` (liga uma call de closer à call de SDR que a originou).
- Exemplos iniciais: algumas perguntas por categoria e critérios básicos, para você ter referência e poder editar.

### 2. Cérebro CX — nova aba "Qualificação"
- Cadastro das perguntas de qualificação (categoria, pergunta, o que identificar, follow-up, ativo, ordem).
- Cadastro dos critérios (critério, como identificar, peso, ativo).
- Mesmo padrão visual das demais abas; somente o administrador edita.

### 3. Pós-call do SDR
- Quando a call for do tipo SDR, o bloco Resultado passa a mostrar também: `resultado_sdr` (agendado / não qualificado / remarcar / sem resposta) e, quando fizer sentido, a call de origem vinculada.

## Detalhes técnicos
- Migração com GRANTs, RLS (leitura authenticated; escrita `is_adm()`), CHECK nas categorias/resultados, índice em `call_origem_id` e FK `ON DELETE SET NULL`.
- Seeds inseridos na própria migração.
- Frontend: `Cadastros.tsx`/`cerebro.tsx` (nova aba) e `pos-call.$callId.tsx` (campos SDR). Copiloto ao vivo e transcrição não são tocados.
