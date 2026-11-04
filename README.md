# CRM Studio Denim (representantes comerciais)

A capa com senha abre a carteira; a primeira página após a entrada é o Agente de Pesquisa de Carteira. O cabeçalho traz o menu dos módulos: Carteira, Calculadora de consumo, Tendências, Reclamação de qualidade e Arquivos. Tudo fica neste repositório e é servido pelo GitHub Pages.

Site estático (GitHub Pages) para consultar a carteira de pedidos: busca direta, painel com filtro de mês e lista de pedidos atrasados.

## Arquivos

- `index.html` — a página inteira (HTML, CSS e JavaScript em um arquivo).
- `carteira.enc.json` — a carteira **criptografada** (AES-256-GCM; chave derivada da senha de entrada por PBKDF2-SHA256). Sem a senha, o conteúdo não pode ser lido.
- `tools/atualizar_carteira.py` — converte a planilha `carteira_….xlsx` e regrava `carteira.enc.json`.
- `reclamacao/` — formulário de reclamação de qualidade (usa a mesma carteira).
- `calculadora/` — calculadora de consumo de tecido (Studio Denim): 17 modelagens, risco, gasto por peça e por mesa.
- `tendencias/` — Denim Radar 2026–27: 26 lâminas com fotos (`tendencias/img/`), notas do apresentador e tela cheia.
- `arquivos/` — Solicitações CRM Capri, fichas técnicas (`arquivos/fichas/`), tabelas de preço, imagens e concorrentes.
- `arquivos/lavanderia/` — aba Lavanderia: apostila “A mágica da lavanderia de jeans” e `receitas/` para as receitas das lavagens executadas (incluir cada arquivo na lista `RECEITAS` de `arquivos/index.html`).
- `arquivos/concorrentes/` — catálogo da Santana Textiles e o PDF de equivalências. A busca da aba Concorrentes usa os dados embutidos em `arquivos/index.html` (constante `CDATA`): só é equivalente o artigo Capricórnio com mesmo tingimento, peso (até 5%), ligamento e composição (até 3 pp por fibra).
- `arquivos/tabelas/*.enc` — tabelas de preço **criptografadas** com a mesma chave da carteira. Só abrem dentro do CRM, depois da senha.
- Calculadora, Tendências e Arquivos só abrem depois da senha de entrada.
- `financeiro/` — carteira de títulos: botão “Carregar títulos (.xls)” (lê o histórico de títulos do sistema: Status, Cliente, Nota Fiscal, Número da Parcela, Vencimento, Pagamento, Valor Pago, Saldo, Valor de Comissão), filtros por cliente, nº do título (NF/parcela), NF, vencimento e pagamento; painéis de títulos pagos e vencidos por mês, evolução da comissão (por mês de pagamento) e clientes por prazo de pagamento. Cancelados ficam fora. Os dados ficam só na aba (sessionStorage `sd_titulos_sel`) e começam limpos.
- `lib/nfdocs.js` — NF em PDF e romaneio por número da nota. O botão “Notas fiscais (Drive)” lê o índice publicado pelo Apps Script “NFs Capricórnio” (código em `tools/apps-script-indice-nfs.gs`, implantado como App da Web com código de acesso) e mostra os botões PDF / Romaneio, que baixam direto do Google Drive (os arquivos continuam privados). O link do índice é colado uma vez e fica guardado cifrado com a chave da senha de entrada (sem a senha nada é lido). “+ Romaneio” anexa um romaneio local quando o Drive não tem.
- `representantes/` — versão para outros representantes: sem senha e sem carteira embutida; cada um carrega o próprio arquivo, que é lido só no navegador dele. Fica em `/representantes/` no endereço do site.

## Atualizar a carteira

```bash
pip install openpyxl cryptography
CARTEIRA_SENHA='a senha de entrada' python3 tools/atualizar_carteira.py caminho/carteira_XXXX.xlsx <mtime_em_ms> carteira.enc.json
git add carteira.enc.json && git commit -m "Atualiza carteira" && git push
```

A senha nunca é gravada no repositório. Para trocar a senha, apague `carteira.enc.json` e gere-o de novo com a senha nova.

## Adicionar ou trocar uma tabela de preços

```bash
CARTEIRA_SENHA='a senha de entrada' python3 tools/cifrar_arquivo.py caminho/tabela.pdf arquivos/tabelas/tabela.pdf.enc
```

Depois, inclua a tabela na lista `TABELAS` de `arquivos/index.html` (campo `enc` com o caminho do `.enc`). Nunca envie o arquivo original sem cifrar. Se a senha mudar, cifre as tabelas de novo.

## Observações

- Só entram no arquivo as colunas usadas pelo site (Pedido, Emissão, Embarque, Cliente, Cliente Remessa, Pedido Cliente, Cond Pgto, Prazo Medio, Situação, Sit Linha, Motivo Cancel Linha, Notas Fiscais, Datas, Descrição, Quantidade, qtde_faturada, Saldo, Valor Unitário Liquido, Valor Total).
- Os dados do CRM ficam limpos depois da senha: a carteira publicada serve só para conferir a senha (e abrir as tabelas). Os números aparecem quando o representante usa “Carregar carteira (.xls)”; a carteira escolhida fica aberta só naquela aba (vale também para Reclamação de qualidade) e some ao clicar em Sair ou fechar a aba.
