# Ligação pelo Clint: deixar a gravação clara e em um clique

## A resposta curta (como funciona hoje)

Você liga pelo Clint dentro do Chrome e usa fone. Nesse cenário a voz do cliente só existe dentro da aba do Clint — o microfone não escuta ela. Por isso o Copiloto precisa de duas fontes:

- seu microfone = sua voz;
- o som da aba do Clint = a voz do cliente.

Regras práticas:
- A aba do Clint precisa estar aberta **na mesma janela do Chrome** onde o Copiloto está. Não precisa ser a mesma conta Google, nem a mesma página.
- Você escolhe a aba do Clint uma vez, no começo da ligação. O cliente não vê nada: quem compartilha é o navegador, não o Clint.
- O vídeo da aba é descartado na hora; só o som é usado.

## O que vou mudar no app

1. **Tirar toda menção ao Google Meet da tela de ligação (SDR)** e do texto de ajuda. Na ligação o contexto é Clint/CRM.
2. **Um único botão grande "Começar a gravar"** na tela da ligação. Sem lista de passos na tela.
3. Ao clicar, o app faz tudo sozinho: pede o microfone e abre a janela do Chrome já na aba "Guia do Chrome", com uma frase curta dentro do próprio pedido: "Escolha a aba do Clint e marque Compartilhar áudio da aba".
4. **Avisos só quando algo falhar**, em linguagem direta:
   - esqueceu de marcar o som da aba → "Faltou marcar 'Compartilhar áudio da aba'. Vamos tentar de novo" com botão de repetir;
   - microfone negado → instrução de liberar no cadeado da barra de endereço;
   - navegador sem suporte (Firefox/Safari) → avisar antes de o botão aparecer.
5. **Medidor de som ao vivo**: duas barrinhas ("Você" e "Cliente") mostrando que cada lado está entrando. Se a barra do cliente ficar parada nos primeiros segundos, aparece um aviso de que provavelmente a aba escolhida foi a errada, com botão para escolher de novo.
6. **Link "Como funciona"** discreto no cabeçalho, abrindo a explicação completa (mesma da seção acima) para quem quiser ler — sem poluir a tela.
7. A tela de call do Closer continua falando de Meet (lá o contexto é reunião), mas com o mesmo botão único e o mesmo medidor.

## Teste que eu faço antes de entregar

Abro uma ligação de verdade no navegador de teste, clico no botão, confirmo que a gravação inicia, que a transcrição começa a aparecer e que o aviso de aba errada funciona.

## Detalhes técnicos

- `src/routes/call.$callId.tsx`: remover o bloco de instruções fixo; botão único; ramificar o texto por `call.tipo` (sdr = Clint, closer = Meet); modal "Como funciona".
- `src/hooks/useTranscricao.ts`: expor nível de áudio por canal (AnalyserNode) para o medidor e um retorno de erro tipado (sem-audio-da-aba, mic-negado, navegador-sem-suporte); `getDisplayMedia` com `preferCurrentTab: false` e `selfBrowserSurface: "exclude"` para o seletor abrir em abas.
- `src/routes/nova-call.tsx` e a ajuda da nova ligação: textos revisados por tipo.
- Sem mudanças no cérebro, nas funções de servidor nem no banco.
