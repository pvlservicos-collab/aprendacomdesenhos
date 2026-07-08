// Cookie de sessão assinado (HMAC) pro painel.html — sem tabela de sessões,
// sem senha de verdade: o único usuário válido é "pedro" (ver painel.html).
// O cookie carrega usuário + validade + assinatura; qualquer alteração
// invalida a assinatura.
import crypto from 'crypto';

const COOKIE_NAME = 'painel_sid';
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const USUARIO_VALIDO = 'pedro';

function segredo() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET não configurada no servidor');
  return s;
}

function assinar(payload) {
  return crypto.createHmac('sha256', segredo()).update(payload).digest('hex');
}

export function criarCookie(usuario) {
  const expira = Date.now() + DURACAO_MS;
  const payload = `${usuario}.${expira}`;
  const assinatura = assinar(payload);
  const valor = `${payload}.${assinatura}`;
  const maxAge = Math.floor(DURACAO_MS / 1000);
  return `${COOKIE_NAME}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function cookieDeLogout() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function lerCookie(req, nome) {
  const raw = req.headers.cookie || '';
  const partes = raw.split(';').map((p) => p.trim());
  for (const parte of partes) {
    const idx = parte.indexOf('=');
    if (idx === -1) continue;
    if (parte.slice(0, idx) === nome) return decodeURIComponent(parte.slice(idx + 1));
  }
  return null;
}

// Retorna o nome do usuário se a sessão for válida, ou null caso contrário.
export function usuarioAutenticado(req) {
  const valor = lerCookie(req, COOKIE_NAME);
  if (!valor) return null;

  const partes = valor.split('.');
  if (partes.length !== 3) return null;
  const [usuario, expiraStr, assinatura] = partes;

  const payload = `${usuario}.${expiraStr}`;
  const esperada = assinar(payload);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  if (Date.now() > Number(expiraStr)) return null;
  if (usuario !== USUARIO_VALIDO) return null;

  return usuario;
}

export function nomeValido(nome) {
  return String(nome || '').trim().toLowerCase() === USUARIO_VALIDO;
}
