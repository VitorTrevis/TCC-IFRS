const Campeonato = require('../models/campeonato.model');
const Partida = require('../models/partida.model');
const Historico = require('../models/historico.model');
const { falha } = require('../middlewares/erros');
const { gerarTabela } = require('../services/tabela.service');
const { classificacao, artilheiros } = require('../services/classificacao.service');

const FORMATOS = ['pontos_corridos', 'mata_mata', 'grupos_mata_mata'];
const STATUS = ['planejado', 'em_andamento', 'finalizado'];

function validar(corpo, parcialDe = null) {
  const b = corpo || {};
  const atual = parcialDe || {};

  const nome = (b.nome ?? atual.nome ?? '').toString().trim();
  const modalidade = (b.modalidade ?? atual.modalidade ?? '').toString().trim();
  const formato = (b.formato ?? atual.formato ?? '').toString().trim();

  if (!nome) falha(400, 'Informe o nome do campeonato.');
  if (!modalidade) falha(400, 'Informe a modalidade (Futsal, Vôlei, Handebol...).');
  if (!FORMATOS.includes(formato)) {
    falha(400, `Formato inválido. Use um destes: ${FORMATOS.join(', ')}.`);
  }

  const status = (b.status ?? atual.status ?? 'planejado').toString();
  if (!STATUS.includes(status)) falha(400, `Status inválido. Use: ${STATUS.join(', ')}.`);

  const inteiro = (v, padrao) => {
    if (v === undefined || v === null || v === '') return padrao;
    const n = Number(v);
    if (!Number.isInteger(n)) falha(400, 'Valores numéricos precisam ser números inteiros.');
    return n;
  };

  const tamanho_grupo = inteiro(b.tamanho_grupo, atual.tamanho_grupo ?? 4);
  const classificados_grupo = inteiro(b.classificados_grupo, atual.classificados_grupo ?? 2);

  if (formato === 'grupos_mata_mata') {
    if (tamanho_grupo < 3) falha(400, 'Cada grupo precisa ter pelo menos 3 times.');
    if (classificados_grupo < 1 || classificados_grupo >= tamanho_grupo) {
      falha(400, 'A quantidade de classificados precisa ser menor que o tamanho do grupo.');
    }
  }

  return {
    nome,
    modalidade,
    formato,
    turno_returno: (b.turno_returno ?? atual.turno_returno ?? 0) ? 1 : 0,
    tamanho_grupo,
    classificados_grupo,
    data_inicio: b.data_inicio ?? atual.data_inicio ?? null,
    data_fim: b.data_fim ?? atual.data_fim ?? null,
    status
  };
}

function buscarOuFalhar(id) {
  const c = Campeonato.porId(id);
  if (!c) falha(404, 'Campeonato não encontrado.');
  return c;
}

const listar = (req, res) => res.json(Campeonato.listar());

const detalhar = (req, res) => res.json(buscarOuFalhar(req.params.id));

function criar(req, res) {
  const dados = validar(req.body);
  const id = Campeonato.criar(dados);
  Historico.registrar({
    nome: req.admin.nome, acao: 'criar', entidade: 'campeonato', entidade_id: id,
    descricao: `criou o campeonato "${dados.nome}"`
  });
  res.status(201).json(Campeonato.porId(id));
}

function atualizar(req, res) {
  const atual = buscarOuFalhar(req.params.id);
  const dados = validar(req.body, atual);

  if (dados.formato !== atual.formato) {
    const jogos = Partida.listarPorCampeonato(atual.id).length;
    if (jogos > 0) {
      falha(400, 'A tabela de jogos já existe. Gere a tabela de novo depois de trocar o formato.');
    }
  }
  Campeonato.atualizar(atual.id, dados);
  Historico.registrar({
    nome: req.admin.nome, acao: 'editar', entidade: 'campeonato', entidade_id: atual.id,
    descricao: `editou o campeonato "${dados.nome}"`
  });
  res.json(Campeonato.porId(atual.id));
}

function remover(req, res) {
  const atual = buscarOuFalhar(req.params.id);
  Campeonato.remover(req.params.id);
  Historico.registrar({
    nome: req.admin.nome, acao: 'remover', entidade: 'campeonato', entidade_id: atual.id,
    descricao: `excluiu o campeonato "${atual.nome}"`
  });
  res.status(204).end();
}

function gerar(req, res) {
  const campeonato = buscarOuFalhar(req.params.id);
  const resumo = gerarTabela(campeonato);
  Historico.registrar({
    nome: req.admin.nome, acao: 'gerar_tabela', entidade: 'campeonato', entidade_id: campeonato.id,
    descricao: `gerou a tabela de jogos de "${campeonato.nome}"`
  });
  res.status(201).json({
    mensagem: 'Tabela de jogos gerada.',
    resumo,
    partidas: Partida.listarPorCampeonato(campeonato.id)
  });
}

function verClassificacao(req, res) {
  const campeonato = buscarOuFalhar(req.params.id);
  res.json(classificacao(campeonato.id));
}

function verArtilheiros(req, res) {
  const campeonato = buscarOuFalhar(req.params.id);
  res.json(artilheiros(campeonato.id));
}

module.exports = {
  listar, detalhar, criar, atualizar, remover,
  gerar, verClassificacao, verArtilheiros, buscarOuFalhar
};
