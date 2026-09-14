/**
 * Geração automática da tabela de jogos (RF03).
 *
 * Três formatos:
 *  - pontos_corridos    : algoritmo do círculo (round-robin), com bye se ímpar
 *  - mata_mata          : chaveamento eliminatório com byes distribuídos por seed
 *  - grupos_mata_mata   : grupos em pontos corridos + chave eliminatória já montada
 *
 * Tudo é persistido na tabela `partidas`. Nada é calculado só na tela.
 */

const { db } = require('../db');
const { classificacaoDoGrupo } = require('./classificacao.service');

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Nome da fase a partir da quantidade de partidas daquela rodada da chave. */
function nomeFase(qtdPartidas) {
  const mapa = { 1: 'final', 2: 'semi', 4: 'quartas', 8: 'oitavas', 16: '16avos', 32: '32avos' };
  return mapa[qtdPartidas] || `fase_${qtdPartidas}`;
}

function rotuloFase(fase) {
  const mapa = {
    grupos: 'Fase de grupos', final: 'Final', semi: 'Semifinal',
    quartas: 'Quartas de final', oitavas: 'Oitavas de final',
    '16avos': '16 avos de final', '32avos': '32 avos de final'
  };
  return mapa[fase] || fase;
}

/** Menor potência de 2 maior ou igual a n. */
function potenciaDe2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Ordem clássica de seeds de um chaveamento.
 * Para 8: [1,8,4,5,2,7,3,6] -> os pares (1x8),(4x5),(2x7),(3x6).
 * Garante que os melhores seeds só se encontrem nas fases finais.
 */
function ordemSeeds(tamanho) {
  let seeds = [1];
  while (seeds.length < tamanho) {
    const total = seeds.length * 2;
    const proximo = [];
    for (const s of seeds) {
      proximo.push(s);
      proximo.push(total + 1 - s);
    }
    seeds = proximo;
  }
  return seeds;
}

/**
 * Algoritmo do círculo. Recebe uma lista de itens (ids de time) e devolve
 * um array de rodadas, cada rodada é um array de pares [mandante, visitante].
 * Lista ímpar recebe um "bye" (null) e o time sorteado com ele descansa.
 */
function roundRobin(itens, idaEVolta = false) {
  let lista = [...itens];
  if (lista.length % 2 !== 0) lista.push(null); // bye
  const n = lista.length;
  const rodadas = [];

  for (let r = 0; r < n - 1; r++) {
    const jogos = [];
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a === null || b === null) continue; // quem cai com o bye descansa
      // alterna o mando de campo a cada rodada para equilibrar
      jogos.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rodadas.push(jogos);
    // rotaciona todos menos o primeiro
    lista = [lista[0], lista[n - 1], ...lista.slice(1, n - 1)];
  }

  if (idaEVolta) {
    const volta = rodadas.map((jogos) => jogos.map(([a, b]) => [b, a]));
    rodadas.push(...volta);
  }
  return rodadas;
}

/** Apaga toda a tabela de jogos de um campeonato (usado ao regerar). */
function limparPartidas(idCampeonato) {
  db.prepare('DELETE FROM partidas WHERE id_campeonato = ?').run(idCampeonato);
  db.prepare('UPDATE times SET grupo = NULL WHERE id_campeonato = ?').run(idCampeonato);
}

const inserirPartida = () => db.prepare(`
  INSERT INTO partidas
    (id_campeonato, id_time_a, id_time_b, rotulo_a, rotulo_b, rodada, fase, grupo,
     ordem_chave, id_proxima_partida, slot_proxima, status)
  VALUES
    (@id_campeonato, @id_time_a, @id_time_b, @rotulo_a, @rotulo_b, @rodada, @fase, @grupo,
     @ordem_chave, @id_proxima_partida, @slot_proxima, @status)
`);

