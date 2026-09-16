# Entrar nos dois apps com o mesmo login

## O que muda

Não é possível trocar o banco do Copiloto CX pelo do Golden Insights: as credenciais aqui são geradas e mantidas automaticamente pela Lovable, e apontar este app para outro banco apagaria o acesso às calls, cadastros e permissões que já existem.

Para o objetivo real — não ter duas contas e duas senhas — a solução é habilitar **Entrar com o Google** nos dois apps. Você usa a mesma conta Google nos dois e não precisa memorizar senha nenhuma.

## O que será feito aqui

- Ativar o login com Google neste projeto.
- Adicionar o botão "Entrar com o Google" na tela de login, no mesmo visual escuro e dourado do resto do app, acima do formulário de e-mail e senha (que continua funcionando).
- Manter a regra atual de acesso por convite: quem entrar com Google e não tiver sido convidado por você continua sem permissão de administrador, entrando com o papel padrão.
- Garantir que sua conta `everton@comercial10x.com.br` continue como administrador ao entrar pelo Google, já que é o mesmo e-mail.

## O que você faz depois

No Golden Insights Dashboard, ativar o mesmo login com Google. A partir daí, um clique na mesma conta entra nos dois.

## Detalhes técnicos

- `supabase--configure_social_auth` para habilitar o provedor Google.
- Login pelo broker da Lovable: `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` em `src/routes/index.tsx`.
- As contas continuam separadas por banco (cada app tem o seu); o que passa a ser comum é a identidade Google usada para entrar.
- Verificação: conferir em `auth.users` / `user_roles` que o e-mail do administrador continua com o papel `adm` após o primeiro login pelo Google.
