// POST /api/catalogo-view  { id: "youtubeId" }
// Soma +1 na contagem de visualizações do vídeo — usado pra montar o
// ranking real de "Top 10 Favoritos" (mais assistidos de verdade, não
// mais um recorte decorativo fixo do catálogo).
//
// Público (qualquer membro logado pode contar uma visualização); se o
// vídeo ainda não existir na tabela (catálogo nunca foi salvo pelo admin
// ainda), a visualização simplesmente não é contada — não quebra nada.

import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const id = String((req.body && req.body.id) || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'id inválido' });
  }

  try {
    await sql`UPDATE catalogo_videos SET visualizacoes = visualizacoes + 1 WHERE id = ${id}`;
  } catch {
    // tabela pode não existir ainda se /api/catalogo nunca rodou — sem problema
  }

  return res.status(200).json({ ok: true });
}
