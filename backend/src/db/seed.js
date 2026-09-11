/**
 * Popula o banco com dados de exemplo.
 * Rode com: npm run seed   (apaga os dados anteriores e recria tudo)
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { db, inicializar, ARQUIVO_DB } = require('./index');
const { gerarTabela, promoverVencedor } = require('../services/tabela.service');

inicializar();

const SENHA_ADMIN = process.env.ADMIN_PASSWORD || 'ifrs2026';

const NOMES = [
  'Ana Clara', 'Bruno Rocha', 'Caio Dalcin', 'Daniel Souza', 'Eduarda Lima',
  'Felipe Antunes', 'Gabriel Moro', 'Helena Prado', 'Igor Bassani', 'Julia Meneghel',
  'Kaue Ferreira', 'Larissa Boff', 'Matheus Zanini', 'Nicolas Perin', 'Otavio Grazzi',
  'Paula Bertolin', 'Rafael Sartori', 'Sofia Tonet', 'Thiago Menegotto', 'Vitor Salton',
  'Yasmin Carraro', 'Arthur Bortolin', 'Beatriz Comin', 'Cesar Fontana', 'Diego Marin',
  'Elisa Panozzo', 'Fabio Ceron', 'Giovana Slongo', 'Henrique Basso', 'Isadora Vieira',
  'Joao Pedro Rech', 'Karina Debon', 'Lucas Paese', 'Marina Severgnini', 'Nathan Cioato'
];

let indiceNome = 0;
const proximoNome = () => NOMES[indiceNome++ % NOMES.length];

function limparTudo() {
  db.pragma('foreign_keys = OFF');
  for (const t of ['gols', 'partidas', 'jogadores', 'times', 'campeonatos', 'alunos']) {
    db.prepare(`DELETE FROM ${t}`).run();
    db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(t);
  }
  db.pragma('foreign_keys = ON');
}

function criarCampeonato(dados) {
  return db.prepare(`
    INSERT INTO campeonatos
      (nome, modalidade, formato, turno_returno, tamanho_grupo, classificados_grupo,
       data_inicio, data_fim, status)
    VALUES (@nome, @modalidade, @formato, @turno_returno, @tamanho_grupo, @classificados_grupo,
            @data_inicio, @data_fim, @status)
  `).run({
    turno_returno: 0, tamanho_grupo: 4, classificados_grupo: 2,
    data_inicio: null, data_fim: null, status: 'planejado', ...dados
  }).lastInsertRowid;
}

/** Cria um aluno pre-cadastrado manualmente pela coordenacao (excecao: sem e-mail,
 *  sem senha ate o primeiro acesso). */
function criarAluno(nome) {
  return db.prepare('INSERT INTO alunos (nome) VALUES (?)').run(nome).lastInsertRowid;
}

/** Cria um aluno pelo caminho normal: autocadastro com e-mail institucional ja
 *  verificado e senha definida (simula quem ja passou pelo fluxo completo). */
function criarAlunoAutocadastrado(nome, email, senha) {
  return db.prepare(`
    INSERT INTO alunos (nome, email, senha_hash, email_verificado)
    VALUES (?, ?, ?, 1)
  `).run(nome, email, bcrypt.hashSync(senha, 10)).lastInsertRowid;
}

/**
 * Cria um time com elenco. `fixos` entra primeiro (usado para os alunos de
 * demonstracao), o resto e preenchido com nomes genericos ate `qtdJogadores`.
 */
function criarTimeComElenco(idCampeonato, nome, qtdJogadores, fixos = []) {
  const idTime = db.prepare('INSERT INTO times (nome, id_campeonato) VALUES (?, ?)')
    .run(nome, idCampeonato).lastInsertRowid;

  const inserir = db.prepare('INSERT INTO jogadores (nome, numero, id_time, id_aluno) VALUES (?, ?, ?, ?)');
  const idsFixos = [];
  for (const f of fixos) {
    idsFixos.push(inserir.run(f.nome, f.numero ?? null, idTime, f.id_aluno ?? null).lastInsertRowid);
  }

  const numeros = [1, 5, 7, 9, 10, 11, 4, 8];
  for (let i = fixos.length; i < qtdJogadores; i++) {
    inserir.run(proximoNome(), numeros[i % numeros.length], idTime, null);
  }
  return { idTime, idsFixos };
}

