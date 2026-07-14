// GET /api/admin/pedidos?q=&page=1&status=
// Lista as compras (tabela `compras`) pro painel administrativo.

import { sql } from '../../lib/db.js';
import { usuarioAutenticado } from '../../lib/adminAuth.js';

const PER_PAGE = 25;

const PLANO_LABEL = {
  jogador: 'Plano Básico',
  campeao: 'Plano VIP',
};

const STATUS_LABEL = {
  pending: 'pendente',
  paid: 'pago',
  refunded: 'expirado',
  disputed: 'expirado',
  expired: 'expirado',
  refused: 'recusado',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  if (!usuarioAutenticado(req)) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const statusFiltro = String(req.query.status || '').trim();
  const offset = (page - 1) * PER_PAGE;
  const busca = `%${q}%`;

  try {
    const itensRaw = await sql`
      SELECT nome, cpf, email, plano, valor_centavos, status, criado_em, cakto_id, abacatepay_id
      FROM compras
      WHERE (${q}::text = '' OR nome ILIKE ${busca} OR cpf ILIKE ${busca} OR email ILIKE ${busca})
        AND (${statusFiltro}::text = '' OR status = ${statusFiltro})
      ORDER BY criado_em DESC
      LIMIT ${PER_PAGE} OFFSET ${offset}
    `;

    const totalRows = await sql`
      SELECT COUNT(*)::int AS total FROM compras
      WHERE (${q}::text = '' OR nome ILIKE ${busca} OR cpf ILIKE ${busca} OR email ILIKE ${busca})
        AND (${statusFiltro}::text = '' OR status = ${statusFiltro})
    `;

    const itens = itensRaw.map((c) => ({
      nome: c.nome,
      cpf: c.cpf,
      produtos: [PLANO_LABEL[c.plano] || c.plano || '—'],
      valor: c.valor_centavos,
      status: STATUS_LABEL[c.status] || c.status,
      metodo: c.cakto_id ? 'cartao' : (c.abacatepay_id ? 'pix' : null),
      criado_em: c.criado_em,
    }));

    return res.status(200).json({ total: totalRows[0].total, pagina: page, itens });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar pedidos' });
  }
}
