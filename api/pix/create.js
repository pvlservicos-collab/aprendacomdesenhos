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

  // remove BOM (U+FEFF) e espaços/quebras de linha que às vezes grudam na
  // env var quando ela é colada no painel da Vercel — sem isso o header
  // Authorization vira inválido e o fetch abaixo derruba com "Cannot convert
  // argument to a ByteString" (mascarado como erro de conexão genérico).
  const BOM = String.fromCharCode(0xFEFF);
  const apiKey = String(process.env.ABACATEPAY_API_KEY || '').split(BOM).join('').trim();
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
          // a AbacatePay exige as 4 chaves de customer presentes (mesmo vazias)
          // quando o objeto é enviado — faltar "cellphone" (não coletamos no
          // checkout) faz o objeto inteiro ser rejeitado com um 422 genérico.
          customer: { name: nome, taxId: cpfDigits, email: emailNorm, cellphone: '' },
        },
      }),
    });

    const bodyText = await abacateRes.text();
    let json;
    try {
      json = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('[pix/create] resposta não-JSON da AbacatePay', abacateRes.status, bodyText.slice(0, 500));
      return res.status(502).json({ error: 'Resposta inválida da AbacatePay' });
    }

    if (!abacateRes.ok || json.error) {
      console.error('[pix/create] AbacatePay recusou', abacateRes.status, json.error || json);
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
    console.error('[pix/create] falha ao chamar a AbacatePay:', err);
    return res.status(502).json({ error: 'Erro de conexão com o AbacatePay' });
  }
}
