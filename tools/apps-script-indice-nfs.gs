

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
  var cache = CacheService.getScriptCache();
  if (p.atualizar !== '1') {
    var c = cache.get('indice_nf');
    if (c) return ContentService.createTextOutput(c).setMimeType(ContentService.MimeType.JSON);
  }
  var s = JSON.stringify(indiceNFs_());
  try { cache.put('indice_nf', s, 600); } catch (err) {}
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

/** { gerado, nfs: { "<NF>": { c: cliente, nf: idDanfe, rom: idRomaneio, r: 1 se for remessa } } } */
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
          if ((m = /^rom_0*(\d+)/i.exec(nome))) itemNF_(out.nfs, m[1], cli).rom = f.getId();
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
function itemNF_(map, nf, cli) { return map[nf] = map[nf] || { c: cli }; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Teste pelo editor: mostra quantas NFs e romaneios o índice encontrou. */
function testarIndiceCRM() {
  var x = indiceNFs_(), ks = Object.keys(x.nfs), nf = 0, rom = 0;
  ks.forEach(function (k) { if (x.nfs[k].nf) nf++; if (x.nfs[k].rom) rom++; });
  Logger.log(JSON.stringify({ notas: ks.length, danfes: nf, romaneios: rom, exemplo: ks.slice(0, 3) }));
}
