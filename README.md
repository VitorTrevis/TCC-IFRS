# Sistema de Organização de Campeonatos Esportivos Escolares

Aplicação web para coordenadores de Educação Física criarem e gerenciarem campeonatos
escolares: cadastro de times e jogadores, geração automática da tabela de jogos,
lançamento de placares, classificação recalculada em tempo real, ranking de artilheiros
e uma página pública que qualquer aluno acessa sem login.

---

## Como rodar no seu computador

### 1. Pré-requisitos

- **Node.js 18 ou superior** — conferir com `node -v`
- Um navegador (Chrome recomendado)
- Conexão com a internet na primeira execução (o Bootstrap e as fontes vêm por CDN)

Não precisa instalar SQLite: o banco é um arquivo criado automaticamente.

### 2. Instalar

Abra o terminal na pasta do projeto:

```bash
cd backend
npm install
```

### 3. Configurar (opcional para rodar local)

```bash
cp .env.example .env
```

Se você pular esta etapa o sistema usa os valores padrão (porta 3000, banco
`backend/campeonatos.db`). Para uso real, troque o `JWT_SECRET` por um valor aleatório.

No Windows (PowerShell), use `copy .env.example .env`.

**Sobre o envio de e-mail (cadastro de alunos):** se você não configurar
`GMAIL_USER`/`GMAIL_APP_PASSWORD`, o sistema não trava — ele só imprime o link de
confirmação no terminal em vez de mandar por e-mail de verdade. Ótimo para
desenvolver e testar sem precisar de credenciais. Para mandar e-mails de verdade
(obrigatório em produção):

1. Ative a **verificação em duas etapas** na conta Gmail que vai enviar os e-mails
   (Configurações da Conta Google → Segurança).
2. Gere uma **senha de app** em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   — escolha qualquer nome (ex: "Campeonatos Escolares") e copie a senha de 16
   caracteres gerada. **Não é a senha normal da conta.**
3. No `.env`, preencha:
   ```
   GMAIL_USER=sua.conta@gmail.com
   GMAIL_APP_PASSWORD=a-senha-de-16-caracteres-gerada
   APP_URL=http://localhost:3000
   ```
4. Em produção (Vercel), troque `APP_URL` pelo link publicado, e configure as
   mesmas três variáveis no painel da Vercel (veja a seção de deploy).

### 4. Popular o banco com dados de exemplo

```bash
npm run seed
```

Isso cria dois campeonatos prontos, 11 times, 60 jogadores e vários placares já lançados,
além de dois alunos de demonstração — um em cada fluxo de acesso possível. No fim ele
mostra os acessos:

```
Senha da coordenação (admin): ifrs2026

Alunos de demonstração:
  Vitor Trevisan  — login: vitor.trevisan@aluno.farroupilha.ifrs.edu.br / senha: vitor123
  Ramiro Severgnini — pré-cadastro manual (exceção), sem senha ainda
```

### 5. Subir o servidor

```bash
npm start
```

Abra **http://localhost:3000** no navegador. O Express serve a API e as páginas
do front-end na mesma porta — não precisa abrir os arquivos HTML direto do disco.

### Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor na porta 3000 |
| `npm run dev` | Sobe o servidor reiniciando sozinho a cada alteração |
| `npm run seed` | Apaga os dados e recria os exemplos |
| `npm run reset` | Apaga o arquivo do banco e roda o seed do zero |

---

## Deploy na Vercel (para apresentar com um link)

Isso publica o sistema num link público, sem precisar rodar nada no terminal
depois de configurado uma vez. **Importante entender antes de usar em
apresentação:** a Vercel roda o backend como função serverless, que não tem
disco permanente. Para contornar isso sem reescrever o banco de dados, o
projeto guarda uma "foto" pré-populada em `backend/db-inicial/campeonatos.db`,
e ela é copiada para a pasta temporária da função a cada "cold start".

Na prática, para uma apresentação isso funciona bem: você abre o link, navega,
loga como admin, lança um placar — tudo funciona normalmente enquanto a mesma
instância da função continuar ativa (o caso comum durante uma demo contínua).
O que **não** é garantido é a durabilidade: se a Vercel reciclar a instância
(em picos de tráfego, ou depois de um tempo ocioso), a próxima requisição volta
a partir da foto original, sem os dados que você alterou. Para uso real no
dia a dia da escola, veja "Banco externo" mais abaixo.

