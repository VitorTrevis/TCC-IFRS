if (!Sessao.ehAdmin) {
  location.href = 'login.html?voltar=alunos-admin.html';
}

montarTopo();

const el = (i) => document.getElementById(i);

function situacao(a) {
  return a.email_verificado
    ? `<span class="etiqueta etiqueta-em_andamento">e-mail confirmado</span>`
    : `<span class="etiqueta etiqueta-planejado">aguardando confirmação</span>`;
}

function render(alunos) {
  el('contagem-alunos').textContent = `${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'}`;

  if (!alunos.length) {
    el('lista-alunos').innerHTML = `<div class="vazio">
      <strong>Nenhum aluno cadastrado ainda</strong>
      Assim que alguém criar conta com o e-mail institucional, aparece aqui.</div>`;
    return;
  }

  el('lista-alunos').innerHTML = `<div>
    ${alunos.map((a) => `
      <div class="item-aluno">
        <div class="d-flex align-items-center gap-3 min-w-0">
          <span class="avatar" aria-hidden="true">${esc(iniciais(a.nome))}</span>
          <div class="min-w-0">
            <div class="fw-semibold">${esc(a.nome)}</div>
            <div class="text-muted small text-truncate">
              ${esc(a.email)}
              &middot; ${a.total_vinculos} ${a.total_vinculos === 1 ? 'vínculo' : 'vínculos'} em times
            </div>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2 flex-shrink-0">
          ${situacao(a)}
          ${a.tem_senha ? `<button class="btn btn-sm btn-outline-secondary" data-resetar="${a.id}">${icone('chave')}Resetar senha</button>` : ''}
          <button class="btn btn-sm btn-outline-danger" data-excluir="${a.id}" aria-label="Excluir cadastro de ${esc(a.nome)}" title="Excluir cadastro">${icone('lixeira')}</button>
        </div>
      </div>`).join('')}
  </div>`;

  el('lista-alunos').querySelectorAll('[data-resetar]').forEach((b) => {
    b.onclick = async () => {
      const aluno = alunos.find((a) => a.id === Number(b.dataset.resetar));
      if (!(await confirmarAcao(`Resetar a senha de ${aluno.nome}? Ele define uma nova em "Esqueci minha senha" na tela de login.`, 'Resetar senha'))) return;
      try {
        const r = await api.resetarSenhaAluno(aluno.id);
        avisar(r.mensagem, 'sucesso');
        await carregar();
      } catch (e) { avisar(e.message, 'erro'); }
    };
  });

  el('lista-alunos').querySelectorAll('[data-excluir]').forEach((b) => {
    b.onclick = async () => {
      const aluno = alunos.find((a) => a.id === Number(b.dataset.excluir));
      const mensagem = `Excluir o cadastro de "${aluno.nome}" (${aluno.email})? Use isso quando resetar a senha não resolver, `
        + `como um link de confirmação travado. Ele precisa criar a conta de novo do zero pelo autocadastro. `
        + `O nome dele no elenco dos times e os gols já marcados continuam existindo, só perdem o vínculo com essa conta.`;
      if (!(await confirmarAcao(mensagem, 'Excluir cadastro'))) return;
      try {
        await api.excluirAluno(aluno.id);
        avisar(`Cadastro de ${aluno.nome} excluído.`, 'sucesso');
        await carregar();
      } catch (e) { avisar(e.message, 'erro'); }
    };
  });
}

async function carregar() {
  el('lista-alunos').innerHTML = esqueleto(5);
  try {
    render(await api.listarAlunosAdmin());
  } catch (e) {
    if (e.status === 401) { location.href = 'login.html?voltar=alunos-admin.html'; return; }
    el('lista-alunos').innerHTML = `<div class="vazio"><strong>Não deu para carregar</strong>${esc(e.message)}</div>`;
  }
}

carregar();
