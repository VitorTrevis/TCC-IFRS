const { db } = require('../db');

const listarPorCampeonato = (idCampeonato) => db.prepare(`
  SELECT t.*, (SELECT COUNT(*) FROM jogadores j WHERE j.id_time = t.id) AS total_jogadores
  FROM times t WHERE t.id_campeonato = ? ORDER BY t.grupo, t.nome
`).all(idCampeonato);

const porId = (id) => db.prepare('SELECT * FROM times WHERE id = ?').get(id);

const existeNome = (idCampeonato, nome, ignorarId = 0) => db.prepare(`
  SELECT 1 FROM times
  WHERE id_campeonato = ? AND LOWER(nome) = LOWER(?) AND id <> ?
`).get(idCampeonato, nome.trim(), ignorarId);

const criar = async ({ nome, id_campeonato, escudo_url }) => {
  const r = await db.prepare(
    'INSERT INTO times (nome, id_campeonato, escudo_url) VALUES (?, ?, ?)'
  ).run(nome.trim(), id_campeonato, escudo_url || null);
  return r.lastInsertRowid;
};

const atualizar = (id, { nome, escudo_url }) => db.prepare(
  'UPDATE times SET nome = ?, escudo_url = ? WHERE id = ?'
).run(nome.trim(), escudo_url || null, id);

const remover = (id) => db.prepare('DELETE FROM times WHERE id = ?').run(id);

module.exports = { listarPorCampeonato, porId, existeNome, criar, atualizar, remover };
