const { Router } = require('express');

const router = Router();
router.use('/admin', require('./admin.routes'));
router.use('/alunos', require('./alunos.routes'));
router.use('/campeonatos', require('./campeonatos.routes'));
router.use('/times', require('./times.routes'));
router.use('/jogadores', require('./jogadores.routes'));
router.use('/partidas', require('./partidas.routes'));
router.use('/publico', require('./publico.routes'));
module.exports = router;
