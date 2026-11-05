/* Painel geral do CRM: resumo da carteira de pedidos e do financeiro.
   Cada gráfico tem um formato próprio (colunas, rosca, medidor, mapa de áreas, ranking, área e pirulito),
   desenhado em SVG/HTML puro, sem bibliotecas. Os gráficos se desenham com animação quando entram na tela.
   Lê só o que foi carregado nesta aba (carteira e títulos); não guarda nada.
   Painel.render({rows, arquivo, isCanc, isLate, grupo, amostra}) */
(function(){
'use strict';
var MES3=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var COR={indigo:'#3F6399', indigoE:'#26406B', indigoC:'#8EA6CC', linha:'#D99A2B', laranja:'#C26A1F', vermelho:'#B3262E', vinho:'#7E1A20', verde:'#1F6B47'};
var PALETA=['#26406B','#3F6399','#5E82B8','#8EA6CC','#D99A2B','#C26A1F','#9A7B4F','#B7C3D7','#6B7FA3','#E2C08A'];
var REDUZ=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(id){ return document.getElementById(id); }
function pad(n){ return (n<10?'0':'')+n; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function norm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function hoje(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function maisDias(iso, n){ var p=iso.split('-'), d=new Date(Date.UTC(+p[0],p[1]-1,+p[2]+n)); return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate()); }
function maisMes(k, n){ var y=+k.slice(0,4), m=+k.slice(5,7)-1+n; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+'-'+pad(m+1); }
function dias(a,b){ var x=a.split('-'), y=b.split('-'); return Math.round((Date.UTC(+y[0],y[1]-1,+y[2])-Date.UTC(+x[0],x[1]-1,+x[2]))/864e5); }
function brl(v){ return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function brlK(v){ var a=Math.abs(v); return a>=1e6? 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi' : a>=1e3? 'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:0})+' mil' : 'R$ '+Math.round(v).toLocaleString('pt-BR'); }
function int(v){ return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0}); }
function pct(v){ return (v*100).toLocaleString('pt-BR',{maximumFractionDigits:0})+'%'; }
var F={mes:'todos', base:'embarque'};
try{ var f0=JSON.parse(sessionStorage.getItem('sd_painel_filtro')||'null'); if(f0) F=f0; }catch(e){}
var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function mesLongo(k){ return MESES[+k.slice(5,7)-1]+' de '+k.slice(0,4); }
function fimMes(k){ var y=+k.slice(0,4), m=+k.slice(5,7); return k+'-'+pad(new Date(Date.UTC(y,m,0)).getUTCDate()); }
function mesLbl(k){ return MES3[+k.slice(5,7)-1]+'/'+k.slice(2,4); }
function topN(obj,n){ return Object.keys(obj).map(function(k){ return {n:k, v:obj[k]}; }).filter(function(x){ return x.v>0; }).sort(function(a,b){ return b.v-a.v; }).slice(0,n); }
function vazio(){ return '<p class="pg-vazio">Nada para mostrar.</p>'; }

