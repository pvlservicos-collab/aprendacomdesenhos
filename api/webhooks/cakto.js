// POST /api/webhooks/cakto
// Recebe notificações de pagamento (cartão, PIX, boleto) da Cakto.
// Docs: https://docs.cakto.com.br
//       https://cakto-dece4a15.mintlify.app/webhooks/visao-geral
//       https://cakto-dece4a15.mintlify.app/webhooks/pagamento-unico
//       https://cakto-dece4a15.mintlify.app/webhooks/eventos
//       https://cakto-dece4a15.mintlify.app/webhooks/status
//
// Cadastre esta URL no painel da Cakto (App > Webhooks > Adicionar):
//   URL:    https://bilikids.vercel.app/api/webhooks/cakto
//   Secret: qualquer string forte — use o mesmo valor de CAKTO_WEBHOOK_SECRET
// Diferente da AbacatePay, a Cakto não assina a requisição via header: ela
// manda o secret dentro do próprio corpo JSON (`payload.secret`). Validamos
// comparando com a env var abaixo (sem precisar do corpo cru).
//
// Eventos tratados: purchase_approved | purchase_refused | refund | chargeback
// (pix_gerado / boleto_gerado / picpay_gerado / subscription_* /
// checkout_abandonment só são logados por enquanto)
//
// Precisa da coluna `cakto_id` em `compras` (equivalente ao abacatepay_id
// usado no webhook da AbacatePay) — rode uma vez no Postgres:
//   ALTER TABLE compras ADD COLUMN IF NOT EXISTS cakto_id text UNIQUE;

import { sql } from '../../lib/db.js';

// mesmos valores (em centavos) de PLANOS em api/pix/create.js
const PLANO_POR_CENTAVOS = {
  2700: 'jogador', // R$27,00 — Plano Básico
  6700: 'campeao', // R$67,00 — Plano VIP
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const secret = process.env.CAKTO_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'CAKTO_WEBHOOK_SECRET não configurado' });
  }

  const payload = req.body || {};
  if (payload.secret !== secret) {
    return res.status(401).json({ error: 'Secret inválido' });
  }

  const { event, data } = payload;
  if (!data || !data.id) {
    return res.status(200).json({ received: true });
  }

  console.log('[cakto webhook]', event, data.id, data.status);

  try {
    if (event === 'purchase_approved' && data.status === 'paid') {
      await marcarComoPaga(data);
    } else if (event === 'refund') {
      await sql`UPDATE compras SET status = 'refunded', atualizado_em = now() WHERE cakto_id = ${data.id}`;
    } else if (event === 'chargeback') {
      await sql`UPDATE compras SET status = 'disputed', atualizado_em = now() WHERE cakto_id = ${data.id}`;
    } else if (event === 'purchase_refused') {
      await sql`UPDATE compras SET status = 'refused', atualizado_em = now() WHERE cakto_id = ${data.id}`;
    }
  } catch (dbErr) {
    console.error('[cakto webhook] falha ao gravar no banco:', dbErr);
    // não retorna erro pra Cakto por causa disso — evita retentativas
    // infinitas de um evento que já foi recebido e logado corretamente.
  }

  return res.status(200).json({ received: true });
}

async function marcarComoPaga(data) {
  const customer = data.customer || {};
  const email = customer.email ? String(customer.email).trim().toLowerCase() : null;
  const nome = customer.name || null;
  // CPF vem em customer.docNumber (docType costuma ser "cpf"); customer.phone
  // e o cartão (data.card.lastDigits/brand) não são gravados — sem coluna hoje.
  const cpf = customer.docType === 'cpf' && customer.docNumber ? String(customer.docNumber).replace(/\D/g, '') : null;
  const valorCentavos = Math.round((Number(data.amount) || 0) * 100);
  const plano = PLANO_POR_CENTAVOS[valorCentavos] || 'campeao';

  const atualizado = await sql`
    UPDATE compras
    SET status = 'paid',
        atualizado_em = now(),
        valor_centavos = COALESCE(${valorCentavos || null}, valor_centavos),
        email = COALESCE(email, ${email}),
        nome = COALESCE(nome, ${nome}),
        cpf = COALESCE(cpf, ${cpf}),
        plano = COALESCE(plano, ${plano})
    WHERE cakto_id = ${data.id}
    RETURNING id
  `;

  // Cakto não passa por /api/pix/create — a compra não existe ainda como
  // "pending", então o primeiro evento que chega já cria a linha "paid".
  if (!atualizado.length) {
    await sql`
      INSERT INTO compras (cakto_id, nome, email, cpf, plano, valor_centavos, status)
      VALUES (${data.id}, ${nome}, ${email}, ${cpf}, ${plano}, ${valorCentavos}, 'paid')
      ON CONFLICT (cakto_id) DO UPDATE SET status = 'paid', atualizado_em = now()
    `;
  }
}
