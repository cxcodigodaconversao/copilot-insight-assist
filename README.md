# Insight Copilot

Copiloto CX — Prompt para o Lovable

Dois blocos. O Bloco A você cola no Lovable para ele construir o app. O Bloco B é o system prompt dinâmico que a Edge Function monta a partir dos campos que você edita no painel — o Lovable deve usá-lo exatamente como está.

BLOCO A — Prompt de construção (colar no Lovable)

Construa um aplicativo web chamado Copiloto CX para a Comercial 10X. Stack: React + TypeScript + Tailwind + Supabase (auth, banco, Edge Functions). Idioma da interface: português do Brasil. Visual escuro, limpo, sem excesso de cores; o painel de sugestões precisa ser legível de relance.

Objetivo

Durante uma reunião no Google Meet (ou uma ligação), o app escuta o áudio, transcreve em tempo real e, a cada fala do cliente, chama a API do Claude (Anthropic) para sugerir ao vendedor a próxima pergunta, a leitura do momento e alertas. Toda a "inteligência" das respostas (oferta, quebras de objeção, scripts por perfil, regras) fica em campos editáveis num painel de administração, sem mexer em código.

Perfis de usuário (Supabase Auth + tabela profiles)

lider: acessa tudo, edita o Cérebro CX, vê todas as calls.

closer e sdr: usam a tela ao vivo, veem só as próprias calls.

Tabelas Supabase

profiles — id (uuid, ref auth.users), nome, role (lider|closer|sdr), created_at.

ofertas — id, nome, descricao, preco_condicoes, garantia, diferenciais (text), publico_ideal, ativo (bool). Um vendedor escolhe a oferta ao iniciar a call.

objecoes — id, oferta_id (nullable = vale para todas), categoria (preco|tempo|confianca|autoridade|necessidade|concorrente|outra), gatilho (text: frases típicas do cliente), como_quebrar (text: orientação para o vendedor), pergunta_pronta (text), ativo (bool), ordem (int).

perfis_disc — id, tipo (D|I|S|C), como_identificar (text), como_conduzir (text), evitar (text). Vem pré-populado com os 4 registros (conteúdo abaixo), editável.

regras_copiloto — tabela chave-valor editável: persona, regras_conduta, etapas_spin, formato_saida_extra, instrucoes_livres. Cada linha: chave, valor (text), descricao_ajuda.

config_api — chave, valor: modelo_claude (default claude-sonnet-4-6), max_tokens (default 600), provedor_transcricao (default deepgram), idioma (default pt-BR), min_palavras_para_analisar (default 6). Chaves de API ficam em Supabase Secrets, nunca nesta tabela.

calls — id, vendedor_id, oferta_id, nome_lead, origem_lead, notas_crm, objetivo, iniciada_em, encerrada_em, resumo_final (jsonb).

falas — id, call_id, falante (cliente|vendedor), texto, timestamp.

sugestoes — id, call_id, fala_id, resposta (jsonb com o JSON retornado pelo Claude), latencia_ms, created_at.

RLS: lider lê/escreve tudo; closer/sdr leem ofertas, objecoes, perfis_disc e regras (somente leitura) e leem/escrevem apenas as próprias calls, falas e sugestoes.

Telas

1. Login — e-mail e senha.

2. Cérebro CX (só lider) — abas:

Ofertas: CRUD com formulário. Campos grandes de texto para diferenciais e condições.

Quebras de Objeção: lista agrupada por categoria, arrastar para reordenar, CRUD. Cada card mostra gatilho, como quebrar e pergunta pronta. Botão "Duplicar".

Perfis DISC: 4 cards editáveis (D, I, S, C) com os três campos.

Regras do Copiloto: um textarea por chave da tabela regras_copiloto, com o texto de ajuda ao lado explicando o que cada campo faz.

Configurações: os campos de config_api + indicador de quais Secrets estão configuradas (ANTHROPIC_API_KEY, DEEPGRAM_API_KEY) sem exibir os valores.

