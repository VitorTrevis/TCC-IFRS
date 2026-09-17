const { db } = require('../db');

const listarPorTime = (idTime) => db.prepare(`
  SELECT j.*, a.nome AS aluno_nome, COALESCE((
    SELECT SUM(g.quantidade) FROM gols g WHERE g.id_jogador = j.id
  ), 0) AS gols
  FROM jogadores j
  LEFT JOIN alunos a ON a.id = j.id_aluno
  WHERE j.id_time = ? ORDER BY j.numero IS NULL, j.numero, j.nome
`).all(idTime);

const porId = (id) => db.prepare(`
  SELECT j.*, t.id_campeonato FROM jogadores j
  JOIN times t ON t.id = j.id_time WHERE j.id = ?
`).get(id);

const criar = async ({ nome, numero, id_time, id_aluno }) => {
  const r = await db.prepare(
    'INSERT INTO jogadores (nome, numero, id_time, id_aluno) VALUES (?, ?, ?, ?)'
  ).run(nome.trim(), numero ?? null, id_time, id_aluno ?? null);
  return r.lastInsertRowid;
};

const atualizar = (id, { nome, numero, id_aluno }) => db.prepare(
  'UPDATE jogadores SET nome = ?, numero = ?, id_aluno = ? WHERE id = ?'
).run(nome.trim(), numero ?? null, id_aluno ?? null, id);

const totalGols = async (id) => {
  const r = await db.prepare('SELECT COALESCE(SUM(quantidade), 0) AS n FROM gols WHERE id_jogador = ?').get(id);
  return r.n;
};

const remover = (id) => db.prepare('DELETE FROM jogadores WHERE id = ?').run(id);

module.exports = { listarPorTime, porId, criar, atualizar, remover, totalGols };
