'use strict';
// Executado no runner hospedado: Chrome isolado, transporte fechado e dados
// sintéticos. Não controla o navegador do usuário nem acessa a base clínica.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_CORE_MODULE||'playwright-core');
assert.equal(process.env.CI,'true','Executar esta integração no ambiente hospedado isolado.');
const out=path.resolve(process.env.REPORT_PRINT_OUTPUT||'artifacts/report-print');fs.mkdirSync(out,{recursive:true});
const port='4268',origin='http://127.0.0.1:'+port;
const servidor=spawn(process.execPath,['tests/helpers/ui_preview.cjs'],{env:{...process.env,KINESYS_UI_PREVIEW_PORT:port},stdio:['ignore','pipe','inherit']});
const pronto=new Promise((ok,fail)=>{servidor.stdout.on('data',chunk=>{if(String(chunk).includes('UI preview:'))ok();});servidor.once('error',fail);servidor.once('exit',code=>fail(Error('Servidor encerrou: '+code)));});
let browser;
(async()=>{
 await pronto;
 const chrome=process.env.CHROME_BIN||execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 browser=await chromium.launch({headless:true,executablePath:chrome});
 const context=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});
 await context.route('**/*',route=>{const url=route.request().url();return url.startsWith(origin+'/')||url.startsWith('data:')?route.continue():route.abort();});
 const results=[];
 for(const caso of ['comparecimento','tabela','paragrafo']){
  const page=await context.newPage();
  await page.goto(origin+'/__audit_fixture?documento='+caso);
  await page.waitForFunction(()=>document.querySelector('#ks_documento_impressao')?.shadowRoot?.querySelector('article'));
  const frame=page.frameLocator('iframe.documento-preview-frame');
  const metrics=await frame.locator('body').evaluate(el=>({pages:el.children.length,text:[...el.querySelectorAll('.timbrado-conteudo')].map(c=>c.innerText).join(''),rects:[...el.querySelectorAll('.timbrado-conteudo')].map(c=>({x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y%c.closest('article').getBoundingClientRect().height,width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,font:getComputedStyle(c).font})),overflow:[...el.querySelectorAll('.timbrado-conteudo')].some(c=>c.scrollHeight>c.clientHeight+1),rows:el.querySelectorAll('tbody>tr').length,signatures:el.querySelectorAll('.assinatura-dinamica').length}));
  assert(!metrics.overflow);assert.equal(metrics.signatures,1);
  if(caso==='comparecimento')assert.equal(metrics.pages,1);else assert(metrics.pages>1);
  if(caso==='tabela')assert.equal(metrics.rows,45);
  const source=await frame.locator('body').innerHTML();
  assert.equal(await page.locator('#ks_documento_impressao').evaluate(el=>el.shadowRoot.querySelector('.ks-documento-paginado').innerHTML),source);
  // O botão realmente chama print() da janela da folha, nunca do aplicativo.
  await page.evaluate(()=>{const win=document.querySelector('iframe.documento-preview-frame').contentWindow;const original=win.print.bind(win);win.__qaImpressions=0;win.print=()=>{win.__qaImpressions++;original();};});
  await page.getByRole('button',{name:'Imprimir ou exportar PDF',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.querySelector('iframe.documento-preview-frame').contentWindow.__qaImpressions),1);
  const folhas=frame.locator('article');
  for(let i=0;i<metrics.pages;i++)await folhas.nth(i).screenshot({path:path.join(out,caso+'-previa-'+(i+1)+'.png')});
  await page.pdf({path:path.join(out,caso+'.pdf'),preferCSSPageSize:true,printBackground:false,displayHeaderFooter:false});
  // A saída em PDF também exercita beforeprint/afterprint do menu nativo.
  assert.equal(await page.locator('body').getAttribute('data-ks-documento-impressao'),null);
  await page.setViewportSize({width:390,height:844});
  const mobile=await frame.locator('article').first().evaluate(el=>({width:el.getBoundingClientRect().width,font:getComputedStyle(el.querySelector('.timbrado-conteudo')).font,text:el.querySelector('.timbrado-conteudo').textContent}));
  assert(Math.abs(mobile.width-793.7)<.1);assert.equal(mobile.font,metrics.rects[0].font,'mobile não pode refluir a folha A4');
  results.push({caso,...metrics});await page.close();
 }
 fs.writeFileSync(path.join(out,'metricas.json'),JSON.stringify(results,null,2));
 // Converte o PDF realmente impresso pelo Chrome para pixels e compara todas
 // as páginas com as capturas da prévia (fontes/texto/imagens e paginação).
 const python=String.raw`
import json,re,sys
from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image,ImageChops,ImageStat,ImageFilter
out=Path(sys.argv[1]);checks=[]
def norm(t):return re.sub(r'\s+','',t)
for item in json.loads((out/'metricas.json').read_text()):
 name=item['caso'];reader=PdfReader(out/(name+'.pdf'))
 assert len(reader.pages)==item['pages'],(name,'quantidade de folhas divergente',len(reader.pages),item['pages'])
 texto=''.join(p.extract_text() for p in reader.pages)
 # Chrome inclui o pseudo-elemento institucional e sua camada de sombra na
 # extração; comparar o conteúdo clínico visível (incluindo text-transform).
 texto=re.sub(r'(?:FISIOTERAPIA\s*)+(?:REABILITAÇÃO\s*)+(?:MOVIMENTO\s*)+','',texto)
 assert norm(texto)==norm(item['text']),(name,'conteúdo textual divergente')
 pdf=pdfium.PdfDocument(str(out/(name+'.pdf')))
 for i,page in enumerate(pdf):
  box=reader.pages[i].mediabox
  assert abs(float(box.width)-595.276)<.3 and abs(float(box.height)-841.89)<.3,(name,'papel não é A4')
  papel=page.render(scale=96/72).to_pil().convert('RGB')
  previa=Image.open(out/(name+'-previa-'+str(i+1)+'.png')).convert('RGB')
  assert abs(papel.width-previa.width)<=1 and abs(papel.height-previa.height)<=1,(name,'dimensão divergente',papel.size,previa.size)
  size=(max(papel.width,previa.width),max(papel.height,previa.height))
  a=Image.new('RGB',size,'white');b=Image.new('RGB',size,'white');a.paste(papel,(0,0));b.paste(previa,(0,0))
  erro=sum(ImageStat.Stat(ImageChops.difference(a.filter(ImageFilter.GaussianBlur(1)),b.filter(ImageFilter.GaussianBlur(1)))).mean)/3
  assert erro<4.0,(name,i+1,'prévia e impressão diferem visualmente',erro)
  papel.save(out/(name+'-impresso-'+str(i+1)+'.png'))
  checks.append({'caso':name,'pagina':i+1,'erro_medio_pixel':round(erro,4)})
 pdf.close()
(out/'comparacao-pdf.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print('PASS: PDF Chrome com mesmo texto, A4, número de páginas e comparação visual de todas as folhas.')
`;
 process.stdout.write(execFileSync('python',['-c',python,out],{encoding:'utf8'}));
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{await browser?.close();servidor.kill();});
