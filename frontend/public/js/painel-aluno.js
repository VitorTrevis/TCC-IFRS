if (!Sessao.ehAluno) {
  location.href = 'login.html';
}

montarTopo('painel');

const el = (i) => document.getElementById(i);

function cabecalho(dados) {
  const aluno = Sessao.aluno;
  const media = dados.totalPartidas ? (dados.totalGols / dados.totalPartidas).toFixed(1) : '0.0';

  const numero = (valor, rotulo) => `
    <div class="capa-numero">
      <b data-contar="${valor}">0</b>
      <span>${rotulo}</span>
    </div>`;

  return `
    <section class="capa">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <span class="avatar avatar-g" aria-hidden="true">${esc(iniciais(aluno?.nome))}</span>
        <div>
          <div class="sobrancelha">Meu painel</div>
          <h1 class="mb-1">${esc(aluno?.nome || '')}<span class="ponto">.</span></h1>
        </div>
      </div>
      <p class="mb-0">Seu desempenho nos campeonatos da escola, atualizado a cada placar lançado.</p>
      <div class="capa-numeros">
        ${numero(dados.totalGols, dados.totalGols === 1 ? 'gol no total' : 'gols no total')}
        ${numero(dados.totalPartidas, dados.totalPartidas === 1 ? 'partida' : 'partidas')}
        ${numero(dados.porCampeonato.length, dados.porCampeonato.length === 1 ? 'campeonato' : 'campeonatos')}
        ${numero(media, 'gols por jogo')}
      </div>
      <div class="capa-marca-agua" aria-hidden="true">${icone('medalha')}</div>
    </section>`;
}

function estatisticas(dados) {
  if (!dados.totalPartidas) {
    return `<div class="vazio">
      <strong>Você ainda não aparece em nenhuma partida</strong>
      Assim que a coordenação vincular você a um time e lançar os placares,
      seu desempenho aparece aqui.
    </div>`;
  }

  const melhor = dados.partidas.reduce((m, p) => (p.meus_gols > (m?.meus_gols || 0) ? p : m), null);
  const destaque = melhor && melhor.meus_gols > 0 ? `
    <div class="destaque-cartao mb-3">
      <span class="icone-destaque" aria-hidden="true">${icone('estrela')}</span>
      <div>
        <div class="sobrancelha">Sua melhor partida</div>
        <b>${melhor.meus_gols} ${melhor.meus_gols === 1 ? 'gol' : 'gols'} em ${esc(melhor.time_a)} ${melhor.gols_a} x ${melhor.gols_b} ${esc(melhor.time_b)}</b>
        <div class="text-muted small">${esc(melhor.campeonato)}</div>
      </div>
    </div>` : '';

  const maiorGols = Math.max(1, ...dados.porCampeonato.map((c) => c.gols));
  const porCampeonato = `
    <section class="cartao mb-3">
      <div class="cartao-cabecalho">
        <h2 class="h6 mb-0">Resumo por campeonato</h2>
        <span class="sobrancelha">gols por campeonato</span>
      </div>
      <div class="cartao-corpo">
        ${dados.porCampeonato.map((c) => `
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-baseline gap-2 mb-1">
              <span class="fw-semibold">${esc(c.campeonato)}</span>
              <span class="text-muted small">${c.partidas} ${c.partidas === 1 ? 'partida' : 'partidas'} &middot; média ${(c.gols / c.partidas).toFixed(1)}</span>
            </div>
            <div class="barra-gols">
              <span class="trilho"><i style="width:${Math.round((c.gols / maiorGols) * 100)}%"></i></span>
              <b>${c.gols}</b>
            </div>
          </div>`).join('')}
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
          <div class="jogo ${p.meus_gols ? 'meu-gol' : ''}">
            <div class="jogo-time casa">${esc(p.time_a)}</div>
            <div class="chip-placar">${p.gols_a} : ${p.gols_b}</div>
            <div class="jogo-time visitante">${esc(p.time_b)}</div>
            <div class="jogo-marcadores">
              ${esc(p.campeonato)}${p.rodada ? ` &middot; rodada ${p.rodada}` : ''}
              ${p.fase && p.fase !== 'grupos' ? ` &middot; ${esc(FASES[p.fase] || p.fase)}` : ''}
              ${p.meus_gols
                ? ` &middot; <strong style="color:var(--quadra)">${icone('bola')} você marcou ${p.meus_gols} ${p.meus_gols === 1 ? 'gol' : 'gols'}</strong>`
                : ' &middot; sem gols seus nesta partida'}
            </div>
          </div>`).join('')}
      </div>
    </section>`;

  return destaque + porCampeonato + jogos;
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
            <div class="d-flex align-items-center gap-2">
              <span class="selo-modalidade" aria-hidden="true">${iconeModalidade(c.modalidade)}</span>
              <div class="sobrancelha">${esc(c.modalidade)}</div>
            </div>
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
    el('cabecalho').innerHTML = `<div class="vazio"><strong>Não deu para carregar</strong>${esc(e.message)}</div>`;
  }
})();
