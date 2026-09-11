const { db } = require('../db');

const SELECT_BASE = `
  SELECT p.*,
         ta.nome AS time_a, ta.escudo_url AS escudo_a,
         tb.nome AS time_b, tb.escudo_url AS escudo_b
  FROM partidas p
  LEFT JOIN times ta ON ta.id = p.id_time_a
  LEFT JOIN times tb ON tb.id = p.id_time_b
`;

const ORDEM_FASES = `
  CASE p.fase
    WHEN 'grupos'  THEN 0 WHEN '32avos' THEN 1 WHEN '16avos' THEN 2
    WHEN 'oitavas' THEN 3 WHEN 'quartas' THEN 4
    WHEN 'semi'    THEN 5 WHEN 'final'   THEN 6 ELSE 7
  END
`;

const listarPorCampeonato = (idCampeonato) => db.prepare(`
  ${SELECT_BASE}
  WHERE p.id_campeonato = ?
  ORDER BY ${ORDEM_FASES}, p.rodada, p.grupo, p.ordem_chave, p.id
`).all(idCampeonato);

const porId = (id) => db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(id);

const golsDaPartida = (idPartida) => db.prepare(`
  SELECT g.id, g.id_jogador, g.quantidade, j.nome, j.numero, j.id_time
  FROM gols g JOIN jogadores j ON j.id = g.id_jogador
  WHERE g.id_partida = ?
  ORDER BY j.nome
`).all(idPartida);

const golsPorCampeonato = (idCampeonato) => db.prepare(`
  SELECT g.id_partida, g.id_jogador, g.quantidade, j.nome, j.id_time
  FROM gols g
  JOIN jogadores j ON j.id = g.id_jogador
  JOIN partidas p  ON p.id = g.id_partida
  WHERE p.id_campeonato = ?
`).all(idCampeonato);

const atualizarAgenda = (id, { data, local }) => db.prepare(
  'UPDATE partidas SET data = ?, local = ? WHERE id = ?'
).run(data || null, local || null, id);

module.exports = {
  listarPorCampeonato, porId, golsDaPartida, golsPorCampeonato, atualizarAgenda
};