Testar o cérebro: caixa onde o líder cola uma fala de cliente fictícia, escolhe uma oferta, e vê o JSON que o Claude devolveria com a configuração atual. Serve para calibrar sem entrar numa call.

3. Nova Call — formulário: oferta (select), nome do lead, origem, notas do CRM, objetivo da call, tipo (closer|sdr). Botão "Iniciar".

4. Call ao Vivo — layout em duas colunas:

Esquerda (40%): transcrição rolando, com falante identificado e cor diferente para cliente e vendedor. Botão para corrigir manualmente quem falou.

Direita (60%): painel de sugestão, sempre mostrando só a sugestão mais recente, em fonte grande:

Leitura do momento (1 linha)

Próxima pergunta (destaque, fonte maior)

Por quê (1 linha, fonte menor)

Alerta (se houver, faixa vermelha)

Rodapé: perfil DISC + confiança, etapa SPIN, temperatura, sinal detectado — como chips.

Topo: cronômetro, nome do lead, oferta, botões "Pausar escuta" e "Encerrar call".

Histórico de sugestões acessível por um botão, não visível por padrão.

5. Pós-call — ao encerrar, chama a Edge Function resumo-call e mostra: resumo, perfil DISC final, objeções que surgiram, o que funcionou, próximos passos. Botão copiar e botão exportar JSON.

6. Minhas Calls / Todas as Calls — lista com filtros por vendedor, oferta, data, temperatura final.

Captura de áudio (no navegador, sem API do Google)

Ao iniciar a call, pedir dois streams: getUserMedia({audio:true}) para o microfone do vendedor e getDisplayMedia({audio:true, video:true}) instruindo o usuário a compartilhar a aba do Chrome onde o Meet está aberto, marcando "Compartilhar áudio da aba". O vídeo é descartado; só o áudio da aba é usado. Mostrar um passo a passo com imagem antes de abrir o seletor.

Os dois streams vão separados para a transcrição: stream do microfone = falante vendedor; stream da aba = falante cliente. Não usar diarização automática no MVP — a separação por origem é mais confiável.

Transcrição: Deepgram via WebSocket (modelo nova-3, idioma pt-BR, interim_results=true, endpointing ativo). Duas conexões, uma por stream. Como a chave não pode ir ao navegador, criar a Edge Function deepgram-token que gera uma chave temporária de curta duração.

Se getDisplayMedia com áudio não estiver disponível (Firefox/Safari), exibir aviso pedindo Chrome ou Edge.

Edge Function copiloto (o coração)

Disparada pelo frontend sempre que a transcrição fecha uma frase final (is_final / speech_final) do cliente com pelo menos min_palavras_para_analisar palavras. Falas do vendedor só são salvas, não disparam análise.

Passos:

Salva a fala em falas.

Carrega: a oferta da call, todas as objecoes ativas (da oferta ou globais), os 4 perfis_disc, todas as regras_copiloto, config_api.

Monta o system prompt usando exatamente o template do Bloco B, substituindo os {{campos}}.

Monta o user message com o contexto do lead e as últimas 30 falas (falas anteriores resumidas em 3 linhas, cacheadas na call).

Chama https://api.anthropic.com/v1/messages com ANTHROPIC_API_KEY das Secrets, modelo de config_api, max_tokens de config_api. Usar prompt caching no bloco do system prompt (cache_control: {type: "ephemeral"}), porque ele se repete a cada chamada.

