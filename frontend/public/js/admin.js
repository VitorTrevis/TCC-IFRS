const id = parametro('id');

if (!Sessao.ehAdmin) {
  location.href = `login.html?voltar=${encodeURIComponent(`admin-campeonato.html?id=${id}`)}`;
}

montarTopo();

let campeonato = null;
let times = [];
let partidas = [];
let modalPlacar;
let modalElenco;
let timeAberto = null;
let partidaAberta = null;

const el = (i) => document.getElementById(i);

// ---------------------------------------------------------------- cabecalho
function renderCabecalho() {
  el('cabecalho').innerHTML = `
    <section class="capa">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <div class="sobrancelha">${esc(campeonato.modalidade)} &middot; ${esc(FORMATOS[campeonato.formato] || campeonato.formato)}${campeonato.turno_returno ? ' &middot; ida e volta' : ''}</div>
          <h1 class="mb-2">${esc(campeonato.nome)}<span class="ponto">.</span></h1>
          ${etiqueta(campeonato.status)}
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <a class="btn btn-outline-light btn-sm" href="campeonato.html?id=${campeonato.id}" target="_blank" rel="noopener">Ver pagina publica</a>
          <button class="btn btn-outline-danger btn-sm" id="btn-excluir">Excluir campeonato</button>
        </div>
      </div>
    </section>`;

  el('btn-excluir').onclick = async () => {
    if (!(await confirmarAcao(`Excluir "${campeonato.nome}"? Times, jogos e placares vao junto.`, 'Excluir campeonato'))) return;
    try {
      await api.removerCampeonato(campeonato.id);
      location.href = 'index.html';
    } catch (e) { avisar(e.message, 'erro'); }
  };
}

// -------------------------------------------------------------------- times
function renderTimes() {
  el('contagem-times').textContent = `${times.length} ${times.length === 1 ? 'time' : 'times'}`;

  if (!times.length) {
    el('lista-times').innerHTML = `<div class="vazio"><strong>Nenhum time ainda</strong>
      Cadastre os times para poder gerar a tabela de jogos.</div>`;
    return;
  }

  el('lista-times').innerHTML = `<ul class="list-group list-group-flush">
    ${times.map((t) => `
      <li class="list-group-item d-flex justify-content-between align-items-center px-0">
        <div>
          <div class="fw-semibold">${esc(t.nome)}${t.grupo ? ` <span class="sobrancelha">grupo ${esc(t.grupo)}</span>` : ''}</div>
          <div class="text-muted small">${t.total_jogadores} ${t.total_jogadores === 1 ? 'jogador' : 'jogadores'}</div>
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary" data-elenco="${t.id}">Elenco</button>
          <button class="btn btn-sm btn-outline-secondary" data-renomear="${t.id}" aria-label="Renomear ${esc(t.nome)}">Renomear</button>
          <button class="btn btn-sm btn-outline-danger" data-excluir-time="${t.id}" aria-label="Excluir ${esc(t.nome)}">&times;</button>
        </div>
      </li>`).join('')}
  </ul>`;

  el('lista-times').querySelectorAll('[data-elenco]').forEach((b) => {
    b.onclick = () => abrirElenco(Number(b.dataset.elenco));
  });
  el('lista-times').querySelectorAll('[data-renomear]').forEach((b) => {
    b.onclick = async () => {
      const time = times.find((t) => t.id === Number(b.dataset.renomear));
      const nome = await pedirTexto('Novo nome do time:', time.nome);
      if (!nome) return;
      try { await api.editarTime(time.id, { nome }); await recarregar(); }
      catch (e) { avisar(e.message, 'erro'); }
    };
  });
  el('lista-times').querySelectorAll('[data-excluir-time]').forEach((b) => {
    b.onclick = async () => {
      const time = times.find((t) => t.id === Number(b.dataset.excluirTime));
      if (!(await confirmarAcao(`Excluir o time "${time.nome}"?`, 'Excluir time'))) return;
      try { await api.removerTime(time.id); await recarregar(); }
      catch (e) { avisar(e.message, 'erro'); }
    };
  });
}

el('btn-add-time').onclick = async () => {
  const campo = el('novo-time');
  const nome = campo.value.trim();
  if (!nome) { avisar('Escreva o nome do time.', 'erro'); campo.focus(); return; }
  try {
    await api.criarTime(campeonato.id, { nome });
    campo.value = '';
    campo.focus();
    await recarregar();
  } catch (e) { avisar(e.message, 'erro'); }
};
el('novo-time').addEventListener('keydown', (e) => { if (e.key === 'Enter') el('btn-add-time').click(); });

