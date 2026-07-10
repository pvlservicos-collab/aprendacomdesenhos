// GET /api/admin/utmify-diag — DIAGNÓSTICO TEMPORÁRIO, REMOVER DEPOIS DE USAR.
// Chama a API da Utmify direto e devolve status/corpo da resposta, pra
// confirmar se o UTMIFY_API_TOKEN está válido sem depender dos logs da
// Vercel (que andam instáveis pra isso). Protegido por login admin.

import { usuarioAutenticado } from '../../lib/adminAuth.js';

const UTMIFY_ORDERS_URL = 'https://api.utmify.com.br/api-credentials/orders';

export default async function handler(req, res) {
  if (!usuarioAutenticado(req)) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const BOM = String.fromCharCode(0xFEFF);
  const rawToken = process.env.UTMIFY_API_TOKEN || '';
  const token = String(rawToken).split(BOM).join('').trim();

  const info = {
    tokenPresente: Boolean(rawToken),
    tokenTamanhoOriginal: rawToken.length,
    tokenTamanhoSanitizado: token.length,
    tinhaBomOuEspacos: rawToken.length !== token.length,
  };

  if (!token) {
    return res.status(200).json({ ...info, resultado: 'sem token configurado' });
  }

  const agora = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const pedidoTeste = {
    orderId: 'diag-' + Date.now(),
    platform: 'BiliKids',
    paymentMethod: 'pix',
    status: 'paid',
    createdAt: agora,
    approvedDate: agora,
    refundedAt: null,
    customer: { name: 'Diagnostico Endpoint', email: 'diagnostico-endpoint@teste.com', phone: null, document: '11144477735' },
    products: [{ id: 'campeao', name: 'BiliKids - Plano VIP', planId: 'campeao', planName: 'campeao', quantity: 1, priceInCents: 6700 }],
    trackingParameters: { src: null, sck: null, utm_source: 'diagnostico', utm_campaign: 'diagnostico', utm_medium: null, utm_content: null, utm_term: null },
    commission: { totalPriceInCents: 6700, gatewayFeeInCents: 0, userCommissionInCents: 6700 },
  };

  try {
    const r = await fetch(UTMIFY_ORDERS_URL, {
      method: 'POST',
      headers: { 'x-api-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(pedidoTeste),
    });
    const texto = await r.text();
    return res.status(200).json({ ...info, utmifyStatus: r.status, utmifyBody: texto.slice(0, 1000) });
  } catch (err) {
    return res.status(200).json({ ...info, erro: String(err) });
  }
}
