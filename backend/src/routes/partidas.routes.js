const { Router } = require('express');
const c = require('../controllers/partidas.controller');
const { rota } = require('../middlewares/erros');
const { exigirAdmin } = require('../middlewares/auth');

const router = Router();
router.get('/:id', rota(c.detalhar));
router.put('/:id', exigirAdmin, rota(c.atualizarAgenda));
router.put('/:id/resultado', exigirAdmin, rota(c.registrarResultado));
router.delete('/:id/resultado', exigirAdmin, rota(c.apagarResultado));
module.exports = router;
