# Ajustes rápidos no Copiloto CX

## O que será feito

1. **Salvar as chaves de API no cofre** — já concluído.
   - ANTHROPIC_API_KEY e DEEPGRAM_API_KEY foram salvas de forma segura.
   - Os valores nunca aparecem no código nem no banco.

2. **Atualizar o modelo padrão do Claude** no banco.
   - Tabela: `config_api`
   - Chave: `modelo_claude`
   - Valor atual: `claude-sonnet-4-6`
   - Novo valor: `claude-sonnet-5`

## Resultado esperado

Com as chaves no cofre e o modelo atualizado, o app poderá:
- gerar tokens temporários da Deepgram para transcrição;
- chamar a API da Anthropic usando o modelo `claude-sonnet-5`;
- executar o fluxo completo de call ao vivo e resumo pós-call.

Nenhuma outra alteração de código é necessária.
