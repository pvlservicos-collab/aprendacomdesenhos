import { neon } from '@neondatabase/serverless';

let cliente = null;

export function sql(strings, ...valores) {
  if (!cliente) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada no servidor');
    }
    cliente = neon(process.env.DATABASE_URL);
  }
  return cliente(strings, ...valores);
}
