const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

/**
 * Onde gravar o banco.
 *
 * Local (Windows/Mac/Linux normal): arquivo fixo na pasta backend, como sempre.
 *
 * Na Vercel: o unico diretorio gravavel de uma funcao serverless e /tmp, e ele
 * nao sobrevive entre "cold starts" (a funcao pode subir do zero a qualquer
 * momento). Por isso copiamos, uma vez por cold start, uma copia congelada do
 * banco (gerada com `npm run gerar-banco-vercel` e versionada no repo) para
 * dentro de /tmp. A partir dai, leituras e escritas acontecem normalmente
 * nessa copia enquanto a mesma instancia da funcao continuar "quente" —
 * suficiente para navegar e ate lancar um placar numa apresentacao, mas sem a
 * garantia de persistencia permanente que uma escola usando isso todo dia
 * precisaria (nesse caso, ver a secao sobre banco externo no README).
 */
function resolverCaminhoDb() {
  if (!process.env.VERCEL) {
    return process.env.DB_FILE
      ? path.resolve(process.env.DB_FILE)
      : path.resolve(__dirname, '../../campeonatos.db');
  }

  const destino = '/tmp/campeonatos.db';
  const origem = path.resolve(__dirname, '../../db-inicial/campeonatos.db');
  if (!fs.existsSync(destino) && fs.existsSync(origem)) {
    fs.copyFileSync(origem, destino);
  }
  return destino;
}

const ARQUIVO_DB = resolverCaminhoDb();
const db = new Database(ARQUIVO_DB);

// Integridade referencial precisa ser ligada em toda conexao no SQLite.
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

/** Adiciona colunas novas a tabelas ja existentes (o schema.sql so cria tabelas
 *  que ainda nao existem, entao bancos criados antes de uma coluna nova nascer
 *  nao a recebem automaticamente). Cada entrada e idempotente: so roda o ALTER
 *  se a coluna ainda nao existir. */
function migrar() {
  const colunasAlunos = db.prepare("PRAGMA table_info(alunos)").all().map((c) => c.name);
  if (!colunasAlunos.includes('token_reset_senha')) {
    db.exec('ALTER TABLE alunos ADD COLUMN token_reset_senha TEXT');
  }
  if (!colunasAlunos.includes('token_reset_expira')) {
    db.exec('ALTER TABLE alunos ADD COLUMN token_reset_expira DATETIME');
  }
}

/** Cria as tabelas caso ainda nao existam. Roda a cada boot do servidor. */
function inicializar() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  migrar();
}

module.exports = { db, inicializar, ARQUIVO_DB };
