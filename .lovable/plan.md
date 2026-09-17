# Vincular produtos aos clientes do Golden Insights

Consegui ler os dados do outro sistema. Os nomes dos clientes (as empresas donas dos produtos) são:

- **Cristina Miura**
- **Andréa Melo**
- **José de Andrade**
- **Patricia Abilio** (aparece só como dono do time "Patricia Abilio"; confirmo com você se o nome do cliente é esse mesmo)

Hoje a tabela de clientes daqui está **vazia** e os 18 produtos estão **sem cliente**.

## O que vou fazer

1. Cadastrar os 4 clientes acima.
2. Ligar cada produto ao cliente certo, exatamente como está no Golden Insights:

| Cliente | Produtos |
| --- | --- |
| Cristina Miura | MDSD, MDSD - Renovação, Mentoria DEX, Mentoria DEX - Presencial, Mentoria DEX - Renovação, PERI IMPLANTITE, Perioflix IA, Pós graduação TPNC, PROFILAXIA FPS, Protocolo PROFILAXIA, REC Pós Graduação TPNC |
| Andréa Melo | DTC MASTER, DTC MASTER - Presencial, Pós graduação Bruxismo/Ronco e Apneia, SIBX: Membro Standard |
| José de Andrade | AVA - Expert em Execução, AVA - Mentoria Tubarões da Execução, Mentoria Tubarões da Execução Presencial |
| Patricia Abilio | (sem produtos no outro sistema) |

3. Ligar também os times ao cliente, como lá: AVENGERS → Andréa Melo, Meninas SUPER PODEROSAS → Cristina Miura, Tubarões → José de Andrade, Patricia Abilio → Patricia Abilio, Fundador → sem cliente.
4. **Na Nova call e na Nova ligação**: ao escolher o produto, o campo Cliente passa a ser preenchido sozinho com o dono daquele produto (e continua editável). Se você escolher o cliente primeiro, a lista de produtos mostra só os daquele cliente.
5. Remover o produto de exemplo "Mentoria Comercial 10X (exemplo)", que não existe no Golden Insights.

## Detalhes técnicos

- Migração: `clientes` recebe as 4 linhas (INSERT idempotente por nome); `ofertas` ganha `cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL` e `times` ganha a mesma coluna; UPDATE por nome faz o vínculo conforme a tabela acima. Sem mudança de RLS ou GRANT (as tabelas já são leitura para autenticados, escrita `is_adm()`).
- `src/components/Cadastros.tsx`: `useOfertasAtivas` passa a trazer `cliente_id`; a lista de produtos ganha um select de cliente por linha.
- `src/routes/nova-call.tsx` e `src/routes/nova-ligacao.tsx`: ao trocar `oferta_id`, preencher `cliente` com o nome do cliente vinculado; ao escolher cliente, filtrar a lista de produtos.
- Nada muda no cérebro, na captura de áudio, nas listas nem no pós-call.
