/**
 * Popula o banco com dados de exemplo.
 * Rode com: npm run seed   (apaga os dados anteriores e recria tudo)
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { db, inicializar, ARQUIVO_DB } = require('./index');
const { gerarTabela, promoverVencedor } = require('../services/tabela.service');

const SENHA_ADMIN = process.env.ADMIN_PASSWORD || 'ifrs2026';

const NOMES = [
  'Ana Clara', 'Bruno Rocha', 'Caio Dalcin', 'Daniel Souza', 'Eduarda Lima',
  'Felipe Antunes', 'Gabriel Moro', 'Helena Prado', 'Igor Bassani', 'Júlia Meneghel',
  'Kauê Ferreira', 'Larissa Boff', 'Matheus Zanini', 'Nicolas Perin', 'Otávio Grazzi',
  'Paula Bertolin', 'Rafael Sartori', 'Sofia Tonet', 'Thiago Menegotto', 'Vitor Salton',
  'Yasmin Carraro', 'Arthur Bortolin', 'Beatriz Comin', 'César Fontana', 'Diego Marin',
  'Elisa Panozzo', 'Fábio Ceron', 'Giovana Slongo', 'Henrique Basso', 'Isadora Vieira',
  'João Pedro Rech', 'Karina Debon', 'Lucas Paese', 'Marina Severgnini', 'Nathan Cioato'
];

let indiceNome = 0;
const proximoNome = () => NOMES[indiceNome++ % NOMES.length];

async function limparTudo() {
  await db.prepare('PRAGMA foreign_keys = OFF').run();
  for (const t of ['gols', 'partidas', 'jogadores', 'times', 'campeonatos', 'alunos']) {
    await db.prepare(`DELETE FROM ${t}`).run();
    await db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(t);
  }
  await db.prepare('PRAGMA foreign_keys = ON').run();
}

async function criarCampeonato(dados) {
  const r = await db.prepare(`
    INSERT INTO campeonatos
      (nome, modalidade, formato, turno_returno, tamanho_grupo, classificados_grupo,
       data_inicio, data_fim, status)
    VALUES (@nome, @modalidade, @formato, @turno_returno, @tamanho_grupo, @classificados_grupo,
            @data_inicio, @data_fim, @status)
  `).run({
    turno_returno: 0, tamanho_grupo: 4, classificados_grupo: 2,
    data_inicio: null, data_fim: null, status: 'planejado', ...dados
  });
  return r.lastInsertRowid;
}

/** Cria um aluno pelo caminho normal: autocadastro com e-mail institucional já
 *  verificado e senha definida (simula quem já passou pelo fluxo completo). */
async function criarAlunoAutocadastrado(nome, email, senha) {
  const r = await db.prepare(`
    INSERT INTO alunos (nome, email, senha_hash, email_verificado)
    VALUES (?, ?, ?, 1)
  `).run(nome, email, bcrypt.hashSync(senha, 10));
  return r.lastInsertRowid;
}

/**
 * Cria um time com elenco. `fixos` entra primeiro (usado para os alunos de
 * demonstração), o resto é preenchido com nomes genéricos até `qtdJogadores`.
 */
async function criarTimeComElenco(idCampeonato, nome, qtdJogadores, fixos = []) {
  const rTime = await db.prepare('INSERT INTO times (nome, id_campeonato) VALUES (?, ?)')
    .run(nome, idCampeonato);
  const idTime = rTime.lastInsertRowid;

  const inserir = db.prepare('INSERT INTO jogadores (nome, numero, id_time, id_aluno) VALUES (?, ?, ?, ?)');
  const idsFixos = [];
  for (const f of fixos) {
    const r = await inserir.run(f.nome, f.numero ?? null, idTime, f.id_aluno ?? null);
    idsFixos.push(r.lastInsertRowid);
  }

  const numeros = [1, 5, 7, 9, 10, 11, 4, 8];
  for (let i = fixos.length; i < qtdJogadores; i++) {
    await inserir.run(proximoNome(), numeros[i % numeros.length], idTime, null);
  }
  return { idTime, idsFixos };
}

