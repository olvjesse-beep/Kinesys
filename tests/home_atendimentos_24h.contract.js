const assert = require('assert');

function referenciaAtendimentoHome(a){
    if(a.atendido_em){const t=Date.parse(a.atendido_em);return Number.isFinite(t)?{t,legado:false}:null;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.data||'')||!/^\d{2}:\d{2}/.test(a.hora_inicio||''))return null;
    const t=Date.parse(`${a.data}T${String(a.hora_inicio).slice(0,5)}:00-03:00`);
    return Number.isFinite(t)?{t,legado:true}:null;
}

function instanteAgendaHome(a){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.data||'')||!/^\d{2}:\d{2}/.test(a.hora_inicio||''))return null;
    const t=Date.parse(`${a.data}T${String(a.hora_inicio).slice(0,5)}:00-03:00`);
    return Number.isFinite(t)?t:null;
}

function filtrarAtendimentos24hHome(dados,agora=Date.now(),profissional=''){
    return dados.filter(a=>['atendido','concluido'].includes(String(a.status||'').toLowerCase()))
        .filter(a=>!profissional||String(a.profissional_id)===profissional)
        .map(a=>({...a,__referencia:referenciaAtendimentoHome(a),__instanteAgenda:instanteAgendaHome(a)}))
        .filter(a=>a.__referencia&&Number.isFinite(a.__instanteAgenda)&&a.__instanteAgenda>=agora-86400000&&a.__instanteAgenda<=agora)
        .sort((a,b)=>b.__referencia.t-a.__referencia.t||String(a.id).localeCompare(String(b.id)));
}

const agora = Date.parse('2026-09-12T16:00:00-03:00');
const dados = [
    {
        id:'antigo',
        profissional_id:'prof-1',
        data:'2026-09-04',
        hora_inicio:'15:00:00',
        status:'atendido',
        atendido_em:'2026-09-11T15:32:28-03:00'
    },
    {
        id:'recente',
        profissional_id:'prof-1',
        data:'2026-09-11',
        hora_inicio:'15:00:00',
        status:'atendido',
        atendido_em:'2026-09-11T15:31:33-03:00'
    }
];

const resultado = filtrarAtendimentos24hHome(dados, agora, 'prof-1');
assert.deepStrictEqual(resultado.map(x=>x.id), ['recente']);
assert.strictEqual(resultado[0].__referencia.legado, false);

console.log('home_atendimentos_24h.contract.js OK');
