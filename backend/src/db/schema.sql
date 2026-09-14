-- =====================================================================
-- Sistema de Organizacao de Campeonatos Esportivos Escolares
-- Schema relacional (SQLite 3)
-- =====================================================================

PRAGMA foreign_keys = ON;

-- Alunos: identidade da pessoa, independente de time ou campeonato.
--
-- Dois jeitos de uma conta existir:
--   1) Autocadastro por e-mail institucional (o caminho principal): o aluno
--      preenche nome, e-mail e senha; a conta nasce com email_verificado=0
--      e so libera login depois que ele clica no link mandado por e-mail.
--   2) Pre-cadastro manual pela coordenacao (excecao, sem e-mail): o admin
--      cadastra so o nome; o aluno define a propria senha no primeiro acesso
--      (sem verificacao por e-mail, ja que quem cadastrou foi a coordenacao).
CREATE TABLE IF NOT EXISTS alunos (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                TEXT NOT NULL,
  email               TEXT UNIQUE,              -- NULL para contas pre-cadastradas manualmente
  senha_hash          TEXT,
  email_verificado    INTEGER NOT NULL DEFAULT 0,
  token_verificacao   TEXT,                     -- hash do token de confirmacao pendente (nunca o token em si)
  token_expira        DATETIME,
  token_reset_senha   TEXT,                     -- hash do token de "esqueci minha senha" pendente (nunca o token em si)
  token_reset_expira  DATETIME,
  criado_em           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alunos_nome  ON alunos(nome);
CREATE INDEX IF NOT EXISTS idx_alunos_email ON alunos(email);

CREATE TABLE IF NOT EXISTS campeonatos (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                  TEXT NOT NULL,
  modalidade            TEXT NOT NULL,             -- 'Futsal', 'Volei', 'Handebol', ...
  formato               TEXT NOT NULL,             -- 'pontos_corridos' | 'mata_mata' | 'grupos_mata_mata'
  turno_returno         INTEGER DEFAULT 0,         -- 0 = so ida, 1 = ida e volta (pontos corridos / grupos)
  tamanho_grupo         INTEGER DEFAULT 4,         -- usado em 'grupos_mata_mata'
  classificados_grupo   INTEGER DEFAULT 2,         -- quantos avancam por grupo
  data_inicio           DATE,
  data_fim              DATE,
  status                TEXT DEFAULT 'planejado',  -- 'planejado' | 'em_andamento' | 'finalizado'
  criado_em             DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS times (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  id_campeonato  INTEGER NOT NULL,
  escudo_url     TEXT,
  grupo          TEXT,                             -- 'A', 'B', ... preenchido ao gerar a tabela
  criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_campeonato) REFERENCES campeonatos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jogadores (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  numero    INTEGER,
  id_time   INTEGER NOT NULL,
  id_aluno  INTEGER,                                -- vinculo opcional com a conta do aluno
  FOREIGN KEY (id_time) REFERENCES times(id) ON DELETE CASCADE,
  FOREIGN KEY (id_aluno) REFERENCES alunos(id) ON DELETE SET NULL
);

-- id_time_a / id_time_b sao NULL em partidas de mata-mata ainda nao definidas
-- (ex: a final existe na chave antes de sabermos quem sao os finalistas).
-- rotulo_a / rotulo_b guardam o texto exibido enquanto o time e desconhecido
-- (ex: "Vencedor Q1", "1o do Grupo A").
CREATE TABLE IF NOT EXISTS partidas (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  id_campeonato      INTEGER NOT NULL,
  id_time_a          INTEGER,
  id_time_b          INTEGER,
  rotulo_a           TEXT,
  rotulo_b           TEXT,
  rodada             INTEGER,
  fase               TEXT DEFAULT 'grupos',        -- 'grupos'|'oitavas'|'quartas'|'semi'|'final'|'16avos'
  grupo              TEXT,                         -- 'A', 'B'... quando fase = 'grupos'
  ordem_chave        INTEGER,                      -- posicao da partida dentro da fase (chaveamento)
  id_proxima_partida INTEGER,                      -- para onde o vencedor avanca
  slot_proxima       TEXT,                         -- 'a' ou 'b' na proxima partida
  data               DATETIME,
  local              TEXT,
  gols_a             INTEGER,
  gols_b             INTEGER,
  penaltis_a         INTEGER,
  penaltis_b         INTEGER,
  status             TEXT DEFAULT 'agendada',      -- 'agendada'|'em_andamento'|'finalizada'|'bye'
  FOREIGN KEY (id_campeonato)      REFERENCES campeonatos(id) ON DELETE CASCADE,
  FOREIGN KEY (id_time_a)          REFERENCES times(id) ON DELETE CASCADE,
  FOREIGN KEY (id_time_b)          REFERENCES times(id) ON DELETE CASCADE,
  FOREIGN KEY (id_proxima_partida) REFERENCES partidas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gols (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  id_partida  INTEGER NOT NULL,
  id_jogador  INTEGER NOT NULL,
  quantidade  INTEGER DEFAULT 1,
  FOREIGN KEY (id_partida) REFERENCES partidas(id) ON DELETE CASCADE,
  FOREIGN KEY (id_jogador) REFERENCES jogadores(id) ON DELETE CASCADE
);

-- Trilha de auditoria das acoes da coordenacao. A senha do admin e unica e
-- compartilhada (nao ha conta individual), entao "nome" e o nome que a
-- pessoa digitou ao entrar — um registro de confianca (nao criptografado a
-- uma identidade), mas resolve o "quem mexeu em que" no dia a dia.
-- Sem chave estrangeira para a entidade de proposito: o registro precisa
-- sobreviver mesmo depois que o campeonato/time/jogador/partida for apagado.
CREATE TABLE IF NOT EXISTS historico (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL,
  acao         TEXT NOT NULL,     -- 'criar' | 'editar' | 'remover' | 'gerar_tabela' | 'lancar_placar' | 'apagar_placar' | 'resetar_senha'
  entidade     TEXT NOT NULL,     -- 'campeonato' | 'time' | 'jogador' | 'partida' | 'aluno'
  entidade_id  INTEGER,
  descricao    TEXT NOT NULL,     -- frase pronta para exibir, ex: 'excluiu o campeonato "Interclasses 2026"'
  criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices nas chaves estrangeiras (RNF02: consultas rapidas)
CREATE INDEX IF NOT EXISTS idx_times_campeonato     ON times(id_campeonato);
CREATE INDEX IF NOT EXISTS idx_jogadores_time       ON jogadores(id_time);
CREATE INDEX IF NOT EXISTS idx_jogadores_aluno      ON jogadores(id_aluno);
CREATE INDEX IF NOT EXISTS idx_partidas_campeonato  ON partidas(id_campeonato);
CREATE INDEX IF NOT EXISTS idx_partidas_time_a      ON partidas(id_time_a);
CREATE INDEX IF NOT EXISTS idx_partidas_time_b      ON partidas(id_time_b);
CREATE INDEX IF NOT EXISTS idx_partidas_fase        ON partidas(id_campeonato, fase);
CREATE INDEX IF NOT EXISTS idx_gols_partida         ON gols(id_partida);
CREATE INDEX IF NOT EXISTS idx_historico_criado_em  ON historico(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_gols_jogador         ON gols(id_jogador);
