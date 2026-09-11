const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Aluno = require('../models/aluno.model');
const { gerarTokenAluno } = require('../middlewares/auth');
const { falha } = require('../middlewares/erros');
const { enviarConfirmacao, enviarRedefinicaoSenha } = require('../services/email.service');

const DOMINIO_ALUNO = (process.env.DOMINIO_EMAIL_ALUNO || 'aluno.farroupilha.ifrs.edu.br').toLowerCase();
const VALIDADE_TOKEN_MS = 24 * 60 * 60 * 1000; // 24h
const VALIDADE_TOKEN_RESET_MS = 60 * 60 * 1000; // 1h — janela menor que a de confirmacao de e-mail

/** So aceita e-mail cujo dominio bate exatamente com o da escola (case-insensitive). */
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

/** Cadastro por conta propria com e-mail institucional. Conta nasce nao verificada. */
async function cadastrarPorEmail(req, res) {
  const nome = (req.body?.nome || '').toString().trim();
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  const { senha, confirmar_senha } = req.body || {};

  if (nome.length < 3) falha(400, 'Informe seu nome completo.');
  if (!ehEmailInstitucional(email)) {
    falha(400, `Use seu e-mail institucional, terminado em @${DOMINIO_ALUNO}.`);
  }
  if (!senha || String(senha).length < 6) falha(400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== confirmar_senha) falha(400, 'As senhas nao sao iguais.');
  if (Aluno.existeEmail(email)) {
    falha(400, 'Ja existe uma conta com esse e-mail. Tente entrar, ou use "reenviar confirmacao" se ainda nao ativou.');
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
    console.error('Falha ao enviar e-mail de confirmacao:', e.message);
  }

  res.status(201).json({
    mensagem: `Enviamos um link de confirmacao para ${email}. Verifique sua caixa de entrada (e o spam) para ativar sua conta.`
  });
}

/** Clique no link do e-mail: verifica o token e ja loga o aluno. */
async function confirmarEmail(req, res) {
  const tokenBruto = (req.query.token || '').toString();
  if (!tokenBruto) falha(400, 'Link invalido.');

  const aluno = Aluno.porTokenValido(hashToken(tokenBruto));
  if (!aluno) falha(400, 'Esse link expirou ou ja foi usado. Peca um novo em "reenviar confirmacao".');

  Aluno.marcarEmailVerificado(aluno.id);
  const publico = { id: aluno.id, nome: aluno.nome };
  res.json({ token: gerarTokenAluno(publico), aluno: publico });
}

/** Gera um novo token e reenvia, caso a conta exista e ainda nao esteja verificada.
 *  Sempre responde a mesma mensagem, exista ou nao a conta — evita que alguem use
 *  esse endpoint para descobrir quais e-mails estao cadastrados. */
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
      console.error('Falha ao reenviar e-mail de confirmacao:', e.message);
    }
  }

  res.json({ mensagem: 'Se esse e-mail estiver cadastrado e pendente de confirmacao, reenviamos o link.' });
}

// ------------------------------------------------- esqueci minha senha (aluno)
// So se aplica a contas de autocadastro (tem e-mail). O pre-cadastro manual usa
// o reset feito pela coordenacao (ver `resetarSenha` mais abaixo).

/** Gera um token de redefinicao e manda por e-mail, se a conta existir.
 *  Sempre responde a mesma mensagem, exista ou nao a conta — mesmo motivo do
 *  reenvio de confirmacao: nao dar pra descobrir por aqui quais e-mails tem conta. */
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
      console.error('Falha ao enviar e-mail de redefinicao de senha:', e.message);
    }
  }

  res.json({ mensagem: 'Se esse e-mail tiver conta, mandamos um link para redefinir a senha.' });
}

