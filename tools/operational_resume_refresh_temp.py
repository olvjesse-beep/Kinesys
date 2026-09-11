from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
anchor='    <script defer src="home_fisioterapeuta_util-1.24.0.js?v=20260910-r3&fisio_home=20260910-r1&home4h=20260910-r1"></script>\n'
tag='    <script defer src="operational_resume_refresh-1.0.0.js?v=20260911-r1"></script>\n'
if s.count(anchor)!=1:
    raise SystemExit('home fisioterapeuta anchor absent/ambiguous')
if tag not in s:
    s=s.replace(anchor,anchor+tag,1)
p.write_text(s,encoding='utf-8')
