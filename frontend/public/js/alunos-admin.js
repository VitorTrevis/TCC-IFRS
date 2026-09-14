if (!Sessao.ehAdmin) {
  location.href = 'login.html?voltar=alunos-admin.html';
}

montarTopo();

const el = (i) => document.getElementById(i);

function situacao(a) {
  if (a.email) {
    return a.email_verificado
      ? `<span class="etiqueta etiqueta-em_andamento">e-mail confirmado</span>`
      : `<span class="etiqueta etiqueta-planejado">aguardando confirmacao</span>`;
  }
  return a.tem_senha
    ? ''
    : `<span class="etiqueta etiqueta-planejado">aguardando primeiro acesso</span>`;
}

function render(alunos) {
  el('contagem-alunos').textContent = `${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'}`;

  if (!alunos.length) {
    el('lista-alunos').innerHTML = `<div class="vazio">
      <strong>Nenhum aluno cadastrado ainda</strong>
      Assim que alguem criar conta com o e-mail institucional, aparece aqui.</div>`;
    return;
  }

  el('lista-alunos').innerHTML = `<ul class="list-group list-group-flush">
    ${alunos.map((a) => `
      <li class="list-group-item d-flex justify-content-between align-items-center px-0 gap-2">
        <div>
          <div class="fw-semibold">${esc(a.nome)}</div>
          <div class="text-muted small">
            ${a.email ? esc(a.email) : 'sem e-mail (cadastro manual)'}
            &middot; ${a.total_vinculos} ${a.total_vinculos === 1 ? 'vinculo' : 'vinculos'} em times
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          ${situacao(a)}
          ${a.tem_senha ? `<button class="btn btn-sm btn-outline-secondary" data-resetar="${a.id}">Resetar senha</button>` : ''}
        </div>
      </li>`).join('')}
  </ul>`;

  el('lista-alunos').querySelectorAll('[data-resetar]').forEach((b) => {
    b.onclick = async () => {
      const aluno = alunos.find((a) => a.id === Number(b.dataset.resetar));
      if (!(await confirmarAcao(`Resetar a senha de ${aluno.nome}? Ele vai escolher uma nova em "Fui cadastrado pela coordenacao" na tela de login.`, 'Resetar senha'))) return;
      try {
        const r = await api.resetarSenhaAluno(aluno.id);
        avisar(r.mensagem, 'sucesso');
        await carregar();
      } catch (e) { avisar(e.message, 'erro'); }
    };
  });
}

async function carregar() {
  try {
    render(await api.listarAlunosAdmin());
  } catch (e) {
    if (e.status === 401) { location.href = 'login.html?voltar=alunos-admin.html'; return; }
    el('lista-alunos').innerHTML = `<div class="vazio"><strong>Nao deu para carregar</strong>${esc(e.message)}</div>`;
  }
}

el('btn-add-aluno').onclick = async () => {
  const campo = el('novo-aluno-nome');
  const nome = campo.value.trim();
  if (!nome) { avisar('Escreva o nome completo.', 'erro'); campo.focus(); return; }
  try {
    await api.criarAlunoAdmin(nome);
    campo.value = '';
    campo.focus();
    avisar(`${nome} foi pre-cadastrado como excecao.`, 'sucesso');
    await carregar();
  } catch (e) { avisar(e.message, 'erro'); }
};

el('novo-aluno-nome').addEventListener('keydown', (e) => { if (e.key === 'Enter') el('btn-add-aluno').click(); });

carregar();
