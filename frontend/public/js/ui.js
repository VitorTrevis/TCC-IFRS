/* Funções de apoio compartilhadas por todas as telas. */

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

/* =====================================================================
   Ícones: SVG de traço em linha, herdam a cor do texto (`currentColor`).
   Sem biblioteca externa — são poucos e assim não pesam nem dependem de rede.
   ===================================================================== */

const ICONES = {
  futebol:   '<circle cx="12" cy="12" r="9"/><path d="M12 7l4.5 3.3-1.7 5.3H9.2L7.5 10.3z"/><path d="M12 3v4M7.5 10.3L4 8.5M16.5 10.3L20 8.5M9.2 15.6L7 19.5M14.8 15.6L17 19.5"/>',
  volei:     '<circle cx="12" cy="12" r="9"/><path d="M12 3c0 6-3 9-9 9M12 3c6 0 9 3 9 9M3.6 15.6c4.6-1.2 8.2-.6 11.6 3.9M20.4 8.6c-4 4.6-8.2 5.8-14.2 4.6"/>',
  basquete:  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3.2 3 3.2 9.8 0 12.8M18.4 5.6c-3.2 3-3.2 9.8 0 12.8"/>',
  handebol:  '<circle cx="12" cy="12" r="9"/><path d="M5.5 8.5c4.3 1.3 8.7 1.3 13 0M5.5 15.5c4.3-1.3 8.7-1.3 13 0M12 3c-3.2 3-3.2 15 0 18"/>',
  raquete:   '<ellipse cx="14" cy="9" rx="6" ry="7" transform="rotate(-30 14 9)"/><path d="M9.5 14.5L4 20M11 7l3 3M9 10l3 3M13 5l3 3"/>',
  corrida:   '<circle cx="15" cy="4" r="2"/><path d="M12 8l-4 3 3 3-3 6M12 8l3 2 3-1M11 14l4 2 1 5"/>',
  xadrez:    '<path d="M9 21h6M8 18h8l-1-3H9zM10 15V9l-2-3h8l-2 3v6M8 6h8"/>',
  trofeu:    '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M9 20h6M10 17h4"/>',
  bola:      '<circle cx="12" cy="12" r="9"/><path d="M12 7l4.5 3.3-1.7 5.3H9.2L7.5 10.3z"/><path d="M12 3v4M7.5 10.3L4 8.5M16.5 10.3L20 8.5M9.2 15.6L7 19.5M14.8 15.6L17 19.5"/>',
  medalha:   '<path d="M8 2l4 7 4-7"/><circle cx="12" cy="15" r="5"/><path d="M12 13v4M10.5 15h3"/>',
  coroa:     '<path d="M3 18h18l-2-9-4 4-3-6-3 6-4-4z"/>',
  mais:      '<path d="M12 5v14M5 12h14"/>',
  lapis:     '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/>',
  lixeira:   '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  lista:     '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  desfazer:  '<path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-1"/>',
  chave:     '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M15 8l3 3M17.5 5.5l2 2"/>',
  usuarios:  '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  usuario:   '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  fechar:    '<path d="M18 6L6 18M6 6l12 12"/>',
  link:      '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/>',
  externo:   '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
  check:     '<path d="M20 6L9 17l-5-5"/>',
  alerta:    '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info:      '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  olho:      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'olho-fechado': '<path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.1-6M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M1 1l22 22"/>',
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  relogio:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  historico: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
  raio:      '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  sair:      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  entrar:    '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  formatura: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c3 3 9 3 12 0v-4.5M22 10v6"/>',
  prancheta: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2h-2M9 14l2 2 4-4"/>',
  seta_cima: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  copiar:    '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  escudo:    '<path d="M12 2l8 3v6c0 5-3.5 9.2-8 11-4.5-1.8-8-6-8-11V5z"/>',
  apito:     '<path d="M9 9h6.5a4.5 4.5 0 1 1 0 9H9a4.5 4.5 0 0 1 0-9z"/><path d="M15 9l6-2.5V11M11 5v2M8 4.5l1 2"/>',
  grade:     '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  estrela:   '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  alvo:      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};

/** `<svg class="icone">` pronto para colar num template. */
function icone(nome, classe = '') {
  const tracos = ICONES[nome] || ICONES.bola;
  return `<svg class="icone ${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${tracos}</svg>`;
}