### Passo a passo (sem terminal, tudo pelo navegador)

1. **Suba o projeto para o GitHub.** Se você não usa Git, é possível criar um
   repositório novo em [github.com/new](https://github.com/new) e usar o botão
   "uploading an existing file" para arrastar a pasta do projeto direto do
   navegador — sem precisar de `git` instalado.
2. **Entre em [vercel.com](https://vercel.com)** e conecte sua conta do GitHub.
3. **"Add New" → "Project"** e selecione o repositório que você acabou de subir.
4. A Vercel detecta o `vercel.json` na raiz automaticamente. Não precisa mudar
   nenhuma configuração de build.
5. Antes de clicar em Deploy, abra **"Environment Variables"** e adicione:

   | Nome | Valor |
   |---|---|
   | `ADMIN_PASSWORD` | `ifrs2026` (ou a senha que você quiser usar) |
   | `JWT_SECRET` | qualquer texto longo e aleatório |
   | `GMAIL_USER` | a conta Gmail que envia os e-mails de confirmação |
   | `GMAIL_APP_PASSWORD` | a senha de app gerada (não é a senha normal da conta — veja a seção 3 acima) |
   | `APP_URL` | o link que a Vercel vai gerar, ex: `https://tcc-ifrs.vercel.app` |
   | `DOMINIO_EMAIL_ALUNO` | `aluno.farroupilha.ifrs.edu.br` (ou deixe de fora — esse já é o padrão) |

   Sem `GMAIL_USER`/`GMAIL_APP_PASSWORD` configurados, o cadastro de aluno
   continua funcionando, mas o link de confirmação só vai parar nos **logs da
   Vercel** (aba "Logs" do deployment) em vez do e-mail do aluno — inviável
   para uso real, mas não quebra a demonstração se você mesmo simular um cadastro
   e pegar o link direto do log.

6. Clique em **Deploy**. Em cerca de um minuto você recebe um link
   `https://seu-projeto.vercel.app` pronto para abrir na apresentação.
7. **Depois do primeiro deploy**, volte em Settings → Environment Variables e
   confira se `APP_URL` bate com o link real que a Vercel gerou (às vezes só se
   sabe o link definitivo depois do primeiro deploy). Se precisar corrigir, muda
   o valor e clica em "Redeploy".

### Atualizando os dados de demonstração

O banco publicado é a "foto" gerada localmente, não o banco que você usa no dia
a dia (`backend/campeonatos.db`, que é só sua, local). Para atualizar o que
aparece no link publicado:

```bash
cd backend
npm run gerar-banco-vercel
```

Isso regenera `backend/db-inicial/campeonatos.db`. Suba esse arquivo atualizado
para o GitHub (pelo navegador ou por `git push`) e a Vercel publica a versão
nova automaticamente.

### Banco externo (para uso real, não só demonstração)

Se depois quiser que a escola use isso de verdade — vários professores lançando
placares ao longo do ano, com garantia de que nada se perde — o SQLite local
não é a arquitetura certa para serverless. As opções são: trocar por um banco
externo compatível (ex: [Turso](https://turso.tech), que fala o mesmo SQL do
SQLite e tem plano grátis) ou hospedar em uma plataforma com disco persistente,
como Render. Qualquer uma das duas exige adaptar a camada de acesso ao banco
(`backend/src/db` e os models) para chamadas assíncronas — peça se quiser que
eu faça essa migração.

## Como usar

### Quem acessa o quê

O sistema tem **três níveis de acesso**:

| Quem | Como entra | O que pode fazer |
|---|---|---|
| **Qualquer pessoa** | Sem login | Ver campeonatos, jogos, classificação e artilheiros |
| **Aluno** | E-mail institucional + senha própria | O acima, mais o painel com as suas estatísticas pessoais |
| **Coordenação** | Senha única (`ifrs2026`) | Tudo: criar campeonatos, times, jogadores, gerar tabela e lançar placares |

### Coordenação

1. **Entrar** → "Sou da coordenação" → digite a senha `ifrs2026`.
2. **Criar campeonato** — escolha nome, modalidade e formato.
3. **Cadastrar os times** no painel, e os jogadores de cada time em "Elenco".
   Ao adicionar um jogador, vincule-o a um aluno já cadastrado pelo campo de
   autocomplete — é esse vínculo que faz as estatísticas aparecerem no painel dele.
   Se o aluno ainda não tem conta, dá pra criar o vínculo digitando o nome dele
   ali mesmo (vira um pré-cadastro sem e-mail, que ele completa depois).
4. **Gerar tabela de jogos** — o sistema monta as rodadas ou a chave sozinho.
5. **Lançar placar** em cada jogo. A classificação se atualiza na hora.
6. **Compartilhar a página pública** (`campeonato.html?id=N`) com as turmas.
7. **Acompanhar os alunos** no menu "Alunos" — quem já confirmou o e-mail, quem
   está pendente, e o pré-cadastro manual de exceção (veja abaixo).

### Aluno — caminho normal (autocadastro por e-mail institucional)

Esse é o fluxo pensado para ser usado sem a coordenação precisar cadastrar
ninguém, um por um — veja a justificativa completa na seção
"Autocadastro por e-mail" em Decisões de projeto.

1. **Entrar** → "Sou aluno" → "Criar conta".
2. Preenche nome completo, o e-mail institucional (precisa terminar em
   `@aluno.farroupilha.ifrs.edu.br`) e uma senha (mínimo 6 caracteres).
3. O sistema manda um e-mail com um link de confirmação, válido por 24h.
4. Clicando no link, a conta é ativada e o aluno já entra direto no painel —
   não precisa digitar a senha de novo nesse primeiro momento.
5. Dali em diante, login é sempre e-mail + senha.
6. **Meu painel**: total de gols, partidas, média por jogo, resumo por campeonato
   e o desempenho jogo a jogo, com os gols dele destacados.

Se o link não chegar (spam, digitou o e-mail errado), tem um "Reenviar
confirmação" na tela de login. Por segurança, esse link expira depois de 24h e
só pode ser usado uma vez; pedir um novo invalida o anterior.

**Esqueci minha senha:** na tela de login, "Esqueceu a senha?" pede o e-mail
institucional e manda um link de redefinição, válido por 1h e de uso único
(mesmo mecanismo de segurança do link de confirmação — veja "Token de
redefinição" em Decisões de projeto). Clicar no link leva a uma tela para
escolher a nova senha, e já loga o aluno direto no painel.

### Aluno — pré-cadastro manual (exceção, sem e-mail institucional)

Para os casos em que a coordenação já sabe quem é o aluno mas ele não tem (ou
não quer usar) o e-mail institucional na hora. Na tela de login, o aluno clica
em "Fui cadastrado pela coordenação", busca o próprio nome, e define a senha no
primeiro acesso — sem passar por confirmação de e-mail (a coordenação já
garantiu a identidade dessa pessoa ao cadastrar o nome). A própria coordenação
cria esse pré-cadastro em "Alunos" → "Pré-cadastro manual".

Se o aluno esquecer a senha (de qualquer um dos dois caminhos), a coordenação
reseta em "Alunos" → "Resetar senha". Depois do reset, ele define uma senha
nova pelo mesmo "Fui cadastrado pela coordenação" — busca o próprio nome de
novo, mesmo que a conta original tenha sido criada por e-mail.

---

## Formatos suportados

| Formato | Como a tabela é gerada |
|---|---|
| **Pontos corridos** | Algoritmo do círculo (round-robin): todos jogam contra todos. Número ímpar de times gera rodada de descanso. Opção de turno e returno. |
| **Mata-mata** | Chaveamento eliminatório com distribuição de byes por seed. Empate exige disputa de pênaltis. O vencedor avança sozinho para a fase seguinte. |
| **Grupos + mata-mata** | Times divididos em grupos equilibrados (distribuição em serpentina), pontos corridos dentro de cada grupo, e a chave eliminatória já montada com rótulos ("1º do Grupo A"). Quando o último jogo de grupo é lançado, os classificados entram na chave automaticamente. |

### Critérios de desempate da classificação

1. Pontos (vitória 3, empate 1, derrota 0)
2. Número de vitórias
3. Saldo de gols
4. Gols pró
5. Confronto direto (mini tabela entre os empatados)
6. Ordem alfabética

A classificação **não é armazenada no banco**: ela é recalculada a partir das partidas
finalizadas a cada consulta. Isso elimina a possibilidade de a tabela ficar
dessincronizada do placar.

---

## Identidade visual

A paleta e a marca seguem o **Manual de Uso da Marca dos Institutos
Federais**: vermelho Pantone 485 C (`#DA291C`) e verde Pantone 376 C
(`#84BD00`). O verde oficial puro tem contraste baixo demais contra fundo
claro para texto e botões (~2,3:1, abaixo do mínimo de acessibilidade), então
`--quadra` (usada em links, botões e destaques de texto) é uma versão mais
escura da mesma matiz (`#567B00`, ~5:1 de contraste); `--quadra-viva` guarda o
verde oficial para uso decorativo (a marca em si, selos com texto escuro).
Variáveis em [`frontend/public/css/estilo.css`](frontend/public/css/estilo.css).

O símbolo (círculo vermelho + quadrados verdes) é um SVG próprio em
[`frontend/public/img/ifrs-marca.svg`](frontend/public/img/ifrs-marca.svg),
reconstruído a partir do grid de construção oficial do manual — não é uma
imagem baixada de terceiros. Usado como favicon em todas as páginas e ao lado
do nome do sistema na barra superior (`montarTopo()` em
[`frontend/public/js/ui.js`](frontend/public/js/ui.js)).

---

## Arquitetura

Cliente-servidor em três camadas:

```
Apresentação    HTML + CSS + JavaScript puro + Bootstrap 5, consumindo a API via fetch()
Lógica          Express organizado em rotas -> controllers -> services
Persistência    SQLite via better-sqlite3, com schema relacional e chaves estrangeiras
```

```
/backend
  /api
    index.js         ponto de entrada da funcao serverless (Vercel)
  /db-inicial
    campeonatos.db   banco pre-populado versionado, usado só no deploy da Vercel
  /scripts
    gerar-banco-vercel.js
  /src
    /controllers    admin, alunos, campeonatos, times, jogadores, partidas, publico
    /models         acesso ao banco (consultas SQL isoladas)
    /routes         definição das rotas por recurso
    /services       tabela.service.js (geração de jogos)
                    classificacao.service.js (classificação e artilharia)
                    email.service.js (confirmação de conta via Gmail SMTP)
    /middlewares    auth.js (JWT admin/aluno + limites de tentativas), erros.js
    /db             index.js, schema.sql, seed.js
    app.js          configuração do Express
    server.js       inicialização (uso local)
  package.json
  .env.example
/frontend
  /public
    /css/estilo.css
    /img/ifrs-marca.svg   marca do IF (favicon e barra superior)
    /js             api.js, ui.js e um script por página
    index.html            lista de campeonatos
    login.html            entrada (aluno ou coordenação)
    confirmar-email.html  confirma a conta a partir do link recebido por e-mail
    redefinir-senha.html  define nova senha a partir do link de "esqueci minha senha"
    painel-aluno.html     painel do aluno com estatísticas pessoais
    admin-campeonato.html painel do organizador
    alunos-admin.html     lista de alunos e pré-cadastro manual (exceção)
    campeonato.html       página pública (jogos, classificação, artilheiros)
    classificacao.html    só a classificação
    artilheiros.html      só a artilharia
vercel.json         configuração de deploy (rota tudo para backend/api/index.js)
README.md
```

---

## API REST

Tudo em `/api`. Erros voltam sempre como `{ "erro": "mensagem clara" }`.

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/admin/login` | Corpo `{ senha }`. Devolve token com `role: "admin"` |
| POST | `/api/alunos/cadastro` | Autocadastro. Corpo `{ nome, email, senha, confirmar_senha }`. E-mail precisa terminar no domínio institucional |
| GET | `/api/alunos/confirmar-email?token=` | Confirma a conta e já devolve o login (token + dados do aluno) |
| POST | `/api/alunos/reenviar-confirmacao` | Corpo `{ email }`. Sempre responde a mesma mensagem, exista ou não a conta |
| POST | `/api/alunos/esqueci-senha` | Corpo `{ email }`. Manda link de redefinição (1h, uso único). Mesma mensagem sempre, exista ou não a conta |
| POST | `/api/alunos/redefinir-senha` | Corpo `{ token, senha, confirmar_senha }`. Define a nova senha e já devolve o login (token + dados do aluno) |
| GET | `/api/alunos/buscar?nome=` | Busca pública de pré-cadastros manuais (nunca devolve senha) |
| POST | `/api/alunos/:id/definir-senha` | Primeiro acesso do pré-cadastro manual. Uso único por aluno |
| POST | `/api/alunos/login` | Corpo `{ email, senha }` (autocadastro) ou `{ id/nome, senha }` (pré-cadastro manual) |
| GET | `/api/alunos/eu/estatisticas` | Estatísticas do aluno logado (token de aluno) |
| GET | `/api/alunos` | Lista todos os alunos, com e-mail e status de verificação (admin) |
| POST | `/api/alunos` | Pré-cadastro manual — exceção sem e-mail (admin) |
| POST | `/api/alunos/:id/resetar-senha` | Zera a senha; aluno define uma nova em "Fui cadastrado pela coordenação" (admin) |

O login do admin tem limite de 8 tentativas por minuto por IP. O cadastro de
aluno tem limite de 5/min, e o reenvio de confirmação e o pedido de
redefinição de senha, 3/min cada — os quatro independentes entre si, para
dificultar força bruta e spam de e-mail.

Tokens de admin e de aluno **não são intercambiáveis**: uma rota de admin recusa
token de aluno (403) e vice-versa.

### Campeonatos

| Método | Rota | Admin? |
|---|---|---|
| GET | `/api/campeonatos` | não |
| GET | `/api/campeonatos/:id` | não |
| POST | `/api/campeonatos` | sim |
| PUT | `/api/campeonatos/:id` | sim |
| DELETE | `/api/campeonatos/:id` | sim |

### Times e jogadores

| Método | Rota | Admin? |
|---|---|---|
| GET | `/api/campeonatos/:id/times` | não |
| POST | `/api/campeonatos/:id/times` | sim |
| PUT | `/api/times/:id` | sim |
| DELETE | `/api/times/:id` | sim |
| GET | `/api/times/:id/jogadores` | não |
| POST | `/api/times/:id/jogadores` | sim |
| PUT | `/api/jogadores/:id` | sim |
| DELETE | `/api/jogadores/:id` | sim |

### Jogos e resultados

| Método | Rota | Admin? |
|---|---|---|
| POST | `/api/campeonatos/:id/gerar-tabela` | sim |
| GET | `/api/campeonatos/:id/partidas` | não |
| GET | `/api/partidas/:id` | não |
| PUT | `/api/partidas/:id` | sim (data e local) |
| PUT | `/api/partidas/:id/resultado` | sim |
| DELETE | `/api/partidas/:id/resultado` | sim |

Corpo de `PUT /api/partidas/:id/resultado`:

```json
{
  "gols_a": 3,
  "gols_b": 2,
  "penaltis_a": null,
  "penaltis_b": null,
  "gols": [
    { "id_jogador": 4, "quantidade": 2 },
    { "id_jogador": 7, "quantidade": 1 }
  ]
}
```

O array `gols` é opcional, mas sem ele o ranking de artilheiros fica vazio.
A API recusa gols de jogadores que não pertencem a nenhum dos dois times e recusa
uma soma de gols individuais maior que o placar.

### Leitura pública

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/campeonatos/:id/classificacao` | Classificação calculada |
| GET | `/api/campeonatos/:id/artilheiros` | Ranking de artilheiros |
| GET | `/api/publico/campeonatos/:id` | Tudo de uma vez: campeonato, times, partidas, classificação e artilheiros |

---

## Modelo de dados

Seis tabelas: `alunos`, `campeonatos`, `times`, `jogadores`, `partidas`, `gols`.
O schema completo está em `backend/src/db/schema.sql`.

Pontos que fogem do óbvio:

- **Não existe tabela `classificacao`.** Ela é derivada de `partidas` a cada consulta.
- **`partidas.id_time_a` e `id_time_b` aceitam NULL.** Em mata-mata, a final existe na
  chave antes de sabermos quem são os finalistas. Enquanto isso, `rotulo_a` e `rotulo_b`
  guardam o texto exibido ("Vencedor Semifinal 1", "2º do Grupo B").
- **`id_proxima_partida` e `slot_proxima`** ligam cada jogo da chave ao jogo seguinte.
  É o que faz o vencedor avançar sozinho.
- **`jogadores.id_aluno` liga o jogador à conta do aluno**, e não o contrário. Um mesmo
  aluno joga por times diferentes em campeonatos diferentes ao longo do ano; as
  estatísticas pessoais dele somam todos esses vínculos.
- **`alunos.email` é opcional e único.** É `NULL` para contas do pré-cadastro manual
  (exceção) e preenchido para o autocadastro. O SQLite trata múltiplos `NULL` como
  valores distintos, então vários pré-cadastros sem e-mail convivem sem conflito.
- **`alunos.token_verificacao` nunca guarda o token em si, só o hash dele** (SHA-256).
  Mesmo com acesso de leitura ao banco, não dá para forjar um link de confirmação
  válido — o mesmo princípio usado para `senha_hash`. `token_reset_senha` (par de
  colunas independente, usado em "esqueci minha senha") segue a mesma regra.
- **Não existe tabela de coordenadores.** O admin é uma senha única em variável de
  ambiente, sem conta individual.
- Todas as chaves estrangeiras têm índice, e `ON DELETE CASCADE` onde faz sentido:
  apagar um campeonato apaga times, jogadores, partidas e gols. Apagar um aluno
  usa `ON DELETE SET NULL`: o jogador continua no time, só perde o vínculo com a conta.

---

## Decisões de projeto

**Admin por senha única, sem cadastro.** A primeira versão tinha cadastro livre de
coordenador por e-mail e senha — o que significava que qualquer pessoa podia se
cadastrar e apagar campeonatos. Como quem organiza são poucos professores conhecidos,
uma senha compartilhada configurável por ambiente resolve melhor: não há tela de
cadastro para um atacante usar, e trocar a senha é editar uma linha do `.env`.

**Autocadastro de aluno por e-mail institucional, não por pré-cadastro da
coordenação.** A primeira versão exigia que a coordenação pré-cadastrasse cada aluno
manualmente — inviável em escala (não há acesso ao sistema de matrículas do IFRS) e
frágil no longo prazo (se ninguém mais mexer no projeto, a lista nunca acompanha quem
entra e sai da escola). A alternativa óbvia — cadastro totalmente livre — reabre o
mesmo problema do admin: qualquer pessoa de fora, digitando um nome, vira "aluno" de
qualquer turma.

A solução foi ancorar a identidade no e-mail institucional
(`@aluno.farroupilha.ifrs.edu.br`), que só a própria escola emite. O aluno se
cadastra, mas a conta só é ativada depois de clicar num link mandado para esse
e-mail — ninguém de fora consegue simular isso, porque não tem como receber
mensagens nesse domínio. Isso elimina completamente a dependência de um humano
cadastrando cada aluno, e continua funcionando sozinho mesmo que ninguém mais dê
manutenção no código: é a própria escola (dona do domínio de e-mail) que segura
a barreira, não uma lista que alguém precisa manter atualizada.

O pré-cadastro manual pela coordenação continua existindo, mas como **exceção**
— para o caso raro de alguém sem esse e-mail à mão. Ele não passa pela verificação
por e-mail porque a garantia de identidade nesse caso vem de outro lugar: uma pessoa
da coordenação que reconhece o aluno.

**Token de confirmação é aleatório, expira em 24h, e só é armazenado como hash.**
O token que vai no link do e-mail (`crypto.randomBytes(32)`) nunca é gravado em texto
puro no banco — só o SHA-256 dele. Mesmo que o banco vaze, não dá para reconstruir
links de confirmação válidos a partir dele. A expiração de 24h limita a janela de uso
de um link esquecido aberto numa caixa de entrada compartilhada ou pública.

**Reenvio de confirmação sempre responde a mesma mensagem.** Se respondesse algo
diferente para "e-mail não existe" vs. "e-mail existe, mandei de novo", esse endpoint
viraria uma forma de descobrir quais e-mails têm conta no sistema. A resposta genérica
fecha esse vazamento.

**Token de redefinição de senha segue o mesmo padrão do token de confirmação**
(aleatório, só o hash SHA-256 é gravado, uso único, resposta genérica em
"esqueci minha senha" independente de o e-mail existir) — mesma lógica, mesmo
motivo, ver os dois itens acima. A única diferença deliberada é a validade: 1h
em vez de 24h, porque o pedido de redefinição é tipicamente usado na hora,
diferente da confirmação de cadastro (que a pessoa pode deixar para depois). O
mesmo clique que prova posse do e-mail também é aproveitado para marcar a
conta como verificada, cobrindo o caso raro de alguém pedir redefinição antes
de ter confirmado o cadastro original.

**Aluno se identifica por nome, não por CPF ou matrícula.** CPF é dado sensível sob a
LGPD e não traz ganho aqui: quem se cadastra prova a identidade pelo e-mail
institucional (ou, no caminho de exceção, pelo reconhecimento direto da coordenação).

**Senha definida pelo aluno, não distribuída pela escola.** Se a coordenação criasse
as senhas, elas circulariam em papel ou no grupo da turma. O fluxo de cadastro
transfere isso para o aluno, e o reset (raro) fica com a coordenação.

**Times travados depois da tabela gerada.** Incluir um time no meio de um round-robin
já sorteado quebraria o número de rodadas. O sistema bloqueia e sugere gerar a tabela
de novo.

**Pênaltis obrigatórios em empate de mata-mata.** Sem isso não existe vencedor para
avançar na chave, e a partida seguinte ficaria travada para sempre.

**Edição de resultado é limitada.** Se a partida seguinte da chave já foi jogada, mudar
o resultado anterior é recusado — senão o time errado ficaria na fase seguinte. Apague
o resultado de trás para frente.

---

## Limitações conhecidas

- A senha do admin é compartilhada: o sistema não registra *qual* professor fez cada
  alteração. Para auditoria por pessoa, seria preciso voltar a contas individuais.
- Quem sabe a senha do admin tem acesso total. Troque-a no `.env` a cada ano letivo.
- **Sem envio de e-mail configurado (`GMAIL_USER`/`GMAIL_APP_PASSWORD`), o
  autocadastro não funciona de verdade** — o link fica só no log do servidor. Para uso
  real (não só demonstração), essas variáveis são obrigatórias.
- O código de confirmação depende de uma conta Gmail pessoal/institucional enviando
  os e-mails. Se essa conta for desativada ou a senha de app expirar, o cadastro de
  novos alunos para de funcionar até alguém corrigir a credencial — o login de quem
  já tem conta continua normal.
- "Esqueci minha senha" (self-service, por e-mail) só existe para contas de
  autocadastro. Quem foi pré-cadastrado manualmente pela coordenação (sem e-mail)
  continua dependendo do reset feito por ela, redefinindo depois pelo caminho
  "Fui cadastrado pela coordenação" (busca por nome) — não há e-mail para mandar
  link nesse caso.
- Um aluno pode, em tese, ter duas contas (uma manual antiga + uma nova por e-mail)
  se a coordenação já tinha cadastrado o nome dele manualmente antes do autocadastro
  existir. O sistema não faz fusão automática dessas contas.
- Alunos homônimos no pré-cadastro manual precisam ser diferenciados no nome do
  cadastro (ex: acrescentando a turma). Não há campo separado de turma ou matrícula.
- Sem upload de imagem: `escudo_url` aceita apenas uma URL.
- O banco é SQLite local, adequado para uso em uma escola. Para vários usuários
  simultâneos, migrar para MySQL ou PostgreSQL (as consultas são SQL padrão, a troca
  fica concentrada em `src/db/index.js` e nos models).
- Bootstrap e as fontes vêm por CDN. Sem internet, o layout perde estilo mas continua
  funcionando.

---

## Solução de problemas

**`Error: listen EADDRINUSE :::3000`** — a porta já está ocupada. Mude `PORT` no `.env`
ou feche o outro processo.

**A página abre sem estilo** — falta internet para carregar o Bootstrap pelo CDN.

**`better-sqlite3` falhou ao instalar** — ele compila código nativo. No Windows,
instale as *Build Tools for Visual Studio*; no Linux, `sudo apt install build-essential`.

**O e-mail de confirmação não chega** — confira se `GMAIL_USER` e `GMAIL_APP_PASSWORD`
estão preenchidos no `.env` (ou nas variáveis da Vercel). Sem eles, o link só aparece
no console/logs do servidor, não é enviado de verdade. Confira também a caixa de spam.

**`Invalid login` ou erro de autenticação do Gmail** — geralmente é a senha normal da
conta em vez da senha de app. Gere uma nova em
[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
(precisa da verificação em duas etapas ativada primeiro).

**Quero começar do zero** — `npm run reset`.
