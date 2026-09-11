const fs=require('fs');
const path='clinical_reasoning_elbow-3.1.0.js';
let s=fs.readFileSync(path,'utf8');

const oldDistal=`    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:ate).{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);`;
const newDistal=`    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|\\bate\\b.{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);`;
if(!s.includes(oldDistal))throw new Error('Regex distal do cotovelo não encontrado');
s=s.replace(oldDistal,newDistal);

const oldBlock=`    if(cond.id==='cotovelo_medial'){\n      if(localMedial&&cargaFlexorPronadora)score+=3.4;else if(localMedial)score+=0.7;\n      if((digitosUlnares||arremessoValgo)&&!cargaFlexorPronadora)score-=3.2;\n      if(rotuloTendineoIsolado)score=-5;\n    }`;
const newBlock=`    if(cond.id==='cotovelo_medial'){\n      if(localMedial&&cargaFlexorPronadora)score+=3.4;\n      else if(localMedial&&digitosUlnares&&!cargaFlexorPronadoraNegada){score=Math.max(score,2.65);hits.push('dor medial focal coexistindo com sintomas ulnares');}\n      else if(localMedial)score+=0.7;\n      if(arremessoValgo&&!cargaFlexorPronadora)score-=3.2;\n      if(cargaFlexorPronadoraNegada)score-=3.5;\n      if(rotuloTendineoIsolado)score=-5;\n    }`;
if(!s.includes(oldBlock))throw new Error('Bloco medial pós-hardening não encontrado');
s=s.replace(oldBlock,newBlock);

const oldEvidence=`cond.id==='cotovelo_medial'?(localMedial&&cargaFlexorPronadora&&!rotuloTendineoIsolado):true;`;
const newEvidence=`cond.id==='cotovelo_medial'?(localMedial&&(cargaFlexorPronadora||(digitosUlnares&&!cargaFlexorPronadoraNegada))&&!rotuloTendineoIsolado):true;`;
if(!s.includes(oldEvidence))throw new Error('Contrato evidenciaForte medial não encontrado');
s=s.replace(oldEvidence,newEvidence);

fs.writeFileSync(path,s);
console.log('Elbow lexical and mixed medial-ulnar refinements applied.');
