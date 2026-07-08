// POST /api/pix/create
// Cria uma cobrança PIX via Checkout Transparente da AbacatePay e grava uma
// linha "pending" em `compras` (o webhook atualiza pra "paid" quando cair).
// Docs: https://docs.abacatepay.com/pages/transparents/create

import { sql } from '../../lib/db.js';

const PLANOS = {
  jogador: 2700, // R$27,00 — Plano Básico
  campeao: 6700, // R$67,00 — Plano VIP
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.ABACATEPAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ABACATEPAY_API_KEY não configurada no servidor' });
  }

  const { nome, email, cpf, plano, sessionId } = req.body || {};

  if (!nome || typeof nome !== 'string') {
    return res.status(400).json({ error: 'Informe o nome' });
  }
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  const cpfDigits = String(cpf || '').replace(/\D/g, '');
  if (cpfDigits.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido' });
  }

  // preço decidido no servidor — nunca confia em valor vindo do cliente
  const amount = PLANOS[plano] || PLANOS.campeao;

  try {
    const abacateRes = await fetch('https://api.abacatepay.com/v2/transparents/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'PIX',
        data: {
          amount,
          description: 'BiliKids - Acesso Completo',
          expiresIn: 1800, // 30 min
          customer: { name: nome, taxId: cpfDigits, email: emailNorm },
        },
      }),
    });

    const json = await abacateRes.json();

    if (!abacateRes.ok || json.error) {
      return res.status(abacateRes.status || 502).json({ error: json.error || 'Erro ao gerar o PIX' });
    }

    const { id, brCode, brCodeBase64, amount: amountOut, expiresAt } = json.data;

    try {
      await sql`
        INSERT INTO compras (abacatepay_id, nome, email, cpf, plano, valor_centavos, status, session_id)
        VALUES (${id}, ${nome}, ${emailNorm}, ${cpfDigits}, ${plano}, ${amountOut}, 'pending', ${sessionId || null})
        ON CONFLICT (abacatepay_id) DO NOTHING
      `;
    } catch (dbErr) {
      console.error('[pix/create] falha ao gravar compra pendente:', dbErr);
    }

    return res.status(200).json({ id, brCode, brCodeBase64, amount: amountOut, expiresAt });
  } catch (err) {
    return res.status(502).json({ error: 'Erro de conexão com o AbacatePay' });
  }
}
