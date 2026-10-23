'use strict';
// Servidor exclusivo de QA. Substituições em memória, sem editar assets de produção.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { profile, catalog, slots } = require('./public_booking_fixture.cjs');
const root = path.resolve(__dirname, '../..');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/__booking/profile' || url.pathname === '/__booking/api') {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') { res.end(JSON.stringify(url.pathname.endsWith('profile') ? profile : catalog)); return; }
    let body = ''; for await (const chunk of req) body += chunk;
    let data; try { data = JSON.parse(body); } catch { res.writeHead(400).end('{}'); return; }
    res.end(JSON.stringify(data.acao === 'slots' ? slots : { ok: true, demonstracao: true })); return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  let name; try { name = path.resolve(root, '.' + decodeURIComponent(url.pathname)); } catch { res.writeHead(400).end(); return; }
  if (!name.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (name.startsWith(path.join(root, '.git'))) { res.writeHead(403).end(); return; }
  if (fs.existsSync(name) && fs.statSync(name).isDirectory()) name = path.join(name, 'index.html');
  if (!fs.existsSync(name)) { res.writeHead(404).end(); return; }
  let content = fs.readFileSync(name);
  if (name.endsWith('agendamento-publico-v2.js')) content = content.toString().replace(/https:\/\/[^']+\/functions\/v1\/agendamento-publico-perfil/g, '/__booking/profile').replace(/https:\/\/[^']+\/functions\/v1\/agendamento-publico/g, '/__booking/api');
  if (name === path.join(root, 'agendamento/index.html')) content = content.toString().replace('<body>', '<body><p style="margin:0;padding:8px 16px;background:#123D47;color:white;text-align:center;font:14px Segoe UI">Prévia de demonstração — nenhum agendamento real será criado.</p>');
  res.setHeader('Content-Type', mime[path.extname(name)] || 'application/octet-stream'); res.end(content);
});
server.listen(4173, '127.0.0.1', () => console.log('Prévia isolada: http://127.0.0.1:4173/agendamento/?clinica=demo'));
