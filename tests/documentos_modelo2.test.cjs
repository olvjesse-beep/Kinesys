'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/core/midias_core-1.0.0.js','utf8');
const nodes={
 midia_galeria:{innerHTML:''}, midia_filtro_tipo:{value:''},
 tela_midias:{dataset:{mediaCategory:'all'}}
};
const context=vm.createContext({document:{getElementById:id=>nodes[id]||null},window:{},console,usuarioLogado:{tipo:'ADMIN'},
 escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 perfilEhSecretaria:()=>false});
vm.runInContext(source,context);
vm.runInContext(`tiposMidiaPermitidosParaPerfil=()=>['avaliacao','documento'];
midiasPacienteAtual=[
 {id:'a',type:'avaliacao',mime_type:'image/jpeg',captured_at:'2026-10-15T12:00:00Z',filename:'a.jpg',cloud_only:true},
 {id:'b',type:'documento',mime_type:'application/pdf',captured_at:'2026-10-19T12:00:00Z',filename:'<script>.pdf',cloud_only:true},
 {id:'c',type:'ferida',mime_type:'image/jpeg',captured_at:'2026-10-20T12:00:00Z',filename:'proibido.jpg',cloud_only:true}
]; renderizarGaleriaMidias();`,context);
assert(nodes.midia_galeria.innerHTML.indexOf('&lt;script>')<nodes.midia_galeria.innerHTML.indexOf('a.jpg'),'Newer first');
assert(!nodes.midia_galeria.innerHTML.includes('proibido'),'Permissions before tabs');
assert(!nodes.midia_galeria.innerHTML.includes('<script>'),'Filename escaped');
assert.equal((nodes.midia_galeria.innerHTML.match(/documents-date/g)||[]).length,2);
nodes.tela_midias.dataset.mediaCategory='photos';
vm.runInContext('renderizarGaleriaMidias()',context);
assert(nodes.midia_galeria.innerHTML.includes('a.jpg'));
assert(!nodes.midia_galeria.innerHTML.includes('.pdf'));
nodes.tela_midias.dataset.mediaCategory='documents';
vm.runInContext('renderizarGaleriaMidias()',context);
assert(nodes.midia_galeria.innerHTML.includes('.pdf'));
assert(!nodes.midia_galeria.innerHTML.includes('a.jpg'));
assert(!nodes.midia_galeria.innerHTML.includes('Inicial'),'PDF is not comparable photo');
nodes.midia_filtro_tipo.value='avaliacao';
vm.runInContext('renderizarGaleriaMidias()',context);
assert(nodes.midia_galeria.innerHTML.includes('Nenhuma foto ou documento'));
nodes.midia_paciente_select={value:''};
vm.runInContext('renderizarGaleriaMidias()',context);
assert(nodes.midia_galeria.innerHTML.includes('Selecione um paciente'),'Cleared patient cannot expose previous records through tabs');
const layout=fs.readFileSync('src/ui/documentos_modelo2.js','utf8');
assert(!/innerHTML\s*=|_supabase|fetch\(|localStorage/.test(layout),'Presentation cannot replace controls or write records');
assert.match(layout,/hero\.replaceChildren\(patient\)/);
assert.match(layout,/observed\.observe\(pair/);
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/styles\/documentos_modelo2.css\?v=/);
assert.match(html,/src\/ui\/documentos_modelo2.js\?v=/);
console.log('Documentos model 2: chronology, grouping, tabs, permissions, escaping, no PDF comparison and presentation-only: OK');
