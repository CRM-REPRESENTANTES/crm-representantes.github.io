# CRM Studio Denim (representantes comerciais)

A capa com senha abre a carteira; a primeira página após a entrada é o Agente de Pesquisa de Carteira. O cabeçalho traz o menu dos módulos: Carteira, Calculadora de consumo, Tendências, Reclamação de qualidade, Verificador de romaneios, Financeiro e Arquivos. Tudo fica neste repositório e é servido pelo GitHub Pages.

Site estático (GitHub Pages) para consultar a carteira de pedidos: busca direta, painel com filtro de mês e lista de pedidos atrasados.

## Arquivos

- `index.html` — a página inteira (HTML, CSS e JavaScript em um arquivo). O primeiro bloco é o painel **Meta x Realizado**: lê só a planilha de meta x realizado carregada no botão (aba Dashboard; se não houver, Input ou Plan1) e mostra 3 gráficos — Denim, Sarja e Total consolidado — com as linhas de meta, realizado (em metros) e % de atingimento. A planilha fica guardada cifrada no navegador com a chave da senha de entrada (localStorage `sd_metas_enc`).
- `carteira.enc.json` — a carteira **criptografada** (AES-256-GCM; chave derivada da senha de entrada por PBKDF2-SHA256). Sem a senha, o conteúdo não pode ser lido.
- `tools/atualizar_carteira.py` — converte a planilha `carteira_….xlsx` e regrava `carteira.enc.json`.
- `reclamacao/` — formulário de reclamação de qualidade (usa a mesma carteira).
- `calculadora/` — calculadora de consumo de tecido (Studio Denim): 17 modelagens, risco, gasto por peça e por mesa.
- `tendencias/` — Denim Radar 2026–27: 26 lâminas com fotos (`tendencias/img/`), notas do apresentador e tela cheia.
- `arquivos/` — Solicitações CRM Capri, fichas técnicas (`arquivos/fichas/`), tabelas de preço, imagens e concorrentes.
- `arquivos/lavanderia/` — aba Lavanderia: apostila “A mágica da lavanderia de jeans”, `receitas/` para as receitas das lavagens executadas (lista `RECEITAS` de `arquivos/index.html`) e `caprilab/` para o botão “Caprilab desenvolvimentos para clientes” (vídeos e arquivos cifrados com a senha de documentos; lista `CAPRILAB`).
- `arquivos/concorrentes/` — catálogo da Santana Textiles e o PDF de equivalências. A busca da aba Concorrentes usa os dados embutidos em `arquivos/index.html` (constante `CDATA`): só é equivalente o artigo Capricórnio com mesmo tingimento, peso (até 5%), ligamento e composição (até 3 pp por fibra).
- `arquivos/tabelas/*.enc` — tabelas de preço **criptografadas** com a mesma chave da carteira. Só abrem dentro do CRM, depois da senha.
- Calculadora, Tendências e Arquivos só abrem depois da senha de entrada.
- `financeiro/` — carteira de títulos: botão “Carregar títulos (.xls)” (lê o histórico de títulos do sistema: Status, Cliente, Nota Fiscal, Número da Parcela, Vencimento, Pagamento, Valor Pago, Saldo, Valor de Comissão), filtros por cliente, nº do título (NF/parcela), NF, vencimento e pagamento; painéis de títulos pagos e vencidos por mês, evolução da comissão (por mês de pagamento) e clientes por prazo de pagamento. Cancelados ficam fora. Os dados ficam só na aba (sessionStorage `sd_titulos_sel`) e começam limpos.
- `lib/nfdocs.js` — NF em PDF e romaneio por número da nota. O botão “Notas fiscais (Drive)” lê o índice publicado pelo Apps Script “NFs Capricórnio” (código em `tools/apps-script-indice-nfs.gs`, implantado como App da Web com código de acesso) e mostra os botões PDF / Romaneio, que baixam direto do Google Drive (os arquivos continuam privados). O link do índice é colado uma vez e fica guardado cifrado com a chave da senha de entrada (sem a senha nada é lido). “+ Romaneio” anexa um romaneio local quando o Drive não tem.
- `romaneios/` — **Verificador de romaneios**: lista os romaneios da pasta NFs Capricórnio no Google Drive (mesmo App da Web do botão Notas fiscais, ação `acao=rom`), com filtro por data, cliente ou grupo econômico e tecido (o tecido é identificado lendo os romaneios em segundo plano; os já lidos ficam guardados cifrados no navegador, IndexedDB `sd_romaneios`) (o grupo vem da coluna Grupo Econômico da carteira de títulos carregada no Financeiro e fica guardado cifrado; dá para incluir ou tirar uma empresa do grupo na tela). Os romaneios escolhidos são lidos no navegador (PDF ou TXT do Systextil) e conferidos com o Manual de Qualidade: % de peças abaixo de 80 m (60 m no Denim Color), regra dos 10% em rolos de 30 m a 79,9 m acima de 1.000 m, peças abaixo de 30 m, nuances por NF (2/3/4/5 conforme a metragem), OTs, largura (máx. 4 cm) e pontuação (máx. 15 pts/100 m²), com NF e pedido. Gera o PDF “Relatório de conformidade de romaneios” para o cliente: resumo com indicadores, tabela por romaneio, checklist do manual por romaneio (OK / FORA / INFO), nuances e OTs, rolos abaixo de 80 m e critérios de referência.
- `representantes/` — versão para outros representantes: sem senha e sem carteira embutida; cada um carrega o próprio arquivo, que é lido só no navegador dele. Fica em `/representantes/` no endereço do site.

