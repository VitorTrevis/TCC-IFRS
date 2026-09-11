montarTopo('inicio');

const lista = document.getElementById('lista');
let modal;

function cartao(c) {
  const gerenciar = Sessao.ehAdmin
    ? `<a class="btn btn-sm btn-outline-primary mt-3" href="admin-campeonato.html?id=${c.id}">Gerenciar</a>`
    : '';
  return `
    <div class="col-md-6 col-xl-4">
      <div class="cartao-campeonato">
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
        ${c.data_inicio ? `<div class="text-muted small mt-1">Comeca em ${esc(dataBR(c.data_inicio))}</div>` : ''}
        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-primary mt-3" href="campeonato.html?id=${c.id}">Acompanhar</a>
          ${gerenciar}
        </div>
      </div>
    </div>`;
}

async function carregar() {
  try {
    const campeonatos = await api.campeonatos();
    lista.innerHTML = campeonatos.length
      ? campeonatos.map(cartao).join('')
      : `<div class="col-12"><div class="vazio">
           <strong>Nenhum campeonato por aqui ainda</strong>
           Crie o primeiro para cadastrar os times e gerar a tabela de jogos.
         </div></div>`;
  } catch (e) {
    lista.innerHTML = `<div class="col-12"><div class="vazio"><strong>Nao deu para carregar</strong>${esc(e.message)}</div></div>`;
  }
}

function alternarCamposFormato() {
  const formato = document.getElementById('c-formato').value;
  const grupos = formato === 'grupos_mata_mata';
  document.getElementById('linha-tamanho').classList.toggle('d-none', !grupos);
  document.getElementById('linha-classificados').classList.toggle('d-none', !grupos);
  document.getElementById('linha-turno').classList.toggle('d-none', formato === 'mata_mata');
}

document.getElementById('c-formato').addEventListener('change', alternarCamposFormato);

document.getElementById('btn-novo').onclick = () => {
  if (!Sessao.ehAdmin) {
    location.href = 'login.html?voltar=index.html';
    return;
  }
  alternarCamposFormato();
  modal = modal || new bootstrap.Modal(document.getElementById('modal-campeonato'));
  modal.show();
};

document.getElementById('btn-salvar-campeonato').onclick = async () => {
  const dados = {
    nome: document.getElementById('c-nome').value.trim(),
    modalidade: document.getElementById('c-modalidade').value.trim(),
    formato: document.getElementById('c-formato').value,
    turno_returno: document.getElementById('c-returno').checked ? 1 : 0,
    tamanho_grupo: Number(document.getElementById('c-tamanho').value) || 4,
    classificados_grupo: Number(document.getElementById('c-classificados').value) || 2,
    data_inicio: document.getElementById('c-inicio').value || null,
    data_fim: document.getElementById('c-fim').value || null
  };
  try {
    const criado = await api.criarCampeonato(dados);
    modal.hide();
    location.href = `admin-campeonato.html?id=${criado.id}`;
  } catch (e) {
    avisar(e.message, 'erro');
  }
};

carregar();
