require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { inicializar } = require('./db');
const rotas = require('./routes');
const { naoEncontrado, tratarErro } = require('./middlewares/erros');

// A inicializacao do banco agora e assincrona (cliente libSQL/Turso), entao
// nao da mais pra rodar de forma sincrona no topo do arquivo como antes.
// Esse middleware garante que o schema existe antes de qualquer rota rodar,
// tanto localmente (uma vez, no primeiro request) quanto na Vercel (uma vez
// por "cold start" — a promise fica em cache, entao os requests seguintes
// na mesma instancia nao esperam de novo).
let prontoPromise = null;
function garantirInicializado() {
  if (!prontoPromise) prontoPromise = inicializar();
  return prontoPromise;
}

const app = express();
// Hospedado atrás de um proxy reverso (função serverless da Vercel). Sem isso,
// o Express ignora o cabeçalho X-Forwarded-For e req.ip fica sempre igual pra
// todo mundo — os limitadores de tentativas por IP (middlewares/auth.js)
// viram, na prática, um balde único e global em vez de um por pessoa.
// "1" = confia só no primeiro salto (o proxy da Vercel), que é exatamente
// a topologia daqui. Local, sem proxy na frente, isso não muda nada.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(async (req, res, next) => {
  try { await garantirInicializado(); next(); }
  catch (e) { next(e); }
});

// API
app.use('/api', rotas);

// Front-end estático servido pelo próprio Express
// Na Vercel, o frontend não fica em ../../frontend/public porque a estrutura
// é diferente (só o backend vai). Então se não achar, servimos um 404 genérico
// e deixamos a SPA redirecionar (o index.html é essencial; sem ele, o front não
// sabe nem como inicializar).
const PASTA_FRONT = path.resolve(__dirname, '../../frontend/public');
const fs = require('fs');
if (fs.existsSync(PASTA_FRONT)) {
  app.use(express.static(PASTA_FRONT));
  app.get('/api/saude', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));
  app.use('/api', naoEncontrado);
  app.get('/', (req, res) => res.sendFile(path.join(PASTA_FRONT, 'index.html')));
  app.use((req, res) => res.sendFile(path.join(PASTA_FRONT, 'index.html')));
} else {
  // Se não conseguir achar o frontend (ex: na Vercel sem a pasta frontend/),
  // retorna um JSON simples que a SPA pode usar pra saber que a API tá funcionando.
  app.get('/api/saude', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));
  app.use('/api', naoEncontrado);
  app.use((req, res) => res.json({ erro: 'Frontend não disponível nesta instância. API está funcional.' }));
}

app.use(tratarErro);

module.exports = app;
