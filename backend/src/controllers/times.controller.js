const Time = require('../models/time.model');
const Campeonato = require('../models/campeonato.model');
const Partida = require('../models/partida.model');
const { falha } = require('../middlewares/erros');

function campeonatoOuFalha(id) {
  const c = Campeonato.porId(id);
  if (!c) falha(404, 'Campeonato nao encontrado.');
  return c;
}

function timeOuFalha(id) {
  const t = Time.porId(id);
  if (!t) falha(404, 'Time nao encontrado.');
  return t;
}

function tabelaJaGerada(idCampeonato) {
  return Partida.listarPorCampeonato(idCampeonato).length > 0;
}

function listar(req, res) {
  campeonatoOuFalha(req.params.id);
  res.json(Time.listarPorCampeonato(req.params.id));
}

function criar(req, res) {
  const campeonato = campeonatoOuFalha(req.params.id);
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do time.');
  if (Time.existeNome(campeonato.id, nome)) falha(400, `Ja existe um time chamado "${nome}" neste campeonato.`);
  if (tabelaJaGerada(campeonato.id)) {
    falha(400, 'A tabela de jogos ja foi gerada. Gere a tabela de novo para incluir este time.');
  }

  const id = Time.criar({ nome, id_campeonato: campeonato.id, escudo_url: req.body?.escudo_url });
  res.status(201).json(Time.porId(id));
}

function atualizar(req, res) {
  const time = timeOuFalha(req.params.id);
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do time.');
  if (Time.existeNome(time.id_campeonato, nome, time.id)) {
    falha(400, `Ja existe um time chamado "${nome}" neste campeonato.`);
  }
  Time.atualizar(time.id, { nome, escudo_url: req.body?.escudo_url });
  res.json(Time.porId(time.id));
}

function remover(req, res) {
  const time = timeOuFalha(req.params.id);
  if (tabelaJaGerada(time.id_campeonato)) {
    falha(400, 'A tabela de jogos ja foi gerada. Apague a tabela ou gere de novo antes de remover times.');
  }
  Time.remover(time.id);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
