/* KineSys — catálogo de registro medicamentoso, não prescrição.
 * Um produto por opção. Nunca usar uma marca como sinônimo de outra.
 * Dados públicos Anvisa carregados antes deste adaptador pelo screen_loader.
 * Strings históricas são preservadas; este módulo não migra prontuários.
 */
const dicionarioMedicamentos=Object.create(null);
(function(root){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 let source=null,items=[],byLabel=new Map();
 function refresh(){
  const current=root.KineSysMedicamentosAnvisa;if(current===source)return !!source;
  if(!Array.isArray(current?.products))return false;
  source=current;items=[];byLabel=new Map();
  Object.keys(dicionarioMedicamentos).forEach(k=>delete dicionarioMedicamentos[k]);
  for(const p of current.products){
   // The complete official field can contain forms/salts, not necessarily
   // coadministration. No splitting, equivalence or dose inference.
   const same=normalize(p.nome)===normalize(p.principioAtivo);
   const label=same?p.nome:p.nome+' ('+p.principioAtivo+')';
   const item=Object.freeze({chave:p.id,texto:label,nome:p.nome,principioAtivo:p.principioAtivo,
    detalhe:same?'Nome do medicamento':'Princípio(s) ativo(s) no cadastro: '+p.principioAtivo,
    registros:Object.freeze(p.registros.slice()),classes:Object.freeze(p.classes.slice()),generico:p.categorias.some(c=>normalize(c)==='generico'),
    busca:normalize(p.nome+' '+p.principioAtivo),nomeBusca:normalize(p.nome)});
   items.push(item);byLabel.set(normalize(label),item);dicionarioMedicamentos[p.id]=label;
  }
  return true;
 }
 function search(query,limit=20){
  if(!refresh())return null;
  const q=normalize(query);if(q.length<2)return [];
  const terms=q.split(/\s+/),rank=x=>x.nomeBusca===q?0:x.nomeBusca.startsWith(q)?1:x.nomeBusca.split(/[^a-z0-9]+/).some(w=>w.startsWith(q))?2:normalize(x.principioAtivo)===q?3:4;
  return items.filter(x=>terms.every(t=>x.busca.includes(t))).map(x=>({...x,rank:rank(x)}))
   .sort((a,b)=>a.rank-b.rank||Number(b.generico)-Number(a.generico)||a.nome.localeCompare(b.nome,'pt-BR')||a.texto.localeCompare(b.texto,'pt-BR')).slice(0,Math.min(50,Math.max(1,limit)));
 }
 root.KineSysMedicamentos=Object.freeze({buscar:search,obter:label=>{refresh();return byLabel.get(normalize(label))||null;},
  get metadados(){refresh();return source?.metadata||null;},get total(){refresh();return items.length;}});
 refresh();
})(globalThis);
