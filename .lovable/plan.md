# Reduzir o tempo de resposta percebido do Copiloto

## Objetivo
O SDR começa a ler a sugestão em ~1 segundo após o lead terminar de falar, em vez de esperar 2,5 s com tela parada.

## Diagnóstico (confirmado nas medições anteriores)
- Tempo total hoje: 2,5–3,2 s por fala.
- Componentes: ~0,45 s de espera de fim de fala (Deepgram endpointing 250 ms + debounce 200 ms), ~0,3 s de autenticação/banco, ~1,5–1,8 s de geração completa da IA antes de qualquer texto aparecer.
- O modelo ao vivo já é o mais rápido disponível (`claude-haiku-4-5-20251001`); trocar de modelo não é alavanca.

## Mudanças

### 1. Streaming real até a tela (maior ganho)
- `src/routes/api/sugestao.ts` e `src/lib/sugestao.server.ts`: enviar os pedaços do campo `fala` assim que a IA os gera (NDJSON progressivo), em vez de só o JSON final.
- `src/routes/call.$callId.tsx`: exibir o texto da sugestão enquanto ele chega (efeito de digitação); primeira palavra visível em ~1 s.
- Manter a regra de não trocar o texto enquanto o vendedor está falando: se o vendedor estiver no meio de uma fala, segurar a exibição até ele parar (máx. 5 s).

### 2. Encurtar o caminho no servidor
- Reutilizar o token/autenticação já validado dentro da mesma ligação por alguns segundos, evitando revalidação completa a cada fragmento.
- Inserir a fala e ler as falas recentes em paralelo, não em sequência.
- Persistir a sugestão no banco DEPOIS de responder à tela (não bloqueia a exibição).

### 3. Manter intacto
- Modelo Haiku ao vivo, protocolo `sdr-consultivo-v4`, isolamento por produto (AVA ≠ Pós), fluxo closer (DISC/SPIN), RLS e Edge Functions.
- Espera mínima de fim de fala (~0,45 s): zerá-la faria a IA responder frases cortadas.

## Resultado esperado
- Primeira palavra da sugestão na tela em **~1,0–1,2 s**; texto completo em ~2 s, lido progressivamente.
- Medição antes/depois registrada no log de latência (`latencia_ms` + tempo até primeiro texto).

## Validação
1. Build sem erros.
2. Conversa de teste na Pós (bolsa → roteiro completo) medindo tempo até o primeiro texto na tela.
3. Prova cruzada no AVA (isolamento mantido).

## Fora de escopo
- Troca de modelo, alterações no roteiro/perguntas, mudanças de permissões.
