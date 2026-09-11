const { Router } = require('express');
const c = require('../controllers/alunos.controller');
const { rota } = require('../middlewares/erros');
const { exigirAdmin, exigirAluno, limitarCadastroAluno, limitarReenvioConfirmacao } = require('../middlewares/auth');

const router = Router();

// Publico: autocadastro por e-mail institucional (caminho principal)
router.post('/cadastro', limitarCadastroAluno, rota(c.cadastrarPorEmail));
router.get('/confirmar-email', rota(c.confirmarEmail));
router.post('/reenviar-confirmacao', limitarReenvioConfirmacao, rota(c.reenviarConfirmacao));

// Publico: fluxo de login (aceita e-mail OU id/nome de pre-cadastro manual)
router.get('/buscar', rota(c.buscar));
router.post('/:id/definir-senha', rota(c.definirSenha));
router.post('/login', rota(c.entrar));

// Exclusivo do aluno logado
router.get('/eu/estatisticas', exigirAluno, rota(c.minhasEstatisticas));

// Exclusivo da coordenacao
router.get('/', exigirAdmin, rota(c.listar));
router.post('/', exigirAdmin, rota(c.criar));
router.post('/:id/resetar-senha', exigirAdmin, rota(c.resetarSenha));

module.exports = router;
