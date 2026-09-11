montarTopo();

if (Sessao.logado) location.href = Sessao.ehAluno ? 'painel-aluno.html' : 'index.html';

const destinoAdmin = () => parametro('voltar') || 'index.html';
const destinoAluno = () => 'painel-aluno.html';

let alunoEmAndamento = null; // { id, nome, tem_senha } — so usado no fluxo manual (pre-cadastro)

// -------------------------------------------------------------- navegacao

function mostrar(idParaMostrar) {
  ['escolha-papel', 'cartao-aluno', 'cartao-admin'].forEach((id) => {
    document.getElementById(id).classList.toggle('d-none', id !== idParaMostrar);
  });
}

const PASSOS_EMAIL = ['passo-entrar-email', 'passo-cadastro', 'passo-cadastro-enviado', 'passo-reenviar', 'passo-esqueci-senha'];

/** Passos dentro do cartao do aluno (e-mail): entrar, cadastro, confirmacao enviada, reenviar, esqueci-senha. */
function mostrarPassoEmail(passo) {
  PASSOS_EMAIL.forEach((id) => {
    document.getElementById(id).classList.toggle('d-none', id !== passo);
  });
  document.getElementById('cartao-fluxo-manual').classList.add('d-none');
}

function mostrarFluxoManual() {
  PASSOS_EMAIL.forEach((id) => {
    document.getElementById(id).classList.add('d-none');
  });
  document.getElementById('cartao-fluxo-manual').classList.remove('d-none');
}

function mostrarPassoManual(passo) {
  ['passo-busca-aluno', 'passo-primeiro-acesso', 'passo-login-aluno'].forEach((id) => {
    document.getElementById(id).classList.toggle('d-none', id !== passo);
  });
}

document.getElementById('btn-sou-aluno').onclick = () => {
  mostrar('cartao-aluno');
  mostrarPassoEmail('passo-entrar-email');
  document.getElementById('e-email').focus();
};
document.getElementById('btn-sou-coordenacao').onclick = () => {
  mostrar('cartao-admin');
  document.getElementById('senha-admin').focus();
};
document.getElementById('btn-voltar-aluno').onclick = () => mostrar('escolha-papel');
document.getElementById('btn-voltar-admin').onclick = () => mostrar('escolha-papel');

document.getElementById('link-ir-cadastro').onclick = () => { mostrarPassoEmail('passo-cadastro'); document.getElementById('c-nome').focus(); };
document.getElementById('link-ir-entrar').onclick = () => { mostrarPassoEmail('passo-entrar-email'); document.getElementById('e-email').focus(); };
document.getElementById('link-ir-reenviar').onclick = () => { mostrarPassoEmail('passo-reenviar'); document.getElementById('r-email').focus(); };
document.getElementById('link-voltar-de-reenviar').onclick = () => mostrarPassoEmail('passo-entrar-email');
document.getElementById('link-reenviar-apos-cadastro').onclick = () => { mostrarPassoEmail('passo-reenviar'); document.getElementById('r-email').focus(); };

document.getElementById('link-ir-esqueci-senha').onclick = () => { mostrarPassoEmail('passo-esqueci-senha'); document.getElementById('f-email').focus(); };
document.getElementById('link-voltar-de-esqueci-senha').onclick = () => mostrarPassoEmail('passo-entrar-email');

document.getElementById('link-fluxo-manual').onclick = () => {
  mostrarFluxoManual();
  mostrarPassoManual('passo-busca-aluno');
  document.getElementById('a-nome').focus();
};

// --------------------------------------------------- entrar (e-mail+senha)

async function entrarPorEmail() {
  const email = document.getElementById('e-email').value.trim();
  const senha = document.getElementById('e-senha').value;
  if (!email || !senha) { avisar('Preencha e-mail e senha.', 'erro'); return; }
  try {
    const r = await api.loginAlunoEmail(email, senha);
    Sessao.entrarComoAluno(r.token, r.aluno);
    location.href = destinoAluno();
  } catch (e) {
    avisar(e.message, 'erro');
  }
}
document.getElementById('btn-entrar-email').onclick = entrarPorEmail;
document.getElementById('e-senha').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') entrarPorEmail(); });

// ------------------------------------------------------------- criar conta

async function criarConta() {
  const nome = document.getElementById('c-nome').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const senha = document.getElementById('c-senha').value;
  const confirmar = document.getElementById('c-confirmar-senha').value;
  if (!nome || !email || !senha) { avisar('Preencha todos os campos.', 'erro'); return; }
  try {
    const r = await api.cadastrarAluno(nome, email, senha, confirmar);
    document.getElementById('texto-cadastro-enviado').textContent = r.mensagem;
    mostrarPassoEmail('passo-cadastro-enviado');
  } catch (e) {
    avisar(e.message, 'erro');
  }
}
document.getElementById('btn-criar-conta').onclick = criarConta;

