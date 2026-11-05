/* Painel geral do CRM: resumo da carteira de pedidos e do financeiro, com gráficos.
   Lê só o que o representante carregou nesta aba (carteira e títulos). Não guarda nada.
   Painel.render({rows, isCanc, isLate, grupo, amostra, tituloRows}) */
(function(){
'use strict';
var MES3=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function $(id){ return document.getElementById(id); }
function pad(n){ return (n<10?'0':'')+n; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function norm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function hoje(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function maisDias(iso, n){ var p=iso.split('-'), d=new Date(Date.UTC(+p[0],p[1]-1,+p[2]+n)); return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate()); }
function dias(a,b){ var x=a.split('-'), y=b.split('-'); return Math.round((Date.UTC(+y[0],y[1]-1,+y[2])-Date.UTC(+x[0],x[1]-1,+x[2]))/864e5); }
function brl(v){ return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function brlK(v){ var a=Math.abs(v); return a>=1e6? 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi' : a>=1e3? 'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:0})+' mil' : 'R$ '+Math.round(v).toLocaleString('pt-BR'); }
function int(v){ return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0}); }
function pct(v){ return (v*100).toLocaleString('pt-BR',{maximumFractionDigits:0})+'%'; }
function mesLbl(k){ return MES3[+k.slice(5,7)-1]+'/'+k.slice(2,4); }

/* ---------- peças de gráfico ---------- */
function barrasH(itens, fmt, cor){
  if(!itens.length) return '<p class="pg-vazio">Nada para mostrar.</p>';
  var max=Math.max.apply(null, itens.map(function(i){ return i.v; }))||1;
  return '<div class="pg-hbars">'+itens.map(function(i){
    return '<div class="pg-hbar"><span class="pg-hn" title="'+esc(i.n)+'">'+esc(i.n)+'</span><span class="pg-ht"><i style="width:'+Math.max(1.5,i.v/max*100).toFixed(1)+'%;'+(i.cor||cor? 'background:'+(i.cor||cor) : '')+'"></i></span><span class="pg-hv">'+fmt(i.v)+(i.s? '<small>'+esc(i.s)+'</small>' : '')+'</span></div>';
  }).join('')+'</div>';
}
/* colunas empilhadas: grupos [{k, a, b}] com duas séries */
function colunas(grupos, rotA, rotB, fmt, opts){
  opts=opts||{};
  if(!grupos.length) return '<p class="pg-vazio">Nada para mostrar.</p>';
  var max=Math.max.apply(null, grupos.map(function(g){ return g.a+g.b; }))||1;
  var h='<div class="pg-cols" role="img" aria-label="'+esc(opts.aria||'')+'">';
  grupos.forEach(function(g){
    var ha=g.a/max*100, hb=g.b/max*100;
    h+='<div class="pg-col'+(g.atual?' atual':'')+'" title="'+esc(mesLbl(g.k)+': '+rotA+' '+fmt(g.a)+' · '+rotB+' '+fmt(g.b))+'">'+
       '<span class="pg-cv">'+(g.a+g.b? brlK(g.a+g.b) : '')+'</span>'+
       '<span class="pg-cb"><i class="b" style="height:'+hb.toFixed(1)+'%"></i><i class="a" style="height:'+ha.toFixed(1)+'%"></i></span>'+
       '<span class="pg-cl">'+mesLbl(g.k)+'</span></div>';
  });
  return h+'</div><div class="pg-leg"><span><i class="a"></i>'+esc(rotA)+'</span><span><i class="b"></i>'+esc(rotB)+'</span></div>';
}
function tile(lbl, val, sub, tom, extra){
  return '<div class="tile pg-tile'+(tom?' '+tom:'')+'"'+(extra||'')+'><div class="lbl">'+lbl+'</div><div class="val">'+val+'</div>'+(sub? '<div class="sub">'+sub+'</div>' : '')+'</div>';
}
function bloco(titulo, corpo, nota){ return '<div class="pg-bloco"><h3>'+titulo+'</h3>'+corpo+(nota? '<p class="pg-nota">'+nota+'</p>' : '')+'</div>'; }

