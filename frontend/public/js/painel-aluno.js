if (!Sessao.ehAluno) {
  location.href = 'login.html';
}

montarTopo('painel');

const el = (i) => document.getElementById(i);

function cabecalho(dados) {
  const aluno = Sessao.aluno;
  return `
    <div class="sobrancelha">Meu painel</div>
    <h1 class="mb-3">${esc(aluno?.nome || '')}</h1>
    <div class="row g-3">
      <div class="col-6 col-md-3">
        <div class="cartao"><div class="cartao-corpo text-center py-3">
          <div class="chip-placar d-inline-block">${dados.totalGols}</div>
          <div class="sobrancelha mt-2">${dados.totalGols === 1 ? 'gol' : 'gols'} no total</div>
        </div></div>
      </div>
      <div class="col-6 col-md-3">
        <div class="cartao"><div class="cartao-corpo text-center py-3">
          <div class="chip-placar d-inline-block">${dados.totalPartidas}</div>
          <div class="sobrancelha mt-2">${dados.totalPartidas === 1 ? 'partida' : 'partidas'}</div>
        </div></div>
      </div>
      <div class="col-6 col-md-3">
        <div class="cartao"><div class="cartao-corpo text-center py-3">
          <div class="chip-placar d-inline-block">${dados.porCampeonato.length}</div>
          <div class="sobrancelha mt-2">${dados.porCampeonato.length === 1 ? 'campeonato' : 'campeonatos'}</div>
        </div></div>
      </div>
      <div class="col-6 col-md-3">
        <div class="cartao"><div class="cartao-corpo text-center py-3">
          <div class="chip-placar d-inline-block">${dados.totalPartidas ? (dados.totalGols / dados.totalPartidas).toFixed(1) : '0.0'}</div>
          <div class="sobrancelha mt-2">gols por jogo</div>
        </div></div>
      </div>
    </div>`;
}

function estatisticas(dados) {
  if (!dados.totalPartidas) {
    return `<div class="vazio">
      <strong>Voce ainda nao aparece em nenhuma partida</strong>
      Assim que a coordenacao vincular voce a um time e lancar os placares,
      seu desempenho aparece aqui.
    </div>`;
  }

  const porCampeonato = `
    <section class="cartao mb-3">
      <div class="cartao-cabecalho"><h2 class="h6 mb-0">Resumo por campeonato</h2></div>
      <div class="cartao-corpo">
        <div class="table-responsive">
          <table class="tabela-classificacao">
            <thead><tr><th class="text-start">Campeonato</th><th>Partidas</th><th>Gols</th><th class="d-none d-sm-table-cell">Media</th></tr></thead>
            <tbody>
              ${dados.porCampeonato.map((c) => `
                <tr>
                  <td class="text-start">${esc(c.campeonato)}</td>
                  <td>${c.partidas}</td>
                  <td class="destaque">${c.gols}</td>
                  <td class="d-none d-sm-table-cell">${(c.gols / c.partidas).toFixed(1)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>`;

  const jogos = `
    <section class="cartao">
      <div class="cartao-cabecalho">
        <h2 class="h6 mb-0">Jogo a jogo</h2>
        <span class="sobrancelha">seus gols em destaque</span>
      </div>
      <div class="cartao-corpo pt-2">
        ${dados.partidas.map((p) => `
          <div class="jogo">
            <div class="jogo-time casa">${esc(p.time_a)}</div>
            <div class="chip-placar">${p.gols_a} : ${p.gols_b}</div>
            <div class="jogo-time visitante">${esc(p.time_b)}</div>
            <div class="jogo-marcadores">
              ${esc(p.campeonato)}${p.rodada ? ` &middot; rodada ${p.rodada}` : ''}
              ${p.fase && p.fase !== 'grupos' ? ` &middot; ${esc(FASES[p.fase] || p.fase)}` : ''}
              ${p.meus_gols
                ? ` &middot; <strong style="color:var(--quadra)">voce marcou ${p.meus_gols} ${p.meus_gols === 1 ? 'gol' : 'gols'}</strong>`
                : ' &middot; sem gols seus nesta partida'}
            </div>
          </div>`).join('')}
      </div>
    </section>`;

  return porCampeonato + jogos;
}

function listaCampeonatos(campeonatos) {
  if (!campeonatos.length) {
    return '<div class="vazio"><strong>Nenhum campeonato cadastrado ainda</strong></div>';
  }
  return `<div class="row g-3">
    ${campeonatos.map((c) => `
      <div class="col-md-6 col-xl-4">
        <a class="cartao-campeonato" href="campeonato.html?id=${c.id}">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="sobrancelha">${esc(c.modalidade)}</div>
            ${etiqueta(c.status)}
          </div>
          <h3>${esc(c.nome)}</h3>
          <div class="text-muted small">
            ${esc(FORMATOS[c.formato] || c.formato)} &middot;
            ${c.total_times} ${c.total_times === 1 ? 'time' : 'times'} &middot;
            ${c.total_partidas} ${c.total_partidas === 1 ? 'jogo' : 'jogos'}
          </div>
        </a>
      </div>`).join('')}
  </div>`;
}

(async () => {
  try {
    const [dados, campeonatos] = await Promise.all([
      api.minhasEstatisticas(), api.campeonatos()
    ]);
    el('cabecalho').innerHTML = cabecalho(dados);
    el('aba-estatisticas').innerHTML = estatisticas(dados);
    el('aba-campeonatos').innerHTML = listaCampeonatos(campeonatos);
  } catch (e) {
    if (e.status === 401) { location.href = 'login.html'; return; }
    el('cabecalho').innerHTML = `<div class="vazio"><strong>Nao deu para carregar</strong>${esc(e.message)}</div>`;
  }
})();
