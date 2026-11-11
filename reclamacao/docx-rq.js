/* Reclamação de Qualidade -> Word (.docx) no padrão "SOLICITAÇÃO DE ATENDIMENTO".
   Abre o modelo (modelo-solicitacao.docx, cópia em branco do formulário da Capricórnio
   com marcadores {{campo}}) e troca cada marcador pelo valor digitado no CRM.
   O arquivo gerado é um Word normal: o técnico abre e edita como o formulário original. */
(function(root){
'use strict';

var TIPOS = {'Calça':'Calca','Jaqueta':'Jaqueta','Saia':'Saia','Bermuda':'Bermuda','Corte':'Corte','Tecido Plano':'TecidoPlano','Malha':'Malha','Fios':'Fios','Outros':'Outros'};
var LBL = {2:'Mts',4:'Estab.',6:'Qual.',8:'Pedido',10:'Preço',12:'Fat.'};
var LKEYS = ['nf','mts','estab','qual','pedido','preco','fat'];
var ROWS_COM_ROTULO = [3,6];          /* no formulário em branco, só estas linhas mostram Mts/Estab/... */
var EMU_CM = 360000;

function xesc(s){
  return String(s==null?'':s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
/* texto dentro de um <w:t>: quebras de linha viram <w:br/> */
function xtext(s){
  return xesc(String(s==null?'':s).replace(/\r\n?/g,'\n')).split('\n').join('</w:t><w:br/><w:t xml:space="preserve">');
}
function fmtDate(iso){ var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m? m[3]+'/'+m[2]+'/'+m[1] : String(iso||''); }
function X(v){ return v? '( X )' : '(  )'; }

function valores(d){
  var v = {
    xRecl: X(d.tipo!=='Orientação'), xOrie: X(d.tipo==='Orientação'),
    dtAbertura: fmtDate(d.dtAbertura), dtFechTec: fmtDate(d.dtFechTec), dtEncerr: fmtDate(d.dtEncerr),
    tecnico: d.tecnico, representante: d.representante, chamado: d.chamado,
    razao: d.razao, cnpj: d.cnpj, codCli: d.codCli, endereco: d.endereco, bairro: d.bairro, cidade: d.cidade, uf: d.uf,
    telefone: d.telefone, fax: d.fax, contato: d.contato, celular: d.celular, email: d.email,
    artigo: d.artigo, cor: d.cor, codigo: d.codigo,
    motivo: d.motivo,
    amQtd: d.amQtd, amMarca: d.amMarca,
    amOutros: ((d.tipos||[]).indexOf('Outros')>=0 && d.amOutros)? ': '+d.amOutros : '',
    mtUsados: d.mtUsados, mtNaoUsados: d.mtNaoUsados, pcsProd: d.pcsProd, pcsProb: d.pcsProb,
    dtEnvio: fmtDate(d.dtEnvio), dtResposta: fmtDate(d.dtResposta),
    p_IMP: X(d.parecer==='IMPROCEDENTE'), p_IND: X(d.parecer==='PROCEDENTE (INDUSTRIAL)'), p_COM: X(d.parecer==='PROCEDENTE (COMERCIAL)')
  };
  Object.keys(TIPOS).forEach(function(t){ v['t_'+TIPOS[t]] = X((d.tipos||[]).indexOf(t)>=0); });
  var ls = (d.linhas||[]).filter(function(l){ return LKEYS.some(function(k){ return l&&l[k]; }); }).slice(0,6);
  /* até 2 NFs: linhas 3 e 6 (as que já têm os rótulos no formulário); mais que isso: 1 a 6 em ordem */
  var ordem = ls.length<=2? [3,6] : [1,2,3,4,5,6], porLinha = {};
  ls.forEach(function(l,j){ porLinha[ordem[j]] = l; });
  for(var i=1;i<=6;i++){
    var l = porLinha[i]||{}, cheia = LKEYS.some(function(k){ return l[k]; });
    LKEYS.forEach(function(k){ v['l'+i+'_'+k] = l[k]||''; });
    Object.keys(LBL).forEach(function(c){ v['l'+i+'_lb'+c] = (cheia||ROWS_COM_ROTULO.indexOf(i)>=0)? LBL[c] : ''; });
  }
  return v;
}

/* devolve [início, fim) do <w:p> que contém o marcador */
function paraDe(xml, marca){
  var i = xml.indexOf(marca); if(i<0) return null;
  var a = Math.max(xml.lastIndexOf('<w:p>',i), xml.lastIndexOf('<w:p ',i));
  var b = xml.indexOf('</w:p>',i)+6;
  return [a,b];
}

function fotoXml(rid, n, p){
  var maxW=16*EMU_CM, maxH=11*EMU_CM, w=p.w||1600, h=p.h||1200;
  var sc=Math.min(maxW/w, maxH/h), cx=Math.round(w*sc), cy=Math.round(h*sc);
  return '<w:p><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'+
    '<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'+
    '<wp:docPr id="'+(1000+n)+'" name="Foto '+n+'"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'+
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+(1000+n)+'" name="foto'+n+'.jpeg"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr>'+
    '<pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'+
    '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}
function b64ToBytes(b64){
  if(typeof atob==='function'){ var bin=atob(b64), u=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
  return Buffer.from(b64,'base64');
}

/* zip: JSZip já carregado com o modelo. Devolve o mesmo zip preenchido. */
function preencher(zip, d){
  return zip.file('word/document.xml').async('string').then(function(xml){
    var v = valores(d);
    xml = xml.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, function(m,k){
      if(k==='DETALHES'||k==='FOTOS') return m;
      return Object.prototype.hasOwnProperty.call(v,k)? xtext(v[k]) : '';
    });

    /* texto livre abaixo do parecer (cada linha um parágrafo, como no formulário) */
    var r = paraDe(xml,'{{DETALHES}}');
    if(r){
      var proto = xml.slice(r[0],r[1]), txt = String(d.detalhes||'').replace(/\r\n?/g,'\n').trim(), out='';
      if(txt){
        out = txt.split('\n').map(function(linha){ return proto.replace('{{DETALHES}}', xesc(linha)); }).join('');
      }
      xml = xml.slice(0,r[0]) + out + xml.slice(r[1]);
    }

    /* fotos com legenda */
    var fotos = (d.fotos||[]).filter(function(p){ return p && /^data:image\//.test(p.data||''); });
    var r2 = paraDe(xml,'{{FOTOS}}'), rels = [];
    if(r2){
      var proto2 = xml.slice(r2[0],r2[1]), out2='';
      fotos.forEach(function(p,i){
        var n=i+1, rid='rIdFotoRQ'+n, nome='media/fotoRQ'+n+'.jpeg';
        zip.file('word/'+nome, b64ToBytes(p.data.split(',')[1]));
        rels.push('<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="'+nome+'"/>');
        out2 += fotoXml(rid,n,p) + proto2.replace('{{FOTOS}}', xesc('Foto '+n+(p.legenda? ' – '+p.legenda : '')));
      });
      xml = xml.slice(0,r2[0]) + out2 + xml.slice(r2[1]);
    }
    zip.file('word/document.xml', xml);
    if(!rels.length) return zip;
    return zip.file('word/_rels/document.xml.rels').async('string').then(function(rx){
      zip.file('word/_rels/document.xml.rels', rx.replace('</Relationships>', rels.join('')+'</Relationships>'));
      return zip;
    });
  });
}

root.RQDocx = {preencher: preencher, valores: valores};
if(typeof module!=='undefined' && module.exports) module.exports = root.RQDocx;
})(typeof window!=='undefined'? window : globalThis);
