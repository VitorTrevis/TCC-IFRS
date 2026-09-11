const { gerarTokenAdmin, SENHA_ADMIN } = require('../middlewares/auth');
const { falha } = require('../middlewares/erros');

function entrar(req, res) {
  const { senha } = req.body || {};
  if (!senha) falha(400, 'Informe a senha da coordenacao.');
  if (senha !== SENHA_ADMIN) falha(401, 'Senha incorreta.');
  res.json({ token: gerarTokenAdmin() });
}

module.exports = { entrar };
