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
