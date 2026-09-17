const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Aluno = require('../models/aluno.model');
const Historico = require('../models/historico.model');
const { gerarTokenAluno } = require('../middlewares/auth');
const { falha } = require('../middlewares/erros');
const { enviarConfirmacao, enviarRedefinicaoSenha } = require('../services/email.service');

const DOMINIO_ALUNO = (process.env.DOMINIO_EMAIL_ALUNO || 'aluno.farroupilha.ifrs.edu.br').toLowerCase();
const VALIDADE_TOKEN_MS = 24 * 60 * 60 * 1000; // 24h
const VALIDADE_TOKEN_RESET_MS = 60 * 60 * 1000; // 1h — janela menor que a de confirmação de e-mail

/** Só aceita e-mail cujo domínio bate exatamente com o da escola (case-insensitive). */
function ehEmailInstitucional(email) {
  const texto = String(email || '').trim().toLowerCase();
  const partes = texto.split('@');
  if (partes.length !== 2 || !partes[0]) return false;
  return partes[1] === DOMINIO_ALUNO;
}

function gerarTokenBruto() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(tokenBruto) {
  return crypto.createHash('sha256').update(tokenBruto).digest('hex');
}

function expiraEmIso() {
  return new Date(Date.now() + VALIDADE_TOKEN_MS).toISOString();
}

function expiraResetEmIso() {
  return new Date(Date.now() + VALIDADE_TOKEN_RESET_MS).toISOString();
}

// ------------------------------------------------------ autocadastro (aluno)

/** Cadastro por conta própria com e-mail institucional. Conta nasce não verificada. */
async function cadastrarPorEmail(req, res) {
  const nome = (req.body?.nome || '').toString().trim();
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  const { senha, confirmar_senha } = req.body || {};

  if (nome.length < 3) falha(400, 'Informe seu nome completo.');
  if (!ehEmailInstitucional(email)) {
    falha(400, `Use seu e-mail institucional, terminado em @${DOMINIO_ALUNO}.`);
  }
  if (!senha || String(senha).length < 6) falha(400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== confirmar_senha) falha(400, 'As senhas não são iguais.');
  if (Aluno.existeEmail(email)) {
    falha(400, 'Já existe uma conta com esse e-mail. Tente entrar, ou use "reenviar confirmação" se ainda não ativou.');
  }

  const tokenBruto = gerarTokenBruto();
  Aluno.criarComEmail({
    nome, email,
    senha_hash: bcrypt.hashSync(String(senha), 10),
    tokenHash: hashToken(tokenBruto),
    expiraEm: expiraEmIso()
  });

  try {
    await enviarConfirmacao({ nome, email, tokenBruto });
  } catch (e) {
    console.error('Falha ao enviar e-mail de confirmação:', e.message);
  }

  res.status(201).json({
    mensagem: `Enviamos um link de confirmação para ${email}. Verifique sua caixa de entrada (e o spam) para ativar sua conta.`
  });
}

/** Clique no link do e-mail: verifica o token e já loga o aluno. */
async function confirmarEmail(req, res) {
  const tokenBruto = (req.query.token || '').toString();
  if (!tokenBruto) falha(400, 'Link inválido.');

  const aluno = Aluno.porTokenValido(hashToken(tokenBruto));
  if (!aluno) falha(400, 'Esse link expirou ou já foi usado. Peça um novo em "reenviar confirmação".');

  Aluno.marcarEmailVerificado(aluno.id);
  const publico = { id: aluno.id, nome: aluno.nome };
  res.json({ token: gerarTokenAluno(publico), aluno: publico });
}

/** Gera um novo token e reenvia, caso a conta exista e ainda não esteja verificada.
 *  Sempre responde a mesma mensagem, exista ou não a conta — evita que alguém use
 *  esse endpoint para descobrir quais e-mails estão cadastrados. */
async function reenviarConfirmacao(req, res) {
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  if (!email) falha(400, 'Informe o e-mail.');

  const aluno = Aluno.porEmail(email);
  if (aluno && !aluno.email_verificado) {
    const tokenBruto = gerarTokenBruto();
    Aluno.atualizarTokenVerificacao(aluno.id, hashToken(tokenBruto), expiraEmIso());
    try {
      await enviarConfirmacao({ nome: aluno.nome, email: aluno.email, tokenBruto });
    } catch (e) {
      console.error('Falha ao reenviar e-mail de confirmação:', e.message);
    }
  }

  res.json({ mensagem: 'Se esse e-mail estiver cadastrado e pendente de confirmação, reenviamos o link.' });
}

