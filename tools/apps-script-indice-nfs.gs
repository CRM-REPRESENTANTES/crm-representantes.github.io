

// ---------- índice para o CRM (crm-representantes.github.io) ----------
// O CRM lê esta lista (número da NF, cliente e o id do arquivo no Drive) e baixa os PDFs direto do Drive.
// Os arquivos continuam privados: só abrem para quem tem acesso no Google Drive.
// Implantação: Implantar > Nova implantação > App da Web (Executar como: eu · Quem pode acessar: qualquer pessoa).
// O acesso ao índice exige o código gerado por gerarCodigoCRM().

/** Cria (uma vez) o código de acesso do CRM e mostra no registro de execução. */
function gerarCodigoCRM() {
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty('CRM_TOKEN');
  if (!t) { t = Utilities.getUuid().replace(/-/g, ''); props.setProperty('CRM_TOKEN', t); }
  Logger.log('Código do CRM: ' + t);
  return t;
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var token = PropertiesService.getScriptProperties().getProperty('CRM_TOKEN');
  if (!token || p.token !== token) return json_({ erro: 'acesso negado' });
  if (p.acao === 'rom') return json_(romaneios_(String(p.ids || '').split(',').filter(String)));
  var cache = CacheService.getScriptCache();
  if (p.atualizar !== '1') {
    var c = cache.get('indice_nf');
    if (c) return ContentService.createTextOutput(c).setMimeType(ContentService.MimeType.JSON);
  }
  var s = JSON.stringify(indiceNFs_());
  try { cache.put('indice_nf', s, 600); } catch (err) {}
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

/** { gerado, nfs: { "<NF>": { c: cliente, nf: idDanfe, rom: idRomaneio, rx: [outros romaneios], rd: data, rt: 'txt', r: 1 se for remessa } } } */
function indiceNFs_() {
  var out = { gerado: new Date().toISOString(), nfs: {} };
  var raizes = DriveApp.getFoldersByName(CONFIG.pastaRaiz);
  while (raizes.hasNext()) {
    var clientes = raizes.next().getFolders();
    while (clientes.hasNext()) {
      var cf = clientes.next(), cli = cf.getName(), subs = cf.getFolders();
      while (subs.hasNext()) {
        var sf = subs.next(), tipoPasta = sf.getName(), fs = sf.getFiles();
        while (fs.hasNext()) {
          var f = fs.next(), nome = f.getName(), m;
          if ((m = /^rom_0*(\d+)/i.exec(nome))) {
            var ro = itemNF_(out.nfs, m[1], cli);
            if (ro.rom) (ro.rx = ro.rx || []).push(f.getId()); else ro.rom = f.getId();
            ro.rd = dataArquivo_(f); if (/\.txt$/i.test(nome)) ro.rt = 'txt';
          }
          else if ((m = /^danfe_0*(\d+)/i.exec(nome))) {
            var o = itemNF_(out.nfs, m[1], cli); o.nf = f.getId();
            if (tipoPasta === 'NF Remessa') o.r = 1;
          }
        }
      }
    }
  }
  return out;
}
/** Data do e-mail (gravada na descrição pelo processar_) ou a data em que o arquivo entrou no Drive. */
function dataArquivo_(f) {
  var d = /^email:(\d{4}-\d{2}-\d{2})/.exec(f.getDescription() || '');
  return d ? d[1] : Utilities.formatDate(f.getDateCreated(), 'America/Sao_Paulo', 'yyyy-MM-dd');
}

/** Conteúdo de romaneios para o Verificador de Romaneios do CRM (?acao=rom&ids=a,b,c — só arquivos da pasta NFs Capricórnio). */
function romaneios_(ids) {
  var out = [];
  ids.slice(0, 15).forEach(function (id) {
    try {
      var f = DriveApp.getFileById(id), nome = f.getName();
      if (!/^rom/i.test(nome) || !dentroDaRaiz_(f)) { out.push({ id: id, erro: 'fora da pasta' }); return; }
      var b = f.getBlob();
      if (/\.txt$/i.test(nome)) out.push({ id: id, nome: nome, txt: b.getDataAsString('ISO-8859-1') });
      else out.push({ id: id, nome: nome, b64: Utilities.base64Encode(b.getBytes()) });
    } catch (e) { out.push({ id: id, erro: 'não encontrado' }); }
  });
  return { arquivos: out };
}
function dentroDaRaiz_(f) {
  var ps = f.getParents();
  while (ps.hasNext()) {
    var p = ps.next(), cs = p.getParents();
    while (cs.hasNext()) { var c = cs.next(), rs = c.getParents(); while (rs.hasNext()) if (rs.next().getName() === CONFIG.pastaRaiz) return true; }
  }
  return false;
}

/** Grava a data do e-mail ("email:aaaa-mm-dd" na descrição) nos arquivos já baixados. Rode até aparecer "concluído". */
function datarArquivosAntigos() {
  var props = PropertiesService.getScriptProperties();
  var desde = props.getProperty('DATAR_DATA') || '2026/05/01';
  var res = processar_(desde, null);
  if (res.resumo.parouPorTempo) props.setProperty('DATAR_DATA', res.novaData); else props.deleteProperty('DATAR_DATA');
  limparIndiceCRM_();
  res.resumo.continuaEm = res.resumo.parouPorTempo ? res.novaData : 'concluído';
  Logger.log(JSON.stringify(res.resumo));
  return res.resumo;
}

function itemNF_(map, nf, cli) { return map[nf] = map[nf] || { c: cli }; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Teste pelo editor: mostra quantas NFs e romaneios o índice encontrou. */
function testarIndiceCRM() {
  var x = indiceNFs_(), ks = Object.keys(x.nfs), nf = 0, rom = 0;
  ks.forEach(function (k) { if (x.nfs[k].nf) nf++; if (x.nfs[k].rom) rom++; });
  Logger.log(JSON.stringify({ notas: ks.length, danfes: nf, romaneios: rom, exemplo: ks.slice(0, 3) }));
}
