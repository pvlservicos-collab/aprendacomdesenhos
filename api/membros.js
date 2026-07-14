// GET /api/membros?email=fulano@exemplo.com
// Usado pelo login da área de membros (membros.html). Retorna
// { nome, plano, todosIdiomas } se existir uma compra paga com esse
// e-mail, 404 caso contrário. `plano` (jogador|campeao) decide o que a
// pessoa vê liberado na aba Recompensas. `todosIdiomas` decide se os 6
// idiomas ficam liberados na aba Início (ver CUTOFF_TODOS_IDIOMAS_JOGADOR).

import { sql } from '../lib/db.js';

// A partir desta data, quem compra o plano Básico (jogador) também sai com
// todos os idiomas liberados — só o plano VIP (campeao) continua com os
// bônus exclusivos. Compras de Básico feitas ANTES disso continuam como
// sempre foram: só inglês liberado.
const CUTOFF_TODOS_IDIOMAS_JOGADOR = new Date('2026-07-14T12:00:00-03:00');

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
    return res.status(200).json({ nome, plano, todosIdiomas: plano === 'campeao' });
  }

  try {
    const rows = await sql`
      SELECT nome, plano, criado_em FROM compras
      WHERE lower(email) = ${email} AND status = 'paid'
      ORDER BY criado_em DESC
      LIMIT 1
    `;
    if (!rows.length) {
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }
    const plano = rows[0].plano || 'jogador';
    const todosIdiomas = plano === 'campeao'
      || (plano === 'jogador' && new Date(rows[0].criado_em) >= CUTOFF_TODOS_IDIOMAS_JOGADOR);
    return res.status(200).json({ nome: rows[0].nome || 'Membro', plano, todosIdiomas });
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão com o banco de dados' });
  }
}
