// GET /api/membros?email=fulano@exemplo.com
// Usado pelo login da área de membros (membros.html). Retorna { nome } se
// existir uma compra paga com esse e-mail, 404 caso contrário.

import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail' });
  }

  try {
    const rows = await sql`
      SELECT nome FROM compras
      WHERE lower(email) = ${email} AND status = 'paid'
      ORDER BY criado_em DESC
      LIMIT 1
    `;
    if (!rows.length) {
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }
    return res.status(200).json({ nome: rows[0].nome || 'Membro' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão com o banco de dados' });
  }
}
