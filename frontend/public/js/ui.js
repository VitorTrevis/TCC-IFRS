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

/* =====================================================================
   Substitutos de confirm()/prompt() nativos: viram uma caixa de dialogo
   feia (ou, em alguns embeds/iframes, nem funcionam — o navegador pode
   bloquear ou suprimir os dois). Um modal proprio funciona em qualquer
   lugar e segue o visual do resto do site. Cada funcao cria seu modal
   uma unica vez (na primeira chamada) e reaproveita nas seguintes.
   ===================================================================== */

let modalConfirmar;

/** Substitui `confirm()`. Uso: `if (!(await confirmarAcao('Excluir X?'))) return;` */
function confirmarAcao(mensagem, textoBotao = 'Confirmar') {
  if (!modalConfirmar) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal fade" id="modal-confirmar" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body pt-4" id="texto-modal-confirmar"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-danger" id="btn-ok-modal-confirmar"></button>
            </div>
          </div>
        </div>
      </div>`);
    modalConfirmar = new bootstrap.Modal(document.getElementById('modal-confirmar'));
  }
  document.getElementById('texto-modal-confirmar').textContent = mensagem;
  document.getElementById('btn-ok-modal-confirmar').textContent = textoBotao;

  return new Promise((resolve) => {
    const elModal = document.getElementById('modal-confirmar');
    const btnOk = document.getElementById('btn-ok-modal-confirmar');
    const finalizar = (resultado) => {
      btnOk.removeEventListener('click', aoConfirmar);
      elModal.removeEventListener('hidden.bs.modal', aoFechar);
      resolve(resultado);
    };
    const aoConfirmar = () => { finalizar(true); modalConfirmar.hide(); };
    const aoFechar = () => finalizar(false);
    btnOk.addEventListener('click', aoConfirmar);
    elModal.addEventListener('hidden.bs.modal', aoFechar);
    modalConfirmar.show();
  });
}

let modalPedirTexto;

/** Substitui `prompt()`. Devolve o texto (ou `null` se cancelado). */
function pedirTexto(mensagem, valorInicial = '', textoBotao = 'Salvar') {
  if (!modalPedirTexto) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal fade" id="modal-pedir-texto" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body pt-4">
              <label class="form-label" id="texto-modal-pedir" for="campo-modal-pedir"></label>
              <input class="form-control" id="campo-modal-pedir">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btn-ok-modal-pedir"></button>
            </div>
          </div>
        </div>
      </div>`);
    modalPedirTexto = new bootstrap.Modal(document.getElementById('modal-pedir-texto'));
  }
  const campo = document.getElementById('campo-modal-pedir');
  document.getElementById('texto-modal-pedir').textContent = mensagem;
  document.getElementById('btn-ok-modal-pedir').textContent = textoBotao;
  campo.value = valorInicial;

  return new Promise((resolve) => {
    const elModal = document.getElementById('modal-pedir-texto');
    const btnOk = document.getElementById('btn-ok-modal-pedir');
    const finalizar = (resultado) => {
      btnOk.removeEventListener('click', aoConfirmar);
      campo.removeEventListener('keydown', aoTeclar);
      elModal.removeEventListener('hidden.bs.modal', aoFechar);
      resolve(resultado);
    };
    const aoConfirmar = () => { finalizar(campo.value.trim() || null); modalPedirTexto.hide(); };
    const aoTeclar = (e) => { if (e.key === 'Enter') aoConfirmar(); };
    const aoFechar = () => finalizar(null);
    btnOk.addEventListener('click', aoConfirmar);
    campo.addEventListener('keydown', aoTeclar);
    elModal.addEventListener('hidden.bs.modal', aoFechar);
    modalPedirTexto.show();
    setTimeout(() => campo.focus(), 300);
  });
}

