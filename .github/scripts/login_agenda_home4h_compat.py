from pathlib import Path

path=Path('home_fisioterapeuta_util-1.24.0.js')
s=path.read_text(encoding='utf-8')
s=s.replace("const modoDestino=clinica.familia==='avaliacao'?'avaliacao':'evolucao';", "const modoDestino=clinica.familia==='avaliacao' ? 'avaliacao' : 'evolucao';")
s=s.replace("const labelDestino=modoDestino==='avaliacao'?'Avaliação':'Evolução';", "const labelDestino=modoDestino==='avaliacao' ? 'Avaliação' : 'Evolução';")
marker='\n    async function carregarHistoricoAgenda(atendimentos,hoje,profissionalId){'
if 'function pontuacaoPrioridade(item)' not in s:
    helper="""
    // Mantido como contrato de compatibilidade do Home. A janela de 4 horas é
    // cronológica; este helper não limita nem reordena os itens exibidos.
    function pontuacaoPrioridade(item){
        const classe=String(item?.situacao?.classe||'');
        if(classe==='is-current') return 0;
        if(classe==='is-waiting') return 1;
        if(classe==='is-rescheduled') return 2;
        if(classe==='is-upcoming') return 3;
        if(classe==='is-done') return 4;
        if(classe==='is-cancelled'||classe==='is-absence') return 5;
        return 6;
    }
"""
    if marker not in s: raise AssertionError('marcador carregarHistoricoAgenda ausente')
    s=s.replace(marker,'\n'+helper+marker,1)
path.write_text(s,encoding='utf-8')
print('Compatibilidade do contrato anterior preservada.')