/** Lança um placar do mesmo jeito que a API faria, inclusive avançando a chave. */
async function lancarResultado(idPartida, golsA, golsB, penaltisA = null, penaltisB = null) {
  const p = await db.prepare('SELECT * FROM partidas WHERE id = ?').get(idPartida);
  const elenco = (idTime) => db.prepare('SELECT id FROM jogadores WHERE id_time = ?').all(idTime);

  const distribuir = async (idTime, gols) => {
    const jogadores = await elenco(idTime);
    const contagem = new Map();
    for (let i = 0; i < gols; i++) {
      const j = jogadores[Math.floor(Math.random() * jogadores.length)].id;
      contagem.set(j, (contagem.get(j) || 0) + 1);
    }
    const inserir = db.prepare('INSERT INTO gols (id_partida, id_jogador, quantidade) VALUES (?, ?, ?)');
    for (const [idJogador, qtd] of contagem) await inserir.run(idPartida, idJogador, qtd);
  };

  await db.transaction(async () => {
    await db.prepare(`
      UPDATE partidas SET gols_a = ?, gols_b = ?, penaltis_a = ?, penaltis_b = ?, status = 'finalizada'
      WHERE id = ?
    `).run(golsA, golsB, penaltisA, penaltisB, idPartida);

    await distribuir(p.id_time_a, golsA);
    await distribuir(p.id_time_b, golsB);

    if (p.fase !== 'grupos') {
      let vencedor;
      if (golsA > golsB) vencedor = p.id_time_a;
      else if (golsB > golsA) vencedor = p.id_time_b;
      else vencedor = penaltisA > penaltisB ? p.id_time_a : p.id_time_b;
      await promoverVencedor(p, vencedor);
    }
  })();
}

function placarAleatorio() {
  const a = Math.floor(Math.random() * 6);
  const b = Math.floor(Math.random() * 6);
  return [a, b];
}

/**
 * Transfere o crédito de um gol (já contado no placar) para `idJogadorNovo`,
 * sem alterar o placar da partida. Usado para garantir que os alunos de
 * demonstração tenham estatísticas visíveis sem mexer nos resultados.
 */
async function creditarGolPara(idPartida, idJogadorNovo, idTime) {
  const p = await db.prepare('SELECT * FROM partidas WHERE id = ?').get(idPartida);
  const ladoA = p.id_time_a === idTime;
  const totalDoLado = ladoA ? p.gols_a : p.gols_b;
  if (!totalDoLado || totalDoLado < 1) return false;

  const existente = await db.prepare(`
    SELECT g.* FROM gols g JOIN jogadores j ON j.id = g.id_jogador
    WHERE g.id_partida = ? AND j.id_time = ? ORDER BY RANDOM() LIMIT 1
  `).get(idPartida, idTime);

  if (existente) {
    if (existente.quantidade > 1) await db.prepare('UPDATE gols SET quantidade = quantidade - 1 WHERE id = ?').run(existente.id);
    else await db.prepare('DELETE FROM gols WHERE id = ?').run(existente.id);
  }
  await db.prepare('INSERT INTO gols (id_partida, id_jogador, quantidade) VALUES (?, ?, 1)').run(idPartida, idJogadorNovo);
  return true;
}

// ---------------------------------------------------------------------------

