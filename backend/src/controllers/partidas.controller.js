const { db } = require('../db');
const Partida = require('../models/partida.model');
const Campeonato = require('../models/campeonato.model');
const { falha } = require('../middlewares/erros');
const { promoverVencedor, preencherMataMataComClassificados } = require('../services/tabela.service');

function partidaOuFalha(id) {
  const p = Partida.porId(id);
  if (!p) falha(404, 'Partida nao encontrada.');
  return p;
}

function inteiroNaoNegativo(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0 || n > 999) falha(400, `${campo} precisa ser um numero inteiro de 0 a 999.`);
  return n;
}

function listar(req, res) {
  const campeonato = Campeonato.porId(req.params.id);
  if (!campeonato) falha(404, 'Campeonato nao encontrado.');

  const partidas = Partida.listarPorCampeonato(campeonato.id);
  const gols = Partida.golsPorCampeonato(campeonato.id);
  const porPartida = new Map();
  for (const g of gols) {
    if (!porPartida.has(g.id_partida)) porPartida.set(g.id_partida, []);
    porPartida.get(g.id_partida).push(g);
  }
  res.json(partidas.map((p) => ({ ...p, gols: porPartida.get(p.id) || [] })));
}

function detalhar(req, res) {
  const p = partidaOuFalha(req.params.id);
  res.json({ ...p, gols: Partida.golsDaPartida(p.id) });
}

function atualizarAgenda(req, res) {
  const p = partidaOuFalha(req.params.id);
  Partida.atualizarAgenda(p.id, { data: req.body?.data, local: req.body?.local });
  res.json(Partida.porId(p.id));
}

/** Impede editar um resultado quando a fase seguinte da chave ja foi jogada. */
function travarSeProximaJaJogada(partida) {
  if (!partida.id_proxima_partida) return;
  const proxima = db.prepare('SELECT status FROM partidas WHERE id = ?').get(partida.id_proxima_partida);
  if (proxima && proxima.status === 'finalizada') {
    falha(400, 'A partida seguinte da chave ja foi jogada. Apague o resultado dela antes de mudar este.');
  }
}

