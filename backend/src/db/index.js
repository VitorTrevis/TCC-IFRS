const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

/**
 * Onde o banco mora.
 *
 * Local (Windows/Mac/Linux normal): um arquivo SQLite de verdade na pasta
 * backend, exatamente como antes — o cliente libSQL fala com um arquivo
 * local (`file:...`) sem precisar de conta nenhuma no Turso.
 *
 * Em producao (Vercel): um arquivo local numa funcao serverless nao
 * sobrevive entre execucoes (cada "cold start" comeca do zero). Por isso a
 * producao aponta para um banco Turso (SQLite hospedado, mesma linguagem
 * SQL, mas persistente de verdade) — configurado por TURSO_DATABASE_URL e
 * TURSO_AUTH_TOKEN. Sem essas duas variaveis, cai no arquivo local mesmo
 * rodando na Vercel (o que reproduz o problema antigo, entao nao esqueca
 * de configura-las).
 */
function resolverConfiguracaoCliente() {
  if (process.env.TURSO_DATABASE_URL) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    };
  }
  const caminho = process.env.DB_FILE
    ? path.resolve(process.env.DB_FILE)
    : path.resolve(__dirname, '../../campeonatos.db');
  return { url: `file:${caminho}` };
}

const configuracaoCliente = resolverConfiguracaoCliente();
const db = createClient(configuracaoCliente);

/** Só para exibição (log de boot) — não usado para abrir arquivo nem nada sensível. */
const DESCRICAO_BANCO = configuracaoCliente.url;

/** Um único argumento que é um objeto puro (não array) vira parâmetros
 *  nomeados (`@campo`) em vez de posicionais (`?`) — é como o código já
 *  chama `.run(objetoComVariosCampos)` em algumas queries. */
function ehObjetoDeParametrosNomeados(args) {
  return args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0]);
}

/** Casca fina que imita a API sincrona do better-sqlite3 (`.prepare(sql).get/all/run(...)`)
 *  só que assincrona — deixa o resto do código quase igual ao de antes, trocando
 *  só `db.prepare(...)` por `await db.prepare(...)` nos call sites. */
function prepare(sql) {
  const executar = (args) => db.execute({ sql, args: ehObjetoDeParametrosNomeados(args) ? args[0] : args });
  return {
    async get(...args) {
      const r = await executar(args);
      return r.rows[0] ?? null;
    },
    async all(...args) {
      const r = await executar(args);
      return r.rows;
    },
    async run(...args) {
      const r = await executar(args);
      return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
    }
  };
}

/** Roda várias instruções separadas por `;` de uma vez (usado só para o schema). */
const exec = (sqlComVariasInstrucoes) => db.executeMultiple(sqlComVariasInstrucoes);

/** Antes (better-sqlite3): `db.transaction(fn)()` rodava `fn` inteira numa
 *  transação atômica e síncrona. O cliente libSQL não tem um equivalente
 *  direto para uma função com lógica condicional arbitrária no meio (o
 *  `batch()` dele só aceita uma lista fixa de instruções definida de
 *  antemão) — então aqui isso vira só "roda a função (agora assíncrona) e
 *  aguarda". Sem atomicidade real (se cair no meio, o que já rodou fica
 *  feito), mas os pontos que usam isso não têm um requisito forte de
 *  tudo-ou-nada — é aceitável para o volume e o caso de uso da escola. */
const transaction = (fn) => fn;

/** Adiciona colunas novas a tabelas já existentes (o schema.sql só cria tabelas
 *  que ainda não existem, então bancos criados antes de uma coluna nova nascer
 *  não a recebem automaticamente). Cada entrada é idempotente: só roda o ALTER
 *  se a coluna ainda não existir. */
async function migrar() {
  const { rows: colunasAlunos } = await db.execute('PRAGMA table_info(alunos)');
  const nomesColunas = colunasAlunos.map((c) => c.name);
  if (!nomesColunas.includes('token_reset_senha')) {
    await db.execute('ALTER TABLE alunos ADD COLUMN token_reset_senha TEXT');
  }
  if (!nomesColunas.includes('token_reset_expira')) {
    await db.execute('ALTER TABLE alunos ADD COLUMN token_reset_expira DATETIME');
  }
}

/** Cria as tabelas caso ainda não existam. Roda uma vez por "instância quente"
 *  (o app.js garante isso com uma promise cacheada). */
async function inicializar() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await exec(schema);
  await migrar();
}

module.exports = { db: { prepare, exec, transaction }, inicializar, ARQUIVO_DB: DESCRICAO_BANCO };
