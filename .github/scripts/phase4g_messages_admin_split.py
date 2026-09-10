from pathlib import Path

CORE=Path('mensagens_config.js')
ADMIN=Path('mensagens_config_admin.js')
INDEX=Path('index.html')
TEST=Path('tests/mensagens_config_admin_lazy.contract.js')

src=CORE.read_text(encoding='utf-8')
html=INDEX.read_text(encoding='utf-8')
baseline=len(src.encode('utf-8'))

if ADMIN.exists():
    raise SystemExit('mensagens_config_admin.js já existe; abortando para evitar sobrescrita')

markers={
    'escape':'function escaparHTMLMensagens',
    'apply':'function aplicarVariaveisMensagem',
    'error':'function erroSchemaMensagens',
    'load':'async function carregarConfiguracoesMensagens',
    'save':'async function salvarMensagemPadraoConfigurada',
    'init':'function inicializarConfiguracaoMensagens'
}
pos={name:src.find(marker) for name,marker in markers.items()}
if any(v<0 for v in pos.values()):
    raise SystemExit(f'Um ou mais marcadores não foram encontrados: {pos}')
if not (pos['escape']<pos['apply']<pos['error']<pos['load']<pos['save']<pos['init']):
    raise SystemExit(f'Ordem inesperada dos marcadores: {pos}')

prefix=src[:pos['escape']]
prefix=prefix.replace("let kinesysMensagemEditando = KINESYS_MENSAGENS_PADRAO[0]?.chave || '';\n",'')
admin_helpers=src[pos['escape']:pos['apply']]
core_apply=src[pos['apply']:pos['error']]
admin_error=src[pos['error']:pos['load']]
core_data=src[pos['load']:pos['save']]
admin_main=src[pos['save']:pos['init']]

