const fs=require('fs');
const path='clinical_reasoning_elbow-3.1.0.js';
let s=fs.readFileSync(path,'utf8');

const oldDistal=`    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:ate).{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);`;
const newDistal=`    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|\\bate\\b.{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);`;
if(!s.includes(oldDistal))throw new Error('Regex distal do cotovelo não encontrado');
s=s.replace(oldDistal,newDistal);

const oldLateral=`    const lateralAnatomica=!localizacaoIncerta&&(/(?:lateral|lado de fora|epicondilo lateral).{0,28}cotovelo|cotovelo.{0,28}(?:lateral|lado de fora|epicondilo lateral)/.test(t));\n    const cargaExtensoraLocal=/(?:cotovelo).{0,65}(?:apert|preens|estend.{0,12}punho)|(?:apert|preens|estend.{0,12}punho).{0,65}cotovelo/.test(t);`;
const newLateral=`    const lateralAnatomica=!localizacaoIncerta&&(/\\bepicondilo lateral\\b|(?:lateral|lado de fora|epicondilo lateral).{0,28}cotovelo|cotovelo.{0,28}(?:lateral|lado de fora|epicondilo lateral)/.test(t));\n    const cargaExtensoraLocal=/(?:cotovelo).{0,65}(?:apert|preens|estend.{0,15}punho)|(?:apert|preens|estend.{0,15}punho).{0,65}cotovelo|(?:apert|preens|estend.{0,15}punho)/.test(t);`;
if(!s.includes(oldLateral))throw new Error('Bloco lateral pós-hardening não encontrado');
s=s.replace(oldLateral,newLateral);

const oldMedial=`    const localMedial=!localizacaoIncerta&&(/(?:medial|lado de dentro|parte de dentro|epicondilo medial).{0,55}cotovelo|cotovelo.{0,55}(?:medial|lado de dentro|parte de dentro)/.test(t));`;
const newMedial=`    const localMedial=!localizacaoIncerta&&(/\\bepicondilo medial\\b|(?:medial|lado de dentro|parte de dentro|epicondilo medial).{0,55}cotovelo|cotovelo.{0,55}(?:medial|lado de dentro|parte de dentro)/.test(t));`;
if(!s.includes(oldMedial))throw new Error('Bloco medial anatômico pós-hardening não encontrado');
s=s.replace(oldMedial,newMedial);

const oldBlock=`    if(cond.id==='cotovelo_medial'){\n      if(localMedial&&cargaFlexorPronadora)score+=3.4;else if(localMedial)score+=0.7;\n      if((digitosUlnares||arremessoValgo)&&!cargaFlexorPronadora)score-=3.2;\n      if(rotuloTendineoIsolado)score=-5;\n    }`;
const newBlock=`    if(cond.id==='cotovelo_medial'){\n      if(localMedial&&cargaFlexorPronadora)score+=3.4;\n      else if(localMedial&&digitosUlnares&&!cargaFlexorPronadoraNegada){score=Math.max(score,2.65);hits.push('dor medial focal coexistindo com sintomas ulnares');}\n      else if(localMedial)score+=0.7;\n      if(arremessoValgo&&!cargaFlexorPronadora)score-=3.2;\n      if(cargaFlexorPronadoraNegada)score-=3.5;\n      if(rotuloTendineoIsolado)score=-5;\n    }`;
if(!s.includes(oldBlock))throw new Error('Bloco medial pós-hardening não encontrado');
s=s.replace(oldBlock,newBlock);

const oldEvidence=`cond.id==='cotovelo_medial'?(localMedial&&cargaFlexorPronadora&&!rotuloTendineoIsolado):true;`;
const newEvidence=`cond.id==='cotovelo_medial'?(localMedial&&(cargaFlexorPronadora||(digitosUlnares&&!cargaFlexorPronadoraNegada))&&!rotuloTendineoIsolado):true;`;
if(!s.includes(oldEvidence))throw new Error('Contrato evidenciaForte medial não encontrado');
s=s.replace(oldEvidence,newEvidence);

fs.writeFileSync(path,s);
console.log('Elbow lexical, epicondylar and mixed medial-ulnar refinements applied.');
