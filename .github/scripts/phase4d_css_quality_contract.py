from pathlib import Path

path = Path('tests/screen_loader.contract.js')
text = path.read_text(encoding='utf-8')
anchor = "assert.ok(phase4dCssDeferredBytes>=100000,`Fase 4D deve adiar pelo menos 100 KB brutos de CSS clínico; atual ${phase4dCssDeferredBytes} bytes`);"
extra = r'''
const allowedClinicalBreakpoints=new Set([1280,1180,1100,980,900,820,760,700,620,560,520,430]);
const tokenText=fs.readFileSync('design_tokens.css','utf8');
const definedClinicalTokens=new Set(Array.from(tokenText.matchAll(/(--kds-[a-z0-9-]+)\s*:/gi),m=>m[1]));
for(const jsFile of fs.readdirSync('.').filter(file=>file.endsWith('.js'))){
  const source=fs.readFileSync(jsFile,'utf8');
  for(const match of source.matchAll(/setProperty\(\s*['"](--kds-[a-z0-9-]+)['"]/gi))definedClinicalTokens.add(match[1]);
}
for(const file of phase4dClinicalStyles){
  const original=fs.readFileSync(file,'utf8');
  const css=original.replace(/\/\*[\s\S]*?\*\//g,'');
  const microtype=Array.from(css.matchAll(/font-size\s*:\s*([0-9]*\.?[0-9]+)px/gi)).filter(m=>Number(m[1])<12.5);
  assert.deepStrictEqual(microtype.map(m=>m[1]),[],`${file} não pode introduzir fonte abaixo de 12.5px ao ficar lazy`);
  const badBreakpoints=Array.from(css.matchAll(/@media[^\{]*\((max|min)-width\s*:\s*([0-9]+)px\)/gi)).filter(m=>{
    const kind=String(m[1]).toLowerCase(),value=Number(m[2]);
    return !allowedClinicalBreakpoints.has(value)&&!(kind==='min'&&value===701);
  });
  assert.deepStrictEqual(badBreakpoints.map(m=>`${m[1]}:${m[2]}`),[],`${file} deve respeitar os breakpoints oficiais mesmo sob demanda`);
  const used=new Set(Array.from(original.matchAll(/var\(\s*(--kds-[a-z0-9-]+)/gi),m=>m[1]));
  const undefinedTokens=[...used].filter(token=>!definedClinicalTokens.has(token));
  assert.deepStrictEqual(undefinedTokens,[],`${file} não pode usar token KDS indefinido`);
}
'''
count = text.count(anchor)
if count != 1:
    raise SystemExit(f'Expected one Phase 4D CSS size assertion, found {count}')
path.write_text(text.replace(anchor, anchor + extra, 1), encoding='utf-8')
print('Phase 4D lazy CSS quality coverage added.')
