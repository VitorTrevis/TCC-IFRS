/**
 * Classificação (RF05) e artilharia (RF06).
 *
 * A classificação NUNCA é digitada nem armazenada: é recalculada a partir das
 * partidas finalizadas toda vez que alguém pede. Isso elimina qualquer chance
 * de a tabela ficar dessincronizada do placar.
 *
 * Critérios de desempate (padrão CBF):
 *   1. Pontos (V=3, E=1, D=0)   2. Vitórias   3. Saldo de gols
 *   4. Gols pró                 5. Confronto direto (mini tabela entre os empatados)
 *   6. Ordem alfabética
 */

const { db } = require('../db');

function linhaVazia(time) {
  return {
    id_time: time.id,
    nome: time.nome,
    escudo_url: time.escudo_url,
    grupo: time.grupo,
    jogos: 0, pontos: 0, vitorias: 0, empates: 0, derrotas: 0,
    gols_pro: 0, gols_contra: 0, saldo: 0, aproveitamento: 0
  };
}

function aplicarPartida(tabela, p) {
  const a = tabela.get(p.id_time_a);
  const b = tabela.get(p.id_time_b);
  if (!a || !b) return;

  const ga = p.gols_a ?? 0;
  const gb = p.gols_b ?? 0;

  a.jogos++; b.jogos++;
  a.gols_pro += ga; a.gols_contra += gb;
  b.gols_pro += gb; b.gols_contra += ga;

  if (ga > gb) { a.vitorias++; a.pontos += 3; b.derrotas++; }
  else if (gb > ga) { b.vitorias++; b.pontos += 3; a.derrotas++; }
  else { a.empates++; b.empates++; a.pontos++; b.pontos++; }
}

/** Mini tabela considerando somente os jogos entre os times informados. */
function confrontoDireto(partidas, ids) {
  const conjunto = new Set(ids);
  const mapa = new Map(ids.map((id) => [id, { pontos: 0, saldo: 0, gols_pro: 0 }]));

  for (const p of partidas) {
    if (!conjunto.has(p.id_time_a) || !conjunto.has(p.id_time_b)) continue;
    const a = mapa.get(p.id_time_a);
    const b = mapa.get(p.id_time_b);
    const ga = p.gols_a ?? 0;
    const gb = p.gols_b ?? 0;
    a.gols_pro += ga; b.gols_pro += gb;
    a.saldo += ga - gb; b.saldo += gb - ga;
    if (ga > gb) a.pontos += 3;
    else if (gb > ga) b.pontos += 3;
    else { a.pontos++; b.pontos++; }
  }
  return mapa;
}

/**
 * Classificação de um grupo. `grupo` = null significa "todos os times do
 * campeonato numa tabela só" (formato pontos corridos).
 */
function classificacaoDoGrupo(idCampeonato, grupo = null) {
  const times = grupo === null
    ? db.prepare('SELECT * FROM times WHERE id_campeonato = ? ORDER BY nome').all(idCampeonato)
    : db.prepare('SELECT * FROM times WHERE id_campeonato = ? AND grupo = ? ORDER BY nome')
        .all(idCampeonato, grupo);

  const partidas = grupo === null
    ? db.prepare(`SELECT * FROM partidas
                  WHERE id_campeonato = ? AND fase = 'grupos' AND status = 'finalizada'`)
        .all(idCampeonato)
    : db.prepare(`SELECT * FROM partidas
                  WHERE id_campeonato = ? AND fase = 'grupos' AND grupo = ? AND status = 'finalizada'`)
        .all(idCampeonato, grupo);

  const tabela = new Map(times.map((t) => [t.id, linhaVazia(t)]));
  partidas.forEach((p) => aplicarPartida(tabela, p));

  const linhas = [...tabela.values()];
  for (const l of linhas) {
    l.saldo = l.gols_pro - l.gols_contra;
    l.aproveitamento = l.jogos ? Math.round((l.pontos / (l.jogos * 3)) * 100) : 0;
  }

  // Critérios 1 a 4
  linhas.sort((x, y) =>
    y.pontos - x.pontos ||
    y.vitorias - x.vitorias ||
    y.saldo - x.saldo ||
    y.gols_pro - x.gols_pro
  );

  // Critério 5 e 6 dentro de cada bloco ainda empatado
  const iguais = (x, y) => x.pontos === y.pontos && x.vitorias === y.vitorias
    && x.saldo === y.saldo && x.gols_pro === y.gols_pro;

  let i = 0;
  while (i < linhas.length) {
    let j = i + 1;
    while (j < linhas.length && iguais(linhas[i], linhas[j])) j++;
    if (j - i > 1) {
      const bloco = linhas.slice(i, j);
      const mini = confrontoDireto(partidas, bloco.map((l) => l.id_time));
      bloco.sort((x, y) => {
        const mx = mini.get(x.id_time);
        const my = mini.get(y.id_time);
        return my.pontos - mx.pontos ||
          my.saldo - mx.saldo ||
          my.gols_pro - mx.gols_pro ||
          x.nome.localeCompare(y.nome, 'pt-BR');
      });
      linhas.splice(i, j - i, ...bloco);
    }
    i = j;
  }

  linhas.forEach((l, idx) => { l.posicao = idx + 1; });
  return linhas;
}

/** Classificação completa: uma tabela por grupo, ou tabela única. */
function classificacao(idCampeonato) {
  const campeonato = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(idCampeonato);
  if (!campeonato) return [];

  if (campeonato.formato === 'mata_mata') return [];

  const grupos = db.prepare(`
    SELECT DISTINCT grupo FROM times
    WHERE id_campeonato = ? AND grupo IS NOT NULL ORDER BY grupo
  `).all(idCampeonato).map((r) => r.grupo);

  if (grupos.length === 0) {
    return [{ grupo: null, tabela: classificacaoDoGrupo(idCampeonato, null) }];
  }
  return grupos.map((g) => ({ grupo: g, tabela: classificacaoDoGrupo(idCampeonato, g) }));
}

/** Ranking de artilheiros do campeonato. */
function artilheiros(idCampeonato) {
  return db.prepare(`
    SELECT j.id AS id_jogador, j.nome, j.numero, t.id AS id_time, t.nome AS time,
           SUM(g.quantidade) AS gols
    FROM gols g
    JOIN jogadores j ON j.id = g.id_jogador
    JOIN times t     ON t.id = j.id_time
    JOIN partidas p  ON p.id = g.id_partida
    WHERE p.id_campeonato = ?
    GROUP BY j.id
    ORDER BY gols DESC, j.nome ASC
  `).all(idCampeonato).map((linha, i) => ({ posicao: i + 1, ...linha }));
}

module.exports = { classificacao, classificacaoDoGrupo, artilheiros };