/** Lanca um placar do mesmo jeito que a API faria, inclusive avancando a chave. */
function lancarResultado(idPartida, golsA, golsB, penaltisA = null, penaltisB = null) {
  const p = db.prepare('SELECT * FROM partidas WHERE id = ?').get(idPartida);
  const elenco = (idTime) => db.prepare('SELECT id FROM jogadores WHERE id_time = ?').all(idTime);

  const distribuir = (idTime, gols) => {
    const jogadores = elenco(idTime);
    const contagem = new Map();
    for (let i = 0; i < gols; i++) {
      const j = jogadores[Math.floor(Math.random() * jogadores.length)].id;
      contagem.set(j, (contagem.get(j) || 0) + 1);
    }
    const inserir = db.prepare('INSERT INTO gols (id_partida, id_jogador, quantidade) VALUES (?, ?, ?)');
    for (const [idJogador, qtd] of contagem) inserir.run(idPartida, idJogador, qtd);
  };

  db.transaction(() => {
    db.prepare(`
      UPDATE partidas SET gols_a = ?, gols_b = ?, penaltis_a = ?, penaltis_b = ?, status = 'finalizada'
      WHERE id = ?
    `).run(golsA, golsB, penaltisA, penaltisB, idPartida);

    distribuir(p.id_time_a, golsA);
    distribuir(p.id_time_b, golsB);

    if (p.fase !== 'grupos') {
      let vencedor;
      if (golsA > golsB) vencedor = p.id_time_a;
      else if (golsB > golsA) vencedor = p.id_time_b;
      else vencedor = penaltisA > penaltisB ? p.id_time_a : p.id_time_b;
      promoverVencedor(p, vencedor);
    }
  })();
}

function placarAleatorio() {
  const a = Math.floor(Math.random() * 6);
  const b = Math.floor(Math.random() * 6);
  return [a, b];
}

/**
 * Transfere o credito de um gol (ja contado no placar) para `idJogadorNovo`,
 * sem alterar o placar da partida. Usado para garantir que os alunos de
 * demonstracao tenham estatisticas visiveis sem mexer nos resultados.
 */
function creditarGolPara(idPartida, idJogadorNovo, idTime) {
  const p = db.prepare('SELECT * FROM partidas WHERE id = ?').get(idPartida);
  const ladoA = p.id_time_a === idTime;
  const totalDoLado = ladoA ? p.gols_a : p.gols_b;
  if (!totalDoLado || totalDoLado < 1) return false;

  const existente = db.prepare(`
    SELECT g.* FROM gols g JOIN jogadores j ON j.id = g.id_jogador
    WHERE g.id_partida = ? AND j.id_time = ? ORDER BY RANDOM() LIMIT 1
  `).get(idPartida, idTime);

  if (existente) {
    if (existente.quantidade > 1) db.prepare('UPDATE gols SET quantidade = quantidade - 1 WHERE id = ?').run(existente.id);
    else db.prepare('DELETE FROM gols WHERE id = ?').run(existente.id);
  }
  db.prepare('INSERT INTO gols (id_partida, id_jogador, quantidade) VALUES (?, ?, 1)').run(idPartida, idJogadorNovo);
  return true;
}

// ---------------------------------------------------------------------------

console.log(`Limpando ${ARQUIVO_DB} ...`);
limparTudo();

// ---- Alunos de demonstracao ------------------------------------------------
// Vitor: caminho normal (autocadastro com e-mail institucional, ja verificado).
// Ramiro: excecao (pre-cadastro manual pela coordenacao, sem e-mail, primeiro
// acesso ainda pendente) — mostra os dois fluxos funcionando no mesmo seed.
const idVitor = criarAlunoAutocadastrado(
  'Vitor Trevisan', 'vitor.trevisan@aluno.farroupilha.ifrs.edu.br', 'vitor123'
);
const idRamiro = criarAluno('Ramiro Severgnini');

