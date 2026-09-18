# Corrigir o erro "Não foi possível liberar a transcrição (403)"

## O que está acontecendo

Testei a chave da Deepgram que está guardada no cofre do projeto:

- Ela **transcreve áudio normalmente** (teste de transcrição respondeu com sucesso).
- Ela **não tem permissão** para liberar o acesso temporário que o navegador precisa para ouvir a ligação ao vivo. O serviço responde "permissões insuficientes".

Ou seja: a chave é de um tipo restrito (só uso), e a escuta ao vivo exige uma chave com permissão de administrador do projeto na Deepgram.

## Como resolver

1. Você entra na sua conta da Deepgram, em API Keys, e cria uma chave nova com o papel **Owner** (ou Admin) — as opções restritas como "usage only" não servem.
2. Eu abro o formulário seguro para você colar essa chave; ela substitui a atual no cofre e nunca aparece na tela nem no código.
3. Eu testo na hora: peço o acesso temporário e confirmo que a escuta ao vivo libera sem o erro 403.
4. A chave antiga pode ser apagada na Deepgram depois que o teste passar.

## Aproveitando a mesma correção

Na sua captura aparece o texto antigo citando o Google Meet numa ligação de SDR. Nas ligações a conversa é pelo Clint, então ajusto esse aviso da tela ao vivo do SDR para falar da aba do Clint, com o passo a passo certo.

## Detalhes técnicos

- `obterTokenDeepgram` em `src/lib/copiloto.functions.ts` chama `POST https://api.deepgram.com/v1/auth/grant`; a chave atual retorna 403 `INSUFFICIENT_PERMISSIONS` (falta escopo `keys:write`). Nenhuma mudança de código é necessária nessa função — o problema é só a credencial.
- Troca do segredo `DEEPGRAM_API_KEY` pelo formulário seguro de secrets.
- Validação após a troca: chamada direta ao endpoint de grant e, em seguida, conferência da tela ao vivo.
- Texto da tela ao vivo do SDR em `src/routes/call.$callId.tsx` atualizado para o fluxo do Clint (sem menção ao Meet). Captura de áudio, cérebro e demais telas não mudam.