function novaPartida(dados) {
  const base = {
    id_time_a: null, id_time_b: null, rotulo_a: null, rotulo_b: null,
    rodada: null, fase: 'grupos', grupo: null, ordem_chave: null,
    id_proxima_partida: null, slot_proxima: null, status: 'agendada'
  };
  return inserirPartida().run({ ...base, ...dados }).lastInsertRowid;
}

/**
 * Monta a árvore do mata-mata inteira de uma vez, da final para trás,
 * ligando cada partida à sua próxima. `pares` tem tamanho potência de 2
 * e cada item é { a, b, rotuloA, rotuloB } (a/b podem ser null).
 */
function montarChave(idCampeonato, pares, rodadaInicial = 1) {
  const totalPrimeiraFase = pares.length;
  const tamanhos = [];
  for (let m = 1; m <= totalPrimeiraFase; m *= 2) tamanhos.push(m);
  // tamanhos = [1, 2, 4, ...] -> final primeiro

  const idsPorNivel = []; // idsPorNivel[0] = [id da final]
  const totalNiveis = tamanhos.length;

  for (let nivel = 0; nivel < totalNiveis; nivel++) {
    const qtd = tamanhos[nivel];
    const fase = nomeFase(qtd);
    const rodada = rodadaInicial + (totalNiveis - 1 - nivel);
    const ids = [];

    for (let j = 0; j < qtd; j++) {
      const ehPrimeiraFase = nivel === totalNiveis - 1;
      const par = ehPrimeiraFase ? pares[j] : null;
      const idProxima = nivel === 0 ? null : idsPorNivel[nivel - 1][Math.floor(j / 2)];
      const slot = nivel === 0 ? null : (j % 2 === 0 ? 'a' : 'b');

      ids.push(novaPartida({
        id_campeonato: idCampeonato,
        id_time_a: par ? par.a : null,
        id_time_b: par ? par.b : null,
        rotulo_a: par ? par.rotuloA : null,
        rotulo_b: par ? par.rotuloB : null,
        rodada,
        fase,
        ordem_chave: j + 1,
        id_proxima_partida: idProxima,
        slot_proxima: slot
      }));
    }
    idsPorNivel.push(ids);
  }

  // Rótulos das fases seguintes: "Vencedor Quartas 3"
  for (let nivel = 0; nivel < totalNiveis - 1; nivel++) {
    const faseAnterior = rotuloFase(nomeFase(tamanhos[nivel + 1]));
    idsPorNivel[nivel].forEach((id, j) => {
      db.prepare('UPDATE partidas SET rotulo_a = ?, rotulo_b = ? WHERE id = ?').run(
        `Vencedor ${faseAnterior} ${j * 2 + 1}`,
        `Vencedor ${faseAnterior} ${j * 2 + 2}`,
        id
      );
    });
  }

  // Byes da primeira fase: quem não tem adversário avança na hora.
  const primeiraFase = idsPorNivel[totalNiveis - 1];
  for (const id of primeiraFase) {
    const p = db.prepare('SELECT * FROM partidas WHERE id = ?').get(id);
    resolverBye(p);
  }

  return idsPorNivel;
}

/** Se a partida tem exatamente um time definido e o outro lado é bye, avança direto. */
function resolverBye(partida) {
  if (!partida) return false;
  const soUm = (partida.id_time_a && partida.rotulo_b === 'BYE' && !partida.id_time_b)
    || (partida.id_time_b && partida.rotulo_a === 'BYE' && !partida.id_time_a);
  if (!soUm) return false;

  const vencedor = partida.id_time_a || partida.id_time_b;
  db.prepare("UPDATE partidas SET status = 'bye' WHERE id = ?").run(partida.id);
  promoverVencedor(partida, vencedor);
  return true;
}

/** Coloca o time vencedor no slot correspondente da próxima partida da chave. */
function promoverVencedor(partida, idVencedor) {
  if (!partida.id_proxima_partida) return;
  const coluna = partida.slot_proxima === 'a' ? 'id_time_a' : 'id_time_b';
  const rotulo = partida.slot_proxima === 'a' ? 'rotulo_a' : 'rotulo_b';
  db.prepare(`UPDATE partidas SET ${coluna} = ?, ${rotulo} = NULL WHERE id = ?`)
    .run(idVencedor, partida.id_proxima_partida);
}

