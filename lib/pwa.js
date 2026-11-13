/* App para celular (PWA) do CRM Studio Denim.
   - registra o service worker (/sw.js);
   - mostra o botão "Instalar app" no Android/Chrome e a dica de instalação no iPhone/iPad (Safari);
   - não aparece quando o CRM já está aberto como app. */
(function () {
  'use strict';
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }

  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) { document.documentElement.classList.add('sd-app'); return; }

  var KEY = 'sd_pwa_dica_fechada';
  function fechado() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function marcarFechado() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }

  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isMobile = isIOS || /Android|Mobi/i.test(ua);

  var css = '' +
    '.sd-inst{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99999;' +
    'display:flex;gap:12px;align-items:center;padding:12px 12px 12px 14px;border-radius:14px;' +
    'background:#14223D;color:#F4EBDD;box-shadow:0 10px 30px rgba(0,0,0,.35);border:1.5px dashed #E0A63A;' +
    "font:500 14px/1.35 'Archivo','Segoe UI',Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;}" +
    '.sd-inst img{width:42px;height:42px;border-radius:10px;flex:0 0 auto;}' +
    '.sd-inst .t{flex:1 1 auto;min-width:0;} .sd-inst b{display:block;font-weight:700;font-size:14.5px;}' +
    '.sd-inst small{display:block;color:#B9C6DD;font-size:12.5px;margin-top:2px;} .sd-inst small b{display:inline;font-size:inherit;color:#F4EBDD;}' +
    '.sd-inst .ok{background:#E0A63A;color:#1a1206;border:0;border-radius:9px;padding:10px 14px;font-weight:700;font-size:14px;cursor:pointer;flex:0 0 auto;}' +
    '.sd-inst .x{background:transparent;color:#B9C6DD;border:0;font-size:22px;line-height:1;padding:4px 6px;cursor:pointer;flex:0 0 auto;}' +
    '.sd-inst .ios{display:inline-block;vertical-align:-3px;width:16px;height:16px;}' +
    '@media print{.sd-inst{display:none!important}}';

  function montar(html, comBotao) {
    if (document.querySelector('.sd-inst')) return null;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var el = document.createElement('div');
    el.className = 'sd-inst'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Instalar o app');
    el.innerHTML = '<img src="/icons/icon-192.png" alt=""><div class="t">' + html + '</div>' +
      (comBotao ? '<button type="button" class="ok">Instalar</button>' : '') +
      '<button type="button" class="x" aria-label="Fechar">×</button>';
    el.querySelector('.x').addEventListener('click', function () { el.remove(); marcarFechado(); });
    document.body.appendChild(el);
    return el;
  }

  // Android / Chrome / Edge: usa o pedido de instalação do próprio navegador
  var pedido = null;
  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    pedido = ev;
    if (fechado()) return;
    var el = montar('<b>Instalar o CRM no celular</b><small>Ícone na tela inicial e tela cheia, como um app.</small>', true);
    if (!el) return;
    el.querySelector('.ok').addEventListener('click', function () {
      el.remove();
      pedido.prompt();
      pedido.userChoice.then(function (r) { if (r && r.outcome === 'accepted') marcarFechado(); pedido = null; });
    });
  });
  window.addEventListener('appinstalled', function () {
    marcarFechado();
    var el = document.querySelector('.sd-inst'); if (el) el.remove();
  });

  // iPhone / iPad (Safari): não existe botão automático, então mostra o caminho
  if (isIOS && isMobile && !fechado()) {
    var shareIco = '<svg class="ios" viewBox="0 0 24 24" fill="none" stroke="#E0A63A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/></svg>';
    var mostrar = function () {
      montar('<b>Instalar o CRM no iPhone</b><small>Toque em ' + shareIco + ' <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</small>', false);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(mostrar, 1200); });
    else setTimeout(mostrar, 1200);
  }
})();
