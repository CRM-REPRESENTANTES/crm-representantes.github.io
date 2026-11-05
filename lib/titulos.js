/* Leitura da carteira de títulos (.xls/.xlsx/.csv) — a mesma regra do módulo Financeiro.
   Usado pelo Painel geral para carregar os títulos sem abrir o Financeiro.
   Titulos.ler(file) -> Promise({meta, rows, cols}) e grava em sessionStorage 'sd_titulos_sel'. */
(function(){
'use strict';
function pad(n){return (n<10?'0':'')+n;}
function norm(s){return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function num(v){ if(typeof v==='number') return isFinite(v)?v:0; if(v==null||v==='') return 0; var s=String(v).replace(/R\$|\s/g,'').trim(); if(/^-?[\d.]+,\d+$/.test(s)||/^-?\d+,\d+$/.test(s)) s=s.replace(/\./g,'').replace(',','.'); var n=parseFloat(s); return isFinite(n)?n:0; }
/* ---------- leitura da planilha ---------- */
function toISO(v){
  if(v instanceof Date&&!isNaN(v)) return v.getFullYear()+'-'+pad(v.getMonth()+1)+'-'+pad(v.getDate());
  if(typeof v==='number'&&v>20000&&v<80000){ var d=new Date(Math.round((v-25569)*86400000)); return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate()); }
  var s=String(v==null?'':v).trim(), m;
  if((m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))){ var y=m[3].length===2? '20'+m[3] : m[3]; return y+'-'+pad(+m[2])+'-'+pad(+m[1]); }
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1]+'-'+m[2]+'-'+m[3];
  return '';
}
/* Reconhece a coluna pelo nome do cabeçalho (vários sistemas usam nomes diferentes). */
function classify(h){
  var n=norm(h).replace(/[._\-\/]/g,' ').replace(/\s+/g,' ').trim();
  if(!n) return '';
  if(/desconto|juros|multa|tipo|forma|cnpj|cpf|^cod/.test(n)) return '';
  if(/grupo/.test(n)) return 'grupo';
  if(/comiss/.test(n)) return /%|perc|taxa|aliq|indice/.test(n)? 'pctCom' : 'comissao';
  if(/\b(valor|vlr|vl)\b.*(pag|receb|baix|liquid)/.test(n)) return 'valorPago';
  if(/venc/.test(n)) return 'venc';
  if(/emiss|faturamento/.test(n)) return 'emissao';
  if(/cond|prazo|forma|portador|banco/.test(n)) return '';
  if(/\b(pag|pagto|pgto|pagamento|pago|baixa|liquida\w*|recebimento|recebido|credito|quitacao)\b/.test(n)) return 'pag';
  if(/^(valor|vlr|vl)\b/.test(n)&&!/saldo/.test(n)) return 'valor';
  if(/parc/.test(n)) return 'parcela';
  if(/\bnf\b|\bnfe\b|nota/.test(n)) return 'nf';
  if(/titulo|duplicata|^doc|documento|^numero$|^n[ºo°]?$/.test(n)) return 'titulo';
  if(/pedido/.test(n)) return 'pedido';
  if(/cliente|sacado|razao|nome/.test(n)) return /cod|^cd\b/.test(n)? '' : 'cliente';
  if(/situa|status/.test(n)) return 'situacao';
  if(/saldo|em aberto/.test(n)) return 'saldo';
  if(/valor|vlr|montante|total/.test(n)) return 'valor';
  return '';
}
function parseTitulos(XLSX, buf){
  var wb=XLSX.read(new Uint8Array(buf),{type:'array'}), best=null;
  wb.SheetNames.forEach(function(name){
    var rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:''});
    for(var hi=0;hi<Math.min(10,rows.length);hi++){
      var map={}, n=0;
      (rows[hi]||[]).forEach(function(c,i){ var k=classify(c); if(k&&map[k]==null){ map[k]=i; n++; } });
      var ok=map.cliente!=null&&map.venc!=null&&(map.valor!=null||map.valorPago!=null);
      if(ok&&(!best||n>best.n)) best={n:n,map:map,rows:rows,hi:hi};
    }
  });
  if(!best) throw new Error('colunas');
  var M=best.map, out=[];
  var g=function(row,k){ return M[k]!=null? row[M[k]] : ''; };
  for(var r=best.hi+1;r<best.rows.length;r++){
    var row=best.rows[r]; if(!row) continue;
    var cli=String(g(row,'cliente')||'').trim(), valor=num(g(row,'valor')), vp=num(g(row,'valorPago'));
    if(!cli||/^total/i.test(cli)) continue;
    if(!valor&&!vp) continue;
    out.push({
      titulo:String(g(row,'titulo')==null?'':g(row,'titulo')).replace(/\.0+$/,'').trim() || (M.nf!=null? String(g(row,'nf')).replace(/\.0+$/,'').trim() : ''),
      parcela:String(g(row,'parcela')||'').trim(),
      cliente:cli, grupo:String(g(row,'grupo')||'').trim(),
      nf:String(g(row,'nf')==null?'':g(row,'nf')).replace(/\.0+$/,'').trim(),
      pedido:String(g(row,'pedido')||'').replace(/\.0+$/,'').trim(),
      emissao:toISO(g(row,'emissao')), venc:toISO(g(row,'venc')), pag:toISO(g(row,'pag')),
      valor:valor||vp, valorPago:vp, saldo:M.saldo!=null? num(g(row,'saldo')) : null,
      comissao:M.comissao!=null? num(g(row,'comissao')) : null,
      pctCom:M.pctCom!=null? num(g(row,'pctCom')) : null,
      situacao:String(g(row,'situacao')||'').trim()
    });
  }
  if(!out.length) throw new Error('vazio');
  return {rows:out, cols:Object.keys(M)};
}
function loadXLSX(){
  return new Promise(function(res,rej){
    if(window.XLSX) return res(window.XLSX);
    var tenta=function(src, next){ var s=document.createElement('script'); s.src=src; s.onload=function(){ window.XLSX? res(window.XLSX) : next(); }; s.onerror=next; document.head.appendChild(s); };
    tenta(BASE+'representantes/xlsx.full.min.js', function(){ tenta('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', function(){ rej(new Error('lib')); }); });
  });
}
var BASE=(function(){ var s=document.currentScript&&document.currentScript.src||''; return s.replace(/lib\/titulos\.js.*$/,''); })();
function ler(file){
  return Promise.all([loadXLSX(), file.arrayBuffer()]).then(function(a){
    var p=parseTitulos(a[0],a[1]);
    var meta={arquivo:file.name, modificadoEm:new Date(file.lastModified||Date.now()).toISOString(), carregadoEm:new Date().toISOString()};
    var v={meta:meta, rows:p.rows, cols:p.cols};
    try{ sessionStorage.setItem('sd_titulos_sel', JSON.stringify(v)); }catch(e){}
    return v;
  });
}
window.Titulos={ler:ler};
})();
