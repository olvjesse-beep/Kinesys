from pathlib import Path

p=Path('login_access-1.18.0.js')
s=p.read_text(encoding='utf-8')
old="            const redirectTo=new URL('recuperar-acesso.html',location.href);\n            const {error}=await _supabase.auth.resetPasswordForEmail(el('login_recovery_email').value.trim().toLowerCase(),{redirectTo:redirectTo.href});"
new="            const redirectTo='https://app.fisiofixfisioterapia.com/recuperar-acesso.html';\n            const {error}=await _supabase.auth.resetPasswordForEmail(el('login_recovery_email').value.trim().toLowerCase(),{redirectTo});"
if s.count(old)!=1:
    raise SystemExit('recovery redirect anchor absent/ambiguous')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