/** Monta a barra superior de acordo com o papel da sessao (admin, aluno ou visitante). */
function montarTopo(ativo = '') {
  const alvo = document.getElementById('topo');
  if (!alvo) return;

  let areaConta = `<a class="btn btn-sm btn-outline-light" href="login.html">Entrar</a>`;
  if (Sessao.ehAdmin) {
    areaConta = `<span class="text-white-50 small d-none d-lg-inline">${esc(Sessao.nomeAdmin || 'Coordenacao')}</span>
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

  const linkHistorico = Sessao.ehAdmin
    ? `<li class="nav-item"><a class="nav-link ${ativo === 'historico' ? 'ativo' : ''}" href="historico.html">Historico</a></li>`
    : '';

  alvo.innerHTML = `
    <nav class="navbar navbar-expand-lg topo">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
          <img src="img/ifrs-marca.svg" alt="" width="26" height="26" class="marca-if">
          <span class="marca-texto">
            Campeonatos<span>.</span>
            <small>Instituto Federal &middot; Campus Farroupilha</small>
          </span>
        </a>
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
            ${linkHistorico}
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

/** Classe visual da posicao: quando o campeonato define quantos avancam, o
 *  destaque marca os classificados; sem isso, marca o podio (1o, 2o, 3o). */
function classePosicao(posicao, classificados) {
  if (classificados) return posicao <= classificados ? 'classificado' : '';
  return posicao <= 3 ? `podio-${posicao}` : '';
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
            <tr class="${l.posicao === 1 ? 'lider' : ''}">
              <td><span class="posicao ${classePosicao(l.posicao, classificados)}">${l.posicao}</span></td>
              <td>${esc(l.nome)}</td>
              <td class="destaque">${l.pontos}</td>
              <td>${l.jogos}</td><td>${l.vitorias}</td><td>${l.empates}</td><td>${l.derrotas}</td>
              <td class="d-none d-sm-table-cell">${l.gols_pro}</td>
              <td class="d-none d-sm-table-cell">${l.gols_contra}</td>
              <td>${l.saldo > 0 ? '+' : ''}${l.saldo}</td>
              <td class="d-none d-md-table-cell">
                ${l.aproveitamento}%
                <span class="barra-aproveitamento"><i style="width:${l.aproveitamento}%"></i></span>
              </td>
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
            <tr class="${l.posicao === 1 ? 'lider' : ''}">
              <td><span class="posicao ${l.posicao <= 3 ? `podio-${l.posicao}` : ''}">${l.posicao}</span></td>
              <td>${esc(l.nome)}${l.numero !== null && l.numero !== undefined ? ` <span class="text-muted small">#${l.numero}</span>` : ''}</td>
              <td class="text-start">${esc(l.time)}</td>
              <td class="destaque">${l.gols}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/** Bloco de carregamento com o simbolo da marca (circulo + quadrados). */
function carregador(texto = 'Carregando...') {
  return `<div class="text-center py-5">
    <div class="carregando" role="status" aria-label="${esc(texto)}">
      <i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="sobrancelha">${esc(texto)}</div>
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

/* =====================================================================
   Micro-interacoes compartilhadas por todas as telas.
   As paginas montam o HTML por JavaScript depois do fetch, entao um
   MutationObserver percebe o conteudo novo e aplica revelacao e contadores
   sozinho — nenhuma tela precisa chamar nada.
   ===================================================================== */

const SEM_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ALVOS_REVELAR = '.capa, .cartao, .cartao-campeonato, .vazio';

const observadorRevelar = SEM_MOVIMENTO ? null : new IntersectionObserver((entradas, observador) => {
  let atraso = 0;
  for (const entrada of entradas) {
    if (!entrada.isIntersecting) continue;
    entrada.target.style.transitionDelay = `${Math.min(atraso, 240)}ms`;
    entrada.target.classList.add('visivel');
    observador.unobserve(entrada.target);
    atraso += 60;
  }
}, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

function prepararRevelacao(raiz = document) {
  if (!observadorRevelar) return;
  for (const alvo of raiz.querySelectorAll(ALVOS_REVELAR)) {
    if (alvo.dataset.revelar) continue;
    // Quem esta dentro de um container escondido (aba fechada, passo do login
    // ainda nao aberto) nunca dispara o observador — ficaria invisivel para
    // sempre. Esses aparecem normalmente, so sem a animacao de entrada.
    if (!alvo.getClientRects().length) continue;
    alvo.dataset.revelar = '1';
    alvo.classList.add('revelar');
    observadorRevelar.observe(alvo);
  }
}

/** Numeros que sobem de 0 ate o valor final (`data-contar="12"`). */
function animarContadores(raiz = document) {
  for (const alvo of raiz.querySelectorAll('[data-contar]')) {
    if (alvo.dataset.contado) continue;
    alvo.dataset.contado = '1';

    const final = Number(alvo.dataset.contar);
    if (!Number.isFinite(final)) continue;
    const casas = (alvo.dataset.contar.split('.')[1] || '').length;

    if (SEM_MOVIMENTO || final === 0) { alvo.textContent = final.toFixed(casas); continue; }

    const inicio = performance.now();
    const passo = (agora) => {
      const fracao = Math.min((agora - inicio) / 700, 1);
      alvo.textContent = (final * (1 - Math.pow(1 - fracao, 3))).toFixed(casas);
      if (fracao < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
}

/** Ondulacao a partir do ponto clicado, como retorno tatil do botao. */
document.addEventListener('click', (evento) => {
  if (SEM_MOVIMENTO) return;
  const botao = evento.target.closest('.btn:not(.btn-link)');
  if (!botao) return;

  const area = botao.getBoundingClientRect();
  const tamanho = Math.max(area.width, area.height);
  const onda = document.createElement('span');
  onda.className = 'ondulacao';
  onda.style.width = onda.style.height = `${tamanho}px`;
  onda.style.left = `${evento.clientX - area.left - tamanho / 2}px`;
  onda.style.top = `${evento.clientY - area.top - tamanho / 2}px`;
  botao.appendChild(onda);
  setTimeout(() => onda.remove(), 600);
});

/** Abas do Bootstrap comecam escondidas (display:none). Ao abrir, libera o
 *  que ja tiver sido marcado antes de esconder e dispara os contadores. */
document.addEventListener('shown.bs.tab', (evento) => {
  const painel = document.querySelector(evento.target.dataset.bsTarget || '');
  if (!painel) return;
  for (const alvo of painel.querySelectorAll('.revelar:not(.visivel)')) alvo.classList.add('visivel');
  animarContadores(painel);
});

document.addEventListener('shown.bs.modal', (evento) => {
  for (const alvo of evento.target.querySelectorAll('.revelar:not(.visivel)')) alvo.classList.add('visivel');
});

/* Os contadores trocam textContent a cada quadro, o que por si so ja e uma
   mutacao — sem juntar as chamadas, o observador varreria a pagina 60x por
   segundo enquanto os numeros sobem. */
let varreduraAgendada = false;
new MutationObserver(() => {
  if (varreduraAgendada) return;
  varreduraAgendada = true;
  requestAnimationFrame(() => {
    varreduraAgendada = false;
    prepararRevelacao();
    animarContadores();
  });
}).observe(document.body, { childList: true, subtree: true });

const atualizarRolagem = () => document.body.classList.toggle('rolou', window.scrollY > 40);
window.addEventListener('scroll', atualizarRolagem, { passive: true });
atualizarRolagem();

const voltarTopo = document.createElement('button');
voltarTopo.type = 'button';
voltarTopo.className = 'voltar-topo';
voltarTopo.setAttribute('aria-label', 'Voltar ao topo');
voltarTopo.innerHTML = '&uarr;';
voltarTopo.onclick = () => window.scrollTo({ top: 0, behavior: SEM_MOVIMENTO ? 'auto' : 'smooth' });
document.body.appendChild(voltarTopo);

prepararRevelacao();
animarContadores();
