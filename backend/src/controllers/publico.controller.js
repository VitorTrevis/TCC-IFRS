const Campeonato = require('../models/campeonato.model');
const Partida = require('../models/partida.model');
const Time = require('../models/time.model');
const { falha } = require('../middlewares/erros');
const { classificacao, artilheiros } = require('../services/classificacao.service');

/**
 * Endpoint único, sem login, com tudo que a página pública precisa (RF07).
 * Uma requisição só evita quatro chamadas em sequência no celular do aluno.
 */
async function verCampeonato(req, res) {
  const campeonato = await Campeonato.porId(req.params.id);
  if (!campeonato) falha(404, 'Campeonato nao encontrado.');

  const partidas = await Partida.listarPorCampeonato(campeonato.id);
  const gols = await Partida.golsPorCampeonato(campeonato.id);
  const porPartida = new Map();
  for (const g of gols) {
    if (!porPartida.has(g.id_partida)) porPartida.set(g.id_partida, []);
    porPartida.get(g.id_partida).push(g);
  }

  res.json({
    campeonato,
    times: await Time.listarPorCampeonato(campeonato.id),
    partidas: partidas.map((p) => ({ ...p, gols: porPartida.get(p.id) || [] })),
    classificacao: await classificacao(campeonato.id),
    artilheiros: await artilheiros(campeonato.id)
  });
}

const listarCampeonatos = async (req, res) => res.json(await Campeonato.listar());

module.exports = { verCampeonato, listarCampeonatos };
