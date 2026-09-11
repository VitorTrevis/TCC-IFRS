montarTopo();

const conteudo = document.getElementById('conteudo');

function mostrarErro(mensagem) {
  conteudo.innerHTML = `
    <div class="vazio">
      <strong>Nao foi possivel confirmar</strong>
      ${esc(mensagem)}
    </div>
    <a class="btn btn-primary mt-3" href="login.html">Ir para o login</a>`;
}

function mostrarSucesso(nome) {
  conteudo.innerHTML = `
    <div class="mb-3" style="font-size:2.5rem;">✅</div>
    <h1 class="h4 mb-2">Conta confirmada, ${esc(nome.split(' ')[0])}!</h1>
    <p class="text-muted">Redirecionando para o seu painel...</p>`;
}

(async () => {
  const token = parametro('token');
  if (!token) {
    mostrarErro('Link incompleto. Confira se copiou o endereco inteiro do e-mail.');
    return;
  }

  try {
    const r = await api.confirmarEmailAluno(token);
    Sessao.entrarComoAluno(r.token, r.aluno);
    mostrarSucesso(r.aluno.nome);
    setTimeout(() => { location.href = 'painel-aluno.html'; }, 1400);
  } catch (e) {
    mostrarErro(e.message);
  }
})();
