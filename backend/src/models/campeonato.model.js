const { db } = require('../db');

const listar = () => db.prepare(`
  SELECT c.*,
         (SELECT COUNT(*) FROM times t WHERE t.id_campeonato = c.id)    AS total_times,
         (SELECT COUNT(*) FROM partidas p WHERE p.id_campeonato = c.id) AS total_partidas
  FROM campeonatos c
  ORDER BY c.criado_em DESC
`).all();

const porId = (id) => db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(id);

const criar = async (d) => {
  const r = await db.prepare(`
    INSERT INTO campeonatos
      (nome, modalidade, formato, turno_returno, tamanho_grupo, classificados_grupo,
       data_inicio, data_fim, status)
    VALUES (@nome, @modalidade, @formato, @turno_returno, @tamanho_grupo, @classificados_grupo,
            @data_inicio, @data_fim, @status)
  `).run(d);
  return r.lastInsertRowid;
};

const atualizar = (id, d) => db.prepare(`
  UPDATE campeonatos SET
    nome = @nome, modalidade = @modalidade, formato = @formato,
    turno_returno = @turno_returno, tamanho_grupo = @tamanho_grupo,
    classificados_grupo = @classificados_grupo, data_inicio = @data_inicio,
    data_fim = @data_fim, status = @status
  WHERE id = @id
`).run({ ...d, id });

const remover = (id) => db.prepare('DELETE FROM campeonatos WHERE id = ?').run(id);

module.exports = { listar, porId, criar, atualizar, remover };
