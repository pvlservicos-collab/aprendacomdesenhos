// GET  /api/catalogo         → catálogo de vídeos (público, usado por membros.html)
// POST /api/catalogo         → substitui o catálogo inteiro (só admin, painel.html)
//
// Antes o catálogo curado no painel ficava só no localStorage do navegador
// do admin — membros reais nunca viam a curadoria, só o catálogo padrão
// hardcoded em catalogo-videos.js. Agora fica no Postgres (Neon), então
// toda edição no painel aparece pra todo mundo.

import { sql } from '../lib/db.js';
import { usuarioAutenticado } from '../lib/adminAuth.js';

async function garantirTabela() {
  await sql`
    CREATE TABLE IF NOT EXISTS catalogo_videos (
      id text PRIMARY KEY,
      titulo text NOT NULL,
      idioma text NOT NULL,
      fase integer NOT NULL DEFAULT 2,
      ordem integer NOT NULL DEFAULT 0,
      visualizacoes integer NOT NULL DEFAULT 0
    )
  `;
  // coluna nova em bancos que já tinham a tabela de antes
  await sql`ALTER TABLE catalogo_videos ADD COLUMN IF NOT EXISTS visualizacoes integer NOT NULL DEFAULT 0`;
}

export default async function handler(req, res) {
  await garantirTabela();

  if (req.method === 'GET') {
    const linhas = await sql`
      SELECT id, titulo, idioma, fase, visualizacoes FROM catalogo_videos ORDER BY ordem
    `;
    return res.status(200).json(linhas);
  }

  if (req.method === 'POST') {
    if (!usuarioAutenticado(req)) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const videos = Array.isArray(req.body) ? req.body : null;
    if (!videos) {
      return res.status(400).json({ error: 'Corpo deve ser um array de vídeos' });
    }

    const ids = [];
    const titulos = [];
    const idiomas = [];
    const fases = [];
    const ordens = [];

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      const id = String(v && v.id || '').trim();
      const idioma = String(v && v.idioma || '').trim();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !idioma) continue; // ignora linhas inválidas
      ids.push(id);
      titulos.push(String(v.titulo || 'Sem título').slice(0, 300));
      idiomas.push(idioma);
      fases.push(Number(v.fase) === 1 ? 1 : 2);
      ordens.push(i);
    }

    // upsert em vez de apagar-tudo-e-recriar — assim as visualizações
    // acumuladas de cada vídeo não zeram toda vez que o admin salva uma
    // edição no catálogo
    if (ids.length) {
      await sql`
        INSERT INTO catalogo_videos (id, titulo, idioma, fase, ordem)
        SELECT * FROM unnest(${ids}::text[], ${titulos}::text[], ${idiomas}::text[], ${fases}::int[], ${ordens}::int[])
        ON CONFLICT (id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          idioma = EXCLUDED.idioma,
          fase = EXCLUDED.fase,
          ordem = EXCLUDED.ordem
      `;
      await sql`DELETE FROM catalogo_videos WHERE NOT (id = ANY(${ids}::text[]))`;
    } else {
      await sql`DELETE FROM catalogo_videos`;
    }

    return res.status(200).json({ ok: true, total: ids.length });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
