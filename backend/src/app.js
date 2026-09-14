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