// ---------------------------------------------------- reenviar confirmacao

async function reenviarConfirmacao() {
  const email = document.getElementById('r-email').value.trim();
  if (!email) { avisar('Informe o e-mail.', 'erro'); return; }
  try {
    const r = await api.reenviarConfirmacao(email);
    avisar(r.mensagem, 'sucesso');
  } catch (e) {
    avisar(e.message, 'erro');
  }
}
document.getElementById('btn-reenviar').onclick = reenviarConfirmacao;

// ------------------------------------------------------ esqueci minha senha

async function esqueciSenha() {
  const email = document.getElementById('f-email').value.trim();
  if (!email) { avisar('Informe o e-mail.', 'erro'); return; }
  try {
    const r = await api.esqueciSenha(email);
    avisar(r.mensagem, 'sucesso');
  } catch (e) {
    avisar(e.message, 'erro');
  }
}
document.getElementById('btn-esqueci-senha').onclick = esqueciSenha;
document.getElementById('f-email').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') esqueciSenha(); });

// ------------------------------------------------- fluxo manual (sem e-mail)

async function buscarAluno() {
  const nome = document.getElementById('a-nome').value.trim();
  if (nome.length < 2) { avisar('Digite ao menos 2 letras do nome.', 'erro'); return; }

  try {
    const resultados = await api.buscarAlunos(nome);
    const caixa = document.getElementById('resultado-busca-aluno');

    if (!resultados.length) {
      caixa.innerHTML = `<div class="vazio"><strong>Nao encontramos esse nome</strong>
        Confira a grafia ou fale com a coordenacao para o pre-cadastro.</div>`;
      return;
    }

    if (resultados.length === 1) {
      selecionarAluno(resultados[0]);
      return;
    }

    caixa.innerHTML = `<div class="mb-2 text-muted small">Encontramos mais de um nome parecido. Selecione o seu:</div>
      <div class="list-group">
        ${resultados.map((r) => `
          <button type="button" class="list-group-item list-group-item-action" data-id="${r.id}">${esc(r.nome)}</button>
        `).join('')}
      </div>`;
    caixa.querySelectorAll('[data-id]').forEach((b) => {
      b.onclick = () => selecionarAluno(resultados.find((r) => r.id === Number(b.dataset.id)));
    });
  } catch (e) {
    avisar(e.message, 'erro');
  }
}

function selecionarAluno(aluno) {
  alunoEmAndamento = aluno;
  document.getElementById('resultado-busca-aluno').innerHTML = '';
  if (aluno.tem_senha) {
    document.getElementById('nome-login-aluno').textContent = aluno.nome;
    mostrarPassoManual('passo-login-aluno');
    document.getElementById('a-senha').focus();
  } else {
    document.getElementById('nome-primeiro-acesso').textContent = aluno.nome;
    mostrarPassoManual('passo-primeiro-acesso');
    document.getElementById('a-nova-senha').focus();
  }
}

async function definirSenha() {
  const senha = document.getElementById('a-nova-senha').value;
  const confirmar = document.getElementById('a-confirmar-senha').value;
  try {
    const r = await api.definirSenhaAluno(alunoEmAndamento.id, senha, confirmar);
    Sessao.entrarComoAluno(r.token, r.aluno);
    location.href = destinoAluno();
  } catch (e) {
    avisar(e.message, 'erro');
  }
}

async function entrarAluno() {
  const senha = document.getElementById('a-senha').value;
  try {
    const r = await api.loginAluno(alunoEmAndamento.id, senha);
    Sessao.entrarComoAluno(r.token, r.aluno);
    location.href = destinoAluno();
  } catch (e) {
    avisar(e.message, 'erro');
  }
}

document.getElementById('btn-buscar-aluno').onclick = buscarAluno;
document.getElementById('a-nome').addEventListener('keydown', (e) => { if (e.key === 'Enter') buscarAluno(); });
document.getElementById('btn-definir-senha').onclick = definirSenha;
document.getElementById('btn-entrar-aluno').onclick = entrarAluno;
document.getElementById('a-senha').addEventListener('keydown', (e) => { if (e.key === 'Enter') entrarAluno(); });

// --------------------------------------------------------------- admin

async function entrarAdmin() {
  const senha = document.getElementById('senha-admin').value;
  if (!senha) { avisar('Digite a senha da coordenacao.', 'erro'); return; }
  try {
    const r = await api.loginAdmin(senha);
    Sessao.entrarComoAdmin(r.token);
    location.href = destinoAdmin();
  } catch (e) {
    avisar(e.message, 'erro');
  }
}

document.getElementById('btn-entrar-admin').onclick = entrarAdmin;
document.getElementById('senha-admin').addEventListener('keydown', (e) => { if (e.key === 'Enter') entrarAdmin(); });
