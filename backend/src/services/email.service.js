const nodemailer = require('nodemailer');

/**
 * Envio do e-mail de confirmação de cadastro do aluno.
 *
 * Usa Gmail SMTP com uma "senha de app" (não a senha normal da conta —
 * veja https://myaccount.google.com/apppasswords). Configurável por
 * variáveis de ambiente:
 *
 *   GMAIL_USER           conta que envia (ex: campeonatos.escola@gmail.com)
 *   GMAIL_APP_PASSWORD   senha de app gerada nas configurações do Google
 *   APP_URL              URL pública do sistema (ex: https://tcc-ifrs.vercel.app)
 *
 * Se essas variáveis não estiverem configuradas (ex: rodando local sem
 * querer mandar e-mail de verdade), o link de confirmação é só impresso no
 * console em vez de ser enviado — útil para desenvolvimento e para os
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

function montarLinkRedefinicao(tokenBruto) {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/redefinir-senha.html?token=${tokenBruto}`;
}

function montarHtml(nome, link) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#3F9D3B;">Confirme sua conta</h2>
      <p>Olá, ${nome.split(' ')[0]}!</p>
      <p>Recebemos um pedido de cadastro no Sistema de Campeonatos Escolares com este e-mail.
         Para ativar sua conta e poder entrar, clique no botão abaixo:</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${link}" style="background:#3F9D3B; color:#fff; padding:12px 24px;
           border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">
          Confirmar minha conta
        </a>
      </p>
      <p style="color:#666; font-size:13px;">Se você não pediu esse cadastro, pode ignorar este e-mail.
         O link expira em 24 horas.</p>
    </div>`;
}

function montarHtmlReset(nome, link) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#3F9D3B;">Redefinir sua senha</h2>
      <p>Olá, ${nome.split(' ')[0]}!</p>
      <p>Recebemos um pedido para redefinir a senha da sua conta no Sistema de Campeonatos Escolares.
         Para escolher uma nova senha, clique no botão abaixo:</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${link}" style="background:#3F9D3B; color:#fff; padding:12px 24px;
           border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">
          Redefinir minha senha
        </a>
      </p>
      <p style="color:#666; font-size:13px;">Se você não pediu essa redefinição, pode ignorar este e-mail —
         sua senha atual continua funcionando normalmente. O link expira em 1 hora.</p>
    </div>`;
}

/**
 * Manda (ou, sem SMTP configurado, só imprime) o e-mail de confirmação.
 * Lança erro se o envio real falhar (o controller decide o que fazer com isso).
 */
async function enviarConfirmacao({ nome, email, tokenBruto }) {
  const link = montarLinkConfirmacao(tokenBruto);
  const transporte = obterTransportador();

  if (!transporte) {
    console.log('\n[e-mail não configurado — link de confirmação impresso no console]');
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

/**
 * Manda (ou, sem SMTP configurado, só imprime) o e-mail de redefinição de senha.
 * Lança erro se o envio real falhar (o controller decide o que fazer com isso).
 */
async function enviarRedefinicaoSenha({ nome, email, tokenBruto }) {
  const link = montarLinkRedefinicao(tokenBruto);
  const transporte = obterTransportador();

  if (!transporte) {
    console.log('\n[e-mail não configurado — link de redefinição de senha impresso no console]');
    console.log(`  Para: ${email}`);
    console.log(`  Link: ${link}\n`);
    return;
  }

  await transporte.sendMail({
    from: `"Campeonatos Escolares" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Redefinir sua senha — Campeonatos Escolares',
    html: montarHtmlReset(nome, link)
  });
}

module.exports = { enviarConfirmacao, montarLinkConfirmacao, enviarRedefinicaoSenha, montarLinkRedefinicao };
