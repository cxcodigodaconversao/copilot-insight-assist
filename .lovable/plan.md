# Separar SDR de Closer + importar os cadastros do Golden Insights

Duas entregas: (1) o app passa a tratar ligação de SDR e call de closer como fluxos distintos de ponta a ponta; (2) os cadastros do Golden Insights entram aqui já preenchidos.

## 1. Fluxos separados

Menu principal passa a ter:

- **Ligações (SDR)** e **Nova ligação** — prospecção e qualificação
- **Calls (Closer)** e **Nova call** — negociação e fechamento
- Cérebro CX segue como está

### Nova ligação (SDR)
Campos só do que o SDR precisa: cliente, produto, time, SDR (já vem você), funil, origem, dados do lead (nome, telefone, e-mail), notas do CRM e objetivo. Sem closer, sem valores.

### Nova call (Closer)
Cliente, produto, time, closer (já vem você), SDR que agendou, **ligação de origem** (a ligação do SDR que gerou esta reunião), funil, origem, data/hora agendada e dados do lead.

### Tela ao vivo
- **SDR**: painel de qualificação — etapa (abertura, diagnóstico, pontuação, agendamento, encerramento), pontuação, sinal e resultado sugerido, com as perguntas de qualificação cadastradas à mão. Cabeçalho mostra "Ligação de qualificação".
- **Closer**: painel de negociação como hoje — etapa SPIN, objeções, temperatura.

O cérebro já é diferente por tipo; agora a tela também é.

### Pós-call
- **SDR**: resultado da ligação (agendado, não qualificado, remarcar, sem resposta), data agendada e observações. Sem campos de valor.
- **Closer**: bloco atual completo (status da reunião, resultado, valor vendido, coletado, pendente, forma de pagamento, observações).

### Listas
Duas telas com números próprios:

- **Ligações (SDR)**: total de ligações, agendadas, taxa de agendamento, não qualificados. Filtros por SDR, time, cliente, origem, funil e período. CSV próprio.
- **Calls (Closer)**: os cards atuais (agendadas, no-show, realizadas, conversão, valor vendido, coletado). Filtros e CSV como hoje.

## 2. Importação do Golden Insights

Consegui ler os cadastros do outro sistema. Entram aqui já prontos:

- **Produtos**: 18 (SIBX Membro Standard, DTC MASTER, DTC MASTER Presencial, AVA Expert em Execução, AVA Tubarões da Execução, Mentoria Tubarões da Execução Presencial, Protocolo PROFILAXIA, PROFILAXIA FPS, Mentoria DEX, Mentoria DEX Presencial, Mentoria DEX Renovação, Perioflix IA, PERI IMPLANTITE, MDSD, MDSD Renovação, REC Pós-Graduação TPNC, Pós-graduação TPNC, Pós-graduação Bruxismo/Ronco e Apneia), mantendo ativo/inativo igual ao original.
- **Times**: Fundador, Meninas SUPER PODEROSAS, AVENGERS, Tubarões, Patricia Abilio.
- **Closers**: os 22 nomes, com ativo/inativo preservado.
- **SDRs**: os 16 nomes, com ativo/inativo preservado.
- **Origens**: Alunos MDSD, Alunos Pós, Evento Presencial, Indicação, Reuniões - SDR, Stories IG - CTA para Diagnóstico, FEV/26 Base de Alunos Ativos e Inativos, FEV/26 Diagnóstico Alunos Pós, FEV/26 Diagnóstico IMBX Anteriores, FEV/26 Recuperação DTC Master.

Closers e SDRs entram como **nomes de cadastro** (aparecem nos campos de closer e SDR), sem login. Quem for usar o copiloto ao vivo você convida por e-mail depois, em Cérebro CX → Cadastros → Equipe.

**Pendente com você:** os nomes dos 4 clientes (empresas donas das ofertas) não são legíveis de fora do Golden Insights. Me passe a lista que eu já vinculo cada produto ao cliente certo; sem ela, cadastro os produtos sem cliente e você preenche pelo botão "+".

## Detalhes técnicos

- Migração: em `calls`, `tipo` continua distinguindo sdr/closer; novas colunas `sdr_time`/nada extra — o filtro de lista usa `tipo`. Tabelas de cadastro ganham as novas linhas via INSERT idempotente (`ON CONFLICT`/`WHERE NOT EXISTS` por nome). Duas novas tabelas de nomes: `closers_cadastro` e `sdrs_cadastro` (nome, ativo, ordem), leitura para autenticados e escrita só `is_adm()`, com GRANTs.
- Os campos `closer_id`/`sdr_id` (perfis com login) continuam existindo; os selects passam a listar nomes do cadastro **e** membros com login, gravando o nome em colunas `closer_nome`/`sdr_nome` quando a pessoa não tem conta.
- Rotas novas: `src/routes/nova-ligacao.tsx`, `src/routes/ligacoes.tsx`; `nova-call.tsx` e `calls.tsx` passam a ser só do closer. `AppShell` ganha os itens de menu.
- `call.$callId.tsx` e `pos-call.$callId.tsx` ramificam o layout por `call.tipo` (componentes `PainelSdr`/`PainelCloser`, `ResultadoSdr`/`ResultadoCloser`), sem mexer no cérebro nem na captura de áudio.
- Importação executada por `run_sql` a partir dos dados lidos na API pública do outro projeto; nada é sincronizado automaticamente depois (cópia única).
