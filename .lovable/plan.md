# Configurações: cadastro de pessoas e de todos os cadastros

Uma área "Configurações" nova no menu do topo, visível só para o administrador, espelhando o que existe no Golden Insights.

## 1. Aba Usuários (só adm)

Lista de todas as pessoas com acesso, mostrando nome, e-mail, papel e se está ativa.

- **Novo usuário**: nome, e-mail, senha e papel (Administrador, Líder, Closer, SDR). A pessoa já entra com esses dados, sem precisar de convite.
- **Alterar papel** direto na linha.
- **Ativar / desativar** o acesso (a pessoa desativada não consegue entrar).
- **Redefinir senha**: você digita a nova senha e informa à pessoa.
- **Excluir** o acesso.
- O convite por e-mail continua disponível como segunda opção, ao lado do botão de criar.
- Avisos claros quando o e-mail já existe.

## 2. Abas de cadastros

As mesmas listas que hoje ficam dentro do Cérebro CX passam para cá, em abas separadas, no mesmo estilo do Golden Insights:

Clientes · Produtos · Times · Closers · SDRs · Origens · Funis

Cada uma com criar, renomear, ativar/desativar, ordenar e excluir; Produtos mantém os campos completos e o vínculo com o cliente.

A aba "Cadastros" sai do Cérebro CX, que passa a cuidar só da inteligência por produto (Oferta, Quebras, Regras, Qualificação, Testar). Perfis DISC e Configurações da API continuam no Cérebro CX (Padrão geral).

## 3. Importação das pessoas do Golden Insights

Trago a lista de usuários do outro sistema (nome, e-mail e papel) e crio o acesso de cada um aqui, com o papel equivalente: admin→Administrador, líder→Líder, vendedor→Closer, sdr→SDR. Cada pessoa nasce com uma senha provisória; em Configurações → Usuários você redefine a senha de quem for usar o copiloto, ou usa o convite por e-mail para a pessoa criar a dela.

Quem já tem acesso aqui não é duplicado.

## Detalhes técnicos

- Migração: `profiles` ganha `email text` e `ativo boolean not null default true`; `handle_new_user()` passa a gravar o e-mail. Política de UPDATE de `profiles` já permite dono ou `is_adm()`.
- `src/lib/equipe.functions.ts` ganha server functions com `requireSupabaseAuth` + verificação `has_role(adm)`, usando `supabaseAdmin` importado dentro do handler: `criarUsuario` (auth.admin.createUser com email_confirm, cria profile e user_roles), `alterarPapel`, `definirSenha`, `alternarAtivo`, `excluirUsuario`. `convidarMembro` passa a aceitar também o papel `adm`.
- Nova rota `src/routes/configuracoes.tsx` com `Tabs`: Usuários + as sete listas, reaproveitando `TabelaCadastro`/`ListaProdutos` de `src/components/Cadastros.tsx`; acesso bloqueado para quem não é adm (mensagem, sem quebrar).
- `AppShell.tsx`: item "Configurações" (ícone Settings) visível só com `ehAdm`.
- `cerebro.tsx`: remove a aba Cadastros do modo geral, mantendo DISC e Configurações.
- Importação dos usuários via leitura do banco do Golden Insights e `criarUsuario` em lote (execução única, sem sincronização contínua).
- Bloqueio de login para inativos: verificação de `profiles.ativo` logo após o login, com mensagem "Seu acesso está desativado" e saída da sessão.
