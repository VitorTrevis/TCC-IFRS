montarTopo();

const id = parametro('id');

/** Quem levou: pela final da chave, ou pelo 1º da tabela em pontos corridos. */
function campeaoDoCampeonato(dados) {
  const c = dados.campeonato;
  if (c.status !== 'finalizado') return null;
  if (c.formato === 'pontos_corridos') return dados.classificacao[0]?.tabela?.[0]?.nome || null;
  return campeaoDaChave(dados.partidas);
}

function cabecalho(dados) {
  const c = dados.campeonato;
  const campeao = campeaoDoCampeonato(dados);
  const totalJogos = dados.partidas.length;
  const jogados = dados.partidas.filter((p) => p.status === 'finalizada').length;
  const gols = dados.partidas.reduce((s, p) => s + (p.status === 'finalizada' ? (p.gols_a || 0) + (p.gols_b || 0) : 0), 0);
  const times = new Set(dados.partidas.flatMap((p) => [p.id_time_a, p.id_time_b]).filter(Boolean)).size;
  const numero = (valor, rotulo) => `<div class="capa-numero"><b data-contar="${valor}">0</b><span>${rotulo}</span></div>`;

  return `
    <section class="capa">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <div class="sobrancelha">${esc(c.modalidade)} &middot; ${esc(FORMATOS[c.formato] || c.formato)}</div>
          <h1 class="mb-1">${esc(c.nome)}<span class="ponto">.</span></h1>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            ${etiqueta(c.status)}
            ${c.data_inicio ? `<span class="small">${icone('calendario')} ${esc(dataBR(c.data_inicio))}${c.data_fim ? ` até ${esc(dataBR(c.data_fim))}` : ''}</span>` : ''}
          </div>
          ${campeao ? `<div class="selo-campeao"><span class="trofeu">${icone('trofeu')}</span><span><small>Campeão</small>${esc(campeao)}</span></div>` : ''}
        </div>
        <button class="btn btn-outline-light btn-sm" id="btn-link">${icone('link')}Copiar link desta página</button>
      </div>
      ${totalJogos ? `<div class="capa-numeros">
        ${numero(times, times === 1 ? 'time' : 'times')}
        ${numero(jogados, `de ${totalJogos} ${totalJogos === 1 ? 'jogo' : 'jogos'}`)}
        ${numero(gols, gols === 1 ? 'gol' : 'gols')}
      </div>` : ''}
      <div class="capa-marca-agua" aria-hidden="true">${iconeModalidade(c.modalidade)}</div>
    </section>`;
}

/** Contador ao lado do nome da aba ("Jogos 22"). */
function rotularAba(id, nomeIcone, texto, quantidade) {
  const aba = document.getElementById(id);
  if (!aba) return;
  aba.innerHTML = `${icone(nomeIcone)}${texto}${quantidade ? `<span class="contador-aba">${quantidade}</span>` : ''}`;
}

function jogos(dados) {
  const partidas = dados.partidas;
  if (!partidas.length) {
    return `<div class="vazio"><strong>A tabela ainda não foi gerada</strong>
      Assim que a coordenação gerar os jogos, eles aparecem aqui.</div>`;
  }

  const porFase = agruparPartidas(partidas);
  let html = '';

  for (const [fase, lista] of porFase) {
    if (fase === 'grupos') {
      const porGrupo = new Map();
      for (const p of lista) {
        const chave = p.grupo || '';
        if (!porGrupo.has(chave)) porGrupo.set(chave, []);
        porGrupo.get(chave).push(p);
      }
      for (const [grupo, jogosDoGrupo] of porGrupo) {
        const porRodada = new Map();
        for (const p of jogosDoGrupo) {
          if (!porRodada.has(p.rodada)) porRodada.set(p.rodada, []);
          porRodada.get(p.rodada).push(p);
        }
        html += `<section class="cartao mb-3">
          <div class="cartao-cabecalho">
            <h2 class="h6 mb-0">${grupo ? `Grupo ${esc(grupo)}` : 'Fase de grupos'}</h2>
          </div>
          <div class="cartao-corpo pt-2">
            ${[...porRodada.entries()].map(([rodada, ps]) => `
              <div class="sobrancelha mt-3 mb-1">Rodada ${rodada}</div>
              ${ps.map((p) => linhaJogo(p)).join('')}`).join('')}
          </div>
        </section>`;
      }
    } else {
      html += `<section class="cartao mb-3">
        <div class="cartao-cabecalho"><h2 class="h6 mb-0">${esc(FASES[fase] || fase)}</h2></div>
        <div class="cartao-corpo pt-2">${lista.map((p) => linhaJogo(p)).join('')}</div>
      </section>`;
    }
  }

  const chave = desenharChave(partidas);
  if (chave) {
    html += `<section class="cartao mb-3">
      <div class="cartao-cabecalho"><h2 class="h6 mb-0">Chave</h2></div>
      <div class="cartao-corpo">${chave}</div>
    </section>`;
  }
  return html;
}

