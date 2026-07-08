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
// OBS: aqui só confirmamos o recebimento e logamos o evento — ainda não há
// nenhuma automação de fulfillment (enviar WhatsApp/e-mail, liberar acesso
// automaticamente etc.) porque esse projeto não tem essa infraestrutura
// configurada ainda. Isso é o próximo passo natural quando/se você quiser
// automatizar a entrega em vez de fazer manual.

import crypto from 'crypto';

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

  console.log('[abacatepay webhook]', event, transparent && transparent.id, transparent && transparent.status);

  // TODO: quando quiser automatizar a entrega, é aqui que entra a lógica —
  // por exemplo, ao receber "transparent.completed", disparar WhatsApp/e-mail
  // com o link de acesso, ou marcar o CPF como liberado em algum lugar.

  return res.status(200).json({ received: true });
}
