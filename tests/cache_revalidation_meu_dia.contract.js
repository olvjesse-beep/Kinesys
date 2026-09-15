'use strict';
const fs=require('fs');
const assert=require('assert');

const ht=fs.readFileSync('.htaccess','utf8');
assert.match(ht,/agenda_notificacoes_core-1\.20\.1\\\.js/,'Notificações alteradas devem ser revalidadas no host do app');
assert.match(ht,/home_fisioterapeuta_util-1\.24\.0\\\.js/,'Meu dia alterado deve ser revalidado no host do app');
assert.match(ht,/Header set Cache-Control "no-cache, no-store, must-revalidate" env=KINESYS_APP_HOST/,'Revalidação deve ficar restrita ao host do KineSys');
console.log('Meu dia cache revalidation contract: OK');
