// GET /api/pix/{id}/status
// Consulta o status de uma cobrança PIX via Checkout Transparente da AbacatePay.
// Docs: https://docs.abacatepay.com/pages/transparents/check

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // mesma sanitização de BOM/espaços de api/pix/create.js — esse arquivo
  // tinha ficado de fora daquela correção, causando 502 "Erro de conexão
  // com o AbacatePay" em toda checagem de status.
  const BOM = String.fromCharCode(0xFEFF);
  const apiKey = String(process.env.ABACATEPAY_API_KEY || '').split(BOM).join('').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'ABACATEPAY_API_KEY não configurada no servidor' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'id obrigatório' });
  }

  try {
    const abacateRes = await fetch(
      `https://api.abacatepay.com/v2/transparents/check?id=${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const bodyText = await abacateRes.text();
    let json;
    try {
      json = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('[pix/status] resposta não-JSON da AbacatePay', abacateRes.status, bodyText.slice(0, 500));
      return res.status(502).json({ error: 'Resposta inválida da AbacatePay' });
    }

    if (!abacateRes.ok || json.error) {
      console.error('[pix/status] AbacatePay recusou', id, abacateRes.status, json.error || json);
      return res.status(abacateRes.status || 502).json({ error: json.error || 'Erro ao checar status' });
    }

    return res.status(200).json({ status: json.data.status });
  } catch (err) {
    console.error('[pix/status] falha ao chamar a AbacatePay:', id, err);
    return res.status(502).json({ error: 'Erro de conexão com o AbacatePay' });
  }
}