// ------------------------------------------------- esqueci minha senha (aluno)

/** Gera um token de redefinição e manda por e-mail, se a conta existir.
 *  Sempre responde a mesma mensagem, exista ou não a conta — mesmo motivo do
 *  reenvio de confirmação: não dar pra descobrir por aqui quais e-mails têm conta. */
async function esqueciSenha(req, res) {
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  if (!email) falha(400, 'Informe o e-mail.');

  const aluno = Aluno.porEmail(email);
  if (aluno) {
    const tokenBruto = gerarTokenBruto();
    Aluno.definirTokenReset(aluno.id, hashToken(tokenBruto), expiraResetEmIso());
    try {
      await enviarRedefinicaoSenha({ nome: aluno.nome, email: aluno.email, tokenBruto });
    } catch (e) {
      console.error('Falha ao enviar e-mail de redefinição de senha:', e.message);
    }
  }

  res.json({ mensagem: 'Se esse e-mail tiver conta, mandamos um link para redefinir a senha.' });
}

/** Clique no link do e-mail: verifica o token, define a nova senha e já loga o aluno. */
async function redefinirSenha(req, res) {
  const tokenBruto = (req.body?.token || '').toString();
  const { senha, confirmar_senha } = req.body || {};

  if (!tokenBruto) falha(400, 'Link inválido.');
  if (!senha || String(senha).length < 6) falha(400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== confirmar_senha) falha(400, 'As senhas não são iguais.');

  const aluno = Aluno.porTokenResetValido(hashToken(tokenBruto));
  if (!aluno) falha(400, 'Esse link expirou ou já foi usado. Peça uma nova redefinição.');

  Aluno.redefinirSenhaComToken(aluno.id, bcrypt.hashSync(String(senha), 10));
  const publico = { id: aluno.id, nome: aluno.nome };
  res.json({ token: gerarTokenAluno(publico), aluno: publico });
}

// ------------------------------------------------------------- login (aluno)

function entrar(req, res) {
  const { email, senha } = req.body || {};
  if (!senha) falha(400, 'Informe a senha.');
  if (!email) falha(400, 'Informe o e-mail.');

  const aluno = Aluno.porEmail(email);
  if (!aluno) falha(404, 'E-mail não encontrado. Confira ou crie uma conta.');
  if (!aluno.email_verificado) {
    falha(403, 'Confirme seu e-mail antes de entrar — veja o link que mandamos na sua caixa de entrada.');
  }
  if (!bcrypt.compareSync(String(senha), aluno.senha_hash)) falha(401, 'Senha incorreta.');

  const publico = { id: aluno.id, nome: aluno.nome };
  res.json({ token: gerarTokenAluno(publico), aluno: publico });
}

function minhasEstatisticas(req, res) {
  res.json(Aluno.estatisticas(req.aluno.id));
}

// --------------------------------------------------------- rotas de admin

function listar(req, res) {
  res.json(Aluno.listar());
}

/** Reseta a senha de um aluno (autocadastro por e-mail). Ele define uma nova
 *  sozinho pelo "Esqueci minha senha" — o reset não cria nenhum jeito de
 *  reivindicar a conta sem provar posse do e-mail de novo. */
function resetarSenha(req, res) {
  const aluno = Aluno.porId(req.params.id);
  if (!aluno) falha(404, 'Aluno não encontrado.');
  Aluno.resetarSenha(aluno.id);
  Historico.registrar({
    nome: req.admin.nome, acao: 'resetar_senha', entidade: 'aluno', entidade_id: aluno.id,
    descricao: `resetou a senha de "${aluno.nome}"`
  });
  res.json({
    mensagem: `Senha de ${aluno.nome} foi resetada. Ele define uma nova em "Esqueci minha senha" na tela de login, usando o e-mail institucional.`
  });
}

module.exports = {
  cadastrarPorEmail, confirmarEmail, reenviarConfirmacao,
  esqueciSenha, redefinirSenha,
  entrar, minhasEstatisticas,
  listar, resetarSenha
};
