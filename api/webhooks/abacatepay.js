// POST /api/webhooks/abacatepay
// Recebe notificações de pagamento da AbacatePay (Checkout Transparente).
// Docs: https://docs.abacatepay.com/pages/webhooks
//       https://docs.abacatepay.com/pages/webhooks/events/transparent
//
// Cadastre esta URL no painel da AbacatePay (Webhooks > Novo webhook):
//   URL:    https://bilikids.vercel.app/api/webhooks/abacatepay
//   Secret: o mesmo valor de ABACATEPAY_WEBHOOK_SECRET
// O painel só pede URL + Secret (sem query param). Na prática (confirmado
// em 11/07) a AbacatePay manda o secret puro no header X-Webhook-Secret —
// é isso que validamos primeiro. Também mandam X-Webhook-Signature (HMAC-
// SHA256 do corpo), que checamos como reforço/fallback.
//
// Eventos: transparent.completed | transparent.disputed | transparent.refunded
//
// Ao receber "transparent.completed" com status PAID, grava/atualiza a compra
// no Postgres (tabela `compras`, por e-mail) — é isso que /api/membros usa pra
// liberar o acesso. Outros eventos só são logados por enquanto.

import crypto from 'crypto';
import { sql } from '../../lib/db.js';
import { enviarPedidoUtmify, formatarDataUtmify } from '../../lib/utmify.js';

// mesmos valores (em centavos) de PLANOS em api/pix/create.js — 4700 é o
// preço do popup de oferta relâmpago (VIP por R$47), mas continua contando
// como "campeao" pra liberar o mesmo acesso VIP na área de membros
const PLANO_POR_CENTAVOS = { 2700: 'jogador', 6700: 'campeao', 4700: 'campeao' };
const NOME_PLANO = {
  jogador: 'BiliKids - Plano Básico',
  campeao: 'BiliKids - Plano VIP',
};

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

function assinaturaValida(rawBody, req, secret) {
  // A AbacatePay manda o secret puro no header X-Webhook-Secret — é o que
  // ela realmente usa (confirmado em 11/07 via diagnóstico: a assinatura
  // HMAC nunca batia mesmo com o secret certo, mas esse header vem junto).
  // Checamos ele primeiro; a assinatura HMAC fica como reforço/fallback.
  const secretHeader = req.headers['x-webhook-secret'];
  if (secretHeader) {
    try {
      const a = Buffer.from(secretHeader);
      const b = Buffer.from(secret);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch {}
  }

  const signatureHeader = req.headers['x-webhook-signature'];
  if (signatureHeader) {
    try {
      const esperado = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      const a = Buffer.from(signatureHeader);
      const b = Buffer.from(esperado);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch {}
  }

  if (!secretHeader && !signatureHeader) return null; // nenhum header de auth veio
  return false; // veio header(s) de auth, mas nenhum bateu
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // mesma sanitização de BOM/espaços que já corrigimos em ABACATEPAY_API_KEY
  // (api/pix/create.js e api/pix/[id]/status.js) — sem isso o HMAC calculado
  // aqui nunca bate com a assinatura da AbacatePay, e todo webhook cai como
  // "Falha" (401) do lado deles, mesmo a venda tendo sido paga de verdade.
  const BOM = String.fromCharCode(0xFEFF);
  const secret = String(process.env.ABACATEPAY_WEBHOOK_SECRET || '').split(BOM).join('').trim();
  if (!secret) {
    return res.status(500).json({ error: 'ABACATEPAY_WEBHOOK_SECRET não configurado' });
  }

  const rawBody = await lerCorpoCru(req);
  const valida = assinaturaValida(rawBody, req, secret);

  // Se vieram headers de auth e nenhum bateu, rejeita — é o caso claro de
  // requisição forjada. Se não veio nenhum, deixamos passar por enquanto
  // (a doc não deixa 100% claro se sempre vem), mas logamos um aviso.
  if (valida === false) {
    console.error('[abacatepay webhook] assinatura/secret inválidos', {
      secretHeaderPresente: Boolean(req.headers['x-webhook-secret']),
      signatureHeaderPresente: Boolean(req.headers['x-webhook-signature']),
    });
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
      const linhas = await sql`
        UPDATE compras SET status = 'refunded', atualizado_em = now()
        WHERE abacatepay_id = ${transparent.id}
        RETURNING nome, email, cpf, plano, valor_centavos, criado_em,
                  utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck
      `;
      if (linhas.length) await notificarUtmify(transparent.id, linhas[0], 'refunded');
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
    RETURNING nome, email, cpf, plano, valor_centavos, criado_em,
              utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck
  `;

  if (atualizado.length) {
    await notificarUtmify(transparent.id, atualizado[0], 'paid');
    return;
  }

  // se a linha "pending" não existia (ex.: falhou ao criar em /api/pix/create),
  // insere direto como paga usando os dados do próprio webhook.
  const plano = PLANO_POR_CENTAVOS[valor] || 'campeao';
  await sql`
    INSERT INTO compras (abacatepay_id, nome, email, cpf, plano, valor_centavos, status)
    VALUES (${transparent.id}, ${nome}, ${email}, ${cpf}, ${plano}, ${valor}, 'paid')
    ON CONFLICT (abacatepay_id) DO UPDATE SET status = 'paid', atualizado_em = now()
  `;
  await notificarUtmify(transparent.id, { nome, email, cpf, plano, valor_centavos: valor, criado_em: new Date() }, 'paid');
}

// manda o pedido pra Utmify usando os dados já gravados em `compras` — assim
// o payload sempre sai completo, independente do que cada evento da
// AbacatePay trouxer (nem todo evento repete customer/valor).
async function notificarUtmify(orderId, compra, status) {
  const valor = compra.valor_centavos || 0;
  const plano = compra.plano || 'campeao';
  const agora = formatarDataUtmify(new Date());

  await enviarPedidoUtmify({
    orderId,
    platform: 'BiliKids',
    paymentMethod: 'pix',
    status,
    createdAt: formatarDataUtmify(compra.criado_em) || agora,
    approvedDate: status === 'paid' ? agora : null,
    refundedAt: status === 'refunded' ? agora : null,
    customer: { name: compra.nome, email: compra.email, phone: null, document: compra.cpf },
    products: [{ id: plano, name: NOME_PLANO[plano] || NOME_PLANO.campeao, planId: plano, planName: plano, quantity: 1, priceInCents: valor }],
    trackingParameters: {
      src: compra.src || null,
      sck: compra.sck || null,
      utm_source: compra.utm_source || null,
      utm_campaign: compra.utm_campaign || null,
      utm_medium: compra.utm_medium || null,
      utm_content: compra.utm_content || null,
      utm_term: compra.utm_term || null,
    },
    commission: { totalPriceInCents: valor, gatewayFeeInCents: 0, userCommissionInCents: valor },
  });
}
