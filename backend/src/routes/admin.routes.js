const { Router } = require('express');
const c = require('../controllers/admin.controller');
const { rota } = require('../middlewares/erros');
const { limitarTentativasAdmin } = require('../middlewares/auth');

const router = Router();
router.post('/login', limitarTentativasAdmin, rota(c.entrar));
module.exports = router;