/* ---------- carteira de pedidos ---------- */
function carteira(o){
  var rows=o.rows, t=hoje(), aberto=0, fat=0, late={peds:{}, v:0}, porMes={}, tec={}, cli={}, faixas=[0,0,0,0], faixasV=[0,0,0,0];
  rows.forEach(function(r){
    if(o.isCanc(r)) return;
    var va=r.saldo*r.unit, vf=r.fat*r.unit; aberto+=va; fat+=vf;
    var mk=/^\d{4}-\d{2}/.test(r.embarque)? r.embarque.slice(0,7) : '';
    if(mk){ var m=porMes[mk]=porMes[mk]||{k:mk,a:0,b:0}; m.a+=vf; m.b+=va; }
    if(r.saldo>0){
      var tn=String(r.desc||'').trim().toUpperCase()||'Sem descrição'; tec[tn]=(tec[tn]||0)+r.saldo;
      if(!o.amostra(r.cliente)){ var cn=o.grupo(r.cliente); cli[cn]=(cli[cn]||0)+va; }
    }
    if(o.isLate(r,t)){
      late.peds[r.pedido]=1; late.v+=va;
      var d=dias(r.embarque,t), i=d<=15?0:d<=30?1:d<=60?2:3; faixas[i]++; faixasV[i]+=va;
    }
  });
  var cur=t.slice(0,7), meses=Object.keys(porMes).sort();
  var ini=meses.indexOf(cur); var sel=meses.filter(function(k){ return k>=maisMes(cur,-5)&&k<=maisMes(cur,3); });
  var grupos=sel.map(function(k){ var g=porMes[k]; g.atual=k===cur; return g; });
  var top=function(obj,n){ return Object.keys(obj).map(function(k){ return {n:k, v:obj[k]}; }).sort(function(a,b){ return b.v-a.v; }).slice(0,n); };
  var nLate=Object.keys(late.peds).length;
  return {aberto:aberto, fat:fat, nLate:nLate, vLate:late.v, html:
    '<div class="pg-grid">'+
      bloco('Carteira por mês de embarque', colunas(grupos, 'Faturado', 'Em aberto', brl, {aria:'Valor faturado e em aberto por mês de embarque'}), 'Valor dos itens (quantidade × preço), pelo mês de embarque. Cinco meses para trás e três para frente.')+
      bloco('Atraso dos pedidos em aberto', barrasH([
        {n:'1 a 15 dias', v:faixasV[0], s:int(faixas[0])+' itens', cor:'#D99A2B'},
        {n:'16 a 30 dias', v:faixasV[1], s:int(faixas[1])+' itens', cor:'#C26A1F'},
        {n:'31 a 60 dias', v:faixasV[2], s:int(faixas[2])+' itens', cor:'#B3262E'},
        {n:'Mais de 60 dias', v:faixasV[3], s:int(faixas[3])+' itens', cor:'#7E1A20'}].filter(function(x){ return x.v>0; }), brl),
        nLate? int(nLate)+(nLate===1?' pedido':' pedidos')+' com embarque vencido, '+brl(late.v)+' em aberto.' : 'Nenhum pedido com embarque vencido.')+
      bloco('Tecidos com mais metragem em aberto', barrasH(top(tec,8), function(v){ return int(v)+' m'; }))+
      bloco('Clientes com mais valor em aberto', barrasH(top(cli,8), brl), 'Grupos econômicos aparecem somados; amostras ficam fora.')+
    '</div>'};
}
function maisMes(k, n){ var y=+k.slice(0,4), m=+k.slice(5,7)-1+n; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+'-'+pad(m+1); }

/* ---------- financeiro ---------- */
function prepTit(rows){
  var t=hoje();
  return rows.map(function(x){
    var r=Object.assign({}, x), sit=norm(r.situacao);
    r.cancelado=/cancel|estorn/.test(sit);
    var pagoSit=/\b(pago|paga|liquidad|baixad|quitad|recebid)/.test(sit)&&!/aberto|a pagar|pendente|parcial/.test(sit);
    var pagoSaldo=r.saldo!=null&&r.saldo<=0.005&&(r.valorPago>0||!!r.pag);
    r.pago=!!r.pag||pagoSit||pagoSaldo;
    r.vencido=!r.pago&&(/vencid/.test(sit)||(!!r.venc&&r.venc<t));
    r.base=r.valorPago||r.valor;
    r.aberto=r.pago? 0 : (r.saldo!=null&&r.saldo>0? r.saldo : r.valor);
    return r;
  }).filter(function(r){ return !r.cancelado; });
}
function financeiro(rows){
  var ts=prepTit(rows), t=hoje(), cur=t.slice(0,7), em30=maisDias(t,30), pct=0;
  try{ pct=parseFloat(String(localStorage.getItem('sd_comissao_pct')||'').replace(',','.'))||0; }catch(e){}
  var rec={}, aVenc={}, vencido=0, nVenc=0, a30=0, recMes=0, comMes=0, pagos=0, emDia=0, cliV={};
  ts.forEach(function(r){
    if(r.pago&&r.pag){
      var mk=r.pag.slice(0,7); rec[mk]=(rec[mk]||0)+r.base;
      if(mk===cur){ recMes+=r.base; comMes+= r.comissao!=null&&r.comissao>0? r.comissao : (r.pctCom? r.base*r.pctCom/100 : r.base*pct/100); }
      if(r.venc){ pagos++; if(r.pag<=r.venc) emDia++; }
    } else if(r.vencido){ vencido+=r.aberto; nVenc++; var g=r.grupo||r.cliente; cliV[g]=(cliV[g]||0)+r.aberto; }
    else if(r.venc){ var vk=r.venc.slice(0,7); aVenc[vk]=(aVenc[vk]||0)+r.aberto; if(r.venc<=em30) a30+=r.aberto; }
  });
  var ks=[]; for(var i=-5;i<=3;i++) ks.push(maisMes(cur,i));
  var grupos=ks.map(function(k){ return {k:k, a:rec[k]||0, b:k>=cur? (aVenc[k]||0) : 0, atual:k===cur}; });
  var top=Object.keys(cliV).map(function(k){ return {n:k, v:cliV[k]}; }).sort(function(a,b){ return b.v-a.v; }).slice(0,8);
  return {vencido:vencido, nVenc:nVenc, a30:a30, recMes:recMes, comMes:comMes, emDia:pagos? emDia/pagos : null, html:
    '<div class="pg-grid">'+
      bloco('Recebido e a receber por mês', colunas(grupos, 'Recebido', 'A vencer', brl, {aria:'Títulos recebidos e a vencer por mês'}), 'Recebido pelo mês do pagamento; a vencer pelo mês do vencimento (do mês atual em diante).')+
      bloco('Clientes com títulos vencidos', barrasH(top, brl, '#B3262E'), nVenc? int(nVenc)+(nVenc===1?' título vencido':' títulos vencidos')+', '+brl(vencido)+' em aberto.' : 'Nenhum título vencido.')+
    '</div>'};
}

