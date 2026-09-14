const Campeonato = require('../models/campeonato.model');
const Partida = require('../models/partida.model');
const Time = require('../models/time.model');
const { falha } = require('../middlewares/erros');
const { classificacao, artilheiros } = require('../services/classificacao.service');

/**
 * Endpoint único, sem login, com tudo que a página pública precisa (RF07).
 * Uma requisição só evita quatro chamadas em sequência no celular do aluno.
 */
function verCampeonato(req, res) {
  const campeonato = Campeonato.porId(req.params.id);
  if (!campeonato) falha(404, 'Campeonato nao encontrado.');

  const partidas = Partida.listarPorCampeonato(campeonato.id);
  const gols = Partida.golsPorCampeonato(campeonato.id);
  const porPartida = new Map();
  for (const g of gols) {
    if (!porPartida.has(g.id_partida)) porPartida.set(g.id_partida, []);
    porPartida.get(g.id_partida).push(g);
  }

  res.json({
    campeonato,
    times: Time.listarPorCampeonato(campeonato.id),
    partidas: partidas.map((p) => ({ ...p, gols: porPartida.get(p.id) || [] })),
    classificacao: classificacao(campeonato.id),
    artilheiros: artilheiros(campeonato.id)
  });
}

const listarCampeonatos = (req, res) => res.json(Campeonato.listar());

module.exports = { verCampeonato, listarCampeonatos };
