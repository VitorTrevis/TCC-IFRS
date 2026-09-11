const Jogador = require('../models/jogador.model');
const Time = require('../models/time.model');
const Aluno = require('../models/aluno.model');
const { falha } = require('../middlewares/erros');

function timeOuFalha(id) {
  const t = Time.porId(id);
  if (!t) falha(404, 'Time nao encontrado.');
  return t;
}

function numeroValido(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0 || n > 999) falha(400, 'O numero da camisa precisa ser um inteiro de 0 a 999.');
  return n;
}

/** Resolve o vinculo com aluno: usa id_aluno existente, ou cria um aluno novo se pedido. */
function resolverIdAluno(corpo) {
  if (corpo.id_aluno) {
    const aluno = Aluno.porId(corpo.id_aluno);
    if (!aluno) falha(400, 'O aluno informado nao existe.');
    return aluno.id;
  }
  const nomeNovo = (corpo.aluno_novo_nome || '').toString().trim();
  if (nomeNovo) {
    if (Aluno.existeNome(nomeNovo)) {
      falha(400, `Ja existe um aluno pre-cadastrado como "${nomeNovo}". Selecione-o na busca em vez de criar de novo.`);
    }
    return Aluno.criar(nomeNovo);
  }
  return null;
}

function listar(req, res) {
  timeOuFalha(req.params.id);
  res.json(Jogador.listarPorTime(req.params.id));
}

function criar(req, res) {
  const time = timeOuFalha(req.params.id);
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do jogador.');
  const numero = numeroValido(req.body?.numero);
  const id_aluno = resolverIdAluno(req.body || {});
  const id = Jogador.criar({ nome, numero, id_time: time.id, id_aluno });
  res.status(201).json(Jogador.porId(id));
}

function atualizar(req, res) {
  const jogador = Jogador.porId(req.params.id);
  if (!jogador) falha(404, 'Jogador nao encontrado.');
  const nome = (req.body?.nome || '').toString().trim();
  if (!nome) falha(400, 'Informe o nome do jogador.');

  // so mexe no vinculo com aluno se o pedido trouxer id_aluno/aluno_novo_nome;
  // caso contrario preserva o vinculo atual (evita apagar sem querer ao so
  // renomear o jogador).
  const veioAlgumCampoDeAluno = req.body?.id_aluno !== undefined || req.body?.aluno_novo_nome !== undefined;
  const id_aluno = veioAlgumCampoDeAluno ? resolverIdAluno(req.body || {}) : jogador.id_aluno;

  Jogador.atualizar(jogador.id, { nome, numero: numeroValido(req.body?.numero), id_aluno });
  res.json(Jogador.porId(jogador.id));
}

function remover(req, res) {
  const jogador = Jogador.porId(req.params.id);
  if (!jogador) falha(404, 'Jogador nao encontrado.');
  Jogador.remover(jogador.id);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
