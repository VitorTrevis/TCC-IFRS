/** Lança um erro HTTP com status e mensagem clara. */
function falha(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

/** Envolve controllers async para não precisar de try/catch em cada rota. */
function rota(fn) {
  return (req, res, next) => {
    try {
      const r = fn(req, res, next);
      if (r && typeof r.catch === 'function') r.catch(next);
    } catch (e) {
      next(e);
    }
  };
}

function naoEncontrado(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function tratarErro(erro, req, res, next) {
  const status = erro.status || 500;
  if (status >= 500) console.error(erro);
  res.status(status).json({ erro: erro.message || 'Erro interno no servidor.' });
}

module.exports = { falha, rota, naoEncontrado, tratarErro };
