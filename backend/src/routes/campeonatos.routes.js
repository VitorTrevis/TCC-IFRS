const { Router } = require('express');
const camp = require('../controllers/campeonatos.controller');
const times = require('../controllers/times.controller');
const partidas = require('../controllers/partidas.controller');
const { rota } = require('../middlewares/erros');
const { exigirAdmin } = require('../middlewares/auth');

const router = Router();

// Leitura pública
router.get('/', rota(camp.listar));
router.get('/:id', rota(camp.detalhar));
router.get('/:id/times', rota(times.listar));
router.get('/:id/partidas', rota(partidas.listar));
router.get('/:id/classificacao', rota(camp.verClassificacao));
router.get('/:id/artilheiros', rota(camp.verArtilheiros));

// Escrita: só a coordenação (senha única)
router.post('/', exigirAdmin, rota(camp.criar));
router.put('/:id', exigirAdmin, rota(camp.atualizar));
router.delete('/:id', exigirAdmin, rota(camp.remover));
router.post('/:id/times', exigirAdmin, rota(times.criar));
router.post('/:id/gerar-tabela', exigirAdmin, rota(camp.gerar));

module.exports = router;