function registrarResultado(req, res) {
  const partida = partidaOuFalha(req.params.id);

  if (partida.status === 'bye') falha(400, 'Esta partida e um bye: o time avancou sem jogar.');
  if (!partida.id_time_a || !partida.id_time_b) {
    falha(400, 'Os times desta partida ainda nao foram definidos pela fase anterior.');
  }

  const gols_a = inteiroNaoNegativo(req.body?.gols_a, 'Gols do mandante');
  const gols_b = inteiroNaoNegativo(req.body?.gols_b, 'Gols do visitante');

  const eliminatoria = partida.fase !== 'grupos';
  let penaltis_a = null;
  let penaltis_b = null;

  if (eliminatoria && gols_a === gols_b) {
    if (req.body?.penaltis_a === undefined || req.body?.penaltis_b === undefined) {
      falha(400, 'Empate em fase eliminatoria: informe a disputa de penaltis.');
    }
    penaltis_a = inteiroNaoNegativo(req.body.penaltis_a, 'Penaltis do mandante');
    penaltis_b = inteiroNaoNegativo(req.body.penaltis_b, 'Penaltis do visitante');
    if (penaltis_a === penaltis_b) falha(400, 'A disputa de penaltis nao pode terminar empatada.');
  }

  // Gols por jogador (opcional, mas necessario para o ranking de artilheiros)
  const lista = Array.isArray(req.body?.gols) ? req.body.gols : [];
  const elenco = db.prepare(
    'SELECT id, id_time FROM jogadores WHERE id_time IN (?, ?)'
  ).all(partida.id_time_a, partida.id_time_b);
  const time = new Map(elenco.map((j) => [j.id, j.id_time]));

  let somaA = 0;
  let somaB = 0;
  const normalizados = [];

  for (const item of lista) {
    const idJogador = Number(item?.id_jogador);
    const quantidade = Number(item?.quantidade ?? 1);
    if (!time.has(idJogador)) falha(400, 'Um dos jogadores informados nao joga por nenhum dos dois times.');
    if (!Number.isInteger(quantidade) || quantidade < 1) falha(400, 'A quantidade de gols de cada jogador precisa ser 1 ou mais.');
    if (time.get(idJogador) === partida.id_time_a) somaA += quantidade;
    else somaB += quantidade;
    normalizados.push({ id_jogador: idJogador, quantidade });
  }

  if (somaA > gols_a) falha(400, 'Os gols marcados pelos jogadores do mandante passam do placar informado.');
  if (somaB > gols_b) falha(400, 'Os gols marcados pelos jogadores do visitante passam do placar informado.');

  if (eliminatoria) travarSeProximaJaJogada(partida);

  db.transaction(() => {
    db.prepare('DELETE FROM gols WHERE id_partida = ?').run(partida.id);
    const inserir = db.prepare('INSERT INTO gols (id_partida, id_jogador, quantidade) VALUES (?, ?, ?)');
    for (const g of normalizados) inserir.run(partida.id, g.id_jogador, g.quantidade);

    db.prepare(`
      UPDATE partidas
      SET gols_a = ?, gols_b = ?, penaltis_a = ?, penaltis_b = ?, status = 'finalizada'
      WHERE id = ?
    `).run(gols_a, gols_b, penaltis_a, penaltis_b, partida.id);

    if (eliminatoria) {
      let vencedor;
      if (gols_a > gols_b) vencedor = partida.id_time_a;
      else if (gols_b > gols_a) vencedor = partida.id_time_b;
      else vencedor = penaltis_a > penaltis_b ? partida.id_time_a : partida.id_time_b;
      promoverVencedor(partida, vencedor);
    }

    db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ? AND status = 'planejado'")
      .run(partida.id_campeonato);
  })();

  if (!eliminatoria) preencherMataMataComClassificados(partida.id_campeonato);
  fecharCampeonatoSeAcabou(partida.id_campeonato);

  res.json({ ...Partida.porId(partida.id), gols: Partida.golsDaPartida(partida.id) });
}

function apagarResultado(req, res) {
  const partida = partidaOuFalha(req.params.id);
  if (partida.status !== 'finalizada') falha(400, 'Esta partida ainda nao tem resultado lancado.');
  if (partida.fase !== 'grupos') travarSeProximaJaJogada(partida);

  db.transaction(() => {
    db.prepare('DELETE FROM gols WHERE id_partida = ?').run(partida.id);
    db.prepare(`
      UPDATE partidas
      SET gols_a = NULL, gols_b = NULL, penaltis_a = NULL, penaltis_b = NULL, status = 'agendada'
      WHERE id = ?
    `).run(partida.id);

    // limpa o time que tinha avancado por causa deste resultado
    if (partida.id_proxima_partida) {
      const coluna = partida.slot_proxima === 'a' ? 'id_time_a' : 'id_time_b';
      db.prepare(`UPDATE partidas SET ${coluna} = NULL WHERE id = ?`).run(partida.id_proxima_partida);
    }
    db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ?").run(partida.id_campeonato);
  })();

  res.json(Partida.porId(partida.id));
}

/** Marca o campeonato como finalizado quando nao sobra nenhuma partida em aberto. */
function fecharCampeonatoSeAcabou(idCampeonato) {
  const abertas = db.prepare(`
    SELECT COUNT(*) AS n FROM partidas
    WHERE id_campeonato = ? AND status NOT IN ('finalizada', 'bye')
  `).get(idCampeonato).n;
  const total = db.prepare('SELECT COUNT(*) AS n FROM partidas WHERE id_campeonato = ?')
    .get(idCampeonato).n;

  if (total > 0 && abertas === 0) {
    db.prepare("UPDATE campeonatos SET status = 'finalizado' WHERE id = ?").run(idCampeonato);
  }
}

module.exports = { listar, detalhar, atualizarAgenda, registrarResultado, apagarResultado };
