const { Router } = require('express');
const c = require('../controllers/publico.controller');
const { rota } = require('../middlewares/erros');

const router = Router();
router.get('/campeonatos', rota(c.listarCampeonatos));
router.get('/campeonatos/:id', rota(c.verCampeonato));
module.exports = router;
