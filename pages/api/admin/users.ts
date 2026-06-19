import bcrypt from 'bcryptjs';
import { pool } from '../../../lib/db';
import { withAdmin, audit } from '../../../lib/auth';

export default withAdmin(async (req, res, admin) => {
  if (req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.created_at, c.username AS created_by_username
       FROM admin_users u LEFT JOIN admin_users c ON c.id = u.created_by
       ORDER BY u.id`
    );
    return res.status(200).json({ users: rows });
  }
  if (req.method === 'POST') {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Faltan usuario o contraseña.' });
    const normalizedUsername = String(username).trim();
    if (!normalizedUsername) return res.status(400).json({ error: 'El usuario no puede estar vacío.' });
    if (normalizedUsername.length > 50) return res.status(400).json({ error: 'El usuario no puede superar los 50 caracteres.' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    try {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        'INSERT INTO admin_users (username, password_hash, created_by) VALUES ($1, $2, $3) RETURNING id, username',
        [normalizedUsername, hash, admin.id]
      );
      await audit(admin.id, 'admin_create', 'admin', rows[0].id, { username: normalizedUsername });
      return res.status(200).json({ user: rows[0] });
    } catch (err: any) {
      if (err.code === '23505') return res.status(400).json({ error: 'Ese usuario ya existe.' });
      console.error('admin/users error:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
  res.status(405).json({ error: 'Method not allowed' });
});