/* ---------- 1. colunas empilhadas ---------- */
function colunas(grupos, rotA, rotB){
  if(!grupos.length) return vazio();
  var max=Math.max.apply(null, grupos.map(function(g){ return g.a+g.b; }))||1;
  var h='<div class="pg-cols" role="img" aria-label="'+esc(rotA+' e '+rotB+' por mês')+'">';
  grupos.forEach(function(g,i){
    h+='<div class="pg-col'+(g.atual?' atual':'')+'" title="'+esc(mesLbl(g.k)+' · '+rotA+': '+brl(g.a)+' · '+rotB+': '+brl(g.b))+'">'+
       '<span class="pg-cv">'+(g.a+g.b? brlK(g.a+g.b) : '')+'</span>'+
       '<span class="pg-cb" style="--d:'+(i*70)+'ms"><i class="b" style="height:'+(g.b/max*100).toFixed(1)+'%"></i><i class="a" style="height:'+(g.a/max*100).toFixed(1)+'%"></i></span>'+
       '<span class="pg-cl">'+mesLbl(g.k)+'</span></div>';
  });
  return h+'</div><div class="pg-leg"><span><i style="background:'+COR.indigo+'"></i>'+esc(rotA)+'</span><span><i style="background:'+COR.linha+'"></i>'+esc(rotB)+'</span></div>';
}
/* ---------- 2. rosca ---------- */
function rosca(fatias, centro, sub){
  var tot=fatias.reduce(function(s,f){ return s+f.v; },0);
  if(!tot) return vazio();
  var R=54, C=2*Math.PI*R, acc=0, arcos='';
  fatias.forEach(function(f,i){
    var len=f.v/tot*C;
    arcos+='<circle class="pg-arc" cx="70" cy="70" r="'+R+'" fill="none" stroke="'+f.cor+'" stroke-width="20" stroke-dasharray="'+len.toFixed(2)+' '+(C-len).toFixed(2)+'" stroke-dashoffset="'+(-acc).toFixed(2)+'" style="--d:'+(i*160)+'ms"><title>'+esc(f.n+': '+brl(f.v))+'</title></circle>';
    acc+=len;
  });
  return '<div class="pg-rosca"><svg viewBox="0 0 140 140" role="img" aria-label="'+esc(centro+' '+sub)+'"><g transform="rotate(-90 70 70)">'+arcos+'</g>'+
    '<text x="70" y="66" text-anchor="middle" class="pg-rc1">'+esc(centro)+'</text><text x="70" y="84" text-anchor="middle" class="pg-rc2">'+esc(sub)+'</text></svg>'+
    '<ul class="pg-rleg">'+fatias.map(function(f){ return '<li><i style="background:'+f.cor+'"></i><span>'+esc(f.n)+'</span><b>'+brl(f.v)+'</b><small>'+(f.s||'')+' · '+pct(f.v/tot)+'</small></li>'; }).join('')+'</ul></div>';
}
/* ---------- 3. medidor (meia-lua) ---------- */
function medidor(frac, rot, det, cor){
  if(frac==null||!isFinite(frac)) return vazio();
  frac=Math.max(0,Math.min(1,frac));
  var R=80, L=Math.PI*R;
  return '<div class="pg-medidor"><svg viewBox="0 0 200 118" role="img" aria-label="'+esc(rot+': '+pct(frac))+'">'+
    '<path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--weft-2)" stroke-width="18" stroke-linecap="round"/>'+
    '<path class="pg-gauge" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="'+(cor||COR.indigo)+'" stroke-width="18" stroke-linecap="round" stroke-dasharray="'+L.toFixed(1)+'" style="--len:'+L.toFixed(1)+';--off:'+(L*(1-frac)).toFixed(1)+'"/>'+
    '<text x="100" y="92" text-anchor="middle" class="pg-gv" data-conta="'+(frac*100).toFixed(1)+'" data-fmt="pct">'+pct(frac)+'</text></svg>'+
    '<p class="pg-gr">'+esc(rot)+'</p><p class="pg-gd">'+det+'</p></div>';
}
/* ---------- 4. mapa de áreas (treemap) ---------- */
function mapaAreas(itens, unid){
  if(!itens.length) return vazio();
  var tot=itens.reduce(function(s,i){ return s+i.v; },0), rects=[];
  (function corta(lista, x, y, w, h){
    if(!lista.length) return;
    if(lista.length===1){ rects.push({i:lista[0], x:x, y:y, w:w, h:h}); return; }
    var soma=lista.reduce(function(s,i){ return s+i.v; },0), acc=0, k=0;
    while(k<lista.length-1&&acc+lista[k].v<soma/2){ acc+=lista[k].v; k++; }
    if(k===0){ acc=lista[0].v; k=1; }
    var a=lista.slice(0,k), b=lista.slice(k), f=acc/soma;
    if(w>=h){ corta(a, x, y, w*f, h); corta(b, x+w*f, y, w*(1-f), h); }
    else { corta(a, x, y, w, h*f); corta(b, x, y+h*f, w, h*(1-f)); }
  })(itens, 0, 0, 100, 100);
  return '<div class="pg-mapa" role="img" aria-label="Metragem em aberto por tecido">'+rects.map(function(r,i){
    var grande=r.w*r.h>260;
    return '<div class="pg-mq" style="left:'+r.x.toFixed(2)+'%;top:'+r.y.toFixed(2)+'%;width:'+r.w.toFixed(2)+'%;height:'+r.h.toFixed(2)+'%;--c:'+PALETA[i%PALETA.length]+';--d:'+(i*60)+'ms" title="'+esc(r.i.n+': '+int(r.i.v)+' '+unid+' ('+pct(r.i.v/tot)+')')+'">'+
      '<span>'+(grande? '<b>'+esc(r.i.n)+'</b>'+int(r.i.v)+' '+unid+' · '+pct(r.i.v/tot) : esc(r.i.n))+'</span></div>';
  }).join('')+'</div>';
}
/* ---------- 5. ranking (barras horizontais numeradas) ---------- */
function ranking(itens, fmt, cor){
  if(!itens.length) return vazio();
  var max=itens[0].v||1;
  return '<ol class="pg-rank">'+itens.map(function(i,n){
    return '<li title="'+esc(i.n+': '+fmt(i.v))+'"><span class="pg-rn">'+(n+1)+'</span><span class="pg-rt"><b>'+esc(i.n)+'</b><span class="pg-rb"><i style="width:'+Math.max(2,i.v/max*100).toFixed(1)+'%;background:'+(cor||COR.indigo)+';--d:'+(n*60)+'ms"></i></span></span><span class="pg-rv">'+fmt(i.v)+'</span></li>';
  }).join('')+'</ol>';
}
/* ---------- 6. área com linha (recebido) + linha tracejada (a vencer) ---------- */
function area(pontos){
  if(!pontos.length) return vazio();
  var W=520, H=200, L=46, B=26, T=16, max=Math.max.apply(null, pontos.map(function(p){ return Math.max(p.a,p.b); }))||1;
  var passo=(W-L-12)/Math.max(1,pontos.length-1);
  function X(i){ return L+i*passo; } function Y(v){ return T+(H-T-B)*(1-v/max); }
  var linA='', linB='', ptsA='', ptsB='', grid='', labs='';
  for(var g=0;g<=3;g++){ var v=max*g/3, y=Y(v); grid+='<line x1="'+L+'" x2="'+(W-6)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="pg-ag"/><text x="'+(L-6)+'" y="'+(y+3.5).toFixed(1)+'" text-anchor="end" class="pg-at">'+esc(brlK(v).replace('R$ ',''))+'</text>'; }
  var ia=[], ib=[];
  pontos.forEach(function(p,i){
    labs+='<text x="'+X(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" class="pg-at'+(p.atual?' atual':'')+'">'+mesLbl(p.k)+'</text>';
    if(p.temA) ia.push(i); if(p.temB) ib.push(i);
  });
  ia.forEach(function(i,n){ linA+=(n?'L':'M')+X(i).toFixed(1)+' '+Y(pontos[i].a).toFixed(1); ptsA+='<circle class="pg-pt" cx="'+X(i).toFixed(1)+'" cy="'+Y(pontos[i].a).toFixed(1)+'" r="4" fill="'+COR.indigo+'" style="--d:'+(600+n*80)+'ms"><title>'+esc(mesLbl(pontos[i].k)+' · recebido: '+brl(pontos[i].a))+'</title></circle>'; });
  ib.forEach(function(i,n){ linB+=(n?'L':'M')+X(i).toFixed(1)+' '+Y(pontos[i].b).toFixed(1); ptsB+='<circle class="pg-pt" cx="'+X(i).toFixed(1)+'" cy="'+Y(pontos[i].b).toFixed(1)+'" r="4" fill="#fff" stroke="'+COR.linha+'" stroke-width="2.5" style="--d:'+(900+n*80)+'ms"><title>'+esc(mesLbl(pontos[i].k)+' · a vencer: '+brl(pontos[i].b))+'</title></circle>'; });
  var areaA= ia.length>1? linA+'L'+X(ia[ia.length-1]).toFixed(1)+' '+Y(0).toFixed(1)+'L'+X(ia[0]).toFixed(1)+' '+Y(0).toFixed(1)+'Z' : '';
  return '<svg class="pg-area" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Recebido e a vencer por mês">'+
    '<defs><linearGradient id="pgGradA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+COR.indigo+'" stop-opacity=".35"/><stop offset="1" stop-color="'+COR.indigo+'" stop-opacity="0"/></linearGradient></defs>'+
    grid+labs+(areaA? '<path class="pg-af" d="'+areaA+'" fill="url(#pgGradA)"/>' : '')+
    (linA? '<path class="pg-al" pathLength="1" d="'+linA+'" fill="none" stroke="'+COR.indigo+'" stroke-width="3" stroke-linejoin="round"/>' : '')+
    (linB? '<path class="pg-al b" pathLength="1" d="'+linB+'" fill="none" stroke="'+COR.linha+'" stroke-width="3" stroke-dasharray=".02 .015" stroke-linejoin="round"/>' : '')+
    ptsA+ptsB+'</svg><div class="pg-leg"><span><i style="background:'+COR.indigo+'"></i>Recebido (mês do pagamento)</span><span><i style="background:'+COR.linha+'"></i>A vencer (mês do vencimento)</span></div>';
}
/* ---------- 7. pirulito (lollipop) ---------- */
function pirulito(itens, fmt, cor){
  if(!itens.length) return vazio();
  var max=itens[0].v||1;
  return '<div class="pg-pir">'+itens.map(function(i,n){
    var p=Math.max(3,i.v/max*100);
    return '<div class="pg-pl" title="'+esc(i.n+': '+fmt(i.v))+'"><span class="pg-pn">'+esc(i.n)+'</span><span class="pg-ps"><i class="haste" style="width:'+p.toFixed(1)+'%;--d:'+(n*70)+'ms;background:'+cor+'"></i><i class="bola" style="left:'+p.toFixed(1)+'%;--d:'+(n*70+380)+'ms;border-color:'+cor+'"></i></span><span class="pg-pv">'+fmt(i.v)+(i.s? '<small>'+esc(i.s)+'</small>' : '')+'</span></div>';
  }).join('')+'</div>';
}

function bloco(titulo, corpo, nota, cls){ return '<div class="pg-bloco '+(cls||'')+'"><h3>'+titulo+'</h3>'+corpo+(nota? '<p class="pg-nota">'+nota+'</p>' : '')+'</div>'; }

/* ---------- carteira de pedidos ---------- */
function mesDe(r){ var d=F.base==='emissao'? r.emissao : r.embarque; return /^\d{4}-\d{2}/.test(d)? d.slice(0,7) : ''; }
function carteira(o){
  var t=hoje(), aberto=0, fat=0, total=0, lateP={}, lateV=0, porMes={}, tec={}, cli={}, fx=[0,0,0,0], fxV=[0,0,0,0];
  o.rows.forEach(function(r){
    if(o.isCanc(r)) return;
    var va=r.saldo*r.unit, vf=r.fat*r.unit, mk=mesDe(r);
    if(mk){ var m=porMes[mk]=porMes[mk]||{k:mk,a:0,b:0}; m.a+=vf; m.b+=va; }
    if(F.mes!=='todos'&&mk!==F.mes) return;
    aberto+=va; fat+=vf; total+=r.qtd*r.unit;
    if(r.saldo>0){
      var tn=String(r.desc||'').trim().toUpperCase().replace(/\s+\d{2,3}\s*CM\b.*$/,'')||'Sem descrição'; tec[tn]=(tec[tn]||0)+r.saldo;
      if(!o.amostra(r.cliente)){ var cn=o.grupo(r.cliente); cli[cn]=(cli[cn]||0)+va; }
    }
    if(o.isLate(r,t)){ lateP[r.pedido]=1; lateV+=va; var d=dias(r.embarque,t), i=d<=15?0:d<=30?1:d<=60?2:3; fx[i]++; fxV[i]+=va; }
  });
  var cur=F.mes!=='todos'? F.mes : t.slice(0,7), grupos=Object.keys(porMes).sort().filter(function(k){ return k>=maisMes(cur,-5)&&k<=maisMes(cur,3); }).map(function(k){ var g=porMes[k]; g.atual=k===cur; return g; });
  var nLate=Object.keys(lateP).length, frac= total? fat/total : null;
  var fatias=[{n:'1 a 15 dias',v:fxV[0],s:int(fx[0])+' itens',cor:COR.linha},{n:'16 a 30 dias',v:fxV[1],s:int(fx[1])+' itens',cor:COR.laranja},{n:'31 a 60 dias',v:fxV[2],s:int(fx[2])+' itens',cor:COR.vermelho},{n:'Mais de 60 dias',v:fxV[3],s:int(fx[3])+' itens',cor:COR.vinho}].filter(function(f){ return f.v>0; });
  return {aberto:aberto, nLate:nLate, vLate:lateV, html:
    '<div class="pg-grid3">'+
      bloco('Carteira por mês de '+(F.base==='emissao'?'emissão':'embarque'), colunas(grupos,'Faturado','Em aberto'), 'Valor dos itens (quantidade × preço) pelo mês de '+(F.base==='emissao'?'emissão':'embarque')+', de cinco meses antes a três meses depois de '+(F.mes!=='todos'? mesLongo(F.mes) : 'hoje')+' (destacado).', 'span2')+
      bloco('Carteira já faturada', medidor(frac, 'do valor da carteira já foi faturado', brl(fat)+' faturados de '+brl(total), COR.verde))+
      bloco('Atraso dos pedidos em aberto', rosca(fatias, nLate? int(nLate) : '0', nLate===1?'pedido atrasado':'pedidos atrasados'), nLate? brl(lateV)+' em aberto com embarque vencido.' : 'Nenhum pedido com embarque vencido.')+
      bloco('Tecidos com mais metragem em aberto', mapaAreas(topN(tec,10),'m'), 'Cada área é proporcional à metragem em aberto do tecido.')+
      bloco('Clientes com mais valor em aberto', ranking(topN(cli,7), brlK), 'Grupos econômicos somados; amostras ficam fora.')+
    '</div>'};
}

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
  var ts=prepTit(rows), t=hoje(), todos=F.mes==='todos', cur=todos? t.slice(0,7) : F.mes, fim=fimMes(cur), em30=maisDias(t,30), pctC=0;
  try{ pctC=parseFloat(String(localStorage.getItem('sd_comissao_pct')||'').replace(',','.'))||0; }catch(e){}
  var rec={}, aVenc={}, vencido=0, nVenc=0, a30=0, recMes=0, comMes=0, pagos=0, emDia=0, cliV={}, cliN={};
  ts.forEach(function(r){
    if(r.pago&&r.pag){
      var mk=r.pag.slice(0,7); rec[mk]=(rec[mk]||0)+r.base;
      if(mk===cur){ recMes+=r.base; comMes+= r.comissao!=null&&r.comissao>0? r.comissao : (r.pctCom? r.base*r.pctCom/100 : r.base*pctC/100); }
      if(r.venc&&(todos||mk===cur)){ pagos++; if(r.pag<=r.venc) emDia++; }
    } else if(r.vencido){ if(todos||(r.venc&&r.venc<=fim)){ vencido+=r.aberto; nVenc++; var g=r.grupo||r.cliente; cliV[g]=(cliV[g]||0)+r.aberto; cliN[g]=(cliN[g]||0)+1; } }
    else if(r.venc){ var vk=r.venc.slice(0,7); aVenc[vk]=(aVenc[vk]||0)+r.aberto; if(todos? r.venc<=em30 : vk===cur) a30+=r.aberto; }
  });
  var hojeM=t.slice(0,7), pontos=[];
  for(var i=-5;i<=3;i++){ var k=maisMes(cur,i); pontos.push({k:k, a:rec[k]||0, b:aVenc[k]||0, temA:k<=hojeM, temB:k>=hojeM, atual:k===cur}); }
  var top=topN(cliV,8).map(function(x){ x.s=int(cliN[x.n])+(cliN[x.n]===1?' título':' títulos'); return x; });
  var frac= pagos? emDia/pagos : null;
  return {cur:cur, todos:todos, vencido:vencido, nVenc:nVenc, a30:a30, recMes:recMes, comMes:comMes, html:
    '<div class="pg-grid3">'+
      bloco('Recebido e a receber por mês', area(pontos), 'Recebido pelo mês do pagamento; a vencer pelo mês do vencimento, do mês atual em diante.', 'span2')+
      bloco('Pagamentos em dia', medidor(frac, todos? 'dos títulos pagos foram pagos até o vencimento' : 'dos títulos pagos em '+mesLongo(cur)+' foram pagos até o vencimento', frac==null? '' : int(emDia)+' de '+int(pagos)+' títulos', frac==null? COR.indigo : frac>=.8? COR.verde : frac>=.5? COR.linha : COR.vermelho))+
      bloco('Clientes com títulos vencidos', pirulito(top, brl, COR.vermelho), (nVenc? int(nVenc)+(nVenc===1?' título vencido':' títulos vencidos')+', '+brl(vencido)+' em aberto' : 'Nenhum título vencido')+(todos? '.' : ', com vencimento até o fim de '+mesLongo(cur)+'.'), 'span3')+
    '</div>'};
}

/* ---------- montagem e animação ---------- */
var olho='<svg class="eyeoff" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="2" d="M3 3l18 18"/></svg>';
function tile(lbl, val, sub, tom, conta, extra){
  return '<div class="tile pg-tile'+(tom?' '+tom:'')+'"'+(extra||'')+'><div class="lbl">'+lbl+'</div><div class="val"'+(conta!=null? ' data-conta="'+conta+'" data-fmt="'+(typeof conta==='number'&&String(val).indexOf('R$')===0? 'brl':'int')+'"' : '')+'>'+val+'</div>'+(sub? '<div class="sub">'+sub+'</div>' : '')+'</div>';
}
function contar(el){
  var alvo=parseFloat(el.getAttribute('data-conta')), fmt=el.getAttribute('data-fmt'); if(!isFinite(alvo)) return;
  var f= fmt==='brl'? brl : fmt==='pct'? function(v){ return pct(v/100); } : int;
  if(REDUZ){ el.textContent=f(alvo); return; }
  var t0=null, dur=900;
  function passo(ts){ if(!t0) t0=ts; var p=Math.min(1,(ts-t0)/dur), e=1-Math.pow(1-p,3); el.textContent=f(alvo*e); if(p<1) requestAnimationFrame(passo); }
  requestAnimationFrame(passo);
}
var obs= 'IntersectionObserver' in window? new IntersectionObserver(function(es){
  es.forEach(function(e){ if(!e.isIntersecting) return; var el=e.target; obs.unobserve(el); el.classList.add('pg-vis'); [].forEach.call(el.querySelectorAll('[data-conta]'),contar); });
},{threshold:.18}) : null;
function animar(root){
  [].forEach.call(root.querySelectorAll('.pg-bloco, .pg-tiles'),function(el){ if(obs&&!REDUZ) obs.observe(el); else el.classList.add('pg-vis'); });
}
var ULT=null;
function dataHora(iso){ var d=new Date(iso); return isNaN(d)? '—' : pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(); }
function filtro(o, tit){
  var el=$('pgFiltro'); if(!el) return;
  var ms={};
  (o.rows||[]).forEach(function(r){ var k=mesDe(r); if(k) ms[k]=1; });
  ((tit&&tit.rows)||[]).forEach(function(r){ if(r.venc) ms[r.venc.slice(0,7)]=1; if(r.pag) ms[r.pag.slice(0,7)]=1; });
  if(F.mes!=='todos'&&!ms[F.mes]) ms[F.mes]=1;
  var ks=Object.keys(ms).sort().reverse();
  if(!ks.length){ el.hidden=true; return; } el.hidden=false;
  el.innerHTML='<label for="pgMes">Mês<select id="pgMes"><option value="todos">Todos os meses</option>'+ks.map(function(k){ return '<option value="'+k+'"'+(k===F.mes?' selected':'')+'>'+esc(mesLongo(k))+'</option>'; }).join('')+'</select></label>'+
    '<label for="pgBase">Data considerada na carteira<select id="pgBase"><option value="embarque"'+(F.base==='embarque'?' selected':'')+'>Embarque (entrega)</option><option value="emissao"'+(F.base==='emissao'?' selected':'')+'>Emissão do pedido</option></select></label>'+
    '<p class="pg-fnota">'+(F.mes==='todos'? 'Mostrando <b>toda a carteira</b>. No financeiro: recebido e comissão do mês atual, vencidos de todos os meses e a receber nos próximos 30 dias.'
      : 'Carteira: pedidos com '+(F.base==='emissao'?'emissão':'embarque')+' em <b>'+esc(mesLongo(F.mes))+'</b>. Financeiro: recebido e comissão do mês, vencidos até o fim do mês e a vencer no mês.')+'</p>';
}
document.addEventListener('change',function(ev){
  var id=ev.target&&ev.target.id; if(id!=='pgMes'&&id!=='pgBase') return;
  if(id==='pgMes') F.mes=ev.target.value; else F.base=ev.target.value;
  try{ sessionStorage.setItem('sd_painel_filtro', JSON.stringify(F)); }catch(e){}
  if(ULT) render(ULT);
});
function render(o){
  var res=$('pgResumo'), cc=$('pgCarteira'), cf=$('pgFinanceiro'); if(!res) return;
  var tit=null; try{ tit=JSON.parse(sessionStorage.getItem('sd_titulos_sel')||'null'); }catch(e){}
  ULT=o; filtro(o, tit);
  var C= o.rows&&o.rows.length? carteira(o) : null, FI= tit&&tit.rows&&tit.rows.length? financeiro(tit.rows) : null;
  var sens=' role="button" tabindex="0" title="Clique para ver"', t='';
  t+= C? tile('Carteira em aberto', brl(C.aberto), 'saldo a faturar'+(F.mes!=='todos'?' · '+mesLbl(F.mes):''), '', C.aberto) : tile('Carteira em aberto','—','carregue a carteira');
  t+= C? tile('Pedidos atrasados', int(C.nLate), brl(C.vLate)+' em aberto'+(F.mes!=='todos'?' · '+mesLbl(F.mes):''), C.nLate?'alert':'good', C.nLate) : tile('Pedidos atrasados','—','carregue a carteira');
  var Fi=FI;
  t+= Fi? tile('Títulos vencidos', brl(Fi.vencido), int(Fi.nVenc)+' títulos em aberto'+(Fi.todos?'':' até '+mesLbl(Fi.cur)), Fi.nVenc?'alert':'good', Fi.vencido) : tile('Títulos vencidos','—','carregue os títulos');
  t+= Fi? tile(Fi.todos? 'A receber em 30 dias' : 'A vencer em '+mesLbl(Fi.cur), brl(Fi.a30), 'títulos a vencer', '', Fi.a30) : tile('A receber em 30 dias','—','carregue os títulos');
  t+= Fi? tile('Recebido em '+mesLbl(Fi.cur), '<span class="pg-sens" data-v="'+esc(brl(Fi.recMes))+'">'+olho+'••••</span>', 'clique para ver', 'good', null, sens) : tile('Recebido no mês','—','carregue os títulos');
  t+= Fi? tile('Comissão de '+mesLbl(Fi.cur), '<span class="pg-sens" data-v="'+esc(brl(Fi.comMes))+'">'+olho+'••••</span>', 'clique para ver', '', null, sens) : tile('Comissão do mês','—','carregue os títulos');
  res.innerHTML='<div class="pg-tiles">'+t+'</div>';
  cc.innerHTML= C? C.html+'<p class="pg-link"><a href="./?carteira">Abrir a Carteira para pesquisar, filtrar e ver os pedidos</a></p>'
    : '<div class="pg-empty"><p>Carregue a carteira de pedidos (.xls) para ver faturamento por mês, atrasos, tecidos e clientes.</p><button type="button" class="btn" data-pg="carteira">Carregar carteira (.xls)</button></div>';
  cf.innerHTML= FI? FI.html+'<p class="pg-link"><a href="financeiro/">Abrir o Financeiro para ver os títulos e a comissão</a></p>'
    : '<div class="pg-empty"><p>Carregue a carteira de títulos (.xls) para ver recebimentos, vencidos e a receber.</p><button type="button" class="btn" data-pg="titulos">Carregar títulos (.xls)</button></div>';
  var fm=$('pgFonte'); if(fm) fm.textContent='Carteira de pedidos, financeiro e meta x realizado'+(F.mes!=='todos'? ' · '+mesLongo(F.mes) : '');
  var tn=$('titName'), td=$('titDate');
  if(tn){ if(tit&&tit.rows){ tn.textContent=tit.meta.arquivo; td.textContent=int(tit.rows.length)+' títulos · arquivo de '+dataHora(tit.meta.modificadoEm); } else { tn.textContent='Nenhuma carteira de títulos'; td.innerHTML='&nbsp;'; } }
  animar(res); animar(cc); animar(cf);
}
document.addEventListener('click',function(ev){
  var s=ev.target.closest&&ev.target.closest('.pg-tile[role=button]'); if(!s) return;
  var e=s.querySelector('.pg-sens'), sub=s.querySelector('.sub'); if(!e) return;
  if(e.classList.toggle('on')){ e.textContent=e.getAttribute('data-v'); if(sub) sub.textContent='clique para esconder'; } else { e.innerHTML=olho+'••••'; if(sub) sub.textContent='clique para ver'; }
});
document.addEventListener('keydown',function(ev){ var el=ev.target; if((ev.key==='Enter'||ev.key===' ')&&el.classList&&el.classList.contains('pg-tile')&&el.getAttribute('role')==='button'){ ev.preventDefault(); el.click(); } });
window.Painel={render:render};
})();