/** Clique no link do e-mail: verifica o token, define a nova senha e ja loga o aluno. */
async function redefinirSenha(req, res) {
  const tokenBruto = (req.body?.token || '').toString();
  const { senha, confirmar_senha } = req.body || {};

  if (!tokenBruto) falha(400, 'Link invalido.');
  if (!senha || String(senha).length < 6) falha(400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== confirmar_senha) falha(400, 'As senhas nao sao iguais.');

  const aluno = Aluno.porTokenResetValido(hashToken(tokenBruto));
  if (!aluno) falha(400, 'Esse link expirou ou ja foi usado. Peca uma nova redefinicao.');

  Aluno.redefinirSenhaComToken(aluno.id, bcrypt.hashSync(String(senha), 10));
  const publico = { id: aluno.id, nome: aluno.nome };
  res.json({ token: gerarTokenAluno(publico), aluno: publico });
}

// --------------------------------------------- fluxo de pre-cadastro manual
// (excecao: usado pela coordenacao para casos sem e-mail institucional a mao)

/** Busca publica usada no login de contas pre-cadastradas manualmente (sem e-mail). */
function buscar(req, res) {
  const nome = (req.query.nome || '').toString();
  if (nome.trim().length < 2) falha(400, 'Digite ao menos 2 letras do nome.');
  res.json(Aluno.buscarPorNome(nome));
}

/** Primeiro acesso: define a senha de um aluno pre-cadastrado manualmente. */
function definirSenha(req, res) {
  const aluno = Aluno.porId(req.params.id);
  if (!aluno) falha(404, 'Aluno nao encontrado.');
  if (aluno.senha_hash) {
    falha(400, 'Este aluno ja definiu a senha. Peca para a coordenacao resetar se precisar trocar.');
  }

  const { senha, confirmar_senha } = req.body || {};
  if (!senha || String(senha).length < 6) falha(400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== confirmar_senha) falha(400, 'As senhas nao sao iguais.');

  Aluno.definirSenha(aluno.id, bcrypt.hashSync(String(senha), 10));
  const atualizado = { id: aluno.id, nome: aluno.nome };
  res.status(201).json({ token: gerarTokenAluno(atualizado), aluno: atualizado });
}

// ------------------------------------------------------------- login (aluno)

/** Login por e-mail (autocadastro) ou por id/nome (pre-cadastro manual). */
function entrar(req, res) {
  const { id, nome, email, senha } = req.body || {};
  if (!senha) falha(400, 'Informe a senha.');

  let aluno;
  if (email) {
    aluno = Aluno.porEmail(email);
    if (!aluno) falha(404, 'E-mail nao encontrado. Confira ou crie uma conta.');
    if (!aluno.email_verificado) {
      falha(403, 'Confirme seu e-mail antes de entrar — veja o link que mandamos na sua caixa de entrada.');
    }
  } else {
    aluno = id ? Aluno.porId(id) : Aluno.porNomeExato(nome || '');
    if (!aluno) falha(404, 'Aluno nao encontrado. Confira o nome ou fale com a coordenacao.');
  }

  if (!aluno.senha_hash) falha(400, 'Este e o seu primeiro acesso: defina uma senha antes de entrar.');
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

/** Pre-cadastro manual pela coordenacao — excecao para quem nao tem e-mail institucional a mao. */
function criar(req, res) {
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome completo do aluno.');
  if (Aluno.existeNome(nome)) falha(400, `Ja existe um aluno pre-cadastrado como "${nome}". Diferencie o nome (ex: com a turma) se for outra pessoa.`);
  const id = Aluno.criar(nome);
  res.status(201).json(Aluno.porId(id));
}

function resetarSenha(req, res) {
  const aluno = Aluno.porId(req.params.id);
  if (!aluno) falha(404, 'Aluno nao encontrado.');
  Aluno.resetarSenha(aluno.id);
  res.json({
    mensagem: `Senha de ${aluno.nome} foi resetada. Ele define uma nova em "Fui cadastrado pela coordenacao" na tela de login, buscando pelo proprio nome.`
  });
}

module.exports = {
  cadastrarPorEmail, confirmarEmail, reenviarConfirmacao,
  esqueciSenha, redefinirSenha,
  buscar, definirSenha, entrar, minhasEstatisticas,
  listar, criar, resetarSenha
};
