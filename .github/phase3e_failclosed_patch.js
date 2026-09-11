'use strict';
const fs=require('fs');
const path='script-1.18.0.js';
let s=fs.readFileSync(path,'utf8');
const from=`            const loader = window.KineSysClinicalRegionLoader;
            if (!loader?.ensure) {
                renderizarMapeamentoRegioes();
                return;
            }`;
const to=`            const loader = window.KineSysClinicalRegionLoader;
            if (!loader?.ensure) {
                input.checked = false;
                if (typeof window.mostrarToastKineSys === 'function') window.mostrarToastKineSys('Os dados clínicos desta região ainda não estão disponíveis. Tente novamente.','erro',6500);
                return;
            }`;
if(!s.includes(from))throw new Error('Bloco fail-closed não encontrado');
s=s.replace(from,to);
fs.writeFileSync(path,s);
