/* NF em PDF e romaneio, ligados pelo número da nota fiscal.
   Os PDFs ficam guardados só neste navegador (IndexedDB "sd_nfdocs"); nada é enviado ao site.
   Uso nas páginas:
     NFDocs.cell(textoDasNFs)  -> HTML com o número de cada NF e os botões PDF / Romaneio
     NFDocs.pick(callback)     -> abre o seletor para carregar vários PDFs de NF (e romaneios)
     NFDocs.cleanTable(table)  -> cópia da tabela sem os botões (para gerar PDF)
     NFDocs.onInfo = function(nf){...}  -> opcional: clique no número da NF */
(function(){
'use strict';
var SRC=(document.currentScript&&document.currentScript.src)||'lib/nfdocs.js';
var DBN='sd_nfdocs', ST='docs', db=null, IDX={}, ready=null, ROM_NF=null;
var PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function norm(s){return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function key(v){ return String(v==null?'':v).replace(/\D/g,'').replace(/^0+/,''); }
function split(v){ return String(v==null?'':v).split(/[^0-9.]+/).map(function(x){return x.replace(/\./g,'');}).filter(function(x){ return x.length>=3; }); }

/* ---------- estilos (iguais em todas as páginas) ---------- */
var css='.nfcell{display:inline-flex;flex-direction:column;gap:3px;}'+
'.nfd{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;white-space:nowrap;}'+
'.nfn{font-weight:600;}button.nfn{background:none;border:0;padding:0;font:inherit;font-weight:700;color:var(--link);text-decoration:underline;cursor:pointer;}'+
'.nfb{text-decoration:none;display:inline-block;font-family:inherit;font-size:10.5px;font-weight:700;border-radius:6px;padding:1px 6px;cursor:pointer;line-height:1.5;border:1px solid var(--accent);background:var(--surface);color:var(--title);}'+
'.nfb:hover{background:var(--tint-strong);}'+
'.nfb.add{border-style:dashed;border-color:var(--border);color:var(--muted);font-weight:600;}'+
'.nfb.add:hover{color:var(--title);border-color:var(--accent);}'+
'.nfb.rom{border-color:var(--good);color:var(--good);}';
var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

/* ---------- banco local ---------- */
function open(){
  if(ready) return ready;
  ready=new Promise(function(res){
    if(!window.indexedDB) return res(null);
    var rq; try{ rq=indexedDB.open(DBN,1); }catch(e){ return res(null); }
    rq.onupgradeneeded=function(){ rq.result.createObjectStore(ST,{keyPath:'id'}); };
    rq.onsuccess=function(){ db=rq.result; res(db); };
    rq.onerror=function(){ res(null); };
  }).then(function(d){
    if(!d) return null;
    return new Promise(function(res){
      var out={}, tx=d.transaction(ST,'readonly'), c=tx.objectStore(ST).openCursor();
      c.onsuccess=function(){ var cur=c.result; if(!cur) return; var v=cur.value; (out[v.nf]=out[v.nf]||{})[v.tipo]=v.nome; cur.continue(); };
      tx.oncomplete=function(){ IDX=out; refresh(); res(d); };
      tx.onerror=function(){ res(d); };
    });
  });
  return ready;
}
function put(rec){ return open().then(function(d){ if(!d) throw new Error('semdb'); return new Promise(function(res,rej){ var tx=d.transaction(ST,'readwrite'); tx.objectStore(ST).put(rec); tx.oncomplete=function(){ (IDX[rec.nf]=IDX[rec.nf]||{})[rec.tipo]=rec.nome; res(); }; tx.onerror=function(){ rej(tx.error); }; }); }); }
function get(id){ return open().then(function(d){ if(!d) return null; return new Promise(function(res){ var rq=d.transaction(ST,'readonly').objectStore(ST).get(id); rq.onsuccess=function(){ res(rq.result||null); }; rq.onerror=function(){ res(null); }; }); }); }
function del(id){ return open().then(function(d){ if(!d) return; return new Promise(function(res){ var tx=d.transaction(ST,'readwrite'); tx.objectStore(ST).delete(id); tx.oncomplete=function(){ var p=id.split(':'); if(IDX[p[1]]){ delete IDX[p[1]][p[0]]; if(!Object.keys(IDX[p[1]]).length) delete IDX[p[1]]; } res(); }; tx.onerror=function(){ res(); }; }); }); }

/* ---------- número da NF: chave de acesso (44 dígitos) ou "Nº" no texto, senão o nome do arquivo ---------- */
function fromChave(s){ var m=String(s).replace(/\s+/g,'').match(/(?:^|\D)(\d{2}\d{4}\d{14}55\d{3}(\d{9})\d{10})(?:\D|$)/); return m? key(m[2]) : ''; }
function fromName(nome){
  var base=String(nome).replace(/\.[a-z0-9]+$/i,''), c=fromChave(base); if(c) return c;
  var b=base.replace(/(\d)\.(\d)/g,'$1$2');
  var m=b.match(/(?:nf-?e?|nota(?:\s*fiscal)?|danfe|n[ºo°])[\s_\-.#:]*0*(\d{3,9})/i); if(m) return key(m[1]);
  var all=b.match(/\d{3,9}/g)||[]; if(all.length===1) return key(all[0]);
  return '';
}
function loadPDFJS(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise(function(res,rej){
    var s=document.createElement('script'); s.src=PDFJS_URL+'pdf.min.js';
    s.onload=function(){ if(!window.pdfjsLib) return rej(new Error('pdfjs')); window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_URL+'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror=function(){ rej(new Error('pdfjs')); }; document.head.appendChild(s);
  });
}
function pdfText(buf){
  return loadPDFJS().then(function(lib){ return lib.getDocument({data:new Uint8Array(buf.slice(0))}).promise; })
    .then(function(pdf){ return pdf.getPage(1).then(function(p){ return p.getTextContent(); }); })
    .then(function(tc){ return tc.items.map(function(i){ return i.str; }).join(' '); })
    .catch(function(){ return ''; });
}
function fromText(t){
  var c=fromChave(t); if(c) return c;
  var m=String(t).match(/N[º°o]\.?\s*:?\s*(\d{3}\.\d{3}\.\d{3}|\d{3,9})/i); if(m) return key(m[1]);
  m=String(t).match(/nota\s*fiscal[^0-9]{0,20}(\d{3,9})/i); return m? key(m[1]) : '';
}
function isRomaneio(nome, texto){ return /romaneio|packing|(^|[\/_\s-])rom[_\s-]?\d/i.test(nome) || /\bromaneio\b/i.test(String(texto).slice(0,600)); }

/* .zip (ex.: pasta "NFs Capricórnio" baixada do Google Drive): abre e lê os PDFs de dentro */
function loadJSZip(){
  if(window.JSZip) return Promise.resolve(window.JSZip);
  var base=(document.currentScript&&document.currentScript.src)||SRC;
  return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=base.replace(/nfdocs\.js.*$/,'jszip.min.js'); s.onload=function(){ window.JSZip? res(window.JSZip) : rej(new Error('zip')); }; s.onerror=function(){ rej(new Error('zip')); }; document.head.appendChild(s); });
}
function expandZips(files){
  return Promise.all(files.map(function(f){
    if(!/\.zip$/i.test(f.name)) return [f];
    return loadJSZip().then(function(JSZip){ return JSZip.loadAsync(f); }).then(function(z){
      var out=[]; z.forEach(function(path, e){ if(!e.dir&&/\.pdf$/i.test(path)) out.push(e.async('blob').then(function(b){ var nm=path.split('/').pop(); var ff=new File([b], nm, {type:'application/pdf'}); ff._path=path; return ff; })); });
      return Promise.all(out);
    }).catch(function(){ return [f]; });
  })).then(function(ls){ return [].concat.apply([], ls); });
}
function importFiles(files, forcedNf, forcedTipo){
  return expandZips([].slice.call(files||[])).then(function(fs){ return importList(fs, forcedNf, forcedTipo); });
}
function importList(files, forcedNf, forcedTipo){
  var res={nf:0, rom:0, sem:[]};
  return files.reduce(function(p,f){
    return p.then(function(){
      if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'){ res.sem.push(f.name); return; }
      return f.arrayBuffer().then(function(buf){
        return (forcedNf? Promise.resolve('') : pdfText(buf)).then(function(t){
          var nf=forcedNf? key(forcedNf) : (fromChave(t)||fromName(f.name)||fromText(t));
          var tipo=forcedTipo||(isRomaneio((f._path||'')+' '+f.name,t)?'rom':'nf');
          if(!nf){ res.sem.push(f.name); return; }
          return put({id:tipo+':'+nf, nf:nf, tipo:tipo, nome:f.name, blob:new Blob([buf],{type:'application/pdf'}), data:new Date().toISOString()})
            .then(function(){ res[tipo]++; });
        });
      });
    });
  }, open()).then(function(){ refresh(); return res; });
}

/* ---------- Google Drive: índice publicado pelo Apps Script "NFs Capricórnio" ----------
   O link (com o código de acesso) fica guardado neste navegador. Os PDFs abrem direto do Drive,
   só para quem tem acesso aos arquivos na conta Google. */
var URL_LS='sd_drive_indice_url', CACHE_LS='sd_drive_indice', REMOTE={}, REMOTE_INFO=null;
try{ var cc=JSON.parse(localStorage.getItem(CACHE_LS)||'null'); if(cc&&cc.nfs){ REMOTE=cc.nfs; REMOTE_INFO=cc; } }catch(e){}
function driveUrl(){ try{ return localStorage.getItem(URL_LS)||''; }catch(e){ return ''; } }
function driveSync(forcar){
  var u=driveUrl(); if(!u) return Promise.reject(new Error('semurl'));
  return fetch(u+(u.indexOf('?')<0?'?':'&')+(forcar?'atualizar=1&':'')+'t='+Date.now(), {cache:'no-store', redirect:'follow'})
    .then(function(r){ if(!r.ok) throw new Error('rede'); return r.json(); })
    .then(function(j){
      if(!j||j.erro||!j.nfs) throw new Error(j&&j.erro? 'acesso' : 'formato');
      REMOTE=j.nfs; REMOTE_INFO=j; try{ localStorage.setItem(CACHE_LS, JSON.stringify(j)); }catch(e){}
      refresh(); return j;
    });
}
function driveResumo(j){
  var ks=Object.keys(j.nfs), nf=0, rom=0; ks.forEach(function(k){ if(j.nfs[k].nf) nf++; if(j.nfs[k].rom) rom++; });
  var d=new Date(j.gerado), pad=function(n){ return (n<10?'0':'')+n; };
  return 'Google Drive: '+nf+' NFs e '+rom+' romaneios · índice de '+pad(d.getDate())+'/'+pad(d.getMonth()+1)+' '+pad(d.getHours())+':'+pad(d.getMinutes())+'.';
}
function driveLink(id){ return 'https://drive.google.com/uc?export=download&id='+encodeURIComponent(id); }
function conectar(cb){
  var u=driveUrl();
  if(!u){
    u=(window.prompt('Cole o link do App da Web (termina em /exec?token=…). Só precisa fazer uma vez neste navegador:','')||'').trim();
    if(!u){ if(cb) cb(''); return; }
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[^\/]+\/exec\?(.*&)?token=\w+/.test(u)){
      if(cb) cb(/\/home\/projects\/|\/edit/.test(u)? 'Esse é o link do editor do Apps Script. Use o link do App da Web (Implantar → Nova implantação), terminando em /exec?token=…' : 'Link inválido: use o link do App da Web terminando em /exec?token=…');
      return;
    }
    try{ localStorage.setItem(URL_LS,u); }catch(e){}
  }
  if(cb) cb('Buscando as NFs no Google Drive…');
  driveSync(true).then(function(j){ if(cb) cb(driveResumo(j)); }, function(e){
    var m=e&&e.message;
    try{ localStorage.removeItem(URL_LS); }catch(x){}
    if(cb) cb(m==='acesso'? 'O Drive recusou o código de acesso. Clique de novo e cole o link com o token certo.' : 'Não foi possível ler o índice do Google Drive. Confira se o App da Web está implantado com acesso “Qualquer pessoa” e clique de novo para colar o link.');
  });
}
/* Atualiza sozinho: ao abrir a página, a cada 10 minutos e quando a aba volta a ficar visível. */
var ultimaSync=0;
function autoSync(){ if(!driveUrl()||Date.now()-ultimaSync<60000) return; ultimaSync=Date.now(); driveSync(false).catch(function(){}); }
autoSync();
setInterval(function(){ ultimaSync=0; autoSync(); }, 600000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') autoSync(); });

/* ---------- HTML dos campos ---------- */
function inner(nfsTxt){
  var list=split(nfsTxt), seen={};
  if(!list.length) return esc(nfsTxt||'');
  return list.filter(function(n){ var k=key(n); if(seen[k]) return false; seen[k]=1; return true; }).map(function(n){
    var k=key(n), d=IDX[k]||{}, r=REMOTE[k]||{}, h='<span class="nfd">';
    /* venda por conta e ordem: o romaneio sai com a NF de remessa (número seguinte) */
    var rs=REMOTE[String(+k+1)], romId=r.rom||(rs&&rs.r&&rs.rom? rs.rom : ''), romViaRem=!r.rom&&!!romId;
    h+= NFDocs.onInfo? '<button type="button" class="nfn" data-nfinfo="'+esc(k)+'" title="Ver pedidos desta NF">'+esc(n)+'</button>' : '<span class="nfn">'+esc(n)+'</span>';
    if(r.nf) h+=' <a class="nfb" href="'+driveLink(r.nf)+'" target="_blank" rel="noopener" title="Baixar a NF '+esc(n)+' em PDF do Google Drive'+(r.r?' (NF de remessa)':'')+(r.c?' · '+esc(r.c):'')+'">PDF</a>';
    else if(d.nf) h+=' <button type="button" class="nfb" data-nfdoc="nf" data-nf="'+esc(k)+'" title="Baixar a NF '+esc(n)+' em PDF ('+esc(d.nf)+')">PDF</button>';
    if(romId) h+=' <a class="nfb rom" href="'+driveLink(romId)+'" target="_blank" rel="noopener" title="Baixar o romaneio da NF '+esc(n)+(romViaRem? ' (veio com a NF de remessa '+(+k+1)+')':'')+' do Google Drive">Romaneio</a>';
    else h+= d.rom? ' <button type="button" class="nfb rom" data-nfdoc="rom" data-nf="'+esc(k)+'" title="Baixar o romaneio da NF '+esc(n)+' ('+esc(d.rom)+'). Para trocar, clique com o botão direito ou segure.">Romaneio</button>'
             : ' <button type="button" class="nfb add" data-nfdoc="addrom" data-nf="'+esc(k)+'" title="Anexar o romaneio da NF '+esc(n)+' (PDF)">+ Romaneio</button>';
    return h+'</span>';
  }).join('');
}
function cell(nfsTxt){ return '<span class="nfcell" data-nfs="'+esc(nfsTxt||'')+'">'+inner(nfsTxt)+'</span>'; }
function refresh(){ [].forEach.call(document.querySelectorAll('.nfcell'),function(el){ el.innerHTML=inner(el.getAttribute('data-nfs')); }); try{ document.dispatchEvent(new CustomEvent('nfdocs-change')); }catch(e){} }
function cleanTable(t){ var c=t.cloneNode(true); [].forEach.call(c.querySelectorAll('.nfb'),function(b){ b.remove(); }); return c; }

/* ---------- baixar ---------- */
var DL=null;
if(window.claude&&typeof window.claude.use==='function'){ window.claude.use('downloads').then(function(d){ DL=d; }, function(){}); }
function save(blob, nome){
  if(DL) return DL.save({filename:nome, data:blob}).catch(function(){});
  var u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },4000);
}
function baixar(tipo, nf){ return get(tipo+':'+nf).then(function(r){ if(r) save(r.blob, r.nome||((tipo==='rom'?'romaneio-nf-':'nf-')+nf+'.pdf')); }); }

var romInput=document.createElement('input'); romInput.type='file'; romInput.accept='.pdf,application/pdf'; romInput.hidden=true;
var multiInput=document.createElement('input'); multiInput.type='file'; multiInput.accept='.pdf,.zip,application/pdf,application/zip'; multiInput.multiple=true; multiInput.hidden=true;
document.addEventListener('DOMContentLoaded',function(){ document.body.appendChild(romInput); document.body.appendChild(multiInput); });
if(document.body){ document.body.appendChild(romInput); document.body.appendChild(multiInput); }
romInput.addEventListener('change',function(){ var f=this.files&&this.files[0], nf=ROM_NF; this.value=''; if(f&&nf) importFiles([f], nf, 'rom'); });
var pickCb=null;
multiInput.addEventListener('change',function(){ var fs=[].slice.call(this.files||[]); this.value=''; if(!fs.length) return; if(pickCb) pickCb(null); importFiles(fs).then(function(r){ if(pickCb) pickCb(r); }, function(){ if(pickCb) pickCb({erro:1}); }); });

document.addEventListener('click',function(ev){
  var b=ev.target.closest&&ev.target.closest('[data-nfdoc],[data-nfinfo]'); if(!b) return;
  ev.preventDefault(); ev.stopPropagation();
  if(b.hasAttribute('data-nfinfo')){ if(NFDocs.onInfo) NFDocs.onInfo(b.getAttribute('data-nfinfo'), b); return; }
  var t=b.getAttribute('data-nfdoc'), nf=b.getAttribute('data-nf');
  if(t==='addrom'){ ROM_NF=nf; romInput.click(); return; }
  baixar(t, nf);
}, true);
document.addEventListener('contextmenu',function(ev){
  var b=ev.target.closest&&ev.target.closest('[data-nfdoc="rom"]'); if(!b) return;
  ev.preventDefault(); ROM_NF=b.getAttribute('data-nf'); romInput.click();
});

function resumo(r){
  if(!r) return 'Lendo os PDFs…';
  if(r.erro) return 'Não foi possível guardar os PDFs neste navegador.';
  var t=[]; if(r.nf) t.push(r.nf+(r.nf===1?' NF carregada':' NFs carregadas')); if(r.rom) t.push(r.rom+(r.rom===1?' romaneio':' romaneios'));
  if(r.sem.length) t.push(r.sem.length+(r.sem.length===1?' arquivo sem número de NF reconhecido':' arquivos sem número de NF reconhecido')+' ('+r.sem.slice(0,3).join(', ')+(r.sem.length>3?'…':'')+')');
  return (t.join(' · ')||'Nenhum PDF lido.')+(r.nf||r.rom? ' · '+count()+' NFs com PDF neste navegador.' : '');
}
function count(){ return Object.keys(IDX).filter(function(k){ return IDX[k].nf; }).length; }

window.NFDocs={cell:cell, refresh:refresh, cleanTable:cleanTable, key:key, split:split, ready:open, count:count, resumo:resumo,
  has:function(nf){ return IDX[key(nf)]||null; },
  importFiles:importFiles, _fromName:fromName, _fromText:fromText,
  pick:function(cb){ pickCb=cb||null; multiInput.click(); },
  conectar:conectar, driveUrl:driveUrl,
  esquecerDrive:function(){ try{ localStorage.removeItem(URL_LS); localStorage.removeItem(CACHE_LS); }catch(e){} REMOTE={}; REMOTE_INFO=null; refresh(); },
  remove:function(tipo,nf){ return del(tipo+':'+key(nf)).then(refresh); },
  onInfo:null};
open();
})();
