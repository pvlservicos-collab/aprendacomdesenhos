// GET /api/pix/{id}/status
// Consulta o status de uma cobrança PIX via Checkout Transparente da AbacatePay.
// Docs: https://docs.abacatepay.com/pages/transparents/check

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.ABACATEPAY_API_KEY;
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

    const json = await abacateRes.json();

    if (!abacateRes.ok || json.error) {
      return res.status(abacateRes.status || 502).json({ error: json.error || 'Erro ao checar status' });
    }

    return res.status(200).json({ status: json.data.status });
  } catch (err) {
    return res.status(502).json({ error: 'Erro de conexão com o AbacatePay' });
  }
}
