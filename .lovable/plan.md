# Corrigir o 403 da transcrição na versão publicada

## Diagnóstico confirmado

- O erro acontece antes da captura do microfone e da aba: o servidor recebe `403` ao pedir à Deepgram o acesso temporário da transcrição.
- A chave `DEEPGRAM_API_KEY` está cadastrada no cofre.
- A tela da captura é a versão publicada antiga: ela ainda mostra **“Iniciar escuta”**, instruções do **Google Meet** e o endereço publicado. No código atual das ligações SDR, a tela já mostra **“Começar a gravar”** e orienta escolher a aba do **Clint**.
- A versão publicada não registrou detalhes recentes do erro. Portanto, a hipótese principal é que ela ainda esteja executando a versão/configuração anterior, mesmo após a troca da chave.
- O formato atual do pedido à Deepgram está correto. A documentação exige uma chave com papel Member ou superior para liberar o token temporário.

## Correção

1. Melhorar o diagnóstico seguro da Deepgram no servidor, registrando apenas o código e a categoria do erro — nunca a chave.
2. Manter a chave real somente no cofre e preservar o acesso temporário enviado ao navegador.
3. Confirmar que a tela atual das ligações SDR usa **Clint**, **Começar a gravar** e as instruções corretas.
4. Publicar a versão atual para que o site aberto por você carregue o código e a configuração novos.
5. Testar no endereço publicado, autenticado como administrador:
   - o acesso temporário deve retornar sucesso;
   - o Chrome deve pedir microfone e escolha da aba do Clint;
   - o erro 403 não deve reaparecer;
   - os indicadores “Você” e “Cliente” devem responder ao áudio.
6. Se a Deepgram ainda responder 403 após a nova publicação, usar a categoria registrada para distinguir imediatamente entre permissão da chave, projeto incorreto ou conta sem acesso — sem nova tentativa às cegas.

## Fora do escopo

- Não alterar o cérebro do SDR, transcrição, captura de áudio ou regras das calls além do diagnóstico necessário.
- Não expor a chave da Deepgram no navegador, banco, tela ou registros.
