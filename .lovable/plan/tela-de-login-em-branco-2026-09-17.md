# Tela de login em branco

## O que encontrei

Abri o aplicativo agora, direto no ambiente de teste: a tela de login carregou normalmente (logo, "Entrar com o Google", e-mail, senha), sem nenhum erro. O registro de erros do app está limpo e todas as últimas visitas responderam com sucesso.

Ou seja, no momento o app está no ar. O mais provável é que sua janela de pré-visualização tenha ficado presa numa versão antiga enquanto o app era atualizado — nesses casos a tela fica preta e só volta com um recarregamento.

## Primeiro passo (você, 10 segundos)

Recarregue a página do preview (F5 ou Ctrl+Shift+R). Se voltar, era mesmo a tela travada e nada precisa ser mudado no app.

## O que vou fazer para isso não te pegar de novo

### 1. Tela de erro em vez de tela preta
Hoje, se algo falhar durante o carregamento, a tela simplesmente fica vazia e você não tem o que fazer. Vou colocar uma tela amigável no lugar: "Não foi possível carregar o Copiloto CX" com um botão **Recarregar** e a mensagem técnica escondida atrás de "ver detalhes", para você me mandar quando acontecer.

### 2. Aviso de versão nova
Quando o app for atualizado enquanto você estiver com ele aberto, a página se recupera sozinha em vez de ficar em branco.

### 3. Conferência
Depois, abro a tela de login e as telas internas (Calls, Cérebro CX) no navegador de teste para confirmar que tudo aparece.

## Detalhes técnicos
- `src/routes/__root.tsx`: adicionar `errorComponent` (e `notFoundComponent` se ausente) renderizando um painel no design atual — card-cx, dourado/azul-marinho — com botão que chama `router.invalidate()` / `window.location.reload()`.
- Tratar falha de carregamento de chunk (erro de versão nova após deploy) com recarregamento automático único, protegido por flag em `sessionStorage` para evitar laço.
- Nenhuma mudança em captura de áudio, transcrição, cérebro do copiloto ou banco.
