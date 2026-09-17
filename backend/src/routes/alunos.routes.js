const { Router } = require('express');
const c = require('../controllers/alunos.controller');
const { rota } = require('../middlewares/erros');
const {
  exigirAdmin, exigirAluno, limitarCadastroAluno, limitarReenvioConfirmacao,
  limitarEsqueciSenha, limitarLoginAluno
} = require('../middlewares/auth');

const router = Router();

// Público: autocadastro por e-mail institucional (caminho principal)
router.post('/cadastro', limitarCadastroAluno, rota(c.cadastrarPorEmail));
router.get('/confirmar-email', rota(c.confirmarEmail));
router.post('/reenviar-confirmacao', limitarReenvioConfirmacao, rota(c.reenviarConfirmacao));

// Público: esqueci minha senha (autocadastro por e-mail)
router.post('/esqueci-senha', limitarEsqueciSenha, rota(c.esqueciSenha));
router.post('/redefinir-senha', rota(c.redefinirSenha));

// Público: login (e-mail + senha)
router.post('/login', limitarLoginAluno, rota(c.entrar));

// Exclusivo do aluno logado
router.get('/eu/estatisticas', exigirAluno, rota(c.minhasEstatisticas));

// Exclusivo da coordenação
router.get('/', exigirAdmin, rota(c.listar));
router.post('/:id/resetar-senha', exigirAdmin, rota(c.resetarSenha));
router.delete('/:id', exigirAdmin, rota(c.excluir));

module.exports = router;
