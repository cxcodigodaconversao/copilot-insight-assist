# Cérebro do SDR — Pós-Graduação em Bruxismo, Ronco e Apneia (Dra. Andréa Melo)

O playbook enviado vira o cérebro exclusivo do produto **Pós graduação Bruximos, Ronco e Apneia** (cliente Andréa Melo). Hoje esse produto está vazio: sem roteiro, sem perguntas, sem critérios e sem dados da oferta. Nenhum outro produto é afetado.

## 1. Roteiro do SDR (7 etapas)

Cadastro do roteiro completo, etapa por etapa, com objetivo, o que fazer e as falas prontas do playbook:

1. Apresentação — equipe da Dra. Andréa Melo, confirmar o nome do cirurgião-dentista.
2. Motivo da ligação — resgatar o formulário da bolsa parcial e alinhar os 5 minutos.
3. Diagnóstico — tempo de formação, especialidade, PSF x consultório próprio, motivação (casos de bruxismo, terapias integrativas, diferenciação do consultório).
4. Checagem real de interesse — pronto para iniciar agora ou é plano para o futuro.
5. Agendamento — duas opções de horário (nunca pergunta aberta), 20-30 min no Google Meet com Rodrigo ou Gabriel.
6. Validação e política de não-remarcação — confirmar e-mail e telefone, escassez da bolsa, sem reagendamento.
7. Recomendações finais — computador ou tablet, ambiente silencioso, convite por e-mail e WhatsApp.

## 2. Persona e regras de conduta do SDR

Persona: copiloto do SDR da equipe da Dra. Andréa Melo, falando com cirurgiões-dentistas, com um único objetivo — agendar a reunião de bolsa parcial com o closer.

Regras vindas dos "Do's & Don'ts" e dos KPIs: não vender o curso nem discutir preço final; nunca perguntar "que dia fica bom?"; pedir para o lead checar o e-mail ainda na ligação; não agendar lead descompromissado; esgotar o diagnóstico antes de avançar; manter a ligação entre 5 e 8 minutos.

## 3. Perguntas de qualificação (exclusivas do produto)

Perguntas do diagnóstico e da checagem de interesse, com o que identificar e follow-up quando a resposta vier vaga: confirmação do preenchimento do formulário, área de atuação, tempo de formação, PSF x consultório próprio, motivação para bruxismo/ronco/apneia, volume de casos hoje, prontidão para iniciar, disponibilidade de agenda noturna.

## 4. Critérios de qualificação (com peso)

Cirurgião-dentista formado; atende ou pretende atender pacientes com bruxismo/ronco/apneia; consultório próprio ou plano de abrir; interesse declarado em especialização agora; orçamento viável com bolsa parcial; disponibilidade confirmada para a reunião de 20-30 min.

## 5. Quebras de objeção do produto

Objeções típicas dessa ligação: "me manda por WhatsApp", "quanto custa?", "vou ver com calma", "não tenho tempo agora", "já fiz outro curso da área", "preciso falar com meu sócio/cônjuge" — cada uma com gatilho, como quebrar e pergunta pronta, sempre devolvendo para o agendamento.

## 6. Dados da oferta

Preenchimento do cadastro do produto (descrição, público ideal, diferenciais, condições) com o que o playbook confirma: pós-graduação em Bruxismo, Ronco e Apneia, com bolsa parcial concedida na reunião com o especialista. Onde o playbook não informa (preço, carga horária, garantia), o campo fica vazio para você preencher — nada será inventado.

## Detalhes técnicos

- Inserções via `run_sql` no produto `d52fe013-d696-4383-b7a2-b4f94ffe9037`:
  - `regras_copiloto`: linhas com `oferta_id` do produto para `roteiro_sdr`, `persona_sdr` e `regras_conduta_sdr` (sobrescrevem o padrão geral apenas neste produto).
  - `perguntas_qualificacao` e `criterios_qualificacao`: linhas novas com `oferta_id` do produto (os itens gerais herdados continuam aparecendo; nenhum é ocultado).
  - `objecoes`: linhas com `oferta_id` do produto.
  - `UPDATE ofertas` nos campos textuais do produto.
- Sem migração de schema e sem alteração de código: `montarSystemPromptSdr` já usa `roteiro_sdr` quando preenchida e `carregarCerebro` já mescla por produto.
- Validação: abrir o Cérebro CX no produto, conferir as abas e rodar "Testar o cérebro" no modo SDR com uma fala de dentista, confirmando que o copiloto segue as 7 etapas.
