# Auditoria de código — Campeonatos Escolares

Data: 2026-09-14. Revisão manual de todo o backend (Express/SQLite) e frontend
(HTML/JS/CSS puro). Organizada nas 6 categorias pedidas. Severidade: 🔴 crítico
· 🟠 alto · 🟡 médio · 🔵 baixo/melhoria.

---

## 1. Erros e bugs

### 🟠 1.1 Excluir jogador não pede confirmação e apaga o histórico de gols em cascata
**Onde:** [`frontend/public/js/admin.js:150-158`](frontend/public/js/admin.js#L150) (botão "×" do
jogador) · [`backend/src/controllers/jogadores.controller.js:67-72`](backend/src/controllers/jogadores.controller.js#L67)
· [`backend/src/db/schema.sql:101`](backend/src/db/schema.sql#L101) (`gols.id_jogador ... ON DELETE CASCADE`)

Todas as outras ações destrutivas do painel (excluir campeonato, excluir time,
gerar tabela de novo, apagar placar) passam por `confirm()`. Excluir jogador
não passa por nenhum — é só um clique no "×" pequeno ao lado da contagem de
gols. E como `gols.id_jogador` tem `ON DELETE CASCADE`, apagar um jogador que
já marcou gol em uma partida **apaga esses registros de gol silenciosamente**:
o placar da partida (`partidas.gols_a/gols_b`) não muda, mas a soma dos gols
por jogador para aquela partida passa a ficar menor que o placar, sem nenhum
aviso, e o artilheiro perde os gols para sempre.

**Correção:** adicionar `confirm()` igual às outras ações; e no backend,
recusar a exclusão (ou pelo menos avisar) quando o jogador tiver gols
registrados — mesmo padrão de proteção que já existe para times depois da
tabela gerada.

### 🟠 1.2 Corrigir um resultado da fase de grupos depois que a chave já foi preenchida deixa o mata-mata desatualizado
**Onde:** [`backend/src/services/tabela.service.js:330-353`](backend/src/services/tabela.service.js#L330)
(`preencherMataMataComClassificados`, guarda de idempotência `jaPreenchida`) ·
[`backend/src/controllers/partidas.controller.js:132-154`](backend/src/controllers/partidas.controller.js#L132)
(`apagarResultado`)

Cenário: os grupos terminam, a chave eliminatória é preenchida automaticamente
com "1º do Grupo A" etc. Depois disso, a coordenação percebe um erro de
digitação num placar da fase de grupos e o edita (ou apaga e relança). Isso
pode mudar quem ficou em 1º/2º do grupo — mas `preencherMataMataComClassificados`
só roda quando a chave ainda está vazia (`jaPreenchida` bloqueia um segundo
preenchimento) e `apagarResultado` nunca limpa os slots da chave para
partidas de grupo (só faz isso para partidas eliminatórias, via
`id_proxima_partida`). Resultado: **a chave continua mostrando o time errado
como classificado**, sem nenhuma forma de corrigir pela interface — só
mexendo direto no banco.

**Correção:** ao editar/apagar um resultado de fase de grupos depois que a
chave já foi preenchida, ou bloquear a edição (como já se faz para fases
eliminatórias com `travarSeProximaJaJogada`), ou limpar e re-executar
`preencherMataMataComClassificados` para a fase seguinte.

### 🔵 1.3 `gerarGruposMataMata` quebra com mais de 26 grupos
**Onde:** [`backend/src/services/tabela.service.js:15`](backend/src/services/tabela.service.js#L15)
(`LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'`) e uso em `gerarGruposMataMata` (linha ~255)

`LETRAS[g]` para `g >= 26` retorna `undefined`, que o `better-sqlite3` rejeita
como parâmetro (`TypeError: cannot bind undefined`), derrubando a geração de
tabela com erro 500. Só acontece com mais de 26 grupos (100+ times no tamanho
padrão de 4 por grupo) — improvável numa escola, mas é um caso não tratado.
Se algum dia isso importar, trocar por rótulos tipo "Grupo 27" a partir da letra Z.

### 🔵 1.4 Sem validação de que `data_fim` seja depois de `data_inicio`
**Onde:** [`backend/src/controllers/campeonatos.controller.js:10-55`](backend/src/controllers/campeonatos.controller.js#L10) (`validar`)

Aceita qualquer combinação de datas, incluindo fim antes do início, ou texto
que não é data nenhuma (guardado como string, sem validar formato). Efeito
prático é só cosmético hoje (o frontend mostra "Invalid Date" com segurança),
mas vale adicionar a checagem.

### 🔵 1.5 `escudo_url` existe no schema/model/controller mas nunca é usado no frontend
**Onde:** `backend/src/db/schema.sql` (`times.escudo_url`), `backend/src/models/time.model.js`,
`backend/src/controllers/times.controller.js` — grep em `frontend/public/js` não encontra
nenhuma referência a `escudo_url`, `escudo_a` ou `escudo_b`.

O campo é aceito na criação/edição de time pela API e devolvido pelas
consultas (inclusive nas partidas, como `escudo_a`/`escudo_b`), mas não existe
nenhum campo de formulário para preenchê-lo nem nenhum `<img>` que o exiba —
é uma funcionalidade pela metade. Pior: o botão "Renomear" chama
`api.editarTime(id, { nome })` sem `escudo_url`, e o controller grava
`escudo_url: req.body?.escudo_url` — como o campo nunca vem no corpo, **renomear
um time por essa tela apaga o escudo** se algum dia alguém tiver setado um via
API direta. Ou finalize a funcionalidade (campo de URL + `<img>` nos lugares
certos) ou remova o campo para não deixar rastro de recurso incompleto.

### 🔵 1.6 `PUT /api/campeonatos/:id` existe mas não tem nenhuma tela que o use
**Onde:** [`frontend/public/js/api.js:86`](frontend/public/js/api.js#L86) (`editarCampeonato`)

É a única função de `api.js` que não é chamada em lugar nenhum do frontend —
não há tela para editar nome/modalidade/datas de um campeonato já criado (só
criar e excluir). Ou é código morto para remover, ou uma tela ficou faltando.

---

## 2. Inconsistências

### 🟠 2.1 Confirmação de ações destrutivas não é uniforme
Excluir campeonato, excluir time, gerar tabela de novo e apagar placar pedem
`confirm()`. Excluir jogador (item 1.1) e resetar senha de aluno seguem
padrões diferentes entre si — resetar senha pede confirmação, excluir
jogador não pede nenhuma. Mesma classe de ação (destruir dado), tratamento
diferente.

### 🟡 2.2 Sessão expirada (401) é tratada de formas diferentes por tela
`painel-aluno.js` e `alunos-admin.js` verificam `e.status === 401` e
redirecionam para o login. `index.js`, `admin.js` e `publico.js` simplesmente
mostram o erro num toast (`avisar(e.message, 'erro')`) e deixam o usuário
numa tela onde nenhum botão vai funcionar até ele recarregar manualmente.
Vale centralizar esse tratamento em `pedir()` (`api.js`), que já detecta 401 e
limpa a sessão — só falta redirecionar de lá para todas as telas usarem o
mesmo comportamento.

### 🔵 2.3 Duas redações diferentes para a mesma "resposta genérica anti-enumeração"
`reenviarConfirmacao`: *"Se esse e-mail estiver cadastrado e pendente de
confirmação, reenviamos o link."* vs. `esqueciSenha`: *"Se esse e-mail tiver
conta, mandamos um link para redefinir a senha."* — mesmo padrão de segurança
(não revelar se o e-mail existe), redação parecida mas não padronizada. Não é
grave, mas dá para unificar o tom.

---

## 3. Português e textos

O app inteiro é escrito **sem nenhum acento** ("nao", "cao", "esta",
"voce", "numero", "pre-cadastro"...) — inclusive nos textos que o
usuário final vê (botões, títulos, mensagens de erro). É o único arquivo do
projeto sem nenhum caractere acentuado em `frontend/public` e
`backend/src` (confirmado por busca em todo o código-fonte) — enquanto o
próprio README.md do projeto usa acentuação correta o tempo todo. Isso passa
a impressão de pressa/erro de digitação para quem usa o sistema (coordenação,
alunos, pais), mesmo sendo consistente. Recomendo uma passada geral
adicionando acentuação — abaixo, uma amostra representativa (não exaustiva,
são centenas de ocorrências) com a forma correta:

| Onde | Atual | Correção |
|---|---|---|
| `login.html` | "Quem esta acessando?" | "Quem **está** acessando?" |
| `login.html` | "Sou da coordenacao" | "Sou da coordena**ção**" |
| `login.html` | "Nao recebeu o e-mail de confirmacao?" | "**Não** recebeu o e-mail de confirma**ção**?" |
| `login.html` | "Minimo de 6 caracteres." | "**Mínimo** de 6 caracteres." |
| `login.html` | "Digite como esta no pre-cadastro..." | "Digite como **está** no **pré**-cadastro..." |
| `index.html` | "Educacao fisica" | "Educa**ção** f**í**sica" |
| `index.html` | "Comeca em" | "Come**ça** em" |
| `admin-campeonato.html` | "Chave eliminatoria" | "Chave eliminat**ória**" |
| `admin-campeonato.html` | "Lancar placar" | "Lan**çar** placar" |
| `admin-campeonato.html` | placeholder "No" (número da camisa) | "**Nº**" |
| `campeonatos.controller.js` | "Formato invalido." | "Formato **inválido**." |
| `campeonatos.controller.js` | "Informe a modalidade (Futsal, Volei, Handebol...)." | "...Futsal, **Vôlei**, Handebol..." |
| `campeonatos.controller.js` | "Valores numericos precisam ser numeros inteiros." | "Valores **numéricos**... **números** inteiros." |
| `partidas.controller.js` | "penaltis" (em 6 mensagens) | "**pênaltis**" (com acento em todas) |
| `partidas.controller.js` | "Esta partida e um bye: o time avancou sem jogar." | "Esta partida **é** um bye: o time **avançou** sem jogar." |
| `partidas.controller.js` | "A partida seguinte da chave ja foi jogada. Apague o resultado dela antes de mudar este." | "...**já** foi jogada. Apague o resultado dela antes de alterar este placar." *(também esclarece o "este" solto)* |
| `alunos.controller.js` | "As senhas nao sao iguais." | "As senhas **não são** iguais." |
| `alunos.controller.js` | "Esse link expirou ou ja foi usado. Peca um novo..." | "...**já** foi usado. Pe**ç**a um novo..." |
| `alunos.controller.js` | "Este e o seu primeiro acesso..." | "Este **é** o seu primeiro acesso..." |
| `jogadores.controller.js` | "Ja existe um aluno pre-cadastrado como..." | "**Já** existe um aluno **pré**-cadastrado como..." |
| `times.controller.js` | "A tabela de jogos ja foi gerada." | "...**já** foi gerada." |

Termo usado sem acento em **todo lugar**, então pelo menos é consistente —
mas vale decidir se isso foi proposital (ex.: preocupação antiga com
encoding) já que o `charset="utf-8"` está declarado em todas as páginas e
acentos funcionariam normalmente.

Outros pontos de texto, à parte da acentuação:
- **"Vôlei" vs "Volei"**: o seed usa "Volei" como modalidade (dado, não é
  bug), mas o texto de exemplo do formulário (`c-modalidade`) e a mensagem de
  erro do backend têm a mesma grafia sem acento — pelo menos está consistente
  entre si.
- `partidas.controller.js:98-99`: "Os gols marcados pelos jogadores do
  mandante passam do placar informado." — "passam do" é uma construção
  informal; fica mais claro como "**ultrapassam** o placar informado".

---

## 4. Segurança e possibilidades de burla

### 🔴 4.1 Qualquer pessoa pode sequestrar a conta de um aluno — `POST /api/alunos/:id/definir-senha`
**Onde:** [`backend/src/controllers/alunos.controller.js:113-127`](backend/src/controllers/alunos.controller.js#L113)
· rota pública, sem `exigirAdmin`/`exigirAluno` e **sem rate limit**:
[`backend/src/routes/alunos.routes.js:15`](backend/src/routes/alunos.routes.js#L15)

```js
function definirSenha(req, res) {
  const aluno = Aluno.porId(req.params.id);
  if (!aluno) falha(404, 'Aluno nao encontrado.');
  if (aluno.senha_hash) {
    falha(400, 'Este aluno ja definiu a senha. Peca para a coordenacao resetar se precisar trocar.');
  }
  const { senha, confirmar_senha } = req.body || {};
  ...
  Aluno.definirSenha(aluno.id, bcrypt.hashSync(String(senha), 10));
  ...
}
```

Esse é o endpoint do fluxo "Fui cadastrado pela coordenação, primeiro
acesso". O único requisito para definir a senha de **qualquer** aluno que
ainda não tenha senha é saber o `id` numérico dele — sequencial e trivial de
adivinhar (1, 2, 3...). Não existe nenhuma prova de identidade (nem
e-mail, nem código, nem pergunta de segurança).

**Como explorar:** `GET /api/alunos/buscar?nome=a` é público e devolve
`{ id, nome, tem_senha }` para todo mundo que ainda não reivindicou a conta —
ou seja, a própria API entrega a lista de alvos prontos. Um visitante
qualquer roda esse passeio e chama `POST /api/alunos/{id}/definir-senha`
com a senha que quiser, tomando a conta antes do aluno de verdade acessar.
O aluno legítimo fica bloqueado (o `if (aluno.senha_hash)` passa a barrar
*ele*), até a coordenação perceber e resetar.

**Isso também vale para qualquer conta já resetada pela coordenação** —
`resetarSenha` zera `senha_hash` (volta pro estado "sem senha") mesmo em
contas que tinham sido criadas por e-mail institucional, e depois disso elas
também passam a aceitar esse mesmo endpoint de reivindicação sem prova de
identidade — inclusive login futuro por `{id, senha}` direto, sem precisar
do e-mail original (`alunos.controller.js:132-153`, função `entrar`, aceita
`id`/`nome` OU `email`, os dois caminhos convivem na mesma conta).

**Impacto hoje:** o único dado protegido por login de aluno é
`/alunos/eu/estatisticas` (gols, partidas, campeonatos da pessoa) — sensível
o bastante para não ser desejável, e vira um problema maior automaticamente
se qualquer funcionalidade nova for adicionada à área do aluno no futuro.

**Correção sugerida:** exigir algum segredo entregue fora da faixa junto do
pré-cadastro (ex.: um código curto que a coordenação entrega em mãos/no
diário de classe, exigido junto da nova senha), ou pelo menos: (a) colocar
um rate limit agressivo nessa rota, (b) registrar/mostrar na tela "Alunos" da
coordenação quando e de onde (IP) uma conta foi reivindicada, para detecção
rápida. Isso não elimina o problema de design, mas reduz a janela de abuso.

### 🔴 4.2 Login de aluno sem limite de tentativas
**Onde:** [`backend/src/routes/alunos.routes.js:19`](backend/src/routes/alunos.routes.js#L19) —
`router.post('/login', rota(c.entrar));` sem nenhum middleware de limite.

Todo outro endpoint sensível (`admin/login`, `alunos/cadastro`,
`reenviar-confirmacao`, `esqueci-senha`) tem um limitador; o login de aluno
não tem nenhum. Combinado com a senha mínima de 6 caracteres sem exigência
de complexidade (`alunos.controller.js:43`), dá para tentar senhas sem limite
de velocidade contra qualquer e-mail/id/nome conhecido — força bruta online
sem fricção nenhuma.

**Correção:** aplicar o mesmo `criarLimitador` já existente em
`middlewares/auth.js` nessa rota (ex.: 8/min, igual ao admin).

### 🔴 4.3 `trust proxy` não configurado — os limitadores por IP não funcionam como o código presume
**Onde:** `backend/src/app.js` (nenhuma chamada a `app.set('trust proxy', ...)`) ·
uso de `req.ip` em [`backend/src/middlewares/auth.js:69`](backend/src/middlewares/auth.js#L69)

Sem `trust proxy`, o Express ignora o cabeçalho `X-Forwarded-For` e usa
`req.socket.remoteAddress` — atrás de qualquer proxy reverso (inclusive a
função serverless da Vercel, que é exatamente onde este projeto é hospedado
por padrão), isso tende a devolver sempre o mesmo endereço interno para
**todas** as requisições. Na prática, o "limite por IP" vira um balde
único, global, compartilhado por todo mundo que acessa o sistema:

- Um único usuário malicioso mandando poucas dezenas de requisições esgota o
  limite de cadastro/reenvio/redefinição de senha **para a escola inteira**
  por um minuto — nega o serviço a alunos legítimos tentando se cadastrar ou
  recuperar a senha ao mesmo tempo.
- Ou, se a Vercel repassar IPs variados via `X-Forwarded-For` e ainda assim o
  Express não confiar neles, o comportamento fica imprevisível — o ponto
  central é que isso nunca foi testado/validado.

**Correção:** `app.set('trust proxy', 1)` (ou o valor apropriado à
plataforma) para o Express passar a usar `X-Forwarded-For` de forma confiável,
e então validar que o limite volta a ser por IP real de quem acessa.

### 🟠 4.4 Senha da coordenação comparada com `!==` (não é constant-time)
**Onde:** [`backend/src/controllers/admin.controller.js:7`](backend/src/controllers/admin.controller.js#L7)
— `if (senha !== SENHA_ADMIN) falha(401, 'Senha incorreta.');`

Comparação direta de string vaza, em tese, uma pequena diferença de tempo
proporcional a quantos caracteres iniciais coincidem — um ataque de
canal-lateral por tempo, teoricamente explorável a distância com paciência e
muitas medições. É de exploração difícil na prática, mas é um code smell
clássico com correção de uma linha:

```js
const crypto = require('crypto');
function senhaConfere(a, b) {
  const A = Buffer.from(String(a)); const B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
```

### 🟠 4.5 Segredo do JWT tem um valor padrão público, se a variável de ambiente não estiver definida
**Onde:** [`backend/src/middlewares/auth.js:3`](backend/src/middlewares/auth.js#L3)
— `const SEGREDO = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';`

Esse valor literal está no repositório (público, se publicado no GitHub como
o README recomenda). Se alguém subir a aplicação sem configurar `JWT_SECRET`
— nada no código impede isso, não há checagem de inicialização — qualquer
pessoa pode gerar localmente um token `{ role: 'admin' }` assinado com esse
mesmo segredo conhecido e ter acesso total de coordenação, sem nunca ter
digitado a senha. Neste projeto local o `.env` já tem um `JWT_SECRET`
próprio configurado (bom sinal), mas o *código* continua permitindo essa
falha silenciosa em qualquer novo deploy.

**Correção:** falhar a inicialização (`process.exit(1)` com mensagem clara)
se `JWT_SECRET` não estiver definido em produção, em vez de cair num
padrão conhecido.

### 🟠 4.6 A senha de admin em uso neste ambiente ainda é o valor padrão documentado publicamente
**Onde:** `backend/.env` deste projeto local — `ADMIN_PASSWORD` continua
`ifrs2026`, o mesmo valor impresso no `README.md` (que por sua vez está
pensado para ir pro GitHub, conforme as instruções de deploy do próprio
README).

Isso não é um bug de código, mas é uma exposição real *deste* ambiente: a
senha que protege toda a escrita do sistema é publicamente conhecida por
qualquer um que leia o README ou o histórico do seed. Some isso à falta de
bloqueio permanente após muitas tentativas (item 4.3 enfraquece ainda mais a
limitação por minuto) e o "cadeado" da coordenação é, na prática, decorável.
**Ação recomendada:** trocar `ADMIN_PASSWORD` antes de qualquer uso real, e
considerar não imprimir a senha padrão em texto claro no README publicado
(ou ao menos deixar como aviso bem destacado "troque antes de usar de
verdade" — o README já tem esse aviso, mas o valor padrão continua ativo
aqui).

### 🟡 4.7 Open redirect no pós-login da coordenação
**Onde:** [`frontend/public/js/login.js:5`](frontend/public/js/login.js#L5)
— `const destinoAdmin = () => parametro('voltar') || 'index.html';` usado
depois em `location.href = destinoAdmin();`

O parâmetro de URL `?voltar=` vai direto para `location.href`, sem checar
se é um caminho interno. Um link tipo
`login.html?voltar=https://site-falso.com` faz o navegador, **depois de um
login real e bem-sucedido no domínio verdadeiro**, saltar para qualquer
site externo — um padrão clássico usado em phishing (o link parece
legítimo porque começa com o domínio real). O fluxo do aluno não tem esse
problema (`destinoAluno` é fixo).

**Correção:** validar que `voltar` é um caminho relativo do próprio site
antes de usar (ex.: `/^[a-z0-9_-]+\.html(\?.*)?$/i.test(voltar)`), ou trocar
por uma lista fixa de destinos internos permitidos.

### 🟡 4.8 Busca pública de alunos expõe o nome de todo mundo, não só de quem está pendente
**Onde:** [`backend/src/models/aluno.model.js:10-16`](backend/src/models/aluno.model.js#L10)
(`buscarPorNome`) e rota pública `GET /api/alunos/buscar?nome=`

A consulta roda sobre `SELECT id, nome, senha_hash FROM alunos` — todos os
alunos, autocadastrados por e-mail inclusive, não só os pré-cadastros
manuais (que são o público-alvo real dessa tela). Um visitante sem login
consegue montar a lista completa de nomes (e ids) de todos os alunos do
sistema testando letras comuns. É exatamente a informação que viabiliza o
ataque do item 4.1, e é uma exposição de dado pessoal (nome completo)
maior do que o necessário — o próprio README já demonstra consciência de
LGPD ao justificar não usar CPF; vale aplicar o mesmo cuidado aqui.

**Correção:** filtrar a busca para trazer só quem ainda não tem e-mail
vinculado (`email IS NULL`), já que é esse o público que o recurso serve.

### 🔵 4.9 Mensagens de erro 500 podem vazar detalhes internos
**Onde:** [`backend/src/middlewares/erros.js:25-29`](backend/src/middlewares/erros.js#L25) — `tratarErro`

```js
function tratarErro(erro, req, res, next) {
  const status = erro.status || 500;
  if (status >= 500) console.error(erro);
  res.status(status).json({ erro: erro.message || 'Erro interno no servidor.' });
}
```

Para erros esperados (`falha(400, 'mensagem clara')`) isso é ótimo. Mas para
uma exceção **não prevista** (bug, erro do driver SQLite, etc.), `erro.message`
também é devolvido ao cliente — nesses casos costuma vir em inglês/técnico
("SQLITE_CONSTRAINT..." etc.), expondo detalhe interno desnecessário e
confundindo o usuário. **Correção:** quando `status >= 500`, sempre responder
com a mensagem genérica (`'Erro interno no servidor.'`) e manter o
`erro.message` completo só no `console.error` do servidor.

### 🔵 4.10 CORS liberado para qualquer origem
**Onde:** [`backend/src/app.js:12`](backend/src/app.js#L12) — `app.use(cors())`

Sem configuração, `cors()` libera `Access-Control-Allow-Origin: *`. Como a
autenticação é via token no header `Authorization` (não cookie), isso não
abre uma falha de CSRF clássica, mas permite que **qualquer site na
internet** chame a API livremente a partir do navegador de quem a visita —
inclusive os endpoints administrativos, se o atacante já tiver ou
conseguir um token. Sem necessidade de acesso cross-origin tão aberto para
este produto, vale restringir a origem esperada (o próprio domínio do
sistema) quando o app for hospedado com domínio fixo.

---

## 5. Regras de negócio

### 🟠 5.1 Ações destrutivas irreversíveis dependem só do `confirm()` do navegador
Excluir campeonato (`ON DELETE CASCADE` apaga times, jogadores, partidas e
gols) e "gerar tabela de novo" (apaga toda a tabela de jogos e placares)
são irreversíveis e não têm nenhuma proteção no servidor além da checagem de
autenticação — a única barreira contra "cliquei errado" é uma caixa de
diálogo do navegador, que é só uma cortesia de UX, não uma trava real (quem
chama a API diretamente, ou com o token roubado, não passa por ela em
nenhum momento). Não existe backup, soft-delete nem log de auditoria de quem
apagou o quê e quando.
**Sugestão:** pelo menos registrar (mesmo que só em log de servidor) essas
ações com timestamp/quem fez, e considerar soft-delete para campeonatos
(campo `apagado_em`, filtrado nas listagens) em vez de `DELETE` físico.

### 🟠 5.2 Chave eliminatória não reage a correções na fase de grupos (repetido do item 1.2)
Já detalhado na seção de bugs — inclúido aqui porque é, na essência, uma
regra de negócio que falta: "a chave deve refletir a classificação atual dos
grupos" deixa de valer assim que a chave é preenchida uma vez.

### 🟡 5.3 Excluir um jogador com gols não preserva a integridade do histórico (repetido do item 1.1)
Mesma raiz do item 1.1, olhando pelo ângulo de regra de negócio: o sistema
deveria proteger o histórico de partidas já finalizadas contra edições que o
tornem inconsistente — e hoje só protege times (trava depois da tabela
gerada) e partidas eliminatórias (trava depois que a próxima já foi jogada),
não jogadores com gols.

### 🟡 5.4 `resetarSenha` unifica dois modelos de confiança diferentes num só botão
Resetar a senha de uma conta pré-cadastrada manualmente (onde o "próximo
passo" sempre foi menos seguro, aceito como exceção) e resetar a senha de
uma conta que passou pela verificação de e-mail institucional caem no mesmo
fluxo de reivindicação sem prova de identidade (ver item 4.1). Uma conta que
um dia teve seu e-mail verificado deveria, no reset, continuar exigindo
prova equivalente (ex.: gerar um novo link por e-mail, como no cadastro) em
vez de reabrir a porta do "defina a senha só com o nome/id".

### 🔵 5.5 Valores de grupo aceitos mesmo quando o formato não os usa
`tamanho_grupo`/`classificados_grupo` são validados (intervalo mínimo etc.)
só quando `formato === 'grupos_mata_mata'`; para os outros formatos, um
valor absurdo (ex. `tamanho_grupo: -5`) é aceito e gravado sem uso — inofensivo
hoje, mas é dado "lixo" no banco que pode confundir uma migração futura.

---

## 6. Frontend e experiência do usuário

### 🟡 6.1 Botão de excluir jogador é pequeno, sem confirmação, ao lado da contagem de gols (repetido do item 1.1/2.1)
Já coberto como bug e inconsistência — do ângulo de usabilidade, é também
um alvo de clique pequeno (`&times;`) posicionado perto de informação que o
usuário está lendo (gols do jogador), aumentando a chance de clique
acidental sem nenhuma rede de segurança.

### 🟡 6.2 Sessão expirada deixa a tela "morta" em vez de redirecionar (repetido do item 2.2)
Do ângulo de UX: usuário fica numa tela onde os botões parecem funcionar mas
sempre falham com o mesmo toast de erro, sem indicação de que precisa entrar
de novo.

### 🔵 6.3 Placeholder "No" para número da camisa
Some com o "º" — na prática lê-se como a palavra "No" em vez de abreviação
de número. Trocar por "Nº".

### 🔵 6.4 Sem paginação ou busca na lista de alunos da coordenação
`alunos-admin.html` carrega e renderiza todos os alunos de uma vez
(`Aluno.listar()` sem limite). Para o tamanho de uma escola isso é aceitável
hoje, mas não escala indefinidamente — vale ter em mente se a base de alunos
crescer bastante.

---

## Resumo executivo — por onde começar

1. **Corrigir agora** (segurança concreta e barata de resolver):
   - 4.2 rate limit no login de aluno
   - 4.3 `trust proxy`
   - 4.7 validar o `voltar` do redirect
   - 4.9 não vazar `erro.message` em 500
   - 4.6 trocar a senha de admin deste ambiente
2. **Decidir o design** (não são "bugs de uma linha"):
   - 4.1 — o fluxo de "primeiro acesso" do pré-cadastro manual precisa de
     alguma prova de identidade além do id/nome.
3. **Consertar antes que alguém perca dados de verdade:**
   - 1.1/1.2 — chave eliminatória desatualizada e exclusão de jogador sem
     confirmação/proteção.
4. **Passada de revisão de texto** (seção 3) quando houver tempo — não é
   urgente, mas afeta a percepção de qualidade do sistema todo.
