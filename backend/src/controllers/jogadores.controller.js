const Jogador = require('../models/jogador.model');
const Time = require('../models/time.model');
const Aluno = require('../models/aluno.model');
const Historico = require('../models/historico.model');
const { falha } = require('../middlewares/erros');

async function timeOuFalha(id) {
  const t = await Time.porId(id);
  if (!t) falha(404, 'Time não encontrado.');
  return t;
}

function numeroValido(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0 || n > 999) falha(400, 'O número da camisa precisa ser um inteiro de 0 a 999.');
  return n;
}

/** Resolve o vínculo com aluno: só aceita id_aluno de uma conta já existente
 *  (autocadastro por e-mail) — não há mais criação de aluno pelo nome digitado. */
async function resolverIdAluno(corpo) {
  if (corpo.id_aluno) {
    const aluno = await Aluno.porId(corpo.id_aluno);
    if (!aluno) falha(400, 'O aluno informado não existe.');
    return aluno.id;
  }
  return null;
}

async function listar(req, res) {
  await timeOuFalha(req.params.id);
  res.json(await Jogador.listarPorTime(req.params.id));
}

async function criar(req, res) {
  const time = await timeOuFalha(req.params.id);
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do jogador.');
  const numero = numeroValido(req.body?.numero);
  const id_aluno = await resolverIdAluno(req.body || {});
  const id = await Jogador.criar({ nome, numero, id_time: time.id, id_aluno });
  await Historico.registrar({
    nome: req.admin.nome, acao: 'criar', entidade: 'jogador', entidade_id: id,
    descricao: `adicionou "${nome}" ao time "${time.nome}"`
  });
  res.status(201).json(await Jogador.porId(id));
}

async function atualizar(req, res) {
  const jogador = await Jogador.porId(req.params.id);
  if (!jogador) falha(404, 'Jogador não encontrado.');
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do jogador.');

  // só mexe no vínculo com aluno se o pedido trouxer id_aluno; caso contrário
  // preserva o vínculo atual (evita apagar sem querer ao só renomear o jogador).
  const id_aluno = req.body?.id_aluno !== undefined ? await resolverIdAluno(req.body || {}) : jogador.id_aluno;

  await Jogador.atualizar(jogador.id, { nome, numero: numeroValido(req.body?.numero), id_aluno });
  await Historico.registrar({
    nome: req.admin.nome, acao: 'editar', entidade: 'jogador', entidade_id: jogador.id,
    descricao: nome !== jogador.nome
      ? `renomeou o jogador "${jogador.nome}" para "${nome}"`
      : `editou o jogador "${jogador.nome}"`
  });
  res.json(await Jogador.porId(jogador.id));
}

async function remover(req, res) {
  const jogador = await Jogador.porId(req.params.id);
  if (!jogador) falha(404, 'Jogador não encontrado.');
  const gols = await Jogador.totalGols(jogador.id);
  await Jogador.remover(jogador.id);
  await Historico.registrar({
    nome: req.admin.nome, acao: 'remover', entidade: 'jogador', entidade_id: jogador.id,
    descricao: gols
      ? `excluiu o jogador "${jogador.nome}" (e ${gols} ${gols === 1 ? 'gol marcado' : 'gols marcados'} por ele)`
      : `excluiu o jogador "${jogador.nome}"`
  });
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
