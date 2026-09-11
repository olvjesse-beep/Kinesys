from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
css_anchor='    <link rel="stylesheet" href="login_access-1.18.0.css">\n'
css_tag='    <link rel="stylesheet" href="access_admin-1.0.0.css?v=20260911-access-r1">\n'
js_anchor='    <script defer src="login_access-1.18.0.js?v=20260910-access-r1"></script>\n'
js_tag='    <script defer src="access_admin-1.0.0.js?v=20260911-access-r1"></script>\n'
if s.count(css_anchor)!=1:
    raise SystemExit('login css anchor absent/ambiguous')
if s.count(js_anchor)!=1:
    raise SystemExit('login js anchor absent/ambiguous')
if css_tag not in s:
    s=s.replace(css_anchor,css_anchor+css_tag,1)
if js_tag not in s:
    s=s.replace(js_anchor,js_anchor+js_tag,1)
p.write_text(s,encoding='utf-8')

core=Path('script-1.18.0.js')
c=core.read_text(encoding='utf-8')
start='async function enviarRedefinicaoAcessoFuncionario(id) {'
end='\nasync function excluirFuncionario(id) {'
si=c.find(start)
ei=c.find(end,si)
if si<0 or ei<0:
    raise SystemExit('legacy team recovery function absent/ambiguous')
replacement="""async function enviarRedefinicaoAcessoFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode definir senhas da equipe.'); return false; }
    if (!window.KineSysAccessAdmin?.open) { alert('O gerenciamento de acesso ainda não foi carregado. Atualize a página e tente novamente.'); return false; }
    return window.KineSysAccessAdmin.open(id);
}
"""
c=c[:si]+replacement+c[ei:]
c=c.replace('>Redefinir acesso</button>','>Definir nova senha</button>')
c=c.replace('use “Redefinir acesso”.','use “Definir nova senha”.')
core.write_text(c,encoding='utf-8')