## App para celular (PWA)

O CRM pode ser instalado no celular como app (ícone na tela inicial, abre em tela cheia), direto do site — sem loja de apps.

- **Android (Chrome):** abra `crm-representantes.github.io` e toque em **Instalar** no aviso que aparece embaixo (ou menu ⋮ → *Instalar app* / *Adicionar à tela inicial*). Segurando o ícone aparecem atalhos para Financeiro, Romaneios, Calculadora e Reclamação.
- **iPhone/iPad (Safari):** abra o site, toque em **Compartilhar** → **Adicionar à Tela de Início**.
- `manifest.webmanifest` (CRM completo) e `representantes/manifest.webmanifest` (versão dos outros representantes, instala como app separado “Agente Carteira”).
- `sw.js` — service worker: sempre busca a versão nova na rede; guarda no aparelho só páginas, estilos, scripts e ícones. **Nunca** guarda carteira, tabelas, fichas ou qualquer arquivo cifrado (`.enc`, `.enc2`, `.enc.json`), nem nada do Google Drive. Sem internet mostra o aviso “Sem conexão”. Ao mudar a lista do que fica guardado, troque `CACHE` (`sd-app-v1` → `v2`).
- `lib/pwa.js` — registra o service worker e mostra o aviso de instalação (some depois de fechado ou instalado). Incluído em todas as páginas.
- `icons/` — ícone do app (bolso de jeans) em SVG e PNG.

A senha de entrada continua sendo pedida no app, e os dados carregados continuam só na aba/sessão, como no navegador.

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

## Senha de documentos

Fichas técnicas (`arquivos/fichas/**/*.pdf.enc`), tabelas de preço (`arquivos/tabelas/*.enc`, cifradas com a chave da carteira; a senha de documentos é pedida para abrir a aba — ao recifrar com as duas camadas, use `.enc2` e `duplo:true`) e a apostila (`arquivos/lavanderia/*.pdf.enc`) ficam cifradas com a **senha de documentos**, diferente da senha de entrada. O cabeçalho é `arquivos/docs.enc.json` (PBKDF2-SHA256, 600 mil iterações). As tabelas têm duas camadas: senha de documentos por fora e chave da carteira por dentro.

```bash
DOCS_SENHA='a senha de documentos' python3 tools/cifrar_docs.py caminho/arquivo.pdf arquivos/fichas/original/arquivo.pdf.enc
```

Para trocar a senha: `DOCS_SENHA='nova' python3 tools/cifrar_docs.py --nova` e cifre de novo todos os documentos a partir dos originais. A senha nunca é gravada no repositório.
