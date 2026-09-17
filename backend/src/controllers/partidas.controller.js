const { db } = require('../db');
const Partida = require('../models/partida.model');
const Campeonato = require('../models/campeonato.model');
const Historico = require('../models/historico.model');
const { falha } = require('../middlewares/erros');
const { promoverVencedor, preencherMataMataComClassificados, chaveTemResultado } = require('../services/tabela.service');

async function partidaOuFalha(id) {
  const p = await Partida.porId(id);
  if (!p) falha(404, 'Partida não encontrada.');
  return p;
}

function inteiroNaoNegativo(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0 || n > 999) falha(400, `${campo} precisa ser um número inteiro de 0 a 999.`);
  return n;
}

async function listar(req, res) {
  const campeonato = await Campeonato.porId(req.params.id);
  if (!campeonato) falha(404, 'Campeonato não encontrado.');

  const partidas = await Partida.listarPorCampeonato(campeonato.id);
  const gols = await Partida.golsPorCampeonato(campeonato.id);
  const porPartida = new Map();
  for (const g of gols) {
    if (!porPartida.has(g.id_partida)) porPartida.set(g.id_partida, []);
    porPartida.get(g.id_partida).push(g);
  }
  res.json(partidas.map((p) => ({ ...p, gols: porPartida.get(p.id) || [] })));
}

async function detalhar(req, res) {
  const p = await partidaOuFalha(req.params.id);
  res.json({ ...p, gols: await Partida.golsDaPartida(p.id) });
}

async function atualizarAgenda(req, res) {
  const p = await partidaOuFalha(req.params.id);
  await Partida.atualizarAgenda(p.id, { data: req.body?.data, local: req.body?.local });
  res.json(await Partida.porId(p.id));
}

/** Impede editar um resultado quando a fase seguinte da chave já foi jogada. */
async function travarSeProximaJaJogada(partida) {
  if (!partida.id_proxima_partida) return;
  const proxima = await db.prepare('SELECT status FROM partidas WHERE id = ?').get(partida.id_proxima_partida);
  if (proxima && proxima.status === 'finalizada') {
    falha(400, 'A partida seguinte da chave já foi jogada. Apague o resultado dela antes de mudar este placar.');
  }
}

/** Impede corrigir/apagar um placar da fase de grupos depois que a chave
 *  eliminatória (montada a partir da classificação) já tem jogo decidido —
 *  mudar quem classificou agora invalidaria um resultado que já aconteceu. */
async function travarSeChaveJaComecou(partida) {
  if (partida.fase !== 'grupos') return;
  if (await chaveTemResultado(partida.id_campeonato)) {
    falha(400, 'A chave eliminatória já tem jogo decidido com base na classificação atual dos grupos. Apague o(s) resultado(s) da chave antes de corrigir um placar da fase de grupos.');
  }
}

