# Níveis de acesso: adm, líder, closer e SDR

Hoje o app tem três papéis (líder, closer, SDR) e o líder pode tudo, inclusive apagar. Vamos criar um nível acima — **adm** — e limitar o líder a visualização.

## Quem pode o quê

| Ação | Adm (você) | Líder | Closer / SDR |
|---|---|---|---|
| Cadastrar novas pessoas (convites) | Sim | Não | Não |
| Editar o Cérebro CX (ofertas, objeções, regras, cadastros) | Sim | Não (só visualiza) | Não |
| Ver as calls de toda a equipe | Sim | Sim | Não (só as próprias) |
| Criar e editar as próprias calls | Sim | Sim | Sim |
| Editar calls de outras pessoas | Sim | Não | Não |
| Excluir qualquer registro | Sim | Não | Não |

Closer e SDR seguem criando calls, preenchendo o resultado pós-call e usando o copiloto ao vivo — sem acesso a dados de terceiros.

## O que muda na tela

- **Cérebro CX**: aberto para adm e líder, mas o líder vê tudo em modo leitura (sem botões de salvar, criar ou excluir).
- **Aba Cadastros → Equipe**: só o adm vê o formulário de convite e a opção de remover acesso. O adm também escolhe o papel da pessoa convidada (líder, closer ou SDR).
- **Lista de calls**: líder e adm continuam vendo "Todas as calls"; o botão de excluir aparece só para o adm.
- **Criação de conta livre na tela de login será desativada** — daqui em diante só entra quem for convidado por você. (Se preferir manter a criação livre, me avise.)

## Detalhes técnicos

1. Migração no banco:
   - `ALTER TYPE app_role ADD VALUE 'adm'`.
   - Funções `is_adm()` e ajuste de `is_lider()`; criar `pode_ver_tudo()` (adm ou líder).
   - Atribuir o papel `adm` ao usuário `everton@comercial10x.com.br` (mantendo também `lider` não é necessário — o adm herda tudo).
   - `handle_new_user()`: nunca atribuir `adm` nem `lider` a partir de metadados; o primeiro-usuário-vira-líder sai, já que o adm já existe.
   - Reescrever as policies:
     - `calls`, `falas`, `sugestoes`: SELECT/UPDATE por dono ou `pode_ver_tudo()`; DELETE apenas `is_adm()`; INSERT do próprio usuário.
     - `ofertas`, `objecoes`, `perfis_disc`, `regras_copiloto`, `config_api`, `times`, `origens`, `funis`, `clientes`, `convites`: leitura para autenticados; escrita e exclusão apenas `is_adm()`.
2. `src/hooks/useAuth.tsx`: `Papel` passa a incluir `"adm"`; expor `ehAdm` e `podeVerTudo`.
3. Componentes que hoje checam `papel === "lider"` passam a usar os novos sinalizadores: `AppShell`, `cerebro.tsx`, `calls.tsx`, `Cadastros.tsx`, `NovoCadastroRapido.tsx`, `nova-call.tsx`.
4. `src/lib/equipe.functions.ts`: `convidarMembro` valida `is_adm` em vez de `has_role(lider)` e passa a aceitar também o papel `lider`.
5. Desativar a criação de conta pública (`disable_signup`) e remover o modo "criar conta" da tela de login.
