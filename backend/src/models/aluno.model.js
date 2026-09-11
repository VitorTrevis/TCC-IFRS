const { db } = require('../db');

const normalizar = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
  .toLowerCase().trim();

const porId = (id) => db.prepare('SELECT * FROM alunos WHERE id = ?').get(id);

/** Busca tolerante a acentos e caixa. Usada tanto pelo aluno quanto pelo admin. */
function buscarPorNome(nome) {
  const alvo = normalizar(nome);
  if (!alvo) return [];
  return db.prepare('SELECT id, nome, senha_hash FROM alunos').all()
    .filter((a) => normalizar(a.nome).includes(alvo))
    .map((a) => ({ id: a.id, nome: a.nome, tem_senha: Boolean(a.senha_hash) }));
}

/** Igualdade exata (normalizada) — usada no login. */
function porNomeExato(nome) {
  const alvo = normalizar(nome);
  return db.prepare('SELECT * FROM alunos').all().find((a) => normalizar(a.nome) === alvo);
}

const listar = () => db.prepare(`
  SELECT a.id, a.nome, a.email, a.email_verificado, a.criado_em,
         (a.senha_hash IS NOT NULL) AS tem_senha,
         (SELECT COUNT(*) FROM jogadores j WHERE j.id_aluno = a.id) AS total_vinculos
  FROM alunos a ORDER BY a.nome
`).all();

const existeNome = (nome) => Boolean(porNomeExato(nome));

const criar = (nome) => db.prepare('INSERT INTO alunos (nome) VALUES (?)')
  .run(nome.trim()).lastInsertRowid;

const definirSenha = (id, senha_hash) =>
  db.prepare('UPDATE alunos SET senha_hash = ? WHERE id = ?').run(senha_hash, id);

const resetarSenha = (id) =>
  db.prepare('UPDATE alunos SET senha_hash = NULL WHERE id = ?').run(id);

// ------------------------------------------------ autocadastro por e-mail

/** Busca por e-mail (normalizado em caixa baixa — e-mail nao tem acento a tratar). */
const porEmail = (email) => db.prepare('SELECT * FROM alunos WHERE email = ?')
  .get(String(email || '').trim().toLowerCase());

const existeEmail = (email) => Boolean(porEmail(email));

