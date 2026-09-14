const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

/**
 * Onde gravar o banco.
 *
 * Local (Windows/Mac/Linux normal): arquivo fixo na pasta backend, como sempre.
 *
 * Na Vercel: o único diretório gravável de uma função serverless é /tmp, e ele
 * não sobrevive entre "cold starts" (a função pode subir do zero a qualquer
 * momento). Por isso copiamos, uma vez por cold start, uma cópia congelada do
 * banco (gerada com `npm run gerar-banco-vercel` e versionada no repo) para
 * dentro de /tmp. A partir daí, leituras e escritas acontecem normalmente
 * nessa cópia enquanto a mesma instância da função continuar "quente" —
 * suficiente para navegar e até lançar um placar numa apresentação, mas sem a
 * garantia de persistência permanente que uma escola usando isso todo dia
 * precisaria (nesse caso, ver a seção sobre banco externo no README).
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

// Integridade referencial precisa ser ligada em toda conexão no SQLite.
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

/** Adiciona colunas novas a tabelas já existentes (o schema.sql só cria tabelas
 *  que ainda não existem, então bancos criados antes de uma coluna nova nascer
 *  não a recebem automaticamente). Cada entrada é idempotente: só roda o ALTER
 *  se a coluna ainda não existir. */
function migrar() {
  const colunasAlunos = db.prepare("PRAGMA table_info(alunos)").all().map((c) => c.name);
  if (!colunasAlunos.includes('token_reset_senha')) {
    db.exec('ALTER TABLE alunos ADD COLUMN token_reset_senha TEXT');
  }
  if (!colunasAlunos.includes('token_reset_expira')) {
    db.exec('ALTER TABLE alunos ADD COLUMN token_reset_expira DATETIME');
  }
}

/** Cria as tabelas caso ainda não existam. Roda a cada boot do servidor. */
function inicializar() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  migrar();
}

module.exports = { db, inicializar, ARQUIVO_DB };
