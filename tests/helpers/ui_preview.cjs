// Prévia local dos arquivos reais. Somente leitura, vinculada ao loopback.
// Usa o login normal do KineSys; não fornece sessão nem executa PHP.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const port=Number(process.env.KINESYS_UI_PREVIEW_PORT||4201);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(name==='/__audit_fixture'){delete require.cache[require.resolve('./interface_fixture.cjs')];res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(require('./interface_fixture.cjs')(root));return;}
 if(name==='/')name='/index.html';
 const file=path.resolve(root,'.'+name);
 const allowed=name==='/index.html'||['src','styles','database','assets','screens'].some(dir=>file.startsWith(path.join(root,dir)+path.sep));
 if(!allowed||!file.startsWith(root+path.sep)||!types[path.extname(file)]){res.writeHead(404).end();return;}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:bytes);});
}).listen(port,'127.0.0.1',()=>console.log('KineSys UI preview: http://127.0.0.1:'+port));
