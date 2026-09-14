# Plano: modal de ajuda na Nova Call

## O que vamos fazer
Adicionar um botão "Como usar" na tela **Nova call** que abre um modal com o passo a passo completo de uso do Copiloto CX em calls ao vivo no Google Meet.

## Conteúdo do modal (seções)
1. **Antes da call**: cadastrar oferta, quebras de objeção, perfis DISC e regras no Cérebro CX.
2. **Iniciar a call**: preencher oferta, nome do lead, origem, notas do CRM, objetivo e tipo (closer/SDR).
3. **Compartilhar o áudio do Meet**: permitir microfone (vendedor) e compartilhar a aba do Meet com "Compartilhar áudio da aba" marcado (cliente).
4. **Durante a call**: transcrição rolando, painel de sugestão, chips de DISC/SPIN/temperatura/sinal, botão de trocar falante, pausar/encerrar.
5. **Após a call**: resumo automático, copiar/exportar JSON, lista de calls.
6. **Aviso importante**: usar Chrome ou Edge; Firefox/Safari não capturam áudio da aba.

## Detalhes técnicos
- Editar `src/routes/nova-call.tsx`.
- Importar `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` de `@/components/ui/dialog`.
- Adicionar estado local `ajudaAberto` para controlar o modal.
- Inserir botão secundário "Como usar" ao lado do título "Nova call".
- Usar classes do design system existente: `card-cx`, cores `primary`/`gold`, tipografia DM Sans/Outfit.
- Manter responsivo: conteúdo do modal com `max-w-2xl` e scroll interno se necessário.
- Não alterar lógica do formulário nem do envio.

## Critério de pronto
- O botão "Como usar" aparece na tela Nova call.
- Ao clicar, o modal exibe o passo a passo completo em português, organizado por etapas.
- Nenhum erro de build ou de tipagem.