async function main() {
  await inicializar();

  console.log(`Limpando ${ARQUIVO_DB} ...`);
  await limparTudo();

  // ---- Alunos de demonstração ----------------------------------------------
  // Ambos pelo caminho normal: autocadastro com e-mail institucional, já verificado.
  const idVitor = await criarAlunoAutocadastrado(
    'Vitor Trevisan', 'vitor.trevisan@aluno.farroupilha.ifrs.edu.br', 'vitor123'
  );
  const idRamiro = await criarAlunoAutocadastrado(
    'Ramiro Severgnini', 'ramiro.severgnini@aluno.farroupilha.ifrs.edu.br', 'ramiro123'
  );

  // ---- Campeonato 1: pontos corridos, com metade das rodadas já jogadas ----
  const futsal = await criarCampeonato({
    nome: 'Interclasses de Futsal 2026',
    modalidade: 'Futsal',
    formato: 'pontos_corridos',
    data_inicio: '2026-03-09',
    data_fim: '2026-04-24'
  });

  const { idsFixos } = await criarTimeComElenco(futsal, '1A Informática', 5, [
    { nome: 'Vitor Trevisan', numero: 10, id_aluno: idVitor },
    { nome: 'Ramiro Severgnini', numero: 7, id_aluno: idRamiro }
  ]);
  const [idJogadorVitor, idJogadorRamiro] = idsFixos;
  const idTime1A = (await db.prepare('SELECT id FROM times WHERE id_campeonato = ? AND nome = ?').get(futsal, '1A Informática')).id;

  for (const nome of ['1B Informática', '2A Informática', '2B Informática', '3A Informática', '3B Informática']) {
    await criarTimeComElenco(futsal, nome, 5);
  }

  await gerarTabela(await db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(futsal));

  const rodadasFutsal = await db.prepare(
    'SELECT * FROM partidas WHERE id_campeonato = ? ORDER BY rodada, id'
  ).all(futsal);
  const ateRodada = 3;
  for (const p of rodadasFutsal) {
    if (p.rodada <= ateRodada) {
      const [a, b] = placarAleatorio();
      await lancarResultado(p.id, a, b);
    }
  }
  await db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ?").run(futsal);

  // garante gols visíveis para Vitor e Ramiro sem alterar nenhum placar
  const partidasDoTime1A = await db.prepare(`
    SELECT * FROM partidas
    WHERE id_campeonato = ? AND status = 'finalizada' AND (id_time_a = ? OR id_time_b = ?)
  `).all(futsal, idTime1A, idTime1A);
  for (const p of partidasDoTime1A) {
    if (await creditarGolPara(p.id, idJogadorVitor, idTime1A)) break;
  }
  for (const p of partidasDoTime1A) {
    if (await creditarGolPara(p.id, idJogadorRamiro, idTime1A)) break;
  }

  // ---- Campeonato 2: mata-mata com número ímpar de times (mostra o bye) ----
  const volei = await criarCampeonato({
    nome: 'Copa Interseries de Vôlei 2026',
    modalidade: 'Vôlei',
    formato: 'mata_mata',
    data_inicio: '2026-05-11'
  });

  for (const nome of ['Turma 101', 'Turma 202', 'Turma 303', 'Turma 104', 'Turma 205']) {
    await criarTimeComElenco(volei, nome, 6);
  }

  await gerarTabela(await db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(volei));

  // joga só a fase de abertura da chave, deixando a semifinal em aberto
  const { fase: faseAbertura } = await db.prepare(`
    SELECT fase FROM partidas WHERE id_campeonato = ?
    GROUP BY fase ORDER BY COUNT(*) DESC LIMIT 1
  `).get(volei);

  const primeiraFase = await db.prepare(`
    SELECT * FROM partidas
    WHERE id_campeonato = ? AND fase = ? AND status = 'agendada'
      AND id_time_a IS NOT NULL AND id_time_b IS NOT NULL
    ORDER BY ordem_chave
  `).all(volei, faseAbertura);
  for (const p of primeiraFase) await lancarResultado(p.id, 3, Math.floor(Math.random() * 3));
  await db.prepare("UPDATE campeonatos SET status = 'em_andamento' WHERE id = ?").run(volei);

  // ---------------------------------------------------------------------------

  const conta = async (t) => (await db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get()).n;
  console.log('');
  console.log('Banco populado:');
  console.log(`  campeonatos: ${await conta('campeonatos')}`);
  console.log(`  times:       ${await conta('times')}`);
  console.log(`  jogadores:   ${await conta('jogadores')}`);
  console.log(`  partidas:    ${await conta('partidas')}`);
  console.log(`  gols:        ${await conta('gols')}`);
  console.log('');
  console.log('Senha da coordenação (admin):');
  console.log(`  ${SENHA_ADMIN}`);
  console.log('');
  console.log('Alunos de demonstração:');
  console.log('  Vitor Trevisan  — login: vitor.trevisan@aluno.farroupilha.ifrs.edu.br / senha: vitor123');
  console.log('  Ramiro Severgnini — login: ramiro.severgnini@aluno.farroupilha.ifrs.edu.br / senha: ramiro123');
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