core_tail=r'''
const KINESYS_MENSAGENS_ADMIN_SRC = 'mensagens_config_admin.js?v=20260910-phase4g-r1';
let kinesysMensagensAdminCarregamento = null;

function mensagensAdminPronto() {
    const api = window.KineSysMensagensAdmin;
    return !!api && typeof api.abrirConfiguracoesMensagens === 'function';
}

function carregarModuloAdministrativoMensagens() {
    if (mensagensAdminPronto()) return Promise.resolve(window.KineSysMensagensAdmin);
    if (kinesysMensagensAdminCarregamento) return kinesysMensagensAdminCarregamento;
    kinesysMensagensAdminCarregamento = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = KINESYS_MENSAGENS_ADMIN_SRC;
        script.async = false;
        script.dataset.kinesysLazy = 'mensagens-admin';
        const limpar = () => {
            script.removeEventListener('load', aoCarregar);
            script.removeEventListener('error', aoErro);
        };
        const aoCarregar = () => {
            limpar();
            if (!mensagensAdminPronto()) {
                script.remove();
                reject(new Error('O módulo administrativo de mensagens não publicou os contratos esperados.'));
                return;
            }
            resolve(window.KineSysMensagensAdmin);
        };
        const aoErro = () => {
            limpar();
            script.remove();
            reject(new Error('Falha ao baixar mensagens_config_admin.js.'));
        };
        script.addEventListener('load', aoCarregar, {once:true});
        script.addEventListener('error', aoErro, {once:true});
        document.body.appendChild(script);
    }).catch(error => {
        kinesysMensagensAdminCarregamento = null;
        throw error;
    });
    return kinesysMensagensAdminCarregamento;
}

async function chamarModuloAdministrativoMensagens(nome, args=[]) {
    try {
        const api = await carregarModuloAdministrativoMensagens();
        const fn = api?.[nome];
        if (typeof fn !== 'function') throw new Error(`A ação administrativa “${nome}” não está disponível.`);
        return await fn(...args);
    } catch (err) {
        console.error('KineSys: falha ao carregar a configuração administrativa de mensagens.', err);
        const mensagem = 'Não foi possível carregar a configuração de mensagens agora. Verifique a conexão e tente novamente.';
        if (typeof mostrarToastKineSys === 'function') mostrarToastKineSys(mensagem, 'erro', 6500);
        else alert(mensagem);
        return false;
    }
}

function abrirConfiguracoesMensagens(...args) {
    if (!usuarioEhAdministradorMensagens()) {
        alert('🔒 Somente administradores podem acessar a configuração de mensagens padrão.');
        if (typeof navegarPara === 'function') navegarPara('tela_home');
        return Promise.resolve(false);
    }
    const status = document.getElementById('cfg_msg_status');
    if (status) status.textContent = 'Carregando configurações da clínica…';
    return chamarModuloAdministrativoMensagens('abrirConfiguracoesMensagens', args);
}
function selecionarMensagemConfiguracao(...args) { return chamarModuloAdministrativoMensagens('selecionarMensagemConfiguracao', args); }
function salvarMensagemConfiguracaoAtual(...args) { return chamarModuloAdministrativoMensagens('salvarMensagemConfiguracaoAtual', args); }
function restaurarMensagemPadraoAtual(...args) { return chamarModuloAdministrativoMensagens('restaurarMensagemPadraoAtual', args); }
function inserirVariavelMensagem(...args) { return chamarModuloAdministrativoMensagens('inserirVariavelMensagem', args); }
function atualizarPreviewMensagemConfiguracao(...args) { return chamarModuloAdministrativoMensagens('atualizarPreviewMensagemConfiguracao', args); }

function inicializarConfiguracaoMensagens() {
    const area = document.getElementById('tela_configuracoes');
    if (area) area.dataset.adminOnly = '1';
    // Phase 4F/4G: sem RPC e sem download do módulo administrativo no bootstrap.
}

window.KineSysMensagensCore = Object.freeze({
    version:'1.0.0-phase4g',
    padroes:KINESYS_MENSAGENS_PADRAO,
    cache:kinesysMensagensCache,
    templatePadrao:templatePadraoMensagem,
    aplicarVariaveis:aplicarVariaveisMensagem,
    usuarioEhAdministrador:usuarioEhAdministradorMensagens,
    carregar:carregarConfiguracoesMensagens,
    obter:obterMensagemPadraoConfigurada,
    get ultimoErro(){ return kinesysMensagensUltimoErro; }
});

document.addEventListener('DOMContentLoaded', inicializarConfiguracaoMensagens);
window.carregarConfiguracoesMensagens = carregarConfiguracoesMensagens;
window.obterMensagemPadraoConfigurada = obterMensagemPadraoConfigurada;
window.abrirConfiguracoesMensagens = abrirConfiguracoesMensagens;
window.selecionarMensagemConfiguracao = selecionarMensagemConfiguracao;
window.salvarMensagemConfiguracaoAtual = salvarMensagemConfiguracaoAtual;
window.restaurarMensagemPadraoAtual = restaurarMensagemPadraoAtual;
window.inserirVariavelMensagem = inserirVariavelMensagem;
window.atualizarPreviewMensagemConfiguracao = atualizarPreviewMensagemConfiguracao;
window.KineSysMensagensAdminLoader = Object.freeze({
    load:carregarModuloAdministrativoMensagens,
    isLoaded:mensagensAdminPronto
});
'''

core=(prefix+core_apply+core_data+core_tail).rstrip()+"\n"

admin_prelude=r'''/* KineSys — edição administrativa de mensagens · Phase 4G
 * Carregado somente no primeiro acesso às Configurações de mensagens.
 * O estado compartilhado é acessado exclusivamente pelo contrato KineSysMensagensCore.
 */
(function(){
'use strict';

const core = window.KineSysMensagensCore;
if (!core) {
    console.error('KineSys: núcleo de mensagens indisponível para o módulo administrativo.');
    return;
}
const KINESYS_MENSAGENS_PADRAO = core.padroes;
const kinesysMensagensCache = core.cache;
const usuarioEhAdministradorMensagens = core.usuarioEhAdministrador;
const templatePadraoMensagem = core.templatePadrao;
const aplicarVariaveisMensagem = core.aplicarVariaveis;
const carregarConfiguracoesMensagens = core.carregar;
let kinesysMensagemEditando = KINESYS_MENSAGENS_PADRAO[0]?.chave || '';

'''
admin_body=(admin_helpers+admin_error+admin_main).replace('kinesysMensagensUltimoErro','core.ultimoErro')
admin_tail=r'''
window.KineSysMensagensAdmin = Object.freeze({
    version:'1.0.0-phase4g',
    abrirConfiguracoesMensagens,
    selecionarMensagemConfiguracao,
    salvarMensagemConfiguracaoAtual,
    restaurarMensagemPadraoAtual,
    inserirVariavelMensagem,
    atualizarPreviewMensagemConfiguracao
});
})();
'''
admin=(admin_prelude+admin_body+admin_tail).rstrip()+"\n"

