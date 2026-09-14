/**
 * Gera o banco pré-populado versionado em backend/db-inicial/campeonatos.db.
 * É esse arquivo que a Vercel copia para /tmp a cada cold start da função
 * (SQLite normal não tem como gravar permanentemente em ambiente serverless).
 *
 * Rode com: npm run gerar-banco-vercel
 * Rode de novo sempre que quiser atualizar os dados que aparecem na demo
 * publicada, e faça um novo deploy (git push) depois.
 */
const fs = require('fs');
const path = require('path');

const pasta = path.resolve(__dirname, '../db-inicial');
fs.rmSync(pasta, { recursive: true, force: true });
fs.mkdirSync(pasta);

process.env.DB_FILE = path.join(pasta, 'campeonatos.db');
require('../src/db/seed.js');

console.log(`Banco congelado gerado em: ${process.env.DB_FILE}`);
console.log('Lembre-se de commitar esse arquivo (ele NÃO entra no .gitignore) e fazer o deploy.');
