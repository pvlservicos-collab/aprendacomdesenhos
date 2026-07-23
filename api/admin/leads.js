// GET /api/admin/leads?period=7d|30d&page=1
// Sessões que clicaram em comprar (checkout_click) mas ainda não têm compra
// paga associada — "visitantes quentes" que não converteram.

import { sql } from '../../lib/db.js';
import { usuarioAutenticado } from '../../lib/adminAuth.js';

const PER_PAGE = 25;

const STEP_LABEL = {
  site_view: 'Abriu o site',
  checkout_click: 'Clicou em comprar',
  checkout_view: 'Abriu o checkout',
  video_play: 'Assistiu o vídeo',
  pix_gerado: 'Gerou o PIX',
  purchase: 'Pagou',
};

function desdePeriodo(period) {
  const dias = period === '30d' ? 30 : 7;
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // usuarioAutenticado() lança se ADMIN_SESSION_SECRET não estiver configurada
  // — por isso fica dentro do try/catch também, senão a Vercel devolve uma
  // resposta não-JSON e o painel não consegue nem mostrar o erro direito.
  try {
    if (!usuarioAutenticado(req)) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const period = String(req.query.period || '7d');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * PER_PAGE;
    const desde = desdePeriodo(period);

    const sessoes = await sql`
      WITH candidatos AS (
        SELECT DISTINCT session_id FROM eventos
        WHERE event = 'checkout_click' AND criado_em >= ${desde}
      ),
      pagos AS (
        SELECT DISTINCT session_id FROM compras
        WHERE status = 'paid' AND session_id IS NOT NULL
      )
      SELECT
        e.session_id,
        MIN(e.criado_em) AS entrada,
        MAX(e.criado_em) AS ultima,
        (array_agg(e.event ORDER BY e.criado_em DESC))[1] AS ultimo_evento
      FROM eventos e
      JOIN candidatos ca ON ca.session_id = e.session_id
      LEFT JOIN pagos p ON p.session_id = e.session_id
      WHERE p.session_id IS NULL
      GROUP BY e.session_id
      ORDER BY MAX(e.criado_em) DESC
      LIMIT ${PER_PAGE} OFFSET ${offset}
    `;

    const totalRows = await sql`
      WITH candidatos AS (
        SELECT DISTINCT session_id FROM eventos
        WHERE event = 'checkout_click' AND criado_em >= ${desde}
      ),
      pagos AS (
        SELECT DISTINCT session_id FROM compras
        WHERE status = 'paid' AND session_id IS NOT NULL
      )
      SELECT COUNT(DISTINCT ca.session_id)::int AS total
      FROM candidatos ca
      LEFT JOIN pagos p ON p.session_id = ca.session_id
      WHERE p.session_id IS NULL
    `;

    const sessionIds = sessoes.map((s) => s.session_id);
    let nomesPorSessao = {};
    if (sessionIds.length) {
      const nomes = await sql`
        SELECT DISTINCT ON (session_id) session_id, nome
        FROM compras
        WHERE session_id = ANY(${sessionIds})
        ORDER BY session_id, criado_em DESC
      `;
      nomesPorSessao = Object.fromEntries(nomes.map((n) => [n.session_id, n.nome]));
    }

    const itens = sessoes.map((s) => ({
      nome: nomesPorSessao[s.session_id] || null,
      session_id: s.session_id,
      step: STEP_LABEL[s.ultimo_evento] || s.ultimo_evento || '—',
      criado_em: s.entrada,
    }));

    return res.status(200).json({ total: totalRows[0].total, itens });
  } catch (err) {
    console.error('[admin/leads] falhou:', err);
    return res.status(500).json({ error: 'Erro ao consultar leads' });
  }
}