// ---------------------------------------------------------------------------
// Geradores por formato
// ---------------------------------------------------------------------------

function gerarPontosCorridos(campeonato, times) {
  const rodadas = roundRobin(times.map((t) => t.id), campeonato.turno_returno === 1);
  rodadas.forEach((jogos, i) => {
    jogos.forEach(([a, b]) => {
      novaPartida({
        id_campeonato: campeonato.id,
        id_time_a: a, id_time_b: b,
        rodada: i + 1, fase: 'grupos'
      });
    });
  });
  return { rodadas: rodadas.length, partidas: rodadas.flat().length };
}

function gerarMataMata(campeonato, times) {
  const tamanho = potenciaDe2(times.length);
  const seeds = ordemSeeds(tamanho);
  const pares = [];

  for (let i = 0; i < seeds.length; i += 2) {
    const sA = seeds[i];
    const sB = seeds[i + 1];
    const timeA = sA <= times.length ? times[sA - 1].id : null;
    const timeB = sB <= times.length ? times[sB - 1].id : null;
    pares.push({
      a: timeA, b: timeB,
      rotuloA: timeA ? null : 'BYE',
      rotuloB: timeB ? null : 'BYE'
    });
  }

  montarChave(campeonato.id, pares, 1);
  return { fases: Math.log2(tamanho), partidas: tamanho - 1 };
}

function gerarGruposMataMata(campeonato, times) {
  const porGrupo = Math.max(2, campeonato.tamanho_grupo || 4);
  const qtdGrupos = Math.max(2, Math.ceil(times.length / porGrupo));
  const grupos = Array.from({ length: qtdGrupos }, () => []);

  // Distribuição em serpentina: equilibra o tamanho dos grupos.
  times.forEach((time, i) => {
    const volta = Math.floor(i / qtdGrupos);
    const pos = volta % 2 === 0 ? i % qtdGrupos : qtdGrupos - 1 - (i % qtdGrupos);
    grupos[pos].push(time);
  });

  const atualizarGrupo = db.prepare('UPDATE times SET grupo = ? WHERE id = ?');
  let maiorRodada = 0;

  grupos.forEach((timesDoGrupo, g) => {
    const letra = LETRAS[g];
    timesDoGrupo.forEach((t) => atualizarGrupo.run(letra, t.id));

    const rodadas = roundRobin(timesDoGrupo.map((t) => t.id), campeonato.turno_returno === 1);
    rodadas.forEach((jogos, i) => {
      jogos.forEach(([a, b]) => {
        novaPartida({
          id_campeonato: campeonato.id,
          id_time_a: a, id_time_b: b,
          rodada: i + 1, fase: 'grupos', grupo: letra
        });
      });
    });
    maiorRodada = Math.max(maiorRodada, rodadas.length);
  });

  // Chave eliminatória montada com rótulos ("1º do Grupo A") até o fim dos grupos.
  const porGrupoClassificam = Math.max(1, campeonato.classificados_grupo || 2);
  const rotulos = [];
  for (let pos = 1; pos <= porGrupoClassificam; pos++) {
    for (let g = 0; g < qtdGrupos; g++) rotulos.push(`${pos}º do Grupo ${LETRAS[g]}`);
  }

  const tamanho = potenciaDe2(rotulos.length);
  const seeds = ordemSeeds(tamanho);
  const pares = [];
  for (let i = 0; i < seeds.length; i += 2) {
    const sA = seeds[i];
    const sB = seeds[i + 1];
    pares.push({
      a: null, b: null,
      rotuloA: sA <= rotulos.length ? rotulos[sA - 1] : 'BYE',
      rotuloB: sB <= rotulos.length ? rotulos[sB - 1] : 'BYE'
    });
  }

  montarChave(campeonato.id, pares, maiorRodada + 1);
  return { grupos: qtdGrupos, classificados: rotulos.length };
}

