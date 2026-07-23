// POST   /api/admin/auth   { name } → { ok, user } + cookie painel_sid
// DELETE /api/admin/auth   → limpa o cookie
//
// Não há senha — o único "usuário" aceito é o nome "pedro" (ver painel.html).
// A sessão é um cookie assinado (HMAC), sem estado guardado no servidor.

import { criarCookie, cookieDeLogout, nomeValido } from '../../lib/adminAuth.js';

export default async function handler(req, res) {
  // criarCookie() lança se ADMIN_SESSION_SECRET não estiver configurada — sem
  // este try/catch a Vercel devolve uma resposta não-JSON e o painel não
  // consegue nem mostrar um erro de login decente.
  try {
    if (req.method === 'POST') {
      const { name } = req.body || {};
      if (!nomeValido(name)) {
        return res.status(401).json({ ok: false, error: 'Nome não autorizado' });
      }
      res.setHeader('Set-Cookie', criarCookie('pedro'));
      return res.status(200).json({ ok: true, user: 'pedro' });
    }

    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', cookieDeLogout());
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error('[admin/auth] falhou:', err);
    return res.status(500).json({ ok: false, error: 'Erro de configuração no servidor' });
  }
}