// ------------------------------------------------------------------ elencos
let alunosCadastrados = []; // cache para o autocomplete do modal de elenco

async function carregarAlunosCadastrados() {
  try {
    alunosCadastrados = await api.listarAlunosAdmin();
    el('lista-alunos-cadastrados').innerHTML = alunosCadastrados
      .map((a) => `<option value="${esc(a.nome)}"></option>`).join('');
  } catch {
    alunosCadastrados = [];
  }
}

/** Resolve o texto do campo "aluno" em { id_aluno } ou { aluno_novo_nome }, ou {} se vazio. */
function resolverCampoAluno() {
  const texto = el('novo-aluno').value.trim();
  if (!texto) return {};
  const normalizar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const existente = alunosCadastrados.find((a) => normalizar(a.nome) === normalizar(texto));
  return existente ? { id_aluno: existente.id } : { aluno_novo_nome: texto };
}

async function abrirElenco(idTime) {
  timeAberto = times.find((t) => t.id === idTime);
  el('titulo-elenco').textContent = `Elenco - ${timeAberto.nome}`;
  modalElenco = modalElenco || new bootstrap.Modal(el('modal-elenco'));
  modalElenco.show();
  await carregarAlunosCadastrados();
  await listarJogadores();
}

async function listarJogadores() {
  const jogadores = await api.jogadores(timeAberto.id);
  el('lista-jogadores').innerHTML = jogadores.length
    ? `<ul class="list-group list-group-flush">
        ${jogadores.map((j) => `
          <li class="list-group-item d-flex justify-content-between align-items-center px-0">
            <span>${j.numero !== null ? `<span class="posicao me-2">${j.numero}</span>` : ''}${esc(j.nome)}
              ${j.aluno_nome ? `<span class="etiqueta etiqueta-em_andamento ms-2">conta: ${esc(j.aluno_nome)}</span>` : ''}
              ${j.gols ? `<span class="text-muted small ms-2">${j.gols} ${j.gols === 1 ? 'gol' : 'gols'}</span>` : ''}</span>
            <button class="btn btn-sm btn-outline-danger" data-excluir-jogador="${j.id}" aria-label="Excluir ${esc(j.nome)}">&times;</button>
          </li>`).join('')}
      </ul>`
    : '<div class="vazio">Nenhum jogador cadastrado neste time.</div>';

  el('lista-jogadores').querySelectorAll('[data-excluir-jogador]').forEach((b) => {
    b.onclick = async () => {
      try {
        await api.removerJogador(Number(b.dataset.excluirJogador));
        await listarJogadores();
        await recarregar(false);
      } catch (e) { avisar(e.message, 'erro'); }
    };
  });
}

el('btn-add-jogador').onclick = async () => {
  const nome = el('novo-jogador').value.trim();
  const numero = el('novo-numero').value;
  if (!nome) { avisar('Escreva o nome do jogador.', 'erro'); return; }
  try {
    await api.criarJogador(timeAberto.id, {
      nome, numero: numero === '' ? null : Number(numero), ...resolverCampoAluno()
    });
    el('novo-jogador').value = '';
    el('novo-numero').value = '';
    el('novo-aluno').value = '';
    el('novo-jogador').focus();
    await carregarAlunosCadastrados();
    await listarJogadores();
    await recarregar(false);
  } catch (e) { avisar(e.message, 'erro'); }
};
el('novo-jogador').addEventListener('keydown', (e) => { if (e.key === 'Enter') el('btn-add-jogador').click(); });

// ------------------------------------------------------------------ partidas
el('btn-gerar').onclick = async () => {
  const jaTem = partidas.length > 0;
  if (jaTem && !(await confirmarAcao('Gerar a tabela de novo apaga todos os jogos e placares ja lancados. Continuar?', 'Gerar de novo'))) return;
  try {
    await api.gerarTabela(campeonato.id);
    avisar('Tabela de jogos gerada.', 'sucesso');
    await recarregar();
  } catch (e) { avisar(e.message, 'erro'); }
};

