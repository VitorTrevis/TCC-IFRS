const { gerarTokenAdmin, SENHA_ADMIN } = require('../middlewares/auth');
const { falha } = require('../middlewares/erros');

function entrar(req, res) {
  const { senha } = req.body || {};
  const nome = (req.body?.nome || '').toString().trim();

  if (!nome || nome.length < 2) {
    falha(400, 'Informe seu nome — ele fica registrado no histórico de alterações.');
  }
  if (!senha) falha(400, 'Informe a senha da coordenação.');
  if (senha !== SENHA_ADMIN) falha(401, 'Senha incorreta.');

  res.json({ token: gerarTokenAdmin(nome), nome });
}

module.exports = { entrar };