async function registrarResultado(req, res) {
  const partida = await partidaOuFalha(req.params.id);

  if (partida.status === 'bye') falha(400, 'Esta partida é um bye: o time avançou sem jogar.');
  if (!partida.id_time_a || !partida.id_time_b) {
    falha(400, 'Os times desta partida ainda não foram definidos pela fase anterior.');
  }

  const gols_a = inteiroNaoNegativo(req.body?.gols_a, 'Gols do mandante');
  const gols_b = inteiroNaoNegativo(req.body?.gols_b, 'Gols do visitante');

  const eliminatoria = partida.fase !== 'grupos';
  let penaltis_a = null;
  let penaltis_b = null;

  if (eliminatoria && gols_a === gols_b) {
    if (req.body?.penaltis_a === undefined || req.body?.penaltis_b === undefined) {
      falha(400, 'Empate em fase eliminatória: informe a disputa de pênaltis.');
    }
    penaltis_a = inteiroNaoNegativo(req.body.penaltis_a, 'Pênaltis do mandante');
    penaltis_b = inteiroNaoNegativo(req.body.penaltis_b, 'Pênaltis do visitante');
    if (penaltis_a === penaltis_b) falha(400, 'A disputa de pênaltis não pode terminar empatada.');
  }

  // Gols por jogador (opcional, mas necessário para o ranking de artilheiros)
  const lista = Array.isArray(req.body?.gols) ? req.body.gols : [];
  const elenco = await db.prepare(
    'SELECT id, id_time FROM jogadores WHERE id_time IN (?, ?)'
  ).all(partida.id_time_a, partida.id_time_b);
  const time = new Map(elenco.map((j) => [j.id, j.id_time]));

  let somaA = 0;
  let somaB = 0;
  const normalizados = [];

  for (const item of lista) {
    const idJogador = Number(item?.id_jogador);
    const quantidade = Number(item?.quantidade ?? 1);
    if (!time.has(idJogador)) falha(400, 'Um dos jogadores informados não joga por nenhum dos dois times.');
    if (!Number.isInteger(quantidade) || quantidade < 1) falha(400, 'A quantidade de gols de cada jogador precisa ser 1 ou mais.');
    if (time.get(idJogador) === partida.id_time_a) somaA += quantidade;
    else somaB += quantidade;
    normalizados.push({ id_jogador: idJogador, quantidade });
  }

  if (somaA > gols_a) falha(400, 'Os gols marcados pelos jogadores do mandante ultrapassam o placar informado.');
  if (somaB > gols_b) falha(400, 'Os gols marcados pelos jogadores do visitante ultrapassam o placar informado.');

  if (eliminatoria) await travarSeProximaJaJogada(partida);
  else await travarSeChaveJaComecou(partida);

  await db.transaction(async () => {
    await db.prepare('DELETE FROM gols WHERE id_partida = ?').run(partida.id);
    const inserir = db.prepare('INSERT INTO gols (id_partida, id_jogador, quantidade) VALUES (?, ?, ?)');
    for (const g of normalizados) await inserir.run(partida.id, g.id_jogador, g.quantidade);

    await db.prepare(`
      UPDATE partidas
      SET gols_a = ?, gols_b = ?, penaltis_a = ?, penaltis_b = ?, status = 'finalizada'
      WHERE id = ?
    `).run(gols_a, gols_b, penaltis_a, penaltis_b, partida.id);

    if (eliminatoria) {
      let vencedor;
      if (gols_a > gols_b) vencedor = partida.id_time_a;
      else if (gols_b > gols_a) vencedor = partida.id_time_b;
      else vencedor = penaltis_a > penaltis_b ? partida.id_time_a : partida.id_time_b;
      await promoverVencedor(partida, vencedor);
    }

    await db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ? AND status = 'planejado'")
      .run(partida.id_campeonato);
  })();

  if (!eliminatoria) await preencherMataMataComClassificados(partida.id_campeonato);
  await fecharCampeonatoSeAcabou(partida.id_campeonato);

  await Historico.registrar({
    nome: req.admin.nome, acao: 'lancar_placar', entidade: 'partida', entidade_id: partida.id,
    descricao: `lançou o placar de "${partida.time_a} ${gols_a} x ${gols_b} ${partida.time_b}"`
  });
  res.json({ ...(await Partida.porId(partida.id)), gols: await Partida.golsDaPartida(partida.id) });
}

async function apagarResultado(req, res) {
  const partida = await partidaOuFalha(req.params.id);
  if (partida.status !== 'finalizada') falha(400, 'Esta partida ainda não tem resultado lançado.');
  if (partida.fase !== 'grupos') await travarSeProximaJaJogada(partida);
  else await travarSeChaveJaComecou(partida);

  await db.transaction(async () => {
    await db.prepare('DELETE FROM gols WHERE id_partida = ?').run(partida.id);
    await db.prepare(`
      UPDATE partidas
      SET gols_a = NULL, gols_b = NULL, penaltis_a = NULL, penaltis_b = NULL, status = 'agendada'
      WHERE id = ?
    `).run(partida.id);

    // limpa o time que tinha avançado por causa deste resultado
    if (partida.id_proxima_partida) {
      const coluna = partida.slot_proxima === 'a' ? 'id_time_a' : 'id_time_b';
      await db.prepare(`UPDATE partidas SET ${coluna} = NULL WHERE id = ?`).run(partida.id_proxima_partida);
    }
    await db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ?").run(partida.id_campeonato);
  })();

  // a fase de grupos deixou de estar 100% completa: a chave eliminatória
  // (se já tinha sido montada a partir da classificação) volta a ficar em
  // branco até os grupos terminarem de novo.
  if (partida.fase === 'grupos') await preencherMataMataComClassificados(partida.id_campeonato);

  await Historico.registrar({
    nome: req.admin.nome, acao: 'apagar_placar', entidade: 'partida', entidade_id: partida.id,
    descricao: `apagou o placar de "${partida.time_a} x ${partida.time_b}"`
  });
  res.json(await Partida.porId(partida.id));
}

/** Marca o campeonato como finalizado quando não sobra nenhuma partida em aberto. */
async function fecharCampeonatoSeAcabou(idCampeonato) {
  const linhaAbertas = await db.prepare(`
    SELECT COUNT(*) AS n FROM partidas
    WHERE id_campeonato = ? AND status NOT IN ('finalizada', 'bye')
  `).get(idCampeonato);
  const linhaTotal = await db.prepare('SELECT COUNT(*) AS n FROM partidas WHERE id_campeonato = ?')
    .get(idCampeonato);

  if (linhaTotal.n > 0 && linhaAbertas.n === 0) {
    await db.prepare("UPDATE campeonatos SET status = 'finalizado' WHERE id = ?").run(idCampeonato);
  }
}

module.exports = { listar, detalhar, atualizarAgenda, registrarResultado, apagarResultado };