/** Ponto de entrada usado pelo controller. */
function gerarTabela(campeonato) {
  const times = db.prepare(
    'SELECT * FROM times WHERE id_campeonato = ? ORDER BY id'
  ).all(campeonato.id);

  const minimo = campeonato.formato === 'grupos_mata_mata' ? 4 : 2;
  if (times.length < minimo) {
    const erro = new Error(`Cadastre pelo menos ${minimo} times antes de gerar a tabela.`);
    erro.status = 400;
    throw erro;
  }

  const transacao = db.transaction(() => {
    limparPartidas(campeonato.id);
    let resumo;
    if (campeonato.formato === 'pontos_corridos') resumo = gerarPontosCorridos(campeonato, times);
    else if (campeonato.formato === 'mata_mata') resumo = gerarMataMata(campeonato, times);
    else if (campeonato.formato === 'grupos_mata_mata') resumo = gerarGruposMataMata(campeonato, times);
    else {
      const erro = new Error(`Formato inválido: ${campeonato.formato}`);
      erro.status = 400;
      throw erro;
    }
    db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ?").run(campeonato.id);
    return resumo;
  });

  return transacao();
}

/**
 * Quando todas as partidas de grupo terminam, preenche a primeira fase
 * do mata-mata com os times realmente classificados. Idempotente.
 */
function preencherMataMataComClassificados(idCampeonato) {
  const campeonato = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(idCampeonato);
  if (!campeonato || campeonato.formato !== 'grupos_mata_mata') return false;

  const pendentes = db.prepare(`
    SELECT COUNT(*) AS n FROM partidas
    WHERE id_campeonato = ? AND fase = 'grupos' AND status NOT IN ('finalizada','bye')
  `).get(idCampeonato).n;
  if (pendentes > 0) return false;

  // Primeira fase da chave = maior quantidade de partidas fora de 'grupos'
  const fases = db.prepare(`
    SELECT fase, COUNT(*) AS n FROM partidas
    WHERE id_campeonato = ? AND fase <> 'grupos'
    GROUP BY fase ORDER BY n DESC LIMIT 1
  `).get(idCampeonato);
  if (!fases) return false;

  const partidas = db.prepare(`
    SELECT * FROM partidas WHERE id_campeonato = ? AND fase = ? ORDER BY ordem_chave
  `).all(idCampeonato, fases.fase);

  const jaPreenchida = partidas.some((p) => p.id_time_a || p.id_time_b);
  if (jaPreenchida) return false;

  const letras = db.prepare(`
    SELECT DISTINCT grupo FROM times WHERE id_campeonato = ? AND grupo IS NOT NULL ORDER BY grupo
  `).all(idCampeonato).map((r) => r.grupo);

  const mapa = new Map(); // "1º do Grupo A" -> id do time
  for (const letra of letras) {
    const tabela = classificacaoDoGrupo(idCampeonato, letra);
    tabela.forEach((linha, i) => mapa.set(`${i + 1}º do Grupo ${letra}`, linha.id_time));
  }

  const atualizar = db.prepare(
    'UPDATE partidas SET id_time_a = ?, id_time_b = ? WHERE id = ?'
  );

  db.transaction(() => {
    for (const p of partidas) {
      const a = mapa.get(p.rotulo_a) || null;
      const b = mapa.get(p.rotulo_b) || null;
      atualizar.run(a, b, p.id);
    }
    for (const p of partidas) {
      resolverBye(db.prepare('SELECT * FROM partidas WHERE id = ?').get(p.id));
    }
  })();

  return true;
}

module.exports = {
  gerarTabela,
  promoverVencedor,
  preencherMataMataComClassificados,
  rotuloFase,
  roundRobin,
  ordemSeeds
};
