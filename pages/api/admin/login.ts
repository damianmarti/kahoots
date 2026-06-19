import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { pool } from '../../../lib/db';
import { createSessionToken, sessionCookie, audit } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Faltan usuario o contraseña.' });
  const normalizedUsername = String(username).trim();
  const normalizedPassword = String(password);
  try {
    const { rows } = await pool.query('SELECT id, username, password_hash FROM admin_users WHERE username = $1', [normalizedUsername]);
    if (!rows[0] || !(await bcrypt.compare(normalizedPassword, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
    const admin = { id: rows[0].id, username: rows[0].username };
    res.setHeader('Set-Cookie', sessionCookie(createSessionToken(admin)));
    await audit(admin.id, 'login');
    res.status(200).json({ admin });
  } catch (err: any) {
    console.error('admin/login error:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
