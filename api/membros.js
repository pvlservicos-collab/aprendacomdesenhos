// GET /api/membros?email=fulano@exemplo.com
// Usado pelo login da área de membros (membros.html). Retorna { nome, plano }
// se existir uma compra paga com esse e-mail, 404 caso contrário. `plano`
// (jogador|campeao) decide o que a pessoa vê liberado na aba Recompensas.

import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail' });
  }

  // conta de teste: fica só em variável de ambiente na Vercel, não no
  // código-fonte público (o front-end não sabe de nada disso, só chama
  // este endpoint normal como qualquer e-mail real).
  const testeEmail = String(process.env.TEST_ACCOUNT_EMAIL || '').trim().toLowerCase();
  if (testeEmail && email === testeEmail) {
    const plano = String(process.env.TEST_ACCOUNT_PLANO || '').trim().toLowerCase() === 'jogador' ? 'jogador' : 'campeao';
    const nome = String(process.env.TEST_ACCOUNT_NOME || '').trim() || 'Conta Teste';
    return res.status(200).json({ nome, plano });
  }

  try {
    const rows = await sql`
      SELECT nome, plano FROM compras
      WHERE lower(email) = ${email} AND status = 'paid'
      ORDER BY criado_em DESC
      LIMIT 1
    `;
    if (!rows.length) {
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }
    return res.status(200).json({ nome: rows[0].nome || 'Membro', plano: rows[0].plano || 'jogador' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão com o banco de dados' });
  }
}
