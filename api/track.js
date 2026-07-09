// POST /api/track
// Grava um evento de funil (site_view, checkout_click, checkout_view,
// pix_gerado, purchase, video_play, ...) disparado pelo front-end (fstTrack
// em index.html / checkout-pix.html). Consumido pelo painel (métricas e leads).

import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { event, session_id, ts, ...extra } = req.body || {};

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'event é obrigatório' });
  }
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'session_id é obrigatório' });
  }

  try {
    await sql`
      INSERT INTO eventos (event, session_id, extra)
      VALUES (${event.slice(0, 64)}, ${session_id.slice(0, 128)}, ${JSON.stringify({ ...extra, ts })})
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
}