/** Cria a conta ja com senha e token de verificacao pendente (email_verificado = 0). */
function criarComEmail({ nome, email, senha_hash, tokenHash, expiraEm }) {
  return db.prepare(`
    INSERT INTO alunos (nome, email, senha_hash, email_verificado, token_verificacao, token_expira)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(nome.trim(), String(email).trim().toLowerCase(), senha_hash, tokenHash, expiraEm).lastInsertRowid;
}

/** Troca o token pendente (usado tanto na criacao quanto no reenvio). */
const atualizarTokenVerificacao = (id, tokenHash, expiraEm) =>
  db.prepare('UPDATE alunos SET token_verificacao = ?, token_expira = ? WHERE id = ?')
    .run(tokenHash, expiraEm, id);

/** So retorna a conta se o hash bater E o token ainda nao tiver expirado. */
const porTokenValido = (tokenHash) => db.prepare(`
  SELECT * FROM alunos
  WHERE token_verificacao = ? AND token_expira IS NOT NULL AND token_expira > datetime('now')
`).get(tokenHash);

const marcarEmailVerificado = (id) => db.prepare(`
  UPDATE alunos SET email_verificado = 1, token_verificacao = NULL, token_expira = NULL WHERE id = ?
`).run(id);

// ------------------------------------------- esqueci minha senha (por e-mail)

/** Grava o token pendente de redefinicao de senha (substitui qualquer um anterior). */
const definirTokenReset = (id, tokenHash, expiraEm) =>
  db.prepare('UPDATE alunos SET token_reset_senha = ?, token_reset_expira = ? WHERE id = ?')
    .run(tokenHash, expiraEm, id);

/** So retorna a conta se o hash bater E o token ainda nao tiver expirado. */
const porTokenResetValido = (tokenHash) => db.prepare(`
  SELECT * FROM alunos
  WHERE token_reset_senha = ? AND token_reset_expira IS NOT NULL AND token_reset_expira > datetime('now')
`).get(tokenHash);

/** Define a nova senha e invalida o token (uso unico). Tambem marca o e-mail como
 *  verificado: clicar num link mandado para essa caixa de entrada e a mesma prova
 *  de posse usada na confirmacao de cadastro, entao cobre o caso raro de alguem
 *  pedir redefinicao antes de ter confirmado o cadastro original. */
const redefinirSenhaComToken = (id, senha_hash) => db.prepare(`
  UPDATE alunos SET senha_hash = ?, email_verificado = 1,
    token_reset_senha = NULL, token_reset_expira = NULL WHERE id = ?
`).run(senha_hash, id);

/** Todas as partidas finalizadas em que o aluno marcou gol ou fez parte do elenco. */
function estatisticas(idAluno) {
  const jogadores = db.prepare('SELECT id, id_time FROM jogadores WHERE id_aluno = ?').all(idAluno);
  if (!jogadores.length) return { partidas: [], totalPartidas: 0, totalGols: 0, porCampeonato: [] };

  const idsJogador = jogadores.map((j) => j.id);
  const idsTime = [...new Set(jogadores.map((j) => j.id_time))];

  const marcador = idsJogador.map(() => '?').join(',');
  const timeMarcador = idsTime.map(() => '?').join(',');

  // partidas finalizadas em que um dos times do aluno jogou
  const partidas = db.prepare(`
    SELECT p.*, ta.nome AS time_a, tb.nome AS time_b,
           c.id AS id_campeonato, c.nome AS campeonato, c.formato
    FROM partidas p
    JOIN campeonatos c ON c.id = p.id_campeonato
    LEFT JOIN times ta ON ta.id = p.id_time_a
    LEFT JOIN times tb ON tb.id = p.id_time_b
    WHERE p.status = 'finalizada' AND (p.id_time_a IN (${timeMarcador}) OR p.id_time_b IN (${timeMarcador}))
    ORDER BY p.id DESC
  `).all(...idsTime, ...idsTime);

  const golsPorPartida = new Map(
    db.prepare(`
      SELECT id_partida, SUM(quantidade) AS gols FROM gols
      WHERE id_jogador IN (${marcador}) GROUP BY id_partida
    `).all(...idsJogador).map((r) => [r.id_partida, r.gols])
  );

  const partidasComGol = partidas
    .filter((p) => golsPorPartida.has(p.id) || [p.id_time_a, p.id_time_b].some((t) => idsTime.includes(t)))
    .map((p) => ({
      id: p.id, id_campeonato: p.id_campeonato, campeonato: p.campeonato,
      fase: p.fase, rodada: p.rodada, data: p.data,
      time_a: p.time_a, time_b: p.time_b, gols_a: p.gols_a, gols_b: p.gols_b,
      meus_gols: golsPorPartida.get(p.id) || 0
    }));

  const totalGols = [...golsPorPartida.values()].reduce((s, g) => s + g, 0);

  const porCampeonatoMapa = new Map();
  for (const p of partidasComGol) {
    if (!porCampeonatoMapa.has(p.id_campeonato)) {
      porCampeonatoMapa.set(p.id_campeonato, { id_campeonato: p.id_campeonato, campeonato: p.campeonato, partidas: 0, gols: 0 });
    }
    const linha = porCampeonatoMapa.get(p.id_campeonato);
    linha.partidas++;
    linha.gols += p.meus_gols;
  }

  return {
    partidas: partidasComGol,
    totalPartidas: partidasComGol.length,
    totalGols,
    porCampeonato: [...porCampeonatoMapa.values()]
  };
}

module.exports = {
  porId, buscarPorNome, porNomeExato, listar, existeNome,
  criar, definirSenha, resetarSenha, estatisticas,
  porEmail, existeEmail, criarComEmail, atualizarTokenVerificacao,
  porTokenValido, marcarEmailVerificado,
  definirTokenReset, porTokenResetValido, redefinirSenhaComToken
};
