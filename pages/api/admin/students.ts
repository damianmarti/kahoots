import { pool } from '../../../lib/db';
import { withAdmin, audit } from '../../../lib/auth';

export default withAdmin(async (req, res, admin) => {
  if (req.method === 'GET') {
    const { rows } = await pool.query('SELECT padron, first_name, last_name FROM students ORDER BY last_name, first_name');
    return res.status(200).json({ students: rows });
  }
  if (req.method === 'POST') {
    const { padron, firstName, lastName } = req.body || {};
    if (!padron || !firstName || !lastName) return res.status(400).json({ error: 'Faltan datos del alumno.' });
    // Normaliza a string antes del trim: un body malformado (number/object) no debe tirar TypeError -> 500.
    const padronN = String(padron).trim();
    const firstNameN = String(firstName).trim();
    const lastNameN = String(lastName).trim();
    if (!padronN || !firstNameN || !lastNameN) return res.status(400).json({ error: 'Faltan datos del alumno.' });
    if (!/^\d+$/.test(padronN)) return res.status(400).json({ error: 'El padrón debe ser numérico.' });
    await pool.query(
      `INSERT INTO students (padron, first_name, last_name) VALUES ($1, $2, $3)
       ON CONFLICT (padron) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name`,
      [padronN, firstNameN, lastNameN],
    );
    await audit(admin.id, 'student_create', 'students', null, { padron: padronN });
    return res.status(200).json({ success: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
});
