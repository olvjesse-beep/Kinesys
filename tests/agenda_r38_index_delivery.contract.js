'use strict';
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');

assert.match(html,/src\/ui\/screen_loader-1\.25\.0\.js\?v=20260914-agenda-postgrid-r38/,'index.html must reference the fresh Agenda r38 Screen Loader URL directly');
assert.doesNotMatch(html,/src\/ui\/screen_loader-1\.25\.0\.js\?v=20260910-phase4d-r1&agenda_edit=/,'obsolete primary Screen Loader URL must not remain in index.html');
assert.match(loader,/ASSET_REVISION=['"]20260914-agenda-postgrid-r38['"]/,'Screen Loader must force r38 nested Agenda assets');
assert.match(loader,/agenda_mobile_order-1\.0\.0\.css\?v=20260914-postgrid-r38/,'Agenda order CSS must use r38');
assert.match(loader,/agenda_lifecycle-1\.0\.0\.js\?v=20260914-postgrid-r38/,'Agenda lifecycle must use r38');
console.log('Agenda r38 index delivery contract OK.');
