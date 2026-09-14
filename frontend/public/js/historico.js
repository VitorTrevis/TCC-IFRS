if (!Sessao.ehAdmin) {
  location.href = 'login.html?voltar=historico.html';
}

montarTopo('historico');

const el = (i) => document.getElementById(i);

/** `criado_em` vem do SQLite em UTC, formato 'YYYY-MM-DD HH:MM:SS'. */
function formatarData(valor) {
  const d = new Date(`${valor.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const ICONES = {
  criar: '➕', editar: '✏️', remover: '🗑️',
  gerar_tabela: '📋', lancar_placar: '⚽', apagar_placar: '↩️', resetar_senha: '🔑'
};

function render(lista) {
  el('contagem-historico').textContent = `${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}`;

  if (!lista.length) {
    el('lista-historico').innerHTML = `<div class="vazio">
      <strong>Nenhuma alteracao registrada ainda</strong>
      Assim que alguem criar, editar ou excluir algo, aparece aqui.</div>`;
    return;
  }

  el('lista-historico').innerHTML = `<ul class="list-group list-group-flush">
    ${lista.map((h) => `
      <li class="list-group-item px-0">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <span aria-hidden="true">${ICONES[h.acao] || '•'}</span>
            <strong>${esc(h.nome)}</strong> ${esc(h.descricao)}
          </div>
          <span class="text-muted small text-nowrap">${esc(formatarData(h.criado_em))}</span>
        </div>
      </li>`).join('')}
  </ul>`;
}

async function carregar() {
  try {
    render(await api.historico());
  } catch (e) {
    if (e.status === 401) { location.href = 'login.html?voltar=historico.html'; return; }
    el('lista-historico').innerHTML = `<div class="vazio"><strong>Nao deu para carregar</strong>${esc(e.message)}</div>`;
  }
}

carregar();
