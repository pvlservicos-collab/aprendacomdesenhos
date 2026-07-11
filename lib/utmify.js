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

// Religado em 11/07 depois de confirmar que o webhook da AbacatePay (secret
// no header X-Webhook-Secret) processa e grava certinho no banco.
const UTMIFY_DESLIGADO_TEMPORARIAMENTE = false;

// Utmify quer "YYYY-MM-DD HH:MM:SS", não ISO com T/Z/milissegundos.
export function formatarDataUtmify(data) {
  if (!data) return null;
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function enviarPedidoUtmify(pedido) {
  if (UTMIFY_DESLIGADO_TEMPORARIAMENTE) {
    console.log('[utmify] envio DESLIGADO temporariamente — pedido não enviado (só isso, o resto do fluxo segue normal):', pedido.orderId);
    return;
  }

  // remove BOM (U+FEFF) e espaços/quebras de linha que grudam na env var
  // quando ela é colada no painel da Vercel — mesmo problema que já pegou o
  // ABACATEPAY_API_KEY (ver api/pix/create.js). Sem isso o header
  // x-api-token vira inválido e a Utmify recusa a chamada (ou o fetch quebra
  // com "Cannot convert argument to a ByteString"), silenciosamente — a
  // venda é gravada normalmente no nosso banco, só não chega na Utmify.
  const BOM = String.fromCharCode(0xFEFF);
  const token = String(process.env.UTMIFY_API_TOKEN || '').split(BOM).join('').trim();
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
    } else {
      console.log('[utmify] pedido enviado com sucesso', pedido.orderId, pedido.status);
    }
  } catch (err) {
    console.error('[utmify] falha ao enviar pedido:', pedido.orderId, err);
  }
}
