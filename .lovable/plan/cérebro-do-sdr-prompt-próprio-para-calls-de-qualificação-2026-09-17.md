# Cérebro do SDR: prompt próprio para calls de qualificação

Hoje o copiloto usa um único cérebro (closer, com SPIN, oferta e quebras de objeção), mesmo quando a call é de SDR. O plano cria um segundo cérebro, voltado à qualificação e ao agendamento, usando exatamente o texto que você enviou.

## O que será feito

### 1. Novas regras editáveis
Duas novas regras no Cérebro CX → Regras do copiloto:
- `persona_sdr` — quem é o copiloto na call de SDR (já com um texto inicial pronto).
- `regras_conduta_sdr` — como ele deve se comportar (texto inicial pronto).

As regras do closer continuam como estão.

### 2. Cérebro do SDR
Quando a call for do tipo **SDR**, o copiloto passa a usar o prompt novo: persona SDR, regras de conduta SDR, as cinco etapas de qualificação (abertura, diagnóstico, pontuação, agendamento, encerramento), as **perguntas de qualificação** e os **critérios de qualificação** cadastrados, mais os perfis DISC. Oferta e quebras de objeção não entram nesse cérebro.

Quando a call for de **closer**, nada muda.

### 3. Resposta na tela ao vivo
A resposta do SDR traz campos próprios: etapa de qualificação, pontuação, sinal (objeção de agenda, lead desqualificado, sinal de agendamento, dúvida fora do escopo, desvio) e resultado sugerido (seguir qualificando, agendar agora, desqualificar). O painel da call ao vivo mostra esses campos em vez dos do closer quando a call for de SDR, no mesmo visual atual.

### 4. Testar o cérebro
Na aba "Testar o cérebro" ganha um seletor **Closer / SDR**, para você calibrar os dois separadamente. A resposta visual mostra os campos certos conforme o tipo escolhido.

## Detalhes técnicos
- Migração: `INSERT ... ON CONFLICT DO NOTHING` em `regras_copiloto` para as chaves `persona_sdr` e `regras_conduta_sdr`, com `descricao_ajuda`.
- `cerebro.server.ts`: `carregarCerebro` passa a trazer também `perguntas_qualificacao` e `criterios_qualificacao` ativas (ordenadas); `montarSystemPrompt(ctx, tipo)` ramifica entre o template atual (closer) e o novo template SDR, com o formato de resposta JSON exato enviado.
- `copiloto.functions.ts`: `gerarSugestao` usa `call.tipo`; `testarCerebro` ganha `tipo: "closer" | "sdr"` no validador.
- Frontend: `call.$callId.tsx` e `cerebro.tsx` (aba Testar) exibem os campos por tipo; rótulos em português pelo mapa `formatarRotulo` já existente.
- Nada muda na captura de áudio, na transcrição nem no resumo pós-call.
