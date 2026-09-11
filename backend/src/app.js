require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { inicializar } = require('./db');
const rotas = require('./routes');
const { naoEncontrado, tratarErro } = require('./middlewares/erros');

inicializar();

const app = express();
app.use(cors());
app.use(express.json());

// API
app.use('/api', rotas);

// Front-end estatico servido pelo proprio Express
// Na Vercel, o frontend nao fica em ../../frontend/public porque a estrutura
// eh diferente (soh o backend vai). Entao se nao achar, servimos um 404 generico
// e deixamos a SPA redirecionar (o index.html e essencial; sem ele, o front nao
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
  // Se nao conseguir achar o frontend (ex: na Vercel sem a pasta frontend/),
  // retorna um JSON simples que a SPA pode usar pra saber que a API tá funcionando.
  app.get('/api/saude', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));
  app.use('/api', naoEncontrado);
  app.use((req, res) => res.json({ erro: 'Frontend nao disponivel nesta instancia. API esta funcional.' }));
}

app.use(tratarErro);

module.exports = app;
