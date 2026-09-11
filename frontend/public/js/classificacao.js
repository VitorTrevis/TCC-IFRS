montarTopo();

const id = parametro('id');
const conteudo = document.getElementById('conteudo');

(async () => {
  if (!id) {
    conteudo.innerHTML = '<div class="vazio"><strong>Campeonato nao informado</strong>Use o link a partir da lista de campeonatos.</div>';
    return;
  }
  document.getElementById('voltar').href = `campeonato.html?id=${id}`;
  try {
    const [campeonato, blocos] = await Promise.all([api.campeonato(id), api.classificacao(id)]);
    document.getElementById('titulo').textContent = campeonato.nome;
    document.title = `Classificacao - ${campeonato.nome}`;

    if (!blocos.length) {
      conteudo.innerHTML = '<div class="vazio"><strong>Campeonato de mata-mata</strong>Este formato nao tem tabela de pontos.</div>';
      return;
    }
    const classificados = campeonato.formato === 'grupos_mata_mata' ? campeonato.classificados_grupo : 0;
    conteudo.innerHTML = blocos.map((b) => `
      <section class="cartao mb-3">
        <div class="cartao-cabecalho"><h2 class="h6 mb-0">${b.grupo ? `Grupo ${esc(b.grupo)}` : 'Classificacao geral'}</h2></div>
        <div class="cartao-corpo">${tabelaClassificacao(b.tabela, classificados)}</div>
      </section>`).join('');
  } catch (e) {
    conteudo.innerHTML = `<div class="vazio"><strong>Nao deu para carregar</strong>${esc(e.message)}</div>`;
  }
})();
