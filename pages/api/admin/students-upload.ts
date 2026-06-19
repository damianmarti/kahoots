import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import multer from 'multer';
import fs from 'fs';
import { pool } from '../../../lib/db';
import { getAdmin, audit } from '../../../lib/auth';

const upload = multer({ dest: '/tmp' });

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  onError(error, req, res) {
    console.error('students-upload error:', error);
    res.status(500).json({ error: 'Algo salió mal al procesar el archivo.' });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single('file'));

// CSV con columnas: padron,nombre,apellido (con o sin fila de encabezado)
apiRoute.post(async (req: any, res) => {
  const admin = getAdmin(req);
  if (!admin) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    return res.status(401).json({ error: 'No autorizado' });
  }
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo CSV.' });
  try {
    const content = fs.readFileSync(req.file.path, 'utf8');
    const rows: { padron: string; firstName: string; lastName: string }[] = [];
    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [padron, firstName, lastName] = line.split(/[,;]/).map(s => s.trim().replace(/^"|"$/g, ''));
      if (!padron || !firstName || !lastName) continue;
      if (!/^\d+$/.test(padron)) continue; // saltea encabezados y filas inválidas
      rows.push({ padron, firstName, lastName });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No se encontraron filas válidas (padron,nombre,apellido).' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { padron, firstName, lastName } of rows) {
        await client.query(
          `INSERT INTO students (padron, first_name, last_name) VALUES ($1, $2, $3)
           ON CONFLICT (padron) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name`,
          [padron, firstName, lastName]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    await audit(admin.id, 'students_upload', 'students', null, { count: rows.length });
    res.status(200).json({ success: true, count: rows.length });
  } catch (err: any) {
    console.error('students-upload error:', err);
    res.status(500).json({ error: 'Algo salió mal al procesar el archivo.' });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apiRoute;
