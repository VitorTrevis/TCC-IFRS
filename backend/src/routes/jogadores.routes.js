const { Router } = require('express');
const c = require('../controllers/jogadores.controller');
const { rota } = require('../middlewares/erros');
const { exigirAdmin } = require('../middlewares/auth');

const router = Router();
router.put('/:id', exigirAdmin, rota(c.atualizar));
router.delete('/:id', exigirAdmin, rota(c.remover));
module.exports = router;