old_script='<script defer src="mensagens_config.js?v=20260910-phase4f-r1"></script>'
new_script='<script defer src="mensagens_config.js?v=20260910-phase4g-r1"></script>'
if html.count(old_script)!=1:
    raise SystemExit('Âncora de cache Phase 4F não encontrada exatamente uma vez')
html=html.replace(old_script,new_script)

contract=f'''\'use strict\';

const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');
const coreSource=fs.readFileSync('mensagens_config.js','utf8');
const adminSource=fs.readFileSync('mensagens_config_admin.js','utf8');
const baselineEagerBytes={baseline};
const coreBytes=fs.statSync('mensagens_config.js').size;
const adminBytes=fs.statSync('mensagens_config_admin.js').size;

assert.match(html,/mensagens_config\\.js\\?v=20260910-phase4g-r1/,'index deve invalidar cache do núcleo Phase 4G');
assert.doesNotMatch(html,/mensagens_config_admin\\.js/,'módulo administrativo não pode voltar ao bootstrap');
assert.match(coreSource,/mensagens_config_admin\\.js\\?v=20260910-phase4g-r1/,'núcleo deve registrar o módulo administrativo sob demanda');
assert.match(coreSource,/window\\.KineSysMensagensCore = Object\\.freeze/,'estado compartilhado deve usar contrato explícito');
assert.match(adminSource,/const core = window\\.KineSysMensagensCore/,'admin deve depender do contrato explícito, não de lexical globals');
assert.ok(coreBytes<baselineEagerBytes-5000,`Phase 4G deve retirar pelo menos 5 KB brutos do bootstrap; baseline ${{baselineEagerBytes}}, núcleo ${{coreBytes}}`);
assert.ok(adminBytes>5000,'módulo administrativo deve conter trabalho material realmente adiado');

for(const nome of ['abrirConfiguracoesMensagens','selecionarMensagemConfiguracao','salvarMensagemConfiguracaoAtual','restaurarMensagemPadraoAtual','inserirVariavelMensagem','atualizarPreviewMensagemConfiguracao']){{
  assert.match(coreSource,new RegExp(`window\\.${{nome}} = `),`${{nome}} deve permanecer publicado imediatamente pelo núcleo`);
  assert.ok(adminSource.includes(nome),`${{nome}} deve existir na implementação administrativa lazy`);
}}
for(const handler of ['abrirConfiguracoesMensagens()','salvarMensagemConfiguracaoAtual()','restaurarMensagemPadraoAtual()','atualizarPreviewMensagemConfiguracao()']){{
  assert.ok(html.includes(handler),`handler inline histórico deve permanecer intacto: ${{handler}}`);
}}

function makeContext(tipo='MASTER'){{
  let domReady=null;
  let rpcCalls=0;
  const scripts=[];
  const elements=new Map();
  function el(id){{
    if(!elements.has(id))elements.set(id,{{id,value:'',textContent:'',innerHTML:'',className:'',dataset:{{}},selectionStart:0,selectionEnd:0,focus(){{}}}});
    return elements.get(id);
  }}
  const document={{
    addEventListener(type,fn){{if(type==='DOMContentLoaded')domReady=fn;}},
    getElementById(id){{return el(id);}},
    createElement(tag){{
      assert.strictEqual(tag,'script');
      const listeners={{}};
      const script={{src:'',async:true,dataset:{{}},removed:false,
        addEventListener(type,fn){{listeners[type]=fn;}},
        removeEventListener(type,fn){{if(listeners[type]===fn)delete listeners[type];}},
        remove(){{this.removed=true;}},
        _listeners:listeners}};
      scripts.push(script);
      return script;
    }},
    body:{{appendChild(script){{script.appended=true;}}}}
  }};
  const supabase={{async rpc(name){{
    rpcCalls++;
    if(name==='kinesys_listar_mensagens_padrao')return {{data:[{{chave:'crm_checkin_24h',titulo:'Check-in',mensagem:'Mensagem configurada para {{paciente}}'}}],error:null}};
    if(name==='kinesys_salvar_mensagem_padrao')return {{data:[],error:null}};
    throw new Error('RPC inesperado: '+name);
  }}}};
  const context={{console,document,_supabase:supabase,usuarioLogado:{{tipo,nome:'Admin',id:'u1'}},Map,Set,Object,String,Date,Number,Array,Promise,RegExp,Error,
    alert(){{}},confirm(){{return true;}},navegarPara(){{}},
    window:{{_supabase:supabase,usuarioLogado:{{tipo,nome:'Admin',id:'u1'}}}}
  }};
  context.window.window=context.window;
  vm.createContext(context);
  vm.runInContext(coreSource,context,{{filename:'mensagens_config.js',timeout:1000}});
  return {{context,document,scripts,elements,getDomReady:()=>domReady,getRpcCalls:()=>rpcCalls}};
}}

(async()=>{{
  const env=makeContext('MASTER');
  const {{context,scripts}}=env;
  const domReady=env.getDomReady();
  assert.strictEqual(typeof domReady,'function','núcleo deve manter inicialização DOM');
  domReady();
  assert.strictEqual(env.getRpcCalls(),0,'DOMContentLoaded deve continuar sem RPC após a divisão 4G');
  assert.strictEqual(scripts.length,0,'DOMContentLoaded não pode baixar o módulo administrativo');

  const texto=await context.window.obterMensagemPadraoConfigurada('crm_checkin_24h',{{paciente:'Ana'}},true);
  assert.strictEqual(texto,'Mensagem configurada para Ana','uso CRM deve continuar funcionando só com o núcleo');
  assert.strictEqual(env.getRpcCalls(),1,'uso real da mensagem deve consultar Supabase');
  assert.strictEqual(scripts.length,0,'uso CRM/Agenda não pode carregar código administrativo');

  const proxyAntes=context.window.abrirConfiguracoesMensagens;
  const abertura=context.window.abrirConfiguracoesMensagens();
  assert.strictEqual(scripts.length,1,'primeira abertura de Configurações deve solicitar um único módulo admin');
  assert.match(scripts[0].src,/mensagens_config_admin\\.js\\?v=20260910-phase4g-r1/);
  vm.runInContext(adminSource,context,{{filename:'mensagens_config_admin.js',timeout:1000}});
  assert.strictEqual(context.window.abrirConfiguracoesMensagens,proxyAntes,'módulo admin não deve substituir o contrato público/proxy');
  scripts[0]._listeners.load();
  await abertura;
  assert.strictEqual(env.getRpcCalls(),2,'abrir Configurações deve atualizar mensagens no Supabase após o lazy load');
  assert.strictEqual(scripts.length,1,'abertura concluída não pode baixar módulo duplicado');

  const retry=makeContext('MASTER');
  const tentativa1=retry.context.window.salvarMensagemConfiguracaoAtual();
  assert.strictEqual(retry.scripts.length,1,'primeira ação admin deve iniciar um download');
  retry.scripts[0]._listeners.error();
  assert.strictEqual(await tentativa1,false,'falha de rede deve retornar false pelo proxy');
  assert.strictEqual(retry.scripts[0].removed,true,'script quebrado deve ser removido');
  const tentativa2=retry.context.window.salvarMensagemConfiguracaoAtual();
  assert.strictEqual(retry.scripts.length,2,'segunda tentativa deve criar novo download após erro');
  retry.scripts[1]._listeners.error();
  await tentativa2;

  const unauthorized=makeContext('FISIOTERAPEUTA');
  const retorno=await unauthorized.context.window.abrirConfiguracoesMensagens();
  assert.strictEqual(retorno,false,'perfil sem permissão deve continuar bloqueado');
  assert.strictEqual(unauthorized.scripts.length,0,'perfil sem permissão não deve baixar módulo administrativo');

  console.log(`Messages admin lazy contract Phase 4G: baseline eager ${{baselineEagerBytes}} bytes; núcleo eager ${{coreBytes}} bytes; admin lazy ${{adminBytes}} bytes; redução bootstrap ${{baselineEagerBytes-coreBytes}} bytes.`);
}})().catch(error=>{{console.error(error);process.exitCode=1;}});
'''

CORE.write_text(core,encoding='utf-8')
ADMIN.write_text(admin,encoding='utf-8')
INDEX.write_text(html,encoding='utf-8')
TEST.write_text(contract,encoding='utf-8')
print(f'Phase 4G prepared. baseline={{baseline}} core={{len(core.encode("utf-8"))}} admin={{len(admin.encode("utf-8"))}}')
