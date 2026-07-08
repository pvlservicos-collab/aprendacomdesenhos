// GET /api/admin/funil?period=hoje|7d|30d
// Funil de conversão pro painel: site_view/checkout_click/pix_gerado vêm da
// tabela `eventos` (tracking do front-end); obrigado_view (= pagamentos
// confirmados) e receita vêm da tabela `compras` (verdade vinda do webhook
// da AbacatePay, não do navegador).

import { sql } from '../../lib/db.js';
import { usuarioAutenticado } from '../../lib/adminAuth.js';

function inicioPeriodo(period) {
  if (period === 'hoje') {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const partes = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return new Date(`${partes.year}-${partes.month}-${partes.day}T00:00:00-03:00`);
  }
  const dias = period === '30d' ? 30 : 7;
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

function diaStr(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  if (!usuarioAutenticado(req)) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const period = String(req.query.period || 'hoje');
  const desde = inicioPeriodo(period);

  try {
    const serieEventos = await sql`
      SELECT (criado_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
             COUNT(DISTINCT session_id) FILTER (WHERE event = 'site_view') AS site_view,
             COUNT(DISTINCT session_id) FILTER (WHERE event = 'checkout_click') AS checkout_click,
             COUNT(DISTINCT session_id) FILTER (WHERE event = 'pix_gerado') AS pix_gerado
      FROM eventos
      WHERE criado_em >= ${desde}
      GROUP BY 1
      ORDER BY 1
    `;

    const seriePagos = await sql`
      SELECT (atualizado_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
             COUNT(*) AS obrigado_view,
             COALESCE(SUM(valor_centavos), 0) AS receita
      FROM compras
      WHERE status = 'paid' AND atualizado_em >= ${desde}
      GROUP BY 1
      ORDER BY 1
    `;

    const porDia = {};
    for (const row of serieEventos) {
      const d = diaStr(row.dia);
      porDia[d] = {
        data: d,
        site_view: Number(row.site_view),
        checkout_click: Number(row.checkout_click),
        pix_gerado: Number(row.pix_gerado),
        obrigado_view: 0,
      };
    }
    for (const row of seriePagos) {
      const d = diaStr(row.dia);
      if (!porDia[d]) porDia[d] = { data: d, site_view: 0, checkout_click: 0, pix_gerado: 0, obrigado_view: 0 };
      porDia[d].obrigado_view = Number(row.obrigado_view);
      porDia[d].receita = Number(row.receita);
    }

    const serie = Object.values(porDia).sort((a, b) => a.data.localeCompare(b.data));

    const totais = serie.reduce((acc, d) => ({
      site_view: acc.site_view + d.site_view,
      checkout_click: acc.checkout_click + d.checkout_click,
      pix_gerado: acc.pix_gerado + d.pix_gerado,
      obrigado_view: acc.obrigado_view + d.obrigado_view,
      receita: acc.receita + (d.receita || 0),
    }), { site_view: 0, checkout_click: 0, pix_gerado: 0, obrigado_view: 0, receita: 0 });

    return res.status(200).json({ ...totais, serie });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar métricas' });
  }
}
