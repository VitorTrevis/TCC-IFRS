const Historico = require('../models/historico.model');

const listar = async (req, res) => res.json(await Historico.listar());

module.exports = { listar };
