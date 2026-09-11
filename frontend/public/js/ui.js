/* Funcoes de apoio compartilhadas por todas as telas. */

const FORMATOS = {
  pontos_corridos: 'Pontos corridos',
  mata_mata: 'Mata-mata',
  grupos_mata_mata: 'Grupos + mata-mata'
};

const FASES = {
  grupos: 'Fase de grupos',
  '32avos': '32 avos de final',
  '16avos': '16 avos de final',
  oitavas: 'Oitavas de final',
  quartas: 'Quartas de final',
  semi: 'Semifinal',
  final: 'Final'
};

const STATUS = {
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado'
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const parametro = (nome) => new URLSearchParams(location.search).get(nome);

function dataBR(valor) {
  if (!valor) return '';
  const d = new Date(valor.length <= 10 ? `${valor}T12:00:00` : valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('pt-BR');
}

function etiqueta(status) {
  return `<span class="etiqueta etiqueta-${esc(status)}">${esc(STATUS[status] || status)}</span>`;
}

/** Aviso flutuante. tipo: 'sucesso' | 'erro' | 'info' */
function avisar(mensagem, tipo = 'info') {
  let caixa = document.getElementById('avisos');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'avisos';
    document.body.appendChild(caixa);
  }
  const cores = { sucesso: 'success', erro: 'danger', info: 'secondary' };
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${cores[tipo] || 'secondary'} shadow-sm py-2 px-3 mb-2`;
  alerta.setAttribute('role', 'status');
  alerta.textContent = mensagem;
  caixa.appendChild(alerta);
  setTimeout(() => alerta.remove(), 4500);
}

/** Monta a barra superior de acordo com o papel da sessao (admin, aluno ou visitante). */
function montarTopo(ativo = '') {
  const alvo = document.getElementById('topo');
  if (!alvo) return;

  let areaConta = `<a class="btn btn-sm btn-outline-light" href="login.html">Entrar</a>`;
  if (Sessao.ehAdmin) {
    areaConta = `<span class="text-white-50 small d-none d-lg-inline">Coordenacao</span>
                 <button class="btn btn-sm btn-outline-light" id="btn-sair">Sair</button>`;
  } else if (Sessao.ehAluno) {
    const aluno = Sessao.aluno;
    areaConta = `<a class="text-white-50 small d-none d-lg-inline text-decoration-none" href="painel-aluno.html">${esc(aluno?.nome || '')}</a>
                 <button class="btn btn-sm btn-outline-light" id="btn-sair">Sair</button>`;
  }

  const linkPainel = Sessao.ehAluno
    ? `<li class="nav-item"><a class="nav-link ${ativo === 'painel' ? 'ativo' : ''}" href="painel-aluno.html">Meu painel</a></li>`
    : '';

  const linkAlunos = Sessao.ehAdmin
    ? `<li class="nav-item"><a class="nav-link ${ativo === 'alunos' ? 'ativo' : ''}" href="alunos-admin.html">Alunos</a></li>`
    : '';

  alvo.innerHTML = `
    <nav class="navbar navbar-expand-lg topo">
      <div class="container">
        <a class="navbar-brand" href="index.html">Campeonatos<span>.</span></a>
        <button class="navbar-toggler border-0 text-white" type="button"
                data-bs-toggle="collapse" data-bs-target="#menu" aria-label="Abrir menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menu">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <a class="nav-link ${ativo === 'inicio' ? 'ativo' : ''}" href="index.html">Campeonatos</a>
            </li>
            ${linkPainel}
            ${linkAlunos}
          </ul>
          <div class="d-flex align-items-center gap-2">${areaConta}</div>
        </div>
      </div>
    </nav>`;

  const sair = document.getElementById('btn-sair');
  if (sair) sair.onclick = () => { Sessao.sair(); location.href = 'index.html'; };
}

/** Uma linha de jogo no formato de placar. */
function linhaJogo(p, opcoes = {}) {
  const finalizada = p.status === 'finalizada';
  const bye = p.status === 'bye';

  const nome = (lado) => {
    const id = lado === 'a' ? p.id_time_a : p.id_time_b;
    const time = lado === 'a' ? p.time_a : p.time_b;
    const rotulo = lado === 'a' ? p.rotulo_a : p.rotulo_b;
    if (id) return { texto: time, definido: true };
    return { texto: rotulo === 'BYE' ? 'Sem adversario' : (rotulo || 'A definir'), definido: false };
  };

  const a = nome('a');
  const b = nome('b');
  const venceuA = finalizada && (p.gols_a > p.gols_b || (p.gols_a === p.gols_b && p.penaltis_a > p.penaltis_b));
  const venceuB = finalizada && (p.gols_b > p.gols_a || (p.gols_a === p.gols_b && p.penaltis_b > p.penaltis_a));

  let chip;
  if (finalizada) {
    const penaltis = (p.penaltis_a !== null && p.penaltis_a !== undefined)
      ? `<span class="penaltis">penaltis ${p.penaltis_a} x ${p.penaltis_b}</span>` : '';
    chip = `<div class="chip-placar">${p.gols_a} : ${p.gols_b}${penaltis}</div>`;
  } else if (bye) {
    chip = `<div class="chip-placar aberto">PASSOU DIRETO</div>`;
  } else {
    chip = `<div class="chip-placar aberto">${p.data ? esc(dataBR(p.data)) : 'A JOGAR'}</div>`;
  }

  const marcadores = (p.gols || []).length
    ? `<div class="jogo-marcadores">${p.gols.map((g) => `${esc(g.nome)} (${g.quantidade})`).join(' &middot; ')}</div>`
    : '';

  return `
    <div class="jogo">
      <div class="jogo-time casa ${a.definido ? '' : 'indefinido'} ${venceuA ? 'vencedor' : ''}">${esc(a.texto)}</div>
      ${chip}
      <div class="jogo-time visitante ${b.definido ? '' : 'indefinido'} ${venceuB ? 'vencedor' : ''}">${esc(b.texto)}</div>
      ${opcoes.marcadores === false ? '' : marcadores}
      ${opcoes.extra ? opcoes.extra(p) : ''}
    </div>`;
}

/** Agrupa partidas por fase e, dentro da fase de grupos, por rodada. */
function agruparPartidas(partidas) {
  const porFase = new Map();
  for (const p of partidas) {
    if (!porFase.has(p.fase)) porFase.set(p.fase, []);
    porFase.get(p.fase).push(p);
  }
  return porFase;
}

function tabelaClassificacao(linhas, classificados = 0) {
  if (!linhas.length) return '<div class="vazio">Nenhum time cadastrado ainda.</div>';
  return `
    <div class="table-responsive">
      <table class="tabela-classificacao">
        <thead>
          <tr>
            <th style="width:44px">#</th><th>Time</th>
            <th>P</th><th>J</th><th>V</th><th>E</th><th>D</th>
            <th class="d-none d-sm-table-cell">GP</th>
            <th class="d-none d-sm-table-cell">GC</th>
            <th>SG</th>
            <th class="d-none d-md-table-cell">%</th>
          </tr>
        </thead>
        <tbody>
          ${linhas.map((l) => `
            <tr>
              <td><span class="posicao ${classificados && l.posicao <= classificados ? 'classificado' : ''}">${l.posicao}</span></td>
              <td>${esc(l.nome)}</td>
              <td class="destaque">${l.pontos}</td>
              <td>${l.jogos}</td><td>${l.vitorias}</td><td>${l.empates}</td><td>${l.derrotas}</td>
              <td class="d-none d-sm-table-cell">${l.gols_pro}</td>
              <td class="d-none d-sm-table-cell">${l.gols_contra}</td>
              <td>${l.saldo > 0 ? '+' : ''}${l.saldo}</td>
              <td class="d-none d-md-table-cell">${l.aproveitamento}%</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function tabelaArtilheiros(linhas) {
  if (!linhas.length) {
    return `<div class="vazio"><strong>Nenhum gol registrado</strong>
      Os artilheiros aparecem assim que os placares forem lancados com os nomes dos marcadores.</div>`;
  }
  return `
    <div class="table-responsive">
      <table class="tabela-classificacao">
        <thead><tr><th style="width:44px">#</th><th>Jogador</th><th>Time</th><th>Gols</th></tr></thead>
        <tbody>
          ${linhas.map((l) => `
            <tr>
              <td><span class="posicao ${l.posicao <= 3 ? 'classificado' : ''}">${l.posicao}</span></td>
              <td>${esc(l.nome)}${l.numero !== null && l.numero !== undefined ? ` <span class="text-muted small">#${l.numero}</span>` : ''}</td>
              <td class="text-start">${esc(l.time)}</td>
              <td class="destaque">${l.gols}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/** Desenha a chave eliminatoria em colunas por fase. */
function desenharChave(partidas) {
  const fases = ['32avos', '16avos', 'oitavas', 'quartas', 'semi', 'final'];
  const presentes = fases.filter((f) => partidas.some((p) => p.fase === f));
  if (!presentes.length) return '';

  const lado = (p, qual) => {
    const id = qual === 'a' ? p.id_time_a : p.id_time_b;
    const nome = qual === 'a' ? p.time_a : p.time_b;
    const rotulo = qual === 'a' ? p.rotulo_a : p.rotulo_b;
    const gols = qual === 'a' ? p.gols_a : p.gols_b;
    const outros = qual === 'a' ? p.gols_b : p.gols_a;
    const pen = qual === 'a' ? p.penaltis_a : p.penaltis_b;
    const penOutro = qual === 'a' ? p.penaltis_b : p.penaltis_a;
    const venceu = p.status === 'finalizada' && (gols > outros || (gols === outros && pen > penOutro));
    const texto = id ? nome : (rotulo === 'BYE' ? 'Sem adversario' : (rotulo || 'A definir'));
    return `<div class="chave-lado ${id ? '' : 'indefinido'} ${venceu ? 'vencedor' : ''}">
        <span>${esc(texto)}</span><b>${p.status === 'finalizada' ? gols : ''}</b>
      </div>`;
  };

  return `<div class="chave">
    ${presentes.map((f) => `
      <div class="chave-coluna">
        <div class="sobrancelha">${esc(FASES[f] || f)}</div>
        ${partidas.filter((p) => p.fase === f)
          .sort((x, y) => x.ordem_chave - y.ordem_chave)
          .map((p) => `<div class="chave-jogo">${lado(p, 'a')}${lado(p, 'b')}</div>`).join('')}
      </div>`).join('')}
  </div>`;
}
