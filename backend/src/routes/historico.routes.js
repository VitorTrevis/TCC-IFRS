const { Router } = require('express');
const c = require('../controllers/historico.controller');
const { rota } = require('../middlewares/erros');
const { exigirAdmin } = require('../middlewares/auth');

const router = Router();
router.get('/', exigirAdmin, rota(c.listar));
module.exports = router;
