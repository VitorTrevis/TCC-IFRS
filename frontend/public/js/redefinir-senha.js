montarTopo();

const token = parametro('token');

function mostrarPasso(passo) {
  ['passo-formulario', 'passo-invalido', 'passo-sucesso'].forEach((id) => {
    document.getElementById(id).classList.toggle('d-none', id !== passo);
  });
}

if (!token) {
  document.getElementById('texto-invalido').textContent =
    'Link incompleto. Confira se copiou o endereço inteiro do e-mail.';
  mostrarPasso('passo-invalido');
}

async function redefinir() {
  const senha = document.getElementById('nova-senha').value;
  const confirmar = document.getElementById('confirmar-nova-senha').value;
  if (!senha || String(senha).length < 6) { avisar('A senha precisa ter pelo menos 6 caracteres.', 'erro'); return; }
  if (senha !== confirmar) { avisar('As senhas não são iguais.', 'erro'); return; }

  try {
    const r = await api.redefinirSenha(token, senha, confirmar);
    Sessao.entrarComoAluno(r.token, r.aluno);
    mostrarPasso('passo-sucesso');
    setTimeout(() => { location.href = 'painel-aluno.html'; }, 1400);
  } catch (e) {
    document.getElementById('texto-invalido').textContent = e.message;
    mostrarPasso('passo-invalido');
  }
}

const redefinirComGiro = () => comCarregamento(document.getElementById('btn-redefinir'), redefinir);
document.getElementById('btn-redefinir').onclick = redefinirComGiro;
document.getElementById('confirmar-nova-senha').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') redefinirComGiro(); });