/* ---------- montagem ---------- */
var olho='<svg class="eyeoff" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="2" d="M3 3l18 18"/></svg>';
function render(o){
  var res=$('pgResumo'), cc=$('pgCarteira'), cf=$('pgFinanceiro'); if(!res) return;
  var tit=null; try{ tit=JSON.parse(sessionStorage.getItem('sd_titulos_sel')||'null'); }catch(e){}
  var C= o.rows&&o.rows.length? carteira(o) : null, F= tit&&tit.rows&&tit.rows.length? financeiro(tit.rows) : null;
  var tiles='';
  tiles+= C? tile('Carteira em aberto', brl(C.aberto), 'saldo a faturar') : tile('Carteira em aberto', '—', 'carregue a carteira');
  tiles+= C? tile('Pedidos atrasados', int(C.nLate), brl(C.vLate)+' em aberto', C.nLate?'alert':'good') : tile('Pedidos atrasados', '—', 'carregue a carteira');
  tiles+= F? tile('Títulos vencidos', brl(F.vencido), int(F.nVenc)+' títulos em aberto', F.nVenc?'alert':'good') : tile('Títulos vencidos', '—', 'carregue os títulos');
  tiles+= F? tile('A receber em 30 dias', brl(F.a30), 'títulos a vencer') : tile('A receber em 30 dias', '—', 'carregue os títulos');
  tiles+= F? tile('Recebido no mês', '<span class="pg-sens" data-v="'+esc(brl(F.recMes))+'">'+olho+'••••</span>', F.emDia!=null? pct(F.emDia)+' dos títulos pagos em dia' : '', 'good', ' role="button" tabindex="0" title="Clique para ver"') : tile('Recebido no mês', '—', 'carregue os títulos');
  tiles+= F? tile('Comissão do mês', '<span class="pg-sens" data-v="'+esc(brl(F.comMes))+'">'+olho+'••••</span>', 'pelos títulos pagos no mês', '', ' role="button" tabindex="0" title="Clique para ver"') : tile('Comissão do mês', '—', 'carregue os títulos');
  res.innerHTML='<div class="pg-tiles">'+tiles+'</div>';
  cc.innerHTML= C? C.html+'<p class="pg-link"><a href="./?carteira">Abrir a Carteira para pesquisar, filtrar e ver os pedidos</a></p>'
    : '<div class="pg-empty"><p>Carregue a carteira de pedidos (.xls) para ver os gráficos de carteira, atrasos, tecidos e clientes.</p><button type="button" class="btn" data-pg="carteira">Carregar carteira (.xls)</button></div>';
  cf.innerHTML= F? F.html+'<p class="pg-link"><a href="financeiro/">Abrir o Financeiro para ver os títulos e a comissão</a></p>'
    : '<div class="pg-empty"><p>Carregue a carteira de títulos (.xls) para ver recebimentos, vencidos e a receber.</p><button type="button" class="btn" data-pg="titulos">Carregar títulos (.xls)</button></div>';
  var fm=$('pgFonte'); if(fm){ fm.textContent=[C? 'Carteira: '+(o.arquivo||'carregada') : 'Carteira não carregada', F? 'Títulos: '+tit.meta.arquivo : 'Títulos não carregados'].join(' · '); }
}
document.addEventListener('click',function(ev){
  var s=ev.target.closest&&ev.target.closest('.pg-tile[role=button]');
  if(s){ var e=s.querySelector('.pg-sens'); if(e){ if(e.classList.toggle('on')) e.textContent=e.getAttribute('data-v'); else e.innerHTML=olho+'••••'; } }
});
document.addEventListener('keydown',function(ev){ if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList&&ev.target.classList.contains('pg-tile')&&ev.target.getAttribute('role')==='button'){ ev.preventDefault(); ev.target.click(); } });
window.Painel={render:render};
})();
