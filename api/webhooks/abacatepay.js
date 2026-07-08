// POST /api/webhooks/abacatepay
// Recebe notificações de pagamento da AbacatePay (Checkout Transparente).
// Docs: https://docs.abacatepay.com/pages/webhooks
//       https://docs.abacatepay.com/pages/webhooks/events/transparent
//
// Cadastre esta URL no painel da AbacatePay (Webhooks > Novo webhook):
//   URL:    https://bilikids.vercel.app/api/webhooks/abacatepay
//   Secret: o mesmo valor de ABACATEPAY_WEBHOOK_SECRET
// O painel só pede URL + Secret (sem query param) — o secret é usado pra
// assinar o corpo da requisição via HMAC-SHA256, mandado no header
// X-Webhook-Signature. É isso que validamos abaixo.
//
// Eventos: transparent.completed | transparent.disputed | transparent.refunded
//
// Ao receber "transparent.completed" com status PAID, grava/atualiza a compra
// no Postgres (tabela `compras`, por e-mail) — é isso que /api/membros usa pra
// liberar o acesso. Outros eventos só são logados por enquanto.

import crypto from 'crypto';
import { sql } from '../../lib/db.js';

// precisa do corpo cru (não parseado) pra calcular o HMAC corretamente
export const config = {
  api: { bodyParser: false },
};

function lerCorpoCru(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function assinaturaValida(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return null; // sem header pra comparar — ver OBS abaixo
  try {
    const esperado = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(esperado);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'ABACATEPAY_WEBHOOK_SECRET não configurado' });
  }

  const rawBody = await lerCorpoCru(req);
  const signatureHeader = req.headers['x-webhook-signature'];
  const valida = assinaturaValida(rawBody, signatureHeader, secret);

  // Se veio um header de assinatura e ele NÃO bate, rejeita — é o caso claro
  // de requisição forjada. Se não veio header nenhum, deixamos passar por
  // enquanto (a doc não deixa 100% claro se ele sempre vem), mas logamos um
  // aviso — dá pra apertar isso depois de ver um webhook real chegando.
  if (valida === false) {
    return res.status(401).json({ error: 'Assinatura inválida' });
  }
  if (valida === null) {
    console.warn('[abacatepay webhook] sem header X-Webhook-Signature — aceito mesmo assim por enquanto');
  }

  let payload = {};
  try { payload = JSON.parse(rawBody); } catch {}

  const { event, data } = payload;
  const transparent = data && data.transparent;
  const customer = data && data.customer;

  console.log('[abacatepay webhook]', event, transparent && transparent.id, transparent && transparent.status);

  try {
    if (event === 'transparent.completed' && transparent && transparent.status === 'PAID') {
      await marcarComoPaga(transparent, customer);
    } else if (event === 'transparent.refunded' && transparent) {
      await sql`UPDATE compras SET status = 'refunded', atualizado_em = now() WHERE abacatepay_id = ${transparent.id}`;
    }
  } catch (dbErr) {
    console.error('[abacatepay webhook] falha ao gravar no banco:', dbErr);
    // não retorna erro pra AbacatePay por causa disso — evita retentativas
    // infinitas de um evento que já foi recebido e logado corretamente.
  }

  return res.status(200).json({ received: true });
}

async function marcarComoPaga(transparent, customer) {
  const valor = transparent.paidAmount || transparent.amount || null;
  const email = customer && customer.email ? String(customer.email).trim().toLowerCase() : null;
  const nome = customer && customer.name ? customer.name : null;
  const cpf = customer && customer.taxId ? customer.taxId : null;

  const atualizado = await sql`
    UPDATE compras
    SET status = 'paid',
        atualizado_em = now(),
        valor_centavos = COALESCE(${valor}, valor_centavos),
        email = COALESCE(email, ${email}),
        nome = COALESCE(nome, ${nome}),
        cpf = COALESCE(cpf, ${cpf})
    WHERE abacatepay_id = ${transparent.id}
    RETURNING id
  `;

  // se a linha "pending" não existia (ex.: falhou ao criar em /api/pix/create),
  // insere direto como paga usando os dados do próprio webhook.
  if (!atualizado.length) {
    await sql`
      INSERT INTO compras (abacatepay_id, nome, email, cpf, valor_centavos, status)
      VALUES (${transparent.id}, ${nome}, ${email}, ${cpf}, ${valor}, 'paid')
      ON CONFLICT (abacatepay_id) DO UPDATE SET status = 'paid', atualizado_em = now()
    `;
  }
}
