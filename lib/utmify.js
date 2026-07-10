// Envia pedidos pra API da Utmify (rastreamento de vendas por UTM/atribuição
// de campanha). Docs: https://docs.utmify.com.br/envio-de-vendas
//
// Chamado nos dois pontos de venda do site:
//   - api/pix/create.js            → status "waiting_payment" ao gerar o PIX
//   - api/webhooks/abacatepay.js   → status "paid"/"refunded" quando o PIX cai
//   - api/webhooks/cakto.js        → status "paid"/"refunded"/"chargedback"/"refused"
//
// Requer a env var UTMIFY_API_TOKEN (Painel Utmify → Integrações → Webhooks
// → Credenciais de API → Adicionar Credencial).
//
// Nunca deixa uma falha da Utmify quebrar o fluxo de pagamento em si — só loga.

const UTMIFY_ORDERS_URL = 'https://api.utmify.com.br/api-credentials/orders';

// Utmify quer "YYYY-MM-DD HH:MM:SS", não ISO com T/Z/milissegundos.
export function formatarDataUtmify(data) {
  if (!data) return null;
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function enviarPedidoUtmify(pedido) {
  const token = process.env.UTMIFY_API_TOKEN;
  if (!token) {
    console.warn('[utmify] UTMIFY_API_TOKEN não configurado — venda não enviada');
    return;
  }

  try {
    const res = await fetch(UTMIFY_ORDERS_URL, {
      method: 'POST',
      headers: {
        'x-api-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pedido),
    });

    if (!res.ok) {
      const texto = await res.text();
      console.error('[utmify] recusou o pedido', pedido.orderId, res.status, texto.slice(0, 500));
    }
  } catch (err) {
    console.error('[utmify] falha ao enviar pedido:', pedido.orderId, err);
  }
}
