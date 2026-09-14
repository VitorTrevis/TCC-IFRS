/* Camada de acesso a API + sessao (admin ou aluno). */

const API = '/api';
const CHAVE_TOKEN = 'campeonatos:token';
const CHAVE_PAPEL = 'campeonatos:papel';   // 'admin' | 'aluno'
const CHAVE_ALUNO = 'campeonatos:aluno';   // so preenchido quando papel = 'aluno'
const CHAVE_ADMIN_NOME = 'campeonatos:admin_nome'; // so preenchido quando papel = 'admin'

const Sessao = {
  get token() { return localStorage.getItem(CHAVE_TOKEN); },
  get papel() { return localStorage.getItem(CHAVE_PAPEL); },
  get aluno() {
    try { return JSON.parse(localStorage.getItem(CHAVE_ALUNO) || 'null'); }
    catch { return null; }
  },
  get nomeAdmin() { return localStorage.getItem(CHAVE_ADMIN_NOME); },
  get logado() { return Boolean(this.token); },
  get ehAdmin() { return this.logado && this.papel === 'admin'; },
  get ehAluno() { return this.logado && this.papel === 'aluno'; },

  entrarComoAdmin(token, nome) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_PAPEL, 'admin');
    localStorage.setItem(CHAVE_ADMIN_NOME, nome || '');
    localStorage.removeItem(CHAVE_ALUNO);
  },
  entrarComoAluno(token, aluno) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_PAPEL, 'aluno');
    localStorage.setItem(CHAVE_ALUNO, JSON.stringify(aluno));
    localStorage.removeItem(CHAVE_ADMIN_NOME);
  },
  sair() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_PAPEL);
    localStorage.removeItem(CHAVE_ALUNO);
    localStorage.removeItem(CHAVE_ADMIN_NOME);
  }
};

async function pedir(metodo, caminho, corpo) {
  const cabecalhos = { 'Content-Type': 'application/json' };
  if (Sessao.token) cabecalhos.Authorization = `Bearer ${Sessao.token}`;

  const resposta = await fetch(API + caminho, {
    method: metodo,
    headers: cabecalhos,
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });

  if (resposta.status === 204) return null;

  let dados = null;
  const texto = await resposta.text();
  if (texto) { try { dados = JSON.parse(texto); } catch { dados = { erro: texto }; } }

  if (!resposta.ok) {
    if (resposta.status === 401 && Sessao.logado) Sessao.sair();
    const erro = new Error((dados && dados.erro) || `Erro ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

const api = {
  // Coordenacao (senha unica + nome de quem esta entrando, para o historico)
  loginAdmin: (senha, nome) => pedir('POST', '/admin/login', { senha, nome }),
  historico: () => pedir('GET', '/historico'),

  // Contas de aluno — autocadastro por e-mail institucional (caminho principal)
  cadastrarAluno:       (nome, email, senha, confirmar_senha) => pedir('POST', '/alunos/cadastro', { nome, email, senha, confirmar_senha }),
  confirmarEmailAluno:  (token) => pedir('GET', `/alunos/confirmar-email?token=${encodeURIComponent(token)}`),
  reenviarConfirmacao:  (email) => pedir('POST', '/alunos/reenviar-confirmacao', { email }),
  loginAlunoEmail:      (email, senha) => pedir('POST', '/alunos/login', { email, senha }),
  esqueciSenha:         (email) => pedir('POST', '/alunos/esqueci-senha', { email }),
  redefinirSenha:       (token, senha, confirmar_senha) => pedir('POST', '/alunos/redefinir-senha', { token, senha, confirmar_senha }),

  // Contas de aluno — pre-cadastro manual pela coordenacao (excecao)
  buscarAlunos:      (nome) => pedir('GET', `/alunos/buscar?nome=${encodeURIComponent(nome)}`),
  definirSenhaAluno: (id, senha, confirmar_senha) => pedir('POST', `/alunos/${id}/definir-senha`, { senha, confirmar_senha }),
  loginAluno:        (id, senha) => pedir('POST', '/alunos/login', { id, senha }),

  minhasEstatisticas:() => pedir('GET', '/alunos/eu/estatisticas'),
  listarAlunosAdmin: () => pedir('GET', '/alunos'),
  criarAlunoAdmin:   (nome) => pedir('POST', '/alunos', { nome }),
  resetarSenhaAluno: (id) => pedir('POST', `/alunos/${id}/resetar-senha`),

  campeonatos:      () => pedir('GET', '/campeonatos'),
  campeonato:       (id) => pedir('GET', `/campeonatos/${id}`),
  criarCampeonato:  (d) => pedir('POST', '/campeonatos', d),
  editarCampeonato: (id, d) => pedir('PUT', `/campeonatos/${id}`, d),
  removerCampeonato:(id) => pedir('DELETE', `/campeonatos/${id}`),
  gerarTabela:      (id) => pedir('POST', `/campeonatos/${id}/gerar-tabela`),

  times:        (id) => pedir('GET', `/campeonatos/${id}/times`),
  criarTime:    (id, d) => pedir('POST', `/campeonatos/${id}/times`, d),
  editarTime:   (id, d) => pedir('PUT', `/times/${id}`, d),
  removerTime:  (id) => pedir('DELETE', `/times/${id}`),

  jogadores:      (idTime) => pedir('GET', `/times/${idTime}/jogadores`),
  criarJogador:   (idTime, d) => pedir('POST', `/times/${idTime}/jogadores`, d),
  editarJogador:  (id, d) => pedir('PUT', `/jogadores/${id}`, d),
  removerJogador: (id) => pedir('DELETE', `/jogadores/${id}`),

  partidas:          (id) => pedir('GET', `/campeonatos/${id}/partidas`),
  registrarResultado:(idPartida, d) => pedir('PUT', `/partidas/${idPartida}/resultado`, d),
  apagarResultado:   (idPartida) => pedir('DELETE', `/partidas/${idPartida}/resultado`),
  agendarPartida:    (idPartida, d) => pedir('PUT', `/partidas/${idPartida}`, d),

  classificacao: (id) => pedir('GET', `/campeonatos/${id}/classificacao`),
  artilheiros:   (id) => pedir('GET', `/campeonatos/${id}/artilheiros`),
  publico:       (id) => pedir('GET', `/publico/campeonatos/${id}`)
};
