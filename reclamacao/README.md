# Reclamação de Qualidade

Formulário da "Solicitação de Atendimento" (modelo Capricórnio, mercado interno) dentro do site da carteira.

- **Pesquisa por cliente**: digite parte do nome; ao escolher, aparecem as notas fiscais do cliente.
- **Nº da nota fiscal**: carrega cliente, artigo, pedido, metragem, preço e data de faturamento a partir da carteira.
- **Carteira usada**: a do site (se a senha já foi digitada nesta aba, abre sozinha), ou um arquivo `.xls/.xlsx` carregado aqui (fica guardado no navegador). Se o arquivo tiver colunas de cadastro (CNPJ, Endereço, Bairro, Cidade, UF, Telefone, E-mail, Contato), elas também são preenchidas.
- **Motivo / Descrição detalhada**: o motivo vai no campo "Motivo da reclamação"; a descrição detalhada sai abaixo do parecer técnico, um parágrafo por linha.
- **Fotos**: até 12, reduzidas no próprio navegador; saem no fim do Word, uma por vez, com a legenda embaixo.
- **Gerar Word (.docx)**: preenche o próprio formulário "Solicitação de Atendimento" (cópia em branco em `modelo-solicitacao.docx`). O técnico recebe um Word editável, idêntico ao padrão. A reclamação é salva neste navegador (lista "Reclamações salvas").

Arquivos: `index.html` (página), `docx-rq.js` (preenche o modelo), `modelo-solicitacao.docx` (formulário em branco com marcadores `{{campo}}`). Usa `../lib/jszip.min.js`; o leitor de Excel é o de `../representantes/`.
