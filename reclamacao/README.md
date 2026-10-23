# Reclamação de Qualidade

Formulário da "Solicitação de Atendimento" (modelo Capricórnio, mercado interno) dentro do site da carteira.

- **Pesquisa por cliente**: digite parte do nome; ao escolher, aparecem as notas fiscais do cliente.
- **Nº da nota fiscal**: carrega cliente, artigo, pedido, metragem, preço e data de faturamento a partir da carteira.
- **Carteira usada**: a do site (se a senha já foi digitada nesta aba, abre sozinha), ou um arquivo `.xls/.xlsx` carregado aqui (fica guardado no navegador). Se o arquivo tiver colunas de cadastro (CNPJ, Endereço, Bairro, Cidade, UF, Telefone, E-mail, Contato), elas também são preenchidas.
- **Fotos**: até 12, reduzidas no próprio navegador; saem no PDF em páginas de "Registro fotográfico".
- **Gerar PDF**: mesmo layout do modelo .doc; a reclamação é salva neste navegador (lista "Reclamações salvas").

Arquivos: `index.html` (página), `jspdf.umd.min.js` (jsPDF 2.5.2), `logo.js` (logo do modelo). O leitor de Excel é o de `../representantes/`.