function renderPartidas() {
  el('btn-gerar').textContent = partidas.length ? 'Gerar tabela de novo' : 'Gerar tabela de jogos';

  if (!partidas.length) {
    el('lista-partidas').innerHTML = `<div class="vazio"><strong>Sem jogos ainda</strong>
      Cadastre os times e clique em "Gerar tabela de jogos".</div>`;
    el('secao-chave').classList.add('d-none');
    return;
  }

  const botao = (p) => {
    if (p.status === 'bye') return '';
    if (!p.id_time_a || !p.id_time_b) {
      return '<div class="jogo-marcadores">Aguardando a fase anterior</div>';
    }
    return `<div class="jogo-marcadores">
      <button class="btn btn-sm ${p.status === 'finalizada' ? 'btn-outline-secondary' : 'btn-primary'}"
              data-placar="${p.id}">
        ${p.status === 'finalizada' ? 'Editar placar' : 'Lancar placar'}
      </button></div>`;
  };

  const porFase = agruparPartidas(partidas);
  let html = '';
  for (const [fase, lista] of porFase) {
    const porChave = new Map();
    for (const p of lista) {
      const chave = fase === 'grupos'
        ? `${p.grupo ? `Grupo ${p.grupo} - ` : ''}Rodada ${p.rodada}`
        : (FASES[fase] || fase);
      if (!porChave.has(chave)) porChave.set(chave, []);
      porChave.get(chave).push(p);
    }
    for (const [titulo, ps] of porChave) {
      html += `<div class="sobrancelha mt-3 mb-1">${esc(titulo)}</div>
               ${ps.map((p) => linhaJogo(p, { extra: botao })).join('')}`;
    }
  }
  el('lista-partidas').innerHTML = html;

  el('lista-partidas').querySelectorAll('[data-placar]').forEach((b) => {
    b.onclick = () => abrirPlacar(Number(b.dataset.placar));
  });

  const chave = desenharChave(partidas);
  el('secao-chave').classList.toggle('d-none', !chave);
  if (chave) el('chave').innerHTML = chave;
}

// --------------------------------------------------------------- lancar placar
async function abrirPlacar(idPartida) {
  partidaAberta = partidas.find((p) => p.id === idPartida);
  const p = partidaAberta;

  const [jogadoresA, jogadoresB] = await Promise.all([
    api.jogadores(p.id_time_a), api.jogadores(p.id_time_b)
  ]);

  const golsAtuais = new Map((p.gols || []).map((g) => [g.id_jogador, g.quantidade]));
  const coluna = (nomeTime, jogadores, ladoId, golsIniciais) => `
    <div class="col-6">
      <div class="sobrancelha mb-1">${esc(nomeTime)}</div>
      <input class="form-control form-control-lg mb-2" type="number" min="0" max="999"
             id="placar-${ladoId}" value="${golsIniciais ?? 0}" aria-label="Gols de ${esc(nomeTime)}">
      ${jogadores.length ? jogadores.map((j) => `
        <div class="d-flex justify-content-between align-items-center gap-2 mb-1">
          <label class="small mb-0" for="jog-${j.id}">${j.numero !== null ? `#${j.numero} ` : ''}${esc(j.nome)}</label>
          <input class="form-control form-control-sm" style="width:64px" type="number" min="0" max="99"
                 id="jog-${j.id}" data-lado="${ladoId}" value="${golsAtuais.get(j.id) || 0}">
        </div>`).join('')
        : '<div class="text-muted small">Sem jogadores cadastrados. O placar funciona, mas nao entra na artilharia.</div>'}
    </div>`;

  const empateEliminatoria = p.fase !== 'grupos';
  el('titulo-placar').textContent = `${p.time_a} x ${p.time_b}`;
  el('corpo-placar').innerHTML = `
    <div class="row g-3">
      ${coluna(p.time_a, jogadoresA, 'a', p.gols_a)}
      ${coluna(p.time_b, jogadoresB, 'b', p.gols_b)}
    </div>
    ${empateEliminatoria ? `
      <div class="row g-3 mt-1 ${p.gols_a === p.gols_b && p.status === 'finalizada' ? '' : 'd-none'}" id="linha-penaltis">
        <div class="col-12"><div class="sobrancelha">Penaltis (obrigatorio em caso de empate)</div></div>
        <div class="col-6"><input class="form-control" type="number" min="0" id="pen-a"
             value="${p.penaltis_a ?? 0}" aria-label="Penaltis ${esc(p.time_a)}"></div>
        <div class="col-6"><input class="form-control" type="number" min="0" id="pen-b"
             value="${p.penaltis_b ?? 0}" aria-label="Penaltis ${esc(p.time_b)}"></div>
      </div>` : ''}
    <p class="text-muted small mt-3 mb-0">
      Ao marcar os gols de cada jogador o placar acima se ajusta sozinho.
      Gol contra: deixe os jogadores zerados e escreva o placar na mao.
    </p>`;

  // gols por jogador atualizam o placar do lado correspondente
  el('corpo-placar').querySelectorAll('[data-lado]').forEach((campo) => {
    campo.addEventListener('input', () => {
      const lado = campo.dataset.lado;
      const soma = [...el('corpo-placar').querySelectorAll(`[data-lado="${lado}"]`)]
        .reduce((t, c) => t + (Number(c.value) || 0), 0);
      const placar = el(`placar-${lado}`);
      if (soma > Number(placar.value)) placar.value = soma;
      alternarPenaltis();
    });
  });
  ['a', 'b'].forEach((lado) => el(`placar-${lado}`).addEventListener('input', alternarPenaltis));

  function alternarPenaltis() {
    const linha = el('linha-penaltis');
    if (!linha) return;
    const empate = Number(el('placar-a').value) === Number(el('placar-b').value);
    linha.classList.toggle('d-none', !empate);
  }

  el('btn-apagar-placar').classList.toggle('d-none', p.status !== 'finalizada');
  modalPlacar = modalPlacar || new bootstrap.Modal(el('modal-placar'));
  modalPlacar.show();
}