// ---- Campeonato 1: pontos corridos, com metade das rodadas ja jogadas -----
const futsal = criarCampeonato({
  nome: 'Interclasses de Futsal 2026',
  modalidade: 'Futsal',
  formato: 'pontos_corridos',
  data_inicio: '2026-03-09',
  data_fim: '2026-04-24'
});

const { idsFixos } = criarTimeComElenco(futsal, '1A Informatica', 5, [
  { nome: 'Vitor Trevisan', numero: 10, id_aluno: idVitor },
  { nome: 'Ramiro Severgnini', numero: 7, id_aluno: idRamiro }
]);
const [idJogadorVitor, idJogadorRamiro] = idsFixos;
const idTime1A = db.prepare('SELECT id FROM times WHERE id_campeonato = ? AND nome = ?').get(futsal, '1A Informatica').id;

['1B Informatica', '2A Informatica', '2B Informatica', '3A Informatica', '3B Informatica']
  .forEach((nome) => criarTimeComElenco(futsal, nome, 5));

gerarTabela(db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(futsal));

const rodadasFutsal = db.prepare(
  'SELECT * FROM partidas WHERE id_campeonato = ? ORDER BY rodada, id'
).all(futsal);
const ateRodada = 3;
for (const p of rodadasFutsal) {
  if (p.rodada <= ateRodada) {
    const [a, b] = placarAleatorio();
    lancarResultado(p.id, a, b);
  }
}
db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ?").run(futsal);

// garante gols visiveis para Vitor e Ramiro sem alterar nenhum placar
const partidasDoTime1A = db.prepare(`
  SELECT * FROM partidas
  WHERE id_campeonato = ? AND status = 'finalizada' AND (id_time_a = ? OR id_time_b = ?)
`).all(futsal, idTime1A, idTime1A);
for (const p of partidasDoTime1A) {
  if (creditarGolPara(p.id, idJogadorVitor, idTime1A)) break;
}
for (const p of partidasDoTime1A) {
  if (creditarGolPara(p.id, idJogadorRamiro, idTime1A)) break;
}

// ---- Campeonato 2: mata-mata com numero impar de times (mostra o bye) -----
const volei = criarCampeonato({
  nome: 'Copa Interseries de Volei 2026',
  modalidade: 'Volei',
  formato: 'mata_mata',
  data_inicio: '2026-05-11'
});

['Turma 101', 'Turma 202', 'Turma 303', 'Turma 104', 'Turma 205']
  .forEach((nome) => criarTimeComElenco(volei, nome, 6));

gerarTabela(db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(volei));

// joga so a fase de abertura da chave, deixando a semifinal em aberto
const faseAbertura = db.prepare(`
  SELECT fase FROM partidas WHERE id_campeonato = ?
  GROUP BY fase ORDER BY COUNT(*) DESC LIMIT 1
`).get(volei).fase;

const primeiraFase = db.prepare(`
  SELECT * FROM partidas
  WHERE id_campeonato = ? AND fase = ? AND status = 'agendada'
    AND id_time_a IS NOT NULL AND id_time_b IS NOT NULL
  ORDER BY ordem_chave
`).all(volei, faseAbertura);
for (const p of primeiraFase) lancarResultado(p.id, 3, Math.floor(Math.random() * 3));
db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ?").run(volei);

// ---------------------------------------------------------------------------

const conta = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log('');
console.log('Banco populado:');
console.log(`  campeonatos: ${conta('campeonatos')}`);
console.log(`  times:       ${conta('times')}`);
console.log(`  jogadores:   ${conta('jogadores')}`);
console.log(`  partidas:    ${conta('partidas')}`);
console.log(`  gols:        ${conta('gols')}`);
console.log('');
console.log('Senha da coordenacao (admin):');
console.log(`  ${SENHA_ADMIN}`);
console.log('');
console.log('Alunos de demonstracao:');
console.log('  Vitor Trevisan  — login: vitor.trevisan@aluno.farroupilha.ifrs.edu.br / senha: vitor123');
console.log('  Ramiro Severgnini — pre-cadastro manual (excecao), sem senha ainda: define no "Fui cadastrado pela coordenacao"');
console.log('');