/** Descobre o ícone certo pelo nome da modalidade ("Vôlei de praia" -> volei). */
function chaveModalidade(modalidade) {
  const texto = String(modalidade || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/volei|voleibol/.test(texto)) return 'volei';
  if (/basquet/.test(texto)) return 'basquete';
  if (/hande/.test(texto)) return 'handebol';
  if (/tenis|badminton|raquete|ping|pingue/.test(texto)) return 'raquete';
  if (/atletismo|corrida|cross/.test(texto)) return 'corrida';
  if (/xadrez|dama/.test(texto)) return 'xadrez';
  if (/fut|soccer|society|queimada|bola/.test(texto)) return 'futebol';
  return 'trofeu';
}

const iconeModalidade = (modalidade, classe = '') => icone(chaveModalidade(modalidade), classe);

/** Iniciais de uma pessoa: "Vitor Trevisan" -> "VT". */
function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/** Sigla curta de um time: "1A Informática" -> "1A", "Turma 202" -> "202", "Os Leões" -> "OL". */
function iniciaisTime(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const curto = partes.find((p) => /^\d{1,3}[A-Za-z]?$/.test(p));
  if (curto) return curto.toUpperCase().slice(0, 3);
  return partes.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

/** "há 5 min", "ontem", "12/03/2026". Recebe um Date. */
function tempoRelativo(data) {
  const segundos = (Date.now() - data.getTime()) / 1000;
  if (segundos < 45) return 'agora mesmo';
  if (segundos < 3600) return `há ${Math.max(1, Math.floor(segundos / 60))} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  const dias = Math.floor(segundos / 86400);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return data.toLocaleDateString('pt-BR');
}

/** Dias inteiros até uma data 'YYYY-MM-DD' (negativo se já passou). */
function diasAte(iso) {
  if (!iso) return null;
  const alvo = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
}

/** Pílula "começa em N dias" para campeonatos ainda não iniciados. */
function pilulaContagem(campeonato) {
  if (campeonato.status !== 'planejado') return '';
  const dias = diasAte(campeonato.data_inicio);
  if (dias === null || dias < 0) return '';
  const texto = dias === 0 ? 'começa hoje' : dias === 1 ? 'começa amanhã' : `começa em ${dias} dias`;
  return `<span class="pilula-contagem">${icone('calendario')}${texto}</span>`;
}

function etiqueta(status) {
  return `<span class="etiqueta etiqueta-${esc(status)}">${esc(STATUS[status] || status)}</span>`;
}

/** Linhas cinzas piscando enquanto o conteúdo real não chega. */
function esqueleto(linhas = 4) {
  return `<div class="esqueleto-linhas" aria-hidden="true">${'<div class="esqueleto"></div>'.repeat(linhas)}</div>`;
}

/** Aviso flutuante. tipo: 'sucesso' | 'erro' | 'info' */
function avisar(mensagem, tipo = 'info') {
  let caixa = document.getElementById('avisos');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'avisos';
    caixa.setAttribute('aria-live', 'polite');
    document.body.appendChild(caixa);
  }
  const icones = { sucesso: 'check', erro: 'alerta', info: 'info' };
  const aviso = document.createElement('div');
  aviso.className = `aviso aviso-${icones[tipo] ? tipo : 'info'}`;
  aviso.setAttribute('role', 'status');
  aviso.innerHTML = `
    <span class="aviso-icone">${icone(icones[tipo] || 'info')}</span>
    <div class="aviso-texto"></div>
    <button type="button" class="aviso-fechar" aria-label="Fechar aviso">${icone('fechar')}</button>
    <span class="aviso-barra"></span>`;
  aviso.querySelector('.aviso-texto').textContent = mensagem;
  caixa.appendChild(aviso);

  let removido = false;
  const remover = () => {
    if (removido) return;
    removido = true;
    aviso.classList.add('saindo');
    // com animações desligadas o `animationend` nunca chega — remove direto
    setTimeout(() => aviso.remove(), SEM_MOVIMENTO ? 0 : 320);
  };
  aviso.querySelector('.aviso-fechar').onclick = remover;
  aviso.querySelector('.aviso-barra').addEventListener('animationend', remover);
  // rede de segurança para o caso de a animação da barra não rodar
  setTimeout(remover, SEM_MOVIMENTO ? 4500 : 9000);
}

/** Roda `fn` mostrando um giro no botão enquanto ela não termina. Evita
 *  clique duplo em "Salvar" e dá retorno visual em conexões lentas. */
async function comCarregamento(botao, fn) {
  if (!botao) return fn();
  if (botao.classList.contains('carregando')) return undefined;
  botao.style.minWidth = `${botao.offsetWidth}px`;
  botao.classList.add('carregando');
  botao.disabled = true;
  const giro = document.createElement('span');
  giro.className = 'btn-giro';
  botao.appendChild(giro);
  try {
    return await fn();
  } finally {
    giro.remove();
    botao.classList.remove('carregando');
    botao.disabled = false;
    botao.style.minWidth = '';
  }
}

/* =====================================================================
   Substitutos de confirm()/prompt() nativos: viram uma caixa de diálogo
   feia (ou, em alguns embeds/iframes, nem funcionam — o navegador pode
   bloquear ou suprimir os dois). Um modal próprio funciona em qualquer
   lugar e segue o visual do resto do site. Cada função cria seu modal
   uma única vez (na primeira chamada) e reaproveita nas seguintes.
   ===================================================================== */

let modalConfirmar;

/** Substitui `confirm()`. Uso: `if (!(await confirmarAcao('Excluir X?'))) return;` */
function confirmarAcao(mensagem, textoBotao = 'Confirmar') {
  if (!modalConfirmar) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal fade" id="modal-confirmar" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body pt-4 d-flex gap-3 align-items-start">
              <span class="aviso-icone" style="background:linear-gradient(135deg,#F04B3E,var(--perigo))">${icone('alerta')}</span>
              <div id="texto-modal-confirmar" class="pt-1"></div>
            </div>
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
    setTimeout(() => { campo.focus(); campo.select(); }, 300);
  });
}

/** Monta a barra superior de acordo com o papel da sessão (admin, aluno ou visitante). */
function montarTopo(ativo = '') {
  const alvo = document.getElementById('topo');
  if (!alvo) return;

  let areaConta = `<a class="btn btn-sm btn-outline-light" href="login.html">${icone('entrar')}Entrar</a>`;
  if (Sessao.ehAdmin) {
    const nome = Sessao.nomeAdmin || 'Coordenação';
    areaConta = `<span class="conta-topo d-none d-lg-inline-flex" title="${esc(nome)}">
                   <span class="avatar">${esc(iniciais(nome))}</span>${esc(nome)}
                 </span>
                 <button class="btn btn-sm btn-outline-light" id="btn-sair">${icone('sair')}Sair</button>`;
  } else if (Sessao.ehAluno) {
    const aluno = Sessao.aluno;
    areaConta = `<a class="conta-topo d-none d-lg-inline-flex" href="painel-aluno.html" title="Meu painel">
                   <span class="avatar">${esc(iniciais(aluno?.nome))}</span>${esc(aluno?.nome || '')}
                 </a>
                 <button class="btn btn-sm btn-outline-light" id="btn-sair">${icone('sair')}Sair</button>`;
  }

  const item = (chave, href, rotulo, nomeIcone) =>
    `<li class="nav-item"><a class="nav-link ${ativo === chave ? 'ativo' : ''}" href="${href}">${icone(nomeIcone)}${rotulo}</a></li>`;

  const linkPainel = Sessao.ehAluno ? item('painel', 'painel-aluno.html', 'Meu painel', 'medalha') : '';
  const linkAlunos = Sessao.ehAdmin ? item('alunos', 'alunos-admin.html', 'Alunos', 'usuarios') : '';
  const linkHistorico = Sessao.ehAdmin ? item('historico', 'historico.html', 'Histórico', 'historico') : '';

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
            ${item('inicio', 'index.html', 'Campeonatos', 'trofeu')}
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

/** Rodapé padrão, o mesmo em todas as telas. Só cria se a página ainda não tiver um. */
function montarRodape() {
  if (document.querySelector('.rodape')) return;
  const rodape = document.createElement('footer');
  rodape.className = 'rodape';
  rodape.innerHTML = `
    <div class="container">
      <div class="rodape-marca">
        <img src="img/ifrs-marca.svg" alt="">
        <div>Campeonatos Escolares<small>Instituto Federal &middot; Campus Farroupilha</small></div>
      </div>
      <div>
        <a href="index.html">${icone('trofeu')} Campeonatos</a>
        <a href="login.html">${icone('entrar')} Entrar</a>
      </div>
    </div>`;
  document.body.appendChild(rodape);
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
    return { texto: rotulo === 'BYE' ? 'Sem adversário' : (rotulo || 'A definir'), definido: false };
  };

  const a = nome('a');
  const b = nome('b');
  const venceuA = finalizada && (p.gols_a > p.gols_b || (p.gols_a === p.gols_b && p.penaltis_a > p.penaltis_b));
  const venceuB = finalizada && (p.gols_b > p.gols_a || (p.gols_a === p.gols_b && p.penaltis_b > p.penaltis_a));

  let chip;
  if (finalizada) {
    const penaltis = (p.penaltis_a !== null && p.penaltis_a !== undefined)
      ? `<span class="penaltis">pênaltis ${p.penaltis_a} x ${p.penaltis_b}</span>` : '';
    chip = `<div class="chip-placar">${p.gols_a} : ${p.gols_b}${penaltis}</div>`;
  } else if (bye) {
    chip = `<div class="chip-placar aberto">PASSOU DIRETO</div>`;
  } else {
    chip = `<div class="chip-placar aberto">${p.data ? esc(dataBR(p.data)) : 'A JOGAR'}</div>`;
  }

  const marcadores = (p.gols || []).length
    ? `<div class="jogo-marcadores">${icone('bola')} ${p.gols.map((g) => `${esc(g.nome)} (${g.quantidade})`).join(' &middot; ')}</div>`
    : '';

  return `
    <div class="jogo ${opcoes.classe || ''}">
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

/** Classe visual da posição: quando o campeonato define quantos avançam, o
 *  destaque marca os classificados; sem isso, marca o pódio (1º, 2º, 3º). */
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
              <td><span class="escudo-inicial">${esc(iniciaisTime(l.nome))}</span>${esc(l.nome)}${l.posicao === 1 && l.jogos > 0 ? icone('coroa', 'coroa') : ''}</td>
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
      Os artilheiros aparecem assim que os placares forem lançados com os nomes dos marcadores.</div>`;
  }
  return `
    <div class="table-responsive">
      <table class="tabela-classificacao">
        <thead><tr><th style="width:44px">#</th><th>Jogador</th><th>Time</th><th>Gols</th></tr></thead>
        <tbody>
          ${linhas.map((l) => `
            <tr class="${l.posicao === 1 ? 'lider' : ''}">
              <td><span class="posicao ${l.posicao <= 3 ? `podio-${l.posicao}` : ''}">${l.posicao}</span></td>
              <td>${esc(l.nome)}${l.numero !== null && l.numero !== undefined ? ` <span class="text-muted small">#${l.numero}</span>` : ''}${l.posicao === 1 ? icone('coroa', 'coroa') : ''}</td>
              <td class="text-start"><span class="escudo-inicial">${esc(iniciaisTime(l.time))}</span>${esc(l.time)}</td>
              <td class="destaque">${l.gols}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/** Bloco de carregamento com o símbolo da marca (círculo + quadrados). */
function carregador(texto = 'Carregando...') {
  return `<div class="text-center py-5">
    <div class="carregando" role="status" aria-label="${esc(texto)}">
      <i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="sobrancelha">${esc(texto)}</div>
  </div>`;
}

/** Nome do campeão a partir da final da chave (ou null enquanto não houver). */
function campeaoDaChave(partidas) {
  const final = partidas.find((p) => p.fase === 'final');
  if (!final) return null;
  if (final.status === 'finalizada') {
    const venceuA = final.gols_a > final.gols_b || (final.gols_a === final.gols_b && final.penaltis_a > final.penaltis_b);
    return venceuA ? final.time_a : final.time_b;
  }
  if (final.status === 'bye') return final.time_a || final.time_b || null;
  return null;
}

/** Desenha a chave eliminatória em colunas por fase, com o campeão no fim. */
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
    const texto = id ? nome : (rotulo === 'BYE' ? 'Sem adversário' : (rotulo || 'A definir'));
    return `<div class="chave-lado ${id ? '' : 'indefinido'} ${venceu ? 'vencedor' : ''}">
        <span>${esc(texto)}</span><b>${p.status === 'finalizada' ? gols : ''}</b>
      </div>`;
  };

  const campeao = campeaoDaChave(partidas);

  return `<div class="chave">
    ${presentes.map((f) => `
      <div class="chave-coluna">
        <div class="sobrancelha">${esc(FASES[f] || f)}</div>
        <div class="chave-jogos">
          ${partidas.filter((p) => p.fase === f)
            .sort((x, y) => x.ordem_chave - y.ordem_chave)
            .map((p) => `<div class="chave-jogo ${p.status === 'finalizada' || p.status === 'bye' ? 'decidida' : ''}">${lado(p, 'a')}${lado(p, 'b')}</div>`).join('')}
        </div>
      </div>`).join('')}
    <div class="chave-coluna">
      <div class="sobrancelha">Campeão</div>
      <div class="chave-jogos">
        <div class="chave-campeao ${campeao ? 'definido' : ''}">
          <span class="trofeu">${icone('trofeu')}</span>
          ${campeao ? `<b>${esc(campeao)}</b>` : '<span>A definir</span>'}
        </div>
      </div>
    </div>
  </div>`;
}

/** Chuva de confete nas cores da marca. Some sozinha depois de alguns segundos. */
function soltarConfete(duracao = 2800) {
  if (SEM_MOVIMENTO) return;
  const tela = document.createElement('canvas');
  tela.className = 'confete';
  tela.width = window.innerWidth;
  tela.height = window.innerHeight;
  document.body.appendChild(tela);
  const ctx = tela.getContext('2d');

  const cores = ['#84BD00', '#DA291C', '#567B00', '#FFFFFF', '#B8E356', '#1B3A16'];
  const pecas = Array.from({ length: 150 }, () => ({
    x: Math.random() * tela.width,
    y: -20 - Math.random() * tela.height * 0.6,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    cor: cores[Math.floor(Math.random() * cores.length)],
    vx: -1.2 + Math.random() * 2.4,
    vy: 2.2 + Math.random() * 3.4,
    rot: Math.random() * Math.PI,
    vr: -0.12 + Math.random() * 0.24
  }));

  const inicio = performance.now();
  const quadro = (agora) => {
    const t = agora - inicio;
    ctx.clearRect(0, 0, tela.width, tela.height);
    const alfa = t > duracao - 700 ? Math.max(0, (duracao - t) / 700) : 1;
    for (const p of pecas) {
      p.x += p.vx + Math.sin(t / 260 + p.y / 40) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < duracao) requestAnimationFrame(quadro);
    else tela.remove();
  };
  requestAnimationFrame(quadro);
}

/* =====================================================================
   Micro-interações compartilhadas por todas as telas.
   As páginas montam o HTML por JavaScript depois do fetch, então um
   MutationObserver percebe o conteúdo novo e aplica revelação e contadores
   sozinho — nenhuma tela precisa chamar nada.
   ===================================================================== */

const SEM_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PONTEIRO_FINO = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const ALVOS_REVELAR = '.capa, .cartao, .cartao-campeonato, .vazio, .destaque-cartao';

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
    // Quem está dentro de um container escondido (aba fechada, passo do login
    // ainda não aberto) nunca dispara o observador — ficaria invisível para
    // sempre. Esses aparecem normalmente, só sem a animação de entrada.
    if (!alvo.getClientRects().length) continue;
    alvo.dataset.revelar = '1';
    alvo.classList.add('revelar');
    observadorRevelar.observe(alvo);
  }
}

