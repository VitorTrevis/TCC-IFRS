const Time = require('../models/time.model');
const Campeonato = require('../models/campeonato.model');
const Partida = require('../models/partida.model');
const Historico = require('../models/historico.model');
const { falha } = require('../middlewares/erros');

async function campeonatoOuFalha(id) {
  const c = await Campeonato.porId(id);
  if (!c) falha(404, 'Campeonato não encontrado.');
  return c;
}

async function timeOuFalha(id) {
  const t = await Time.porId(id);
  if (!t) falha(404, 'Time não encontrado.');
  return t;
}

async function tabelaJaGerada(idCampeonato) {
  return (await Partida.listarPorCampeonato(idCampeonato)).length > 0;
}

async function listar(req, res) {
  await campeonatoOuFalha(req.params.id);
  res.json(await Time.listarPorCampeonato(req.params.id));
}

async function criar(req, res) {
  const campeonato = await campeonatoOuFalha(req.params.id);
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do time.');
  if (await Time.existeNome(campeonato.id, nome)) falha(400, `Já existe um time chamado "${nome}" neste campeonato.`);
  if (await tabelaJaGerada(campeonato.id)) {
    falha(400, 'A tabela de jogos já foi gerada. Gere a tabela de novo para incluir este time.');
  }

  const id = await Time.criar({ nome, id_campeonato: campeonato.id, escudo_url: req.body?.escudo_url });
  await Historico.registrar({
    nome: req.admin.nome, acao: 'criar', entidade: 'time', entidade_id: id,
    descricao: `criou o time "${nome}" em "${campeonato.nome}"`
  });
  res.status(201).json(await Time.porId(id));
}

async function atualizar(req, res) {
  const time = await timeOuFalha(req.params.id);
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do time.');
  if (await Time.existeNome(time.id_campeonato, nome, time.id)) {
    falha(400, `Já existe um time chamado "${nome}" neste campeonato.`);
  }
  await Time.atualizar(time.id, { nome, escudo_url: req.body?.escudo_url });
  await Historico.registrar({
    nome: req.admin.nome, acao: 'editar', entidade: 'time', entidade_id: time.id,
    descricao: nome !== time.nome
      ? `renomeou o time "${time.nome}" para "${nome}"`
      : `editou o time "${time.nome}"`
  });
  res.json(await Time.porId(time.id));
}

async function remover(req, res) {
  const time = await timeOuFalha(req.params.id);
  if (await tabelaJaGerada(time.id_campeonato)) {
    falha(400, 'A tabela de jogos já foi gerada. Apague a tabela ou gere de novo antes de remover times.');
  }
  await Time.remover(time.id);
  await Historico.registrar({
    nome: req.admin.nome, acao: 'remover', entidade: 'time', entidade_id: time.id,
    descricao: `excluiu o time "${time.nome}"`
  });
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
