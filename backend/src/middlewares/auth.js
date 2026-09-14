const jwt = require('jsonwebtoken');

const SEGREDO = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';
const VALIDADE = process.env.JWT_EXPIRES || '8h';
const SENHA_ADMIN = process.env.ADMIN_PASSWORD || 'ifrs2026';

/** `nome` é quem a pessoa digitou ao entrar — vai no histórico de ações. */
function gerarTokenAdmin(nome) {
  return jwt.sign({ role: 'admin', nome }, SEGREDO, { expiresIn: VALIDADE });
}

function gerarTokenAluno(aluno) {
  return jwt.sign({ role: 'aluno', id: aluno.id, nome: aluno.nome }, SEGREDO, { expiresIn: VALIDADE });
}

function extrairToken(req) {
  const cabecalho = req.headers.authorization || '';
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
}

/** Bloqueia a rota se não vier um token de admin válido. */
function exigirAdmin(req, res, next) {
  const token = extrairToken(req);
  if (!token) {
    return res.status(401).json({ erro: 'Entre com a senha da coordenação para fazer isso.' });
  }
  try {
    const dados = jwt.verify(token, SEGREDO);
    if (dados.role !== 'admin') {
      return res.status(403).json({ erro: 'Essa ação é restrita à coordenação.' });
    }
    // Tokens emitidos antes do login pedir o nome não têm esse campo —
    // usa um rótulo genérico em vez de quebrar o registro no histórico.
    req.admin = { nome: dados.nome || 'Coordenação (sessão antiga)' };
    next();
  } catch (e) {
    res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  }
}

/** Bloqueia a rota se não vier um token de aluno válido. */
function exigirAluno(req, res, next) {
  const token = extrairToken(req);
  if (!token) {
    return res.status(401).json({ erro: 'Faça login para ver seus dados.' });
  }
  try {
    const dados = jwt.verify(token, SEGREDO);
    if (dados.role !== 'aluno') {
      return res.status(403).json({ erro: 'Essa área é exclusiva de alunos.' });
    }
    req.aluno = { id: dados.id, nome: dados.nome };
    next();
  } catch (e) {
    res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  }
}

// ---------------------------------------------------------------------------
// Limite simples de tentativas por IP (protege login/cadastro/reenvio de
// força bruta e de spam de e-mail). Em memória: reinicia se o servidor
// reiniciar, o que é aceitável para o volume de uso de uma escola.
// ---------------------------------------------------------------------------
const JANELA_MS = 60 * 1000;
const tentativasPorChave = new Map();

/** Cria um middleware de limite de tentativas por IP, com janela de 1 minuto.
 *  `rotulo` separa os contadores de rotas diferentes (ex: 'admin', 'cadastro-aluno')
 *  para que o limite de uma não consuma o da outra. */
function criarLimitador(rotulo, limite) {
  return function limitar(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'desconhecido';
    const chave = `${rotulo}:${ip}`;
    const agora = Date.now();
    const registro = tentativasPorChave.get(chave) || { contagem: 0, inicio: agora };

    if (agora - registro.inicio > JANELA_MS) {
      registro.contagem = 0;
      registro.inicio = agora;
    }

    if (registro.contagem >= limite) {
      return res.status(429).json({ erro: 'Muitas tentativas. Aguarde um minuto e tente de novo.' });
    }

    registro.contagem++;
    tentativasPorChave.set(chave, registro);
    next();
  };
}

const limitarTentativasAdmin = criarLimitador('admin-login', 8);
const limitarCadastroAluno = criarLimitador('cadastro-aluno', 5);
const limitarReenvioConfirmacao = criarLimitador('reenvio-confirmacao', 3);
const limitarEsqueciSenha = criarLimitador('esqueci-senha', 3);
const limitarLoginAluno = criarLimitador('login-aluno', 8);
// Mais apertado: cada acerto aqui é uma conta reivindicada (ver auditoria, item 4.1).
const limitarDefinirSenha = criarLimitador('definir-senha', 5);

module.exports = {
  gerarTokenAdmin, gerarTokenAluno,
  exigirAdmin, exigirAluno,
  limitarTentativasAdmin, limitarCadastroAluno, limitarReenvioConfirmacao, limitarEsqueciSenha,
  limitarLoginAluno, limitarDefinirSenha,
  SENHA_ADMIN, SEGREDO
};