el('btn-salvar-placar').onclick = async () => {
  const p = partidaAberta;
  const gols = [...el('corpo-placar').querySelectorAll('[data-lado]')]
    .map((c) => ({ id_jogador: Number(c.id.replace('jog-', '')), quantidade: Number(c.value) || 0 }))
    .filter((g) => g.quantidade > 0);

  const corpo = {
    gols_a: Number(el('placar-a').value) || 0,
    gols_b: Number(el('placar-b').value) || 0,
    gols
  };
  if (el('pen-a') && !el('linha-penaltis').classList.contains('d-none')) {
    corpo.penaltis_a = Number(el('pen-a').value) || 0;
    corpo.penaltis_b = Number(el('pen-b').value) || 0;
  }

  try {
    await api.registrarResultado(p.id, corpo);
    modalPlacar.hide();
    avisar('Placar salvo. Classificacao atualizada.', 'sucesso');
    await recarregar();
  } catch (e) { avisar(e.message, 'erro'); }
};

el('btn-apagar-placar').onclick = async () => {
  if (!(await confirmarAcao('Apagar o resultado desta partida?', 'Apagar resultado'))) return;
  try {
    await api.apagarResultado(partidaAberta.id);
    modalPlacar.hide();
    await recarregar();
  } catch (e) { avisar(e.message, 'erro'); }
};

// -------------------------------------------------------------- classificacao
function renderClassificacao(blocos) {
  if (!blocos.length) {
    el('classificacao').innerHTML = '<div class="vazio">Mata-mata puro nao tem tabela de pontos.</div>';
    return;
  }
  const classificados = campeonato.formato === 'grupos_mata_mata' ? campeonato.classificados_grupo : 0;
  el('classificacao').innerHTML = blocos.map((b) => `
    ${b.grupo ? `<div class="sobrancelha mb-1">Grupo ${esc(b.grupo)}</div>` : ''}
    ${tabelaClassificacao(b.tabela, classificados)}`).join('<hr class="my-3">');
}

// ------------------------------------------------------------------ carregar
async function recarregar(tudo = true) {
  const [c, ts, ps, cl] = await Promise.all([
    api.campeonato(id), api.times(id), api.partidas(id), api.classificacao(id)
  ]);
  campeonato = c; times = ts; partidas = ps;
  if (tudo) renderCabecalho();
  renderTimes();
  renderPartidas();
  renderClassificacao(cl);
}

(async () => {
  if (!id) {
    document.querySelector('main').innerHTML =
      '<div class="vazio"><strong>Campeonato nao informado</strong>Volte para a lista de campeonatos.</div>';
    return;
  }
  try {
    await recarregar();
    document.title = `${campeonato.nome} - Painel`;
  } catch (e) {
    document.querySelector('main').innerHTML =
      `<div class="vazio"><strong>Nao deu para carregar</strong>${esc(e.message)}</div>`;
  }
})();
