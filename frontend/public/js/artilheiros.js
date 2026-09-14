montarTopo();

const id = parametro('id');
const conteudo = document.getElementById('conteudo');

(async () => {
  if (!id) {
    conteudo.innerHTML = '<div class="vazio"><strong>Campeonato não informado</strong>Use o link a partir da lista de campeonatos.</div>';
    return;
  }
  document.getElementById('voltar').href = `campeonato.html?id=${id}`;
  try {
    const [campeonato, lista] = await Promise.all([api.campeonato(id), api.artilheiros(id)]);
    document.getElementById('titulo').textContent = campeonato.nome;
    document.title = `Artilheiros - ${campeonato.nome}`;
    conteudo.innerHTML = `<section class="cartao"><div class="cartao-corpo">${tabelaArtilheiros(lista)}</div></section>`;
  } catch (e) {
    conteudo.innerHTML = `<div class="vazio"><strong>Não deu para carregar</strong>${esc(e.message)}</div>`;
  }
})();