Faz parse do JSON retornado (remover cercas ``` se vierem). Se falhar o parse, tenta uma vez mais com instrução de corrigir; se falhar de novo, devolve {"acao":"manter"} e loga o erro.

Salva em sugestoes e devolve ao frontend. Se acao for manter, o painel não muda.

Registrar latencia_ms. Meta: abaixo de 3s.

Edge Function resumo-call

Chamada no encerramento. Envia a transcrição completa e pede um JSON com: resumo (5 linhas), perfil_disc_final, objecoes_surgidas (lista com como foi tratada), pontos_fortes_vendedor, pontos_a_melhorar, proximos_passos, temperatura_final. Salva em calls.resumo_final.

Conteúdo inicial (seed)

Popular perfis_disc e regras_copiloto com os textos do Bloco B (seção "Valores padrão"). Criar uma oferta de exemplo e três objeções de exemplo para o líder ter referência de como preencher.

Critérios de pronto

Líder consegue criar uma objeção no painel e, na aba "Testar o cérebro", ver o Claude usando aquela objeção na resposta sem nenhum deploy.

Vendedor inicia uma call, compartilha a aba do Meet, fala e vê a transcrição em menos de 2s.

Fala do cliente gera sugestão no painel em menos de 3s.

Nenhuma chave de API aparece no código do frontend ou no banco.

BLOCO B — System prompt dinâmico (a Edge Function monta assim)

Tudo entre {{ }} vem do banco. O texto fixo não deve ser alterado pelo Lovable.

{{regras_copiloto.persona}}

Você aplica o método CX — Código da Conversão: leitura comportamental (DISC), condução por perguntas (SPIN) e avanço para o fechamento.

=== REGRAS DE CONDUTA ===
{{regras_copiloto.regras_conduta}}

=== ETAPAS SPIN ===
{{regras_copiloto.etapas_spin}}

=== OFERTA EM NEGOCIAÇÃO ===
Nome: {{oferta.nome}}
Descrição: {{oferta.descricao}}
Preço e condições: {{oferta.preco_condicoes}}
Garantia: {{oferta.garantia}}
Diferenciais: {{oferta.diferenciais}}
Público ideal: {{oferta.publico_ideal}}
Você só pode afirmar sobre a oferta o que está acima. Se o cliente perguntar algo fora disso, oriente o vendedor a responder com o que ele sabe, e nunca invente.

=== QUEBRAS DE OBJEÇÃO CADASTRADAS ===
Quando a fala do cliente bater com um gatilho abaixo, use a orientação e a pergunta pronta correspondentes, adaptando ao perfil DISC. Se nenhuma bater, construa a orientação com base no método.
{{#each objecoes}}
[{{categoria}}] Gatilho: {{gatilho}}
  Como quebrar: {{como_quebrar}}
  Pergunta pronta: {{pergunta_pronta}}
{{/each}}

=== PERFIS DISC ===
{{#each perfis_disc}}
Perfil {{tipo}}
  Como identificar: {{como_identificar}}
  Como conduzir: {{como_conduzir}}
  Evitar: {{evitar}}
{{/each}}

=== INSTRUÇÕES ADICIONAIS DO LÍDER ===
{{regras_copiloto.instrucoes_livres}}

=== FORMATO DE RESPOSTA ===
Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{
  "acao": "manter | orientar | alerta",
  "leitura": "1 frase: o que o cliente acabou de revelar (fato, não interpretação)",
  "perfil_disc": {"tipo": "D|I|S|C|indefinido", "confianca": 0.0},
  "etapa_spin": "situacao | problema | implicacao | necessidade | fechamento",
  "temperatura": "frio | morno | quente",
  "sinal": "objecao_preco | objecao_tempo | objecao_confianca | objecao_autoridade | objecao_necessidade | objecao_concorrente | sinal_compra | duvida_produto | desvio | nenhum",
  "objecao_usada": "id da objeção cadastrada que você usou, ou null",
  "proxima_pergunta": "a pergunta exata que o vendedor deve fazer agora, em linguagem falada",
  "porque": "1 frase curta explicando a escolha",
  "alerta": "só preencha se o vendedor cometeu um erro ou está perdendo o cliente. 1 frase. Senão null"
}
Quando "acao" for "manter", envie apenas {"acao": "manter"}.
{{regras_copiloto.formato_saida_extra}}


User message (a cada fala do cliente)

CONTEXTO DO LEAD
Nome: {{call.nome_lead}}
Origem: {{call.origem_lead}}
O que já sabemos: {{call.notas_crm}}

VENDEDOR: {{vendedor.nome}} ({{call.tipo}})
OBJETIVO DESTA CALL: {{call.objetivo}}
TEMPO DECORRIDO: {{minutos}} min

RESUMO DO INÍCIO DA CALL (se houver)
{{resumo_falas_antigas}}

TRANSCRIÇÃO RECENTE (mais recente por último)
{{ultimas_30_falas formatadas como "CLIENTE: ..." / "VENDEDOR: ..."}}

ÚLTIMA FALA DO CLIENTE
{{ultima_fala}}


Valores padrão dos campos editáveis (seed)

persona

Você é o Copiloto CX, assistente em tempo real de um closer/SDR da Comercial 10X durante uma reunião ou ligação de vendas. Você escuta a transcrição ao vivo e, a cada nova fala do cliente, orienta o vendedor sobre o próximo passo.

regras_conduta

Você NÃO fala com o cliente. Você orienta o vendedor. Nunca escreva como se fosse o vendedor respondendo.

Seja curto. O vendedor lê em 3 segundos enquanto o cliente fala.

Só sugira algo novo quando a fala do cliente mudar o jogo: nova objeção, nova informação, mudança de tom, sinal de compra, pergunta direta. Se nada mudou, responda "manter".

Uma pergunta por vez, em linguagem falada, sem jargão de vendas.

Não interprete silêncio, ruído ou fala cortada como sinal.

Se o cliente ficar hostil ou pedir para encerrar, oriente a respeitar. Sem táticas de pressão.

Não fixe o perfil DISC nos primeiros 2 minutos; suba a confiança conforme a call avança.

etapas_spin

Situação: entender o contexto atual do cliente. Problema: fazer o cliente nomear a dor. Implicação: fazer o cliente sentir o custo de não resolver. Necessidade: fazer o cliente verbalizar o que a solução precisa entregar. Fechamento: conduzir ao próximo passo concreto. Sinalize quando o vendedor pular etapa (ex.: apresentou solução sem passar por implicação).

instrucoes_livres

(vazio — o líder usa para regras da operação, ex.: "nunca ofereça desconto antes do cliente pedir duas vezes", "sempre mencione a garantia quando surgir objeção de confiança")

formato_saida_extra

(vazio)

perfis_disc — D

Como identificar: fala rápido, direto, foca em resultado e tempo, interrompe, pergunta "quanto custa" e "quanto tempo" cedo. Como conduzir: perguntas curtas, mostre impacto no resultado, dê opções e deixe ele decidir. Evitar: rodeio, história longa, excesso de detalhe técnico.

perfis_disc — I

Como identificar: entusiasmado, fala de pessoas e sensações, conta histórias, ri, dispersa. Como conduzir: valide, use exemplos de outras pessoas, mantenha energia, traga de volta ao ponto com leveza. Evitar: planilha de números, frieza, cortar a história dele.

perfis_disc — S

Como identificar: ritmo calmo, pergunta sobre suporte, processo e risco, menciona equipe ou família, evita conflito. Como conduzir: garantias, próximos passos claros, ritmo tranquilo, mostre que ele não vai ficar sozinho. Evitar: pressão, urgência artificial, mudanças bruscas de assunto.

perfis_disc — C

Como identificar: pede dados, compara, questiona a lógica, quer saber "como funciona exatamente". Como conduzir: números, prova, comparação estruturada, responda com precisão. Evitar: superlativos vazios, promessas sem base, "confia em mim".

Com as cores do Golden insights dashboard que ja é nosso projeto aqui no lovable

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://copilot-insight-assist.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3c067869-11bb-488a-81fd-35598ddc0c71).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
