montarTopo();

if (Sessao.logado) location.href = Sessao.ehAluno ? 'painel-aluno.html' : 'index.html';

/** Só aceita um caminho relativo do próprio site (ex: "admin-campeonato.html?id=5").
 *  Sem isso, um link tipo "login.html?voltar=https://site-falso.com" faria o
 *  navegador saltar pra fora do site logo depois de um login de verdade —
 *  um redirecionamento aberto, padrão comum em phishing. */
function destinoSeguro(bruto, padrao) {
  if (bruto && /^[a-z0-9_-]+\.html(\?[^\s]*)?$/i.test(bruto)) return bruto;
  return padrao;
}
const destinoAdmin = () => destinoSeguro(parametro('voltar'), 'index.html');
const destinoAluno = () => 'painel-aluno.html';

// -------------------------------------------------------------- navegação

function mostrar(idParaMostrar) {
  ['escolha-papel', 'cartao-aluno', 'cartao-admin'].forEach((id) => {
    document.getElementById(id).classList.toggle('d-none', id !== idParaMostrar);
  });
}

const PASSOS_EMAIL = ['passo-entrar-email', 'passo-cadastro', 'passo-cadastro-enviado', 'passo-reenviar', 'passo-esqueci-senha'];

/** Passos dentro do cartão do aluno (e-mail): entrar, cadastro, confirmação enviada, reenviar, esqueci-senha. */
function mostrarPassoEmail(passo) {
  PASSOS_EMAIL.forEach((id) => {
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
  document.getElementById('nome-admin').focus();
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
const entrarPorEmailComGiro = () => comCarregamento(document.getElementById('btn-entrar-email'), entrarPorEmail);
document.getElementById('btn-entrar-email').onclick = entrarPorEmailComGiro;
document.getElementById('e-senha').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') entrarPorEmailComGiro(); });

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
document.getElementById('btn-criar-conta').onclick = () => comCarregamento(document.getElementById('btn-criar-conta'), criarConta);

// ---------------------------------------------------- reenviar confirmação

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
document.getElementById('btn-reenviar').onclick = () => comCarregamento(document.getElementById('btn-reenviar'), reenviarConfirmacao);

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
const esqueciSenhaComGiro = () => comCarregamento(document.getElementById('btn-esqueci-senha'), esqueciSenha);
document.getElementById('btn-esqueci-senha').onclick = esqueciSenhaComGiro;
document.getElementById('f-email').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') esqueciSenhaComGiro(); });

// --------------------------------------------------------------- admin

async function entrarAdmin() {
  const nome = document.getElementById('nome-admin').value.trim();
  const senha = document.getElementById('senha-admin').value;
  if (!nome) { avisar('Digite seu nome.', 'erro'); document.getElementById('nome-admin').focus(); return; }
  if (!senha) { avisar('Digite a senha da coordenação.', 'erro'); return; }
  try {
    const r = await api.loginAdmin(senha, nome);
    Sessao.entrarComoAdmin(r.token, r.nome);
    location.href = destinoAdmin();
  } catch (e) {
    avisar(e.message, 'erro');
  }
}

const entrarAdminComGiro = () => comCarregamento(document.getElementById('btn-entrar-admin'), entrarAdmin);
document.getElementById('btn-entrar-admin').onclick = entrarAdminComGiro;
document.getElementById('nome-admin').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('senha-admin').focus(); });
document.getElementById('senha-admin').addEventListener('keydown', (e) => { if (e.key === 'Enter') entrarAdminComGiro(); });
