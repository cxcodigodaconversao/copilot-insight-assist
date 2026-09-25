# Melhorias no Copiloto CX: comportamento, estabilidade e envio de arquivos

Nada do que já está cadastrado no Cérebro CX será apagado. Cada produto continua com seu cérebro separado (AVA e Pós não se misturam).

## 1. Como a IA se comporta na ligação (SDR)
- As regras do seu texto entram no prompt do SDR **somando** ao que já existe: "SDR sênior sussurrando pro colega", nunca repetir pergunta já respondida, avançar direto pro agendamento quando o lead der um sinal claro, nunca inventar números nem prazos ("vou confirmar e te retorno"), no máximo 2 frases, objetivo de qualificar e agendar (não vender).
- **Leitura da conversa inteira:** a cada fala, a IA revisa toda a transcrição e marca o que o lead já respondeu, mesmo que ele não tenha sido perguntado. O servidor continua controlando a ordem, então a IA não volta atrás.
- **Pular para o agendamento:** novo sinal "pronto para agendar". Quando ele aparece, o servidor pula as etapas do meio e mostra o aviso "Lead já demonstrou prontidão, pode ir direto pro agendamento".
- **Novo formato na tela:**
  - Perfil DISC com dica de tom (ex.: "D, seja direto")
  - **Resposta padrão**: tirada do roteiro ou da quebra de objeção
  - **Resposta adaptada**: mesma ideia, no tom do perfil e ligada ao que o lead acabou de dizer (aparece em destaque, com o texto surgindo aos poucos)
- O fluxo do closer não muda.

## 2. Estabilidade e velocidade
- A sugestão só é gerada quando o lead termina uma frase ou quando o SDR termina de falar. Nunca no meio de uma fala. Isso já funciona assim hoje e será mantido.
- **Tempo de pausa ajustável:** um novo campo em Configurações define quanto silêncio conta como "terminou de falar". O valor inicial será 0,8 segundo, como você pediu.
  - Atenção: hoje esse tempo é de 0,45 segundo. Com 0,8 segundo, cada sugestão vai demorar uns 0,35 segundo a mais para aparecer, mas corta menos frases no meio. Como o valor é ajustável, você decide.
- Depois de aparecer, a sugestão fica fixa até o lead falar de novo.
- As sugestões continuam sendo geradas pela Claude Haiku, o modelo mais rápido.

## 3. Enviar arquivos para o Cérebro CX
- Nova aba **Arquivos** dentro do cérebro de cada produto, aceitando PDF, Word (.docx), Excel (.xlsx) e .csv.
- Ao enviar, o sistema lê o texto do arquivo e **acrescenta** esse conteúdo ao material de referência daquele produto. O que já está cadastrado continua igual.
- A aba mostra a lista de arquivos, com nome, data, tamanho do texto e situação ("Lido", "Com problema"). Ao remover um arquivo, o conteúdo dele sai do cérebro.
- Se o arquivo estiver vazio, ilegível ou for um PDF escaneado (só imagem), aparece um aviso claro na tela, sem falha silenciosa.
- Só o ADM envia e remove arquivos, seguindo as permissões atuais.

## Detalhes técnicos
- Migração: tabela `documentos_cerebro` (id, oferta_id, nome, tipo, tamanho, texto, status, erro, created_at) com GRANTs e RLS (leitura para autenticados, escrita com `is_adm()`), bucket privado `cerebro-arquivos`, e regra `pausa_fim_fala_ms` = 800 em `config_api`.
- Leitura dos arquivos em server function compatível com o servidor: `unpdf` (PDF), `mammoth` (docx) e `xlsx`/SheetJS (planilhas e csv). Limite de 10 MB por arquivo, e o texto é cortado em ~40k caracteres por arquivo.
- `cerebro.server.ts`: `montarCerebro` carrega os documentos do produto (entram na versão do cérebro e no cache) e `textoCerebroProduto` inclui a seção "MATERIAL DE REFERÊNCIA", com limite de tamanho para não deixar a IA lenta.
- `sugestao.server.ts`: o prompt SDR recebe as novas regras; a saída JSON passa a ter `perfil_disc`, `dica_tom`, `resposta_padrao`, `fala` (a resposta adaptada) e `pronto_para_agendar`; o parcial em tempo real continua usando `fala`; o servidor aplica o salto para o agendamento. O protocolo sobe para `sdr-consultivo-v5`.
- `useTranscricao.ts`: `endpointing`/`utterance_end` do Deepgram e o agrupamento das falas leem `pausa_fim_fala_ms`.
- `call.$callId.tsx`: painel SDR com DISC, resposta padrão e resposta adaptada; a regra de manter a sugestão fixa continua.
- Validação: build, conversa de teste na Pós (bolsa, respostas espontâneas, sinal de agenda) e prova cruzada no AVA, além de enviar um PDF, um docx e um xlsx.
