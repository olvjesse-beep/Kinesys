'use strict';
const fs=require('fs');
const assert=require('assert');
const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
assert.match(loader,/ASSET_REVISION=['"]20260914-agenda-postgrid-r38['"]/);
assert.match(loader,/agenda_mobile_order-1\.0\.0\.css\?v=20260914-postgrid-r38/);
assert.match(loader,/agenda_lifecycle-1\.0\.0\.js\?v=20260914-postgrid-r38/);
console.log('Agenda r38 loader revision contract OK.');