function classificacaoHtml(dados) {
  if (!dados.classificacao.length) {
    return `<div class="vazio"><strong>Este campeonato é só de mata-mata</strong>
      Não existe tabela de pontos: acompanhe a chave na aba Jogos.</div>`;
  }
  const classificados = dados.campeonato.formato === 'grupos_mata_mata'
    ? dados.campeonato.classificados_grupo : 0;

  return dados.classificacao.map((bloco) => `
    <section class="cartao mb-3">
      <div class="cartao-cabecalho">
        <h2 class="h6 mb-0">${bloco.grupo ? `Grupo ${esc(bloco.grupo)}` : 'Classificação geral'}</h2>
        <span class="sobrancelha">P = pontos &middot; SG = saldo</span>
      </div>
      <div class="cartao-corpo">${tabelaClassificacao(bloco.tabela, classificados)}</div>
    </section>`).join('');
}

async function carregar() {
  if (!id) {
    document.getElementById('cabecalho').innerHTML =
      '<div class="vazio"><strong>Campeonato não informado</strong>Volte para a lista e escolha um campeonato.</div>';
    return;
  }
  document.getElementById('aba-jogos').innerHTML = carregador('Carregando o campeonato');
  try {
    const dados = await api.publico(id);
    document.title = `${dados.campeonato.nome} - Campeonatos Escolares`;
    document.getElementById('cabecalho').innerHTML = cabecalho(dados);
    document.getElementById('aba-jogos').innerHTML = jogos(dados);
    document.getElementById('aba-classificacao').innerHTML = classificacaoHtml(dados);
    document.getElementById('aba-artilheiros').innerHTML = `
      <section class="cartao">
        <div class="cartao-cabecalho"><h2 class="h6 mb-0">Artilheiros</h2></div>
        <div class="cartao-corpo">${tabelaArtilheiros(dados.artilheiros)}</div>
      </section>`;

    rotularAba('aba-btn-jogos', 'bola', 'Jogos', dados.partidas.length);
    rotularAba('aba-btn-classificacao', 'lista', 'Classificação', 0);
    rotularAba('aba-btn-artilheiros', 'alvo', 'Artilheiros', dados.artilheiros.length);

    // confete só na primeira visita da sessão a um campeonato já decidido
    const chaveConfete = `confete:${dados.campeonato.id}`;
    if (campeaoDoCampeonato(dados) && !sessionStorage.getItem(chaveConfete)) {
      sessionStorage.setItem(chaveConfete, '1');
      setTimeout(soltarConfete, 500);
    }

    document.getElementById('btn-link').onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        avisar('Link copiado. Cole no grupo da turma.', 'sucesso');
      } catch {
        avisar(location.href, 'info');
      }
    };
  } catch (e) {
    document.getElementById('cabecalho').innerHTML =
      `<div class="vazio"><strong>Não deu para carregar</strong>${esc(e.message)}</div>`;
  }
}

carregar();
