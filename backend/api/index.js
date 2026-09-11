// Vercel serverless function entrypoint
// A Vercel espera uma funcao que receba (req, res), nao um app Express.
// O Express eh um app, entao a Vercel chama app(req, res) diretamente.
const app = require('../src/app');

// Exporta o app como handler — a Vercel vai chamar isso como funcao serverless.
module.exports = app;
