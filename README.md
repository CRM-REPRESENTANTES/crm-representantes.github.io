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
- `arquivos/tabelas/*.enc` — tabelas de preço **criptografadas** com a mesma chave da carteira. Só abrem dentro do CRM, depois da senha.
- Calculadora, Tendências e Arquivos só abrem depois da senha de entrada.
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
- A página aberta confere a cada 10 minutos se há carteira nova.
