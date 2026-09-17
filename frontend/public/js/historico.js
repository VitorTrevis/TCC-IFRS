if (!Sessao.ehAdmin) {
  location.href = 'login.html?voltar=historico.html';
}

montarTopo('historico');

const el = (i) => document.getElementById(i);

/** `criado_em` vem do SQLite em UTC, formato 'YYYY-MM-DD HH:MM:SS'. */
function paraData(valor) {
  const d = new Date(`${valor.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const ICONE_ACAO = {
  criar: 'mais', editar: 'lapis', remover: 'lixeira',
  gerar_tabela: 'lista', lancar_placar: 'bola', apagar_placar: 'desfazer', resetar_senha: 'chave'
};

function render(lista) {
  el('contagem-historico').textContent = `${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}`;

  if (!lista.length) {
    el('lista-historico').innerHTML = `<div class="vazio">
      <strong>Nenhuma alteração registrada ainda</strong>
      Assim que alguém criar, editar ou excluir algo, aparece aqui.</div>`;
    return;
  }

  el('lista-historico').innerHTML = `<ul class="linha-tempo">
    ${lista.map((h) => {
      const data = paraData(h.criado_em);
      const relativo = data ? tempoRelativo(data) : h.criado_em;
      const exato = data ? data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      return `
        <li class="evento evento-${esc(h.acao)}">
          <span class="evento-icone" aria-hidden="true">${icone(ICONE_ACAO[h.acao] || 'info')}</span>
          <div class="evento-texto"><strong>${esc(h.nome)}</strong> ${esc(h.descricao)}</div>
          <div class="evento-quando" title="${esc(exato)}">${esc(relativo)}<span class="exato">${esc(exato)}</span></div>
        </li>`;
    }).join('')}
  </ul>`;
}

async function carregar() {
  el('lista-historico').innerHTML = esqueleto(6);
  try {
    render(await api.historico());
  } catch (e) {
    if (e.status === 401) { location.href = 'login.html?voltar=historico.html'; return; }
    el('lista-historico').innerHTML = `<div class="vazio"><strong>Não deu para carregar</strong>${esc(e.message)}</div>`;
  }
}

carregar();
