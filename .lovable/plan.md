# Finalizar integrações do Copiloto CX

## O que falta para o app funcionar

O frontend, banco, regras de acesso e funções do servidor estão prontos. Só faltam **duas chaves de API** de terceiros, que nunca aparecem no código e ficam guardadas no cofre do servidor:

1. **ANTHROPIC_API_KEY** — usada pela função `chamarClaude` para gerar sugestões e resumos.
2. **DEEPGRAM_API_KEY** — usada pela função `obterTokenDeepgram` para criar tokens temporários de transcrição.

Sem elas, o app roda, mas:
- a transcrição de áudio não inicia;
- o painel de sugestões do Claude fica vazio;
- o resumo pós-call não é gerado.

## Como obter as chaves

### Anthropic (Claude)
1. Acesse https://console.anthropic.com/ e faça login.
2. Vá em **API Keys** → **Create Key**.
3. Dê um nome (ex: "Copiloto CX") e copie a chave que começa com `sk-ant-...`.

### Deepgram
1. Acesse https://console.deepgram.com/ e faça login (pode criar conta gratuita).
2. Vá em **API Keys** → **Create Key**.
3. Dê um nome (ex: "Copiloto CX") e copie a chave.

## O que será feito depois que você tiver as chaves

1. Abrir o formulário seguro do Lovable para você colar **ANTHROPIC_API_KEY** e **DEEPGRAM_API_KEY**.
2. As chaves serão salvas no cofre do projeto e injetadas automaticamente nas funções do servidor.
3. Validar o fluxo end-to-end:
   - líder cria uma objeção no painel Cérebro CX;
   - aba "Testar o cérebro" mostra o Claude usando essa objeção;
   - vendedor inicia uma call, compartilha a aba e vê a transcrição;
   - fala do cliente dispara sugestão no painel em menos de 3s.

## Decisões pendentes

- Nenhuma. Assim que as chaves forem salvas, o app está pronto para uso.
