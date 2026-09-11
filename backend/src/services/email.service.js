const nodemailer = require('nodemailer');

/**
 * Envio do e-mail de confirmacao de cadastro do aluno.
 *
 * Usa Gmail SMTP com uma "senha de app" (nao a senha normal da conta —
 * veja https://myaccount.google.com/apppasswords). Configuravel por
 * variaveis de ambiente:
 *
 *   GMAIL_USER           conta que envia (ex: campeonatos.escola@gmail.com)
 *   GMAIL_APP_PASSWORD   senha de app gerada nas configuracoes do Google
 *   APP_URL              URL publica do sistema (ex: https://tcc-ifrs.vercel.app)
 *
 * Se essas variaveis nao estiverem configuradas (ex: rodando local sem
 * querer mandar e-mail de verdade), o link de confirmacao e so impresso no
 * console em vez de ser enviado — util para desenvolvimento e para os
 * testes automatizados.
 */

let transportador = null;

function obterTransportador() {
  if (transportador) return transportador;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;

  transportador = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  return transportador;
}

function montarLinkConfirmacao(tokenBruto) {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/confirmar-email.html?token=${tokenBruto}`;
}

function montarHtml(nome, link) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#3F9D3B;">Confirme sua conta</h2>
      <p>Ola, ${nome.split(' ')[0]}!</p>
      <p>Recebemos um pedido de cadastro no Sistema de Campeonatos Escolares com este e-mail.
         Para ativar sua conta e poder entrar, clique no botao abaixo:</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${link}" style="background:#3F9D3B; color:#fff; padding:12px 24px;
           border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">
          Confirmar minha conta
        </a>
      </p>
      <p style="color:#666; font-size:13px;">Se voce nao pediu esse cadastro, pode ignorar este e-mail.
         O link expira em 24 horas.</p>
    </div>`;
}

/**
 * Manda (ou, sem SMTP configurado, so imprime) o e-mail de confirmacao.
 * Lanca erro se o envio real falhar (o controller decide o que fazer com isso).
 */
async function enviarConfirmacao({ nome, email, tokenBruto }) {
  const link = montarLinkConfirmacao(tokenBruto);
  const transporte = obterTransportador();

  if (!transporte) {
    console.log('\n[e-mail nao configurado — link de confirmacao impresso no console]');
    console.log(`  Para: ${email}`);
    console.log(`  Link: ${link}\n`);
    return;
  }

  await transporte.sendMail({
    from: `"Campeonatos Escolares" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Confirme sua conta — Campeonatos Escolares',
    html: montarHtml(nome, link)
  });
}

module.exports = { enviarConfirmacao, montarLinkConfirmacao };
