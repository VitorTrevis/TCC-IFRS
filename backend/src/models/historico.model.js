const { db } = require('../db');

/** Grava uma linha no historico. Chamado pelos controllers logo apos a
 *  acao de escrita ter sido confirmada no banco. */
const registrar = ({ nome, acao, entidade, entidade_id, descricao }) => db.prepare(`
  INSERT INTO historico (nome, acao, entidade, entidade_id, descricao)
  VALUES (?, ?, ?, ?, ?)
`).run(nome, acao, entidade, entidade_id ?? null, descricao);

const listar = (limite = 300) => db.prepare(`
  SELECT * FROM historico ORDER BY criado_em DESC, id DESC LIMIT ?
`).all(limite);

module.exports = { registrar, listar };
