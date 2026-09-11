const { Router } = require('express');
const times = require('../controllers/times.controller');
const jogadores = require('../controllers/jogadores.controller');
const { rota } = require('../middlewares/erros');
const { exigirAdmin } = require('../middlewares/auth');

const router = Router();
router.get('/:id/jogadores', rota(jogadores.listar));
router.post('/:id/jogadores', exigirAdmin, rota(jogadores.criar));
router.put('/:id', exigirAdmin, rota(times.atualizar));
router.delete('/:id', exigirAdmin, rota(times.remover));
module.exports = router;