/** Números que sobem de 0 até o valor final (`data-contar="12"`). */
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

/** Todo campo de senha ganha um botão de mostrar/ocultar. */
function prepararCamposSenha(raiz = document) {
  for (const campo of raiz.querySelectorAll('input[type="password"]')) {
    if (campo.closest('.campo-senha')) continue;
    const caixa = document.createElement('div');
    caixa.className = 'campo-senha';
    campo.parentNode.insertBefore(caixa, campo);
    caixa.appendChild(campo);
    caixa.insertAdjacentHTML('beforeend',
      `<button type="button" class="ver-senha" aria-label="Mostrar senha" tabindex="-1">${icone('olho')}</button>`);
  }
}

document.addEventListener('click', (evento) => {
  const botao = evento.target.closest('.ver-senha');
  if (!botao) return;
  const campo = botao.parentElement.querySelector('input');
  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  botao.innerHTML = icone(mostrar ? 'olho-fechado' : 'olho');
  botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  campo.focus();
});

/** Ondulação a partir do ponto clicado, como retorno tátil do botão. */
document.addEventListener('click', (evento) => {
  if (SEM_MOVIMENTO) return;
  const botao = evento.target.closest('.btn:not(.btn-link), .opcao-papel');
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

/* Cartões inclinam em 3D e a capa acende onde o mouse passa. Só com mouse de
   verdade: em tela de toque não faz sentido e só gastaria bateria. */
if (PONTEIRO_FINO && !SEM_MOVIMENTO) {
  document.addEventListener('pointermove', (evento) => {
    const cartao = evento.target.closest('.cartao-campeonato');
    if (cartao) {
      const area = cartao.getBoundingClientRect();
      const x = (evento.clientX - area.left) / area.width - 0.5;
      const y = (evento.clientY - area.top) / area.height - 0.5;
      cartao.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      cartao.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    }
    const capa = evento.target.closest('.capa');
    if (capa) {
      const area = capa.getBoundingClientRect();
      capa.style.setProperty('--mx', `${Math.round(evento.clientX - area.left)}px`);
      capa.style.setProperty('--my', `${Math.round(evento.clientY - area.top)}px`);
    }
  }, { passive: true });

  document.addEventListener('pointerout', (evento) => {
    const cartao = evento.target.closest('.cartao-campeonato');
    if (cartao && !cartao.contains(evento.relatedTarget)) {
      cartao.style.removeProperty('--rx');
      cartao.style.removeProperty('--ry');
    }
  }, true);
}

/** Abas do Bootstrap começam escondidas (display:none). Ao abrir, libera o
 *  que já tiver sido marcado antes de esconder e dispara os contadores. */
document.addEventListener('shown.bs.tab', (evento) => {
  const painel = document.querySelector(evento.target.dataset.bsTarget || '');
  if (!painel) return;
  for (const alvo of painel.querySelectorAll('.revelar:not(.visivel)')) alvo.classList.add('visivel');
  animarContadores(painel);
});

document.addEventListener('shown.bs.modal', (evento) => {
  for (const alvo of evento.target.querySelectorAll('.revelar:not(.visivel)')) alvo.classList.add('visivel');
});

/* Os contadores trocam textContent a cada quadro, o que por si só já é uma
   mutação — sem juntar as chamadas, o observador varreria a página 60x por
   segundo enquanto os números sobem. */
let varreduraAgendada = false;
new MutationObserver(() => {
  if (varreduraAgendada) return;
  varreduraAgendada = true;
  requestAnimationFrame(() => {
    varreduraAgendada = false;
    prepararRevelacao();
    animarContadores();
    prepararCamposSenha();
  });
}).observe(document.body, { childList: true, subtree: true });

/* Barra do topo ganha sombra ao rolar e a borda vai se preenchendo de verde
   conforme o progresso da leitura. */
const atualizarRolagem = () => {
  document.body.classList.toggle('rolou', window.scrollY > 40);
  const maximo = document.documentElement.scrollHeight - window.innerHeight;
  const progresso = maximo > 0 ? Math.min(1, window.scrollY / maximo) : 0;
  document.documentElement.style.setProperty('--progresso', progresso.toFixed(3));
};
window.addEventListener('scroll', atualizarRolagem, { passive: true });
window.addEventListener('resize', atualizarRolagem, { passive: true });
atualizarRolagem();

const voltarTopo = document.createElement('button');
voltarTopo.type = 'button';
voltarTopo.className = 'voltar-topo';
voltarTopo.setAttribute('aria-label', 'Voltar ao topo');
voltarTopo.innerHTML = icone('seta_cima');
voltarTopo.onclick = () => window.scrollTo({ top: 0, behavior: SEM_MOVIMENTO ? 'auto' : 'smooth' });
document.body.appendChild(voltarTopo);

montarRodape();
prepararRevelacao();
animarContadores();
prepararCamposSenha();
