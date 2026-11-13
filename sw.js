/* Service worker do app CRM Studio Denim.
   Sempre busca a versão mais nova na rede (o site continua igual ao publicado no GitHub Pages).
   Guarda no aparelho só a "casca" do app (páginas, estilos, scripts e ícones) para abrir mais rápido
   e mostrar um aviso quando estiver sem internet.
   NUNCA guarda dados: carteira, tabelas, fichas, apostila e qualquer arquivo cifrado (.enc/.enc2/.enc.json),
   nem nada de outros sites (Google Drive / Apps Script). */
const CACHE = 'sd-app-v1';
const SHELL = ['/', '/manifest.webmanifest', '/lib/tema.css', '/lib/pwa.js', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function podeGuardar(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  if (/\.enc(2)?$/i.test(p) || /\.enc\.json$/i.test(p)) return false; // dados cifrados: nunca
  if (url.search && !/^\?app=1$/.test(url.search)) return false;
  return p.endsWith('/') || /\.(html|css|js|webmanifest|png|svg|ico)$/i.test(p);
}

const OFFLINE = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem conexão · Studio Denim</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0F1A30;color:#F4EBDD;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><img src="/icons/icon-192.png" width="96" height="96" alt="" style="border-radius:22px"><h1 style="font-size:22px;margin:18px 0 8px">Sem conexão</h1>
<p style="color:#B9C6DD;max-width:300px;margin:0 auto 20px">O CRM precisa de internet para abrir a carteira e os arquivos. Confira a conexão e tente de novo.</p>
<button onclick="location.reload()" style="background:#E0A63A;color:#1a1206;border:0;border-radius:10px;padding:12px 22px;font-weight:700;font-size:15px">Tentar de novo</button></div></body></html>`;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Drive, Apps Script, fontes: direto pela rede
  if (req.headers.has('range')) return; // vídeos (Caprilab) e áudio: direto pela rede

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === 'basic' && podeGuardar(url)) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        if (podeGuardar(url)) {
          const hit = await caches.match(req, { ignoreSearch: true });
          if (hit) return hit;
        }
        if (req.mode === 'navigate') {
          return new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        return Response.error();
      })
  );
});
