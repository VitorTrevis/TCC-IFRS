const Historico = require('../models/historico.model');

const listar = (req, res) => res.json(Historico.listar());

module.exports = { listar };
