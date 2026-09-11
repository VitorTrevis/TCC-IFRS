const jwt = require('jsonwebtoken');

const SEGREDO = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';
const VALIDADE = process.env.JWT_EXPIRES || '8h';
const SENHA_ADMIN = process.env.ADMIN_PASSWORD || 'ifrs2026';

function gerarTokenAdmin() {
  return jwt.sign({ role: 'admin' }, SEGREDO, { expiresIn: VALIDADE });
}

function gerarTokenAluno(aluno) {
  return jwt.sign({ role: 'aluno', id: aluno.id, nome: aluno.nome }, SEGREDO, { expiresIn: VALIDADE });
}

function extrairToken(req) {
  const cabecalho = req.headers.authorization || '';
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
}

/** Bloqueia a rota se nao vier um token de admin valido. */
function exigirAdmin(req, res, next) {
  const token = extrairToken(req);
  if (!token) {
    return res.status(401).json({ erro: 'Entre com a senha da coordenacao para fazer isso.' });
  }
  try {
    const dados = jwt.verify(token, SEGREDO);
    if (dados.role !== 'admin') {
      return res.status(403).json({ erro: 'Essa acao e restrita a coordenacao.' });
    }
    req.admin = true;
    next();
  } catch (e) {
    res.status(401).json({ erro: 'Sessao expirada. Entre novamente.' });
  }
}

/** Bloqueia a rota se nao vier um token de aluno valido. */
function exigirAluno(req, res, next) {
  const token = extrairToken(req);
  if (!token) {
    return res.status(401).json({ erro: 'Faca login para ver seus dados.' });
  }
  try {
    const dados = jwt.verify(token, SEGREDO);
    if (dados.role !== 'aluno') {
      return res.status(403).json({ erro: 'Essa area e exclusiva de alunos.' });
    }
    req.aluno = { id: dados.id, nome: dados.nome };
    next();
  } catch (e) {
    res.status(401).json({ erro: 'Sessao expirada. Entre novamente.' });
  }
}

// ---------------------------------------------------------------------------
// Limite simples de tentativas por IP (protege login/cadastro/reenvio de
// forca bruta e de spam de e-mail). Em memoria: reinicia se o servidor
// reiniciar, o que e aceitavel para o volume de uso de uma escola.
// ---------------------------------------------------------------------------
const JANELA_MS = 60 * 1000;
const tentativasPorChave = new Map();

/** Cria um middleware de limite de tentativas por IP, com janela de 1 minuto.
 *  `rotulo` separa os contadores de rotas diferentes (ex: 'admin', 'cadastro-aluno')
 *  para que o limite de uma nao consuma o da outra. */
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

module.exports = {
  gerarTokenAdmin, gerarTokenAluno,
  exigirAdmin, exigirAluno,
  limitarTentativasAdmin, limitarCadastroAluno, limitarReenvioConfirmacao, limitarEsqueciSenha,
  SENHA_ADMIN, SEGREDO
};
